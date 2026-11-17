/* ---------- SALA DO TRONO (t-mapa-trono, palavra do Mestre
 * 15/11/2026 06:25: «A sala do trono é um mapa do jogo») ----------
 * O segundo mundo: a batalha nasce DENTRO da sala ajustada que o
 * Mestre aprovou (luz/materiais fechados no Godot — aqui a luz
 * refaz-se em Three.js a aproximar esse aspecto: ambiente baixo e
 * quente, o feixe dourado do óculo sobre a arena, os toques
 * turquesa da água e o recorte frio dos guardiões).
 * O modelo é o GLB reduzido do Codex (28.784.156 B) e SÓ se pede
 * quando uma batalha nasce neste mapa (carregamento preguiçoso —
 * o caminho «campo» nunca o pede). Medições do ficheiro: caixa
 * 32 × 18,4 × 51,5 m; chão da nave com o topo a y=0; a nave corre
 * ao longo de −Z (entrada z=0, plataforma do trono z −36…−50,
 * óculo centrado em z=−22). O grupo desloca-se +22 em Z: o óculo
 * fica sobre o centro da arena e a grelha 10×7 assenta no chão
 * da nave, plana — height devolve 0 em todo o lado e nenhuma
 * peça do cenário do campo nasce aqui. A interface devolvida é
 * a mesma que a cena consome do CampoWorld. */
