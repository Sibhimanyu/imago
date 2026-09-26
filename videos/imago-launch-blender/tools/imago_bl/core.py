"""Imago Blender core: units, colours, fonts, materials and the node groups every
scene is built from.

Space: 1 Blender unit = 100 CSS px. A stage point (px, py) with y down maps to
(px*S, -py*S). Scenes are 1920x1080 at 30 fps, frame 0 = t 0.

Every shape is a Geometry Nodes object whose sizes are modifier inputs (so they
can be keyframed and edited in the N-panel), coloured by the object's Color
(Object Properties > Viewport Display > Color). Its alpha is driven by the
"opacity" custom property of the object's layer empties, like CSS opacity.
"""
import bpy, math, os, re

S = 0.01            # BU per px
FPS = 30
EPS_Z = 2e-5        # paint-order step toward the camera
HERE = os.path.dirname(os.path.abspath(__file__))


# ---------------------------------------------------------------- colour
def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgba(h, a=1.0):
    h = h.lstrip("#")
    return tuple(srgb_to_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (a,)


def css_rgba(s):
    """'rgb(1, 2, 3)' / 'rgba(1, 2, 3, 0.5)' / '#abc' / 'transparent' -> linear rgba or None."""
    if not s:
        return None
    s = s.strip()
    if s in ("transparent", "none"):
        return None
    if s.startswith("#"):
        h = s[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return hex_rgba(h[:6], int(h[6:8], 16) / 255 if len(h) == 8 else 1.0)
    m = re.match(r"rgba?\(([^)]*)\)", s)
    if not m:
        return None
    parts = [p.strip() for p in re.split(r"[,\s/]+", m.group(1)) if p.strip()]
    r, g, b = (float(p) for p in parts[:3])
    a = float(parts[3]) if len(parts) > 3 else 1.0
    if a <= 0:
        return None
    return (srgb_to_lin(r / 255), srgb_to_lin(g / 255), srgb_to_lin(b / 255), a)


# ---------------------------------------------------------------- fonts
FONT_DIR = None  # set by the build (assets/fonts)
FONT_FILES = {
    ("inter display", 400): "InterDisplay-Medium.otf",
    ("inter display", 500): "InterDisplay-Medium.otf",
    ("inter display", 600): "InterDisplay-SemiBold.otf",
    ("inter display", 700): "InterDisplay-SemiBold.otf",
    ("inter", 400): "Inter-Regular.otf",
    ("inter", 500): "Inter-Medium.otf",
    ("inter", 600): "Inter-SemiBold.otf",
    ("inter", 700): "Inter-SemiBold.otf",
    ("jetbrains mono", 400): "JetBrainsMono-Regular.ttf",
    ("jetbrains mono", 500): "JetBrainsMono-Medium.ttf",
    ("jetbrains mono", 600): "JetBrainsMono-Medium.ttf",
}


def font_file(family, weight):
    fam = family.split(",")[0].strip().strip('"').strip("'").lower()
    if "mono" in fam:
        fam = "jetbrains mono"
    elif fam not in ("inter display", "inter"):
        fam = "inter"
    w = int(round(float(weight) / 100) * 100)
    w = min(max(w, 400), 700)
    return os.path.join(FONT_DIR, FONT_FILES[(fam, w)])


def font(path):
    for f in bpy.data.fonts:
        if bpy.path.abspath(f.filepath) == path:
            return f
    f = bpy.data.fonts.load(path)
    f.name = os.path.splitext(os.path.basename(path))[0]
    return f


_cap = {}


def blender_cap(fnt):
    """Cap height of 'H' at Blender text size 1 (fonts are normalised differently)."""
    if fnt.name in _cap:
        return _cap[fnt.name]
    c = bpy.data.curves.new("_cap", "FONT")
    c.body = "H"; c.font = fnt; c.size = 1.0
    o = bpy.data.objects.new("_cap", c)
    bpy.context.scene.collection.objects.link(o)
    lo, hi = ink_bounds(o)
    bpy.data.objects.remove(o); bpy.data.curves.remove(c)
    _cap[fnt.name] = hi[1] - lo[1]
    return _cap[fnt.name]


def ink_bounds(o):
    dg = bpy.context.evaluated_depsgraph_get()
    oe = o.evaluated_get(dg)
    me = oe.to_mesh()
    if not len(me.vertices):
        oe.to_mesh_clear()
        return (0, 0), (0, 0)
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]
    oe.to_mesh_clear()
    return (min(xs), min(ys)), (max(xs), max(ys))


# ---------------------------------------------------------------- node groups
def _sock(ng, name, kind, io="INPUT", default=None, lo=None, hi=None):
    s = ng.interface.new_socket(name, in_out=io, socket_type=kind)
    if default is not None:
        s.default_value = default
    if lo is not None:
        s.min_value = lo
    if hi is not None:
        s.max_value = hi
    return s


def _menu(node, name, value):
    node.inputs[name].default_value = value


def gn_rect():
    """IM Rect: a filled rounded rectangle whose top-left is (X, -Y) in local space,
    with UVs over the rect (optionally remapped to a sub-rect for cropped images)."""
    if "IM Rect" in bpy.data.node_groups:
        return bpy.data.node_groups["IM Rect"]
    ng = bpy.data.node_groups.new("IM Rect", "GeometryNodeTree")
    _sock(ng, "Geometry", "NodeSocketGeometry", "OUTPUT")
    _sock(ng, "Geometry", "NodeSocketGeometry")
    _sock(ng, "Material", "NodeSocketMaterial")
    for n, d in (("X", 0.0), ("Y", 0.0), ("Width", 1.0), ("Height", 1.0), ("Radius", 0.0), ("Border", 0.0)):
        _sock(ng, n, "NodeSocketFloat", default=d)
    for n, d in (("U0", 0.0), ("V0", 0.0), ("U1", 1.0), ("V1", 1.0)):
        _sock(ng, n, "NodeSocketFloat", default=d)
    N, L = ng.nodes, ng.links
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    w = N.new("ShaderNodeMath"); w.operation = "MAXIMUM"; w.inputs[1].default_value = 1e-5
    h = N.new("ShaderNodeMath"); h.operation = "MAXIMUM"; h.inputs[1].default_value = 1e-5
    L.new(gi.outputs["Width"], w.inputs[0]); L.new(gi.outputs["Height"], h.inputs[0])
    q = N.new("GeometryNodeCurvePrimitiveQuadrilateral"); q.mode = "RECTANGLE"
    L.new(w.outputs[0], q.inputs["Width"]); L.new(h.outputs[0], q.inputs["Height"])
    # radius clamped to half the short side
    mn = N.new("ShaderNodeMath"); mn.operation = "MINIMUM"
    L.new(w.outputs[0], mn.inputs[0]); L.new(h.outputs[0], mn.inputs[1])
    half = N.new("ShaderNodeMath"); half.operation = "MULTIPLY"; half.inputs[1].default_value = 0.4999
    L.new(mn.outputs[0], half.inputs[0])
    rr = N.new("ShaderNodeMath"); rr.operation = "MINIMUM"
    L.new(gi.outputs["Radius"], rr.inputs[0]); L.new(half.outputs[0], rr.inputs[1])
    fil = N.new("GeometryNodeFilletCurve")
    L.new(q.outputs[0], fil.inputs["Curve"]); L.new(rr.outputs[0], fil.inputs["Radius"])
    _menu(fil, "Mode", "Poly")
    fil.inputs["Count"].default_value = 10
    fil.inputs["Limit Radius"].default_value = True
    # Border > 0: a ring (outer minus an inset rounded rect), filled even-odd
    bw = N.new("ShaderNodeMath"); bw.operation = "MULTIPLY"; bw.inputs[1].default_value = -2
    L.new(gi.outputs["Border"], bw.inputs[0])
    iw = N.new("ShaderNodeMath"); iw.operation = "ADD"; L.new(w.outputs[0], iw.inputs[0]); L.new(bw.outputs[0], iw.inputs[1])
    ih = N.new("ShaderNodeMath"); ih.operation = "ADD"; L.new(h.outputs[0], ih.inputs[0]); L.new(bw.outputs[0], ih.inputs[1])
    iw2 = N.new("ShaderNodeMath"); iw2.operation = "MAXIMUM"; iw2.inputs[1].default_value = 1e-5; L.new(iw.outputs[0], iw2.inputs[0])
    ih2 = N.new("ShaderNodeMath"); ih2.operation = "MAXIMUM"; ih2.inputs[1].default_value = 1e-5; L.new(ih.outputs[0], ih2.inputs[0])
    q2 = N.new("GeometryNodeCurvePrimitiveQuadrilateral"); q2.mode = "RECTANGLE"
    L.new(iw2.outputs[0], q2.inputs["Width"]); L.new(ih2.outputs[0], q2.inputs["Height"])
    ir = N.new("ShaderNodeMath"); ir.operation = "SUBTRACT"; L.new(rr.outputs[0], ir.inputs[0]); L.new(gi.outputs["Border"], ir.inputs[1])
    ir2 = N.new("ShaderNodeMath"); ir2.operation = "MAXIMUM"; ir2.inputs[1].default_value = 0.0; L.new(ir.outputs[0], ir2.inputs[0])
    fil2 = N.new("GeometryNodeFilletCurve"); _menu(fil2, "Mode", "Poly"); fil2.inputs["Count"].default_value = 10
    fil2.inputs["Limit Radius"].default_value = True
    L.new(q2.outputs[0], fil2.inputs["Curve"]); L.new(ir2.outputs[0], fil2.inputs["Radius"])
    has = N.new("FunctionNodeCompare"); has.data_type = "FLOAT"; has.operation = "GREATER_THAN"
    L.new(gi.outputs["Border"], has.inputs[0]); has.inputs[1].default_value = 1e-6
    sw = N.new("GeometryNodeSwitch"); sw.input_type = "GEOMETRY"
    L.new(has.outputs[0], sw.inputs["Switch"]); L.new(fil2.outputs[0], sw.inputs["True"])
    jn = N.new("GeometryNodeJoinGeometry"); L.new(sw.outputs[0], jn.inputs[0]); L.new(fil.outputs[0], jn.inputs[0])
    fill = N.new("GeometryNodeFillCurve"); _menu(fill, "Mode", "N-gons"); _menu(fill, "Fill Rule", "Even-Odd")
    L.new(jn.outputs[0], fill.inputs["Curve"])
    # move so the top-left corner is at (X, -Y)
    cx = N.new("ShaderNodeMath"); cx.operation = "MULTIPLY_ADD"; cx.inputs[1].default_value = 0.5
    L.new(w.outputs[0], cx.inputs[0]); L.new(gi.outputs["X"], cx.inputs[2])
    cy = N.new("ShaderNodeMath"); cy.operation = "MULTIPLY_ADD"; cy.inputs[1].default_value = 0.5
    L.new(h.outputs[0], cy.inputs[0]); L.new(gi.outputs["Y"], cy.inputs[2])
    ny = N.new("ShaderNodeMath"); ny.operation = "MULTIPLY"; ny.inputs[1].default_value = -1
    L.new(cy.outputs[0], ny.inputs[0])
    cv = N.new("ShaderNodeCombineXYZ"); L.new(cx.outputs[0], cv.inputs[0]); L.new(ny.outputs[0], cv.inputs[1])
    tr = N.new("GeometryNodeTransform"); L.new(fill.outputs[0], tr.inputs["Geometry"]); L.new(cv.outputs[0], tr.inputs["Translation"])
    # UV: (x-X)/W, (y+Y+H)/H remapped into [U0,U1] x [V0,V1]
    pos = N.new("GeometryNodeInputPosition"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(pos.outputs[0], sep.inputs[0])
    ux = N.new("ShaderNodeMath"); ux.operation = "SUBTRACT"; L.new(sep.outputs[0], ux.inputs[0]); L.new(gi.outputs["X"], ux.inputs[1])
    ud = N.new("ShaderNodeMath"); ud.operation = "DIVIDE"; L.new(ux.outputs[0], ud.inputs[0]); L.new(w.outputs[0], ud.inputs[1])
    vy = N.new("ShaderNodeMath"); vy.operation = "ADD"; L.new(sep.outputs[1], vy.inputs[0]); L.new(gi.outputs["Y"], vy.inputs[1])
    vy2 = N.new("ShaderNodeMath"); vy2.operation = "ADD"; L.new(vy.outputs[0], vy2.inputs[0]); L.new(h.outputs[0], vy2.inputs[1])
    vd = N.new("ShaderNodeMath"); vd.operation = "DIVIDE"; L.new(vy2.outputs[0], vd.inputs[0]); L.new(h.outputs[0], vd.inputs[1])
    mu = N.new("ShaderNodeMapRange"); mu.clamp = False
    L.new(ud.outputs[0], mu.inputs["Value"]); mu.inputs["From Min"].default_value = 0; mu.inputs["From Max"].default_value = 1
    L.new(gi.outputs["U0"], mu.inputs["To Min"]); L.new(gi.outputs["U1"], mu.inputs["To Max"])
    mv = N.new("ShaderNodeMapRange"); mv.clamp = False
    L.new(vd.outputs[0], mv.inputs["Value"]); mv.inputs["From Min"].default_value = 0; mv.inputs["From Max"].default_value = 1
    L.new(gi.outputs["V0"], mv.inputs["To Min"]); L.new(gi.outputs["V1"], mv.inputs["To Max"])
    uv = N.new("ShaderNodeCombineXYZ"); L.new(mu.outputs[0], uv.inputs[0]); L.new(mv.outputs[0], uv.inputs[1])
    st = N.new("GeometryNodeStoreNamedAttribute"); st.data_type = "FLOAT2"; st.domain = "CORNER"
    st.inputs["Name"].default_value = "UVMap"
    L.new(tr.outputs[0], st.inputs["Geometry"]); L.new(uv.outputs[0], st.inputs["Value"])
    sm = N.new("GeometryNodeSetMaterial"); L.new(st.outputs[0], sm.inputs["Geometry"]); L.new(gi.outputs["Material"], sm.inputs["Material"])
    L.new(sm.outputs[0], go.inputs[0])
    return ng


def gn_shape():
    """IM Shape: fills the curve of another object (an SVG path), optionally with a
    rounded-rect hole (Amigo's aperture, a mask knock-out). Even-odd, like SVG."""
    if "IM Shape" in bpy.data.node_groups:
        return bpy.data.node_groups["IM Shape"]
    ng = bpy.data.node_groups.new("IM Shape", "GeometryNodeTree")
    _sock(ng, "Geometry", "NodeSocketGeometry", "OUTPUT")
    _sock(ng, "Geometry", "NodeSocketGeometry")
    _sock(ng, "Material", "NodeSocketMaterial")
    _sock(ng, "Path", "NodeSocketObject")
    _sock(ng, "Hole", "NodeSocketBool", default=False)
    _sock(ng, "Hole Path", "NodeSocketObject")
    for n, d in (("Hole X", 0.0), ("Hole Y", 0.0), ("Hole Width", 1.0), ("Hole Height", 1.0), ("Hole Radius", 0.0)):
        _sock(ng, n, "NodeSocketFloat", default=d)
    N, L = ng.nodes, ng.links
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    oi = N.new("GeometryNodeObjectInfo"); oi.transform_space = "ORIGINAL"
    L.new(gi.outputs["Path"], oi.inputs["Object"])
    res = N.new("GeometryNodeSetSplineResolution"); res.inputs["Resolution"].default_value = 24
    L.new(oi.outputs["Geometry"], res.inputs["Geometry"])
    # hole: an IM Rect-like fillet quad, as a curve
    w = N.new("ShaderNodeMath"); w.operation = "MAXIMUM"; w.inputs[1].default_value = 1e-4; L.new(gi.outputs["Hole Width"], w.inputs[0])
    h = N.new("ShaderNodeMath"); h.operation = "MAXIMUM"; h.inputs[1].default_value = 1e-4; L.new(gi.outputs["Hole Height"], h.inputs[0])
    q = N.new("GeometryNodeCurvePrimitiveQuadrilateral"); q.mode = "RECTANGLE"
    L.new(w.outputs[0], q.inputs["Width"]); L.new(h.outputs[0], q.inputs["Height"])
    mn = N.new("ShaderNodeMath"); mn.operation = "MINIMUM"; L.new(w.outputs[0], mn.inputs[0]); L.new(h.outputs[0], mn.inputs[1])
    half = N.new("ShaderNodeMath"); half.operation = "MULTIPLY"; half.inputs[1].default_value = 0.4999; L.new(mn.outputs[0], half.inputs[0])
    rr = N.new("ShaderNodeMath"); rr.operation = "MINIMUM"; L.new(gi.outputs["Hole Radius"], rr.inputs[0]); L.new(half.outputs[0], rr.inputs[1])
    fil = N.new("GeometryNodeFilletCurve"); _menu(fil, "Mode", "Poly"); fil.inputs["Count"].default_value = 10
    fil.inputs["Limit Radius"].default_value = True
    L.new(q.outputs[0], fil.inputs["Curve"]); L.new(rr.outputs[0], fil.inputs["Radius"])
    cx = N.new("ShaderNodeMath"); cx.operation = "MULTIPLY_ADD"; cx.inputs[1].default_value = 0.5; L.new(w.outputs[0], cx.inputs[0]); L.new(gi.outputs["Hole X"], cx.inputs[2])
    cy = N.new("ShaderNodeMath"); cy.operation = "MULTIPLY_ADD"; cy.inputs[1].default_value = 0.5; L.new(h.outputs[0], cy.inputs[0]); L.new(gi.outputs["Hole Y"], cy.inputs[2])
    ny = N.new("ShaderNodeMath"); ny.operation = "MULTIPLY"; ny.inputs[1].default_value = -1; L.new(cy.outputs[0], ny.inputs[0])
    cv = N.new("ShaderNodeCombineXYZ"); L.new(cx.outputs[0], cv.inputs[0]); L.new(ny.outputs[0], cv.inputs[1])
    tr = N.new("GeometryNodeTransform"); L.new(fil.outputs[0], tr.inputs["Geometry"]); L.new(cv.outputs[0], tr.inputs["Translation"])
    sw = N.new("GeometryNodeSwitch"); sw.input_type = "GEOMETRY"
    L.new(gi.outputs["Hole"], sw.inputs["Switch"]); L.new(tr.outputs[0], sw.inputs["True"])
    hp = N.new("GeometryNodeObjectInfo"); hp.transform_space = "ORIGINAL"; L.new(gi.outputs["Hole Path"], hp.inputs["Object"])
    hres = N.new("GeometryNodeSetSplineResolution"); hres.inputs["Resolution"].default_value = 24; L.new(hp.outputs["Geometry"], hres.inputs["Geometry"])
    j = N.new("GeometryNodeJoinGeometry")
    L.new(hres.outputs[0], j.inputs[0]); L.new(sw.outputs[0], j.inputs[0]); L.new(res.outputs[0], j.inputs[0])
    fill = N.new("GeometryNodeFillCurve"); _menu(fill, "Mode", "N-gons"); _menu(fill, "Fill Rule", "Even-Odd")
    L.new(j.outputs[0], fill.inputs["Curve"])
    sm = N.new("GeometryNodeSetMaterial"); L.new(fill.outputs[0], sm.inputs["Geometry"]); L.new(gi.outputs["Material"], sm.inputs["Material"])
    L.new(sm.outputs[0], go.inputs[0])
    return ng


def gn_stroke():
    """IM Stroke: strokes the curve of another object with a flat ribbon (SVG stroke)."""
    if "IM Stroke" in bpy.data.node_groups:
        return bpy.data.node_groups["IM Stroke"]
    ng = bpy.data.node_groups.new("IM Stroke", "GeometryNodeTree")
    _sock(ng, "Geometry", "NodeSocketGeometry", "OUTPUT")
    _sock(ng, "Geometry", "NodeSocketGeometry")
    _sock(ng, "Material", "NodeSocketMaterial")
    _sock(ng, "Path", "NodeSocketObject")
    _sock(ng, "Width", "NodeSocketFloat", default=1.0)
    N, L = ng.nodes, ng.links
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    oi = N.new("GeometryNodeObjectInfo"); oi.transform_space = "ORIGINAL"; L.new(gi.outputs["Path"], oi.inputs["Object"])
    res = N.new("GeometryNodeSetSplineResolution"); res.inputs["Resolution"].default_value = 24; L.new(oi.outputs["Geometry"], res.inputs["Geometry"])
    prof = N.new("GeometryNodeCurvePrimitiveLine")
    hw = N.new("ShaderNodeMath"); hw.operation = "MULTIPLY"; hw.inputs[1].default_value = 0.5; L.new(gi.outputs["Width"], hw.inputs[0])
    nhw = N.new("ShaderNodeMath"); nhw.operation = "MULTIPLY"; nhw.inputs[1].default_value = -0.5; L.new(gi.outputs["Width"], nhw.inputs[0])
    a = N.new("ShaderNodeCombineXYZ"); L.new(nhw.outputs[0], a.inputs[0])
    b = N.new("ShaderNodeCombineXYZ"); L.new(hw.outputs[0], b.inputs[0])
    L.new(a.outputs[0], prof.inputs["Start"]); L.new(b.outputs[0], prof.inputs["End"])
    # the profile lies in the curve's normal plane; for flat curves in XY rotate it into the plane
    c2m = N.new("GeometryNodeCurveToMesh")
    L.new(res.outputs[0], c2m.inputs["Curve"]); L.new(prof.outputs[0], c2m.inputs["Profile Curve"])
    # round caps: a circle at each endpoint
    ep = N.new("GeometryNodeCurveEndpointSelection")
    c2p = N.new("GeometryNodeCurveToPoints"); c2p.mode = "EVALUATED"; L.new(res.outputs[0], c2p.inputs["Curve"])
    circ = N.new("GeometryNodeMeshCircle"); circ.fill_type = "NGON"; circ.inputs["Vertices"].default_value = 24
    L.new(hw.outputs[0], circ.inputs["Radius"])
    inst = N.new("GeometryNodeInstanceOnPoints")
    L.new(c2p.outputs["Points"], inst.inputs["Points"]); L.new(circ.outputs[0], inst.inputs["Instance"])
    real = N.new("GeometryNodeRealizeInstances"); L.new(inst.outputs[0], real.inputs[0])
    j = N.new("GeometryNodeJoinGeometry"); L.new(real.outputs[0], j.inputs[0]); L.new(c2m.outputs[0], j.inputs[0])
    sm = N.new("GeometryNodeSetMaterial"); L.new(j.outputs[0], sm.inputs["Geometry"]); L.new(gi.outputs["Material"], sm.inputs["Material"])
    L.new(sm.outputs[0], go.inputs[0])
    return ng


def gn_text():
    """IM Text: live text. Shows String[Position : Position+Length], so one object can
    type on (animate Length) or switch between states packed into the string
    (animate Position/Length with constant keys)."""
    if "IM Text" in bpy.data.node_groups:
        return bpy.data.node_groups["IM Text"]
    ng = bpy.data.node_groups.new("IM Text", "GeometryNodeTree")
    _sock(ng, "Geometry", "NodeSocketGeometry", "OUTPUT")
    _sock(ng, "Geometry", "NodeSocketGeometry")
    _sock(ng, "Material", "NodeSocketMaterial")
    _sock(ng, "String", "NodeSocketString")
    _sock(ng, "Position", "NodeSocketInt", default=0)
    _sock(ng, "Length", "NodeSocketInt", default=10000)
    _sock(ng, "Size", "NodeSocketFloat", default=1.0)
    _sock(ng, "Font", "NodeSocketFont")
    _sock(ng, "Character Spacing", "NodeSocketFloat", default=1.0)
    _sock(ng, "Line Spacing", "NodeSocketFloat", default=1.0)
    _sock(ng, "Align", "NodeSocketInt", default=0, lo=0, hi=2)  # 0 left, 1 centre, 2 right
    N, L = ng.nodes, ng.links
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    sl = N.new("FunctionNodeSliceString")
    L.new(gi.outputs["String"], sl.inputs["String"]); L.new(gi.outputs["Position"], sl.inputs["Position"]); L.new(gi.outputs["Length"], sl.inputs["Length"])
    outs = []
    for align in ("Left", "Center", "Right"):
        stc = N.new("GeometryNodeStringToCurves")
        L.new(sl.outputs[0], stc.inputs["String"]); L.new(gi.outputs["Size"], stc.inputs["Size"]); L.new(gi.outputs["Font"], stc.inputs["Font"])
        L.new(gi.outputs["Character Spacing"], stc.inputs["Character Spacing"]); L.new(gi.outputs["Line Spacing"], stc.inputs["Line Spacing"])
        _menu(stc, "Align X", align); _menu(stc, "Align Y", "Top Baseline")
        outs.append(stc)
    idx = N.new("GeometryNodeIndexSwitch"); idx.data_type = "GEOMETRY"
    while len(idx.index_switch_items) < 3:
        idx.index_switch_items.new()
    L.new(gi.outputs["Align"], idx.inputs["Index"])
    for i, stc in enumerate(outs):
        L.new(stc.outputs["Curve Instances"], idx.inputs[i + 1])
    fill = N.new("GeometryNodeFillCurve"); _menu(fill, "Mode", "N-gons")
    L.new(idx.outputs[0], fill.inputs["Curve"])
    real = N.new("GeometryNodeRealizeInstances"); L.new(fill.outputs[0], real.inputs[0])
    sm = N.new("GeometryNodeSetMaterial"); L.new(real.outputs[0], sm.inputs["Geometry"]); L.new(gi.outputs["Material"], sm.inputs["Material"])
    L.new(sm.outputs[0], go.inputs[0])
    return ng


def set_input(obj, mod_name, name, value):
    mod = obj.modifiers[mod_name]
    ident = next(s.identifier for s in mod.node_group.interface.items_tree if getattr(s, "in_out", "") == "INPUT" and s.name == name)
    getattr(mod.properties.inputs, ident).value = value
    return 'modifiers["%s"].properties.inputs.%s.value' % (mod_name, ident)


def input_path(obj, mod_name, name):
    mod = obj.modifiers[mod_name]
    ident = next(s.identifier for s in mod.node_group.interface.items_tree if getattr(s, "in_out", "") == "INPUT" and s.name == name)
    return 'modifiers["%s"].properties.inputs.%s.value' % (mod_name, ident)


# ---------------------------------------------------------------- materials
def _flat_tree(m, image=None, clip=None, shadow=False, dither=False, multiply=False):
    nt = m.node_tree; nt.nodes.clear(); N, L = nt.nodes, nt.links
    out = N.new("ShaderNodeOutputMaterial")
    oi = N.new("ShaderNodeObjectInfo")
    em = N.new("ShaderNodeEmission")
    tr = N.new("ShaderNodeBsdfTransparent")
    mix = N.new("ShaderNodeMixShader")
    alpha = oi.outputs["Alpha"]
    if image is not None:
        uv = N.new("ShaderNodeUVMap"); uv.uv_map = "UVMap"
        tex = N.new("ShaderNodeTexImage"); tex.image = image; tex.interpolation = "Cubic"; tex.extension = "CLIP"
        L.new(uv.outputs[0], tex.inputs[0])
        L.new(tex.outputs["Color"], em.inputs["Color"])
        mul = N.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
        L.new(tex.outputs["Alpha"], mul.inputs[0]); L.new(alpha, mul.inputs[1]); alpha = mul.outputs[0]
    else:
        L.new(oi.outputs["Color"], em.inputs["Color"])
    if shadow:
        # soft box shadow: an SDF rounded box with a Gaussian-ish falloff; parameters are
        # custom properties on the shadow object (cx, cy, hw, hh, r, sig), in local BU.
        tc = N.new("ShaderNodeTexCoord")
        def attr(name):
            a = N.new("ShaderNodeAttribute"); a.attribute_type = "OBJECT"; a.attribute_name = name; return a.outputs["Fac"]
        sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs[0])
        def m2(op, a, b=None):
            n = N.new("ShaderNodeMath"); n.operation = op
            (L.new(a, n.inputs[0]) if not isinstance(a, float) else n.inputs[0].__setattr__("default_value", a))
            if b is not None:
                (L.new(b, n.inputs[1]) if not isinstance(b, float) else n.inputs[1].__setattr__("default_value", b))
            return n.outputs[0]
        r = attr("r")
        qx = m2("ADD", m2("SUBTRACT", m2("ABSOLUTE", m2("SUBTRACT", sep.outputs[0], attr("cx"))), attr("hw")), r)
        qy = m2("ADD", m2("SUBTRACT", m2("ABSOLUTE", m2("SUBTRACT", sep.outputs[1], attr("cy"))), attr("hh")), r)
        ox = m2("MAXIMUM", qx, 0.0); oy = m2("MAXIMUM", qy, 0.0)
        outside = m2("SQRT", m2("ADD", m2("MULTIPLY", ox, ox), m2("MULTIPLY", oy, oy)))
        inside = m2("MINIMUM", m2("MAXIMUM", qx, qy), 0.0)
        d = m2("SUBTRACT", m2("ADD", outside, inside), r)
        sig = attr("sig")
        mr = N.new("ShaderNodeMapRange"); mr.interpolation_type = "SMOOTHSTEP"
        L.new(d, mr.inputs["Value"])
        L.new(m2("MULTIPLY", sig, -1.8), mr.inputs["From Min"]); L.new(m2("MULTIPLY", sig, 1.8), mr.inputs["From Max"])
        mr.inputs["To Min"].default_value = 1.0; mr.inputs["To Max"].default_value = 0.0
        alpha = m2("MULTIPLY", alpha, mr.outputs[0])
    if clip is not None:
        # keep only what is inside the clip empty's box: (0..w, 0..-h) in its local space, rounded
        cobj, w, h, rad = clip
        tc = N.new("ShaderNodeTexCoord"); tc.object = cobj
        sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs[0])
        def m3(op, a, b):
            n = N.new("ShaderNodeMath"); n.operation = op
            for i, v in enumerate((a, b)):
                if isinstance(v, float):
                    n.inputs[i].default_value = v
                else:
                    L.new(v, n.inputs[i])
            return n.outputs[0]
        hw, hh = w / 2, h / 2
        qx = m3("ADD", m3("SUBTRACT", m3("ABSOLUTE", m3("SUBTRACT", sep.outputs[0], hw), 0.0), hw), rad)
        qy = m3("ADD", m3("SUBTRACT", m3("ABSOLUTE", m3("ADD", sep.outputs[1], hh), 0.0), hh), rad)
        ox = m3("MAXIMUM", qx, 0.0); oy = m3("MAXIMUM", qy, 0.0)
        outside = m3("POWER", m3("ADD", m3("MULTIPLY", ox, ox), m3("MULTIPLY", oy, oy)), 0.5)
        inside = m3("MINIMUM", m3("MAXIMUM", qx, qy), 0.0)
        d = m3("SUBTRACT", m3("ADD", outside, inside), rad)
        keep = m3("LESS_THAN", d, 0.0)
        alpha = m3("MULTIPLY", alpha, keep)
    if multiply:
        # mix-blend-mode: multiply -> coloured transmission: background * mix(1, colour, alpha)
        mc = N.new("ShaderNodeMix"); mc.data_type = "RGBA"
        L.new(alpha, mc.inputs["Factor"]); mc.inputs["A"].default_value = (1, 1, 1, 1)
        L.new(oi.outputs["Color"], mc.inputs["B"])
        L.new(mc.outputs["Result"], tr.inputs["Color"])
        L.new(tr.outputs[0], out.inputs["Surface"])
        dither = False
    else:
        L.new(alpha, mix.inputs[0]); L.new(tr.outputs[0], mix.inputs[1]); L.new(em.outputs[0], mix.inputs[2])
        L.new(mix.outputs[0], out.inputs["Surface"])
    # Flat scenes: blended, painted in paint order (z). 3D scenes: dithered, so tilted
    # layers are depth-tested instead of sorted by origin.
    m.surface_render_method = "DITHERED" if dither else "BLENDED"
    m.use_transparency_overlap = True


