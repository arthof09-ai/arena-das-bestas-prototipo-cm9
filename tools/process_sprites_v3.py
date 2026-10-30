#!/usr/bin/env python3
"""
EXP-MUSE-005 — Processamento v3 (Arena das Bestas v3, animação fluida).

Reusa o pipeline da v2 (process_sprites.py: chroma_key + slice_sheet) e
acrescenta:
  - escala FIXA por personagem, ancorada EXATAMENTE na escala efetiva da
    v2 (cavaleiro: 168 px / mediana do corpo no idle; rápida: 118 px;
    bruta: 200 px — medianas medidas nas folhas-fonte da v2), para o
    tamanho em jogo não mudar;
  - regra de "pés por fileira densa" opcional por folha (a folha de combo
    do cavaleiro tem rastros de energia ABAIXO dos pés num quadro — a
    fileira densa das botas, não a ponta do rastro, marca o chão).

Folhas novas (assets-src/): ciclos completos dos monstros (corrida/andar,
ataque em sequência, surgir do chão, ferido/dissolução da bruta), corrida
e combo expandido do cavaleiro. A rápida NÃO tem folha misc: a geração
foi recusada pelo gerador de imagens — ferido/dissolução dela são
derivados no código (poses de recuo do ataque + rise reverso), ver
shadow_view.gd.

Saída: PNGs em assets/ + manifest.json atualizado (arena preservada da v2).
Uso: python3 tools/process_sprites_v3.py
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import process_sprites as ps  # pipeline v2 (BASE/SRC_DIR/OUT_DIR relativos a ESTE projeto)

BASE = ps.BASE
SRC_DIR = ps.SRC_DIR
OUT_DIR = ps.OUT_DIR


def find_src(prefix):
    hits = sorted(glob.glob(os.path.join(SRC_DIR, "media-generation-%s-*.png" % prefix)))
    if not hits:
        raise FileNotFoundError(prefix)
    return hits[0]


def despill(rgba):
    """Despill forte pós-recorte: nestes personagens NÃO existe verde
    legítimo (roxo/vermelho/aço) — todo canal verde acima de max(r,b)
    é vazamento do chroma (a fumaça semi-transparente das folhas novas
    veio esverdeada). Clampa g para max(r,b)+4 preservando ciano dos
    rastros de lâmina (onde b é o canal dominante)."""
    out = rgba.astype(np.float32)
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    mx = np.maximum(r, b)
    out[..., 1] = np.minimum(g, mx + 4.0)
    return out.astype(np.uint8)


def slice_sheet_v3(rgb, alpha, n_frames, min_comp=60):
    """Fatiamento por PROPRIEDADE de componente (v3): rotula a folha
    inteira e atribui cada componente ao quadro cuja coluna contém o
    centroide dele. Diferente do corte por colunas da v2, poses que
    cruzam a fronteira da coluna (capa/espada) NÃO são amputadas nem
    vazam para o quadro vizinho. Formato de saída = ps.slice_sheet."""
    from scipy import ndimage
    H, W = alpha.shape
    mask = alpha > 0.35
    lab, n = ndimage.label(mask)
    col_w = W / float(n_frames)
    groups = {}
    if n:
        objs = ndimage.find_objects(lab)
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        cents = ndimage.center_of_mass(mask, lab, range(1, n + 1))
        for cid in range(1, n + 1):
            if sizes[cid - 1] < min_comp:
                continue
            fi = int(cents[cid - 1][1] / col_w)
            fi = min(max(fi, 0), n_frames - 1)
            groups.setdefault(fi, []).append(cid)
    frames = []
    for i in range(n_frames):
        cids = groups.get(i, [])
        if not cids:
            frames.append(None)
            continue
        sizes = ndimage.sum(mask, lab, cids)
        main_id = cids[int(np.argmax(sizes))]
        ys, xs = np.where(lab == main_id)
        mb = (xs.min(), ys.min(), xs.max(), ys.max())
        keep_mask = np.isin(lab, cids)
        ys3, xs3 = np.where(keep_mask)
        bx0, by0, bx1, by1 = xs3.min(), ys3.min(), xs3.max(), ys3.max()
        pad = 4
        cx0, cy0 = max(0, bx0 - pad), max(0, by0 - pad)
        cx1, cy1 = min(W - 1, bx1 + pad), min(H - 1, by1 + pad)
        a_full = np.where(keep_mask, alpha, 0.0).astype(np.float32)
        rgba = np.zeros((cy1 - cy0 + 1, cx1 - cx0 + 1, 4), dtype=np.uint8)
        rgba[..., :3] = rgb[cy0:cy1 + 1, cx0:cx1 + 1].astype(np.uint8)
        rgba[..., 3] = (a_full[cy0:cy1 + 1, cx0:cx1 + 1] * 255).astype(np.uint8)
        rgba = despill(rgba)
        frames.append({
            "col": (int(i * col_w), int((i + 1) * col_w)),
            "keep_mask_col": None,
            "bbox": (bx0, by0, bx1, by1),
            "body_cx": (mb[0] + mb[2]) / 2.0,
            "body_h": float(mb[3] - mb[1] + 1),
            "feet_y": float(by1),
            "rgba": rgba,
            "crop_origin": (cx0, cy0),
        })
    return frames


def slice_sheet_smart(rgb, alpha, n_frames, min_comp=60):
    """Fatiamento p/ folhas com rastros que TOCAM a pose vizinha (combo do
    cavaleiro, investida da rápida): erode a máscara p/ rotular (os rastros
    finos se partem, os corpos não), atribui cada corpo a um quadro pelo
    centroide e devolve cada pixel da máscara ORIGINAL ao corpo mais
    próximo (Voronoi por transformada de distância)."""
    from scipy import ndimage
    H, W = alpha.shape
    mask = alpha > 0.35
    eroded = ndimage.binary_erosion(mask, iterations=2)
    lab, n = ndimage.label(eroded)
    col_w = W / float(n_frames)
    groups = {}
    if n:
        sizes = ndimage.sum(eroded, lab, range(1, n + 1))
        cents = ndimage.center_of_mass(eroded, lab, range(1, n + 1))
        for cid in range(1, n + 1):
            if sizes[cid - 1] < min_comp:
                continue
            fi = int(cents[cid - 1][1] / col_w)
            fi = min(max(fi, 0), n_frames - 1)
            groups.setdefault(fi, []).append(cid)
    # Voronoi: cada pixel da máscara pertence ao componente erodido + próximo
    _, inds = ndimage.distance_transform_edt(~eroded, return_indices=True)
    nearest_lab = lab[inds[0], inds[1]]
    frames = []
    for i in range(n_frames):
        cids = groups.get(i, [])
        if not cids:
            frames.append(None)
            continue
        sizes = ndimage.sum(eroded, lab, cids)
        main_id = cids[int(np.argmax(sizes))]
        ys, xs = np.where(lab == main_id)
        mb = (xs.min(), ys.min(), xs.max(), ys.max())
        keep_mask = mask & np.isin(nearest_lab, cids)
        ys3, xs3 = np.where(keep_mask)
        bx0, by0, bx1, by1 = xs3.min(), ys3.min(), xs3.max(), ys3.max()
        pad = 4
        cx0, cy0 = max(0, bx0 - pad), max(0, by0 - pad)
        cx1, cy1 = min(W - 1, bx1 + pad), min(H - 1, by1 + pad)
        a_full = np.where(keep_mask, alpha, 0.0).astype(np.float32)
        rgba = np.zeros((cy1 - cy0 + 1, cx1 - cx0 + 1, 4), dtype=np.uint8)
        rgba[..., :3] = rgb[cy0:cy1 + 1, cx0:cx1 + 1].astype(np.uint8)
        rgba[..., 3] = (a_full[cy0:cy1 + 1, cx0:cx1 + 1] * 255).astype(np.uint8)
        frames.append({
            "col": (int(i * col_w), int((i + 1) * col_w)),
            "keep_mask_col": None,
            "bbox": (bx0, by0, bx1, by1),
            "body_cx": (mb[0] + mb[2]) / 2.0,
            "body_h": float(mb[3] - mb[1] + 1),
            "feet_y": float(by1),
            "rgba": despill(rgba),
            "crop_origin": (cx0, cy0),
        })
    return frames


def slice_sheet_valley(rgb, alpha, n_frames, keep_near=28, min_comp=80):
    """Fatiamento por VALES do perfil de alfa: os cortes caem no ponto mais
    fino entre poses vizinhas (no meio do rastro que as liga, não no meio
    do corpo) — resolve folhas com poses que cruzam a coluna igual
    (combo do cavaleiro) ou com borrão ligando poses (investida). Dentro
    de cada faixa vale a lógica da v2 (corpo principal + componentes
    próximos que não tocam a borda), mas o corpo principal é mantido
    INTEIRO dentro da faixa."""
    from scipy import ndimage
    H, W = alpha.shape
    mask = alpha > 0.35
    col_w = W / float(n_frames)
    prof = ndimage.uniform_filter1d(mask.sum(axis=0).astype(np.float32), size=15)
    bounds = [0]
    for i in range(1, n_frames):
        nom = i * col_w
        lo = int(max(1, nom - 0.32 * col_w))
        hi = int(min(W - 1, nom + 0.32 * col_w))
        bounds.append(lo + int(np.argmin(prof[lo:hi])))
    bounds.append(W)
    frames = []
    for i in range(n_frames):
        x0, x1 = bounds[i], bounds[i + 1]
        sub = mask[:, x0:x1]
        lab, n = ndimage.label(sub)
        if n == 0:
            frames.append(None)
            continue
        sizes = ndimage.sum(sub, lab, range(1, n + 1))
        main_id = 1 + int(np.argmax(sizes))
        ys, xs = np.where(lab == main_id)
        mb = (xs.min(), ys.min(), xs.max(), ys.max())
        keep = [main_id]
        sub_w = x1 - x0
        for cid in range(1, n + 1):
            if cid == main_id or sizes[cid - 1] < min_comp:
                continue
            ys2, xs2 = np.where(lab == cid)
            bb = (xs2.min(), ys2.min(), xs2.max(), ys2.max())
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
        a_full = np.zeros((H, W), dtype=np.float32)
        a_full[:, x0:x1] = np.where(keep_mask, alpha[:, x0:x1], 0.0)
        rgba = np.zeros((cy1 - cy0 + 1, cx1 - cx0 + 1, 4), dtype=np.uint8)
        rgba[..., :3] = rgb[cy0:cy1 + 1, cx0:cx1 + 1].astype(np.uint8)
        rgba[..., 3] = (a_full[cy0:cy1 + 1, cx0:cx1 + 1] * 255).astype(np.uint8)
        frames.append({
            "col": (x0, x1),
            "keep_mask_col": keep_mask,
            "bbox": (bx0, by0, bx1, by1),
            "body_cx": x0 + (mb[0] + mb[2]) / 2.0,
            "body_h": float(mb[3] - mb[1] + 1),
            "feet_y": float(by1),
            "rgba": despill(rgba),
            "crop_origin": (cx0, cy0),
        })
    return frames


def load_sheet(prefix, n_frames, keep_near=28, min_comp=80, slicer="v2"):
    img = Image.open(find_src(prefix))
    rgb, alpha = ps.chroma_key(img)
    if slicer == "smart":
        return slice_sheet_valley(rgb, alpha, n_frames, keep_near=keep_near, min_comp=min_comp)
    return ps.slice_sheet(rgb, alpha, n_frames, keep_near=keep_near, min_comp=min_comp)


def dense_feet(fr):
    """Recalcula feet_y do quadro: última fileira (metade inferior) cuja
    soma de alfa é >= 45% da maior fileira — as botas, não rastros finos."""
    rgba = fr["rgba"]
    a = (rgba[..., 3] > 90).astype(np.float32)
    rows = a.sum(axis=1)
    half = len(rows) // 2
    lower = rows[half:]
    if lower.max() <= 0:
        return fr
    thr = 0.45 * lower.max()
    idx = np.where(lower >= thr)[0]
    if len(idx) == 0:
        return fr
    feet_local = half + int(idx.max())
    fr = dict(fr)
    fr["feet_y"] = fr["crop_origin"][1] + feet_local
    return fr


def normalize_fixed(sheets, scale, out_names, dense_sheets=()):
    """Como ps.normalize_character, mas com escala explícita (ancorada)."""
    placed = {}
    need_left = need_right = need_up = 1.0
    for key, frames in sheets.items():
        placed[key] = []
        for fr in frames:
            if fr is None:
                placed[key].append(None)
                continue
            if key in dense_sheets:
                fr = dense_feet(fr)
            im = Image.fromarray(despill(fr["rgba"]), "RGBA")
            nw = max(1, int(round(im.width * scale)))
            nh = max(1, int(round(im.height * scale)))
            im = im.resize((nw, nh), Image.LANCZOS)
            ox, oy = fr["crop_origin"]
            fx = (fr["body_cx"] - ox) * scale
            fy = (fr["feet_y"] - oy) * scale
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


def median_body_h(frames):
    return float(np.median([fr["body_h"] for fr in frames if fr]))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    old_manifest = {}
    mpath = os.path.join(OUT_DIR, "manifest.json")
    if os.path.exists(mpath):
        with open(mpath, encoding="utf-8") as f:
            old_manifest = json.load(f)
    manifest = {}

    # ---------------- âncoras de escala (idênticas às efetivas da v2) ------
    knight_idle_ref = load_sheet("knight-idle-src", 4)
    k_scale = 168.0 / median_body_h(knight_idle_ref)
    fast_ref = load_sheet("shadow-fast-src", 6)
    r_scale = 118.0 / median_body_h(fast_ref)
    brute_ref = load_sheet("shadow-brute-src", 6)
    b_scale = 200.0 / median_body_h(brute_ref)
    print("[escala] knight=%.4f rapida=%.4f bruta=%.4f" % (k_scale, r_scale, b_scale))

    # ---------------- cavaleiro -------------------------------------------
    knight_sheets = {
        "idle": knight_idle_ref,
        "misc": load_sheet("knight-dash-src", 5),
        "run": load_sheet("knight-run8-src", 6),
        "combo": load_sheet("knight-combo-src", 8, slicer="smart"),
    }
    manifest["knight"] = normalize_fixed(knight_sheets, k_scale, {
        "idle": ["knight_idle_%d.png" % i for i in range(4)],
        "misc": ["knight_dash_0.png", "knight_dash_1.png", "knight_hurt_0.png",
                 "knight_death_0.png", "knight_death_1.png"],
        "run": ["knight_run_%d.png" % i for i in range(6)],
        "combo": ["knight_combo_%d.png" % i for i in range(8)],
    }, dense_sheets=("combo",))

    # ---------------- sombra rápida ----------------------------------------
    rapida_sheets = {
        "run": load_sheet("rapida-run-src", 6),
        "attack": load_sheet("rapida-attack-src", 6, slicer="smart"),
        "rise": load_sheet("rapida-rise-src", 4),
    }
    manifest["rapida"] = normalize_fixed(rapida_sheets, r_scale, {
        "run": ["rapida_run_%d.png" % i for i in range(6)],
        "attack": ["rapida_attack_%d.png" % i for i in range(6)],
        "rise": ["rapida_rise_%d.png" % i for i in range(4)],
    })

    # ---------------- sombra bruta -----------------------------------------
    bruta_sheets = {
        "walk": load_sheet("bruta-walk-src", 6),
        "attack": load_sheet("bruta-attack-src", 6),
        "rise": load_sheet("bruta-rise-src", 4),
        "misc": load_sheet("bruta-misc-src", 6, keep_near=70, min_comp=25),
    }
    manifest["bruta"] = normalize_fixed(bruta_sheets, b_scale, {
        "walk": ["bruta_walk_%d.png" % i for i in range(6)],
        "attack": ["bruta_attack_%d.png" % i for i in range(6)],
        "rise": ["bruta_rise_%d.png" % i for i in range(4)],
        "misc": ["bruta_hurt_0.png", "bruta_hurt_1.png",
                 "bruta_dissolve_0.png", "bruta_dissolve_1.png",
                 "bruta_dissolve_2.png", "bruta_dissolve_3.png"],
    })

    # ---------------- arena: preserva o processamento da v2 -----------------
    if "arena" in old_manifest:
        manifest["arena"] = old_manifest["arena"]

    with open(mpath, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    for char in ("knight", "rapida", "bruta"):
        m = manifest[char]
        print("[%s] canvas=%s pés=%s anims=%s" % (
            char, m["canvas"], m["feet"],
            {k: len(v) for k, v in m["anims"].items()}))
    print("OK ->", OUT_DIR)


if __name__ == "__main__":
    main()