window.TronoWorld = function (T, scene, area) {
    const C = h => new T.Color(h).convertSRGBToLinear();
    const grupo = new T.Group();
    grupo.position.set(0, 0, 22);
    scene.add(grupo);
    scene.fog = new T.Fog(C(0x100d0a), 55, 190);
    window.__tronoModeloPronto = false;
    const aoModelo = gltf => {
        const modelo = gltf.scene;
        modelo.traverse(o => {
            if (o.isMesh) {
                o.castShadow = false; o.receiveShadow = true;
                // CORTE DO TECTO (mapa de batalha): a câmera do
                // jogo vê a sala de cima — painéis, vigas e
                // rosetas do tecto escondidos, a nave lê-se como
                // diorama aberto. O anel de bronze do óculo fica:
                // é a boca do feixe.
                if (/^(Teto_|Viga_|Roseta_)/.test(o.name || '')) o.visible = false;
            }
        });
        grupo.add(fundirSala(modelo));
        window.__tronoModeloPronto = true;
    };
    /* FUSÃO POR MATERIAL (t-trono-otimizacao O3, sintoma B): a sala
       chega com ~300 malhas visíveis — uma draw call por malha. Como
       ela é estática e os materiais são só 14, as malhas visíveis
       fundem-se numa por material, com as transformações do mundo
       cozidas nos vértices. Nem um píxel muda: mesmos materiais
       (as mesmas instâncias), mesma geometria, mesmas posições —
       só deixa de haver centenas de chamadas de desenho. As malhas
       escondidas (corte do tecto) ficam fora, como já estavam fora
       do ecrã. Malha com assinatura de atributos diferente da do
       seu grupo não se funde — entra como está (defensivo). */
    const fundirSala = (raiz) => {
        raiz.updateMatrixWorld(true);
        const malhas = [];
        raiz.traverse(o => { if (o.isMesh && o.visible) malhas.push(o); });
        const grupos = new Map();
        const soltas = [];
        for (const o of malhas) {
            if (Array.isArray(o.material) || !o.geometry || !o.geometry.attributes.position) { soltas.push(o); continue; }
            const assinatura = Object.keys(o.geometry.attributes).sort().join(',');
            const chave = o.material.uuid + '|' + assinatura;
            if (!grupos.has(chave)) grupos.set(chave, { material: o.material, assinatura, lista: [] });
            grupos.get(chave).lista.push(o);
        }
        const fundido = new T.Group();
        const v3 = new T.Vector3();
        for (const { material, lista } of grupos.values()) {
            if (lista.length === 1) { soltas.push(lista[0]); continue; }
            const nomes = Object.keys(lista[0].geometry.attributes).sort();
            let totalV = 0, totalI = 0;
            for (const o of lista) {
                totalV += o.geometry.attributes.position.count;
                totalI += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
            }
            const atributos = {};
            for (const nome of nomes) {
                const a0 = lista[0].geometry.attributes[nome];
                atributos[nome] = new Float32Array(totalV * a0.itemSize);
            }
            const indices = new Uint32Array(totalI);
            let offV = 0, offI = 0;
            const mNorm = new T.Matrix3();
            /* DESQUANTIZAÇÃO (correcção medida no arnês de fotos,
               15/11): o GLB preparado (O2) traz os atributos
               quantizados (KHR_mesh_quantization) — inteiros
               NORMALIZADOS (Int16/Uint16…) que a GPU desquantiza
               ao desenhar. Quem lê os valores crus e os coze numa
               geometria nova tem de dividir pelo máximo do tipo,
               senão as posições saem ~32767× maiores (a sala
               «explodia» fora da câmera). Nas soltas não se toca:
               a geometria original + a GPU tratam disso. */
            const divisorDe = (at) => {
                if (!at.normalized) return 1;
                const a = at.array;
                if (a instanceof Int8Array) return 127;
                if (a instanceof Uint8Array) return 255;
                if (a instanceof Int16Array) return 32767;
                if (a instanceof Uint16Array) return 65535;
                if (a instanceof Int32Array) return 2147483647;
                if (a instanceof Uint32Array) return 4294967295;
                return 1;
            };
            for (const o of lista) {
                const g = o.geometry, M = o.matrixWorld;
                mNorm.getNormalMatrix(M);
                for (const nome of nomes) {
                    const at = g.attributes[nome], dest = atributos[nome], tam = at.itemSize;
                    const div = divisorDe(at);
                    /* LEITURA POR getX/getY/getZ/getW — NUNCA pelo
                       array cru (correcção medida, 15/11): o decode
                       meshopt entrega position/normal como atributos
                       ENTRELAÇADOS (InterleavedBufferAttribute,
                       stride 4); ler arr[i*3] mistura posição com
                       normal e a sala renderiza «amarrotada» apesar
                       de caixas/índices certos. Os getters respeitam
                       stride+offset e devolvem o valor cru, ao qual
                       se aplica a desquantização (div). */
                    if (nome === 'position' || nome === 'normal' || nome === 'tangent') {
                        for (let i = 0; i < at.count; i++) {
                            v3.set(at.getX(i) / div, at.getY(i) / div, at.getZ(i) / div);
                            if (nome === 'position') v3.applyMatrix4(M); else v3.applyMatrix3(mNorm).normalize();
                            dest[(offV + i) * tam] = v3.x; dest[(offV + i) * tam + 1] = v3.y; dest[(offV + i) * tam + 2] = v3.z;
                            if (tam === 4) dest[(offV + i) * tam + 3] = at.getW(i) / div;
                        }
                    } else {
                        for (let i = 0; i < at.count; i++) {
                            dest[(offV + i) * tam] = at.getX(i) / div;
                            if (tam > 1) dest[(offV + i) * tam + 1] = at.getY(i) / div;
                            if (tam > 2) dest[(offV + i) * tam + 2] = at.getZ(i) / div;
                            if (tam > 3) dest[(offV + i) * tam + 3] = at.getW(i) / div;
                        }
                    }
                }
                /* ESPELHOS (correcção medida no render do arnês,
                   15/11): a sala tem nós espelhados (determinante
                   da matriz < 0). Ao desenhar solto, o three
                   corrige o frontFace por objecto; fundido, essa
                   correcção perde-se e a peça espelhada renderiza
                   do avesso (fragmentos gigantes no ecrã). A cura
                   é trocar a ordem dos índices de cada triângulo
                   das peças espelhadas ao fundir. */
                const espelhada = M.determinant() < 0;
                if (g.index) {
                    const ia = g.index.array;
                    for (let i = 0; i < ia.length; i += 3) {
                        indices[offI + i] = ia[i] + offV;
                        indices[offI + i + 1] = ia[espelhada ? i + 2 : i + 1] + offV;
                        indices[offI + i + 2] = ia[espelhada ? i + 1 : i + 2] + offV;
                    }
                    offI += ia.length;
                } else {
                    const n = g.attributes.position.count;
                    for (let i = 0; i < n; i += 3) {
                        indices[offI + i] = offV + i;
                        indices[offI + i + 1] = offV + i + (espelhada ? 2 : 1);
                        indices[offI + i + 2] = offV + i + (espelhada ? 1 : 2);
                    }
                    offI += n;
                }
                offV += g.attributes.position.count;
            }
            const geo = new T.BufferGeometry();
            for (const nome of nomes) geo.setAttribute(nome, new T.BufferAttribute(atributos[nome], lista[0].geometry.attributes[nome].itemSize));
            geo.setIndex(new T.BufferAttribute(indices, 1));
            geo.computeBoundingSphere();
            const mesh = new T.Mesh(geo, material);
            mesh.castShadow = false; mesh.receiveShadow = true;
            mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
            fundido.add(mesh);
        }
        for (const o of soltas) {
            // solta: entra com a transformação do mundo cozida no
            // próprio objecto (o pai passa a ser o grupo fundido).
            // decompose (e não comprimentos de coluna à mão): os
            // nós espelhados (determinante < 0) precisam do sinal
            // negativo numa escala, senão a peça vira do avesso.
            o.updateMatrixWorld(true);
            o.matrixWorld.decompose(o.position, o.quaternion, o.scale);
            fundido.add(o);
        }
        fundido.updateMatrix(); fundido.matrixAutoUpdate = false;
        return fundido;
    };
    const aoErroModelo = () => { window.__tronoModeloPronto = 'erro'; };
    const comecarModelo = () => {
        const loaderTrono = new T.GLTFLoader();
        if (typeof MeshoptDecoder !== 'undefined') loaderTrono.setMeshoptDecoder(MeshoptDecoder);
        /* PRÉ-CARGA (t-trono-otimizacao O1): se o Mestre escolheu a
           sala na preparação, a entrada já desceu o ficheiro em fundo
           (window.__tronoPreCarga) — aqui faz-se só o parse do buffer,
           sem segunda ida à rede. Sem pré-carga, ou se ela falhou, o
           caminho é o de sempre (load do URL; o erro continua a cair
           na vigia do item 9). Se a pré-carga ainda vai a meio, espera
           por ela em vez de duplicar o pedido. */
        const preCarga = (typeof window !== 'undefined') ? window.__tronoPreCarga : null;
        if (preCarga && preCarga.estado === 'pronto' && preCarga.buffer) {
            loaderTrono.parse(preCarga.buffer, '', aoModelo, aoErroModelo);
        } else if (preCarga && preCarga.estado === 'a-carregar') {
            const esperaPre = setInterval(() => {
                if (preCarga.estado === 'pronto' && preCarga.buffer) {
                    clearInterval(esperaPre);
                    loaderTrono.parse(preCarga.buffer, '', aoModelo, aoErroModelo);
                } else if (preCarga.estado === 'erro') {
                    clearInterval(esperaPre);
                    loaderTrono.load('modelos/cenario/sala-trono.glb', aoModelo, undefined, aoErroModelo);
                }
            }, 150);
        } else {
            loaderTrono.load('modelos/cenario/sala-trono.glb', aoModelo, undefined, aoErroModelo);
        }
    };
    /* DECODER MESHOPT (t-trono-otimizacao O2): o GLB da sala traz a
       geometria comprimida (EXT_meshopt_compression) e o loader
       vendored só a lê com o MeshoptDecoder posto. O decoder é um
       ficheiro pequeno (29 KB) carregado SÓ neste caminho — o
       campo nunca o pede. Se ele falhar a carregar, o modelo cai
       no erro de sempre (a vigia do item 9 avisa o Mestre). */
    if (typeof MeshoptDecoder !== 'undefined') {
        comecarModelo();
    } else if (window.__tronoDecoderPromessa) {
        window.__tronoDecoderPromessa.then(comecarModelo, aoErroModelo);
    } else {
        window.__tronoDecoderPromessa = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'vendor/meshopt_decoder.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('decoder meshopt'));
            document.head.appendChild(s);
        });
        window.__tronoDecoderPromessa.then(comecarModelo, aoErroModelo);
    }
    /* O feixe do óculo (valores da sala ajustada: spot à rotação do
       sol, energia baixa, cone de 16°): em Three.js o cone de luz
       desenha-se com um fuste translúcido aditivo do óculo ao chão
       e a poça quente com o SpotLight a sério. */
    const oculo = new T.Vector3(0, 17.2, 2.5), poco = new T.Vector3(0, 0, -1.2);
    /* CORRECÇÃO t-mapa-trono (bancada, item 5): o feixe baixa de
       7,0 para 4,6 — a 7,0 a poça clipava a branco puro no mármore
       claro a norte do medalhão. A poça continua a ser o foco da
       sala; o medalhão mantém a cor cheia. */
    const feixe = new T.SpotLight(0xffd9a0, 4.6, 60, 0.30, 0.9, 2);
    feixe.position.copy(oculo);
    feixe.target.position.copy(poco);
    scene.add(feixe); scene.add(feixe.target);
    const eixo = new T.Vector3().subVectors(oculo, poco);
    const fuste = new T.Mesh(
        new T.CylinderGeometry(1.05, 2.6, eixo.length(), 24, 1, true),
        new T.MeshBasicMaterial({ color: C(0xffca7a), transparent: true, opacity: .035, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }));
    fuste.position.copy(oculo).add(poco).multiplyScalar(.5);
    fuste.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), eixo.normalize());
    scene.add(fuste);
    /* A água turquesa: um ponto de luz sobre cada jacto (posições
       medidas do modelo: x=±12,4, z da nave −12/−30 → mundo +10/−8). */
    for (const [x, z] of [[-12.4, 10], [12.4, 10], [-12.4, -8], [12.4, -8]]) {
        const p = new T.PointLight(0x35c4b5, 9, 12, 2);
        p.position.set(x, 1.0, z);
        scene.add(p);
    }
    /* O recorte frio dos guardiões (nichos a x=±13,95, z da nave
       −15/−27 → mundo +7/−5): pontos #90B4E8 baixos, como na sala. */
    for (const [x, z] of [[-13.9, 7], [13.9, 7], [-13.9, -5], [13.9, -5]]) {
        const p = new T.PointLight(0x90b4e8, 6.5, 10, 2);
        p.position.set(x, 4.6, z);
        scene.add(p);
    }
    /* A «fogueira» deste mundo para o ambiente da partida: um
       calor quente e baixo sobre a arena — é ela que o
       view.aplicarAmbiente modula (fontes D-AMB-01), como a
       fogueira modula no campo. */
    const calor = new T.PointLight(0xff9a3c, 9.0, 22, 2);
    calor.position.set(0, 2.6, 0);
    scene.add(calor);
    return { ground: grupo, height: () => 0, radius: 30, obstaculos: Object.freeze([]),
        fontes: { fogueira: calor, tochas: [], chamas: [] },
        ambienteBases: { fogueira: 9.0, tochas: 7.5 },
        brasasFogueira: [], pecasFogueira: [], braseiros: [],
        recomputarPedras() {}, definirFantasmaPedras() {},
        pedrasDiagnostico() { return { total: 0, casas: [], mortas: [], retrato: [], vivas: [], fantasmas: [], nv: 0, nf: 0 }; },
        setTremulacao() {}, update() {}, quality() {} };
};

