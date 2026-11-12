/* Campo3D r3: apresentação pública; não importar regras ou fichas. */
(() => {
    'use strict';
    const T = THREE, C = h => new T.Color(h).convertSRGBToLinear(), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), CELL = 1.5;
    const UNIT_KEYS = new Set(['id', 'nome', 'modelo', 'x', 'y', 'alturaMetros', 'vivo', 'altitude', 'animacoes']);
    function release(root) {
        const gs = new Set(), ms = new Set(), ts = new Set(), skeletons = new Set();
        root.traverse(o => {
            if (o.geometry)
                gs.add(o.geometry);
            if(o.skeleton) skeletons.add(o.skeleton);
            for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
                ms.add(m);
                for (const v of Object.values(m))
                    if (v && v.isTexture)
                        ts.add(v);
            }
        });
        gs.forEach(g => g.dispose());
        ms.forEach(m => m.dispose());
        ts.forEach(t => t.dispose());
        skeletons.forEach(s => s.boneTexture?.dispose());
    }
    function count(root) {
        let n = 0;
        root.traverse(o => {
            if (o.isMesh)
                n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
        });
        return n;
    }
    window.Campo3D = Object.freeze({ create(container, options = {}) {
            if (!(container instanceof HTMLElement))
                throw new TypeError('Elemento obrigatório.');
            if (!Array.isArray(options.units ?? []))
                throw new TypeError('units deve ser array.');
            const area = { cols: options.area?.cols ?? 10, rows: options.area?.rows ?? 7, origin: { x: options.area?.origin?.x ?? 0, y: options.area?.origin?.y ?? 0 } };
            if (![area.cols, area.rows].every(v => Number.isInteger(v) && v >= 1 && v <= 80) || ![area.origin.x, area.origin.y].every(Number.isInteger))
                throw new RangeError('Área: 1..80 casas e origem inteira.');
            const wx = x => (x - area.origin.x - (area.cols - 1) / 2) * CELL, wz = z => (z - area.origin.y - (area.rows - 1) / 2) * CELL;
            function valid(p) {
                if (!p || !Number.isInteger(p.x) || !Number.isInteger(p.z) || p.x < area.origin.x || p.x >= area.origin.x + area.cols || p.z < area.origin.y || p.z >= area.origin.y + area.rows)
                    throw new RangeError('Casa fora da área.');
                if (p.altitude !== undefined && (!Number.isFinite(p.altitude) || p.altitude < 0 || p.altitude > 60))
                    throw new RangeError('Altitude: 0..60 metros.');
            }
            const renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
            renderer.info.autoReset = false;
            renderer.setClearColor(new T.Color(0x353b48), 1);
            renderer.outputEncoding = T.sRGBEncoding;
            renderer.toneMapping = T.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 0.92;
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = T.PCFSoftShadowMap;
            renderer.shadowMap.autoUpdate = false;
            renderer.shadowMap.needsUpdate = true;
            container.appendChild(renderer.domElement);
            const labels = document.createElement('div');
            labels.className = 'etiquetas';
            container.appendChild(labels);
            const scene = new T.Scene();
            scene.background = C(0x353b48);
            scene.fog = new T.Fog(C(0x353b48), 130, 270);
            const hemi = new T.HemisphereLight(0x96b4df, 0x222632, .40); scene.add(hemi);
            const sun = new T.DirectionalLight(0xffb16b, 1.35);
            sun.position.set(-24, 12, -18);
            sun.castShadow = true;
            sun.shadow.mapSize.set(512, 512);
            const extent = Math.max(area.cols, area.rows) * CELL * .8 + 8;
            Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: extent * 5 });
            sun.shadow.bias = -.0005;
            sun.shadow.normalBias = .04;
            scene.add(sun);
            const world = CampoWorld(T, scene, area), camera = new T.OrthographicCamera(-10, 10, 10, -10, .1, 1600), cameraLivre = new T.PerspectiveCamera(50, 1, .1, 400), target = new T.Vector3(), ray = new T.Raycaster();
            /* ---------- AMBIENTE (tranche AMBIENTE — desenho LIBERA 05/11) ----------
             * aplicarAmbiente(estado) é o ÚNICO escritor de: exposição ·
             * hemisférica · sol · fundo · cor da névoa · bases do mundo
             * (fontes D-AMB-01) · chamas · chuva · chão molhado. A âncora
             * Noite (23,0 h) devolve EXACTAMENTE os valores que a cena e a
             * camada pintada fixaram (medidos na REF_23) e, assentada e
             * seca, o MESMO objecto de fundo original. A densidade da
             * névoa nunca é tocada por esta tranche. */
            const AMB_ANCORAS = [
                { hora: 3.5, exp: .88, hemiInt: .34, hemiCeu: 0x5f7896, hemiChao: 0x23211e, solInt: .50, solCor: 0xcfd8e8, solPos: [-18, 27, -13.5], horizonte: 0x2c3a4c, fogueira: 4.5, tochas: 7.5, chamas: 1 },
                { hora: 6.5, exp: .98, hemiInt: .52, hemiCeu: 0x9db3c4, hemiChao: 0x33302a, solInt: .82, solCor: 0xf5e0c8, solPos: [24, 13, -10], horizonte: 0x8fa3b5, fogueira: 3, tochas: 3.5, chamas: .55 },
                { hora: 12.5, exp: 1.02, hemiInt: .85, hemiCeu: 0xbfd4e6, hemiChao: 0x59544a, solInt: 1.32, solCor: 0xfff2dd, solPos: [6, 34, 8], horizonte: 0xa8bfd2, fogueira: 0, tochas: 0, chamas: 0 },
                { hora: 18, exp: .97, hemiInt: .50, hemiCeu: 0x8d90a8, hemiChao: 0x35302a, solInt: .98, solCor: 0xf3c298, solPos: [-25, 14, 6], horizonte: 0xb98a63, fogueira: 5, tochas: 6.5, chamas: .8 },
                { hora: 23, exp: .92, hemiInt: .40, hemiCeu: 0x7d9ab8, hemiChao: 0x2e2a24, solInt: .98, solCor: 0xffe3c0, solPos: [-18, 27, -13.5], horizonte: 0x35485e, fogueira: 6, tochas: 7.5, chamas: 1 }
            ];
            const AMB_CEUS = [
                { paradas: [[0, '#070d16'], [.5, '#14202f'], [.78, '#22334a'], [1, '#2c3a4c']], claro: false },
                { paradas: [[0, '#2c4258'], [.45, '#5d768c'], [.75, '#87a0b4'], [1, '#8fa3b5']], claro: false },
                { paradas: [[0, '#5b97d6'], [.5, '#8ab6e0'], [.8, '#a5c2dc'], [1, '#a8bfd2']], claro: true },
                { paradas: [[0, '#232c4c'], [.5, '#5c5570'], [.78, '#96796b'], [1, '#b98a63']], claro: false },
                { paradas: [[0, '#0b1220'], [.5, '#182636'], [.78, '#27394c'], [.93, '#4a4438'], [1, '#35485e']], claro: false }
            ];
            const AMB_CHUVA = { cinzento: [0, .35, .6], molhado: [1, .97, .94], tochas: [1, 1, .8], gotas: [0, 1200, 3000], gotasBaixa: [0, 800, 800], opacidade: [0, .55, .85] };
            const ambCor = h => C(h);
            const ambNivel = (tab, cf) => { const i = Math.min(1, Math.floor(cf)), f = cf - i; return tab[i] + (tab[i + 1] - tab[i]) * f; };
            function ambAmostra(hora) {
                const A = AMB_ANCORAS;
                let i = 0, t = 0;
                if (hora < A[0].hora || hora >= A[A.length - 1].hora) {
                    i = A.length - 1;
                    const h = hora < A[0].hora ? hora + 24 : hora;
                    t = (h - A[i].hora) / (A[0].hora + 24 - A[i].hora);
                } else {
                    while (i < A.length - 2 && hora >= A[i + 1].hora) i++;
                    t = (hora - A[i].hora) / (A[i + 1].hora - A[i].hora);
                }
                const a = A[i], b = A[(i + 1) % A.length], L = (x, y) => x + (y - x) * t;
                const cor = (x, y) => C(x).lerp(C(y), t);
                return { i, t, exp: L(a.exp, b.exp), hemiInt: L(a.hemiInt, b.hemiInt), hemiCeu: cor(a.hemiCeu, b.hemiCeu), hemiChao: cor(a.hemiChao, b.hemiChao), solInt: L(a.solInt, b.solInt), solCor: cor(a.solCor, b.solCor), solPos: [L(a.solPos[0], b.solPos[0]), L(a.solPos[1], b.solPos[1]), L(a.solPos[2], b.solPos[2])], horizonte: cor(a.horizonte, b.horizonte), fogueira: L(a.fogueira, b.fogueira), tochas: L(a.tochas, b.tochas), chamas: L(a.chamas, b.chamas) };
            }
            /* ---------- CÉU DO MUNDO (protótipo — desenho v2, sentença E1–E13) ----------
             * Passagem própria: cena de céu separada + câmara perspectiva
             * só-rotação (E1). O fundo em canvas morreu (E2): nenhum
             * escritor atribui scene.background em operação normal — o
             * recurso único é a cor de limpeza sólida. A âncora protege
             * a LUZ: os derivados não são tocados; o céu lê a amostra
             * publicada por ambEscrever/ambAplicarPulso e escreve só
             * nos seus objectos. */
            const CEU_SOLIDO = C(0x353b48);
            const ceuCena = new T.Scene();
            const ceuCam = new T.PerspectiveCamera(50, 1, .1, 20);
            let ceuEstado = 'normal', ceuVerificado = false, ceuPublicado = null, ceuUltimoNow = -1;
            const ceuDelta = { calls: 0, triangles: 0 };
            /* CEU_LUA_ESC (volta 2; SENTENCA da bancada-v2): a emenda
               de escurecimento foi REVOGADA pelo juiz e o alvo dele
               e a mediana 0,38 na banda [0,34-0,44] com pico <= 0,62;
               MEDIDO nesta VM: factor 1,0 rende mediana 0,593 e pico
               0,749 (a resposta nao e linear) - o factor que pousa a
               mediana no alvo e 0,75 (volta 3, analise-v3). */
            const CEU_LUA_ESC = .75;
            const CEU_POSICOES = [0, .45, .5, .75, .78, .8, .93, 1];
            function ceuPaletaCor(pal, p) {
                const ps = pal.paradas;
                if (p <= ps[0][0]) return C(ps[0][1]);
                for (let k = 1; k < ps.length; k++) {
                    if (p <= ps[k][0]) return C(ps[k - 1][1]).lerp(C(ps[k][1]), (p - ps[k - 1][0]) / (ps[k][0] - ps[k - 1][0]));
                }
                return C(ps[ps.length - 1][1]);
            }
            function ceuWSol(h) {
                const S = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
                if (h >= 6.5 && h <= 18) return 1;
                if (h > 18 && h < 23) return 1 - S((h - 18) / 5);
                if (h >= 23 || h < 3.5) return 0;
                return S((h - 3.5) / 3);
            }
            const ceuGradUniforms = { uHor: { value: new T.Color(0, 0, 0) } };
            for (let k = 0; k < 8; k++) ceuGradUniforms['uP' + k] = { value: new T.Vector4(0, 0, 0, CEU_POSICOES[k]) };
            const ceuGradMat = new T.ShaderMaterial({
                uniforms: ceuGradUniforms,
                vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
                fragmentShader: [
                    'uniform vec4 uP0; uniform vec4 uP1; uniform vec4 uP2; uniform vec4 uP3; uniform vec4 uP4; uniform vec4 uP5; uniform vec4 uP6; uniform vec4 uP7;',
                    'uniform vec3 uHor; varying vec3 vDir;',
                    'vec3 ceuGrad(float p) {',
                    ' vec3 c = uP0.rgb;',
                    ' if (p > uP0.w) c = mix(uP0.rgb, uP1.rgb, clamp((p - uP0.w) / max(uP1.w - uP0.w, 0.0001), 0.0, 1.0));',
                    ' if (p > uP1.w) c = mix(uP1.rgb, uP2.rgb, clamp((p - uP1.w) / max(uP2.w - uP1.w, 0.0001), 0.0, 1.0));',
                    ' if (p > uP2.w) c = mix(uP2.rgb, uP3.rgb, clamp((p - uP2.w) / max(uP3.w - uP2.w, 0.0001), 0.0, 1.0));',
                    ' if (p > uP3.w) c = mix(uP3.rgb, uP4.rgb, clamp((p - uP3.w) / max(uP4.w - uP3.w, 0.0001), 0.0, 1.0));',
                    ' if (p > uP4.w) c = mix(uP4.rgb, uP5.rgb, clamp((p - uP4.w) / max(uP5.w - uP4.w, 0.0001), 0.0, 1.0));',
                    ' if (p > uP5.w) c = mix(uP5.rgb, uP6.rgb, clamp((p - uP5.w) / max(uP6.w - uP5.w, 0.0001), 0.0, 1.0));',
                    ' if (p > uP6.w) c = mix(uP6.rgb, uP7.rgb, clamp((p - uP6.w) / max(uP7.w - uP6.w, 0.0001), 0.0, 1.0));',
                    ' return c; }',
                    'void main() { vec3 d = normalize(vDir); float g = clamp(d.y, 0.0, 1.0); vec3 col = ceuGrad(1.0 - g); col = mix(uHor, col, smoothstep(0.0, 0.15, g)); gl_FragColor = vec4(col, 1.0);',
                    '#include <tonemapping_fragment>',
                    '#include <encodings_fragment>',
                    '}'
                ].join('\n'),
                side: T.BackSide, depthWrite: false, depthTest: false, toneMapped: true
            });
            const ceuCupula = new T.Mesh(new T.SphereGeometry(10, 32, 16), ceuGradMat);
            ceuCupula.frustumCulled = false; ceuCupula.renderOrder = 0; ceuCena.add(ceuCupula);
            /* Estrelas (E7): ShaderMaterial próprio — PointsMaterial não
               faz tamanhos/cintilação por ponto. */
            const ceuEstrelasGeo = new T.BufferGeometry();
            {
                const pos = new Float32Array(1300 * 3), tam = new Float32Array(1300), fase = new Float32Array(1300), freq = new Float32Array(1300), bri = new Float32Array(1300), cor = new Float32Array(1300);
                let s = 4241;
                const rr = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
                for (let n = 0; n < 1300; n++) {
                    const u = rr() * 2 - 1, th = rr() * 6.2831853, r = Math.sqrt(1 - u * u);
                    pos[n * 3] = r * Math.cos(th) * 9.8; pos[n * 3 + 1] = u * 9.8; pos[n * 3 + 2] = r * Math.sin(th) * 9.8;
                    const classe = rr();
                    tam[n] = classe < .45 ? 3.0 + rr() * 1.2 : (classe < .85 ? 4.2 + rr() * 2.2 : 6.4 + rr() * 3.2);
                    fase[n] = rr() * 6.2831853; freq[n] = .3 + rr() * .5; bri[n] = .45 + rr() * .55; cor[n] = rr();
                }
                ceuEstrelasGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
                ceuEstrelasGeo.setAttribute('aTam', new T.BufferAttribute(tam, 1));
                ceuEstrelasGeo.setAttribute('aFase', new T.BufferAttribute(fase, 1));
                ceuEstrelasGeo.setAttribute('aFreq', new T.BufferAttribute(freq, 1));
                ceuEstrelasGeo.setAttribute('aBrilho', new T.BufferAttribute(bri, 1));
                ceuEstrelasGeo.setAttribute('aCor', new T.BufferAttribute(cor, 1));
            }
            const ceuEstrelasMat = new T.ShaderMaterial({
                uniforms: { uTempo: { value: 0 }, uDpr: { value: 1 }, uAlfaGlobal: { value: 0 } },
                vertexShader: 'attribute float aTam; attribute float aFase; attribute float aFreq; attribute float aBrilho; attribute float aCor; uniform float uTempo; uniform float uDpr; varying float vA; varying float vFlare; varying vec3 vCor; void main() { vA = aBrilho * (0.75 + 0.25 * sin(6.28318 * aFreq * uTempo + aFase)); vFlare = smoothstep(0.78, 1.0, aBrilho); vCor = mix(vec3(0.84, 0.89, 1.0), vec3(1.0, 0.95, 0.87), aCor); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aTam * uDpr * (1.0 + 2.4 * vFlare); gl_Position = projectionMatrix * mv; }',
                fragmentShader: [
                    'uniform float uAlfaGlobal; varying float vA; varying float vFlare; varying vec3 vCor;',
                    'void main() { vec2 pp = gl_PointCoord - vec2(0.5); float d = length(pp); float nucleo = smoothstep(0.5, 0.05, d); float lh = (1.0 - smoothstep(0.0, 0.05, abs(pp.y))) * (1.0 - smoothstep(0.10, 0.5, abs(pp.x))); float lv = (1.0 - smoothstep(0.0, 0.05, abs(pp.x))) * (1.0 - smoothstep(0.10, 0.5, abs(pp.y))); float a = min((nucleo + 0.55 * (lh + lv) * vFlare) * uAlfaGlobal * vA, uAlfaGlobal * vA); if (a < 0.004) discard; gl_FragColor = vec4(vCor, a);',
                    '#include <tonemapping_fragment>',
                    '#include <encodings_fragment>',
                    '}'
                ].join('\n'),
                transparent: true, depthWrite: false, depthTest: false, toneMapped: true
            });
            const ceuEstrelas = new T.Points(ceuEstrelasGeo, ceuEstrelasMat);
            ceuEstrelas.frustumCulled = false; ceuEstrelas.renderOrder = 1; ceuEstrelas.visible = false; ceuCena.add(ceuEstrelas);
            /* Discos DESENHADOS (volta 2, veredicto do olho do Mestre):
               texturas canvas 512x512; tamanhos angulares verdadeiros
               na ceuCam - sol: disco O 4,2o com coroa e halo ate O 13o;
               lua: disco O 3,1o com maria, crateras e fase desenhada,
               halo ate O 5,6o. Presenca por forma, nao por pontos.
               EMENDA DO OLHO DO MESTRE (2026-11-12): "so deixe a lua e
               o sol maiores, o resto ta top" - os dois planos levam
               x1,5 (sol 2,165 -> 3,2475; lua 0,928 -> 1,392): disco
               pintado sol O 6,35o / halo O 19,5o; lua O 4,66o / halo
               O 8,4o. Disco e halo escalam juntos; textura, tinta,
               opacidade e CEU_LUA_ESC intocados.
               EMENDA 2 DO OLHO (2026-11-12, sobre as fotos V4):
               "deixe o sol assim por enquanto, mas quero a lua
               maior" - so a lua cresce outra vez: plano 1,392 ->
               2,227 (x1,6): disco pintado O 7,44o / halo O 13,4o.
               O sol fica byte-igual em 3,2475. */
            function ceuTexturaSol() {
                const cv = document.createElement('canvas'); cv.width = cv.height = 512;
                const cx = cv.getContext('2d');
                let s = 2027;
                const rr = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
                let gr = cx.createRadialGradient(256, 256, 70, 256, 256, 256);
                gr.addColorStop(0, 'rgba(255,255,255,.34)'); gr.addColorStop(.35, 'rgba(255,255,255,.16)');
                gr.addColorStop(.65, 'rgba(255,255,255,.05)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
                cx.fillStyle = gr; cx.fillRect(0, 0, 512, 512);
                for (let k = 0; k < 46; k++) {
                    const a = rr() * 6.2832, r0 = 84 + rr() * 30, comp = 10 + rr() * 20, larg = 5 + rr() * 7;
                    const x = 256 + Math.cos(a) * r0, y = 256 + Math.sin(a) * r0;
                    cx.save(); cx.translate(x, y); cx.rotate(a + 1.5708);
                    const g2 = cx.createRadialGradient(0, 0, 0, 0, 0, comp);
                    const al = .03 + rr() * .06;
                    g2.addColorStop(0, 'rgba(255,255,255,' + al + ')'); g2.addColorStop(1, 'rgba(255,255,255,0)');
                    cx.fillStyle = g2; cx.beginPath(); cx.ellipse(0, 0, larg, comp, 0, 0, 6.2832); cx.fill(); cx.restore();
                }
                gr = cx.createRadialGradient(246, 242, 8, 256, 256, 84);
                gr.addColorStop(0, 'rgba(214,214,214,1)'); gr.addColorStop(.55, 'rgba(192,192,192,1)');
                gr.addColorStop(.88, 'rgba(168,168,168,1)'); gr.addColorStop(1, 'rgba(152,152,152,.92)');
                cx.fillStyle = gr; cx.beginPath(); cx.arc(256, 256, 83, 0, 6.2832); cx.fill();
                cx.save(); cx.beginPath(); cx.arc(256, 256, 83, 0, 6.2832); cx.clip();
                for (let k = 0; k < 460; k++) {
                    const a = rr() * 6.2832, d = Math.sqrt(rr()) * 78, x = 256 + Math.cos(a) * d, y = 256 + Math.sin(a) * d, r = 3 + rr() * 13;
                    const g3 = cx.createRadialGradient(x, y, 0, x, y, r);
                    const v = rr() < .5 ? '255,255,255' : '196,178,148';
                    const al = .08 + rr() * .13;
                    g3.addColorStop(0, 'rgba(' + v + ',' + al + ')'); g3.addColorStop(1, 'rgba(' + v + ',0)');
                    cx.fillStyle = g3; cx.fillRect(x - r, y - r, r * 2, r * 2);
                }
                for (let k = 0; k < 24; k++) {
                    const a = rr() * 6.2832, d = Math.sqrt(rr()) * 66, x = 256 + Math.cos(a) * d, y = 256 + Math.sin(a) * d, r = 14 + rr() * 13;
                    const g4 = cx.createRadialGradient(x, y, 0, x, y, r);
                    const al = .10 + rr() * .07;
                    g4.addColorStop(0, 'rgba(168,148,116,' + al + ')'); g4.addColorStop(1, 'rgba(168,148,116,0)');
                    cx.fillStyle = g4; cx.fillRect(x - r, y - r, r * 2, r * 2);
                }
                cx.restore();
                cx.strokeStyle = 'rgba(255,255,255,.22)'; cx.lineWidth = 2;
                cx.beginPath(); cx.arc(256, 256, 81.5, 0, 6.2832); cx.stroke();
                const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; return tex;
            }
            function ceuTexturaLua() {
                const cv = document.createElement('canvas'); cv.width = cv.height = 512;
                const cx = cv.getContext('2d');
                let s = 991;
                const rr = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
                let gr = cx.createRadialGradient(256, 256, 140, 256, 256, 256);
                gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
                cx.fillStyle = gr; cx.fillRect(0, 0, 512, 512);
                cx.save(); cx.beginPath(); cx.arc(256, 256, 142, 0, 6.2832); cx.clip();
                gr = cx.createRadialGradient(196, 186, 20, 256, 256, 205);
                gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.55, 'rgba(244,242,238,1)');
                gr.addColorStop(.85, 'rgba(214,210,204,1)'); gr.addColorStop(1, 'rgba(178,174,168,1)');
                cx.fillStyle = gr; cx.fillRect(114, 114, 284, 284);
                const maria = [[300, 190, 52], [352, 238, 38], [268, 268, 44], [318, 318, 30], [218, 300, 26], [368, 160, 22], [238, 196, 20], [286, 140, 18]];
                for (const mm of maria) {
                    const g2 = cx.createRadialGradient(mm[0], mm[1], 0, mm[0], mm[1], mm[2]);
                    g2.addColorStop(0, 'rgba(46,42,40,.34)'); g2.addColorStop(.7, 'rgba(46,42,40,.20)'); g2.addColorStop(1, 'rgba(46,42,40,0)');
                    cx.fillStyle = g2; cx.fillRect(mm[0] - mm[2], mm[1] - mm[2], mm[2] * 2, mm[2] * 2);
                }
                for (let k = 0; k < 26; k++) {
                    const a = rr() * 6.2832, d = Math.sqrt(rr()) * 128, x = 256 + Math.cos(a) * d, y = 256 + Math.sin(a) * d, r = 6 + rr() * 20;
                    const g3 = cx.createRadialGradient(x, y, 0, x, y, r);
                    const al = .08 + rr() * .14;
                    g3.addColorStop(0, 'rgba(52,48,44,' + al + ')'); g3.addColorStop(1, 'rgba(52,48,44,0)');
                    cx.fillStyle = g3; cx.fillRect(x - r, y - r, r * 2, r * 2);
                }
                for (let k = 0; k < 120; k++) {
                    const a = rr() * 6.2832, d = Math.sqrt(rr()) * 132, x = 256 + Math.cos(a) * d, y = 256 + Math.sin(a) * d, r = 1.2 + rr() * 4.6;
                    cx.fillStyle = 'rgba(50,46,42,' + (.10 + rr() * .16) + ')';
                    cx.beginPath(); cx.arc(x, y, r, 0, 6.2832); cx.fill();
                    cx.strokeStyle = 'rgba(255,255,255,' + (.10 + rr() * .14) + ')'; cx.lineWidth = 1;
                    cx.beginPath(); cx.arc(x, y, r, -2.4, -0.9); cx.stroke();
                }
                gr = cx.createRadialGradient(150, 380, 40, 150, 380, 240);
                gr.addColorStop(0, 'rgba(30,28,30,.38)'); gr.addColorStop(1, 'rgba(30,28,30,0)');
                cx.fillStyle = gr; cx.fillRect(114, 114, 284, 284);
                cx.restore();
                cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = 2.5;
                cx.beginPath(); cx.arc(256, 256, 140.5, -1.15, 0.75); cx.stroke();
                cx.globalCompositeOperation = 'destination-out';
                gr = cx.createRadialGradient(256, 256, 134, 256, 256, 143);
                gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
                cx.fillStyle = gr; cx.beginPath(); cx.arc(256, 256, 143, 0, 6.2832); cx.fill();
                cx.globalCompositeOperation = 'source-over';
                const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; return tex;
            }
            const ceuSolMat = new T.MeshBasicMaterial({ map: ceuTexturaSol(), transparent: true, depthWrite: false, depthTest: false, toneMapped: true });
            const ceuSol = new T.Mesh(new T.PlaneGeometry(3.2475, 3.2475), ceuSolMat);
            ceuSol.frustumCulled = false; ceuSol.renderOrder = 3; ceuSol.visible = false; ceuCena.add(ceuSol);
            const ceuLuaMat = new T.MeshBasicMaterial({ map: ceuTexturaLua(), transparent: true, depthWrite: false, depthTest: false, toneMapped: true });
            const ceuLua = new T.Mesh(new T.PlaneGeometry(2.227, 2.227), ceuLuaMat);
            ceuLua.frustumCulled = false; ceuLua.renderOrder = 2; ceuLua.visible = false; ceuCena.add(ceuLua);
            /* Nuvens com FORMA (volta 2): morre a esfera de bandas.
               Tres massas pintadas em canvas 1024x640 dentro de margem segura, alfa morto
               nos bordos - sopros com luz por cima (lum 255) e sombra
               por baixo (lum ~128) - postas em 16 placas na cupula. A
               tinta e a opacidade seguem as formulas E8; a deriva roda
               as placas em longitude. */
            function ceuTexturaNuvem(semente) {
                const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 640;
                const cx = cv.getContext('2d');
                let s = semente;
                const rr = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
                const sopros = [];
                const torres = 5 + Math.floor(rr() * 3);
                for (let c = 0; c < torres; c++) {
                    const bx = 220 + rr() * 480, by = 320 + rr() * 80, esc = .8 + rr() * .4;
                    for (let k = 0; k < 14; k++) sopros.push({ x: bx + (rr() - .5) * 400 * esc, y: by + (rr() - .5) * 110 * esc, r: (45 + rr() * 75) * esc, a: .26 + rr() * .18 });
                    const tx = bx + (rr() - .5) * 60, ty = by - 95 * esc;
                    for (let k = 0; k < 10; k++) sopros.push({ x: tx + (rr() - .5) * 280 * esc, y: ty + (rr() - .5) * 96 * esc, r: (35 + rr() * 60) * esc, a: .26 + rr() * .18 });
                }
                let ymin = 1e9, ymax = -1e9;
                for (const pp of sopros) { ymin = Math.min(ymin, pp.y - pp.r); ymax = Math.max(ymax, pp.y + pp.r); }
                for (const pp of sopros) {
                    const t = (pp.y - ymin) / Math.max(1, ymax - ymin);
                    const L = Math.round(255 - t * 127);
                    const g = cx.createRadialGradient(pp.x, pp.y - pp.r * .18, 0, pp.x, pp.y, pp.r);
                    g.addColorStop(0, 'rgba(' + L + ',' + L + ',' + L + ',' + (pp.a + .12) + ')');
                    g.addColorStop(.62, 'rgba(' + L + ',' + L + ',' + L + ',' + pp.a + ')');
                    g.addColorStop(1, 'rgba(' + L + ',' + L + ',' + L + ',0)');
                    cx.fillStyle = g; cx.fillRect(pp.x - pp.r, pp.y - pp.r, pp.r * 2, pp.r * 2);
                }
                for (let k = 0; k < 34; k++) {
                    const pp = sopros[Math.floor(rr() * sopros.length)];
                    const x = pp.x + (rr() - .5) * 60, y = pp.y + pp.r * .45, r = pp.r * .8;
                    const g = cx.createRadialGradient(x, y, 0, x, y, r);
                    g.addColorStop(0, 'rgba(96,96,104,.26)'); g.addColorStop(1, 'rgba(96,96,104,0)');
                    cx.fillStyle = g; cx.fillRect(x - r, y - r, r * 2, r * 2);
                }
                cx.globalCompositeOperation = 'destination-out';
                let gb = cx.createLinearGradient(0, 0, 0, 70);
                gb.addColorStop(0, 'rgba(0,0,0,1)'); gb.addColorStop(1, 'rgba(0,0,0,0)');
                cx.fillStyle = gb; cx.fillRect(0, 0, 1024, 70);
                gb = cx.createLinearGradient(0, 640, 0, 570);
                gb.addColorStop(0, 'rgba(0,0,0,1)'); gb.addColorStop(1, 'rgba(0,0,0,0)');
                cx.fillStyle = gb; cx.fillRect(0, 570, 1024, 70);
                gb = cx.createLinearGradient(0, 0, 70, 0);
                gb.addColorStop(0, 'rgba(0,0,0,1)'); gb.addColorStop(1, 'rgba(0,0,0,0)');
                cx.fillStyle = gb; cx.fillRect(0, 0, 70, 640);
                gb = cx.createLinearGradient(1024, 0, 954, 0);
                gb.addColorStop(0, 'rgba(0,0,0,1)'); gb.addColorStop(1, 'rgba(0,0,0,0)');
                cx.fillStyle = gb; cx.fillRect(954, 0, 70, 640);
                cx.globalCompositeOperation = 'source-over';
                const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; return tex;
            }
            const ceuNuvensMats = [101, 208, 315].map(sd => new T.MeshBasicMaterial({ map: ceuTexturaNuvem(sd), transparent: true, depthWrite: false, depthTest: false, toneMapped: true }));
            const ceuNuvens = [];
            let ceuNuvemAng = 0;
            {
                const geoNuvem = new T.PlaneGeometry(1, .625);
                let s = 555;
                const rr = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
                for (let k = 0; k < 16; k++) {
                    const lon = rr() * 6.2832, el = .10 + rr() * .36, larg = 2.6 + rr() * 2.6;
                    const dir = new T.Vector3(Math.cos(el) * Math.cos(lon), Math.sin(el), Math.cos(el) * Math.sin(lon));
                    const m = new T.Mesh(geoNuvem, ceuNuvensMats[k % 3]);
                    m.scale.set(larg, larg * .625, 1);
                    m.position.copy(dir).multiplyScalar(9);
                    m.lookAt(0, 0, 0);
                    m.frustumCulled = false; m.renderOrder = 4; m.visible = false;
                    m.userData.base = dir;
                    ceuCena.add(m); ceuNuvens.push(m);
                }
            }
            function ceuNuvensAplicar(tinta, op) {
                for (const mt of ceuNuvensMats) { mt.color.copy(tinta); mt.opacity = op; }
                const vis = op >= .01;
                for (const m of ceuNuvens) m.visible = vis;
            }
            function ceuNuvensDeriva(dt) {
                ceuNuvemAng = (ceuNuvemAng + dt * .2 * Math.PI / 180) % (Math.PI * 2);
                const ca = Math.cos(ceuNuvemAng), sa = Math.sin(ceuNuvemAng);
                for (const m of ceuNuvens) {
                    const b = m.userData.base;
                    m.position.set((b.x * ca + b.z * sa) * 9, b.y * 9, (-b.x * sa + b.z * ca) * 9);
                    m.lookAt(0, 0, 0);
                }
            }
            /* Publicação (E3): ambEscrever publica e ambAplicarPulso
               republica — o céu final nasce da amostra, do cinz da
               chuva e do pulso, como o fundo em canvas nascia. */
            function ceuPublicar(amostra, cf, pulsoE) {
                const cinz = ambNivel(AMB_CHUVA.cinzento, cf);
                const pa = AMB_CEUS[amostra.i], pb = AMB_CEUS[(amostra.i + 1) % AMB_CEUS.length];
                for (let k = 0; k < 8; k++) {
                    const p = CEU_POSICOES[k];
                    const c = ceuPaletaCor(pa, p).lerp(ceuPaletaCor(pb, p), amostra.t);
                    c.lerp(ambCor(0x8a939c), cinz).lerp(ambCor(0xd7dee8), .30 * pulsoE);
                    ceuGradUniforms['uP' + k].value.set(c.r, c.g, c.b, p);
                }
                ceuGradUniforms.uHor.value.copy(scene.fog.color);
                const wSol = ceuWSol(ambActual.hora), wLua = 1 - wSol, fFecho = ambNivel([1, .45, .05], cf);
                const dir = new T.Vector3(amostra.solPos[0], amostra.solPos[1], amostra.solPos[2]).normalize();
                ceuSol.position.copy(dir).multiplyScalar(9.5); ceuSol.lookAt(0, 0, 0);
                ceuLua.position.copy(dir).multiplyScalar(9.5); ceuLua.lookAt(0, 0, 0);
                ceuSolMat.color.copy(amostra.solCor);
                ceuSolMat.opacity = wSol * fFecho; ceuSol.visible = fFecho >= .1 && ceuSolMat.opacity >= .01;
                const cs = amostra.solCor.clone().convertLinearToSRGB();
                const yy = .2126 * cs.r + .7152 * cs.g + .0722 * cs.b;
                cs.lerp(new T.Color(yy, yy, yy), .45).multiplyScalar(.82);
                cs.multiplyScalar(CEU_LUA_ESC);
                ceuLuaMat.color.copy(cs).convertSRGBToLinear();
                ceuLuaMat.opacity = wLua * fFecho; ceuLua.visible = fFecho >= .1 && ceuLuaMat.opacity >= .01;
                ceuEstrelasMat.uniforms.uAlfaGlobal.value = .55 * wLua * fFecho;
                ceuEstrelas.visible = fFecho >= .1 && ceuEstrelasMat.uniforms.uAlfaGlobal.value >= .01;
                ceuNuvensAplicar(ambCor(0x26334a).lerp(amostra.solCor.clone().lerp(ambCor(0xffffff), .65), wSol), ambNivel([.38, .68, .96], cf));
                const z = ceuGradUniforms.uP0.value;
                ceuPublicado = {
                    zenite: '#' + new T.Color(z.x, z.y, z.z).convertLinearToSRGB().getHexString(),
                    horVivo: '#' + scene.fog.color.clone().convertLinearToSRGB().getHexString(),
                    wSol, wLua, fFecho
                };
            }
            function ceuPublicadoEstado() {
                if (!ceuPublicado) return { modo: ceuEstado, zenite: null, horVivo: null, wSol: 0, wLua: 1, fFecho: 1, ceuCalls: ceuDelta.calls };
                return { modo: ceuEstado, zenite: ceuPublicado.zenite, horVivo: ceuPublicado.horVivo, wSol: +ceuPublicado.wSol.toFixed(3), wLua: +ceuPublicado.wLua.toFixed(3), fFecho: +ceuPublicado.fFecho.toFixed(3), ceuCalls: ceuDelta.calls };
            }
            /* Por frame (E9), dentro de ambTick depois do pulso: tempo
               das estrelas, deriva das nuvens integrada (dt próprio
               com o mesmo clamp de 0,08 s — ambTick recebe `now`, não
               o dt de animate) e o quaternião da câmara activa. */
            function ceuTick(now) {
                if (!ceuPublicado || ceuEstado === 'falha') return;
                ceuEstrelasMat.uniforms.uTempo.value = now / 1000;
                ceuEstrelasMat.uniforms.uDpr.value = renderer.getPixelRatio();
                if (ceuUltimoNow >= 0) {
                    const dt = Math.min(.08, Math.max(0, (now - ceuUltimoNow) / 1000));
                    ceuNuvensDeriva(dt);
                }
                ceuUltimoNow = now;
                ceuCam.quaternion.copy(camaraActiva().quaternion);
                ceuCam.aspect = width / Math.max(1, height); ceuCam.updateProjectionMatrix();
            }
            function ceuVerificarProgramas() {
                const progs = renderer.info.programs || [];
                for (const p of progs) if (p.diagnostics && p.diagnostics.runnable === false) { ceuEstado = 'falha'; return; }
            }
            /* Render em duas passagens (E1): reset manual só dos
               contadores de render (info.reset() tocaria também a
               memória — a prova de dispose da E11 lê info.memory). */
            function ceuRenderizar() {
                const cam = camaraActiva();
                if (ceuEstado === 'falha' || !ceuPublicado) { scene.background = CEU_SOLIDO; renderer.render(scene, cam); return; }
                scene.background = null;
                const ri = renderer.info.render;
                ri.calls = 0; ri.triangles = 0; ri.lines = 0; ri.points = 0;
                renderer.autoClear = true;
                renderer.render(ceuCena, ceuCam);
                ceuDelta.calls = ri.calls; ceuDelta.triangles = ri.triangles;
                renderer.clearDepth();
                renderer.autoClear = false;
                renderer.render(scene, cam);
                renderer.autoClear = true;
                if (!ceuVerificado) { ceuVerificado = true; ceuVerificarProgramas(); }
            }
            function ceuDispose() {
                ceuCena.traverse(o => {
                    if (o.geometry) o.geometry.dispose();
                    if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
                });
            }
            /* Fontes decorativas da camada pintada (brilhos das tochas):
               identificadas pela assinatura que a própria casa usa —
               PointLight 0xff8f3f/dist 6,5 e sprites junto aos braseiros.
               Guardam-se as bases; o ambiente só as escala pelo factor
               de chama (1 no ritual = valores intactos). */
            let ambDecor = null;
            /* Estado do véu lido pelo ambiente (volta 2): o factor
               da hearth e o registo dos braseiros vivem aqui porque
               ambEscrever os compõe a cada escrita; os conjuntos e
               o mecanismo estão no bloco do véu, mais abaixo. As
               casas dos braseiros são as da sentença: clamp da
               posição à arena («0,2» oeste · «9,4» este · «5,0»
               sul, na área 10×7 de origem 0,0). */
            let veuFactorHearth = 1;
            const veuBraseirosReg = (world.braseiros || []).map((b, i) => {
                const clampCasa = (v, origem, n) => Math.min(origem + n - 1, Math.max(origem, Math.round(v / CELL + (n - 1) / 2) + origem));
                /* Âncora = posição MUNDO efectiva da chama: o embrulho
                   visual MOVE os braseiros ~7,5–8,2 m para a elipse
                   BANDA_R=13,73 (medido 11/11: (−8,5,−2)→(−16,3,−3,1) ·
                   (8,5,1)→(16,6,1,6) · (1,−6,25)→(2,7,−13,6)); com as
                   posições de registo do mundo, a casa por clamp e a
                   associação do decor caíam em geografia errada. */
                let ax = b.x, az = b.z;
                try { const wp = new T.Vector3(); if (b.chamas && b.chamas[0]) { b.chamas[0].getWorldPosition(wp); ax = wp.x; az = wp.z; } } catch (_) {}
                return { b, i, ax, az, chave: clampCasa(ax, area.origin.x, area.cols) + ',' + clampCasa(az, area.origin.y, area.rows), estado: 'vista', factorDecor: 1, mats: b.chamas.map(m => m.material) };
            });
            function ambCapturarDecor() {
                const posTochas = world.fontes ? world.fontes.tochas.map(l => l.position) : [];
                const luzes = [], sprites = [];
                scene.traverse(o => {
                    if (o.isPointLight && o.color.getHex() === 0xff8f3f && Math.abs(o.distance - 6.5) < .01) luzes.push({ o, base: o.intensity });
                    else if (o.isSprite && (posTochas.some(p => Math.abs(o.position.x - p.x) < 1.2 && Math.abs(o.position.z - p.z) < 1.2) || veuBraseirosReg.some(r => Math.abs(o.position.x - r.ax) < 2.5 && Math.abs(o.position.z - r.az) < 2.5))) sprites.push({ o, base: o.material.opacity });
                });
                /* Volta 2 (S2-10): cada luz/sprite decorativo fica
                   associado ao seu braseiro (o mais próximo em x/z
                   até 2,5 m) e os sprites classificam-se halo
                   (aditivo) / fumo. Material de sprite partilhado
                   por mais de um sprite é clonado aqui, uma vez,
                   para a tinta por estado não vazar entre
                   braseiros. */
                const brasDec = veuBraseirosReg.map(r => ({ x: r.ax, z: r.az }));
                const donoDec = (x, z) => { let bi = null, bd = 2.5; brasDec.forEach((b, i) => { const d = Math.hypot(x - b.x, z - b.z); if (d < bd) { bd = d; bi = i; } }); return bi; };
                for (const d of luzes) d.braseiro = donoDec(d.o.position.x, d.o.position.z);
                const usoMatDec = new Map();
                for (const d of sprites) usoMatDec.set(d.o.material, (usoMatDec.get(d.o.material) || 0) + 1);
                for (const d of sprites) {
                    if (usoMatDec.get(d.o.material) > 1) d.o.material = d.o.material.clone();
                    d.braseiro = donoDec(d.o.position.x, d.o.position.z);
                    d.tipo = d.o.material.blending === T.AdditiveBlending ? 'halo' : 'fumo';
                    d.corBase = d.o.material.color ? d.o.material.color.getHex() : 0xffffff;
                }
                ambDecor = { luzes, sprites };
            }
            const CHUVA_MAX = 3000;
            const chuvaGeo = new T.BufferGeometry();
            {
                const pos = new Float32Array(CHUVA_MAX * 3);
                let s = 9182;
                const rr = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
                for (let i = 0; i < CHUVA_MAX; i++) {
                    const r = Math.sqrt(rr()) * 46, a = rr() * Math.PI * 2;
                    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = rr() * 30; pos[i * 3 + 2] = Math.sin(a) * r;
                }
                chuvaGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
                chuvaGeo.setDrawRange(0, 0);
            }
            /* A CHUVA EM TRAÇOS (EM-AV2-01; a queixa dele: os pontos
             * redondos liam-se «neve a cair»). Mesma arquitectura da
             * REF_26 — um THREE.Points, um só draw call, as mesmas
             * contagens (AMB_CHUVA.gotas/gotasBaixa) e opacidades —
             * mas cada gota desenha-se como um TRAÇO: o fragmento
             * risca uma linha inclinada dentro do sprite, com o
             * comprimento em METROS (constante por qualidade) e a
             * inclinação declaradas. O tamanho do sprite calcula-se
             * da projecção, por isso o traço mede o mesmo no mundo
             * a qualquer distância. Parâmetros (medidos e lidos em
             * runtime na re-prova): comprimento 0,42/0,50/0,58 m
             * (baixa/média/alta) · inclinação 0,16 · meia-largura do
             * traço 0,016 m (cheio até 0,005 m) · queda 17 m/s. */
            const CHUVA_TRACO_INCLINACAO = .16;
            const CHUVA_TRACO_LARGURA = .016;
            /* AMBIENTE VIVO - PASSO 1 (desenho FASE 2, SS1-SS3): escala
             * ortografica dos sprites. A formula antiga pressupunha
             * perspectiva e colapsava o sprite ao minimo de 2 px nas
             * camaras ortograficas (Fixa/360/Seguir). Ramo uOrto:
             * ortografica = pixeis-por-metro (uAlturaPx/uFrustumAltM);
             * perspectiva (Livre) = a formula antiga, que la esta certa.
             * uAlturaPx/uFrustumAltM/uOrto escritos POR FOTOGRAMA em
             * ambQuadro (pos-updateProjectionMatrix, pre-render); os
             * valores nos uniformes sao so o pre-1o fotograma. Clamps
             * fechados: chuva [2,512] - neve [2,256]. As brasas do fogo
             * e do ritual NAO sao tocadas (desenho SS1.5). */
            const DIR_VENTO = { x: .94, z: .34 };   // direccao unica do mundo (chuva e neve), SS2.1/SS3
            const CHUVA_VENTO_M = [0, 2.0, 3.0];    // vento da chuva, m/s por nivel [Sem, Fraca, Forte], SS2.1
            const chuvaMat = new T.ShaderMaterial({
                uniforms: { uTempo: { value: 0 }, uComp: { value: .58 }, uAlturaPx: { value: 800 }, uFrustumAltM: { value: 10 }, uOrto: { value: 1 }, uVento: { value: new T.Vector2(0, 0) }, uInclinacao: { value: CHUVA_TRACO_INCLINACAO }, uLargura: { value: CHUVA_TRACO_LARGURA }, uOpacidade: { value: 0 } },
                vertexShader: 'uniform float uTempo; uniform float uComp; uniform float uAlturaPx; uniform float uFrustumAltM; uniform float uOrto; uniform vec2 uVento; varying float vComp; varying vec2 vDirTraco; void main() { vec3 p = position; p.x = mod(p.x + uTempo * uVento.x + 46.0, 92.0) - 46.0; p.z = mod(p.z + uTempo * uVento.y + 46.0, 92.0) - 46.0; p.y = mod(p.y - uTempo * 17.0, 30.0); vec4 mv = modelViewMatrix * vec4(p, 1.0); float dist = max(0.1, -mv.z); float escala = (uOrto > 0.5) ? uAlturaPx / max(0.1, uFrustumAltM) : uAlturaPx * 0.5 * projectionMatrix[1][1] / dist; vComp = uComp; vec4 pv = projectionMatrix * modelViewMatrix * vec4(vec3(uVento.x, -17.0, uVento.y), 0.0); vec2 dirE = vec2(pv.x, -pv.y); float ld = length(dirE); vDirTraco = ld > 0.0001 ? dirE / ld : vec2(0.0, 1.0); gl_PointSize = clamp(uComp * 1.30 * escala, 2.0, 512.0); gl_Position = projectionMatrix * mv; }',
                fragmentShader: 'uniform float uOpacidade; uniform float uInclinacao; uniform float uLargura; varying float vComp; varying vec2 vDirTraco; void main() { float S = vComp * 1.30; vec2 pm = (gl_PointCoord - vec2(0.5)) * S; vec2 dir = normalize(vDirTraco); if (dir.y < 0.0) dir = -dir; float sgn = dir.x < 0.0 ? -1.0 : 1.0; float rot = -uInclinacao * sgn; float cr = cos(rot); float sr = sin(rot); dir = vec2(cr * dir.x - sr * dir.y, sr * dir.x + cr * dir.y); vec2 nrm = vec2(dir.y, -dir.x); float d = abs(dot(pm, nrm)); float s = dot(pm, dir); float lat = smoothstep(uLargura, uLargura * 0.31, d); float lon = smoothstep(vComp * 0.52, vComp * 0.40, abs(s)); float a = lat * lon * uOpacidade; if (a < 0.012) discard; gl_FragColor = vec4(0.78, 0.85, 0.92, a); }',
                transparent: true, depthWrite: false
            });
            const chuvaPts = new T.Points(chuvaGeo, chuvaMat);
            chuvaPts.frustumCulled = false; chuvaPts.visible = false; chuvaPts.renderOrder = 5;
            scene.add(chuvaPts);
            /* A NEVE (VOLTA 3 — palavra dele: a precipitação antiga
             * de pontos «não tava ruim, só era neve — tem que ter a
             * opção de chuva e a opção de neve»). Sistema irmão da
             * chuva: um THREE.Points, um só draw call, as mesmas
             * posições-mãe com outra semente — mas o floco é um
             * DISCO SUAVE (queda radial de alfa, sem traço), cai
             * DEVAGAR (1,3 m/s contra os 17 m/s da chuva) e deriva
             * com o vento: balanço senoidal próprio de cada floco.
             * Contagens próprias [Sem, Pouca, Forte] — o floco é
             * maior (0,075 m, com variação por floco; era 0,055 m
             * na volta 3 e lia-se fraco — afinação da candidata
             * final, palavra dele: «aumentar só um pouquinho»; a
             * opacidade Forte subiu de .85 para .92) e lê-se com
             * menos pontos que a chuva. Nunca visível ao mesmo
             * tempo que a chuva: ambEscrever acende um sistema ou
             * o outro, conforme o tipo (ambActual.precip). */
            const NEVE_MAX = 3000;   // buffer proprio da neve, desacoplado de CHUVA_MAX (SS3.5). INVARIANTE: qualquer tabela de contagens da neve <= NEVE_MAX e a da chuva <= CHUVA_MAX - exceder corta o drawRange em silencio.
            const NEVE_CONT = [0, 2000, 3000];        // qualidade alta [Sem, Fraca, Forte], SS3.3 - Fraca := a Forte antiga (2000/.92/.075/1,3), SS3.1
            const NEVE_CONT_MEDIA = [0, 1200, 2000];  // qualidade media, SS3.3
            const NEVE_CONT_BAIXA = [0, 800, 1200];   // qualidade baixa, SS3.3 (a neve ganha a variante por qualidade)
            const NEVE_TAM = [.075, .075, .10];       // uTam por nivel: Fraca .075 - Forte (nevasca) .10, SS3.1/SS3.2
            const NEVE_QUEDA = [1.3, 1.3, 1.5];       // queda m/s por nivel: Fraca 1,3 - nevasca 1,5, SS3.2
            const NEVE_VENTO_M = [0, 1.0, 5.0];       // vento coerente m/s por nivel: Fraca 1,0 - nevasca 5,0 medios com rajadas em ambQuadro, SS3.1/SS3.2
            const NEVOA_EXTRA_MAX = .012;             // nevoa de tempo contida da nevasca: adicao maxima de densidade, SS3.4
            const NEVE_OPACIDADE = [0, .92, .95];     // Fraca := .92 (a Forte antiga) - nevasca .95, SS3.1/SS3.2
            const neveGeo = new T.BufferGeometry();
            {
                const pos = new Float32Array(NEVE_MAX * 3);
                let s = 41713;
                const rr = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
                for (let i = 0; i < NEVE_MAX; i++) {
                    const r = Math.sqrt(rr()) * 46, a = rr() * Math.PI * 2;
                    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = rr() * 30; pos[i * 3 + 2] = Math.sin(a) * r;
                }
                neveGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
                neveGeo.setDrawRange(0, 0);
            }
            const neveMat = new T.ShaderMaterial({
                uniforms: { uTempo: { value: 0 }, uAlturaPx: { value: 800 }, uFrustumAltM: { value: 10 }, uOrto: { value: 1 }, uOpacidade: { value: 0 }, uTam: { value: .075 }, uQueda: { value: 1.3 }, uVento: { value: new T.Vector2(0, 0) } },
                vertexShader: 'uniform float uTempo; uniform float uAlturaPx; uniform float uFrustumAltM; uniform float uOrto; uniform float uTam; uniform float uQueda; uniform vec2 uVento; varying float vFase; varying vec2 vDirTraco; varying float vEstica; void main() { vec3 p = position; p.x = mod(p.x + uTempo * uVento.x + 46.0, 92.0) - 46.0; p.z = mod(p.z + uTempo * uVento.y + 46.0, 92.0) - 46.0; p.y = mod(p.y - uTempo * uQueda, 30.0); p.x += sin(uTempo * 0.45 + position.y * 0.31 + position.x * 0.17) * 0.9; p.z += cos(uTempo * 0.36 + position.y * 0.23 + position.z * 0.19) * 0.7; vec4 mv = modelViewMatrix * vec4(p, 1.0); float dist = max(0.1, -mv.z); float escala = (uOrto > 0.5) ? uAlturaPx / max(0.1, uFrustumAltM) : uAlturaPx * 0.5 * projectionMatrix[1][1] / dist; vFase = fract(position.x * 12.9898 + position.z * 78.233); vec4 pv = projectionMatrix * modelViewMatrix * vec4(vec3(uVento.x, -uQueda, uVento.y), 0.0); vec2 dirE = vec2(pv.x, -pv.y); float ld = length(dirE); vDirTraco = ld > 0.0001 ? dirE / ld : vec2(0.0, 1.0); float vh = length(uVento); vEstica = vh > 3.0 ? clamp(1.0 + 0.3 * (vh - 3.0), 1.0, 2.2) : 1.0; gl_PointSize = clamp(uTam * (1.4 + vFase * 0.9) * escala, 2.0, 256.0); gl_Position = projectionMatrix * mv; }',
                fragmentShader: 'uniform float uOpacidade; varying vec2 vDirTraco; varying float vEstica; void main() { vec2 c = gl_PointCoord - vec2(0.5); vec2 dir = normalize(vDirTraco); vec2 nrm = vec2(dir.y, -dir.x); float d = length(vec2(dot(c, dir) / max(1.0, vEstica), dot(c, nrm))); float a = smoothstep(0.5, 0.06, d) * uOpacidade; if (a < 0.012) discard; gl_FragColor = vec4(0.93, 0.96, 1.0, a); }',
                transparent: true, depthWrite: false
            });
            const nevePts = new T.Points(neveGeo, neveMat);
            nevePts.frustumCulled = false; nevePts.visible = false; nevePts.renderOrder = 5;
            scene.add(nevePts);
            /* A CAMADA DE CHÃO DA CHUVA NOVA (tranche t-aba-testes —
             * o efeito do dossiê 052, fundido da candidata de
             * t-chuva-052, atrás da bandeira da aba «Testes» do
             * Mestre: o que faz a chuva LER-SE na vista de cima não
             * são os traços a cair, são as ONDULAÇÕES e as COROAS DE
             * RESPINGO no chão). Uma só malha de pontos (1 draw call
             * quando visível; invisível, não desenha); cada respingo
             * é um sprite no plano do chão com o ciclo de vida
             * inteiro no shader: nasce com uma coroa de espigões e um
             * ponto de impacto, abre um anel de ondulação (e um
             * segundo anel fraco) e morre. Posições estáticas num
             * disco de 16 m à volta da origem, com a altura do chão
             * cozida por instância (world.height). O tamanho do
             * sprite mede em METROS do mundo nas duas câmaras: na
             * ortográfica (Fixa/360/Seguir), a escala é
             * uAlturaPx·½·proj[1][1] (a matriz já traz o zoom); na
             * livre (perspectiva), divide-se pela distância — o par
             * de ramos da chuva com o ramo ortográfico certo.
             * Parâmetros declarados: ciclo 0,8 s · diâmetro do sprite
             * 0,85 m × (0,72–1,28 por instância) · anel até 0,44 do
             * sprite · contagens por nível de TESTE [0, 380, 900]
             * (qualidade baixa: [0, 240, 480]). Com neve a camada
             * está desligada (a neve não respinga). */
            /* Estado do teste: nasce DESLIGADO — sem o Mestre o ligar
               na aba «Testes», a camada nunca desenha e o
               comportamento é o da base. Vive só nesta closure e só
               nesta sessão: nada se grava em chave nenhuma. */
            let testeChuva052 = { ligada: false, nivel: 2 };
            const RESP_MAX = 900, RESP_CICLO = .8, RESP_RAIO = 16;
            const RESP_CONT = [0, 380, 900], RESP_CONT_BAIXA = [0, 240, 480];
            const respGeo = new T.BufferGeometry();
            {
                const pos = new Float32Array(RESP_MAX * 3), fase = new Float32Array(RESP_MAX), tam = new Float32Array(RESP_MAX);
                let s = 73031;
                const rr = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
                for (let i = 0; i < RESP_MAX; i++) {
                    const r = Math.sqrt(rr()) * RESP_RAIO, a = rr() * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
                    pos[i * 3] = x; pos[i * 3 + 1] = world.height(x, z) + .04; pos[i * 3 + 2] = z;
                    fase[i] = rr(); tam[i] = rr();
                }
                respGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
                respGeo.setAttribute('aFase', new T.BufferAttribute(fase, 1));
                respGeo.setAttribute('aTam', new T.BufferAttribute(tam, 1));
                respGeo.setDrawRange(0, 0);
            }
            const respMat = new T.ShaderMaterial({
                uniforms: { uTempo: { value: 0 }, uAlturaPx: { value: 800 }, uOrto: { value: 1 }, uOpacidade: { value: 0 } },
                vertexShader: 'uniform float uTempo; uniform float uAlturaPx; uniform float uOrto; attribute float aFase; attribute float aTam; varying float vIdade; varying float vTam; varying float vS; void main() { vIdade = fract(uTempo / ' + RESP_CICLO + ' + aFase); vTam = aTam; float S = 0.85 * (0.72 + 0.56 * aTam); vS = S; vec4 mv = modelViewMatrix * vec4(position, 1.0); float dist = max(0.1, -mv.z); float ppm = uAlturaPx * 0.5 * projectionMatrix[1][1]; float escala = (uOrto > 0.5) ? ppm : ppm / dist; gl_PointSize = clamp(S * escala, 2.0, 512.0); gl_Position = projectionMatrix * mv; }',
                fragmentShader: 'uniform float uOpacidade; varying float vIdade; varying float vTam; varying float vS; void main() { vec2 c = (gl_PointCoord - vec2(0.5)) * vS; float r = length(c); float a = vIdade; float R = 0.44 * vS * sqrt(a); float w = 0.016 + 0.022 * a; float anel = smoothstep(w, 0.0, abs(r - R)) * pow(1.0 - a, 1.35); float anel2 = smoothstep(w * 0.8, 0.0, abs(r - R * 0.55)) * pow(1.0 - a, 1.6) * 0.35; float coroa = 0.0; if (a < 0.35) { float t = a / 0.35; float ang = atan(c.y, c.x); float esp = pow(0.5 + 0.5 * sin(ang * 5.0 + vTam * 40.0), 6.0); float Rc = mix(0.02, 0.17 * vS, t); coroa = esp * smoothstep(0.028, 0.0, abs(r - Rc)) * (1.0 - t); } float ponto = (a < 0.22) ? smoothstep(0.045, 0.0, r) * (1.0 - a / 0.22) * 0.8 : 0.0; float al = clamp(anel + anel2 + coroa * 0.9 + ponto, 0.0, 1.0) * uOpacidade * 0.85; if (al < 0.012) discard; gl_FragColor = vec4(0.80, 0.87, 0.94, al); }',
                transparent: true, depthWrite: false
            });
            const respPts = new T.Points(respGeo, respMat);
            respPts.frustumCulled = false; respPts.visible = false; respPts.renderOrder = 4;
            scene.add(respPts);
            let ambAlvo = { hora: 23, chuva: 0, raios: false, precip: 'chuva' };
            let ambActual = { hora: 23, chuva: 0, precip: 'chuva' };
            let ambTrans = null, ambPulsoT0 = -1, ambUltimoRaio = -1e9, ambCapChuva = null;
            let ambDerivados = null, ambUltimaAmostra = null, ambUltimoHor = null;
            let ambNomGotas = 0, ambNomFlocos = 0, ambNevoaExtra = 0;   // nominais de ambEscrever (a rede de area/quadro le estes) + nevoa contida corrente, SS3.4
            const ambDeltaHora = (de, para) => ((para - de + 36) % 24) - 12;
            function ambEscrever(amostra, cf, pulsoE) {
                const cinz = ambNivel(AMB_CHUVA.cinzento, cf);
                const ceuFinal = amostra.hemiCeu.clone().lerp(ambCor(0x8a939c), cinz);
                const horFinal = amostra.horizonte.clone().lerp(ambCor(0x8a939c), cinz);
                renderer.toneMappingExposure = amostra.exp;
                hemi.intensity = amostra.hemiInt + .38 * pulsoE;
                hemi.color.copy(ceuFinal);
                hemi.groundColor.copy(amostra.hemiChao);
                sun.intensity = amostra.solInt;
                sun.color.copy(amostra.solCor);
                sun.position.set(amostra.solPos[0], amostra.solPos[1], amostra.solPos[2]);
                scene.fog.color.copy(horFinal).lerp(ambCor(0xd7dee8), .55 * pulsoE);
                world.ambienteBases.fogueira = amostra.fogueira;
                /* A base guarda-se CRUA (S2-7); o factor do véu só
                   multiplica a escrita, nunca o valor guardado —
                   esconder e revelar devolve exactamente a base. */
                if (world.fontes) world.fontes.fogueira.intensity = amostra.fogueira * veuFactorHearth;
                world.ambienteBases.tochas = amostra.tochas * ambNivel(AMB_CHUVA.tochas, cf);
                if (world.braseiros) for (const r of veuBraseirosReg) for (const m of r.b.chamas) m.visible = amostra.chamas > .02 && r.estado !== 'nunca';
                else if (world.fontes) for (const m of world.fontes.chamas) m.visible = amostra.chamas > .02;
                if (ambDecor) {
                    for (const d of ambDecor.luzes) d.o.intensity = d.base * amostra.chamas * (d.braseiro != null && veuBraseirosReg[d.braseiro] ? veuBraseirosReg[d.braseiro].factorDecor : 1);
                    for (const d of ambDecor.sprites) {
                        const estDec = d.braseiro != null && veuBraseirosReg[d.braseiro] ? veuBraseirosReg[d.braseiro].estado : 'vista';
                        if (estDec === 'nunca') { d.o.visible = false; continue; }
                        d.o.visible = amostra.chamas > .02;
                        let opDec = d.base * amostra.chamas;
                        if (estDec === 'memoria') {
                            opDec *= .45;
                            if (d.tipo === 'halo' && d.o.material.color) d.o.material.color.setHex(0x9aa7b4);
                        } else if (d.tipo === 'halo' && d.o.material.color) d.o.material.color.setHex(d.corBase);
                        d.o.material.opacity = opDec;
                    }
                }
                ceuPublicar(amostra, cf, pulsoE);
                const tabela = quality === 'baixa' ? AMB_CHUVA.gotasBaixa : AMB_CHUVA.gotas;
                /* Chuva e neve nunca juntas (VOLTA 3): o tipo manda
                 * qual dos sistemas desenha; o outro fica a zero.
                 * Os derivados guardam a contagem da CHUVA como
                 * sempre — com neve, gotas = 0 (a âncora não muda:
                 * sem precipitação, os dois sistemas estão vazios). */
                const deNeve = ambActual.precip === 'neve';
                let gotas = deNeve ? 0 : Math.round(ambNivel(tabela, cf));
                if (ambCapChuva != null) gotas = Math.min(gotas, ambCapChuva);
                chuvaGeo.setDrawRange(0, gotas);
                chuvaPts.visible = gotas > 0;
                chuvaMat.uniforms.uOpacidade.value = ambNivel(AMB_CHUVA.opacidade, cf);
                chuvaMat.uniforms.uComp.value = quality === 'baixa' ? .42 : quality === 'media' ? .50 : .58;
                { const vm = deNeve ? 0 : ambNivel(CHUVA_VENTO_M, cf); chuvaMat.uniforms.uVento.value.set(DIR_VENTO.x * vm, DIR_VENTO.z * vm); }
                chuvaMat.uniforms.uAlturaPx.value = renderer.domElement.height || 800;
                const tabelaNeve = quality === 'baixa' ? NEVE_CONT_BAIXA : quality === 'media' ? NEVE_CONT_MEDIA : NEVE_CONT;
                let flocos = deNeve ? Math.round(ambNivel(tabelaNeve, cf)) : 0;
                if (ambCapChuva != null) flocos = Math.min(flocos, ambCapChuva);
                neveGeo.setDrawRange(0, flocos);
                nevePts.visible = flocos > 0;
                neveMat.uniforms.uOpacidade.value = ambNivel(NEVE_OPACIDADE, cf);
                neveMat.uniforms.uAlturaPx.value = renderer.domElement.height || 800;
                neveMat.uniforms.uTam.value = ambNivel(NEVE_TAM, cf);
                neveMat.uniforms.uQueda.value = ambNivel(NEVE_QUEDA, cf);
                { const vm = deNeve ? ambNivel(NEVE_VENTO_M, cf) : 0; neveMat.uniforms.uVento.value.set(DIR_VENTO.x * vm, DIR_VENTO.z * vm); }
                ambNomGotas = gotas; ambNomFlocos = flocos;
                /* Camada de chão da chuva nova (052), atrás da bandeira
                   da aba «Testes»: desligada, a contagem é 0 e nada
                   desenha (comportamento da base); ligada, a contagem e
                   a opacidade são as do NÍVEL DE TESTE escolhido pelo
                   Mestre (Fraco 1 · Forte 2), com o tecto de sempre e a
                   neve a desligar (a neve não respinga). Os derivados
                   da âncora não contam a camada — ficam byte-iguais. */
                const cfTeste052 = testeChuva052.nivel;
                let resp = (testeChuva052.ligada && !deNeve && cf > 0) ? Math.round(ambNivel(quality === 'baixa' ? RESP_CONT_BAIXA : RESP_CONT, cfTeste052)) : 0;
                if (ambCapChuva != null) resp = Math.min(resp, ambCapChuva);
                respGeo.setDrawRange(0, resp);
                respPts.visible = resp > 0;
                respMat.uniforms.uOpacidade.value = ambNivel(AMB_CHUVA.opacidade, cfTeste052);
                respMat.uniforms.uAlturaPx.value = renderer.domElement.height || 800;
                if (world.ground && world.ground.material && world.ground.material.color) world.ground.material.color.setScalar(ambNivel(AMB_CHUVA.molhado, cf));
                ambDerivados = { exposicao: amostra.exp, hemiInt: amostra.hemiInt, solInt: amostra.solInt, fogueiraBase: amostra.fogueira, tochasBase: world.ambienteBases.tochas, chamas: amostra.chamas, gotas, flocos, nevoaExtra: ambNevoaExtra };
                ambUltimaAmostra = amostra; ambUltimoHor = horFinal;
            }
            function ambAplicarPulso(e) {
                if (!ambUltimaAmostra) return;
                hemi.intensity = ambUltimaAmostra.hemiInt + .38 * e;
                if (ambUltimoHor) scene.fog.color.copy(ambUltimoHor).lerp(ambCor(0xd7dee8), .55 * e);
                ceuPublicar(ambUltimaAmostra, ambActual.chuva, e);
            }
            function aplicarAmbiente(estado, opcoes = {}) {
                if (!estado || !Number.isFinite(estado.hora) || estado.hora < 0 || estado.hora >= 24) throw new RangeError('Ambiente: hora fora de [0,24).');
                if (![0, 1, 2].includes(estado.chuva)) throw new RangeError('Ambiente: chuva fora de {0,1,2}.');
                if (typeof estado.raios !== 'boolean') throw new TypeError('Ambiente: raios booleano obrigatório.');
                if (estado.precip !== undefined && estado.precip !== 'chuva' && estado.precip !== 'neve') throw new TypeError('Ambiente: precip fora de {chuva, neve}.');
                if (!ambDecor) ambCapturarDecor();
                /* precip ausente = 'chuva' (o contrato antigo não o
                 * trazia — VOLTA 3). O TIPO troca na hora; a
                 * intensidade continua a transitar como sempre. */
                ambAlvo = { hora: estado.hora, chuva: estado.chuva, raios: estado.raios, precip: estado.precip === 'neve' ? 'neve' : 'chuva' };
                ambPulsoT0 = -1;
                if (opcoes.imediato) {
                    ambTrans = null;
                    ambActual = { hora: ambAlvo.hora, chuva: ambAlvo.chuva, precip: ambAlvo.precip };
                    ambEscrever(ambAmostra(ambActual.hora), ambActual.chuva, 0);
                    renderer.shadowMap.needsUpdate = true;
                    emit('ambiente', { ...ambAlvo });
                    return { ...ambAlvo };
                }
                ambActual.precip = ambAlvo.precip;
                ambTrans = { deHora: ambActual.hora, deChuva: ambActual.chuva, t0: performance.now() };
                return { ...ambAlvo };
            }
            /* Escrita POR FOTOGRAMA (SS1.2): escala, vento com rajadas
             * e nevoa contida. Chamada em animate depois de
             * updateProjectionMatrix e antes do render - nesse ponto
             * top-bottom ja desconta o hudShift (subtrai igual aos
             * dois e cancela). uAlturaPx = renderer.domElement.height
             * (pixeis do drawing buffer, DPR-correcto), nunca a
             * variavel CSS. A VERDADE DA DEGRADACAO (SS4): a escada
             * vigente (jogo.js) capa a precipitacao 1200-400-0 com
             * FPS <24 sustentado, so desce por sessao e e cega ao
             * tipo; este desenho NAO a muda - a neve degrada com
             * graca porque os flocos ficam ao tamanho certo. */
            function ambQuadro(now, dt) {
                const cam = camaraActiva(), orto = mode !== 'livre';
                const alturaPx = renderer.domElement.height || 800;
                const frustumAlt = orto ? Math.max(0.1, cam.top - cam.bottom) : 1;
                for (const m of [chuvaMat, neveMat]) {
                    m.uniforms.uAlturaPx.value = alturaPx;
                    m.uniforms.uFrustumAltM.value = frustumAlt;
                    m.uniforms.uOrto.value = orto ? 1 : 0;
                }
                const t = now / 1000, cf = ambActual.chuva, deNeve = ambActual.precip === 'neve';
                const vmC = deNeve ? 0 : ambNivel(CHUVA_VENTO_M, cf);
                chuvaMat.uniforms.uVento.value.set(DIR_VENTO.x * vmC, DIR_VENTO.z * vmC);
                let vmN = deNeve ? ambNivel(NEVE_VENTO_M, cf) : 0;
                if (deNeve && cf > 1) {
                    const g = clamp(1 + 0.28 * Math.sin(2 * Math.PI * t / 3.7) + 0.12 * Math.sin(2 * Math.PI * t / 2.3 + 1.7), 0.6, 1.4);
                    vmN *= 1 + (g - 1) * Math.min(1, cf - 1);   // rajadas 3-7 m/s a Forte cheia (5,0 x 0,6-1,4), SS3.2
                }
                neveMat.uniforms.uVento.value.set(DIR_VENTO.x * vmN, DIR_VENTO.z * vmN);
                neveMat.uniforms.uQueda.value = ambNivel(NEVE_QUEDA, cf);
                /* Nevoa contida (SS3.4): alvo proporcional a intensidade
                 * interpolada da neve Forte; subida/descida ~4 s; snap
                 * literal a 0,0 quando a neve e 0. A adicao vive so
                 * durante o render (em animate) e a ancora e restaurada
                 * bit-exacta - cor do fog e luzes nunca sao reescritas
                 * por esta tranche. Clausula de morte na SS3.4. */
                const alvoNevoa = deNeve ? NEVOA_EXTRA_MAX * clamp(cf - 1, 0, 1) : 0;
                if (dt > 0) {
                    const passo = NEVOA_EXTRA_MAX * dt / 4;
                    ambNevoaExtra += clamp(alvoNevoa - ambNevoaExtra, -passo, passo);
                    if (alvoNevoa === 0 && ambNevoaExtra < 0.00005) ambNevoaExtra = 0;
                }
                if (ambDerivados) ambDerivados.nevoaExtra = ambNevoaExtra;
            }
            function ambTick(now) {
                chuvaMat.uniforms.uTempo.value = now / 1000;
                neveMat.uniforms.uTempo.value = now / 1000;
                respMat.uniforms.uTempo.value = now / 1000;
                respMat.uniforms.uAlturaPx.value = renderer.domElement.height || 800;
                respMat.uniforms.uOrto.value = mode !== 'livre' ? 1 : 0;
                if (ambTrans) {
                    const ph = Math.min(1, (now - ambTrans.t0) / 7000), pc = Math.min(1, (now - ambTrans.t0) / 2500);
                    const eh = ph * ph * (3 - 2 * ph), ec = pc * pc * (3 - 2 * pc);
                    ambActual.hora = ((ambTrans.deHora + ambDeltaHora(ambTrans.deHora, ambAlvo.hora) * eh) % 24 + 24) % 24;
                    ambActual.chuva = ambTrans.deChuva + (ambAlvo.chuva - ambTrans.deChuva) * ec;
                    if (ph >= 1 && pc >= 1) {
                        ambTrans = null;
                        ambActual = { hora: ambAlvo.hora, chuva: ambAlvo.chuva, precip: ambAlvo.precip };
                        ambEscrever(ambAmostra(ambActual.hora), ambActual.chuva, 0);
                        renderer.shadowMap.needsUpdate = true;
                        emit('ambiente', { ...ambAlvo });
                    } else ambEscrever(ambAmostra(ambActual.hora), ambActual.chuva, 0);
                }
                if (ambPulsoT0 >= 0) {
                    const t = (now - ambPulsoT0) / 1000;
                    if (t >= .2) { ambPulsoT0 = -1; ambAplicarPulso(0); }
                    else ambAplicarPulso(t < .03 ? t / .03 : Math.max(0, 1 - (t - .03) / .15));
                }
                ceuTick(now);
            }
            function dispararRaio() {
                /* RELAMPAGO cosmético (desenho base §4.3): só o pulso de
                 * céu. NÃO cai em casa nenhuma, não fere, não acende —
                 * o raio que cai é outro fenómeno (raioArena, abaixo),
                 * governado pelo desenho julgado «Raio e Fogo» de 05/11
                 * e resolvido pela casca no relógio das rondas. */
                const now = performance.now();
                if (ambTrans || now - ambUltimoRaio < 5000) return false;
                ambUltimoRaio = now; ambPulsoT0 = now;
                emit('raio', { instante: now });
                return true;
            }
            /* ---------- RAIO DE ARENA + FOGOS (desenho julgado 05/11) ----------
             * A cena só DESENHA o que a casca resolve: raioArenaVisual
             * (o raio a cair numa casa dada + clarão no impacto, dentro
             * dos tectos do pulso) e os fogos PERSISTENTES — o de casa
             * (estado de terreno) e o de pessoa (estado «A Arder»).
             * As chamas são volumes de shader com ruído a subir
             * (volta 4, 10/11; antes: volta 3 e gotas de 09/11 — ver «A FORMA DO FOGO»)
             * 09/11 — ver «A FORMA DO FOGO» junto a FOGO_DEFS), nas
             * cores do mundo (0xff631d com núcleo 0xffdf8e), em escala de incêndio —
             * maiores que qualquer tocha/fogueira, com brilho laranja
             * no chão da casa — para se lerem «casa a arder», nunca
             * «fogueira acesa» (portão de arte G-RF-06; o veredicto
             * final do aspecto é do olho do Mestre). A luz do fogo de
             * casa (0xff792b/dist 11, assinatura das tochas) NÃO casa
             * com a do ambCapturarDecor (0xff8f3f/dist 6,5): o Ambiente
             * nunca a escala. Tecto de luzes de fogo simultâneas: 4
             * (as casas seguintes ardem sem luz própria). */
            const raiosFx = [];
            const fogosCasas = new Map();
            const fogosPessoas = new Map();
            /* Forma e vida do raio — melhoria pedida pelo Mestre (09/11:
             * «tente fazer um raio mais fluido e realista»; a L9 do
             * relatório da volta 2). O canal nasce por deslocamento de
             * pontos médios: cada geração parte os segmentos em sítio
             * irregular e desvia o ponto novo, com o desvio a encolher
             * a cada geração — ziguezague grande na forma, fino no
             * detalhe, como um canal de descarga a sério. A cintilação
             * é o envelope: pulso principal forte (pico aos 70 ms),
             * quebra parcial, segundo pulso mais fraco e desvanecer
             * até aos 0,45 s; os ramos têm vida própria e morrem antes
             * do canal. A ILUMINAÇÃO não muda: luz de impacto e pulso
             * de céu guardam os picos de sempre (90 · envelope, .5 ·
             * envelope no disco, ambPulsoT0 intocado). */
            const RAIO_DURACAO = .45;          // vida total do raio, em segundos
            const RAIO_DESLOC = 2.4;           // desvio inicial do canal, em metros
            const RAIO_GERACOES = 5;           // subdivisões do canal (32 segmentos)
            const RAIO_RAMOS_MIN = 2, RAIO_RAMOS_MAX = 4;
            const RAIO_RAMO_FIM = .30;         // os ramos apagam-se aos 0,30 s
            const RAIO_ENV = [[0, 0], [.07, 1], [.13, .16], [.20, .58], [.27, .10], [RAIO_DURACAO, 0]];
            function raioEnvelope(t) {
                if (t <= 0) return 0;
                for (let i = 1; i < RAIO_ENV.length; i++) {
                    if (t <= RAIO_ENV[i][0]) {
                        const a = RAIO_ENV[i - 1], b = RAIO_ENV[i];
                        return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
                    }
                }
                return 0;
            }
            function raioCaminho(topo, base, geracoes, desloc) {
                /* Deslocamento de pontos médios: parte cada segmento num
                 * ponto irregular (35%-65%) e desvia-o até +/-desloc em x/z;
                 * o desvio multiplica-se por 0,52 a cada geração. Os
                 * extremos ficam exactos — o impacto é a casa pedida. */
                let pts = [topo.clone(), base.clone()];
                let a = desloc;
                for (let g = 0; g < geracoes; g++) {
                    const novos = [pts[0]];
                    for (let i = 1; i < pts.length; i++) {
                        const m = pts[i - 1].clone().lerp(pts[i], .35 + Math.random() * .3);
                        m.x += (Math.random() - .5) * 2 * a;
                        m.z += (Math.random() - .5) * 2 * a;
                        novos.push(m, pts[i]);
                    }
                    pts = novos;
                    a *= .52;
                }
                return pts;
            }
            function raioFita(pts, largura, dirVista, perfil) {
                const pos = [], idx = [];
                const lado = new T.Vector3(), seg = new T.Vector3();
                for (let i = 0; i < pts.length; i++) {
                    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
                    seg.subVectors(b, a);
                    lado.crossVectors(seg, dirVista);
                    if (lado.lengthSq() < 1e-6) lado.set(1, 0, 0); else lado.normalize();
                    const fitaF = perfil ? perfil(i / (pts.length - 1)) : 1;
                    lado.multiplyScalar(largura * fitaF / 2);
                    pos.push(pts[i].x - lado.x, pts[i].y - lado.y, pts[i].z - lado.z, pts[i].x + lado.x, pts[i].y + lado.y, pts[i].z + lado.z);
                    if (i > 0) { const k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
                }
                const g = new T.BufferGeometry();
                g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
                g.setIndex(idx);
                return g;
            }
            /* Perfis de largura ao longo da fita (t = 0 no topo, 1 no
             * impacto): o canal afina nas pontas e engrossa a meio; o
             * ramo afina até à ponta, como uma descarga que se esgota. */
            const raioPerfilCanal = t => .45 + .75 * Math.sin(Math.PI * t);
            const raioPerfilRamo = t => 1.05 - .85 * t;
            let FOGO_GEO = null;   // geometria da chama: única e partilhada por todos os fogos — nunca se liberta
            function raioLibertar(grupo) {
                grupo.traverse(o => {
                    if (o.geometry && o.geometry !== FOGO_GEO) o.geometry.dispose();
                    if (o.material) o.material.dispose();
                });
                if (grupo.parent) grupo.parent.remove(grupo);
            }
            function raioArenaVisual(x, z) {
                const now = performance.now();
                const bx = wx(x), bz = wz(z);
                const base = new T.Vector3(bx, world.height(bx, bz), bz);
                const topo = new T.Vector3(bx + (Math.random() - .5) * 4, 30, bz + (Math.random() - .5) * 4);
                const dir = new T.Vector3();
                camaraActiva().getWorldDirection(dir);
                const grupo = new T.Group();
                const matNucleo = new T.MeshBasicMaterial({ color: 0xf2f7ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false });
                const matHalo = new T.MeshBasicMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false });
                const matRamos = new T.MeshBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false });
                const canal = raioCaminho(topo, base, RAIO_GERACOES, RAIO_DESLOC);
                grupo.add(new T.Mesh(raioFita(canal, .17, dir, raioPerfilCanal), matNucleo));
                grupo.add(new T.Mesh(raioFita(canal, .75, dir, raioPerfilCanal), matHalo));
                /* Ramos: 2-4, nascem entre 22% e 68% da queda (nunca
                 * juntos, nunca simétricos), mais finos e curtos que o
                 * canal, com material próprio para morrerem antes dele. */
                const fracs = [];
                const nRamos = RAIO_RAMOS_MIN + Math.floor(Math.random() * (RAIO_RAMOS_MAX - RAIO_RAMOS_MIN + 1));
                while (fracs.length < nRamos) {
                    const f = .22 + Math.random() * .46;
                    if (fracs.every(o => Math.abs(o - f) > .09)) fracs.push(f);
                }
                for (const f of fracs) {
                    const origem = canal[Math.round(f * (canal.length - 1))].clone();
                    const fim = origem.clone();
                    const ang = Math.random() * Math.PI * 2, alcance = 2.5 + Math.random() * 3.5;
                    fim.x += Math.cos(ang) * alcance; fim.z += Math.sin(ang) * alcance;
                    fim.y -= 2.5 + Math.random() * 4;
                    grupo.add(new T.Mesh(raioFita(raioCaminho(origem, fim, 3, .55), .075, dir, raioPerfilRamo), matRamos));
                }
                const luz = new T.PointLight(0xd6e4ff, 0, 34, 2);
                luz.position.set(base.x, base.y + .7, base.z);
                grupo.add(luz);
                const disco = new T.Mesh(new T.CircleGeometry(1.8, 24), new T.MeshBasicMaterial({ color: 0xbdd4ff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
                disco.rotation.x = -Math.PI / 2;
                disco.position.set(base.x, base.y + .04, base.z);
                grupo.add(disco);
                scene.add(grupo);
                raiosFx.push({ t0: now, grupo, matNucleo, matHalo, matRamos, luz, disco });
                ambUltimoRaio = now; ambPulsoT0 = now;   // o clarão de céu do impacto é o pulso de sempre
                emit('raio', { instante: now });
                return true;
            }
            /* A FORMA DO FOGO — VOLTA 4 (10/11; sobre a base da volta 3 — o Mestre reprovou a
             * gota da volta 2: «tá bem fraco… não parece uma chama de
             * verdade de algo queimando» e lavrou a régua: «precisa ser
             * algo natural e realista»). A chama nasce outra vez, como
             * VOLUME DE SHADER: três planos cruzados (0°/60°/120°,
             * abertos ~9° para fora) com ruído fractal (fbm) a SUBIR —
             * a silhueta nasce larga na base, afina a tremer para cima
             * e as pontas desprendem-se em ilhas, como fogo fotografado.
             * O gradiente é o de uma chama real: núcleo amarelo-claro
             * curto na base, corpo laranja, pontas vermelho-escuras —
             * com os brilhos CAPADOS (a lição de 05/11: partículas
             * aditivas sem tecto leram «explosão branca saturada»; os
             * sprites puros leram «fogueira acesa» — aqui não há
             * sprites de chama e a soma das camadas é orçada abaixo da
             * saturação). Duas camadas: a interior (o corpo quente) e a
             * exterior (maior, mais vermelha, mais erodida — as línguas
             * de fora). A tremulação NÃO tem ritmo: vem de ruído 1D,
             * no shader e na luz — «brilho que pulsa sem ritmo certo».
             * As brasas são pontos GPU que SOBEM acima da chama, com
             * ciclo próprio por partícula (zero CPU por frame). A luz
             * de casa (0xff792b/dist 11, tecto 4) e o brilho de chão
             * ficam os de sempre — só muda a tremulação, agora por
             * ruído. Geometria ÚNICA partilhada (FOGO_GEO); por fogo só
             * mudam semente, materiais e escala. Custo por fogo: 2
             * chamadas (chamas) + 1 (brasas) + 1 (brilho) — a volta 2
             * gastava 14. A mecânica não se toca: quem acende/apaga e
             * quando é da casca, como sempre.
             * VOLTA 4 (10/11, mais tarde): o Mestre aprovou a volta 3
             * «por enquanto» e mandou crescer — a chama estava «muito
             * pequena, muito magra» — e deu ao fogo de PESSOA desenho
             * próprio: «o fogo nele… a animação dele a queimar». A
             * técnica fica (shader fbm); mudam a ESCALA e o PERFIL: a
             * casa arde maior e mais cheia (planos de ~1,95/2,43 m de
             * largura × 3,2/3,6 m de altura; meia-largura da silhueta
             * 0,68→0,14 com erosão menor no corpo e igual nas pontas)
             * e a pessoa ganha parâmetros de ENVOLVIMENTO em
             * FOGO_PARAMS (chama de 1,55/1,85 m × 2,15/2,45 m à volta
             * do corpo — LARGAS de propósito: medido nesta volta, o
             * corpo das figuras tem ~1,4 m de largura e uma chama mais
             * estreita que o corpo fica escondida dentro dele, só com
             * a base a espreitar aos pés; a esta largura as línguas
             * saem pelos lados e por cima da cabeça — lê-se uma
             * pessoa a arder sem a engolir numa fogueira). Cada
             * grupo roda pela
             * semente (ângulo de ouro): quebra o padrão repetido dos
             * planos e a estrela da base (reserva 1 da conferência). */
            function fogoGeo() {
                if (FOGO_GEO) return FOGO_GEO;
                const pos = [], uvs = [], idx = [];
                let base = 0;
                for (let k = 0; k < 3; k++) {
                    const p = new T.PlaneGeometry(1, 1, 1, 4);
                    p.translate(0, .5, 0);
                    p.rotateX(-.16);
                    p.rotateY(k * Math.PI / 3);
                    const pp = p.attributes.position, pu = p.attributes.uv, pi = p.index.array;
                    for (let i = 0; i < pp.count; i++) { pos.push(pp.getX(i), pp.getY(i), pp.getZ(i)); uvs.push(pu.getX(i), pu.getY(i)); }
                    for (let i = 0; i < pi.length; i++) idx.push(pi[i] + base);
                    base += pp.count;
                    p.dispose();
                }
                FOGO_GEO = new T.BufferGeometry();
                FOGO_GEO.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
                FOGO_GEO.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
                FOGO_GEO.setIndex(idx);
                return FOGO_GEO;
            }
            let FOGO_TEX_BRASA = null;
            function fogoTexturaBrasa() {
                if (FOGO_TEX_BRASA) return FOGO_TEX_BRASA;
                const cv = document.createElement('canvas'); cv.width = cv.height = 64;
                const cx2 = cv.getContext('2d');
                const g = cx2.createRadialGradient(32, 32, 2, 32, 32, 30);
                g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
                cx2.fillStyle = g; cx2.fillRect(0, 0, 64, 64);
                FOGO_TEX_BRASA = new T.CanvasTexture(cv);
                return FOGO_TEX_BRASA;
            }
            const FOGO_GLSL_RUIDO = [
                'float hash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
                'float vnoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
                '  float a = hash21(i); float b = hash21(i + vec2(1.0, 0.0)); float c = hash21(i + vec2(0.0, 1.0)); float d = hash21(i + vec2(1.0, 1.0));',
                '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }',
                'float fbm(vec2 p) { float v = 0.0; float amp = 0.55;',
                '  for (int i = 0; i < 4; i++) { v += amp * vnoise(p); p = p * 2.03 + vec2(17.3, 9.1); amp *= 0.5; } return v; }',
                'float n1(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f);',
                '  return mix(hash21(vec2(i, 7.7)), hash21(vec2(i + 1.0, 7.7)), f); }'
            ].join('\n');
            /* Corpo da chama em GLSL partilhado (t-veu-brilhos,
               volta 2, S2-6(c)): a MESMA conta que faz a silhueta
               da chama viva faz a do gémeo fantasma — uma só fonte,
               sem duplicação literal. fogoCorpo devolve
               vec3(corpo, d, nF); a saída do shader vivo não muda
               (as expressões são as mesmas, na mesma ordem). */
            const FOGO_VERT_CHAMA = [
                'uniform float uTempo; uniform float uSemente;',
                'varying vec2 vUv;',
                FOGO_GLSL_RUIDO,
                'void main() { vUv = uv; vec3 p = position;',
                '  float h = uv.y;',
                '  float ond = sin(h * 4.3 - uTempo * 3.1 + uSemente) * 0.6 + sin(h * 8.9 - uTempo * 5.3 + uSemente * 1.7) * 0.4;',
                '  p.x += ond * 0.055 * h * h; p.z += cos(h * 3.7 - uTempo * 2.6 + uSemente * 2.3) * 0.045 * h * h;',
                '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }'
            ].join('\n');
            const FOGO_GLSL_CORPO = [
                'vec3 fogoCorpo(vec2 uv, float t, float uSemente, float ext, float uCasa) {',
                '  float nG = fbm(vec2(uv.x * 3.0 + uSemente * 1.37, uv.y * 2.1 - t * 1.45 + uSemente * 0.71));',
                '  float nF = fbm(vec2(uv.x * 7.0 - uSemente * 0.53, uv.y * 6.0 - t * 2.7 + uSemente * 1.93));',
                        /* ORFAS DO LEDGER (11/11) - a ESTRELA da base das casas: ruido fino
                         * extra, so nas casas (uCasa) e corroendo por baixo (o termo em
                         * erode some aos 42% da altura): parte os raios direitos dos
                         * planos cruzados que desenham a estrela de 4 pontas. */
                        '  float nB = fbm(vec2(uv.x * 11.0 - uSemente * 0.71, uv.y * 9.0 - t * 3.1 + uSemente * 2.57));',
                '  float bal = (nG - 0.5) * (0.50 + 0.55 * ext) * uv.y;',
                '  float cx = abs(uv.x * 2.0 - 1.0 + bal * 2.0);',
                        '  float meiaL = mix(0.68, 0.14, pow(uv.y, 0.7)) * (1.0 - uCasa * 0.22 * (1.0 - smoothstep(0.0, 0.35, uv.y)));',  /* ORFAS: nas casas a base estreita 22% junto ao chao - raios da estrela mais curtos */
                        '  float erode = (nG - 0.5) * (0.30 + 1.10 * uv.y + 0.30 * ext) + (nF - 0.5) * 0.34 + uCasa * (nB - 0.5) * 1.35 * (1.0 - smoothstep(0.02, 0.50, uv.y));',
                '  float d = cx / max(meiaL, 0.001) + erode * 1.35;',
                '  float corpo = 1.0 - smoothstep(0.50, 1.02, d);',
                '  return vec3(corpo, d, nF); }'
            ].join('\n');
            function fogoMatChama(semente, camada, casa) {
                return new T.ShaderMaterial({
                    uniforms: { uTempo: { value: 0 }, uEnv: { value: 0 }, uSemente: { value: semente }, uCamada: { value: camada }, uCasa: { value: casa ? 1 : 0 } },
                    vertexShader: FOGO_VERT_CHAMA,
                    fragmentShader: [
                        'uniform float uTempo; uniform float uEnv; uniform float uSemente; uniform float uCamada; uniform float uCasa;',
                        'varying vec2 vUv;',
                        FOGO_GLSL_RUIDO,
                        FOGO_GLSL_CORPO,
                        'vec3 rampa(float h) {',
                        '  vec3 c = mix(vec3(0.42, 0.045, 0.008), vec3(0.85, 0.17, 0.02), smoothstep(0.0, 0.38, h));',
                        '  c = mix(c, vec3(1.0, 0.44, 0.06), smoothstep(0.38, 0.62, h));',
                        '  c = mix(c, vec3(1.0, 0.74, 0.24), smoothstep(0.62, 0.84, h));',
                        '  c = mix(c, vec3(1.0, 0.90, 0.58), smoothstep(0.92, 1.0, h));',
                        '  return c; }',
                        'void main() {',
                        '  vec2 uv = vUv;',
                        '  float t = uTempo;',
                        '  float ext = uCamada > 0.5 ? 1.0 : 0.0;',
                        '  vec3 fco = fogoCorpo(uv, t, uSemente, ext, uCasa);',
                        '  float d = fco.y;',
                        '  float corpo = fco.x;',
                        '  if (corpo <= 0.004) discard;',
                        '  float calor = clamp(1.10 - d * 0.80 - uv.y * 0.55 + (fco.z - 0.5) * 0.36 - ext * 0.22, 0.0, 1.0);',
                        '  vec3 cor = rampa(calor);',
                        '  float trem = 0.80 + 0.38 * n1(t * 2.2 + uSemente * 2.31) + 0.14 * n1(t * 6.7 + uSemente * 0.97);',
                        '  float alfa = corpo * uEnv * mix(0.85, 0.50, ext);',
                        '  float inten = mix(0.60, 0.40, ext) * trem;',
                        '  gl_FragColor = vec4(cor * inten, alfa); }'
                    ].join('\n'),
                    transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide
                });
            }
            /* GÉMEO FANTASMA DO FOGO DE CASA (volta 2, S2-6 — F1):
               a chama lembrada não arde: é a silhueta da chama no
               instante da passagem a memória, congelada (uTempo
               escrito uma vez), ao cinzento dos fantasmas
               (0x9aa7b4), blending normal, alfa = corpo × 0,45 ×
               envCongelado. Sem disco de brilho, sem luz, sem
               brasas a subir. Grupo PRÓPRIO na scene (fora de
               f.grupo): a escala congela-se na estrutura, imune ao
               deslize de escActual do vivo. */
            function fogoMatChamaFantasma(semente, camada) {
                return new T.ShaderMaterial({
                    uniforms: { uTempo: { value: 0 }, uEnv: { value: 0 }, uSemente: { value: semente }, uCamada: { value: camada } },
                    vertexShader: FOGO_VERT_CHAMA,
                    fragmentShader: [
                        'uniform float uTempo; uniform float uEnv; uniform float uSemente; uniform float uCamada;',
                        'varying vec2 vUv;',
                        FOGO_GLSL_RUIDO,
                        FOGO_GLSL_CORPO,
                        'void main() {',
                        '  vec2 uv = vUv;',
                        '  float ext = uCamada > 0.5 ? 1.0 : 0.0;',
                        '  vec3 fco = fogoCorpo(uv, uTempo, uSemente, ext, 1.0);',
                        '  float corpo = fco.x;',
                        '  if (corpo <= 0.004) discard;',
                        '  gl_FragColor = vec4(vec3(0.604, 0.655, 0.706), corpo * uEnv); }'
                    ].join('\n'),
                    transparent: true, depthWrite: false, side: T.DoubleSide
                });
            }
            function fogoCriarGeemeo(f) {
                const grupo = new T.Group();
                const mats = [];
                const matIn = fogoMatChamaFantasma(f.semente, 0); mats.push(matIn);
                const mIn = new T.Mesh(fogoGeo(), matIn);
                mIn.scale.copy(f.pecas[0].scale);
                mIn.frustumCulled = false;
                grupo.add(mIn);
                const matOut = fogoMatChamaFantasma(f.semente + 37.7, 1); mats.push(matOut);
                const mOut = new T.Mesh(fogoGeo(), matOut);
                mOut.rotation.y = Math.PI / 6;
                mOut.scale.copy(f.pecas[1].scale);
                mOut.frustumCulled = false;
                grupo.add(mOut);
                grupo.visible = false;
                return { grupo, mats };
            }
            /* Dono único da morte de um fogo de casa (S2-6(f)):
               liberta o grupo vivo E o gémeo — extinção e
               limparFogos passam os dois por aqui, e nenhum gémeo
               fica órfão na scene. */
            function fogoCasaLibertar(f) {
                raioLibertar(f.grupo);
                if (f.geemeo) { raioLibertar(f.geemeo.grupo); f.geemeo = null; }
            }
                        /* CASCA DA PESSOA A ARDER (volta 4; REFEITA na volta 5):
             * cilindro de chama À VOLTA do corpo — a ideia da volta 4
             * estava certa e o Mestre aprovou-a («a ideia ficou muito
             * top»), mas a execução lia-se um VÉU dourado: frequência
             * baixa, cor presa à altura e nenhum corte na superfície —
             * uma campânula de brilho, não chamas. A volta 5 mantém a
             * peça e muda-lhe a matéria: o MESMO campo das chamas das
             * casas (fbm a subir) amostrado à volta do corpo com
             * frequência de LÍNGUAS — cada coluna tem o seu teto, os
             * sulcos entre línguas cortam a parede (discard: por onde
             * não há chama vê-se ELA), a cor nasce do campo (núcleo
             * quente na base de cada língua, pontas vermelhas) e o
             * raio é deslocado no vértice pelo próprio ruído, mais
             * forte no topo — a silhueta deixa de ser a de um tubo e
             * passa a ser a de fogo a lamber um corpo. O ruído é
             * amostrado num domínio circular (cos/sen) para a emenda
             * do cilindro não se ver. */
            function fogoMatCasca(semente) {
                return new T.ShaderMaterial({
                    uniforms: { uTempo: { value: 0 }, uEnv: { value: 0 }, uSemente: { value: semente } },
                    vertexShader: [
                        'uniform float uTempo; uniform float uSemente;',
                        'varying vec2 vUv; varying vec3 vNormV; varying vec3 vPosV;',
                        FOGO_GLSL_RUIDO,
                        'void main() { vUv = uv; vec3 p = position;',
                        '  float ang = atan(p.z, p.x);',
                        '  vec2 an = vec2(cos(ang), sin(ang));',
                        '  float subir = uTempo * 0.85 + uSemente;',
                        '  float n = fbm(vec2(an.x * 2.2 + an.y * 1.4, uv.y * 1.7 - subir * 0.8 + an.y * 2.2));',
                        '  float n2 = fbm(vec2(an.x * 4.6 + an.y * 3.0 + 17.0, uv.y * 3.4 - subir * 1.7 + an.y * 4.6));',
                        '  float r = 1.0 + (n - 0.5) * (0.16 + 0.30 * uv.y) + (n2 - 0.5) * (0.08 + 0.14 * uv.y);',
                        '  p.x *= r; p.z *= r;',
                        '  p.x += sin(uv.y * 3.1 - uTempo * 2.2 + uSemente * 1.3) * 0.05 * uv.y * uv.y;',
                        '  p.z += cos(uv.y * 2.7 - uTempo * 1.8 + uSemente * 2.1) * 0.05 * uv.y * uv.y;',
                        '  vNormV = normalMatrix * normal;',
                        '  vec4 mv = modelViewMatrix * vec4(p, 1.0); vPosV = mv.xyz;',
                        '  gl_Position = projectionMatrix * mv; }'
                    ].join('\n'),
                    fragmentShader: [
                        'uniform float uTempo; uniform float uEnv; uniform float uSemente;',
                        'varying vec2 vUv; varying vec3 vNormV; varying vec3 vPosV;',
                        FOGO_GLSL_RUIDO,
                        'vec3 rampa(float h) {',
                        '  vec3 c = mix(vec3(0.42, 0.045, 0.008), vec3(0.85, 0.17, 0.02), smoothstep(0.0, 0.38, h));',
                        '  c = mix(c, vec3(1.0, 0.44, 0.06), smoothstep(0.38, 0.62, h));',
                        '  c = mix(c, vec3(1.0, 0.74, 0.24), smoothstep(0.62, 0.84, h));',
                        '  c = mix(c, vec3(1.0, 0.90, 0.58), smoothstep(0.92, 1.0, h));',
                        '  return c; }',
                        'void main() {',
                        '  vec2 uv = vUv;',
                        '  float t = uTempo;',
                        '  float subir = t * 0.85 + uSemente;',
                        '  float circ = uv.x * 6.28318;',
                        '  vec2 an = vec2(cos(circ), sin(circ));',
                        '  float nS = fbm(vec2(an.x * 1.6 + an.y * 1.1 + 7.3, uv.y * 1.3 - subir * 0.6 + an.y * 1.6));',
                        '  float desvio = (nS - 0.5) * 0.85 * uv.y;',
                        '  float caD = cos(desvio), saD = sin(desvio);',
                        '  vec2 anR = vec2(an.x * caD - an.y * saD, an.x * saD + an.y * caD);',
                        '  float nG = fbm(vec2(anR.x * 2.2 + anR.y * 1.4, uv.y * 1.7 - subir * 0.8 + anR.y * 2.2));',
                        '  float nM = fbm(vec2(anR.x * 3.4 + anR.y * 2.2 + 13.7, uv.y * 3.6 - subir * 1.75 + anR.y * 3.4));',
                        '  float nF = fbm(vec2(anR.x * 6.5 + anR.y * 4.2 + 41.3, uv.y * 6.5 - subir * 2.6 + anR.y * 6.5));',
                        '  float teto = 0.42 + 0.66 * nG + (nM - 0.5) * 0.44;',
                        '  float d = (uv.y - teto) * 2.4 + (0.5 - nM) * 1.70 + (0.5 - nF) * 0.40;',
                        '  float corpo = 1.0 - smoothstep(0.25, 1.05, d);',
                        '  if (corpo <= 0.004) discard;',
                        '  float sulco = smoothstep(-0.15, 0.09, (nM - 0.5) * (1.4 + 1.5 * smoothstep(0.15, 0.60, uv.y)) + (nF - 0.5) * 0.55);',
                        '  corpo *= mix(1.0, sulco, smoothstep(0.05, 0.35, uv.y));',
                        '  corpo *= 0.34 + 0.66 * smoothstep(0.0, 0.30, uv.y);',  /* ORFAS: base mais fraca e a subir devagar (0,08->0,30) - a poca de luz da base deixa de mandar na Seguir */
                        '  float dentro = clamp(-d, 0.0, 0.8);',
                        '  float calor = clamp(0.30 + nM * 0.74 + dentro * 0.30 - uv.y * 0.38 + (nF - 0.5) * 0.30, 0.0, 1.0);',
                        '  float trem = 0.82 + 0.34 * n1(t * 2.3 + uSemente * 2.31) + 0.12 * n1(t * 6.9 + uSemente * 0.97);',
                        '  float facing = abs(dot(normalize(vNormV), normalize(-vPosV)));',
                        '  corpo *= 0.72 + 0.28 * smoothstep(0.02, 0.45, facing);',
                        /* ORFAS: corte do resto translucido - o que fica abaixo de
                         * 0,16 nao soma luz nenhuma (era esse resto, somado em
                         * toda a parede, que desenhava o tubo de perto); as
                         * linguas (corpo alto) passam e ganham contraste. */
                        '  corpo = smoothstep(0.16, 0.66, corpo);',
                        '  if (corpo <= 0.004) discard;',
                        '  vec3 cor = rampa(calor);',
                        '  gl_FragColor = vec4(cor * 0.47 * trem * corpo * uEnv, 1.0);',
                        '}'
                    ].join('\n'),
                    transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.FrontSide, fog: false
                });
            }
            /* TRANCHE BRASAS (R2 da Ambiente Vivo, 11/11): a escala
             * das brasas tinha a mesma doença da chuva/neve — a
             * fórmula de `esc` pressupunha perspectiva e a câmera de
             * jogo é ortográfica, por isso TODAS as brasas viviam
             * colapsadas no mínimo de 1,2 px. Ramo uOrto (a lei da §1
             * do desenho da mãe): ortográfica → px/m do frustum
             * (uAlturaPx/uFrustumAltM); perspectiva (Livre) → a
             * fórmula antiga, que lá está certa. Os uniformes novos
             * escreve-os fogoTremular por fotograma, de
             * camaraActiva(). Só o TAMANHO muda: contagem, ciclo,
             * cores, tremulação e estágios ficam os aprovados. */
            function fogoMatBrasas(semente, altura) {
                return new T.ShaderMaterial({
                    uniforms: { uTempo: { value: 0 }, uEnv: { value: 0 }, uAltura: { value: altura }, uAlturaPx: { value: 800 }, uTamM: { value: .05 }, uFrustumAltM: { value: 9 }, uOrto: { value: 1 } },
                    vertexShader: [
                        'attribute float aSemente;',
                        'uniform float uTempo; uniform float uAltura; uniform float uAlturaPx; uniform float uTamM; uniform float uFrustumAltM; uniform float uOrto;',
                        'varying float vCiclo; varying float vSem;',
                        'void main() { vSem = aSemente;',
                        '  float vel = 0.10 + fract(aSemente * 7.13) * 0.11;',
                        '  float ciclo = fract(uTempo * vel + aSemente * 11.7);',
                        '  vCiclo = ciclo;',
                        '  vec3 p = position;',
                        '  float enc = 1.0 - ciclo * 0.45;',
                        '  p.x *= enc; p.z *= enc;',
                        '  p.y = ciclo * uAltura;',
                        '  p.x += sin(uTempo * 1.9 + aSemente * 43.7 + p.y * 1.3) * 0.05 * (0.4 + ciclo);',
                        '  p.z += cos(uTempo * 1.6 + aSemente * 31.9 + p.y * 1.1) * 0.05 * (0.4 + ciclo);',
                        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
                        '  float dist = max(0.1, -mv.z);',
                        '  float esc = (uOrto > 0.5) ? uAlturaPx / max(0.1, uFrustumAltM) : uAlturaPx * 0.5 * projectionMatrix[1][1] / dist;',
                        '  gl_PointSize = clamp(uTamM * (0.7 + fract(aSemente * 3.31) * 0.8) * (1.0 - ciclo * 0.45) * esc, 1.2, 42.0);',
                        '  gl_Position = projectionMatrix * mv; }'
                    ].join('\n'),
                    fragmentShader: [
                        'uniform float uTempo; uniform float uEnv;',
                        'varying float vCiclo; varying float vSem;',
                        FOGO_GLSL_RUIDO,
                        'void main() {',
                        '  vec2 pc = gl_PointCoord - vec2(0.5);',
                        '  float r = length(pc) * 2.0;',
                        '  float a = smoothstep(1.0, 0.1, r);',
                        '  float cint = 0.65 + 0.6 * n1(uTempo * 3.1 + vSem * 51.0);',
                        '  vec3 cor = mix(vec3(1.0, 0.60, 0.16), vec3(0.70, 0.14, 0.02), vCiclo);',
                        '  float alfa = a * pow(1.0 - vCiclo, 1.25) * uEnv * cint;',
                        '  if (alfa <= 0.004) discard;',
                        '  gl_FragColor = vec4(cor, alfa); }'
                    ].join('\n'),
                    transparent: true, depthWrite: false, blending: T.AdditiveBlending
                });
            }
            function ruidoJS(x) {
                const i = Math.floor(x), fr = x - i, s = fr * fr * (3 - 2 * fr);
                const h = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
                return h(i) + (h(i + 1) - h(i)) * s;
            }
            /* VOLTA 4 — parâmetros por tipo. A técnica é a mesma
             * (shader fbm da volta 3); o que se separa é a ESCALA e a
             * presença: a casa arde como incêndio de chão (chama larga
             * e alta, maior que a casa onde nasce); a pessoa arde
             * ENVOLVIDA — chama à volta do corpo, à escala dela, a
             * subir por ela, sem a engolir. Larguras/alturas/brasas
             * multiplicam a `escala` da chamada (casa 1,5 · pessoa 1). */
            /* CASCA POR-TAMANHO (tranche ORFAS DO LEDGER, 11/11 - reserva
             * A-14 da REF_47): a casca e os planos da pessoa nasceram a
             * medida da heroina de referencia (a Ong, alturaMetros 2,625
             * em jogo.js). A escala de cada figura le-se de u.size - a
             * alturaMetros validada em addUnit, a MESMA que escala o
             * modelo GLB de forma uniforme (razao pela qual o racio de
             * alturas e tambem o racio de larguras das figuras GLB).
             * Para a Ong a escala e exactamente 1: as MEDIDAS do fogo
             * da volta 5 ficam as mesmas nela. Tecto 2,00 de sanidade
             * (a validacao admite 0-15 m). Piso 0,75 de LEITURA, medido
             * no Lobo (marcador de 1,35 m): a 0,51 a casca (raio da base
             * 0,49 m) fica DENTRO do corpo dele (meia-profundidade
             * 0,70 m) e o fogo quase nao se le; a 0,75 o raio (0,71 m)
             * despega do corpo e a chama le-se outra vez. */
            const FOGO_ALT_REF = 2.625;
            function fogoEscFigura(u) {
                const e = (u && Number.isFinite(u.size) ? u.size : FOGO_ALT_REF) / FOGO_ALT_REF;
                return Math.min(2.00, Math.max(0.75, e));
            }
            const FOGO_PARAMS = {
                casa:   { largIn: 1.30, altIn: 2.15, largOut: 1.62, altOut: 2.40, brasas: 30, raioB: .45, sobem: 2.9, luzAlt: 1.05 },
                pessoa: { largIn: 1.55, altIn: 2.15, largOut: 1.85, altOut: 2.45, brasas: 20, raioB: .50, sobem: 2.9, luzAlt: .8 }
            };
            /* ESTÁGIOS DA CASA A ARDER (emenda pela palavra do
             * Mestre, 10/11/2026 17:45): a chama MOSTRA a idade da
             * casa — turno 1 FORTE (a chama da volta 4, intocada:
             * escala 1,00) · turno 2 MÉDIO (0,70 da altura/largura)
             * · turno 3 FRACO (0,40 — um foguinho baixo a tremer).
             * Brasas (contagem por drawRange), brilho de chão e luz
             * acompanham para baixo na mesma tabela. Quem conta a
             * idade é a casca (jogo.js); aqui só se pinta o estágio
             * pedido por definirEstagioFogoCasa, com transição
             * suave da escala no grupo. O fogo da PESSOA não tem
             * estágios: continua o de sempre. */
            const FOGO_ESTAGIOS = {
                1: { esc: 1.00, brasas: 1.00, brilho: 1.00, luz: 1.00 },
                2: { esc: 0.70, brasas: 0.55, brilho: 0.60, luz: 0.65 },
                3: { esc: 0.40, brasas: 0.25, brilho: 0.35, luz: 0.40 }
            };
            function fogoCriarGrupo(escala, comLuz, tipo) {
                const grupo = new T.Group();
                const semente = Math.random() * 100;
                const P = FOGO_PARAMS[tipo === 'pessoa' ? 'pessoa' : 'casa'];
                const mats = [];
                const matIn = fogoMatChama(semente, 0, tipo !== 'pessoa'); mats.push(matIn);
                const mIn = new T.Mesh(fogoGeo(), matIn);
                mIn.scale.set(P.largIn * escala, P.altIn * escala, P.largIn * escala);
                mIn.frustumCulled = false;
                grupo.add(mIn);
                const matOut = fogoMatChama(semente + 37.7, 1, tipo !== 'pessoa'); mats.push(matOut);
                const mOut = new T.Mesh(fogoGeo(), matOut);
                mOut.rotation.y = Math.PI / 6;   /* a camada de fora roda 30° sobre a de dentro:
                 * os planos desencontrados dissolvem a estrela de pontas da base */
                mOut.scale.set(P.largOut * escala, P.altOut * escala, P.largOut * escala);
                mOut.frustumCulled = false;
                grupo.add(mOut);
                if (tipo === 'pessoa') {
                    /* a casca cilíndrica que envolve o corpo (ver fogoMatCasca);
                     * geometria própria por grupo — liberta-se com ele */
                    const casca = new T.Mesh(new T.CylinderGeometry(0.66, 0.95, 2.5, 24, 5, true), fogoMatCasca(semente + 71.3));
                    casca.scale.set(escala, escala, escala);   /* ORFAS A-14: a casca acompanha a escala da figura (antes era fixa) */
                    casca.position.y = 1.25 * escala;
                    casca.frustumCulled = false;
                    mats.push(casca.material);
                    grupo.add(casca);
                }
                /* brasas GPU: nascem na base, sobem acima da chama,
                 * encolhem e apagam-se — ciclo por partícula, no shader */
                const nB = P.brasas;
                const posB = new Float32Array(nB * 3), semB = new Float32Array(nB);
                for (let i = 0; i < nB; i++) {
                    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * P.raioB * escala;
                    posB[i * 3] = Math.cos(a) * r; posB[i * 3 + 1] = 0; posB[i * 3 + 2] = Math.sin(a) * r;
                    semB[i] = Math.random() * 100;
                }
                const geoB = new T.BufferGeometry();
                geoB.setAttribute('position', new T.BufferAttribute(posB, 3));
                geoB.setAttribute('aSemente', new T.BufferAttribute(semB, 1));
                const matB = fogoMatBrasas(semente, P.sobem * escala);
                const pontos = new T.Points(geoB, matB);
                pontos.frustumCulled = false;
                grupo.add(pontos);
                let luz = null;
                if (comLuz) {
                    luz = new T.PointLight(0xff792b, 0, 11, 2);
                    luz.position.set(0, P.luzAlt * escala, 0);
                    grupo.add(luz);
                }
                grupo.rotation.y = semente * 2.39996;   /* ângulo de ouro × semente: cada fogo com a sua
                 * orientação — quebra o padrão repetido dos planos cruzados */
                return { grupo, luz, matsChama: mats, brasasMat: matB, semente, pontosB: pontos, nBrasas: nB, pecas: [mIn, mOut, pontos] };
            }
            function fogoTremular(f, env, now) {
                const ts = now / 1000;
                for (const m of f.matsChama) { m.uniforms.uTempo.value = ts; m.uniforms.uEnv.value = env; }
                if (f.brasasMat) {
                    f.brasasMat.uniforms.uTempo.value = ts;
                    f.brasasMat.uniforms.uEnv.value = env;
                    f.brasasMat.uniforms.uAlturaPx.value = renderer.domElement.height || 800;
                    const camB = camaraActiva();
                    f.brasasMat.uniforms.uOrto.value = camB.isOrthographicCamera ? 1 : 0;
                    f.brasasMat.uniforms.uFrustumAltM.value = camB.isOrthographicCamera ? (camB.top - camB.bottom) : 1;
                }
                if (f.luz) {
                    const tr = ruidoJS(ts * 2.3 + f.semente) * .62 + ruidoJS(ts * 6.3 + f.semente * 1.7) * .38;
                    f.luz.intensity = 6.6 * env * (f.fatorLuz == null ? 1 : f.fatorLuz) * (0.70 + 0.58 * tr);
                }
            }
            function acenderFogoCasa(x, z) {
                const chave = x + ',' + z;
                const existente = fogosCasas.get(chave);
                if (existente) { existente.apagar = 0; return; }
                const bx = wx(x), bz = wz(z);
                const comLuz = [...fogosCasas.values()].filter(f => f.luz).length < 4;
                const f = fogoCriarGrupo(1.5, comLuz, 'casa');
                f.grupo.position.set(bx, world.height(bx, bz), bz);
                const brilho = new T.Mesh(new T.CircleGeometry(1.02, 24), new T.MeshBasicMaterial({ map: fogoTexturaBrasa(), color: 0xff7a26, transparent: true, opacity: .26, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
                brilho.rotation.x = -Math.PI / 2;
                brilho.position.y = .05;
                f.grupo.add(brilho);
                f.brilho = brilho;
                f.t0 = performance.now(); f.apagar = 0;
                f.estagio = 1; f.escAlvo = 1; f.escActual = 1; f.fatorLuz = 1; f.fatorBrilho = 1;
                f.pecas.push(brilho);
                f.estadoVisao = veuNunca.has(chave) ? 'nunca' : veuMemoria.has(chave) ? 'memoria' : 'vista';
                f.vistoAArder = f.estadoVisao === 'vista';
                f.ocultoVisao = f.estadoVisao !== 'vista';
                if (f.ocultoVisao) for (const p of f.pecas) p.visible = false;
                f.geemeo = fogoCriarGeemeo(f);
                scene.add(f.grupo);
                scene.add(f.geemeo.grupo);
                fogosCasas.set(chave, f);
                /* Pré-compilação do programa do gémeo (S2-6(d)):
                   visível só dentro desta chamada síncrona —
                   nenhum frame é apresentado entre os dois estados,
                   e a primeira entrada em memória não compila. */
                f.geemeo.grupo.visible = true;
                try { renderer.compile(scene, camaraActiva()); } catch (_) {}
                f.geemeo.grupo.visible = false;
            }
            function apagarFogoCasa(x, z) {
                const f = fogosCasas.get(x + ',' + z);
                if (f && !f.apagar) f.apagar = performance.now();
            }
            /* Pinta o estágio da idade (emenda 10/11): guarda os
             * alvos da tabela FOGO_ESTAGIOS; a escala do grupo
             * desce suave no ciclo de animação (raioActualizar) e
             * as brasas cortam-se já por drawRange. Chamada só na
             * criação e em cada virada de ronda — nunca por frame. */
            function definirEstagioFogoCasa(x, z, estagio) {
                const f = fogosCasas.get(x + ',' + z);
                if (!f) return;
                const E = FOGO_ESTAGIOS[estagio] || FOGO_ESTAGIOS[1];
                f.estagio = estagio;
                f.escAlvo = E.esc; f.fatorLuz = E.luz; f.fatorBrilho = E.brilho;
                if (f.pontosB) f.pontosB.geometry.setDrawRange(0, Math.max(1, Math.round((f.nBrasas || 0) * E.brasas)));
            }
            function setUnidadeAArder(id, on) {
                const existente = fogosPessoas.get(id);
                if (on) {
                    if (existente) return;
                    const u = units.get(id);
                    if (!u || !u.root) return;
                    const f = fogoCriarGrupo(fogoEscFigura(u), false, 'pessoa');   /* ORFAS A-14: escala pela altura da figura */
                    f.escFigura = fogoEscFigura(u);
                    f.t0 = performance.now();
                    u.root.add(f.grupo);
                    fogosPessoas.set(id, f);
                } else if (existente) {
                    raioLibertar(existente.grupo);
                    fogosPessoas.delete(id);
                }
            }
            function limparFogos() {
                for (const f of fogosCasas.values()) fogoCasaLibertar(f);
                fogosCasas.clear();
                for (const f of fogosPessoas.values()) raioLibertar(f.grupo);
                fogosPessoas.clear();
            }
            function raioActualizar(now) {
                for (let i = raiosFx.length - 1; i >= 0; i--) {
                    const fx = raiosFx[i], t = (now - fx.t0) / 1000;
                    if (t >= RAIO_DURACAO) { raioLibertar(fx.grupo); raiosFx.splice(i, 1); continue; }
                    const e = raioEnvelope(t);
                    fx.matNucleo.opacity = .95 * e;
                    fx.matHalo.opacity = .30 * e;
                    if (fx.matRamos) {
                        const fr = t < .16 ? 1 : Math.max(0, (RAIO_RAMO_FIM - t) / (RAIO_RAMO_FIM - .16));
                        fx.matRamos.opacity = .55 * e * fr;
                    }
                    fx.luz.intensity = 90 * e;
                    fx.disco.material.opacity = .5 * e;
                }
                for (const [chave, f] of fogosCasas) {
                    let envVida = Math.min(1, (now - f.t0) / 150);
                    if (f.apagar) envVida = Math.min(envVida, Math.max(0, 1 - (now - f.apagar) / 400));
                    f.envVidaUltimo = envVida;
                    if (f.apagar && envVida <= 0) { fogoCasaLibertar(f); fogosCasas.delete(chave); continue; }
                    const envDesenho = f.ocultoVisao ? 0 : envVida;
                    /* a escala do estágio desce suave: a chama
                     * encolhe a olhos vistos na virada de ronda,
                     * sem salto (emenda 10/11) */
                    if (f.escActual == null) f.escActual = 1;
                    const escAlvoF = f.escAlvo == null ? 1 : f.escAlvo;
                    f.escActual += (escAlvoF - f.escActual) * 0.06;
                    if (Math.abs(escAlvoF - f.escActual) < 0.003) f.escActual = escAlvoF;
                    f.grupo.scale.setScalar(f.escActual);
                    fogoTremular(f, envDesenho, now);
                    if (f.brilho) f.brilho.material.opacity = .20 * envDesenho * (f.fatorBrilho == null ? 1 : f.fatorBrilho) * (.75 + .4 * ruidoJS(now / 1000 * 2.6 + f.semente));
                }
                for (const f of fogosPessoas.values())
                    fogoTremular(f, Math.min(1, (now - f.t0) / 150), now);
            }
            function ambReaplicar() { if (ambDerivados) ambEscrever(ambAmostra(ambActual.hora), ambActual.chuva, 0); }
            let width = 1, height = 1, selected = null, mode = 'fixa', quality = 'alta', disposed = false, raf, last = performance.now(), fps = 0, fpsAt = last, frames = 0, shadowAt = 0, yaw = 0, pitch = 1.05, viewWidth = 20, primeiraVista = true;
            /* Offset de OLHAR deste aparelho (t-config-abas, SPEC §6.2):
               azimute somado ao ângulo base da câmera de batalha quando
               as teclas Q/E rodam a vista. Vive SÓ nesta closure: não
               entra em getState/getStats, não é estado de jogo, não se
               grava em save nem em localStorage — e nunca toca na
               frente das personagens nem no campo de visão (o véu
               deriva da frente delas, não da câmera). */
            let olharYaw = 0;
            const zoom = { fixa: 1.5, seguir: 1, '360': 1 }, units = new Map(), events = new EventTarget(), times = [];
            /* ---------- CÂMERA LIVRE DO MESTRE (tranche t-camera-livre, desenho v2) ----------
             * Primeira pessoa dentro da arena, com a mecânica da sala/museu
             * copiada valor a valor (olhar 0,0045 rad/px · andar 4,2 u/s ·
             * vertical 3,0 u/s · Shift ×2,2 · multiplicador 1×/2×/4×).
             * O estado de andar vive aqui, ao lado do ciclo animate — é lá
             * que estão o dt, o world.height e os clamps — como na sala é
             * o ciclo que anda com o ctrl. A câmera do jogo (ortográfica)
             * NUNCA é tocada por este modo: a segunda câmera (cameraLivre,
             * perspectiva 50 · 0,1–400, os números da sala) assume o render
             * e as projecções só enquanto mode === 'livre', através de
             * camaraActiva() — o único ponto de troca. Sair é voltar à
             * ortográfica congelada: exacto por construção. */
            const ctrlLivre = { pos: new T.Vector3(0, 1.6, 4.9), yaw: 0, pitch: 0, joyX: 0, joyY: 0, sobe: 0, teclas: {} };
            let velLivre = 1;
            const camaraActiva = () => mode === 'livre' ? cameraLivre : camera;
            const livreRound = v => Math.round(v * 100) / 100;
            let presentation = null;
            const emit = (type, detail) => events.dispatchEvent(new CustomEvent(type, { detail })), publicUnit = u => ({ id: u.id, nome: u.nome, posicao: { x: u.x, y: u.z }, altitude: u.altitude, vivo: u.vivo });
            const requireUnit = id => {
                if (!units.has(id))
                    throw new RangeError('Figura desconhecida.');
                return units.get(id);
            };
            const material = (color, opacity = 1) => new T.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false, side: T.DoubleSide });
            function ring(radius, color, opacity = 1) {
                const m = new T.Mesh(new T.RingGeometry(radius * .85, radius, 32), material(color, opacity));
                m.rotation.x = -Math.PI / 2;
                scene.add(m);
                return m;
            }
            const destination = ring(.65, 0xffd28b), hover = ring(.64, 0xfff0bf);
            destination.visible = hover.visible = false;
            const moveLayer = new T.Group();
            let movementCells = [];
            scene.add(moveLayer);
            const gridPoints = [];
            for (let i = 0; i <= area.cols; i++) {
                const x = (i - area.cols / 2) * CELL;
                gridPoints.push(x, .025, -area.rows * CELL / 2, x, .025, area.rows * CELL / 2);
            }
            for (let j = 0; j <= area.rows; j++) {
                const z = (j - area.rows / 2) * CELL;
                gridPoints.push(-area.cols * CELL / 2, .025, z, area.cols * CELL / 2, .025, z);
            }
            const grid = new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(gridPoints, 3)), new T.LineBasicMaterial({ color: 0xc9c2a7, transparent: true, opacity: .3 }));
            grid.visible = false;
            scene.add(grid);
            function mark(mesh, p) {
                if (!p) {
                    mesh.visible = false;
                    return;
                }
                valid(p);
                mesh.visible = true;
                mesh.position.set(wx(p.x), world.height(wx(p.x), wz(p.z)) + .045, wz(p.z));
            }
            function showMovement(cells = []) {
                cells = cells.filter(p => { try { valid(p); return true; } catch { return false; } });
                movementCells = cells.map(p => ({x:p.x,z:p.z}));
                release(moveLayer);
                moveLayer.clear();
                const vertices = [], lines = [];
                for (const p of cells) {
                    const x = wx(p.x), z = wz(p.z), s = CELL * .47, y = world.height(x, z) + .035, a = [x - s, y, z - s], b = [x + s, y, z - s], c = [x + s, y, z + s], d = [x - s, y, z + s];
                    vertices.push(...a, ...d, ...b, ...b, ...d, ...c);
                    lines.push(...a, ...b, ...b, ...c, ...c, ...d, ...d, ...a);
                }
                moveLayer.add(new T.Mesh(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(vertices, 3)), material(0xcab577, .5)));
                moveLayer.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(lines, 3)), new T.LineBasicMaterial({ color: 0xf5d59b, transparent: true, opacity: .85 })));
            }
            /* ═══ Tranche PRÉVIA v2, passo ④: a primitiva mínima da
               prévia. NECESSIDADE MEDIDA: showMovement pinta todas as
               células com o mesmo preenchimento e o mesmo contorno
               (0xcab577) — não distingue caminho, contorno de
               obstáculo, nem marca de alvo, e não desenha segmento
               nenhum; setCamadas é o substrato dos modos de visão.
               A prévia precisa das três coisas distintas ao mesmo
               tempo, logo uma camada própria, no molde de moveLayer:
                 caminho    — as casas da travessia em azul-água
                              translúcido (a família da técnica de
                              água dela; distinto do amarelo do Mover);
                 segmento   — a linha centro-a-centro atacante→alvo,
                              inteira, nunca truncada;
                 obstaculos — SÓ os médios: contorno âmbar no chão,
                              sem preenchimento (a cobertura total
                              nunca chega aqui — EM-S-21: sem sinal);
                 alvo       — anel duplo vermelho, maior que o anel
                              de selecção: sinal próprio.
               showPrevia(null) limpa. É overlay de desenho: quem
               decide pintá-lo é a casca (quem mira, localmente; o
               Mestre, quando a prévia alheia lhe chega pela ponte
               de saves — EMENDA Q-02/REF_79); às outras jogadoras
               a casca nunca o entrega. As células chegam em
               coordenadas de vista ({x, z}), como em showMovement. */
            const previaLayer = new T.Group();
            scene.add(previaLayer);
            function showPrevia(spec) {
                release(previaLayer);
                previaLayer.clear();
                if (!spec) return;
                const quad = (p, dy) => {
                    const x = wx(p.x), z = wz(p.z), s = CELL * .47, y = world.height(x, z) + dy;
                    return { v: [x - s, y, z - s, x - s, y, z + s, x + s, y, z - s, x + s, y, z - s, x - s, y, z + s, x + s, y, z + s],
                             l: [x - s, y, z - s, x + s, y, z - s, x + s, y, z - s, x + s, y, z + s, x + s, y, z + s, x - s, y, z + s, x - s, y, z + s, x - s, y, z - s] };
                };
                const vertices = [], linhasCaminho = [];
                for (const p of spec.caminho || []) { const q = quad(p, .04); vertices.push(...q.v); linhasCaminho.push(...q.l); }
                if (vertices.length) previaLayer.add(new T.Mesh(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(vertices, 3)), material(0x2e7fb8, .30)));
                if (linhasCaminho.length) previaLayer.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(linhasCaminho, 3)), new T.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: .9 })));
                const linhasObst = [];
                for (const p of spec.obstaculos || []) { const q = quad(p, .055); linhasObst.push(...q.l); }
                if (linhasObst.length) previaLayer.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(linhasObst, 3)), new T.LineBasicMaterial({ color: 0xffb52e, transparent: true, opacity: .95 })));
                if (spec.de && spec.alvo) {
                    const ax = wx(spec.de.x), az = wz(spec.de.z), bx = wx(spec.alvo.x), bz = wz(spec.alvo.z);
                    const seg = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(
                        [ax, world.height(ax, az) + .07, az, bx, world.height(bx, bz) + .07, bz], 3));
                    previaLayer.add(new T.Line(seg, new T.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: .95 })));
                    for (const r of [.60, .44]) {
                        const anel = ring(r, 0xff4747);
                        anel.position.set(bx, world.height(bx, bz) + .05, bz);
                        previaLayer.add(anel);
                    }
                }
            }
            /* EMENDA Q-02/REF_79 (R-Q02-1) — primitiva de FRENTE:
               a frente de uma figura (pivot.rotation.y, a mesma que
               getStats().models[].frente lê em graus e que move/
               apresentarAtaque escrevem ao andar/confrontar) ganha
               escritor/leitor directos, para a casca poder virar a
               personagem para o alvo durante a prévia e repor a
               frente — sem inventar movimento nem apresentação.
               setFrente exige ângulo finito (radianos); getFrente
               devolve o ângulo cru actual. Figura desconhecida:
               requireUnit lança, como nas outras primitivas. */
            function setFrente(id, frenteRad) {
                if (!Number.isFinite(frenteRad))
                    throw new RangeError('Frente: ângulo finito obrigatório (radianos).');
                const u = requireUnit(id);
                u.pivot.rotation.y = frenteRad;
                renderer.shadowMap.needsUpdate = true;
                return u.pivot.rotation.y;
            }
            function getFrente(id) { return requireUnit(id).pivot.rotation.y; }
            function animation(u, walking) {
                playClip(u, walking ? u.clips.andar : u.clips.idle);
            }
            function playClip(u, name, duration) {
                if (!u.mixer || !u.vivo)
                    return;
                if (u.actionName === name)
                    return;
                const clip = T.AnimationClip.findByName(u.animations, name);
                if (!clip)
                    return;
                const next = u.mixer.clipAction(clip);
                next.reset().setLoop(duration ? T.LoopOnce : T.LoopRepeat, duration ? 1 : Infinity);
                next.clampWhenFinished = !!duration;
                next.setEffectiveTimeScale(duration ? clip.duration / duration : 1).fadeIn(.15).play();
                if (u.action)
                    u.action.fadeOut(.15);
                u.action = next;
                u.actionName = name;
            }
            const moving = u => !!(u.step || u.queue.length);
            const angleDelta = (from, to) => Math.atan2(Math.sin(to-from), Math.cos(to-from));
            function finishPresentation() {
                const p = presentation;
                if (!p) return;
                presentation = null;
                if (p.started) for (const [u, angle] of [[p.a,p.angleA],[p.b,p.angleB]]) {
                    u.root.position.set(wx(u.x),world.height(wx(u.x),wz(u.z))+u.altitude,wz(u.z));
                    u.pivot.rotation.y = angle;
                    animation(u, moving(u));
                }
                renderer.shadowMap.needsUpdate = true;
                p.resolve();
            }
            function cancelFor(u) {
                if (presentation && (presentation.a === u || presentation.b === u)) finishPresentation();
            }
            function apresentarAtaque(idAtacante, idAlvo) {
                // Validação síncrona inteira antes de cancelar ou alterar qualquer coisa.
                const a = requireUnit(idAtacante), b = requireUnit(idAlvo);
                if (a === b || !a.vivo || !b.vivo || (a.x === b.x && a.z === b.z))
                    throw new RangeError('Confronto exige duas figuras vivas em casas distintas.');
                finishPresentation();
                return new Promise(resolve => { presentation = {a,b,resolve,started:false,t:0}; });
            }
            function updatePresentation(dt) {
                const p = presentation;
                if (!p) return;
                if (!p.started) {
                    if (moving(p.a) || moving(p.b)) return;
                    const dx=wx(p.b.x)-wx(p.a.x), dz=wz(p.b.z)-wz(p.a.z), distance=Math.hypot(dx,dz);
                    // Movimentos confirmados podem ter acabado na mesma casa. Não há frente.
                    if (!distance) { finishPresentation(); return; }
                    Object.assign(p,{started:true,angleA:Math.atan2(dx,dz),angleB:Math.atan2(-dx,-dz),fromA:p.a.pivot.rotation.y,fromB:p.b.pivot.rotation.y,dx:dx/distance,dz:dz/distance,lunge:Math.min(.45,Math.max(0,distance-CELL*.51))});
                }
                p.t += dt;
                const turn=clamp(p.t/.2,0,1), ease=turn*turn*(3-2*turn);
                p.a.pivot.rotation.y=p.fromA+angleDelta(p.fromA,p.angleA)*ease;
                p.b.pivot.rotation.y=p.fromB+angleDelta(p.fromB,p.angleB)*ease;
                if (p.t < .2) return;
                const t=p.t-.2;
                if (!p.gesture) { p.gesture=true; if(p.a.clips.ataque)playClip(p.a,p.a.clips.ataque,.36); }
                if (t>=.18 && !p.reaction) { p.reaction=true; if(p.b.clips.reacao)playClip(p.b,p.b.clips.reacao,.32); }
                if (!p.a.clips.ataque) {
                    const d=Math.sin(Math.PI*clamp(t/.36,0,1))*p.lunge;
                    p.a.root.position.x=wx(p.a.x)+p.dx*d;p.a.root.position.z=wz(p.a.z)+p.dz*d;
                } else if (t>=.36) animation(p.a,false);
                if (!p.b.clips.reacao) {
                    const d=Math.sin(Math.PI*clamp((t-.18)/.32,0,1))*.20;
                    p.b.root.position.x=wx(p.b.x)+p.dx*d;p.b.root.position.z=wz(p.b.z)+p.dz*d;
                }
                if (t>=.5) finishPresentation();
            }
            function pose(u) {
                u.root.position.set(wx(u.x), world.height(wx(u.x), wz(u.z)) + u.altitude, wz(u.z));
                if (!u.vivo)
                    u.altitude = 0;
                u.pivot.rotation.z = u.vivo ? 0 : Math.PI / 2;
                u.pivot.position.y = 0;
                if (!u.vivo) {
                    u.mixer?.stopAllAction();
                    u.actionName = null;
                    u.root.position.y = world.height(wx(u.x), wz(u.z));
                    u.root.updateMatrixWorld(true);
                    const b = new T.Box3().setFromObject(u.pivot);
                    if (!b.isEmpty())
                        u.pivot.position.y += u.root.position.y - b.min.y + .03;
                }
                else
                    animation(u, false);
                renderer.shadowMap.needsUpdate = true;
            }
            // Recurso visual: preserva a unidade e usa os mesmos marcadores locais.
            function addMarker(u) {
                // Pedra mate, independente da cor de identificação do anel.
                u.markerTint = u.model === 'marcador-lobo' ? 0x777b79 : 0x817c73;
                const m = new T.MeshLambertMaterial({ color: C(u.markerTint) });
                if (u.model === 'marcador-lobo') {
                    const body = new T.Mesh(new T.IcosahedronGeometry(1, 1), m);
                    body.scale.set(.3, u.size * .5, .7);
                    body.position.y = u.size * .5;
                    u.pivot.add(body);
                }
                else {
                    const body = new T.Mesh(new T.CylinderGeometry(.22, .38, u.size * .68, 8), m);
                    body.position.y = u.size * .34;
                    u.pivot.add(body);
                    const head = new T.Mesh(new T.IcosahedronGeometry(u.size * .14, 1), m);
                    head.position.y = u.size * .86;
                    u.pivot.add(head);
                }
                u.pivot.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
            }
            async function addUnit(data) {
                for (const key of Object.keys(data))
                    if (!UNIT_KEYS.has(key))
                        throw new TypeError('Campo não permitido: ' + key);
                if (typeof data.id !== 'string' || !data.id || units.has(data.id) || typeof data.nome !== 'string' || !data.nome.trim() || data.nome.length > 100)
                    throw new TypeError('Identidade inválida/duplicada.');
                valid({ x: data.x, z: data.y, altitude: data.altitude });
                if (!Number.isFinite(data.alturaMetros) || data.alturaMetros <= 0 || data.alturaMetros > 15 || typeof data.vivo !== 'boolean')
                    throw new TypeError('Altura e vivo obrigatórios.');
                if (data.animacoes) {
                    for (const [k, v] of Object.entries(data.animacoes))
                        if (!['idle', 'andar', 'ataque', 'reacao'].includes(k) || typeof v !== 'string')
                            throw new TypeError('Declaração de animação inválida.');
                }
                const model = data.modelo || 'marcador';
                if (typeof model !== 'string')
                    throw new TypeError('Modelo inválido.');
                if (!['marcador', 'marcador-lobo'].includes(model)) {
                    const url = new URL(model, location.href);
                    if (url.origin !== location.origin || !url.pathname.endsWith('.glb'))
                        throw new TypeError('GLB local obrigatório.');
                }
                const root = new T.Group(), pivot = new T.Group();
                root.add(pivot);
                scene.add(root);
                const label = document.createElement('span');
                label.className = 'nome';
                label.textContent = data.nome;
                labels.appendChild(label);
                const u = { id: data.id, nome: data.nome, x: data.x, z: data.y, altitude: data.altitude ?? 0, vivo: data.vivo, root, pivot, label, size: data.alturaMetros, queue: [], step: null, clips: { idle: data.animacoes?.idle, andar: data.animacoes?.andar, ataque:data.animacoes?.ataque, reacao:data.animacoes?.reacao }, animations: [], removed: false, oculto: false, model };
                const tint = [0x87b4b0, 0xe5bb74, 0xb98b9d, 0xb5c3ce, 0xb7b77c][units.size % 5];
                u.ring = ring(.56, tint);
                u.contact = new T.Mesh(new T.CircleGeometry(.5, 24), material(0x080c12, .3));
                u.contact.rotation.x = -Math.PI / 2;
                scene.add(u.contact);
                u.tether = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, 1, 0)]), new T.LineDashedMaterial({ color: 0xffdc94, dashSize: .22, gapSize: .08, transparent: true, opacity: 1, depthTest: false }));
                u.tether.computeLineDistances();
                scene.add(u.tether);
                units.set(u.id, u);
                pose(u);
                if (!selected)
                    select(u.id);
                try {
                    if (model.endsWith('.glb')) {
                        let gltf;
                        try {
                            gltf = await new T.GLTFLoader().loadAsync(model);
                        } catch (_) {
                            if (disposed || u.removed) return;
                            u.loadError = 'Não foi possível mostrar o modelo de ' + u.nome + '. A figura está representada por um marcador.';
                            u.clips = {}; // Sem rig: a apresentação usa avanço/recuo.
                            addMarker(u);
                            pose(u);
                            emit('modelerror', { id: u.id, message: u.loadError });
                            return publicUnit(u);
                        }
                        if (disposed || u.removed) {
                            release(gltf.scene);
                            return;
                        }
                        gltf.scene.updateMatrixWorld(true);
                        const b = new T.Box3().setFromObject(gltf.scene), s = b.getSize(new T.Vector3()), center = b.getCenter(new T.Vector3());
                        gltf.scene.scale.setScalar(data.alturaMetros / s.y);
                        gltf.scene.position.set(-center.x, -b.min.y, -center.z).multiplyScalar(data.alturaMetros / s.y);
                        pivot.add(gltf.scene);
                        u.animations = gltf.animations;
                        for (const n of Object.values(u.clips))
                            if (n && !gltf.animations.some(a => a.name === n))
                                throw new RangeError('Clipe declarado não existe.');
                        if (gltf.animations.length) {
                            u.mixer = new T.AnimationMixer(gltf.scene);
                            animation(u, false);
                        }
                    }
                    else {
                        addMarker(u);
                    }
                    pivot.traverse(o => {
                        if (o.isMesh) {
                            o.castShadow = true;
                            o.receiveShadow = true;
                        }
                    });
                    pose(u);
                    return publicUnit(u);
                }
                catch (e) {
                    if (units.has(u.id))
                        removeUnit(u.id);
                    emit('error', { message: 'Falha no modelo local: ' + model });
                    throw e;
                }
            }
            function removeUnit(id) {
                const u = requireUnit(id);
                cancelFor(u);
                u.removed = true;
                u.mixer?.stopAllAction();
                u.mixer?.uncacheRoot(u.mixer.getRoot());
                for (const obj of [u.root, u.ring, u.contact, u.tether]) {
                    scene.remove(obj);
                    release(obj);
                }
                u.label.remove();
                units.delete(id);
                if (selected === id) {
                    selected = units.keys().next().value ?? null;
                    if (selected)
                        select(selected);
                }
                renderer.shadowMap.needsUpdate = true;
            }
            function select(id) {
                const u = requireUnit(id);
                selected = id;
                units.forEach(v => v.label.classList.toggle('ativa', v.id === id));
                emit('select', publicUnit(u));
            }
            function move(id, p, opts = {}) {
                const u = requireUnit(id);
                valid(p);
                const altitude = p.altitude ?? u.altitude;
                let path = opts.path ? opts.path.map(c => ({ x: c.x, z: c.z, altitude: c.altitude ?? altitude })) : [{ x: p.x, z: p.z, altitude }];
                if (!opts.path && opts.route === 'L') {
                    path = [];
                    let x = u.x, z = u.z;
                    while (x !== p.x) {
                        x += Math.sign(p.x - x);
                        path.push({ x, z, altitude });
                    }
                    while (z !== p.z) {
                        z += Math.sign(p.z - z);
                        path.push({ x, z, altitude });
                    }
                    if (!path.length)
                        path = [{ ...p, altitude }];
                }
                path.forEach(valid);
                if (!path.length)
                    throw new RangeError('Caminho vazio.');
                const end = path[path.length - 1];
                if (end.x !== p.x || end.z !== p.z)
                    throw new RangeError('Caminho não termina no destino.');
                const ms = opts.durationMs !== undefined ? opts.durationMs / path.length : opts.stepMs ?? 180;
                if (!Number.isFinite(ms) || ms < 1)
                    throw new RangeError('Duração positiva obrigatória.');
                cancelFor(u);
                u.queue = [];
                u.step = null;
                if (opts.immediate) {
                    u.x = p.x;
                    u.z = p.z;
                    u.altitude = altitude;
                    pose(u);
                    emit('moveend', publicUnit(u));
                    return;
                }
                u.queue = path.map(c => ({ ...c, ms }));
                mark(destination, p);
                animation(u, true);
            }
            function setCamera(value) {
                if (!['fixa', 'seguir', '360', 'livre'].includes(value))
                    throw new RangeError('Câmera inválida.');
                mode = value;
                if (value === 'livre') {
                    /* Entrada fixa (desenho v2 §5): à beira sul do círculo,
                       olhos a 1,6 do chão, a olhar para o centro — semeada
                       com o olharPara da sala (posição fixa + alvo, donde
                       saem yaw e pitch). NÃO chama setZoom: a livre não
                       tem zoom ortográfico nem slot no objecto zoom. */
                    ctrlLivre.pos.set(0, world.height(0, 4.9) + 1.6, 4.9);
                    const d = new T.Vector3(0 - ctrlLivre.pos.x, 1.3 - ctrlLivre.pos.y, 0 - ctrlLivre.pos.z).normalize();
                    ctrlLivre.pitch = Math.asin(clamp(d.y, -1, 1));
                    ctrlLivre.yaw = Math.atan2(-d.x, -d.z);
                    ctrlLivre.joyX = ctrlLivre.joyY = 0;
                    ctrlLivre.sobe = 0;
                    ctrlLivre.teclas = {};
                    cameraLivre.aspect = width / height;
                    cameraLivre.updateProjectionMatrix();
                    aplicarCamaraLivre();
                } else setZoom(zoom[mode]);
                emit('camera', { camera: mode });
            }
            /* aplicarCamaraLivre = o aplicarCamara da sala, sem tirar nem pôr. */
            function aplicarCamaraLivre() {
                cameraLivre.position.copy(ctrlLivre.pos);
                const cp = Math.cos(ctrlLivre.pitch);
                const dir = new T.Vector3(-Math.sin(ctrlLivre.yaw) * cp, Math.sin(ctrlLivre.pitch), -Math.cos(ctrlLivre.yaw) * cp);
                cameraLivre.lookAt(ctrlLivre.pos.clone().add(dir));
            }
            /* O passo de andar: a matemática do ciclo da sala (manípulo +
               teclas → (mx, mz) normalizado · frente/direita só do yaw no
               plano do chão · 4,2 u/s · vertical 3,0 u/s separada), com o
               dt do jogo (preso a 0,08). TRANCHE PEDRAS/CÂMERA
               (10/11/2026, palavra do Mestre — «fico travado dentro do
               círculo; isso nunca deveria existir»): a prisão da
               arena + 3 m do desenho v2 §6 MORREU. A livre anda pelo
               terreno inteiro; os únicos limites são de sanidade
               técnica — bordas na orla do plano do mundo (±175 m; o
               plano tem 360 m), chão medido pela altura do chão que
               se vê (world.alturaVisivel = mundo + relevo) + 0,4 a
               cada quadro (andar não pede altura, mas o chão empurra
               para cima: nunca se enterra) e tecto de 45 m (~6× a
               cota mais alta do terreno, ~7,2 m). Sem colisão, de
               propósito (§6). */
            function passoAndarLivre(dt) {
                const t = ctrlLivre.teclas;
                let mx = ctrlLivre.joyX + ((t['d'] || t['arrowright']) ? 1 : 0) - ((t['a'] || t['arrowleft']) ? 1 : 0);
                let mz = ctrlLivre.joyY + ((t['s'] || t['arrowdown']) ? 1 : 0) - ((t['w'] || t['arrowup']) ? 1 : 0);
                const mm = Math.hypot(mx, mz); if (mm > 1) { mx /= mm; mz /= mm; }
                if (mx || mz) {
                    const s = Math.sin(ctrlLivre.yaw), c = Math.cos(ctrlLivre.yaw), vel = 4.2 * velLivre * (t['shift'] ? 2.2 : 1);
                    ctrlLivre.pos.x += (c * mx + s * mz) * vel * dt;
                    ctrlLivre.pos.z += (c * mz - s * mx) * vel * dt;
                    ctrlLivre.pos.x = clamp(ctrlLivre.pos.x, -175, 175);
                    ctrlLivre.pos.z = clamp(ctrlLivre.pos.z, -175, 175);
                }
                const sobe = ctrlLivre.sobe + ((t['e'] || t['pageup']) ? 1 : 0) - ((t['q'] || t['pagedown']) ? 1 : 0);
                if (sobe) ctrlLivre.pos.y += sobe * 3.0 * velLivre * dt;
                const alturaSolo = world.alturaVisivel ? world.alturaVisivel(ctrlLivre.pos.x, ctrlLivre.pos.z) : world.height(ctrlLivre.pos.x, ctrlLivre.pos.z);
                ctrlLivre.pos.y = clamp(ctrlLivre.pos.y, alturaSolo + .4, 45);
            }
            function baseWidth() {
                if (mode === 'seguir')
                    return width < height ? 14.4 : 13.5;
                if (mode === 'fixa' && width < height)
                    return Math.max(area.rows * CELL * 1.44, area.cols * CELL * Math.sin(.72) * 1.44 * width / Math.max(150, height - 110));
                return Math.max(area.cols * CELL * 1.25, area.rows * CELL * Math.sin(1.12) * 1.25 * width / Math.max(150, height - 110));
            }
            function zoomRange() {
                return { min: .45, max: baseWidth() / (mode === 'seguir' ? 3 : 4.5) };
            }
            function setZoom(v) {
                if (!Number.isFinite(v))
                    throw new TypeError('Zoom finito obrigatório.');
                if (mode === 'livre') return;   // na livre não há zoom ortográfico: valida o número e é inerte — não escreve, não emite
                const r = zoomRange();
                zoom[mode] = clamp(v, r.min, r.max);
                emit('zoom', { zoom: zoom[mode], ...r });
            }
            function setQualidade(q) {
                if (!['alta', 'media', 'baixa'].includes(q))
                    throw new RangeError('Qualidade inválida.');
                quality = q;
                /* Perfis de qualidade (spec P8 — BAIXO/MÉDIO/ALTO):
                   ALTA = resolução até 2×, sombras, cenário inteiro;
                   MÉDIA = resolução até 1,5×, sombras ligadas,
                   cenário a 72%; BAIXA = resolução 1×, sem sombras,
                   cenário a 45%. A HUD é DOM: nenhum perfil a
                   encolhe nem lhe muda o contraste. */
                renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q === 'alta' ? 2 : q === 'media' ? 1.5 : 1));
                renderer.shadowMap.enabled = q !== 'baixa';
                sun.castShadow = q !== 'baixa';
                world.quality(q);
                if (world.recomputarPedras) world.recomputarPedras(veuNunca, veuMemoria);
                ambReaplicar();
                resize();
                renderer.shadowMap.needsUpdate = true;
                emit('quality', { qualidade: q });
            }
            function resize() {
                const r = container.getBoundingClientRect();
                width = Math.max(1, r.width);
                height = Math.max(1, r.height);
                renderer.setSize(width, height, false);
                ceuCam.aspect = width / height;
                ceuCam.updateProjectionMatrix();
                if (mode === 'livre') {
                    cameraLivre.aspect = width / height;
                    cameraLivre.updateProjectionMatrix();
                } else setZoom(zoom[mode]);
            }
            const observer = new ResizeObserver(resize);
            observer.observe(container);
            const screen = v => {
                const p = v.clone().project(camaraActiva());
                return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2, depth: p.z };
            };
            function unitRect(u, precise = false) {
                const box = new T.Box3();
                if (precise) {
                    // Projeção de diagnóstico mede a pele na pose atual. O HUD mantém
                    // envelope barato: não percorre dezenas de milhares de vértices/frame.
                    u.root.updateMatrixWorld(true);
                    const v = new T.Vector3();
                    u.pivot.traverse(o => {
                        if (!o.isMesh) return;
                        if (o.isSkinnedMesh) o.skeleton.update();
                        const p = o.geometry.attributes.position;
                        for (let i=0;i<p.count;i++) {
                            v.fromBufferAttribute(p,i);
                            if (o.isSkinnedMesh) o.boneTransform(i,v);
                            box.expandByPoint(v.applyMatrix4(o.matrixWorld));
                        }
                    });
                } else box.setFromObject(u.pivot);
                if (box.isEmpty())
                    return null;
                const r = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
                for (const x of [box.min.x, box.max.x])
                    for (const y of [box.min.y, box.max.y])
                        for (const z of [box.min.z, box.max.z]) {
                            const p = screen(new T.Vector3(x, y, z));
                            r.left = Math.min(r.left, p.x);
                            r.right = Math.max(r.right, p.x);
                            r.top = Math.min(r.top, p.y);
                            r.bottom = Math.max(r.bottom, p.y);
                        }
                return r;
            }
            function hit(clientX, clientY) {
                const rect = renderer.domElement.getBoundingClientRect(), sx = clientX - rect.left, sy = clientY - rect.top, hits = [];
                units.forEach(u => {
                    if (u.oculto)
                        return;
                    const b = unitRect(u);
                    if (b && sx >= b.left && sx <= b.right && sy >= b.top && sy <= b.bottom)
                        hits.push({ id: u.id, distance: camaraActiva().position.distanceTo(u.root.position) });
                });
                hits.sort((a, b) => a.distance - b.distance);
                ray.setFromCamera(new T.Vector2(sx / width * 2 - 1, 1 - sy / height * 2), camaraActiva());
                const point = ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), new T.Vector3());
                let cell = null;
                if (point) {
                    const x = Math.floor(point.x / CELL + area.cols / 2) + area.origin.x, z = Math.floor(point.z / CELL + area.rows / 2) + area.origin.y;
                    try {
                        valid({ x, z });
                        cell = { x, z };
                    }
                    catch {
                    }
                }
                return { unitId: hits[0]?.id ?? null, cell };
            }
            function state() {
                return { area: JSON.parse(JSON.stringify(area)), selected, camera: mode, zoom: mode === 'livre' ? null : zoom[mode], zoomRange: mode === 'livre' ? null : zoomRange(), livre: mode === 'livre' ? { pos: [livreRound(ctrlLivre.pos.x), livreRound(ctrlLivre.pos.y), livreRound(ctrlLivre.pos.z)], yaw: livreRound(ctrlLivre.yaw), pitch: livreRound(ctrlLivre.pitch) } : null, gridVisible: grid.visible, qualidade: quality, moving: [...units.values()].some(u => u.step || u.queue.length), units: [...units.values()].map(publicUnit) };
            }
            function stats() {
                return { movementCells:movementCells.map(p=>({...p})), presentation:presentation ? {attacker:presentation.a.id,target:presentation.b.id,phase:!presentation.started?'waiting':presentation.t<.2?'turn':'gesture'} : null, hoverVisible: hover.visible, destinationVisible: destination.visible, reachableCells: (moveLayer.children[0]?.geometry.attributes.position.count ?? 0)/6, fps, triangles: renderer.info.render.triangles, totalTriangles: count(scene), drawCalls: renderer.info.render.calls, ceuCalls: ceuDelta.calls, ceuTriangles: ceuDelta.triangles, dpr: renderer.getPixelRatio(), width, height, visibleWidthMeters: viewWidth, cellPixels: CELL / viewWidth * width, shadowSize: renderer.shadowMap.enabled ? 512 : 0, areaMeters: { width: area.cols * CELL, height: area.rows * CELL }, models: [...units.values()].map(u => ({ id:u.id, frente:((T.MathUtils.radToDeg(u.pivot.rotation.y)%360)+360)%360, drawOffset:{x:u.root.position.x-wx(u.x),y:u.root.position.y-world.height(wx(u.x),wz(u.z))-u.altitude,z:u.root.position.z-wz(u.z)}, modelo:u.model, loadError:u.loadError ?? null, triangles:count(u.pivot), markerTint:u.markerTint ?? null, skins:(()=>{const skins=new Set();u.pivot.traverse(o=>{if(o.isSkinnedMesh)skins.add(o.skeleton.bones.map(b=>b.uuid).join(','))});return skins.size})(), action:u.actionName ?? null, actionTime:u.action?.time ?? null, clips:u.animations.map(a=>a.name), clipDurations:u.animations.map(a=>({name:a.name,duration:a.duration})) })), animations: { idle: [...units.values()].filter(u => u.mixer && u.actionName === u.clips.idle).length, walk: [...units.values()].filter(u => u.mixer && u.actionName === u.clips.andar).length, advancing: [...units.values()].filter(u => u.mixer && u.mixer.time > 0).length } };
            }
            function animate(now) {
                if (disposed)
                    return;
                raf = requestAnimationFrame(animate);
                const dt = Math.min(.08, Math.max(0, (now - last) / 1000));
                last = now;
                if (document.hidden)
                    return;
                let dirty = !!presentation;
                updatePresentation(dt);
                raioActualizar(now);
                units.forEach(u => {
                    if (!u.step && u.queue.length) {
                        u.step = { ...u.queue.shift(), t: 0, from: u.root.position.clone() };
                        const dx = wx(u.step.x) - u.root.position.x, dz = wz(u.step.z) - u.root.position.z;
                        if (dx || dz)
                            u.pivot.rotation.y = Math.atan2(dx, dz);
                    }
                    if (u.step) {
                        dirty = true;
                        const s = u.step;
                        s.t = Math.min(1, s.t + dt * 1000 / s.ms);
                        u.root.position.lerpVectors(s.from, new T.Vector3(wx(s.x), world.height(wx(s.x), wz(s.z)) + s.altitude, wz(s.z)), s.t);
                        if (s.t === 1) {
                            u.x = s.x;
                            u.z = s.z;
                            u.altitude = s.altitude;
                            u.step = null;
                            emit('step', publicUnit(u));
                            if (!u.queue.length) {
                                animation(u, false);
                                destination.visible = false;
                                emit('moveend', publicUnit(u));
                                renderer.shadowMap.needsUpdate = true;
                            }
                        }
                    }
                    if (u.mixer && u.vivo) {
                        u.mixer.update(dt);
                        dirty = true;
                    }
                    const x = u.root.position.x, z = u.root.position.z, ground = world.height(x, z), alt = u.root.position.y - ground;
                    u.ring.position.set(x, u.root.position.y + .035, z);
                    u.contact.position.set(x, ground + .018, z);
                    u.contact.scale.setScalar(1 + alt * .12);
                    u.contact.material.opacity = (alt > .3 ? .62 : .35) / (1 + alt * .035);
                    u.tether.position.set(x, ground + .04, z);
                    u.tether.scale.y = Math.max(0, alt);
                    u.tether.visible = alt > .3;
                    if (u.oculto) { u.ring.visible = u.contact.visible = u.tether.visible = false; }
                });
                world.update(now / 1000);
                if (dirty && now - shadowAt > 100) {
                    renderer.shadowMap.needsUpdate = true;
                    shadowAt = now;
                }
                if (mode === 'livre') {
                    /* Câmera livre: o bloco da ortográfica NÃO corre — a
                       câmera do jogo fica congelada e intacta (é isso que
                       torna a saída exacta) e a névoa fica com os últimos
                       valores (135/285: dentro da arena tudo está a menos
                       de ~20 u do andarilho, sem névoa por cima de nada).
                       Em vez disso: o passo de andar e a câmera de dentro. */
                    passoAndarLivre(dt);
                    aplicarCamaraLivre();
                } else {
                const followed = units.get(selected), want = (mode === 'fixa' || !followed) ? new T.Vector3(0, .35, 0) : followed.root.position.clone().add(new T.Vector3(0, .8, 0));
                target.lerp(want, 1 - Math.exp(-dt * 7));
                const p = mode === '360' ? pitch : mode === 'seguir' ? 1 : width < height ? .72 : 1.12, a = (mode === '360' ? yaw : mode === 'fixa' && width < height ? Math.PI / 2 : 0) + olharYaw, distance = Math.max(45, extent * 2);
                camera.position.set(target.x + Math.sin(a) * Math.cos(p) * distance, target.y + Math.sin(p) * distance, target.z + Math.cos(a) * Math.cos(p) * distance);
                camera.lookAt(target);
                if (primeiraVista) {
                    viewWidth = baseWidth() / zoom[mode];
                    primeiraVista = false;
                }
                viewWidth = T.MathUtils.lerp(viewWidth, baseWidth() / zoom[mode], 1 - Math.exp(-dt * 10));
                camera.left = -viewWidth / 2;
                camera.right = viewWidth / 2;
                camera.top = viewWidth * height / width / 2;
                camera.bottom = -camera.top;
                const hudShift = viewWidth / width * (mode === 'seguir' ? 20 : 36);
                camera.top -= hudShift;
                camera.bottom -= hudShift;
                camera.updateProjectionMatrix();
                camera.updateMatrixWorld();
                scene.fog.near = distance + 90;
                scene.fog.far = distance + 240;
                }
                ambTick(now);
                ambQuadro(now, dt);
                let ambFogD0 = null;
                if (ambNevoaExtra > 0 && scene.fog && typeof scene.fog.density === 'number') { ambFogD0 = scene.fog.density; scene.fog.density = ambFogD0 + ambNevoaExtra; }
                try { ceuRenderizar(); } finally { if (ambFogD0 !== null) scene.fog.density = ambFogD0; }
                const boxes = [];
                const bodies = [...units.values()].filter(u => !u.oculto).map(u => unitRect(u)).filter(Boolean);
                for (const u of [...units.values()].sort((a, b) => (b.id === selected) - (a.id === selected))) {
                    if (u.oculto) { u.label.hidden = true; continue; }
                    const p = screen(u.root.position.clone().add(new T.Vector3(0, u.vivo ? u.size + .18 : .55, 0))), hw = Math.min(120, u.nome.length * 3.2 + 10), candidates = [];
                    for (const dx of [0, -55, 55, -95, 95])
                        for (const dy of [0, -28, 28, -56, 56])
                            candidates.push({ x: p.x + dx, y: p.y + dy, cost: dx * dx + dy * dy });
                    candidates.sort((a, b) => a.cost - b.cost);
                    const best = candidates.find(p => p.x > hw && p.x < width - hw && p.y > 24 && p.y < height - 90 && !bodies.some(b => p.x + hw > b.left - 2 && p.x - hw < b.right + 2 && p.y > b.top - 2 && p.y - 22 < b.bottom + 2) && !boxes.some(b => p.x + hw > b.l && p.x - hw < b.r && p.y > b.t && p.y - 22 < b.b));
                    u.label.hidden = !best || p.depth < -1 || p.depth > 1;
                    if (best) {
                        boxes.push({ l: best.x - hw, r: best.x + hw, t: best.y - 22, b: best.y });
                        u.label.style.transform = `translate(${best.x}px,${best.y}px) translate(-50%,-100%)`;
                    }
                }
                frames++;
                times.push(now);
                if (times.length > 3600)
                    times.shift();
                if (now - fpsAt > 1000) {
                    fps = frames * 1000 / (now - fpsAt);
                    frames = 0;
                    fpsAt = now;
                    emit('stats', stats());
                }
            }
            function on(type, fn) {
                const listener = e => fn(e.detail);
                events.addEventListener(type, listener);
                return () => events.removeEventListener(type, listener);
            }
            const contextLost = e => {
                e.preventDefault();
                emit('error', { message: 'Contexto gráfico perdido. Atualize a página.' });
            };
            renderer.domElement.addEventListener('webglcontextlost', contextLost);
            /* [VÉU-BRILHOS v2] Estado do véu declarado ANTES da
               chamada ao setQualidade: ela lê veuNunca/veuMemoria
               (recomputarPedras) e corre durante o create, antes
               do bloco do véu — TDZ apanhado no diag5 de 11/11
               («Cannot access 'veuNunca' before initialization»,
               que o jogo mostrava como «WebGL indisponível»). */
            let veuNunca = new Set(), veuMemoria = new Set(), veuEscondidas = new Set();
            const veuChavesIgnoradas = [];
            const veuTemposCamadas = [];
            setQualidade(options.qualidade || 'alta');
            raf = requestAnimationFrame(animate);
            /* ---------- MODOS DE VISÃO (integração): verbos aditivos ----------
               Porta dos verbos da página de referência dos modos de
               imersão (construcao-modos), sem os adereços de ensaio:
               oculto por figura (os 5 objectos), véus por casa e os
               fantasmas da lembrança. Nada aqui decide — quem manda é
               a casca (jogo.js), pela secção «Visão» do Mestre. */
            const veilLayer = new T.Group();
            scene.add(veilLayer);
            /* ---------- VÉU SUAVE (tranche «fora os quadrados») ----------
               Até à REF_61 o véu era um quad plano por casa: o mosaico de
               quadrados duros que o Mestre reprovou a 2026-11-11 («tira
               completamente a imersão»). Cada camada passa a ser UMA
               folha contínua sobre a arena, com uma máscara em canvas à
               escala da casa: branca nas casas da camada, desfocada
               (caixa separável, 2 passagens, bordas presas) e re-mapeada
               para o ponto de 50% ficar sobre a fronteira entre casas e
               o interior escondido voltar à intensidade cheia. Os
               conjuntos de casas, as cores e as opacidades são os de
               sempre — quem decide é a casca; aqui só se desenha. */
            const VEU_PX = 16;        /* px de máscara por casa */
            const VEU_RAIO = 6;       /* raio do desfoque ≈ 0,38 casa */
            function veuDesfoque(src, w, h) {
                /* uma passagem de caixa separável sobre valores 0..255,
                   com as bordas presas (índices apertados à margem) */
                const r = VEU_RAIO, n = 2 * r + 1;
                const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
                const cx = v => v < 0 ? 0 : v >= w ? w - 1 : v;
                const cy = v => v < 0 ? 0 : v >= h ? h - 1 : v;
                for (let y = 0; y < h; y++) {
                    const lin = y * w;
                    let s = 0;
                    for (let k = -r; k <= r; k++) s += src[lin + cx(k)];
                    for (let x = 0; x < w; x++) {
                        tmp[lin + x] = s / n;
                        s += src[lin + cx(x + r + 1)] - src[lin + cx(x - r)];
                    }
                }
                for (let x = 0; x < w; x++) {
                    let s = 0;
                    for (let k = -r; k <= r; k++) s += tmp[cy(k) * w + x];
                    for (let y = 0; y < h; y++) {
                        out[y * w + x] = s / n;
                        s += tmp[cy(y + r + 1) * w + x] - tmp[cy(y - r) * w + x];
                    }
                }
                return out;
            }
            function veuMascara(cells) {
                const W = area.cols, H = area.rows, S = VEU_PX, w = W * S, h = H * S;
                const cv = document.createElement('canvas');
                cv.width = w;
                cv.height = h;
                const ctx = cv.getContext('2d');
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, w, h);
                ctx.fillStyle = '#fff';
                let alguma = false;
                for (const p of cells || []) {
                    try { valid(p); } catch { continue; }
                    alguma = true;
                    ctx.fillRect((p.x - area.origin.x) * S, (p.z - area.origin.y) * S, S, S);
                }
                if (!alguma)
                    return null;
                const img = ctx.getImageData(0, 0, w, h);
                let m = new Float32Array(w * h);
                for (let i = 0; i < w * h; i++) m[i] = img.data[i * 4];
                m = veuDesfoque(veuDesfoque(m, w, h), w, h);
                const d = img.data;
                for (let i = 0; i < w * h; i++) {
                    let v = (m[i] / 255 - .15) / .70;
                    v = v < 0 ? 0 : v > 1 ? 1 : v;
                    const b = Math.round(v * 255);
                    d[i * 4] = b;
                    d[i * 4 + 1] = b;
                    d[i * 4 + 2] = b;
                    d[i * 4 + 3] = 255;
                }
                ctx.putImageData(img, 0, 0);
                const tex = new T.CanvasTexture(cv);
                tex.generateMipmaps = false;
                tex.minFilter = T.LinearFilter;
                tex.magFilter = T.LinearFilter;
                return tex;
            }
            function veuFolha() {
                /* malha em grelha sobre a arena inteira, cada vértice à
                   altura real do terreno: segue o relevo sem degraus */
                const cols = area.cols, rows = area.rows, pos = [], uv = [], idx = [];
                const x0 = wx(area.origin.x) - CELL / 2, z0 = wz(area.origin.y) - CELL / 2;
                for (let iz = 0; iz <= rows; iz++) for (let ix = 0; ix <= cols; ix++) {
                    const X = x0 + ix * CELL, Z = z0 + iz * CELL;
                    pos.push(X, world.height(X, Z) + .06, Z);
                    uv.push(ix / cols, 1 - iz / rows);
                }
                for (let iz = 0; iz < rows; iz++) for (let ix = 0; ix < cols; ix++) {
                    const a = iz * (cols + 1) + ix, b = a + 1, c = a + cols + 1, dd = c + 1;
                    idx.push(a, c, b, b, c, dd);
                }
                const g = new T.BufferGeometry();
                g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
                g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
                g.setIndex(idx);
                return g;
            }
            /* ---------- O VÉU SOBRE O MUNDO (t-veu-brilhos) ----------
               Volta 1 (palavra do Mestre, 11/11/2026 12:26):
               «Esconde também o que brilha na zona escondida.»
               Volta 2 (emenda 11/11 12:59; sentença JUIZ-VOLTA2,
               itens S2-1…S2-15): o véu trata o MUNDO INTEIRO por
               casa — nunca vista: nada do mundo aparece; lembrada:
               tudo como lembrança, ao tom dos fantasmas; vista:
               tudo normal. Os estados derivam por NOME de chave em
               setCamadas ({total, nunca} → veuNunca · {memoria} →
               veuMemoria · veuEscondidas = união, para os fogos) e
               os tratamentos são TOTAIS: reaplicados por inteiro a
               cada chamada, incluindo null. Os conjuntos nascem
               vazios: ao arrancar, tudo à vista (A6). */
            const brasaCasa = (v, origem, n) => Math.round(v / CELL + (n - 1) / 2) + origem;
            const pecasFogueiraRegisto = (world.pecasFogueira || []).map(mesh => ({ mesh, chave: brasaCasa(mesh.position.x, area.origin.x, area.cols) + ',' + brasaCasa(mesh.position.z, area.origin.y, area.rows), mat: mesh.material, sombra: mesh.castShadow }));
            const veuEstadoCasa = chave => veuNunca.has(chave) ? 'nunca' : veuMemoria.has(chave) ? 'memoria' : 'vista';
            /* Regra geral anti-D3 para luzes de área (S2-7): o
               factor é 1 se ALGUMA casa vista tiver o centro dentro
               do raio da luz; a memória não conta como vista. */
            function veuFactorLuzVista(px, pz, R) {
                for (let x = area.origin.x; x < area.origin.x + area.cols; x++) for (let z = area.origin.y; z < area.origin.y + area.rows; z++) {
                    const chave = x + ',' + z;
                    if (veuNunca.has(chave) || veuMemoria.has(chave)) continue;
                    const dx = wx(x) - px, dz = wz(z) - pz;
                    if (dx * dx + dz * dz <= R * R) return 1;
                }
                return 0;
            }
            function veuAplicarBraseiros() {
                let mudou = false;
                for (const r of veuBraseirosReg) {
                    const est = veuEstadoCasa(r.chave);
                    r.b.fatorVisao = veuFactorLuzVista(r.ax, r.az, 11);
                    r.factorDecor = veuFactorLuzVista(r.ax, r.az, 6.5);
                    if (est !== r.estado) {
                        r.estado = est; mudou = true;
                        r.b.chamas.forEach((m, jj) => { m.material = est === 'memoria' ? ghostMat : r.mats[jj]; });
                    }
                }
                if (mudou) ambReaplicar();
            }
            function veuAplicarMundo() {
                for (const r of pecasFogueiraRegisto) {
                    const est = veuEstadoCasa(r.chave);
                    if (est === 'nunca') r.mesh.visible = false;
                    else if (est === 'memoria') { r.mesh.visible = true; r.mesh.material = ghostMat; r.mesh.castShadow = false; }
                    else { r.mesh.visible = true; r.mesh.material = r.mat; r.mesh.castShadow = r.sombra; }
                }
                if (world.recomputarPedras) world.recomputarPedras(veuNunca, veuMemoria);
                for (const [chave, f] of fogosCasas) {
                    const est = veuEstadoCasa(chave), anterior = f.estadoVisao || 'vista';
                    if (est === 'vista') f.vistoAArder = true;
                    if (est === 'memoria' && anterior !== 'memoria' && f.geemeo && f.vistoAArder) {
                        /* Snapshot da passagem a memória (S2-6(b)):
                           tempo, escala e envelope congelados uma
                           vez; sem vistoAArder não há snapshot nem
                           gémeo (D4). */
                        const tCong = performance.now() / 1000, envCong = f.envVidaUltimo == null ? 1 : f.envVidaUltimo;
                        for (const m of f.geemeo.mats) { m.uniforms.uTempo.value = tCong; m.uniforms.uEnv.value = .45 * envCong; }
                        f.geemeo.grupo.position.copy(f.grupo.position);
                        f.geemeo.grupo.rotation.y = f.grupo.rotation.y;
                        f.geemeo.grupo.scale.setScalar(f.escActual == null ? 1 : f.escActual);
                    }
                    f.estadoVisao = est;
                    f.ocultoVisao = est !== 'vista';
                    for (const p of f.pecas || []) p.visible = est === 'vista';
                    if (f.geemeo) f.geemeo.grupo.visible = est === 'memoria' && !!f.vistoAArder;
                }
                const novoFactorH = veuFactorLuzVista(0, 0, 8);
                if (novoFactorH !== veuFactorHearth) { veuFactorHearth = novoFactorH; ambReaplicar(); }
                veuAplicarBraseiros();
                if (world.veuMotes) {
                    world.veuMotes.nunca.clear(); for (const c of veuNunca) world.veuMotes.nunca.add(c);
                    world.veuMotes.memoria.clear(); for (const c of veuMemoria) world.veuMotes.memoria.add(c);
                }
            }
            /* Janela de prova da bancada (S2-13/S2-14): o estado do
               véu e do mundo, item a item, para a varredura. */
            function getVeuEstado() {
                const tempos = [...veuTemposCamadas].sort((a, b) => a - b);
                return {
                    nunca: [...veuNunca], memoria: [...veuMemoria], chavesIgnoradas: [...veuChavesIgnoradas], factorHearth: veuFactorHearth,
                    temposCamadas: { n: tempos.length, p95: tempos.length ? tempos[Math.min(tempos.length - 1, Math.floor(tempos.length * .95))] : 0, lista: veuTemposCamadas.slice(-40).map(v => Math.round(v * 100) / 100) },
                    pecas: pecasFogueiraRegisto.map(r => ({ chave: r.chave, visivel: r.mesh.visible, fantasma: r.mesh.material === ghostMat, sombra: r.mesh.castShadow })),
                    fogos: [...fogosCasas.entries()].map(([chave, f]) => ({ chave, estado: f.estadoVisao, vistoAArder: !!f.vistoAArder, geemeoVisivel: !!(f.geemeo && f.geemeo.grupo.visible), geemeoNaCena: !!(f.geemeo && f.geemeo.grupo.parent) })),
                    braseiros: veuBraseirosReg.map(r => ({ chave: r.chave, estado: r.estado, fatorVisao: r.b.fatorVisao, factorDecor: r.factorDecor })),
                    motes: world.veuMotes ? { nunca: world.veuMotes.nunca.size, memoria: world.veuMotes.memoria.size } : null,
                    pedras: world.pedrasDiagnostico ? world.pedrasDiagnostico() : null,
                    decor: ambDecor ? { luzes: ambDecor.luzes.map(d => ({ braseiro: d.braseiro })), sprites: ambDecor.sprites.map(d => ({ braseiro: d.braseiro, tipo: d.tipo, visivel: d.o.visible })) } : null
                };
            }
            function setCamadas(defs) {
                const t0Cam = performance.now();
                /* Derivação por chaves validadas (S2-1), em TODOS
                   os caminhos, antes de qualquer return: {total,
                   nunca, memoria} é o conjunto fechado — outra
                   chave é ignorada para os estados do mundo e fica
                   registada em veuChavesIgnoradas. defs null/{} →
                   conjuntos vazios (Zero, Parcial, pré-vista
                   desligada, vista normal: tudo à vista). */
                const novoNunca = new Set(), novoMemoria = new Set();
                if (defs) for (const nome of Object.keys(defs)) {
                    const def = defs[nome];
                    if (nome !== 'total' && nome !== 'nunca' && nome !== 'memoria') { if (!veuChavesIgnoradas.includes(nome)) veuChavesIgnoradas.push(nome); continue; }
                    const alvo = nome === 'memoria' ? novoMemoria : novoNunca;
                    for (const p of def.cells || []) { try { valid(p); } catch { continue; } alvo.add(p.x + ',' + p.z); }
                }
                veuNunca = novoNunca; veuMemoria = novoMemoria;
                veuEscondidas = new Set([...novoNunca, ...novoMemoria]);
                veuAplicarMundo();
                /* E2: as sombras recozinham em TODOS os caminhos,
                   incluindo o null — fantasmas do mundo não lançam
                   sombra e peças restauradas voltam a lançar. */
                renderer.shadowMap.needsUpdate = true;
                release(veilLayer);
                veilLayer.clear();
                if (defs) for (const def of Object.values(defs)) {
                    const tex = veuMascara(def.cells);
                    if (!tex)
                        continue;
                    const mat = new T.MeshBasicMaterial({ color: def.cor, transparent: true, opacity: def.opacidade, alphaMap: tex, depthWrite: false, side: T.DoubleSide });
                    veilLayer.add(new T.Mesh(veuFolha(), mat));
                }
                veuTemposCamadas.push(performance.now() - t0Cam);
                if (veuTemposCamadas.length > 400) veuTemposCamadas.shift();
            }
            function setOculto(id, valor) {
                const u = requireUnit(id);
                u.oculto = !!valor;
                u.root.visible = !u.oculto;
                u.ring.visible = !u.oculto;
                u.contact.visible = !u.oculto;
                if (u.oculto) {
                    u.tether.visible = false;
                    u.label.hidden = true;
                }
                renderer.shadowMap.needsUpdate = true;
            }
            const ghostMat = new T.MeshBasicMaterial({ color: 0x9aa7b4, transparent: true, opacity: .45, depthWrite: false });
            if (world.definirFantasmaPedras) world.definirFantasmaPedras(ghostMat);
            const fantasmas = new Map();
            function addFantasma(chaveF, idOrigem, x, z, frenteRad) {
                valid({ x, z });
                const origem = requireUnit(idOrigem);
                if (fantasmas.has(chaveF))
                    removeFantasma(chaveF);
                origem.pivot.updateWorldMatrix(true, true);
                const inv = new T.Matrix4().copy(origem.pivot.matrixWorld).invert(), tmp = new T.Vector3();
                const grupo = new T.Group();
                origem.pivot.traverse(o => {
                    if (!o.isMesh)
                        return;
                    let g;
                    if (o.isSkinnedMesh) {
                        o.skeleton.update();
                        const pos = o.geometry.attributes.position, arr = new Float32Array(pos.count * 3);
                        for (let i = 0; i < pos.count; i++) {
                            tmp.fromBufferAttribute(pos, i);
                            o.boneTransform(i, tmp);
                            arr[i * 3] = tmp.x; arr[i * 3 + 1] = tmp.y; arr[i * 3 + 2] = tmp.z;
                        }
                        g = new T.BufferGeometry();
                        g.setAttribute('position', new T.BufferAttribute(arr, 3));
                        if (o.geometry.index)
                            g.setIndex(o.geometry.index.clone());
                    }
                    else
                        g = o.geometry.clone();
                    const m = new T.Mesh(g, ghostMat);
                    m.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld));
                    grupo.add(m);
                });
                grupo.position.set(wx(x), world.height(wx(x), wz(z)) + origem.altitude, wz(z));
                grupo.rotation.y = frenteRad || 0;
                scene.add(grupo);
                fantasmas.set(chaveF, { grupo, x, z });
                return true;
            }
            function removeFantasma(chaveF) {
                const f = fantasmas.get(chaveF);
                if (!f)
                    return false;
                scene.remove(f.grupo);
                f.grupo.traverse(o => { if (o.geometry) o.geometry.dispose(); });
                fantasmas.delete(chaveF);
                return true;
            }
            function limparFantasmas() {
                [...fantasmas.keys()].forEach(removeFantasma);
            }
            const ready = Promise.all((options.units || []).map(addUnit));
            return Object.freeze({ ready, addUnit, removeUnit, move, select, apresentarAtaque, setCamera, setZoom, setQualidade, showMovement, showPrevia, setFrente, getFrente, setOculto, estaOculto: id => !!requireUnit(id).oculto, setCamadas, limparCamadas: () => setCamadas(null), addFantasma, removeFantasma, limparFantasmas, listaFantasmas: () => [...fantasmas.entries()].map(([chave, f]) => ({ chave, x: f.x, z: f.z })), livreOlhar(dx, dy) {
                    /* O arrasto de olhar da sala: 0,0045 rad/px, pitch preso
                       a ±1,45. Fora do modo 'livre', é inerte. */
                    if (mode !== 'livre') return;
                    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
                    ctrlLivre.yaw -= dx * .0045;
                    ctrlLivre.pitch = clamp(ctrlLivre.pitch - dy * .0045, -1.45, 1.45);
                }, livreEntrada(entrada) {
                    /* A casca entrega o estado contínuo do andar (manípulo,
                       botões de altura, teclas, multiplicador) sempre que
                       ele muda; a cena guarda-o em ctrlLivre. Valores
                       validados: números finitos, sobe reduzido ao sinal,
                       multiplicador só 1/2/4, teclas só as do andar. */
                    if (!entrada || typeof entrada !== 'object') return;
                    if (Number.isFinite(entrada.joyX)) ctrlLivre.joyX = clamp(entrada.joyX, -1, 1);
                    if (Number.isFinite(entrada.joyY)) ctrlLivre.joyY = clamp(entrada.joyY, -1, 1);
                    if (Number.isFinite(entrada.sobe)) ctrlLivre.sobe = Math.sign(entrada.sobe);
                    if (entrada.vel != null) { const v = Number(entrada.vel); if (v === 1 || v === 2 || v === 4) velLivre = v; }
                    if (entrada.teclas && typeof entrada.teclas === 'object') {
                        const ok = {};
                        for (const k of ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', 'q', 'pageup', 'pagedown', 'shift'])
                            if (entrada.teclas[k]) ok[k] = true;
                        ctrlLivre.teclas = ok;
                    }
                }, on, getState: state, getStats: stats, getFrameTimes: () => times.slice(), hitTest: hit, projectUnit: id => unitRect(requireUnit(id), true), setVivo(id, vivo) {
                    if (typeof vivo !== 'boolean')
                        throw new TypeError('vivo booleano');
                    const u = requireUnit(id);
                    cancelFor(u);
                    u.vivo = vivo;
                    u.queue = [];
                    u.step = null;
                    pose(u);
                }, aplicarAmbiente, getAmbienteAplicado() {
                    return { hora: ambActual.hora, chuva: ambActual.chuva, raios: ambAlvo.raios, emTransicao: !!ambTrans, derivados: ambDerivados, ceu: ceuPublicadoEstado() };
                }, dispararRaio, raioArenaVisual, acenderFogoCasa, apagarFogoCasa, definirEstagioFogoCasa, setUnidadeAArder, limparFogos, getVeuEstado, setCapChuva(n) {
                    ambCapChuva = n == null ? null : Math.max(0, Math.floor(n));
                    ambReaplicar();
                }, setTesteChuva052(ligada, nivel) {
                    /* Aba «Testes» (t-aba-testes): o Mestre liga e desliga
                       a camada da chuva nova e escolhe o nível durante a
                       partida. Nasce desligada; nada se grava. */
                    if (typeof ligada !== 'boolean')
                        throw new TypeError('testeChuva052: ligada booleano obrigatório.');
                    if (![1, 2].includes(nivel))
                        throw new RangeError('testeChuva052: nivel fora de {1,2}.');
                    testeChuva052 = { ligada, nivel };
                    ambReaplicar();
                }, getTesteChuva052() {
                    return { ...testeChuva052 };
                }, setTremulacao(on) {
                    /* EM-AMB-B1: repassa a opção do Mestre ao mundo. */
                    if (world && typeof world.setTremulacao === 'function') world.setTremulacao(on);
                }, setDprSessao(dpr) {
                    renderer.setPixelRatio(dpr == null ? Math.min(window.devicePixelRatio || 1, quality === 'alta' ? 2 : quality === 'media' ? 1.5 : 1) : dpr);
                    resize();
                }, setGridVisible(v) {
                    grid.visible = !!v;
                }, showHover: p => mark(hover, p), orbit(dx, dy) {
                    if (mode === '360') {
                        yaw -= dx * .008;
                        pitch = clamp(pitch + dy * .005, .55, 1.4);
                    }
                }, rodarOlhar(delta) {
                    /* Q/E (SPEC §6.2): roda SÓ o offset de olhar deste
                       aparelho, em qualquer modo de câmera de batalha.
                       Na câmera livre não actua (lá manda o ctrlLivre). */
                    if (mode !== 'livre') olharYaw += delta;
                }, olharOffset() {
                    return olharYaw;
                }, projectCell(p) {
                    valid(p);
                    return screen(new T.Vector3(wx(p.x), 0, wz(p.z)));
                }, dispose() {
                    if (disposed)
                        return;
                    finishPresentation();
                    disposed = true;
                    cancelAnimationFrame(raf);
                    observer.disconnect();
                    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
                    [...units.keys()].forEach(removeUnit);
                    chuvaGeo.dispose(); chuvaMat.dispose(); neveGeo.dispose(); neveMat.dispose(); respGeo.dispose(); respMat.dispose(); ceuDispose();
                    release(scene);
                    sun.shadow.map?.dispose();
                    renderer.dispose();
                    renderer.domElement.remove();
                    labels.remove();
                } });
        } });
})();
