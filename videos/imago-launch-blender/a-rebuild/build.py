"""Builds imago-launch-a.blend: an editable Blender rebuild of videos/imago-launch.

    blender -b --factory-startup -P build.py -- [--only 08-facts] [--no-save]

One Blender scene per HyperFrames scene (like After Effects precomps), built from
the probe dumps in ../probe, and a master scene "Imago Launch" whose Video
Sequencer lays them out on the 30s timeline with the transitions, the music and
every sound effect. Render the master scene to get the film.
"""
import bpy, sys, os, re, json, math, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # videos/imago-launch-blender
SRC = os.path.join(os.path.dirname(ROOT), "imago-launch")
sys.path.insert(0, os.path.join(ROOT, "tools"))
from imago_bl import core as C, dom as D  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ONLY = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
SAVE = "--no-save" not in argv
OUT = os.path.join(HERE, "imago-launch-a.blend")
ASSETS = os.path.join(ROOT, "assets")

NAMES = {"01-groove": "01 Groove", "02-avalanche": "02 Avalanche", "03-paste": "03 Paste", "04-shape": "04 Shape",
         "05-drop": "05 Drop", "06-plan": "06 Plan", "07-watch": "07 Watch", "08-facts": "08 Facts", "09-sting": "09 Sting"}

# ---------------------------------------------------------------- assets + fonts
os.makedirs(ASSETS, exist_ok=True)
for sub in ("fonts", "bgm"):
    shutil.copytree(os.path.join(SRC, "assets", sub), os.path.join(ASSETS, sub), dirs_exist_ok=True)
C.FONT_DIR = os.path.join(ASSETS, "fonts")

# ---------------------------------------------------------------- the master timeline (index.html)
index_html = open(os.path.join(SRC, "index.html")).read()
scenes = []
for m in re.finditer(r'<div\s+id="(el-[^"]+)"[^>]*data-composition-src="compositions/frames/([^"]+)\.html"[^>]*data-start="([\d.]+)"[^>]*data-duration="([\d.]+)"', index_html, re.S):
    scenes.append({"el": m.group(1), "key": m.group(2), "start": float(m.group(3)), "dur": float(m.group(4))})
audio = []
for m in re.finditer(r'<audio\s+id="([^"]+)"\s+src="([^"]+)"\s+data-start="([\d.]+)"\s+data-duration="([\d.]+)"[^>]*data-volume="([\d.]+)"', index_html, re.S):
    audio.append({"id": m.group(1), "src": m.group(2), "start": float(m.group(3)), "dur": float(m.group(4)), "vol": float(m.group(5))})
index_probe = json.load(open(os.path.join(ROOT, "probe", "index.json")))

# ---------------------------------------------------------------- start clean
for sc in list(bpy.data.scenes)[1:]:
    bpy.data.scenes.remove(sc)
master = bpy.data.scenes[0]
master.name = "Imago Launch"
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
for coll in list(bpy.data.collections):
    bpy.data.collections.remove(coll)

built = {}
for s in scenes:
    if ONLY and s["key"] not in ONLY:
        continue
    probe = json.load(open(os.path.join(ROOT, "probe", s["key"] + ".json")))
    f0 = s["start"] * C.FPS
    off = f0 - math.floor(f0 + 1e-6)
    D.LOG.append(f"== {s['key']} (offset {off:.2f} frames)")
    sb = D.SceneBuilder(probe, NAMES[s["key"]], off, SRC, ASSETS)
    sc = sb.build()
    built[s["key"]] = (sc, s, off)
    print(f"built {sc.name}: {len(sb.coll.objects)} objects")

if "_measure" in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects["_measure"])

# ---------------------------------------------------------------- master scene: sequencer
M = master
M.render.resolution_x, M.render.resolution_y, M.render.resolution_percentage = 1920, 1080, 100
M.render.fps = C.FPS
M.view_settings.view_transform = "Standard"
M.view_settings.look = "None"
M.frame_start = 0
M.frame_end = 30 * C.FPS - 1
se = M.sequence_editor_create()
bg = se.strips.new_effect("Paper", "COLOR", channel=1, frame_start=0, length=30 * C.FPS)
bg.color = (0.9216, 0.9137, 0.8784)  # F6F5F1 in the sequencer's linear space
bg.color = tuple(C.srgb_to_lin(v / 255) for v in (246, 245, 241))