/* Cenário próprio CC0 de terceiros não é necessário; escala em metros. */
window.CampoWorld = function (T, scene, area) {
    const C = h => new T.Color(h).convertSRGBToLinear();
    let seed = 19847;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296), radius = Math.hypot(area.cols, area.rows) * .75 + 4;
    const height = (x, z) => {
        const d = Math.max(0, Math.min(1, (Math.hypot(x, z) - radius) / 18));
        return d * d * (2 + 2.1 * Math.sin(x * .12) * Math.cos(z * .13));
    };
    const mat = c => new T.MeshLambertMaterial({ color: C(c) }), rock = mat(0x55575a), wood = mat(0x292b2d), rust = mat(0x735543), box = new T.BoxGeometry(1, 1, 1), ico = new T.IcosahedronGeometry(1, 0), cyl = new T.CylinderGeometry(1, 1, 1, 6), batches = [], fires = [];
    function part(g, m, p, s, r = [0, 0, 0], parent = scene) {
        const o = new T.Mesh(g, m);
        o.position.set(...p);
        o.scale.set(...s);
        o.rotation.set(...r);
        o.castShadow = true;
        o.receiveShadow = true;
        parent.add(o);
        return o;
    }
    function batch(g, m, items) {
        const mesh = new T.InstancedMesh(g, m, items.length), o = new T.Object3D();
        items.forEach((v, i) => {
            o.position.set(...v.p);
            o.scale.set(...v.s);
            o.rotation.set(...(v.r || [0, 0, 0]));
            o.updateMatrix();
            mesh.setMatrixAt(i, o.matrix);
        });
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        scene.add(mesh);
        batches.push({ mesh, count: items.length });
        return mesh;
    }
    const geo = new T.PlaneGeometry(360, 360, 72, 72);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, colors = [], ash = C(0x858784), soil = C(0x53555a), char = C(0x353d42);
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        pos.setY(i, height(x, z));
        const c = soil.clone().lerp(ash, (Math.sin(x * .39 + z * .2) * Math.cos(z * .28) + 1) * .45).lerp(char, (Math.sin(x * .17 - z * .44) + 1) * .2);
        colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const cv = document.createElement('canvas');
    cv.width = cv.height = 512;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#90877d';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 21000; i++) {
        const v = 70 + rnd() * 100;
        ctx.fillStyle = `rgba(${v},${v},${v},${rnd() * .35})`;
        ctx.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 5, 1 + rnd() * 3);
    }
    for (let i = 0; i < 80; i++) {
        const x = rnd() * 512, y = rnd() * 512, r = 8 + rnd() * 42, gr = ctx.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, i % 3 ? '#302f2b55' : '#dedcd055');
        gr.addColorStop(1, '#00000000');
        ctx.fillStyle = gr;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const pixels = ctx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < 512; i++)
        for (let k = 0; k < 20; k++)
            for (let c = 0; c < 3; c++) {
                for (const [a, b] of [[(i * 512 + k) * 4 + c, (i * 512 + 511 - k) * 4 + c], [(k * 512 + i) * 4 + c, ((511 - k) * 512 + i) * 4 + c]]) {
                    const mean = (pixels.data[a] + pixels.data[b]) / 2, t = (20 - k) / 20;
                    pixels.data[a] += (mean - pixels.data[a]) * t;
                    pixels.data[b] += (mean - pixels.data[b]) * t;
                }
            }
    ctx.putImageData(pixels, 0, 0);
    const texture = new T.CanvasTexture(cv);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(36, 36);
    texture.anisotropy = 4;
    const ground = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, map: texture }));
    ground.receiveShadow = true;
    scene.add(ground);
    part(new T.PlaneGeometry(4000, 4000), mat(0x45464b), [0, -8, 0], [1, 1, 1], [-Math.PI / 2, 0, 0]).castShadow = false;
    // Cinza integrada no material do terreno; não há discos transparentes sobrepostos.
    // Foco central: fogueira extinta, pedras gastas e brasas entre cinzas.
    const embers = new T.MeshBasicMaterial({color: C(0xe76c29), toneMapped:false});
    const pecasFogueira = [];
    for (let i=0;i<26;i++) {
        const a=i*Math.PI*2/26, r=1.35+rnd()*.3;
        pecasFogueira.push(part(ico, i%3 ? rock : rust, [Math.cos(a)*r,.09,Math.sin(a)*r], [.22+rnd()*.15,.12+rnd()*.12,.18], [rnd(),a,rnd()]));
    }
    const brasasFogueira = [];
    for (let i=0;i<32;i++) {
        const a=rnd()*Math.PI*2, r=Math.sqrt(rnd())*1.1;
        const peca = part(ico, i%4 ? wood : embers, [Math.cos(a)*r,.035,Math.sin(a)*r], [.05+rnd()*.18,.035,.06+rnd()*.14], [0,a,0]);
        peca.castShadow=false;
        pecasFogueira.push(peca);
        if (!(i%4)) brasasFogueira.push(peca);
    }
    const hearth = new T.PointLight(0xff6724,6.0,8,2); hearth.position.set(0,.45,0); scene.add(hearth);
    const stones = [];
    for (let i = 0; i < 480; i++) {
        const x = (rnd() - .5) * radius * 3, z = (rnd() - .5) * radius * 3, s = .025 + rnd() * .12;
        stones.push({ p: [x, height(x, z) + s * .2, z], s: [s * 2, s, s], r: [rnd(), rnd() * 6, rnd()] });
    }
    /* Tranche CAMERA/GRAVETOS (09/11/2026, queixa do Mestre): os
       gravetos sairam por inteiro - os 36 troncos mortos de pe e os
       72 ramos do anel exterior e as 360 relvas-palito (tambem dentro
       da arena), todos com sombra. Ficam pedras, ruinas, braseiros e
       a fogueira central. */
    // A paisagem continua antes/depois da área: afloramentos e muros gastos,
    // visíveis também no eixo longo da Fixa em retrato, sem delimitar um tabuleiro.
    for (let i=0;i<34;i++) {
        const x=(i%2 ? -1:1)*(area.cols*.75+3+rnd()*7), z=(rnd()-.5)*area.rows*2.2;
        const s=.5+rnd()*1.15;
        stones.push({p:[x,height(x,z)+s*.28,z],s:[s*1.3,s*.75,s],r:[rnd()*.3,rnd()*6,rnd()*.3]});
    }
    const lotePedrasMesh = batch(ico, rock, stones);
    const ruins = [];
    for (let i = 0; i < 15; i++) {
        const x = -radius + i * 1.05, z = -radius * .8 + Math.sin(i*.8)*.35;
        for (let j = 0; j < 1 + (i % 5); j++)
            ruins.push({ p: [x + (rnd()-.5)*.18, height(x, z) + .3 + j * .53, z], s: [.62+rnd()*.18, .36+rnd()*.15, .42+rnd()*.13], r: [rnd()*.18, rnd()*.4, (rnd()-.5)*.2] });
    }
    /* Obstáculos para a Câmera Dinâmica (DESENHO §6.1): agregam-se
       por coluna AQUI, antes do corte par/ímpar dos dois batch() —
       só se lêem os valores já capturados em ruins (p/s); nenhum
       rnd() novo, para a sequência da semente não se deslocar. */
    const obstaculos = [];
    {
        let k = 0;
        for (let i = 0; i < 15; i++) {
            const x = -radius + i * 1.05, z = -radius * .8 + Math.sin(i * .8) * .35;
            let topo = -Infinity;
            for (let j = 0; j < 1 + (i % 5); j++, k++)
                topo = Math.max(topo, ruins[k].p[1] + ruins[k].s[1] / 2);
            obstaculos.push({ x, z, r: .55, h: topo - height(x, z) });
        }
    }
    // Icosaedros achatados: cantos quebrados, juntas irregulares, tons intercalados.
    batch(new T.IcosahedronGeometry(1,1), rock, ruins.filter((_,i)=>i%2));
    batch(new T.IcosahedronGeometry(1,1), mat(0x777369), ruins.filter((_,i)=>!(i%2)));
    /* ---------- PEDRAS SOB O VÉU (t-veu-brilhos, volta 2, S2-4) ----------
       Lote fantasma gémeo das pedras instanciadas: mesma geometria
       (ico partilhada, vértices +0), construído à parte do registo
       batches[] porque a sua contagem é dos ESTADOS, não da
       qualidade — quem manda nos dois counts é recomputarPedras,
       sobre um RETRATO do instanceMatrix capturado preguiçosamente
       na primeira recomputação (portanto depois do traverse do
       visual.js: as instâncias que ele matou a escala 0 estão
       mortas no retrato e nunca ressuscitam, e o relevo dy dele
       fica). Casa por contenção no rectângulo da arena (inversa de
       wx/wz com CELL=1,5); fora = sem casa = sempre viva. */
    const loteFantasmaPedras = new T.InstancedMesh(ico, new T.MeshBasicMaterial({ color: 0x9aa7b4, transparent: true, opacity: .45, depthWrite: false }), stones.length);
    loteFantasmaPedras.count = 0;
    loteFantasmaPedras.castShadow = false;
    loteFantasmaPedras.receiveShadow = false;
    loteFantasmaPedras.frustumCulled = false;
    scene.add(loteFantasmaPedras);
    let retratoPedras = null, casasPedras = null, mortasPedras = null, fatorQualidadeMundo = 1;
    let pedrasContagem = { vivas: stones.length, fantasmas: 0 };
    function capturarRetratoPedras() {
        const arr = lotePedrasMesh.instanceMatrix.array, n = stones.length;
        retratoPedras = new Float32Array(arr);
        casasPedras = new Array(n); mortasPedras = new Array(n);
        for (let i = 0; i < n; i++) {
            const e = i * 16;
            const sx = Math.hypot(arr[e], arr[e + 1], arr[e + 2]), sy = Math.hypot(arr[e + 4], arr[e + 5], arr[e + 6]), sz = Math.hypot(arr[e + 8], arr[e + 9], arr[e + 10]);
            mortasPedras[i] = Math.max(sx, sy, sz) < 1e-6;
            const hx = Math.floor(arr[e + 12] / 1.5 + area.cols / 2) + area.origin.x, hz = Math.floor(arr[e + 14] / 1.5 + area.rows / 2) + area.origin.y;
            casasPedras[i] = (hx >= area.origin.x && hx < area.origin.x + area.cols && hz >= area.origin.y && hz < area.origin.y + area.rows) ? hx + ',' + hz : null;
        }
    }
    function recomputarPedras(nunca, memoria) {
        if (!retratoPedras) capturarRetratoPedras();
        const L = Math.ceil(stones.length * fatorQualidadeMundo), arrV = lotePedrasMesh.instanceMatrix.array, arrF = loteFantasmaPedras.instanceMatrix.array;
        let nv = 0, nf = 0;
        for (let i = 0; i < stones.length; i++) {
            if (i >= L || mortasPedras[i]) continue;
            const casa = casasPedras[i];
            if (casa && memoria && memoria.has(casa)) { arrF.set(retratoPedras.subarray(i * 16, i * 16 + 16), nf * 16); nf++; }
            else if (casa && nunca && nunca.has(casa)) { /* engolida: em nenhum lote */ }
            else { arrV.set(retratoPedras.subarray(i * 16, i * 16 + 16), nv * 16); nv++; }
        }
        lotePedrasMesh.count = nv;
        loteFantasmaPedras.count = nf;
        lotePedrasMesh.instanceMatrix.needsUpdate = true;
        loteFantasmaPedras.instanceMatrix.needsUpdate = true;
        pedrasContagem = { vivas: nv, fantasmas: nf };
    }
    function definirFantasmaPedras(mat) { if (mat) loteFantasmaPedras.material = mat; }
    /* Janela de prova (S2-14): retrato e lotes correntes, por índice. */
    function pedrasDiagnostico() {
        if (!retratoPedras) capturarRetratoPedras();
        return { total: stones.length, casas: casasPedras.slice(), mortas: mortasPedras.slice(), retrato: Array.from(retratoPedras),
            vivas: Array.from(lotePedrasMesh.instanceMatrix.array.subarray(0, lotePedrasMesh.count * 16)),
            fantasmas: Array.from(loteFantasmaPedras.instanceMatrix.array.subarray(0, loteFantasmaPedras.count * 16)),
            nv: lotePedrasMesh.count, nf: loteFantasmaPedras.count };
    }
    const posFires = [];
    for (const [x, z] of [[-area.cols * .75 - 1, -2], [area.cols * .75 + 1, 1], [1, -area.rows * .75 - 1]]) {
        // Braseiro (DESENHO §6.1): r=0,48, h=1,30 (topo da taça; a chama não oclui).
        obstaculos.push({ x, z, r: .48, h: 1.30 });
        const y = height(x, z), g = new T.Group();
        g.position.set(x, y, z);
        scene.add(g);
        part(cyl, rock, [0, .2, 0], [.48, .4, .48], [0, 0, 0], g);
        part(cyl, wood, [0, .65, 0], [.13, .9, .13], [0, 0, 0], g);
        part(new T.CylinderGeometry(.46, .25, .3, 8), rust, [0, 1.12, 0], [1, 1, 1], [0, 0, 0], g);
        const flame = part(ico, new T.MeshBasicMaterial({ color: C(0xff631d), toneMapped: false }), [0, 1.65, 0], [.25, .65, .24], [0, 0, .14], g);
        flame.castShadow = false;
        const core = part(ico, new T.MeshBasicMaterial({ color: C(0xffdf8e), toneMapped: false }), [0, 1.43, .12], [.14, .3, .15], [0, 0, 0], g);
        core.castShadow = false;
        const light = new T.PointLight(0xff792b, 7.5, 11, 2);
        light.position.set(x, y + 1.8, z);
        scene.add(light);
        fires.push({ flame, core, light }); posFires.push([x, z]);
        // O solo recebe luz real; sem discos que se leiam como tapetes.
    }
    /* Braseiros nomeados para o véu (t-veu-brilhos, volta 2, S2-10):
       chamas/miolo, luz própria e o factor de visão que a cena
       escreve (factorLuzVista sobre o raio 11 da luz); o update
       multiplica a intensidade composta de sempre por ele — com
       factor 1, o histórico fica ao bit. */
    const braseiros = fires.map((f, i) => ({ chamas: [f.flame, f.core], luz: f.light, x: posFires[i][0], z: posFires[i][1], fatorVisao: 1 }));
    /* D-AMB-01 (tranche AMBIENTE): interface nomeada de fontes — a
       fogueira, as tochas e as chamas do mundo, e as BASES que o
       aplicarAmbiente da cena escreve. O update lê as bases: tochas =
       base + f·(base·0,4), que com a base 7,5 reproduz ao bit o
       histórico 7,5 + 3f. Sem chamador do ambiente, as bases nascem
       nos valores aprovados e nada muda. */
    const ambienteBases = { fogueira: 6.0, tochas: 7.5 };
    /* EM-AMB-B1 (bancada do AMBIENTE): a tremulação liga/desliga pela
       opção do Mestre no ⚙ (palavra dele de 06/11). Ligada (omissão) =
       a fórmula histórica ao bit; desligada = termo f = 0: chamas
       estáticas (escala .65, sem rotação) e tochas na base. */
    let ambTremulacao = true;
    const fontes = { fogueira: hearth, tochas: fires.map(f => f.light), chamas: fires.flatMap(f => [f.flame, f.core]) };
    return { ground, height, radius, obstaculos: Object.freeze(obstaculos), fontes, ambienteBases, brasasFogueira, pecasFogueira, braseiros, recomputarPedras, definirFantasmaPedras, pedrasDiagnostico, setTremulacao(on) {
            ambTremulacao = !!on;
        }, update(time) {
            fires.forEach(({ flame, light }, i) => {
                const f = ambTremulacao ? Math.sin(time * 9 + i) * .1 + Math.sin(time * 17) * .06 : 0;
                flame.scale.y = .65 + f;
                if (ambTremulacao) flame.rotation.y = time * .4;
                light.intensity = (ambienteBases.tochas + f * (ambienteBases.tochas * 0.4)) * braseiros[i].fatorVisao;
            });
        }, quality(nivel) {
            /* Densidade do cenário por perfil de qualidade:
               baixa 45% · média 72% · alta 100%. (Aceita o booleano
               antigo: true = baixa.) */
            const factor = nivel === 'baixa' || nivel === true ? .45 : nivel === 'media' ? .72 : 1;
            fatorQualidadeMundo = factor;
            batches.forEach(({ mesh, count }) => { if (mesh !== lotePedrasMesh) mesh.count = Math.ceil(count * factor); });
        } };
};
