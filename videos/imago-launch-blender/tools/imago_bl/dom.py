"""Builds a Blender scene from a probe dump (tools/probe.mjs) of one HyperFrames scene.

Every DOM element becomes an Empty named after its id, placed at its CSS
transform-origin, parented like the DOM, so GSAP's x/y/rotation/scale land on
that empty exactly as in the browser. What it paints hangs under it: rounded
rects (backgrounds, borders, shadows), text, images and SVG shapes.

Each tween becomes two keyframes with the matching Blender easing (power3.out ->
Quartic Ease Out, back.out(2) -> Back with Back=2, ...). Every channel is then
checked against the browser's own per-frame samples; one that does not match
(overlapping tweens, onUpdate code) is baked from the samples and simplified.
"""
import bpy, math, os, re, json, shutil
from bpy_extras import anim_utils
from . import core as C
from .core import S

LOG = []


def log(*a):
    LOG.append(" ".join(str(x) for x in a))
    print("[dom]", *a)


def px(v):
    try:
        return float(str(v).replace("px", ""))
    except ValueError:
        return 0.0


def short(id_):
    return id_.split("#")[0]


# ---------------------------------------------------------------- animation writing
class Anim:
    """Per-ID action with one slot; fcurves are created and filled directly."""

    def __init__(self):
        self.cache = {}

    def fc(self, idb, path, index=0):
        key = (idb.name, type(idb).__name__, path, index)
        if key in self.cache:
            return self.cache[key]
        ad = idb.animation_data or idb.animation_data_create()
        if ad.action is None:
            act = bpy.data.actions.new(idb.name + " Action")
            slot = act.slots.new(id_type=idb.id_type, name=idb.name)
            layer = act.layers.new("Layer")
            strip = layer.strips.new(type="KEYFRAME")
            ad.action = act
            ad.action_slot = slot
        cb = anim_utils.action_ensure_channelbag_for_slot(ad.action, ad.action_slot)
        f = cb.fcurves.find(path, index=index) or cb.fcurves.new(path, index=index)
        self.cache[key] = f
        return f


ANIM = Anim()


def write_keys(fc, keys):
    """keys: [(frame, value, interp, easing, param)] sorted by frame."""
    fc.keyframe_points.clear()
    fc.keyframe_points.add(len(keys))
    for kp, (fr, v, interp, easing, par) in zip(fc.keyframe_points, keys):
        kp.co = (fr, v)
        kp.interpolation = interp
        if easing:
            kp.easing = easing
        if interp == "BACK":
            kp.back = par[0] if par else 1.70158
        elif interp == "ELASTIC" and par:
            kp.amplitude = par[0]
            if len(par) > 1:
                kp.period = par[1]
        kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
    fc.update()


