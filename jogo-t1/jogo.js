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
    { id: 'ong',     nome: 'Ong',             modelo: 'modelos/ong-rogue.glb',     x: 6, y: 2, alturaMetros: 1.75, vivo: true, animacoes: { idle: 'Idle_A', andar: 'Walking_A', ataque: 'Melee_Unarmed_Attack_Punch_A', reacao: 'Hit_A' } },
    { id: 'capanga', nome: 'Capanga 1',       modelo: 'modelos/capanga-knight.glb', x: 7, y: 4, alturaMetros: 1.8,  vivo: true, animacoes: { idle: 'Idle_A', andar: 'Walking_A', ataque: 'Melee_Unarmed_Attack_Punch_A', reacao: 'Hit_A' } },
    { id: 'lobo',    nome: 'Lobo da Caverna', modelo: 'marcador-lobo',     x: 2, y: 5, alturaMetros: 0.9,  vivo: true }
  ];
  /* Tranche T-D (contrato apresentarAtaque): Ong e Capanga declaram
     também ataque/reacao com os clipes que os GLB viajantes JÁ trazem
     (parse registado no DIFF-API §5: Punch 1,167 s e Hit_A 0,667 s
     dentro dos dois ficheiros). Orc e Lobo NÃO declaram nada: sem
     clipe, a cena degrada sozinha para avanço/recuo (ramo sem-clipe
     do contrato §5) — nenhum gesto inventado na casca. */
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

  /* Controlo de velocidade (tranche T1.6 — decisão do Mestre,
     03/11 11:46, refinada 11:48): cinco passos 1× · 1,5× · 2× ·
     2,5× · 3×, opção nas configurações, persistida como as outras
     preferências; 1× por omissão e valor estranho guardado volta
     a 1. Só o RITMO muda — mecânica e resultados ficam iguais:
     `ritmo` é o ajudante único e lê `velocidade` NO MOMENTO de
     cada agendamento/duração, por isso trocar a meio da batalha
     só afecta o que for agendado depois da troca (o que já está
     em voo termina ao ritmo antigo; sem re-agendamentos). */
  const VELOCIDADES = [1, 1.5, 2, 2.5, 3];
  let velocidade = 1;
  try {
    const v = localStorage.getItem('hudt1-velocidade');
    if (['1', '1.5', '2', '2.5', '3'].includes(v)) velocidade = Number(v);
  } catch (_) {}
  const ritmo = ms => ms / velocidade;

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
  let apresentacaoEmCurso = false;   // T-D: uma apresentação de confronto da cena está a decorrer (o fluxo espera por ela)
  let continuarAposApresentacao = false;   // T-D: um «Continuar» premido durante o gesto executa-se quando ele fecha
  /* T-D/R1: o contador de ataques COM apresentação já NÃO vive aqui:
     passou para dentro do acumulador do Crítico (acc.ataquesComApresentacao,
     junto de acc.ataquesTotais) — os dois contadores da medida
     «ataque-sem-gesto» nascem e morrem juntos, no mesmo segmento
     (correcção R1 do julgamento de Fidelidade da T-D: antes eram
     universos diferentes e o 0 saía do clamp, não da contagem). */
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
  /* Correcções T1.7 (F10.7): contador de erros da camada crítica —
     os catch dos hooks/motores incrementam-no em vez de engolirem
     em silêncio total; a passividade mantém-se (o jogo nunca parte
     por causa da camada), mas a falha deixa rasto em
     analises.errosCamada. */
  let supCritErrosCamada = 0;

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
    flutuantes.push({ el, id, dx, atraso: ritmo(atraso), dur: ritmo(dur), tipo, t0: performance.now() });
    if (!rafDanos) rafDanos = requestAnimationFrame(tickFlutuantes);
  }
  function mostrarImpacto(id) {
    const el = document.createElement('span');
    el.className = 'impacto';
    el.innerHTML = '<i></i>';
    el.firstElementChild.style.animationDuration = (480 / velocidade) + 'ms';   // T1.6 corrigido: a duração vai no <i>, dono da animação impactoExpande (.48s no jogo.css) — posta no span não tinha efeito
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
    supPartidaMovimentoOng({ x: nx, y: ny }, 1,
      [{ x: u.posicao.x, y: u.posicao.y }, { x: nx, y: ny }]);   // T1.7: caminho da seta = [actual, seguinte]
    view.move(PROPRIA, casaVista({ x: nx, y: ny }), {
      path: [casaVista({ x: nx, y: ny })], durationMs: ritmo(200)
    });
  }

  /* ---------- máquina de turnos (T1.3 §1) ---------- */
  const aguardar = ms => new Promise(res => setTimeout(res, ritmo(ms)));
  /* ---------- apresentação do confronto (tranche T-D) ----------
   * Único chamador de view.apresentarAtaque na casca. O contrato
   * (CONTRATO-APRESENTAR-ATAQUE §§1–2, 6): a cena recebe SÓ dois ids
   * — nenhum dado de acerto, dano ou ficha atravessa a chamada; a
   * validação é SÍNCRONA e inteira antes de qualquer efeito, com o
   * erro como throw de RangeError (aqui apanhado à volta da chamada,
   * como a demo faz); a Promise nunca rejeita depois de aceite e o
   * fluxo que chama ESPERA por ela antes de prosseguir. A
   * apresentação é cosmética: não decide nem altera resultado
   * nenhum — se a cena a recusar (throw), a resolução do jogo
   * prossegue exactamente igual, só sem gesto (ramo defensivo: no
   * fluxo legal o Supervisor e os invariantes já garantem duas
   * figuras vivas em casas distintas). Duração: o orçamento de
   * 0,70 s vive DENTRO da cena (ficheiro sagrado) e NÃO escala com
   * a velocidade visual — é a lacuna do mixer declarada no
   * DIFF-API §4.4: os clipes correm à velocidade própria (1×) em
   * todas as velocidades da casca; o que escala, como sempre, são
   * os ritmos DA CASCA à volta (pausas via aguardar/ritmo, anel e
   * flutuantes). */
  /* Regista UM ataque apresentado no acumulador do Crítico — o
     MESMO acumulador que conta os ataques totais (acc): os dois
     contadores vivem no mesmo universo (mesma batalha/segmento,
     mesmo reinício no restauro) e a diferença entre eles é a
     medida do padrão «ataque-sem-gesto» (correcção R1). */
  function registarAtaqueApresentado() {
    try { if (!supCritDesligado) supCrit.acc.ataquesComApresentacao++; }
    catch (_) { supCritErrosCamada++; }
  }
  /* `contado` diz se este confronto é de um ataque que entra em
     acc.ataquesTotais (evento «ataque» registado): acertos/falhas
     da IA e acerto da Ong entram; a FALHA da Ong não entra (não
     gera esse evento — semântica pré-T-D preservada), logo a
     apresentação dela também não conta como «apresentada».
     Apresentações disparadas fora da casca (consola,
     window.mapa3d) nunca passam por aqui: não contam em
     universo nenhum da dica. E «apresentado» exige o gesto a
     ARRANCAR: observa-se a fase da apresentação da cena
     (getStats().presentation.phase) enquanto ela corre — só a
     fase 'gesture' DESTE par conta; apresentação resolvida por
     cancelamento/preempção antes do gesto não conta (R1
     Fidelidade + R2 Privacidade). */
  function apresentarConfronto(atacante, alvo, contado) {
    let promessa;
    try { promessa = view.apresentarAtaque(atacante, alvo); }
    catch (_) { return Promise.resolve(false); }   // throw síncrono do contrato: sem gesto, sem tocar na resolução
    apresentacaoEmCurso = true;
    const accEntrada = supCrit.acc;   // §13 (resíduo R1-Fidelidade): o acumulador DESTE segmento, capturado à entrada — um restauro a meio do gesto troca supCrit.acc e a promessa abandonada não pode registar no segmento novo
    let gestoArrancou = false;
    const vigia = setInterval(() => {
      try {
        const pres = typeof view.getStats === 'function' ? view.getStats().presentation : null;
        if (pres && pres.attacker === atacante && pres.target === alvo && pres.phase === 'gesture')
          gestoArrancou = true;
      } catch (_) {}
    }, 25);
    return Promise.resolve(promessa).then(
      () => { clearInterval(vigia); apresentacaoEmCurso = false; if (contado && gestoArrancou && supCrit.acc === accEntrada) registarAtaqueApresentado(); return true; },
      () => { clearInterval(vigia); apresentacaoEmCurso = false; return false; });   // o contrato diz que nunca rejeita; o ramo fica por defesa
  }
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
    try { supCritAntesDePassarVez(); } catch (_) { supCritErrosCamada++; }   // T1.7: fecha a vez nos acumuladores (passivo)
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
        para: { x: destino.x, y: destino.y }, passos: destino.passos,
        path: destino.path.map(p => ({ x: p.x, y: p.y })) }); }   // T1.7: o caminho fica no evento mover
    try {
      view.move(id, casaVista(destino), {
        path: destino.path.map(casaVista),
        durationMs: ritmo(Math.min(1700, Math.max(220, destino.passos * 190)))
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
      /* T-D: atacarIA passou a assíncrono (espera a apresentação do
         confronto); a vez só fecha quando a resolução acabar — se
         ela caiu, não há vez seguinte. */
      atacarIA(id, seq).then(() => { if (!batalhaFim) fimDaVezIA(seq); });
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
  async function atacarIA(id, seq) {
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
      /* T-D: a tentativa VÊ-SE — a apresentação é do confronto, não
         do acerto (a cena nem recebe o resultado). A frase da falha
         só sai quando o gesto fecha. Se a época/vez mudou durante o
         gesto (restauro ou gelo), a resolução pertence à linha do
         tempo abandonada e não se aplica. */
      const epocaFalhaIA = supEpoca;
      await apresentarConfronto(id, PROPRIA, true);   // R1: ataque contado no total (evento «ataque» registado acima)
      if (seqTurno !== seq || batalhaFim || supCongelado || supEpoca !== epocaFalhaIA) { continuarAposApresentacao = false; return; }   // R1-Priv: o Continuar diferido morre com a linha do tempo abandonada
      say(`<b>${nomeCena(id)}</b> ${verbos.falha} a <b>Ong</b> e falhou.`);
      return;
    }
    const rIA = rolarExpressao(c.dano);
    /* Supervisor: parcelas = total — se não bater, a batalha
       congela e a resolução ABORTA neste tick (sem sofrerDano). */
    if (!supConferirSoma(rIA.parcelas, rIA.total, id)) return;
    const total = rIA.total;
    supRegistar('accao', { acao: 'ataque', actor: id, alvo: PROPRIA, acerto: true, dano: total });
    /* T-D: validação do Supervisor completa → o gesto apresenta-se
       e SÓ DEPOIS o golpe marca (anel) e o dano se aplica — os
       números da resolução não mudam, só ganham o gesto antes. */
    const epocaAcertoIA = supEpoca;
    await apresentarConfronto(id, PROPRIA, true);   // R1: ataque contado no total (evento «ataque» registado acima)
    if (seqTurno !== seq || batalhaFim || supCongelado || supEpoca !== epocaAcertoIA) { continuarAposApresentacao = false; return; }   // R1-Priv: idem
    mostrarImpacto(PROPRIA);
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
    continuarAposApresentacao = false;   // R1-Priv: terminal — nenhum Continuar diferido sobrevive ao fim
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
  async function tratarAcao(acao) {
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
    /* R1-Priv: «Continuar» premido DURANTE o gesto não é ainda uma
       acção executada — fica só a bandeira, SEM registo no
       Supervisor; o evento regista-se uma única vez, à execução
       (quando a continuação do Confirmar o chama de volta, já sem
       apresentação a correr). Sem isto, um clique durante o gesto
       despejava o evento duas vezes no export. */
    if (acao === 'continuar' && apresentacaoEmCurso) { continuarAposApresentacao = true; return; }
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
      /* T-D: o alvo DESTE golpe fixa-se antes do gesto — um toque
         durante a apresentação pode marcar outro alvo para a acção
         seguinte, nunca para o golpe já confirmado. */
      const alvoDoGolpe = alvo;
      if (!pend.acerta) {
        // Falha: sem impacto, sem flutuantes, sem dano — mas a
        // tentativa VÊ-SE: a apresentação é do confronto, não do
        // acerto (a cena nem recebe o resultado). A frase da falha
        // só sai quando o gesto fecha.
        const epocaFalha = supEpoca;
        await apresentarConfronto(PROPRIA, alvoDoGolpe, false);   // R1: a falha da Ong NÃO é ataque contado (sem evento «ataque») — a apresentação dela não entra em nenhum dos contadores
        if (supEpoca !== epocaFalha || supCongelado) { continuarAposApresentacao = false; return; }   // R1-Priv: o Continuar diferido morre com a linha do tempo abandonada
        say(`<b>Falha</b> · ${pend.nome} não atinge ${ALVO_NOME[alvoDoGolpe] || nomeCena(alvoDoGolpe)}.`);
        if (continuarAposApresentacao) { continuarAposApresentacao = false; tratarAcao('continuar'); }
        return;
      }
      const r = rolarExpressao(expressaoOng());
      /* Supervisor: parcelas = total — se não bater, a batalha
         congela e a resolução ABORTA neste tick (sem dano). */
      if (!supConferirSoma(r.parcelas, r.total, PROPRIA)) return;
      supRegistar('accao', { acao: 'ataque', actor: PROPRIA, alvo: alvoDoGolpe, acerto: true, dano: r.total });
      /* T-D: validação do Supervisor completa → o gesto
         apresenta-se e SÓ DEPOIS o golpe marca (anel, flutuantes,
         frase). Rolagem, soma, registo e números são os de sempre:
         a apresentação não toca em resultado nenhum. Se a época
         mudou durante o gesto (restauro ou gelo), esta resolução
         pertence à linha do tempo abandonada e não se aplica. */
      const epocaAcerto = supEpoca;
      await apresentarConfronto(PROPRIA, alvoDoGolpe, true);   // R1: ataque contado no total (evento «ataque» registado acima)
      if (supEpoca !== epocaAcerto || supCongelado) { continuarAposApresentacao = false; return; }   // R1-Priv: idem
      mostrarImpacto(alvoDoGolpe);
      const total = numerosDano ? mostrarDano(alvoDoGolpe, r.parcelas) : null;
      say(`<b>Acerto</b> · ${pend.nome} atinge ${ALVO_NOME[alvoDoGolpe] || nomeCena(alvoDoGolpe)}.` +
        (total != null ? ' As parcelas do dano saem da figura em números.' : ''));
      if (continuarAposApresentacao) { continuarAposApresentacao = false; tratarAcao('continuar'); }
      return;
    }
    if (acao === 'continuar') {
      /* T-D: premido durante o gesto, o Continuar não se perde nem
         interrompe a apresentação — executa-se quando ela fechar
         (a continuação do Confirmar chama-o de volta). R1-Priv: a
         intercepção à entrada de tratarAcao já trata esse caso
         (bandeira sem registo); esta guarda fica como defesa. */
      if (apresentacaoEmCurso) { continuarAposApresentacao = true; return; }
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
      supPartidaMovimentoOng(destino, destino.passos, destino.path);
      view.move(selecionada, casaVista(destino), {
        path: destino.path.map(casaVista),
        durationMs: ritmo(Math.min(1200, Math.max(220, destino.passos * 140)))
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
    try { supCritFecharMovimento(u.id); } catch (_) { supCritErrosCamada++; }   // T1.7: fecha o segmento de movimento (passivo)
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
    try { supCritAmostraStats(s); } catch (_) { supCritErrosCamada++; }   // T1.7: amostras do Crítico (passivo)
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

  /* ---------- Controlo de velocidade (tranche T1.6) ----------
   * Linha «Velocidade» criada aqui (o index.html é sagrado),
   * IMEDIATAMENTE depois da linha do Modo automático e antes de
   * #stats: .cfgrow + rótulo .cl + grupo .seg (a classe já existe
   * no CSS — jogo.css não muda) com os cinco passos. Botão activo
   * com .on. NUNCA na barra de baixo. Sem frase say() nova: o
   * único texto novo é o rótulo e os passos, nas configurações.
   * Trocar grava a preferência (hudt1-velocidade) e marca o .on;
   * o ritmo em si lê-se em `ritmo`, no momento de cada uso. */
  const linhaVelocidade = document.createElement('div');
  linhaVelocidade.className = 'cfgrow vel';
  const rotuloVelocidade = document.createElement('span');
  rotuloVelocidade.className = 'cl';
  rotuloVelocidade.textContent = 'Velocidade';
  const grupoVelocidade = document.createElement('div');
  grupoVelocidade.className = 'seg';
  grupoVelocidade.setAttribute('role', 'group');
  grupoVelocidade.setAttribute('aria-label', 'Velocidade');
  const botoesVelocidade = [];
  for (const v of VELOCIDADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(v).replace('.', ',') + '×';
    b.addEventListener('click', () => definirVelocidade(v));
    grupoVelocidade.appendChild(b);
    botoesVelocidade.push({ v, b });
  }
  linhaVelocidade.appendChild(rotuloVelocidade);
  linhaVelocidade.appendChild(grupoVelocidade);
  cfgEl.insertBefore(linhaVelocidade, $('stats'));
  function marcarVelocidade() {
    for (const { v, b } of botoesVelocidade) b.classList.toggle('on', v === velocidade);
  }
  function definirVelocidade(v) {
    if (!VELOCIDADES.includes(v)) return;
    velocidade = v;
    try { localStorage.setItem('hudt1-velocidade', String(velocidade)); } catch (_) {}
    marcarVelocidade();
  }
  marcarVelocidade();

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
    }, ritmo(PASSO_AUTO_MS));
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
    if (apresentacaoEmCurso) { agendarPassoAuto(); return; }   // T-D: o gesto manda — o passo espera e reagenda (a apresentação da cena NÃO escala com a velocidade: a 3× o passo de 283 ms chegaria a meio dos 0,70 s)
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
    if (!destino) { try { supCritAutoSemDestino(); } catch (_) { supCritErrosCamada++; } tratarAcao('encerrar'); return; }
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
    supPartidaMovimentoOng(destino, destino.passos, destino.path);
    view.move(selecionada, casaVista(destino), {
      path: destino.path.map(casaVista),
      durationMs: ritmo(Math.min(1200, Math.max(220, destino.passos * 140)))
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
    /* Supervisor-Crítico (T1.7): camada passiva de padrões — lê o
       evento acabado de registar; nunca altera nada. */
    try { supCritObservarEvento(supRegisto[supRegisto.length - 1]); } catch (_) { supCritErrosCamada++; }
  }
  /* Partida de um movimento DELA (toque, seta ou automático):
     regista a época corrente, arma o relógio de guarda de 5 s e
     regista o movimento legal no Supervisor (actor, de→para,
     passos) — o rasto que os críticos ao vivo não viam. */
  function supPartidaMovimentoOng(para, passos, path) {
    epocaMovimentoOng = supEpoca;
    const u = unidade(PROPRIA);
    supRegistar('accao', { acao: 'mover', actor: PROPRIA,
      de: u ? { x: u.posicao.x, y: u.posicao.y } : null,
      para: { x: para.x, y: para.y }, passos,
      path: Array.isArray(path) ? path.map(p => ({ x: p.x, y: p.y })) : null });   // T1.7: caminho no evento (decisão registada nas NOTAS)
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
    continuarAposApresentacao = false;   // R1-Priv: o Continuar diferido morre no gelo — não atravessa épocas
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
    continuarAposApresentacao = false;   // R1-Priv: o Continuar diferido morre no restauro — pertencia à linha do tempo abandonada
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
    let dicasCrit = [], analisesCrit = {};
    try { dicasCrit = supCritDicasExport(); analisesCrit = supCritAnalises(); } catch (_) { supCritErrosCamada++; }
    preSupEl.textContent = JSON.stringify({
      eventos: supRegisto,
      alertas: supAlertas,
      snapshots: supPilha.map(e => e.estado),
      estadoActual: supEstadoCanonico(),
      fluidez: { amostrasFps: supAmostrasFps },
      dicas: dicasCrit,          // T1.7: anotações do Supervisor-Crítico
      analises: analisesCrit     // T1.7: resumos numéricos da camada de padrões
    }, null, 1);
    supUltimoEl.textContent = 'Registo exportado abaixo.';   // EXP-R2
  }
  botaoVoltarSup.addEventListener('click', () => supRestaurar());
  botaoExportarSup.addEventListener('click', () => supExportar());

  /* ---------- Supervisor-Crítico (tranche T1.7) ----------
   * Camada PASSIVA de padrões, anotações e análises sobre o
   * registo que o Supervisor da T1.5 já escreve: lê eventos,
   * snapshots e amostras — nunca altera uma acção, um número ou
   * um ritmo. A unidade de análise é o PADRÃO, não o evento; cada
   * dica é uma ANOTAÇÃO ancorada (batalha, segmento, rodada, vez,
   * actor, medida e limiar). Motores em duas cadências: ao fechar
   * cada rodada (padrões baratos) e no fim da batalha (batalha
   * completa). Nenhum ciclo novo por frame: a camada pendura-se
   * no registo, no relógio de 500 ms, no tratador de stats (≤1/s
   * para FPS), nos moveend e nas fronteiras de turno/rodada.
   * REGRA DE VELOCIDADE (T1.6): todos os limiares de TEMPO das
   * dicas dividem pelo factor activo — cada intervalo guarda a
   * velocidade do seu início e a anotação carrega a medida real
   * e o limiar efectivo (limiar base ÷ velocidade). FPS e tempos
   * de frame são tempo real de renderização: NÃO escalam.
   * Superfície: SÓ a lista «Dicas do Supervisor» em #cfgpop —
   * nada em say(), nada na barra, nenhum ícone (imersão 100%).
   * Bandeira de teste (invisível, só para a bateria medir o custo
   * da camada): localStorage 'hudt1-crit-off'='1' desliga os
   * acumuladores e os motores; a página não a mostra em lado
   * nenhum e nenhuma preferência a escreve. */
  const SUPCRIT_MAX_DICAS = 12, SUPCRIT_MAX_POR_CAT = 3;
  const SUPCRIT_AGG_CHAVE = 'hudt1-analises';
  let supCritDesligado = false;
  try { supCritDesligado = localStorage.getItem('hudt1-crit-off') === '1'; } catch (_) {}
  const supCritMediana = ns => {
    if (!ns.length) return 0;
    const s = [...ns].sort((a, b) => a - b), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const supCritSeg = ms => (Math.round(ms / 100) / 10).toString().replace('.', ',');
  function supCritAggVazio() {
    return { batalhas: 0, quedas: {}, usoCasas: {}, alvosAuto: {}, fps: [], deslize: {}, padroes: {} };
  }
  function supCritAggLer() {
    try {
      const j = JSON.parse(localStorage.getItem(SUPCRIT_AGG_CHAVE) || 'null');
      if (j && typeof j === 'object' && typeof j.batalhas === 'number')
        return Object.assign(supCritAggVazio(), j);
    } catch (_) {}
    return supCritAggVazio();
  }
  let supCritAgg = supCritAggLer();
  function supCritAggGuardar() {
    try { localStorage.setItem(SUPCRIT_AGG_CHAVE, JSON.stringify(supCritAgg)); } catch (_) {}
  }
  function supCritNovoAcc() {
    const ultimoActo = {};
    for (const u of ELENCO) ultimoActo[u.id] = { ts: Date.now(), vel: velocidade };
    return {
      uso: new Map(), movimentos: [], ataques: [],
      ataquesOngAuto: [], ataquesOngManual: [],
      danoPorActor: new Map(), danoPorRodada: new Map(), danoTotal: 0,
      recusas: new Map(), runChave: null, runN: 0, runMax: new Map(), lacunas: [],
      turnos: [], esperas: [], ongVazias: 0, ongDesperdicadas: 0, monstroSemAgir: new Map(),
      deslize: new Map(), movidos: new Map(), naoMedidos: 0, ataquesTotais: 0, ataquesComApresentacao: 0, ultimoAtaqueActor: null,   // R1: totais e apresentados no MESMO acumulador — nascem e reiniciam juntos (segmento)
      autoSemAproximar: 0, autoSemDestino: 0, ultimoActo
    };
  }
  const supCrit = {
    segmento: 1, batalha: (supCritAgg.batalhas || 0) + 1,
    dicas: [], chaves: new Map(), ocultas: 0,
    acc: supCritNovoAcc(), turnoCtx: null, espera: null,
    abertos: new Map(), ultimoStats: null, fpsAm: [], ultFpsTs: 0,
    fronteiras: [], frames: [], framesLen: 0, enq: [], ultEnq: 0,
    tInicio: performance.now(), tReady: null, tStats1: null,
    clips: new Map(), agregadoSomado: false, padroesBatalha: new Set(),
    ultRodadaVista: 1
  };
  view.ready.then(() => { supCrit.tReady = performance.now(); }, () => {});

  /* ---------- superfície do Crítico (só #cfgpop, antes de #stats) ---------- */
  const linhaCrit = document.createElement('div');
  linhaCrit.className = 'cfgrow';
  const rotuloCrit = document.createElement('span');
  rotuloCrit.className = 'cl';
  rotuloCrit.textContent = 'Dicas do Supervisor';
  /* Correcções T1.7 (R-EXP-4a): o botão «Limpar histórico» NÃO apaga
     dicas — a explicação vai no <small> do rótulo, no padrão das
     linhas «Ajuda do grid»/«Números de dano». */
  const smallCrit = document.createElement('small');
  smallCrit.textContent = 'o histórico guarda só as contagens entre batalhas; as dicas desta batalha não se apagam';
  rotuloCrit.appendChild(smallCrit);
  const botaoLimparCrit = document.createElement('button');
  botaoLimparCrit.type = 'button';
  botaoLimparCrit.id = 'sup-limpar-analises';
  botaoLimparCrit.className = 'tog';
  botaoLimparCrit.textContent = 'Limpar histórico de análises';
  linhaCrit.appendChild(rotuloCrit);
  linhaCrit.appendChild(botaoLimparCrit);
  cfgEl.insertBefore(linhaCrit, $('stats'));
  const dicasSupEl = document.createElement('div');
  dicasSupEl.id = 'sup-dicas';
  cfgEl.insertBefore(dicasSupEl, $('stats'));
  botaoLimparCrit.addEventListener('click', () => {
    supCritAgg = supCritAggVazio();      // limpa SÓ o agregado entre batalhas
    supCritAggGuardar();
    supCrit.padroesBatalha.clear();
    supUltimoEl.textContent = 'Histórico de análises limpo.';
  });
  const SUPCRIT_CATS = [['mecanica', 'Mecânica'], ['visual', 'Artes e visual'],
    ['maquina', 'Máquina'], ['animacao', 'Animações'], ['jogabilidade', 'Jogabilidade']];
  function supCritRender() {
    /* Correcções T1.7 (R-EXP-6b): a reconstrução preserva a posição
       de leitura — uma emissão a meio da leitura não pode fazer a
       lista saltar para o topo. */
    const scrollAntes = dicasSupEl.scrollTop;
    dicasSupEl.innerHTML = '';
    /* R-EXP-4b: estado vazio explicado — uma secção anunciada sem
       nada por baixo lê-se como avaria, não como «ainda não há
       nada para dizer». */
    if (!supCrit.dicas.length) {
      const vazio = document.createElement('div');
      vazio.textContent = 'Ainda não há dicas nesta batalha. As dicas aparecem aqui quando alguma coisa se repete ou sai do normal.';
      dicasSupEl.appendChild(vazio);
    }
    for (const [cat, rot] of SUPCRIT_CATS) {
      const ds = supCrit.dicas.filter(d => d.categoria === cat);
      if (!ds.length) continue;
      const h = document.createElement('div');
      h.className = 'sup-cat';   // R-EXP-6a: título de categoria com estilo próprio (jogo.css)
      h.textContent = rot;
      dicasSupEl.appendChild(h);
      for (const d of ds) {
        const el = document.createElement('div');
        el.className = 'sup-dica';
        /* R-EXP-5: âncora honesta — padrões de batalha inteira ou
           de máquina (ambito:'batalha', decidido na emissão) não
           acusam a vez de ninguém. */
        el.textContent = d.ambito === 'batalha'
          ? `Batalha inteira — ${d.texto}`
          : `Rodada ${d.rodada} · vez de ${nomeCena(d.vez)} — ${d.texto}`;
        dicasSupEl.appendChild(el);
      }
    }
    dicasSupEl.scrollTop = scrollAntes;
  }
  supCritRender();   // pinta já o estado vazio (R-EXP-4b)

  /* ---------- emissor de dicas (anotação §3, anti-ruído §6) ---------- */
  let supCritSeqDica = 0;
  let supCritSeqSeg = 0;   // id de cada segmento de movimento (F3: amostras etiquetadas por movimento)
  function supCritEmitir(d) {
    if (supCritDesligado) return;
    /* Crónico: o mesmo padrão+actor em ≥3 batalhas sobe sempre e
       a frase diz em quantas batalhas já apareceu (contado uma
       vez por batalha, a partir do agregado persistido).
       Correcções T1.7 (F10.1): a chave crónica passa a ser a MESMA
       do dedupe (padrão+actor+assunto) — zonas mortas diferentes
       (o M3 emite com assunto = a zona) já não se fundem num
       «crónico» só. */
    const chaveCron = d.padrao + '|' + (d.actor || '') + '|' + (d.assunto || '');
    if (!supCrit.padroesBatalha.has(chaveCron)) {
      supCrit.padroesBatalha.add(chaveCron);
      supCritAgg.padroes[chaveCron] = (supCritAgg.padroes[chaveCron] || 0) + 1;
      supCritAggGuardar();
    }
    const nBat = supCritAgg.padroes[chaveCron] || 0;
    const cronico = nBat >= 3;
    const chave = d.padrao + '|' + (d.actor || '') + '|' + (d.assunto || '');
    const existente = supCrit.chaves.get(chave);
    if (existente) {
      /* Dedupe: a mesma dica não se repete; se a medida DOBRAR,
         a entrada existente actualiza em vez de duplicar. Os
         padrões de TOTAIS de batalha (M3/M4/M5/A3) passam
         `actualizar`: a anotação final reflecte o total final da
         batalha, que é o número que os críticos recalculam. */
      if (d.actualizar || d.medida >= existente.medida * 2) {
        existente.medida = d.medida; existente.limiar = d.limiar;
        existente.rodada = d.rodada; existente.cronico = cronico;
        if (d.ambito) existente.ambito = d.ambito;   // R-EXP-5: o âmbito acompanha a actualização
        existente.texto = cronico ? d.texto + ` Já aconteceu em ${nBat} batalhas.` : d.texto;
        supCritRender();
      }
      return;
    }
    const dica = {
      id: ++supCritSeqDica, batalha: supCrit.batalha, segmento: supCrit.segmento,
      rodada: d.rodada, vez: d.vez || d.actor || vezAtual, actor: d.actor || null,
      categoria: d.categoria, padrao: d.padrao, medida: d.medida, limiar: d.limiar,
      ambito: d.ambito || null,   // R-EXP-5: sinal de âncora (só muda a lista; rodada/vez exportados não mudam)
      cronico, texto: cronico ? d.texto + ` Já aconteceu em ${nBat} batalhas.` : d.texto,
      _prio: (d.prioridade || 1) * (cronico ? 10 : 1), _chave: chave
    };
    const naCat = supCrit.dicas.filter(x => x.categoria === d.categoria);
    if (supCrit.dicas.length >= SUPCRIT_MAX_DICAS || naCat.length >= SUPCRIT_MAX_POR_CAT) {
      /* Tecto: fica a de maior prioridade; a cortada CONTA em
         analises.cortadas — silêncio sobre o corte é proibido. */
      const cand = naCat.length >= SUPCRIT_MAX_POR_CAT ? naCat : supCrit.dicas;
      let fraca = null;
      for (const x of cand) if (!fraca || x._prio < fraca._prio) fraca = x;
      if (fraca && dica._prio > fraca._prio) {
        supCrit.dicas.splice(supCrit.dicas.indexOf(fraca), 1);
        supCrit.chaves.delete(fraca._chave);
        supCrit.ocultas++;
      } else { supCrit.ocultas++; return; }
    }
    supCrit.dicas.push(dica);
    supCrit.chaves.set(chave, dica);
    supCritRender();
  }
  function supCritDicasExport() {
    return supCrit.dicas.map(d => ({
      id: d.id, batalha: d.batalha, segmento: d.segmento, rodada: d.rodada,
      vez: d.vez, actor: d.actor, categoria: d.categoria, padrao: d.padrao,
      medida: d.medida, limiar: d.limiar, ambito: d.ambito || null, cronico: d.cronico, texto: d.texto
    }));
  }

  /* ---------- acumuladores: observação dos eventos do registo ---------- */
  function supCritUso(x, y) {
    const k = chave(x, y), acc = supCrit.acc;
    acc.uso.set(k, (acc.uso.get(k) || 0) + 1);
  }
  function supCritClipsDe(id) {
    const el = ELENCO.find(u => u.id === id);
    if (!el) return null;
    return supCrit.clips.has(el.modelo) ? supCrit.clips.get(el.modelo) : null;
  }
  function supCritRegistaModelos(s) {
    if (!s || !Array.isArray(s.models)) return;
    for (const m of s.models)
      if (m && typeof m.modelo === 'string' && Array.isArray(m.clips))
        supCrit.clips.set(m.modelo, m.clips.slice());
  }
  function supCritFecharTurno(ts) {
    const ctx = supCrit.turnoCtx;
    if (!ctx) return;
    supCrit.turnoCtx = null;
    let envelope = null;
    if (ctx.actor === PROPRIA && ctx.auto)
      envelope = Math.max(1, ctx.accoes) * PASSO_AUTO_MS
        + (ctx.moveu ? Math.min(1200, Math.max(220, ctx.passos * 140)) : 0);
    else if (ctx.actor !== PROPRIA)
      envelope = ESPERA_ANUNCIO_MS + ESPERA_FIM_MS + (ctx.atacou ? ESPERA_ATAQUE_MS : 0)
        + (ctx.moveu ? Math.min(1700, Math.max(220, ctx.passos * 190)) : 0);
    /* A vez manual dela não tem envelope honesto (o tempo de
       pensar é dela) — envelope null e o M1 ignora-a: lacuna
       declarada nas NOTAS. */
    supCrit.acc.turnos.push({
      actor: ctx.actor, rodada: ctx.rodada, auto: !!ctx.auto,
      inicio: ctx.inicio, durMs: ts - ctx.inicio, vel: ctx.vel,
      passos: ctx.passos, moveu: ctx.moveu, atacou: ctx.atacou, envelopeMs: envelope
    });
  }
  function supCritAntesDePassarVez() {
    if (supCritDesligado) return;
    const acc = supCrit.acc, ctx = supCrit.turnoCtx;
    if (vezAtual === PROPRIA) {
      if (ctx && ctx.actor === PROPRIA) {
        if (!ctx.moveu && !ctx.atacou && !ctx.transformou
          && reservaMovimento >= DESLOCAMENTO_ONG_M - 1e-9) acc.ongVazias++;
        const alvoAoAlcance = ELENCO.some(u => u.id !== PROPRIA
          && unidade(u.id) && unidade(u.id).vivo !== false
          && distanciaEntre(PROPRIA, u.id) <= COMBATE_TEST.ong.alcance);
        if (!ctx.atacou && reservaMovimento >= DESLOCAMENTO_ONG_M / 2 && alvoAoAlcance)
          acc.ongDesperdicadas++;
      }
      /* J2: a espera de quem joga começa quando a vez dela fecha. */
      supCrit.espera = { ts: Date.now(), rodada, vel: velocidade };
    } else if (ctx && ctx.actor === vezAtual && !ctx.moveu && !ctx.atacou) {
      acc.monstroSemAgir.set(vezAtual, (acc.monstroSemAgir.get(vezAtual) || 0) + 1);
    }
  }
  function supCritRegistaMovimento(ev) {
    const acc = supCrit.acc;
    const path = Array.isArray(ev.path) ? ev.path.map(p => ({ x: p.x, y: p.y })) : null;
    if (ev.de) supCritUso(ev.de.x, ev.de.y);
    let celulas = [];
    if (path && path.length) { celulas = path; for (const p of path) supCritUso(p.x, p.y); }
    else if (ev.para) { celulas = [ev.para]; supCritUso(ev.para.x, ev.para.y); }
    acc.movimentos.push({
      actor: ev.actor, rodada: ev.rodada, de: ev.de || null, para: ev.para || null,
      passos: ev.passos || celulas.length, caminho: celulas
    });
    /* Segmento de movimento (A1/J4): partida registada → moveend.
       Amostras de animação SÓ contam as que caem DURANTE o
       segmento (eventos stats com o segmento aberto). */
    const auto = ev.actor === PROPRIA && modoAutomatico;
    supCrit.abertos.set(ev.actor, {
      actor: ev.actor, rodada: ev.rodada, inicio: ev.ts, passos: ev.passos || celulas.length,
      segId: ++supCritSeqSeg,   // F3: identidade do movimento, para etiquetar as amostras de enquadramento
      amostras: [], auto, alvoAuto: auto ? alvo : null,
      distAntes: auto && alvo ? distanciaEntre(PROPRIA, alvo) : null
    });
    acc.ultimoActo[ev.actor] = { ts: ev.ts, vel: velocidade };
  }
  function supCritObservarEvento(ev) {
    if (supCritDesligado || !ev) return;
    const acc = supCrit.acc;
    if (ev.tipo === 'turno') {
      supCritFecharTurno(ev.ts);
      const actor = ev.vezSnap || ev.vez;
      supCrit.turnoCtx = {
        actor, rodada: ev.rodada, inicio: ev.ts, vel: velocidade,
        auto: actor === PROPRIA && modoAutomatico,
        moveu: false, atacou: false, transformou: false, passos: 0, accoes: 0
      };
      for (const u of view.getState().units) supCritUso(u.posicao.x, u.posicao.y);
      if (supCrit.ultimoStats) supCritFronteira(ev.rodada);
      supCritAmostraEnq('turno');
      if (actor === PROPRIA && supCrit.espera) {
        const e = supCrit.espera;
        supCrit.espera = null;
        acc.esperas.push({ rodada: e.rodada, durMs: ev.ts - e.ts, vel: e.vel });
      }
      if (ev.rodada > supCrit.ultRodadaVista) {
        const fechada = supCrit.ultRodadaVista;
        supCrit.ultRodadaVista = ev.rodada;
        supCritAvaliar(fechada, false);
      }
      return;
    }
    if (ev.tipo === 'accao') {
      acc.runChave = null; acc.runN = 0;   // acção legal quebra a série de recusas (J3)
      const ctx = supCrit.turnoCtx;
      if (ctx && ev.actor === ctx.actor) {
        ctx.accoes++;
        if (ev.acao === 'mover') { ctx.moveu = true; ctx.passos += ev.passos || 0; }
        if (ev.acao === 'ataque' || ev.acao === 'ataque-basico') ctx.atacou = true;
        if (ev.acao === 'confirmar' && ataquePendente && ataquePendente.tipo === 'transformacao')
          ctx.transformou = true;
      }
      if (ev.acao === 'mover') supCritRegistaMovimento(ev);
      if (ev.acao === 'ataque') {
        acc.ataquesTotais++;
        acc.ultimoAtaqueActor = ev.actor;
        acc.ataques.push({ actor: ev.actor, alvo: ev.alvo, acerto: !!ev.acerto, dano: ev.dano || 0, rodada: ev.rodada });
        if (ev.alvo === PROPRIA && ev.acerto && ev.dano) {
          acc.danoPorActor.set(ev.actor, (acc.danoPorActor.get(ev.actor) || 0) + ev.dano);
          acc.danoPorRodada.set(ev.rodada, (acc.danoPorRodada.get(ev.rodada) || 0) + ev.dano);
          acc.danoTotal += ev.dano;
        }
      }
      if (ev.acao === 'ataque-basico' && ev.actor === PROPRIA && ev.alvo) {
        const distAlvo = distanciaEntre(PROPRIA, ev.alvo);
        let outro = false;
        for (const u of ELENCO) {
          if (u.id === PROPRIA || u.id === ev.alvo) continue;
          const un = unidade(u.id);
          if (un && un.vivo !== false && distanciaEntre(PROPRIA, u.id) <= distAlvo) { outro = true; break; }
        }
        const reg = { alvo: ev.alvo, rodada: ev.rodada, distanciaAlvo: distAlvo === Infinity ? null : distAlvo, outroMaisPertoOuIgual: outro };
        if (modoAutomatico) acc.ataquesOngAuto.push(reg); else acc.ataquesOngManual.push(reg);
      }
      if (ev.actor && acc.ultimoActo[ev.actor]) acc.ultimoActo[ev.actor] = { ts: ev.ts, vel: velocidade };
      return;
    }
    if (ev.tipo === 'bloqueada') {
      const chaveR = (ev.acao || '') + '|' + (ev.razao || '');
      acc.recusas.set(chaveR, (acc.recusas.get(chaveR) || 0) + 1);
      if (acc.runChave === chaveR) acc.runN++; else { acc.runChave = chaveR; acc.runN = 1; }
      if (acc.runN > (acc.runMax.get(chaveR) || 0)) acc.runMax.set(chaveR, acc.runN);
      return;
    }
    if (ev.tipo === 'fluidez') { acc.lacunas.push({ rodada: ev.rodada, lacunaMs: ev.lacunaMs || 0 }); return; }
    if (ev.tipo === 'restauro' && ev.ok) {
      /* Segmento novo: os acumuladores NÃO cruzam o corte; as
         dicas já emitidas ficam, marcadas com o seu segmento.
         Correcções T1.7 (F1): as SÉRIES de amostras também
         recomeçam — enquadramento, FPS, fronteiras e tempos de
         frame não podem cruzar o corte (uma dica Q1/V3/Q3 não
         pode nascer de amostras de um futuro apagado). */
      supCrit.segmento++;
      supCrit.acc = supCritNovoAcc();
      supCrit.turnoCtx = null; supCrit.espera = null;
      supCrit.abertos.clear();
      supCrit.enq = []; supCrit.fpsAm = [];
      supCrit.fronteiras = []; supCrit.frames = []; supCrit.framesLen = 0;
      supCrit.ultRodadaVista = rodada;
      return;
    }
    if (ev.tipo === 'fim' && !ev.congelamento) {
      supCritFecharTurno(ev.ts);
      supCritAvaliar(ev.rodada, true);
      supCritSomarAgregado(ev.rodada);
    }
  }
  function supCritAutoSemDestino() {
    if (!supCritDesligado) supCrit.acc.autoSemDestino++;
  }
  function supCritSomarAgregado(rodadaQueda) {
    if (supCrit.agregadoSomado) return;
    supCrit.agregadoSomado = true;
    const acc = supCrit.acc, agg = supCritAgg;
    agg.batalhas++;
    agg.quedas[rodadaQueda] = (agg.quedas[rodadaQueda] || 0) + 1;
    for (const [k, v] of acc.uso) agg.usoCasas[k] = (agg.usoCasas[k] || 0) + v;
    for (const a of acc.ataquesOngAuto) agg.alvosAuto[a.alvo] = (agg.alvosAuto[a.alvo] || 0) + 1;
    for (const [k, v] of acc.deslize) agg.deslize[k] = (agg.deslize[k] || 0) + v;
    if (supCrit.fpsAm.length) {
      const fs = supCrit.fpsAm.map(a => a.fps);
      agg.fps.push({ min: Math.min(...fs), mediana: supCritMediana(fs) });
      while (agg.fps.length > 50) agg.fps.shift();   // tecto do agregado: últimas 50 batalhas
    }
    supCritAggGuardar();
  }

  /* ---------- amostras: stats, enquadramento, fronteiras ---------- */
  function supCritAmostraStats(s) {
    if (supCritDesligado || !s) return;
    supCrit.ultimoStats = s;
    const agora = performance.now();
    if (!supCrit.tStats1) supCrit.tStats1 = agora;
    supCritRegistaModelos(s);
    if (agora - supCrit.ultFpsTs >= 1000) {   // FPS: ≤1/s, como o Supervisor
      supCrit.ultFpsTs = agora;
      if (typeof s.fps === 'number') {
        supCrit.fpsAm.push({ rodada, fps: Math.round(s.fps) });
        while (supCrit.fpsAm.length > 300) supCrit.fpsAm.shift();
      }
    }
    /* Amostras de animação DENTRO dos segmentos abertos (A1). */
    if (s.animations && typeof s.animations.walk === 'number')
      for (const seg of supCrit.abertos.values()) seg.amostras.push(s.animations.walk);
    supCritAmostraEnq('stats');
  }
  function supCritAmostraEnq(motivo) {
    if (supCritDesligado) return;
    const agora = performance.now();
    if (agora - supCrit.ultEnq < 500) return;   // ≤2/s
    supCrit.ultEnq = agora;
    const rectos = {};
    for (const u of ELENCO) {
      try {
        const r = view.projectUnit(u.id);
        if (r) rectos[u.id] = [r.left, r.right, r.top, r.bottom];
      } catch (_) { supCritErrosCamada++; }
    }
    if (!Object.keys(rectos).length) return;
    /* F3: a amostra fica etiquetada com o segmento de movimento
       aberto de cada figura (actor → segId) — é o que permite ao
       V2 agrupar as amostras POR MOVIMENTO. */
    const segs = {};
    for (const seg of supCrit.abertos.values()) segs[seg.actor] = seg.segId;
    supCrit.enq.push({ ts: Date.now(), rodada, vez: vezAtual, motivo, rectos, segs });
    while (supCrit.enq.length > 200) supCrit.enq.shift();
  }
  function supCritRelogio() { supCritAmostraEnq('relogio'); }
  function supCritFronteira(r) {
    const s = supCrit.ultimoStats;
    if (!s || !Array.isArray(s.models)) return;
    const total = s.totalTriangles || 0;
    supCrit.fronteiras.push({
      rodada: r, total, drawCalls: s.drawCalls || 0,
      modelos: s.models.map(m => ({
        modelo: m.modelo, triangles: m.triangles || 0,
        parte: total ? Math.round((m.triangles || 0) / total * 100) : 0
      }))
    });
    while (supCrit.fronteiras.length > 60) supCrit.fronteiras.shift();
  }
  function supCritFecharMovimento(id) {
    if (supCritDesligado) return;
    const acc = supCrit.acc;
    const seg = supCrit.abertos.get(id);
    supCritAmostraEnq('moveend');
    if (!seg) return;
    supCrit.abertos.delete(id);
    /* A1 — deslize, com a regra de honestidade do desenho: sem
       clipe de andar, deslize por construção (casas todas); com
       clipe, só se afirma com amostras DURANTE o segmento, todas
       com walk = 0; sem amostras dentro, não se afirma nada. */
    const clips = supCritClipsDe(id);
    let deslize = null;
    if (clips !== null && !clips.some(n => /walk|andar/i.test(String(n)))) deslize = seg.passos;
    else if (clips !== null) {
      if (seg.amostras.length && seg.amostras.every(w => w === 0)) deslize = seg.passos;
      else if (seg.amostras.length) deslize = 0;
    }
    if (deslize === null) acc.naoMedidos++;
    else if (deslize > 0) acc.deslize.set(id, (acc.deslize.get(id) || 0) + deslize);
    acc.movidos.set(id, (acc.movidos.get(id) || 0) + seg.passos);
    if (seg.auto && seg.alvoAuto && seg.distAntes !== null) {
      if (distanciaEntre(PROPRIA, seg.alvoAuto) >= seg.distAntes) acc.autoSemAproximar++;
    }
    if (acc.ultimoActo[id]) acc.ultimoActo[id] = { ts: Date.now(), vel: velocidade };
  }

  /* ---------- motores de padrões (duas cadências) ---------- */
  function supCritAvaliar(r, fim) {
    if (supCritDesligado) return;
    /* Correcções T1.7: os catch dos motores contam em
       analises.errosCamada (F10.7) — engolidos, mas visíveis. */
    const P = [supCritAvalM1, supCritAvalM2, supCritAvalM6,
      supCritAvalV, supCritAvalQ1, supCritAvalQ2, supCritAvalQ3, supCritAvalQ4,
      supCritAvalA1, supCritAvalA2,
      supCritAvalJ1, supCritAvalJ2, supCritAvalJ3, supCritAvalJ4];
    for (const f of P) { try { f(r); } catch (_) { supCritErrosCamada++; } }
    if (fim) {
      try { supCritAvalM3(r); } catch (_) { supCritErrosCamada++; }
      /* F2 (via (a), a escolhida): o M4 avalia SÓ no fim da batalha,
         como M3/M5/A3 — uma dica de foco emitida a meio podia ficar
         falsa no fim (o foco diluía-se e ninguém retractava), e a
         exportação final é o artefacto que os críticos lêem.
         Nenhum outro motor depende da cadência de rodada do M4:
         ele só lê danoPorActor/ataquesOngAuto, que ninguém consome. */
      try { supCritAvalM4(r); } catch (_) { supCritErrosCamada++; }
      try { supCritAvalM5(r); } catch (_) { supCritErrosCamada++; }
      try { supCritAvalA3(r); } catch (_) { supCritErrosCamada++; }   // estrutural: uma vez, com o total final
    }
  }
  function supCritAvalM1(r) {
    const grupos = new Map();
    for (const t of supCrit.acc.turnos) {
      if (t.envelopeMs === null || t.envelopeMs === undefined) continue;
      const g = t.actor === PROPRIA ? 'ong-auto' : t.actor;
      if (!grupos.has(g)) grupos.set(g, []);
      grupos.get(g).push(t);
    }
    for (const [g, ts] of grupos) {
      const actor = g === 'ong-auto' ? PROPRIA : g;
      const nome = nomeCena(actor);
      if (ts.length >= 2) {
        const medJogo = supCritMediana(ts.map(t => t.durMs * t.vel));
        const medEnv = supCritMediana(ts.map(t => t.envelopeMs));
        if (medJogo > medEnv * 1.4) {
          const medReal = supCritMediana(ts.map(t => t.durMs));
          const velRef = supCritMediana(ts.map(t => t.vel)) || 1;
          /* R-EXP-7c: a frase diz também o ESPERADO (o envelope
             mediano, em tempo real à velocidade de referência). */
          const espReal = medEnv / velRef;
          supCritEmitir({
            categoria: 'mecanica', padrao: 'ritmo-turno', actor, rodada: r, vez: actor,
            medida: Math.round(medReal),
            limiar: Math.round(medEnv * 1.4 / velRef),
            prioridade: ts.length * (medJogo / (medEnv * 1.4)),
            texto: `As vezes de ${nome} estão a demorar mais do que o esperado — cerca de ${supCritSeg(medReal)} segundos por vez, quando o esperado era cerca de ${supCritSeg(espReal)} segundos.`
          });
          continue;
        }
      }
      for (const t of ts) {
        if (t.durMs * t.vel > 2 * t.envelopeMs && !(t.moveu && t.passos >= 6)) {
          supCritEmitir({
            categoria: 'mecanica', padrao: 'ritmo-turno', actor, rodada: t.rodada, vez: actor,
            assunto: 'isolado', medida: Math.round(t.durMs), limiar: Math.round(2 * t.envelopeMs / t.vel),
            prioridade: 2 * (t.durMs * t.vel / (2 * t.envelopeMs)),
            texto: `Uma vez de ${nome} demorou ${supCritSeg(t.durMs)} segundos — o dobro do esperado para o que ela fez.`
          });
          break;
        }
      }
    }
    /* Ritmo da rodada (a outra metade do M1): duração por rodada. */
    const porRodada = new Map();
    for (const t of supCrit.acc.turnos) {
      if (!porRodada.has(t.rodada)) porRodada.set(t.rodada, []);
      porRodada.get(t.rodada).push(t);
    }
    const fechadas = [...porRodada.keys()].filter(x => x <= r);
    if (fechadas.length >= 2) {
      const dur = rr => porRodada.get(rr).reduce((a, t) => a + t.durMs * t.vel, 0);
      const ultima = fechadas[fechadas.length - 1], primeira = fechadas[0];
      if (dur(ultima) > dur(primeira) * 1.4 && dur(primeira) > 0) {
        supCritEmitir({
          categoria: 'mecanica', padrao: 'ritmo-rodada', actor: PROPRIA, rodada: ultima, vez: PROPRIA,
          medida: Math.round(porRodada.get(ultima).reduce((a, t) => a + t.durMs, 0)),
          limiar: Math.round(porRodada.get(primeira).reduce((a, t) => a + t.durMs, 0) * 1.4
            / supCritMediana(porRodada.get(ultima).map(t => t.vel))),
          prioridade: dur(ultima) / dur(primeira),
          texto: `A rodada ${ultima} demorou ${supCritSeg(porRodada.get(ultima).reduce((a, t) => a + t.durMs, 0))} segundos; a rodada ${primeira} tinha demorado ${supCritSeg(porRodada.get(primeira).reduce((a, t) => a + t.durMs, 0))}. O ritmo não está igual.`
        });
      }
    }
  }
  function supCritAvalM2(r) {
    const acc = supCrit.acc;
    const sigs = new Map(), dest = new Map();
    for (const mv of acc.movimentos) {
      let cam = mv.caminho.map(p => p.x + ',' + p.y);
      if (mv.de && cam.length && cam[0] === mv.de.x + ',' + mv.de.y) cam = cam.slice(1);
      const sig = (mv.de ? mv.de.x + ',' + mv.de.y : '?') + '>' + cam.join(';');
      const k1 = mv.actor + '|' + sig;
      sigs.set(k1, (sigs.get(k1) || 0) + 1);
      if (mv.para) {
        const k2 = mv.actor + '|' + mv.para.x + ',' + mv.para.y;
        if (!dest.has(mv.actor)) dest.set(mv.actor, { total: 0, por: new Map() });
        const dd = dest.get(mv.actor);
        dd.total++; dd.por.set(k2, (dd.por.get(k2) || 0) + 1);
      }
    }
    for (const [k, n] of sigs) {
      if (n < 2) continue;
      const actor = k.split('|')[0];
      supCritEmitir({
        categoria: 'mecanica', padrao: 'caminho-repetido', actor, rodada: r, vez: actor,
        assunto: k, medida: n, limiar: 2, prioridade: n,
        texto: `${nomeCena(actor)} andou ${n} vezes pelo mesmo caminho até à mesma casa. A batalha está a repetir-se.`
      });
    }
    for (const [actor, dd] of dest) {
      if (dd.total < 3) continue;
      for (const [k, n] of dd.por) {
        const parte = Math.round(n / dd.total * 100);
        if (parte >= 60) supCritEmitir({
          categoria: 'mecanica', padrao: 'caminho-repetido', actor, rodada: r, vez: actor,
          assunto: 'destino:' + k, medida: parte, limiar: 60, prioridade: n * (parte / 60),
          texto: `${nomeCena(actor)} vai quase sempre parar à mesma casa (${n} de ${dd.total} vezes).`
        });
      }
    }
  }
  function supCritAvalM3(r) {
    const acc = supCrit.acc;
    const usadas = acc.uso.size, mortas = 70 - usadas;
    const pct = Math.round(mortas / 70 * 100);
    if (pct < 35) return;
    const quadrantes = [
      ['o canto de cima, à esquerda', (x, y) => x < 5 && y < 4],
      ['o canto de cima, à direita', (x, y) => x >= 5 && y < 4],
      ['o canto de baixo, à esquerda', (x, y) => x < 5 && y >= 4],
      ['o canto de baixo, à direita', (x, y) => x >= 5 && y >= 4]
    ];
    let pior = null;
    for (const [nome, f] of quadrantes) {
      let n = 0, total = 0;
      for (let x = 0; x < 10; x++) for (let y = 0; y < 7; y++) {
        if (!f(x, y)) continue;
        total++;
        if (!acc.uso.has(chave(x, y))) n++;
      }
      /* Correcções T1.7 (F10.6): a zona nomeada é a de maior
         PROPORÇÃO de casas mortas — os quadrantes de cima têm 20
         casas e os de baixo 15; a contagem absoluta favorecia os
         de cima mesmo com um de baixo 100% morto. */
      const prop = total ? n / total : 0;
      if (!pior || prop > pior.prop) pior = { nome, n, prop };
    }
    supCritEmitir({
      categoria: 'mecanica', padrao: 'zona-morta', actor: PROPRIA, rodada: r, vez: PROPRIA, actualizar: true,
      /* F10.1: o assunto é a zona — a chave crónica (padrão+actor+
         assunto) distingue zonas mortas diferentes entre batalhas.
         R-EXP-5: facto de batalha inteira → ambito 'batalha'. */
      assunto: pior ? pior.nome : '', ambito: 'batalha',
      medida: pct, limiar: 35, prioridade: pct / 35,
      texto: `${mortas} das 70 casas do campo nunca foram pisadas nesta batalha — ${pior ? pior.nome : 'uma parte do campo'} ficou morto.`
    });
  }
  function supCritAvalM4(r) {
    const acc = supCrit.acc;
    if (acc.danoTotal > 0) {
      for (const [actor, dano] of acc.danoPorActor) {
        const parte = Math.round(dano / acc.danoTotal * 100);
        if (parte > 60) supCritEmitir({
          categoria: 'mecanica', padrao: 'foco-de-dano', actor, rodada: r, vez: actor, actualizar: true,
          medida: parte, limiar: 60, prioridade: parte / 60,
          texto: `Quase todo o dano que a Ong levou veio de ${nomeCena(actor)} (${parte} em cada 100). Os outros quase não contam nesta batalha.`
        });
      }
    }
    const auto = acc.ataquesOngAuto;
    if (auto.length >= 3 && auto.every(a => a.alvo === auto[0].alvo)
      && auto.some(a => a.outroMaisPertoOuIgual)) {
      supCritEmitir({
        categoria: 'mecanica', padrao: 'foco-da-ong-auto', actor: PROPRIA, rodada: r, vez: PROPRIA, actualizar: true,
        medida: auto.length, limiar: 3, prioridade: auto.length / 3,
        texto: `A Ong automática bateu sempre no mesmo inimigo (${auto.length} ataques), mesmo quando outro estava mais perto.`
      });
    }
  }
  function supCritAvalM5(r) {
    if (r <= 1 || r > 5) {
      supCritEmitir({
        categoria: 'mecanica', padrao: 'queda-fora-da-janela', actor: PROPRIA, rodada: r, vez: PROPRIA, actualizar: true,
        medida: r, limiar: r <= 1 ? 2 : 5, prioridade: 2,
        texto: r <= 1
          ? `A Ong caiu logo na 1.ª rodada — o normal desta batalha é cair no fim da 2.ª. A batalha está mais dura do que devia.`
          : `Ela aguentou até à ${r}.ª rodada. Com estes três inimigos, o esperado era cair muito antes.`
      });
    }
    const acc = supCrit.acc;
    if (acc.danoTotal > 0) {
      for (const [rr, dano] of acc.danoPorRodada) {
        const parte = Math.round(dano / acc.danoTotal * 100);
        if (parte > 70) supCritEmitir({
          categoria: 'mecanica', padrao: 'dano-concentrado', actor: PROPRIA, rodada: rr, vez: PROPRIA, actualizar: true,
          medida: parte, limiar: 70, prioridade: parte / 70,
          texto: `Quase todo o dano que a Ong levou caiu numa só rodada (a ${rr}.ª): ${parte} em cada 100.`
        });
      }
    }
  }
  function supCritAvalM6(r) {
    const acc = supCrit.acc;
    if (acc.ongDesperdicadas >= 2) supCritEmitir({
      categoria: 'mecanica', padrao: 'accao-desperdicada', actor: PROPRIA, rodada: r, vez: PROPRIA,
      assunto: 'ong-sem-atacar', medida: acc.ongDesperdicadas, limiar: 2, prioridade: acc.ongDesperdicadas / 2,
      texto: `A Ong fechou ${acc.ongDesperdicadas} vezes sem atacar e com mais de metade do andar por gastar.`
    });
    for (const [actor, n] of acc.monstroSemAgir) {
      if (n >= 2) supCritEmitir({
        categoria: 'mecanica', padrao: 'accao-desperdicada', actor, rodada: r, vez: actor,
        assunto: 'monstro-parado:' + actor, medida: n, limiar: 2, prioridade: n / 2,
        texto: `${nomeCena(actor)} passou ${n} vezes sem conseguir chegar perto dela — a vez dele não serviu para nada.`
      });
    }
    for (const [k, n] of acc.recusas) {
      if (n >= 3) {
        const razao = k.split('|')[1] || k;
        supCritEmitir({
          categoria: 'mecanica', padrao: 'accao-desperdicada', actor: PROPRIA, rodada: r, vez: PROPRIA,
          assunto: 'recusas:' + k, medida: n, limiar: 3, prioridade: n / 3,
          texto: `O jogo recusou ${n} vezes a mesma coisa: ${razao}.`
        });
      }
    }
  }
  function supCritAvalV(r) {
    const am = supCrit.enq;
    if (!am.length) return;
    /* Viewport lido com guarda: se uma dimensão não existir no
       ambiente, ela não limita (degradação honesta; nos
       navegadores reais innerWidth/innerHeight existem sempre). */
    /* F10.8: guarda simétrica nas duas dimensões — dimensão em
       falta não limita (antes o innerWidth caía para 0 e tudo
       ficava «fora do ecrã»). */
    const VW = typeof innerWidth === 'number' ? innerWidth : Number.MAX_SAFE_INTEGER;
    const VH = typeof innerHeight === 'number' ? innerHeight : Number.MAX_SAFE_INTEGER;
    for (const u of ELENCO) {
      const daVez = am.filter(a => a.vez === u.id && a.rectos[u.id]);
      if (daVez.length >= 2) {
        const alturas = daVez.map(a => a.rectos[u.id][3] - a.rectos[u.id][2]);
        const abaixo = alturas.filter(h => h < 40).length / alturas.length;
        if (abaixo >= 0.5) supCritEmitir({
          categoria: 'visual', padrao: 'figura-pequena', actor: u.id, rodada: r, vez: u.id,
          medida: Math.round(supCritMediana(alturas)), limiar: 40, prioridade: 1 / Math.max(1, supCritMediana(alturas) / 40),
          texto: `Quando é a vez de ${nomeCena(u.id)}, a figura mede só ${Math.round(supCritMediana(alturas))} pontinhos de ecrã (px) — pequeno demais para se ver o que ela faz.`
        });
      }
      /* V2 (correcção F3): o limiar «>25% fora» mede-se POR
         MOVIMENTO — as amostras agrupam-se pelo segmento de
         movimento em que caíram (partida→moveend, etiqueta `segs`
         posta na amostragem) e os 25% aplicam-se dentro de cada
         movimento, como o desenho define. Um movimento 100% fora
         com peso pequeno na batalha dispara; amostras fora
         espalhadas pela batalha, sem nenhum movimento >25% fora,
         calam. O ramo da fronteira de turno mantém-se como estava. */
      const gruposMov = new Map();
      for (const a of am) {
        if (!a.rectos[u.id]) continue;
        const sid = a.segs && a.segs[u.id];
        if (!sid) continue;
        if (!gruposMov.has(sid)) gruposMov.set(sid, { total: 0, fora: 0 });
        const g = gruposMov.get(sid);
        g.total++;
        const [l, rr2, t, b] = a.rectos[u.id];
        const cx = (l + rr2) / 2, cy = (t + b) / 2;
        if (l < 0 || t < 0 || rr2 > VW || b > VH || cx < 0 || cx > VW || cy < 0 || cy > VH) g.fora++;
      }
      let piorParte = 0;
      for (const g of gruposMov.values())
        if (g.total) piorParte = Math.max(piorParte, Math.round(g.fora / g.total * 100));
      const fronteiraFora = am.some(a => a.motivo === 'turno' && a.vez === u.id && a.rectos[u.id]
        && ((a.rectos[u.id][0] + a.rectos[u.id][1]) / 2 < 0 || (a.rectos[u.id][0] + a.rectos[u.id][1]) / 2 > VW
          || (a.rectos[u.id][2] + a.rectos[u.id][3]) / 2 < 0 || (a.rectos[u.id][2] + a.rectos[u.id][3]) / 2 > VH));
      if (piorParte > 25 || fronteiraFora) supCritEmitir({
        categoria: 'visual', padrao: 'fora-de-enquadramento', actor: u.id, rodada: r, vez: u.id,
        medida: piorParte, limiar: 25, prioridade: Math.max(1, piorParte / 25),
        texto: fronteiraFora && piorParte <= 25
          ? `Na vez de ${nomeCena(u.id)}, a figura nem aparece no ecrã — a câmara ficou noutro sítio.`
          : `${nomeCena(u.id)} passa parte do tempo fora do ecrã (${piorParte} em cada 100 momentos).`
      });
    }
    /* V3: pares colados — sobreposição >50% do recto menor em
       ≥2 amostras seguidas. */
    for (let i = 0; i < ELENCO.length; i++) for (let j = i + 1; j < ELENCO.length; j++) {
      const a = ELENCO[i].id, b = ELENCO[j].id;
      let seguidas = 0, maior = 0, disparou = false;
      for (const s of am) {
        const ra = s.rectos[a], rb = s.rectos[b];
        if (!ra || !rb) { seguidas = 0; continue; }
        const areaA = (ra[1] - ra[0]) * (ra[3] - ra[2]), areaB = (rb[1] - rb[0]) * (rb[3] - rb[2]);
        const inter = Math.max(0, Math.min(ra[1], rb[1]) - Math.max(ra[0], rb[0]))
          * Math.max(0, Math.min(ra[3], rb[3]) - Math.max(ra[2], rb[2]));
        const parte = Math.min(areaA, areaB) > 0 ? inter / Math.min(areaA, areaB) * 100 : 0;
        if (parte > 50) { seguidas++; maior = Math.max(maior, parte); } else seguidas = 0;
        if (seguidas >= 2 && !disparou) {
          disparou = true;
          supCritEmitir({
            categoria: 'visual', padrao: 'figuras-coladas', actor: a, rodada: s.rodada, vez: s.vez,
            assunto: 'par:' + a + '+' + b, medida: Math.round(maior), limiar: 50, prioridade: maior / 50,
            texto: `${nomeCena(a)} e ${nomeCena(b)} ficam um em cima do outro no ecrã durante a luta — não se percebe quem é quem.`
          });
        }
      }
    }
  }
  function supCritAvalQ1(r) {
    const am = supCrit.fpsAm, acc = supCrit.acc;
    if (am.length >= 5) {
      const abaixo = Math.round(am.filter(a => a.fps < 30).length / am.length * 100);
      if (abaixo >= 20) {
        const min = am.reduce((a, b) => (b.fps < a.fps ? b : a), am[0]);
        supCritEmitir({
          categoria: 'maquina', padrao: 'fluidez', actor: PROPRIA, rodada: min.rodada, vez: PROPRIA,
          assunto: 'abaixo30', ambito: 'batalha', medida: abaixo, limiar: 20, prioridade: abaixo / 20,
          texto: `Os quadros caíram para ${min.fps} por segundo na rodada ${min.rodada}. Em ${abaixo} de cada 100 momentos, o jogo esteve abaixo dos 30 quadros por segundo.`
        });
      }
      for (let i = 0; i + 1 < am.length; i++) {
        if (am[i].fps - am[i + 1].fps > 20) {
          const seg3 = am.slice(i + 1, i + 4);
          if (!seg3.length || supCritMediana(seg3.map(a => a.fps)) < am[i].fps - 10) {
            supCritEmitir({
              categoria: 'maquina', padrao: 'fluidez', actor: PROPRIA, rodada: am[i + 1].rodada, vez: PROPRIA,
              assunto: 'queda', ambito: 'batalha', medida: am[i].fps - am[i + 1].fps, limiar: 20, prioridade: (am[i].fps - am[i + 1].fps) / 20,
              texto: `Os quadros caíram de repente, de ${am[i].fps} para ${am[i + 1].fps} por segundo, na rodada ${am[i + 1].rodada}, e não voltaram logo ao normal.`
            });
            break;
          }
        }
      }
    }
    if (acc.lacunas.length) {
      const maior = acc.lacunas.reduce((a, b) => (b.lacunaMs > a.lacunaMs ? b : a), acc.lacunas[0]);
      supCritEmitir({
        categoria: 'maquina', padrao: 'fluidez', actor: PROPRIA, rodada: maior.rodada, vez: PROPRIA,
        assunto: 'lacuna', ambito: 'batalha', medida: maior.lacunaMs, limiar: 2000, prioridade: maior.lacunaMs / 2000,
        texto: `O jogo engasgou uma vez durante ${supCritSeg(maior.lacunaMs)} segundos, na rodada ${maior.rodada}.`
      });
    }
  }
  function supCritAvalQ2(r) {
    if (typeof view.getFrameTimes !== 'function') return;
    let ft = [];
    try { ft = view.getFrameTimes() || []; } catch (_) { supCritErrosCamada++; return; }
    if (!Array.isArray(ft) || ft.length < 10) return;
    let troco = ft.slice(supCrit.framesLen);
    if (troco.length < 10) troco = ft;
    supCrit.framesLen = ft.length;
    const ord = [...troco].sort((a, b) => a - b);
    const p95 = ord[Math.min(ord.length - 1, Math.floor(ord.length * 0.95))];
    supCrit.frames.push({ rodada: r, p95: Math.round(p95 * 10) / 10, n: troco.length });
    while (supCrit.frames.length > 40) supCrit.frames.shift();
    const daRodada = supCrit.fpsAm.filter(a => a.rodada === r);
    const mediaFps = daRodada.length ? daRodada.reduce((a, b) => a + b.fps, 0) / daRodada.length : null;
    /* Correcções T1.7 (F4): sem FPS da rodada conhecido (mediaFps
       null), o Q2 CALA — a condição do desenho é «numa rodada com
       FPS médio ≥ 50», e dada-como-cumprida não é cumprida.
       R-EXP-7a: a frase traz o p95 MEDIDO, em milissegundos. */
    if (p95 > 33 && mediaFps !== null && mediaFps >= 50) supCritEmitir({
      categoria: 'maquina', padrao: 'tempos-de-frame', actor: PROPRIA, rodada: r, vez: PROPRIA,
      medida: Math.round(p95), limiar: 33, prioridade: p95 / 33,
      texto: `A média parece boa, mas há saltos: 1 em cada 20 imagens demora ${Math.round(p95)} milissegundos — o dobro do tempo normal. É isso que faz o jogo parecer aos soluços.`
    });
  }
  function supCritAvalQ3(r) {
    const fr = supCrit.fronteiras;
    if (!fr.length) return;
    const ult = fr[fr.length - 1];
    for (const m of ult.modelos) {
      if (m.parte > 60) {
        const dono = ELENCO.find(u => u.modelo === m.modelo);
        supCritEmitir({
          categoria: 'maquina', padrao: 'peso-da-cena', actor: dono ? dono.id : PROPRIA, rodada: r,
          vez: dono ? dono.id : PROPRIA, assunto: 'modelo:' + m.modelo,
          medida: m.parte, limiar: 60, prioridade: m.parte / 60,
          /* E-8 (oportunista): sem dono encontrado, a frase cai
             para «uma figura» — nunca o nome interno do modelo. */
          texto: `Quase todo o peso do desenho está numa figura só: ${dono ? nomeCena(dono.id) : 'uma figura'} tem ${m.parte} em cada 100 triângulos da cena.`
        });
      }
    }
    for (let i = 1; i < fr.length; i++) {
      /* Correcções T1.7 (F10.4): a condição do desenho «sem ter
         entrado figura nova» — se o n.º de modelos difere entre as
         duas fronteiras comparadas, o par não se compara (cala). */
      if (fr[i].modelos.length !== fr[i - 1].modelos.length) continue;
      if (fr[i - 1].total > 0 && fr[i].total > fr[i - 1].total * 1.25) {
        const subida = Math.round((fr[i].total / fr[i - 1].total - 1) * 100);
        supCritEmitir({
          categoria: 'maquina', padrao: 'peso-da-cena', actor: PROPRIA, rodada: r, vez: PROPRIA,
          assunto: 'crescimento', ambito: 'batalha', medida: subida, limiar: 25,
          prioridade: fr[i].total / fr[i - 1].total,
          /* R-EXP-7b: a frase traz a subida MEDIDA. */
          texto: `O número de triângulos subiu ${subida}% durante a batalha sem entrar nada novo — pode estar a acumular desenho.`
        });
        break;
      }
    }
  }
  function supCritAvalQ4(r) {
    if (!supCrit.tReady) return;
    const dt = Math.round(supCrit.tReady - supCrit.tInicio);
    if (dt > 3000) supCritEmitir({
      categoria: 'maquina', padrao: 'carregamento', actor: PROPRIA, rodada: r, vez: PROPRIA,
      ambito: 'batalha',   // R-EXP-5: facto de máquina/batalha, não da vez de ninguém
      medida: dt, limiar: 3000, prioridade: dt / 3000,
      /* R-EXP-3a: a causa («o peso está no carregamento das
         figuras») saiu — mede-se só o total casca→ready. */
      texto: `A página demorou ${supCritSeg(dt)} segundos até estar pronta para jogar.`
    });
  }
  function supCritAvalA1(r) {
    const acc = supCrit.acc;
    for (const [actor, casas] of acc.deslize) {
      if (casas >= 1) {
        const total = acc.movidos.get(actor) || casas;
        supCritEmitir({
          categoria: 'animacao', padrao: 'deslize', actor, rodada: r, vez: actor,
          medida: casas, limiar: 1, prioridade: casas,
          texto: `${nomeCena(actor)} deslizou ${casas} casas sem dar um passo — andou como um brinquedo a flutuar (em ${total} casas andadas nesta batalha).`
        });
      }
    }
  }
  function supCritAvalA2(r) {
    const acc = supCrit.acc;
    for (const u of ELENCO) {
      const clips = supCritClipsDe(u.id);
      if (clips !== null && clips.length === 0) supCritEmitir({
        categoria: 'animacao', padrao: 'estatua', actor: u.id, rodada: r, vez: u.id,
        medida: 0, limiar: 1, prioridade: 1,
        texto: `${nomeCena(u.id)} não tem animação nenhuma no modelo — é uma estátua do princípio ao fim.`
      });
      const un = unidade(u.id);
      const ult = acc.ultimoActo[u.id];
      if (un && un.vivo !== false && ult) {
        const paradoMs = Date.now() - ult.ts;
        if (paradoMs * ult.vel > 20000) supCritEmitir({
          categoria: 'animacao', padrao: 'tempo-parado', actor: u.id, rodada: r, vez: u.id,
          medida: Math.round(paradoMs), limiar: Math.round(20000 / ult.vel), prioridade: paradoMs * ult.vel / 20000,
          texto: `${nomeCena(u.id)} ficou ${supCritSeg(paradoMs)} segundos sem se mexer. Parado assim, parece desligado.`
        });
      }
    }
  }
  function supCritAvalA3(r) {
    const acc = supCrit.acc;
    /* Estrutural e de batalha inteira: actor null de propósito —
       a anotação é da batalha, não de uma figura (a âncora da vez
       é a da última figura que atacou). */
    /* T-D: a medida deixou de ser «todos» por construção — conta
       só os ataques SEM apresentação da cena. R1 (correcção do
       julgamento de Fidelidade): os dois contadores vivem no
       MESMO acumulador (acc.ataquesTotais / acc.ataquesComApresentacao
       — mesmo segmento, mesmo reinício) e «apresentado» só conta
       quando a apresentação arranca o gesto por um ataque contado
       no total (ver apresentarConfronto). O max(0,…) fica só como
       guarda de sanidade: por construção apresentados ≤ totais,
       e o valor nasce da contagem, não do clamp. */
    const semGesto = Math.max(0, acc.ataquesTotais - acc.ataquesComApresentacao);
    if (semGesto >= 1) supCritEmitir({
      categoria: 'animacao', padrao: 'ataque-sem-gesto', actor: null,
      ambito: 'batalha',   // R-EXP-5: a âncora é a batalha, não a última figura que atacou
      rodada: r, vez: acc.ultimoAtaqueActor || PROPRIA, actualizar: true,
      medida: semGesto, limiar: 1, prioridade: 1,
      texto: `Os ataques não têm gesto: a figura não levanta o braço nem a pata; só aparece o anel do golpe. Em ${acc.ataquesTotais} ataques, foram ${semGesto} sem gesto.`
    });
  }
  function supCritAvalJ1(r) {
    if (supCrit.acc.ongVazias >= 2) supCritEmitir({
      categoria: 'jogabilidade', padrao: 'vez-vazia', actor: PROPRIA, rodada: r, vez: PROPRIA,
      medida: supCrit.acc.ongVazias, limiar: 2, prioridade: supCrit.acc.ongVazias / 2,
      texto: `${supCrit.acc.ongVazias} vezes da Ong não serviram para nada: nem andou, nem atacou. Ou a posição dela está má, ou falta-lhe alcance.`
    });
  }
  function supCritAvalJ2(r) {
    const es = supCrit.acc.esperas;
    if (!es.length) return;
    const pior = es.reduce((a, b) => (b.durMs * b.vel > a.durMs * a.vel ? b : a), es[0]);
    if (pior.durMs * pior.vel > 20000) {
      supCritEmitir({
        categoria: 'jogabilidade', padrao: 'espera-de-quem-joga', actor: PROPRIA, rodada: pior.rodada, vez: PROPRIA,
        assunto: 'isolada', medida: Math.round(pior.durMs), limiar: Math.round(20000 / pior.vel),
        prioridade: pior.durMs * pior.vel / 20000,
        texto: `Entre uma vez tua e a outra, passaram ${supCritSeg(pior.durMs)} segundos a ver os monstros, na rodada ${pior.rodada}.`
      });
      return;
    }
    const medJogo = supCritMediana(es.map(e => e.durMs * e.vel));
    /* R-EXP-2 (= F9): a frase da mediana diz SÓ a duração medida —
       a decomposição «espera parada vs. eles a andarem» não é
       medida por ninguém e saiu da frase. */
    if (medJogo > 12000) {
      const medReal = supCritMediana(es.map(e => e.durMs));
      const velRef = supCritMediana(es.map(e => e.vel));
      supCritEmitir({
        categoria: 'jogabilidade', padrao: 'espera-de-quem-joga', actor: PROPRIA, rodada: r, vez: PROPRIA,
        assunto: 'mediana', medida: Math.round(medReal), limiar: Math.round(12000 / velRef),
        prioridade: medJogo / 12000,
        texto: `Entre uma vez tua e a outra, passam cerca de ${supCritSeg(medReal)} segundos a ver os monstros.`
      });
    }
  }
  function supCritAvalJ3(r) {
    const acc = supCrit.acc;
    for (const [k, n] of acc.runMax) {
      if (n >= 3) {
        const razao = k.split('|')[1] || k;
        supCritEmitir({
          categoria: 'jogabilidade', padrao: 'toques-sem-efeito', actor: PROPRIA, rodada: r, vez: PROPRIA,
          assunto: 'seguidas:' + k, medida: n, limiar: 3, prioridade: n / 3,
          texto: `Tocaste ${n} vezes seguidas e o jogo só disse que não dava. A razão foi sempre a mesma: ${razao}.`
        });
      }
    }
    for (const [k, n] of acc.recusas) {
      if (n >= 5) {
        const razao = k.split('|')[1] || k;
        supCritEmitir({
          categoria: 'jogabilidade', padrao: 'toques-sem-efeito', actor: PROPRIA, rodada: r, vez: PROPRIA,
          assunto: 'total:' + k, medida: n, limiar: 5, prioridade: n / 5,
          texto: `A mesma recusa apareceu ${n} vezes nesta batalha: ${razao}.`
        });
      }
    }
  }
  function supCritAvalJ4(r) {
    const acc = supCrit.acc;
    if (acc.autoSemAproximar >= 2) supCritEmitir({
      categoria: 'jogabilidade', padrao: 'automatico-sem-aproximar', actor: PROPRIA, rodada: r, vez: PROPRIA,
      assunto: 'sem-aproximar', medida: acc.autoSemAproximar, limiar: 2, prioridade: acc.autoSemAproximar / 2,
      texto: `Com o automático ligado, a Ong andou ${acc.autoSemAproximar} vezes sem ficar mais perto do inimigo. O caminho que ela escolhe pode melhorar.`
    });
    if (acc.autoSemDestino >= 2) supCritEmitir({
      categoria: 'jogabilidade', padrao: 'automatico-sem-aproximar', actor: PROPRIA, rodada: r, vez: PROPRIA,
      assunto: 'sem-destino', medida: acc.autoSemDestino, limiar: 2, prioridade: acc.autoSemDestino / 2,
      texto: `Com o automático ligado, ${acc.autoSemDestino} vezes dela fecharam porque não havia um destino melhor para andar.`
    });
  }

  /* ---------- análises (resumo numérico da exportação) ---------- */
  function supCritAnalises() {
    if (supCritDesligado) return { desligada: true, errosCamada: supCritErrosCamada };
    const acc = supCrit.acc;
    const usoObj = {};
    for (const [k, v] of acc.uso) usoObj[k] = v;
    const fs = supCrit.fpsAm.map(a => a.fps);
    return {
      batalha: supCrit.batalha, segmento: supCrit.segmento,
      mapaUso: { usadas: acc.uso.size, total: 70, casas: usoObj },
      temposTurno: acc.turnos, esperas: acc.esperas,
      movimentos: acc.movimentos, ataques: acc.ataques,
      danoPorActor: Object.fromEntries(acc.danoPorActor),
      danoPorRodada: Object.fromEntries(acc.danoPorRodada), danoTotal: acc.danoTotal,
      ataquesOngAuto: acc.ataquesOngAuto, ataquesOngManual: acc.ataquesOngManual,
      recusas: Object.fromEntries(acc.recusas), recusasSeguidas: Object.fromEntries(acc.runMax),
      lacunas: acc.lacunas,
      ongVazias: acc.ongVazias, ongDesperdicadas: acc.ongDesperdicadas,
      monstroSemAgir: Object.fromEntries(acc.monstroSemAgir),
      fluidez: {
        amostras: supCrit.fpsAm,
        min: fs.length ? Math.min(...fs) : null,
        media: fs.length ? Math.round(fs.reduce((a, b) => a + b, 0) / fs.length * 10) / 10 : null,
        pctAbaixo30: fs.length ? Math.round(fs.filter(f => f < 30).length / fs.length * 100) : null
      },
      frames: supCrit.frames, fronteirasCena: supCrit.fronteiras,
      enquadramento: { amostras: supCrit.enq },
      animacao: {
        deslizePorActor: Object.fromEntries(acc.deslize),
        casasAndadas: Object.fromEntries(acc.movidos),
        segmentosNaoMedidos: acc.naoMedidos,
        ataques: acc.ataquesTotais, ataquesComApresentacao: acc.ataquesComApresentacao, ataquesSemGesto: Math.max(0, acc.ataquesTotais - acc.ataquesComApresentacao),   // R1: par emparelhado no mesmo acumulador; semGesto nasce da contagem (o max é só guarda)
        clipsPorModelo: Object.fromEntries([...supCrit.clips].map(([k, v]) => [k, v.slice()]))
      },
      carregamento: {
        arranqueAteProntoMs: supCrit.tReady ? Math.round(supCrit.tReady - supCrit.tInicio) : null,
        arranqueAtePrimeiroStatsMs: supCrit.tStats1 ? Math.round(supCrit.tStats1 - supCrit.tInicio) : null
      },
      autoSemAproximar: acc.autoSemAproximar, autoSemDestino: acc.autoSemDestino,
      cortadas: supCrit.ocultas,
      errosCamada: supCritErrosCamada,   // F10.7: erros engolidos pelos hooks/motores, contados
      agregado: JSON.parse(JSON.stringify(supCritAgg))
    };
  }
  setInterval(() => {
    supConferirInvariantes('relogio');
    try { supCritRelogio(); } catch (_) { supCritErrosCamada++; }   // T1.7: amostragem de enquadramento (≤2/s, passiva)
  }, SUP_RELOGIO_MS);

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
