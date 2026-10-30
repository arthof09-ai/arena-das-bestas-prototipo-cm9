#!/usr/bin/env python3
"""
EXP-MUSE-004 — Processamento dos sprites gerados por IA (Arena das Bestas v2).

Para cada folha em assets-src/ (fundo chroma #00FF00):
  1. chroma-key por distância de cor -> alfa, com feather e despill verde;
  2. fatia a folha em N quadros (colunas iguais) e, dentro de cada coluna,
     mantém o componente principal (o corpo) + componentes próximos a ele
     (espada/arcos), descartando vazamento dos quadros vizinhos;
  3. normaliza TODAS as folhas de um personagem pela MESMA escala (medida
     pela altura do corpo nos quadros de idle/andar) e cola cada quadro num
     canvas uniforme por personagem, alinhado pelo ponto dos pés
     (baseline = fundo da caixa do quadro; centro horizontal = centro do corpo).

Saída: PNGs finais em assets/ + assets/manifest.json (canvas/pés por personagem).
Uso: python3 tools/process_sprites.py
"""
import glob
import json
import os

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from scipy import ndimage

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(BASE, "assets-src")
OUT_DIR = os.path.join(BASE, "assets")

# ---------------------------------------------------------------- chroma key

def chroma_key(img: Image.Image):
    """Retorna (rgba float rgb, alpha float 0..1) com despill aplicado."""
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # distância normalizada à cor-chave (0,255,0)
    dist = np.sqrt(((255.0 - g) ** 2 + r ** 2 + b ** 2) / 3.0) / 255.0
    alpha = np.clip((dist - 0.10) / 0.20, 0.0, 1.0)
    alpha[alpha < 0.03] = 0.0
    # despill: onde o verde domina, reduz o excesso proporcional ao alfa
    mx = np.maximum(r, b)
    excess = np.clip(g - mx, 0.0, None)
    g = g - excess * (1.0 - alpha * 0.65)
    rgb = np.stack([r, g, b], axis=-1)
    return rgb, alpha

# ---------------------------------------------------------------- fatiamento

def slice_sheet(rgb, alpha, n_frames, keep_near=28, min_comp=80):
    """Corta a folha em n_frames quadros. Retorna lista de dicts:
    {rgba (H,W,4) uint8 recortado, body_cx, body_h, feet_y} em coords da folha."""
    H, W = alpha.shape
    mask = alpha > 0.35
    col_w = W / float(n_frames)
    frames = []
    for i in range(n_frames):
        x0 = int(round(i * col_w))
        x1 = int(round((i + 1) * col_w))
        sub = mask[:, x0:x1]
        lab, n = ndimage.label(sub)
        if n == 0:
            frames.append(None)
            continue
        sizes = ndimage.sum(sub, lab, range(1, n + 1))
        main_id = 1 + int(np.argmax(sizes))
        ys, xs = np.where(lab == main_id)
        mb = (xs.min(), ys.min(), xs.max(), ys.max())  # bbox do corpo
        keep = [main_id]
        sub_w = x1 - x0
        for cid in range(1, n + 1):
            if cid == main_id or sizes[cid - 1] < min_comp:
                continue
            ys2, xs2 = np.where(lab == cid)
            bb = (xs2.min(), ys2.min(), xs2.max(), ys2.max())
            # vazamento do vizinho é cortado pela borda da coluna: descarta
            if bb[0] <= 2 or bb[2] >= sub_w - 3:
                continue
            if not (bb[2] < mb[0] - keep_near or bb[0] > mb[2] + keep_near
                    or bb[3] < mb[1] - keep_near or bb[1] > mb[3] + keep_near):
                keep.append(cid)
        keep_mask = np.isin(lab, keep)
        ys3, xs3 = np.where(keep_mask)
        bx0, by0 = xs3.min() + x0, ys3.min()
        bx1, by1 = xs3.max() + x0, ys3.max()
        pad = 4
        cx0, cy0 = max(0, bx0 - pad), max(0, by0 - pad)
        cx1, cy1 = min(W - 1, bx1 + pad), min(H - 1, by1 + pad)
        frames.append({
            "col": (x0, x1),
            "keep_mask_col": keep_mask,
            "bbox": (bx0, by0, bx1, by1),
            "body_cx": x0 + (mb[0] + mb[2]) / 2.0,
            "body_h": float(mb[3] - mb[1] + 1),
            "feet_y": float(by1),
        })
    # monta os recortes RGBA usando a máscara de cada coluna
    out = []
    for i, fr in enumerate(frames):
        if fr is None:
            out.append(None)
            continue
        x0, x1 = fr["col"]
        a_full = np.zeros((H, W), dtype=np.float32)
        a_full[:, x0:x1] = np.where(fr["keep_mask_col"], alpha[:, x0:x1], 0.0)
        bx0, by0, bx1, by1 = fr["bbox"]
        pad = 4
        cx0, cy0 = max(0, bx0 - pad), max(0, by0 - pad)
        cx1, cy1 = min(W - 1, bx1 + pad), min(H - 1, by1 + pad)
        rgba = np.zeros((cy1 - cy0 + 1, cx1 - cx0 + 1, 4), dtype=np.uint8)
        rgba[..., :3] = rgb[cy0:cy1 + 1, cx0:cx1 + 1].astype(np.uint8)
        rgba[..., 3] = (a_full[cy0:cy1 + 1, cx0:cx1 + 1] * 255).astype(np.uint8)
        fr = dict(fr)
        fr["rgba"] = rgba
        fr["crop_origin"] = (cx0, cy0)
        out.append(fr)
    return out

