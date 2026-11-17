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
        /* FOGO (fogo-web, DESENHO §1/§5.2): as âncoras conferem-se
           ANTES da fusão, pelo algoritmo do §1; o subsistema dos
           braseiros constrói-se a seguir à fusão e preenche por
           mutação o que nasceu síncrono no retorno. */
        conferirAncoras(modelo);
        grupo.add(fundirSala(modelo));
        construirFogo();
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
    /* ================= FOGO — SUBSISTEMA DOS BRASEIROS (fogo-web) =================
       O fogo do Godot vive na cena .tscn (8 luzes + 8 emissores com o
       shader faisca), nunca no GLB — a integração web nunca o construiu
       (RELATORIO desta frente). Reconstrói-se aqui, dentro do
       TronoWorld, pela lista fechada P1–P7 do DESENHO: chamas
       instanciadas com o shader portado (1 chamada), brasas
       instanciadas (1 chamada), 8 luzes 0xff7a29 sem sombras nos três
       perfis; por perfil só muda a densidade (74/56/30 por taça). */
    /* Âncoras (§1): [x, base final da chama (Y), z mundo] — medidas
       offline do GLB web (nó 0,81/2,61 + topo 0,81, com a conversão
       z_mundo = z_GLB + 22 escrita uma única vez, aqui). A luz fica
       0,26 acima da base. Índices 0–5 = nave · 6–7 = plataforma. */
    const TABELA_BRASA = [
        [-7, 1.62, 11.5], [7, 1.62, 11.5],
        [-7, 1.62, 0], [7, 1.62, 0],
        [-7, 1.62, -9.5], [7, 1.62, -9.5],
        [-5.2, 3.42, -20.5], [5.2, 3.42, -20.5]];
    const CONTAGEM_NIVEL = { alta: 592, media: 448, baixa: 240 };
    const ambienteBases = { fogueira: 9.0 };
    /* SUCESSÃO 6 (fogo-web) — sincronização À ESCRITA do acoplamento
       ao ambiente e ao véu. A cena escreve neste objecto
       (ambEscrever, cena.js:759), nos proxies e nas entradas de
       braseiros; os interceptores dessas escritas aplicam na hora a
       mesma sincronização só-em-mudança do §5.1, sem esperar pelo
       frame seguinte. Medido nesta sucessão (contador de frames):
       com o renderer a ~0–1 fps, a sincronização só-no-update()
       deixava o subsistema uma geração inteira de ambiente
       atrasado — às 12,5 h assentadas, proxies já invisíveis e
       base já 0, mas aVeu ainda 1 e luzes ~7,5 por tempo
       indefinido; o acerto chegava só quando o contador de frames
       andava (e a leitura de regresso às 23 h apanhava a geração
       anterior, toda a 0). O update() continua a correr por frame
       como rede de segurança e relógio da tremulação; o estado
       derivado e a fórmula são exactamente os mesmos. */
    let baseTochas = 7.5;
    Object.defineProperty(ambienteBases, 'tochas', {
        configurable: true, enumerable: true,
        get() { return baseTochas; },
        set(v) { baseTochas = v; for (let i = 0; i < 8; i++) aplicarLuz(i); }
    });
    /* Disciplina temporal (§5.2): as 8 entradas de braseiros e os
       contentores de fontes nascem SÍNCRONOS, neste retorno — o
       registo da cena (cena.js:520-530) fotografa-os na criação do
       mundo, antes de o GLB chegar. Os proxies (§5.1) já estão
       postos na scene nas âncoras da tabela; aoModelo só confere e
       preenche por mutação (entrada.luz, push nos arrays). */
    const braseiros = [], fontesTochas = [], fontesChamas = [];
    const sentinelas = [];
    for (let i = 0; i < 8; i++) {
        const [bx, by, bz] = TABELA_BRASA[i];
        /* Dois proxies por taça (Object3D, não renderizam): a cena
           escreve neles o véu — visible (ambEscrever) e material
           (veuAplicarBraseiros troca por ghostMat em «memoria») — e
           o update() lê esse estado e sincroniza as instâncias. O
           .material é um objecto-sentinela próprio por proxy: a cena
           captura-o no registo e repõe-no ao voltar a «vista». */
        const proxyChama = new T.Object3D();
        proxyChama.position.set(bx, by, bz);
        proxyChama.material = { sentinela: 'chama-' + i };
        scene.add(proxyChama);
        const proxyBrasa = new T.Object3D();
        proxyBrasa.position.set(bx, by, bz);
        proxyBrasa.material = { sentinela: 'brasa-' + i };
        scene.add(proxyBrasa);
        sentinelas.push([proxyChama.material, proxyBrasa.material]);
        /* Interceptores da sucessão 6: as escritas da cena nestes
           proxies (visible em ambEscrever · material em
           veuAplicarBraseiros) sincronizam a taça na hora. */
        vigiarProxy(proxyChama, i); vigiarProxy(proxyBrasa, i);
        const entrada = { chamas: [proxyChama, proxyBrasa], luz: null, x: bx, z: bz };
        let fv = 1;
        Object.defineProperty(entrada, 'fatorVisao', {
            configurable: true, enumerable: true,
            get() { return fv; },
            set(v) { fv = v; aplicarLuz(i); }
        });
        braseiros.push(entrada);
    }
    const fontes = { fogueira: calor, tochas: fontesTochas, chamas: fontesChamas };
    /* Âncoras conferidas (§1 + P7): percorre o modelo ANTES da fusão,
       desquantiza com o mesmo divisor da fusão e lê a matrixWorld
       completa. Mede e regista — desvio é defeito de construção,
       nunca paragem em runtime. Resultado em window.__fogoAncoras. */
    const divisorAncora = (at) => {
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
    const conferirAncoras = (raiz) => {
        raiz.updateMatrixWorld(true);
        const porIndice = new Map();
        const v = new T.Vector3();
        /* Agrupa pelo GRUPO Prop_Brazier_N-col: as malhas-filhas
           chamam-se todas Prop_Brazier_0-col_1/_2 (o nome da malha
           partilhada, não o do nó) — medido no diagnóstico desta
           frente; quem agrupasse pelo nome da malha fundia as 8
           taças numa só. */
        raiz.traverse(o => {
            const m = /^Prop_Brazier_(\d+)-col$/.exec(o.name || '');
            if (!m || o.isMesh) return;
            const idx = Number(m[1]);
            const p = new T.Vector3().setFromMatrixPosition(o.matrixWorld);
            let topo = -Infinity;
            o.traverse(d => {
                if (!d.isMesh || !d.geometry || !d.geometry.attributes.position) return;
                const at = d.geometry.attributes.position, div = divisorAncora(at), M = d.matrixWorld;
                for (let i = 0; i < at.count; i++) {
                    v.set(at.getX(i) / div, at.getY(i) / div, at.getZ(i) / div).applyMatrix4(M);
                    if (v.y > topo) topo = v.y;
                }
            });
            porIndice.set(idx, { nome: 'Prop_Brazier_' + idx, no: [p.x, p.y, p.z], topo });
        });
        window.__fogoAncoras = [...porIndice.values()].sort((a, b) => a.no[2] - b.no[2] || a.no[0] - b.no[0])
            .map(r => ({ nome: r.nome, no: r.no, baseFinal: [r.no[0], r.topo, r.no[2] + 22] }));
    };
    /* O subsistema em si: nasce em aoModelo, já no nível guardado. */
    let chamasGeo = null, chamasMat = null, brasasMesh = null, aVeuAttr = null;
    let nivelGuardado = 'alta', tremulacaoLigada = true;
    let tempoChama = 0, avancoTempo = 1, ultimoTempo = null;
    const estadoTaca = ['vista', 'vista', 'vista', 'vista', 'vista', 'vista', 'vista', 'vista'];
    const COR_BRASA = new T.Color(0xe76c29), COR_FANTASMA = new T.Color(0x9aa7b4);
    const escreverBrasa = (i, est) => {
        const [bx, by, bz] = TABELA_BRASA[i];
        const d = new T.Object3D();
        d.position.set(bx, by - 0.04, bz);
        if (est === 'apagada') d.scale.set(0, 0, 0); else d.scale.set(0.42, 0.10, 0.42);
        d.updateMatrix();
        brasasMesh.setMatrixAt(i, d.matrix);
        brasasMesh.setColorAt(i, est === 'memoria' ? COR_FANTASMA : COR_BRASA);
        brasasMesh.instanceMatrix.needsUpdate = true;
        if (brasasMesh.instanceColor) brasasMesh.instanceColor.needsUpdate = true;
    };
    /* Sincronização do véu/ambiente (§5.1 + sucessão 6): deriva o
       estado da taça dos proxies, escreve-o nas instâncias só em
       mudança e repõe a intensidade da luz pela fórmula do §5.5
       com o último factor de tremulação calculado. Corre no
       update() (por frame) e à escrita da cena (interceptores
       acima) — uma só regra, dois chamadores. */
    const fTaca = [0, 0, 0, 0, 0, 0, 0, 0];
    function derivarEst(i) {
        const e = braseiros[i], pc = e.chamas[0], pb = e.chamas[1];
        return (!pc.visible || !pb.visible) ? 'apagada'
            : (pc.material !== sentinelas[i][0] || pb.material !== sentinelas[i][1]) ? 'memoria' : 'vista';
    }
    function aplicarEst(i, est) {
        if (aVeuAttr) {
            const vv = est === 'vista' ? 1 : est === 'memoria' ? 0.45 : 0;
            for (let k = i; k < 592; k += 8) aVeuAttr.setX(k, vv);
            aVeuAttr.needsUpdate = true;
        }
        if (brasasMesh) escreverBrasa(i, est);
    }
    function aplicarLuz(i) {
        const e = braseiros[i];
        if (!e.luz) return;
        /* Factor (§5.3): nave = o de raio 11 que a cena escreve na
           entrada; plataforma = o estado da casa apertada lido dos
           proxies (vista 1, resto 0). */
        const factor = i < 6 ? e.fatorVisao : (derivarEst(i) === 'vista' ? 1 : 0);
        e.luz.intensity = (baseTochas + fTaca[i] * baseTochas * 0.4) * factor;
    }
    function sincronizarTaca(i) {
        const est = derivarEst(i);
        if (est !== estadoTaca[i]) { estadoTaca[i] = est; aplicarEst(i, est); }
        aplicarLuz(i);
    }
    function vigiarProxy(proxy, i) {
        let vis = proxy.visible, mat = proxy.material;
        Object.defineProperty(proxy, 'visible', {
            configurable: true, enumerable: true,
            get() { return vis; },
            set(v) { vis = v; sincronizarTaca(i); }
        });
        Object.defineProperty(proxy, 'material', {
            configurable: true, enumerable: true,
            get() { return mat; },
            set(m) { mat = m; sincronizarTaca(i); }
        });
    }
    const construirFogo = () => {
        /* --- as chamas: o faisca portado, UMA chamada instanciada (§2) --- */
        let semente = 9182;
        const rndF = () => ((semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0) / 4294967296);
        const N = 592;
        const ancora = new Float32Array(N * 3), desvio = new Float32Array(N * 3), dados = new Float32Array(N * 3), veu = new Float32Array(N);
        for (let k = 0; k < N; k++) {
            const taca = k % 8, [bx, by, bz] = TABELA_BRASA[taca];
            ancora[k * 3] = bx; ancora[k * 3 + 1] = by; ancora[k * 3 + 2] = bz;
            const ang = rndF() * Math.PI * 2, rr = Math.sqrt(rndF()) * 0.28;
            desvio[k * 3] = Math.cos(ang) * rr; desvio[k * 3 + 1] = 0; desvio[k * 3 + 2] = Math.sin(ang) * rr;
            dados[k * 3] = rndF(); dados[k * 3 + 1] = 0.55 + rndF() * 0.60; dados[k * 3 + 2] = 0.55 + rndF() * 0.80;
            veu[k] = 1;
        }
        chamasGeo = new T.InstancedBufferGeometry();
        chamasGeo.setAttribute('position', new T.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
        chamasGeo.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
        chamasGeo.setIndex([0, 1, 2, 0, 2, 3]);
        chamasGeo.setAttribute('aAncora', new T.InstancedBufferAttribute(ancora, 3));
        chamasGeo.setAttribute('aDesvio', new T.InstancedBufferAttribute(desvio, 3));
        chamasGeo.setAttribute('aDados', new T.InstancedBufferAttribute(dados, 3));
        aVeuAttr = new T.InstancedBufferAttribute(veu, 1);
        aVeuAttr.setUsage(T.DynamicDrawUsage);
        chamasGeo.setAttribute('aVeu', aVeuAttr);
        chamasGeo.instanceCount = CONTAGEM_NIVEL[nivelGuardado];
        chamasMat = new T.ShaderMaterial({
            uniforms: { uTempo: { value: 0 }, uEscala: { value: 1 }, uAlfa: { value: 1 } },
            transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
            vertexShader: [
                'attribute vec3 aAncora;',
                'attribute vec3 aDesvio;',
                'attribute vec3 aDados;',
                'attribute float aVeu;',
                'uniform float uTempo;',
                'uniform float uEscala;',
                'varying vec2 vUv;',
                'varying float vVeu;',
                'void main() {',
                '  vUv = uv;',
                '  vVeu = aVeu;',
                '  if (aVeu <= 0.0) { gl_Position = vec4(0.0, 0.0, -3.0, 1.0); return; }',
                '  float t = fract(uTempo / 0.85 + aDados.x);',
                '  float seg = t * 0.85;',
                '  float subida = aDados.y * seg + 0.5 * 0.45 * seg * seg;',
                '  vec3 centro = aAncora + aDesvio + vec3(0.0, subida, 0.0);',
                '  vec3 canto = vec3((uv.x - 0.5) * 0.32 * aDados.z * uEscala, uv.y * 0.62 * aDados.z * uEscala, 0.0);',
                '  vec4 mv = viewMatrix * vec4(centro, 1.0);',
                '  mv.xyz += canto;',
                '  gl_Position = projectionMatrix * mv;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'uniform float uTempo;',
                'uniform float uAlfa;',
                'varying vec2 vUv;',
                'varying float vVeu;',
                'void main() {',
                '  vec2 p = 2.0 * vUv - 1.0;',
                '  float fase = uTempo * 5.0 + vUv.y * 6.0;',
                '  float altura = 1.0 - vUv.y;',
                '  p.x = (p.x + 0.17 * sin(fase) * altura) / (0.42 + 0.68 * vUv.y);',
                '  float d = length(p);',
                '  float forma = max(0.0, 1.0 - d);',
                '  float alfa = pow(forma, 1.15);',
                '  vec3 cor = mix(vec3(1.6, 0.08, 0.008), vec3(3.0, 0.94, 0.13), alfa);',
                '  float a = alfa * 0.53 * uAlfa;',
                '  if (vVeu < 0.99) { cor = mix(cor, vec3(0.604, 0.655, 0.706), 0.55); a *= vVeu; }',
                '  gl_FragColor = vec4(cor, a);',
                '  #include <tonemapping_fragment>',
                '  #include <encodings_fragment>',
                '}'
            ].join('\n')
        });
        const chamasMesh = new T.Mesh(chamasGeo, chamasMat);
        chamasMesh.frustumCulled = false;
        scene.add(chamasMesh);
        /* --- as brasas: um disco por taça, 8 instâncias fixas (§3) --- */
        brasasMesh = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 8);
        brasasMesh.frustumCulled = false;
        scene.add(brasasMesh);
        for (let i = 0; i < 8; i++) escreverBrasa(i, 'vista');
        /* --- as 8 luzes, pré-criadas (§5.6): as mesmas nos 3 perfis --- */
        for (let i = 0; i < 8; i++) {
            const [bx, by, bz] = TABELA_BRASA[i];
            const luz = new T.PointLight(0xff7a29, 0, 12, 2);
            luz.position.set(bx, by + 0.26, bz);
            luz.castShadow = false;
            scene.add(luz);
            braseiros[i].luz = luz;
            fontesTochas.push(luz);
        }
        fontesChamas.push(chamasMesh, brasasMesh);
        /* Janela de prova desta frente (só leitura). */
        /* Nascimento (sucessão 6): aplica o estado que os proxies já
           tiverem — a cena pode ter escrito o ambiente/véu antes de
           o modelo chegar e as instâncias existirem. */
        for (let i = 0; i < 8; i++) sincronizarTaca(i);
        window.__fogoProva = { chamasGeo, brasasMesh, braseiros, tempoChama: () => tempoChama, avanco: () => avancoTempo };
    };
    return { ground: grupo, height: () => 0, radius: 30, obstaculos: Object.freeze([]),
        fontes, ambienteBases, brasasFogueira: [], pecasFogueira: [], braseiros,
        recomputarPedras() {}, definirFantasmaPedras() {},
        pedrasDiagnostico() { return { total: 0, casas: [], mortas: [], retrato: [], vivas: [], fantasmas: [], nv: 0, nf: 0 }; },
        setTremulacao(on) { tremulacaoLigada = !!on; },
        update(time) {
            /* Relógio da chama (§5.5): avança com a tremulação ligada;
               desligada, o avanço decai 1→0 em ~0,25 s e a pose congela
               sem salto. O tempo da tremulação das luzes é o da cena. */
            if (ultimoTempo == null) ultimoTempo = time;
            const dt = Math.min(0.1, Math.max(0, time - ultimoTempo));
            ultimoTempo = time;
            avancoTempo += ((tremulacaoLigada ? 1 : 0) - avancoTempo) * Math.min(1, dt / 0.25);
            if (avancoTempo < 0.001 && !tremulacaoLigada) avancoTempo = 0;
            tempoChama += dt * avancoTempo;
            if (chamasMat) chamasMat.uniforms.uTempo.value = tempoChama;
            for (let i = 0; i < 8; i++) {
                /* Tremulação (§5.5): o factor da casa, guardado por
                   taça — a sincronização à escrita reutiliza entre
                   frames o último valor calculado. */
                fTaca[i] = tremulacaoLigada ? Math.sin(time * 9 + i) * .10 + Math.sin(time * 17) * .06 : 0;
                /* Sincronização do véu/ambiente (§5.1): a mesma
                   função que os interceptores chamam à escrita —
                   aqui corre por frame como rede de segurança. */
                sincronizarTaca(i);
            }
            /* Pulso lento das brasas (§3): multiplicador neutro. */
            if (brasasMesh) brasasMesh.material.color.setScalar(0.96 + 0.04 * Math.sin(time * 1.7));
        },
        quality(nivel) {
            /* §5.6: só muta — guarda o nível e escreve o instanceCount
               sobre os buffers alocados no máximo. Luzes, brasas,
               fontes e braseiros nunca são substituídos: NUM_POINT_LIGHTS
               fica constante (17) e a troca não recompila materiais. */
            if (!CONTAGEM_NIVEL[nivel]) return;
            nivelGuardado = nivel;
            if (chamasGeo) chamasGeo.instanceCount = CONTAGEM_NIVEL[nivel];
        } };
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
