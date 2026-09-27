"""Builds imago-paper-machine.blend: "Paper Machine", a 3D take on the Imago launch.

    blender -b --factory-startup -P build.py

Same palette, type, music and mascot as the launch video, but a physical world:
a lit paper table, Amigo as a solid character, the JSON as thousands of real
glyphs that rain down, pile up and then sort themselves into a page, and the
app's interfaces rising out of the table as cards. See CONCEPT.md.

Everything is keyframed or procedural (the glyph field is one Geometry Nodes
modifier driven by the scene clock: "Glyph Field" inputs set the timings).
"""
import bpy, sys, os, math, random
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
from imago_bl import core as C  # noqa: E402

A = os.path.join(ROOT, "assets")
C.FONT_DIR = os.path.join(A, "fonts")
FPS = 30
BEAT = 0.46875          # 128 bpm
BAR = BEAT * 4
OUT = os.path.join(HERE, "imago-paper-machine.blend")

INK, PAPER, MUTED, LINE = "1B1B19", "F6F5F1", "66655F", "E7E5DF"
AMBER, AMBER_BG, GREEN, BLUE = "F5CE47", "FDF3CD", "4FA96A", "8FB4E3"

# ---------------------------------------------------------------- scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
sc = bpy.context.scene
sc.name = "Paper Machine"
r = sc.render
r.engine = "BLENDER_EEVEE"
r.resolution_x, r.resolution_y, r.resolution_percentage = 1920, 1080, 100
r.fps = FPS
sc.frame_start, sc.frame_end = 0, 30 * FPS - 1
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
sc.view_settings.exposure = 0.0
ee = sc.eevee
ee.taa_render_samples = 48
ee.use_shadows = True
ee.use_raytracing = True
ee.fast_gi_method = "GLOBAL_ILLUMINATION"
r.use_motion_blur = True
r.motion_blur_shutter = 0.35
coll = sc.collection


def t2f(t):
    return t * FPS


def key(idb, path, index, pts, default_ease="power3.inOut"):
    """pts: [(t, value[, ease])]; the ease shapes the segment that starts at that key."""
    ad = idb.animation_data or idb.animation_data_create()
    for p in pts:
        t, v = p[0], p[1]
        if index is None:
            setattr_path(idb, path, v)
            idb.keyframe_insert(path, frame=t2f(t))
        else:
            getattr_path(idb, path)[index] = v
            idb.keyframe_insert(path, index=index, frame=t2f(t))
    fc = find_fc(idb, path, index or 0)
    for kp, p in zip(sorted(fc.keyframe_points, key=lambda k: k.co[0]), sorted(pts, key=lambda p: p[0])):
        e = p[2] if len(p) > 2 else default_ease
        if e == "hold":
            kp.interpolation = "CONSTANT"; continue
        be = C.blender_ease(e)
        if be:
            kp.interpolation, kp.easing, par = be
            if kp.interpolation == "BACK":
                kp.back = par[0] if par else 1.7


def getattr_path(idb, path):
    o = idb
    for part in path.replace('"]', "").split("."):
        if part.startswith('["'):
            return o
        o = getattr(o, part)
    return o


def setattr_path(idb, path, v):
    if path.startswith('["'):
        idb[path[2:-2]] = v
        return
    parts = path.split(".")
    o = idb
    for p in parts[:-1]:
        o = getattr(o, p)
    setattr(o, parts[-1], v)


def find_fc(idb, path, index):
    ad = idb.animation_data
    from bpy_extras import anim_utils
    cb = anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot)
    return cb.fcurves.find(path, index=index)


# ---------------------------------------------------------------- materials
def pbr(name, hexc, rough=0.6, spec=0.3, emit=None, emit_strength=0.0, image=None, alpha=1.0):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = C.hex_rgba(hexc)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = spec
    if image:
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = C.image(image); tex.interpolation = "Cubic"
        nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
        nt.links.new(tex.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = 0.55
    if emit:
        b.inputs["Emission Color"].default_value = C.hex_rgba(emit)
        b.inputs["Emission Strength"].default_value = emit_strength
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
    return m


M_PAPER = pbr("Paper table", PAPER, rough=0.92, spec=0.2)
M_INK = pbr("Ink", INK, rough=0.42, spec=0.45)
M_MUTED = pbr("Ink muted", MUTED, rough=0.5)
M_CARD = pbr("Card", "FFFFFF", rough=0.55)
M_AMBER = pbr("Changed amber", AMBER, rough=0.4, emit=AMBER, emit_strength=0.0)
M_AMBER_BG = pbr("Changed amber wash", AMBER_BG, rough=0.6)
M_GREEN = pbr("Live green", GREEN, rough=0.4, emit=GREEN, emit_strength=0.6)
M_PAPERTXT = pbr("Paper ink", PAPER, rough=0.5)

# ---------------------------------------------------------------- world, table, light
w = bpy.data.worlds.new("Paper light")
sc.world = w
w.node_tree.nodes["Background"].inputs[0].default_value = C.hex_rgba("EFEDE7")
w.node_tree.nodes["Background"].inputs[1].default_value = 0.55
# the camera sees plain paper at the horizon; the lighting uses the dimmer sky
wn = w.node_tree.nodes; wl = w.node_tree.links
bg_cam = wn.new("ShaderNodeBackground"); bg_cam.inputs[0].default_value = C.hex_rgba(PAPER); bg_cam.inputs[1].default_value = 1.0
lp_ = wn.new("ShaderNodeLightPath"); mx_ = wn.new("ShaderNodeMixShader")
wl.new(lp_.outputs["Is Camera Ray"], mx_.inputs[0]); wl.new(wn["Background"].outputs[0], mx_.inputs[1]); wl.new(bg_cam.outputs[0], mx_.inputs[2])
wl.new(mx_.outputs[0], wn["World Output"].inputs["Surface"])

bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0))
table = bpy.context.object; table.name = "Table"; table.data.materials.append(M_PAPER)