# ---------------------------------------------------------------- normalização

def normalize_character(name, sheets, ref_px, out_names):
    """sheets: {chave: [frames]}; out_names: {chave: [nomes de saída]}.
    Escala única do personagem a partir da mediana da altura do corpo.
    Retorna o manifesto do personagem."""
    ref_heights = []
    for frames in sheets.values():
        for fr in frames:
            if fr is not None:
                ref_heights.append(fr["body_h"])
    median_h = float(np.median(ref_heights))
    scale = ref_px / median_h
    # 1ª passada: geometria de cada quadro já escalado
    placed = {}
    need_left = need_right = need_up = 1.0
    for key, frames in sheets.items():
        placed[key] = []
        for fr in frames:
            if fr is None:
                placed[key].append(None)
                continue
            im = Image.fromarray(fr["rgba"], "RGBA")
            nw = max(1, int(round(im.width * scale)))
            nh = max(1, int(round(im.height * scale)))
            im = im.resize((nw, nh), Image.LANCZOS)
            ox, oy = fr["crop_origin"]
            # ponto dos pés no quadro recortado (coords da folha -> recorte)
            feet_x_src = fr["body_cx"] - ox
            feet_y_src = fr["feet_y"] - oy
            fx = feet_x_src * scale
            fy = feet_y_src * scale
            placed[key].append({"im": im, "fx": fx, "fy": fy})
            need_left = max(need_left, fx)
            need_right = max(need_right, nw - fx)
            need_up = max(need_up, fy)
    margin_down = 26.0
    canvas_w = int(np.ceil(need_left + need_right)) + 8
    canvas_h = int(np.ceil(need_up + margin_down)) + 4
    feet = (int(round(need_left)) + 4, int(round(need_up)))
    manifest = {"canvas": [canvas_w, canvas_h], "feet": list(feet), "anims": {}}
    for key, plist in placed.items():
        names = out_names[key]
        manifest["anims"][key] = []
        for item, out_name in zip(plist, names):
            if item is None:
                continue
            canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
            px = int(round(feet[0] - item["fx"]))
            py = int(round(feet[1] - item["fy"]))
            canvas.alpha_composite(item["im"], (px, py))
            canvas.save(os.path.join(OUT_DIR, out_name))
            manifest["anims"][key].append(out_name)
    return manifest

# ---------------------------------------------------------------- arena

