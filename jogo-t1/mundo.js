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
    for (let i=0;i<26;i++) {
        const a=i*Math.PI*2/26, r=1.35+rnd()*.3;
        part(ico, i%3 ? rock : rust, [Math.cos(a)*r,.09,Math.sin(a)*r], [.22+rnd()*.15,.12+rnd()*.12,.18], [rnd(),a,rnd()]);
    }
    for (let i=0;i<32;i++) {
        const a=rnd()*Math.PI*2, r=Math.sqrt(rnd())*1.1;
        part(ico, i%4 ? wood : embers, [Math.cos(a)*r,.035,Math.sin(a)*r], [.05+rnd()*.18,.035,.06+rnd()*.14], [0,a,0]).castShadow=false;
    }
    const hearth = new T.PointLight(0xff6724,6.0,8,2); hearth.position.set(0,.45,0); scene.add(hearth);
    const stones = [], grass = [], branches = [], trunks = [];
    for (let i = 0; i < 480; i++) {
        const x = (rnd() - .5) * radius * 3, z = (rnd() - .5) * radius * 3, s = .025 + rnd() * .12;
        stones.push({ p: [x, height(x, z) + s * .2, z], s: [s * 2, s, s], r: [rnd(), rnd() * 6, rnd()] });
    }
    for (let i = 0; i < 360; i++) {
        const x = (rnd() - .5) * radius * 3, z = (rnd() - .5) * radius * 3;
        grass.push({ p: [x, height(x, z) + .1, z], s: [.015, .13 + rnd() * .25, .035], r: [0, rnd() * 6, (rnd() - .5) * .8] });
    }
    for (let i = 0; i < 36; i++) {
        const a = rnd() * Math.PI * 2, r = radius + 9 + rnd() * 52, x = Math.sin(a) * r, z = Math.cos(a) * r, h = height(x, z), s = 2 + rnd() * 3;
        trunks.push({ p: [x, h + s / 2, z], s: [.16, s, .16], r: [0, rnd() * 6, .12] });
        for (let k = 0; k < 2; k++)
            branches.push({ p: [x + .18 + k * .15, h + s * (.6 + k*.2), z], s: [.05, s * .22, .05], r: [.2, k * .3, -.5] });
    }
    // A paisagem continua antes/depois da área: afloramentos e muros gastos,
    // visíveis também no eixo longo da Fixa em retrato, sem delimitar um tabuleiro.
    for (let i=0;i<34;i++) {
        const x=(i%2 ? -1:1)*(area.cols*.75+3+rnd()*7), z=(rnd()-.5)*area.rows*2.2;
        const s=.5+rnd()*1.15;
        stones.push({p:[x,height(x,z)+s*.28,z],s:[s*1.3,s*.75,s],r:[rnd()*.3,rnd()*6,rnd()*.3]});
    }
    batch(ico, rock, stones);
    batch(box, mat(0x867c5c), grass);
    batch(cyl, wood, trunks);
    batch(cyl, wood, branches);
    const ruins = [];
    for (let i = 0; i < 15; i++) {
        const x = -radius + i * 1.05, z = -radius * .8 + Math.sin(i*.8)*.35;
        for (let j = 0; j < 1 + (i % 5); j++)
            ruins.push({ p: [x + (rnd()-.5)*.18, height(x, z) + .3 + j * .53, z], s: [.62+rnd()*.18, .36+rnd()*.15, .42+rnd()*.13], r: [rnd()*.18, rnd()*.4, (rnd()-.5)*.2] });
    }
    // Icosaedros achatados: cantos quebrados, juntas irregulares, tons intercalados.
    batch(new T.IcosahedronGeometry(1,1), rock, ruins.filter((_,i)=>i%2));
    batch(new T.IcosahedronGeometry(1,1), mat(0x777369), ruins.filter((_,i)=>!(i%2)));
    for (const [x, z, a] of [[-6, 3, .35], [5, -3, .3], [1, 4, .4]])
        part(cyl, wood, [x, .12, z], [.12, 1.8, .12], [Math.PI / 2, 0, a]);
    for (const [x, z] of [[-area.cols * .75 - 1, -2], [area.cols * .75 + 1, 1], [1, -area.rows * .75 - 1]]) {
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
        fires.push({ flame, core, light });
        // O solo recebe luz real; sem discos que se leiam como tapetes.
    }
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
    return { ground, height, radius, fontes, ambienteBases, setTremulacao(on) {
            ambTremulacao = !!on;
        }, update(time) {
            fires.forEach(({ flame, light }, i) => {
                const f = ambTremulacao ? Math.sin(time * 9 + i) * .1 + Math.sin(time * 17) * .06 : 0;
                flame.scale.y = .65 + f;
                if (ambTremulacao) flame.rotation.y = time * .4;
                light.intensity = ambienteBases.tochas + f * (ambienteBases.tochas * 0.4);
            });
        }, quality(nivel) {
            /* Densidade do cenário por perfil de qualidade:
               baixa 45% · média 72% · alta 100%. (Aceita o booleano
               antigo: true = baixa.) */
            const factor = nivel === 'baixa' || nivel === true ? .45 : nivel === 'media' ? .72 : 1;
            batches.forEach(({ mesh, count }) => mesh.count = Math.ceil(count * factor));
        } };
};