sun_d = bpy.data.lights.new("Key light", "SUN"); sun_d.energy = 2.3; sun_d.angle = math.radians(9)
sun_d.color = (1.0, 0.975, 0.94)
sun = bpy.data.objects.new("Key light", sun_d); coll.objects.link(sun)
sun.rotation_euler = (math.radians(38), math.radians(-18), math.radians(-30))
fill_d = bpy.data.lights.new("Fill", "AREA"); fill_d.energy = 350; fill_d.size = 30; fill_d.color = (0.94, 0.96, 1.0)
fill = bpy.data.objects.new("Fill", fill_d); coll.objects.link(fill); fill.location = (-14, -18, 20)
fill.rotation_euler = (math.radians(45), 0, math.radians(-35))


# ---------------------------------------------------------------- helpers: solids
def rounded_rect_path(x, y, w_, h, r_):
    r_ = min(r_, w_ / 2, h / 2)
    return (f"M{x + r_} {y}h{w_ - 2 * r_}c{r_ * .552} 0 {r_} {r_ * .448} {r_} {r_}v{h - 2 * r_}"
            f"c0 {r_ * .552}-{r_ * .448} {r_}-{r_} {r_}h-{w_ - 2 * r_}c-{r_ * .552} 0-{r_}-{r_ * .448}-{r_}-{r_}"
            f"v-{h - 2 * r_}c0-{r_ * .552} {r_ * .448}-{r_} {r_}-{r_}Z")


def solid_from_path(name, d, depth, bevel, mat, parent=None, scale=1.0):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "2D"; cu.fill_mode = "BOTH"
    C.fill_path(cu, d)
    cu.extrude = depth; cu.bevel_depth = bevel; cu.bevel_resolution = 4; cu.resolution_u = 18
    cu.materials.append(mat)
    o = bpy.data.objects.new(name, cu); coll.objects.link(o); o.parent = parent
    o.scale = (scale, scale, scale)
    return o


def slab(name, w_, h, t, r_, mat, parent=None):
    """A card: a rounded slab lying in its local XY, top face at z=t."""
    d = rounded_rect_path(-w_ / 2, -h / 2, w_, h, r_)
    o = solid_from_path(name, d, t / 2, min(0.03, t / 3), mat, parent)
    o.data.offset = 0
    return o


def text3d(name, body, fam, weight, size, mat, depth=0.02, align="CENTER", parent=None, spacing=0.965):
    cu = bpy.data.curves.new(name, "FONT"); cu.body = body
    cu.font = C.font(C.font_file(fam, weight)); cu.size = size
    cu.align_x = align; cu.align_y = "CENTER"; cu.extrude = depth; cu.bevel_depth = 0.004; cu.space_character = spacing
    cu.materials.append(mat)
    o = bpy.data.objects.new(name, cu); coll.objects.link(o); o.parent = parent
    return o


def empty(name, loc=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, None); coll.objects.link(o); o.location = loc; o.parent = parent
    o.empty_display_size = 0.3
    return o


# ---------------------------------------------------------------- Amigo, solid
AMIGO_BODY = "M13 3h6c4.4 0 7 2.9 7 7.3v9c0 4.2-2.7 6.7-6.9 6.7h-6.2C8.7 26 6 23.5 6 19.3v-9C6 5.9 8.6 3 13 3Z"
APERTURE = rounded_rect_path(10.9, 9, 10.2, 5.3, 2.3)
amigo = empty("Amigo", (0, 0, 0))                      # feet on the table
amigo_lean = empty("Amigo lean", parent=amigo)         # rotation about the feet
amigo_sq = empty("Amigo squash", parent=amigo_lean)    # squash/stretch about the feet
AM_S = 0.06                                            # svg unit -> m (32 units ~ 1.9 m)
# svg (x right, y down, feet at y=30) -> standing in the XZ plane, facing -Y
amigo_geo = empty("Amigo body space", parent=amigo_sq)
amigo_geo.rotation_euler = (math.radians(90), 0, 0)
amigo_geo.location = (-16 * AM_S, 0, 30 * AM_S)
amigo_geo.scale = (AM_S, AM_S, AM_S)
body = solid_from_path("Amigo body", AMIGO_BODY + " " + APERTURE, 3.2, 0.6, M_INK, amigo_geo)
legs = solid_from_path("Amigo legs", rounded_rect_path(9, 21.5, 6, 8.5, 3) + " " + rounded_rect_path(17, 21.5, 6, 8.5, 3), 2.6, 0.5, M_INK, amigo_geo)
# the aperture is a window: a paper-lit visor inset behind it
visor = solid_from_path("Amigo visor", APERTURE, 0.4, 0.0, pbr("Visor", "F6F5F1", rough=0.3, emit="F6F5F1", emit_strength=0.25), amigo_geo)
visor.location = (0, 0, -1.5)
for o in (body, legs):
    o.data.offset = 0

# ---------------------------------------------------------------- glyph field (GN)
JSON = open(os.path.join(HERE, "pikachu-head.json")).read() if os.path.exists(os.path.join(HERE, "pikachu-head.json")) else None


