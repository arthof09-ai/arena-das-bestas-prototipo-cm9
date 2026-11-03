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
    // Irregular ash and scorch patches add detail where movement happens.
    for (let i = 0; i < 14; i++) {
        const g = new T.CircleGeometry(.55 + rnd() * 1.3, 14);
        g.rotateX(-Math.PI / 2);
        const a = g.attributes.position;
        for (let j = 1; j < a.count; j++) {
            a.setX(j, a.getX(j) * (.7 + rnd() * .5));
            a.setZ(j, a.getZ(j) * (.7 + rnd() * .5));
        }
        const patch = new T.Mesh(g, new T.MeshBasicMaterial({ color: C(i % 3 ? 0x282b30 : 0xa6a7a1), transparent: true, opacity: i % 3 ? .22 : .16, depthWrite: false }));
        patch.position.set((rnd() - .5) * area.cols * 1.4, .009 + i * .0001, (rnd() - .5) * area.rows * 1.4);
        scene.add(patch);
    }
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
        for (let k = 0; k < 3; k++)
            branches.push({ p: [x + (k - 1) * .55, h + s * .65, z], s: [.07, s * .5, .07], r: [.3, k * 2, (k - 1) * 1.1] });
    }
    batch(ico, rock, stones);
    batch(box, mat(0x867c5c), grass);
    batch(cyl, wood, trunks);
    batch(cyl, wood, branches);
    const ruins = [];
    for (let i = 0; i < 15; i++) {
        const x = -radius + i * 1.05, z = -radius * .8;
        for (let j = 0; j < 1 + (i % 5); j++)
            ruins.push({ p: [x, height(x, z) + .4 + j * .76, z], s: [1, .7, .65], r: [0, .08 * (i % 3), .025] });
    }
    batch(box, rock, ruins);
    for (const [x, z, a] of [[-6, 3, .6], [5, -3, -.9], [1, 4, 1.1]])
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
        part(ico, new T.MeshBasicMaterial({ color: C(0xffdf8e), toneMapped: false }), [0, 1.43, .12], [.14, .3, .15], [0, 0, 0], g).castShadow = false;
        const light = new T.PointLight(0xff792b, 2.8, 9, 2);
        light.position.set(x, y + 1.8, z);
        scene.add(light);
        fires.push({ flame, light });
        part(new T.CircleGeometry(1.5, 24), new T.MeshBasicMaterial({ color: 0x201b19, transparent: true, opacity: .32, depthWrite: false }), [x, y + .008, z], [1, 1, 1], [-Math.PI / 2, 0, 0]).castShadow = false;
    }
    return { ground, height, radius, update(time) {
            fires.forEach(({ flame, light }, i) => {
                const f = Math.sin(time * 9 + i) * .1 + Math.sin(time * 17) * .06;
                flame.scale.y = .65 + f;
                flame.rotation.y = time * .4;
                light.intensity = 2.8 + f * 3;
            });
        }, quality(low) {
            batches.forEach(({ mesh, count }) => mesh.count = low ? Math.ceil(count * .45) : count);
        } };
};