def rdp(pts, tol):
    """Ramer-Douglas-Peucker on [(x, y)] keeping endpoints."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x0, y0), (x1, y1) = pts[a], pts[b]
        best, bi = -1, -1
        for i in range(a + 1, b):
            x, y = pts[i]
            yy = y0 + (y1 - y0) * (x - x0) / (x1 - x0) if x1 != x0 else y0
            d = abs(y - yy)
            if d > best:
                best, bi = d, i
        if best > tol:
            keep[bi] = True
            stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]


def bake_keys(values, off, tol, step_detect=True):
    """Per-frame samples -> sparse keys. Jumps (a change within one frame that the
    neighbours don't continue) become constant steps; the rest is linear + RDP."""
    n = len(values)
    pts = [(f + off, values[f]) for f in range(n)]
    simp = rdp(pts, tol)
    keys = [(fr, v, "LINEAR", None, None) for fr, v in simp]
    return keys


def channel(idb, path, index, conv, segs, samples, off, tol, label):
    """Write one animated property. segs: [(t0, t1, v0, v1, ease)] in scene seconds;
    samples: browser values at t = f / 30. conv maps a CSS value to the Blender one."""
    fc = ANIM.fc(idb, path, index)
    keys = []
    ok = True
    segs = sorted(segs, key=lambda s: (s[0], s[1]))
    v_init = conv(samples[0])
    keys.append([off, v_init, "CONSTANT", None, None])
    for (t0, t1, v0, v1, ease) in segs:
        f0 = t0 * C.FPS + off; f1 = t1 * C.FPS + off
        b0, b1 = conv(v0), conv(v1)
        be = C.blender_ease(ease)
        last = keys[-1]
        if f0 < last[0] - 1e-6:
            ok = False
            break
        if t1 - t0 <= 1e-9:  # set
            if abs(f0 - last[0]) < 1e-6:
                last[1] = b1
                last[2] = "CONSTANT"
            else:
                keys.append([f0, b1, "CONSTANT", None, None])
            continue
        if be is None:
            ok = False
            break
        interp, easing, par = be
        if abs(f0 - last[0]) < 1e-6:
            if abs(last[1] - b0) > 1e-6:
                keys.append([f0 + 0.001, b0, interp, easing, par])
            else:
                last[2], last[3], last[4] = interp, easing, par
        else:
            keys.append([f0, b0, interp, easing, par])
        keys.append([f1, b1, "CONSTANT", None, None])
    if ok:
        write_keys(fc, [tuple(k) for k in keys])
        err = max(abs(fc.evaluate(f + off) - conv(samples[f])) for f in range(len(samples)))
        if err <= tol:
            return "eased"
        bad = [f for f in range(len(samples)) if abs(fc.evaluate(f + off) - conv(samples[f])) > tol]
        log(f"{label}: eased keys off by {err:.4f} at frames {bad[:6]} -> baked; keys={[(round(k[0],2), round(k[1],3), k[2]) for k in keys][:8]}")
    vals = [conv(v) for v in samples]
    write_keys(fc, bake_keys(vals, off, tol * 0.5))
    return "baked"


def numeric(a):
    return all(isinstance(x, (int, float)) for x in a)


# ---------------------------------------------------------------- the builder
class SceneBuilder:
    def __init__(self, probe, name, off, asset_src, asset_dst, fps=30):
        self.P = probe
        self.name = name
        self.off = off  # sub-frame offset of t=0 within this scene's frames
        self.asset_src = asset_src
        self.asset_dst = asset_dst
        self.nodes = {n["id"]: n for n in probe["nodes"]}
        self.kids = {}
        for n in probe["nodes"]:
            if n["parent"]:
                self.kids.setdefault(n["parent"], []).append(n["id"])
        self.emp = {}
        self.order = 0
        self.nframes = probe["frames"] + 1
        # which (element, prop) channels were tweened
        self.segs = {}
        for tw in probe["tweens"]:
            for tid in tw["targets"]:
                for prop, (a, b) in tw.get("values", {}).get(tid, {}).items():
                    self.segs.setdefault((tid, prop), []).append((tw["start"], tw["start"] + tw["dur"], a, b, tw["ease"]))
        self.samples = {}
        for k, v in probe["samples"].items():
            tid, prop = k.split("|", 1)
            self.samples[(tid, prop)] = v
        self.direct = {}
        for k, v in probe.get("direct", {}).items():
            tid, prop = k.split("|", 1)
            self.direct[(tid, prop)] = v
        for k, v in probe.get("attrs", {}).items():
            tid, a = k.split("|", 1)
            self.samples.setdefault((tid, "attr:" + a), [float(x) if re.match(r"^-?[\d.]+$", str(x)) else x for x in v])
        self.rich = probe.get("rich", {})
        self.perspective = self._perspective()
        self.fonts = {}

    # ----- scene / camera
    def _perspective(self):
        persp = 0.0
        for n in self.P["nodes"]:
            p = n["style"].get("perspective") or "none"
            if p not in ("none", "0px"):
                persp = max(persp, px(p))
            if n["t0"].get("transformPerspective"):
                persp = max(persp, n["t0"]["transformPerspective"])
        uses3d = any(k[1] in ("rotationX", "rotationY", "z") for k in self.samples) or any(abs(n["t0"].get("rotationX", 0)) + abs(n["t0"].get("rotationY", 0)) > 0 for n in self.P["nodes"])
        return persp if (uses3d and persp) else (1200.0 if uses3d else 0.0)

    def make_scene(self):
        sc = bpy.data.scenes.new(self.name)
        self.sc = sc
        r = sc.render
        r.engine = "BLENDER_EEVEE"
        r.resolution_x, r.resolution_y, r.resolution_percentage = 1920, 1080, 100
        r.fps = C.FPS
        r.film_transparent = True
        sc.view_settings.view_transform = "Standard"
        sc.view_settings.look = "None"
        sc.eevee.taa_render_samples = 32
        sc.frame_start = 0
        sc.frame_end = int(math.ceil(self.P["duration"] * C.FPS + self.off)) - 1
        w = bpy.data.worlds.new(self.name + " World")
        sc.world = w
        w.use_nodes = True
        w.node_tree.nodes["Background"].inputs[0].default_value = C.hex_rgba("F6F5F1")
        self.coll = bpy.data.collections.new(self.name)
        sc.collection.children.link(self.coll)
        cd = bpy.data.cameras.new(self.name + " Camera")
        cam = bpy.data.objects.new(self.name + " Camera", cd)
        sc.collection.objects.link(cam)
        sc.camera = cam
        cd.clip_start = 0.01; cd.clip_end = 1000
        if self.perspective:
            D = self.perspective * S
            cd.type = "PERSP"; cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36
            cd.lens = 36 * D / 19.2
            cam.location = (9.6, -5.4, D)
            cd.clip_start = D * 0.35; cd.clip_end = D * 3  # depth precision for the paint-order steps
            sc.eevee.taa_render_samples = 64
        else:
            cd.type = "ORTHO"; cd.ortho_scale = 19.2
            cam.location = (9.6, -5.4, 20); cd.clip_start = 1; cd.clip_end = 40
        return sc

    # ----- helpers
    def z(self):
        self.order += 1
        return self.order * C.EPS_Z

    def base_alpha_driver(self, obj, base_a, chain):
        """obj.color alpha = base_a * product of the chain's opacity/vis properties."""
        facs = []
        for e in chain:
            for prop in ("opacity", "vis"):
                if prop in e.keys():
                    facs.append((e, prop))
        if not facs:
            c = list(obj.color); c[3] = base_a; obj.color = c
            return
        fcd = obj.driver_add("color", 3)
        d = fcd.driver
        d.type = "SCRIPTED"
        names = []
        for i, (e, prop) in enumerate(facs):
            v = d.variables.new(); v.name = f"v{i}"; v.type = "SINGLE_PROP"
            v.targets[0].id_type = "OBJECT"; v.targets[0].id = e; v.targets[0].data_path = f'["{prop}"]'
            names.append(v.name)
        d.expression = "*".join([repr(round(base_a, 5))] + names) if base_a != 1 else "*".join(names)

    def chain(self, nid):
        out = []
        while nid:
            e = self.emp.get(nid)
            if e is not None:
                out.append(e)
            nid = self.nodes[nid]["parent"]
        return out

    def clip_of(self, nid):
        nid = self.nodes[nid]["parent"]
        while nid:
            n = self.nodes[nid]
            ov = n["style"].get("overflow", "visible")
            if ov in ("hidden", "clip") and n["parent"] is not None:
                b = n["box"]
                if not (abs(b["w"] - 1920) < 1 and abs(b["h"] - 1080) < 1 and abs(b["x"]) < 1 and abs(b["y"]) < 1):
                    return nid
            nid = n["parent"]
        return None

    def clip_tuple(self, cid):
        if cid is None:
            return None
        if not hasattr(self, "_clips"):
            self._clips = {}
        if cid not in self._clips:
            n = self.nodes[cid]; b = n["box"]; e = self.emp[cid]
            piv = self.pivot[cid]
            ce = C.empty(short(cid) + ".clip", self.coll, parent=e, loc=((b["x"] - piv[0]) * S, -(b["y"] - piv[1]) * S, 0))
            ce.empty_display_type = "CUBE"; ce.empty_display_size = 0.05
            self._clips[cid] = (ce, b["w"] * S, b["h"] * S, px(n["style"].get("borderTopLeftRadius")) * S)
        return self._clips[cid]

    def mat(self, nid, image=None, shadow=False):
        mul = self.nodes[nid]["style"].get("mixBlendMode") == "multiply" or any(self.nodes[a]["style"].get("mixBlendMode") == "multiply" for a in self.ancestors(nid))
        return C.material(image=image, clip=self.clip_tuple(self.clip_of(nid)), shadow=shadow, dither=bool(self.perspective), multiply=mul)

    def ancestors(self, nid):
        out = []; p = self.nodes[nid]["parent"]
        while p:
            out.append(p); p = self.nodes[p]["parent"]
        return out

    def color_track(self, obj, nid, which, base_rgba):
        """Keyframe obj.color RGB from the sampled paints of an element (a colour tween,
        or an inherited currentColor change)."""
        tr = self.P["paints"].get(nid)
        if not tr:
            return
        vals = []
        for s in tr:
            parts = s.split("|")
            c = C.css_rgba(parts[which]) if which < len(parts) else None
            vals.append(c or base_rgba)
        for i in range(3):
            fc = ANIM.fc(obj, "color", i)
            keys = []
            prev = None
            for f, c in enumerate(vals):
                v = c[i]
                if prev is None or abs(v - prev) > 1e-5:
                    # is this a jump (neighbour frames flat) or a tween (keep linear)?
                    if prev is not None and f + 1 < len(vals) and abs(vals[f + 1][i] - v) > 1e-5:
                        keys.append((f + self.off, v, "LINEAR", None, None))
                    else:
                        if prev is not None:
                            keys.append((f + self.off - 0.999, prev, "CONSTANT", None, None)) if not keys or keys[-1][0] < f + self.off - 0.999 else None
                        keys.append((f + self.off, v, "CONSTANT", None, None))
                    prev = v
            if len(keys) > 1:
                write_keys(fc, keys)

    # ----- element tree
    def build(self):
        self.make_scene()
        root = next(n for n in self.P["nodes"] if n["parent"] is None)
        self.pivot = {}
        self.svgspace = {}
        self.root_empty = C.empty(self.name + " Stage", self.coll)
        self.root_empty.location = (0, 0, 0)
        self._build(root["id"], self.root_empty, (0.0, 0.0), None)
        if self.perspective:
            self.depth_layers()
        return self.sc

    def is3d_root(self, nid):
        n = self.nodes[nid]
        p = n["style"].get("perspective") or "none"
        if p not in ("none", "0px"):
            return True
        t0 = n["t0"]
        if abs(t0.get("rotationX", 0)) + abs(t0.get("rotationY", 0)) > 1e-6:
            return True
        return any((nid, q) in self.samples and len(set(self.samples[(nid, q)])) > 1 for q in ("rotationX", "rotationY"))

    def depth_layers(self):
        """CSS flattens a 3D-transformed layer and paints it in DOM order; in Blender it
        would cut through the flat layers around it. Each paint-order segment (flat run,
        3D subtree, flat run, ...) is scaled about the camera's eye by its own factor:
        the picture is unchanged, but earlier segments sit farther away than later ones."""
        rev = {e.name: nid for nid, e in self.emp.items()}
        def root3d(o):
            p = o.parent; best = None
            while p is not None:
                nid = rev.get(p.name)
                if nid and self.is3d_root(nid):
                    best = nid  # outermost 3D root wins
                p = p.parent
            return best
        rend = [o for o in self.coll.objects if o.type in ("MESH", "FONT") and not o.hide_render]
        rend.sort(key=lambda o: o.matrix_parent_inverse.to_translation().z + o.location.z)
        seg, prev, segs = 0, "__start__", {}
        for o in rend:
            r = root3d(o)
            if r != prev:
                seg += 1; prev = r
            segs[o.name] = seg
        n = max(segs.values()) if segs else 1
        eye = self.sc.camera.location.copy()
        self.layers = {}
        r = 0.72 if n <= 8 else 0.1 ** (1.0 / (n - 1))
        for i in range(1, n + 1):
            k = 3.0 * (r ** (i - 1))
            le = C.empty(f"{self.name} Depth Layer {i}", self.coll)
            le.location = eye * (1 - k); le.scale = (k, k, k)
            le["note"] = "scales its objects about the camera: same picture, separate depth"
            self.layers[i] = le
        for o in rend:
            c = o.constraints.new("CHILD_OF"); c.target = self.layers[segs[o.name]]
            c.name = "Depth Layer"
            c.set_inverse_pending = False
        # clip empties move with the objects they clip
        for cid, (ce, *_rest) in getattr(self, "_clips", {}).items():
            users = [o for o in rend if any(ms.material and ("clip " + ce.name + " |") in (ms.material.name + " |") for ms in o.material_slots)]
            if users:
                c = ce.constraints.new("CHILD_OF"); c.target = self.layers[segs[users[0].name]]; c.name = "Depth Layer"
                c.set_inverse_pending = False
        cam = self.sc.camera.data
        cam.clip_start = eye.z * 3.0 * (r ** (n - 1)) * 0.4; cam.clip_end = eye.z * 3.0 * 2.5
        log(f"{self.name}: {n} depth layers")

    def origin(self, n):
        o = (n["style"].get("transformOrigin") or "0px 0px").split()
        return px(o[0]), px(o[1]) if len(o) > 1 else 0.0

    def _build(self, nid, parent_obj, parent_pivot, svg):
        n = self.nodes[nid]
        st = n["style"]
        if st.get("display") == "none" and (nid not in self.P["vis"]):
            return
        tag = n["tag"]
        b = n["box"]
        if svg is None:
            ox, oy = self.origin(n)
            piv = (b["x"] + ox, b["y"] + oy)
            loc = ((piv[0] - parent_pivot[0]) * S, -(piv[1] - parent_pivot[1]) * S, 0)
        else:
            piv = (0.0, 0.0)
            loc = (0, 0, 0)
        e = C.empty(short(nid), self.coll, parent=parent_obj, loc=loc)
        self.emp[nid] = e
        self.pivot[nid] = piv
        e["css_unit"] = "svg" if svg is not None else "px"
        self.transform(nid, e, svg is not None)
        self.visibility(nid, e)

        if tag == "svg":
            vb = n.get("viewBox") or [0, 0, b["w"], b["h"]]
            k = b["w"] / vb[2] if vb[2] else 1
            space = C.empty(short(nid) + ".space", self.coll, parent=e,
                            loc=((b["x"] - piv[0]) * S - vb[0] * k * S, -(b["y"] - piv[1]) * S + vb[1] * k * S, 0))
            space.scale = (k * S, k * S, 1)
            self.svgspace[nid] = space
            self.masks = {m["svg"].get("id"): m for m in self.P["nodes"] if m["tag"] == "mask" and m.get("svg")}
            for c in self.kids.get(nid, []):
                self._build(c, space, (0, 0), nid)
            return
        if svg is not None:
            self.svg_paint(nid, e)
            if tag in ("defs", "mask", "clippath", "filter", "lineargradient", "radialgradient"):
                return
            for c in self.kids.get(nid, []):
                self._build(c, e, (0, 0), svg)
            return
        self.html_paint(nid, e, piv)
        if nid in self.rich:
            return  # its children are the coloured runs, drawn as live text layers
        for c in self.kids.get(nid, []):
            self._build(c, e, piv, None)

    # ----- transforms
    def transform(self, nid, e, svg_units):
        n = self.nodes[nid]
        t0 = n["t0"]
        k = 1.0 if svg_units else S
        base = tuple(e.location)
        e.location = (base[0] + t0["x"] * k, base[1] - t0["y"] * k, base[2] + t0.get("z", 0) * k)
        e.rotation_mode = "XYZ"
        e.rotation_euler = (-math.radians(t0.get("rotationX", 0)), math.radians(t0.get("rotationY", 0)), -math.radians(t0.get("rotation", 0)))
        e.scale = (t0.get("scaleX", 1), t0.get("scaleY", 1), 1)
        if t0.get("skewX"):
            log(nid, "skewX ignored", t0["skewX"])
        if abs(t0["opacity"] - 1) > 1e-6:
            e["opacity"] = float(t0["opacity"])
        maps = {
            "x": ("location", 0, lambda v, b=base[0]: b + v * k, 1.0 * k),
            "y": ("location", 1, lambda v, b=base[1]: b - v * k, 1.0 * k),
            "z": ("location", 2, lambda v, b=base[2]: b + v * k, 1.0 * k),
            "rotation": ("rotation_euler", 2, lambda v: -math.radians(v), math.radians(0.5)),
            "rotationX": ("rotation_euler", 0, lambda v: -math.radians(v), math.radians(0.5)),
            "rotationY": ("rotation_euler", 1, lambda v: math.radians(v), math.radians(0.5)),
            "scaleX": ("scale", 0, lambda v: v, 0.005),
            "scaleY": ("scale", 1, lambda v: v, 0.005),
            "opacity": ('["opacity"]', -1, lambda v: v, 0.01),
        }
        for prop, (path, idx, conv, tol) in maps.items():
            smp = self.samples.get((nid, prop))
            if smp is None or not numeric(smp):
                continue
            if all(abs(x - smp[0]) < 1e-9 for x in smp) and not self.segs.get((nid, prop)):
                continue
            if prop == "opacity" and "opacity" not in e.keys():
                e["opacity"] = float(smp[0])
            how = channel(e, path, max(idx, 0), conv, self.segs.get((nid, prop), []), smp, self.off, tol, f"{short(nid)}.{prop}")
        self.direct_tracks(nid, e, base, k)
        for prop in ("skewX", "skewY", "filter", "left", "top", "visibility"):
            if (nid, prop) in self.samples and len(set(map(str, self.samples[(nid, prop)]))) > 1:
                log(f"{short(nid)}: animated {prop} not converted")

    def direct_tracks(self, nid, e, base, k):
        """Styles the scene's own code writes every frame (not GSAP): transform, top/left,
        opacity. Baked from the samples, then simplified."""
        n = self.nodes[nid]
        tf = self.direct.get((nid, "transform"))
        top = self.direct.get((nid, "top")); left = self.direct.get((nid, "left"))
        if tf or top or left:
            N = self.nframes
            dec = [decompose(tf[f]) if tf else None for f in range(N)] if tf else [None] * N
            t0 = n["t0"]
            x0 = px(left[0]) if left else 0; y0 = px(top[0]) if top else 0
            xs, ys, rs, sxs, sys_ = [], [], [], [], []
            for f in range(N):
                d = dec[f] or (t0["x"], t0["y"], t0.get("rotation", 0), t0.get("scaleX", 1), t0.get("scaleY", 1))
                xs.append(base[0] + (d[0] + (px(left[f]) - x0 if left else 0)) * k)
                ys.append(base[1] - (d[1] + (px(top[f]) - y0 if top else 0)) * k)
                rs.append(-math.radians(d[2])); sxs.append(d[3]); sys_.append(d[4])
            for path, idx, vals, tol in (("location", 0, xs, 0.5 * k), ("location", 1, ys, 0.5 * k), ("rotation_euler", 2, rs, math.radians(0.3)), ("scale", 0, sxs, 0.003), ("scale", 1, sys_, 0.003)):
                if max(vals) - min(vals) > 1e-7:
                    write_keys(ANIM.fc(e, path, idx), bake_keys(vals, self.off, tol))
        op = self.direct.get((nid, "opacity"))
        if op:
            vals = [float(v) for v in op]
            e["opacity"] = vals[0]
            write_keys(ANIM.fc(e, '["opacity"]', 0), bake_keys(vals, self.off, 0.004))
        if (nid, "filter") in self.direct:
            log(f"{short(nid)}: code-driven filter not converted")

    def visibility(self, nid, e):
        n = self.nodes[nid]
        vis = self.P["vis"].get(nid)
        win = n.get("clip")
        vals = None
        if vis:
            vals = vis
        if win:
            vals = vals or [1] * self.nframes
            vals = [v if win[0] - 1e-6 <= f / C.FPS < win[1] - 1e-6 else 0 for f, v in enumerate(vals)]
        if vals and not all(v == 1 for v in vals):
            e["vis"] = float(vals[0])
            fc = ANIM.fc(e, '["vis"]', 0)
            keys = [(self.off, float(vals[0]), "CONSTANT", None, None)]
            for f in range(1, len(vals)):
                if vals[f] != vals[f - 1]:
                    keys.append((f + self.off, float(vals[f]), "CONSTANT", None, None))
            write_keys(fc, keys)

    # ----- HTML painting
    def html_paint(self, nid, e, piv):
        n = self.nodes[nid]; st = n["style"]; b = n["box"]
        if st.get("visibility") == "hidden" and nid not in self.P["vis"]:
            return
        lx, ly = (b["x"] - piv[0]) * S, (b["y"] - piv[1]) * S
        rad = px(st.get("borderTopLeftRadius"))
        if "%" in str(st.get("borderTopLeftRadius")):
            rad = min(b["w"], b["h"]) * px(st["borderTopLeftRadius"].replace("%", "")) / 100
        chain = self.chain(nid)
        # shadows
        sh = st.get("boxShadow") or "none"
        if sh != "none":
            for i, (col, sx, sy, blur, spread) in enumerate(parse_shadows(sh)):
                o = C.rect_obj(short(nid) + f".shadow{i}", self.coll, self.mat(nid, shadow=True), 0, 0, 1, 1, 0, parent=e)
                pad = blur * 1.5 + abs(spread) + 2
                wv, hv = b["w"] + 2 * spread, b["h"] + 2 * spread
                C.set_input(o, "Rect", "X", lx + (sx - spread - pad) * S); C.set_input(o, "Rect", "Y", ly + (sy - spread - pad) * S)
                C.set_input(o, "Rect", "Width", (wv + 2 * pad) * S); C.set_input(o, "Rect", "Height", (hv + 2 * pad) * S)
                o["cx"] = lx + (sx + b["w"] / 2) * S; o["cy"] = -(ly + (sy + b["h"] / 2) * S)
                o["hw"] = wv / 2 * S; o["hh"] = hv / 2 * S; o["r"] = max(rad + spread, 0) * S; o["sig"] = max(blur / 2, 0.5) * S
                o.location.z = self.z()
                o.color = col[:3] + (1,)
                self.base_alpha_driver(o, col[3], chain)
        bg = C.css_rgba(st.get("backgroundColor"))
        bw = px(st.get("borderTopWidth")) if st.get("borderTopStyle") not in (None, "none") else 0
        bc = C.css_rgba(st.get("borderTopColor")) if bw else None
        is_img = n["tag"] == "img"
        if bw and bc and not is_img:
            o = C.rect_obj(short(nid) + ".border", self.coll, self.mat(nid), lx, ly, b["w"] * S, b["h"] * S, rad * S, parent=e)
            C.set_input(o, "Rect", "Border", bw * S)
            o.location.z = self.z(); o.color = bc[:3] + (1,)
            self.base_alpha_driver(o, bc[3], chain)
            self.color_track(o, nid, 2, bc)
            self.size_track(o, nid)
            # a partial border (e.g. border-left only) is still drawn as a full frame: log it
            if len({st.get("borderTopWidth"), st.get("borderRightWidth"), st.get("borderBottomWidth"), st.get("borderLeftWidth")}) > 1:
                log(short(nid), "uneven border drawn as uniform")
        paint_bg = bg or (C.css_rgba("rgb(0,0,0)") if False else None)
        blur = self.blur_px(nid)
        if bg and not is_img and blur:
            o = C.rect_obj(short(nid) + ".bg", self.coll, self.mat(nid, shadow=True), 0, 0, 1, 1, 0, parent=e)
            pad = max(blur) * 2 + 2
            C.set_input(o, "Rect", "X", lx - pad * S); C.set_input(o, "Rect", "Y", ly - pad * S)
            C.set_input(o, "Rect", "Width", (b["w"] + 2 * pad) * S); C.set_input(o, "Rect", "Height", (b["h"] + 2 * pad) * S)
            o["cx"] = lx + b["w"] / 2 * S; o["cy"] = -(ly + b["h"] / 2 * S); o["hw"] = b["w"] / 2 * S; o["hh"] = b["h"] / 2 * S
            o["r"] = min(rad, b["w"] / 2, b["h"] / 2) * S; o["sig"] = max(blur[0], 0.5) * S
            if len(set(blur)) > 1:
                write_keys(ANIM.fc(o, '["sig"]', 0), bake_keys([max(v, 0.5) * S for v in blur], self.off, 0.1 * S))
            o.location.z = self.z(); o.color = bg[:3] + (1,)
            self.base_alpha_driver(o, bg[3], chain)
            bg = None
        if bg and not is_img:
            ins = bw if (bw and bc) else 0
            o = C.rect_obj(short(nid) + ".bg", self.coll, self.mat(nid), lx + ins * S, ly + ins * S, (b["w"] - 2 * ins) * S, (b["h"] - 2 * ins) * S, max(rad - ins, 0) * S, parent=e)
            o.location.z = self.z(); o.color = bg[:3] + (1,)
            self.base_alpha_driver(o, bg[3], chain)
            self.color_track(o, nid, 1, bg)
            self.size_track(o, nid, inset=ins)
        elif self.P["paints"].get(nid) and not is_img:
            # background that starts transparent but is tweened in later
            vals = [C.css_rgba(s.split("|")[1]) for s in self.P["paints"][nid]]
            if any(vals):
                first = next(v for v in vals if v)
                o = C.rect_obj(short(nid) + ".bg", self.coll, self.mat(nid), lx, ly, b["w"] * S, b["h"] * S, rad * S, parent=e)
                o.location.z = self.z(); o.color = first[:3] + (1,)
                o["bg_alpha"] = 0.0
                fc = ANIM.fc(o, '["bg_alpha"]', 0)
                write_keys(fc, bake_keys([v[3] if v else 0.0 for v in vals], self.off, 0.003))
                self.base_alpha_driver(o, 1.0, chain)
                d = o.animation_data.drivers.find("color", index=3).driver
                v = d.variables.new(); v.name = "bga"; v.type = "SINGLE_PROP"; v.targets[0].id_type = "OBJECT"; v.targets[0].id = o; v.targets[0].data_path = '["bg_alpha"]'
                d.expression = d.expression + "*bga" if d.expression else "bga"
                self.color_track(o, nid, 1, first)
        if is_img:
            self.img(nid, e, lx, ly, rad, chain)
        if n["tag"] == "canvas" and n.get("canvas"):
            self.canvas(nid, e, lx, ly, chain)
        if n.get("text") or nid in self.P.get("textLayout", {}):
            self.text(nid, e, piv, chain)

    def blur_px(self, nid):
        """CSS filter blur per frame (static, tweened or code-driven), or None."""
        def val(v):
            m = re.search(r"blur\(([\d.]+)px\)", str(v)); return float(m.group(1)) if m else 0.0
        smp = self.samples.get((nid, "filter")) or self.direct.get((nid, "filter"))
        if smp:
            vals = [val(v) for v in smp]
        else:
            vals = [val(self.nodes[nid]["style"].get("filter"))] * self.nframes
        return vals if max(vals) > 0 else None

    def size_track(self, o, nid, inset=0.0):
        for prop, inp in (("width", "Width"), ("height", "Height")):
            smp = self.samples.get((nid, prop))
            if smp and numeric(smp) and len(set(smp)) > 1:
                path = C.input_path(o, "Rect", inp)
                channel(o, path, 0, lambda v: (v - 2 * inset) * S, self.segs.get((nid, prop), []), smp, self.off, 0.4 * S, f"{short(nid)}.{prop}")
                continue
            dv = self.direct.get((nid, prop))
            if dv:
                vals = [(px(v) - 2 * inset) * S for v in dv]
                write_keys(ANIM.fc(o, C.input_path(o, "Rect", inp), 0), bake_keys(vals, self.off, 0.3 * S))

    def img(self, nid, e, lx, ly, rad, chain):
        n = self.nodes[nid]; st = n["style"]; b = n["box"]
        src = n.get("src") or ""
        path = self.asset(src)
        if not path:
            log(nid, "missing image", src)
            return
        im = C.image(path)
        nw, nh = n.get("natural") or im.size
        fit = st.get("objectFit", "fill")
        u0, v0, u1, v1 = 0.0, 0.0, 1.0, 1.0
        if fit in ("cover", "contain") and nw and nh:
            sc = (max if fit == "cover" else min)(b["w"] / nw, b["h"] / nh)
            dw, dh = nw * sc, nh * sc
            pos = (st.get("objectPosition") or "50% 50%").split()
            def frac(t, free):
                if t.endswith("%"):
                    return float(t[:-1]) / 100
                return px(t) / free if free else 0.5
            fx = frac(pos[0], b["w"] - dw) if len(pos) > 0 else 0.5
            fy = frac(pos[1], b["h"] - dh) if len(pos) > 1 else 0.5
            offx = (b["w"] - dw) * fx; offy = (b["h"] - dh) * fy
            u0 = -offx / dw; u1 = (b["w"] - offx) / dw
            top = -offy / dh; bot = (b["h"] - offy) / dh
            v1 = 1 - top; v0 = 1 - bot
        o = C.rect_obj(short(nid) + ".image", self.coll, self.mat(nid, image=im), lx, ly, b["w"] * S, b["h"] * S, rad * S, parent=e, uv=(u0, v0, u1, v1))
        o.location.z = self.z(); o.color = (1, 1, 1, 1)
        self.base_alpha_driver(o, 1.0, chain)

    def canvas(self, nid, e, lx, ly, chain):
        import base64
        n = self.nodes[nid]; b = n["box"]
        data = n["canvas"].split(",", 1)[1]
        out = os.path.join(self.asset_dst, "generated", f"{self.name}-{short(nid)}.png".replace(" ", "_"))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "wb") as f:
            f.write(base64.b64decode(data))
        im = C.image(out)
        o = C.rect_obj(short(nid) + ".canvas", self.coll, self.mat(nid, image=im), lx, ly, b["w"] * S, b["h"] * S, 0, parent=e)
        o.location.z = self.z(); o.color = (1, 1, 1, 1)
        self.base_alpha_driver(o, 1.0, chain)
        if (nid, "attr:width") in self.samples or any(k[0] == nid for k in self.samples):
            pass
        log(short(nid), "canvas baked as a still image (t=0)")

    def asset(self, src):
        if not src:
            return None
        src = src.split("?")[0]
        a = os.path.normpath(os.path.join(self.asset_src, src))
        if not os.path.exists(a):
            return None
        rel = os.path.relpath(a, self.asset_src)
        dst = os.path.join(self.asset_dst, os.path.relpath(rel, "assets") if rel.startswith("assets") else rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(a):
            shutil.copy2(a, dst)
        return dst

    # ----- text
    def measure_obj(self):
        if not hasattr(self, "_mo"):
            c = bpy.data.curves.new("_measure", "FONT")
            self._mo = bpy.data.objects.new("_measure", c)
            bpy.context.scene.collection.objects.link(self._mo)
        return self._mo

    def ink(self, body, fnt, size, sp, ls=1.0):
        o = self.measure_obj(); c = o.data
        c.body = body; c.font = fnt; c.size = size; c.space_character = sp; c.space_line = ls
        c.align_x = "LEFT"; c.align_y = "TOP_BASELINE"
        dg = bpy.context.evaluated_depsgraph_get()
        oe = o.evaluated_get(dg)
        me = oe.to_mesh()
        if not len(me.vertices):
            oe.to_mesh_clear(); return None
        xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]
        oe.to_mesh_clear()
        return min(xs), max(xs), min(ys), max(ys)

    def fit_line(self, text, fnt, size, target_w):
        """Character spacing that makes the Blender ink width match the browser's."""
        a = self.ink(text, fnt, size, 1.0)
        if a is None:
            return 1.0, 0.0
        if len(text.strip()) < 2 or target_w <= 0:
            return 1.0, a[0]
        b = self.ink(text, fnt, size, 0.9)
        wa, wb = a[1] - a[0], b[1] - b[0]
        slope = (wa - wb) / 0.1
        sp = 1.0 if abs(slope) < 1e-9 else 1.0 + (target_w - wa) / slope
        sp = min(max(sp, 0.6), 1.4)
        c = self.ink(text, fnt, size, sp)
        return sp, c[0]

    def font_for(self, st):
        fnt = C.font(C.font_file(st["fontFamily"], st["fontWeight"]))
        return fnt

    def text(self, nid, e, piv, chain):
        n = self.nodes[nid]
        st = n["style"]
        dyn = nid in self.P["texts"]
        col = C.css_rgba(st.get("color")) or C.hex_rgba("1B1B19")
        fnt = self.font_for(st)
        cap = C.blender_cap(fnt)
        fs = px(st["fontSize"])
        upper = st.get("textTransform") == "uppercase"
        mat = self.mat(nid)
        if not dyn:
            cr = n.get("capRatio") or 0.7275
            size = cr * fs * S / cap
            for i, ln in enumerate(n["text"]):
                body = ln["text"].upper() if upper else ln["text"]
                if not body.strip():
                    continue
                sp, minx = self.fit_line(body, fnt, size, (ln["inkR"] - ln["inkL"]) * S)
                cu = bpy.data.curves.new(short(nid) + f".text{i}", "FONT")
                cu.body = body; cu.font = fnt; cu.size = size; cu.space_character = sp
                cu.align_x = "LEFT"; cu.align_y = "TOP_BASELINE"
                cu.materials.append(mat)
                o = bpy.data.objects.new(short(nid) + f".text{i}", cu)
                self.coll.objects.link(o); o.parent = e
                o.location = ((ln["x"] + ln["inkL"] - piv[0]) * S - minx, -(ln["baseline"] - piv[1]) * S, self.z())
                o.color = col[:3] + (1,)
                self.base_alpha_driver(o, col[3], chain)
                self.color_track(o, nid, 0, col)
            return
        if nid in self.rich and "mono" in st["fontFamily"].lower():
            return self.rich_text(nid, e, piv, chain, fnt, cap, fs, mat)
        # live text: every state packed into one string; Position/Length keyed per frame
        lay = self.P["textLayout"][nid]
        states = self.P["texts"][nid]
        cr = lay.get("capRatio") or 0.7275
        size = cr * fs * S / cap
        uniq = []
        for s_ in states:
            s2 = s_.upper() if upper else s_
            if s2 not in uniq:
                uniq.append(s2)
        packed = ""; spans = {}
        for s_ in uniq:
            spans[s_] = (len(packed), len(s_)); packed += s_
        lines = lay["lines"]
        longest = max(uniq, key=len)
        first = lines[0] if lines else {"x": lay["box"]["x"], "baseline": lay["box"]["y"] + fs, "inkL": 0, "inkR": 0, "w": 0, "text": longest}
        sp, minx = self.fit_line(first["text"] or longest, fnt, size, (first["inkR"] - first["inkL"]) * S)
        # line spacing: CSS line-height vs Blender's line advance at this size
        lh = px(st.get("lineHeight")) if st.get("lineHeight") not in (None, "normal") else fs * 1.2
        if "\n" in longest or len(lines) > 1:
            a = self.ink("H\nH", fnt, size, 1.0, 1.0)
            one = self.ink("H", fnt, size, 1.0, 1.0)
            adv = (one[2] - a[2]) if a and one else size
            line_sp = (lh * S) / adv if adv else 1.0
        else:
            line_sp = 1.0
        align = {"center": 1, "right": 2, "end": 2}.get(st.get("textAlign"), 0)
        o = C.gn_obj(short(nid) + ".live", self.coll, mat, C.gn_text(), "Text", parent=e)
        C.set_input(o, "Text", "String", packed)
        C.set_input(o, "Text", "Size", size)
        C.set_input(o, "Text", "Font", fnt)
        C.set_input(o, "Text", "Character Spacing", sp)
        C.set_input(o, "Text", "Line Spacing", line_sp)
        C.set_input(o, "Text", "Align", align)
        bx = lay["box"]
        if align == 0:
            x = (first["x"] + first["inkL"] - piv[0]) * S - minx
        elif align == 1:
            x = (bx["x"] + bx["w"] / 2 - piv[0]) * S
        else:
            x = (bx["x"] + bx["w"] - piv[0]) * S
        o.location = (x, -(first["baseline"] - piv[1]) * S, self.z())
        o.color = col[:3] + (1,)
        self.base_alpha_driver(o, col[3], chain)
        self.color_track(o, nid, 0, col)
        pp = C.input_path(o, "Text", "Position"); lp = C.input_path(o, "Text", "Length")
        pk, lk = [], []
        prev = None
        for f, s_ in enumerate(states):
            s2 = s_.upper() if upper else s_
            if s2 != prev:
                p0, l0 = spans[s2]
                pk.append((f + self.off, p0, "CONSTANT", None, None)); lk.append((f + self.off, l0, "CONSTANT", None, None))
                prev = s2
        write_keys(ANIM.fc(o, pp, 0), pk); write_keys(ANIM.fc(o, lp, 0), lk)
        o["states"] = json.dumps(uniq)[:4000]

    def rich_text(self, nid, e, piv, chain, fnt, cap, fs, mat):
        """Syntax-coloured monospace text that changes over time: one live-text layer per
        colour, the other characters blanked to spaces so the columns line up."""
        n = self.nodes[nid]; st = n["style"]
        lay = self.P["textLayout"][nid]
        frames = self.rich[nid]
        cols = []
        for runs in frames:
            for _, c in runs:
                if c not in cols:
                    cols.append(c)
        cr = lay.get("capRatio") or 0.73
        size = cr * fs * S / cap
        lines = lay["lines"]
        first = lines[0] if lines else None
        # character spacing from the full (all-colour) longest text
        full_first = first["text"] if first else ""
        sp, minx = self.fit_line(full_first, fnt, size, (first["inkR"] - first["inkL"]) * S) if first and full_first.strip() else (1.0, 0.0)
        # anchor: the start of the line box (leading spaces included, mono advance)
        a_full = self.ink(full_first, fnt, size, sp) if full_first.strip() else None
        x_start = (first["x"] + first["inkL"] - piv[0]) * S - (a_full[0] if a_full else 0) if first else (lay["box"]["x"] - piv[0]) * S
        base_y = -(first["baseline"] - piv[1]) * S if first else -(lay["box"]["y"] + fs * 0.8 - piv[1]) * S
        for ci, c in enumerate(cols):
            rgba = C.css_rgba(c) or C.hex_rgba("D9D7CF")
            states = []
            for runs in frames:
                txt = "".join((t if cc == c else re.sub(r"[^\n]", " ", t)) for t, cc in runs)
                states.append(txt.rstrip())
            uniq = list(dict.fromkeys(states))
            packed = ""; spans = {}
            for u in uniq:
                spans[u] = (len(packed), len(u)); packed += u
            if not packed.strip():
                continue
            o = C.gn_obj(short(nid) + f".live{ci}", self.coll, mat, C.gn_text(), "Text", parent=e)
            C.set_input(o, "Text", "String", packed); C.set_input(o, "Text", "Size", size)
            C.set_input(o, "Text", "Font", fnt); C.set_input(o, "Text", "Character Spacing", sp)
            o.location = (x_start, base_y, self.z())
            o.color = rgba[:3] + (1,)
            self.base_alpha_driver(o, rgba[3], chain)
            pk, lk = [], []; prev = None
            for f, u in enumerate(states):
                if u != prev:
                    p0, l0 = spans[u]
                    pk.append((f + self.off, p0, "CONSTANT", None, None)); lk.append((f + self.off, l0, "CONSTANT", None, None)); prev = u
            write_keys(ANIM.fc(o, C.input_path(o, "Text", "Position"), 0), pk)
            write_keys(ANIM.fc(o, C.input_path(o, "Text", "Length"), 0), lk)

    # ----- SVG painting
    def svg_paint(self, nid, e):
        n = self.nodes[nid]; tag = n["tag"]; a = n.get("svg", {})
        if tag not in ("rect", "path", "circle", "line", "polyline", "polygon"):
            return
        # skip anything inside <mask>/<defs>: handled by the masked shape
        p = n["parent"]
        while p:
            if self.nodes[p]["tag"] in ("mask", "defs", "clippath"):
                return
            p = self.nodes[p]["parent"]
        st = n["style"]
        chain = self.chain(nid)
        fill = C.css_rgba(st.get("fill")) if st.get("fill") not in (None, "none") else None
        stroke = C.css_rgba(st.get("stroke")) if st.get("stroke") not in (None, "none") else None
        fo = float(st.get("fillOpacity") or 1)
        mat = self.mat(nid)
        if tag == "rect":
            x, y, w, h = (float(a.get(k, 0) or 0) for k in ("x", "y", "width", "height"))
            rx = float(a.get("rx", a.get("ry", 0)) or 0)
            if fill:
                o = C.rect_obj(short(nid) + ".rect", self.coll, mat, x, y, w, h, rx, parent=e)
                o.location.z = self.z(); o.color = fill[:3] + (1,)
                self.base_alpha_driver(o, fill[3] * fo, chain)
                self.color_track(o, nid, 0, fill)
                for attr, inp in (("x", "X"), ("y", "Y"), ("width", "Width"), ("height", "Height"), ("rx", "Radius")):
                    smp = self.samples.get((nid, "attr:" + attr))
                    if smp and numeric(smp) and len(set(smp)) > 1:
                        channel(o, C.input_path(o, "Rect", inp), 0, lambda v: v, self.segs.get((nid, "attr:" + attr), []), smp, self.off, 0.02, f"{short(nid)}.{attr}")
            return
        if tag == "path":
            d = a.get("d", "")
            if not d:
                return
            pc = C.path_curve(short(nid) + ".path", self.coll, d, parent=e)
            dsmp = self.samples.get((nid, "attr:d"))
            if dsmp and len(set(dsmp)) > 1:
                self.animate_path(pc, dsmp)
            if fill:
                o = C.gn_obj(short(nid) + ".fill", self.coll, mat, C.gn_shape(), "Shape", parent=e)
                C.set_input(o, "Shape", "Path", pc)
                o.location.z = self.z(); o.color = fill[:3] + (1,)
                self.base_alpha_driver(o, fill[3] * fo, chain)
                self.color_track(o, nid, 0, fill)
                mk = a.get("mask", "")
                m = re.match(r"url\(#([^)]+)\)", mk)
                if m:
                    self.mask_hole(o, m.group(1))
            if stroke:
                sw = float(str(st.get("strokeWidth") or "1").replace("px", ""))
                o = C.gn_obj(short(nid) + ".stroke", self.coll, mat, C.gn_stroke(), "Stroke", parent=e)
                C.set_input(o, "Stroke", "Path", pc); C.set_input(o, "Stroke", "Width", sw)
                o.location.z = self.z(); o.color = stroke[:3] + (1,)
                self.base_alpha_driver(o, stroke[3], chain)
                self.color_track(o, nid, 0, stroke) if False else None
            return
        log(short(nid), "svg", tag, "not converted")

    def mask_hole(self, o, mask_id):
        mk = next((m for m in self.P["nodes"] if m["tag"] == "mask" and m.get("svg", {}).get("id") == mask_id), None)
        if not mk:
            return
        black = lambda c: self.nodes[c]["svg"].get("fill", "").lower() in ("#000", "#000000", "black")
        paths = [self.nodes[c] for c in self.kids.get(mk["id"], []) if self.nodes[c]["tag"] == "path" and black(c)]
        for ph in paths[:1]:
            d = ph["svg"].get("d", "") or "M0 0Z"
            hc = C.path_curve(o.name + ".hole", self.coll, d, parent=o.parent)
            C.set_input(o, "Shape", "Hole Path", hc)
            dsmp = self.samples.get((ph["id"], "attr:d"))
            if dsmp and len(set(dsmp)) > 1:
                self.animate_path(hc, dsmp)
        holes = [self.nodes[c] for c in self.kids.get(mk["id"], []) if self.nodes[c]["tag"] == "rect" and black(c)]
        if not holes:
            return
        h = holes[0]; a = h["svg"]
        C.set_input(o, "Shape", "Hole", True)
        for attr, inp in (("x", "Hole X"), ("y", "Hole Y"), ("width", "Hole Width"), ("height", "Hole Height"), ("rx", "Hole Radius")):
            C.set_input(o, "Shape", inp, float(a.get(attr, 0) or 0))
            smp = self.samples.get((h["id"], "attr:" + attr))
            if smp and numeric(smp) and len(set(smp)) > 1:
                channel(o, C.input_path(o, "Shape", inp), 0, lambda v: v, self.segs.get((h["id"], "attr:" + attr), []), smp, self.off, 0.02, f"{o.name}.hole.{attr}")
        if len(holes) > 1:
            log(o.name, "mask has", len(holes), "holes; only the first is cut")

    def animate_path(self, pc, dsmp):
        """A path whose d changes (the floor dip): key every bezier point per frame."""
        cu = pc.data
        n0 = [len(s.bezier_points) for s in cu.splines]
        frames = []
        prev = None
        for f, d in enumerate(dsmp):
            if d != prev:
                frames.append((f, d)); prev = d
        tmp = bpy.data.curves.new("_tmp", "CURVE")
        for f, d in frames:
            C.fill_path(tmp, d)
            if [len(s.bezier_points) for s in tmp.splines] != n0:
                log(pc.name, "path topology changes; frame", f, "skipped")
                continue
            for s, t in zip(cu.splines, tmp.splines):
                for bp, tp in zip(s.bezier_points, t.bezier_points):
                    bp.co = tp.co; bp.handle_left = tp.handle_left; bp.handle_right = tp.handle_right
                    for prop in ("co", "handle_left", "handle_right"):
                        bp.keyframe_insert(prop, frame=f + self.off)
        bpy.data.curves.remove(tmp)
        # restore t=0 shape
        C.fill_path(tmp := bpy.data.curves.new("_tmp2", "CURVE"), dsmp[0]); bpy.data.curves.remove(tmp)