def process_arena(src_path, out_path):
    """Recorta/escala a arte pintada da arena para 1280x720 alinhando a
    elipse do anel de runas à elipse de gameplay: centro (640,372),
    raios (566,306)."""
    im = Image.open(src_path).convert("RGB")
    W, H = im.size
    a = np.asarray(im).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # anel de runas: dourado brilhante
    ring = (r > 165) & (g > 115) & (b < 130) & ((r - b) > 95)
    ring = ndimage.binary_opening(ring, structure=np.ones((3, 3)))
    ys, xs = np.where(ring)
    if len(xs) < 500:  # reserva: terra quente
        dirt = (r > 85) & ((r - b) > 30) & ((g - b) > 8)
        lab, n = ndimage.label(dirt)
        sizes = ndimage.sum(dirt, lab, range(1, n + 1))
        ys, xs = np.where(lab == 1 + int(np.argmax(sizes)))
    x0, x1 = np.percentile(xs, 0.3), np.percentile(xs, 99.7)
    y0, y1 = np.percentile(ys, 0.3), np.percentile(ys, 99.7)
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    sx = (566.0 * 2) / (x1 - x0)
    sy = (306.0 * 2) / (y1 - y0)
    resized = im.resize((int(round(W * sx)), int(round(H * sy))), Image.LANCZOS)
    # fundo: a própria imagem cobrindo a tela, escurecida e desfocada
    cover_s = max(1280.0 / W, 720.0 / H)
    cover = im.resize((int(round(W * cover_s)), int(round(H * cover_s))), Image.LANCZOS)
    ox = (cover.width - 1280) // 2
    oy = (cover.height - 720) // 2
    cover = cover.crop((ox, oy, ox + 1280, oy + 720))
    cover = ImageEnhance.Brightness(cover).enhance(0.42)
    cover = cover.filter(ImageFilter.GaussianBlur(5))
    px = int(round(640 - cx * sx))
    py = int(round(372 - cy * sy))
    cover.paste(resized, (px, py))
    cover.save(out_path)
    return {"ring_bbox_src": [float(x0), float(y0), float(x1), float(y1)],
            "scale": [float(sx), float(sy)], "paste": [px, py]}

# ---------------------------------------------------------------- principal

def find_src(prefix):
    hits = sorted(glob.glob(os.path.join(SRC_DIR, "media-generation-%s-*.png" % prefix)))
    if not hits:
        raise FileNotFoundError(prefix)
    return hits[0]

def load_sheet(prefix, n_frames):
    path = find_src(prefix)
    img = Image.open(path)
    rgb, alpha = chroma_key(img)
    return slice_sheet(rgb, alpha, n_frames)

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    manifest = {}

    # ---------------- cavaleiro (escala única p/ todas as folhas) ----------
    knight_sheets = {
        "idle": load_sheet("knight-idle-src", 4),
        "run": load_sheet("knight-run-src", 5),
        "attack": load_sheet("knight-attack-src", 7),
        "misc": load_sheet("knight-dash-src", 5),
    }
    # referência de escala: alturas do corpo no idle
    idle_h = [fr["body_h"] for fr in knight_sheets["idle"] if fr]
    med = float(np.median(idle_h))
    print("[knight] altura mediana do corpo (idle): %.0f px -> alvo 168" % med)
    # truque: normalize_character calcula a escala pela mediana de TODAS as
    # folhas; para ancorar no idle, passamos ref proporcional.
    all_h = [fr["body_h"] for sh in knight_sheets.values() for fr in sh if fr]
    ref_px = 168.0 * float(np.median(all_h)) / med
    manifest["knight"] = normalize_character("knight", knight_sheets, ref_px, {
        "idle": ["knight_idle_%d.png" % i for i in range(4)],
        "run": ["knight_run_%d.png" % i for i in range(5)],
        "attack": ["knight_attack_%d.png" % i for i in range(7)],
        "misc": ["knight_dash_0.png", "knight_dash_1.png", "knight_hurt_0.png",
                 "knight_death_0.png", "knight_death_1.png"],
    })

    # ---------------- sombra rápida ---------------------------------------
    fast = {"all": load_sheet("shadow-fast-src", 6)}
    manifest["rapida"] = normalize_character("rapida", fast, 118.0, {
        "all": ["rapida_walk_0.png", "rapida_walk_1.png", "rapida_walk_2.png",
                "rapida_walk_3.png", "rapida_attack_0.png", "rapida_attack_1.png"],
    })

    # ---------------- sombra bruta ----------------------------------------
    brute = {"all": load_sheet("shadow-brute-src", 6)}
    manifest["bruta"] = normalize_character("bruta", brute, 200.0, {
        "all": ["bruta_walk_0.png", "bruta_walk_1.png", "bruta_walk_2.png",
                "bruta_walk_3.png", "bruta_attack_0.png", "bruta_attack_1.png"],
    })

    # ---------------- arena ------------------------------------------------
    manifest["arena"] = process_arena(find_src("arena-bg-src"),
                                      os.path.join(OUT_DIR, "arena.png"))
    print("[arena]", manifest["arena"])

    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    for char in ("knight", "rapida", "bruta"):
        m = manifest[char]
        print("[%s] canvas=%s pés=%s anims=%s" % (
            char, m["canvas"], m["feet"],
            {k: len(v) for k, v in m["anims"].items()}))
    print("OK ->", OUT_DIR)

if __name__ == "__main__":
    main()
