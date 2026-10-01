#!/usr/bin/env python3
"""Stage 2 of the tutorial video pipeline: frames, sound design and encoding.

For each video built by build_audio.py:
  1. opens video/player.html?v=<id> in headless Chromium and captures every frame at 30 fps
  2. mixes narration + a soft music bed + sound effects (cue list comes from the page)
  3. encodes video/out/<id>/<id>.mp4 (H.264 + AAC, burned-in captions, plus a soft subtitle track)
     and writes <id>.srt, <id>.vtt and a poster frame <id>.jpg

usage: python3 video/render.py V1 [V2 ...]            full render
       python3 video/render.py V1 --stills 2,10.5,30   review frames only (video/out/V1/still-*.jpg)
Needs: playwright (Chromium; CHROMIUM_PATH to use an existing binary), ffmpeg, numpy, soundfile.
"""
import asyncio, base64, functools, http.server, json, os, shutil, subprocess, sys, threading
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import soundfile as sf
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VDIR = os.path.join(ROOT, "video")
OUT = os.path.join(VDIR, "out")
SR = 48000


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=VDIR))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


# ---------------------------------------------------------------- sound design
rng = np.random.default_rng(11)


def env_exp(n, tau): return np.exp(-np.arange(n) / (tau * SR))


def tone(f, dur, tau, harm=(1.0, 0.3, 0.1)):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * (k + 1) * t) for k, a in enumerate(harm))
    return s * env_exp(n, tau) * np.minimum(1, np.arange(n) / (0.004 * SR))


def noise(dur): return rng.standard_normal(int(dur * SR))


def lowpass(x, a):  # one-pole, a in (0,1): smaller = darker
    from scipy.signal import lfilter
    return lfilter([a], [1, a - 1], x)


def sweep_filter(x, a0, a1):
    y = np.empty_like(x); acc = 0.0; n = len(x)
    for i, v in enumerate(x):
        a = a0 + (a1 - a0) * i / n; acc += a * (v - acc); y[i] = acc
    return y


def padsum(*xs):
    n = max(len(x) for x in xs); out = np.zeros(n)
    for x in xs: out[:len(x)] += x
    return out


def make_sfx():
    S = {}
    n = int(0.09 * SR); t = np.arange(n) / SR
    f = 700 * np.exp(-t * 18) + 260
    S["pop"] = 0.32 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.03)
    c = noise(0.018) * env_exp(int(0.018 * SR), 0.004); c = c - lowpass(c, 0.3)
    S["click"] = padsum(0.35 * c, 0.12 * tone(2200, 0.03, 0.008, (1,)))
    w = noise(0.5); w = sweep_filter(w, 0.02, 0.25) * np.hanning(len(w)); S["whoosh"] = 0.5 * w / (np.max(np.abs(w)) + 1e-9) * 0.35
    w = noise(0.32); w = sweep_filter(w, 0.04, 0.3) * np.hanning(len(w)); S["swish"] = 0.25 * w / (np.max(np.abs(w)) + 1e-9)
    S["tick"] = 0.22 * np.concatenate([tone(1320, 0.06, 0.02, (1, .2)), tone(1980, 0.12, 0.04, (1, .2))])
    S["ding"] = 0.26 * tone(1046.5, 1.0, 0.35, (1, .45, .2, .08))
    arp = [523.25, 659.25, 783.99, 1046.5]; out = np.zeros(int(1.4 * SR))
    for i, fr in enumerate(arp):
        s = tone(fr, 1.0, 0.3, (1, .35, .12)); a = int(i * 0.085 * SR); out[a:a + len(s)] += s
    S["tada"] = 0.2 * out
    n = int(0.28 * SR); t = np.arange(n) / SR
    S["buzz"] = 0.12 * np.sign(np.sin(2 * np.pi * 150 * t)) * env_exp(n, 0.12) * np.minimum(1, t / 0.01)
    S["buzz"] = lowpass(S["buzz"], 0.2) * 2.2
    n = int(0.34 * SR); t = np.arange(n) / SR
    f = 330 + 160 * np.sin(np.pi * t / 0.34) + 25 * np.sin(2 * np.pi * 18 * t)
    S["boing"] = 0.2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.14)
    st = np.zeros(int(1.6 * SR))
    for fr in [261.63, 329.63, 392.0, 493.88]: st += 0.18 * tone(fr, 1.6, 0.7, (1, .25))
    for i, fr in enumerate([783.99, 987.77, 1174.66, 1567.98]):
        s = 0.12 * tone(fr, 0.9, 0.25, (1, .3)); a = int((0.15 + i * 0.07) * SR); st[a:a + len(s)] += s
    S["sting"] = st * 0.9
    return S


