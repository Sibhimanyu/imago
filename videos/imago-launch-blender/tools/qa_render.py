"""blender -b file.blend -P qa_render.py -- <out_dir> <master frame> [...]
Renders stills of the master scene (the sequencer, as the final render sees it)."""
import bpy, sys, os
a = sys.argv[sys.argv.index("--") + 1:]
out = a[0]; frames = [int(round(float(x))) for x in a[1:]]
sc = bpy.context.scene
sc.render.image_settings.media_type = "IMAGE"; sc.render.image_settings.file_format = "PNG"
sc.render.resolution_percentage = int(os.environ.get("QA_PCT", "50"))
for f in frames:
    sc.frame_set(f)
    sc.render.filepath = os.path.join(out, f"bl_{f:04d}.png")
    bpy.ops.render.render(write_still=True)
