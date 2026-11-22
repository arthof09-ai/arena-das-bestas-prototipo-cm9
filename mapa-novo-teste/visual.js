/* Camada visual do Vale — tranche Visual 3 (CM-000009).
 * NÃO toca em cena.js nem em mundo.js (ficheiros sagrados, hashes intactos):
 * envolve window.CampoWorld e repara a CENA JÁ MONTADA por fora.
 * DIRECÇÃO NOVA (palavra do Mestre, 04/11/2026 10:59): pintura realista que
 * DISFARÇA o 3D — referência ARCANE (texturas pintadas à mão sobre o 3D).
 * NÃO se promete realismo fotográfico: o alvo é PINTURA viva sobre o volume.
 * Herda da Visual 2 o que o olho salvou (círculo de runas, luz quente, relevo,
 * tochas com PointLight, menires) e acrescenta as técnicas das pesquisas
 * PESQUISA-A/B (integracao-visual-3/): (1) filme DOM — vinheta fria + grão;
 * (2) chão repintado com pinceladas direccionais orientadas pelo relevo;
 * (3) degraus suaves de luz + split toning quente/frio + rim, injectados
 * por onBeforeCompile nos materiais (figuras apanhadas por polling);
 * (4) horizonte costurado (névoa = cor do fundo) + céu de pincel seco;
 * (5) anéis-cilindro de silhuetas pintadas em 2 profundidades (matte).
 * Tudo aditivo e reversível: apagar este ficheiro e a sua tag devolve o
 * estado anterior.
 * VOLTA 3 (última desta tranche; resposta aos veredictos V3R2 dos dois
 * críticos de arte): a volta 2 falhou por TIMIDEZ — tudo certo, tudo fraco
 * demais para se ver. A volta 3 sobe o contraste até ser APONTÁVEL a olho
 * nu à distância de jogo: pincelada de valor real no chão e degradé
 * partido; anel com troços gastos e sombra por cima; menires-pedra com
 * dois lados de luz pintados e base suja (nada de esconder no escuro);
 * chamas deformadas uma a uma; figuras mates, dessaturadas, sem a
 * «estática» condenada; pinheiros facetados fora; contactos irregulares
 * em vez de ovais carimbados; grão de filme fora. */