_mats = {}


def material(image=None, clip=None, shadow=False, dither=False, multiply=False):
    key = (image.name if image else "", clip[0].name if clip else "", shadow, dither, multiply)
    if key in _mats and _mats[key].name in bpy.data.materials:
        return _mats[key]
    name = "IM " + ("Shadow" if shadow else ("Image " + image.name if image else "Flat"))
    if clip:
        name += " | clip " + clip[0].name
    if dither:
        name += " | 3D"
    if multiply:
        name += " | multiply"
    m = bpy.data.materials.new(name)
    _flat_tree(m, image, clip, shadow, dither, multiply)
    _mats[key] = m
    return m


def image(path):
    for im in bpy.data.images:
        if bpy.path.abspath(im.filepath) == path:
            return im
    im = bpy.data.images.load(path)
    im.alpha_mode = "STRAIGHT"
    return im


# ---------------------------------------------------------------- objects
def empty(name, coll, parent=None, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    o.empty_display_type = "PLAIN_AXES"; o.empty_display_size = 0.2
    coll.objects.link(o)
    o.parent = parent
    o.location = loc
    return o


def mesh_obj(name, coll, mat, parent=None):
    me = bpy.data.meshes.new(name)
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    o.parent = parent
    return o


def gn_obj(name, coll, mat, group, mod_name, parent=None):
    """A mesh object driven by one of the IM node groups, with its material wired in."""
    o = mesh_obj(name, coll, mat, parent)
    mod = o.modifiers.new(mod_name, "NODES"); mod.node_group = group
    set_input(o, mod_name, "Material", mat)
    return o


def rect_obj(name, coll, mat, x, y, w, h, r, parent=None, uv=None):
    o = gn_obj(name, coll, mat, gn_rect(), "Rect", parent)
    for k, v in (("X", x), ("Y", y), ("Width", w), ("Height", h), ("Radius", r)):
        set_input(o, "Rect", k, v)
    if uv:
        for k, v in zip(("U0", "V0", "U1", "V1"), uv):
            set_input(o, "Rect", k, v)
    return o


# ---------------------------------------------------------------- SVG paths
def parse_path(d):
    """SVG path data -> list of subpaths, each a list of cubic segments
    [(p0, c1, c2, p3), ...] plus a closed flag. Supports M L H V C S Q T Z (abs/rel)."""
    toks = re.findall(r"[MmLlHhVvCcSsQqTtZzAa]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?", d)
    i = 0; cmd = None; cur = (0.0, 0.0); start = (0.0, 0.0); subs = []; seg = None
    last_c = None; last_q = None

    def num():
        nonlocal i
        v = float(toks[i]); i += 1; return v
    while i < len(toks):
        t = toks[i]
        if re.match(r"[A-Za-z]", t):
            cmd = t; i += 1
            if cmd in "Zz":
                if seg is not None:
                    if abs(cur[0] - start[0]) > 1e-6 or abs(cur[1] - start[1]) > 1e-6:
                        seg["segs"].append((cur, cur, start, start))
                    seg["closed"] = True
                cur = start; last_c = last_q = None
                continue
        rel = cmd.islower(); C = cmd.upper()
        ox, oy = cur if rel else (0.0, 0.0)
        if C == "M":
            x, y = num() + ox, num() + oy
            seg = {"segs": [], "closed": False}; subs.append(seg)
            cur = start = (x, y); cmd = "l" if rel else "L"; last_c = last_q = None
        elif C in "LHV":
            if C == "L":
                x, y = num() + ox, num() + oy
            elif C == "H":
                x, y = num() + (cur[0] if rel else 0.0), cur[1]
            else:
                x, y = cur[0], num() + (cur[1] if rel else 0.0)
            seg["segs"].append((cur, cur, (x, y), (x, y))); cur = (x, y); last_c = last_q = None
        elif C == "C":
            c1 = (num() + ox, num() + oy); c2 = (num() + ox, num() + oy); p = (num() + ox, num() + oy)
            seg["segs"].append((cur, c1, c2, p)); cur = p; last_c = c2; last_q = None
        elif C == "S":
            c1 = (2 * cur[0] - last_c[0], 2 * cur[1] - last_c[1]) if last_c else cur
            c2 = (num() + ox, num() + oy); p = (num() + ox, num() + oy)
            seg["segs"].append((cur, c1, c2, p)); cur = p; last_c = c2; last_q = None
        elif C in "QT":
            if C == "Q":
                q = (num() + ox, num() + oy)
            else:
                q = (2 * cur[0] - last_q[0], 2 * cur[1] - last_q[1]) if last_q else cur
            p = (num() + ox, num() + oy)
            c1 = (cur[0] + 2 / 3 * (q[0] - cur[0]), cur[1] + 2 / 3 * (q[1] - cur[1]))
            c2 = (p[0] + 2 / 3 * (q[0] - p[0]), p[1] + 2 / 3 * (q[1] - p[1]))
            seg["segs"].append((cur, c1, c2, p)); cur = p; last_q = q; last_c = None
        else:
            raise ValueError("unsupported path command " + cmd)
    return subs


def path_curve(name, coll, d, parent=None):
    """A hidden 2D curve object holding an SVG path (local units = SVG user units, y up)."""
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "2D"; cu.fill_mode = "NONE"; cu.resolution_u = 24
    fill_path(cu, d)
    o = bpy.data.objects.new(name, cu); coll.objects.link(o); o.parent = parent
    o.hide_render = True; o.hide_viewport = False; o.display_type = "WIRE"
    return o


def fill_path(cu, d):
    cu.splines.clear()
    for sp in parse_path(d):
        segs = sp["segs"]
        if not segs:
            continue
        closed = sp["closed"]
        pts = [segs[0][0]] + [s[3] for s in segs]
        if closed and len(pts) > 1 and abs(pts[-1][0] - pts[0][0]) < 1e-6 and abs(pts[-1][1] - pts[0][1]) < 1e-6:
            pts = pts[:-1]
        spl = cu.splines.new("BEZIER"); spl.bezier_points.add(len(pts) - 1); spl.use_cyclic_u = closed
        n = len(pts)
        for k in range(n):
            bp = spl.bezier_points[k]
            p = pts[k]; bp.co = (p[0], -p[1], 0)
            bp.handle_left_type = bp.handle_right_type = "FREE"
            # outgoing handle from segment k, incoming from segment k-1
            out_seg = segs[k] if k < len(segs) else None
            in_seg = segs[k - 1] if k >= 1 else (segs[-1] if closed else None)
            bp.handle_right = (out_seg[1][0], -out_seg[1][1], 0) if out_seg else bp.co
            bp.handle_left = (in_seg[2][0], -in_seg[2][1], 0) if in_seg else bp.co


# ---------------------------------------------------------------- keyframes
EASES = {"none": ("LINEAR", None), "linear": ("LINEAR", None), "power0": ("LINEAR", None),
         "power1": ("QUAD", None), "quad": ("QUAD", None), "power2": ("CUBIC", None), "cubic": ("CUBIC", None),
         "power3": ("QUART", None), "quart": ("QUART", None), "power4": ("QUINT", None), "quint": ("QUINT", None),
         "strong": ("QUINT", None), "expo": ("EXPO", None), "sine": ("SINE", None), "circ": ("CIRC", None),
         "back": ("BACK", None), "elastic": ("ELASTIC", None), "bounce": ("BOUNCE", None)}


def blender_ease(ease):
    """GSAP ease string -> (interpolation, easing, param) or None when it cannot be expressed."""
    if not ease or ease == "custom":
        return ("LINEAR", "AUTO", None) if ease == "none" else None
    m = re.match(r"^([a-z0-9]+)(?:\.(in|out|inOut))?(?:\(([^)]*)\))?$", ease)
    if not m:
        return None
    name, kind, par = m.group(1), m.group(2) or "out", m.group(3)
    if name not in EASES:
        return None
    interp = EASES[name][0]
    easing = {"in": "EASE_IN", "out": "EASE_OUT", "inOut": "EASE_IN_OUT"}[kind]
    return (interp, easing, [float(x) for x in par.split(",")] if par else None)


def fcurve(obj_or_id, path, index=-1):
    ad = obj_or_id.animation_data or obj_or_id.animation_data_create()
    if ad.action is None:
        return None
    # Blender 5 layered actions: find the channelbag for this ID
    act = ad.action
    for layer in act.layers:
        for strip in layer.strips:
            cb = strip.channelbag(ad.action_slot) if ad.action_slot else None
            if cb:
                for fc in cb.fcurves:
                    if fc.data_path == path and (index < 0 or fc.array_index == index):
                        return fc
    return None
