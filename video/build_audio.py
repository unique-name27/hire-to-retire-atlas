#!/usr/bin/env python3
"""Stage 1 of the tutorial video pipeline: narration and timing.

Reads data/videos.json, synthesizes every line with Kokoro TTS (Ava = af_heart, Leo = am_michael),
lays the lines out on a timeline and writes, per video, to video/out/<id>/:
  voice.wav      the narration track (24 kHz mono)
  timeline.json  scenes, lines, caption chunks and per-frame mouth envelopes for the renderer

usage: python3 video/build_audio.py [V1 V2 ...]
Needs: pip install kokoro-onnx soundfile; model files kokoro-v1.0.onnx and voices-v1.0.bin
(from github.com/thewh1teagle/kokoro-onnx releases) in $KOKORO_DIR (default video/models).
"""
import json, os, re, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "video", "out")
MODELS = os.environ.get("KOKORO_DIR", os.path.join(ROOT, "video", "models"))
SR, FPS = 24000, 30
VOICES = {"ava": ("af_heart", 1.06), "leo": ("am_michael", 1.08)}
GAP_SENT, GAP_SAME, GAP_SWAP = 0.13, 0.34, 0.24   # pauses between sentences, same-speaker lines, speaker changes
FIRST_LINE, SCENE_LEAD, SCENE_TAIL, OUTRO_TAIL = 1.1, 0.62, 0.38, 2.6

ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def words(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ("" if n % 10 == 0 else "-" + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + words(n % 100))
    if n < 10000: return words(n // 1000) + " thousand" + ("" if n % 1000 == 0 else " " + words(n % 1000))
    return str(n)


def speakable(s):
    s = s.replace("final_v7", "final v seven").replace("&", "and")
    s = re.sub(r"\b(19|20)(\d\d)\b", lambda m: words(int(m.group(1))) + " " + (words(int(m.group(2))) if m.group(2) != "00" else "hundred"), s)
    s = re.sub(r"\b(\d+)-minute\b", lambda m: words(int(m.group(1))) + "-minute", s)
    s = re.sub(r"\b\d{1,4}\b", lambda m: words(int(m.group(0))), s)
    return s


def sentences(s):
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])", s.strip())
    return [p for p in parts if p]


def trim(x, thr=0.008, pad=0.03):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx): return x
    a, b = max(0, idx[0] - int(pad * SR)), min(len(x), idx[-1] + int(pad * SR))
    return x[a:b]


def chunks(text, limit=84):
    """Split a caption sentence into chunks that fit two lines."""
    if len(text) <= limit: return [text]
    mid = len(text) / 2
    best = None
    for m in re.finditer(r"[,;:] ", text):
        k = m.end()
        if best is None or abs(k - mid) < abs(best - mid): best = k
    if best is None or abs(best - mid) > len(text) * 0.3:
        spaces = [m.start() for m in re.finditer(" ", text)]
        best = min(spaces, key=lambda k: abs(k - mid)) + 1
    return chunks(text[:best].strip(), limit) + chunks(text[best:].strip(), limit)


def build(video, kok):
    vid = video["id"]
    os.makedirs(os.path.join(OUT, vid), exist_ok=True)
    clips, captions = [], []      # clips: (start_seconds, who, samples)
    t = 0.0
    scenes = []
    prev_who = None
    for si, sc in enumerate(video["scenes"]):
        start = t
        t = start + (FIRST_LINE if si == 0 else SCENE_LEAD)
        lines = []
        for li, ln in enumerate(sc["lines"]):
            if li > 0: t += GAP_SAME if ln["who"] == prev_who else GAP_SWAP
            prev_who = ln["who"]
            voice, speed = VOICES[ln["who"]]
            shown, spoken = sentences(ln["text"]), sentences(speakable(ln.get("say") or ln["text"]))
            pairs = list(zip(shown, spoken)) if len(shown) == len(spoken) else [(ln["text"], speakable(ln.get("say") or ln["text"]))]
            lstart = t
            for k, (cap, say) in enumerate(pairs):
                if k: t += GAP_SENT
                audio, sr = kok.create(say, voice=voice, speed=speed, lang="en-us")
                assert sr == SR
                audio = trim(np.asarray(audio, dtype=np.float32))
                dur = len(audio) / SR
                clips.append((t, ln["who"], audio))
                parts = chunks(cap)
                total = sum(len(p) for p in parts)
                c0 = t
                for p in parts:
                    cd = dur * len(p) / total
                    captions.append({"start": round(c0, 3), "end": round(c0 + cd, 3), "text": p, "who": ln["who"]})
                    c0 += cd
                t += dur
            lines.append({**ln, "start": round(lstart, 3), "end": round(t, 3)})
        end = t + (OUTRO_TAIL if si == len(video["scenes"]) - 1 else SCENE_TAIL + {"chain": 2.4, "appTable": 0.6, "swimlane": 0.8}.get(sc["type"], 0))
        scenes.append({**sc, "start": round(start, 3), "end": round(end, 3), "lines": lines})
        t = end
    duration = round(t, 3)
    n = int(round(duration * SR)) + SR
    voice = np.zeros(n, dtype=np.float32)
    per = {"ava": np.zeros(n, dtype=np.float32), "leo": np.zeros(n, dtype=np.float32)}
    for st, who, a in clips:
        i = int(st * SR)
        voice[i:i + len(a)] += a
        per[who][i:i + len(a)] += a
    peak = np.max(np.abs(voice)) or 1.0
    voice *= 0.89 / peak
    env = {}
    frames = int(np.ceil(duration * FPS)) + 1
    hop = SR // FPS
    for who, sig in per.items():
        sig = sig / peak
        rms = np.array([np.sqrt(np.mean(sig[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(sig) else 0 for i in range(frames)])
        ref = np.percentile(rms[rms > 0.01], 90) if np.any(rms > 0.01) else 1
        e = np.clip(rms / ref, 0, 1)
        e = np.convolve(e, [0.25, 0.5, 0.25], mode="same")
        env[who] = [round(float(x), 2) for x in e]
    # merge caption chunks that touch for subtitle files; keep as-is for on-screen captions
    sf.write(os.path.join(OUT, vid, "voice.wav"), voice[: int(duration * SR)], SR, subtype="PCM_16")
    tl = {"id": vid, "title": video["title"], "episode": video["episode"], "summary": video["summary"], "fps": FPS,
          "duration": duration, "scenes": scenes, "captions": captions, "env": env}
    json.dump(tl, open(os.path.join(OUT, vid, "timeline.json"), "w"), ensure_ascii=False)
    words_n = sum(len(l["text"].split()) for s in video["scenes"] for l in s["lines"])
    print(f"{vid}: {duration:.1f}s, {len(scenes)} scenes, {len(captions)} captions, {words_n} words")


def main():
    data = json.load(open(os.path.join(ROOT, "data", "videos.json")))
    want = set(sys.argv[1:])
    kok = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    for v in data["videos"]:
        if not want or v["id"] in want: build(v, kok)


if __name__ == "__main__":
    main()
