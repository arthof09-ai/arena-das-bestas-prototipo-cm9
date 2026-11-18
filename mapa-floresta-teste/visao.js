/* ================================================================
   visao.js — TESTE-VISAO: calculadora exacta do campo de visão.
   Porta fiel de visao-exacta/calcular.py (a calculadora governante):
   aritmética racional exacta (BigInt) onde o Python usa Fraction.
   Semânticas de linha de vista: V0mock (a da maqueta, float),
   V0exacto, V1 (ponto → qualquer parte), V2 (permissiva
   quadrado-a-quadrado, Duerig — A linha verídica do estudo).
   Convenções: casa (x,y) = quadrado [x,x+1]×[y,y+1]; y cresce para
   baixo (ecrã); coordenadas dobradas (x2); alcance 9 m = 6 casas
   (distância euclidiana entre centros ≤ 6, fronteira incluída).
   ================================================================ */
(function (global) {
  'use strict';

  /* ---------- fracções exactas (BigInt) ---------- */
  function bgcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t; } return a || 1n; }
  function F(n, d) {
    if (n && typeof n === 'object' && n.__f) return n;
    let num = BigInt(n), den = d === undefined ? 1n : BigInt(d);
    if (den < 0n) { num = -num; den = -den; }
    const g = bgcd(num, den);
    return { __f: 1, n: num / g, d: den / g };
  }
  const fadd = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const fsub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const fmul = (a, b) => F(a.n * b.n, a.d * b.d);
  const fdiv = (a, b) => F(a.n * b.d, a.d * b.n);
  const fcmp = (a, b) => { const c = a.n * b.d - b.n * a.d; return c < 0n ? -1 : c > 0n ? 1 : 0; };
  const fkey = a => a.n + '/' + a.d;
  const F0 = F(0), F1 = F(1);

  /* vectores com componentes Frac */
  const vsub = (p, q) => [fsub(p[0], q[0]), fsub(p[1], q[1])];
  const vcross = (u, v) => fsub(fmul(u[0], v[1]), fmul(u[1], v[0]));
  const vdot = (u, v) => fadd(fmul(u[0], v[0]), fmul(u[1], v[1]));
  const vsgn = f => f.n < 0n ? -1 : f.n > 0n ? 1 : 0;
  const vizero = v => v[0].n === 0n && v[1].n === 0n;

  const chave = (x, y) => x + ',' + y;
  const cantos = c => [[2 * c[0], 2 * c[1]], [2 * c[0] + 2, 2 * c[1]], [2 * c[0], 2 * c[1] + 2], [2 * c[0] + 2, 2 * c[1] + 2]];

  /* ---------- ordem circular das direcções (meio-plano + cruzado) ---------- */
  function cmpDir(u, v) {
    const half = w => (vsgn(w[1]) < 0 || (w[1].n === 0n && vsgn(w[0]) > 0)) ? 0 : 1;
    const hu = half(u), hv = half(v);
    if (hu !== hv) return hu < hv ? -1 : 1;
    const c = vsgn(vcross(u, v));
    if (c !== 0) return c > 0 ? -1 : 1;
    return 0;
  }
  function direccoesOrdenadas(pontos, origem) {
    const vecs = [];
    for (const p of pontos) {
      const v = vsub([F(p[0]), F(p[1])], origem);
      if (!vizero(v)) vecs.push(v);
    }
    vecs.sort(cmpDir);
    const distintas = [];
    for (const v of vecs) {
      const ult = distintas[distintas.length - 1];
      if (ult && vsgn(vcross(ult, v)) === 0 && vsgn(vdot(ult, v)) > 0) continue;
      distintas.push(v);
    }
    if (distintas.length > 1) {
      const p0 = distintas[0], pn = distintas[distintas.length - 1];
      if (vsgn(vcross(p0, pn)) === 0 && vsgn(vdot(p0, pn)) > 0) distintas.pop();
    }
    return distintas;
  }
  function noSector(u, d, v, wrap) {
    if (wrap) return cmpDir(u, d) < 0 || cmpDir(d, v) < 0;
    return cmpDir(u, d) < 0 && cmpDir(d, v) < 0;
  }
  function amostraSector(u, v, wrap, dirs) {
    const ok = d => {
      if (vizero(d)) return false;
      for (const w of dirs) if (vsgn(vcross(d, w)) === 0) return false;
      return noSector(u, d, v, wrap);
    };
    const soma = (a, b, ka, kb) => [fadd(fmul(F(ka), a[0]), fmul(F(kb), b[0])), fadd(fmul(F(ka), a[1]), fmul(F(kb), b[1]))];
    const fneg = f => F(-f.n, f.d);
    const neg = a => [fneg(a[0]), fneg(a[1])];
    const bases = [];
    const s = soma(u, v, 1, 1);
    if (!vizero(s)) { bases.push(s, neg(s)); }
    for (const [a, b] of [[2, 1], [1, 2], [3, 1], [1, 3], [3, 2], [2, 3]]) {
      const w = soma(u, v, a, b);
      bases.push(w, neg(w));
    }
    for (const base of [u, v]) bases.push([fneg(base[1]), base[0]], [base[1], fneg(base[0])]);
    for (const d of bases) if (ok(d)) return d;
    for (const base of bases) {
      if (vizero(base)) continue;
      const p = [fneg(base[1]), base[0]];
      for (let j = 1; j <= dirs.length + 16; j++) {
        for (const t of [p, neg(p)]) {
          const d = [fadd(fmul(F(j), base[0]), t[0]), fadd(fmul(F(j), base[1]), t[1])];
          if (ok(d)) return d;
        }
      }
    }
    throw new Error('sem amostra valida no sector (wrap=' + wrap + ')');
  }

  /* ---------- intervalo do raio no interior de uma casa ---------- */
  function intervaloRaio(eye, d, cell) {
    const X0 = F(2 * cell[0]), Y0 = F(2 * cell[1]), X1 = F(2 * cell[0] + 2), Y1 = F(2 * cell[1] + 2);
    let loT = null, hiT = null;
    const eixos = [[eye[0], d[0], X0, X1], [eye[1], d[1], Y0, Y1]];
    for (const [E, D, lo, hi] of eixos) {
      if (D.n === 0n) {
        if (!(fcmp(lo, E) < 0 && fcmp(E, hi) < 0)) return null;
      } else {
        const t1 = fdiv(fsub(lo, E), D), t2 = fdiv(fsub(hi, E), D);
        const l = fcmp(t1, t2) < 0 ? t1 : t2, h = fcmp(t1, t2) < 0 ? t2 : t1;
        loT = loT === null || fcmp(l, loT) > 0 ? l : loT;
        hiT = hiT === null || fcmp(h, hiT) < 0 ? h : hiT;
      }
    }
    if (loT !== null && fcmp(loT, hiT) < 0 && fcmp(hiT, F0) > 0) return [loT, hiT];
    return null;
  }

  /* ---------- V1: ponto -> qualquer parte (feixe de largura positiva) ---------- */
  function visivelV1Ponto(eye, target, opacosSet) {
    const ex = eye[0], ey = eye[1];
    if (fcmp(F(2 * target[0]), ex) < 0 && fcmp(ex, F(2 * target[0] + 2)) < 0 &&
        fcmp(F(2 * target[1]), ey) < 0 && fcmp(ey, F(2 * target[1] + 2)) < 0) return true;
    const pontos = [];
    for (const k of opacosSet) pontos.push(...cantos(k.split(',').map(Number)));
    pontos.push(...cantos(target));
    const dirs = direccoesOrdenadas(pontos, eye);
    const n = dirs.length;
    const tChave = chave(target[0], target[1]);
    for (let i = 0; i < n; i++) {
      const u = dirs[i], v = dirs[(i + 1) % n];
      const d = amostraSector(u, v, i === n - 1, dirs);
      const iv = intervaloRaio(eye, d, target);
      if (!iv) continue;
      let tStar = null;
      for (const k of opacosSet) {
        if (k === tChave) continue;
        const c = k.split(',').map(Number);
        const ic = intervaloRaio(eye, d, c);
        if (ic && (tStar === null || fcmp(ic[0], tStar) < 0)) tStar = ic[0];
      }
      if (tStar === null || fcmp(iv[0], tStar) < 0) return true;
    }
    return false;
  }
  function visivelV1(eyeCell, target, opacosSet) {
    return visivelV1Ponto([F(2 * eyeCell[0] + 1), F(2 * eyeCell[1] + 1)], target, opacosSet);
  }

  /* ---------- V0 da maqueta (float, Amanatides & Woo — cópia literal) ---------- */
  function losMaqueta(g, x0, y0, x1, y1) {
    const tem = (x, y) => g.has(chave(x, y));
    let px = x0 + 0.5, py = y0 + 0.5;
    const dx = (x1 + 0.5) - px, dy = (y1 + 0.5) - py;
    if (dx === 0 && dy === 0) return true;
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = dx ? Math.abs(1.0 / dx) : Infinity;
    const tdy = dy ? Math.abs(1.0 / dy) : Infinity;
    let tmx = dx ? Math.abs(((x0 + (sx > 0 ? 1 : 0)) - px) / dx) : Infinity;
    let tmy = dy ? Math.abs(((y0 + (sy > 0 ? 1 : 0)) - py) / dy) : Infinity;
    let cx = x0, cy = y0;
    while (cx !== x1 || cy !== y1) {
      if (Math.abs(tmx - tmy) < 1e-9) {
        if (tem(cx + sx, cy) && tem(cx, cy + sy)) return false;
        cx += sx; cy += sy; tmx += tdx; tmy += tdy;
      } else if (tmx < tmy) { cx += sx; tmx += tdx; }
      else { cy += sy; tmy += tdy; }
      if ((cx !== x1 || cy !== y1) && tem(cx, cy)) return false;
    }
    return true;
  }
  function visivelV0mock(eyeCell, target, opacosSet) {
    return losMaqueta(opacosSet, eyeCell[0], eyeCell[1], target[0], target[1]);
  }

  /* ---------- V0 exacto (a mesma regra, com fracções) ---------- */
  function visivelV0exacto(eyeCell, target, opacosSet) {
    if (eyeCell[0] === target[0] && eyeCell[1] === target[1]) return true;
    const E = [F(2 * eyeCell[0] + 1), F(2 * eyeCell[1] + 1)];
    const C = [F(2 * target[0] + 1), F(2 * target[1] + 1)];
    const D = [fsub(C[0], E[0]), fsub(C[1], E[1])];
    const tChave = chave(target[0], target[1]), eChave = chave(eyeCell[0], eyeCell[1]);
    for (const k of opacosSet) {
      if (k === tChave || k === eChave) continue;
      const cell = k.split(',').map(Number);
      const iv = intervaloRaio(E, D, cell);
      if (iv && fcmp(iv[0], F1) < 0 && fcmp(iv[1], F0) > 0) return false;
    }
    const truncF = f => f.n / f.d;                       // BigInt: trunca para zero (= int() do Python aqui)
    const floorDiv2 = a => a >= 0n ? a / 2n : -((-a + 1n) / 2n);
    function cruzamentos(Ec, Dc) {
      const res = [];
      if (Dc.n === 0n) return res;
      const fim = fadd(Ec, Dc);
      const lo = fcmp(Ec, fim) < 0 ? Ec : fim, hi = fcmp(Ec, fim) < 0 ? fim : Ec;
      let k = truncF(lo) + 1n;
      while (fcmp(F(k), hi) < 0) {
        if (k % 2n === 0n) res.push(fdiv(fsub(F(k), Ec), Dc));
        k += 1n;
      }
      return res;
    }
    const tv = new Map(), th = new Map();
    for (const t of cruzamentos(E[0], D[0])) tv.set(fkey(t), t);
    for (const t of cruzamentos(E[1], D[1])) th.set(fkey(t), t);
    const sx = vsgn(D[0]) > 0 ? 1 : -1, sy = vsgn(D[1]) > 0 ? 1 : -1;
    for (const [kk, t] of tv) {
      if (!th.has(kk)) continue;
      if (!(fcmp(F0, t) < 0 && fcmp(t, F1) < 0)) continue;
      const vx = Number(floorDiv2(truncF(fadd(E[0], fmul(t, D[0])))));
      const vy = Number(floorDiv2(truncF(fadd(E[1], fmul(t, D[1])))));
      const chegada = [sx > 0 ? vx - 1 : vx, sy > 0 ? vy - 1 : vy];
      const saida = [sx > 0 ? vx : vx - 1, sy > 0 ? vy : vy - 1];
      const lados = [[vx - 1, vy - 1], [vx, vy - 1], [vx - 1, vy], [vx, vy]]
        .filter(c => !(c[0] === chegada[0] && c[1] === chegada[1]) && !(c[0] === saida[0] && c[1] === saida[1]));
      if (lados.length === 2 && opacosSet.has(chave(lados[0][0], lados[0][1])) && opacosSet.has(chave(lados[1][0], lados[1][1]))) return false;
    }
    return true;
  }

  /* ---------- V2: permissiva quadrado-a-quadrado (Duerig) ---------- */
  function intersecaoParam(A, B, k1, k2) {
    const u = vsub(B, A);
    const v = [F(k2[0] - k1[0]), F(k2[1] - k1[1])];
    const den = vcross(u, v);
    if (den.n === 0n) return null;
    return fdiv(vcross(vsub([F(k1[0]), F(k1[1])], A), v), den);
  }
  function visivelV2(eyeCell, target, opacosSet) {
    if (eyeCell[0] === target[0] && eyeCell[1] === target[1]) return true;
    const Kmap = new Map();
    const junta = c => { for (const p of cantos(c)) Kmap.set(p[0] + ',' + p[1], p); };
    for (const k of opacosSet) junta(k.split(',').map(Number));
    junta(target);
    const K = [...Kmap.values()];
    const x0 = 2 * eyeCell[0], y0 = 2 * eyeCell[1];
    const arestas = [
      [[x0, y0], [x0 + 2, y0]], [[x0 + 2, y0], [x0 + 2, y0 + 2]],
      [[x0 + 2, y0 + 2], [x0, y0 + 2]], [[x0, y0 + 2], [x0, y0]]
    ];
    const pares = [];
    for (let i = 0; i < K.length; i++) for (let j = i + 1; j < K.length; j++) pares.push([K[i], K[j]]);
    for (const [Aa, Bb] of arestas) {
      const A = [F(Aa[0]), F(Aa[1])], B = [F(Bb[0]), F(Bb[1])];
      const crit = new Map([[fkey(F0), F0], [fkey(F1), F1]]);
      for (const [k1, k2] of pares) {
        const s = intersecaoParam(A, B, k1, k2);
        if (s !== null && fcmp(F0, s) <= 0 && fcmp(s, F1) <= 0) crit.set(fkey(s), s);
      }
      const ss = [...crit.values()].sort(fcmp);
      for (let i = 0; i < ss.length - 1; i++) {
        const mid = fdiv(fadd(ss[i], ss[i + 1]), F(2));
        const p = [fadd(A[0], fmul(mid, fsub(B[0], A[0]))), fadd(A[1], fmul(mid, fsub(B[1], A[1])))];
        if (visivelV1Ponto(p, target, opacosSet)) return true;
      }
    }
    return false;
  }

  /* ---------- modelos de campo (máscaras — comparações inteiras exactas) ---------- */
  const FRENTES = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  function coneOk(dx, dy, facing, metadeGraus) {
    if (dx === 0 && dy === 0) return true;
    const dot = dx * facing[0] + dy * facing[1];
    const n2 = dx * dx + dy * dy;
    if (metadeGraus === 45) return dot > 0 && 2 * dot * dot >= n2;
    if (metadeGraus === 60) return dot > 0 && 4 * dot * dot >= n2;
    if (metadeGraus === 90) return dot >= 0;
    throw new Error('metadeGraus ' + metadeGraus);
  }
  function mascara(modelo, dx, dy, facing) {
    const d2 = dx * dx + dy * dy;
    switch (modelo) {
      case 'M0': return true;
      case 'M1-90': return coneOk(dx, dy, facing, 45);
      case 'M1-120': return coneOk(dx, dy, facing, 60);
      case 'M1-180': return coneOk(dx, dy, facing, 90);
      case 'M2': return d2 <= 2 || coneOk(dx, dy, facing, 60);
      case 'M3a': return d2 <= 2 || coneOk(dx, dy, facing, 45);
      case 'M3b': return d2 <= 2 || coneOk(dx, dy, facing, 90);
      case 'M3c': return d2 <= 4 || coneOk(dx, dy, facing, 60);
      default: throw new Error('modelo ' + modelo);
    }
  }
  const LOS = { V0mock: visivelV0mock, V0exacto: visivelV0exacto, V1: visivelV1, V2: visivelV2 };

  /* campo(W, H, olho[x,y], frente 'N|S|E|W', opacos [[x,y]...], los, modelo)
     -> Set de chaves "x,y" das casas visíveis. */
  function campo(W, H, olho, frente, opacos, los, modelo) {
    const facing = FRENTES[frente];
    const opacosSet = new Set((opacos || []).map(c => chave(c[0], c[1])));
    const losFn = LOS[los];
    const out = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x - olho[0], dy = y - olho[1];
      if (dx * dx + dy * dy > 36) continue;
      if (!mascara(modelo, dx, dy, facing)) continue;
      if (losFn(olho, [x, y], opacosSet)) out.add(chave(x, y));
    }
    return out;
  }

  global.Visao = { campo, FRENTES, LOS, mascara, coneOk, _internos: { visivelV1Ponto, intervaloRaio } };
})(typeof window !== 'undefined' ? window : globalThis);
