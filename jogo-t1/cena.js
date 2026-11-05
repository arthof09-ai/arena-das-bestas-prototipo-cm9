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
            scene.add(new T.HemisphereLight(0x96b4df, 0x222632, .40));
            const sun = new T.DirectionalLight(0xffb16b, 1.35);
            sun.position.set(-24, 12, -18);
            sun.castShadow = true;
            sun.shadow.mapSize.set(512, 512);
            const extent = Math.max(area.cols, area.rows) * CELL * .8 + 8;
            Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: extent * 5 });
            sun.shadow.bias = -.0005;
            sun.shadow.normalBias = .04;
            scene.add(sun);
            const world = CampoWorld(T, scene, area), camera = new T.OrthographicCamera(-10, 10, 10, -10, .1, 1600), target = new T.Vector3(), ray = new T.Raycaster();
            let width = 1, height = 1, selected = null, mode = 'fixa', quality = 'alta', disposed = false, raf, last = performance.now(), fps = 0, fpsAt = last, frames = 0, shadowAt = 0, yaw = 0, pitch = 1.05, viewWidth = 20;
            const zoom = { fixa: 1, seguir: 1, '360': 1 }, units = new Map(), events = new EventTarget(), times = [];
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
                const u = { id: data.id, nome: data.nome, x: data.x, z: data.y, altitude: data.altitude ?? 0, vivo: data.vivo, root, pivot, label, size: data.alturaMetros, queue: [], step: null, clips: { idle: data.animacoes?.idle, andar: data.animacoes?.andar, ataque:data.animacoes?.ataque, reacao:data.animacoes?.reacao }, animations: [], removed: false, model };
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
                        const gltf = await new T.GLTFLoader().loadAsync(model);
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
                        // Pedra mate, independente da cor de identificação do anel.
                        u.markerTint = model === 'marcador-lobo' ? 0x777b79 : 0x817c73;
                        const m = new T.MeshLambertMaterial({ color: C(u.markerTint) });
                        if (model === 'marcador-lobo') {
                            const body = new T.Mesh(new T.IcosahedronGeometry(1, 1), m);
                            body.scale.set(.3, data.alturaMetros * .5, .7);
                            body.position.y = data.alturaMetros * .5;
                            pivot.add(body);
                        }
                        else {
                            const body = new T.Mesh(new T.CylinderGeometry(.22, .38, data.alturaMetros * .68, 8), m);
                            body.position.y = data.alturaMetros * .34;
                            pivot.add(body);
                            const head = new T.Mesh(new T.IcosahedronGeometry(data.alturaMetros * .14, 1), m);
                            head.position.y = data.alturaMetros * .86;
                            pivot.add(head);
                        }
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
                if (!['fixa', 'seguir', '360'].includes(value))
                    throw new RangeError('Câmera inválida.');
                mode = value;
                setZoom(zoom[mode]);
                emit('camera', { camera: mode });
            }
            function baseWidth() {
                if (mode === 'seguir')
                    return width < height ? 9 : 8.4;
                if (mode === 'fixa' && width < height)
                    return Math.max(area.rows * CELL * 1.2, area.cols * CELL * Math.sin(.72) * 1.2 * width / Math.max(150, height - 110));
                return Math.max(area.cols * CELL * 1.25, area.rows * CELL * Math.sin(1.12) * 1.25 * width / Math.max(150, height - 110));
            }
            function zoomRange() {
                return { min: .45, max: baseWidth() / (mode === 'seguir' ? 3 : 4.5) };
            }
            function setZoom(v) {
                if (!Number.isFinite(v))
                    throw new TypeError('Zoom finito obrigatório.');
                const r = zoomRange();
                zoom[mode] = clamp(v, r.min, r.max);
                emit('zoom', { zoom: zoom[mode], ...r });
            }
            function setQualidade(q) {
                if (!['alta', 'baixa'].includes(q))
                    throw new RangeError('Qualidade inválida.');
                quality = q;
                renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q === 'alta' ? 2 : 1));
                renderer.shadowMap.enabled = q === 'alta';
                sun.castShadow = q === 'alta';
                world.quality(q === 'baixa');
                resize();
                renderer.shadowMap.needsUpdate = true;
                emit('quality', { qualidade: q });
            }
            function resize() {
                const r = container.getBoundingClientRect();
                width = Math.max(1, r.width);
                height = Math.max(1, r.height);
                renderer.setSize(width, height, false);
                setZoom(zoom[mode]);
            }
            const observer = new ResizeObserver(resize);
            observer.observe(container);
            const screen = v => {
                const p = v.clone().project(camera);
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
                    const b = unitRect(u);
                    if (b && sx >= b.left && sx <= b.right && sy >= b.top && sy <= b.bottom)
                        hits.push({ id: u.id, distance: camera.position.distanceTo(u.root.position) });
                });
                hits.sort((a, b) => a.distance - b.distance);
                ray.setFromCamera(new T.Vector2(sx / width * 2 - 1, 1 - sy / height * 2), camera);
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
                return { area: JSON.parse(JSON.stringify(area)), selected, camera: mode, zoom: zoom[mode], zoomRange: zoomRange(), gridVisible: grid.visible, qualidade: quality, moving: [...units.values()].some(u => u.step || u.queue.length), units: [...units.values()].map(publicUnit) };
            }
            function stats() {
                return { movementCells:movementCells.map(p=>({...p})), presentation:presentation ? {attacker:presentation.a.id,target:presentation.b.id,phase:!presentation.started?'waiting':presentation.t<.2?'turn':'gesture'} : null, hoverVisible: hover.visible, destinationVisible: destination.visible, reachableCells: (moveLayer.children[0]?.geometry.attributes.position.count ?? 0)/6, fps, triangles: renderer.info.render.triangles, totalTriangles: count(scene), drawCalls: renderer.info.render.calls, dpr: renderer.getPixelRatio(), width, height, visibleWidthMeters: viewWidth, cellPixels: CELL / viewWidth * width, shadowSize: renderer.shadowMap.enabled ? 512 : 0, areaMeters: { width: area.cols * CELL, height: area.rows * CELL }, models: [...units.values()].map(u => ({ id:u.id, frente:((T.MathUtils.radToDeg(u.pivot.rotation.y)%360)+360)%360, drawOffset:{x:u.root.position.x-wx(u.x),y:u.root.position.y-world.height(wx(u.x),wz(u.z))-u.altitude,z:u.root.position.z-wz(u.z)}, modelo:u.model, triangles:count(u.pivot), markerTint:u.markerTint ?? null, skins:(()=>{const skins=new Set();u.pivot.traverse(o=>{if(o.isSkinnedMesh)skins.add(o.skeleton.bones.map(b=>b.uuid).join(','))});return skins.size})(), action:u.actionName ?? null, actionTime:u.action?.time ?? null, clips:u.animations.map(a=>a.name), clipDurations:u.animations.map(a=>({name:a.name,duration:a.duration})) })), animations: { idle: [...units.values()].filter(u => u.mixer && u.actionName === u.clips.idle).length, walk: [...units.values()].filter(u => u.mixer && u.actionName === u.clips.andar).length, advancing: [...units.values()].filter(u => u.mixer && u.mixer.time > 0).length } };
            }
            function animate(now) {
                if (disposed)
                    return;
                raf = requestAnimationFrame(animate);
                const dt = Math.min(.08, (now - last) / 1000);
                last = now;
                if (document.hidden)
                    return;
                let dirty = !!presentation;
                updatePresentation(dt);
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
                });
                world.update(now / 1000);
                if (dirty && now - shadowAt > 100) {
                    renderer.shadowMap.needsUpdate = true;
                    shadowAt = now;
                }
                const followed = units.get(selected), want = (mode === 'fixa' || !followed) ? new T.Vector3(0, .35, 0) : followed.root.position.clone().add(new T.Vector3(0, .8, 0));
                target.lerp(want, 1 - Math.exp(-dt * 7));
                const p = mode === '360' ? pitch : mode === 'seguir' ? 1 : width < height ? .72 : 1.12, a = mode === '360' ? yaw : mode === 'fixa' && width < height ? Math.PI / 2 : 0, distance = Math.max(45, extent * 2);
                camera.position.set(target.x + Math.sin(a) * Math.cos(p) * distance, target.y + Math.sin(p) * distance, target.z + Math.cos(a) * Math.cos(p) * distance);
                camera.lookAt(target);
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
                renderer.render(scene, camera);
                const boxes = [];
                const bodies = [...units.values()].map(unitRect).filter(Boolean);
                for (const u of [...units.values()].sort((a, b) => (b.id === selected) - (a.id === selected))) {
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
                emit('error', { message: 'Contexto gráfico perdido. Recarregue a página.' });
            };
            renderer.domElement.addEventListener('webglcontextlost', contextLost);
            setQualidade(options.qualidade || 'alta');
            raf = requestAnimationFrame(animate);
            const ready = Promise.all((options.units || []).map(addUnit));
            return Object.freeze({ ready, addUnit, removeUnit, move, select, apresentarAtaque, setCamera, setZoom, setQualidade, showMovement, on, getState: state, getStats: stats, getFrameTimes: () => times.slice(), hitTest: hit, projectUnit: id => unitRect(requireUnit(id), true), setVivo(id, vivo) {
                    if (typeof vivo !== 'boolean')
                        throw new TypeError('vivo booleano');
                    const u = requireUnit(id);
                    cancelFor(u);
                    u.vivo = vivo;
                    u.queue = [];
                    u.step = null;
                    pose(u);
                }, setGridVisible(v) {
                    grid.visible = !!v;
                }, showHover: p => mark(hover, p), orbit(dx, dy) {
                    if (mode === '360') {
                        yaw -= dx * .008;
                        pitch = clamp(pitch + dy * .005, .55, 1.4);
                    }
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
                    release(scene);
                    sun.shadow.map?.dispose();
                    renderer.dispose();
                    renderer.domElement.remove();
                    labels.remove();
                } });
        } });
})();
