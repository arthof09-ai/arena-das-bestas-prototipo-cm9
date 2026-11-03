/* Campo de Batalha — casca da HUD (tranche T1) sobre a cena da rodada 2.
 * A HUD é a da T0 (LIBERADA pelos críticos); o que muda é a ligação:
 * a cena nova (Campo3D rodada 2, cena.js INTOCADO) recebe o elenco
 * oficial por create(), os toques resolvem-se por hitTest (contenção)
 * e os gestos são os da demo do Codex (arrastar = órbita/360,
 * pinça = zoom, toque = seleccionar/agir — sem lutas entre gestos).
 * Sem motor: valores de demonstração marcados TEST; o alcance é a
 * aproximação declarada (BFS da demo) até o motor real mandar as
 * casas — ver NOTAS-T1.md. Silêncio proibido: cada toque e cada botão
 * acabam numa frase na linha de mensagem VISÍVEL. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const mapaEl = $('mapa'), msgTxt = $('mensagem-txt'), acoesEl = $('acoes');
  const fichaEl = $('ficha'), chipEl = $('fichachip'), cfgEl = $('cfgpop');

  /* ---------- elenco oficial do jogo (a figura de teste UAL1 fica
     SÓ na demo do Codex — não é personagem do jogo) ---------- */
  const AREA = { cols: 10, rows: 7, origin: { x: 0, y: 0 } };
  const ELENCO = [
    { id: 'orc',     nome: 'Orc Test',        modelo: 'modelos/orc-t1.glb', x: 3, y: 3, alturaMetros: 2.4,  vivo: true },
    { id: 'ong',     nome: 'Ong',             modelo: 'marcador',          x: 6, y: 2, alturaMetros: 1.75, vivo: true },
    { id: 'capanga', nome: 'Capanga 1',       modelo: 'marcador',          x: 7, y: 4, alturaMetros: 1.8,  vivo: true },
    { id: 'lobo',    nome: 'Lobo da Caverna', modelo: 'marcador-lobo',     x: 2, y: 5, alturaMetros: 0.9,  vivo: true }
  ];
  /* Aproximação declarada (BFS da demo do Codex): orçamentos em casas.
     O motor real substituirá isto pelas casasAlcancaveis oficiais. */
  const ORCAMENTOS = { orc: 7, ong: 5, capanga: 6, lobo: 9 };

  let qualidade = 'alta';
  try { qualidade = localStorage.getItem('hudt1-qualidade') || 'alta'; } catch (_) {}
  if (qualidade !== 'alta' && qualidade !== 'baixa') qualidade = 'alta';

  let view;
  try {
    view = Campo3D.create(mapaEl, { area: AREA, units: ELENCO, qualidade });
  } catch (error) {
    msgTxt.innerHTML = '<b>WebGL indisponível</b> — tenta outro navegador.';
    return;
  }
  window.mapa3d = view;

  /* ---------- ÚNICO adaptador de coordenadas ----------
   * O motor/casca falam (x,y) no chão; a vista fala (x,z) no chão.
   * Toda a conversão vive aqui — nenhum outro sítio traduz casas. */
  const casaVista = p => ({ x: p.x, z: p.y });              // motor → vista
  const casaMotor = cell => (cell ? { x: cell.x, y: cell.z } : null); // hitTest → motor
  const chave = (x, y) => x + ',' + y;

  /* ---------- dados de demonstração (TEST) ---------- */
  const PROPRIA = 'ong';                 // a personagem da jogadora deste aparelho
  const ORDEM_VEZ = ['ong', 'orc', 'capanga', 'lobo'];
  const ATAQUES = {
    ong:     { tecnica: 'Lâmina de Maré', curta: 'Lâmina',   custo: 3, bonus: 6, alvoNome: 'o Lobo' },
    orc:     { tecnica: 'Golpe Brutal',   curta: 'Golpe',    custo: 2, bonus: 7, alvoNome: 'o Lobo' },
    capanga: { tecnica: 'Estocada',       curta: 'Estocada', custo: 2, bonus: 5, alvoNome: 'a Ong' },
    lobo:    { tecnica: 'Mordida',        curta: 'Mordida',  custo: 2, bonus: 6, alvoNome: 'a Ong' }
  };
  /* FICHAS só tem a ficha completa da PRÓPRIA (Ong) — é a única ficha
     que pode aparecer neste aparelho. Não há entradas mecânicas de
     figuras alheias neste objecto, de propósito (ver VISTA, abaixo). */
  const FICHAS = {
    ong: { completa: true, nome: 'ONG', sub: 'Espiritualista · Água',
      vida: { total: 24, perdido: 6 }, alma: { livre: 7, total: 10, comprometido: 3 },
      ca: 15, desloc: '9 m', ini: '+4', ataque: '+6', cd: '13',
      attrs: [['FOR', 12], ['DES', 16], ['CON', 13], ['INT', 11], ['SAB', 15], ['CAR', 10]],
      tecnicas: [['Lâmina de Maré', '3 PA'], ['Véu de Névoa', '2 PA']] }
  };
  /* ---------- cartão de vista (decisão do Mestre, 03/11 07:35-07:36) ----------
   * Figuras que não são a própria NÃO têm ficha na tela da jogadora:
   * nada de CA, defesa, arma, dano, posição, deslocamento, vida, alma
   * ou atributos — isso é "meta game". O cartão que abre ao tocar numa
   * figura é só de VISTA e história leve, tipo Pokédex: onde ela se
   * encontra e como ela é por fora. Dados separados dos mecânicos, de
   * propósito: este objecto não tem um único campo técnico. */
  const VISTA = {
    orc:     { nome: 'ORC TEST',        sub: 'Criatura',
      onde: 'Terras afastadas e lugares de batalha.',
      aparencia: 'Uma figura humanoide grande e forte, de ombros largos e braços compridos.',
      frase: 'Impressiona pelo tamanho — é das maiores figuras que a Ong já viu.' },
    capanga: { nome: 'CAPANGA 1',       sub: 'Pessoa',
      onde: 'Estradas e lugares de passagem.',
      aparencia: 'Um homem comum, de roupa simples de viagem.',
      frase: 'À primeira vista, passa por uma pessoa qualquer da estrada.' },
    lobo:    { nome: 'LOBO DA CAVERNA', sub: 'Besta',
      onde: 'Cavernas e lugares escuros e fechados.',
      aparencia: 'Um lobo grande, de quatro patas, com o pelo escuro em tons de cinzento-carvão. Tem uma cicatriz sobre o olho esquerdo, branco e cego, a ponta da orelha direita cortada e a pata dianteira esquerda branca.',
      frase: 'Mesmo de longe, reconhece-se pela cicatriz e pela pata branca.' }
  };

  /* ---------- estado da casca ---------- */
  let selecionada = PROPRIA;
  let vez = PROPRIA, rodada = 2;
  let estado = 'base';        // base | atacar | consumivel | mover | movendo | rolagem | resultado
  let ajudaGrid = true;
  let alcance = new Map();    // chave(x,y) → {x, y, passos, path:[{x,y}]} em coords do motor
  let fichaAberta = null;     // id da figura cuja coluna está aberta
  let parado = false;         // o movimento foi interrompido por "Parar"

  const unidade = id => view.getState().units.find(u => u.id === id);
  const nomeCena = id => (ELENCO.find(u => u.id === id) || {}).nome
    || (unidade(id) || {}).nome || id;
  function say(html) { msgTxt.innerHTML = html; }

  /* ---------- faixa: os estados trocam o miolo, nunca o tamanho ---------- */
  const B = (acao, glifo, rotulo, cls) =>
    `<button type="button" class="btn ${cls || ''}" data-acao="${acao}">` +
    (glifo ? `<span class="gi">${glifo}</span>` : '') +
    `<span class="gl">${rotulo}</span></button>`;
  const retrato = () => matchMedia('(max-width:560px)').matches;
  function renderAcoes() {
    const atk = ATAQUES[selecionada];
    const rp = retrato();
    document.getElementById('faixa').dataset.estado = estado;
    acoesEl.classList.toggle('compacta', estado === 'base' || estado === 'atacar');
    if (estado === 'base') {
      // Rótulos curtos em retrato (dívida S-2 do desenho): é o que liberta
      // os ≥120 px da linha de mensagem sem tocar nos alvos de 44 px.
      acoesEl.innerHTML =
        B('atacar', '⚔', 'Atacar', 'primary') +
        B('mover', '🚶', 'Mover') +
        B('consumivel', '🎒', rp ? 'Consum.' : 'Consumível') +
        B('encerrar', '✓', rp ? 'Fim' : 'Encerrar', 'ghost');
    } else if (estado === 'atacar') {
      acoesEl.innerHTML =
        B('voltar', '←', 'Voltar', 'ghost') +
        B('ataque-basico', '⚔', rp ? 'Básico' : 'Ataque básico', 'primary') +
        B('tecnica', '✦', `${rp ? atk.curta : atk.tecnica} <span class="pa">${atk.custo} PA</span>`);
    } else if (estado === 'consumivel') {
      acoesEl.innerHTML = B('voltar', '←', 'Voltar', 'ghost');
    } else if (estado === 'mover') {
      acoesEl.innerHTML = B('cancelar', '✕', 'Cancelar', 'ghost');
    } else if (estado === 'movendo') {
      acoesEl.innerHTML = B('parar', '■', 'Parar', 'ghost');
    } else if (estado === 'rolagem') {
      acoesEl.innerHTML = B('voltar', '←', 'Voltar', 'ghost') + B('confirmar', '✓', 'Confirmar', 'primary');
    } else if (estado === 'resultado') {
      acoesEl.innerHTML = B('continuar', '', 'Continuar ▸', 'primary');
    }
  }
  function atualizarVez() {
    $('vez-rotulo').textContent = vez === 'lobo' ? 'VEZ DA BESTA' : 'VEZ DE';
    $('vez-nome').textContent = nomeCena(vez);
    $('vez-rodada').textContent = 'R' + rodada;
  }

  function selecionar(id) { selecionada = id; view.select(id); }

  /* ---------- alcance: BFS da demo (aproximação declarada) ----------
   * Quatro vizinhos, bordas da área e casas ocupadas por outras figuras.
   * Devolve casas do MOTOR (x,y,passos,path); a conversão para a vista
   * acontece só no adaptador, ao desenhar e ao mandar andar. */
  function calcularAlcance() {
    const s = view.getState();
    const u = s.units.find(v => v.id === selecionada);
    if (!u) return new Map();
    const ocupadas = new Set(s.units.filter(v => v.id !== u.id)
      .map(v => chave(v.posicao.x, v.posicao.y)));
    const inicio = { x: u.posicao.x, y: u.posicao.y, passos: 0, path: [] };
    const vistos = new Map([[chave(inicio.x, inicio.y), inicio]]);
    const fila = [inicio];
    for (let i = 0; i < fila.length; i++) {
      const p = fila[i];
      if (p.passos >= (ORCAMENTOS[u.id] || 4)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = p.x + dx, y = p.y + dy, k = chave(x, y);
        if (x < AREA.origin.x || x >= AREA.origin.x + AREA.cols
          || y < AREA.origin.y || y >= AREA.origin.y + AREA.rows
          || vistos.has(k) || ocupadas.has(k)) continue;
        const n = { x, y, passos: p.passos + 1, path: [...p.path, { x, y }] };
        vistos.set(k, n);
        fila.push(n);
      }
    }
    vistos.delete(chave(inicio.x, inicio.y));
    return vistos;
  }
  function desenharAlcance() {
    view.showMovement(ajudaGrid ? [...alcance.values()].map(casaVista) : []);
  }
  function entrarMover() {
    const u = unidade(selecionada);
    if (!u) return;
    if (estado === 'movendo' || view.getState().moving) { say('Espera — a figura ainda está a andar.'); return; }
    alcance = calcularAlcance();
    estado = 'mover';
    desenharAlcance();
    renderAcoes();
    say(`A mover <b>${u.nome}</b> · escolhe a casa de destino${ajudaGrid ? ' nas <b>casas acesas</b>' : ''} (até ${ORCAMENTOS[u.id] || 4} casas).`);
  }
  function sairMover() {
    estado = 'base'; alcance = new Map();
    view.showMovement([]); view.showHover(null);
    renderAcoes();
  }
  function limparAjudaMover() {
    alcance = new Map();
    view.showMovement([]); view.showHover(null);
  }

  /* ---------- acções da faixa ---------- */
  acoesEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-acao]');
    if (!btn) return;
    const acao = btn.dataset.acao;
    const u = unidade(selecionada);
    if (acao === 'voltar') { estado = 'base'; renderAcoes(); say(`É a vez de <b>${nomeCena(vez)}</b>.`); return; }
    if (acao === 'mover') { entrarMover(); return; }
    if (acao === 'cancelar') { sairMover(); say('Movimento cancelado.'); return; }
    if (acao === 'parar') {
      // A API nova não tem stop(): uma ordem nova cancela a fila anterior.
      // Parar = fixar já na última casa confirmada (sincronização imediata).
      // "A parar…" diz-se ANTES do move (R-T1-1): o move imediato dispara
      // moveend sincronamente dentro da cena, e é a frase final dele
      // ("…parou."), pintada depois, que tem de ficar na linha.
      parado = true;
      say('A parar…');
      if (u) view.move(selecionada, casaVista(u.posicao), { immediate: true });
      return;
    }
    if (acao === 'atacar') {
      if (estado === 'movendo' || view.getState().moving) { say('Espera — a figura ainda está a andar.'); return; }
      estado = 'atacar'; renderAcoes();
      say(`Atacar com <b>${nomeCena(selecionada)}</b> · escolhe o ataque na faixa.`);
      return;
    }
    if (acao === 'consumivel') {
      estado = 'consumivel'; renderAcoes();
      say('Itens · <b>sem suporte nesta fatia do motor</b> — a faixa fica pronta; o conteúdo espera a frente de itens.');
      return;
    }
    if (acao === 'ataque-basico' || acao === 'tecnica') {
      const atk = ATAQUES[selecionada];
      const nomeAtaque = acao === 'tecnica' ? atk.tecnica : 'Ataque básico';
      estado = 'rolagem'; renderAcoes();
      // A CA do alvo NÃO aparece: é informação técnica da outra figura
      // ("meta game", decisão do Mestre 03/11 07:35). A frase mostra só
      // a rolagem de quem ataca e deixa o acerto para o Mestre confirmar.
      say(`${nomeAtaque} de <b>${nomeCena(selecionada)}</b> · <b>1d20+${atk.bonus} → 14 + ${atk.bonus} = ${14 + atk.bonus}</b> · o Mestre confirma se acertou.`);
      acoesEl.dataset.pendente = nomeAtaque;
      return;
    }
    if (acao === 'confirmar') {
      const atk = ATAQUES[selecionada];
      estado = 'resultado'; renderAcoes();
      say(`<b>Acerto</b> · ${acoesEl.dataset.pendente || 'o ataque'} atinge ${atk.alvoNome}.`);
      return;
    }
    if (acao === 'continuar') { estado = 'base'; renderAcoes(); say(`É a vez de <b>${nomeCena(vez)}</b>.`); return; }
    if (acao === 'encerrar') {
      const i = ORDEM_VEZ.indexOf(vez);
      vez = ORDEM_VEZ[(i + 1) % ORDEM_VEZ.length];
      if (vez === ORDEM_VEZ[0]) rodada++;
      selecionar(vez); atualizarVez();
      say(`Turno encerrado. É a vez de <b>${nomeCena(vez)}</b>.`);
      return;
    }
  });

  /* ---------- ficha: chip (a própria) e coluna lateral ---------- */
  function abrirFicha(id) {
    const f = FICHAS[id] || null;          // ficha completa: só a própria
    const v = f ? null : VISTA[id];        // outras figuras: cartão de vista
    if (!f && !v) return;
    fichaAberta = id;
    const fechar = '<button type="button" class="fx" data-fechar aria-label="Fechar ficha">✕</button>';
    let corpo = '';
    if (f) {
      const vidaAtual = f.vida.total - f.vida.perdido;
      corpo = `
        <div class="rec"><div class="rt"><span>VIDA</span><b>${vidaAtual}/${f.vida.total}</b></div>
          <div class="bar vida"><i style="width:${Math.round(vidaAtual / f.vida.total * 100)}%"></i></div>
          <small>Perdido: ${f.vida.perdido}</small></div>
        <div class="rec"><div class="rt"><span>ALMA · PA LIVRE</span><b>${f.alma.livre}</b></div>
          <div class="bar alma"><i style="width:${Math.round(f.alma.livre / f.alma.total * 100)}%"></i></div>
          <small>Total ${f.alma.total} · Comprometido ${f.alma.comprometido}</small></div>
        <h2>Resumo de combate</h2>
        <div class="resumo">
          <div class="ca"><b>${f.ca}</b><span>CA</span></div>
          <div class="rgrid">
            <div><span>DESLOCAMENTO</span><b>${f.desloc}</b></div>
            <div><span>INICIATIVA</span><b>${f.ini}</b></div>
            <div><span>ATAQUE</span><b>${f.ataque}</b></div>
            <div><span>CD MAGIA</span><b>${f.cd}</b></div>
          </div>
        </div>
        <h2>Atributos</h2>
        <div class="attrs">${f.attrs.map(([n, v]) => `<div><b>${v}</b><span>${n}</span></div>`).join('')}</div>
        <h2>Técnicas</h2>
        ${f.tecnicas.map(([n, c]) => `<div class="tec"><span>${n}</span><em>${c}</em></div>`).join('')}
        <footer>Ficha Base · valores TEST fictícios</footer>`;
    } else {
      /* Cartão de vista, tipo Pokédex: só onde se encontra e como é
         por fora. NENHUM campo mecânico — este ramo lê apenas
         v.onde / v.aparencia / v.frase (e nome/sub no cabeçalho). */
      corpo = `
        <h2>Onde se encontra</h2>
        <p class="vista">${v.onde}</p>
        <h2>Como ele é</h2>
        <p class="vista">${v.aparencia}</p>
        <p class="vista">${v.frase}</p>
        <p class="nota">A ficha técnica desta figura <b>só o Mestre vê</b> — na tela da jogadora não há números nem mecânica dela.</p>
        <footer>Cartão de vista · demonstração TEST</footer>`;
    }
    fichaEl.innerHTML = `
      <header><div><h1>${f ? f.nome : v.nome}</h1><div class="sub">${f ? f.sub : v.sub}</div><span class="testchip">TEST</span></div>${fechar}</header>
      ${corpo}`;
    fichaEl.hidden = false;
    chipEl.hidden = true;
  }
  function fecharFicha() { fichaAberta = null; fichaEl.hidden = true; chipEl.hidden = false; }
  fichaEl.addEventListener('click', e => { if (e.target.closest('[data-fechar]')) fecharFicha(); });
  chipEl.addEventListener('click', () => {
    if (estado === 'movendo') { say(`Espera — <b>${nomeCena(selecionada)}</b> ainda está a andar.`); return; }
    if (estado === 'mover') limparAjudaMover();
    estado = 'base'; acoesEl.dataset.pendente = '';
    selecionar(PROPRIA); abrirFicha(PROPRIA); renderAcoes();
    say('A tua ficha, <b>Ong</b> — valores TEST de demonstração.');
  });

  /* ---------- toque no mundo: hitTest (contenção), nunca íman ----------
   * A cena devolve {unitId, cell}: a figura pela caixa projectada e a
   * casa por contenção no plano do solo — sem raio de atracção em px. */
  function tratarToque(clientX, clientY) {
    fecharCfg();
    const hit = view.hitTest(clientX, clientY);
    if (estado === 'movendo') {
      say(`Espera — <b>${nomeCena(selecionada)}</b> ainda está a andar.`);
      return;
    }
    if (hit.unitId) {
      const fig = unidade(hit.unitId);
      const nome = fig ? fig.nome : nomeCena(hit.unitId);
      if (estado === 'mover') {
        if (hit.unitId === selecionada) {
          say(`<b>${nome}</b> já está aqui — toca numa casa acesa para andar.`);
          return;
        }
        selecionar(hit.unitId); sairMover(); abrirFicha(hit.unitId);
        say(`<b>${nome}</b> seleccionado. Prime <b>Mover</b> para andar com ele.`);
        return;
      }
      /* Desync fechado (herdado da T0): em estados transitórios, tocar
         numa figura NUNCA troca a selecção por baixo de um estado
         pendente — repõe a base, com frase. */
      if (estado === 'atacar' || estado === 'rolagem' || estado === 'consumivel') {
        estado = 'base'; acoesEl.dataset.pendente = '';
        selecionar(hit.unitId); abrirFicha(hit.unitId); renderAcoes();
        say(`Troquei para <b>${nome}</b> — a faixa voltou às acções base.`);
        return;
      }
      selecionar(hit.unitId); abrirFicha(hit.unitId);
      say(`<b>${nome}</b> seleccionado. Prime <b>Mover</b> para andar.`);
      return;
    }
    if (estado === 'mover') {
      const cel = casaMotor(hit.cell);
      if (!cel) { say('Toca numa casa do campo para andar.'); return; }
      const u = unidade(selecionada);
      if (u && cel.x === u.posicao.x && cel.y === u.posicao.y) {
        say(`<b>${u.nome}</b> já está nessa casa — escolhe outra.`);
        return;
      }
      const destino = alcance.get(chave(cel.x, cel.y));
      if (!destino) {
        say(ajudaGrid
          ? 'Essa casa está longe demais — escolhe uma das <b>casas acesas</b>.'
          : `Longe demais — anda até ${ORCAMENTOS[selecionada] || 4} casas por vez.`);
        return;
      }
      estado = 'movendo'; parado = false; renderAcoes();
      view.showMovement([]); view.showHover(null);
      say(`<b>${u ? u.nome : nomeCena(selecionada)}</b> está a andar…`);
      view.move(selecionada, casaVista(destino), {
        path: destino.path.map(casaVista),
        durationMs: Math.min(1200, Math.max(220, destino.passos * 140))
      });
      return;
    }
    if (estado === 'resultado') { say('Prime <b>Continuar</b> para seguir.'); return; }
    if (estado !== 'base') { say('Isso é o chão. Prime <b>Voltar</b> para regressar às acções base.'); return; }
    say('Isso é o chão. Prime <b>Mover</b>, toca numa casa acesa. Ficha: toca na figura.');
  }

  view.on('moveend', u => {
    if (estado !== 'movendo' || !u) return;
    estado = 'base'; renderAcoes();
    say(parado ? `<b>${u.nome}</b> parou.` : `<b>${u.nome}</b> chegou ao destino.`);
    parado = false;
    if (fichaAberta === u.id) abrirFicha(u.id);   // reabre a ficha/cartão de vista da figura que andou
  });
  view.on('camera', () => { sincronizarCamera(); mostrarZoom(); });
  view.on('zoom', () => mostrarZoom());
  view.on('stats', s => {
    $('stats').textContent = `${Math.round(s.fps)} FPS · ${s.triangles ?? '—'} triângulos · ${s.drawCalls ?? '—'} chamadas`;
  });
  view.on('error', e => say((e && e.message) || 'Erro na vista 3D.'));

  /* ---------- gestos no mapa (o padrão da demo dele): ----------
   * toque = seleccionar/agir · arrastar = órbita (só 360) ·
   * pinça = zoom · dois dedos ou arrasto >7 px cancelam o toque.
   * Os gestos não lutam: um gesto é uma coisa só, do início ao fim. */
  const ponteiros = new Map();
  let gesto = null, pinca = 0, multi = false;
  mapaEl.addEventListener('pointerdown', e => {
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { mapaEl.setPointerCapture(e.pointerId); } catch (_) {}
    fecharCfg();
    if (ponteiros.size === 1) {
      gesto = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, drag: false };
      multi = false;
      if (estado === 'mover') view.showHover(view.hitTest(e.clientX, e.clientY).cell);
    } else {
      multi = true;
      view.showHover(null);
    }
  });
  mapaEl.addEventListener('pointermove', e => {
    if (!ponteiros.has(e.pointerId)) return;
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ponteiros.size === 2) {
      const [a, b] = [...ponteiros.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinca) view.setZoom(view.getState().zoom * d / pinca);
      pinca = d;
      return;
    }
    if (!gesto || multi) return;
    const dx = e.clientX - gesto.lastX, dy = e.clientY - gesto.lastY;
    if (Math.hypot(e.clientX - gesto.x, e.clientY - gesto.y) > 7) gesto.drag = true;
    if (gesto.drag) {
      view.orbit(dx, dy);
      view.showHover(null);
    } else if (estado === 'mover') {
      view.showHover(view.hitTest(e.clientX, e.clientY).cell);
    }
    gesto.lastX = e.clientX; gesto.lastY = e.clientY;
  });
  mapaEl.addEventListener('pointerup', e => {
    const eraPinca = multi || ponteiros.size > 1;
    const eraArrasto = !!(gesto && gesto.id === e.pointerId && gesto.drag && !multi);
    if (gesto && gesto.id === e.pointerId && !gesto.drag && !multi)
      tratarToque(e.clientX, e.clientY);
    ponteiros.delete(e.pointerId);
    view.showHover(null);
    pinca = 0;
    if (!ponteiros.size) {
      gesto = null;
      if (eraPinca) fraseZoom();
      else if (eraArrasto) fraseArrasto();
      multi = false;
    }
  });
  for (const tipo of ['pointercancel', 'lostpointercapture'])
    mapaEl.addEventListener(tipo, e => {
      ponteiros.delete(e.pointerId);
      view.showHover(null);
      pinca = 0;
      gesto = null;
    });
  mapaEl.addEventListener('wheel', e => {
    e.preventDefault();
    view.setZoom(view.getState().zoom - Math.sign(e.deltaY) * .15);
    mostrarZoom(); fraseZoom();
  }, { passive: false });

  /* ---------- cantos e pop-up de configurações rápidas ---------- */
  function fecharCfg() {
    if (cfgEl.hidden) return;
    cfgEl.hidden = true;
    $('btn-config').classList.remove('on');
    $('btn-config').setAttribute('aria-expanded', 'false');
  }
  $('btn-config').addEventListener('click', () => {
    const abrir = cfgEl.hidden;
    cfgEl.hidden = !abrir;
    $('btn-config').classList.toggle('on', abrir);
    $('btn-config').setAttribute('aria-expanded', String(abrir));
  });
  $('btn-cheia').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else say('Tela cheia indisponível neste navegador.');
    } catch (_) { say('O navegador não permitiu a tela cheia.'); }
  });
  $('btn-alerta').addEventListener('click', () => say('Alertas: <b>nenhum</b> por agora (demonstração).'));

  function sincronizarCamera() {
    const modo = view.getState().camera;
    $('cam-fixa').classList.toggle('on', modo === 'fixa');
    $('cam-seguir').classList.toggle('on', modo === 'seguir');
    $('cam-360').classList.toggle('on', modo === '360');
  }
  $('cam-fixa').addEventListener('click', () => {
    view.setCamera('fixa');
    say('Câmera <b>Fixa</b> — vês o campo todo.');
  });
  $('cam-seguir').addEventListener('click', () => {
    view.setCamera('seguir');
    say('Câmera <b>Seguir</b> — a vista acompanha a figura seleccionada.');
  });
  $('cam-360').addEventListener('click', () => {
    view.setCamera('360');
    say('Câmera <b>360°</b> — arrasta no mapa para girar à volta da figura.');
  });

  function mostrarZoom() {
    const s = view.getState();
    $('zoom-valor').textContent = s.zoom.toFixed(1).replace('.', ',') + '×';
    $('zoom-menos').disabled = s.zoom <= s.zoomRange.min + .001;
    $('zoom-mais').disabled = s.zoom >= s.zoomRange.max - .001;
  }
  function fraseZoom() { say(`Zoom a <b>${view.getState().zoom.toFixed(1).replace('.', ',')}×</b>.`); }
  /* R-T1-2: fora da câmera 360, orbit() não gira nada — o arrasto que
     virou órbita termina com a frase que aponta o caminho (⚙ → Câmera
     → 360°), em vez de terminar sem resposta nenhuma. */
  function fraseArrasto() {
    if (view.getState().camera === '360') return;
    say('O arrasto só gira na câmera <b>360°</b> — muda em <b>⚙ → Câmera → 360°</b>.');
  }
  $('zoom-mais').addEventListener('click', () => { view.setZoom(view.getState().zoom + .25); mostrarZoom(); fraseZoom(); });
  $('zoom-menos').addEventListener('click', () => { view.setZoom(view.getState().zoom - .25); mostrarZoom(); fraseZoom(); });

  /* Ajuda do grid: preferência de EXIBIÇÃO da casca (as casas acesas ao
     mover). NÃO é o setGridVisible da cena — a grade auxiliar da vista
     continua desligada, pela lei do mundo sem tabuleiro. */
  $('tog-grid').addEventListener('click', () => {
    ajudaGrid = !ajudaGrid;
    const tog = $('tog-grid');
    tog.classList.toggle('on', ajudaGrid);
    tog.textContent = ajudaGrid ? 'Ligada' : 'Desligada';
    tog.setAttribute('aria-pressed', String(ajudaGrid));
    if (estado === 'mover') desenharAlcance();
    say(ajudaGrid
      ? 'Ajuda do grid <b>ligada</b> — ao mover, as casas ao alcance acendem.'
      : `Ajuda do grid <b>desligada</b> — ao mover, nada acende; o toque continua a valer até ${ORCAMENTOS[selecionada] || 4} casas.`);
  });

  function marcarQualidade() {
    document.querySelectorAll('[data-qualidade]').forEach(b =>
      b.classList.toggle('on', b.dataset.qualidade === qualidade));
  }
  document.querySelectorAll('[data-qualidade]').forEach(b => b.addEventListener('click', () => {
    qualidade = b.dataset.qualidade;
    try { localStorage.setItem('hudt1-qualidade', qualidade); } catch (_) {}
    view.setQualidade(qualidade);
    marcarQualidade();
    say('Qualidade: <b>' + b.textContent + '</b> — aplicada já à vista (resolução, sombra e cenário).');
  }));

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    fecharCfg();
    if (fichaAberta) fecharFicha();
    if (estado === 'mover') { sairMover(); say('Movimento cancelado.'); }
  });

  addEventListener('resize', () => renderAcoes());

  /* ---------- arranque ---------- */
  atualizarVez();
  renderAcoes();
  marcarQualidade();
  say('A carregar o campo…');
  view.ready.then(() => {
    selecionar(PROPRIA);
    sincronizarCamera();
    mostrarZoom();
    say('É a vez da <b>Ong</b>. Prime <b>Mover</b> e toca numa casa acesa para andar.');
  }).catch(error => say('Não foi possível carregar os modelos: ' + ((error && error.message) || error)));
})();