def glyph_field():
    ng = bpy.data.node_groups.new("Glyph Field", "GeometryNodeTree")
    s = lambda n, k, d=None, io="INPUT": C._sock(ng, n, k, io, d)
    s("Geometry", "NodeSocketGeometry", io="OUTPUT"); s("Geometry", "NodeSocketGeometry")
    s("String", "NodeSocketString"); s("Font", "NodeSocketFont"); s("Material", "NodeSocketMaterial")
    s("Size", "NodeSocketFloat", 0.32); s("Depth", "NodeSocketFloat", 0.06)
    s("Rain Start", "NodeSocketFloat", 0.4); s("Rain End", "NodeSocketFloat", 6.4)
    s("Drop Height", "NodeSocketFloat", 14.0); s("Pile Radius", "NodeSocketFloat", 7.5)
    s("Sort Start", "NodeSocketFloat", 11.25); s("Sort Spread", "NodeSocketFloat", 1.6)
    s("Page Origin", "NodeSocketVector"); s("Page Scale", "NodeSocketFloat", 1.0); s("Page Glyph Scale", "NodeSocketFloat", 0.6)
    s("Exit Start", "NodeSocketFloat", 15.0); s("Exit Spread", "NodeSocketFloat", 0.7)
    N, L = ng.nodes, ng.links
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    T = N.new("GeometryNodeInputSceneTime").outputs["Seconds"]

    def m(op, a, b=None, c=None):
        n = N.new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate((a, b, c)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                L.new(v, n.inputs[i])
        return n.outputs[0]

    def vm(op, a, b=None, fac=None):
        n = N.new("ShaderNodeVectorMath"); n.operation = op
        L.new(a, n.inputs[0])
        if b is not None:
            if isinstance(b, (int, float)):
                n.inputs[3 if op == "SCALE" else 1].default_value = b if op == "SCALE" else (b, b, b)
            else:
                L.new(b, n.inputs[3 if op == "SCALE" else 1])
        return n.outputs[0 if op != "LENGTH" else 1]

    def comb(x, y, z):
        n = N.new("ShaderNodeCombineXYZ")
        for i, v in enumerate((x, y, z)):
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                L.new(v, n.inputs[i])
        return n.outputs[0]

    def rnd(seed):
        n = N.new("FunctionNodeRandomValue"); n.data_type = "FLOAT"; n.inputs["Seed"].default_value = seed
        idx = N.new("GeometryNodeInputIndex"); L.new(idx.outputs[0], n.inputs["ID"])
        return n.outputs[0]

    def clamp01(v):
        n = N.new("ShaderNodeClamp"); L.new(v, n.inputs[0]); return n.outputs[0]

    def smooth(v):
        mr = N.new("ShaderNodeMapRange"); mr.interpolation_type = "SMOOTHERSTEP"; L.new(v, mr.inputs["Value"]); return mr.outputs[0]

    stc = N.new("GeometryNodeStringToCurves")
    L.new(gi.outputs["String"], stc.inputs["String"]); L.new(gi.outputs["Font"], stc.inputs["Font"])
    stc.inputs["Size"].default_value = 1.0
    fill = N.new("GeometryNodeFillCurve"); L.new(stc.outputs["Curve Instances"], fill.inputs["Curve"])
    ex = N.new("GeometryNodeExtrudeMesh"); ex.mode = "FACES"; L.new(fill.outputs[0], ex.inputs["Mesh"])
    dd = m("DIVIDE", gi.outputs["Depth"], gi.outputs["Size"]); L.new(dd, ex.inputs["Offset Scale"])
    # glyphs lie flat, face up; the page layout is in x/y already (y down lines -> -y)
    inst = ex.outputs["Mesh"]
    pos = N.new("GeometryNodeInputPosition").outputs[0]
    sep = N.new("ShaderNodeSeparateXYZ"); L.new(pos, sep.inputs[0])
    size = gi.outputs["Size"]
    # page position: layout * size * page scale + origin
    page = vm("ADD", vm("SCALE", comb(sep.outputs[0], sep.outputs[1], 0.0), m("MULTIPLY", size, gi.outputs["Page Scale"])), gi.outputs["Page Origin"])
    # pile position: a golden-angle disk, denser in the middle
    r1, r2, r3, r4 = rnd(1), rnd(2), rnd(3), rnd(4)
    ang = m("MULTIPLY", r1, 6.2832)
    rad = m("MULTIPLY", m("POWER", r2, 0.6), gi.outputs["Pile Radius"])
    px_ = m("MULTIPLY", m("COSINE", ang), rad); py_ = m("MULTIPLY", m("SINE", ang), m("MULTIPLY", rad, 0.62))
    # keep a clearing around Amigo at the origin
    clear = m("MAXIMUM", m("DIVIDE", 1.3, m("MAXIMUM", rad, 0.01)), 1.0)
    pile = comb(m("MULTIPLY", px_, clear), m("MULTIPLY", py_, clear), m("MULTIPLY", r3, 0.35))
    # rain: each glyph drops at d_i, falling under gravity, with one small bounce
    d_i = m("ADD", gi.outputs["Rain Start"], m("MULTIPLY", m("POWER", r4, 0.8), m("SUBTRACT", gi.outputs["Rain End"], gi.outputs["Rain Start"])))
    u = m("SUBTRACT", T, d_i)
    tf = m("SQRT", m("DIVIDE", m("MULTIPLY", gi.outputs["Drop Height"], 2), 30.0))  # g = 30 m/s^2
    fall = m("MAXIMUM", m("SUBTRACT", gi.outputs["Drop Height"], m("MULTIPLY", m("MULTIPLY", u, u), 15.0)), 0.0)
    bu = m("SUBTRACT", u, tf)
    bounce = m("MAXIMUM", m("MULTIPLY", m("SINE", m("MULTIPLY", m("DIVIDE", bu, 0.32), 3.1416)), 0.35), 0.0)
    bounce = m("MULTIPLY", bounce, m("LESS_THAN", bu, 0.32))
    z_rain = m("ADD", fall, m("MULTIPLY", bounce, m("GREATER_THAN", bu, 0.0)))
    z_rain = m("ADD", z_rain, m("MULTIPLY", m("LESS_THAN", u, 0.0), 40.0))  # not yet fallen: far above
    rain_pos = vm("ADD", pile, comb(0.0, 0.0, z_rain))
    # sort: lift, fly to the page, settle (staggered by line order = index)
    idx = N.new("GeometryNodeInputIndex").outputs[0]
    order = m("DIVIDE", idx, 1400.0)
    a_lin = clamp01(m("DIVIDE", m("SUBTRACT", T, m("ADD", gi.outputs["Sort Start"], m("MULTIPLY", m("MINIMUM", order, 1.0), gi.outputs["Sort Spread"]))), 0.85))
    a = smooth(a_lin)
    lift = m("MULTIPLY", m("SINE", m("MULTIPLY", a, 3.1416)), m("ADD", 1.8, m("MULTIPLY", r3, 1.6)))
    mix = N.new("ShaderNodeMix"); mix.data_type = "VECTOR"; L.new(a, mix.inputs["Factor"])
    L.new(rain_pos, mix.inputs[4]); L.new(page, mix.inputs[5])
    target = vm("ADD", mix.outputs[1], comb(0.0, 0.0, lift))
    # exit: glyphs sink into the table as the cards rise
    e = smooth(clamp01(m("DIVIDE", m("SUBTRACT", T, m("ADD", gi.outputs["Exit Start"], m("MULTIPLY", r2, gi.outputs["Exit Spread"]))), 0.35)))
    target = vm("ADD", target, comb(0.0, 0.0, m("MULTIPLY", e, -0.6)))
    sp = N.new("GeometryNodeSetPosition"); L.new(inst, sp.inputs["Geometry"]); L.new(target, sp.inputs["Position"])
    # tumble while falling / piled, straighten while sorting
    rot_z = m("MULTIPLY", m("SUBTRACT", r1, 0.5), m("MULTIPLY", m("SUBTRACT", 1.0, a), 3.2))
    rot_x = m("MULTIPLY", m("SUBTRACT", r3, 0.5), m("MULTIPLY", m("SUBTRACT", 1.0, a), m("MINIMUM", fall, 1.0)))
    ri = N.new("GeometryNodeRotateInstances"); L.new(sp.outputs[0], ri.inputs["Instances"])
    L.new(comb(rot_x, 0.0, rot_z), ri.inputs["Rotation"]); ri.inputs["Local Space"].default_value = True
    si = N.new("GeometryNodeScaleInstances"); L.new(ri.outputs[0], si.inputs["Instances"])
    gsc = m("ADD", 1.0, m("MULTIPLY", a, m("SUBTRACT", gi.outputs["Page Glyph Scale"], 1.0)))
    sc_ = m("MULTIPLY", m("MULTIPLY", size, gsc), m("SUBTRACT", 1.0, e))
    L.new(comb(sc_, sc_, sc_), si.inputs["Scale"])
    real = N.new("GeometryNodeRealizeInstances"); L.new(si.outputs[0], real.inputs[0])
    sm = N.new("GeometryNodeSetMaterial"); L.new(real.outputs[0], sm.inputs["Geometry"]); L.new(gi.outputs["Material"], sm.inputs["Material"])
    shade = N.new("GeometryNodeSetShadeSmooth"); L.new(sm.outputs[0], shade.inputs["Geometry"]); shade.inputs["Shade Smooth"].default_value = False
    L.new(shade.outputs[0], go.inputs[0])
    return ng


PIKA = open(os.path.join(ROOT, "..", "imago-launch", "compositions", "frames", "02-avalanche.html")).read()
import re, json as _json  # noqa: E402
FIRST = _json.loads(re.search(r"var FIRST = (\[.*?\]);", PIKA, re.S).group(1))
lines = FIRST[:64]
page_text = "\n".join(lines)
GF = glyph_field()


def field(name, text, mat, **kw):
    me = bpy.data.meshes.new(name); o = bpy.data.objects.new(name, me); coll.objects.link(o)
    mod = o.modifiers.new("Glyph Field", "NODES"); mod.node_group = GF
    C.set_input(o, "Glyph Field", "String", text)
    C.set_input(o, "Glyph Field", "Font", C.font(C.font_file("JetBrains Mono", 500)))
    C.set_input(o, "Glyph Field", "Material", mat)
    for k, v in kw.items():
        C.set_input(o, "Glyph Field", k, v)
    return o


# split the page into keys (ink) and values (muted / blue) by blanking, like the syntax colours
def layer(text, pick):
    out = []
    for ln in text.split("\n"):
        s = ""; in_str = False; is_key = False
        for i, ch in enumerate(ln):
            s += ch if pick(ln, i) else " "
        out.append(s)
    return "\n".join(out)


def is_value(ln, i):
    k = ln.find(":")
    return k >= 0 and i > k


PAGE_ORIGIN = (-4.6, 4.6, 0.02)
common = dict(**{"Page Origin": PAGE_ORIGIN, "Page Scale": 0.4, "Page Glyph Scale": 0.4, "Size": 0.5, "Pile Radius": 9.0, "Depth": 0.12})
f_keys = field("Glyphs: keys", layer(page_text, lambda ln, i: not is_value(ln, i)), M_INK, **common)
f_vals = field("Glyphs: values", layer(page_text, is_value), pbr("Value blue", "3F6FB5", rough=0.45), **common)

# ---------------------------------------------------------------- the GET bar + button
bar = empty("GET bar", (0, -2.2, 0))
bar_slab = slab("GET bar slab", 9.6, 1.5, 0.35, 0.45, M_CARD, bar)
chip = slab("GET chip", 1.3, 0.9, 0.08, 0.2, pbr("Chip", "F1EFE9", rough=0.7), bar); chip.location = (-3.95, 0, 0.35)
chip_t = text3d("GET label", "GET", "JetBrains Mono", 500, 0.36, M_INK, 0.01, parent=bar); chip_t.location = (-3.95, 0, 0.45)
btn = empty("Button", (4.05, 0, 0.35), bar)
btn_slab = slab("Button slab", 1.0, 1.0, 0.3, 0.22, M_INK, btn)
arrow_c = C.path_curve("Arrow path", coll, "M4 12h15M13 6l6 6-6 6", parent=btn)
arrow_c.scale = (0.035, 0.035, 1); arrow_c.location = (-0.4, 0.42, 0.32)
arrow = C.gn_obj("Arrow", coll, M_PAPERTXT, C.gn_stroke(), "Stroke", parent=btn)
C.set_input(arrow, "Stroke", "Path", arrow_c); C.set_input(arrow, "Stroke", "Width", 2.2)
arrow.scale = arrow_c.scale; arrow.location = (-0.4, 0.42, 0.33)
url = C.gn_obj("URL (typed)", coll, M_INK, C.gn_text(), "Text", parent=bar)
C.set_input(url, "Text", "String", "https://pokeapi.co/api/v2/pokemon/pikachu")
C.set_input(url, "Text", "Size", 0.36); C.set_input(url, "Text", "Font", C.font(C.font_file("JetBrains Mono", 400)))
url.location = (-3.1, -0.12, 0.36)

# ---------------------------------------------------------------- cards (the interfaces)
APPS = ["pokemon", "weather", "currency", "library", "thirukkural", "wikipedia", "sunrise", "charizard"]
cards = []
for i, app in enumerate(APPS):
    c = empty(f"Card {i + 1} {app}")
    s_ = slab(f"Card {i + 1} slab", 4.8, 3.0, 0.12, 0.16, M_CARD, c)
    face_m = bpy.data.meshes.new(f"Card {i + 1} face")
    face_m.from_pydata([(-2.3, -1.4375, 0), (2.3, -1.4375, 0), (2.3, 1.4375, 0), (-2.3, 1.4375, 0)], [], [(0, 1, 2, 3)])
    uv = face_m.uv_layers.new(name="UVMap")
    for li, (u_, v_) in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[li].uv = (u_, v_)
    face_m.materials.append(pbr(f"Screen {app}", "FFFFFF", rough=0.5, image=os.path.join(A, f"app-{app}.png")))
    face = bpy.data.objects.new(f"Card {i + 1} screen", face_m); coll.objects.link(face); face.parent = c; face.location = (0, 0, 0.125)
    cards.append(c)

# ---------------------------------------------------------------- type (3D, set on the table or standing)
def headline(name, body, size=1.0, weight=600, fam="Inter Display", mat=M_INK):
    t = text3d(name, body, fam, weight, size, mat, depth=0.06)
    return t

h1 = headline("Headline: raw JSON", "Every API answers in JSON.", 0.9)
h2 = headline("Headline: lines", "15,411 lines of it.", 0.9)
h3 = headline("Headline: paste", "Paste it. Press it.", 0.9)
h4 = headline("Headline: shape", "Imago reads the shape.", 0.9)
h5 = headline("Headline: drop", "Whatever it returns.", 1.1)
h6 = headline("Headline: watch", "Watches it change.", 0.9)
h7 = headline("Headline: end", "APIs become interfaces.", 0.95)
urlpill = empty("URL pill", (0, -3.2, 0))
up_s = slab("URL pill slab", 4.6, 0.8, 0.12, 0.4, M_INK, urlpill)
up_t = text3d("URL pill text", "imago.onslate.in", "JetBrains Mono", 500, 0.36, M_PAPERTXT, 0.01, parent=urlpill); up_t.location = (0, 0, 0.13)

# ---------------------------------------------------------------- the Imago mark (end)
MARK = ("M13.6 6.4h8c4.4 0 7 2.9 7 7.3v7.1c0 4.2-2.7 6.8-6.9 6.8h-8.1c-3.8 0-6-2.3-6-6.1v-9c0-3.8 2.2-6.1 6-6.1Z"
        "m7.8 6.2c-1.4 0-2.3.9-2.3 2.3v4.4c0 1.4.9 2.3 2.3 2.3h.7c1.4 0 2.3-.9 2.3-2.3v-4.4c0-1.4-.9-2.3-2.3-2.3h-.7Z")
mark = empty("Imago mark", (0, 1.2, 0))
mark_space = empty("Imago mark space", parent=mark)
mark_space.rotation_euler = (math.radians(90), 0, 0); mark_space.scale = (0.12, 0.12, 0.12); mark_space.location = (-15.8 * 0.12, 0, 27.6 * 0.12)
mk_body = solid_from_path("Mark window", MARK, 2.2, 0.5, M_INK, mark_space)
mk_bar1 = solid_from_path("Mark field bar 1", rounded_rect_path(4.2, 6.4, 12.8, 6, 3), 2.2, 0.5, M_INK, mark_space)
mk_bar2 = solid_from_path("Mark field bar 2", rounded_rect_path(3, 14.3, 11.5, 6, 3), 2.2, 0.5, M_INK, mark_space)
wordmark = text3d("Wordmark", "Imago", "Inter", 600, 2.2, M_INK, 0.35, align="LEFT")

# ---------------------------------------------------------------- camera
cam_d = bpy.data.cameras.new("Camera"); cam_d.lens = 38; cam_d.clip_start = 0.1; cam_d.clip_end = 500
cam_d.dof.use_dof = True; cam_d.dof.aperture_fstop = 5.6
cam = bpy.data.objects.new("Camera", cam_d); coll.objects.link(cam); sc.camera = cam
aim = empty("Camera aim", (0, 0, 1.0))
tr = cam.constraints.new("TRACK_TO"); tr.target = aim; tr.track_axis = "TRACK_NEGATIVE_Z"; tr.up_axis = "UP_Y"
cam_d.dof.focus_object = aim

print("scene objects:", len(sc.objects))

# ================================================================ choreography (128 bpm)
def b(n):
    """time of beat n (1-based) in seconds"""
    return (n - 1) * BEAT


def vec_key(o, path, pts, ease="power3.inOut"):
    for i in range(3):
        key(o, path, i, [(p[0], p[1][i]) + tuple(p[2:]) for p in pts], ease)


def show(o, t_in, t_out=None, pos=None, rot=(math.radians(90), 0, 0), s=1.0, rise=0.9, dur=0.32):
    """Type/prop entrance: rises out of the table and scales up; exit sinks back."""
    if pos:
        o.location = pos
    o.rotation_euler = rot
    base = tuple(o.location)
    low = (base[0], base[1], base[2] - rise)
    pts_s = [(0, (0, 0, 0), "hold"), (t_in - 0.001, (0, 0, 0), "expo.out"), (t_in + dur, (s, s, s))]
    pts_l = [(0, low, "hold"), (t_in - 0.001, low, "expo.out"), (t_in + dur, base)]
    if t_out:
        pts_s += [(t_out, (s, s, s), "power3.in"), (t_out + 0.22, (0, 0, 0), "hold")]
        pts_l += [(t_out, base, "power3.in"), (t_out + 0.22, low, "hold")]
    vec_key(o, "scale", pts_s); vec_key(o, "location", pts_l)


UP = (math.radians(90), 0, 0)
show(h1, b(3), BAR * 2 - 0.1, pos=(0, 3.4, 2.6))
show(h2, BAR * 2 + b(2), BAR * 4 - 0.1, pos=(0, 7.5, 4.2), s=1.25)
show(h3, BAR * 4 + b(2), BAR * 6 - 0.1, pos=(0, 2.4, 2.9))
show(h4, BAR * 6 + b(3), BAR * 8 - 0.12, pos=(1.3, -2.9, 0.05), rot=(0, 0, 0), s=0.62, rise=0.4)
show(h5, BAR * 8, BAR * 12 - 0.1, pos=(0, 0.6, 3.9), s=1.1)
show(h6, BAR * 12 + b(2), BAR * 14 - 0.1, pos=(-5.75, 2.45, 4.25), s=0.62, rot=(math.radians(90), 0, math.radians(-38)))

# ---------------------------------------------------------------- camera path
CAM = [
    (0.0, (0.0, -13.5, 6.4), (0.0, 1.2, 1.2), "sine.inOut"),
    (BAR * 2 - 0.2, (1.6, -12.0, 5.8), (0.0, 1.5, 1.3), "power3.inOut"),
    (BAR * 2 + 0.5, (0.0, -17.5, 13.0), (0.0, 3.0, 1.0), "sine.inOut"),       # crane up: the pile
    (BAR * 4 - 0.1, (-1.5, -18.5, 14.5), (0.0, 3.2, 1.0), "power3.inOut"),
    (BAR * 4 + 0.45, (1.2, -9.0, 3.8), (1.0, -1.6, 0.8), "sine.inOut"),        # down to the GET bar
    (BAR * 6 - 0.2, (2.8, -8.2, 3.2), (2.4, -1.8, 0.8), "power3.inOut"),
    (BAR * 6 + 0.35, (-0.6, -8.5, 13.0), (-1.2, 0.0, 0.0), "sine.inOut"),     # overhead: the sort
    (BAR * 8 - 0.05, (-0.9, -6.2, 10.5), (-1.3, 0.2, 0.0), "expo.out"),
    (BAR * 8 + 0.35, (0.0, -15.5, 4.2), (0.0, 1.8, 2.2), "sine.inOut"),        # the drop: cards
    (BAR * 10, (-9.5, -13.0, 5.0), (0.0, 1.8, 2.2), "sine.inOut"),
    (BAR * 12 - 0.15, (9.0, -13.5, 4.4), (0.0, 1.8, 2.0), "power3.inOut"),
    (BAR * 12 + 0.45, (-4.2, -8.0, 3.1), (-5.9, 2.6, 2.3), "sine.inOut"),       # push into the forecast card
    (BAR * 14 - 0.1, (-4.6, -7.2, 3.0), (-5.9, 2.6, 2.3), "power3.inOut"),
    (BAR * 14 + 0.4, (0.0, -11.5, 12.0), (0.0, 1.0, 0.0), "sine.inOut"),        # cards topple: overhead
    (BAR * 14 + 1.0, (0.0, -12.5, 3.2), (0.0, 1.2, 2.3), "power3.inOut"),       # end card
    (30.0, (0.0, -12.1, 3.15), (0.0, 1.2, 2.3), "linear"),
]
vec_key(cam, "location", [(t, p, e) for t, p, _, e in CAM])
vec_key(aim, "location", [(t, a, e) for t, _, a, e in CAM])

# ---------------------------------------------------------------- Amigo
def bob(t0, t1, amt=0.07):
    """a squash on every beat, anchored at the feet"""
    t = t0
    while t < t1 - 1e-6:
        key(amigo_sq, "scale", 0, [(t, 1 + amt * 0.6, "power2.out"), (t + 0.12, 1.0, "power2.inOut")])
        key(amigo_sq, "scale", 2, [(t, 1 - amt, "power2.out"), (t + 0.12, 1.0, "power2.inOut")])
        t += BEAT


def hop(t0, t1, frm, to, height=1.2, spin=0.0, land_sq=0.2):
    key(amigo, "location", 0, [(t0, frm[0], "power2.inOut"), (t1, to[0], "hold")])
    key(amigo, "location", 1, [(t0, frm[1], "power2.inOut"), (t1, to[1], "hold")])
    mid = (t0 + t1) / 2
    key(amigo, "location", 2, [(t0, frm[2], "power2.out"), (mid, max(frm[2], to[2]) + height, "power2.in"), (t1, to[2], "hold")])
    key(amigo_sq, "scale", 2, [(t0 - 0.08, 1.0, "power2.in"), (t0, 0.86, "power2.out"), (t0 + 0.08, 1.12, "sine.inOut"), (t1 - 0.02, 1.0, "power2.out"), (t1, 1 - land_sq, "power2.out"), (t1 + 0.14, 1.0, "back.out(2)")])
    key(amigo_sq, "scale", 0, [(t0 - 0.08, 1.0, "power2.in"), (t0, 1.1, "power2.out"), (t0 + 0.08, 0.94, "sine.inOut"), (t1 - 0.02, 1.0, "power2.out"), (t1, 1 + land_sq * 0.7, "power2.out"), (t1 + 0.14, 1.0, "back.out(2)")])
    if spin:
        key(amigo_lean, "rotation_euler", 2, [(t0, 0.0, "power2.inOut"), (t1, spin, "hold")])


amigo.location = (0, 0, 0)
bob(0, b(5))
# rain: Amigo looks up (lean back), dodges left then right as the glyphs land
key(amigo_lean, "rotation_euler", 0, [(0, 0.0), (b(4), 0.0, "power2.out"), (b(4) + 0.2, math.radians(-12), "power2.inOut"), (b(6), math.radians(-12), "power2.inOut"), (b(6) + 0.2, 0.0, "hold")])
hop(b(6), b(7), (0, 0, 0), (-1.2, -0.4, 0), 0.8)
hop(b(8), b(9), (-1.2, -0.4, 0), (1.0, -0.2, 0), 0.9)
hop(b(10), b(11), (1.0, -0.2, 0), (0, 0, 0), 0.8, spin=math.radians(360))
# shiver under the last drops (deterministic)
for k in range(8):
    key(amigo_lean, "rotation_euler", 1, [(b(12) + k * 0.06, math.radians((-1) ** k * 4 * (1 - k / 8)), "sine.inOut")])
key(amigo_lean, "rotation_euler", 1, [(b(12) + 0.5, 0.0, "hold")])
bob(b(13), b(17))
# onto the button: hop up at bar 5 beat 4, then charge on each eighth, launch on beat 8
BTN_TOP = (4.05, -2.2, 0.65)
hop(b(20), b(21), (0, 0, 0), BTN_TOP, 1.6)
for k in range(7):
    t = b(21) + k * BEAT / 2
    key(amigo_sq, "scale", 2, [(t, 1 - 0.05 * (k + 1), "power2.out")])
    key(amigo_sq, "scale", 0, [(t, 1 + 0.035 * (k + 1), "power2.out")])
    key(btn, "location", 2, [(t, 0.35 - 0.018 * (k + 1), "power2.out")])
LAUNCH = BAR * 6
key(amigo_sq, "scale", 2, [(LAUNCH, 1.35, "expo.out"), (LAUNCH + 0.3, 1.0, "power2.inOut")])
key(amigo_sq, "scale", 0, [(LAUNCH, 0.8, "expo.out"), (LAUNCH + 0.3, 1.0, "power2.inOut")])
key(amigo, "location", 2, [(LAUNCH, BTN_TOP[2], "expo.out"), (LAUNCH + 0.7, 13.0, "hold")])
key(btn, "location", 2, [(LAUNCH, 0.15, "back.out(3)"), (LAUNCH + 0.25, 0.35, "hold")])
# lands on the finished page, top right corner, on the downbeat of bar 8
PAGE_LAND = (1.4, 2.8, 0.08)
key(amigo, "location", 0, [(LAUNCH + 0.7, 4.05, "hold"), (BAR * 7 + b(3), PAGE_LAND[0], "hold")])
key(amigo, "location", 1, [(LAUNCH + 0.7, -2.2, "hold"), (BAR * 7 + b(3), PAGE_LAND[1], "hold")])
key(amigo, "location", 2, [(BAR * 7 + b(3), 13.0, "power3.in"), (BAR * 7 + b(4), PAGE_LAND[2], "hold")])
key(amigo_sq, "scale", 2, [(BAR * 7 + b(4), 0.72, "power2.out"), (BAR * 7 + b(4) + 0.18, 1.0, "back.out(2)")])
key(amigo_sq, "scale", 0, [(BAR * 7 + b(4), 1.2, "power2.out"), (BAR * 7 + b(4) + 0.18, 1.0, "back.out(2)")])
# the drop: jump to the middle of the arena, groove, spin on bar 10
hop(BAR * 8, BAR * 8 + BEAT, PAGE_LAND, (0, -0.6, 0), 2.2)
bob(BAR * 8 + BEAT * 2, BAR * 10)
key(amigo_lean, "rotation_euler", 2, [(BAR * 10, 0.0, "power3.inOut"), (BAR * 10 + BEAT, math.radians(360), "hold")])
hop(BAR * 10, BAR * 10 + BEAT, (0, -0.6, 0), (0, -0.6, 0), 1.8)
bob(BAR * 10 + BEAT * 2, BAR * 12)
# watches it change: Amigo turns to the forecast card and jolts on each change
key(amigo_lean, "rotation_euler", 2, [(BAR * 12, math.radians(360), "power2.inOut"), (BAR * 12 + 0.3, math.radians(360 + 40), "hold")])
for k, tt in enumerate((BAR * 12 + b(5), BAR * 12 + b(6))):
    hop(tt, tt + BEAT * 0.5, (0, -0.6, 0), (0, -0.6, 0), 0.5, land_sq=0.12)
# end: Amigo hops onto the lockup and ... becomes part of the ground (steps off frame left)
key(amigo_lean, "rotation_euler", 2, [(BAR * 14, math.radians(400), "power2.inOut"), (BAR * 14 + 0.3, math.radians(360), "hold")])
hop(BAR * 14 + b(3), BAR * 14 + b(4), (0, -0.6, 0), (4.6, -0.2, 0), 1.2)
key(amigo_lean, "rotation_euler", 2, [(BAR * 15, math.radians(360), "power2.inOut"), (BAR * 15 + 0.3, math.radians(360 - 25), "hold")])
bob(BAR * 15 + 0.4, 29.0, 0.04)

# ---------------------------------------------------------------- GET bar + typing
bar.location = (0, -2.2, 0)
key(bar, "location", 0, [(0, 18.0, "hold"), (BAR * 4 - 0.001, 18.0, "expo.out"), (BAR * 4 + 0.42, 0.0, "hold"), (LAUNCH + 0.35, 0.0, "power3.in"), (LAUNCH + 0.8, -18.0, "hold")])
lp = C.input_path(url, "Text", "Length")
C.set_input(url, "Text", "Length", 0)
url.keyframe_insert(lp, frame=t2f(BAR * 4 + b(3)))
C.set_input(url, "Text", "Length", 41)
url.keyframe_insert(lp, frame=t2f(BAR * 5))
fc = find_fc(url, lp, 0)
for kp in fc.keyframe_points:
    kp.interpolation = "LINEAR"

# ---------------------------------------------------------------- glyph field timings (the heart of it)
for o in (f_keys, f_vals):
    C.set_input(o, "Glyph Field", "Rain Start", 0.35)
    C.set_input(o, "Glyph Field", "Rain End", BAR * 3 + 0.3)
    C.set_input(o, "Glyph Field", "Sort Start", LAUNCH + 0.05)
    C.set_input(o, "Glyph Field", "Sort Spread", 2.3)
    C.set_input(o, "Glyph Field", "Exit Start", BAR * 8)

# ---------------------------------------------------------------- cards rise on the drop, one per beat
R = 8.0
card_home = []
for i, c in enumerate(cards):
    th = math.radians(-78 + i * (156 / 7))
    home = (math.sin(th) * R, math.cos(th) * R * 0.55 + 1.6, 1.75 + (i % 2) * 0.25)
    rot = (math.radians(90 - 6), 0, -th * 0.9)
    card_home.append((home, rot))
    t_in = BAR * 8 + i * BEAT
    under = (home[0] * 0.8, home[1], -2.5)
    vec_key(c, "location", [(0, under, "hold"), (t_in - 0.001, under, "expo.out"), (t_in + 0.42, home)])
    vec_key(c, "rotation_euler", [(0, (0, 0, -th), "hold"), (t_in - 0.001, (math.radians(-30), 0, -th * 0.9), "expo.out"), (t_in + 0.5, rot)])
# forecast card (index 1) comes forward for "watches it change"
fc_card = cards[1]
home, rot = card_home[1]
near = (-5.9, 2.6, 2.3)
vec_key(fc_card, "location", [(BAR * 12, home, "power3.inOut"), (BAR * 12 + 0.45, near)])
vec_key(fc_card, "rotation_euler", [(BAR * 12, rot, "power3.inOut"), (BAR * 12 + 0.45, (math.radians(90), 0, math.radians(-38)))])
# the change: an amber wash over the temperature value, pulsing on beats 5 and 6
wash = slab("Changed wash", 0.95, 0.52, 0.02, 0.07, M_AMBER, fc_card)
wash.location = (-1.28, 0.28, 0.13)
vec_key(wash, "scale", [(0, (0, 0, 0), "hold"), (BAR * 12 + b(5) - 0.001, (0, 0, 0), "back.out(2)"), (BAR * 12 + b(5) + 0.22, (1, 1, 1))])
key(M_AMBER.node_tree.nodes["Principled BSDF"], 'inputs[27].default_value', None, []) if False else None
em = M_AMBER.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
for t, v in ((0, 0.0), (BAR * 12 + b(5), 2.5), (BAR * 12 + b(5) + 0.35, 0.4), (BAR * 12 + b(6), 2.5), (BAR * 12 + b(6) + 0.35, 0.4)):
    em.default_value = v; em.keyframe_insert("default_value", frame=t2f(t))
live = slab("Live pill", 0.62, 0.2, 0.02, 0.1, M_GREEN, fc_card); live.location = (1.2, 1.25, 0.13)
vec_key(live, "scale", [(0, (0, 0, 0), "hold"), (BAR * 12 + b(3) - 0.001, (0, 0, 0), "back.out(2)"), (BAR * 12 + b(3) + 0.2, (1, 1, 1))])
# topple: every card falls flat onto the table, one per eighth, then sinks
for i, c in enumerate(cards):
    t0 = BAR * 14 + i * BEAT / 2
    hm, rt = (near, (math.radians(90), 0, math.radians(-38))) if i == 1 else card_home[i]
    flat = (hm[0] * 1.15, hm[1] + 1.2, 0.1)
    vec_key(c, "rotation_euler", [(t0, rt, "power2.in"), (t0 + 0.34, (0, 0, rt[2]), "hold")])
    vec_key(c, "location", [(t0, hm, "power2.in"), (t0 + 0.34, flat, "hold"), (BAR * 15, flat, "power3.in"), (BAR * 15 + 0.4, (flat[0], flat[1], -1.0), "hold")])

# ---------------------------------------------------------------- end lockup
mark.location = (-2.9, 1.2, 2.2); wordmark.location = (-1.0, 1.2, 2.2 + 1.27)
END = BAR * 14 + 1.0
show(mark, END, pos=(-2.9, 1.2, 2.2), rot=(0, 0, 0), rise=2.2, dur=0.5)
show(wordmark, END + BEAT, pos=(-1.0, 1.2, 2.2 + 1.27), rise=0.6)
show(h7, END + BEAT * 2, pos=(0, 1.2, 1.25), s=0.72, rise=0.5)
show(urlpill, END + BEAT * 2.5, pos=(0, 1.1, 0.45), rise=0.4)
# the mark's field bars slide in and merge (like the brand's reveal)
for o, dx in ((mk_bar1, -9.0), (mk_bar2, -12.0)):
    key(o, "location", 0, [(0, dx, "hold"), (END - 0.001, dx, "expo.out"), (END + 0.45, 0.0)])

# ---------------------------------------------------------------- sound
se = sc.sequence_editor_create()
S_ = os.path.join(A, "sfx")
snd = se.strips.new_sound("Music", os.path.join(A, "bgm", "track.mp3"), channel=1, frame_start=0); snd.volume = 0.9
cues = [
    ("rain", "a-rushing-paper-data-cascade.mp3", 0.35, 0.3), ("counter", "a-counter-tick-roll.mp3", BAR * 2 + b(2), 0.25),
    ("hop1", "a-whoosh-on-each-amigo-hop.mp3", b(6), 0.3), ("slide", "a-slide-whoosh.mp3", BAR * 4, 0.35),
    ("type", "typing-ticks.mp3", BAR * 4 + b(3), 0.3), ("charge", "rising-charge-ticks-on-each-eighth.mp3", b(21), 0.35),
    ("launch", "a-big-launch-boing-click.mp3", LAUNCH - 0.05, 0.4), ("sort", "soft-digital-blips-per-type-swap.mp3", LAUNCH + 0.3, 0.3),
    ("riser", "a-rising-riser-into-a-hard-silence-at-3-.mp3", BAR * 6, 0.3), ("drop", "a-big-drop-impact-at-0-0.mp3", BAR * 8, 0.4),
    ("chime1", "a-bright-chime-on-each-change.mp3", BAR * 12 + b(5), 0.35), ("chime2", "a-bright-chime-on-each-change.mp3", BAR * 12 + b(6), 0.3),
    ("switch", "a-switch-click.mp3", BAR * 12 + b(3), 0.3), ("topple", "a-slam-per-beat-4.mp3", BAR * 14, 0.3),
    ("pop", "soft-pop-on-the-landing.mp3" if os.path.exists(os.path.join(S_, "soft-pop-on-the-landing.mp3")) else "a-pop-as-amigo-bursts-out.mp3", BAR * 7 + b(4), 0.3),
]
for i, (nm, f, t, v) in enumerate(cues):
    p = os.path.join(S_, f)
    if not os.path.exists(p):
        src = os.path.join(ROOT, "..", "imago-launch", "assets", "sfx", f)
        if os.path.exists(src):
            import shutil; shutil.copy2(src, p)
    if os.path.exists(p):
        s = se.strips.new_sound(nm, p, channel=2 + i, frame_start=int(round(t2f(t)))); s.volume = v
# card slaps on each drop beat
for i in range(8):
    p = os.path.join(S_, "a-card-slap-on-each-beat-8.mp3")
    s = se.strips.new_sound(f"slap{i + 1}", p, channel=20 + i, frame_start=int(round(t2f(BAR * 8 + i * BEAT)))); s.volume = 0.3

# ---------------------------------------------------------------- output
r.image_settings.media_type = "VIDEO"; r.image_settings.file_format = "FFMPEG"
r.ffmpeg.format = "MPEG4"; r.ffmpeg.codec = "H264"; r.ffmpeg.constant_rate_factor = "HIGH"; r.ffmpeg.ffmpeg_preset = "GOOD"
r.ffmpeg.audio_codec = "AAC"; r.ffmpeg.audio_bitrate = 256; r.ffmpeg.audio_mixrate = 48000
r.use_sequencer = False  # the sound strips mix in; the picture is the 3D scene
r.filepath = "//renders/imago-paper-machine.mp4"
sc.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
bpy.ops.file.make_paths_relative()
bpy.ops.wm.save_mainfile()
print("saved", OUT)
