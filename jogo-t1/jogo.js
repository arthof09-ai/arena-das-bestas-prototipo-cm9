/* Campo de Batalha — casca da HUD (tranche T1) sobre a cena da rodada 2.
 * A HUD é a da T0 (LIBERADA pelos críticos); o que muda é a ligação:
 * a cena nova (Campo3D rodada 2, cena.js INTOCADO) recebe o elenco
 * oficial por create(), os toques resolvem-se por hitTest (contenção)
 * e os gestos são os da demo do Codex (arrastar = órbita/360,
 * pinça = zoom, toque = seleccionar/agir — sem lutas entre gestos).
 * Sem motor: valores de demonstração marcados TEST; o alcance é a
 * aproximação declarada (BFS da demo) até o motor real mandar as
 * casas — ver NOTAS-T1.md. Silêncio proibido: cada toque e cada botão
 * acabam numa frase na linha de mensagem VISÍVEL.
 * Tranche T1.2 (decisões do Mestre, 03/11 07:52): esta vista é a da
 * jogadora — só a Ong é controlável; as outras figuras são alvo e
 * cartão de vista. E os acertos da Ong mostram números de dano por
 * parcela, com interruptor no pop-up ⚙ — ver NOTAS-T1.md, secção T1.2.
 * Tranches T1.4+T1.3 fundidas (03/11): o combate corre no SISTEMA
 * DELE (teste de 1d6 + bónus de teste contra uma Defesa interna
 * nunca exibida; dano = a expressão de dados da ficha; a
 * Transformação custa PA e debita de verdade) e a batalha tem
 * TURNOS: a vez roda por uma ordem fixa TEST, os monstros agem nas
 * vezes deles por uma IA básica da casca (no jogo de verdade manda
 * o H10 — diferença declarada nas NOTAS) e o movimento dela é uma
 * reserva em metros da ficha dela, gasta por toque ou pelas setas
 * do teclado. Ver NOTAS-T1.md, secção "Tranches T1.4+T1.3". */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const mapaEl = $('mapa'), msgTxt = $('mensagem-txt'), acoesEl = $('acoes');
  const fichaEl = $('ficha'), chipEl = $('fichachip'), cfgEl = $('cfgpop');

  /* ---------- elenco oficial do jogo (a figura de teste UAL1 fica
     SÓ na demo do Codex — não é personagem do jogo) ---------- */
  const AREA = { cols: 10, rows: 7, origin: { x: 0, y: 0 } };
  const ELENCO = [
    { id: 'orc',     nome: 'Orc',             modelo: 'modelos/orc-t1.glb', x: 3, y: 3, alturaMetros: 2.4,  vivo: true },
    { id: 'ong',     nome: 'Ong',             modelo: 'marcador',          x: 6, y: 2, alturaMetros: 1.75, vivo: true },
    { id: 'capanga', nome: 'Capanga 1',       modelo: 'marcador',          x: 7, y: 4, alturaMetros: 1.8,  vivo: true },
    { id: 'lobo',    nome: 'Lobo da Caverna', modelo: 'marcador-lobo',     x: 2, y: 5, alturaMetros: 0.9,  vivo: true }
  ];
  /* Reservas internas de movimento dos MONSTROS, em casas (T1.3):
     governam só a IA básica nas vezes deles — internas, nunca
     exibidas, lidas apenas pela IA. A Ong NÃO está aqui: a reserva
     dela são os metros da ficha dela (DESLOCAMENTO_ONG_M, abaixo).
     O motor real substituirá isto pelas casasAlcancaveis oficiais. */
  const ORCAMENTOS = { orc: 7, capanga: 6, lobo: 9 };

  let qualidade = 'alta';
  try { qualidade = localStorage.getItem('hudt1-qualidade') || 'alta'; } catch (_) {}
  if (qualidade !== 'alta' && qualidade !== 'baixa') qualidade = 'alta';

  /* Opção "Números de dano" (pop-up ⚙): ligada por omissão, persistida
     como a qualidade. É uma OPÇÃO — mora nas configurações, nunca na
     barra. Desligada, nenhum número de dano aparece (ver mostrarDano). */
  let numerosDano = true;
  try { numerosDano = localStorage.getItem('hudt1-numeros-dano') !== 'desligado'; } catch (_) {}

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
  /* Vista da jogadora (decisão do Mestre, 03/11 07:52): neste aparelho
     SÓ a Ong é controlável. Tocar noutra figura NUNCA a torna a
     figura activa: abre o cartão de vista dela (T1.1) e marca-a como
     ALVO. Nas vezes dos monstros age a IA básica da casca (T1.3) —
     nenhum caminho da interface a alcança nem a parametriza; a
     jogadora observa, com os toques interceptados (§ das guardas). */
  const ALVO_NOME = { orc: 'o Orc', capanga: 'o Capanga 1', lobo: 'o Lobo da Caverna' };

  /* ---------- combate no sistema dele (tranche T1.4) ----------
   * Fonte única: TEST_CHARACTERS via engine criarEstado, conferida
   * contra F-MECANICAS §1.1 — o resolvedor local de TESTE, com a
   * compressão D3 co-assinada e declarada provisória. NÃO é o VLAB
   * (a ABI de ataque do VLAB está indisponível, Gate E em HOLD até
   * 05/11): nada aqui se chama oficial nem homologado.
   * COMBATE_TEST guarda, por figura, SÓ os campos que o combate usa
   * (ca, atkQtd, atkFaces, atkBonus, arma, dano, alcance). Vida e PA
   * de monstro NÃO entram — a ficha do monstro não mora nesta tabela.
   * As linhas dos monstros e as Defesas derivadas são RESÍDUO
   * DECLARADO, classe (b) — família dos resíduos aceites pelo Mestre
   * (PA exactamente calculável, 02/11 14:21; vida fixável por evento
   * público, P-ADV-01; descoberta por esforço próprio, 02/11
   * 18:12–18:13): exibição ZERO em qualquer superfície (frase, ficha,
   * cartão, flutuante), residência apenas no fonte desta vista de
   * TESTE, dentro deste IIFE — nada ligado a window/globalThis.
   * Destino de produção, explícito: na build ligada ao motor, a
   * resolução sai do aparelho da jogadora e estas constantes NÃO
   * são servidas à vista da Party. */
  const COMBATE_TEST = {
    ong:     { ca: 30, atkQtd: 1, atkFaces: 6, atkBonus: 19, arma: 'Chicote de Água', dano: { qtd: 8, faces: 6, bonus: 28 }, alcance: 6,
               transformacao: { custo: 40, dmgBonusNovo: 34, caNova: 36 } },
    orc:     { ca: 33, atkQtd: 1, atkFaces: 6, atkBonus: 17, arma: 'Machado',        dano: { qtd: 4, faces: 6, bonus: 0 },  alcance: 1 },
    capanga: { ca: 30, atkQtd: 1, atkFaces: 6, atkBonus: 10, arma: 'Ataque',         dano: { qtd: 2, faces: 6, bonus: 25 }, alcance: 1 },
    lobo:    { ca: 34, atkQtd: 1, atkFaces: 6, atkBonus: 10, arma: 'Patada',         dano: { qtd: 1, faces: 6, bonus: 24 }, alcance: 1 }
  };
  /* Derivações da engine, transcritas com a fórmula e a fonte:
   * bónus de teste = 9 + floor(min(atkBonus, 19) / 10) — vale 10
   * para os quatro combatentes deste elenco (o eixo do teste não
   * diferencia atacantes aqui; a diferenciação vive nos dados de
   * dano). Defesa = round(CA/3) + 3. Na forma transformada dela, a
   * Defesa é a base + 1 com teto 15 (D3/D2): 13 → 14 — é a forma
   * que a tabela da fonte regista (= min(15, 13+1)), NÃO round(36/3)+3. */
  const bonusTeste = c => 9 + Math.floor(Math.min(c.atkBonus, 19) / 10);
  function defesaDe(id) {
    if (id === PROPRIA && transformada)
      return Math.min(15, Math.round(COMBATE_TEST.ong.ca / 3) + 3 + 1);
    if (id === PROPRIA) return Math.round(COMBATE_TEST.ong.ca / 3) + 3;
    return DEFESA_TEST[id];
  }
  /* Defesas das figuras alheias — subtabela interna derivada de
     COMBATE_TEST. Só a resolução a lê (defesaDe); proibido exibi-la.
     A Defesa DELA não mora aqui: deriva-se em defesaDe (muda com a
     Transformação) e também nunca se exibe. */
  const DEFESA_TEST = {};
  for (const id of ['orc', 'capanga', 'lobo'])
    DEFESA_TEST[id] = Math.round(COMBATE_TEST[id].ca / 3) + 3;

  /* Decompõe uma expressão da gramática da ficha (NdM[+B]) em
   * parcelas: cada dado rola e sai com a sua face (classe 'dados',
   * rótulo 'dado') e o termo constante sai como parcela própria
   * (classe 'bonus', rótulo 'bónus') — o +B da expressão da arma, sem
   * nome de atributo nenhum. É a peça única de rolagem de dano da
   * casca: serve os flutuantes dela e o total interno da IA.
   * Parcelas nomeadas de técnica (classe 'tecnica') entrariam aqui
   * se uma ficha as declarasse; a dela não declara nenhuma nesta
   * tranche (tecnica: null na fonte) — nenhuma nasce. */
  function rolarExpressao(expr) {
    const parcelas = [];
    for (let i = 0; i < expr.qtd; i++)
      parcelas.push({ classe: 'dados', rotulo: 'dado', valor: 1 + Math.floor(Math.random() * expr.faces) });
    if (expr.bonus) parcelas.push({ classe: 'bonus', rotulo: 'bónus', valor: expr.bonus });
    let total = 0;
    for (const p of parcelas) total += p.valor;
    return { parcelas, total };
  }
  /* A expressão de dano dela no estado actual (normal/transformada). */
  function expressaoOng() {
    const c = COMBATE_TEST.ong;
    return transformada
      ? { qtd: c.dano.qtd, faces: c.dano.faces, bonus: c.transformacao.dmgBonusNovo }
      : c.dano;
  }

  /* ---------- turnos e IA básica (tranche T1.3) ----------
   * Ordem da rodada: constante interna de iniciativa TEST. O +4 da
   * Ong vem da ficha TEST dela (já exibido na ficha dela); os
   * valores dos monstros são inventados TEST, só para a rotação ser
   * determinística e misturada. A interface mostra só nomes e de
   * quem é a vez — nunca números de iniciativa de ninguém. */
  const INICIATIVA_TEST = { ong: 4, lobo: 3, capanga: 2, orc: 1 };
  const ORDEM = [...ELENCO].sort((a, b) =>
    (INICIATIVA_TEST[b.id] - INICIATIVA_TEST[a.id])
    || (ELENCO.indexOf(a) - ELENCO.indexOf(b))).map(u => u.id);
  // ORDEM = ['ong', 'lobo', 'capanga', 'orc']
  /* Alcance de ataque da IA: 1 casa — fonte: os três têm alcance 1
     na ficha TEST (não é empréstimo do alcance dela). */
  const ALCANCE_IA_TEST = 1;
  /* Verbos da IA: palavras genéricas da acção visível — nunca nomes
     de técnica, nunca armas com dados (fronteira EM-P3). */
  const FRASES_IA = {
    lobo:    { acerto: 'mordeu',       falha: 'tentou morder' },
    capanga: { acerto: 'golpeou',      falha: 'tentou golpear' },
    orc:     { acerto: 'agarrou',      falha: 'tentou agarrar' }
  };
  /* Tempos da vez da IA (D-13.6): a vez do monstro tem de se ver. */
  const ESPERA_ANUNCIO_MS = 800, ESPERA_ATAQUE_MS = 500, ESPERA_FIM_MS = 1000;
  const GUARDA_IA_MS = 5000;   // relógio de guarda do movimento da IA (G-13.3)
  /* Reserva de movimento DELA (D-13.13): manda a ficha dela —
     Deslocamento 9 m. A casa do motor publicado vale 1,5 m (Q5). */
  const DESLOCAMENTO_ONG_M = 9, CASA_M = 1.5;
  /* FICHAS só tem a ficha completa da PRÓPRIA (Ong) — é a única ficha
     que pode aparecer neste aparelho. Não há entradas mecânicas de
     figuras alheias neste objecto, de propósito (ver VISTA, abaixo). */
  const FICHAS = {
    /* Valores da ficha TEST dela (fonte: TEST_CHARACTERS via engine):
       vida 99, alma 91 (0 comprometido), CA 30. O "perdido" e o "PA
       livre" NÃO são literais: compõem-se em abrirFicha a partir de
       danoSofrido e paGasto (tempo de corrida). O campo de ataque
       mostra a fórmula executada (1d6+10 — derivação nas NOTAS);
       campo de CD não existe: é gramática estranha ao sistema dele.
       Atributos: INT 19 é da fonte; os restantes ficam como exibição
       TEST sem fonte no elenco (declarado nas NOTAS). */
    ong: { completa: true, nome: 'ONG', sub: 'Espiritualista · Água',
      vida: { total: 99 }, alma: { total: 91, comprometido: 0 },
      ca: 30, desloc: '9 m', ini: '+4', ataque: 'Teste 1d6+10',
      attrs: [['FOR', 12], ['DES', 16], ['CON', 13], ['INT', 19], ['SAB', 15], ['CAR', 10]],
      tecnicas: [['Transformação', '40 PA']] }
  };
  /* ---------- cartão de vista (decisão do Mestre, 03/11 07:35-07:36) ----------
   * Figuras que não são a própria NÃO têm ficha na tela da jogadora:
   * nada de CA, defesa, arma, dano, posição, deslocamento, vida, alma
   * ou atributos — isso é "meta game". O cartão que abre ao tocar numa
   * figura é só de VISTA e história leve, tipo Pokédex: onde ela se
   * encontra e como ela é por fora. Dados separados dos mecânicos, de
   * propósito: este objecto não tem um único campo técnico. */
  const VISTA = {
    orc:     { nome: 'ORC',             sub: 'Criatura', imagem: 'imagens/orc.webp',
      onde: 'Terras afastadas e lugares de batalha.',
      aparencia: 'Uma figura humanoide grande e forte, de ombros largos e braços compridos.',
      frase: 'Impressiona pelo tamanho — é das maiores figuras que a Ong já viu.' },
    capanga: { nome: 'CAPANGA 1',       sub: 'Pessoa',
      /* sem imagem: não existe arte aprovada do Capanga (lacuna declarada nas NOTAS) */
      onde: 'Estradas e lugares de passagem.',
      aparencia: 'Um homem comum, de roupa simples de viagem.',
      frase: 'À primeira vista, passa por uma pessoa qualquer da estrada.' },
    lobo:    { nome: 'LOBO DA CAVERNA', sub: 'Besta', imagem: 'imagens/lobo.jpg',
      onde: 'Cavernas e lugares escuros e fechados.',
      aparencia: 'Um lobo grande, de quatro patas, com o pelo escuro em tons de cinzento-carvão. Tem uma cicatriz sobre o olho esquerdo, branco e cego, a ponta da orelha direita cortada e a pata dianteira esquerda branca.',
      frase: 'Mesmo de longe, reconhece-se pela cicatriz e pela pata branca.' }
  };

  /* ---------- estado da casca ---------- */
  let selecionada = PROPRIA;   // constante nesta vista: a figura activa é sempre a Ong
  let alvo = null;              // última figura não-própria tocada (ou nenhuma)
  let atacou = false;           // uso de atacar da vez dela (atacar ×1; a Transformação também o consome)
  let ataquePendente = null;    // rolagem dela entre o clique e o Confirmar (T1.4 §1: o resultado NÃO se revela antes)
  let estado = 'base';        // base | atacar | consumivel | mover | movendo | rolagem | resultado | vez-ia | fim
  /* Máquina de turnos (T1.3): a vez roda por ORDEM. vezAtual,
     indiceVez e rodada só mudam em passarVez()/iniciarVezIA() e no
     arranque — nenhum outro caminho os escreve. */
  let ordem = ORDEM, indiceVez = 0, vezAtual = PROPRIA, seqTurno = 0, rodada = 1;
  let batalhaFim = false;       // trava do fim de batalha TEST (só a queda dela, §1.7 do desenho T1.3)
  let danoSofrido = 0;          // vida perdida acumulada DELA — nasce a 0; a ficha e o chip lêem daqui
  let paGasto = 0;              // PA gasto por ela em tempo de corrida — só a Transformação o escreve
  let transformada = false;     // snapshot da Transformação aplicado (expressão 8d6+34, Defesa dela 14)
  let reservaMovimento = DESLOCAMENTO_ONG_M;   // metros que ela ainda pode andar NESTA vez
  let custoPendente = null;     // casas do caminho por toque, a descontar no moveend dela
  let caminhoPendente = null;   // o path (motor) desse caminho — custo do Parar pelas casas andadas (D-13.15)
  let passoEmCurso = false;     // um passo de seta está a animar (pressões novas ignoram-se)
  let contextoIA = null;        // { id, seq, relogio, destino? } do movimento/ataque da IA em voo — consumo único (G-13.3(d)); destino só no movimento (E-1)
  let vezIAFechada = -1;        // última geração de IA cuja conclusão já foi consumida (fimDaVezIA idempotente)
  let ajudaGrid = true;
  let alcance = new Map();    // chave(x,y) → {x, y, passos, path:[{x,y}]} em coords do motor
  let fichaAberta = null;     // id da figura cuja coluna está aberta
  let parado = false;         // o movimento foi interrompido por "Parar"
  /* Correcções pós-críticos T1.5 (guarda de época dela): supEpoca
     sobe em supCongelar e em supRestaurar; cada movimento DELA
     regista a época ao partir (epocaMovimentoOng) e o moveend só
     acerta contas se a época for a mesma. supRestauroPendente
     guarda as unidades do último snapshot restaurado, para um
     moveend tardio reafirmar essas posições. O relógio de guarda
     do movimento dela (5 s, como o da IA) vive em
     guardaMovimentoOng ({ epoca, relogio }). */
  let supEpoca = 0;
  let epocaMovimentoOng = 0;
  let supRestauroPendente = null;   // unidades do snapshot restaurado, ou null
  let guardaMovimentoOng = null;    // { epoca, relogio } do movimento dela em voo

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
      // A gaveta tem o básico dela (o Chicote, 0 PA) e a única técnica
      // com fonte nesta tranche: a Transformação, com o custo no rótulo.
      acoesEl.innerHTML =
        B('voltar', '←', 'Voltar', 'ghost') +
        B('ataque-basico', '⚔', rp ? 'Chicote' : COMBATE_TEST.ong.arma, 'primary') +
        B('transformacao', '✦', `Transformação <span class="pa">${COMBATE_TEST.ong.transformacao.custo} PA</span>`);
    } else if (estado === 'vez-ia') {
      // Vez de um monstro: o miolo é um TEXTO de estado, não um botão
      // (um botão que nunca responde violaria o silêncio proibido).
      acoesEl.innerHTML = 'A agir…';
    } else if (estado === 'fim') {
      acoesEl.innerHTML = B('recomecar', '↻', 'Recomeçar', 'primary');
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
    // O indicador é o que já existe à esquerda da faixa: pinta de quem
    // é a vez (só o nome — público) e a rodada. No fim de batalha:
    // "FIM" / nome DELA / rodada final (§1.7, correcção O-1) — o nome
    // é o da Ong, não o do monstro que tinha a vez no golpe fatal.
    /* Correcções finais T1.5 (EXP-R1): com o Supervisor congelado
       o indicador também diz «FIM» — estado terminal honesto; o
       nome e a rodada seguem a regra de sempre (só batalhaFim os
       troca), sem tocar em mais nada. */
    $('vez-rotulo').textContent = (batalhaFim || supCongelado) ? 'FIM' : 'VEZ DE';
    $('vez-nome').textContent = batalhaFim ? nomeCena(PROPRIA) : nomeCena(vezAtual);
    $('vez-rodada').textContent = 'R' + rodada;
  }

  function selecionar(id) { selecionada = id; view.select(id); }

  /* ---------- alcance: BFS da demo (aproximação declarada) ----------
   * Quatro vizinhos, bordas da área e casas ocupadas por outras figuras.
   * Devolve casas do MOTOR (x,y,passos,path); a conversão para a vista
   * acontece só no adaptador, ao desenhar e ao mandar andar. */
  /* Generalização (T1.3): a BFS recebe a figura e o teto em casas —
     a Ong usa o teto da reserva dela; a IA usa a reserva interna do
     monstro. Todas as casas ocupadas bloqueiam (a da Ong e as dos
     outros monstros): ninguém anda para cima de ninguém. */
  function calcularAlcancePara(id, tetoCasas) {
    const s = view.getState();
    const u = s.units.find(v => v.id === id);
    if (!u) return new Map();
    const ocupadas = new Set(s.units.filter(v => v.id !== u.id)
      .map(v => chave(v.posicao.x, v.posicao.y)));
    const inicio = { x: u.posicao.x, y: u.posicao.y, passos: 0, path: [] };
    const vistos = new Map([[chave(inicio.x, inicio.y), inicio]]);
    const fila = [inicio];
    for (let i = 0; i < fila.length; i++) {
      const p = fila[i];
      if (p.passos >= tetoCasas) continue;
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
  function calcularAlcance() {
    return calcularAlcancePara(selecionada, Math.floor(reservaMovimento / CASA_M));
  }
  function desenharAlcance() {
    view.showMovement(ajudaGrid ? [...alcance.values()].map(casaVista) : []);
  }
  /* Mapa de distâncias (T1.3 §4.1): BFS a partir de uma figura, com
     os passos até TODAS as casas — as casas ocupadas contam como
     destino e a medição atravessa-as: é a régua de PONTUAÇÃO da IA
     (§2.2), que tem de pontuar também as casas atrás de corpos
     (aceite §7.8: com as casas a distância 1 ocupadas, o monstro
     pára mais longe em vez de nem se mexer). Quem anda é a BFS de
     alcance (calcularAlcancePara), que essa sim exclui ocupadas. */
  function mapaDistancias(id) {
    const s = view.getState();
    const eu = s.units.find(v => v.id === id);
    if (!eu) return new Map();
    const vistos = new Map([[chave(eu.posicao.x, eu.posicao.y), 0]]);
    const fila = [{ x: eu.posicao.x, y: eu.posicao.y, passos: 0 }];
    for (let i = 0; i < fila.length; i++) {
      const p = fila[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = p.x + dx, y = p.y + dy, k = chave(x, y);
        if (x < AREA.origin.x || x >= AREA.origin.x + AREA.cols
          || y < AREA.origin.y || y >= AREA.origin.y + AREA.rows
          || vistos.has(k)) continue;
        vistos.set(k, p.passos + 1);
        fila.push({ x, y, passos: p.passos + 1 });
      }
    }
    return vistos;
  }
  /* Distância pela grelha entre duas figuras (passos; Infinity se
     não houver caminho), com as outras figuras a BLOQUEAR a
     passagem e a casa do destino a contar como destino — a
     métrica que a casca sempre usou (o antigo distanciaAte,
     generalizado): é ela que governa o portão do Atacar dela
     (T1.4 §2.4: "a BFS da casca com casas ocupadas"). Não é a
     leitura do mapa de pontuação: as duas réguas diferem de
     propósito, e a diferença fica registada nas NOTAS. */
  function distanciaEntre(deId, paraId) {
    const s = view.getState();
    const eu = s.units.find(v => v.id === deId);
    const ele = s.units.find(v => v.id === paraId);
    if (!eu || !ele) return Infinity;
    const bloqueadas = new Set(s.units
      .filter(v => v.id !== deId && v.id !== paraId)
      .map(v => chave(v.posicao.x, v.posicao.y)));
    const destino = chave(ele.posicao.x, ele.posicao.y);
    const vistos = new Map([[chave(eu.posicao.x, eu.posicao.y), 0]]);
    const fila = [{ x: eu.posicao.x, y: eu.posicao.y, passos: 0 }];
    for (let i = 0; i < fila.length; i++) {
      const p = fila[i];
      if (chave(p.x, p.y) === destino) return p.passos;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = p.x + dx, y = p.y + dy, k = chave(x, y);
        if (x < AREA.origin.x || x >= AREA.origin.x + AREA.cols
          || y < AREA.origin.y || y >= AREA.origin.y + AREA.rows
          || vistos.has(k) || bloqueadas.has(k)) continue;
        vistos.set(k, p.passos + 1);
        fila.push({ x, y, passos: p.passos + 1 });
      }
    }
    return vistos.has(destino) ? vistos.get(destino) : Infinity;
  }
  /* A distância da Ong até um alvo — as chamadas antigas ficam com
     o comportamento de sempre, agora por cima de distanciaEntre. */
  function distanciaAte(alvoId) { return distanciaEntre(PROPRIA, alvoId); }

  /* ---------- números de dano flutuantes (por parcela) ----------
   * Ao Confirmar um acerto da Ong, saem da figura atacada números
   * separados por TIPO de parcela, cada tipo com cor/rótulo próprios:
   * cada dado da EXPRESSÃO DA FICHA dela aparece com a sua face, o
   * termo constante da expressão sai como parcela própria, e um
   * total (a soma das parcelas DELA) fecha a sequência, maior.
   * São TODOS valores de quem ataca — nenhum dado do alvo entra.
   * Os números seguem a posição projectada da figura atacada
   * (projectUnit da cena) enquanto sobem e desvanecem, actualizados
   * por requestAnimationFrame. O interruptor "Números de dano" vive
   * no pop-up ⚙ (opção, nunca na barra); desligado, mostrarDano nem
   * é chamado — o efeito de impacto (anel curto) é outra coisa: é o
   * estalo visual do acerto, sem números. Golpes DOS monstros não
   * geram flutuantes: marcam-se com o impacto + a frase (T1.3). */
  const danosEl = $('danos');
  const flutuantes = [];   // { el, id, dx, atraso, dur, tipo, t0 }
  let rafDanos = 0;
  function lancarFlutuante(el, id, dx, atraso, dur, tipo) {
    el.style.opacity = '0';
    danosEl.appendChild(el);
    flutuantes.push({ el, id, dx, atraso, dur, tipo, t0: performance.now() });
    if (!rafDanos) rafDanos = requestAnimationFrame(tickFlutuantes);
  }
  function mostrarImpacto(id) {
    const el = document.createElement('span');
    el.className = 'impacto';
    el.innerHTML = '<i></i>';
    lancarFlutuante(el, id, 0, 0, 480, 'impacto');
  }
  function mostrarDano(id, parcelas) {
    /* Com a expressão real dela são 10 flutuantes (8 dados + bónus +
       total): o desfasamento e a dispersão apertam para a sequência
       caber legível em ≈2 s e a 390 px de largura (aceite A9 da
       T1.4) — e o tick, abaixo, prende a posição ao ecrã. */
    let atraso = 40, total = 0;
    parcelas.forEach((p, i) => {
      total += p.valor;
      const el = document.createElement('span');
      el.className = 'dano t-' + p.classe;
      el.innerHTML = `<b>${p.valor}</b><small>${p.rotulo}</small>`;
      lancarFlutuante(el, id, (i - (parcelas.length - 1) / 2) * 22, atraso, 1100, 'dano');
      atraso += 100;
    });
    const el = document.createElement('span');
    el.className = 'dano t-total';
    el.innerHTML = `<b>${total}</b><small>total</small>`;
    lancarFlutuante(el, id, 0, atraso, 1000, 'dano');
    return total;
  }
  function tickFlutuantes(agora) {
    rafDanos = 0;
    for (let i = flutuantes.length - 1; i >= 0; i--) {
      const f = flutuantes[i];
      const t = agora - f.t0 - f.atraso;
      if (t < 0) continue;
      const prog = t / f.dur;
      if (prog >= 1) { f.el.remove(); flutuantes.splice(i, 1); continue; }
      const r = view.projectUnit(f.id);
      if (!r) { f.el.style.opacity = '0'; continue; }
      let cx = (r.left + r.right) / 2 + f.dx;
      /* Nenhum flutuante nasce fora do ecrã (aceite A9): junto à
         borda, a dispersão horizontal prende-se à largura visível. */
      if (f.tipo === 'dano') cx = Math.max(28, Math.min(innerWidth - 28, cx));
      if (f.tipo === 'impacto') {
        const cy = r.top + (r.bottom - r.top) * .55;
        f.el.style.transform = `translate(${cx}px, ${cy}px)`;
        f.el.style.opacity = String(1 - prog);
      } else {
        const cy = r.top - 6 - prog * 54;
        f.el.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-100%)`;
        f.el.style.opacity = String(prog < .6 ? 1 : 1 - (prog - .6) / .4);
      }
    }
    if (flutuantes.length) rafDanos = requestAnimationFrame(tickFlutuantes);
  }
  /* ---------- a reserva de movimento dela (T1.3 §3) ---------- */
  const fmtM = m => (Math.round(m * 10) / 10).toFixed(1).replace('.', ',') + ' m';
  function fraseRestante() {
    return `A mover <b>Ong</b> · restam <b>${fmtM(reservaMovimento)}</b> — toca numa casa acesa ou anda pelas <b>setas do teclado</b>, casa a casa. As setas seguem o mapa.`;
  }
  function entrarMover() {
    const u = unidade(selecionada);
    if (!u) return;
    if (estado === 'movendo' || view.getState().moving) { say('Espera — a figura ainda está a andar.'); return; }
    if (reservaMovimento < CASA_M) {
      say(`A <b>Ong</b> andou os ${fmtM(DESLOCAMENTO_ONG_M)} desta vez — prime <b>Atacar</b> ou <b>Encerrar</b>.`);
      return;
    }
    alcance = calcularAlcance();
    estado = 'mover';
    desenharAlcance();
    renderAcoes();
    say(fraseRestante());
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
  /* Reserva esgotada: o modo Mover fecha sozinho para a base. */
  function esgotarReserva() {
    sairMover();
    say(`A <b>Ong</b> andou os ${fmtM(DESLOCAMENTO_ONG_M)} desta vez — prime <b>Atacar</b> ou <b>Encerrar</b>.`);
  }
  /* Um passo de seta (§3.4): uma casa na direcção da GRELHA (nunca
     da câmera), pela mesma API e pelo mesmo adaptador do toque.
     Enquanto o passo anima, pressões novas ignoram-se em silêncio
     (excepção escrita à lei do silêncio: é ruído de repetição de
     tecla; segurar a seta anda passo a passo, um por passo acabado). */
  function passoSeta(dx, dy) {
    if (supCongelado) return;   // pós-críticos T1.5: gelo selado também nas setas
    if (passoEmCurso) return;
    const u = unidade(PROPRIA);
    if (!u) return;
    if (reservaMovimento < CASA_M) { supRegistar('bloqueada', { acao: 'mover', actor: PROPRIA, razao: 'Reserva de movimento esgotada' }); esgotarReserva(); return; }
    const nx = u.posicao.x + dx, ny = u.posicao.y + dy;
    if (nx < AREA.origin.x || nx >= AREA.origin.x + AREA.cols
      || ny < AREA.origin.y || ny >= AREA.origin.y + AREA.rows) {
      supRegistar('bloqueada', { acao: 'mover', actor: PROPRIA, razao: 'Casa fora da arena' });
      say('Fim do campo por aí.');
      return;
    }
    const ocupada = view.getState().units.some(v =>
      v.id !== PROPRIA && v.posicao.x === nx && v.posicao.y === ny);
    if (ocupada) { supRegistar('bloqueada', { acao: 'mover', actor: PROPRIA, razao: 'Casa ocupada' }); say('Essa casa está ocupada.'); return; }
    passoEmCurso = true;
    supPartidaMovimentoOng({ x: nx, y: ny }, 1);
    view.move(PROPRIA, casaVista({ x: nx, y: ny }), {
      path: [casaVista({ x: nx, y: ny })], durationMs: 200
    });
  }

  /* ---------- máquina de turnos (T1.3 §1) ---------- */
  const aguardar = ms => new Promise(res => setTimeout(res, ms));
  function fraseEsperaVez() {
    say(batalhaFim
      ? 'A batalha acabou — prime <b>Recomeçar</b>.'
      : `É a vez de <b>${nomeCena(vezAtual)}</b> — espera que ele aja.`);
  }
  function iniciarVez(id) {
    vezAtual = id;
    atacou = false;
    reservaMovimento = DESLOCAMENTO_ONG_M;   // a reserva nasce cheia, não acumula
    ataquePendente = null;
    estado = 'base';
    atualizarVez(); renderAcoes();
    autoJaMoveu = false;              // T1.5: a vez nova repõe o movimento automático
    autoAtaqueEmCurso = false;
    if (id === PROPRIA) agendarPassoAuto();   // T1.5: hook do Modo automático (desligado, não agenda)
    supSnapshot();                    // Supervisor: ponto de retorno deste turno
  }
  /* Único sítio onde a vez muda (com iniciarVezIA e o arranque). */
  function passarVez() {
    seqTurno++;                       // invalida qualquer sequência antiga
    indiceVez = (indiceVez + 1) % ordem.length;
    if (indiceVez === 0) rodada++;
    ataquePendente = null;
    const seguinte = ordem[indiceVez];
    if (seguinte === PROPRIA) {
      iniciarVez(PROPRIA);
      say(`É a vez da <b>Ong</b> (rodada ${rodada}).`);
    } else {
      // Depois da vez dela, o anúncio da vez seguinte traz a frase
      // do Encerrar (§1.4) — as duas contam-se numa linha só.
      iniciarVezIA(seguinte, vezAtual === PROPRIA);
    }
  }

  /* ---------- a vez e a IA básica dos monstros (T1.3 §2) ----------
   * Comportamento único e simples, igual para os três (D-13.8): ao
   * alcance → ataca; senão anda até gastar a reserva interna ou
   * entrar no alcance, e ataca se lá chegar. Sem fugir, sem outro
   * alvo (só há a Ong), sem técnicas. A sequência é estritamente
   * serial e vive sob o símbolo de geração seqTurno (G-13.4). */
  function iniciarVezIA(id, aposOng) {
    vezAtual = id;
    estado = 'vez-ia';
    if (fichaAberta) fecharFicha();          // D-13.12: a vez dele apresenta-se em ecrã limpo
    atualizarVez(); renderAcoes();
    say(aposOng
      ? `Vez da <b>Ong</b> encerrada — a batalha continua. Vez de <b>${nomeCena(id)}</b>.`
      : `Vez de <b>${nomeCena(id)}</b>.`);
    supSnapshot();                    // Supervisor: ponto de retorno deste turno
    const minhaSeq = ++seqTurno;
    aguardar(ESPERA_ANUNCIO_MS).then(() => {
      if (seqTurno !== minhaSeq || batalhaFim) return;   // vez morta: silêncio
      vezDaIA(id, minhaSeq);
    });
  }
  function vezDaIA(id, seq) {
    if (distanciaEntre(id, PROPRIA) <= ALCANCE_IA_TEST) {
      agendarAtaqueIA(id, seq);              // já ao alcance: não anda, ataca
      return;
    }
    const destino = escolherDestinoIA(id);
    if (!destino) {
      say(`<b>${nomeCena(id)}</b> não consegue aproximar-se.`);
      fimDaVezIA(seq);
      return;
    }
    /* Supervisor: o destino da IA tem de caber na reserva dela. */
    if (destino.passos > (ORCAMENTOS[id] || 4)) {
      supRegistar('bloqueada', { acao: 'mover', actor: id, razao: 'Destino além da reserva do monstro' });
      fimDaVezIA(seq);
      return;
    }
    contextoIA = { id, seq, destino: { x: destino.x, y: destino.y }, relogio: setTimeout(() => relogioIA(id, seq), GUARDA_IA_MS) };
    /* Supervisor (pós-críticos T1.5): o movimento LEGAL do monstro
       também entra no registo — actor, de→para e passos. */
    { const uIA = unidade(id);
      supRegistar('accao', { acao: 'mover', actor: id,
        de: uIA ? { x: uIA.posicao.x, y: uIA.posicao.y } : null,
        para: { x: destino.x, y: destino.y }, passos: destino.passos }); }
    try {
      view.move(id, casaVista(destino), {
        path: destino.path.map(casaVista),
        durationMs: Math.min(1700, Math.max(220, destino.passos * 190))
      });
    } catch (_) {
      // G-13.5: a cena recusou o movimento — a vez sobrevive.
      consumirContextoIA(id);
      say(`<b>${nomeCena(id)}</b> não conseguiu andar.`);
      fimDaVezIA(seq);
    }
  }
  /* O ataque depois da espera de separação (chegou → ataque). Vive
     sob um contexto de ataque próprio: atacarIA só corre com o par
     (seq corrente + contexto vivo) — consumo único, G-13.3(d). */
  function agendarAtaqueIA(id, seq) {
    contextoIA = { id, seq, relogio: null };
    aguardar(ESPERA_ATAQUE_MS).then(() => {
      if (seqTurno !== seq || batalhaFim) { if (contextoIA && contextoIA.seq === seq) contextoIA = null; return; }
      if (!contextoIA || contextoIA.id !== id || contextoIA.seq !== seq) return;
      contextoIA = null;
      atacarIA(id, seq);
      if (!batalhaFim) fimDaVezIA(seq);      // se ela caiu, não há vez seguinte
    });
  }
  /* Consumo único da conclusão do movimento (G-13.3(d)): quem chega
     primeiro — o tratador de moveend ou o relógio de guarda — consome
     o contexto atomicamente e desarma o outro caminho. */
  function consumirContextoIA(id) {
    if (!contextoIA || contextoIA.id !== id) return null;
    const ctx = contextoIA;
    contextoIA = null;
    if (ctx.relogio) clearTimeout(ctx.relogio);
    return ctx;
  }
  function relogioIA(id, seq) {
    // G-13.3(b): o moveend não veio em 5 s — trata como chegado sem
    // movimento, para a vez nunca ficar presa.
    const ctx = consumirContextoIA(id);
    if (!ctx || ctx.seq !== seq || seqTurno !== seq || batalhaFim) return;
    say(`<b>${nomeCena(id)}</b> não conseguiu andar.`);
    fimDaVezIA(seq);
  }
  /* Idempotente por geração: só a primeira chamada com a seq
     corrente marca a conclusão (posta ANTES de agendar) e agenda a
     passagem; as seguintes são ignoradas em silêncio. */
  function fimDaVezIA(seq) {
    if (batalhaFim || vezIAFechada === seq) return;
    vezIAFechada = seq;
    aguardar(ESPERA_FIM_MS).then(() => {
      if (batalhaFim || seqTurno !== seq) return;
      passarVez();
    });
  }
  /* Destino do andar (§2.2): entre as casas alcançáveis pela BFS
     dele (ocupadas excluídas), a de menor distância à Ong lida de
     mapaDistancias(PROPRIA) calculado uma vez; desempate por menos
     passos, depois pela ordem determinística da BFS. Se nenhuma
     casa alcançável melhorar a distância actual, não anda. */
  function escolherDestinoIA(id) {
    const eu = unidade(id);
    if (!eu) return null;
    const distOng = mapaDistancias(PROPRIA);
    const distActual = distOng.get(chave(eu.posicao.x, eu.posicao.y));
    let melhor = null;
    for (const c of calcularAlcancePara(id, ORCAMENTOS[id] || 4).values()) {
      const d = distOng.get(chave(c.x, c.y));
      if (d === undefined) continue;
      if (!melhor || d < melhor.d || (d === melhor.d && c.passos < melhor.destino.passos))
        melhor = { d, destino: c };
      if (melhor.d <= ALCANCE_IA_TEST) break;   // 1 é o mínimo possível: a casa dela está ocupada
    }
    if (!melhor) return null;
    if (distActual !== undefined && melhor.d >= distActual) return null;
    return melhor.destino;
  }
  /* O ataque da IA (§2.3 com a resolução da T1.4 §4): o teste e o
     dano rolam-se INTERNAMENTE, no sistema dele — 1d6 + bónus de
     teste contra a Defesa DELA, dano = a expressão da ficha dele
     por rolarExpressao, usado só como total. Mostra-se apenas o
     resultado narrado e, no acerto, o total que ELA perdeu — na
     frase do momento e como delta do Perdido da ficha dela
     (fronteira EM-P3: agregado por monstro é proibido). Sem
     flutuantes do monstro: o golpe marca-se com o impacto. */
  function atacarIA(id, seq) {
    const c = COMBATE_TEST[id];
    /* Supervisor: o ataque da IA também é validado antes — sem
       alcance, não acontece (a vez fecha pelo caminho normal). */
    if (distanciaEntre(id, PROPRIA) > ALCANCE_IA_TEST) {
      supRegistar('bloqueada', { acao: 'ataque', actor: id, razao: 'Monstro fora de alcance da Ong' });
      return;
    }
    let teste = 0;
    for (let i = 0; i < c.atkQtd; i++) teste += 1 + Math.floor(Math.random() * c.atkFaces);
    const acerta = teste + bonusTeste(c) >= defesaDe(PROPRIA);
    const verbos = FRASES_IA[id];
    if (!acerta) {
      /* Supervisor (pós-críticos T1.5): o ataque LEGAL do monstro
         entra no registo — actor, alvo e falha (sem Defesas nem
         constantes internas). */
      supRegistar('accao', { acao: 'ataque', actor: id, alvo: PROPRIA, acerto: false });
      say(`<b>${nomeCena(id)}</b> ${verbos.falha} a <b>Ong</b> e falhou.`);
      return;
    }
    mostrarImpacto(PROPRIA);
    const rIA = rolarExpressao(c.dano);
    /* Supervisor: parcelas = total — se não bater, a batalha
       congela e a resolução ABORTA neste tick (sem sofrerDano). */
    if (!supConferirSoma(rIA.parcelas, rIA.total, id)) return;
    const total = rIA.total;
    supRegistar('accao', { acao: 'ataque', actor: id, alvo: PROPRIA, acerto: true, dano: total });
    const caiu = sofrerDano(total);
    if (caiu) return;                        // fimDeBatalha já disse a frase final
    say(`<b>${nomeCena(id)}</b> ${verbos.acerto} a <b>Ong</b> — ela perdeu <b>${total}</b> de vida.`);
  }
  /* Soma o dano a danoSofrido (a ficha e a barra do chip lêem daqui)
     e verifica a queda. Devolve true se ela caiu. */
  function sofrerDano(total) {
    danoSofrido += total;
    atualizarChipVida();
    if (danoSofrido >= FICHAS.ong.vida.total) { fimDeBatalha(); return true; }
    return false;
  }
  function atualizarChipVida() {
    const barra = chipEl.querySelector('.bar.vida i');
    if (barra) barra.style.width =
      Math.max(0, Math.round((FICHAS.ong.vida.total - danoSofrido) / FICHAS.ong.vida.total * 100)) + '%';
  }
  /* Fim de batalha (§1.7): nesta vista os monstros não têm vida —
     a batalha só termina se a Ong cair. A máquina pára onde está. */
  function fimDeBatalha() {
    /* Supervisor (pós-críticos T1.5): evento TERMINAL do fim
       natural — o registo passa a provar que a batalha acabou. */
    supRegistar('fim', { actor: PROPRIA, danoSofrido });
    batalhaFim = true;
    seqTurno++;                              // invalida continuações pendentes
    if (contextoIA) consumirContextoIA(contextoIA.id);
    view.setVivo(PROPRIA, false);
    estado = 'fim';
    atualizarVez(); renderAcoes();
    say('A <b>Ong</b> caiu — fim desta batalha. Prime <b>Recomeçar</b> para jogar outra vez.');
  }

  /* ---------- acções da faixa ---------- */
  /* Handler nomeado (T1.5): o clique da faixa e o controlador do
     Modo automático chamam a MESMA função — o pipeline legal é um
     só; o automático não duplica resolução nenhuma. */
  function tratarAcao(acao) {
    const u = unidade(selecionada);
    /* Supervisor: batalha congelada — só o Recomeçar AGE; as
       outras acções não mutam nada, mas respondem com a frase do
       mundo (EXP-R1: pós-gelo, silêncio é proibido nesta casca). */
    if (supCongelado) {
      if (acao === 'recomecar') location.reload();
      else say('A batalha parou — prime <b>Recomeçar</b>.');
      return;
    }
    /* Guarda de vez (§1.5): na vez de um monstro, cliques em botões
       da faixa (incl. botões obsoletos da transição de renderização)
       só produzem a frase de espera. Excepção EM-P2: no estado
       'fim', a acção recomecar NUNCA é bloqueada. */
    if (acao === 'recomecar') { location.reload(); return; }
    if (vezAtual !== PROPRIA || batalhaFim) { fraseEsperaVez(); return; }
    /* Supervisor do Comestre (T1.5): TODA a acção é validada ANTES
       de acontecer. Bloqueio registado no Supervisor; nos bloqueios
       "moles" o caminho existente continua e recusa com a frase de
       sempre, sem efeito nenhum; nos "duros" (caminhos sem recusa
       própria) a acção pára aqui, com o estado intacto. */
    const bloqueioSup = supValidarAcaoOng(acao);
    if (bloqueioSup) {
      supRegistar('bloqueada', { acao, actor: PROPRIA, razao: bloqueioSup.razao });
      if (bloqueioSup.duro) return;
    } else {
      supRegistar('accao', { acao, actor: PROPRIA });
    }
    if (acao === 'voltar') { estado = 'base'; ataquePendente = null; renderAcoes(); say('É a vez da <b>Ong</b>.'); return; }
    if (acao === 'mover') { entrarMover(); return; }
    if (acao === 'cancelar') {
      const restavam = fmtM(reservaMovimento);
      sairMover();
      say(`Ficas por aqui — restavam <b>${restavam}</b> nesta vez.`);
      return;
    }
    if (acao === 'parar') {
      // A API nova não tem stop(): uma ordem nova cancela a fila anterior.
      // Parar = fixar já na última casa confirmada (sincronização imediata).
      // "A parar…" diz-se ANTES do move (R-T1-1): o move imediato dispara
      // moveend sincronamente dentro da cena, e é a frase final dele
      // ("…parou."), pintada depois, que tem de ficar na linha.
      parado = true;
      say('A parar…');
      if (u) { epocaMovimentoOng = supEpoca; view.move(selecionada, casaVista(u.posicao), { immediate: true }); }
      return;
    }
    if (acao === 'atacar') {
      if (estado === 'movendo' || view.getState().moving) { say('Espera — a figura ainda está a andar.'); return; }
      if (atacou) { say('A <b>Ong</b> já atacou nesta vez — prime <b>Encerrar</b> para fechar a vez dela.'); return; }
      if (!alvo) { say('Primeiro <b>toca no inimigo</b> que queres atacar — ele fica marcado como alvo.'); return; }
      if (distanciaAte(alvo) > COMBATE_TEST.ong.alcance) {
        say(`<b>${nomeCena(alvo)}</b> está longe demais — aproxima-te com <b>Mover</b> antes de atacar.`);
        return;
      }
      estado = 'atacar'; renderAcoes();
      say(`Atacar <b>${nomeCena(alvo)}</b> com a <b>Ong</b> · escolhe o ataque na faixa.`);
      return;
    }
    if (acao === 'consumivel') {
      estado = 'consumivel'; renderAcoes();
      say('Itens · a <b>Ong</b> não tem nada para usar agora.');
      return;
    }
    if (acao === 'ataque-basico') {
      /* O teste DELA rola NA HORA, de verdade (T1.4 §1.1): a face é
         sorteada (1–6, uniforme) e somada ao bónus de teste dela; o
         resultado guarda-se em ataquePendente e NÃO se revela antes
         do Confirmar. A frase mostra só a fórmula e a rolagem DELA
         — a Defesa do alvo nunca aparece (lei anti-metagame), e sem
         o limiar ela não consegue saber se acertou. */
      const c = COMBATE_TEST.ong;
      let face = 0;
      for (let i = 0; i < c.atkQtd; i++) face += 1 + Math.floor(Math.random() * c.atkFaces);
      const total = face + bonusTeste(c);
      ataquePendente = { tipo: 'chicote', nome: c.arma, face, total, acerta: total >= defesaDe(alvo) };
      /* Supervisor (pós-críticos T1.5): a rolagem PÚBLICA dela
         (face e total, os mesmos da frase) entra no registo. */
      supRegistar('accao', { acao: 'ataque-basico', actor: PROPRIA, alvo, face, total });
      estado = 'rolagem'; renderAcoes();
      say(`${c.arma} de <b>Ong</b> contra <b>${nomeCena(alvo)}</b> · <b>1d6+${bonusTeste(c)} → ${face} + ${bonusTeste(c)} = ${total}</b> · o Mestre confirma se acertou.`);
      return;
    }
    if (acao === 'transformacao') {
      /* Não é um ataque: não pede alvo nem alcance; é a acção dela
         sobre si própria e consome o atacar da vez (no Confirmar).
         Já transformada, o botão recusa aqui mesmo, com frase. */
      if (transformada) { say('A <b>Ong</b> já está transformada.'); return; }
      const t = COMBATE_TEST.ong.transformacao;
      const livre = FICHAS.ong.alma.total - FICHAS.ong.alma.comprometido - paGasto;
      ataquePendente = { tipo: 'transformacao', nome: 'Transformação' };
      estado = 'rolagem'; renderAcoes();
      say(livre >= t.custo
        ? `Transformação · custa <b>${t.custo} PA</b> dos ${livre} livres — ficarias com <b>${livre - t.custo}</b> de alma livre · o Chicote passa a 8d6+34 e a Defesa dela sobe.`
        : `Transformação · custa <b>${t.custo} PA</b> e a alma livre dela é ${livre} — não chega.`);
      return;
    }
    if (acao === 'confirmar') {
      const pend = ataquePendente;
      ataquePendente = null;
      if (!pend) { estado = 'base'; renderAcoes(); say('É a vez da <b>Ong</b>.'); return; }
      if (pend.tipo === 'transformacao') {
        /* O débito é REAL (T1.4 §3.3): paGasto escreve-se e a ficha
           compõe o PA livre a partir dele. Sem alma que chegue,
           recusa sem debitar e sem forçar (pagamento forçado com
           Exaustão fica fora desta tranche, declarado nas NOTAS). */
        const t = COMBATE_TEST.ong.transformacao;
        const livre = FICHAS.ong.alma.total - FICHAS.ong.alma.comprometido - paGasto;
        estado = 'base'; renderAcoes();
        if (transformada) { say('A <b>Ong</b> já está transformada.'); return; }
        if (livre < t.custo) { say(`Alma livre não chega — a Transformação custa ${t.custo} PA.`); return; }
        paGasto += t.custo;
        transformada = true;
        atacou = true;                 // transformar consome a acção do turno
        say(`<b>Transformação</b> · a <b>Ong</b> transformou-se — gastou <b>${t.custo} PA</b> (alma livre: ${livre - t.custo}). O Chicote passa a 8d6+34.`);
        return;
      }
      // Chicote: o Confirmar REVELA a resolução já computada (D-14.2).
      // O alcance revalida-se com o alcance real da arma dela (6).
      if (!alvo || distanciaAte(alvo) > COMBATE_TEST.ong.alcance) {
        estado = 'base'; renderAcoes();
        say('O alvo está longe demais — aproxima-te com <b>Mover</b> e tenta outra vez.');
        return;
      }
      atacou = true;                   // a acção gasta-se, acerte ou erre
      estado = 'resultado'; renderAcoes();
      if (!pend.acerta) {
        // Falha: sem impacto, sem flutuantes, sem dano.
        say(`<b>Falha</b> · ${pend.nome} não atinge ${ALVO_NOME[alvo] || nomeCena(alvo)}.`);
        return;
      }
      mostrarImpacto(alvo);
      const r = rolarExpressao(expressaoOng());
      /* Supervisor: parcelas = total — se não bater, a batalha
         congela e a resolução ABORTA neste tick (sem dano). */
      if (!supConferirSoma(r.parcelas, r.total, PROPRIA)) return;
      supRegistar('accao', { acao: 'ataque', actor: PROPRIA, alvo, acerto: true, dano: r.total });
      const total = numerosDano ? mostrarDano(alvo, r.parcelas) : null;
      say(`<b>Acerto</b> · ${pend.nome} atinge ${ALVO_NOME[alvo] || nomeCena(alvo)}.` +
        (total != null ? ' As parcelas do dano saem da figura em números.' : ''));
      return;
    }
    if (acao === 'continuar') {
      estado = 'base'; renderAcoes();
      say(atacou
        ? 'A <b>Ong</b> já atacou nesta vez — prime <b>Encerrar</b> para fechar a vez dela.'
        : 'É a vez da <b>Ong</b>.');
      return;
    }
    if (acao === 'encerrar') {
      // Fecha a vez dela e PASSA A VEZ ao próximo da ordem (§1.4):
      // a frase do Encerrar viaja no anúncio da vez seguinte.
      passarVez();
      return;
    }
  }
  acoesEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-acao]');
    if (!btn) return;   // clique no texto da faixa não é gesto (EM-P4)
    tratarAcao(btn.dataset.acao);
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
      // A vida e o PA livre compõem-se do tempo de corrida: a vida
      // perdida é danoSofrido (T1.3) e a alma livre é Total −
      // Comprometido − paGasto (T1.4) — a ficha e a frase nunca
      // contam histórias diferentes.
      const vidaAtual = f.vida.total - danoSofrido;
      const almaLivre = f.alma.total - f.alma.comprometido - paGasto;
      corpo = `
        <div class="rec"><div class="rt"><span>VIDA</span><b>${vidaAtual}/${f.vida.total}</b></div>
          <div class="bar vida"><i style="width:${Math.round(vidaAtual / f.vida.total * 100)}%"></i></div>
          <small>Perdido: ${danoSofrido}</small></div>
        <div class="rec"><div class="rt"><span>ALMA · PA LIVRE</span><b>${almaLivre}</b></div>
          <div class="bar alma"><i style="width:${Math.round(almaLivre / f.alma.total * 100)}%"></i></div>
          <small>Total ${f.alma.total} · Comprometido ${f.alma.comprometido}</small></div>
        <h2>Resumo de combate</h2>
        <div class="resumo">
          <div class="ca"><b>${f.ca}</b><span>CA</span></div>
          <div class="rgrid">
            <div><span>DESLOCAMENTO</span><b>${f.desloc}</b></div>
            <div><span>INICIATIVA</span><b>${f.ini}</b></div>
            <div><span>ATAQUE</span><b>${f.ataque}</b></div>
          </div>
        </div>
        <h2>Atributos</h2>
        <div class="attrs">${f.attrs.map(([n, v]) => `<div><b>${v}</b><span>${n}</span></div>`).join('')}</div>
        <h2>Técnicas</h2>
        ${f.tecnicas.map(([n, c]) => `<div class="tec"><span>${n}</span><em>${c}</em></div>`).join('')}
        <footer>Ficha Base</footer>`;
    } else {
      /* Cartão de vista, tipo Pokédex: só onde se encontra e como é
         por fora. NENHUM campo mecânico — este ramo lê apenas
         v.onde / v.aparencia / v.frase / v.imagem (e nome/sub no
         cabeçalho). A ilustração entra logo a seguir ao cabeçalho,
         antes de "Onde se encontra" (primeiro vê-se, depois lê-se),
         e só quando a figura tem arte aprovada registada (v.imagem);
         sem o campo, o elemento nem é renderizado e o cartão fica
         com DOM e renderização iguais aos da T1.2. O onerror é
         atributo inline de propósito: com innerHTML a imagem começa
         a carregar na inserção e um listener tardio podia perder um
         erro rápido (ex.: 404) — ficheiro em falta nunca vira ícone
         de imagem partida. */
      const retratoVista = v.imagem
        ? `<figure class="retrato-vista"><img src="${v.imagem}" alt="Ilustração de ${v.nome}" onerror="this.closest('figure').remove()"></figure>`
        : '';
      corpo = `
        ${retratoVista}
        <h2>Onde se encontra</h2>
        <p class="vista">${v.onde}</p>
        <h2>Como ele é</h2>
        <p class="vista">${v.aparencia}</p>
        <p class="vista">${v.frase}</p>`;
    }
    fichaEl.innerHTML = `
      <header><div><h1>${f ? f.nome : v.nome}</h1><div class="sub">${f ? f.sub : v.sub}</div></div>${fechar}</header>
      ${corpo}`;
    fichaEl.hidden = false;
    chipEl.hidden = true;
  }
  function fecharFicha() { fichaAberta = null; fichaEl.hidden = true; chipEl.hidden = false; }
  fichaEl.addEventListener('click', e => { if (e.target.closest('[data-fechar]')) fecharFicha(); });
  chipEl.addEventListener('click', () => {
    /* Supervisor (pós-críticos T1.5, Conflitos A1): batalha
       congelada — o chip não muta NADA (sem estado novo, sem
       apagar ataquePendente, sem repintar a faixa); correcções
       finais (EXP-R1): responde com a frase do mundo, sem
       silêncio. */
    if (supCongelado) { say('A batalha parou — prime <b>Recomeçar</b>.'); return; }
    // Na vez de um monstro (ou no fim), o chip responde como os
    // toques: frase de espera (§1.5); a ficha dela vê-se antes e depois.
    if (vezAtual !== PROPRIA || batalhaFim) { fraseEsperaVez(); return; }
    // Passo de seta em curso: o toque não cancela o passo (E-T13L-2).
    if (estado === 'mover' && (passoEmCurso || view.getState().moving)) { say('Espera — ainda está a andar.'); return; }
    if (estado === 'movendo') { say(`Espera — <b>${nomeCena(selecionada)}</b> ainda está a andar.`); return; }
    if (estado === 'mover') limparAjudaMover();
    estado = 'base'; ataquePendente = null;
    selecionar(PROPRIA); abrirFicha(PROPRIA); renderAcoes();
    say('A tua ficha, <b>Ong</b>.');
  });

  /* ---------- toque no mundo: hitTest (contenção), nunca íman ----------
   * A cena devolve {unitId, cell}: a figura pela caixa projectada e a
   * casa por contenção no plano do solo — sem raio de atracção em px. */
  function tratarToque(clientX, clientY) {
    /* Supervisor (pós-críticos T1.5, Conflitos A1): batalha
       congelada — o toque não muta NADA (sem alvo novo, sem
       estado, sem abrir cartão nem ficha); correcções finais
       (EXP-R1): responde com a frase do mundo, sem silêncio. */
    if (supCongelado) { say('A batalha parou — prime <b>Recomeçar</b>.'); return; }
    fecharCfg();
    // Intercepção à entrada (§1.5/§1.7): na vez de um monstro ou no
    // fim da batalha, qualquer toque só produz a frase de espera —
    // não abre cartão, não marca alvo, não selecciona.
    if (vezAtual !== PROPRIA || batalhaFim) { fraseEsperaVez(); return; }
    // Passo de seta em curso (E-T13L-2): o toque não chama view.move
    // (a cena cancelaria a fila do passo sem o moveend dele e o
    // desconto da reserva desalinhava).
    if (estado === 'mover' && (passoEmCurso || view.getState().moving)) { say('Espera — ainda está a andar.'); return; }
    const hit = view.hitTest(clientX, clientY);
    if (estado === 'movendo') {
      say(`Espera — <b>${nomeCena(selecionada)}</b> ainda está a andar.`);
      return;
    }
    if (hit.unitId) {
      const fig = unidade(hit.unitId);
      const nome = fig ? fig.nome : nomeCena(hit.unitId);
      if (hit.unitId === PROPRIA) {
        // A própria: abre a ficha dela. Em Mover, o toque nela só diz
        // que ela já está aqui (a casa dela não é destino).
        if (estado === 'mover') {
          say('<b>Ong</b> já está aqui — toca numa casa acesa para andar.');
          return;
        }
        if (estado === 'atacar' || estado === 'rolagem' || estado === 'consumivel' || estado === 'resultado') {
          estado = 'base'; ataquePendente = null; renderAcoes();
        }
        abrirFicha(PROPRIA);
        say('A tua ficha, <b>Ong</b>.');
        return;
      }
      /* Outra figura: NUNCA se torna a figura activa (decisão do
         Mestre, 03/11 07:52). O toque abre o cartão de vista dela
         (T1.1, intacto) e marca-a como ALVO da Ong; a figura activa
         e a vez continuam a ser da Ong. Um estado pendente que esteja
         aberto repõe-se à base, com a faixa a acompanhar. */
      alvo = hit.unitId;
      if (estado === 'mover') sairMover();
      else if (estado === 'atacar' || estado === 'rolagem' || estado === 'consumivel' || estado === 'resultado') {
        estado = 'base'; ataquePendente = null; renderAcoes();
      }
      abrirFicha(hit.unitId);
      say(`<b>${nome}</b> é o teu alvo. Prime <b>Atacar</b> para a atacar com a Ong, ou <b>Mover</b> para te aproximares.`);
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
        supRegistar('bloqueada', { acao: 'mover', actor: PROPRIA, razao: 'Casa fora da reserva de movimento' });
        say(ajudaGrid
          ? 'Essa casa está longe demais — escolhe uma das <b>casas acesas</b>.'
          : `Longe demais — restam-te <b>${fmtM(reservaMovimento)}</b> nesta vez.`);
        return;
      }
      estado = 'movendo'; parado = false; renderAcoes();
      // O custo (casas do caminho) e o caminho em si ficam pendentes:
      // descontam-se uma única vez, no moveend dela (§3.3/D-13.15).
      custoPendente = destino.passos;
      caminhoPendente = destino.path;
      view.showMovement([]); view.showHover(null);
      say(`<b>${u ? u.nome : nomeCena(selecionada)}</b> está a andar…`);
      supPartidaMovimentoOng(destino, destino.passos);
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

  /* O tratador de moveend ramifica por quem andou e pelo contexto
     pendente (§4.4): três figuras podem andar nesta tranche. */
  view.on('moveend', u => {
    if (!u || batalhaFim) return;              // nada se move depois da queda
    if (supRestaurando) return;                // Supervisor: reposição não é movimento de jogo
    /* Supervisor (pós-críticos T1.5, Conflitos A2): guarda de
       ÉPOCA no moveend DELA. Se a época mudou desde a partida
       (congelamento ou restauro pelo meio), esta chegada é
       tardia: NÃO desconta reserva, NÃO repinta nada — e havendo
       restauro pendente, reafirma as posições do snapshot (a
       animação velha pode ter pousado a figura fora dele). */
    if (u.id === PROPRIA && epocaMovimentoOng !== supEpoca) {
      custoPendente = null; caminhoPendente = null;
      passoEmCurso = false; parado = false;
      supDesarmarGuardaMovimentoOng();
      if (supRestauroPendente) {
        const snapUnidades = supRestauroPendente;
        supRestauroPendente = null;
        supRestaurando = true;               // a reafirmação não é movimento de jogo
        for (const su of snapUnidades) {
          const uv = unidade(su.id);
          if (uv && (uv.posicao.x !== su.x || uv.posicao.y !== su.y))
            view.move(su.id, casaVista({ x: su.x, y: su.y }), { immediate: true });
        }
        supRestaurando = false;
        supConferirInvariantes('moveend-tardio');
      }
      return;
    }
    supConferirInvariantes('moveend');         // Supervisor: invariantes após cada movimento
    if (u.id !== PROPRIA) {
      /* Chegou um monstro. A conclusão do movimento tem UM dono:
         quem chega primeiro (este tratador ou o relógio de guarda)
         consome o contextoIA; sem contexto vivo, este moveend é
         ignorado em silêncio total — sem frase, sem ataque, sem
         fimDaVezIA (G-13.3(d)). Endurecimento E-1: um moveend cuja
         posição não é o destino registado no contexto é ignorado
         SEM consumir — nunca consome um contexto fresco da mesma
         figura; um contexto de ataque (sem destino) nunca é
         consumido por um moveend. */
      const ctx = (contextoIA && contextoIA.id === u.id && contextoIA.destino
        && u.posicao.x === contextoIA.destino.x && u.posicao.y === contextoIA.destino.y)
        ? consumirContextoIA(u.id) : null;
      if (!ctx) return;
      if (u.id !== vezAtual || ctx.seq !== seqTurno) return;   // sequência morta
      const seq = ctx.seq;
      if (distanciaEntre(u.id, PROPRIA) <= ALCANCE_IA_TEST) {
        agendarAtaqueIA(u.id, seq);          // chegou ao alcance: separa e ataca
      } else {
        say(`<b>${nomeCena(u.id)}</b> aproximou-se.`);
        fimDaVezIA(seq);
      }
      return;
    }
    /* A Ong andou — por toque (custoPendente) ou por seta
       (passoEmCurso). O desconto acontece uma única vez, aqui. */
    supDesarmarGuardaMovimentoOng();   // o moveend chegou: a guarda dela desarma
    const eraPasso = passoEmCurso;
    const foiParado = parado;
    parado = false;
    if (custoPendente != null) {
      let casas = custoPendente;
      if (foiParado && caminhoPendente) {
        // Parar cobra só as casas efectivamente andadas (D-13.15):
        // o índice da posição actual no caminho pendente, +1.
        const idx = caminhoPendente.findIndex(c => c.x === u.posicao.x && c.y === u.posicao.y);
        casas = idx >= 0 ? idx + 1 : 0;
      }
      reservaMovimento -= casas * CASA_M;
      custoPendente = null;
      caminhoPendente = null;
    }
    if (eraPasso) { passoEmCurso = false; reservaMovimento -= CASA_M; }
    if (reservaMovimento < 0) reservaMovimento = 0;
    /* O redesenho e a frase do restante só acontecem com o estado
       ACTUAL em 'mover'/'movendo' (E-T13L-3): se ela já saiu do
       Mover (Cancelar/Escape) com um passo em curso, este moveend
       apenas acertou a reserva, em silêncio. */
    if (estado === 'movendo' || estado === 'mover') {
      if (reservaMovimento < CASA_M) {
        esgotarReserva();
      } else {
        estado = 'mover';                    // chegar por toque já NÃO sai do Mover (§3.5)
        alcance = calcularAlcance();
        desenharAlcance();
        renderAcoes();
        say(foiParado
          ? `<b>Ong</b> parou. Restam <b>${fmtM(reservaMovimento)}</b> — continua a andar, ou prime <b>Cancelar</b> para voltar às acções.`
          : `<b>Ong</b> chegou. Restam <b>${fmtM(reservaMovimento)}</b> — continua a andar, ou prime <b>Cancelar</b> para voltar às acções.`);
      }
    }
    if (fichaAberta === u.id) abrirFicha(u.id);   // reabre a ficha/cartão de vista da figura que andou
    agendarPassoAuto();   // T1.5: o moveend dela retoma o Modo automático (desligado, não agenda passo novo)
  });
  view.on('camera', () => { sincronizarCamera(); mostrarZoom(); });
  view.on('zoom', () => mostrarZoom());
  view.on('stats', s => {
    $('stats').textContent = `${Math.round(s.fps)} FPS · ${s.triangles ?? '—'} triângulos · ${s.drawCalls ?? '—'} chamadas`;
    supAmostraStats(s);                      // Supervisor: fluidez (amostras e lacunas grandes)
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
  /* Correcções finais T1.5 (EXP-R1): em batalha limpa, a frase de
     sempre; havendo alertas do Supervisor, a frase só aponta para
     as configurações — existência e caminho, NUNCA o conteúdo
     (durante o jogo, nada do Supervisor na superfície: A6). */
  $('btn-alerta').addEventListener('click', () => say(supAlertas.length
    ? 'Alertas: vê nas configurações (⚙).'
    : 'Alertas: <b>nenhum</b> por agora.'));

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
      : `Ajuda do grid <b>desligada</b> — ao mover, nada acende; o toque continua a valer — a reserva desta vez é de <b>${fmtM(reservaMovimento)}</b>.`);
  });

  /* Números de dano: OPÇÃO da jogadora (configuração/preferência) —
     mora no pop-up ⚙, nunca na barra (lei do Mestre, 02/11 23:07).
     Ligada por omissão e persistida como a qualidade. Desligada,
     mostrarDano nunca é chamado: nenhum número aparece. */
  function marcarDanos() {
    const tog = $('tog-danos');
    tog.classList.toggle('on', numerosDano);
    tog.textContent = numerosDano ? 'Ligados' : 'Desligados';
    tog.setAttribute('aria-pressed', String(numerosDano));
  }
  $('tog-danos').addEventListener('click', () => {
    numerosDano = !numerosDano;
    try { localStorage.setItem('hudt1-numeros-dano', numerosDano ? 'ligado' : 'desligado'); } catch (_) {}
    marcarDanos();
    say(numerosDano
      ? 'Números de dano <b>ligados</b> — ao acertar, as parcelas do dano saem da figura atacada em números.'
      : 'Números de dano <b>desligados</b> — os acertos da Ong não mostram números.');
  });

  /* ---------- Modo automático (tranche T1.5) ----------
   * Opção das configurações rápidas, DESLIGADA por omissão e sem
   * persistência: nasce desligada em cada arranque. A linha é
   * criada aqui porque o index.html é intocável nesta tranche —
   * entra em #cfgpop, antes de #stats, com as classes existentes
   * (.cfgrow/.tog). Ligado, na vez da Ong uma IA básica de teste
   * joga por ela PELO PIPELINE LEGAL: chama tratarAcao com as
   * mesmas acções do clique e anda pelo mesmo caminho do toque.
   * Transformação e consumível NUNCA são automáticos (v1).
   * Ritmo: PASSO_AUTO_MS entre passos. Desligar sobe a geração e
   * limpa o relógio: um passo pendente nunca corre, e o moveend
   * dela com o modo desligado não agenda passo novo. Ligar e
   * desligar não dizem frase nenhuma: o único texto novo é o
   * rótulo e os estados, dentro das configurações. */
  const PASSO_AUTO_MS = 850;   // pausa entre passos automáticos (700–1000 ms)
  let modoAutomatico = false;
  let geracaoAuto = 0;         // geração do controlador: desligar invalida pendentes
  let relogioAuto = null;      // o único relógio do controlador
  let autoJaMoveu = false;     // no máximo UM movimento automático por vez dela
  let autoAtaqueEmCurso = false;   // a gaveta de ataque foi aberta pelo controlador

  const linhaAuto = document.createElement('div');
  linhaAuto.className = 'cfgrow';
  const rotuloAuto = document.createElement('span');
  rotuloAuto.className = 'cl';
  rotuloAuto.textContent = 'Modo automático';
  const botaoAuto = document.createElement('button');
  botaoAuto.type = 'button';
  botaoAuto.id = 'tog-auto';
  botaoAuto.className = 'tog';
  botaoAuto.textContent = 'Desligado';
  botaoAuto.setAttribute('aria-pressed', 'false');
  linhaAuto.appendChild(rotuloAuto);
  linhaAuto.appendChild(botaoAuto);
  cfgEl.insertBefore(linhaAuto, $('stats'));
  botaoAuto.addEventListener('click', () => definirModoAutomatico(!modoAutomatico));

  function definirModoAutomatico(ligado) {
    modoAutomatico = !!ligado;
    geracaoAuto++;                       // pendente de outra geração nunca corre
    if (relogioAuto) { clearTimeout(relogioAuto); relogioAuto = null; }
    botaoAuto.classList.toggle('on', modoAutomatico);
    botaoAuto.textContent = modoAutomatico ? 'Ligado' : 'Desligado';
    botaoAuto.setAttribute('aria-pressed', String(modoAutomatico));
    if (modoAutomatico) agendarPassoAuto();
  }
  function agendarPassoAuto() {
    if (!modoAutomatico || supCongelado || batalhaFim || vezAtual !== PROPRIA) return;
    if (relogioAuto) return;             // um passo pendente chega
    const gen = geracaoAuto;
    relogioAuto = setTimeout(() => {
      relogioAuto = null;
      if (!modoAutomatico || gen !== geracaoAuto || batalhaFim || vezAtual !== PROPRIA) return;
      passoAutomatico();
    }, PASSO_AUTO_MS);
  }
  /* O destino do movimento automático: o melhor destino da BFS
   * legal dela (calcularAlcancePara com a reserva actual), pontuado
   * pelo mapaDistancias do alvo — menor distância ao alvo, desempate
   * por menos passos e depois pela ordem da BFS. Só vale se melhorar
   * a distância actual dela ao alvo. */
  function escolherDestinoAuto(alvoId) {
    const eu = unidade(PROPRIA);
    if (!eu) return null;
    const teto = Math.floor(reservaMovimento / CASA_M);
    if (teto < 1) return null;
    const distAlvo = mapaDistancias(alvoId);
    const distActual = distAlvo.get(chave(eu.posicao.x, eu.posicao.y));
    let melhor = null;
    for (const c of calcularAlcancePara(PROPRIA, teto).values()) {
      const d = distAlvo.get(chave(c.x, c.y));
      if (d === undefined) continue;
      if (!melhor || d < melhor.d || (d === melhor.d && c.passos < melhor.destino.passos))
        melhor = { d, destino: c };
    }
    if (!melhor) return null;
    if (distActual !== undefined && melhor.d >= distActual) return null;
    return melhor.destino;
  }
  /* Um passo do controlador. Cada passo faz UMA acção do pipeline
   * e agenda o seguinte (o ritmo é o PASSO_AUTO_MS); o movimento é
   * a excepção: quem retoma é o moveend dela (hook), no fim da
   * animação. Estados pendentes ao ligar tratam-se sem inventar
   * resolução: rolagem de chicote confirma pelo pipeline,
   * resultado continua, gavetas abertas repõem-se à base antes de
   * planear. EXCEPÇÃO fechada (FID-R1): um pendente de
   * Transformação NUNCA é confirmado pelo controlador — o passo
   * só reagenda a verificação e a decisão fica manual. */
  function passoAutomatico() {
    if (!modoAutomatico || supCongelado || batalhaFim || vezAtual !== PROPRIA) return;
    if (estado === 'movendo') return;    // a animação manda: o moveend retoma
    if (estado === 'rolagem') {
      if (ataquePendente && ataquePendente.tipo === 'transformacao') { agendarPassoAuto(); return; }
      tratarAcao('confirmar'); agendarPassoAuto(); return;
    }
    if (estado === 'resultado') { tratarAcao('continuar'); agendarPassoAuto(); return; }
    if (estado === 'mover') { tratarAcao('cancelar'); agendarPassoAuto(); return; }
    if (estado === 'consumivel') { tratarAcao('voltar'); agendarPassoAuto(); return; }
    if (estado === 'atacar') {
      if (!autoAtaqueEmCurso) { tratarAcao('voltar'); agendarPassoAuto(); return; }
      autoAtaqueEmCurso = false;
      tratarAcao('ataque-basico'); agendarPassoAuto(); return;
    }
    if (estado !== 'base') return;
    if (atacou) { tratarAcao('encerrar'); return; }
    /* Alvo: o monstro vivo mais próximo por distanciaEntre; o
     * desempate é a ordem de `ordem` (a iteração segue essa ordem
     * e só um < estrito troca). Sem alvos vivos, pára estável —
     * sem ciclo e sem ecrã novo. */
    const vivos = ordem.filter(id => id !== PROPRIA && unidade(id) && unidade(id).vivo !== false);   // FID-R2: alvo VIVO, não só existente
    if (!vivos.length) return;
    let alvoId = null, menor = Infinity;
    for (const id of vivos) {
      const d = distanciaEntre(PROPRIA, id);
      if (d < menor) { menor = d; alvoId = id; }
    }
    alvo = alvoId;
    if (menor <= COMBATE_TEST.ong.alcance) {
      tratarAcao('atacar');
      if (estado === 'atacar') { autoAtaqueEmCurso = true; agendarPassoAuto(); }
      else tratarAcao('encerrar');
      return;
    }
    if (autoJaMoveu) { tratarAcao('encerrar'); return; }
    const destino = escolherDestinoAuto(alvoId);
    if (!destino) { tratarAcao('encerrar'); return; }
    autoJaMoveu = true;
    /* O movimento automático é o do toque, tal e qual: estado
     * 'movendo', custo/caminho pendentes, view.move com a mesma
     * fórmula de duração — o desconto único acontece no moveend
     * dela, como no toque. */
    const u = unidade(selecionada);
    estado = 'movendo'; parado = false; renderAcoes();
    custoPendente = destino.passos;
    caminhoPendente = destino.path;
    view.showMovement([]); view.showHover(null);
    say(`<b>${u ? u.nome : nomeCena(selecionada)}</b> está a andar…`);
    supPartidaMovimentoOng(destino, destino.passos);
    view.move(selecionada, casaVista(destino), {
      path: destino.path.map(casaVista),
      durationMs: Math.min(1200, Math.max(220, destino.passos * 140))
    });
  }

  /* ---------- Supervisor do Comestre (T1.5 — adenda do Mestre) ----------
   * Camada nativa DENTRO da casca, sentada nos chokepoints do
   * pipeline: valida TODA a acção ANTES de ela acontecer (as dela
   * por tratarAcao; o movimento por toque e por seta; a IA dos
   * monstros por vezDaIA/atacarIA), vigia invariantes após
   * resoluções e moveend e num relógio leve de 500 ms, guarda um
   * ponto de retorno por turno e mantém o registo da batalha.
   * NÃO cria mecânica paralela nem muda números nem frases: nos
   * bloqueios "moles" limita-se a registar e o caminho existente
   * recusa com a frase de sempre, sem efeito; nos "duros"
   * (caminhos sem recusa própria) a acção pára antes, com o
   * estado intacto. Violação de invariante dura CONGELA a batalha
   * na hora — sem chamar fimDeBatalha e sem setVivo (ela não
   * caiu): o erro só aparece na área de supervisão das
   * configurações (imersão — a superfície de jogo não o anuncia).
   * O registo exportável NÃO tem Defesas nem constantes de
   * combate: só eventos, alertas e snapshots. */
  const SUP_RELOGIO_MS = 500;   // relógio leve de invariantes
  /* Tectos declarados (pós-críticos T1.5, Conflitos A5): o registo
     e a pilha de snapshots rodam — os mais antigos saem primeiro. */
  const SUP_MAX_EVENTOS = 1000;
  const SUP_MAX_SNAPSHOTS = 40;
  const SUP_GUARDA_MOVIMENTO_MS = 5000;   // relógio de guarda do movimento dela (= o da IA)
  let supCongelado = false;
  let supRestaurando = false;
  let supSeq = 0;               // seq monotónico dos eventos (sobrevive à rotação do registo)
  const supRegisto = [];        // eventos: turno/accao/bloqueada/alerta/restauro/fluidez/fim/guarda
  const supAlertas = [];        // { rodada, vez, razao } — vazia em batalha limpa
  const supPilha = [];          // pontos de retorno: { turno, estado }
  const supAmostrasFps = [];    // fluidez via 'stats' da vista (amostras ≤1/s)
  let supStatsUltimo = 0, supStatsUltimaAmostra = 0;

  function supRegistar(tipo, dados) {
    /* Timestamp em TODOS os eventos (pós-críticos T1.5): sem ele,
       o ritmo e o silêncio do registo eram improváveis ao vivo. */
    supRegisto.push(Object.assign(
      { seq: ++supSeq, ts: Date.now(), tipo, rodada, vez: vezAtual }, dados || {}));
    while (supRegisto.length > SUP_MAX_EVENTOS) supRegisto.shift();   // tecto A5
  }
  /* Partida de um movimento DELA (toque, seta ou automático):
     regista a época corrente, arma o relógio de guarda de 5 s e
     regista o movimento legal no Supervisor (actor, de→para,
     passos) — o rasto que os críticos ao vivo não viam. */
  function supPartidaMovimentoOng(para, passos) {
    epocaMovimentoOng = supEpoca;
    const u = unidade(PROPRIA);
    supRegistar('accao', { acao: 'mover', actor: PROPRIA,
      de: u ? { x: u.posicao.x, y: u.posicao.y } : null,
      para: { x: para.x, y: para.y }, passos });
    supDesarmarGuardaMovimentoOng();
    const epoca = supEpoca;
    guardaMovimentoOng = { epoca, relogio: setTimeout(() => supRelogioGuardaMovimentoOng(epoca), SUP_GUARDA_MOVIMENTO_MS) };
  }
  function supDesarmarGuardaMovimentoOng() {
    if (guardaMovimentoOng) { clearTimeout(guardaMovimentoOng.relogio); guardaMovimentoOng = null; }
  }
  /* Relógio de guarda do movimento DELA (pós-críticos T1.5,
     Conflitos A7, como o GUARDA_IA_MS dos monstros): se o moveend
     não vier em 5 s, destrava SEM descontar o que não andou —
     os pendentes de custo limpam-se e o estado 'movendo' volta à
     base; um passo de seta só perde o passoEmCurso. Fica registo. */
  function supRelogioGuardaMovimentoOng(epoca) {
    guardaMovimentoOng = null;
    if (supCongelado || epoca !== supEpoca) return;
    if (estado !== 'movendo' && !passoEmCurso) return;
    custoPendente = null; caminhoPendente = null; passoEmCurso = false; parado = false;
    if (estado === 'movendo') { estado = 'base'; renderAcoes(); }
    supRegistar('guarda', { acao: 'mover', actor: PROPRIA, razao: 'O moveend dela não chegou em 5 s — movimento destravado sem desconto' });
    agendarPassoAuto();   // destravada, o Modo automático pode retomar
  }
  /* Validação das acções DELA (chokepoint: tratarAcao). Devolve
   * { razao, duro? } ou null. A Transformação valida o PA no
   * Confirmar — é aí que ela realmente entra, antes do débito. */
  function supValidarAcaoOng(acao) {
    if (acao === 'atacar') {
      if (estado === 'movendo' || view.getState().moving) return { razao: 'A figura ainda está a andar' };
      if (atacou) return { razao: 'A Ong já atacou nesta vez' };
      if (!alvo) return { razao: 'Sem alvo escolhido' };
      if (!unidade(alvo)) return { razao: 'O alvo já não está na batalha' };
      if (unidade(alvo).vivo === false) return { razao: 'O alvo já não está na batalha' };   // FID-R2: alvo VIVO
      if (distanciaAte(alvo) > COMBATE_TEST.ong.alcance) return { razao: 'Alvo fora de alcance' };
      return null;
    }
    if (acao === 'ataque-basico') {
      if (estado !== 'atacar' || !alvo || atacou
        || distanciaAte(alvo) > COMBATE_TEST.ong.alcance)
        return { razao: 'Ataque básico sem condições para acontecer', duro: true };
      return null;
    }
    if (acao === 'transformacao') {
      if (transformada) return { razao: 'A Ong já está transformada' };
      return null;
    }
    if (acao === 'confirmar') {
      if (!ataquePendente) return { razao: 'Nada para confirmar' };
      if (ataquePendente.tipo === 'transformacao') {
        const t = COMBATE_TEST.ong.transformacao;
        const livre = FICHAS.ong.alma.total - FICHAS.ong.alma.comprometido - paGasto;
        if (livre < t.custo) return { razao: 'Alma livre não chega para a Transformação' };
      } else if (!alvo || distanciaAte(alvo) > COMBATE_TEST.ong.alcance) {
        return { razao: 'Alvo fora de alcance' };
      }
      return null;
    }
    if (acao === 'mover') {
      if (estado === 'movendo' || view.getState().moving) return { razao: 'A figura ainda está a andar' };
      if (reservaMovimento < CASA_M) return { razao: 'Reserva de movimento esgotada' };
      return null;
    }
    if (acao === 'encerrar') {
      if (estado === 'movendo' || view.getState().moving)
        return { razao: 'Não pode encerrar a vez enquanto anda', duro: true };
      return null;
    }
    return null;
  }
  /* Soma das parcelas = total do dano, nos dois sentidos.
     Devolve booleano (pós-críticos T1.5, Conflitos A3): quem chama
     ABORTA a resolução nesse tick se devolver falso. */
  function supConferirSoma(parcelas, total, actor) {
    let soma = 0;
    for (const p of parcelas) soma += p.valor;
    if (soma !== total) { supCongelar('A soma das parcelas do dano não bate com o total'); return false; }
    return true;
  }
  function supInvarianteViolada() {
    if (paGasto < 0 || paGasto > FICHAS.ong.alma.total) return 'Pontos de alma gastos fora dos limites';
    if (FICHAS.ong.alma.total - FICHAS.ong.alma.comprometido - paGasto < 0) return 'Alma livre negativa';
    if (danoSofrido < 0) return 'Dano marcado negativo';
    if (FICHAS.ong.vida.total - danoSofrido > FICHAS.ong.vida.total) return 'Vida acima do máximo';
    if (reservaMovimento < -1e-9 || reservaMovimento > DESLOCAMENTO_ONG_M + 1e-9)
      return 'Reserva de movimento fora dos limites';
    const casas = new Set();
    for (const u of view.getState().units) {
      if (u.posicao.x < AREA.origin.x || u.posicao.x >= AREA.origin.x + AREA.cols
        || u.posicao.y < AREA.origin.y || u.posicao.y >= AREA.origin.y + AREA.rows)
        return 'Figura fora da arena';
      const k = chave(u.posicao.x, u.posicao.y);
      if (casas.has(k)) return 'Duas figuras na mesma casa';
      casas.add(k);
    }
    return null;
  }
  function supConferirInvariantes(origem) {
    if (supCongelado || supRestaurando) return;
    const razao = supInvarianteViolada();
    if (razao) supCongelar(razao);
  }
  /* Congelar: pára continuações e relógios, terminal estável com
   * Recomeçar — a Ong NÃO caiu (sem fimDeBatalha, sem setVivo) e
   * nada disto se anuncia na superfície de jogo. */
  function supCongelar(razao) {
    if (supCongelado) return;
    supCongelado = true;
    supEpoca++;                          // guarda de época: moveend tardio dela não acerta contas
    supDesarmarGuardaMovimentoOng();
    supAlertas.push({ rodada, vez: vezAtual, razao });
    supRegistar('alerta', { razao, congelou: true });
    /* Evento terminal do congelamento (pós-críticos T1.5): o
       registo marca onde a batalha parou e porquê. */
    supRegistar('fim', { actor: PROPRIA, congelamento: true, razao });
    supRenderAlertas();
    geracaoAuto++;
    if (relogioAuto) { clearTimeout(relogioAuto); relogioAuto = null; }
    seqTurno++;                          // continuações da IA morrem
    if (contextoIA) consumirContextoIA(contextoIA.id);
    estado = 'fim';
    atualizarVez(); renderAcoes();   // EXP-R1: o indicador passa a «FIM» no gelo (terminal honesto)
  }
  /* Fluidez: só pelo que a vista diz em 'stats' — amostras de FPS
   * (≤1/s) e registo das lacunas grandes entre eventos. */
  function supAmostraStats(s) {
    const agora = performance.now();
    if (supStatsUltimo && agora - supStatsUltimo > 2000)
      supRegistar('fluidez', { lacunaMs: Math.round(agora - supStatsUltimo) });
    supStatsUltimo = agora;
    if (agora - supStatsUltimaAmostra >= 1000) {
      supStatsUltimaAmostra = agora;
      supAmostrasFps.push(Math.round(s.fps));
      if (supAmostrasFps.length > 120) supAmostrasFps.shift();
    }
  }

  /* ---------- Supervisor: pontos de retorno (um passo atrás, v1) ---------- */
  function supEstadoCanonico() {
    return {
      rodada, indiceVez, vez: vezAtual,
      unidades: view.getState().units.map(u => ({
        id: u.id, x: u.posicao.x, y: u.posicao.y, vivo: u.vivo !== false })),
      danoSofrido, paGasto, transformada, reservaMovimento, atacou, alvo
    };
  }
  function supSnapshot() {
    if (supCongelado) return;
    const estadoSnap = supEstadoCanonico();
    const turno = estadoSnap.rodada + ':' + estadoSnap.indiceVez + ':' + estadoSnap.vez;
    if (supPilha.length && supPilha[supPilha.length - 1].turno === turno) return;   // deduplicação por turno
    supPilha.push({ turno, estado: estadoSnap });
    while (supPilha.length > SUP_MAX_SNAPSHOTS) supPilha.shift();   // tecto A5
    supRegistar('turno', { vezSnap: estadoSnap.vez });
  }
  function supRestaurar() {
    if (supPilha.length < 2) {
      supRegistar('restauro', { ok: false, razao: 'Sem turno anterior guardado' });
      /* EXP-R2: o clique sem estado anterior responde DENTRO das
         configurações (linha #sup-ultimo) — sem say() novo. */
      supUltimoEl.textContent = 'Ainda não há um estado anterior guardado.';
      return;
    }
    const idx = supPilha.length - 2;             // o turno anterior ao actual
    const snap = supPilha[idx].estado;
    supRestaurando = true;                       // o moveend ignora a reposição
    /* Guarda de época + restauro pendente (pós-críticos T1.5,
       Conflitos A2): um movimento dela ainda em voo, ao chegar,
       é ignorado e as posições deste snapshot são reafirmadas.
       Âmbito declarado: o «Voltar» também funciona depois do
       FIM natural (ferramenta de teste/replay — ver NOTAS). */
    supEpoca++;
    supRestauroPendente = snap.unidades.map(u => ({ ...u }));
    supDesarmarGuardaMovimentoOng();
    geracaoAuto++;
    if (relogioAuto) { clearTimeout(relogioAuto); relogioAuto = null; }
    seqTurno++;
    if (contextoIA) consumirContextoIA(contextoIA.id);
    for (const su of snap.unidades) {
      const u = unidade(su.id);
      if (u && (u.posicao.x !== su.x || u.posicao.y !== su.y))
        view.move(su.id, casaVista({ x: su.x, y: su.y }), { immediate: true });
      const uv = unidade(su.id);
      if (uv && (uv.vivo !== false) !== su.vivo) view.setVivo(su.id, su.vivo);
    }
    danoSofrido = snap.danoSofrido; paGasto = snap.paGasto;
    transformada = snap.transformada;
    reservaMovimento = snap.reservaMovimento; atacou = snap.atacou;
    alvo = snap.alvo;
    rodada = snap.rodada; indiceVez = snap.indiceVez;
    ataquePendente = null; custoPendente = null; caminhoPendente = null;
    passoEmCurso = false; parado = false;
    const ongSnap = snap.unidades.find(u => u.id === PROPRIA);
    if (ongSnap && ongSnap.vivo) batalhaFim = false;
    supPilha.length = idx + 1;                   // o futuro velho sai da pilha
    supCongelado = false;                        // voltar é também a saída do congelamento
    atualizarChipVida();
    supRestaurando = false;
    supRegistar('restauro', { ok: true, rodadaSnap: snap.rodada, vezSnap: snap.vez });
    /* EXP-R2: confirmação do voltar DENTRO das configurações
       (linha #sup-ultimo) — sem say() novo. */
    supUltimoEl.textContent = `Voltado ao turno anterior — rodada ${snap.rodada}, vez de ${nomeCena(snap.vez)}.`;
    if (snap.vez === PROPRIA) {
      iniciarVez(PROPRIA);
      say(`É a vez da <b>Ong</b> (rodada ${rodada}).`);
    } else {
      iniciarVezIA(snap.vez, false);
    }
    supConferirInvariantes('restauro');
  }

  /* ---------- Supervisor: superfície do Mestre (só #cfgpop) ---------- */
  const linhaSupA = document.createElement('div');
  linhaSupA.className = 'cfgrow';
  const rotuloSupA = document.createElement('span');
  rotuloSupA.className = 'cl';
  rotuloSupA.textContent = 'Supervisor do Comestre';
  const botaoVoltarSup = document.createElement('button');
  botaoVoltarSup.type = 'button';
  botaoVoltarSup.id = 'sup-voltar';
  botaoVoltarSup.className = 'tog';
  botaoVoltarSup.textContent = 'Voltar ao último estado bom';
  linhaSupA.appendChild(rotuloSupA);
  linhaSupA.appendChild(botaoVoltarSup);
  cfgEl.insertBefore(linhaSupA, $('stats'));
  const linhaSupB = document.createElement('div');
  linhaSupB.className = 'cfgrow';
  const rotuloSupB = document.createElement('span');
  rotuloSupB.className = 'cl';
  rotuloSupB.textContent = 'Registo da batalha';
  const botaoExportarSup = document.createElement('button');
  botaoExportarSup.type = 'button';
  botaoExportarSup.id = 'sup-exportar';
  botaoExportarSup.className = 'tog';
  botaoExportarSup.textContent = 'Exportar registo';
  linhaSupB.appendChild(rotuloSupB);
  linhaSupB.appendChild(botaoExportarSup);
  cfgEl.insertBefore(linhaSupB, $('stats'));
  const alertasSupEl = document.createElement('div');
  alertasSupEl.id = 'sup-alertas';
  cfgEl.insertBefore(alertasSupEl, $('stats'));
  const preSupEl = document.createElement('pre');
  preSupEl.id = 'sup-json';
  cfgEl.insertBefore(preSupEl, $('stats'));
  /* EXP-R2: linha de estado própria da secção do Supervisor —
     o retorno visível do «Voltar» e do «Exportar», só dentro
     das configurações. */
  const supUltimoEl = document.createElement('div');
  supUltimoEl.id = 'sup-ultimo';
  cfgEl.insertBefore(supUltimoEl, $('stats'));
  function supRenderAlertas() {
    alertasSupEl.innerHTML = '';
    for (const a of supAlertas) {
      const d = document.createElement('div');
      d.textContent = `Rodada ${a.rodada} · vez de ${nomeCena(a.vez)} — ${a.razao}`;
      alertasSupEl.appendChild(d);
    }
  }
  function supExportar() {
    preSupEl.textContent = JSON.stringify({
      eventos: supRegisto,
      alertas: supAlertas,
      snapshots: supPilha.map(e => e.estado),
      estadoActual: supEstadoCanonico(),
      fluidez: { amostrasFps: supAmostrasFps }
    }, null, 1);
    supUltimoEl.textContent = 'Registo exportado abaixo.';   // EXP-R2
  }
  botaoVoltarSup.addEventListener('click', () => supRestaurar());
  botaoExportarSup.addEventListener('click', () => supExportar());
  setInterval(() => supConferirInvariantes('relogio'), SUP_RELOGIO_MS);

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
    if (e.key === 'Escape') {
      // O Escape mantém os comportamentos de sempre e a precedência:
      // fecha o ⚙, fecha a ficha, cancela o Mover. Não é seta e as
      // setas não fecham nada.
      fecharCfg();
      if (fichaAberta) fecharFicha();
      if (estado === 'mover') {
        const restavam = fmtM(reservaMovimento);
        sairMover();
        say(`Ficas por aqui — restavam <b>${restavam}</b> nesta vez.`);
      }
      return;
    }
    /* Setas do teclado (decisão dele, 03/11 08:03; T1.3 §3.4): só
       com o Mover armado, na vez dela, sem ficha nem ⚙ abertos.
       Fora disso, as setas não são tocadas — sem movimento e sem
       preventDefault (a página rola como o navegador mandar). */
    const SETAS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const dir = SETAS[e.key];
    if (!dir) return;
    if (estado !== 'mover' || vezAtual !== PROPRIA || batalhaFim || fichaAberta || !cfgEl.hidden) return;
    e.preventDefault();          // o ramo actua: a página não rola a meio do gesto
    passoSeta(dir[0], dir[1]);
  });

  addEventListener('resize', () => renderAcoes());

  /* ---------- arranque ---------- */
  atualizarVez();
  renderAcoes();
  marcarQualidade();
  marcarDanos();
  atualizarChipVida();
  say('A carregar o campo…');
  view.ready.then(() => {
    selecionar(PROPRIA);
    sincronizarCamera();
    mostrarZoom();
    iniciarVez(PROPRIA);         // a batalha começa na vez dela, rodada 1 (D-13.3)
    say('É a vez da <b>Ong</b>. Prime <b>Mover</b> e toca numa casa acesa para andar.');
  }).catch(error => say('Não foi possível carregar os modelos: ' + ((error && error.message) || error)));
})();