def midi(m): return 440 * 2 ** ((m - 69) / 12)


def music(dur, seed=3):
    """Soft lo-fi bed: electric-piano chords, bass, light kick and shaker. Deterministic."""
    r = np.random.default_rng(seed)
    n = int(dur * SR); out = np.zeros(n + SR * 3)
    bpm = 92; beat = 60 / bpm; bar = 4 * beat
    prog = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]]   # Cmaj7 Am7 Fmaj7 G7
    roots = [36, 33, 29, 31]
    kick_n = int(0.18 * SR); kt = np.arange(kick_n) / SR
    kick = np.sin(2 * np.pi * np.cumsum(55 + 70 * np.exp(-kt * 30)) / SR) * env_exp(kick_n, 0.06)
    shk = noise(0.05); shk = (shk - lowpass(shk, 0.5)) * env_exp(len(shk), 0.012)
    t0 = 0.0; b = 0
    while t0 < dur + bar:
        ch = prog[b % 4]
        for hit, vel in [(0, 1.0), (2 * beat + beat * 0.5, 0.7)]:
            for k, m in enumerate(ch):
                s = tone(midi(m + 12), 2.4, 0.9, (1, .22, .06)) * 0.06 * vel
                a = int((t0 + hit + k * 0.012) * SR)
                if a < len(out): out[a:a + len(s)] += s[: max(0, len(out) - a)]
        for hit in (0, 1.5 * beat, 2 * beat):
            s = tone(midi(roots[b % 4] + 12), 0.9, 0.35, (1, .5)) * 0.10
            a = int((t0 + hit) * SR); out[a:a + len(s)] += s[: max(0, len(out) - a)]
        for hit in (0, 2 * beat):
            a = int((t0 + hit) * SR); out[a:a + kick_n] += 0.16 * kick[: max(0, len(out) - a)]
        for e in range(8):
            a = int((t0 + e * beat / 2 + (0.01 if e % 2 else 0)) * SR)
            out[a:a + len(shk)] += (0.05 if e % 2 else 0.025) * shk[: max(0, len(out) - a)]
        t0 += bar; b += 1
    out = out[:n]
    out = lowpass(out, 0.35)  # warm it up
    fade = np.ones(n); fi = int(1.0 * SR); fo = int(2.5 * SR)
    fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
    return out * fade


def resample(x, sr_in, sr_out):
    n = int(len(x) * sr_out / sr_in)
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)


def mix(vid, duration, cues):
    v, sr = sf.read(os.path.join(OUT, vid, "voice.wav"), dtype="float32")
    v = resample(v, sr, SR)
    n = int(duration * SR) + SR // 2
    voice = np.zeros(n, dtype=np.float32); voice[: min(n, len(v))] = v[: n]
    m = music(n / SR)[:n]
    # duck the music under the narration
    e = np.convolve(np.abs(voice), np.ones(2400) / 2400, mode="same")
    duck = 1 - 0.6 * np.clip(e / (np.percentile(e, 95) + 1e-9), 0, 1)
    fx = np.zeros(n, dtype=np.float32)
    S = make_sfx()
    for c in cues:
        s = S.get(c["kind"]);
        if s is None: continue
        a = int(c["t"] * SR)
        if a >= n: continue
        fx[a:a + len(s)] += s[: n - a].astype(np.float32)
    out = voice * 1.0 + m * duck * 0.21 + fx * 0.36
    out /= max(1.0, np.max(np.abs(out)) / 0.95)
    path = os.path.join(OUT, vid, "mix.wav")
    sf.write(path, out, SR, subtype="PCM_16")
    return path


def subs(vid):
    tl = json.load(open(os.path.join(OUT, vid, "timeline.json")))
    def ts(x, sep): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h:02d}:{m:02d}:{int(s):02d}{sep}{int(round((s - int(s)) * 1000)):03d}"
    caps = tl["captions"]; srt, vtt = [], ["WEBVTT", ""]
    for i, c in enumerate(caps):
        end = min(c["end"] + 0.35, caps[i + 1]["start"] - 0.02) if i + 1 < len(caps) else c["end"] + 0.6
        who = "Ava" if c["who"] == "ava" else "Leo"
        srt += [str(i + 1), f"{ts(c['start'], ',')} --> {ts(end, ',')}", f"[{who}] {c['text']}", ""]
        vtt += [f"{ts(c['start'], '.')} --> {ts(end, '.')}", f"<v {who}>{c['text']}", ""]
    open(os.path.join(OUT, vid, f"{vid}.srt"), "w").write("\n".join(srt))
    open(os.path.join(OUT, vid, f"{vid}.vtt"), "w").write("\n".join(vtt))