# DOM order = paint order: later scenes above earlier ones
for i, s in enumerate(scenes):
    if s["key"] not in built:
        continue
    sc, _, off = built[s["key"]]
    start = int(math.floor(s["start"] * C.FPS + 1e-6))
    st = se.strips.new_scene(sc.name, sc, channel=2 + i, frame_start=start)
    st.scene_input = "CAMERA"
    st.blend_type = "ALPHA_OVER"
    end = s["start"] + s["dur"]
    st.frame_final_end = int(round(end * C.FPS))
    # transitions from the master timeline: x (push), scale + opacity (zoom-through)
    el = next((n for n in index_probe["nodes"] if n["id"].split("#")[0] == s["el"]), None)
    if el is None:
        continue
    nid = el["id"]
    segs = {}
    for tw in index_probe["tweens"]:
        if nid in tw["targets"]:
            for prop, (a, b) in tw["values"][nid].items():
                segs.setdefault(prop, []).append((tw["start"], tw["start"] + tw["dur"], a, b, tw["ease"]))
    base = f'sequence_editor.strips_all["{st.name}"]'
    for prop, (path, conv, tol) in {
        "x": (base + ".transform.offset_x", lambda v: v, 0.5),
        "y": (base + ".transform.offset_y", lambda v: -v, 0.5),
        "scaleX": (base + ".transform.scale_x", lambda v: v, 0.002),
        "scaleY": (base + ".transform.scale_y", lambda v: v, 0.002),
        "opacity": (base + ".blend_alpha", lambda v: v, 0.004),
    }.items():
        smp = index_probe["samples"].get(f"{nid}|{prop}")
        if not smp or len(set(smp)) < 2:
            continue
        D.channel(M, path, 0, conv, segs.get(prop, []), smp, 0.0, tol, f"master.{s['el']}.{prop}")
    if f"{nid}|filter" in index_probe["samples"]:
        # zoom-through blur: a Gaussian Blur effect over the strip, keyed like the CSS filter
        smp = index_probe["samples"][f"{nid}|filter"]
        vals = [float(re.search(r"blur\(([\d.]+)px\)", v).group(1)) if "blur" in str(v) else 0.0 for v in smp]
        if max(vals) > 0:
            gb = se.strips.new_effect(st.name + " Blur", "GAUSSIAN_BLUR", channel=12 + i, frame_start=st.frame_final_start,
                                      length=st.frame_final_duration, input1=st)
            gb.blend_type = "ALPHA_OVER"
            # the blurred copy is what shows: move the fade onto it, hide the sharp source
            fc_src = D.ANIM.fc(M, base + ".blend_alpha", 0)
            keys = [(k.co[0], k.co[1], k.interpolation, k.easing, None) for k in fc_src.keyframe_points]
            if keys:
                D.write_keys(D.ANIM.fc(M, f'sequence_editor.strips_all["{gb.name}"].blend_alpha', 0), keys)
                fc_src.keyframe_points.clear()
            st.blend_alpha = 0.0
            path = f'sequence_editor.strips_all["{gb.name}"].size_x'
            D.write_keys(D.ANIM.fc(M, path, 0), D.bake_keys([v * 2 for v in vals], 0.0, 0.05))
            path = f'sequence_editor.strips_all["{gb.name}"].size_y'
            D.write_keys(D.ANIM.fc(M, path, 0), D.bake_keys([v * 2 for v in vals], 0.0, 0.05))

# ---------------------------------------------------------------- sound
os.makedirs(os.path.join(ASSETS, "sfx"), exist_ok=True)
for k, a in enumerate(audio):
    src = os.path.join(SRC, a["src"])
    dst = os.path.join(ASSETS, a["src"].replace("assets/", ""))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not os.path.exists(dst):
        shutil.copy2(src, dst)
    snd = se.strips.new_sound(a["id"].replace("el-", ""), dst, channel=24 + k, frame_start=int(round(a["start"] * C.FPS)))
    snd.volume = a["vol"]
    end = int(round((a["start"] + a["dur"]) * C.FPS))
    if snd.frame_final_end > end:
        snd.frame_final_end = end

# ---------------------------------------------------------------- output
r = M.render
r.use_sequencer = True
r.image_settings.media_type = "VIDEO"
r.image_settings.file_format = "FFMPEG"
r.ffmpeg.format = "MPEG4"
r.ffmpeg.codec = "H264"
r.ffmpeg.constant_rate_factor = "HIGH"
r.ffmpeg.ffmpeg_preset = "GOOD"
r.ffmpeg.gopsize = 15
r.ffmpeg.audio_codec = "AAC"
r.ffmpeg.audio_bitrate = 256
r.ffmpeg.audio_mixrate = 48000
r.filepath = "//renders/imago-launch-a.mp4"

with open(os.path.join(HERE, "build-log.txt"), "w") as f:
    f.write("\n".join(D.LOG) + "\n")
if SAVE:
    bpy.ops.wm.save_as_mainfile(filepath=OUT)
    bpy.ops.file.make_paths_relative()
    bpy.ops.wm.save_mainfile()
    print("saved", OUT)