def decompose(m):
    """CSS computed transform -> (x, y, rotation deg, scaleX, scaleY)."""
    if not m or m == "none":
        return (0.0, 0.0, 0.0, 1.0, 1.0)
    v = [float(x) for x in re.findall(r"-?[\d.]+(?:e-?\d+)?", m.split("(", 1)[1])]
    if m.startswith("matrix3d"):
        a, b, c, d, e, f = v[0], v[1], v[4], v[5], v[12], v[13]
    else:
        a, b, c, d, e, f = v[:6]
    sx = math.hypot(a, b)
    rot = math.degrees(math.atan2(b, a))
    sy = (a * d - b * c) / sx if sx else 0.0
    return (e, f, rot, sx, sy)


def parse_shadows(s):
    out = []
    for part in re.split(r",(?![^(]*\))", s):
        part = part.strip()
        if not part or part.startswith("inset") or " inset" in part:
            continue
        m = re.match(r"(rgba?\([^)]*\)|#[0-9a-fA-F]+)\s+(.*)", part)
        if not m:
            m2 = re.match(r"(.*?)\s+(rgba?\([^)]*\)|#[0-9a-fA-F]+)$", part)
            if not m2:
                continue
            col, rest = m2.group(2), m2.group(1)
        else:
            col, rest = m.group(1), m.group(2)
        nums = [px(x) for x in rest.split()]
        while len(nums) < 4:
            nums.append(0.0)
        c = C.css_rgba(col)
        if c:
            out.append((c, nums[0], nums[1], nums[2], nums[3]))
    return out