# ---------------------------------------------------------------- frames
async def render(vid, stills=None):
    httpd = serve(); url = f"http://127.0.0.1:{httpd.server_address[1]}/player.html?v={vid}"
    async with async_playwright() as p:
        kw = {"executable_path": os.environ["CHROMIUM_PATH"]} if os.environ.get("CHROMIUM_PATH") else {}
        browser = await p.chromium.launch(**kw, args=["--disable-gpu", "--force-color-profile=srgb", "--font-render-hinting=none"])
        page = await browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        await page.goto(url)
        await page.wait_for_function("window.READY", timeout=30000)
        info = await page.evaluate("window.READY")
        if errors: print("page errors:", errors[:5])
        cdp = await page.context.new_cdp_session(page)
        async def grab(t, path):
            await page.evaluate(f"renderAt({t})")
            r = await cdp.send("Page.captureScreenshot", {"format": "jpeg", "quality": 90, "optimizeForSpeed": True})
            return path, r["data"]
        pool = ThreadPoolExecutor(2)
        def write(path, data): open(path, "wb").write(base64.b64decode(data))
        if stills is not None:
            for t in stills:
                pth, data = await grab(t, os.path.join(OUT, vid, f"still-{t:07.2f}.jpg")); write(pth, data)
            await browser.close(); httpd.shutdown(); return info
        fdir = os.path.join(VDIR, "frames", vid); shutil.rmtree(fdir, ignore_errors=True); os.makedirs(fdir)
        fps = info["fps"]; total = int(np.ceil(info["duration"] * fps))
        for f in range(total):
            pth, data = await grab(f / fps, os.path.join(fdir, f"{f:05d}.jpg"))
            pool.submit(write, pth, data)
            if f % 300 == 0: print(f"  {vid}: frame {f}/{total}", flush=True)
        pool.shutdown(wait=True)
        # poster: a frame from the title scene once everything is in
        pth, data = await grab(2.6, os.path.join(OUT, vid, f"{vid}.jpg")); write(pth, data)
        await browser.close()
    httpd.shutdown()
    return info


def encode(vid, info):
    fdir = os.path.join(VDIR, "frames", vid)
    audio = mix(vid, info["duration"], info["sfx"])
    subs(vid)
    out = os.path.join(OUT, vid, f"{vid}.mp4")
    cmd = ["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(info["fps"]), "-i", os.path.join(fdir, "%05d.jpg"), "-i", audio,
           "-i", os.path.join(OUT, vid, f"{vid}.srt"),
           "-map", "0:v", "-map", "1:a", "-map", "2:s",
           "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-tune", "animation", "-pix_fmt", "yuv420p", "-maxrate", "820k", "-bufsize", "1640k", "-g", "60",
           "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "96k", "-ar", "48000",
           "-c:s", "mov_text", "-metadata:s:s:0", "language=eng", "-metadata:s:s:0", "title=English",
           "-metadata", f"title={info.get('title', vid)}", "-movflags", "+faststart", "-t", f"{info['duration']:.3f}", out]
    subprocess.run(cmd, check=True)
    shutil.rmtree(fdir, ignore_errors=True)
    size = os.path.getsize(out) / 1e6
    print(f"{vid}: {out} {size:.1f} MB")


async def main():
    args = sys.argv[1:]
    stills = None
    if "--info-only" in args:
        args = [a for a in args if a != "--info-only"]
        for vid in args:
            info = await render(vid, []); json.dump(info, open(os.path.join(OUT, vid, "render-info.json"), "w")); print(vid, "info saved")
        return
    if "--stills" in args:
        i = args.index("--stills"); stills = [float(x) for x in args[i + 1].split(",")]; args = args[:i] + args[i + 2:]
    encode_only = "--encode-only" in args; args = [a for a in args if a != "--encode-only"]
    for vid in args:
        tl = json.load(open(os.path.join(OUT, vid, "timeline.json")))
        info_f = os.path.join(OUT, vid, "render-info.json")
        if encode_only and os.path.exists(info_f): info = json.load(open(info_f))
        else:
            info = await render(vid, stills)
            if not stills: json.dump(info, open(info_f, "w"))
        info["title"] = f"{tl['episode']}: {tl['title']}"
        if not stills: encode(vid, info)
        else: print(vid, "stills written", info["duration"])


if __name__ == "__main__":
    asyncio.run(main())