(() => {
    'use strict';
    const baseWorld = window.CampoWorld;
    if (typeof baseWorld !== 'function' || window.__visual2Aplicado) return;
    window.__visual2Aplicado = true;

    const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    let seed = 7411;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

    /* ---------- PINTURA DOS MATERIAIS — INVÓLUCRO COMUM
       (correcção t-mapa-trono, bancada item 4) ----------
       A pintura (polling + onBeforeCompile + mate + mapas
       repintados) vivia SÓ dentro do invólucro do CampoWorld:
       as figuras da Sala do Trono ficavam sem ela e trocavam
       de pele entre mapas. Extraída para aqui, aplica-se à
       cena de QUALQUER mundo — campo (com as texturas dele:
       pedra/madeira/contacto) e trono (sem elas). O caminho do
       campo chama-a no mesmo ponto e com os mesmos argumentos
       de sempre: comportamento ao bit. */
    /* ---------- CONTORNO DAS FIGURAS (aba «Testes» das Configurações;
       palavra do Mestre, 19/11/2026: «Deixa nas configurações aba
       testes, mas deixa pré setado ligado») ----------
       O rim quente das figuras ganha um PISO: do lado escuro da
       figura a máscara já não apaga o brilho de todo (a variante das
       fotos Q44 que o olho dele aprovou). O piso vive num UNIFORME
       ÚNICO partilhado por todos os materiais pintados com rim:
       0,50 = ligado (o valor das fotos aprovadas); 0,0 = desligado —
       e com 0,0 o max() do shader é a identidade, ou seja, o visual
       fica exactamente o de sempre. Quem manda no valor é a chave
       hudt1-contorno, a mesma que a aba «Testes» edita: nasce LIGADO
       (pré-setado) e só o literal 'desligado' o apaga — a leitura é
       a da casa, igual à das outras definições que nascem ligadas. */
    const uniformePisoContorno = { value: 0.5 };
    try {
        if (localStorage.getItem('hudt1-contorno') === 'desligado') uniformePisoContorno.value = 0.0;
    } catch (_) { /* sem armazenamento, vale o pré-setado: ligado */ }
    const instalarPintura = (T, scene, mundoTex) => {
        /* ---------- PINTURA DOS MATERIAIS (Visual 3, PESQUISA-A §2) ----------
         * Sem trocar materiais nem tocar nos sagrados: injecta-se no fim do
         * fragmento (antes de tonemapping_fragment, onde gl_FragColor já
         * existe) uma posterização SUAVE da luminância (4 patamares com
         * transição smoothstep, misturada a 0,62 — achata o «gradiente de
         * computador» sem virar cel-shading), split toning (sombra fria
         * petróleo / luz quente âmbar) e, só no Standard das figuras, RIM
         * quente por fresnel mascarado pela luminância (o «contorno
         * pintado» viável — inverted-hull foi NÃO fundamentado na pesquisa).
         * MeshBasicMaterial fica FORA (runas, chamas, halos: emissivos
         * puros). As figuras GLTF entram depois da carga → polling com
         * marca userData.__pintado (nunca injectar duas vezes). */
        const fabricaPintura = (comRim, mistura, dessat) => shader => {
            const inj = '{ vec3 corP = gl_FragColor.rgb;'
                + ' float lumP = dot(corP, vec3(0.299, 0.587, 0.114));'
                + ' float fP = lumP * 4.0; float baseP = floor(fP);'
                + ' float yqP = (baseP + smoothstep(0.32, 0.68, fP - baseP)) / 4.0;'
                + ' float razP = lumP > 0.003 ? yqP / lumP : 1.0;'
                + ' corP *= razP;'
                + ' corP *= mix(vec3(0.90, 1.01, 1.10), vec3(1.07, 1.00, 0.90), smoothstep(0.12, 0.85, yqP));'
                + (dessat ? ' corP = mix(corP, vec3(dot(corP, vec3(0.299, 0.587, 0.114))), ' + dessat + ');' : '')
                + ' corP = mix(gl_FragColor.rgb, corP, ' + mistura + ');'
                + (comRim ? ' float frP = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);'
                          + ' corP += vec3(1.0, 0.72, 0.42) * frP * 0.62 * max(smoothstep(0.04, 0.42, yqP), uPisoContorno);' : '')
                + ' gl_FragColor.rgb = corP; }'
                + '\n#include <tonemapping_fragment>';
            if (comRim) {
                shader.uniforms.uPisoContorno = uniformePisoContorno;
                shader.fragmentShader = 'uniform float uPisoContorno;\n' + shader.fragmentShader;
            }
            shader.fragmentShader = shader.fragmentShader.replace('#include <tonemapping_fragment>', inj);
        };
        /* VOLTA 3: as figuras dessaturam 0,22 (o cabelo laranja da Ong era
         * um terceiro acento limpo a competir — Disfarce item 11) e a
         * mistura da pintura sobe: a língua tem de ser a mesma em tudo. */
        const pintarStd = fabricaPintura(true, 0.78, '0.22'), pintarLam = fabricaPintura(false, 0.6, null);
        /* VOLTA 2: dente de pintura nos mapas das figuras (Standard com map):
         * a textura original é redesenhada em canvas com blocos de valor e
         * traços curtos em overlay de alpha baixo — quebra o «liso de
         * fábrica» sem sujar a figura. Uma vez por material; o polling
         * repete a tentativa até a imagem do mapa existir. */
        const tentarMapaPintado = m => {
            if (m.userData.__mapaPintado || !m.map || !m.map.image || !m.map.image.width) return;
            try {
                const img0 = m.map.image, esc = Math.min(1, 512 / Math.max(img0.width, img0.height));
                const mc = document.createElement('canvas');
                mc.width = Math.max(2, (img0.width * esc) | 0); mc.height = Math.max(2, (img0.height * esc) | 0);
                const mp = mc.getContext('2d'); mp.drawImage(img0, 0, 0, mc.width, mc.height);
                /* VOLTA 3: o grão fino da volta 2 foi condenado como
                 * «textura de ruído/estática» (Disfarce (f) e N1) — sai o
                 * pontilhado; ficam só manchas TONAIS grandes e macias
                 * (variação de valor em escala larga, sem textura fina). */
                for (let i = 0; i < 34; i++) {
                    const x = rnd() * mc.width, y = rnd() * mc.height, r = 26 + rnd() * 95;
                    const gr = mp.createRadialGradient(x, y, 0, x, y, r), escuro = rnd() < 0.58;
                    gr.addColorStop(0, escuro ? 'rgba(24,18,10,' + (0.05 + rnd() * 0.06) + ')' : 'rgba(238,220,180,' + (0.04 + rnd() * 0.05) + ')');
                    gr.addColorStop(1, 'rgba(0,0,0,0)');
                    mp.fillStyle = gr; mp.fillRect(x - r, y - r, r * 2, r * 2);
                }
                const nt = new T.CanvasTexture(mc);
                nt.encoding = m.map.encoding; nt.wrapS = m.map.wrapS; nt.wrapT = m.map.wrapT;
                nt.repeat.copy(m.map.repeat); nt.offset.copy(m.map.offset);
                m.map = nt; m.needsUpdate = true; m.userData.__mapaPintado = true;
            } catch (e) { m.userData.__mapaPintado = true; }
        };
        const pintarMaterial = m => {
            if (m && m.isMeshStandardMaterial) tentarMapaPintado(m);
            if (!m || m.userData.__pintado) return;
            if (m.isMeshBasicMaterial || m.isSpriteMaterial || m.isPointsMaterial || m.isLineBasicMaterial || m.isShaderMaterial) return;
            m.userData.__pintado = true;
            // VOLTA 3: acabamento MATE nas figuras (Standard) — roughness
            // alto e metal zero matam o brilho pontual de plástico (Disfarce
            // item 1); um toque de tinta quente unifica com o fundo.
            if (m.isMeshStandardMaterial) {
                if (typeof m.roughness === 'number') m.roughness = Math.max(m.roughness, 0.9);
                if (typeof m.metalness === 'number') m.metalness = 0;
                if (m.color) m.color.multiply(new T.Color(1.0, 0.97, 0.92));
            }
            // VOLTA 2: pedra/madeira do MUNDO ganham a textura pintada da camada
            if (mundoTex.texPedra && m.isMeshLambertMaterial && !m.map && !m.vertexColors && m.color) {
                const cc = m.color, mx = Math.max(cc.r, cc.g, cc.b), mn = Math.min(cc.r, cc.g, cc.b);
                if (mx - mn < 0.09 && mx > 0.28 && mx < 0.72) m.map = mundoTex.texPedra;
                else if (cc.r > cc.g && cc.g > cc.b && (cc.r - cc.b) > 0.08 && mx < 0.6) m.map = mundoTex.texMadeira;
            }
            m.onBeforeCompile = m.isMeshStandardMaterial ? pintarStd : pintarLam;
            m.needsUpdate = true;
        };
        const pintarCena = () => scene.traverse(o => {
            if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(pintarMaterial);
        });
        pintarCena();
        /* VOLTA 3 (Disfarce item 3): os discos de contacto da cena são
         * ovais perfeitos carimbados sob cada figura (CircleGeometry,
         * 0x080c12) — troca-se o material pela mancha IRREGULAR da camada
         * (mesma tinta, feitio de pincel) e alarga-se um pouco o apoio. */
        const arrumarContactos = () => { if (!mundoTex.texContacto) return; scene.traverse(o => {
            if (o.isMesh && o.geometry && o.geometry.type === 'CircleGeometry' && o.material && o.material.isMeshBasicMaterial
                && o.material.color && o.material.color.getHex() === 0x080c12 && !o.userData.__contactoPintado) {
                o.userData.__contactoPintado = true;
                o.material = new T.MeshBasicMaterial({ map: mundoTex.texContacto, transparent: true, opacity: 0.95, depthWrite: false, side: T.DoubleSide, fog: true });
                o.scale.set(1.45, 1.45, 1);
            }
        }); };
        arrumarContactos();
        let rondasPintura = 0;
        const relogioPintura = setInterval(() => { pintarCena(); arrumarContactos(); if (++rondasPintura > 160) clearInterval(relogioPintura); }, 750);
    };

    window.CampoWorld = function (T, scene, area) {
        const world = baseWorld(T, scene, area);
        const C = h => new T.Color(h).convertSRGBToLinear();

        /* ---------- altura nova: a do mundo + relevo contínuo fora da arena ----------
         * A arena jogável (pegada 15×10,5 m) fica exactamente plana como
         * world.height manda. O relevo nasce a partir dos ~9,2 m. */
        /* TROCA DE MAPA (troca-mapa): o relevo antigo da arena CALA-SE —
         * o terreno agora é o da prova-inercia, que já vive inteiro em
         * world.height (mundo.js). alturaNova = world.height, ponto. */
        const relevo = (x, z) => 0;
        const alturaNova = (x, z) => world.height(x, z) + relevo(x, z);

        /* ---------- luz: fim de tarde quente SEM banho vermelho ----------
         * Crítico R2: o sol 0xffa050 a 1,85 sobre a textura quente colapsou
         * o canal azul da cena (B médio = 15). Fonte corrigida: sol mais
         * claro e menos vermelho, mais alto (sombras ~0,83×), hemisférica
         * fria a sério — é ela que devolve azul aos cantos e aos vales.
         * Enchimento fixado pela base V7 (fila IBX-212, item 15 —
         * T-LUZ): hemisférica 0,40 e sombras 512; sem luz ambiente. */
        scene.traverse(o => {
            if (o.isDirectionalLight) {
                o.color.set(0xffe3c0).convertSRGBToLinear();
                o.intensity = 0.98;
                o.position.set(-18, 27, -13.5); // elevação ~50° (original: 21,8°)
                o.shadow.mapSize.set(512, 512);
                if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; }
            } else if (o.isHemisphereLight) {
                o.color.set(0x7d9ab8).convertSRGBToLinear();       // céu petróleo vivo
                o.groundColor.set(0x2e2a24).convertSRGBToLinear(); // chão quase neutro
                o.intensity = 0.40;
            }
        });

        /* ---------- céu PINTADO e horizonte COSTURADO (Visual 3, §4.1–4.2) ----------
         * FogExp2: a escrita por frame near/far da cena é inerte nele.
         * Densidade 0,0105 (a que fechou o D1). COSTURA: a cor da névoa é
         * EXACTAMENTE a cor do fundo na linha do horizonte (#35485e) — o
         * objecto longínquo desvanece PARA o céu, não para outra cor.
         * O céu deixa de ser um gradiente liso de computador: canvas
         * 1024×512 com faixas horizontais de pincel seco e massas de nuvem
         * escuras pintadas — matte painting, não plástico. */
        const COR_HORIZONTE = 0x35485e;
        const ceu = document.createElement('canvas'); ceu.width = 1024; ceu.height = 512;
        const cx = ceu.getContext('2d'), grad = cx.createLinearGradient(0, 0, 0, 512);
        grad.addColorStop(0, '#0b1220'); grad.addColorStop(0.5, '#182636');
        grad.addColorStop(0.78, '#27394c'); grad.addColorStop(0.93, '#4a4438');
        grad.addColorStop(1, '#35485e');
        cx.fillStyle = grad; cx.fillRect(0, 0, 1024, 512);
        // pincel seco horizontal: traços largos, alpha baixo, matiz a oscilar
        for (let i = 0; i < 170; i++) {
            const y = rnd() * 512, comp = 120 + rnd() * 420, alt = 2.5 + rnd() * 6.5;
            const quente = y > 400 && rnd() < 0.6;
            cx.fillStyle = quente ? 'rgba(214,164,96,' + (0.03 + rnd() * 0.06) + ')'
                                  : 'rgba(' + (120 + rnd() * 60 | 0) + ',' + (150 + rnd() * 50 | 0) + ',' + (190 + rnd() * 40 | 0) + ',' + (0.03 + rnd() * 0.06) + ')';
            cx.fillRect(rnd() * 700, y, comp, alt);
        }
        // massas de nuvem escuras, pintadas por manchas sobrepostas
        for (let n = 0; n < 4; n++) {
            const nx = 120 + rnd() * 760, ny = 40 + rnd() * 190;
            for (let k = 0; k < 26; k++) {
                const r = 22 + rnd() * 66, x = nx + (rnd() - 0.5) * 230, y = ny + (rnd() - 0.5) * 44;
                const gr2 = cx.createRadialGradient(x, y, 0, x, y, r);
                gr2.addColorStop(0, 'rgba(8,13,22,' + (0.05 + rnd() * 0.07) + ')'); gr2.addColorStop(1, 'rgba(8,13,22,0)');
                cx.fillStyle = gr2; cx.fillRect(x - r, y - r, r * 2, r * 2);
            }
        }
        const texCeu = new T.CanvasTexture(ceu); texCeu.encoding = T.sRGBEncoding;
        scene.background = texCeu;
        scene.fog = new T.FogExp2(C(COR_HORIZONTE), 0.0105);

        /* ---------- chão pintado: petróleo real fora, ocre contido dentro,
         * e o relevo cozido na tinta (hillshade da própria função) ---------- */
        const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
        const g = cv.getContext('2d');
        // raio comprimido à escala do quadro (~13–15 m visíveis): a borda do
        // ecrã já cai no petróleo, como na referência — medição R2/R3
        const rg = g.createRadialGradient(512, 512, 26, 512, 512, 150);
        rg.addColorStop(0, '#77684c'); rg.addColorStop(0.3, '#5d4e35'); rg.addColorStop(0.52, '#414f42');
        rg.addColorStop(0.75, '#31434e'); rg.addColorStop(1, '#243646');
        g.fillStyle = rg; g.fillRect(0, 0, 1024, 1024);
        // hillshade: grelha 256² da derivada do relevo, desenhada ampliada e
        // suave por cima do gradiente — as encostas lêem-se mesmo que as
        // normais da malha lavem; multiplica luz, nunca pinta «tapete».
        const hs = document.createElement('canvas'); hs.width = hs.height = 256;
        const hg2 = hs.getContext('2d'), img = hg2.createImageData(256, 256);
        for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
            const x = (i / 255 - 0.5) * 120, z = (j / 255 - 0.5) * 120;
            const dx = relevo(x - 1.1, z) - relevo(x + 1.1, z), dz = relevo(x, z - 1.1) - relevo(x, z + 1.1);
            let s = 128 + (dx * 0.62 + dz * 0.38) * 68; s = Math.max(46, Math.min(210, s));
            const k = (j * 256 + i) * 4;
            img.data[k] = img.data[k + 1] = img.data[k + 2] = s; img.data[k + 3] = 255;
        }
        hg2.putImageData(img, 0, 0);
        g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.65;
        g.imageSmoothingEnabled = true; g.drawImage(hs, 0, 0, 1024, 1024); g.restore();
        for (let i = 0; i < 120; i++) { // manchas de musgo/terra, mais musgo que antes
            const x = rnd() * 1024, y = rnd() * 1024, r = 20 + rnd() * 95;
            const gr = g.createRadialGradient(x, y, 0, x, y, r), musgo = rnd() < 0.68;
            gr.addColorStop(0, musgo ? 'rgba(88,102,58,0.20)' : 'rgba(40,32,20,0.10)');
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        for (let i = 0; i < 300; i++) { // MOTA (volta 2): manchas elípticas rodadas que partem o degradé radial perfeito
            const x = rnd() * 1024, y = rnd() * 1024, r = 26 + rnd() * 90, tipo = rnd();
            const cor = tipo < 0.45 ? '26,20,13' : (tipo < 0.75 ? '112,88,54' : '38,52,66');
            g.save(); g.translate(x, y); g.rotate(rnd() * Math.PI); g.scale(1, 0.45 + rnd() * 0.5);
            const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
            gr.addColorStop(0, 'rgba(' + cor + ',' + (0.05 + rnd() * 0.08) + ')'); gr.addColorStop(1, 'rgba(' + cor + ',0)');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.restore();
        }
        /* ---------- PINCELADA DIRECCIONAL (Visual 3, PESQUISA-A §1) ----------
         * O grão-ponto da Visual 2 sai; entra o traço de pincel em 3 passagens
         * (brocha → pincel médio → detalhe). A direcção segue a curva de nível
         * do relevo (perpendicular ao gradiente do hillshade já calculado);
         * na arena plana manda um fluxo suave de baixa frequência. A cor
         * nasce da MESMA paleta radial da base (espelhada: t = dist/150),
         * deslocada pelo hillshade — cumes quentes, vales frios: luz pintada
         * na textura, como na referência. Na arena o pincel é contido
         * (alpha e comprimento reduzidos) para não lutar com o grid. */
        const paleta = [[0, [119, 104, 76]], [0.3, [93, 78, 53]], [0.52, [65, 79, 66]], [0.75, [49, 67, 78]], [1, [36, 52, 70]]];
        const corPaleta = t => {
            for (let k = 1; k < paleta.length; k++) if (t <= paleta[k][0] || k === paleta.length - 1) {
                const t0 = paleta[k - 1][0], c0 = paleta[k - 1][1], t1 = paleta[k][0], c1 = paleta[k][1];
                const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
                return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
            }
        };
        const sombraEm = (x, y) => {
            const i = Math.max(0, Math.min(255, (x / 1024 * 255) | 0)), j = Math.max(0, Math.min(255, (y / 1024 * 255) | 0));
            return img.data[(j * 256 + i) * 4];
        };
        /* RISCOS-CHAO (09/11/2026, queixa do Mestre): bandeira das
         * famílias de traços do TERRENO. Com ela desligada, traco
         * não pinta — mas os sorteios rnd dos ciclos chamadores
         * continuam a correr, por isso a corrente não se desloca
         * e tudo o que se pinta depois (anel incl.) fica igual. */
        let tracoTerreno = true;
        const traco = (x, y, ang, comp, larg, r, gg2, b, alfa) => {
            if (!tracoTerreno) return;
            g.strokeStyle = 'rgba(' + (r | 0) + ',' + (gg2 | 0) + ',' + (b | 0) + ',' + alfa + ')';
            g.lineWidth = larg; g.beginPath(); g.moveTo(x, y);
            g.lineTo(x + Math.cos(ang) * comp, y + Math.sin(ang) * comp); g.stroke();
        };
        g.lineCap = 'round';
        const passagens = [[1500, 26, 54, 4.4, 6.6, 0.07, 0.15], [2000, 13, 27, 2.4, 4.2, 0.08, 0.17], [900, 6, 13, 1.3, 2.4, 0.06, 0.13]];
        for (const [n, cMin, cMax, lMin, lMax, aMin, aMax] of passagens) {
            for (let i = 0; i < n; i++) {
                const x = rnd() * 1024, y = rnd() * 1024;
                const dx = (sombraEm(x + 6, y) - sombraEm(x - 6, y)) / 12, dz = (sombraEm(x, y + 6) - sombraEm(x, y - 6)) / 12;
                let ang = Math.atan2(dx, -dz);
                if (Math.abs(dx) + Math.abs(dz) < 0.6) ang = Math.sin(x * 0.011 + 1.7) * 1.2 + Math.cos(y * 0.009 - 0.6) * 1.1 + 0.7;
                ang += (rnd() - 0.5) * 0.55;
                const distC = Math.hypot(x - 512, y - 512);
                const centro = distC < 130 ? 0.72 : 1;
                const base = corPaleta(Math.min(1, distC / 150));
                const s = sombraEm(x, y), jit = 0.9 + rnd() * 0.2;
                let rr = base[0] * jit, gg2 = base[1] * jit, bb = base[2] * jit;
                if (s > 150) { rr += 13; gg2 += 6; } else if (s < 106) { bb += 9; rr -= 5; }
                traco(x, y, ang, (cMin + rnd() * (cMax - cMin)) * (centro < 1 ? 0.7 : 1), lMin + rnd() * (lMax - lMin), rr, gg2, bb, (aMin + rnd() * (aMax - aMin)) * centro);
            }
        }
        for (let i = 0; i < 420; i++) { // pincel seco claro nos cumes
            const x = rnd() * 1024, y = rnd() * 1024; if (sombraEm(x, y) < 138) continue;
            const ang = rnd() * Math.PI * 2;
            traco(x, y, ang, 4 + rnd() * 7, 1 + rnd() * 1.4, 216, 188, 138, 0.05 + rnd() * 0.06);
            if (rnd() < 0.6) traco(x + (rnd() - 0.5) * 14, y + (rnd() - 0.5) * 14, ang, 3 + rnd() * 5, 1 + rnd(), 226, 200, 150, 0.04 + rnd() * 0.05);
        }
        for (let i = 0; i < 210; i++) { // oclusão pintada: aro tangencial escuro — a arena «assenta»
            const a = rnd() * Math.PI * 2, rad = 128 + rnd() * 30, x = 512 + Math.cos(a) * rad, y = 512 + Math.sin(a) * rad;
            traco(x, y, a + Math.PI / 2 + (rnd() - 0.5) * 0.4, 9 + rnd() * 15, 1.6 + rnd() * 2.2, 26, 22, 16, 0.07 + rnd() * 0.08);
        }
        /* ---------- LIMPEZA-VISUAL C2R (recurso procedural): os riscos dentro da arena ----------
         * Diagnóstico «risco e chão» §2/§5-C2R: os traços de 0,6–2,6 m lêem-se
         * como poluição à distância de batalha. Dentro da arena, as camadas de
         * riscos (sulcos volta 2, tracoForte de dentro, sulcos fundos) passam a
         * grão fino de 0,1–0,3 m a ~⅓ do contraste, com degradê de 2,5 m para
         * cada lado da banda do anel (8,69–9,61 m). A modulação é por ORIGEM
         * do traço, não por píxel: medido no canvas, 771 px de caudas de
         * traços nascidos dentro do degradê cruzam além de 12,11 m (raio
         * elíptico máximo 16,11 m) — é o preço do degradê sem aresta, e a
         * bancada de programação aceitou-o com a medição declarada.
         * Comprimento, LARGURA e alfa são escalados pelo mesmo factor
         * (emenda da bancada: sem escalar a largura, um traço mais curto
         * que a própria largura lia-se como disco de 0,23–0,54 m).
         * fatorArena: 0 no coração da arena, 1 fora da banda+degradê (distância
         * elíptica ×1,22 como na textura pintada; canvas 1024 px = 120 m).
         * A stream `rnd` consome EXACTAMENTE o mesmo em todas as camadas —
         * comprimento e alfa são escalados depois de sorteados — por isso
         * tudo o que se pinta a jusante fica idêntico. */
        const fatorArena = (x, y) => sstep(6.19, 12.11, Math.hypot((x - 512) / 1.22, y - 512) / 8.5333);
        tracoTerreno = false; // RISCOS-CHAO: daqui aos sulcos fundos só pintam as 3 famílias removidas
        for (let i = 0; i < 340; i++) { // SULCOS (volta 2): riscos escuros de direcção livre, também sobre o aro e o disco central
            const x = rnd() * 1024, y = rnd() * 1024, ang = rnd() * Math.PI * 2;
            const comp = 6 + rnd() * 13, larg = 1.4 + rnd() * 1.8, alfa = 0.08 + rnd() * 0.09;
            const f = fatorArena(x, y);
            traco(x, y, ang, comp * (0.13 + 0.87 * f), larg * (0.35 + 0.65 * f), 24, 19, 13, alfa * (0.33 + 0.67 * f));
        }
        /* ---------- VOLTA 3: partir o degradé e pincelada APONTÁVEL ----------
         * Veredictos V3R2 (Pintura condição 1; Disfarce (e)): as passagens
         * finas da volta 2 nasceram da MESMA cor da base com alfa ≤0,17 —
         * invisíveis à distância de jogo. A volta 3 pinta por cima com
         * contraste de VALOR real: manchas grandes assimétricas que quebram
         * a leitura «centro claro → borda escura», poças quentes pintadas
         * onde as tochas do mundo estão, e traços longos escuros/claros
         * apontáveis a olho nu dentro e fora do círculo. */
        for (let i = 0; i < 16; i++) { // manchas-mãe assimétricas (quebram o radial)
            const a = rnd() * Math.PI * 2, dist = 40 + rnd() * 330;
            const x = 512 + Math.cos(a) * dist, y = 512 + Math.sin(a) * dist, r = 90 + rnd() * 190;
            const frio = Math.cos(a) < 0.2 || rnd() < 0.4;
            const gr = g.createRadialGradient(x, y, 0, x, y, r);
            gr.addColorStop(0, frio ? 'rgba(14,20,28,' + (0.16 + rnd() * 0.16) + ')' : 'rgba(146,106,58,' + (0.12 + rnd() * 0.13) + ')');
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // poças de luz PINTADAS nas tochas do mundo (braseiros em (-6,3), (5,-3), (1,4)):
        // textura 1024 px = 120 m → px = 512 + coord * 8.533; py = 512 + z * 8.533
        for (const [wx, wz] of [[-6, 3], [5, -3], [1, 4]]) {
            const x = 512 + wx * 8.533, y = 512 + wz * 8.533, r = 42 + rnd() * 26;
            const gr = g.createRadialGradient(x, y, 0, x, y, r);
            gr.addColorStop(0, 'rgba(255,166,84,' + (0.13 + rnd() * 0.06) + ')'); gr.addColorStop(1, 'rgba(255,150,70,0)');
            g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
        }
        g.lineCap = 'round';
        /* CALIBRAÇÃO (captura v3r3erro): a textura tem 1024 px para 120 m e
         * o enquadramento amplia ~6× — traços de 34–129 px viraram FEIXES de
         * 4–15 m no ecrã. A escala certa da broxa nesta textura é 12–42 px
         * (1,4–5 m); o que faltava à volta 2 era CONTRASTE, não tamanho. */
        const tracoForte = (escuro, dentro) => {
            const a = rnd() * Math.PI * 2, dist = dentro ? Math.sqrt(rnd()) * 225 : 235 + rnd() * 265;
            const x = 512 + Math.cos(a) * dist, y = 512 + Math.sin(a) * dist;
            const ang = rnd() * Math.PI * 2, comp = 13 + rnd() * 29;
            const f = fatorArena(x, y), fc = 0.05 + 0.95 * f, fa = 0.33 + 0.67 * f, fl = 0.35 + 0.65 * f; // C2R: dentro da arena, vira grão
            if (escuro) { const larg = 2 + rnd() * 2.6, alfa = 0.20 + rnd() * 0.13; traco(x, y, ang, comp * fc, larg * fl, 22, 17, 10, alfa * fa); }
            else { const larg = 1.5 + rnd() * 2, alfa = 0.12 + rnd() * 0.10; traco(x, y, ang, comp * 0.85 * fc, larg * fl, 233, 205, 152, alfa * fa); }
        };
        for (let i = 0; i < 240; i++) tracoForte(true, true);    // terra revolvida dentro do círculo
        for (let i = 0; i < 150; i++) tracoForte(false, true);   // pincel seco claro dentro
        for (let i = 0; i < 130; i++) tracoForte(true, false);   // e fora dele
        for (let i = 0; i < 80; i++) tracoForte(false, false);
        for (let i = 0; i < 170; i++) { // sulcos: riscos fundos de direcção livre
            const x = rnd() * 1024, y = rnd() * 1024, ang = rnd() * Math.PI * 2;
            const comp = 16 + rnd() * 24, larg = 1.2 + rnd() * 1.2, alfa = 0.16 + rnd() * 0.10;
            const f = fatorArena(x, y);
            traco(x, y, ang, comp * (0.05 + 0.95 * f), larg * (0.35 + 0.65 * f), 16, 12, 7, alfa * (0.33 + 0.67 * f));
        }
        tracoTerreno = true; // RISCOS-CHAO: fim da janela das famílias removidas
        g.lineCap = 'butt';
        /* ---------- LIMPEZA-VISUAL C2R/E4 v4: matéria multi-escala dentro da arena ----------
         * A bancada de arte reprovou a v3 neste ponto: as manchas de uma só
         * escala e as pintas uniformes somavam um SEGUNDO padrão regular
         * sobre a grelha do hillshade — lia-se «cortiça pintalgada».
         * Critério de morte da v4: no zoom 1 não pode existir passo
         * regular detectável. Resposta em TRÊS escalas (variação de
         * escala > 10×) + cor disciplinada (jitter de luminância neutro;
         * cor quente/fria só nas manchas grandes):
         * (1) manchas grandes suaves r 30–90 px, alfa 0,04–0,09;
         * (2) manchas médias r 4–18 px, alfa 0,05–0,10;
         * (3) pintas em AGLOMERADOS (40 centros × 20–60 pintas de 1–4 px,
         * luminância ±8–20%) — cascalho em montinhos, não ritmo;
         * (4) ruído fino píxel a píxel ±4,5% sobre toda a arena, a
         * descorrelacionar a grelha à escala do texel; a força segue o
         * mesmo degradê fatorArena — além de 12,11 m, zero.
         * Semente local própria (a stream `rnd` não é consumida). */
        {
            let seedG = 41771005;
            const rndG = () => ((seedG = (Math.imul(seedG, 1664525) + 1013904223) >>> 0) / 4294967296);
            const mancha = (rMin, rVar, aMin, aVar) => {
                const a = rndG() * Math.PI * 2, dist = Math.sqrt(rndG()) * 71; // rn elíptico < ~8,3 m
                const x = 512 + Math.cos(a) * dist * 1.22, y = 512 + Math.sin(a) * dist;
                /* raio LIMITADO PELA FOLGA à fronteira de 9,5 m: a v4.0
                 * deixava as manchas grandes (r até 90 px) vazarem além
                 * de 12,11 m — 4.739 px medidos. Contenção por construção. */
                const folgaPx = (9.5 - dist / 8.5333) * 8.5333;
                if (folgaPx < 4) return;
                const r = Math.min(rMin + rndG() * rVar, folgaPx), quente = rndG() < 0.5;
                const gr = g.createRadialGradient(x, y, 0, x, y, r);
                gr.addColorStop(0, quente ? 'rgba(146,106,58,' + (aMin + rndG() * aVar) + ')' : 'rgba(14,20,28,' + (aMin + rndG() * aVar) + ')');
                gr.addColorStop(1, 'rgba(0,0,0,0)');
                g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
            };
            for (let i = 0; i < 26; i++) mancha(30, 60, 0.04, 0.05);  // (1) grandes
            for (let i = 0; i < 90; i++) mancha(4, 14, 0.05, 0.05);   // (2) médias
            const imgC = g.getImageData(0, 0, 1024, 1024), dc = imgC.data;
            const jitter = (px, py, fMul) => {
                if (px < 0 || px > 1023 || py < 0 || py > 1023) return;
                const k = (py * 1024 + px) * 4;
                dc[k] = Math.max(0, Math.min(255, dc[k] * fMul));
                dc[k + 1] = Math.max(0, Math.min(255, dc[k + 1] * fMul));
                dc[k + 2] = Math.max(0, Math.min(255, dc[k + 2] * fMul));
            };
            for (let c = 0; c < 40; c++) { // (3) aglomerados de cascalho
                const a = rndG() * Math.PI * 2, dist = Math.sqrt(rndG()) * 72;
                const cx = 512 + Math.cos(a) * dist * 1.22, cy = 512 + Math.sin(a) * dist;
                const n = 20 + (rndG() * 40 | 0);
                for (let i = 0; i < n; i++) {
                    const ox = Math.round(cx + (rndG() + rndG() - 1) * 10), oy = Math.round(cy + (rndG() + rndG() - 1) * 10);
                    const fMul = 1 + (rndG() - 0.5) * 0.4, tam = 1 + (rndG() * 4 | 0);
                    for (let t = 0; t < tam; t++) jitter(ox + (t % 2), oy + ((t / 2) | 0), fMul);
                }
            }
            for (let py = 0; py < 1024; py++) for (let px = 0; px < 1024; px++) { // (4) ruído fino
                const f = fatorArena(px, py);
                if (f >= 1) continue;
                jitter(px, py, 1 + (rndG() - 0.5) * 0.09 * (1 - f));
            }
            g.putImageData(imgC, 0, 0);
        }
        /* ============ C2R/FONTE (v5) — a malha morre na fonte ============
         * A «malha» do chão é um xadrez de dither ao nível do texel,
         * baked na pilha de sombreado por gradientes deste pintor
         * (medido: amplitude alternada −1,51 níveis na base, −2,50 na
         * candidata v4 — os passes de matéria da v4 somaram-se ao padrão
         * em vez de o matarem). Este passe corre sobre o canvas JÁ
         * pintado (logo, apanha o dither de todas as camadas, incluindo
         * a matéria C2R) e remove SÓ a componente alternada coerente em
         * fase: para cada texel, estima a amplitude local do xadrez por
         * correlação com o sinal (−1)^(x+y) numa janela 9×9 do resíduo
         * (valor − média local 5×5) e subtrai-a, limitada a ±3 níveis.
         * A média local não muda (a correcção tem média zero por
         * construção) e o detalhe que não está em fase com o xadrez
         * fica — grão, traços e manchas aprovados intactos. A força é
         * modulada por (1 − fatorArena), a MESMA mancha elíptica do
         * C2R: força total no coração da arena, zero fora dela.
         * Determinístico: função pura do canvas pintado; não consome
         * `rnd` nem `rndG` — a jusante nem repara. */
        {
            const imgM = g.getImageData(0, 0, 1024, 1024), dm = imgM.data, NM = 1024;
            const lumM = new Float32Array(NM * NM);
            for (let p = 0; p < NM * NM; p++) lumM[p] = (dm[p * 4] + dm[p * 4 + 1] + dm[p * 4 + 2]) / 3;
            // integral da luminância (para a média local 5×5)
            const intM = new Float64Array((NM + 1) * (NM + 1));
            for (let y = 0; y < NM; y++) {
                let somaLinha = 0;
                for (let x = 0; x < NM; x++) {
                    somaLinha += lumM[y * NM + x];
                    intM[(y + 1) * (NM + 1) + x + 1] = intM[y * (NM + 1) + x + 1] + somaLinha;
                }
            }
            const somaJanela = (x0, y0, x1, y1) => {
                x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(NM, x1); y1 = Math.min(NM, y1);
                return intM[y1 * (NM + 1) + x1] - intM[y0 * (NM + 1) + x1] - intM[y1 * (NM + 1) + x0] + intM[y0 * (NM + 1) + x0];
            };
            // resíduo alternado: (valor − média 5×5) × sinal do xadrez
            const altM = new Float32Array(NM * NM);
            for (let y = 0; y < NM; y++) for (let x = 0; x < NM; x++) {
                const x0 = Math.max(0, x - 2), x1 = Math.min(NM, x + 3), y0 = Math.max(0, y - 2), y1 = Math.min(NM, y + 3);
                const media = somaJanela(x0, y0, x1, y1) / ((x1 - x0) * (y1 - y0));
                altM[y * NM + x] = (lumM[y * NM + x] - media) * (((x + y) & 1) ? -1 : 1);
            }
            // integral do resíduo alternado (para a correlação local 9×9)
            const intA = new Float64Array((NM + 1) * (NM + 1));
            for (let y = 0; y < NM; y++) {
                let somaLinha = 0;
                for (let x = 0; x < NM; x++) {
                    somaLinha += altM[y * NM + x];
                    intA[(y + 1) * (NM + 1) + x + 1] = intA[y * (NM + 1) + x + 1] + somaLinha;
                }
            }
            const somaAlt = (x0, y0, x1, y1) => {
                x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(NM, x1); y1 = Math.min(NM, y1);
                return intA[y1 * (NM + 1) + x1] - intA[y0 * (NM + 1) + x1] - intA[y1 * (NM + 1) + x0] + intA[y0 * (NM + 1) + x0];
            };
            for (let y = 0; y < NM; y++) for (let x = 0; x < NM; x++) {
                const fM = 1 - fatorArena(x, y);   // fatorArena(x, y) recebe COORDENADAS de texel (mancha elíptica) — não um raio
                if (fM <= 0.01) continue;
                const x0 = Math.max(0, x - 4), x1 = Math.min(NM, x + 5), y0 = Math.max(0, y - 4), y1 = Math.min(NM, y + 5);
                let amp = somaAlt(x0, y0, x1, y1) / ((x1 - x0) * (y1 - y0));
                amp = Math.max(-3, Math.min(3, amp));
                if (Math.abs(amp) < 0.05) continue;
                const corr = amp * fM, p = (y * NM + x) * 4;
                dm[p] = Math.max(0, Math.min(255, dm[p] - corr));
                dm[p + 1] = Math.max(0, Math.min(255, dm[p + 1] - corr));
                dm[p + 2] = Math.max(0, Math.min(255, dm[p + 2] - corr));
            }
            g.putImageData(imgM, 0, 0);
        }
        const texChao = new T.CanvasTexture(cv);
        texChao.encoding = T.sRGBEncoding; texChao.anisotropy = 8;
        const geoChao = new T.PlaneGeometry(120, 120, 112, 112); geoChao.rotateX(-Math.PI / 2);
        const pos = geoChao.attributes.position, cores = [];
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i), h = alturaNova(x, z);
            pos.setY(i, h);
            const t = sstep(-0.4, 2.4, h), t2 = sstep(10, 20, Math.hypot(x, z)); // cota fria + borda mais fria
            cores.push((0.90 + 0.11 * t) * (1 - 0.05 * t2), (0.91 + 0.07 * t) * (1 - 0.01 * t2), (0.92 + 0.10 * t) * (1 + 0.05 * t2));
        }
        geoChao.setAttribute('color', new T.Float32BufferAttribute(cores, 3));
        geoChao.computeVertexNormals();
        const chao = new T.Mesh(geoChao, new T.MeshLambertMaterial({ map: texChao, vertexColors: true }));
        chao.receiveShadow = true; chao.name = 'visual2-chao';
        scene.add(chao);
        /* ---------- CÍRCULO PINTADO NO CHÃO (rota adoptada pelo Mestre,
         * 04/11/2026 13:36): a marca do ritual vive NA textura do chão —
         * textura pintada pela Oficina (o anel da volta 3 cozido na terra,
         * mesma posição e escala; geometria provada: faixa 8,69–9,61 m,
         * elipse ×1,22). A fonte verdadeira da pintura é a recozedura
         * x15 (oficina-audit/teste-chao-circulo/recozedura-x15/
         * textura-chao-pintado-x15.png), provado por PSNR na REF_40 —
         * o PNG de 7,79 MB NÃO é a fonte (uma versão antiga deste
         * comentário dava-o como fonte; fica corrigido). O mapa procedural fica como
         * fundo até a textura chegar; __chaoPintadoPronto é o recibo. */
        window.__chaoPintadoPronto = false;
        new T.TextureLoader().load('textura-chao-pintado.jpg', t => {
            /* TROCA DE MAPA: a textura pintada da arena (o disco do
             * ritual) NÃO entra no mapa novo — o bloco do terreno novo
             * mais abaixo já deu ao chão a pele de relva viva. */
            if (chao.material.userData.__mapaNovo) { window.__chaoPintadoPronto = true; return; }
            t.encoding = T.sRGBEncoding; t.anisotropy = 8; // a mesma do chão que esta textura substitui
            chao.material.map = t; chao.material.needsUpdate = true;
            window.__chaoPintadoPronto = true;
        });
        if (world.ground) world.ground.visible = false;

        /* ---------- limpar as «barras pretas» e os rochedos-clone das bordas ---------- */
        scene.traverse(o => {
            if (o.isMesh && o.geometry && o.geometry.type === 'CylinderGeometry' && !o.isInstancedMesh) {
                const p = o.position, s = o.scale; // troncos caídos do mundo: cilindro deitado .12×1.8
                if (Math.abs(s.y - 1.8) < 0.01 && Math.abs(p.y - 0.12) < 0.01) o.visible = false;
            }
            if (o.isInstancedMesh && o.geometry && o.geometry.type === 'IcosahedronGeometry') {
                const m = new T.Matrix4(), v = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3();
                let mudou = false;
                /* TRANCHE PEDRAS/CÂMERA (10/11/2026, crítica do Mestre —
                   «um monte de coisa voando no mapa»): o lote das pedras
                   espalhadas do mundo (icosaedro de detalhe 0; as
                   ruínas são detalhe 1 e NÃO se tocam) nasceu assente
                   em world.height, mas o chão que se vê é alturaNova
                   (mundo + relevo): onde o relevo desce, a pedra ficava
                   suspensa no ar (medido: 210 das 425 visíveis, a pior
                   a 2,50 m). Cada pedra que fica visível desce/sobe
                   pelo relevo do seu (x,z) — o enterramento que ela já
                   trazia fica exactamente o mesmo. */
                const lotePedras = o.geometry.attributes.position.count === 60;
                for (let i = 0; i < o.count; i++) {
                    o.getMatrixAt(i, m); m.decompose(v, q, sc);
                    // VOLTA 3: dentro da arena (r < 6,5 m) saem também as
                    // pedrinhas — eram o «confete» regular que sujava a
                    // pincelada do chão (Disfarce item 4)
                    if (Math.max(sc.x, sc.y, sc.z) > 0.45 || Math.hypot(v.x, v.z) < 6.5) {
                        sc.set(0, 0, 0); m.compose(v, q, sc); o.setMatrixAt(i, m); mudou = true;
                    } else if (lotePedras) {
                        const dy = relevo(v.x, v.z);
                        if (dy) { v.y += dy; m.compose(v, q, sc); o.setMatrixAt(i, m); mudou = true; }
                    }
                }
                if (mudou) o.instanceMatrix.needsUpdate = true;
            }
            /* VOLTA 3: o monte espetado da fogueira extinta (anél de pedras
             * do mundo a r≈1,35) achata-se — brasas e pedras assentam em vez
             * de espetarem (Disfarce item 5). Só Lambert: as brasas Basic
             * (laranja emissivo) ficam intocadas. */
            if (o.isMesh && !o.isInstancedMesh && o.geometry && o.geometry.type === 'IcosahedronGeometry'
                && o.material && !o.material.isMeshBasicMaterial) {
                const d = Math.hypot(o.position.x, o.position.z);
                if (d > 0.85 && d < 1.9 && o.position.y < 0.3) o.scale.y *= 0.55;
            }
        });

        /* ---------- CÍRCULO DE RUNAS: IMPONÊNCIA DE RITUAL ----------
         * TRANCHE DO CÍRCULO (palavra do Mestre, 04/11/2026 12:05): a volta 3
         * da Visual-3 deixou-o «muito fraco, sem sal, sem cor, PEQUENO
         * comparado com a referência». Esta tranche obedece primeiro ao olho
         * dele: o círculo é a peça central da arena — dourado quente, runas
         * grandes e legíveis, sensação de «estou no meio de um ritual».
         * VOLTA 2 (resposta aos JULGAMENTOS PINTURA/DISFARCE CIRC1 — os dois
         * NÃO LIBERA): a volta 1 acertou força/cor/tamanho e caiu no pólo
         * oposto — néon vectorial. PROIBIDO resolver com mais brilho,
         * saturação ou espessura. A volta 2 ganha em TEXTURA, IRREGULARIDADE
         * e DERRAME: (C1) diâmetro sobe para ≥60% da largura em paisagem
         * (disco 20,2 m; banda média a 9,15 m); (C2) morre o disco âmbar
         * sólido — sem preenchimento interior, só manchas de terra e pó
         * ténue, para a textura do chão atravessar; (C3) o derrame faz-se
         * por manchas irregulares que seguem a banda e decaem para fora,
         * sem fronteira seca; (C4) os bordos deixam de ser circunferências:
         * passeio aleatório por sectores (±16 px), largura 0,45–1,55×,
         * falhas raras, e ≥8 pontos de oclusão de terra POR CIMA do ouro;
         * (C5) 52 runas-gravura: 12 tipos, tamanho ±30%, rotação e
         * espaçamento com jitter, traços que falham — nenhuma sequência
         * curta repetida; altura ≈ largura da faixa, como na referência.
         * Pulsação lenta (~7,4 s) e brasas ténues a subir, como na volta 1.
         * VOLTA 3 (última; resposta aos CIRC2 — Pintura: C2/C4/C5 cumpridas,
         * C1/C3/C6 por cumprir; Disfarce: pontos 2/3 cumpridos, 1/4/5/6/7
         * por cumprir): (V3-1) elipse horizontal ×1,22 → aro ≥60% em
         * paisagem; (V3-3) faixa lateral fina — leito/calor e resplendor
         * cortados a ~metade, glifos contidos (h 88→80 px); (C1/V3-4) deriva
         * dos bordos sobe para ±24 px com falhas de linha nomeadas; (C2)
         * 4 CORTES reais de bordo a bordo (apagar + terra por cima) + 2
         * riscos finos; (C5) textura do terreno atravessa a faixa (240
         * traços de terra/pedra por cima do ouro + riscos longos que ligam
         * interior e exterior); (C4) manchas de terra avançam para o centro
         * e a luz interior baixa — a placa oval morre; (V3-2) derrame
         * determinístico a TODA a volta no halo (dois anéis de manchas);
         * (C7) pulsação POR SECTORES (3 cunhas luminosas dessincronizadas)
         * e brasas concentradas junto à faixa; (C6) sequência de glifos sem
         * repetições vizinhas. Protegidos: C2/C4/C5 da Pintura e pontos 2/3
         * do Disfarce — regressão neles reprova sozinha. */
        const RAIO_RITUAL = 10.1;                // raio do disco pintado (m)
        const rc = document.createElement('canvas'); rc.width = rc.height = 2048;
        const r2 = rc.getContext('2d'); r2.translate(1024, 1024);
        const PX_M = 1024 / RAIO_RITUAL;         // ≈101 px por metro
        const R_MED = 9.15 * PX_M, R_FORA = 9.61 * PX_M, R_DENTRO = 8.69 * PX_M;
        /* Passeio da linha à mão: 64 pontos de controlo com deriva suave —
         * os dois bordos e a fileira de runas seguem-no com fases distintas,
         * por isso a faixa engrossa, afina e desvia como gravura no chão. */
        const deriva = (amplitude, passo) => {
            const pts = []; let v = 0;
            for (let i = 0; i < 64; i++) { v += (rnd() - 0.5) * passo; v = Math.max(-amplitude, Math.min(amplitude, v)); pts.push(v); }
            return a => {
                const t = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 64;
                const i0 = Math.floor(t) % 64, i1 = (i0 + 1) % 64, f = t - Math.floor(t);
                return pts[i0] * (1 - f) + pts[i1] * f;
            };
        };
        const desvFora = deriva(24, 11), desvDentro = deriva(24, 11), desvMed = deriva(16, 9);
        r2.lineCap = 'round';
        /* Interior SEM preenchimento (C2): só manchas de terra escuras e pó
         * de ouro esparso, ambos ténues — o chão pintado da camada atravessa. */
        for (let i = 0; i < 105; i++) {
            const a = rnd() * Math.PI * 2, rad = Math.sqrt(rnd()) * R_DENTRO * 0.94;
            const x = Math.cos(a) * rad, y = Math.sin(a) * rad, r = 26 + rnd() * 95;
            const gr = r2.createRadialGradient(x, y, 0, x, y, r);
            const escuro = rnd() < 0.72;
            gr.addColorStop(0, escuro ? 'rgba(30,22,12,' + (0.05 + rnd() * 0.08) + ')' : 'rgba(255,170,70,' + (0.02 + rnd() * 0.03) + ')');
            gr.addColorStop(1, 'rgba(0,0,0,0)');
            r2.fillStyle = gr; r2.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // calor colado à banda (anulus pintado, não disco): traço largo e fraco
        const arcoPintado = (raio, larg, cor, alfa, n, desv) => {
            for (let i = 0; i < n; i++) {
                const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.94) / n) * Math.PI * 2, am = (a0 + a1) / 2;
                r2.strokeStyle = cor; r2.globalAlpha = alfa * (0.7 + rnd() * 0.3);
                r2.lineWidth = larg * (0.82 + rnd() * 0.36);
                r2.beginPath(); r2.arc(0, 0, raio + (desv ? desv(am) : 0) + (rnd() - 0.5) * 5, a0, a1); r2.stroke();
            }
            r2.globalAlpha = 1;
        };
        arcoPintado(R_MED, 96, '#8a5a1c', 0.10, 72, desvMed);    // calor terroso sob a banda (V3-3: fino)
        arcoPintado(R_MED, 76, '#2b1a0b', 0.30, 72, desvMed);    // leito queimado
        arcoPintado(R_MED, 60, '#4a2c10', 0.28, 72, desvMed);    // ocre escuro de base
        /* Bordas do ritual (C4): três passagens com passeio próprio, largura
         * e alfa a variar por segmento, falhas raras — sem compasso. */
        const bordaRitual = (raio, larg, desv) => {
            const cores = ['#f7bd45', '#ffc95a', '#eaa62f', '#ffda78', '#d99626'];
            /* VOLTA 3: 5 janelas de falha nomeadas por bordo — dentro delas o
             * núcleo cai para ~1/5 (a linha parte-se de verdade, sem padrão). */
            const falhas = [];
            for (let f = 0; f < 5; f++) falhas.push([(rnd() * 168) | 0, 2 + ((rnd() * 5) | 0)]);
            const factorFalha = i => { for (const [ini, comp] of falhas) { const d = (i - ini + 168) % 168; if (d < comp) return 0.18; } return 1; };
            r2.shadowColor = '#ff9d1c'; r2.shadowBlur = 11;
            for (let i = 0; i < 168; i++) {
                if (rnd() < 0.025) continue; // falha rara da linha
                const a0 = (i / 168) * Math.PI * 2, a1 = ((i + 0.96) / 168) * Math.PI * 2, am = (a0 + a1) / 2;
                r2.strokeStyle = '#ff9d1c'; r2.globalAlpha = (0.13 + rnd() * 0.13) * factorFalha(i); r2.lineWidth = larg * 1.5;
                r2.beginPath(); r2.arc(0, 0, raio + desv(am) + (rnd() - 0.5) * 8, a0, a1); r2.stroke();
            }
            r2.shadowBlur = 8;
            for (let i = 0; i < 168; i++) {
                if (rnd() < 0.02) continue;
                const a0 = (i / 168) * Math.PI * 2, a1 = ((i + 0.95) / 168) * Math.PI * 2, am = (a0 + a1) / 2;
                r2.strokeStyle = cores[(rnd() * cores.length) | 0]; r2.globalAlpha = (0.55 + rnd() * 0.45) * factorFalha(i);
                r2.lineWidth = larg * (0.35 + rnd() * 1.3);
                r2.beginPath(); r2.arc(0, 0, raio + desv(am) + (rnd() - 0.5) * 8, a0, a1); r2.stroke();
            }
            r2.shadowBlur = 5;
            for (let i = 0; i < 168; i++) {
                const a0 = (i / 168) * Math.PI * 2, a1 = ((i + 0.9) / 168) * Math.PI * 2, am = (a0 + a1) / 2;
                r2.strokeStyle = '#ffe89a'; r2.globalAlpha = 0.26 + rnd() * 0.4; r2.lineWidth = larg * 0.32;
                r2.beginPath(); r2.arc(0, 0, raio + desv(am) + (rnd() - 0.5) * 4, a0, a1); r2.stroke();
            }
            r2.globalAlpha = 1; r2.shadowBlur = 0;
        };
        bordaRitual(R_FORA, 15, desvFora); bordaRitual(R_DENTRO, 13, desvDentro);
        arcoPintado(R_MED, 4, '#ffe083', 0.22, 120, desvMed);    // fio de luz entre fileiras
        // divisórias radiais curtas e irregulares entre glifos
        for (let i = 0; i < 52; i++) {
            const a = (i / 52) * Math.PI * 2 + (rnd() - 0.5) * 0.05;
            r2.strokeStyle = '#ffca4f'; r2.globalAlpha = 0.10 + rnd() * 0.16; r2.lineWidth = 3 + rnd() * 3.4;
            const rIn = R_DENTRO + 12 + rnd() * 10, rOut = R_FORA - 12 - rnd() * 10;
            r2.beginPath();
            r2.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
            r2.lineTo(Math.cos(a + (rnd() - 0.5) * 0.012) * rOut, Math.sin(a + (rnd() - 0.5) * 0.012) * rOut); r2.stroke();
        }
        r2.globalAlpha = 1;
        /* RUNAS-GRAVURA (C5): 52 glifos, 12 tipos, tamanho/rotação/espaço
         * com jitter, traços que falham a ~12% — inscrição, não fonte. */
        const desenharRuna = (tipo, esc, alfa) => {
            const h = 80 * esc, w = 52 * esc, j = () => (rnd() - 0.5) * 6 * esc;
            const seg = (x0, y0, x1, y1) => { if (rnd() < 0.12) return; r2.beginPath(); r2.moveTo(x0 + j(), y0 + j()); r2.lineTo(x1 + j(), y1 + j()); r2.stroke(); };
            r2.lineWidth = (7 + rnd() * 3.4) * esc; r2.globalAlpha = alfa;
            if (tipo !== 9) seg(0, -h / 2, 0, h / 2); // haste-mestra (o tipo 9 é anel partido)
            if (tipo === 0) { seg(0, -h * 0.28, w * 0.52, -h * 0.02); seg(0, h * 0.04, w * 0.48, h * 0.30); }
            if (tipo === 1) { seg(0, -h * 0.05, -w * 0.5, -h * 0.38); seg(0, -h * 0.05, w * 0.5, -h * 0.38); seg(0, h * 0.12, w * 0.42, h * 0.42); }
            if (tipo === 2) { seg(0, -h / 2, w * 0.5, 0); seg(w * 0.5, 0, 0, h / 2); seg(0, h / 2, -w * 0.5, 0); seg(-w * 0.5, 0, 0, -h / 2); }
            if (tipo === 3) { seg(-w * 0.52, -h * 0.12, w * 0.52, -h * 0.12); seg(-w * 0.42, h * 0.22, w * 0.42, h * 0.22); seg(0, -h * 0.34, w * 0.45, -h * 0.34); }
            if (tipo === 4) { seg(-w * 0.45, -h * 0.35, w * 0.38, -h * 0.08); seg(w * 0.38, -h * 0.08, -w * 0.38, h * 0.18); seg(-w * 0.38, h * 0.18, w * 0.45, h * 0.42); }
            if (tipo === 5) { seg(0, -h / 2, w * 0.52, h * 0.05); seg(w * 0.52, h * 0.05, 0, h / 2); seg(0, -h * 0.1, -w * 0.48, h * 0.28); }
            if (tipo === 6) { seg(0, -h * 0.28, -w * 0.5, h * 0.22); seg(0, -h * 0.28, w * 0.5, h * 0.22); seg(-w * 0.5, h * 0.22, w * 0.5, h * 0.22); }
            if (tipo === 7) { seg(0, -h * 0.36, w * 0.52, -h * 0.36); seg(0, 0, -w * 0.52, 0); seg(0, h * 0.36, w * 0.52, h * 0.36); seg(-w * 0.32, -h / 2, -w * 0.32, h / 2); }
            if (tipo === 8) { seg(0, -h * 0.42, -w * 0.5, -h * 0.05); seg(0, -h * 0.42, w * 0.5, -h * 0.05); seg(0, h * 0.02, -w * 0.44, h * 0.40); seg(0, h * 0.02, w * 0.44, h * 0.40); }
            if (tipo === 9) { r2.beginPath(); r2.arc(0, 0, w * 0.42, 0.6 + rnd() * 0.5, 4.4 + rnd() * 0.8); r2.stroke(); seg(0, -h * 0.44, 0, h * 0.44); }
            if (tipo === 10) { seg(-w * 0.5, -h * 0.42, w * 0.5, h * 0.42); seg(-w * 0.5, h * 0.42, w * 0.5, -h * 0.42); }
            if (tipo === 11) { seg(-w * 0.48, -h * 0.30, 0, -h * 0.02); seg(0, -h * 0.02, -w * 0.48, h * 0.30); seg(w * 0.48, -h * 0.30, 0, h * 0.34); }
            r2.globalAlpha = 1;
        };
        r2.shadowColor = '#ffb02a';
        let tipoAnterior = -1;
        for (let i = 0; i < 52; i++) {
            const a = ((i + (rnd() - 0.5) * 0.62) / 52) * Math.PI * 2;
            const rad = R_MED + desvMed(a) + (rnd() - 0.5) * 7;
            const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
            const gasto = (i % 17 === 6 || i % 13 === 9) ? 0.38 + rnd() * 0.2 : 1; // glifos comidos, sem padrão curto
            const esc = (0.72 + rnd() * 0.58) * (gasto < 1 ? 0.9 : 1);
            let tipo = (i * 7 + ((i * i) >> 2) + 3) % 12; // sequência sem período curto reconhecível
            if (tipo === tipoAnterior) tipo = (tipo + 5) % 12; // C6: vizinhos nunca iguais
            tipoAnterior = tipo;
            r2.save(); r2.translate(x, y); r2.rotate(a + Math.PI / 2 + (rnd() - 0.5) * 0.38);
            r2.strokeStyle = '#ff9d1c'; r2.shadowBlur = 18; desenharRuna(tipo, esc, 0.18 * gasto);
            r2.strokeStyle = (i % 5 === 0) ? '#ffe98f' : '#ffd34f'; r2.shadowBlur = 8;
            desenharRuna(tipo, esc, (0.74 + rnd() * 0.26) * gasto);
            r2.restore();
        }
        r2.shadowBlur = 0;
        // poeira de ouro e riscos dentro da banda
        for (let i = 0; i < 240; i++) {
            const a = rnd() * Math.PI * 2, rad = R_MED + desvMed(a) + (rnd() - 0.5) * 96;
            const x = Math.cos(a) * rad, y = Math.sin(a) * rad, comp = 5 + rnd() * 19;
            r2.strokeStyle = rnd() < 0.72 ? '#ffe083' : '#b97c22'; r2.globalAlpha = 0.08 + rnd() * 0.2; r2.lineWidth = 1.5 + rnd() * 3.2;
            r2.beginPath(); r2.moveTo(x, y); r2.lineTo(x + Math.cos(a + Math.PI / 2) * comp, y + Math.sin(a + Math.PI / 2) * comp); r2.stroke();
        }
        r2.globalAlpha = 1;
        /* OCLUSÃO DO MUNDO (C4/D5/D6): a terra morde o ouro em ≥8 pontos —
         * manchas e arcos de sujidade POR CIMA da faixa, concentrados nas
         * passagens e no primeiro plano; mais riscos de uso a cruzar. */
        for (let c = 0; c < 10; c++) {
            const aBase = [0.42, 1.83, 3.35, 4.91][c % 4] + (rnd() - 0.5) * 0.9 + (c >= 8 ? 0.8 : 0);
            for (let i = 0; i < 10; i++) {
                const a = aBase + (rnd() - 0.5) * 0.20, rad = R_MED + desvMed(a) + (rnd() - 0.5) * 92;
                const x = Math.cos(a) * rad, y = Math.sin(a) * rad, r = 10 + rnd() * 30;
                const gr = r2.createRadialGradient(x, y, 0, x, y, r);
                gr.addColorStop(0, 'rgba(36,26,13,' + (0.16 + rnd() * 0.24) + ')'); gr.addColorStop(1, 'rgba(36,26,13,0)');
                r2.fillStyle = gr; r2.fillRect(x - r, y - r, r * 2, r * 2);
            }
            const am = aBase, rArco = R_MED + desvMed(am);
            r2.strokeStyle = 'rgba(30,21,10,' + (0.20 + rnd() * 0.14) + ')'; r2.lineWidth = 18 + rnd() * 26;
            r2.beginPath(); r2.arc(0, 0, rArco, aBase - 0.05 - rnd() * 0.05, aBase + 0.05 + rnd() * 0.06); r2.stroke();
        }
        for (let i = 0; i < 130; i++) { // riscos de uso a cruzar a banda
            const a = rnd() * Math.PI * 2, rad = R_MED + desvMed(a) + (rnd() - 0.5) * 94;
            const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
            r2.strokeStyle = 'rgba(34,25,13,' + (0.10 + rnd() * 0.18) + ')'; r2.lineWidth = 1.4 + rnd() * 3;
            r2.beginPath(); r2.moveTo(x, y); r2.lineTo(x + (rnd() - 0.5) * 36, y + (rnd() - 0.5) * 36); r2.stroke();
        }
        /* VOLTA 3 — a terra avança para o centro (Disfarce C4): bolsas de tom
         * de terra escura coladas ao bordo interior, a entrar irregulares —
         * a fronteira claro/escuro deixa de ser um oval desenhável. */
        for (let i = 0; i < 30; i++) {
            const a = rnd() * Math.PI * 2, rad = R_DENTRO * (0.55 + rnd() * 0.42);
            const x = Math.cos(a) * rad, y = Math.sin(a) * rad, r = 55 + rnd() * 115;
            const gr = r2.createRadialGradient(x, y, 0, x, y, r);
            gr.addColorStop(0, 'rgba(26,19,10,' + (0.09 + rnd() * 0.11) + ')'); gr.addColorStop(1, 'rgba(26,19,10,0)');
            r2.fillStyle = gr; r2.fillRect(x - r, y - r, r * 2, r * 2);
        }
        /* VOLTA 3 — CORTES REAIS (Disfarce C2): 4 sectores apagados de bordo
         * a bordo (ouro + leito + halo da textura) e repintados com terra:
         * a marca foi PISADA até desaparecer nesses pontos. Assimétricos:
         * ângulos e larguras sem relação entre si. */
        const cortes = [[0.92, 0.085], [2.48, 0.055], [4.14, 0.105], [5.63, 0.045]];
        for (const [aC, largC] of cortes) {
            r2.save();
            r2.globalCompositeOperation = 'destination-out';
            r2.beginPath();
            r2.arc(0, 0, R_FORA + 46, aC - largC / 2, aC + largC / 2);
            r2.arc(0, 0, R_DENTRO - 46, aC + largC / 2, aC - largC / 2, true);
            r2.closePath(); r2.fillStyle = 'rgba(0,0,0,1)'; r2.fill();
            r2.restore();
            // terra por cima do corte: manchas do tom do chão + riscos de arrasto
            for (let i = 0; i < 16; i++) {
                const a = aC + (rnd() - 0.5) * largC * 1.7, rad = R_MED + (rnd() - 0.5) * 120;
                const x = Math.cos(a) * rad, y = Math.sin(a) * rad, r = 12 + rnd() * 34;
                const gr = r2.createRadialGradient(x, y, 0, x, y, r);
                gr.addColorStop(0, 'rgba(43,33,18,' + (0.30 + rnd() * 0.30) + ')'); gr.addColorStop(1, 'rgba(43,33,18,0)');
                r2.fillStyle = gr; r2.fillRect(x - r, y - r, r * 2, r * 2);
            }
            for (let i = 0; i < 7; i++) { // arrastos tangenciais a cruzar o corte
                const a = aC + (rnd() - 0.5) * largC, rad = R_MED + (rnd() - 0.5) * 100;
                const x = Math.cos(a) * rad, y = Math.sin(a) * rad, comp = 22 + rnd() * 38;
                r2.strokeStyle = 'rgba(52,40,22,' + (0.30 + rnd() * 0.25) + ')'; r2.lineWidth = 2.4 + rnd() * 4;
                r2.beginPath(); r2.moveTo(x, y); r2.lineTo(x + Math.cos(a + Math.PI / 2) * comp, y + Math.sin(a + Math.PI / 2) * comp); r2.stroke();
            }
        }
        for (const aF of [1.62, 3.58]) { // 2 riscos finos de bordo a bordo
            r2.save();
            r2.globalCompositeOperation = 'destination-out';
            r2.beginPath();
            r2.arc(0, 0, R_FORA + 40, aF - 0.008, aF + 0.008);
            r2.arc(0, 0, R_DENTRO - 40, aF + 0.008, aF - 0.008, true);
            r2.closePath(); r2.fillStyle = 'rgba(0,0,0,1)'; r2.fill();
            r2.restore();
            r2.strokeStyle = 'rgba(40,30,15,0.5)'; r2.lineWidth = 5;
            r2.beginPath(); r2.arc(0, 0, R_MED, aF - 0.008, aF + 0.008); r2.stroke();
        }
        /* VOLTA 3 — a textura ATRAVESSA a faixa (Disfarce C5): traços do
         * próprio chão (palha clara, terra escura, pedra cinzenta) desenhados
         * POR CIMA do ouro, em todas as direcções — e 14 riscos longos que
         * ligam o interior ao exterior cruzando a banda inteira. */
        const coresChao = ['216,188,138', '24,19,13', '96,94,88', '140,116,76'];
        for (let i = 0; i < 240; i++) {
            const a = rnd() * Math.PI * 2, rad = R_MED + desvMed(a) + (rnd() - 0.5) * 118;
            const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
            const ang = rnd() * Math.PI * 2, comp = 9 + rnd() * 30;
            r2.strokeStyle = 'rgba(' + coresChao[(rnd() * coresChao.length) | 0] + ',' + (0.16 + rnd() * 0.24) + ')';
            r2.lineWidth = 1.4 + rnd() * 2.8;
            r2.beginPath(); r2.moveTo(x, y); r2.lineTo(x + Math.cos(ang) * comp, y + Math.sin(ang) * comp); r2.stroke();
        }
        for (let i = 0; i < 70; i++) { // pedrinhas e grão sobre o ouro
            const a = rnd() * Math.PI * 2, rad = R_MED + desvMed(a) + (rnd() - 0.5) * 110;
            const x = Math.cos(a) * rad, y = Math.sin(a) * rad, s = 1.6 + rnd() * 3.6;
            r2.fillStyle = 'rgba(' + (rnd() < 0.5 ? '30,26,20' : '120,116,104') + ',' + (0.3 + rnd() * 0.35) + ')';
            r2.fillRect(x, y, s, s * (0.6 + rnd() * 0.7));
        }
        for (let i = 0; i < 14; i++) { // riscos longos interior → exterior
            const a = rnd() * Math.PI * 2, rIn = R_DENTRO - 30 - rnd() * 50, rOut = R_FORA + 30 + rnd() * 50;
            r2.strokeStyle = 'rgba(226,198,146,' + (0.20 + rnd() * 0.18) + ')'; r2.lineWidth = 1.6 + rnd() * 2.2;
            r2.beginPath();
            r2.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
            r2.lineTo(Math.cos(a + (rnd() - 0.5) * 0.03) * rOut, Math.sin(a + (rnd() - 0.5) * 0.03) * rOut); r2.stroke();
        }
        // derrame próximo DENTRO da textura: manchas quentes fora da banda, a decair
        for (let i = 0; i < 95; i++) {
            const a = rnd() * Math.PI * 2, rad = R_FORA + 8 + rnd() * 42;
            const x = Math.cos(a) * rad, y = Math.sin(a) * rad, r = 12 + rnd() * 30;
            const gr = r2.createRadialGradient(x, y, 0, x, y, r);
            gr.addColorStop(0, 'rgba(255,158,52,' + (0.05 + rnd() * 0.08) + ')'); gr.addColorStop(1, 'rgba(255,140,30,0)');
            r2.fillStyle = gr; r2.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // círculo interior ténue e incompleto: profundidade de ritual antigo
        arcoPintado(3.12 * PX_M, 3.2, '#e8b34c', 0.12, 42, null);
        const texRunas = new T.CanvasTexture(rc); texRunas.encoding = T.sRGBEncoding; texRunas.anisotropy = 8;
        const circulo = new T.Mesh(new T.CircleGeometry(RAIO_RITUAL, 128),
            new T.MeshBasicMaterial({ map: texRunas, transparent: true, toneMapped: false, depthWrite: false, opacity: 0.96, fog: false }));
        circulo.rotation.x = -Math.PI / 2; circulo.position.y = 0.045; circulo.renderOrder = 2; circulo.name = 'visual2-circulo-runas';
        circulo.scale.x = 1.22; // V3-1: elipse horizontal — o aro passa a ≥60% da largura em paisagem
        scene.add(circulo);
        /* Derrame luminoso MANCHADO (C3): nada de gradiente radial liso —
         * 170 manchas irregulares seguem a banda e decaem para fora e para
         * dentro; o plano tem 26 m para a luz morrer sem fronteira seca. */
        const hc = document.createElement('canvas'); hc.width = hc.height = 512;
        const hx = hc.getContext('2d');
        const manchaHalo = (x, y, r, alfa) => {
            const gr = hx.createRadialGradient(x, y, 0, x, y, r);
            gr.addColorStop(0, 'rgba(255,166,62,' + alfa + ')'); gr.addColorStop(1, 'rgba(255,150,40,0)');
            hx.fillStyle = gr; hx.fillRect(x - r, y - r, r * 2, r * 2);
        };
        for (let i = 0; i < 170; i++) {
            const a = rnd() * Math.PI * 2, zona = rnd();
            // no plano de 26 m, a banda (9,15 m) cai a ≈180 px do centro
            const rad = zona < 0.58 ? 150 + rnd() * 62 : (zona < 0.82 ? 92 + rnd() * 56 : 214 + rnd() * 38);
            const x = 256 + Math.cos(a) * rad, y = 256 + Math.sin(a) * rad, r = 13 + rnd() * 46;
            manchaHalo(x, y, r, (zona < 0.58 ? 0.07 : 0.018) + rnd() * (zona < 0.58 ? 0.07 : 0.03));
        }
        /* VOLTA 3 (V3-2): derrame determinístico a TODA a volta — dois anéis
         * de manchas a seguir a banda por fora, sem sector esquecido (o arco
         * direito e o frontal já não apagam em 10 px). */
        for (let a = 0; a < Math.PI * 2; a += 0.055 + rnd() * 0.05) {
            const rad = 178 + rnd() * 34, x = 256 + Math.cos(a) * rad, y = 256 + Math.sin(a) * rad;
            manchaHalo(x, y, 15 + rnd() * 26, 0.05 + rnd() * 0.07);
        }
        for (let a = 0; a < Math.PI * 2; a += 0.09 + rnd() * 0.06) {
            const rad = 216 + rnd() * 28, x = 256 + Math.cos(a) * rad, y = 256 + Math.sin(a) * rad;
            manchaHalo(x, y, 18 + rnd() * 30, 0.03 + rnd() * 0.055);
        }
        const texHalo = new T.CanvasTexture(hc); texHalo.encoding = T.sRGBEncoding;
        const halo = new T.Mesh(new T.PlaneGeometry(26, 26),
            new T.MeshBasicMaterial({ map: texHalo, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, opacity: 0.5 }));
        halo.rotation.x = -Math.PI / 2; halo.position.y = 0.016; halo.renderOrder = 1; halo.name = 'visual2-halo-ritual';
        halo.scale.x = 1.22; // acompanha a elipse do círculo (V3-1)
        scene.add(halo);
        /* VOLTA 3 (C7): pulsação POR SECTORES — 3 cunhas de luz suave sobre
         * a banda, dessincronizadas ~120°; cada uma respira na sua fase e a
         * onda de calor viaja pelo perímetro em vez de pulsar o anel todo. */
        const cunhaTex = (() => {
            const cc = document.createElement('canvas'); cc.width = cc.height = 512;
            const c2 = cc.getContext('2d'); c2.translate(256, 256); c2.lineCap = 'round';
            for (let r = 196; r <= 244; r += 8) for (let a = -0.92; a <= 0.92; a += 0.045) {
                const fade = Math.cos((a / 0.92) * Math.PI / 2);
                c2.strokeStyle = 'rgba(255,166,62,' + (0.10 * fade * fade) + ')'; c2.lineWidth = 9;
                c2.beginPath(); c2.arc(0, 0, r, a, a + 0.05); c2.stroke();
            }
            const t = new T.CanvasTexture(cc); t.encoding = T.sRGBEncoding; return t;
        })();
        const cunhas = [];
        for (let k = 0; k < 3; k++) {
            const geoCunha = new T.PlaneGeometry(21.4, 21.4); geoCunha.rotateX(-Math.PI / 2);
            const cunha = new T.Mesh(geoCunha, new T.MeshBasicMaterial({
                map: cunhaTex, transparent: true, opacity: 0, blending: T.AdditiveBlending,
                depthWrite: false, toneMapped: false, fog: false
            }));
            cunha.rotation.y = k * (Math.PI * 2 / 3) + 0.5; cunha.position.y = 0.052; cunha.renderOrder = 3;
            cunha.scale.x = 1.22; cunha.name = 'visual2-cunha-ritual-' + k;
            scene.add(cunha); cunhas.push(cunha);
        }
        // luz do ritual: mais contida que na volta 1 (o disco liso morre também na luz)
        const luzRunas = new T.PointLight(0xffa640, 0.8, 26, 2); // CIRCORA: distância 18→26, para a luz do ritual alcançar a banda ×1,5
        luzRunas.position.set(0, 2.2, 0); luzRunas.name = 'visual2-luz-ritual'; scene.add(luzRunas);
        const luzChao = new T.PointLight(0xff8f2e, 0.20, 9, 2);
        luzChao.position.set(0, 0.55, 0); luzChao.name = 'visual2-luz-chao-ritual'; scene.add(luzChao);
        /* Brasas do ritual: ~120 pontos ténues a subir dentro do círculo. */
        const pc3 = document.createElement('canvas'); pc3.width = pc3.height = 64;
        const px3 = pc3.getContext('2d'), pg3 = px3.createRadialGradient(32, 32, 1, 32, 32, 32);
        pg3.addColorStop(0, 'rgba(255,236,170,1)'); pg3.addColorStop(0.35, 'rgba(255,178,74,0.55)'); pg3.addColorStop(1, 'rgba(255,140,30,0)');
        px3.fillStyle = pg3; px3.fillRect(0, 0, 64, 64);
        const N_BRASAS = 120, posBrasas = new Float32Array(N_BRASAS * 3), brasas = [];
        for (let i = 0; i < N_BRASAS; i++) {
            const a = rnd() * Math.PI * 2, rad = rnd() < 0.55 ? 7.7 + rnd() * 1.9 : Math.sqrt(rnd()) * 8.5; // C7: a maioria nasce junto à faixa
            brasas.push({ x: Math.cos(a) * rad, z: Math.sin(a) * rad, base: rnd() * 3.1, vel: 0.05 + rnd() * 0.10, fase: rnd() * Math.PI * 2, deriva: 0.05 + rnd() * 0.16 });
            posBrasas[i * 3] = brasas[i].x; posBrasas[i * 3 + 1] = brasas[i].base; posBrasas[i * 3 + 2] = brasas[i].z;
        }
        const geoBrasas = new T.BufferGeometry();
        geoBrasas.setAttribute('position', new T.BufferAttribute(posBrasas, 3));
        /* Véu por casa dos motes (t-veu-brilhos, volta 2, S2-9):
           cor por ponto — (1,1,1) vista, (0,0,0) nunca (o aditivo
           apaga), dessaturado em memoria. */
        geoBrasas.setAttribute('color', new T.BufferAttribute(new Float32Array(N_BRASAS * 3).fill(1), 3));
        const brasasPts = new T.Points(geoBrasas, new T.PointsMaterial({
            map: new T.CanvasTexture(pc3), color: 0xffc46b, size: 0.17, transparent: true, opacity: 0.38,
            depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true, vertexColors: true
        }));
        brasasPts.renderOrder = 4; brasasPts.name = 'visual2-brasas-ritual';
        /* TRANCHE CIRCORA (04/11/2026): banda ×1,5 — as brasas acompanham
         * o anel novo (escala 1,83×1,5, a da variante medida circfora). */
        brasasPts.scale.set(1.83, 1, 1.5); scene.add(brasasPts);
        /* Objecto partilhado dos estados dos motes: a cena (dona de
           setCamadas) muta os dois conjuntos no lugar a cada
           reaplicação; este ciclo lê-os por casa. Sem cena a
           aplicá-los, ficam vazios = tudo vista, como hoje. */
        world.veuMotes = { nunca: new Set(), memoria: new Set() };
        /* F-18: canal do factor da luzRunas do ritual (a cena é a
           dona — publica em cada reaplicação do véu o factor anti-D3
           do centro, R=8). Sem cena a aplicá-lo, fica 1 = a luz de
           hoje, como os motes sem cena ficam tudo-vista. */
        world.veuLuzRitual = { factor: 1 };
        /* Cinzento possível em aditivo: multiplicar por um escalar
           cinzento NÃO dessatura (mantém o laranja); divide-se a
           luminância alvo (0,45 × L) por cada canal da cor do
           material — o produto cor × vértice fica cinzento a 0,45L. */
        const corMoteMat = brasasPts.material.color;
        const lumMote = 0.299 * corMoteMat.r + 0.587 * corMoteMat.g + 0.114 * corMoteMat.b;
        const corMoteMemoria = [Math.min(1, 0.45 * lumMote / corMoteMat.r), Math.min(1, 0.45 * lumMote / corMoteMat.g), Math.min(1, 0.45 * lumMote / corMoteMat.b)];
        /* Casa de um ponto do mundo: contenção no rectângulo da
           arena pela inversa de wx/wz (a forma Math.round equivale
           à contenção); fora do rectângulo, a chave não existe nos
           conjuntos = vista. */
        const casaMote = (px, pz) => Math.round(px / 1.5 + (area.cols - 1) / 2) + area.origin.x + ',' + (Math.round(pz / 1.5 + (area.rows - 1) / 2) + area.origin.y);
        /* Pulsação lenta ligada ao relógio da cena (período ≈7,4 s). */
        const updateMundoRitual = world.update.bind(world);
        world.update = time => {
            updateMundoRitual(time);
            const respiro = 0.5 + 0.5 * Math.sin(time * 0.85);
            circulo.material.opacity = 0.925 + respiro * 0.065;
            halo.material.opacity = 0.42 + respiro * 0.14;
            luzRunas.intensity = (0.72 + respiro * 0.2) * (world.veuLuzRitual ? world.veuLuzRitual.factor : 1); /* F-18: factor anti-D3 da cena (a luzChao, abaixo, não muda — (ii) medido e mantido) */
            luzChao.intensity = 0.17 + respiro * 0.07;
            brasasPts.material.opacity = 0.3 + respiro * 0.12;
            for (let k = 0; k < cunhas.length; k++) // C7: sectores dessincronizados
                cunhas[k].material.opacity = Math.pow(Math.max(0, Math.sin(time * 0.85 - k * 2.09)), 3) * 0.5;
            const posAttr = geoBrasas.attributes.position;
            const corAttr = geoBrasas.attributes.color;
            for (let i = 0; i < N_BRASAS; i++) {
                const b = brasas[i], subida = (b.base + time * b.vel) % 3.1;
                posAttr.array[i * 3] = b.x + Math.sin(time * 0.35 + b.fase) * b.deriva;
                posAttr.array[i * 3 + 1] = 0.14 + subida;
                posAttr.array[i * 3 + 2] = b.z + Math.cos(time * 0.29 + b.fase * 1.3) * b.deriva;
                /* Cor do mote pelo estado da sua casa (S2-9): a
                   posição do mundo é a local × escala do objecto
                   (1,83 × 1,5), deriva incluída. */
                const chaveMote = casaMote(posAttr.array[i * 3] * 1.83, posAttr.array[i * 3 + 2] * 1.5);
                let crM = 1, cgM = 1, cbM = 1;
                if (world.veuMotes.nunca.has(chaveMote)) { crM = 0; cgM = 0; cbM = 0; }
                else if (world.veuMotes.memoria.has(chaveMote)) { crM = corMoteMemoria[0]; cgM = corMoteMemoria[1]; cbM = corMoteMemoria[2]; }
                corAttr.array[i * 3] = crM; corAttr.array[i * 3 + 1] = cgM; corAttr.array[i * 3 + 2] = cbM;
            }
            posAttr.needsUpdate = true;
            corAttr.needsUpdate = true;
        };

        /* CÍRCULO PINTADO: desligam-se o disco, o halo e as cunhas
         * sobrepostas — a marca já está na textura do chão e o programa
         * deixa de desenhar arcos por cima da terra. A luz do ritual, a
         * luz do chão e as brasas FICAM: são luz e partículas da cena,
         * não a marca desenhada (a pintura, em si, não pulsa nem emite
         * luz — limitação lavrada do activo). */
        circulo.visible = false; halo.visible = false;
        cunhas.forEach(c => c.visible = false);

        /* ---------- menires: pedra FRIA e irregular, sem sombra-barra ---------- */
        /* VOLTA 2: pedra e madeira PINTADAS — texturas canvas com manchas,
         * veios, fendas e musgo (a pedra) / veios longitudinais (a madeira);
         * multiplicam a cor do material (base clara, quase neutra). A mesma
         * pedra serve os menires do mundo via pintarMaterial. */
        const texPedra = (() => {
            const pc = document.createElement('canvas'); pc.width = pc.height = 256;
            const p = pc.getContext('2d');
            p.fillStyle = '#c7cac4'; p.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 240; i++) { // manchas de matéria
                const x = rnd() * 256, y = rnd() * 256, r = 8 + rnd() * 42;
                const gr = p.createRadialGradient(x, y, 0, x, y, r), t = rnd();
                const cor = t < 0.4 ? '96,98,94' : (t < 0.7 ? '168,166,150' : '110,116,96');
                gr.addColorStop(0, 'rgba(' + cor + ',' + (0.16 + rnd() * 0.24) + ')'); gr.addColorStop(1, 'rgba(' + cor + ',0)');
                p.fillStyle = gr; p.fillRect(x - r, y - r, r * 2, r * 2);
            }
            for (let i = 0; i < 14; i++) { // VOLTA 3: manchas grandes de idade (a pedra tem história)
                const x = rnd() * 256, y = rnd() * 256, r = 34 + rnd() * 62;
                const gr = p.createRadialGradient(x, y, 0, x, y, r), t = rnd();
                const cor = t < 0.5 ? '52,54,48' : (t < 0.8 ? '86,94,58' : '150,138,110');
                gr.addColorStop(0, 'rgba(' + cor + ',' + (0.18 + rnd() * 0.18) + ')'); gr.addColorStop(1, 'rgba(' + cor + ',0)');
                p.fillStyle = gr; p.fillRect(x - r, y - r, r * 2, r * 2);
            }
            p.lineCap = 'round';
            for (let i = 0; i < 46; i++) { // veios e riscos
                const x = rnd() * 256, y = rnd() * 256;
                p.strokeStyle = 'rgba(70,70,66,' + (0.14 + rnd() * 0.18) + ')'; p.lineWidth = 1 + rnd() * 2.4;
                p.beginPath(); p.moveTo(x, y); p.lineTo(x + (rnd() - 0.5) * 10, y + 14 + rnd() * 40); p.stroke();
            }
            for (let i = 0; i < 13; i++) { // VOLTA 3: fendas mais fundas e legíveis à distância
                let x = rnd() * 256, y = rnd() * 200;
                p.strokeStyle = 'rgba(30,30,27,' + (0.5 + rnd() * 0.3) + ')'; p.lineWidth = 1.5 + rnd() * 1.7;
                p.beginPath(); p.moveTo(x, y);
                for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 22; y += 10 + rnd() * 18; p.lineTo(x, y); }
                p.stroke();
            }
            for (let i = 0; i < 500; i++) { // grão de pedra + musgo miúdo
                const musgo = rnd() < 0.3;
                p.fillStyle = musgo ? 'rgba(84,96,52,' + (0.12 + rnd() * 0.2) + ')' : 'rgba(52,52,48,' + (0.08 + rnd() * 0.14) + ')';
                p.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2.6, 1 + rnd() * 2.6);
            }
            const t = new T.CanvasTexture(pc); t.encoding = T.sRGBEncoding;
            t.wrapS = t.wrapT = T.RepeatWrapping; return t;
        })();
        const texMadeira = (() => {
            const wc = document.createElement('canvas'); wc.width = wc.height = 256;
            const w = wc.getContext('2d');
            w.fillStyle = '#d3c6ae'; w.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 90; i++) { // veios longitudinais
                const x = rnd() * 256;
                w.strokeStyle = 'rgba(110,84,54,' + (0.10 + rnd() * 0.2) + ')'; w.lineWidth = 0.8 + rnd() * 2.4;
                w.beginPath(); w.moveTo(x, -6);
                w.bezierCurveTo(x + (rnd() - 0.5) * 14, 80, x + (rnd() - 0.5) * 14, 170, x + (rnd() - 0.5) * 10, 262); w.stroke();
            }
            for (let i = 0; i < 160; i++) {
                w.fillStyle = 'rgba(90,70,44,' + (0.08 + rnd() * 0.14) + ')';
                w.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 3 + rnd() * 9);
            }
            const t = new T.CanvasTexture(wc); t.encoding = T.sRGBEncoding;
            t.wrapS = t.wrapT = T.RepeatWrapping; return t;
        })();
        const texContacto = (() => { // sombra de contacto IRREGULAR (mancha, não carimbo oval)
            const bc = document.createElement('canvas'); bc.width = bc.height = 128;
            const b = bc.getContext('2d');
            for (let i = 0; i < 26; i++) {
                const a = (i / 26) * Math.PI * 2, rr = 30 + rnd() * 24, x = 64 + Math.cos(a) * rr * 0.85, y = 64 + Math.sin(a) * rr * 0.85;
                const gr = b.createRadialGradient(x, y, 0, x, y, 18 + rnd() * 16);
                gr.addColorStop(0, 'rgba(10,8,5,0.20)'); gr.addColorStop(1, 'rgba(10,8,5,0)');
                b.fillStyle = gr; b.fillRect(0, 0, 128, 128);
            }
            const gr2 = b.createRadialGradient(64, 64, 4, 64, 64, 60);
            gr2.addColorStop(0, 'rgba(8,6,4,0.5)'); gr2.addColorStop(1, 'rgba(8,6,4,0)');
            b.fillStyle = gr2; b.fillRect(0, 0, 128, 128);
            return new T.CanvasTexture(bc);
        })();
        const pedra = new T.MeshLambertMaterial({ color: C(0x9aa1a8), map: texPedra, vertexColors: true });
        const pedraSolta = new T.MeshLambertMaterial({ color: C(0x878e94), map: texPedra });
        /* VOLTA 3 (Pintura condição 2; Disfarce (a) e N3): os menires deixam
         * de ser cones gémeos — cada um com raios/altura/inclinação próprios,
         * jitter forte e barriga por anel de altura; a cor por vértice pinta
         * os DOIS lados de luz (quente virado ao sol, frio na sombra) e a
         * base suja de terra, para a pedra ter matéria mesmo na sombra —
         * esconder no escuro deixou de ser estratégia. */
        const solDir = new T.Vector3(-18, 27, -13.5).normalize();
        /* TRANCHE CIRCORA (decisão do Mestre, 04/11/2026 14:12; condição
         * vinculante da bancada de proporções): os menires sobem para cima
         * da NOVA banda do círculo (raio médio ≈13,7 m × elipse 1,22 —
         * pontos da elipse nas diagonais), assentados por alturaNova
         * (o relevo nasce aos 9,2 m — a banda já o tem). MEDIDAS: valores
         * FIXOS por instância nomeada (o sorteio vive só na deformação da
         * pedra e na pose — jitter de escala abolido, regra da bancada de
         * Medidas) e factor ×1,30 sobre a tabela da volta 3 = o TECTO de
         * escala do nativo dessa bancada. A banda-alvo de 25–32% do ecrã
         * NÃO é alcançável para a classe inteira dentro do tecto com este
         * activo (mediana ≈25% em paisagem; só os dois altos entram) —
         * declarado no relatório da tranche em vez de forçado; o
         * cumprimento pleno espera o activo novo de monólito
         * (620–660 cm, condicional) da bancada de Medidas. */
        [[11.84, 9.7, 3.51, 0.47, 0.88], [-11.84, 9.7, 5.07, 0.39, 0.68], [11.84, -9.7, 4.10, 0.57, 0.78], [-11.84, -9.7, 5.59, 0.35, 0.61]].forEach(([x, z, h, rTopo, rBase], i) => {
            const geoM = new T.CylinderGeometry(rTopo, rBase, h, 7, 4);
            const pp = geoM.attributes.position, fase = rnd() * 6.28;
            for (let k = 0; k < pp.count; k++) { // jitter forte + barriga irregular por altura
                const y0 = pp.getY(k), tt = (y0 + h / 2) / h;
                const bulge = 1 + 0.15 * Math.sin(tt * 5.1 + fase) + (rnd() - 0.5) * 0.1;
                pp.setX(k, pp.getX(k) * bulge + (rnd() - 0.5) * 0.24);
                pp.setZ(k, pp.getZ(k) * bulge + (rnd() - 0.5) * 0.24);
                if (y0 > h * 0.49) pp.setY(k, y0 - rnd() * 0.45);
            }
            geoM.computeVertexNormals();
            const nn = geoM.attributes.normal, coresM = [];
            for (let k = 0; k < pp.count; k++) { // dois lados de luz pintados + base com terra
                const quente = Math.max(0, nn.getX(k) * solDir.x + nn.getY(k) * solDir.y + nn.getZ(k) * solDir.z);
                const tt = (pp.getY(k) + h / 2) / h, sujidade = tt < 0.3 ? 0.55 + 0.45 * (tt / 0.3) : 1;
                const base = (0.72 + 0.42 * quente) * sujidade;
                coresM.push(base * (1 + 0.10 * quente), base * 0.99, base * (1 - 0.13 * quente + 0.08 * (1 - quente)));
            }
            geoM.setAttribute('color', new T.Float32BufferAttribute(coresM, 3));
            const soloM = alturaNova(x, z);
            const menir = new T.Mesh(geoM, pedra);
            menir.position.set(x, soloM + h / 2 - 0.06, z);
            menir.rotation.set((rnd() - 0.5) * 0.13, rnd() * Math.PI, (rnd() - 0.5) * 0.13);
            menir.castShadow = false; menir.receiveShadow = true; menir.name = 'visual2-menir-' + i;
            scene.add(menir);
            for (let cix = 0; cix < 3; cix++) { // pedaços partidos à volta da base: a pedra assentou e partiu
                const s = (0.16 + rnd() * 0.3) * 1.3, geoC = new T.IcosahedronGeometry(s, 0); // CIRCORA: pedaços ×1,3 com o menir
                const pc2 = geoC.attributes.position;
                for (let k = 0; k < pc2.count; k++) { pc2.setX(k, pc2.getX(k) + (rnd() - 0.5) * 0.08); pc2.setZ(k, pc2.getZ(k) + (rnd() - 0.5) * 0.08); }
                geoC.computeVertexNormals();
                const pedaco = new T.Mesh(geoC, pedraSolta);
                const aa = rnd() * Math.PI * 2, dd = (0.75 + rnd() * 0.55) * 1.3; // CIRCORA: espalham com a base maior
                pedaco.position.set(x + Math.cos(aa) * dd, alturaNova(x + Math.cos(aa) * dd, z + Math.sin(aa) * dd) + s * 0.4, z + Math.sin(aa) * dd);
                pedaco.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
                pedaco.castShadow = false; pedaco.receiveShadow = true; pedaco.name = 'visual2-menir-pedaco-' + i + '-' + cix;
                scene.add(pedaco);
            }
            const contacto = new T.Mesh(new T.PlaneGeometry(3.1, 3.1), // CIRCORA: contacto 2,4→3,1 m (×1,3) com o menir maior
                new T.MeshBasicMaterial({ map: texContacto, transparent: true, depthWrite: false, fog: true }));
            contacto.rotation.x = -Math.PI / 2; contacto.rotation.z = rnd() * Math.PI;
            contacto.position.set(x, soloM + 0.045, z); contacto.name = 'visual2-contacto-' + i;
            scene.add(contacto);
        });

        /* ---------- ANÉIS DE SILHUETAS PINTADAS (Visual 3, PESQUISA-A §4.3) ----------
         * Matte painting barato: 2 cilindros abertos com linha de pinheiros
         * pintada em canvas (recorte irregular, alphaTest — sem ordenar
         * transparências), cores pré-arrefecidas por camada e fog ligado:
         * a camada longe quase se dissolve na névoa. BackSide = vê-se o
         * interior do anel em qualquer direcção da câmara (modo 360° ok).
         * A base vai enterrada (−1,4 m) para o relevo não abrir fendas. */
        /* ---------- LIMPEZA-VISUAL C1R v5: a linha de árvores como ARTE NOVA ----------
         * PROTÓTIPO (só o anel longe; o perto continua na v4 até a bancada
         * julgar este). A abordagem «desgastar a silhueta do cone» foi
         * condenada por 3 rondas de crítica de Arte (ripas → cacos de
         * papel → copas roídas): aqui a forma NASCE floresta — duas filas
         * de copas redondas sobrepostas (a de trás mais fundida na névoa),
         * vales ocasionais entre aglomerados, emergentes raros, textura
         * interior, e a base a desfazer-se em fios verticais com a
         * densidade a crescer para baixo. A régua é a leitura à distância
         * de batalha: massa contínua, sem aresta dura, sem motivo
         * repetido legível, sem ilhas suspensas.
         * Consumo da stream `rnd` PRESERVADO: a pintura antiga corre para
         * um canvas de rascunho com exactamente as mesmas chamadas rnd()
         * de sempre — a stream alimenta tochas, chamas e cenário a
         * jusante; mexer nela deslocava a cena aprovada toda. */
        const anelPintado = (raio, altura, cor, nome) => {
            const cv2 = document.createElement('canvas'); cv2.width = 2048; cv2.height = 256;
            const a2 = cv2.getContext('2d');
            a2.fillStyle = cor; a2.beginPath(); a2.moveTo(0, 256);
            let xL = 0;
            while (xL < 2048) {
                const w = 26 + rnd() * 46, topo = 256 - (86 + rnd() * 118);
                a2.lineTo(xL + w * 0.5, topo); a2.lineTo(xL + w, 256 - (18 + rnd() * 26));
                if (rnd() < 0.75) a2.fillRect(xL + w * 0.44, 256 - 34, 3.4, 34);
                xL += w * (0.72 + rnd() * 0.4);
            }
            a2.lineTo(2048, 256); a2.closePath(); a2.fill();
            a2.globalAlpha = 0.16;
            for (let i = 0; i < 260; i++) {
                a2.fillStyle = '#8fa8bc'; const sx = rnd() * 2048, sy = 120 + rnd() * 130;
                a2.fillRect(sx, sy, 5 + rnd() * 16, 1.6 + rnd() * 2.2);
            }
            a2.globalAlpha = 1;
            a2.clearRect(0, 0, 2048, 256);   // a pintura antiga era só consumo de stream — o canvas recomeça limpo
            /* a arte nova — semente local derivada do raio, como antes */
            let seedF = 71221024 + raio;
            const rndF = () => ((seedF = (Math.imul(seedF, 1664525) + 1013904223) >>> 0) / 4294967296);
            const longe = raio > 40;
            const canal = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
            const mistura = (h1, h2, f) => { const A = canal(h1), B = canal(h2); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * f)).join(',') + ')'; };
            const corTras = mistura(cor, '#8fa8bc', longe ? 0.55 : 0.44), corFrente = mistura(cor, '#22303f', 0.12);
            const elipse = (cx, cy, rx, ry, fill) => { a2.fillStyle = fill; for (const dx of [-2048, 0, 2048]) { a2.beginPath(); a2.ellipse(cx + dx, cy, rx, ry, 0, 0, 6.2832); a2.fill(); } };
            /* A massa constrói-se como PERFIL de alturas (não como formas
             * fechadas): cada coluna tem um tecto; saltos em 3 escalas —
             * aglomerado, copa, tufo — empilham-se e a silhueta é uma
             * linha de paisagem contínua, sem óvalo que se possa isolar
             * com o olho. Duas filas: trás (mais alta, mais névoa) e
             * frente (mais baixa, mais escura), cada uma com o seu perfil. */
            const massa = (cor, base, saltos, nEntalhes, gradLuz) => {
                const top = new Float32Array(2048).fill(base);
                const salto = (c, w, h) => {
                    c = Math.round(c); w = Math.round(w);   // índices do Float32Array têm de ser inteiros — centro fraccionário escrevia em propriedades fantasmas e o salto perdia-se
                    for (let dx = -w; dx <= w; dx++) {
                        const x = (((c + dx) % 2048) + 2048) % 2048, t = dx / w, forma = 1 - t * t;
                        const cand = top[x] - h * forma;
                        if (cand < top[x]) top[x] = Math.max(44, cand);
                    }
                };
                for (const s of saltos) salto(s[0], s[1], s[2]);
                a2.fillStyle = cor; a2.beginPath(); a2.moveTo(0, top[0]);
                for (let x = 1; x < 2048; x++) a2.lineTo(x, top[x]);
                a2.lineTo(2048, 256); a2.lineTo(0, 256); a2.closePath(); a2.fill();
                // modelação tonal: luz no tecto da massa, sombra na base (só onde há massa)
                const gr = a2.createLinearGradient(0, 40, 0, 256);
                gr.addColorStop(0, 'rgba(163,186,205,' + gradLuz + ')'); gr.addColorStop(0.45, 'rgba(163,186,205,0.05)');
                gr.addColorStop(1, 'rgba(8,13,20,' + gradLuz + ')');
                a2.save(); a2.globalCompositeOperation = 'source-atop'; a2.fillStyle = gr; a2.fillRect(0, 0, 2048, 256); a2.restore();
                // o contorno parte-se à escala da folhagem: dentadas de céu pequenas e irregulares
                a2.save(); a2.globalCompositeOperation = 'destination-out';
                for (let i = 0; i < nEntalhes; i++) {
                    const x = (rndF() * 2048) | 0;
                    a2.globalAlpha = 0.5 + rndF() * 0.5;
                    a2.fillRect(x, top[x] - 1, 2 + rndF() * 4, 2 + rndF() * 8);
                }
                a2.restore(); a2.globalAlpha = 1;
                return top;
            };
            const saltosDe = (passoMin, passoVar, hMin, hVar, wMin, wVar, fAlt = 1) => {
                const s = [];
                for (let cx = -160; cx < 2210; cx += passoMin + rndF() * passoVar) {
                    s.push([cx + rndF() * 30, wMin + rndF() * wVar, (hMin + rndF() * hVar) * fAlt]);                    // o aglomerado
                    const n = 2 + (rndF() * 2 | 0);
                    for (let k = 0; k < n; k++) s.push([cx + (rndF() * 2 - 1) * 40, 15 + rndF() * 17, (16 + rndF() * 16) * fAlt]); // copas sobre ele
                    if (rndF() < 0.10) s.push([cx + (rndF() * 2 - 1) * 18, 24 + rndF() * 12, (18 + rndF() * 12) * fAlt]);          // emergente raro — largo, nunca uma cunha estreita
                }
                for (let x = 0; x < 2048; x += 13 + rndF() * 17) s.push([x, 6 + rndF() * 8, (5 + rndF() * 7) * fAlt]);              // tufos por todo o tecto
                return s;
            };
            /* CRISTA (missão limpeza-visual-v5-crista): no anel de perto, os
             * topos mais altos furavam a crista do terreno nos sectores
             * direitos do 360° e liam-se como recortes pálidos isolados
             * sobre a linha do horizonte. As alturas dos saltos do anel de
             * perto baixam (fAlt 0,42) para os tectos ficarem abaixo da
             * crista em todos os sectores; o anel de longe não muda
             * (fAlt 1 — a mesma corrente de sorteio, a mesma textura). */
            const fAltAnel = longe ? 1 : 0.42;
            const topTras = massa(corTras, 224, saltosDe(95, 80, 36, 22, 34, 30, fAltAnel), 1500, 0.20);
            const topFrente = massa(corFrente, 232, saltosDe(95, 80, 30, 20, 34, 30, fAltAnel), 1200, 0.30);
            for (let i = 0; i < 260; i++) {                           // textura interior: brilhos logo sob o tecto da fila da frente
                a2.globalAlpha = 0.05 + rndF() * 0.10; a2.fillStyle = '#8fa8bc';
                const sx = (rndF() * 2048) | 0, sy = topFrente[sx] + 4 + rndF() * 48;
                for (const dx of [-2048, 0, 2048]) a2.fillRect(sx + dx, sy, 5 + rndF() * 17, 1.6 + rndF() * 2.4);
            }
            for (let i = 0; i < 170; i++) {                           // idem sob o tecto da fila de trás (parte a lisura das massas pálidas)
                a2.globalAlpha = 0.05 + rndF() * 0.09; a2.fillStyle = '#aebfd0';
                const sx = (rndF() * 2048) | 0, sy = topTras[sx] + 3 + rndF() * 36;
                for (const dx of [-2048, 0, 2048]) a2.fillRect(sx + dx, sy, 4 + rndF() * 14, 1.5 + rndF() * 2.2);
            }
            for (let i = 0; i < 110; i++) {                           // textura interior: sombras suaves de profundidade
                a2.globalAlpha = 0.05 + rndF() * 0.08; a2.fillStyle = '#1c2836';
                const sx = rndF() * 2048, sy = 130 + rndF() * 110;
                for (const dx of [-2048, 0, 2048]) { a2.beginPath(); a2.ellipse(sx + dx, sy, 18 + rndF() * 44, 8 + rndF() * 15, 0, 0, 6.2832); a2.fill(); }
            }
            a2.globalAlpha = 1;
            /* A dissolução mora na LINHA DO CHÃO VISÍVEL: o cilindro está
             * enterrado 1,4 m, logo a linha do terreno na textura é a
             * linha 256 − (1,4/altura)·256 (longe ≈ 230 · perto ≈ 216) —
             * abaixo dela a textura nem se vê. A erosão concentra-se nos
             * ~48 px acima dessa linha e morre abaixo dela: a massa
             * encontra o chão partida por clareiras de névoa, sem saia de
             * estática nem trechos suspensos. */
            const linhaChao = 256 - Math.round(1.4 / altura * 256);
            a2.save(); a2.globalCompositeOperation = 'destination-out';
            for (let i = 0; i < 90; i++) {                             // clareiras de névoa junto ao chão
                a2.globalAlpha = 0.22 + rndF() * 0.25;
                const sx = rndF() * 2048, sy = linhaChao - 16 + rndF() * 18;
                for (const dx of [-2048, 0, 2048]) { a2.beginPath(); a2.ellipse(sx + dx, sy, 8 + rndF() * 16, 3 + rndF() * 5, 0, 0, 6.2832); a2.fill(); }
            }
            const nFios = longe ? 2400 : 1800;                         // fios finos em tufos, só na faixa da linha do chão
            for (let i = 0; i < nFios; i++) {
                const y0 = (linhaChao - 46) + Math.pow(rndF(), 1.3) * 48, prof = (y0 - (linhaChao - 46)) / 48;
                if (rndF() > 0.22 + 0.78 * prof) continue;
                a2.globalAlpha = 0.40 + rndF() * 0.60;
                const xx = rndF() * 2048, wdt = 1.5 + rndF() * 4, hgt = 3 + rndF() * 8;
                for (const dx of [-2048, 0, 2048]) a2.fillRect(xx + dx, y0, wdt, hgt);
            }
            a2.restore(); a2.globalAlpha = 1; a2.globalCompositeOperation = 'source-over';
            { // limpeza de ilhas: componente desligada e pequena sai. A análise corre
              // em largura dupla — a costura x=0/2048 não parte componentes a meio.
                const imgL = a2.getImageData(0, 0, 2048, 256), d = imgL.data;
                const W2 = 4096, opaco = new Uint8Array(W2 * 256);
                for (let y = 0; y < 256; y++) for (let x = 0; x < 2048; x++) {
                    const v = d[(y * 2048 + x) * 4 + 3] > 107 ? 1 : 0;
                    opaco[y * W2 + x] = v; opaco[y * W2 + x + 2048] = v;
                }
                const visto = new Uint8Array(W2 * 256), pilha = [], apagar = new Uint8Array(2048 * 256);
                for (let s0 = 0; s0 < W2 * 256; s0++) {
                    if (visto[s0]) continue;
                    visto[s0] = 1;
                    if (!opaco[s0]) continue;
                    const comp = []; let toca = false;
                    pilha.push(s0);
                    while (pilha.length) {
                        const p = pilha.pop(); comp.push(p);
                        const py = (p / W2) | 0, px = p - py * W2;
                        if (py >= 250) toca = true;
                        if (px > 0 && opaco[p - 1] && !visto[p - 1]) { visto[p - 1] = 1; pilha.push(p - 1); }
                        if (px < W2 - 1 && opaco[p + 1] && !visto[p + 1]) { visto[p + 1] = 1; pilha.push(p + 1); }
                        if (py > 0 && opaco[p - W2] && !visto[p - W2]) { visto[p - W2] = 1; pilha.push(p - W2); }
                        if (py < 255 && opaco[p + W2] && !visto[p + W2]) { visto[p + W2] = 1; pilha.push(p + W2); }
                    }
                    if (!toca && comp.length <= 700) {
                        const unic = new Set(comp.map(p => ((p / W2) | 0) * 2048 + ((p % W2) % 2048)));
                        if (unic.size <= 350) for (const u of unic) apagar[u] = 1;
                    }
                }
                let mudou = false;
                for (let p = 0; p < 2048 * 256; p++) if (apagar[p]) { d[p * 4 + 3] = 0; mudou = true; }
                { // REGRA DE CONTACTO (correcção pós-crítica de Arte v5): no canvas
                  // VISÍVEL (linhas 0..linhaChao+2), uma componente que não toca na
                  // linha do chão visível lê-se suspensa no render — apaga-se,
                  // seja qual for o tamanho. A colina pode cortar a base acima da
                  // linha nominal; por isso os vales das filas desceram para
                  // junto dela na mesma correcção.
                    const G2 = linhaChao + 2, opR = new Uint8Array(W2 * (G2 + 1));
                    for (let y = 0; y <= G2; y++) for (let x = 0; x < 2048; x++) {
                        const v = d[(y * 2048 + x) * 4 + 3] > 107 ? 1 : 0;
                        opR[y * W2 + x] = v; opR[y * W2 + x + 2048] = v;
                    }
                    const visR = new Uint8Array(W2 * (G2 + 1)), pilhaR = [];
                    for (let s0 = 0; s0 < W2 * (G2 + 1); s0++) {
                        if (visR[s0]) continue;
                        visR[s0] = 1;
                        if (!opR[s0]) continue;
                        const comp = []; let toca = false;
                        pilhaR.push(s0);
                        while (pilhaR.length) {
                            const p = pilhaR.pop(); comp.push(p);
                            const py = (p / W2) | 0, px = p - py * W2;
                            if (py >= G2) toca = true;
                            if (px > 0 && opR[p - 1] && !visR[p - 1]) { visR[p - 1] = 1; pilhaR.push(p - 1); }
                            if (px < W2 - 1 && opR[p + 1] && !visR[p + 1]) { visR[p + 1] = 1; pilhaR.push(p + 1); }
                            if (py > 0 && opR[p - W2] && !visR[p - W2]) { visR[p - W2] = 1; pilhaR.push(p - W2); }
                            if (py < G2 && opR[p + W2] && !visR[p + W2]) { visR[p + W2] = 1; pilhaR.push(p + W2); }
                        }
                        if (!toca) for (const p of comp) {
                            const u = ((p / W2) | 0) * 2048 + ((p % W2) % 2048);
                            if (d[u * 4 + 3] !== 0) { d[u * 4 + 3] = 0; mudou = true; }
                        }
                    }
                }
                if (mudou) a2.putImageData(imgL, 0, 0);
            }
            const tex = new T.CanvasTexture(cv2); tex.encoding = T.sRGBEncoding;
            tex.wrapS = T.RepeatWrapping; tex.repeat.x = 3;
            const anel = new T.Mesh(new T.CylinderGeometry(raio, raio, altura, 64, 1, true),
                new T.MeshBasicMaterial({ map: tex, transparent: false, alphaTest: 0.42, side: T.BackSide, fog: true }));
            anel.position.y = altura / 2 - 1.4; anel.name = nome;
            scene.add(anel);
        };


        /* LIMPEZA-VISUAL C1R: alturas 13→9 / 21→14 (ponto de partida do
         * diagnóstico — os números finais nascem das capturas C4) e corpos
         * aclarados para a família da névoa (#35485e), para a aresta deixar
         * de recortar contra o céu. */
        anelPintado(34, 9, '#31465e', 'visual2-anel-perto');
        anelPintado(55, 14, '#35485e', 'visual2-anel-longe');

        /* ---------- TRANCHE CIRCORA: as tochas do anel sobem para a banda nova ----------
         * Os braseiros do mundo (sagrado — mundo.js INTOCADO) nascem a
         * 8,6–8,7 m e 6,3 m do centro: marcavam a banda ANTIGA. A condição
         * vinculante manda os marcos SOBRE a nova banda (×1,5: raio médio
         * ≈13,73 m, elipse ×1,22 como a da textura pintada). Movem-se aqui
         * os 3 grupos e as PointLight emparelhadas do mundo, identificados
         * pelas posições exactas com que o mundo os cria — sem tocar em
         * mundo.js, sem consumir rnd (a cena continua determinística) e
         * ANTES da decoração das chamas (secção seguinte), que passa a ler
         * as posições já novas. O assentamento é por alturaNova, como o
         * resto das peças fora da arena.
         * MEDIDA (tabela adoptada por ele, 04/11/2026 14:41): a tocha vale
         * 150–165 cm. A estrutura do braseiro mede 1,27 m (medido: os 3
         * cilindros) — escala FIXA ×1,24 (dentro do tecto ×1,30) leva a
         * estrutura a ≈1,58 m, meio da banda; a chama, que é fogo, sobe
         * com o grupo. A decoração seguinte lê a posição mundial da chama,
         * por isso acompanha a escala sem mais código. */
        {
            const BANDA_R = 13.73, ELIPSE_X = 1.22, ESCALA_TOCHA = 1.24;
            const posBraseiros = [[-area.cols * .75 - 1, -2], [area.cols * .75 + 1, 1], [1, -area.rows * .75 - 1]];
            const gruposB = [], luzesB = [];
            scene.traverse(o => {
                if (o.isGroup) gruposB.push(o);
                if (o.isPointLight && o.color.getHex() === 0xff792b && Math.abs(o.distance - 9) < 0.01) luzesB.push(o);
            });
            for (const [bx, bz] of posBraseiros) {
                const g = gruposB.find(gr => Math.abs(gr.position.x - bx) < 0.01 && Math.abs(gr.position.z - bz) < 0.01);
                if (!g) continue;
                const k = BANDA_R / Math.hypot(bx, bz);
                const nx = bx * k * ELIPSE_X, nz = bz * k, ny = alturaNova(nx, nz);
                g.position.set(nx, ny, nz);
                g.scale.setScalar(ESCALA_TOCHA);
                const luz = luzesB.find(l => Math.abs(l.position.x - bx) < 0.01 && Math.abs(l.position.z - bz) < 0.01);
                if (luz) luz.position.set(nx, ny + 1.8, nz);
            }
        }

        /* ---------- tochas: poça de luz FÍSICA + halo que é brilho, não copo ----------
         * Crítico R2 (D4/N1): chama sem poça medida (razões 0,73–1,20) e halo
         * sprite opaco a ler-se como volume. Agora: uma PointLight por chama
         * (a poça nasce da luz, à distância da chama ao chão) e sprite com
         * textura de queda apertada, opacidade 0,32, escala contida. */
        const gc2 = document.createElement('canvas'); gc2.width = gc2.height = 128;
        const gx = gc2.getContext('2d'), gg = gx.createRadialGradient(64, 64, 2, 64, 64, 64);
        gg.addColorStop(0, 'rgba(255,190,90,0.55)'); gg.addColorStop(0.35, 'rgba(255,150,60,0.20)');
        gg.addColorStop(0.7, 'rgba(255,130,50,0.05)'); gg.addColorStop(1, 'rgba(255,120,40,0)');
        gx.fillStyle = gg; gx.fillRect(0, 0, 128, 128);
        const texBrilho = new T.CanvasTexture(gc2);
        const chamas = [], hexChama = C(0xff631d).getHex(), hexMiolo = C(0xffdf8e).getHex(), vTmp = new T.Vector3();
        scene.traverse(o => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial && o.material.color && o.material.color.getHex() === hexChama) chamas.push(o); });
        /* VOLTA 3 (Disfarce (c) — a mesma gota repetida era o denunciante
         * n.º 2): cada chama ganha geometria DEFORMADA própria — a geometria
         * do mundo é partilhada por todas as peças de icosaedro, por isso
         * clona-se antes de deformar: ponta dobrada, barriga deslocada,
         * inclinação e matiz próprios. Nenhuma tocha igual a outra. */
        const deformarChama = (f, fase, forca) => {
            const geo = f.geometry.clone(), pp = geo.attributes.position;
            for (let k = 0; k < pp.count; k++) {
                const x = pp.getX(k), y = pp.getY(k), z = pp.getZ(k), t = Math.max(0, (y + 1) / 2);
                pp.setX(k, x * (1 - 0.3 * t) + Math.sin(t * 4.2 + fase) * 0.22 * t * forca);
                pp.setZ(k, z * (1 - 0.24 * t) + Math.cos(t * 3.4 + fase * 1.7) * 0.18 * t * forca);
                pp.setY(k, y * (1 + 0.1 * Math.sin(fase * 2.3)));
            }
            geo.computeVertexNormals(); f.geometry = geo;
        };
        const fc = document.createElement('canvas'); fc.width = fc.height = 64; // fumo: mancha macia escura
        const fx = fc.getContext('2d'), fg = fx.createRadialGradient(32, 32, 2, 32, 32, 32);
        fg.addColorStop(0, 'rgba(40,36,30,0.85)'); fg.addColorStop(1, 'rgba(40,36,30,0)');
        fx.fillStyle = fg; fx.fillRect(0, 0, 64, 64);
        const texFumo = new T.CanvasTexture(fc);
        chamas.forEach(f => {
            /* VOLTA 3: forma deformada + escala/rotação/matiz bem separados
             * de tocha para tocha; o brilho acompanha e o fumo sobe mais. */
            deformarChama(f, rnd() * 6.28, 1);
            f.scale.x *= 0.7 + rnd() * 0.5; f.scale.y *= 0.78 + rnd() * 0.75; f.scale.z *= 0.7 + rnd() * 0.5;
            f.rotation.y = rnd() * Math.PI; f.rotation.z = (rnd() - 0.5) * 0.34;
            f.material = f.material.clone();
            f.material.color.offsetHSL((rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.06);
            f.getWorldPosition(vTmp);
            const s = new T.Sprite(new T.SpriteMaterial({ map: texBrilho, color: 0xffa040, transparent: true, opacity: 0.26 + rnd() * 0.1, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
            s.scale.set(1.1 + rnd() * 0.35, 1.35 + rnd() * 0.45, 1); s.position.copy(vTmp); scene.add(s);
            const fumo = new T.Sprite(new T.SpriteMaterial({ map: texFumo, transparent: true, opacity: 0.17 + rnd() * 0.08, depthWrite: false, fog: true }));
            fumo.scale.set(0.7 + rnd() * 0.4, 1.25 + rnd() * 0.6, 1);
            fumo.position.set(vTmp.x + (rnd() - 0.5) * 0.14, vTmp.y + 0.62, vTmp.z); scene.add(fumo);
            const luzTocha = new T.PointLight(0xff8f3f, 0.72 + rnd() * 0.22, 6.5, 2);
            luzTocha.position.copy(vTmp); scene.add(luzTocha);
        });
        // o miolo amarelo de cada chama também varia (mesma deformação, mais leve)
        scene.traverse(o => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial && o.material.color && o.material.color.getHex() === hexMiolo) { deformarChama(o, rnd() * 6.28, 0.7); o.rotation.z = (rnd() - 0.5) * 0.3; } });

        /* ---------- peças do acervo nas bordas: silhuetas, NENHUMA projecta sombra ---------- */
        const stats = { pecas: 0, chamas: chamas.length, fog: 'FogExp2@0.0105', triangulos: 0, pecasCena: 0 };
        window.__visual2Stats = stats;
        const escurecer = (raiz, factor, frio) => raiz.traverse(o => {
            if (o.isMesh) {
                o.material = o.material.clone();
                if (o.material.color) o.material.color.multiplyScalar(factor * (0.88 + rnd() * 0.24)).lerp(C(0x2c3a34), frio);
                // VOLTA 2: peças «semi-transparentes tipo decalque» — material
                // que o GLB marcou transparente sem o ser volta a SÓLIDO.
                if (o.material.transparent && o.material.opacity > 0.97 && !o.material.alphaTest) { o.material.transparent = false; o.material.opacity = 1; o.material.depthWrite = true; }
                o.castShadow = false; o.receiveShadow = true;
            }
        });
        const porPeca = (ficheiro, nome, x, z, alturaAlvo, factor, frio) => {
            new T.GLTFLoader().load(ficheiro, gltf => {
                const alvo = gltf.scene.getObjectByName(nome);
                if (!alvo) return;
                const peca = alvo.clone(true);
                peca.updateMatrixWorld(true);
                const caixa = new T.Box3().setFromObject(peca);
                const tam = caixa.getSize(new T.Vector3()), centro = caixa.getCenter(new T.Vector3());
                if (!isFinite(tam.y) || tam.y <= 0) return;
                // os nós do pacote vivem espalhados (ex.: x≈190): recentra-se a peça
                // num grupo — base no origem, escala e poisar passam a ser exactos
                peca.position.x -= centro.x; peca.position.y -= caixa.min.y; peca.position.z -= centro.z;
                const grupo = new T.Group(); grupo.add(peca);
                const escBase = alturaAlvo / tam.y; // VOLTA 2: escala NÃO-uniforme — menos silhuetas gémeas
                grupo.scale.set(escBase * (0.85 + rnd() * 0.35), escBase * (0.9 + rnd() * 0.3), escBase * (0.85 + rnd() * 0.35));
                grupo.position.set(x, alturaNova(x, z) - 0.05, z);
                grupo.rotation.y = rnd() * Math.PI * 2;
                escurecer(peca, factor, frio);
                scene.add(grupo); stats.pecas++;
                // VOLTA 3: sombra de contacto irregular debaixo de cada peça
                // — peça sem contacto lê-se «colada» (Disfarce item 10)
                const tamC = Math.min(3.4, Math.max(1.3, alturaAlvo * 0.6));
                const contacto = new T.Mesh(new T.PlaneGeometry(tamC, tamC),
                    new T.MeshBasicMaterial({ map: texContacto, transparent: true, depthWrite: false, fog: true }));
                contacto.rotation.x = -Math.PI / 2; contacto.rotation.z = rnd() * Math.PI;
                contacto.position.set(x, alturaNova(x, z) + 0.03, z); contacto.name = 'visual2-contacto-peca-' + stats.pecas;
                scene.add(contacto);
            }, undefined, () => {});
        };
        const anel = (n, dMin, dMax, fn) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rnd() * 0.5, d = dMin + rnd() * (dMax - dMin); fn(Math.cos(a) * d, Math.sin(a) * d, i); } };
        /* VOLTA 3 (Disfarce (d) e N2): os pinheiros GLB saem — as copas
         * facetadas low-poly foram condenadas como «recorte poligonal
         * pousado». Ficam as árvores MORTAS (silhuetas de ramos, que se
         * lêem como forma pintada contra a névoa), mais longe (13–19,5 m),
         * mais rochas e mato baixo — tudo com sombra de contacto. */
        /* TROCA DE MAPA — SEPARAÇÃO (lei do Mestre, 21/11/2026 00:36:
         * «Tudo do mapa antigo fica no mapa antigo»): nesta candidata,
         * as peças GLB dos anéis do mundo antigo (árvores mortas,
         * rochas, arbustos) NÃO são pedidas — a candidata constrói-se
         * só com o mapa novo. A guarda é o delta; as três chamadas da
         * base ficam intactas abaixo dela (o mapa antigo não se toca).
         * O resto dos herdados sai na LIMPEZA no fim do bloco da troca. */
        const TROCA_SEM_HERDADOS = true;
        if (!TROCA_SEM_HERDADOS) {
            anel(8, 13, 19.5, (x, z, i) => porPeca('modelos/cenario/arvores-mortas.glb', 'DeadTree_' + [5, 1, 3, 5, 1, 3, 5, 1][i % 8], x, z, 4.5 + rnd() * 2, 0.34, 0.44));
            anel(10, 9.9, 13.5, (x, z, i) => porPeca('modelos/cenario/rochas.glb', 'Rock_' + (1 + (i % 5)), x, z, 0.9 + rnd() * 1.3, 0.8, 0.12));
            anel(12, 9.6, 13.5, (x, z, i) => porPeca('modelos/cenario/arbustos.glb', i % 2 ? 'Bush' : 'Plant_1', x, z, 0.55 + rnd() * 0.4, 0.42, 0.38));
        }

        /* ================= TROCA DE MAPA — PASSO 2a: O CHÃO COBRE O SECTOR =================
         * O chão da base tem 120×120 m e o sector da prova tem 260×260 m
         * (em coordenadas do jogo: x −124..136, z −149..111) — sem isto,
         * a maior parte das zonas aprovadas caía FORA do chão visível,
         * sobre o plano de vazio. A geometria é substituída por um plano
         * de 272×272 m centrado no centro do sector (6, −19), com o
         * deslocamento COZIDO nos vértices (a posição local continua a
         * ser a coordenada do mundo, como o bloco do TERRENO NOVO a
         * jusante presume), alturas de alturaNova e 192×192 segmentos
         * (a densidade da prova: 190×190 em 260 m). As cores por vértice
         * são repintadas pelo bloco do TERRENO NOVO logo abaixo (ele
         * itera a geometria actual); a geometria antiga é libertada. */
        {
            const geoNovaM = new T.PlaneGeometry(272, 272, 192, 192);
            geoNovaM.rotateX(-Math.PI / 2);
            geoNovaM.translate(6, 0, -19);
            const posN = geoNovaM.attributes.position;
            const corN = new Float32Array(posN.count * 3);
            for (let i = 0; i < posN.count; i++) {
                posN.setY(i, alturaNova(posN.getX(i), posN.getZ(i)));
                corN[i * 3] = 1; corN[i * 3 + 1] = 1; corN[i * 3 + 2] = 1;
            }
            geoNovaM.setAttribute('color', new T.BufferAttribute(corN, 3));
            geoNovaM.computeVertexNormals();
            chao.geometry.dispose();
            chao.geometry = geoNovaM;
        }

        /* ================= TROCA DE MAPA — TERRENO NOVO (troca-mapa) =================
         * Passo 1 da troca (palavra do Mestre, 20/11/2026 23:40): o chão
         * visível deixa a pele da arena (textura pintada com o disco do
         * ritual) e veste a do mapa povoado — relva VIVA procedural da
         * prova (a receita aprovada: base #4c7527, 24.000 lâminas, palha
         * 3%), com as cores por vértice da receita da prova (verde vivo
         * dominante, dourado só no coração das manchas, terra discreta,
         * tinta do caminho, areia/lama/leito junto à água). O material
         * continua Lambert — MATE por construção (sem termo especular,
         * sem IBL): é assim que o item dele «chão muito liso e
         * brilhante» (23:36) nasce corrigido neste mapa; o grão fino
         * por coordenadas do mundo (a pele da integração reforçada)
         * entra no Passo 2 do plano. E o lago ganha a sua água (disco
         * simples neste passo; o reflexo planar da prova é o Passo 6).
         * Coordenadas da prova: px = x − 6, pz = z + 19 (a origem do
         * jogo está sobre a Clareira 1); lago no jogo: centro (42, 11),
         * raio 30, água a −0,85. RNG privado (rndM): a sequência de
         * `rnd` da cena não se consome. */
        {
            let semM = 20261120;
            const rndM = () => (semM = (semM * 16807) % 2147483647) / 2147483647;
            const ruidoM = (x, z, s) => Math.sin(x * s + Math.cos(z * s * 0.83) * 2.1) * Math.cos(z * s - Math.sin(x * s * 0.71) * 1.7);
            const manchaOuroM = (px, pz) => ruidoM(px, pz, 0.016) * 0.5 + 0.5;
            const manchaTerraM = (px, pz) => ruidoM(px + 40, pz - 25, 0.030) * 0.5 + 0.5;
            const caminhoZM = px => -56 + (px + 130) * 0.52 + 15 * Math.sin(px * 0.020 + 0.6);
            const distCaminhoM = (px, pz) => Math.abs(pz - caminhoZM(px)) + ruidoM(px, pz, 0.11) * 1.6;
            const AGUA_Y_M2 = -0.85;
            // textura de relva viva (a receita da prova, via canvas)
            const cvM = document.createElement('canvas'); cvM.width = cvM.height = 1024;
            const gM = cvM.getContext('2d');
            gM.fillStyle = '#4c7527'; gM.fillRect(0, 0, 1024, 1024);
            const tonsM = ['#5d8a33', '#679638', '#527d2c', '#71a23f', '#48702a', '#7fae47', '#3f6a24', '#86b04c'];
            for (let i = 0; i < 24000; i++) {
                const x = rndM() * 1024, y = rndM() * 1024, h = 5 + rndM() * 11;
                gM.strokeStyle = rndM() < 0.03 ? '#8a7a3a' : tonsM[(rndM() * tonsM.length) | 0];
                gM.globalAlpha = 0.25 + rndM() * 0.55; gM.lineWidth = 1 + rndM() * 1.6;
                const inclM = (rndM() - 0.5) * 1.5;
                gM.beginPath(); gM.moveTo(x, y); gM.lineTo(x + Math.sin(inclM) * h, y - Math.cos(inclM) * h); gM.stroke();
            }
            /* PERTO (21/11): a mesma folhagem caida da pele (a textura
             * base e o grao da pele leem-se juntos ao pe da figura) */
            for (let i = 0; i < 900; i++) {
                gM.fillStyle = ['#8a7a3a', '#a8894a', '#6d5c2a'][(rndM() * 3) | 0];
                gM.globalAlpha = 0.30 + rndM() * 0.45;
                gM.beginPath(); gM.ellipse(rndM() * 1024, rndM() * 1024, 3 + rndM() * 5, 1.5 + rndM() * 2, rndM() * 3.2, 0, 7); gM.fill();
            }
            for (let i = 0; i < 500; i++) {
                gM.fillStyle = '#2e521c';
                gM.globalAlpha = 0.18 + rndM() * 0.3;
                gM.beginPath(); gM.ellipse(rndM() * 1024, rndM() * 1024, 4 + rndM() * 9, 3 + rndM() * 6, rndM() * 3.2, 0, 7); gM.fill();
            }
            gM.globalAlpha = 1;
            const texRelvaM = new T.CanvasTexture(cvM);
            texRelvaM.wrapS = texRelvaM.wrapT = T.RepeatWrapping;
            texRelvaM.repeat.set(54, 54);   // baldosa de ~2,2 m, como na prova (118 repetições / 260 m)
            texRelvaM.encoding = T.sRGBEncoding; texRelvaM.anisotropy = 8;
            chao.material.map = texRelvaM;
            chao.material.userData.__mapaNovo = true;
            chao.material.needsUpdate = true;
            // cores por vértice: a receita da prova sobre o terreno novo
            const posM = chao.geometry.attributes.position, corM = chao.geometry.attributes.color;
            const mistM = (c, alvo, k) => [c[0] + (alvo[0] - c[0]) * k, c[1] + (alvo[1] - c[1]) * k, c[2] + (alvo[2] - c[2]) * k];
            for (let i = 0; i < posM.count; i++) {
                const x = posM.getX(i), z = posM.getZ(i), h = posM.getY(i);
                const px = x - 6, pz = z + 19;
                const ouro = manchaOuroM(px, pz), terra = manchaTerraM(px, pz);
                const gO = Math.max(0, Math.min(1, (ouro - 0.60) / 0.40)), ouroF = gO * gO * (3 - 2 * gO);
                let c = [0.70 + ouroF * 0.38, 1.00 + ouroF * 0.02, 0.50 - ouroF * 0.04];
                if (terra > 0.80) c = mistM(c, [0.68, 0.58, 0.44], Math.min(0.30, (terra - 0.80) * 1.6));
                const dp = distCaminhoM(px, pz);
                const mC = Math.max(0, Math.min(1, (3.3 - dp) / 1.5)), mSuave = mC * mC * (3 - 2 * mC);
                if (dp < 3.4) c = mistM(c, [0.86, 0.70, 0.50], mSuave * 0.30);
                const rel = h - AGUA_Y_M2;
                const quebra = ruidoM(px + 70, pz - 40, 0.045) * 0.5 + 0.5;
                const faixaK = quebra > 0.58 ? 0.10 : (0.50 + 0.50 * (ruidoM(px, pz, 0.09) * 0.5 + 0.5));
                if (rel < 0.42) c = mistM(c, [1.00, 0.93, 0.70], Math.min(1, Math.max(0, (0.42 - rel) / 0.34)) * faixaK);
                if (rel < 0.15) c = mistM(c, [0.52, 0.45, 0.36], Math.min(1, Math.max(0, (0.15 - rel) / 0.24)) * (0.35 + 0.65 * faixaK));
                /* os dois factores levam tecto 1 (correcção medida nos
                 * passos 2–3): sem tecto, nas bacias fundas do terreno
                 * (fundo até −2,3 m, fora do lago) o factor chegava a
                 * 8–10 e a mistura EXTRAPOLAVA para cores negativas
                 * (−1,41/0,18/−0,88 medidos por raycast), que a pintura
                 * lia como magenta/verde puro — os «poços» das vistas
                 * largas. Com o tecto, a bacia satura em areia/leito,
                 * como na prova. */
                if (rel < 0.0) c = mistM(c, [0.42, 0.48, 0.38], 0.75);
                corM.setXYZ(i, c[0], c[1], c[2]);
            }
            corM.needsUpdate = true;
            // a água do lago — VOLTA 2 DAS CORES (21/11): REFLEXO
            // PLANAR VERDADEIRO, portado da prova aprovada (a técnica é
            // a dela, linha a linha). A volta 1 só tinha trazido o
            // núcleo de cor (profunda + fresnel para uma tinta lisa):
            // medido na caixa do lago, a água da candidata tinha std
            // de luminância 2,0 e 0,000 de píxeis escuros contra 24,2
            // e 0,142 da prova — sem as silhuetas das árvores nem as
            // manchas de céu, lia-se lisa e clara, e foi o que o olho
            // do Mestre reprovou. Agora a cena renderiza espelhada
            // para um alvo de 1024 com a câmera virtual de frustum
            // oblíquo da prova, e a água amostra-o com a perturbação
            // das ondas (textura de normais de ruído SUAVE da prova —
            // a da volta 1 era ruído branco por píxel). Entram também
            // as 9 manchas de brilho aditivas e a orla irregular do
            // disco (raio+4 com tremido). PORTA DE QUALIDADE: o passe
            // do reflexo só corre em alta/ultra (world.__nivelReflexo
            // posto por definirPovoamento); em média/baixa, uReflA=0
            // e a água fica com o núcleo de cor da volta 1 — declarado.
            // A direcção do brilho do sol continua a seguir a luz da
            // cena (na prova é uma constante igual à luz dela; na
            // sonda as duas coincidem).
            const cvNormA = document.createElement('canvas'); cvNormA.width = cvNormA.height = 256;
            { const gA = cvNormA.getContext('2d'); const imgA = gA.createImageData(256, 256);
              for (let yA = 0; yA < 256; yA++) for (let xA = 0; xA < 256; xA++) {
                  const nA = ruidoM(xA * 0.9, yA * 0.9, 0.055) * 0.5 + ruidoM(xA * 0.9, yA * 0.9, 0.16) * 0.5;
                  const iA = (yA * 256 + xA) * 4;
                  imgA.data[iA] = 128 + nA * 60; imgA.data[iA + 1] = 128 + nA * 40; imgA.data[iA + 2] = 255; imgA.data[iA + 3] = 255;
              }
              gA.putImageData(imgA, 0, 0); }
            const texNormA = new T.CanvasTexture(cvNormA);
            texNormA.wrapS = texNormA.wrapT = T.RepeatWrapping;
            const rtReflA = new T.WebGLRenderTarget(1024, 1024);
            const texMatReflA = new T.Matrix4();
            const camVirtA = new T.PerspectiveCamera();
            const uniAguaM = {
                uTempoA: { value: 0 },
                uTexNormalA: { value: texNormA },
                uTexReflA: { value: rtReflA.texture },
                uMatReflA: { value: texMatReflA },
                uReflA: { value: 0 },
                uDirSolA: { value: new T.Vector3(0.17, 0.95, 0.23) },
                uCorProfundaA: { value: new T.Color(0x0e3742) },
                uCorReflexoA: { value: new T.Color(0.66, 0.90, 0.88) },
                uCorSolA: { value: new T.Color(1.0, 0.72, 0.42) },
                fogColor: { value: new T.Color(0xeccf9a) }, fogNear: { value: 230 }, fogFar: { value: 850 }
            };
            const matAguaM = new T.ShaderMaterial({
                uniforms: uniAguaM, transparent: true, fog: true,
                vertexShader: [
                    'uniform mat4 uMatReflA;',
                    'varying vec4 vReflA; varying vec3 vMundoA;',
                    '#include <fog_pars_vertex>',
                    'void main() {',
                    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
                    '  vMundoA = wp.xyz;',
                    '  vReflA = uMatReflA * vec4(position, 1.0);',
                    '  vec4 mvPosition = viewMatrix * wp;',
                    '  gl_Position = projectionMatrix * mvPosition;',
                    '  #include <fog_vertex>',
                    '}'
                ].join('\n'),
                fragmentShader: [
                    'uniform sampler2D uTexReflA; uniform sampler2D uTexNormalA;',
                    'uniform float uTempoA; uniform float uReflA;',
                    'uniform vec3 uCorProfundaA; uniform vec3 uDirSolA; uniform vec3 uCorSolA; uniform vec3 uCorReflexoA;',
                    'varying vec4 vReflA; varying vec3 vMundoA;',
                    '#include <fog_pars_fragment>',
                    'void main() {',
                    '  vec3 n1 = texture2D(uTexNormalA, vMundoA.xz * 0.055 + vec2(uTempoA * 0.014, uTempoA * 0.009)).rgb * 2.0 - 1.0;',
                    '  vec3 n2 = texture2D(uTexNormalA, vMundoA.xz * 0.17 - vec2(uTempoA * 0.011, -uTempoA * 0.013)).rgb * 2.0 - 1.0;',
                    '  vec2 pert = n1.xy * 0.55 + n2.xy * 0.40;',
                    '  vec3 N = normalize(vec3(pert.x * 0.28, 1.0, pert.y * 0.28));',
                    '  vec3 V = normalize(cameraPosition - vMundoA);',
                    '  float fres = pow(1.0 - max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);',
                    '  fres = mix(0.15, 0.82, fres);',
                    '  vec2 puv = (vReflA.xy + pert * 0.09 * vReflA.w) / max(vReflA.w, 0.0001);',
                    '  vec3 reflTex = texture2D(uTexReflA, puv).rgb * uCorReflexoA * 0.50;',
                    '  vec3 refl = mix(uCorReflexoA * 0.40, reflTex, uReflA);',
                    '  vec3 cor = mix(uCorProfundaA, refl, clamp(fres * 0.95, 0.0, 1.0));',
                    '  vec3 R = reflect(-V, N);',
                    '  float sd = max(dot(R, normalize(uDirSolA)), 0.0);',
                    '  cor += uCorSolA * (pow(sd, 260.0) * 1.5 + pow(sd, 36.0) * 0.07);',
                    '  gl_FragColor = vec4(cor, 0.94);',
                    '  #include <tonemapping_fragment>',
                    '  #include <encodings_fragment>',
                    '  #include <fog_fragment>',
                    '}'
                ].join('\n')
            });
            matAguaM.userData.__pintado = true;   // a água guarda o seu brilho próprio: a pintura da casa salta-a
            const geoAguaM = new T.CircleGeometry(34, 56);
            { const pA = geoAguaM.attributes.position;
              for (let iA = 1; iA < pA.count; iA++) {
                  const xA = pA.getX(iA), yA = pA.getY(iA), dA = Math.hypot(xA, yA);
                  if (dA > 1) { const kA = 1 + ruidoM(xA, yA, 0.06) * 0.16; pA.setXY(iA, xA * kA, yA * kA); }
              }
              pA.needsUpdate = true; }
            const aguaM = new T.Mesh(geoAguaM, matAguaM);
            aguaM.rotation.x = -Math.PI / 2;
            aguaM.position.set(42, AGUA_Y_M2, 11);
            aguaM.name = 'mapa-novo-agua';
            scene.add(aguaM);
            // manchas de brilho aditivas da prova (o brilho que se lê
            // nos fotogramas dela; opacidade animada no onBeforeRender)
            const cvBrilhoA = document.createElement('canvas'); cvBrilhoA.width = cvBrilhoA.height = 128;
            { const gB = cvBrilhoA.getContext('2d');
              const grB = gB.createRadialGradient(64, 64, 2, 64, 64, 64);
              grB.addColorStop(0, 'rgba(255,236,190,0.85)'); grB.addColorStop(1, 'rgba(255,236,190,0)');
              gB.fillStyle = grB; gB.fillRect(0, 0, 128, 128); }
            const matBrilhoA = new T.MeshBasicMaterial({ map: new T.CanvasTexture(cvBrilhoA), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0.07, fog: false });
            matBrilhoA.userData.__pintado = true;
            for (let iB = 0; iB < 9; iB++) {
                const brilho = new T.Mesh(new T.PlaneGeometry(5 + rndM() * 10, 3 + rndM() * 5), matBrilhoA);
                const anB = rndM() * Math.PI * 2, rrB = rndM() * 30 * 0.72;
                brilho.rotation.x = -Math.PI / 2; brilho.rotation.z = rndM() * 3;
                brilho.position.set(42 + Math.cos(anB) * rrB, AGUA_Y_M2 + 0.03, 11 + Math.sin(anB) * rrB);
                brilho.name = 'mapa-novo-brilho';
                scene.add(brilho);
            }
            let solAguaM = null, reflEmCursoA = false;
            const normReflA = new T.Vector3(0, 1, 0), posAguaA = new T.Vector3(42, AGUA_Y_M2, 11);
            aguaM.onBeforeRender = (renderer, scene, camera) => {
                uniAguaM.uTempoA.value = performance.now() / 1000;
                if (!solAguaM) scene.traverse(o => { if (!solAguaM && o.isDirectionalLight) solAguaM = o; });
                if (solAguaM) uniAguaM.uDirSolA.value.copy(solAguaM.position).normalize();
                matBrilhoA.opacity = 0.10 + 0.05 * (0.5 + 0.5 * Math.sin(uniAguaM.uTempoA.value * 0.9));
                uniAguaM.uReflA.value = 0;
                if (reflEmCursoA || world.__nivelReflexoAgua === false) return;
                /* o passe do reflexo: a receita da prova, com a
                 * câmera corrente — espelho no plano da água, frustum
                 * oblíquo a cortar tudo abaixo do plano, alvo 1024 */
                const posCamA = new T.Vector3().setFromMatrixPosition(camera.matrixWorld);
                const rotA = new T.Matrix4().extractRotation(camera.matrixWorld);
                const olharA = new T.Vector3(0, 0, -1).applyMatrix4(rotA).add(posCamA);
                const vistaA = new T.Vector3().subVectors(posAguaA, posCamA);
                if (vistaA.dot(normReflA) > 0) return;
                vistaA.reflect(normReflA).negate().add(posAguaA);
                const alvoA = new T.Vector3().subVectors(posAguaA, olharA).reflect(normReflA).negate().add(posAguaA);
                camVirtA.position.copy(vistaA);
                camVirtA.up.copy(new T.Vector3(0, 1, 0).applyMatrix4(rotA).reflect(normReflA));
                camVirtA.lookAt(alvoA);
                camVirtA.near = camera.near; camVirtA.far = camera.far;
                camVirtA.updateMatrixWorld();
                camVirtA.projectionMatrix.copy(camera.projectionMatrix);
                texMatReflA.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
                texMatReflA.multiply(camVirtA.projectionMatrix);
                texMatReflA.multiply(camVirtA.matrixWorldInverse);
                texMatReflA.multiply(aguaM.matrixWorld);
                const planoReflA = new T.Plane().setFromNormalAndCoplanarPoint(normReflA, posAguaA);
                planoReflA.applyMatrix4(camVirtA.matrixWorldInverse);
                const clipA = new T.Vector4(planoReflA.normal.x, planoReflA.normal.y, planoReflA.normal.z, planoReflA.constant);
                const pmA = camVirtA.projectionMatrix;
                const qqA = new T.Vector4(
                    (Math.sign(clipA.x) + pmA.elements[8]) / pmA.elements[0],
                    (Math.sign(clipA.y) + pmA.elements[9]) / pmA.elements[5],
                    -1.0, (1.0 + pmA.elements[10]) / pmA.elements[14]);
                clipA.multiplyScalar(2.0 / clipA.dot(qqA));
                pmA.elements[2] = clipA.x; pmA.elements[6] = clipA.y;
                pmA.elements[10] = clipA.z + 1.0 - 0.003; pmA.elements[14] = clipA.w;
                aguaM.visible = false; reflEmCursoA = true;
                const rtAntesA = renderer.getRenderTarget();
                renderer.setRenderTarget(rtReflA);
                renderer.state.buffers.depth.setMask(true);
                if (renderer.autoClear) renderer.clear();
                renderer.render(scene, camVirtA);
                renderer.setRenderTarget(rtAntesA);
                reflEmCursoA = false; aguaM.visible = true;
                uniAguaM.uReflA.value = 1;
            };
            // lirios da prova (16 discos sobre a agua, 0x2c5d33)
            const matLirioM = new T.MeshLambertMaterial({ color: 0x2c5d33 });
            matLirioM.userData.__pintado = true;
            /* PASSO 6 (21/11): os lirios liam o ambiente a intensidade
             * 1 (por omissao) — residuo (3) do passo 5. A familia da
             * vegetacao le a 0,55 (world.iblTroca.tufo, definido mais
             * abaixo na pele); os lirios nascem ANTES desse recibo
             * existir, por isso o mesmo valor entra aqui a nascenca. */
            matLirioM.envMapIntensity = 0.55;
            for (let i = 0; i < 16; i++) {
                const aL = rndM() * Math.PI * 2, rL = 6 + rndM() * 20;
                const lirio = new T.Mesh(new T.CircleGeometry(0.5 + rndM() * 0.7, 10), matLirioM);
                lirio.rotation.x = -Math.PI / 2;
                lirio.position.set(42 + Math.cos(aL) * rL, AGUA_Y_M2 + 0.03, 11 + Math.sin(aL) * rL);
                lirio.name = 'mapa-novo-lirio';
                scene.add(lirio);
            }
            world.mapaNovo = { lago: { x: 42, z: 11, r: 30, aguaY: AGUA_Y_M2 }, origemProva: { x: -6, z: 19 } };
        }

        /* ================= TROCA DE MAPA — LIMPEZA DOS HERDADOS =================
         * Lei do Mestre (21/11/2026 00:36): «Tudo do mapa antigo fica
         * no mapa antigo». A candidata constrói-se SÓ com o mapa novo
         * (terreno + água; o povoamento entra no Passo 3). Tudo o que
         * a base pôs na cena e pertence ao mundo antigo sai AQUI, no
         * delta da troca — os ficheiros da base ficam intactos e o
         * mapa antigo (o vivo) não é tocado. Inventário do que sai:
         *  · a fogueira central do mundo (mundo.js): as 58 peças de
         *    world.pecasFogueira (anel de pedras a r≈1,35 + brasas e
         *    carvão no interior) e a luz dela (world.fontes.fogueira);
         *  · os 3 braseiros do mundo (mundo.js): os grupos (pais das
         *    chamas de world.fontes.chamas), as luzes deles
         *    (world.fontes.tochas) e a decoração que este visual lhes
         *    juntou (sprites de brilho/fumo e as PointLight 0xff8f3f
         *    de distância 6,5);
         *  · as pedras espalhadas e as ruínas do mundo (mundo.js):
         *    os lotes instanciados de icosaedros (Lambert) — TODAS as
         *    instâncias a escala 0, para o retrato do véu as capturar
         *    mortas e nunca ressuscitarem; o lote fantasma gémeo
         *    (Basic) fica com count 0 e invisível;
         *  · as peças deste visual da arena: menires, pedaços e
         *    contactos ('visual2-menir*', 'visual2-contacto*'), os
         *    anéis pintados do horizonte ('visual2-anel-*') e o
         *    círculo do ritual (disco, halo, cunhas, motes de brasas
         *    e as duas luzes do ritual);
         *  · as peças GLB dos anéis nem são pedidas (guarda
         *    TROCA_SEM_HERDADOS, acima).
         * Fica: o terreno novo e a água (mapa novo), a grelha e as
         * figuras (o jogo). Fica também, invisível, a infra da base:
         * o chão do mundo (já escondido pela base), o plano de vazio
         * a −8 m e os dados world.obstaculos/braseiros (não se vêem;
         * os obstáculos oficiais do mapa novo nascem no Passo 3).
         * Reversível: basta apagar este bloco e a guarda para a cena
         * voltar a ser a da base ao bit. */
        {
            const remover = new Set();
            const tirar = o => { if (o) remover.add(o); };
            (world.pecasFogueira || []).forEach(tirar);
            if (world.fontes) {
                tirar(world.fontes.fogueira);
                (world.fontes.tochas || []).forEach(tirar);
                (world.fontes.chamas || []).forEach(f => tirar(f.parent));
            }
            const mZero = new T.Matrix4().makeScale(0, 0, 0);
            let lotesZerados = 0, instanciasZeradas = 0;
            scene.traverse(o => {
                const nome = o.name || '';
                if (nome.indexOf('visual2-menir') === 0 || nome.indexOf('visual2-contacto') === 0
                    || nome.indexOf('visual2-anel-') === 0 || nome === 'visual2-circulo-runas'
                    || nome === 'visual2-halo-ritual' || nome.indexOf('visual2-cunha-ritual') === 0
                    || nome === 'visual2-brasas-ritual' || nome === 'visual2-luz-ritual'
                    || nome === 'visual2-luz-chao-ritual') tirar(o);
                else if (o.isSprite && o.material && (o.material.map === texBrilho || o.material.map === texFumo)) tirar(o);
                else if (o.isPointLight && o.color && o.color.getHex() === 0xff8f3f && Math.abs(o.distance - 6.5) < 0.01) tirar(o);
                else if (o.isInstancedMesh && o.geometry && o.geometry.type === 'IcosahedronGeometry') {
                    if (o.material && o.material.isMeshBasicMaterial) { o.count = 0; o.visible = false; }
                    else { for (let i = 0; i < o.count; i++) o.setMatrixAt(i, mZero); lotesZerados++; instanciasZeradas += o.count; }
                    o.instanceMatrix.needsUpdate = true;
                }
            });
            remover.forEach(o => { if (o.parent) o.parent.remove(o); });
            world.limpezaTroca = { objectosRemovidos: remover.size, lotesZerados, instanciasZeradas };
            /* O recibo de carga (stats.pronto) esperava as 30 peças
             * GLB dos anéis; sem herdados, não resta nenhuma carga
             * assíncrona de cenário — a carga declara-se completa. */
            stats.pronto = true;
        }

        /* PASSO 5 — AMBIENTE DO CÉU NOS LAMBERT DA TROCA (compensação
         * medida e declarada): a prova aprovada tira o equilíbrio de cor
         * do pipeline Standard+IBL/PMREM (irradiação do céu, azul
         * incluído). Medido neste passo: o scene.environment no Lambert
         * desta versão do three é quase inerte nas medianas (com/sem =
         * idêntico; só a 3,0 mexe, e empurra o G para cima). O termo
         * entra por isso DENTRO dos shaders da pele e dos tufos, como
         * irradiação celeste aditiva no termo indirecto, com o albedo
         * dessaturado a 80% (senão o B, quase ausente do albedo verde,
         * nunca chega). Espectro = zénite da prova em linear. A força
         * afina-se pela sonda das cores (world.ambTroca). */
        const uniAmbTroca = { uAmbCeuT: { value: new T.Vector3(0.10, 0.18, 0.38) }, uAmbForcaT: { value: 0.38 } };
        world.ambTroca = uniAmbTroca;

        /* ================= TROCA DE MAPA — PASSO 2: PELE DO CHÃO REFORÇADA =================
         * Item nomeado do Mestre (20/11/2026 23:36, sobre o vídeo do
         * povoamento): «Só achei o chão muito liso e brilhante». O chão
         * deste mapa já nasce MATE (Lambert: sem termo especular e sem
         * IBL — o brilho da prova vinha do Standard+ARM+IBL dela); o
         * que faltava era CORPO. Entra a pele da integração aprovada
         * (o bloco INTEGRAÇÃO INÉRCIA (1) da candidata dadora): grão de
         * relva viva e grão de terra amostrados por COORDENADAS DO
         * MUNDO, com a MESMA receita de texturas da prova (relva viva
         * com palha contida; terra com grãos e pedrinhas) — reforçada
         * e RE-MASCARADA para este mapa: na arena a máscara poupava o
         * disco do ritual e os anéis do horizonte, que aqui NÃO existem
         * (lei: tudo do mapa antigo fica no mapa antigo); aqui o prado
         * leva o grão em todo o lado e a TERRA manda no caminho (a
         * mesma curva distCaminhoM do bloco do terreno, com o mesmo
         * ruído) e nas margens do lago (pela altura sobre a água,
         * vinda do vértice — o declive até à água é terra/lama, nunca
         * relva até à linha de água). O material marca-se __pintado
         * (a pintura da casa salta-o) e compõe ELE a fórmula exacta da
         * pintura Lambert da casa (posterização suave de 4 patamares
         * + split toning, mistura 0,6) — o aspecto pintado fica
         * uniforme com o resto da cena. A baldosa da textura base
         * alinha pela do grão (2,2 m, como os 118 reps/260 m da prova). */
        {
            const cvG = document.createElement('canvas'); cvG.width = cvG.height = 1024;
            const gG = cvG.getContext('2d');
            let semG = 20261121;
            const rndG = () => (semG = (semG * 16807) % 2147483647) / 2147483647;
            gG.fillStyle = '#4c7527'; gG.fillRect(0, 0, 1024, 1024);
            const tonsG = ['#5d8a33', '#679638', '#527d2c', '#71a23f', '#48702a', '#7fae47', '#3f6a24', '#86b04c'];
            for (let i = 0; i < 24000; i++) {
                const x = rndG() * 1024, y = rndG() * 1024, h = 5 + rndG() * 11;
                gG.strokeStyle = rndG() < 0.03 ? '#8a7a3a' : tonsG[(rndG() * tonsG.length) | 0];
                gG.globalAlpha = 0.25 + rndG() * 0.55; gG.lineWidth = 1 + rndG() * 1.6;
                const inclG = (rndG() - 0.5) * 1.5;
                gG.beginPath(); gG.moveTo(x, y); gG.lineTo(x + Math.sin(inclG) * h, y - Math.cos(inclG) * h); gG.stroke();
            }
            /* PERTO (21/11): folhas secas e palha caida ENTRE as laminas
             * e manchas escuras de humidade — ao pe, o chao le-se materia
             * (folhagem caida, terra humida), nao impressao lisa. */
            for (let i = 0; i < 900; i++) {
                gG.fillStyle = ['#8a7a3a', '#a8894a', '#6d5c2a'][(rndG() * 3) | 0];
                gG.globalAlpha = 0.30 + rndG() * 0.45;
                gG.beginPath(); gG.ellipse(rndG() * 1024, rndG() * 1024, 3 + rndG() * 5, 1.5 + rndG() * 2, rndG() * 3.2, 0, 7); gG.fill();
            }
            for (let i = 0; i < 500; i++) {
                gG.fillStyle = '#2e521c';
                gG.globalAlpha = 0.18 + rndG() * 0.3;
                gG.beginPath(); gG.ellipse(rndG() * 1024, rndG() * 1024, 4 + rndG() * 9, 3 + rndG() * 6, rndG() * 3.2, 0, 7); gG.fill();
            }
            gG.globalAlpha = 1;
            const texRelvaG = new T.CanvasTexture(cvG);
            texRelvaG.wrapS = texRelvaG.wrapT = T.RepeatWrapping; texRelvaG.encoding = T.sRGBEncoding; texRelvaG.anisotropy = 4;
            const cvT = document.createElement('canvas'); cvT.width = cvT.height = 512;
            const gT = cvT.getContext('2d');
            gT.fillStyle = '#86643f'; gT.fillRect(0, 0, 512, 512);
            const tonsT = ['#77572f', '#93703f', '#6d4f2c', '#9c7c4b', '#82653e'];
            for (let i = 0; i < 11000; i++) {
                gT.fillStyle = tonsT[(rndG() * tonsT.length) | 0];
                gT.globalAlpha = 0.16 + rndG() * 0.4;
                gT.fillRect(rndG() * 512, rndG() * 512, 1 + rndG() * 3, 1 + rndG() * 3);
            }
            for (let i = 0; i < 240; i++) {
                gT.fillStyle = rndG() < 0.5 ? '#a08b62' : '#5f4630';
                gT.globalAlpha = 0.5 + rndG() * 0.5;
                gT.beginPath(); gT.arc(rndG() * 512, rndG() * 512, 0.8 + rndG() * 2.2, 0, 7); gT.fill();
            }
            /* PERTO (21/11): granulo com contraste — manchas escuras
             * fundas e pontos claros de areia; folhas secas caidas na
             * terra (elipses curtas de palha). De perto, a terra le-se
             * materia com granulo, nao ruido impresso liso. */
            for (let i = 0; i < 2600; i++) {
                gT.fillStyle = rndG() < 0.55 ? '#4e3820' : '#b89a68';
                gT.globalAlpha = 0.20 + rndG() * 0.35;
                gT.fillRect(rndG() * 512, rndG() * 512, 1 + rndG() * 2, 1 + rndG() * 2);
            }
            for (let i = 0; i < 130; i++) {
                gT.fillStyle = ['#a8894a', '#8a6f3a', '#c0a05e'][(rndG() * 3) | 0];
                gT.globalAlpha = 0.35 + rndG() * 0.4;
                gT.beginPath(); gT.ellipse(rndG() * 512, rndG() * 512, 2.5 + rndG() * 3.5, 1.2 + rndG() * 1.6, rndG() * 3.2, 0, 7); gT.fill();
            }
            gT.globalAlpha = 0.16; gT.strokeStyle = '#5f4630'; gT.lineWidth = 5;
            for (const px of [150, 350]) { gT.beginPath(); gT.moveTo(px, 0); gT.lineTo(px + 14, 512); gT.stroke(); }
            gT.globalAlpha = 1;
            const texTerraG = new T.CanvasTexture(cvT);
            texTerraG.wrapS = texTerraG.wrapT = T.RepeatWrapping; texTerraG.encoding = T.sRGBEncoding; texTerraG.anisotropy = 4;
            if (chao.material.map) chao.material.map.repeat.set(124, 124);
            const matChaoG = chao.material;
            /* PASSO 5 (21/11): IBL DA PROVA — a prova aprovada lê-se
             * com IBL/PMREM (o env dela, forest_slope_env, via PMREM
             * para scene.environment); a candidata era Lambert sem
             * ambiente: daí o resíduo verde-lima (G +22, B −12..−20)
             * da volta 2. Porte fiel: o MESMO ficheiro de ambiente
             * (cópia declarada na candidata), PMREM gerado com o
             * renderer real no primeiro fotograma do chão (o visual
             * não recebe o renderer na construção — o onBeforeRender
             * do chão é a porta e corre uma vez). Forças por classe
             * em world.iblTroca, afinadas por medição nas caixas da
             * volta 1/2. */
            const IBLT = { chao: 0.6, tufo: 0.55, glb: 0.75, feito: false, erro: null, texPronta: null };
            world.iblTroca = IBLT;
            new T.TextureLoader().load('forest_slope_env.png', (texEnvT) => {
                texEnvT.mapping = T.EquirectangularReflectionMapping;
                texEnvT.encoding = T.sRGBEncoding;
                IBLT.texPronta = texEnvT;
            }, undefined, () => { IBLT.erro = 'env falhou a carregar'; });
            chao.onBeforeRender = (renderer) => {
                if (IBLT.feito || !IBLT.texPronta) return;
                IBLT.feito = true;
                try {
                    const pm = new T.PMREMGenerator(renderer);
                    pm.compileEquirectangularShader();
                    scene.environment = pm.fromEquirectangular(IBLT.texPronta).texture;
                    pm.dispose();
                } catch (e) { IBLT.erro = String((e && e.message) || e); }
            };
            matChaoG.envMapIntensity = IBLT.chao;
            matChaoG.userData.__pintado = true;
            /* VOLTA 2 DAS CORES (21/11): MAPA DE NORMAIS da prova no
             * chão — é ele que dá à relva da prova o grão direccional
             * (micro-sombra das lâminas, legível sobretudo ao ângulo
             * rasante da vista 1); sem ele, o Lambert liso lia-se
             * plano por mais grão de cor que a pele tivesse. Textura
             * da própria prova (asset CC0 dela), baldosa de 2,2 m
             * como a do difuso. */
            const texNorG = new T.TextureLoader().load('textura-relva-nor.jpg');
            texNorG.wrapS = texNorG.wrapT = T.RepeatWrapping; texNorG.repeat.set(124, 124); texNorG.anisotropy = 4;
            matChaoG.normalMap = texNorG;
            matChaoG.normalScale = new T.Vector2(0.9, 0.9);
            /* PASSO 5 (21/11): AO da prova — o mapa ARM dela (canal
             * R = oclusão ambiente), baldosa de 2,2 m como o difuso:
             * a micro-sombra entre lâminas que faltava à cauda
             * escura das amostras (fracEsc 0,003–0,076 contra
             * 0,145–0,226 da prova). O aoMap lê o canal uv2, que
             * partilha o uv do difuso. Cópia declarada do asset. */
            const texArmG = new T.TextureLoader().load('textura-relva-arm.jpg');
            texArmG.wrapS = texArmG.wrapT = T.RepeatWrapping; texArmG.repeat.set(124, 124); texArmG.anisotropy = 4;
            chao.geometry.setAttribute('uv2', chao.geometry.attributes.uv);
            matChaoG.aoMap = texArmG;
            matChaoG.aoMapIntensity = 1.0;
            const uniChaoG = { uRelvaG: { value: texRelvaG }, uTerraG: { value: texTerraG } };
            Object.assign(uniChaoG, uniAmbTroca);
            matChaoG.onBeforeCompile = (sh) => {
                Object.assign(sh.uniforms, uniChaoG);
                sh.vertexShader = sh.vertexShader
                    .replace('#include <common>', '#include <common>\nvarying vec2 vMundoG; varying float vAltG; varying vec3 vNormG;')
                    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMundoG = position.xz; vAltG = position.y; vNormG = normal;');
                sh.fragmentShader = sh.fragmentShader
                    .replace('#include <common>', `#include <common>
                        varying vec2 vMundoG;
                        varying float vAltG;
                        varying vec3 vNormG;
                        uniform sampler2D uRelvaG;
                        uniform sampler2D uTerraG;
                        uniform vec3 uAmbCeuT;
                        uniform float uAmbForcaT;
                        float ruidoGLG(vec2 p) { return sin(p.x + cos(p.y * 0.83) * 2.1) * cos(p.y - sin(p.x * 0.71) * 1.7); }
                        float caminhoZG(vec2 pp) { return -56.0 + (pp.x + 130.0) * 0.52 + 15.0 * sin(pp.x * 0.020 + 0.6); }`)
                    .replace('#include <aomap_fragment>', `#include <aomap_fragment>
                        /* PASSO 5: irradiação celeste (ver uniAmbTroca).
                         * Nesta build do three o Lambert é por vértice:
                         * o fragmento compõe em aomap_fragment (não há
                         * lights_fragment_end) — medido: a âncora antiga
                         * era um no-op silencioso e o B não mexia. */
                        reflectedLight.indirectDiffuse += mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), 0.8) * uAmbCeuT * (uAmbForcaT * (0.35 + 0.65 * clamp(vNormG.y, 0.0, 1.0)));`)
                    .replace('#include <map_fragment>', `#include <map_fragment>
                        {
                            vec2 ppG = vMundoG - vec2(6.0, -19.0);
                            float dpG = abs(ppG.y - caminhoZG(ppG)) + ruidoGLG(ppG * 0.11) * 1.6;
                            float terraCaminhoG = 1.0 - smoothstep(1.8, 3.4, dpG);
                            /* VOLTA 2 DAS CORES (21/11): a terra de
                             * margem é SÓ a do lago. A regra antiga
                             * (altura absoluta) pintava areia em todos
                             * os fundos de vale e o declive a 0,85
                             * fazia o resto: na vista 1 lia-se uma
                             * «praia» no meio do prado onde a prova
                             * tem relva escura. Porta = distância ao
                             * lago; declive desce para 0,35. */
                            float dLagoG = length(vMundoG - vec2(42.0, 11.0));
                            float terraMargemG = (1.0 - smoothstep(0.18, 0.55, vAltG + 0.85)) * smoothstep(46.0, 37.0, dLagoG);
                            float terraDeclG = smoothstep(0.05, 0.20, 1.0 - vNormG.y) * 0.35;
                            float terraG = max(max(terraCaminhoG * 0.92, terraMargemG * 0.85), terraDeclG);
                            vec3 graoTerraG = mix(texture2D(uTerraG, vMundoG * 0.16).rgb, texture2D(uTerraG, vMundoG * 0.83).rgb, 0.35);
                            float nTG = dot(texture2D(uTerraG, vMundoG * 2.9).rgb, vec3(0.299, 0.587, 0.114)) / 0.10;
                            graoTerraG *= mix(1.0, clamp(0.55 + 0.45 * nTG, 0.60, 1.45), 0.6);
                            vec3 baseG = diffuseColor.rgb;
                            /* CORES (21/11): o difuso que entra JA e o produto
                             * da prova (textura de relva viva x cor de vertice
                             * da receita aprovada, no bloco do terreno). A pele
                             * antiga SUBSTITUIA-o por um segundo produto
                             * (grao x paleta x 1,78) — a paleta contada duas
                             * vezes lavava o prado para lima e apagava as
                             * manchas. Agora o grao entra NORMALIZADO
                             * (multiplicador de media 1): contraste de perto
                             * sem mexer na paleta aprovada. */
                            vec3 graoRelvaG = texture2D(uRelvaG, vMundoG * 0.4545).rgb;
                            float nG = dot(graoRelvaG, vec3(0.299, 0.587, 0.114)) / 0.1417;
                            baseG *= mix(1.0, clamp(0.40 + 0.60 * nG, 0.45, 1.60), 0.95);
                            /* MULTI-ESCALA (volta 3): duas amostras mais
                             * finas do mesmo grao — a de 0,8 m RODADA 37
                             * graus (quebra os tracos alinhados da baldosa,
                             * que de longe se liam como riscos regulares
                             * sobre a tela) e a de 0,25 m (micro-textura
                             * ao pe da figura). De longe, fundem-se na
                             * media; de perto, dao materia ao chao. */
                            vec2 uvFinaG = mat2(0.80, 0.60, -0.60, 0.80) * (vMundoG * 1.25);
                            float nFG = dot(texture2D(uRelvaG, uvFinaG).rgb, vec3(0.299, 0.587, 0.114)) / 0.1417;
                            baseG *= mix(1.0, clamp(0.55 + 0.45 * nFG, 0.60, 1.40), 0.45);
                            float nMG = dot(texture2D(uRelvaG, vMundoG * 4.05).rgb, vec3(0.299, 0.587, 0.114)) / 0.1417;
                            baseG *= mix(1.0, clamp(0.62 + 0.38 * nMG, 0.70, 1.30), 0.40);
                            /* FECHO DE COPA + tinta fria: na prova, vista
                             * de cima, a massa de vegetacao fecha e o
                             * prado escurece (micro-sombra das laminas,
                             * que o Lambert liso nao tem); de esguelha,
                             * quase nada muda. E o azul que falta e o do
                             * ceu/IBL da prova. */
                            vec3 vistaG = normalize(cameraPosition - vec3(vMundoG.x, vAltG, vMundoG.y));
                            baseG *= mix(1.0, 0.78, smoothstep(0.45, 0.95, vistaG.y) * 0.55);
                            baseG *= vec3(0.84, 0.78, 1.05);
                            /* manchas LARGAS: verde escuro e cheio nos
                             * frescos (a mesma mascara da prova); o ouro
                             * vem da cor de vertice, nao daqui */
                            float ouroG = 0.5 + 0.5 * ruidoGLG(ppG * 0.016);
                            /* o OURO nao entra aqui: a cor de vertice do
                             * bloco do terreno ja o traz (a receita da
                             * prova) — conta-lo outra vez deu o amarelo
                             * lavado da volta 1 (medido: prado +73/+69
                             * sobre a prova). Fica o verde escuro e cheio
                             * dos frescos, que a receita de vertice nao tem. */
                            baseG *= mix(vec3(1.0), vec3(0.55, 0.80, 0.45), smoothstep(0.45, 0.15, ouroG) * 0.38);
                            /* RELEVO NA COR: vale mais escuro e humido,
                             * cimo mais claro e seco */
                            float altNG = clamp((vAltG + 2.3) / 8.8, 0.0, 1.0);
                            baseG *= mix(vec3(1.0), vec3(0.62, 0.72, 0.58), smoothstep(0.45, 0.15, altNG) * mix(0.35, 1.0, smoothstep(34.0, 44.0, dLagoG)) * 0.75);
                            baseG *= mix(vec3(1.0), vec3(1.05, 1.04, 0.96), smoothstep(0.60, 0.95, altNG) * 0.35);
                            /* manchas de USO (0,3-1 m) e desgaste das
                             * clareiras (centros gastos, terra a mostra) */
                            float usoG = 0.5 + 0.5 * ruidoGLG(ppG * 2.6 + vec2(31.7, -12.3));
                            float fUsoG = smoothstep(0.72, 0.90, usoG);
                            baseG = mix(baseG, graoTerraG * 1.02, fUsoG * (1.0 - terraG) * 0.24);
                            float dC1G = length(vMundoG);
                            float dC2G = length(vMundoG - vec2(36.0, -49.0));
                            float fClG = max(pow(max(0.0, 1.0 - dC1G / 26.0), 1.5), pow(max(0.0, 1.0 - dC2G / 22.0), 1.5));
                            /* VOLTA 2: desgaste das clareiras 0,55 ->
                             * 0,20 — na prova, clareira é relva sem
                             * tufos, não areia */
                            baseG = mix(baseG, graoTerraG * 1.05, fClG * 0.20 * (1.0 - terraG));
                            diffuseColor.rgb = mix(baseG, graoTerraG, terraG);
                            diffuseColor.rgb = mix(diffuseColor.rgb, graoTerraG * 0.82, fUsoG * terraG * 0.35);
                        }`)
                    ;
            };
            /* CORES (21/11): a pintura composta (posterização + split
             * toning) SAIU da pele — arrefecia as sombras e esmagava os
             * tufos; a prova aprovada não a tem. O chão lê-se cru, como
             * na prova. */
            matChaoG.customProgramCacheKey = () => 'troca-chao-pele-10';
            matChaoG.needsUpdate = true;
            world.peleTroca = { grao: 'coordenadas-do-mundo', baldosaM: 2.2, terra: ['caminho', 'margem-do-lago'] };
        }

        /* ================= TROCA DE MAPA — PASSO 3: POVOAMENTO NA CENA =================
         * A distribuição APROVADA pelo Mestre (20/11/2026 23:36) e
         * NATURALIZADA por ordem dele (23:44 — «tem umas bolas de matos
         * do nada — não está natural»), executada na prova-inercia,
         * entra na cena do jogo. Porte FIEL da prova: mesmas zonas,
         * mesmas restrições (lago, caminho, clareiras), mesmos pesos,
         * mesmas contagens-alvo, mesmos GLB (cópias byte-idênticas em
         * modelos/cenario/). As posições constroem-se em coordenadas
         * DA PROVA e convertem-se ao pousar (ponto do jogo = prova +
         * (6, −19); a altura lê-se de world.height, que É a altura da
         * prova convertida) — a composição aprovada não muda; a
         * semente é própria desta cena, por isso os pés individuais
         * diferem dos da prova, como em qualquer amostragem.
         * Duas adaptações declaradas, ambas da candidata de integração
         * (a dadora aprovada DESTE jogo, não da prova): (1) cada camada
         * de tufos leva a ROSETA companheira — da câmera do jogo (alta,
         * quase de cima) os planos verticais lêem-se como riscos e a
         * roseta é o que dá o tufo redondo e cheio; (2) a camada
         * «perto» da prova (11.000 tufos) NÃO entra: era um artefacto
         * das câmeras baixas da prova — a densidade por anéis/qualidade
         * é o passo 6, que parte desta base.
         * Os GLB carregam assíncronos (o CampoWorld é síncrono): o
         * recibo world.povoamentoTroca marca pronto=true quando tudo
         * pousou, com as contagens por balde e os erros. Os OBSTÁCULOS
         * oficiais substituem a lista antiga por inteiro no fim da
         * carga (árvores r 0,5; pedras conforme a escala — regras no
         * fim do bloco); as duas clareiras de combate ficam livres por
         * construção (todas as amostragens as excluem). Os cortes por
         * qualidade vivem em world.definirPovoamento(q) — frações no
         * espírito da escada aprovada da prova; a amarração ao
         * selector do jogo (cena.js) é item de integração do passo 7,
         * como a amarração obstáculos↔visível. */
        {
            const LAGOPV = { x: 36, z: 30, r: 30 };   // centro do lago em coordenadas DA PROVA
            const AGUA_Y_V = -0.85;
            const alturaV = (px, pz) => world.height(px + 6, pz - 19);
            const ruidoV = (x, z, s) => Math.sin(x * s + Math.cos(z * s * 0.83) * 2.1) * Math.cos(z * s - Math.sin(x * s * 0.71) * 1.7);
            const caminhoZV = px => -56 + (px + 130) * 0.52 + 15 * Math.sin(px * 0.020 + 0.6);
            const distCaminhoV = (px, pz) => Math.abs(pz - caminhoZV(px)) + ruidoV(px, pz, 0.11) * 1.6;
            const manchaOuroV = (px, pz) => ruidoV(px, pz, 0.016) * 0.5 + 0.5;
            const manchaTerraV = (px, pz) => ruidoV(px + 40, pz - 25, 0.030) * 0.5 + 0.5;
            let semV = 917631;
            const rndV = () => ((semV = (Math.imul(semV, 1664525) + 1013904223) >>> 0) / 4294967296);
            const embaralharV = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = (rndV() * (i + 1)) | 0; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
            const CLAREIRAS_V = [[-6, 19, 26], [30, -30, 22]];
            const naClareiraV = (x, z, folga) => CLAREIRAS_V.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r + (folga || 0));
            const MANCHAS_V = [[-98, 40, 13], [58, -92, 12], [112, 8, 11], [34, -58, 12]];
            const naManchaV = (x, z) => MANCHAS_V.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r);
            function amostrarV(n, peso) {
                const pts = []; let iter = 0;
                while (pts.length < n && iter++ < n * 30) {
                    const x = -128 + rndV() * 256, z = -128 + rndV() * 256;
                    if (rndV() < peso(x, z)) pts.push([x, z]);
                }
                return pts;
            }
            function pontosZonaV(cx, cz, r, n, op) {
                const pts = []; let iter = 0;
                while (pts.length < n && iter++ < n * 60) {
                    const a = rndV() * Math.PI * 2, rr = r * Math.sqrt(rndV());
                    const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
                    if (Math.hypot(x - LAGOPV.x, z - LAGOPV.z) < (op.lagoMin || 33)) continue;
                    if (distCaminhoV(x, z) < (op.camMin || 4.5)) continue;
                    if (naClareiraV(x, z, 0)) continue;
                    pts.push([x, z]);
                }
                return pts;
            }
            /* matrizes de um conjunto de pontos (coords da prova →
             * do jogo ao pousar); a MESMA lista serve todas as
             * sub-malhas de um GLB (tronco e folhas nunca se separam) */
            const EUV = new T.Euler(), QTV = new T.Quaternion(), SCV = new T.Vector3(), PVV = new T.Vector3();
            function matrizesV(pts, escMin, escMax, afundar) {
                const mats = [], regs = [];
                pts.forEach(([px, pz]) => {
                    EUV.set(0, rndV() * Math.PI * 2, 0); QTV.setFromEuler(EUV);
                    const e = escMin + rndV() * (escMax - escMin);
                    SCV.set(e, e * (0.85 + rndV() * 0.4), e);
                    PVV.set(px + 6, alturaV(px, pz) - (afundar || 0), pz - 19);
                    mats.push(new T.Matrix4().compose(PVV.clone(), QTV.clone(), SCV.clone()));
                    regs.push({ px, pz, e });
                });
                return { mats, regs };
            }
            function preencherV(im, pts, escMin, escMax, afundar) {
                const pacote = matrizesV(pts, escMin, escMax, afundar);
                pacote.mats.forEach((m, i) => im.setMatrixAt(i, m));
                im.frustumCulled = false; scene.add(im);
                return pacote.regs;
            }
            function texturaCanvasV(size, desenhar) {
                const cv = document.createElement('canvas'); cv.width = cv.height = size;
                desenhar(cv.getContext('2d'), size);
                const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
                return t;
            }
            function cruzarV(larg, alt) {
                const g = new T.BufferGeometry();
                const pos = [], uv = [], idx = [];
                for (let p = 0; p < 2; p++) {
                    const a = p * Math.PI / 2, dx = Math.cos(a) * larg / 2, dz = Math.sin(a) * larg / 2, b = p * 4;
                    pos.push(-dx, 0, -dz, dx, 0, dz, dx, alt, dz, -dx, alt, -dz);
                    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
                    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
                }
                g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
                g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
                g.setIndex(idx); g.computeVertexNormals();
                return g;
            }
            function geoRosetaV(raio) {
                const g = new T.PlaneGeometry(raio * 2, raio * 2);
                g.rotateX(-Math.PI / 2); g.translate(0, 0.045, 0);
                return g;
            }
            /* vento (o material marca-se __pintado: a pintura da casa
             * salta-o). CORES (21/11): a pintura composta que aqui vivia
             * (posterização + split toning, mistura 0,6) SAIU — esmagava
             * os tufos para pontos pretos ao longe e arrefecia a cena;
             * a prova aprovada não a tem. No lugar dela entra o VEU DE
             * DISTANCIA (extensão do Mestre, 21/11 08:18): a cor final
             * das laminas mistura-se para a cor media do prado da prova
             * (linear ~(0,10/0,20/0,03)) entre 40 e 150 m (x0,68) — ao longe os
             * tufos FUNDEM-SE com o chao em vez de ficarem pontos sobre
             * a tela; e a BASE de cada lamina escurece (uv.y 0 -> 0,35)
             * para o tufo ASSENTAR no chao em vez de pousar sobre ele
             * (extensão 08:22, o pintado de perto). */
            const uTempoV = { value: 1.35 };
            const VEU_LAM_V = `{
                    gl_FragColor.rgb *= 0.92;
                    gl_FragColor.rgb *= mix(0.55, 1.0, smoothstep(0.0, 0.35, vAltFrV));
                    float fVeuV = smoothstep(40.0, 150.0, vDistV) * 0.68;
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.10, 0.20, 0.03), fVeuV);
                }
                #include <tonemapping_fragment>`;
            const VEU_SO_V = `{
                    gl_FragColor.rgb *= 0.92;
                    float fVeuV = smoothstep(40.0, 150.0, vDistV) * 0.68;
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.10, 0.20, 0.03), fVeuV);
                }
                #include <tonemapping_fragment>`;
            function aplicarVentoV(mat, amp, fase, altRef) {
                mat.userData.__pintado = true;
                mat.onBeforeCompile = (sh) => {
                    sh.uniforms.uTempoV = uTempoV;
                    Object.assign(sh.uniforms, uniAmbTroca);
                    sh.vertexShader = sh.vertexShader
                        .replace('#include <common>', '#include <common>\nuniform float uTempoV;\nvarying float vDistV;\nvarying float vAltFrV;\nvarying float vNyV;')
                        .replace('#include <begin_vertex>', `#include <begin_vertex>
                            {
                                vec4 wpVento = modelMatrix * instanceMatrix * vec4(position, 1.0);
                                float faseV = wpVento.x * 0.35 + wpVento.z * 0.41 + ${fase.toFixed(2)};
                                float altV = clamp(position.y / ${altRef.toFixed(2)}, 0.0, 1.0);
                                float balancoV = (sin(uTempoV * 1.9 + faseV) + 0.55 * sin(uTempoV * 3.7 + faseV * 1.7)) * ${amp.toFixed(3)} * altV * altV;
                                transformed.x += balancoV;
                                transformed.z += balancoV * 0.6;
                                vec4 mvVento = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                                vDistV = length(mvVento.xyz);
                                vAltFrV = altV;
                                vNyV = abs(normal.y);
                            }`);
                    sh.fragmentShader = sh.fragmentShader
                        .replace('#include <common>', '#include <common>\nvarying float vDistV;\nvarying float vAltFrV;\nvarying float vNyV;\nuniform vec3 uAmbCeuT;\nuniform float uAmbForcaT;')
                        .replace('#include <aomap_fragment>', `#include <aomap_fragment>
                            reflectedLight.indirectDiffuse += mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), 0.8) * uAmbCeuT * (uAmbForcaT * 0.8 * (0.5 + 0.5 * vNyV));`)
                        .replace('#include <tonemapping_fragment>', VEU_LAM_V);
                };
                mat.customProgramCacheKey = () => 'troca-vento3-' + fase.toFixed(2) + '-' + amp.toFixed(3);
            }
            /* so o veu de distancia (sem vento, sem base): as rosetas,
             * que vivem deitadas no chao — ao longe fundem-se com ele */
            function aplicarSoVeuV(mat) {
                mat.userData.__pintado = true;
                mat.onBeforeCompile = (sh) => {
                    Object.assign(sh.uniforms, uniAmbTroca);
                    sh.vertexShader = sh.vertexShader
                        .replace('#include <common>', '#include <common>\nvarying float vDistV;\nvarying float vAltFrV;\nvarying float vNyV;')
                        .replace('#include <begin_vertex>', `#include <begin_vertex>
                            {
                                vec4 mvVeu = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                                vDistV = length(mvVeu.xyz);
                                vAltFrV = 1.0;
                                vNyV = 1.0;
                            }`);
                    sh.fragmentShader = sh.fragmentShader
                        .replace('#include <common>', '#include <common>\nvarying float vDistV;\nvarying float vAltFrV;\nvarying float vNyV;\nuniform vec3 uAmbCeuT;\nuniform float uAmbForcaT;')
                        .replace('#include <aomap_fragment>', `#include <aomap_fragment>
                            reflectedLight.indirectDiffuse += mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))), 0.8) * uAmbCeuT * (uAmbForcaT * 0.8);`)
                        .replace('#include <tonemapping_fragment>', VEU_SO_V);
                };
                mat.customProgramCacheKey = () => 'troca-veu-roseta3';
            }
            /* — texturas dos tufos (receitas da prova) — */
            const texTufoV = texturaCanvasV(256, (g, S) => {
                let s2 = 777;
                const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
                g.clearRect(0, 0, S, S);
                for (let i = 0; i < 46; i++) {
                    const x0 = S * 0.5 + (rr() - 0.5) * S * 0.55, incl = (rr() - 0.5) * S * 0.5, h = S * (0.45 + rr() * 0.5);
                    const gr = g.createLinearGradient(0, S, 0, S - h);
                    gr.addColorStop(0, '#3c5c1c'); gr.addColorStop(1, rr() < 0.22 ? '#b39b4a' : '#79a843');
                    g.strokeStyle = gr; g.lineWidth = 3.2 + rr() * 3.4; g.lineCap = 'round';
                    g.beginPath(); g.moveTo(x0, S); g.quadraticCurveTo(x0 + incl * 0.3, S - h * 0.6, x0 + incl, S - h); g.stroke();
                }
            });
            const texJuncoV = texturaCanvasV(256, (g, S) => {
                let s2 = 4242;
                const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
                g.clearRect(0, 0, S, S);
                for (let i = 0; i < 26; i++) {
                    const x0 = S * 0.5 + (rr() - 0.5) * S * 0.6, incl = (rr() - 0.5) * S * 0.22, h = S * (0.7 + rr() * 0.3);
                    g.strokeStyle = rr() < 0.3 ? '#7d8f3f' : '#5d7a2e'; g.lineWidth = 4.5 + rr() * 3; g.lineCap = 'round';
                    g.beginPath(); g.moveTo(x0, S); g.quadraticCurveTo(x0 + incl * 0.3, S - h * 0.6, x0 + incl, S - h); g.stroke();
                    if (rr() < 0.45) { g.fillStyle = '#6d4c2a'; g.beginPath(); g.ellipse(x0 + incl, S - h + 12, 4.5, 13, incl * 0.02, 0, 7); g.fill(); }
                }
            });
            const texFlorV = texturaCanvasV(128, (g, S) => {
                let s2 = 99;
                const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
                g.clearRect(0, 0, S, S);
                g.strokeStyle = '#4d7030'; g.lineWidth = 3.4; g.lineCap = 'round';
                for (let i = 0; i < 7; i++) {
                    const x0 = S * (0.24 + rr() * 0.52);
                    g.beginPath(); g.moveTo(x0, S); g.lineTo(x0 + (rr() - 0.5) * 12, S * 0.42); g.stroke();
                    g.fillStyle = '#5d8438'; g.beginPath(); g.ellipse(x0, S * 0.8, 9, 4.4, rr(), 0, 7); g.fill();
                }
                const petalas = ['#e8e4da', '#e5cf6e', '#d9a0b8', '#c9d6ea'];
                for (let i = 0; i < 6; i++) {
                    const cx = S * (0.2 + rr() * 0.6), cy = S * (0.16 + rr() * 0.3), r = 5 + rr() * 4.6, cor = petalas[(rr() * petalas.length) | 0];
                    g.fillStyle = cor;
                    for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72, r * 0.62, r * 0.42, a, 0, 7); g.fill(); }
                    g.fillStyle = '#e8a33c'; g.beginPath(); g.arc(cx, cy, r * 0.4, 0, 7); g.fill();
                }
            });
            const texRosetaV = texturaCanvasV(256, (g, S) => {
                let s2 = 31337;
                const rr = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
                g.clearRect(0, 0, S, S);
                const cx = S / 2, cy = S / 2;
                for (let i = 0; i < 64; i++) {
                    const a = rr() * Math.PI * 2, comp = S * (0.16 + rr() * 0.30);
                    const x1 = cx + Math.cos(a) * comp, y1 = cy + Math.sin(a) * comp;
                    const mx = cx + Math.cos(a + 0.35) * comp * 0.55, my = cy + Math.sin(a + 0.35) * comp * 0.55;
                    const gr = g.createLinearGradient(cx, cy, x1, y1);
                    gr.addColorStop(0, '#46681f'); gr.addColorStop(1, rr() < 0.2 ? '#a8923f' : '#7cab44');
                    g.strokeStyle = gr; g.lineWidth = 3 + rr() * 3.4; g.lineCap = 'round';
                    g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(mx, my, x1, y1); g.stroke();
                }
            });
            /* — registo de baldes + recibo + cortes — */
            const baldesV = {};
            const registarV = (nome, im, trisPorInst) => { (baldesV[nome] = baldesV[nome] || []).push({ im, total: im.count, tris: trisPorInst }); };
            const reciboV = { pronto: false, nivel: 'alta', baldes: {}, plantas: {}, obstaculos: 0, erros: [] };
            world.povoamentoTroca = reciboV;
            const FRAC_V = {
                ultra: { tufos: 1, tufosAltos: 1, rosetas: 1, juncos: 1, flores: 1, fetosPH: 1, fetosKit: 1, arbustos: 1, arvores: 1, pedras: 1 },
                alta: { tufos: 1, tufosAltos: 1, rosetas: 1, juncos: 1, flores: 1, fetosPH: 1, fetosKit: 1, arbustos: 1, arvores: 1, pedras: 1 },
                media: { tufos: 0.38, tufosAltos: 0.6, rosetas: 0.38, juncos: 0.7, flores: 0.5, fetosPH: 0.35, fetosKit: 0.6, arbustos: 0.51, arvores: 0.55, pedras: 0.7 },
                baixa: { tufos: 0.19, tufosAltos: 0.3, rosetas: 0.19, juncos: 0.5, flores: 0.3, fetosPH: 0, fetosKit: 0.3, arbustos: 0.32, arvores: 0.35, pedras: 0.5 },
                /* PASSO 6 (21/11): ULTRA LEVE — a densidade minima do
                 * degrau novo (aparelhos fracos): a relva quase sai
                 * (o chao pintado aguenta a leitura de prado), as
                 * arvores/pedras — que tambem sao leitura de
                 * obstaculo — cortam menos. O reflexo planar ja
                 * fica fora (so alta/ultra o ligam, abaixo). */
                ultraleve: { tufos: 0.10, tufosAltos: 0.15, rosetas: 0.10, juncos: 0.35, flores: 0.15, fetosPH: 0, fetosKit: 0.15, arbustos: 0.20, arvores: 0.30, pedras: 0.40 }
            };
            world.definirPovoamento = (q) => {
                const F = FRAC_V[q] || FRAC_V.alta;
                for (const nome of Object.keys(baldesV)) {
                    const f = (F[nome] !== undefined) ? F[nome] : 1;
                    for (const b of baldesV[nome]) b.im.count = Math.round(b.total * f);
                }
                reciboV.nivel = q;
                /* porta de qualidade do REFLEXO PLANAR da água (volta
                 * 2 das cores): só alta/ultra pagam o passe extra */
                world.__nivelReflexoAgua = (q === 'alta' || q === 'ultra');
            };
            const obstaculosV = [];
            /* — TESTE DA RELVA (PASSO 6, 21/11) — item nomeado do
             * Mestre (20/11 23:42: «Pode testar»): uma variante de
             * tufos MAIORES e MAIS JUNTOS guardada como SEGUNDA
             * configuração desta tabela. A configuração OFICIAL é a
             * de hoje, ao bit (mesmos literais, mesma ordem de
             * sorteios do RNG das posições — a cena aprovada não
             * muda um tufo). A do TESTE só nasce quando a chave
             * localStorage 'hudt1-relva-teste' está 'ligado' à
             * construção (as sondas do passo ligam-na; o jogo, por
             * omissão, constrói sempre a oficial). A configuração
             * oficial só muda com o veredicto dele sobre a
             * comparação — aí os valores do teste passam a ser os
             * da linha 'oficial'. Recibo: povoamentoTroca.relva. */
            let relvaTesteLigadoV = false;
            try { relvaTesteLigadoV = localStorage.getItem('hudt1-relva-teste') === 'ligado'; } catch (_) {}
            const CFG_RELVA_V = relvaTesteLigadoV ? {
                nome: 'teste',
                geoBase: [0.85, 0.72], escBase: [0.9, 1.6], nBase: 33000,
                escPerto: [1.0, 1.8], nPerto: 15000, tentPerto: 220000,
                geoAlto: [1.05, 1.30], escAlto: [0.9, 1.45], nAlto: 4200,
                rosBase: 0.45, rosPerto: 0.45, rosAlto: 0.62
            } : {
                nome: 'oficial',
                geoBase: [0.62, 0.52], escBase: [0.7, 1.35], nBase: 24000,
                escPerto: [0.8, 1.5], nPerto: 11000, tentPerto: 140000,
                geoAlto: [0.85, 1.05], escAlto: [0.75, 1.25], nAlto: 3400,
                rosBase: 0.33, rosPerto: 0.33, rosAlto: 0.48
            };
            reciboV.relva = CFG_RELVA_V.nome;
            /* — TUFOS BASE (peso da prova) + roseta — */
            const pesoTufoV = (px, pz) => {
                const rel = alturaV(px, pz) - AGUA_Y_V;
                if (rel < 0.22) return 0;
                let p = 0.34 + manchaOuroV(px, pz) * 0.30 + Math.max(0, ruidoV(px, pz, 0.05)) * 0.30;
                if (naManchaV(px, pz)) p += 0.22;
                const dp = distCaminhoV(px, pz);
                if (dp < 2.2) return 0; if (dp < 3.4) p *= 0.4;
                if (naClareiraV(px, pz, 0)) p *= 0.55;
                return Math.min(p, 0.97);
            };
            const ptsTufoV = amostrarV(CFG_RELVA_V.nBase, pesoTufoV);
            const matTufoV = new T.MeshLambertMaterial({ map: texTufoV, alphaTest: 0.45, side: T.DoubleSide });
            matTufoV.envMapIntensity = world.iblTroca.tufo;
            aplicarVentoV(matTufoV, 0.075, 0.0, CFG_RELVA_V.geoBase[1]);
            const imTufoV = new T.InstancedMesh(cruzarV(CFG_RELVA_V.geoBase[0], CFG_RELVA_V.geoBase[1]), matTufoV, ptsTufoV.length);
            preencherV(imTufoV, ptsTufoV, CFG_RELVA_V.escBase[0], CFG_RELVA_V.escBase[1], 0.03);
            imTufoV.onBeforeRender = () => { uTempoV.value = performance.now() / 1000; };
            /* cores por instância: AS RECEITAS DA PROVA (volta das
             * cores, 21/11) — verde setHSL(0,295±0,015; 0,55; L
             * 0,40–0,53), ouro setHSL(0,12; 0,50; L 0,46–0,53) nos
             * corações de mancha > 0,66. Os valores RGB da integração
             * foram abandonados: tinham sido escolhidos a compensar a
             * pintura composta e a pele lima — removidas as duas, a
             * régua volta a ser a receita da prova. Junto ao caminho,
             * tom seco pisado. RNG privado (rndCorV): o fluxo de rndV
             * das POSIÇÕES aprovadas não se consome aqui. */
            let semCorV = 20261121;
            const rndCorV = () => (semCorV = (semCorV * 16807) % 2147483647) / 2147483647;
            { const cor = new T.Color();
              ptsTufoV.forEach(([px, pz], i) => {
                  const ouro = manchaOuroV(px, pz), cam = distCaminhoV(px, pz) < 3.4;
                  if (cam) cor.setHSL(0.13, 0.38, 0.42 + rndCorV() * 0.08);
                  else if (ouro > 0.66) cor.setHSL(0.12, 0.50, 0.46 + rndCorV() * 0.07);
                  else cor.setHSL(0.295 + (rndCorV() - 0.5) * 0.03, 0.55, 0.40 + rndCorV() * 0.13);
                  imTufoV.setColorAt(i, cor);
              });
              if (imTufoV.instanceColor) imTufoV.instanceColor.needsUpdate = true; }
            registarV('tufos', imTufoV, 4);
            const matRosV = new T.MeshLambertMaterial({ map: texRosetaV, alphaTest: 0.4, side: T.DoubleSide, color: new T.Color(0.82, 0.85, 0.78) });
            matRosV.envMapIntensity = world.iblTroca.tufo;
            aplicarSoVeuV(matRosV);
            const imRosV = new T.InstancedMesh(geoRosetaV(CFG_RELVA_V.rosBase), matRosV, ptsTufoV.length);
            preencherV(imRosV, ptsTufoV, 0.7, 1.35, -0.005);
            /* CORES (21/11): as rosetas ganham a receita da prova por
             * instância (não tinham nenhuma — liam-se cruas da textura,
             * fora da paleta); um toque mais escuras que os tufos, por
             * viverem coladas ao chão */
            { const cor = new T.Color();
              ptsTufoV.forEach(([px, pz], i) => {
                  if (manchaOuroV(px, pz) > 0.66) cor.setHSL(0.12, 0.48, 0.42 + rndCorV() * 0.07);
                  else cor.setHSL(0.295 + (rndCorV() - 0.5) * 0.03, 0.52, 0.36 + rndCorV() * 0.12);
                  imRosV.setColorAt(i, cor);
              });
              if (imRosV.instanceColor) imRosV.instanceColor.needsUpdate = true; }
            registarV('rosetas', imRosV, 2);
            /* — CAMADA «PERTO» DA PROVA (volta 2 das cores, 21/11):
             * 11.000 tufos em anéis à volta de cinco focos — a camada
             * que na prova fecha o miolo das vistas; a candidata só
             * tinha os tufos base e ao olho do Mestre a relva lia-se
             * «aos tufinhos separados». Receita da prova: mesmo
             * cruzado dos tufos base, escala 0,8–1,5, aceitação
             * pesoTufo×1,35. RNG privado (rndPertoV): os sorteios das
             * camadas aprovadas não se consomem. Focos em coords. da
             * prova: vale de entrada, clareira 1, junto ao orc do
             * caminho, lago, norte. Registada nos baldes
             * 'tufos'/'rosetas': os cortes de qualidade aplicam-lhe a
             * mesma fracção dos tufos base. */
            let semPertoV = 8112026;
            const rndPertoV = () => (semPertoV = (semPertoV * 16807) % 2147483647) / 2147483647;
            const focosPertoV = [[-30, 62, 34], [18, 8, 30], [-6, caminhoZV(-6) + 3.4, 15], [LAGOPV.x, LAGOPV.z, 40], [2, 55, 20]];
            const ptsPertoV = [];
            for (let tentV = 0; tentV < CFG_RELVA_V.tentPerto && ptsPertoV.length < CFG_RELVA_V.nPerto; tentV++) {
                const fV = focosPertoV[(rndPertoV() * focosPertoV.length) | 0];
                const aV = rndPertoV() * Math.PI * 2, rV = Math.sqrt(rndPertoV()) * fV[2];
                const px = fV[0] + Math.cos(aV) * rV, pz = fV[1] + Math.sin(aV) * rV;
                if (px < -128 || px > 128 || pz < -128 || pz > 128) continue;
                if (rndPertoV() < pesoTufoV(px, pz) * 1.35) ptsPertoV.push([px, pz]);
            }
            const imPertoV = new T.InstancedMesh(cruzarV(CFG_RELVA_V.geoBase[0], CFG_RELVA_V.geoBase[1]), matTufoV, ptsPertoV.length);
            preencherV(imPertoV, ptsPertoV, CFG_RELVA_V.escPerto[0], CFG_RELVA_V.escPerto[1], 0.03);
            { const cor = new T.Color();
              ptsPertoV.forEach(([px, pz], i) => {
                  const ouro = manchaOuroV(px, pz), cam = distCaminhoV(px, pz) < 3.4;
                  if (cam) cor.setHSL(0.13, 0.38, 0.42 + rndCorV() * 0.08);
                  else if (ouro > 0.66) cor.setHSL(0.12, 0.50, 0.46 + rndCorV() * 0.07);
                  else cor.setHSL(0.295 + (rndCorV() - 0.5) * 0.03, 0.55, 0.40 + rndCorV() * 0.13);
                  imPertoV.setColorAt(i, cor);
              });
              if (imPertoV.instanceColor) imPertoV.instanceColor.needsUpdate = true; }
            registarV('tufos', imPertoV, 4);
            const imRosPertoV = new T.InstancedMesh(geoRosetaV(CFG_RELVA_V.rosPerto), matRosV, ptsPertoV.length);
            preencherV(imRosPertoV, ptsPertoV, 0.8, 1.5, -0.005);
            { const cor = new T.Color();
              ptsPertoV.forEach(([px, pz], i) => {
                  if (manchaOuroV(px, pz) > 0.66) cor.setHSL(0.12, 0.48, 0.42 + rndCorV() * 0.07);
                  else cor.setHSL(0.295 + (rndCorV() - 0.5) * 0.03, 0.52, 0.36 + rndCorV() * 0.12);
                  imRosPertoV.setColorAt(i, cor);
              });
              if (imRosPertoV.instanceColor) imRosPertoV.instanceColor.needsUpdate = true; }
            registarV('rosetas', imRosPertoV, 2);
            /* — TUFOS ALTOS (manchas e manchas de ouro) + roseta — */
            const pesoAltoV = (px, pz) => {
                const rel = alturaV(px, pz) - AGUA_Y_V;
                if (rel < 0.3) return 0;
                let p = Math.max(0, manchaOuroV(px, pz) - 0.45) * 0.9;
                if (naManchaV(px, pz)) p += 0.85;
                const dp = distCaminhoV(px, pz);
                if (dp < 2.6) return 0; if (dp < 4) p *= 0.35;
                if (naClareiraV(px, pz, 0)) p *= 0.3;
                return Math.min(p, 0.95);
            };
            const ptsAltoV = amostrarV(CFG_RELVA_V.nAlto, pesoAltoV);
            const matAltoV = new T.MeshLambertMaterial({ map: texTufoV, alphaTest: 0.45, side: T.DoubleSide });
            matAltoV.envMapIntensity = world.iblTroca.tufo;
            aplicarVentoV(matAltoV, 0.11, 1.7, CFG_RELVA_V.geoAlto[1]);
            const imAltoV = new T.InstancedMesh(cruzarV(CFG_RELVA_V.geoAlto[0], CFG_RELVA_V.geoAlto[1]), matAltoV, ptsAltoV.length);
            preencherV(imAltoV, ptsAltoV, CFG_RELVA_V.escAlto[0], CFG_RELVA_V.escAlto[1], 0.03);
            { const cor = new T.Color();
              ptsAltoV.forEach(([px, pz], i) => {
                  if (manchaOuroV(px, pz) > 0.66) cor.setHSL(0.12, 0.50, 0.46 + rndCorV() * 0.07);
                  else cor.setHSL(0.295 + (rndCorV() - 0.5) * 0.03, 0.55, 0.42 + rndCorV() * 0.13);
                  imAltoV.setColorAt(i, cor);
              });
              if (imAltoV.instanceColor) imAltoV.instanceColor.needsUpdate = true; }
            registarV('tufosAltos', imAltoV, 4);
            const imRosAltoV = new T.InstancedMesh(geoRosetaV(CFG_RELVA_V.rosAlto), matRosV, ptsAltoV.length);
            preencherV(imRosAltoV, ptsAltoV, 0.75, 1.25, -0.005);
            { const cor = new T.Color();
              ptsAltoV.forEach(([px, pz], i) => {
                  if (manchaOuroV(px, pz) > 0.66) cor.setHSL(0.12, 0.48, 0.42 + rndCorV() * 0.07);
                  else cor.setHSL(0.295 + (rndCorV() - 0.5) * 0.03, 0.52, 0.38 + rndCorV() * 0.12);
                  imRosAltoV.setColorAt(i, cor);
              });
              if (imRosAltoV.instanceColor) imRosAltoV.instanceColor.needsUpdate = true; }
            registarV('rosetas', imRosAltoV, 2);
            /* — JUNCOS (grupos na margem do lago) — VOLTA 2 DAS CORES
             * (21/11): receita afinada à da prova — 30 grupos no anel
             * 0,86–1,06 do raio (metade dentro da água baixa, como na
             * prova), 9–21 por grupo; a volta 1 tinha 4–9 por grupo
             * num anel mais fora e um filtro de altura que matava os
             * da água baixa: 121 contra ~450 da prova, e a margem
             * lia-se nua nas fotos do lago. */
            const ptsJuncoV = [];
            for (let gI = 0; gI < 30; gI++) {
                const a = rndV() * Math.PI * 2, rr = 30 * (0.86 + rndV() * 0.20);
                const cx = LAGOPV.x + Math.cos(a) * rr, cz = LAGOPV.z + Math.sin(a) * rr, n = 9 + (rndV() * 13 | 0);
                for (let k = 0; k < n; k++) {
                    const px = cx + (rndV() - 0.5) * 3.0, pz = cz + (rndV() - 0.5) * 3.0;
                    const rel = alturaV(px, pz) - AGUA_Y_V;
                    if (rel > -1.2 && rel < 2.2) ptsJuncoV.push([px, pz]);
                }
            }
            const matJuncoV = new T.MeshLambertMaterial({ map: texJuncoV, alphaTest: 0.45, side: T.DoubleSide });
            matJuncoV.envMapIntensity = world.iblTroca.tufo;
            aplicarVentoV(matJuncoV, 0.035, 3.1, 1.35);
            const imJuncoV = new T.InstancedMesh(cruzarV(0.85, 1.35), matJuncoV, ptsJuncoV.length);
            preencherV(imJuncoV, ptsJuncoV, 0.7, 1.1, 0.10);
            registarV('juncos', imJuncoV, 4);
            /* — FLORES (manchas de terra) — */
            const ptsFlorV = amostrarV(520, (px, pz) => {
                const rel = alturaV(px, pz) - AGUA_Y_V;
                if (rel < 0.25) return 0;
                let p = Math.max(0, manchaTerraV(px, pz) - 0.52) * 1.15;
                const dp = distCaminhoV(px, pz);
                if (dp < 2.4) return 0; if (dp < 4) p *= 0.4;
                return Math.min(p, 0.9);
            });
            const imFlorV = new T.InstancedMesh(cruzarV(0.17, 0.3), new T.MeshLambertMaterial({ map: texFlorV, alphaTest: 0.45, side: T.DoubleSide }), ptsFlorV.length);
            imFlorV.material.envMapIntensity = world.iblTroca.tufo;
            preencherV(imFlorV, ptsFlorV, 0.8, 1.4, 0.02);
            { const cor = new T.Color(); const tonsFlor = [[1, 1, 1], [1.06, 0.94, 0.62], [1.02, 0.82, 0.88], [0.9, 0.96, 1.05]];
              ptsFlorV.forEach((_, i) => { const t = tonsFlor[(rndV() * tonsFlor.length) | 0]; cor.setRGB(t[0], t[1], t[2]); imFlorV.setColorAt(i, cor); });
              if (imFlorV.instanceColor) imFlorV.instanceColor.needsUpdate = true; }
            registarV('flores', imFlorV, 4);
            /* contagens de PLANTAS (o recibo `baldes` conta
             * malhas-instância para os cortes e o censo; as plantas
             * verdadeiras — um GLB de 2 sub-malhas é UMA planta —
             * vivem em reciboV.plantas) */
            reciboV.plantas.tufos = ptsTufoV.length;
            reciboV.plantas.tufosAltos = ptsAltoV.length;
            reciboV.plantas.juncos = ptsJuncoV.length;
            reciboV.plantas.flores = ptsFlorV.length;
            /* — GLB do kit e da prova (assíncrono; o recibo fecha no fim) — */
            const carregarGLBV = url => new Promise((res, rej) => new T.GLTFLoader().load(url, g => res(g.scene), undefined, rej));
            const tentarGLBV = async (url) => { try { return await carregarGLBV(url); } catch (e) { reciboV.erros.push(url); return null; } };
            function instanciarMultiV(raiz, pacote, sombras, variarFolhas) {
                const malhas = []; raiz.updateMatrixWorld(true);
                raiz.traverse(o => { if (o.isMesh) malhas.push(o); });
                const saida = [];
                for (const malha of malhas) {
                    const geo = malha.geometry.clone().applyMatrix4(malha.matrixWorld);
                    const tris = Math.round((geo.index ? geo.index.count : geo.attributes.position.count) / 3);
                    /* CORES (21/11): o material CLONA-SE e marca-se
                     * __pintado + __mapaPintado ANTES de entrar na cena —
                     * a pintura da casa (polling) salta a vegetação e as
                     * pedras do mapa novo: na prova aprovada elas lêem-se
                     * CRUAS (Standard + IBL), e a pintura (posterização +
                     * dessaturação 0,22 + rim + rugosidade) era a causa
                     * das copas acastanhadas/quase pretas da candidata.
                     * Figuras e mundo antigo guardam a pintura. */
                    const matGLB = malha.material.clone();
                    matGLB.envMapIntensity = world.iblTroca.glb;   // PASSO 5: IBL da prova nas copas/pedras (na prova lêem-se Standard + IBL)
                    matGLB.userData.__pintado = true;
                    matGLB.userData.__mapaPintado = true;
                    const im = new T.InstancedMesh(geo, matGLB, pacote.mats.length);
                    pacote.mats.forEach((m, i) => im.setMatrixAt(i, m));
                    if (variarFolhas && malha.material && /folhas|leaves/i.test(malha.material.name || '')) {
                        const cor = new T.Color();
                        for (let i = 0; i < pacote.mats.length; i++) { cor.setRGB(0.85 + rndV() * 0.20, 0.88 + rndV() * 0.18, 0.82 + rndV() * 0.20); im.setColorAt(i, cor); }
                        if (im.instanceColor) im.instanceColor.needsUpdate = true;
                    }
                    im.castShadow = !!sombras; im.frustumCulled = false;
                    scene.add(im); saida.push({ im, tris });
                }
                return saida;
            }
            (async () => {
                /* — ÁRVORES por zonas (a distribuição da prova) — */
                const zonasArvV = [
                    { cx: -78, cz: -62, r: 34, comum: 16, pinheiro: 6, torcida: 2 },
                    { cx: 94, cz: 56, r: 28, comum: 12, pinheiro: 4, torcida: 2 },
                    { cx: 100, cz: -54, r: 24, comum: 8, pinheiro: 5, torcida: 0 }
                ];
                const pedidosV = [];
                for (const z of zonasArvV) for (const esp of ['comum', 'pinheiro', 'torcida']) for (let i = 0; i < z[esp]; i++) {
                    const p = pontosZonaV(z.cx, z.cz, z.r, 1, { lagoMin: 35, camMin: 5 })[0];
                    if (p) pedidosV.push({ esp, px: p[0], pz: p[1] });
                }
                for (const [px, pz, esp] of [[30, 80, 'comum'], [84, 42, 'comum'], [-40, 74, 'comum'], [-6, 70, 'torcida'], [66, -14, 'pinheiro']]) pedidosV.push({ esp, px, pz });
                for (const [px, pz] of amostrarV(15, (x, z) => (Math.abs(x) > 92 || Math.abs(z) > 92) ? 0.8 : 0)) pedidosV.push({ esp: 'comum', px, pz });
                const arvoresV = [];
                for (const p of pedidosV) if (!arvoresV.some(a => Math.hypot(a.px - p.px, a.pz - p.pz) < 4.6)) arvoresV.push(p);
                const VAR_ARV_V = { comum: [1, 2, 4], pinheiro: [1, 3, 4], torcida: [1, 3] };
                const ESC_ARV_V = { comum: [0.95, 1.45], pinheiro: [0.95, 1.40], torcida: [0.52, 0.66] };
                const URL_ARV_V = { comum: v => `modelos/cenario/arvore-comum-${v}.glb`, pinheiro: v => `modelos/cenario/pinheiro-${v}.glb`, torcida: v => `modelos/cenario/arvore-torcida-${v}.glb` };
                for (const esp of ['comum', 'pinheiro', 'torcida']) {
                    const doTipo = arvoresV.filter(a => a.esp === esp);
                    const vars = VAR_ARV_V[esp];
                    for (let vi = 0; vi < vars.length; vi++) {
                        const sub = embaralharV(doTipo.filter((_, i) => i % vars.length === vi));
                        if (!sub.length) continue;
                        const raiz = await tentarGLBV(URL_ARV_V[esp](vars[vi]));
                        if (!raiz) continue;
                        const pacote = matrizesV(sub.map(a => [a.px, a.pz]), ESC_ARV_V[esp][0], ESC_ARV_V[esp][1], 0.06);
                        instanciarMultiV(raiz, pacote, true, true).forEach(({ im, tris }) => registarV('arvores', im, tris));
                        sub.forEach(a => obstaculosV.push({ x: a.px + 6, z: a.pz - 19, r: 0.5, h: 10 }));
                    }
                }
                /* — árvores mortas + tronco caído — */
                for (const [ficheiro, px, pz, eMin, eMax] of [['arvore-morta-1', -38, 6, 0.95, 1.0], ['arvore-morta-2', 96, -78, 0.85, 0.9]]) {
                    const raiz = await tentarGLBV(`modelos/cenario/${ficheiro}.glb`);
                    if (!raiz) continue;
                    const pacote = matrizesV([[px, pz]], eMin, eMax, 0.04);
                    instanciarMultiV(raiz, pacote, true, false).forEach(({ im, tris }) => registarV('arvores', im, tris));
                    obstaculosV.push({ x: px + 6, z: pz - 19, r: 0.5, h: 8 });
                }
                { const texCascaV = new T.TextureLoader().load('modelos/cenario/casca-dif.jpg');
                  texCascaV.encoding = T.sRGBEncoding; texCascaV.wrapS = texCascaV.wrapT = T.RepeatWrapping; texCascaV.repeat.set(3, 1);
                  const matTroncoV = new T.MeshLambertMaterial({ map: texCascaV });
                  matTroncoV.envMapIntensity = world.iblTroca.glb;
                  matTroncoV.userData.__pintado = true; matTroncoV.userData.__mapaPintado = true;   // CORES (21/11): a casca lê-se crua, como na prova — a pintura da casa salta-a
                  const troncoV = new T.Mesh(new T.CylinderGeometry(0.16, 0.24, 7.5, 7), matTroncoV);
                  troncoV.rotation.z = Math.PI / 2; troncoV.rotation.y = 0.7;
                  troncoV.position.set(2 + 6, alturaV(2, 52) + 0.22, 52 - 19);
                  troncoV.castShadow = true; scene.add(troncoV); }
                /* — PEDRAS MÉDIAS do kit + afloramentos — */
                const ptsPedraKitV = [];
                for (let i = 0; i < 10; i++) { const a = rndV() * Math.PI * 2, rr = 31 + rndV() * 6; ptsPedraKitV.push([LAGOPV.x + Math.cos(a) * rr, LAGOPV.z + Math.sin(a) * rr]); }
                ptsPedraKitV.push(...amostrarV(22, (x, z) => { const rel = alturaV(x, z) - AGUA_Y_V; if (rel < 1.0 || distCaminhoV(x, z) < 5 || naClareiraV(x, z, -6)) return 0; return naManchaV(x, z) ? 0.55 : 0.16; }));
                embaralharV(ptsPedraKitV);
                const tercoKV = Math.ceil(ptsPedraKitV.length / 3);
                for (const [vi, fatia] of [[1, ptsPedraKitV.slice(0, tercoKV)], [2, ptsPedraKitV.slice(tercoKV, tercoKV * 2)], [3, ptsPedraKitV.slice(tercoKV * 2)]]) {
                    if (!fatia.length) continue;
                    const raiz = await tentarGLBV(`modelos/cenario/pedra-media-${vi}.glb`);
                    if (!raiz) continue;
                    const pacote = matrizesV(fatia, 0.6, 1.5, 0.14);
                    instanciarMultiV(raiz, pacote, true, false).forEach(({ im, tris }) => registarV('pedras', im, tris));
                    pacote.regs.forEach(rg => { if (rg.e >= 1.0) obstaculosV.push({ x: rg.px + 6, z: rg.pz - 19, r: Math.round(1.1 * rg.e * 100) / 100, h: Math.round(1.5 * rg.e * 100) / 100 }); });
                }
                const ptsAflorV = [];
                for (const [cx, cz] of [[-104, -16], [58, 92], [16, -96]]) { const n = 4 + (rndV() * 2 | 0); for (let i = 0; i < n; i++) ptsAflorV.push([cx + (rndV() - 0.5) * 7, cz + (rndV() - 0.5) * 7]); }
                for (const [vi, fatia, eMin, eMax] of [[1, ptsAflorV.filter((_, i) => i % 2 === 0), 1.8, 3.1], [3, ptsAflorV.filter((_, i) => i % 2 === 1), 1.8, 3.0]]) {
                    if (!fatia.length) continue;
                    const raiz = await tentarGLBV(`modelos/cenario/pedra-media-${vi}.glb`);
                    if (!raiz) continue;
                    const pacote = matrizesV(fatia, eMin, eMax, 0.30);
                    instanciarMultiV(raiz, pacote, true, false).forEach(({ im, tris }) => registarV('pedras', im, tris));
                    pacote.regs.forEach(rg => obstaculosV.push({ x: rg.px + 6, z: rg.pz - 19, r: Math.round(1.1 * rg.e * 100) / 100, h: Math.round(1.5 * rg.e * 100) / 100 }));
                }
                /* — FETOS PH (margem do lago, caminho, bosques, manchas) — */
                const ptsFetoV = [
                    ...amostrarV(64, (x, z) => { const rel = alturaV(x, z) - AGUA_Y_V; return (rel > 0.3 && rel < 1.9) ? 0.85 : 0; }),
                    ...amostrarV(28, (x, z) => { const dp = distCaminhoV(x, z); return (dp > 2.2 && dp < 5.2) ? 0.6 : 0; }),
                    ...pontosZonaV(-78, -62, 30, 16, { lagoMin: 35, camMin: 4 }),
                    ...pontosZonaV(94, 56, 25, 12, { lagoMin: 35, camMin: 4 }),
                    ...pontosZonaV(100, -54, 21, 8, { lagoMin: 35, camMin: 4 })
                ];
                for (const [cx, cz, r] of MANCHAS_V) ptsFetoV.push(...pontosZonaV(cx, cz, r, 9, { lagoMin: 35, camMin: 3.4 }));
                embaralharV(ptsFetoV);
                const metadeFV = Math.ceil(ptsFetoV.length / 2);
                for (const [ficheiro, fatia, eMin, eMax] of [['fern-a', ptsFetoV.slice(0, metadeFV), 0.9, 1.6], ['fern-b', ptsFetoV.slice(metadeFV), 0.8, 1.4]]) {
                    if (!fatia.length) continue;
                    const raiz = await tentarGLBV(`modelos/cenario/${ficheiro}.glb`);
                    if (!raiz) continue;
                    const pacote = matrizesV(fatia, eMin, eMax, 0.02);
                    instanciarMultiV(raiz, pacote, false, false).forEach(({ im, tris }) => registarV('fetosPH', im, tris));
                }
                /* — PEDRAS PH (anel do lago + prado) — */
                const ptsPedraPHV = [];
                for (let i = 0; i < 11; i++) {
                    const a = rndV() * Math.PI * 2, rr = 31.5 + rndV() * 4;
                    const x = LAGOPV.x + Math.cos(a) * rr, z = LAGOPV.z + Math.sin(a) * rr;
                    ptsPedraPHV.push([x, z]);
                    if (rndV() < 0.55) ptsPedraPHV.push([x + (rndV() - 0.5) * 3.4, z + (rndV() - 0.5) * 3.4]);
                }
                ptsPedraPHV.push(...amostrarV(9, (x, z) => { const rel = alturaV(x, z) - AGUA_Y_V; if (rel < 1.2 || distCaminhoV(x, z) < 5.5 || naClareiraV(x, z, 0)) return 0; return naManchaV(x, z) ? 0.5 : 0.10; }));
                const PONTOS_ROCHA_V = ptsPedraPHV.slice();
                embaralharV(ptsPedraPHV);
                const tercoRV = Math.ceil(ptsPedraPHV.length / 3);
                for (const [ficheiro, fatia, eMin, eMax] of [['rock-a', ptsPedraPHV.slice(0, tercoRV), 0.5, 1.3], ['rock-b', ptsPedraPHV.slice(tercoRV, tercoRV * 2), 0.5, 1.4], ['rock-c', ptsPedraPHV.slice(tercoRV * 2), 0.5, 1.2]]) {
                    if (!fatia.length) continue;
                    const raiz = await tentarGLBV(`modelos/cenario/${ficheiro}.glb`);
                    if (!raiz) continue;
                    const pacote = matrizesV(fatia, eMin, eMax, 0.16);
                    instanciarMultiV(raiz, pacote, true, false).forEach(({ im, tris }) => registarV('pedras', im, tris));
                    pacote.regs.forEach(rg => { if (rg.e >= 0.9) obstaculosV.push({ x: rg.px + 6, z: rg.pz - 19, r: Math.round(0.8 * rg.e * 100) / 100, h: Math.round(1.1 * rg.e * 100) / 100 }); });
                }
                /* — FETOS do kit (manchas e bosques) — */
                const ptsFetoKitV = [];
                for (const [cx, cz, r] of MANCHAS_V) ptsFetoKitV.push(...pontosZonaV(cx, cz, r, 15, { lagoMin: 35, camMin: 3.4 }));
                ptsFetoKitV.push(...pontosZonaV(-78, -62, 30, 12, { lagoMin: 35, camMin: 4 }));
                ptsFetoKitV.push(...pontosZonaV(94, 56, 25, 10, { lagoMin: 35, camMin: 4 }));
                embaralharV(ptsFetoKitV);
                { const raiz = await tentarGLBV('modelos/cenario/feto-kit.glb');
                  if (raiz) { const pacote = matrizesV(ptsFetoKitV, 0.8, 1.5, 0.03); instanciarMultiV(raiz, pacote, false, false).forEach(({ im, tris }) => registarV('fetosKit', im, tris)); } }
                /* — ARBUSTOS NATURALIZADOS (o bloco exacto da prova:
                 * grupos irregulares amarrados a orlas dos bosques,
                 * pedras, anel do lago e bordas do caminho; cada pé com
                 * escala anisotrópica própria e afundamento próprio;
                 * RNG privado com a semente da prova) — */
                let semBV = 20261121;
                const rndBV = () => (semBV = (semBV * 16807) % 2147483647) / 2147483647;
                const podeMatoV = (x, z) => Math.hypot(x - LAGOPV.x, z - LAGOPV.z) >= 33 && distCaminhoV(x, z) >= 3.4 && !naClareiraV(x, z, 1);
                const pesBV = [];
                const grupoBV = (cx, cz, n, rMin, rMax) => {
                    for (let i = 0; i < n; i++) {
                        const a = rndBV() * Math.PI * 2, d = rMin + rndBV() * (rMax - rMin);
                        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
                        if (!podeMatoV(x, z)) continue;
                        const e = 0.55 + rndBV() * 1.05;
                        pesBV.push({ x, z, sx: e * (0.8 + rndBV() * 0.55), sy: e * (0.75 + rndBV() * 0.5), sz: e * (0.8 + rndBV() * 0.55), af: 0.08 + rndBV() * 0.16 });
                    }
                };
                for (const [cx, cz, r] of [[-78, -62, 34], [94, 56, 28], [100, -54, 24]]) for (let a = 0; a < 5; a++) {
                    const ang = rndBV() * Math.PI * 2, rr = r * (0.82 + rndBV() * 0.25);
                    grupoBV(cx + Math.cos(ang) * rr, cz + Math.sin(ang) * rr, 3 + (rndBV() * 4 | 0), 1.2, 3.4);
                }
                for (const [cx, cz, r] of MANCHAS_V) {
                    grupoBV(cx + (rndBV() - 0.5) * r * 0.8, cz + (rndBV() - 0.5) * r * 0.8, 4 + (rndBV() * 4 | 0), 1.0, 3.0);
                    grupoBV(cx + (rndBV() - 0.5) * r * 0.8, cz + (rndBV() - 0.5) * r * 0.8, 4 + (rndBV() * 4 | 0), 1.0, 3.0);
                    for (let s = 0; s < 2; s++) {
                        const ang = rndBV() * Math.PI * 2, rr = r * (0.55 + rndBV() * 0.5);
                        grupoBV(cx + Math.cos(ang) * rr, cz + Math.sin(ang) * rr, 1 + (rndBV() * 2 | 0), 0.5, 1.5);
                    }
                }
                PONTOS_ROCHA_V.forEach(([rx, rz], i) => { if (i % 2 === 0) grupoBV(rx, rz, 2 + (rndBV() * 3 | 0), 0.8, 2.0); });
                for (let a = 0; a < 5; a++) {
                    const ang = rndBV() * Math.PI * 2, rr = 36 + rndBV() * 9;
                    grupoBV(LAGOPV.x + Math.cos(ang) * rr, LAGOPV.z + Math.sin(ang) * rr, 2 + (rndBV() * 4 | 0), 1.2, 3.2);
                }
                for (let a = 0; a < 6; a++) {
                    const px = -110 + rndBV() * 230, lado = rndBV() < 0.5 ? -1 : 1;
                    grupoBV(px, caminhoZV(px) + lado * (3.6 + rndBV() * 2.9), 2 + (rndBV() * 3 | 0), 1.0, 2.6);
                }
                const pesNormaisV = pesBV.filter((_, i) => i % 5 !== 4);
                const pesFloresV = pesBV.filter((_, i) => i % 5 === 4);
                const pacoteArbV = (pes) => {
                    const mats = [];
                    for (const p of pes) {
                        EUV.set(0, rndBV() * Math.PI * 2, 0); QTV.setFromEuler(EUV);
                        SCV.set(p.sx, p.sy, p.sz);
                        PVV.set(p.x + 6, alturaV(p.x, p.z) - p.af, p.z - 19);
                        mats.push(new T.Matrix4().compose(PVV.clone(), QTV.clone(), SCV.clone()));
                    }
                    return { mats, regs: [] };
                };
                for (const [ficheiro, pes] of [['arbusto', pesNormaisV], ['arbusto-flores', pesFloresV]]) {
                    if (!pes.length) continue;
                    const raiz = await tentarGLBV(`modelos/cenario/${ficheiro}.glb`);
                    if (!raiz) continue;
                    instanciarMultiV(raiz, pacoteArbV(pes), true, true).forEach(({ im, tris }) => registarV('arbustos', im, tris));
                }
                /* — fecho: obstáculos oficiais + recibo — */
                reciboV.plantas.arvores = arvoresV.length + 2;
                reciboV.plantas.pedras = ptsPedraKitV.length + ptsAflorV.length + ptsPedraPHV.length;
                reciboV.plantas.fetosPH = ptsFetoV.length;
                reciboV.plantas.fetosKit = ptsFetoKitV.length;
                reciboV.plantas.arbustos = pesBV.length;
                world.obstaculos = Object.freeze(obstaculosV);
                reciboV.obstaculos = obstaculosV.length;
                /* PASSO 4 DA TROCA — os obstáculos pousam no sistema
                 * de casas do jogo.js: para cada obstáculo oficial,
                 * as casas cujo quadrado (lado 1,5 m, a conversão da
                 * cena) o círculo do obstáculo toca ficam bloqueadas,
                 * com a altura máxima entre os obstáculos da casa.
                 * Publicado em window.__casasBloqueadasTroca (Map
                 * 'x,y' do motor -> altura) e no recibo do mundo; o
                 * jogo.js lê-o com duck-typing e, sem recibo (mapa
                 * antigo), nada bloqueia — como sempre foi. */
                {
                    const CELLV = 1.5, meia = CELLV / 2;
                    const mapaBloq = new Map();
                    for (const o of obstaculosV) {
                        const ix0 = Math.max(0, Math.floor((o.x - o.r - meia) / CELLV + (area.cols - 1) / 2));
                        const ix1 = Math.min(area.cols - 1, Math.ceil((o.x + o.r + meia) / CELLV + (area.cols - 1) / 2));
                        const iz0 = Math.max(0, Math.floor((o.z - o.r - meia) / CELLV + (area.rows - 1) / 2));
                        const iz1 = Math.min(area.rows - 1, Math.ceil((o.z + o.r + meia) / CELLV + (area.rows - 1) / 2));
                        for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
                            const cx = (ix - (area.cols - 1) / 2) * CELLV, cz = (iz - (area.rows - 1) / 2) * CELLV;
                            const dx = Math.max(0, Math.abs(o.x - cx) - meia), dz = Math.max(0, Math.abs(o.z - cz) - meia);
                            if (dx * dx + dz * dz > o.r * o.r) continue;
                            const chaveB = (area.origin.x + ix) + ',' + (area.origin.y + iz);
                            mapaBloq.set(chaveB, Math.max(mapaBloq.get(chaveB) || 0, o.h));
                        }
                    }
                    window.__casasBloqueadasTroca = mapaBloq;
                    world.casasBloqueadasTroca = { casas: mapaBloq.size, obstaculos: obstaculosV.length };
                    reciboV.casasBloqueadas = mapaBloq.size;
                }
                for (const nome of Object.keys(baldesV)) reciboV.baldes[nome] = baldesV[nome].reduce((s, b) => s + b.total, 0);
                /* PASSO 6 (21/11): uma sessao que NASCE em Ultra
                 * Leve (a preferencia guardada) aplica a densidade
                 * minima ja aqui — o gancho da cena pode ter
                 * corrido antes de este bloco definir a funcao. Os
                 * outros perfis nascem em 'alta', como sempre (a
                 * amarracao completa do selector e do passo 7). */
                let nivelInicialV = 'alta';
                try { if (localStorage.getItem('hudt1-qualidade') === 'ultraleve') nivelInicialV = 'ultraleve'; } catch (_) {}
                world.definirPovoamento(nivelInicialV);
                reciboV.pronto = true;
            })().catch(e => { reciboV.erros.push('geral: ' + ((e && e.message) || e)); reciboV.pronto = true; });
        }

        /* ================= TROCA DE MAPA — NÉVOA E CÉU DA PROVA =================
         * CORES (21/11): passo 5 antecipado SÓ na névoa e no céu, por
         * a cor o exigir (a palavra do Mestre sobre as cores). A
         * candidata lia-se sob a névoa do jogo (FogExp2 0,0105, escala
         * da arena) e o céu dela; a prova aprovada lê-se sob Fog
         * LINEAR quente 0xeccf9a (230–850) e um fundo em gradiente
         * quente. Sem esta atmosfera, nenhuma paleta de materiais
         * bate ao olho com a prova. RESÍDUO DECLARADO: o ciclo de
         * ambiente do cena.js pode retocar a COR de scene.fog por
         * frame e publica o seu próprio domo de céu por cima deste
         * fundo — domar o ciclo é do passo 5 (dono: cena.js); aqui
         * fica a base da troca posta na construção da cena. */
        {
            scene.fog = new T.Fog(0xeccf9a, 230, 850);
            const cvCeuT = document.createElement('canvas'); cvCeuT.width = 16; cvCeuT.height = 1024;
            const gCeuT = cvCeuT.getContext('2d');
            const gradCeuT = gCeuT.createLinearGradient(0, 0, 0, 1024);
            gradCeuT.addColorStop(0.00, '#54719e'); gradCeuT.addColorStop(0.26, '#87a1b6');
            gradCeuT.addColorStop(0.44, '#b3bfb2'); gradCeuT.addColorStop(0.58, '#d9c9a4');
            gradCeuT.addColorStop(0.67, '#f3cf92'); gradCeuT.addColorStop(0.73, '#ffc978');
            gradCeuT.addColorStop(0.79, '#d99f5c'); gradCeuT.addColorStop(1.00, '#7a5f42');
            gCeuT.fillStyle = gradCeuT; gCeuT.fillRect(0, 0, 16, 1024);
            const texCeuT = new T.CanvasTexture(cvCeuT);
            texCeuT.encoding = T.sRGBEncoding;
            scene.background = texCeuT;
            world.nevoaTroca = { fog: '0xeccf9a linear 230-850', ceu: 'gradiente-da-prova' };
        }

        instalarPintura(T, scene, { texPedra, texMadeira, texContacto });

        /* ---------- recibo para medição externa (só leitura) ----------
         * Adenda do crítico R2: a leitura só é válida com a carga completa —
         * o intervalo corre até pecas = 30 (ou 90 s) e marca stats.pronto. */
        const contarPecas = setInterval(() => {
            let tris = 0;
            scene.traverse(o => { if (o.isMesh) { tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); } });
            stats.triangulos = Math.round(tris);
            let n = 0; scene.traverse(o => { if (o.name && o.name.indexOf('visual2') === 0) n++; });
            stats.pecasCena = n;
            if (stats.pecas >= 30) { stats.pronto = true; clearInterval(contarPecas); }
        }, 2000);
        setTimeout(() => clearInterval(contarPecas), 90000);

        /* TRANCHE PEDRAS/CÂMERA: a altura do chão QUE SE VÊ (mundo +
           relevo) fica acessível à cena — a câmera livre mede o seu
           chão por ela, não pela altura antiga do mundo. */
        world.alturaVisivel = alturaNova;
        return world;
    };

    /* A Sala do Trono recebe a MESMA pintura (item 4): o mundo é
       o de mundo.js ao bit; só se lhe junta o invólucro comum.
       COMPLETADO pelo sucessor: o invólucro ia receber {} e o
       arrumarContactos (que troca o carimbo oval dos discos de
       contacto pela mancha irregular) nunca corria neste mapa —
       as figuras ficavam com o apoio liso do campo SEM pintura.
       A textura de contacto gera-se aqui, com a mesma receita
       da do campo e semente privada (a semente partilhada do
       campo não se toca: a sequência dela é comportamento do
       campo ao bit). Pedra/madeira do campo NÃO viajam: o mundo
       da sala não tem peças Lambert do campo. */
    const baseTronoWorld = window.TronoWorld;
    if (typeof baseTronoWorld === 'function') {
        window.TronoWorld = function (T, scene, area) {
            const world = baseTronoWorld(T, scene, area);
            let sementeContacto = 7411;
            const rndContacto = () => ((sementeContacto = (Math.imul(sementeContacto, 1664525) + 1013904223) >>> 0) / 4294967296);
            const bc = document.createElement('canvas'); bc.width = bc.height = 128;
            const b = bc.getContext('2d');
            for (let i = 0; i < 26; i++) {
                const a = (i / 26) * Math.PI * 2, rr = 30 + rndContacto() * 24, x = 64 + Math.cos(a) * rr * 0.85, y = 64 + Math.sin(a) * rr * 0.85;
                const gr = b.createRadialGradient(x, y, 0, x, y, 18 + rndContacto() * 16);
                gr.addColorStop(0, 'rgba(10,8,5,0.20)'); gr.addColorStop(1, 'rgba(10,8,5,0)');
                b.fillStyle = gr; b.fillRect(0, 0, 128, 128);
            }
            const gr2 = b.createRadialGradient(64, 64, 4, 64, 64, 60);
            gr2.addColorStop(0, 'rgba(8,6,4,0.5)'); gr2.addColorStop(1, 'rgba(8,6,4,0)');
            b.fillStyle = gr2; b.fillRect(0, 0, 128, 128);
            instalarPintura(T, scene, { texContacto: new T.CanvasTexture(bc) });
            return world;
        };
    }

    /* ---------- FILME DOM (Visual 3, PESQUISA-A §3b) ----------
     * O renderer e a câmara são privados no fecho do cena.js e o three
     * r128 vendored não traz EffectComposer — o pós faz-se por cima do
     * canvas: vinheta fria (radial), um sopro quente em soft-light e GRÃO
     * de filme (tile 128 gerado uma vez, blend overlay, saltos steps() a
     * ~7 fps). A div vive dentro de #mapa com z-index 1 e a regra
     * injectada sobe .etiquetas para 2 — as etiquetas lêem-se SEMPRE por
     * cima do filme; #danos e os painéis são irmãos fora de #mapa.
     * pointer-events:none — o filme nunca toca no jogo. */
    const injectarFilme = () => {
        const mapa = document.getElementById('mapa');
        if (!mapa || document.getElementById('visual3-filme')) return;
        const st = document.createElement('style');
        st.textContent = '#visual3-filme{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden}'
            + '#visual3-filme .vig{position:absolute;inset:0;background-size:100% 100%}'
                       + '#visual3-filme .grao{position:absolute;inset:-140px;background-repeat:repeat;opacity:.07;mix-blend-mode:overlay;animation:visual3grao .9s steps(6) infinite}'
            + '@keyframes visual3grao{0%{transform:translate(0,0)}20%{transform:translate(-38px,22px)}40%{transform:translate(24px,-30px)}60%{transform:translate(-14px,-44px)}80%{transform:translate(42px,12px)}100%{transform:translate(0,0)}}'
            + '#mapa .etiquetas{z-index:2}';
        document.head.appendChild(st);
        const tile = document.createElement('canvas'); tile.width = tile.height = 128;
        const tx = tile.getContext('2d'), im = tx.createImageData(128, 128);
        let s2 = 9182; const rnd2 = () => ((s2 = (Math.imul(s2, 1664525) + 1013904223) >>> 0) / 4294967296);
        for (let i = 0; i < im.data.length; i += 4) { const v = 108 + (rnd2() * 92) | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
        tx.putImageData(im, 0, 0);
        /* VOLTA 2: vinheta IRREGULAR desenhada em canvas — manchas frias nas
         * bordas comem o degradé circular perfeito do CSS. */
        const vc = document.createElement('canvas'); vc.width = 720; vc.height = 450;
        const vx = vc.getContext('2d');
        const vg = vx.createRadialGradient(360, 190, 150, 360, 210, 430);
        vg.addColorStop(0, 'rgba(8,14,22,0)'); vg.addColorStop(0.72, 'rgba(8,14,22,0.10)'); vg.addColorStop(1, 'rgba(6,10,17,0.52)');
        vx.fillStyle = vg; vx.fillRect(0, 0, 720, 450);
        for (let i = 0; i < 130; i++) {
            const a = rnd2() * Math.PI * 2, rad = 250 + rnd2() * 190;
            const x = 360 + Math.cos(a) * rad, y = 205 + Math.sin(a) * rad * 0.62, r = 22 + rnd2() * 70;
            const bg = vx.createRadialGradient(x, y, 0, x, y, r);
            bg.addColorStop(0, 'rgba(10,16,26,' + (0.05 + rnd2() * 0.09) + ')'); bg.addColorStop(1, 'rgba(10,16,26,0)');
            vx.fillStyle = bg; vx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        const div = document.createElement('div'); div.id = 'visual3-filme';
        const vig = document.createElement('div'); vig.className = 'vig';
        vig.style.backgroundImage = 'url(' + vc.toDataURL() + ')';
        /* VOLTA 3: o GRÃO animado sai — foi condenado como filtro uniforme
         * sobre a imagem inteira (Disfarce N1; Pintura: «grão não conta»).
         * Ficam a vinheta irregular e o sopro quente. */
        div.appendChild(vig);
        mapa.appendChild(div);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectarFilme);
    else injectarFilme();
})();
