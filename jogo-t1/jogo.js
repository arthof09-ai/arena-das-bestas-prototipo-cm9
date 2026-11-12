/* Campo de Batalha — casca da HUD (tranche T1) sobre a cena da rodada 2.
 * A HUD é a da T0 (LIBERADA pelos críticos); o que muda é a ligação:
 * a cena nova (Campo3D rodada 2, cena.js INTOCADO) recebe o elenco
 * oficial por create(), os toques resolvem-se por hitTest (contenção)
 * e os gestos são os da demo do Codex (arrastar = órbita/360,
 * pinça = zoom, toque = seleccionar/agir — sem lutas entre gestos).
 * Sem motor: valores das fichas oficiais; o alcance é a
 * aproximação declarada (BFS da demo) até o motor real mandar as
 * casas — ver NOTAS-T1.md. Silêncio proibido: cada toque e cada botão
 * acabam numa frase na linha de mensagem VISÍVEL.
 * Tranche T1.2 (decisões do Mestre, 03/11 07:52): esta vista é a da
 * jogadora — só a Ong é controlável; as outras figuras são alvo e
 * cartão de vista. E os acertos da Ong mostram números de dano por
 * parcela, com interruptor no pop-up ⚙ — ver NOTAS-T1.md, secção T1.2.
 * Tranches T1.4+T1.3 fundidas (03/11): o combate corria no SISTEMA
 * DELE provisório (teste de 1d6 + bónus de teste contra uma Defesa
 * interna nunca exibida; dano = a expressão de dados da ficha; a
 * Transformação custa PA e debita de verdade) — sistema substituído
 * pela tranche VLAB, ver o parágrafo seguinte — e a batalha tem
 * TURNOS: a vez roda por uma ordem fixa, os monstros agem nas
 * vezes deles por uma IA básica da casca (no jogo de verdade manda
 * o H10 — diferença declarada nas NOTAS) e o movimento dela é uma
 * reserva em metros da ficha dela, gasta por toque ou pelas setas
 * do teclado. Ver NOTAS-T1.md, secção "Tranches T1.4+T1.3".
 * Tranche VLAB (04/11): a resolução de combate passa para o motor
 * pinado vlab-completo.js (VLAB + DMG) — acerto por superação da
 * CA, crítico que força o acerto, falha crítica com a tabela de
 * desgraças dele, testes de morte M3, ataques de oportunidade,
 * Desvincular e Correr validados pelo motor; as substituições e
 * os resíduos nomeados vivem no bloco «combate VLAB» e nas NOTAS,
 * secção "Tranche VLAB". */
(() => {
  'use strict';

  /* ---------- Trinco de arranque único + bandeira consumida ----------
   * (Volta S-001, V-03 — sentença §2 do JULGAMENTO-S001) Esta guarda é
   * a PRIMEIRA coisa executada dentro da IIFE: antes de qualquer
   * leitura de DOM, de Campo3D.create() e de qualquer criação de
   * elementos. Se este documento já arrancou uma vez (a propriedade
   * __CAMPO_ARRANQUE_UNICO__ já existe em window), esta execução
   * termina de imediato, em silêncio — não cria nada, não regista
   * ouvintes, não toca no estado, não lança: a primeira instância
   * continua a ser a única dona da página. A primeira execução sela
   * o trinco por Object.defineProperty (não escrevível, não
   * configurável, não enumerável, valor congelado com o modo lido)
   * e consome a bandeira: window.CAMPO_MESTRE fica trancado com o
   * valor lido ao arranque, por isso levantá-la depois do arranque
   * deixa de ter qualquer efeito, mesmo antes de uma tentativa de
   * re-execução. Fronteira verdadeira: sem re-entrada por uso da
   * página, por globais vivos, por reload, nem por re-execução do
   * script já corrido; quem controlar o documento ANTES do primeiro
   * arranque (cópia local editada, override de DevTools) tem poder
   * equivalente a abrir mestre.html — é contra esse poder que vale
   * a regra NÃO-PUBLICAR (RSM-01), não este trinco. Em cada documento
   * novo (Party, Mestre, reload) o contexto nasce limpo — sem trinco
   * e com a bandeira por trancar — logo nenhum arranque legítimo
   * executa este ficheiro duas vezes no mesmo documento. */
  if (typeof window !== 'undefined' && !!window) {
    if (Object.prototype.hasOwnProperty.call(window, '__CAMPO_ARRANQUE_UNICO__')) return;
    const __modoArranque = window.CAMPO_MESTRE === true;
    try {
      Object.defineProperty(window, '__CAMPO_ARRANQUE_UNICO__', {
        value: Object.freeze({ modoMestre: __modoArranque }),
        writable: false, configurable: false, enumerable: false
      });
    } catch (_) {}
    try {
      Object.defineProperty(window, 'CAMPO_MESTRE', {
        value: __modoArranque, writable: false, configurable: false
      });
    } catch (_) {}
  }

  /* Integração LEVEL UP (passo 0): captura a referência ao motor
     de progressão e apaga-a do global JÁ — mesmo que a cena falhe a
     arrancar (WebGL indisponível), a página nunca fica com o motor
     acessível na consola. As leituras fazem-se mais abaixo, pela
     referência capturada (bloco «progressão lida»). */
  const LU_MOTOR = (typeof LevelUp !== 'undefined' && LevelUp
    && typeof LevelUp.lerProgressao === 'function') ? LevelUp : null;
  if (typeof window !== 'undefined') window.LevelUp = undefined;
  /* Integração VLAB (passo 0, mesmo padrão): captura os motores de
     combate/dano do ficheiro pinado vlab-completo.js (SHA-256
     28cb67b7…a7855; frente VLAB, contrato v1.1 + emendas v1.2) e
     apaga-os do global JÁ. A resolução de combate desta casca passa
     a ser a deles (bloco «combate VLAB»); nada fica acessível na
     consola — na vista da Party, consola incluída. NUANCE DO
     BUNDLE (achado A1 do Crítico 2): o VLAB procura o DMG por
     window.Dmg A CADA chamada (obterCalcularDano), por isso a
     página repõe window.Dmg só durante cada chamada síncrona ao
     motor (vlabComDmg, no bloco «combate VLAB») e volta a apagá-lo
     — em repouso, a consola continua sem acesso aos dois motores. */
  const VLAB_MOTOR = (typeof window !== 'undefined' && window.Vlab
    && typeof window.Vlab.resolverAtaque === 'function') ? window.Vlab : null;
  const DMG_MOTOR = (typeof window !== 'undefined' && window.Dmg
    && typeof window.Dmg.calcularDano === 'function') ? window.Dmg : null;
  if (typeof window !== 'undefined') { window.Vlab = undefined; window.Dmg = undefined; }
  const $ = id => document.getElementById(id);
  const mapaEl = $('mapa'), msgTxt = $('mensagem-txt'), acoesEl = $('acoes');
  const fichaEl = $('ficha'), chipEl = $('fichachip'), cfgEl = $('cfgpop');

  /* ---------- Contexto do Mestre (correcção S-001+M-016) ----------
   * As superfícies de bastidores (Supervisor, «Voltar ao último
   * estado bom», «Exportar registo», dicas do Supervisor-Crítico e
   * o botão de alertas) só nascem na vista do Mestre: mestre.html
   * levanta window.CAMPO_MESTRE ANTES de carregar este ficheiro.
   * Na vista da Party (index.html) a bandeira nunca existe: os
   * controlos NÃO são criados (não é esconder — é não existir) e
   * supExportar/supRestaurar recusam à entrada. Lido UMA vez, ao
   * arranque, e consumido pelo trinco de arranque único (V-03,
   * acima): nenhum código posterior lê nem aceita a bandeira, e
   * levantá-la na consola da página da Party não abre nada — nem
   * por re-execução do script já corrido (a 2.ª execução é um
   * no-op selado). Fronteira verdadeira (sentença §2): sem
   * re-entrada por uso da página, por globais vivos, por reload,
   * nem por re-execução; quem controlar o documento antes do
   * primeiro arranque tem poder equivalente a abrir mestre.html
   * — contra esse poder vale a regra NÃO-PUBLICAR (RSM-01). A
   * entrada do Mestre é o ficheiro mestre.html, só local. */
  const MODO_MESTRE = typeof window !== 'undefined' && !!window
    && window.CAMPO_MESTRE === true;

  /* ---------- elenco oficial do jogo (a figura de teste UAL1 fica
     SÓ na demo do Codex — não é personagem do jogo) ---------- */
  const AREA = { cols: 10, rows: 7, origin: { x: 0, y: 0 } };
  const ELENCO = [
    { id: 'orc',     nome: 'Orc',             modelo: 'modelos/orc-quaternius.glb', x: 3, y: 3, alturaMetros: 3.6,  vivo: true },
    { id: 'ong',     nome: 'Ong',             modelo: 'modelos/ong-rogue.glb',     x: 6, y: 2, alturaMetros: 2.625, vivo: true, animacoes: { idle: 'Idle_B', andar: 'Walking_B', ataque: 'Melee_Unarmed_Attack_Punch_A', reacao: 'Hit_B' } },
    { id: 'capanga', nome: 'Capanga 1',       modelo: 'modelos/capanga-knight.glb', x: 7, y: 4, alturaMetros: 2.7,  vivo: true, animacoes: { idle: 'Idle_B', andar: 'Walking_B', ataque: 'Melee_Unarmed_Attack_Punch_A', reacao: 'Hit_B' } },
    { id: 'lobo',    nome: 'Lobo da Caverna', modelo: 'marcador-lobo',     x: 2, y: 5, alturaMetros: 1.35,  vivo: true }
  ];
  /* Tranche T-D (contrato apresentarAtaque): Ong e Capanga declaram
     também ataque/reacao com os clipes que os GLB viajantes JÁ trazem
     (parse registado no DIFF-API §5: Punch 1,167 s e Hit_A 0,667 s
     dentro dos dois ficheiros). Orc e Lobo NÃO declaram nada: sem
     clipe, a cena degrada sozinha para avanço/recuo (ramo sem-clipe
     do contrato §5) — nenhum gesto inventado na casca. */
  /* FUSÃO T-D sobre o vivo (2026-11-04): os GLB viajantes passam a ser
     os FUNDIDOS da obra T-D (16 clipes/figura) e Ong/Capanga declaram
     o subconjunto que a cena SAGRADA do vivo aceita e executa —
     idle Idle_B (idle vivo), andar Walking_B, reacção Hit_B; o ataque
     Punch_A fica. As chaves correr, esquiva, morte, mortePose e
     levantar e o campo velocidades da casca-td NÃO são declarados: a cena do
     vivo (89d09286…) rejeita-os em addUnit (prova em recibos) — os
     clipes vivem no GLB, sem efeito, até a cena os aceitar.
     Orc: modelo grátis Quaternius (§8 do RELATORIO-TD-CLIPES, ordem
     das 22:00) — caminho só; os 14 clipes do GLB NÃO são declarados
     (o Orc continua figura de teste parada). */
  /* Reservas internas de movimento dos MONSTROS, em casas (T1.3):
     governam só a IA básica nas vezes deles — internas, nunca
     exibidas, lidas apenas pela IA. A Ong NÃO está aqui: a reserva
     dela são os metros da ficha dela (DESLOCAMENTO_ONG_M, abaixo).
     O motor real substituirá isto pelas casasAlcancaveis oficiais. */
  const ORCAMENTOS = { orc: 7, capanga: 6, lobo: 9 };

  let qualidade = 'alta';
  try { qualidade = localStorage.getItem('hudt1-qualidade') || 'alta'; } catch (_) {}
  if (qualidade !== 'alta' && qualidade !== 'media' && qualidade !== 'baixa') qualidade = 'alta';

  /* Opção "Números de dano" (pop-up ⚙): ligada por omissão, persistida
     como a qualidade. É uma OPÇÃO — mora nas configurações, nunca na
     barra. Desligada, nenhum número de dano aparece (ver mostrarDano). */
  let numerosDano = true;
  try { numerosDano = localStorage.getItem('hudt1-numeros-dano') !== 'desligado'; } catch (_) {}

  /* Opção "Tela vermelha" (C-06/C-07 — palavra do Mestre,
     04/11/2026 21:23; FORMA GRADUAL: palavra do Mestre,
     05/11/2026 10:42 — «não quero que seja [só] morrer… quando
     começar a ficar a 15%, 20% de vida já comece a ficar
     vermelhinho… com 25% de vida já começa a ficar vermelhinha…
     e quanto mais perto da morte, mais vai ficando»): as bordas
     avermelham À MEDIDA que a vida DELA desce, sem números, só
     no ecrã da dona. É uma OPÇÃO — mora nas configurações
     (interruptores obrigatórios), nunca na barra; ligada por
     omissão e persistida como as outras. A camada nasce aqui
     (o index.html é sagrado); a pele vive em jogo.css
     (#tela-vermelha) e NÃO muda: a pele da foto da morte é o
     TECTO — a escala só regula a opacidade até ela, nunca além.
     Recomeçar é location.reload() — a camada renasce apagada
     em cada batalha nova. */
  let telaVermelha = true;
  try { telaVermelha = localStorage.getItem('hudt1-tela-vermelha') !== 'desligado'; } catch (_) {}
  /* Interruptor PRÓPRIO do piscar (a mesma palavra dele,
     05/11/2026 10:42: «também [tem de haver] uma opção de
     desligar essa questão de ficar piscando»): desligado, o
     vermelho fica PARADO na intensidade da vida. Ligado por
     omissão — o piscar faz parte da forma — e persistido à
     parte do interruptor geral. */
  let telaVermelhaPiscar = true;
  try { telaVermelhaPiscar = localStorage.getItem('hudt1-tela-vermelha-piscar') !== 'desligado'; } catch (_) {}
  let mortePropriaAdjudicada = false;
  const camadaVermelha = document.createElement('div');
  camadaVermelha.id = 'tela-vermelha';
  camadaVermelha.setAttribute('aria-hidden', 'true');
  document.body.appendChild(camadaVermelha);

  /* A ESCALA GRADUAL (a forma dele, medida no relatório):
     LIMIAR 0,25 — acima de 25% de vida o efeito é ZERO; a 25%
     começa em (quase) nada; daí até 0%/morte cresce por uma
     curva suave (smoothstep do caminho percorrido entre o
     limiar e zero): ~15% ≈ 0,35 do tecto · ~5% ≈ 0,90 · morte
     = 1, o tecto inteiro. A intensidade lê a vida DELA
     (total − danoSofrido, a mesma conta do chip) e segue-a em
     tempo real nos dois sentidos: desce quando ela perde vida
     e SOME quando a vida volta a passar dos 25%. A morte
     adjudicada força o fim da escala (fracção 0) mesmo que a
     conta da vida diga outra coisa. */
  const VERMELHA_LIMIAR = 0.25;
  const vermelhaCurva = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  function intensidadeVermelha() {
    if (!telaVermelha) return 0;
    const total = FICHAS.ong.vida.total;
    const fraccao = mortePropriaAdjudicada ? 0
      : Math.max(0, total - danoSofrido) / total;
    if (fraccao > VERMELHA_LIMIAR) return 0;
    return vermelhaCurva((VERMELHA_LIMIAR - fraccao) / VERMELHA_LIMIAR);
  }

  /* O PISCAR (a mesma palavra: «que fique piscando devagarzinho,
     sem ser muito forte nem epilético»): onda coseno contínua
     de período 3.200 ms (~0,31 Hz — respiração, não flash) e
     amplitude 0,18 da intensidade do momento. O factor vive em
     [1 − 0,18, 1]: o piscar só desce do valor da escala, por
     isso NUNCA passa do tecto. O nível mostrado persegue a
     intensidade com suavidade (~0,45 s para fechar a distância)
     — nenhuma mudança de vida apaga ou acende de golpe. */
  const VERMELHA_PULSO_PERIODO_MS = 3200;
  const VERMELHA_PULSO_AMPLITUDE = 0.18;
  let vermelhaRaf = 0, vermelhaNivel = 0, vermelhaUltimoT = 0;
  function cicloVermelha(agora) {
    vermelhaRaf = 0;
    const base = intensidadeVermelha();
    const dt = vermelhaUltimoT ? Math.min(100, agora - vermelhaUltimoT) : 16;
    vermelhaUltimoT = agora;
    const passo = dt / 450;
    vermelhaNivel += Math.max(-passo, Math.min(passo, base - vermelhaNivel));
    if (base <= 0 && vermelhaNivel <= 0.002) {
      vermelhaNivel = 0;
      camadaVermelha.style.opacity = '0';
      camadaVermelha.classList.remove('on');
      return;
    }
    camadaVermelha.classList.add('on');
    let factor = 1;
    if (telaVermelhaPiscar) {
      const fase = (agora % VERMELHA_PULSO_PERIODO_MS) / VERMELHA_PULSO_PERIODO_MS;
      factor = 1 - VERMELHA_PULSO_AMPLITUDE * (0.5 - 0.5 * Math.cos(2 * Math.PI * fase));
    }
    camadaVermelha.style.opacity = String(Math.round(vermelhaNivel * factor * 1000) / 1000);
    vermelhaRaf = requestAnimationFrame(cicloVermelha);
  }
  /* Ponto único de refresco da camada: chamado por
     atualizarChipVida (toda a mudança de vida dela passa aí —
     dano, restauro/cura), pelo fimDeBatalha (morte adjudicada),
     pelo restauro e pelos dois interruptores do ⚙. Fora do
     limiar e sem nível por desvanecer, a camada fica escondida
     e o ciclo parado. */
  function aplicarTelaVermelha() {
    if (intensidadeVermelha() <= 0 && vermelhaNivel <= 0) {
      if (vermelhaRaf) { cancelAnimationFrame(vermelhaRaf); vermelhaRaf = 0; }
      camadaVermelha.style.opacity = '0';
      camadaVermelha.classList.remove('on');
      return;
    }
    camadaVermelha.classList.add('on');
    if (!vermelhaRaf) { vermelhaUltimoT = 0; vermelhaRaf = requestAnimationFrame(cicloVermelha); }
  }

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
  /* A PORTA DA VELOCIDADE (tranche t-config-entrada, sentença J2 —
   * palavra do Mestre, 11/11 10:26: a velocidade muda a partida, é
   * definição DELE): a chave hudt1-velocidade só se LÊ em
   * MODO_MESTRE. Na vista da jogadora, a velocidade nasce 1 e a
   * chave guardada é IGNORADA — sem ser apagada nem sobrescrita:
   * num aparelho partilhado, o valor do Mestre sobrevive intacto à
   * sessão dela e volta a ser lido quando ele entrar. */
  if (MODO_MESTRE) {
    try {
      const v = localStorage.getItem('hudt1-velocidade');
      if (['1', '1.5', '2', '2.5', '3'].includes(v)) velocidade = Number(v);
    } catch (_) {}
  }
  const ritmo = ms => ms / velocidade;

  let view;
  try {
    view = Campo3D.create(mapaEl, { area: AREA, units: ELENCO, qualidade });
  } catch (error) {
    msgTxt.innerHTML = '<b>WebGL indisponível</b> — tente outro navegador.';
    return;
  }

  /* ---------- Ambiente da partida (tranche AMBIENTE) ----------
   * Estado SEMÂNTICO da partida (desenho DESENHO-PAINEL-AMBIENTE +
   * MAPA-DE-TOQUE): { hora em [0,24) · chuva 0|1|2 · raios bool }.
   * Quem o comanda é o Mestre; quem o DERIVA em luz/chuva/clarão é
   * a vista, por view.aplicarAmbiente (contrato congelado). Aqui
   * mora o estado, a precedência de arranque, o painel do ⚙ (só
   * Mestre, mais abaixo), os sons, o relógio de raios e a escada
   * de degradação. A noite do ritual — {23, 0, false} — é a casa. */
  const AMBIENTE_RITUAL = Object.freeze({ hora: 23, chuva: 0, raios: false, precip: 'chuva' });
  const AMBIENTE_ANcoras = [   // nome → hora exacta (tabela de aliases do painel)
    { nome: 'Madrugada', hora: 3.5 }, { nome: 'Amanhecer', hora: 6.5 },
    { nome: 'Dia', hora: 12.5 }, { nome: 'Entardecer', hora: 18.0 },
    { nome: 'Noite', hora: 23.0 }
  ];
  function ambDominioValido(a) {
    return !!a && typeof a === 'object'
      && typeof a.hora === 'number' && Number.isFinite(a.hora) && a.hora >= 0 && a.hora < 24
      && (a.chuva === 0 || a.chuva === 1 || a.chuva === 2)
      && typeof a.raios === 'boolean'
      && (a.precip === undefined || a.precip === 'chuva' || a.precip === 'neve');
  }
  /* O tipo de precipitação resolvido de um estado qualquer:
   * 'neve'/'chuva' explícitos mandam; ausente herda o tipo
   * vigente (mudar a hora ou a intensidade nunca muda o tipo —
   * VOLTA 3). */
  function ambPrecipDe(e) {
    if (e && e.precip === 'neve') return 'neve';
    if (e && e.precip === 'chuva') return 'chuva';
    return ambientePartida ? ambientePartida.precip : 'chuva';
  }
  function ambNomeHora(hora) {   // âncora mais próxima (distância circular em 24 h)
    let melhor = AMBIENTE_ANcoras[AMBIENTE_ANcoras.length - 1], md = Infinity;
    for (const a of AMBIENTE_ANcoras) {
      let d = Math.abs(hora - a.hora); d = Math.min(d, 24 - d);
      if (d < md) { md = d; melhor = a; }
    }
    return melhor.nome;
  }
  const ambFmtHora = h => (Math.round(h * 10) / 10).toFixed(1).replace('.', ',') + 'h';
  function ambTextoEstado(e) {
    const neve = ambPrecipDe(e) === 'neve';
    const chuvaTxt = e.chuva === 2 ? (neve ? 'Neve forte' : 'Chuva forte')
      : e.chuva === 1 ? (neve ? 'Neve pouca' : 'Chuva pouca')
      : (neve ? 'Sem neve' : 'Sem chuva');
    return `Ambiente: ${ambNomeHora(e.hora)} · ${chuvaTxt} · ${e.raios ? 'Raios ligados' : 'Raios desligados'}`;
  }
  /* Precedência de arranque (MAPA-DE-TOQUE §Limites): preferência
   * «último ambiente» do Mestre (só MODO_MESTRE, validada no
   * domínio; inválida ignora-se) → Noite seca do ritual. */
  function ambLerUltimoAmbiente() {
    if (!MODO_MESTRE) return null;
    try {
      const j = JSON.parse(localStorage.getItem('hudt1-ultimo-ambiente') || 'null');
      if (ambDominioValido(j)) return { hora: j.hora, chuva: j.chuva, raios: j.raios, precip: j.precip === 'neve' ? 'neve' : 'chuva' };
    } catch (_) {}
    return null;
  }
  let ambientePartida = ambLerUltimoAmbiente() || { ...AMBIENTE_RITUAL };
  function ambGravarPreferencia() {
    if (!MODO_MESTRE) return;   // a preferência é do aparelho/perfil do Mestre — nunca da Party, nunca de save
    try { localStorage.setItem('hudt1-ultimo-ambiente', JSON.stringify(ambientePartida)); } catch (_) {}
  }
  /* Som do ambiente: opção PESSOAL de cada aparelho (nunca difundida,
   * nunca guardada em save) — 'hudt1-ambiente-som', ligada por omissão. */
  let ambSomLigado = true;
  try { ambSomLigado = localStorage.getItem('hudt1-ambiente-som') !== 'desligado'; } catch (_) {}
  /* Tremulação do fogo: opção PESSOAL de cada aparelho, como o Som do
   * ambiente (nunca difundida, nunca guardada em save) —
   * 'hudt1-ambiente-tremulacao', ligada por omissão. EM-AMB-B1:
   * ligada = o fogo e a luz a tremular como sempre; desligada =
   * chamas estáticas e tochas na base. */
  let ambTremulacaoLigada = true;
  try { ambTremulacaoLigada = localStorage.getItem('hudt1-ambiente-tremulacao') !== 'desligado'; } catch (_) {}
  function ambAplicarTremulacao() {
    if (!view || typeof view.setTremulacao !== 'function') return;
    try { view.setTremulacao(ambTremulacaoLigada); } catch (_) {}
  }
  /* Superfície do painel (preenchida só no Mestre, mais abaixo) e
   * estado interno da degradação nomeada (apresentação local). */
  const ambUI = { estadoEl: null, ponto: null, botoesHora: [], botoesChuva: [], botoesPrecip: [],
    deslizador: null, leitura: null, togRaios: null, btnRaio: null, togSom: null, togTremulacao: null, notaNeve: null };
  let ambDegrau = 0;                       // escada só-desce, por sessão
  const AMB_DEGRAUS = ['', 'POUCA', 'MÍNIMA', 'SÓ_SOM', 'DPR 1'];
  const ambAmostrasFps = [];
  let ambVigiasBaixas = 0;
  /* Única porta da casca para a vista: valida já aconteceu a montante;
   * vista sem o contrato (cena anterior) degrada em silêncio — a
   * página nunca parte por o ambiente ainda não existir do outro lado. */
  function ambAplicarVista(e, imediato) {
    if (!view || typeof view.aplicarAmbiente !== 'function') return false;
    try { view.aplicarAmbiente({ hora: e.hora, chuva: e.chuva, raios: e.raios, precip: ambPrecipDe(e) }, { imediato: !!imediato }); return true; }
    catch (_) { return false; }
  }
  /* Assentar = gravar o estado da partida + aplicar + gravar a
   * preferência do Mestre + refrescar som, raios e painel. */
  function ambAssentar(novo, opcoes) {
    if (!ambDominioValido(novo)) return false;
    /* Com neve não há raios (palavra dele, VOLTA 3): escolher
     * Neve apaga os raios no estado; voltar a Chuva não os religa
     * sozinho — ele religa se quiser. */
    const precip = ambPrecipDe(novo);
    ambientePartida = { hora: novo.hora, chuva: novo.chuva, raios: precip === 'neve' ? false : novo.raios, precip };
    ambAplicarVista(ambientePartida, !!(opcoes && opcoes.imediato));
    ambGravarPreferencia();
    ambAudioSincronizarChuva();
    ambAoMudarRaios();
    ambSincronizarPainel();
    return true;
  }
  /* Arranque: o ambiente inicial aplica-se JÁ (imediato), sem transição. */
  ambAplicarVista(ambientePartida, true);
  ambAplicarTremulacao();
  /* ════════════════════════════════════════════════════════════════════
     MODOS DE VISÃO/IMERSÃO — ESTADO DA PARTIDA (integração no jogo vivo)
     Desenho governante: o estudo ESTUDO-VISAO-IMERSAO-v2 (congelado
     08/11/2026) + a adenda das formas e da lembrança + a sentença da
     bancada com as emendas EM-MODOS-01..04 (~/workspace/visao-imersao/).
     A calculadora do campo é o módulo visao.js — a porta exacta e
     provada da página de referência (267 verificações). Quem escolhe
     o modo é o MESTRE, no ⚙; os modos regem a vista de cada JOGADORA.
     Invariante A6: a vista do Mestre é SEMPRE o jogo normal — nesta
     vista, nenhuma verba da visão é invocada (visaoAplicar devolve
     sem tocar em nada). Padrão ao nascer: Total — o comportamento
     de hoje; nada muda para ninguém até o Mestre trocar de modo.
     ════════════════════════════════════════════════════════════════════ */
  const VISAO_MODOS = ['zero', 'parcial', 'total', 'ultra'];
  const VISAO_MODO_NOMES = { zero: 'Zero', parcial: 'Parcial', total: 'Total', ultra: 'Ultra' };
  /* Formas do desenho: nome da casa → código da calculadora COM
     anel (larga = M3b, 180° + anel · maqueta = M2, 120° + anel ·
     cone = M1-120, 120°). O anel é interruptor próprio da partida
     (tranche ANEL OPCIONAL): sem anel, quem resolve o código é o
     visaoModelo() — larga = M1-180 (180° puro), maqueta = M1-120. */
  const VISAO_FORMAS = { larga: 'M3b', maqueta: 'M2', cone: 'M1-120' };
  const VISAO_FORMA_NOMES = { larga: 'Larga — 180°', maqueta: 'Maqueta — 120°', cone: 'Cone — 120°' };
  const VISAO_RAD = { N: Math.PI, S: 0, E: Math.PI / 2, W: -Math.PI / 2 };
  const VISAO_PRAZOS = ['off', '1', '2'];
  /* Conjunto a ocultar: as figuras adversárias do elenco actual — o
     mesmo trio da página de referência. A figura da jogadora deste
     aparelho (PROPRIA) nunca se oculta a si própria. */
  const VISAO_INIMIGOS = ['orc', 'capanga', 'lobo'];
  /* SENSOR (percepção base — §5.1 do estudo v2): os valores são os
     de ENSAIO da página de referência (Percepção Base dela 60 contra
     Furtividade Base do Capanga 50), DECLARADOS: as fichas deste
     aparelho ainda não têm campos de Percepção/Furtividade Base —
     quando os tiverem, o sensor passa a lê-los. O alvo do ensaio é
     o Capanga. O sensor nunca cria, move nem apaga lembranças:
     sente o LADO (sectores de 90°), nunca a casa. */
  const VISAO_SENSOR = { pb: 60, fb: 50, alvo: 'capanga' };
  /* Domínio do estado da visão: {modo, forma, prazo} é o legado
     (saves anteriores à tranche do anel — o anel ausente vale
     DESLIGADO); com a 4.ª chave, tem de ser exactamente
     {modo, forma, prazo, anel} com anel booleano. Todo o resto
     rejeita, com o efeito de sempre na validação de estados. */
  function visaoDominioValido(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    const chaves = Object.keys(v);
    if (!chaves.includes('modo') || !chaves.includes('forma') || !chaves.includes('prazo')) return false;
    if (chaves.length === 4) {
      if (!chaves.includes('anel') || typeof v.anel !== 'boolean') return false;
    } else if (chaves.length !== 3) return false;
    if (!VISAO_MODOS.includes(v.modo)) return false;
    if (!Object.prototype.hasOwnProperty.call(VISAO_FORMAS, v.forma)) return false;
    if (!VISAO_PRAZOS.includes(v.prazo)) return false;
    return true;
  }
  function visaoLerPreferencia() {
    if (!MODO_MESTRE) return null;
    try {
      const bruto = localStorage.getItem('hudt1-visao');
      if (!bruto) return null;
      const j = JSON.parse(bruto);
      if (!j || typeof j !== 'object') return null;
      if (!VISAO_MODOS.includes(j.modo)) return null;
      if (!Object.prototype.hasOwnProperty.call(VISAO_FORMAS, j.forma)) return null;
      return { modo: j.modo, forma: j.forma };
    } catch (_) { return null; }
  }
  function visaoGravarPreferencia() {
    if (!MODO_MESTRE) return;
    try { localStorage.setItem('hudt1-visao', JSON.stringify({ modo: visaoPartida.modo, forma: visaoPartida.forma })); } catch (_) {}
  }
  /* Estado da partida. Nasce Total/Maqueta (o comportamento de
     hoje); a preferência gravada do Mestre neste aparelho sobrepõe
     o modo e a forma, como no Ambiente. O prazo da lembrança mora
     na sua chave histórica (hudt1-lembranca-prazo, a da página de
     referência) e lê-se em qualquer papel — é preferência do
     aparelho onde a vista corre. O anel espelha o prazo: 4.ª chave
     do estado e chave própria (hudt1-visao-anel), lida ao nascer em
     qualquer papel e gravada ao assentar; nasce DESLIGADO por
     natureza (palavra do Mestre, 11/11) — quem quiser, liga. */
  let visaoPartida = { modo: 'total', forma: 'maqueta', prazo: 'off', anel: false };
  try {
    const p = localStorage.getItem('hudt1-lembranca-prazo');
    if (VISAO_PRAZOS.includes(p)) visaoPartida.prazo = p;
  } catch (_) {}
  try {
    if (localStorage.getItem('hudt1-visao-anel') === 'ligado') visaoPartida.anel = true;
  } catch (_) {}
  {
    const prefVisao = visaoLerPreferencia();
    if (prefVisao) { visaoPartida.modo = prefVisao.modo; visaoPartida.forma = prefVisao.forma; }
  }
  /* Assentar = a ÚNICA porta de mudança do estado da visão: valida
     o domínio, grava as preferências, sincroniza o ⚙ e reaplica a
     vista. Com limparMemoria, a memória da Ultra nasce vazia (é o
     que fazem os saves e o «voltar» do Supervisor: uma batalha
     carregada não herda lembranças de outra). Devolve false sem
     tocar em nada se o estado for inválido. */
  function visaoAssentar(novo, opcoes) {
    const ops = opcoes || {};
    if (!visaoDominioValido(novo)) return false;
    visaoPartida = { modo: novo.modo, forma: novo.forma, prazo: novo.prazo, anel: novo.anel === true };
    try { localStorage.setItem('hudt1-lembranca-prazo', visaoPartida.prazo); } catch (_) {}
    try { localStorage.setItem('hudt1-visao-anel', visaoPartida.anel ? 'ligado' : 'desligado'); } catch (_) {}
    visaoGravarPreferencia();
    visaoSincronizarPainel();
    if (ops.limparMemoria) visaoLimparMemoria();
    visaoAplicar();
    return true;
  }
  /* O código da calculadora para a forma × anel actuais — um só
     resolvedor para a vista dela, o campo da pré-vista e o gancho
     de prova, para os três nunca divergirem em silêncio. A
     calculadora (visao.js) não se toca: os modelos puros já lá
     estão. Sem anel: larga = M1-180 (180° puro) · maqueta = M1-120
     (o mesmo código do cone) · cone = M1-120, como sempre. */
  function visaoModelo() {
    if (visaoPartida.forma === 'larga') return visaoPartida.anel ? 'M3b' : 'M1-180';
    if (visaoPartida.forma === 'maqueta') return visaoPartida.anel ? 'M2' : 'M1-120';
    return 'M1-120';
  }

  /* ---------- Sons do ambiente (WebAudio) ----------
   * Contexto PREGUIÇOSO: nasce só no primeiro gesto real
   * (pointerdown/keydown) e só vale com state==='running' — até lá,
   * mudo sem erro e sem sons «em dívida» (nada se agenda para
   * tocar depois). Chuva: DUAS FAIXAS DE JOGO em loop
   * (chuva-fina.ogg/chuva-forte.ogg; ver SOM-CHUVA), cada
   * uma ligada ao seu ganho (Pouca/Forte) em crossfade de
   * 2,5 s. Trovão: 3
   * variantes PRÉ-GERADAS na criação do contexto (ruído com
   * decaimento e passa-baixos à reprodução) — nunca sintetizadas
   * na hora do raio. Volumes baixos: sempre abaixo da voz. */
  /* ---------- SOM PESSOAL (tranche t-config-entrada, sentença J1/J3/J5) ----------
   * Os volumes DESTA pessoa, NESTE aparelho — as MESMAS chaves e a
   * MESMA tabela de leitura defensiva da entrada (entrada.js): são
   * factores sobre os níveis aprovados pelo Mestre (100 = o som de
   * hoje; a gama 0–100 só atenua). O ganho do ambiente calcula-se
   * NUM SÍTIO SÓ: master = 0,9 × G × E × (mudo?0:1) ×
   * (somDoAmbiente?1:0). Cada controlo é dono de UM factor nomeado;
   * nenhum escreve no ganho fora desta fórmula — por isso nenhum
   * factor ressuscita o som que outro pôs a zero. Os tectos da
   * chuva (0,0280/0,0556) e o ganho do trovão (0,85) ficam
   * INTOCADOS, a montante do master: o factor vive só no master. */
  function lerVolumeSom(chave) {
    try {
      const v = localStorage.getItem(chave);
      if (v === null || !/^[0-9]+$/.test(v)) return 100;
      const n = Number(v);
      return (n >= 0 && n <= 100) ? n : 100;
    } catch (_) { return 100; }
  }
  let somGeral = lerVolumeSom('hudt1-som-geral');
  let somMusica = lerVolumeSom('hudt1-som-musica');
  let somEfeitos = lerVolumeSom('hudt1-som-efeitos');
  let somMudo = false;
  try { somMudo = localStorage.getItem('hudt1-som-mudo') === 'ligado'; } catch (_) {}
  function somFatorAmbiente() {
    return (somGeral / 100) * (somEfeitos / 100) * (somMudo ? 0 : 1);
  }
  function somGravar(chave, valor) {
    try { localStorage.setItem(chave, String(valor)); } catch (_) {}
  }
  const ambAudio = { ctx: null, master: null, ganhoPouca: null, ganhoForte: null,
    trovoes: [], desbloqueado: false, fontesChuva: { pouca: null, forte: null } };
  /* SOM-CHUVA-INICIO — as faixas B+C (ESCOLHA DO MESTRE, 10/11).
   * Linha do tempo curta: a síntese da VOLTA 3 foi REPROVADA
   * pelo ouvido dele («muito chiado, muito poluído, muito
   * alto») e a gravação real da volta 2 do som também não
   * fechou — na comparação de trilhas FEITAS PARA JOGO ele
   * escolheu (10/11 17:32): «as duas ficaram muito boas; a B
   * um pouquinho melhor». Entram as duas, do pack «Rain
   * (loopable)» de Ylmir (OpenGameArt, CC0 1.0 — uso livre,
   * sem crédito obrigatório):
   *   · chuva-forte.ogg = faixa 3 («chuva sobre superfícies»),
   *     a cama principal: loop estéreo de 45,000 s;
   *   · chuva-fina.ogg = faixa 4 («chuva fina»), pingos leves
   *     com ar entre eles: loop estéreo de 37,500 s.
   * A D (tempestade com trovões assados no loop) ficou de
   * fora: na chuva forte o trovão vem DO PRÓPRIO RAIO do
   * jogo, por fora. A A (a gravação real) saiu da árvore.
   * Tratamento (sede t-som-bc): os loops nasceram limpos
   * (emendas sem clique medidas nas fontes) e foram só
   * NORMALIZADOS a RMS 0,05 — forte: RMS final medido
   * 0,04993, pico 0,480 · fina: RMS final 0,04968, pico
   * 0,892; o salto na emenda fica na ordem dos saltos do
   * próprio material. OGG Vorbis porque repete amostra a
   * amostra, sem o enchimento que o MP3 mete nas pontas e
   * partiria o loop.
   * Ligação: DOIS buffers, um por intensidade — a fonte da
   * fina liga-se SÓ ao ganho Pouca e a da forte SÓ ao ganho
   * Forte; a troca de intensidade faz-se pelo crossfade de
   * 2,5 s entre os dois ganhos (ambAudioSincronizarChuva),
   * sem sobreposição suja. Carregamento com o contexto
   * preguiçoso: fetch + decode em fundo. Se um ficheiro
   * falhar (rede/404), esse canal fica MUDO — nunca
   * regressa a chiado nenhum.
   * VOLUME PRÉ-SETADO (decisão fechada dele, 10/11 17:34):
   * «não é algo primário, de frente — é algo lá no fundo;
   * escolher esse e deixar pré-setado um volume baixo». Os
   * tectos são METADE do nível das amostras da comparação
   * (RMS 0,0050): com os buffers a RMS ≈ 0,05 e o master a
   * 0,9, Forte 0,0556 → saída ≈ RMS 0,0025 · Pouca 0,0280 →
   * saída ≈ RMS 0,00125 (metade da Forte). Preset fixo:
   * não é régua para andar a afinar em voltas. */
  function ambCarregarChuvas(ctx) {
    if (typeof fetch !== 'function' || typeof ctx.decodeAudioData !== 'function') return;
    const carregar = (ficheiro, ganho, chave) => {
      const ligar = buf => {
        if (!buf || ambAudio.fontesChuva[chave]) return;
        try {
          const fonte = ctx.createBufferSource();
          fonte.buffer = buf; fonte.loop = true;
          fonte.connect(ganho);
          fonte.start();
          ambAudio.fontesChuva[chave] = fonte;
        } catch (_) {}
      };
      try {
        fetch(ficheiro)
          .then(r => (r && r.ok) ? r.arrayBuffer() : null)
          .then(ab => {
            if (!ab) return;
            const p = ctx.decodeAudioData(ab, ligar);
            if (p && typeof p.catch === 'function') p.catch(() => {});
          })
          .catch(() => {});
      } catch (_) {}
    };
    carregar('chuva-fina.ogg', ambAudio.ganhoPouca, 'pouca');
    carregar('chuva-forte.ogg', ambAudio.ganhoForte, 'forte');
  }
  /* SOM-CHUVA-FIM */
  function ambGerarTrovao(ctx, dur, aperto) {
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let lento = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len, branco = Math.random() * 2 - 1;
      lento = (lento + aperto * branco) / (1 + aperto);
      const env = Math.min(1, t * 40) * Math.exp(-3.2 * t) * (0.75 + 0.25 * Math.sin(t * 9 + aperto * 7));
      d[i] = Math.max(-1, Math.min(1, lento * 3.4 * env));
    }
    return buf;
  }
  function ambAudioGarantir() {
    if (ambAudio.ctx) return ambAudio.ctx;
    const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AC) return null;
    try {
      const ctx = new AC();
      ambAudio.ctx = ctx;
      ambAudio.master = ctx.createGain();
      ambAudio.master.gain.value = ambSomLigado ? 0.9 * somFatorAmbiente() : 0;
      ambAudio.master.connect(ctx.destination);
      ambAudio.ganhoPouca = ctx.createGain(); ambAudio.ganhoPouca.gain.value = 0;
      ambAudio.ganhoForte = ctx.createGain(); ambAudio.ganhoForte.gain.value = 0;
      ambAudio.ganhoPouca.connect(ambAudio.master); ambAudio.ganhoForte.connect(ambAudio.master);
      /* As fontes da chuva (as duas faixas) carregam em fundo
       * e ligam-se cada uma ao seu ganho quando estiverem
       * descodificadas; até lá — ou se um ficheiro falhar —
       * esse canal fica mudo. */
      ambCarregarChuvas(ctx);
      ambAudio.trovoes = [ambGerarTrovao(ctx, 1.9, 0.05), ambGerarTrovao(ctx, 2.6, 0.03), ambGerarTrovao(ctx, 3.2, 0.02)];
    } catch (_) { ambAudio.ctx = null; }
    return ambAudio.ctx;
  }
  function ambAudioSincronizarChuva() {
    const ctx = ambAudio.ctx;
    if (!ctx || !ambAudio.ganhoPouca || !ambAudio.ganhoForte) return;
    try {
      if (ambAudio.master) ambAudio.master.gain.setTargetAtTime(ambSomLigado ? 0.9 * somFatorAmbiente() : 0, ctx.currentTime, 0.1);
      const activo = ambAudio.desbloqueado && ambSomLigado;
      /* Com neve o som da precipitação cala-se (VOLTA 3,
       * decisão de bom senso declarada: a neve é silenciosa;
       * não se inventou um som de neve). */
      /* Tectos do PRESET (decisão fechada do Mestre, 10/11
       * 17:34 — volume baixo PRÉ-SETADO, sem voltas de
       * afinação): metade do nível das amostras da comparação
       * (RMS 0,0050). Com os buffers a RMS ≈ 0,05 e o master
       * a 0,9: Forte 0,0556 → saída ≈ RMS 0,0025 · Pouca
       * 0,0280 → saída ≈ RMS 0,00125 (metade da Forte). A
       * chuva senta-se atrás do jogo, lá no fundo. */
      const alvoP = activo && ambientePartida.precip !== 'neve' && ambientePartida.chuva === 1 ? 0.0280 : 0;
      const alvoF = activo && ambientePartida.precip !== 'neve' && ambientePartida.chuva === 2 ? 0.0556 : 0;
      const agora = ctx.currentTime;   // crossfade de 2,5 s nos dois ganhos
      for (const par of [[ambAudio.ganhoPouca, alvoP], [ambAudio.ganhoForte, alvoF]]) {
        par[0].gain.cancelScheduledValues(agora);
        par[0].gain.setValueAtTime(par[0].gain.value, agora);
        par[0].gain.linearRampToValueAtTime(par[1], agora + 2.5);
      }
    } catch (_) {}
  }
  function ambTentarDesbloquearAmbiente() {
    if (ambAudio.desbloqueado) return;
    const ctx = ambAudioGarantir();
    if (!ctx) return;
    const marcar = () => { if (ctx.state === 'running') { ambAudio.desbloqueado = true; ambAudioSincronizarChuva(); } };
    if (ctx.state === 'running') { marcar(); return; }
    if (typeof ctx.resume === 'function') {
      try { const p = ctx.resume(); if (p && typeof p.then === 'function') p.then(marcar).catch(() => {}); } catch (_) {}
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', ambTentarDesbloquearAmbiente);
    document.addEventListener('keydown', ambTentarDesbloquearAmbiente);
  }
  function ambTocarTrovao() {
    const ctx = ambAudio.ctx;
    if (!ctx || !ambAudio.desbloqueado || !ambSomLigado) return;   // sem desbloqueio: só clarão, sem dívida
    if (typeof document !== 'undefined' && document.hidden) return;   // trovão em fundo: não
    const buf = ambAudio.trovoes[Math.floor(Math.random() * ambAudio.trovoes.length)];
    if (!buf) return;
    try {
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      const g = ctx.createGain(); g.gain.value = 0.85;
      s.connect(f); f.connect(g); g.connect(ambAudio.master); s.start();
    } catch (_) {}
  }
  /* Gancho de prova SÓ-LEITURA do som pessoal (t-config-entrada,
   * sentença J10.4 — o precedente da casa é o __tcEstado): devolve
   * apenas números e booleanos já calculados — os factores lidos
   * das chaves e os ganhos vivos do grafo do ambiente. Sem setters,
   * sem funções, sem referências ao grafo: quem o lê não pode
   * mudar estado nenhum por ele. */
  window.__somEstado = function () {
    return {
      geral: somGeral, musica: somMusica, efeitos: somEfeitos, mudo: somMudo,
      somAmbiente: ambSomLigado,
      master: ambAudio.master ? ambAudio.master.gain.value : null,
      ganhoPouca: ambAudio.ganhoPouca ? ambAudio.ganhoPouca.gain.value : null,
      ganhoForte: ambAudio.ganhoForte ? ambAudio.ganhoForte.gain.value : null
    };
  };

  /* ---------- Relâmpago cosmético: relógio e janela de protecção ----------
   * O relógio automático (30–90 s sorteados) e o disparo da vista
   * são o RELÂMPAGO do desenho base §4.3: clarão ao longe que não
   * cai em casa nenhuma, não fere, não acende. O raio que CAI é o
   * raioArena da secção «RAIO E FOGO» mais abaixo — relógio de
   * rondas, nunca este. O botão «⚡ Raio agora» também é de lá:
   * põe um raioArena em fila que resolve em segundos (VOLTA 3;
   * pendente visível no botão, via ambDefinirRaioPendente).
   * Janela de protecção do clarão: nunca durante uma apresentação
   * de ataque nem enquanto um número de dano vive; bloqueado, o
   * automático adia (nova tentativa em 3 s). O relógio é do
   * hospedeiro — só corre na vista do Mestre. Em fundo
   * (document.hidden) o agendador pausa; ao voltar, sorteia de novo. */
  let ambRaioPendente = false, ambRelogioAutoRaio = null, ambVigiaPendente = null;
  function ambJanelaRaioLivre() {
    if (apresentacaoEmCurso) return false;
    try {
      const st = typeof view.getStats === 'function' ? view.getStats() : null;
      if (st && st.presentation) return false;
    } catch (_) {}
    const agora = performance.now();
    for (const f of flutuantes)   // número de dano vivo: nascimento t0 + atraso + duração
      if (f.tipo === 'dano' && agora < f.t0 + f.atraso + f.dur) return false;
    return true;
  }
  function ambDispararRaioVista() {
    if (!view || typeof view.dispararRaio !== 'function') return false;
    try { return view.dispararRaio() === true; } catch (_) { return false; }
  }
  function ambLimparRelogioAutoRaio() {
    if (ambRelogioAutoRaio) { clearTimeout(ambRelogioAutoRaio); ambRelogioAutoRaio = null; }
  }
  function ambAgendarAutoRaio() {
    ambLimparRelogioAutoRaio();
    if (!MODO_MESTRE) return;
    if (!ambPodeTerRaios()) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    ambRelogioAutoRaio = setTimeout(() => { ambRelogioAutoRaio = null; ambTentativaAutoRaio(); },
      30000 + Math.random() * 60000);
  }
  function ambTentativaAutoRaio() {
    if (!MODO_MESTRE || !ambPodeTerRaios()) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!view || typeof view.dispararRaio !== 'function') { ambAgendarAutoRaio(); return; }
    if (!ambJanelaRaioLivre() || !ambDispararRaioVista()) {
      ambRelogioAutoRaio = setTimeout(() => { ambRelogioAutoRaio = null; ambTentativaAutoRaio(); }, 3000);
      return;
    }
    ambAgendarAutoRaio();
  }
  function ambPararVigiaPendente() {
    if (ambVigiaPendente) { clearInterval(ambVigiaPendente); ambVigiaPendente = null; }
  }
  function ambDefinirRaioPendente(p) {
    ambRaioPendente = !!p;
    if (!ambRaioPendente) ambPararVigiaPendente();
    ambSincronizarPainel();
  }
  /* A porta única dos raios que CAEM (raioArena): ligados,
   * precipitação a cair e tipo Chuva — com neve não há raios
   * (VOLTA 3). O relâmpago cosmético usa a mesma porta. */
  function ambPodeTerRaios() {
    return !!(ambientePartida.raios && ambientePartida.chuva > 0 && ambientePartida.precip !== 'neve');
  }
  /* «⚡ Raio agora» (desenho «Raio e Fogo» §1, CORRIGIDO na
   * VOLTA 3): NÃO é um clarão — põe UM raioArena em fila, de
   * alvo igualmente ao acaso. O desenho antigo resolvia o
   * pendente no momento de ambiente da ronda seguinte; fora de
   * batalha (exploração, câmara livre) nenhuma ronda vira e o
   * raio NUNCA caía — a queixa dele de 10/11 («ficou lá escrito
   * raio pendente por muito tempo e depois nem um raio
   * apareceu»). Agora o pendente resolve em SEGUNDOS (1,2–2,8 s
   * sorteados), em batalha ou fora dela, pela mesma passagem de
   * impacto de sempre (rfDispararArena). O momento de ronda
   * continua a consumir um pendente que lá chegue (rede de
   * segurança; quem resolve limpa a bandeira — nunca duplica).
   * O tecto de 1/ronda da lacuna §9.5 CAI por ordem expressa
   * dele («apertei para poder aparecer um raio quando eu
   * quisesse na hora»): o limite é a fila de UM — novo pedido
   * só com a fila vazia. Pendente visível no botão; cancela-se
   * se os raios, a chuva ou o tipo mudarem antes (ambAoMudarRaios). */
  let ambRaioAgoraTimer = null;
  function ambCancelarRaioAgoraTimer() {
    if (ambRaioAgoraTimer) { clearTimeout(ambRaioAgoraTimer); ambRaioAgoraTimer = null; }
  }
  function ambResolverRaioPendente() {
    ambCancelarRaioAgoraTimer();
    if (!ambRaioPendente) return;
    ambDefinirRaioPendente(false);
    if (!ambPodeTerRaios() || batalhaFim || supCongelado) return;   // as condições caíram: cancela em silêncio
    rfDispararArena();
  }
  function ambPedirRaioManual() {
    if (!ambPodeTerRaios()) return;
    if (ambRaioPendente) return;                    // fila de um
    ambDefinirRaioPendente(true);
    say('A tempestade junta-se — o raio cai já a seguir.');
    ambRaioAgoraTimer = setTimeout(ambResolverRaioPendente, 1200 + Math.random() * 1600);
  }
  function ambVigiaRaioPendente() {
    /* No-op defensivo herdado: o pendente do raioArena já não
     * precisa de vigia — resolve pelo temporizador de segundos
     * de ambPedirRaioManual (VOLTA 3). */
    ambPararVigiaPendente();
  }
  /* Raios naturais em TEMPO REAL fora de ronda (VOLTA 3): o
   * momento de ambiente só corre quando uma ronda vira; a
   * explorar, a tempestade ficava muda para sempre — a outra
   * metade da queixa. Este relógio dispara pela MESMA passagem
   * do momento (rfDispararArena) SÓ quando nenhuma vez passou
   * nos últimos AMB_EXPLORACAO_JANELA ms: batalha viva = o
   * momento de ronda manda (um relógio de cada vez, nunca dois
   * a disparar pelo mesmo céu). Cadências declaradas
   * (uniformes): Chuva forte 20–60 s · Chuva pouca 60–150 s.
   * Em fundo (document.hidden) o relógio dorme e rearma ao
   * voltar (visibilitychange, junto ao do cosmético). */
  const AMB_EXPLORACAO_JANELA = 120000;
  const AMB_RAIO_EXPLORACAO_MS = { 1: [60000, 150000], 2: [20000, 60000] };
  let ambRelogioExploracao = null, ambUltimoAvancoTS = 0;
  function ambSincronizarRelogioExploracao() {
    if (ambRelogioExploracao) { clearTimeout(ambRelogioExploracao); ambRelogioExploracao = null; }
    if (!ambPodeTerRaios()) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const faixa = AMB_RAIO_EXPLORACAO_MS[ambientePartida.chuva];
    if (!faixa) return;
    ambRelogioExploracao = setTimeout(ambTentativaRaioExploracao,
      faixa[0] + Math.random() * (faixa[1] - faixa[0]));
  }
  function ambTentativaRaioExploracao() {
    ambRelogioExploracao = null;
    if (!ambPodeTerRaios()) return;
    if (typeof document !== 'undefined' && document.hidden) return;   // rearma no visibilitychange
    if (ambUltimoAvancoTS && performance.now() - ambUltimoAvancoTS < AMB_EXPLORACAO_JANELA) {
      ambSincronizarRelogioExploracao();   // batalha viva: o momento manda; este relógio espera
      return;
    }
    if (batalhaFim || supCongelado) { ambSincronizarRelogioExploracao(); return; }
    rfDispararArena();
    ambSincronizarRelogioExploracao();
  }
  function ambAoMudarRaios() {
    if (!ambPodeTerRaios() && ambRaioPendente) {
      ambCancelarRaioAgoraTimer();
      ambDefinirRaioPendente(false);
    }
    ambAgendarAutoRaio();
    ambSincronizarRelogioExploracao();
  }

  /* ================= RAIO E FOGO — as regras (desenho julgado
   * «AMBIENTE — Raio e Fogo», 05/11/2026) =================
   * A palavra do Mestre (05/11 00:45–00:46, reconfirmada a 09/11):
   * onde o raio cai, a casa fica a pegar fogo · o raio é aleatório ·
   * raio em cima de alguém: a pessoa fica a pegar fogo e leva dano ·
   * dano do raio FIXO 15, PROVISÓRIO por palavra expressa dele ·
   * dano do fogo 1d8 enquanto estiver na casa em chamas; ao sair, a
   * chuva apaga o fogo na pessoa — sem chuva, sair não apaga.
   * Emenda pela palavra dele de 10/11/2026 (17:45): o fogo vindo do
   * raio, NA CHUVA, dura TRÊS TURNOS certos — enquanto chove, a
   * rolagem de extinção pela chuva e o desconto do combustível
   * deixam de mandar e a vida conta-se em turnos de existência (a
   * «idade» da casa: nasce a 1 e apaga-se quando passa de 3). E a
   * chama MOSTRA a idade: turno 1 forte · turno 2 um pouco menor ·
   * turno 3 um foguinho bem fraco — o dano é o MESMO nos três
   * turnos; a leitura é estética e referencial, para os players
   * verem o fogo a sumir daquele canto. Sem chuva, o combustível
   * de sempre (1d6) continua a mandar na duração e a idade só
   * pinta o estágio. O fogo da PESSOA (A Arder) não entra nesta
   * regra: continua o de sempre.
   * Emenda pela palavra dele de 10/11/2026 (21:12), que
   * SUBSTITUI a metade seca da emenda das 17:45: «Sem chuva dura
   * 9 turnos, aí pode por 3 turnos para cada estágio da
   * animação». SEM CHUVA, a casa dura NOVE TURNOS fixos e os
   * estágios lêem-se três turnos de cada vez — idade 1–3 forte ·
   * 4–6 médio · 7–9 fraco — e apaga-se quando a idade passa
   * de 9. O combustível ao acaso (1d6) deixa de mandar na
   * duração das casas do fogo do raio, na chuva e a seco: fica
   * no estado e nos saves como campo legado (nasce 1d6 e viaja
   * nos snapshots como até aqui, para os saves lerem igual) e
   * já não é descontado em momento nenhum. A duração é SÓ a
   * idade, com o tecto do tempo que faz em cada momento: na
   * chuva 3, a seco 9 — o tempo que faz AGORA decide o tecto e
   * o estágio a partir da idade da casa (casa velha que apanhe
   * chuva apaga-se no momento seguinte, como já acontecia;
   * casa nascida na chuva que fique a seco continua até aos 9,
   * com o estágio pela régua seca). O dano continua o mesmo em
   * qualquer idade e em qualquer estágio.
   * O evento de regras chama-se raioArena e vive no relógio das
   * RONDAS (momento de ambiente, início da ronda) — distinto do
   * relâmpago cosmético acima, que nunca cai nem fere.
   * O dano corre pela passagem normal da casca: parcelas do DMG
   * por tipo (o tick 1d8 rola no motor), RD lida da mesma ficha que
   * os ataques lêem (nesta casca rd = 0 para todos — nem os ataques
   * a usam; a forquilha RD do desenho §9.1 fica à palavra dele) e
   * a Vida assenta nas mesmas contas de sempre (danoSofrido dela /
   * danoSofrido interno dos monstros), com os mesmos terminais
   * (aMorrer dela sem falhas novas — dano de ambiente não é ataque;
   * queda dos monstros; vitória). Números flutuantes por parcela,
   * como todo o dano; os do impacto nascem DEPOIS do clarão (§6). */
  const RF_DANO_RAIO = 15;          // PROVISÓRIO — palavra dele: «por enquanto pode ser um dano fixo de 15; depois eu resolvo»
  const RF_TIPO_RAIO = 'eletrico';  // nenhuma ficha desta casca declara tipo eléctrico (G-RF-03: declara-se que não existe); string adoptada, estilo das fichas ('agua')
  const RF_TIPO_FOGO = 'fogo';
  /* Interruptores das leituras recomendadas da bancada nas lacunas
   * do desenho — cada um trocável com uma palavra do Mestre, sem
   * reconstruir (§9): */
  const RF_PRIMEIRO_TICK_EMPILHA = true;   // §5: na ronda do impacto, o tick do início do turno SOMA-SE ao impacto (leitura literal das duas frases dele)
  const RF_CHUVA_APAGA_PARADO = true;      // §5: quem está A Arder fora de casa em chamas, com chuva, apaga no início do próprio turno (antes do tick)
  const RF_FIM_SECO = 'acao-movimento';    // §5 lacuna do fim sem chuva: proposta 1 da bancada — apagar-se custa a Acção de Movimento (botão na vez dela; a IA dos monstros não o faz nesta casca)
  const RF_CRUZ_FOGO = true;   // palavra dele (09/11): onde o raio cai, arde uma CRUZ — 3×3 sem os cantos (5 casas); delta nomeado sobre o desenho de 05/11, ver rfAcenderCruz
  const rfCasas = new Map();        // 'x,y' -> { x, y, combustivel, idade } — casas a arder (estado de terreno); idade = turnos de existência e manda na duração (emendas 10/11: na chuva tecto 3, estágio = idade; sem chuva tecto 9, estágios de 3 em 3); combustivel = campo legado dos saves (nasce 1d6), já não decide duração nem é descontado
  const rfAArder = new Set();       // ids com o estado «A Arder» (registo próprio da casca: NÃO entra no array de estados do motor)
  const rfUltimoTick = new Map();   // id -> ronda do último tick (anti-duplicação: 1 tick por figura e ronda)
  let rfRodadaResolvida = 1;        // última ronda cujo momento de ambiente correu (a ronda 1 abre a batalha: sem momento — declarado)
  /* As frases do ambiente não disputam o say() com o anúncio da
   * vez que as segue no mesmo passarVez: acumulam-se neste slot e
   * o anúncio seguinte (dela ou de um monstro) abre com elas. */
  let rfFrasePendente = '';
  function rfDizer(frase) { rfFrasePendente = rfFrasePendente ? rfFrasePendente + ' ' + frase : frase; }
  function rfTomarFrasePendente() { const f = rfFrasePendente; rfFrasePendente = ''; return f ? f + ' ' : ''; }
  function rfChave(x, y) { return x + ',' + y; }
  function rfEstagioDaIdade(idade, chuva) {
    /* O estágio lê-se da idade com a régua do tempo que faz
     * (emendas 10/11): na chuva, um turno por estágio (a idade
     * 1, 2 e 3 lê-se forte, médio e fraco); a seco, três turnos
     * por estágio (idade 1–3 forte · 4–6 médio · 7–9 fraco). */
    return chuva > 0 ? Math.min(idade, 3) : Math.min(3, Math.ceil(idade / 3));
  }
  function rfOcupante(x, y) {
    for (const e of ELENCO) {
      const u = unidade(e.id);
      if (u && u.posicao && u.posicao.x === x && u.posicao.y === y) return e.id;
    }
    return null;
  }
  function rfRolarDado(faces) {
    /* Faces pela fonte da casa (DMG com semente), como os outros
     * dados; sem motor, cai para o acaso local declarado. */
    if (DMG_MOTOR) {
      try {
        const s = vlabComDmg(() => DMG_MOTOR.calcularDano({
          componentes: [{ tipo: null, expressao: '1d' + faces }], contexto: { semente: vlabSemente() } }));
        if (s && !s.erro && s.parcelas && s.parcelas[0]) return s.parcelas[0].subtotal;
      } catch (_) {}
    }
    return 1 + Math.floor(Math.random() * faces);
  }
  function rfParcelaTick() {
    if (DMG_MOTOR) {
      try {
        const s = vlabComDmg(() => DMG_MOTOR.calcularDano({
          componentes: [{ tipo: RF_TIPO_FOGO, expressao: '1d8' }], contexto: { semente: vlabSemente() } }));
        if (s && !s.erro && s.parcelas && s.parcelas[0]) return s.parcelas[0];
      } catch (_) {}
    }
    const f = 1 + Math.floor(Math.random() * 8);
    return { tipo: RF_TIPO_FOGO, expressao: '1d8', faces: [f], subtotal: f };
  }
  function rfIncendiarPessoa(id) {
    if (rfAArder.has(id)) return;
    rfAArder.add(id);
    try { view.setUnidadeAArder(id, true); } catch (_) {}
  }
  function rfApagarPessoa(id) {
    if (!rfAArder.delete(id)) return;
    try { view.setUnidadeAArder(id, false); } catch (_) {}
  }
  function ambAoMorrerFigura(id) {
    /* A morte apaga o fogo da figura (o estado fica visível mas
     * inerte em aMorrer — ela NÃO passa por aqui; só a morte real
     * de monstro, pelo consumo da queda em vlabAplicarAlvoDepois
     * e pelas vias de ambiente). */
    rfApagarPessoa(id);
    rfUltimoTick.delete(id);
  }
  function rfAplicarDanoAmbiente(id, parcela, origem) {
    /* A passagem do dano de ambiente (desenho §3): sem rolagem de
     * ataque, sem Defesa, sem reacção, sem salvaguarda — e SEM
     * desconto de Resistência: «A Resistência NÃO protege do
     * ambiente» (palavra do Mestre, 09/11/2026 14:04 — fecha a
     * forquilha §9.1 do desenho; a leitura anterior, que subtraía
     * a RD da ficha nesta passagem, foi substituída por esta —
     * EM-AV2-03). A parcela cobra-se inteira a toda a gente e
     * assenta na Vida pelas contas normais da casca. O evento
     * regista rd: 0 (a passagem ignora a RD por regra, não por a
     * ficha a não ter). Devolve
     * { aplicado, desfecho: 'caiu'|'aMorrer'|null } ou null quando
     * o alvo não é ferível (morto · aMorrer · estabilizado: o
     * ambiente não soma falhas de morte a quem já está a morrer). */
    const u = unidade(id);
    if (!u || u.vivo === false) return null;
    if (id === PROPRIA && ESTADO_VLAB.ong.estadoMorte) return null;
    const aplicado = parcela.subtotal;
    supRegistar('accao', { acao: origem, actor: 'ambiente', alvo: id,
      tipo: parcela.tipo, bruto: parcela.subtotal, rd: 0, dano: aplicado });
    if (aplicado > 0) {
      if (id === PROPRIA) { danoSofrido += aplicado; atualizarChipVida(); }
      else ESTADO_VLAB[id].danoSofrido = (ESTADO_VLAB[id].danoSofrido | 0) + aplicado;
    }
    if (id === PROPRIA) {
      if (aplicado > 0 && vlabVidaOng() <= 0) {
        ESTADO_VLAB.ong.estadoMorte = { fase: 'aMorrer', sucessos: 0, falhas: 0 };
        return { aplicado, desfecho: 'aMorrer' };
      }
      return { aplicado, desfecho: null };
    }
    if (aplicado > 0 && VIDA_MONSTROS[id] != null && vlabVidaMonstro(id) <= 0) {
      try {
        const pm = view.apresentarMorte(id);
        if (pm && pm.catch) pm.catch(() => {});
      } catch (_) { view.setVivo(id, false); }
      ambAoMorrerFigura(id);
      if (vlabTodosMonstrosForaDeCombate()) fimDeBatalha('vitoria');
      return { aplicado, desfecho: 'caiu' };
    }
    return { aplicado, desfecho: null };
  }
  function rfResolverImpacto(x, y) {
    /* O impacto (desenho §2): a casa acende (combustível 1d6,
     * SÓ-DO-MESTRE — nunca superfície) e, se estiver ocupada por
     * figura viva ferível, ela leva a parcela do raio e fica
     * A Arder. Re-impacto em casa a arder: renova o combustível
     * e é um impacto completo outra vez — e renova a idade para 1
     * (emenda 10/11: reacender é nascer outra vez, estágio forte). */
    rfCasas.set(rfChave(x, y), { x, y, combustivel: rfRolarDado(6), idade: 1 });
    try { view.acenderFogoCasa(x, y); view.definirEstagioFogoCasa(x, y, 1); } catch (_) {}
    if (RF_CRUZ_FOGO) rfAcenderCruz(x, y);
    const id = rfOcupante(x, y);
    const u = id ? unidade(id) : null;
    if (!id || !u || u.vivo === false || (id === PROPRIA && ESTADO_VLAB.ong.estadoMorte)) {
      rfDizer('Um raio cai na arena — uma cruz de casas fica a arder.');
      return;
    }
    /* A parcela do raio é a constante 15 PROVISÓRIO dele. O parser
     * do DMG exige um termo NdM — a emenda de gramática que admite
     * o termo constante é dependência nomeada do desenho §3 para
     * os motores; aqui a parcela constrói-se na forma final que a
     * emenda produz ({tipo, expressao, faces, subtotal}), sem
     * disfarce de dados: fixo é fixo, por palavra dele. */
    const parcela = { tipo: RF_TIPO_RAIO, expressao: String(RF_DANO_RAIO), faces: [], subtotal: RF_DANO_RAIO };
    const r = rfAplicarDanoAmbiente(id, parcela, 'raio-arena');
    if (r && r.desfecho === 'caiu') { rfDizer(`Um raio atinge <b>${nomeCena(id)}</b> em cheio — e ele cai.`); return; }
    rfIncendiarPessoa(id);
    if (!RF_PRIMEIRO_TICK_EMPILHA) rfUltimoTick.set(id, rodada);
    if (r && r.aplicado > 0) {
      const valor = r.aplicado;
      setTimeout(() => { if (numerosDano) mostrarDano(id, [{ classe: RF_TIPO_RAIO, rotulo: RF_TIPO_RAIO, valor }]); }, 650);
    }
    if (r && r.desfecho === 'aMorrer') { entrarAMorrer(); return; }
    rfDizer(id === PROPRIA
      ? 'Um raio atinge a <b>Ong</b> em cheio — ela fica a arder.'
      : `Um raio atinge <b>${nomeCena(id)}</b> em cheio — fica a arder.`);
  }
  function rfAcenderCruz(x, y) {
    /* A CRUZ DE FOGO (palavra do Mestre, 09/11): onde o raio cai,
     * arde uma cruz — no 3×3 à volta do impacto ardem 5 casas: a do
     * impacto (acendida em rfResolverImpacto) e as 4 vizinhas
     * directas; os 4 cantos NÃO ardem. (A lista dele — «1, 3, 8 e 9»
     * para os que não ardem — lê-se como os 4 cantos da grelha de
     * leitura, 1·3·7·9, com o 8 trocado pelo 7: é a única leitura
     * que forma uma cruz.) Leitura CONFIRMADA por ele a 09/11 14:16: «sempre vai ocupar essas 5 casas em formato de cruz» — todo o impacto acende a cruz inteira, sem excepções; cruz sobre cruz apenas se sobrepõe. Cada vizinha entra no regime comum das
     * casas a arder: combustível 1d6 próprio, extinção própria no
     * momento de ambiente, tick 1d8 a quem lá estiver no início do
     * turno (e aí ganha o estado A Arder, pela via comum de
     * ambTickInicioTurno). O dano de 15 é SÓ da casa atingida e de
     * quem o raio acertou — as vizinhas não ferem ninguém ao
     * acender. Casa fora do tabuleiro não existe: a cruz corta-se
     * na borda. Ambiguidade nomeada (não inventada): vizinha que
     * JÁ está a arder conserva o combustível que tem — a renovação
     * do desenho §2 é do impacto («um impacto completo outra vez»)
     * e o braço da cruz não é um impacto — conserva também a
     * idade (emenda 10/11: reacender é só no impacto). */
    const vizinhas = [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]];
    for (const [cx, cy] of vizinhas) {
      if (cx < AREA.origin.x || cy < AREA.origin.y) continue;
      if (cx >= AREA.origin.x + AREA.cols || cy >= AREA.origin.y + AREA.rows) continue;
      if (rfCasas.has(rfChave(cx, cy))) continue;
      rfCasas.set(rfChave(cx, cy), { x: cx, y: cy, combustivel: rfRolarDado(6), idade: 1 });
      try { view.acenderFogoCasa(cx, cy); view.definirEstagioFogoCasa(cx, cy, 1); } catch (_) {}
    }
  }
  function rfDispararArena() {
    /* O alvo sorteia-se pelo PRNG guardável da casca (dadoFace
     * sobre dadoEstado), como os outros sorteios do momento:
     * guardar/carregar reproduz o alvo (G-RF-01 · EM-AV2-05). */
    const idx = dadoFace(AREA.cols * AREA.rows) - 1;
    const x = AREA.origin.x + (idx % AREA.cols);
    const y = AREA.origin.y + Math.floor(idx / AREA.cols);
    try { view.raioArenaVisual(x, y); } catch (_) {}
    rfResolverImpacto(x, y);
  }
  function ambienteMomentoRodada() {
    /* O momento de ambiente (desenho §1/§4 + emendas 10/11):
     * início da ronda, antes da primeira vez. Ordem escrita, item
     * a item: (1) a IDADE de cada casa a arder avança um turno;
     * (2) a duração resolve-se com a chuva lida NESTE instante —
     * a idade manda nos dois regimes e o tempo que faz AGORA
     * fixa o tecto: COM CHUVA, a casa apaga-se quando a idade
     * passa de 3 (viveu os turnos 1, 2 e 3) e a pessoa ocupante
     * apaga-se com ela, como na antiga morte por rolagem com
     * chuva; SEM CHUVA, a casa dura NOVE turnos e apaga-se
     * quando a idade passa de 9 (palavra dele de 10/11 21:12),
     * sem tocar na pessoa — a seco, o fogo da pessoa é o regime
     * de sempre e a casa apagar-se não apaga ninguém; (3) a
     * vista recebe o estágio da idade nova pela régua do
     * instante (rfEstagioDaIdade: na chuva, um turno por
     * estágio; a seco, três turnos por estágio); (4) raios
     * novos da ronda — pendente do botão primeiro, depois o
     * automático da frequência (Pouca 1/6 · Forte 2/6). Casa
     * acesa nesta ronda não envelhece nesta ronda (acende
     * depois deste momento, no passo 4, ou a meio da ronda pelo
     * botão/relógio de exploração).
     * Fronteiras das emendas, declaradas: o combustível já não
     * é descontado em momento nenhum (campo legado dos saves);
     * casa já velha (idade ≥4) que apanhe chuva apaga-se no
     * momento seguinte, porque na chuva o tecto é 3 e a idade
     * não se perdoa; casa nascida na chuva que fique a seco
     * continua até aos 9, com o estágio pela régua seca. */
    if (batalhaFim || supCongelado) return;
    const chuva = ambientePartida.chuva;
    for (const [chave, c] of [...rfCasas]) {
      c.idade = (c.idade >= 1 ? c.idade : 1) + 1;   // envelhece um turno (emenda 10/11)
      if (chuva > 0) {
        /* NA CHUVA manda a contagem: três turnos de existência
         * e apaga — sem rolagem, sem desconto de combustível. */
        if (c.idade > 3) {
          rfCasas.delete(chave);
          try { view.apagarFogoCasa(c.x, c.y); } catch (_) {}
          const oc = rfOcupante(c.x, c.y);
          if (oc && rfAArder.has(oc)) {
            rfApagarPessoa(oc);
            rfDizer(oc === PROPRIA
              ? 'A chuva apaga a casa — e o fogo da <b>Ong</b>.'
              : `A chuva apaga a casa — e o fogo de <b>${nomeCena(oc)}</b>.`);
          }
          continue;
        }
      } else {
        /* A SECO manda a contagem longa (emenda 10/11 21:12):
         * nove turnos de existência e apaga — o combustível já
         * não é descontado (campo legado dos saves) e a pessoa
         * ocupante NÃO se apaga com a casa: a seco, o fogo da
         * pessoa é o regime de sempre (sair não apaga;
         * apagar-se é a acção dela na sua vez). */
        if (c.idade > 9) {
          rfCasas.delete(chave);
          try { view.apagarFogoCasa(c.x, c.y); } catch (_) {}
          continue;
        }
      }
      try { view.definirEstagioFogoCasa(c.x, c.y, rfEstagioDaIdade(c.idade, chuva)); } catch (_) {}
    }
    if (batalhaFim) return;
    if (ambPodeTerRaios()) {
      if (ambRaioPendente) {
        ambCancelarRaioAgoraTimer();
        ambDefinirRaioPendente(false);
        rfDispararArena();
        if (batalhaFim) return;
      }
      if (rfRolarDado(6) <= (chuva === 1 ? 1 : 2)) rfDispararArena();
    } else if (ambRaioPendente) {
      ambDefinirRaioPendente(false);   // sem chuva/raios ao resolver: o pendente cancela-se (desenho §1)
    }
  }
  function ambMomentoSeNovaRodada() {
    ambUltimoAvancoTS = performance.now();   // VOLTA 3: carimbo de «a batalha anda» para o relógio de exploração
    if (rodada === rfRodadaResolvida) return;
    rfRodadaResolvida = rodada;
    ambienteMomentoRodada();
  }
  function ambTickInicioTurno(id) {
    /* O tick (desenho §5): no início do turno da figura, UM evento
     * por (figura, ronda) se ela está A Arder ou começa o turno
     * numa casa a arder (e aí ganha o estado). aMorrer/estabilizada
     * não ticka. Devolve 'caiu' quando o fogo deita um monstro. */
    const u = unidade(id);
    if (!u || u.vivo === false) return null;
    if (id === PROPRIA && ESTADO_VLAB.ong.estadoMorte) return null;
    const naCasa = rfCasas.has(rfChave(u.posicao.x, u.posicao.y));
    const aArder = rfAArder.has(id);
    if (aArder && !naCasa && ambientePartida.chuva > 0 && RF_CHUVA_APAGA_PARADO) {
      rfApagarPessoa(id);
      rfDizer(id === PROPRIA ? 'A chuva apaga o fogo da <b>Ong</b>.'
        : `A chuva apaga o fogo de <b>${nomeCena(id)}</b>.`);
      return null;
    }
    if (!aArder && !naCasa) return null;
    if (rfUltimoTick.get(id) === rodada) return null;
    rfUltimoTick.set(id, rodada);
    if (naCasa && !aArder) rfIncendiarPessoa(id);
    const r = rfAplicarDanoAmbiente(id, rfParcelaTick(), 'tick-fogo-ambiente');
    if (!r) return null;
    if (r.aplicado > 0 && numerosDano)
      mostrarDano(id, [{ classe: RF_TIPO_FOGO, rotulo: RF_TIPO_FOGO, valor: r.aplicado }]);
    if (r.desfecho === 'caiu') { rfDizer(`<b>${nomeCena(id)}</b> cai, a arder.`); return 'caiu'; }
    if (r.desfecho === 'aMorrer') { entrarAMorrer(); return 'aMorrer'; }
    rfDizer(id === PROPRIA ? 'A <b>Ong</b> está a arder — o fogo morde.'
      : `<b>${nomeCena(id)}</b> está a arder — o fogo morde.`);
    return 'aplicado';
  }
  function rfPodeApagarFogo() {
    /* Fim seco, proposta 1 (desenho §5): ela, A Arder fora de casa
     * em chamas e SEM chuva, pode gastar o movimento da vez a
     * apagar-se. Só na vez dela e na faixa base. */
    if (RF_FIM_SECO !== 'acao-movimento') return false;
    if (batalhaFim || vezAtual !== PROPRIA || estado !== 'base') return false;
    if (!rfAArder.has(PROPRIA) || ESTADO_VLAB.ong.estadoMorte) return false;
    if (ambientePartida.chuva !== 0) return false;
    const pos = (unidade(PROPRIA) || {}).posicao;
    if (pos && rfCasas.has(rfChave(pos.x, pos.y))) return false;
    return true;
  }
  function ambRestaurarFogo(rf) {
    rfCasas.clear(); rfAArder.clear(); rfUltimoTick.clear();
    try { view.limparFogos(); } catch (_) {}
    if (!rf) return;
    for (const c of rf.casas || []) {
      /* Emendas 10/11: a idade volta com o snapshot e a vista
       * recebe o estágio dela pela régua do tempo que faz ao
       * restaurar (rfEstagioDaIdade: na chuva, um turno por
       * estágio; a seco, três turnos por estágio — uma casa
       * restaurada a seco com idade 5 lê-se médio, estágio 2);
       * snapshots antigos (sem o campo) nascem com idade 1 —
       * declarado. */
      const idade = (c.idade >= 1 ? c.idade : 1);
      rfCasas.set(rfChave(c.x, c.y), { x: c.x, y: c.y, combustivel: c.combustivel, idade });
      try { view.acenderFogoCasa(c.x, c.y); view.definirEstagioFogoCasa(c.x, c.y, rfEstagioDaIdade(idade, ambientePartida.chuva)); } catch (_) {}
    }
    for (const id of rf.aArder || []) rfIncendiarPessoa(id);
    /* EM-AV2-06: a memória do último tick volta com o snapshot.
     * Snapshots antigos (sem o campo) nascem com o mapa limpo,
     * como até aqui — declarado. */
    for (const par of rf.ultimoTick || []) {
      if (Array.isArray(par) && par.length === 2) rfUltimoTick.set(par[0], par[1]);
    }
  }
  /* Sair da casa em chamas (desenho §5): terminar um movimento
   * fora de qualquer casa a arder, COM chuva a cair, apaga a
   * pessoa na hora — movimento próprio ou forçado, é o moveend
   * que conta. Sem chuva, sair não apaga: ela continua a arder
   * (e na vez dela pode nascer o botão «Apagar o fogo»). */
  if (view && typeof view.on === 'function') {
    try {
      view.on('moveend', u => {
        if (!u || batalhaFim || supRestaurando) return;
        if (!rfAArder.has(u.id)) return;
        const pos = (unidade(u.id) || {}).posicao;
        if (!pos || rfCasas.has(rfChave(pos.x, pos.y))) return;
        if (ambientePartida.chuva > 0) {
          rfApagarPessoa(u.id);
          /* EM-AV2-04: a frase sai pelo canal adiado rfDizer (o de
           * todas as outras frases do ambiente) — com say() directo
           * era sobrescrita pela frase de chegada dentro do mesmo
           * moveend e nunca se lia (lacuna L2). */
          rfDizer(u.id === PROPRIA
            ? 'A <b>Ong</b> sai da casa em chamas — a chuva apaga o fogo dela.'
            : `<b>${nomeCena(u.id)}</b> sai da casa em chamas — a chuva apaga o fogo.`);
        } else if (u.id === PROPRIA) renderAcoes();
      });
    } catch (_) {}
  }

  /* ---------- Degradação nomeada (apresentação local) ----------
   * Vigia a mediana de 5 amostras de FPS do evento 'stats' da
   * vista; mediana <24 sustentada em 3 vigias seguidas desce UM
   * degrau; a escada só desce na sessão e o estado da mesa não
   * muda: Forte→Pouca (teto 1200) → MÍNIMA (400) → SÓ_SOM (0)
   * → DPR de sessão 1. Cada descida nomeia-se na linha de estado. */
  function ambDegradacaoAmostra(fps) {
    if (typeof fps !== 'number' || !Number.isFinite(fps)) return;
    if (ambDegrau >= AMB_DEGRAUS.length - 1) return;
    ambAmostrasFps.push(fps);
    if (ambAmostrasFps.length > 5) ambAmostrasFps.shift();
    if (ambAmostrasFps.length < 5) return;
    const ord = [...ambAmostrasFps].sort((a, b) => a - b), mediana = ord[2];
    ambVigiasBaixas = mediana < 24 ? ambVigiasBaixas + 1 : 0;
    if (ambVigiasBaixas < 3) return;
    ambVigiasBaixas = 0; ambAmostrasFps.length = 0; ambDegrau++;
    try {
      if (ambDegrau === 1 && typeof view.setCapChuva === 'function') view.setCapChuva(1200);
      else if (ambDegrau === 2 && typeof view.setCapChuva === 'function') view.setCapChuva(400);
      else if (ambDegrau === 3 && typeof view.setCapChuva === 'function') view.setCapChuva(0);
      else if (ambDegrau === 4 && typeof view.setDprSessao === 'function') view.setDprSessao(1);
    } catch (_) {}
    ambSincronizarPainel();
  }

  /* ---------- ÚNICO adaptador de coordenadas ----------
   * O motor/casca falam (x,y) no chão; a vista fala (x,z) no chão.
   * Toda a conversão vive aqui — nenhum outro sítio traduz casas. */
  const casaVista = p => ({ x: p.x, z: p.y });              // motor → vista
  const casaMotor = cell => (cell ? { x: cell.x, y: cell.z } : null); // hitTest → motor
  const chave = (x, y) => x + ',' + y;

  /* ---------- dados de combate (valores das fichas oficiais) ---------- */
  const PROPRIA = 'ong';                 // a personagem da jogadora deste aparelho
  /* Vista da jogadora (decisão do Mestre, 03/11 07:52): neste aparelho
     SÓ a Ong é controlável. Tocar noutra figura NUNCA a torna a
     figura activa: abre o cartão de vista dela (T1.1) e marca-a como
     ALVO. Nas vezes dos monstros age a IA básica da casca (T1.3) —
     nenhum caminho da interface a alcança nem a parametriza; a
     jogadora observa, com os toques interceptados (§ das guardas). */
  const ALVO_NOME = { orc: 'o Orc', capanga: 'o Capanga 1', lobo: 'o Lobo da Caverna' };

  /* ---------- combate (resolução no motor oficial) ----------
   * A resolução é TODA do motor pinado (vlab-completo.js —
   * VLAB + DMG), pelo adaptador do bloco «combate VLAB»:
   * o teste é a expressão da ficha do atacante e o limiar é
   * a CA da ficha do alvo (superar); o dano rola dentro do
   * DMG, por parcelas de tipo. NENHUMA derivação local.
   * DADOS_COMBATE guarda, por figura, só os campos que o
   * combate lê (ca, atkQtd, atkFaces, atkBonus, arma, dano,
   * alcance) — valores das fichas de cada figura, salvo três
   * campos herdados ainda sem leitura oficial (ataque e CA do
   * Capanga, ataque do Lobo), nomeados na sentença J3/J5.
   * A Vida do elenco inimigo mora em VIDA_MONSTROS, mais
   * abaixo. Os números das figuras alheias nunca se exibem:
   * exibição ZERO em frase, ficha, cartão e flutuante —
   * vivem só no estado interno e na resolução. */
  const DADOS_COMBATE = {
    ong:     { ca: 30, atkQtd: 1, atkFaces: 6, atkBonus: 19, arma: 'Chicote de Água', dano: { qtd: 8, faces: 6, bonus: 28 }, alcance: 9,
               transformacao: { custo: 40, dmgBonusNovo: 34, caNova: 36 } },
    orc:     { ca: 33, atkQtd: 1, atkFaces: 6, atkBonus: 17, arma: 'Machado',        dano: { qtd: 4, faces: 6, bonus: 0 },  alcance: 1.5 },
    capanga: { ca: 30, atkQtd: 1, atkFaces: 6, atkBonus: 10, arma: 'Ataque',         dano: { qtd: 2, faces: 6, bonus: 25 }, alcance: 1.5 },
    lobo:    { ca: 34, atkQtd: 1, atkFaces: 6, atkBonus: 10, arma: 'Patada',         dano: { qtd: 1, faces: 6, bonus: 24 }, alcance: 1.5 }
  };
  /* Sem derivações locais: a expressão de ataque de cada
   * figura são os campos da ficha dela (atkQtd d atkFaces +
   * atkBonus), lidos campo a campo em vlabExprAtaque; o
   * limiar de qualquer alvo é a CA da ficha dele. */

  /* Vida do elenco inimigo — o total da ficha oficial de
     cada figura. A Vida de um monstro nunca aparece em
     frase, ficha, cartão, flutuante, recibo público ou
     registo exportável para a Party; vive só no estado
     interno e nas saídas soDoMestre do motor. */
  const VIDA_MONSTROS = { orc: 26, capanga: 210, lobo: 270 };
  function vlabVidaMonstro(id) {
    return Math.max(0, VIDA_MONSTROS[id] - (ESTADO_VLAB[id].danoSofrido | 0));
  }

  /* (A antiga peça local de rolagem de dano da casca saiu na
   * tranche VLAB: o dano rola dentro do DMG, por parcelas de tipo —
   * ver o bloco «combate VLAB». Não fica nenhum resolvedor local.) */
  /* A expressão de dano dela no estado actual (normal/transformada). */
  function expressaoOng() {
    const c = DADOS_COMBATE.ong;
    return transformada
      ? { qtd: c.dano.qtd, faces: c.dano.faces, bonus: c.transformacao.dmgBonusNovo }
      : c.dano;
  }
  /* M-004 (spec Dunloc R06: «toda rolagem exibe a fórmula usada»): a
     fórmula de dano DELA em texto — «8d6+28» (normal) / «8d6+34»
     (transformada). Só a expressão da PRÓPRIA é alguma vez escrita
     com esta função: as expressões das figuras alheias continuam
     proibidas em qualquer superfície (privacidade da Party). */
  function formulaDanoOng(expr) {
    const e = expr || expressaoOng();
    return `${e.qtd}d${e.faces}` + (e.bonus ? `+${e.bonus}` : '');
  }

  /* ---------- turnos e IA básica (tranche T1.3) ----------
   * Ordem da rodada: constante interna de iniciativa. O +4
   * da Ong vem da ficha dela (já exibido na ficha dela); os
   * valores dos monstros são os desta batalha, só para a
   * rotação ser determinística e misturada. A interface
   * mostra só nomes e de quem é a vez — nunca números de
   * iniciativa de ninguém. */
  const INICIATIVA = { ong: 4, lobo: 3, capanga: 2, orc: 1 };
  const ORDEM = [...ELENCO].sort((a, b) =>
    (INICIATIVA[b.id] - INICIATIVA[a.id])
    || (ELENCO.indexOf(a) - ELENCO.indexOf(b))).map(u => u.id);
  // ORDEM = ['ong', 'lobo', 'capanga', 'orc']
  /* O alcance de ataque da IA é o alcance da ficha do
     próprio monstro (DADOS_COMBATE[id].alcance), lido onde
     a IA age — constante separada não existe. */
  /* Verbos da IA (M-018 + LB-C-08): os verbos nomeiam a acção
     VISÍVEL da arma interna de cada um — a patada do Lobo, o
     golpe do Capanga, o machado do Orc (a arma VÊ-SE na
     ilustração aprovada do cartão da Party; só o substantivo,
     nunca número, fórmula ou dado junto a ele) — nunca nomes
     de técnica, nunca armas com dados (fronteira EM-P3). */
  const FRASES_IA = {
    lobo:    { acerto: 'deu uma patada',    falha: 'tentou dar uma patada' },
    capanga: { acerto: 'golpeou',           falha: 'tentou golpear' },
    orc:     { acerto: 'desferiu o machado', falha: 'tentou desferir o machado' }
  };
  /* Tempos da vez da IA (D-13.6): a vez do monstro tem de se ver. */
  const ESPERA_ANUNCIO_MS = 800, ESPERA_ATAQUE_MS = 500, ESPERA_FIM_MS = 1000;
  const GUARDA_IA_MS = 5000;   // relógio de guarda do movimento da IA (G-13.3)
  /* Reserva de movimento DELA (D-13.13): manda a ficha dela —
     Deslocamento 9 m. A casa do motor publicado vale 1,5 m (Q5). */
  const DESLOCAMENTO_ONG_M = 9;
  /* Tranche ESCALA (palavra do Mestre, desempate de 09/11/2026 à
     Ordem 6: «ainda não tem essa mecânica, mas precisa ter»): a
     escala — quanto vale cada casa em metros — é definição do
     Mestre e muda-se A MEIO da batalha, sem custo. Nasce da
     preferência deste aparelho ('hudt1-escala'; padrão 1,5 m, a
     medida oficial do mundo) e um save pode repô-la (o save manda
     na partida, como o ambiente). As posições vivem em casas e
     NUNCA se convertem; a reserva de movimento vive em metros —
     mudar a escala não reescreve nem o total da vez nem o já
     gasto: só muda o PREÇO das casas seguintes. */
  const ESCALAS_CASA_M = [1, 1.5, 2];
  let CASA_M = 1.5;
  try { const v = Number(localStorage.getItem('hudt1-escala'));
        if (ESCALAS_CASA_M.includes(v)) CASA_M = v; } catch (_) {}
  /* Assentar a escala: valida o domínio, grava a preferência,
     pinta o painel do Mestre e — com o Mover aberto — redesenha o
     alcance ao preço novo. Silencioso a pedido (carregar save,
     voltar um turno): nesses gestos a frase é a do próprio gesto.
     A reserva NÃO se toca: o restante em casas recalcula-se sozinho
     em cada leitura (floor(reserva / CASA_M)). */
  function escalaAssentar(nova, opcoes) {
    if (!ESCALAS_CASA_M.includes(nova)) return false;
    const mudou = nova !== CASA_M;
    CASA_M = nova;
    try { localStorage.setItem('hudt1-escala', String(nova)); } catch (_) {}
    escSincronizarPainel();
    if (mudou && estado === 'mover') desenharAlcance();
    if (mudou && !(opcoes && opcoes.silencioso)) {
      let frase = `Escala: cada casa passa a valer <b>${fmtM(CASA_M)}</b>. As posições não mudam; o movimento já gasto continua gasto.`;
      if (estado === 'mover') {
        const casas = Math.floor(reservaMovimento / CASA_M);
        frase += ` Restam <b>${fmtM(reservaMovimento)}</b> — ${casas} ${casas === 1 ? 'casa' : 'casas'} ao preço novo.`;
      }
      say(frase);
    }
    return true;
  }
  /* LA-0: as constantes de alcance vivem em METROS; a conversão
     para casas (a régua das distâncias BFS) faz-se num sítio só. */
  const alcanceEmCasas = metros => Math.max(1, metros / CASA_M);
  /* FICHAS só tem a ficha completa da PRÓPRIA (Ong) — é a única ficha
     que pode aparecer neste aparelho. Não há entradas mecânicas de
     figuras alheias neste objecto, de propósito (ver VISTA, abaixo). */
  const FICHAS = {
    /* Valores da ficha dela (ficha oficial):
       vida 99, alma 91 (0 comprometido), CA 30. O "perdido" e o "PA
       livre" NÃO são literais: compõem-se em abrirFicha a partir de
       danoSofrido e paGasto (tempo de corrida). O campo de ataque
       mostra a fórmula executada (4d6+19 — a expressão da ficha,
       4d6+INT com INT 19; encomenda §1.4; desde a tranche VLAB);
       campo de CD não existe: é gramática estranha ao sistema dele.
       Atributos: INT 19 é da fonte; os restantes ficam como exibição
       sem fonte no elenco. */
    ong: { completa: true, nome: 'ONG', sub: 'Espiritualista · Água',
      vida: { total: 99 }, alma: { total: 91, comprometido: 0 },
      ca: 30, desloc: '9 m', ini: '+4', ataque: 'Teste 4d6+19',
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

  /* ---------- progressão lida (integração LEVEL UP — V1: só leitura) ----------
   * Recado da frente LEVEL UP (03/11/2026 23:16, ordem do Mestre):
   * leitura de classificacao / rank / dadoProgressao, âmbito V1 da
   * encomenda do jogo. Homologação B (decisão dele, 03/11 23:08):
   * leitura + contrato + Regra 2 canónicos; o resto continua provisório.
   * O motor é o levelup.js DESTA pasta, byte a byte o pinado da
   * frente (v2.1, SHA-256 f0b61973…a247; bateria dele 123/123 PASS;
   * leituras byte-idênticas à v1 em 11/11 — prova desta frente): o dado
   * de progressão DERIVA-SE pela tabela do próprio motor via
   * lerProgressao — nenhuma tabela copiada à mão neste ficheiro.
   * Consumo só pela interface pública (lerProgressao): a versão
   * futura do motor (limiares FA, regras novas de subida) troca-se
   * por re-pin + baterias, sem refazer este bloco.
   * ÂMBITO FECHADO: não se aplica progressão (aplicarProgressao em
   * combate fica fora da V1), não se escreve em ficha nenhuma, e
   * NENHUM resultado destas leituras é mostrado em ecrã nenhum
   * nesta tranche — nem o da própria.
   * FONTES_RANK: os textos de rank de cada figura, tal como
   * estão escritos nas fichas oficiais dela (só os três
   * rótulos que o motor lê; aqui fica o essencial por figura):
   *  - ong «Prata 2» e capanga «Prata 3»: fonte única, leitura
   *    «lido» na ficha.
   *  - lobo: duas fontes reais — ver CONFLITOS_RANK_DECLARADOS,
   *    abaixo.
   *  - orc {}: nenhuma fonte fixa o Orc DESTA batalha num
   *    estágio da matriz de 25 — declarar um seria inventar;
   *    a leitura é o erro nomeado.
   * ERROS NOMEADOS, nunca silenciosos, sempre envelopes
   * { valor, estado, prov } — nunca número solto:
   * UNRESOLVED_RANK_CONFLICT (sem inferência, safe_to_apply=false),
   * FONTE_RANK_ILEGIVEL, FICHA_SEM_RANK_LEGIVEL e, se o motor
   * faltar, MOTOR_LEVELUP_INDISPONIVEL.
   * As leituras de progressão nunca são mostradas em ecrã
   * nenhum, nem registadas em DOM/Supervisor/localStorage,
   * nem ligadas a window. */
  const FONTES_RANK = {
    ong:     { rotuloRank: 'Prata 2' },
    capanga: { rotuloRank: 'Prata 3' },
    lobo:    { rotuloRank: 'prata 1 (2d6)', titulo: 'Prata 1' },
    orc:     {}
  };
  /* Conflitos de rank DECLARADOS pelas próprias fontes (não são
     divergência de valores detectada: os textos do Lobo concordam
     no valor escrito). A fixture R199 regista divergência entre o
     corpo da ficha e a hierarquia do bestiário e manda manter o
     conflito visível, sem correcção automática (corpus C5-R199; o
     Motor de Fichas lê esse caso como rank estado «divergente»).
     Alimentado com os textos crus, o motor devolve
     FONTE_RANK_ILEGIVEL para o bloco do bestiário — etiqueta que
     as fontes não sustentam (não declaram o texto ilegível;
     declaram-no EM CONFLITO). A integração adopta o estado de
     conflito do contrato: envelopes «divergente»,
     UNRESOLVED_RANK_CONFLICT, safe_to_apply=false, NENHUM valor
     inferido; a leitura crua do motor fica registada nas NOTAS. */
  const CONFLITOS_RANK_DECLARADOS = {
    lobo: [
      { fonte: 'bestiário — bloco de rank (C5-BEST)', textoBruto: 'prata 1 (2d6)' },
      { fonte: 'bestiário — título da subpágina de rank (C5-BEST)', textoBruto: 'Prata 1' },
      { fonte: 'fixture R199 (C5-R199)', textoBruto: 'Prata 1 no corpo da ficha — a fonte regista divergência com a hierarquia do bestiário e manda manter o conflito visível, sem correção automática' }
    ]
  };
  function envelopeDivergente(fontes) {
    const prov = { fontes: JSON.parse(JSON.stringify(fontes)) };
    return { valor: null, estado: 'divergente', prov };
  }
  const PROGRESSAO_LIDA = {};
  for (const u of ELENCO) {
    if (LU_MOTOR) {
      const l = LU_MOTOR.lerProgressao(
        { id: u.id, fontesRank: FONTES_RANK[u.id] || {} });
      PROGRESSAO_LIDA[u.id] = { classificacao: l.classificacao,
        rank: l.rank, dadoProgressao: l.dadoProgressao, erro: l.erro };
    } else {
      const novoEnv = () => ({ valor: null, estado: 'nao-lido', prov: { fontes: [] } });
      PROGRESSAO_LIDA[u.id] = { classificacao: novoEnv(), rank: novoEnv(),
        dadoProgressao: novoEnv(),
        erro: { codigo: 'MOTOR_LEVELUP_INDISPONIVEL', safe_to_apply_rank_rules: false } };
    }
    const conf = CONFLITOS_RANK_DECLARADOS[u.id];
    if (conf) {
      PROGRESSAO_LIDA[u.id] = {
        classificacao: envelopeDivergente(conf),
        rank: envelopeDivergente(conf),
        dadoProgressao: envelopeDivergente(conf),
        erro: { codigo: 'UNRESOLVED_RANK_CONFLICT',
          fontesEmConflito: JSON.parse(JSON.stringify(conf)),
          safe_to_apply_rank_rules: false,
          declaradoPor: 'fixture R199 (corpus C5-R199)' }
      };
    }
  }
  /* A FichaJogo da própria passa a carregar os três campos lidos
     (envelopes completos, com estado e proveniência). */
  if (FICHAS[PROPRIA]) {
    FICHAS[PROPRIA].classificacao = PROGRESSAO_LIDA[PROPRIA].classificacao;
    FICHAS[PROPRIA].rank = PROGRESSAO_LIDA[PROPRIA].rank;
    FICHAS[PROPRIA].dadoProgressao = PROGRESSAO_LIDA[PROPRIA].dadoProgressao;
  }

  /* ---------- combate VLAB (integração do motor pinado) ----------
   * Adaptador entre a casca e o motor vlab-completo.js (VLAB +
   * DMG, contrato v1.1 + emendas v1.2 da frente VLAB). TODA a
   * resolução de combate passa por aqui: a casca monta as entradas
   * com os dados dela, chama o motor e consome as saídas separando
   * o que é público do que é só-do-Mestre.
   * PRIVACIDADE (inviolável): os números de Vida/Alma e os estados
   * das bestas/NPCs vivem SÓ no campo soDoMestre das saídas e no
   * estado interno ESTADO_VLAB desta vista — nunca em frase, ficha,
   * cartão, flutuante ou registo exportável para a Party.
   * A Vida deste elenco ficou
   * fixada com fonte (VIDA_MONSTROS, acima) e o adaptador passou a
   * enviar vidaActual/vidaTotal dos monstros — só para dentro do
   * motor; o dano que sofrem acumula-se no campo interno
   * danoSofrido de ESTADO_VLAB e a queda deles consome-se do
   * foraDeCombate do motor (vlabAplicarAlvoDepois). Com os três
   * fora de combate, a batalha fecha no terminal de VITÓRIA de
   * fimDeBatalha (doutrina §1.7 ganha o segundo terminal; o da
   * derrota mantém-se intacto). */
  const ESTADO_VLAB = {};
  for (const u of ELENCO) ESTADO_VLAB[u.id] = {
    danoSofrido: 0,           // A01: dano acumulado dos MONSTROS (a dela vive na variável da casca); a Vida corrente deriva-se em vlabVidaMonstro
    estados: [],              // estados mecânicos internos (caido; fraco deriva-se)
    armaCaida: false,         // desgraça: arma no chão (recuperar = 1 Acção de Movimento)
    armaQuebrada: false,      // desgraça: arma partida até ser consertada (palavra dele)
    desvantagemAtaque: 0,     // quebra-corpo: +1 nível de Desvantagem nos ataques, até ao fim do combate
    deslocMetade: false,      // quebra-corpo: deslocamento a metade, até ao fim do combate
    reacaoDisponivel: true,   // 1 Reacção por turno (renova na vez da própria figura)
    estadoMorte: null         // só dela: { fase: 'aMorrer'|'estabilizado', sucessos, falhas }
  };
  /* Reacções-limiar declaradas (contrato Parte B): a página só
     declara uma reacção quando tem TODOS os componentes na ficha —
     Defender = 6 + CON + Armadura + Fortitude (bancada C1). Neste
     elenco nenhuma ficha da casca traz Armadura+Fortitude, por isso
     a tabela nasce vazia e nenhum ataque leva reacção-limiar: lacuna
     de dados nomeada, nunca um valor inventado. Entradas futuras:
     { tipo:'Defender', con, armadura, fortitude, origem } ou
     { tipo:'Esquivar', valor, origem } — o construtor em
     vlabFichaAlvo monta a reacção (Defender passa pela fórmula).
     A mecânica do limiar está provada nos casos do MOTOR (K6 da
     bateria da tranche); a fórmula da página corre quando houver
     dados — declaração corrigida pós-Crítico 1 (achado 5). */
  const REACCOES_DECLARADAS = {};
  function vlabValorDefender(con, armadura, fortitude) {
    return 6 + con + armadura + fortitude;
  }
  /* ---------- PRODUTOR da declaração (C-39 — o escritor que
     faltava; o relatório da tranche 1 atribuiu-o à tranche 3) ----
     A declaração é um ACTO com janela (R02: reacções só na janela
     permitida): declara-se na vez da própria figura, ANTES de
     qualquer ataque que a atinja — declarar depois de um ataque
     resolvido nunca o altera; vale, quando muito, para o próximo.
     Os componentes lêem-se da fonte que a página anfitriã declarar
     em window.FICHAS_REACCOES (a mesma costura de
     window.CAMPO_MESTRE): { <id>: { con, armadura, fortitude,
     origem } }. Entrada sem os três componentes finitos é
     ignorada — o contrato acima governa: sem todos os
     componentes, NÃO se declara, e a razão é nomeada, nunca um
     valor inventado. Neste elenco nenhuma página declara fonte:
     a declaração fica indisponível com a razão à vista na ficha.
     Ciclo de vida: a declaração consome-se SÓ com a resolução
     feita (em vlabResolverAtaqueCompleto — espelho do consumo da
     reacção do ataque de oportunidade); por usar, expira quando a
     vez dela volta (iniciarVez); o restauro de snapshot apaga-as
     todas (pertenciam à linha do tempo abandonada). */
  const REACCOES_FONTES = (typeof window !== 'undefined'
    && window.FICHAS_REACCOES && typeof window.FICHAS_REACCOES === 'object')
    ? window.FICHAS_REACCOES : {};
  function fonteDefender(id) {
    const f = REACCOES_FONTES[id];
    /* Componentes de ficha são inteiros não negativos: fracções,
       negativos e valores enormes não são componentes — são lixo
       de anfitriã, e lixo não declara reacção nenhuma. */
    if (!f || !Number.isInteger(f.con) || !Number.isInteger(f.armadura)
      || !Number.isInteger(f.fortitude) || f.con < 0 || f.armadura < 0
      || f.fortitude < 0 || typeof f.origem !== 'string' || !f.origem)
      return null;
    return f;
  }
  function declararReacaoDefender(id) {
    const falhar = razao => {
      supRegistar('bloqueada', { acao: 'declarar-reacao', actor: id, razao });
      return { erro: razao };
    };
    if (batalhaFim || estado === 'fim') return falhar('BATALHA_TERMINADA');
    if (vezAtual !== id) return falhar('FORA_DA_JANELA — reacção declara-se na vez da própria figura, antes do ataque');
    if (REACCOES_DECLARADAS[id]) return falhar('REACCAO_JA_DECLARADA');
    if (!ESTADO_VLAB[id] || !ESTADO_VLAB[id].reacaoDisponivel) return falhar('REACCAO_INDISPONIVEL_NESTA_RONDA');
    const f = fonteDefender(id);
    if (!f) return falhar('SEM_COMPONENTES_NA_FICHA — Defender pede CON, Armadura e Fortitude declarados');
    REACCOES_DECLARADAS[id] = { tipo: 'Defender', con: f.con, armadura: f.armadura,
      fortitude: f.fortitude, origem: f.origem };
    supRegistar('accao', { acao: 'declarar-reacao', actor: id, tipo: 'Defender',
      valor: vlabValorDefender(f.con, f.armadura, f.fortitude), origem: f.origem });
    if (id === PROPRIA) {
      say(`A <b>Ong</b> declara a reacção <b>Defender</b> — quem a atacar tem de superar a Defesa <b>${vlabValorDefender(f.con, f.armadura, f.fortitude)}</b>.`);
      if (fichaAberta === id) abrirFicha(id);
    }
    return { declarada: true, valor: vlabValorDefender(f.con, f.armadura, f.fortitude) };
  }
  /* A secção «Reacção» da ficha dela: o estado da declaração, sem
     números de ninguém — só os dela, e só quando há fonte. Sem
     fonte de componentes, a linha nomeia a falta (nada se inventa
     e nenhum botão morto se desenha). */
  function seccaoReacaoDefender() {
    const f = fonteDefender(PROPRIA);
    if (!f) return `<div class="tec"><span>DEFENDER</span><em>não declarada</em></div>
      <small>Declarar Defender pede CON, Armadura e Fortitude na ficha — esta ficha não os declara; sem os três componentes, a reacção não se declara.</small>`;
    const valor = vlabValorDefender(f.con, f.armadura, f.fortitude);
    if (REACCOES_DECLARADAS[PROPRIA]) {
      /* Declarada: mostra-se a declaração GUARDADA (a que o motor
         vai usar), não uma releitura da fonte viva. */
      const d = REACCOES_DECLARADAS[PROPRIA];
      return `<div class="tec"><span>DEFENDER</span><em>declarada</em></div>
        <small>Defesa ${vlabValorDefender(d.con, d.armadura, d.fortitude)} — vale para o próximo ataque que a atinja e gasta-se com ele.</small>`;
    }
    if (!ESTADO_VLAB.ong.reacaoDisponivel)
      return `<div class="tec"><span>DEFENDER</span><em>já usada</em></div>
        <small>Defesa ${valor} — a Reacção renova na próxima vez dela.</small>`;
    const podeDeclarar = vezAtual === PROPRIA && !batalhaFim;
    return `<button type="button" class="reacao-btn" data-declarar-defender${podeDeclarar ? '' : ' disabled'}>Declarar Defender</button>
      <small>Defesa ${valor} (6 + CON ${f.con} + Armadura ${f.armadura} + Fortitude ${f.fortitude}) — declara-se na vez dela, ANTES de a atacarem.</small>`;
  }
  /* Repõe o DMG no global só durante a chamada ao motor (ver o
     passo 0): sem isto, todo o acerto morria em DMG_INDISPONIVEL. */
  function vlabComDmg(fn) {
    if (typeof window === 'undefined' || !DMG_MOTOR) return fn();
    window.Dmg = DMG_MOTOR;
    try { return fn(); }
    finally { window.Dmg = undefined; }
  }
  /* ---------- PORTÃO RECIBO-POR-ALVO (H-3, bancada de
     integradores, juiz volta 1 §4.1) ----------
     O bundle compõe publico.recibo com a Defesa do alvo
     (valor + nome da regra) e com a expressão/faces/bónus do
     atacante, e o anexo define publico como «visível» — sem
     filtro, qualquer superfície da Party que um dia imprima o
     recibo imprime números de outrem. A filtração vive AQUI,
     na camada de integração (o bundle não se edita): cada
     adaptador devolve a saída com publico.recibo já filtrado
     por alvo e o recibo completo movido para
     soDoMestre.reciboCompleto (só renderizável em vista do
     Mestre — nesta casca, nunca sai do objecto em memória:
     nem say(), nem ficha, nem o registo exportado o contêm).
     Os recibos PÚBLICOS (filtrados) ficam em RECIBOS_PUBLICOS
     e o Supervisor exporta-os: é a costura de prova do portão
     (bateria VL6 + bateria-recibo + sonda-recibo). */
  const RECIBOS_PUBLICOS = [];
  function vlabRegistarReciboPublico(tipo, de, para, recibo) {
    RECIBOS_PUBLICOS.push({ tipo, de: de || null, para: para || null, recibo });
    while (RECIBOS_PUBLICOS.length > 24) RECIBOS_PUBLICOS.shift();
  }
  function vlabFiltrarReciboAtaque(s, atacanteId, alvoId) {
    if (!s || s.erro || !s.publico || typeof s.publico.recibo !== 'string') return s;
    if (!s.soDoMestre) s.soDoMestre = {};
    s.soDoMestre.reciboCompleto = s.publico.recibo;   // (c): completo só em soDoMestre
    const resultado = String(s.resultado || '').toUpperCase();
    let danoTxt = '';
    if ((s.resultado === 'acerta' || s.resultado === 'critico') && s.danoAplicado) {
      danoTxt = ` · dano ${s.totalEfectivo}`
        + (s.rdAplicada ? ` (bruto ${s.danoAplicado.total}, RD ${s.rdAplicada})` : '')
        + (s.danoAplicado.parcelas && s.danoAplicado.parcelas[0] && s.danoAplicado.parcelas[0].tipo
          ? ` (${s.danoAplicado.parcelas.map(p => p.tipo).join('+')})` : '');
    }
    if (atacanteId === PROPRIA) {
      /* (a) o alvo é OUTRO: a expressão/faces/total DELA ficam
         (desenho aprovado da rolagem dela); a Defesa do alvo —
         valor e nome-valor da regra — sai por completo. */
      const rol = s.rolagem;
      const conjuntos = rol && Array.isArray(rol.conjuntosDeFaces)
        ? rol.conjuntosDeFaces.map(c => `[${c.join(',')}]`).join(' | ') : '';
      s.publico = { recibo: `${rol ? rol.expressao : ''} → ${conjuntos} = ${rol ? rol.total : ''} → ${resultado}${danoTxt}` };
    } else if (alvoId === PROPRIA) {
      /* (b) o atacante é OUTRO: sem expressão, sem faces e sem
         bónus dele; ficam o resultado e o dano sobre ELA (é o
         número dela, já narrado na frase do golpe). */
      s.publico = { recibo: `ataque de ${nomeCena(atacanteId)} contra a Ong → ${resultado}${danoTxt}` };
    } else {
      s.publico = { recibo: `ataque → ${resultado}${danoTxt}` };
    }
    vlabRegistarReciboPublico('ataque', atacanteId, alvoId, s.publico.recibo);
    return s;
  }
  function vlabFiltrarReciboSalvaguarda(s) {
    if (!s || s.erro || !s.publico || typeof s.publico.recibo !== 'string') return s;
    if (!s.soDoMestre) s.soDoMestre = {};
    s.soDoMestre.reciboCompleto = s.publico.recibo;
    /* Sem CD (número do conjurador), sem total do teste do
       alvo e sem total da reflexão: fica o desfecho e o dano
       efectivo, que a ficção já narra. */
    s.publico = { recibo: (s.reflexao && s.reflexao.superou)
      ? `reflexão → REFLETE metade${s.danoReflectidoPendente ? ` (${s.danoReflectidoPendente.valor})` : ''}`
      : `salvaguarda → ${s.resistiu ? 'RESISTE' : 'não resiste'}${s.totalEfectivo !== null && s.totalEfectivo !== undefined ? ` · dano efectivo ${s.totalEfectivo}` : ''}` };
    vlabRegistarReciboPublico('salvaguarda', null, null, s.publico.recibo);
    return s;
  }
  function vlabFiltrarReciboCura(s, nomeOrigem) {
    if (!s || s.erro || !s.publico || typeof s.publico.recibo !== 'string') return s;
    if (!s.soDoMestre) s.soDoMestre = {};
    s.soDoMestre.reciboCompleto = s.publico.recibo;
    /* Sem expressão nem faces de quem cura (números de outrem
       quando quem cura não é a própria): fica a origem. O
       total da cura já vivia só em soDoMestre no bundle. */
    s.publico = { recibo: `cura (origem: ${nomeOrigem || '—'})` };
    vlabRegistarReciboPublico('cura', null, null, s.publico.recibo);
    return s;
  }
  /* ---------- dados com estado guardável (tranche SAVES, C-23) ----------
   * O vivo rolava com Math.random() — sem estado que se possa guardar.
   * Aqui as rolagens da casca passam por um PRNG próprio (LCG
   * 1664525/1013904223, a família do mundo.js): dadoEstado é a
   * «semente» efectiva e faz parte do estado capturável pela ponte
   * de saves (DESENHO-SAVES §3). Na base actual o motor DMG é
   * determinístico e a entropia da casca entra só por vlabSemente
   * (a semente de cada resolução) e vlabVerificacao (as 3 faces da
   * verificação de crítico) — os dois passam a sair do PRNG:
   * guardar = copiar dadoEstado+roladasDados; carregar = repô-los,
   * e as resoluções seguintes ao carregar repetem as que se
   * seguiriam ao guardar. dadoRodar é o ÚNICO sítio que avança o
   * gerador nesta casca. */
  let dadoEstado = (Math.floor(Math.random() * 4294967296)) >>> 0;
  let roladasDados = 0;
  function dadoRodar() {
    dadoEstado = (Math.imul(dadoEstado, 1664525) + 1013904223) >>> 0;
    roladasDados++;
    return dadoEstado;
  }
  function dadoFace(faces) {
    return 1 + Math.floor((dadoRodar() / 4294967296) * faces);
  }
  const vlabSemente = () => dadoRodar();
  const vlabVerificacao = () => [dadoFace(6), dadoFace(6), dadoFace(6)];
  function vlabExprAtaque(id) {
    if (id === PROPRIA) return transformada ? '4d6+25' : '4d6+19';   // 4d6+INT (INT 19; transformada 25)
    const c = DADOS_COMBATE[id];
    return `${c.atkQtd}d${c.atkFaces}+${c.atkBonus}`;   // expressão da ficha, campo a campo
  }
  function vlabExprDanoStr(id) {
    const e = id === PROPRIA ? expressaoOng() : DADOS_COMBATE[id].dano;
    return `${e.qtd}d${e.faces}${e.bonus ? '+' + e.bonus : ''}`;
  }
  function vlabVidaOng() { return Math.max(0, FICHAS.ong.vida.total - danoSofrido); }
  function vlabOngFraca() { return vlabVidaOng() > 0 && vlabVidaOng() * 10 < FICHAS.ong.vida.total; }
  function vlabEstadosDe(id) {
    const st = ESTADO_VLAB[id].estados.slice();
    if (id === PROPRIA && vlabOngFraca() && !st.includes('fraco')) st.push('fraco');
    /* A01: Fraco (Regra 7) também se deriva para os monstros, da
       Vida interna deles — mesma régua dos 10% que a dela. */
    if (id !== PROPRIA && VIDA_MONSTROS[id] != null) {
      const v = vlabVidaMonstro(id);
      if (v > 0 && v * 10 < VIDA_MONSTROS[id] && !st.includes('fraco')) st.push('fraco');
    }
    return st;
  }
  function vlabFichaAtacante(id) {
    const f = {
      testes: { ataque: vlabExprAtaque(id) },
      paLivre: id === PROPRIA
        ? FICHAS.ong.alma.total - FICHAS.ong.alma.comprometido - paGasto : 0,
      estado: vlabEstadosDe(id),
      armaCaida: ESTADO_VLAB[id].armaCaida,
      armaQuebrada: ESTADO_VLAB[id].armaQuebrada
    };
    if (id === PROPRIA) {
      f.vidaActual = vlabVidaOng();
      f.vidaTotal = FICHAS.ong.vida.total;
      f.testesDeMorteDesignado = true;   // personagem designada (contrato M3): a corrida é dela
    } else if (VIDA_MONSTROS[id] != null) {
      /* A01: o monstro como ATACANTE também declara a Vida —
         a desgraça «acerta-se» do motor aplica-lhe o dano próprio
         (com o tecto de 1 de Vida: nunca o mata). O valor viaja
         para dentro do motor; nunca sai em superfície da Party. */
      f.vidaActual = vlabVidaMonstro(id);
      f.vidaTotal = VIDA_MONSTROS[id];
    }
    return f;
  }
  function vlabFichaAlvo(id) {
    const f = {
      ca: id === PROPRIA
        ? (transformada ? DADOS_COMBATE.ong.transformacao.caNova : DADOS_COMBATE.ong.ca)
        : DADOS_COMBATE[id].ca,
      estado: vlabEstadosDe(id),
      rd: { geral: 0, porTipo: {} }
    };
    const decl = REACCOES_DECLARADAS[id];
    if (decl) f.reacaoDefensiva = decl.tipo === 'Defender'
      ? { tipo: 'Defender', valor: vlabValorDefender(decl.con, decl.armadura, decl.fortitude), origem: decl.origem }
      : { tipo: decl.tipo, valor: decl.valor, origem: decl.origem };
    if (id === PROPRIA) {
      f.vidaActual = vlabVidaOng();
      f.vidaTotal = FICHAS.ong.vida.total;
      f.testesDeMorteDesignado = true;
      if (ESTADO_VLAB.ong.estadoMorte) f.estadoMorte = ESTADO_VLAB.ong.estadoMorte;
    } else if (VIDA_MONSTROS[id] != null) {
      /* A01: o monstro como ALVO declara a Vida (só para dentro
         do motor) — é dela que o motor deriva o foraDeCombate. */
      f.vidaActual = vlabVidaMonstro(id);
      f.vidaTotal = VIDA_MONSTROS[id];
    }
    return f;
  }
  /* Alvo DELA: a ficha de alvo é a mesma de qualquer alvo —
     o limiar é a CA da ficha dela (a normal ou a da forma
     transformada, via vlabFichaAlvo) e o teste do monstro
     é a expressão da ficha dele. EXCEPÇÃO DA REGRA B0
     (achado 1 do Crítico 1): contra um Ataque de
     Oportunidade o motor RECUSA qualquer alvo com
     reacaoDefensiva declarada (o alvo não pode reagir) —
     nesse caso a declaração retira-se; o limiar continua
     a ser a CA, sem reacção nenhuma. */
  function vlabFichaAlvoDela(paraOportunidade) {
    const f = vlabFichaAlvo(PROPRIA);
    if (paraOportunidade) delete f.reacaoDefensiva;
    return f;
  }
  function vlabFlanqueandoSobre(alvoId, atacanteId) {
    const a = unidade(atacanteId), t = unidade(alvoId);
    if (!a || !t) return false;
    const dx = a.posicao.x - t.posicao.x, dy = a.posicao.y - t.posicao.y;
    return ELENCO.some(u => {
      if (u.id === atacanteId || u.id === alvoId) return false;
      const v = unidade(u.id);
      /* T-J12J13: cadáver não dá flanqueamento — o parceiro do
         outro lado tem de estar vivo (o padrão `vivo !== false`
         da casa, o mesmo das adjacências de oportunidade A01). */
      return v && v.vivo !== false && distanciaEntre(u.id, alvoId) === 1
        && v.posicao.x - t.posicao.x === -dx && v.posicao.y - t.posicao.y === -dy;
    });
  }
  /* A chamada única ao motor. opts: { modoDesgraca, semente,
     verificacao, ataqueDeOportunidade, desgracaEscolhida,
     confirmacaoDeProposta } — o resto deriva-se do estado. */
  function vlabResolverAtaqueCompleto(atacanteId, alvoId, opts) {
    opts = opts || {};
    if (!VLAB_MOTOR) return { erro: { codigo: 'MOTOR_VLAB_INDISPONIVEL', detalhe: 'vlab-completo.js não carregou' } };
    const c = DADOS_COMBATE[atacanteId];
    const tecnica = atacanteId === PROPRIA
      ? { nome: c.arma, custoPA: 8, expressaoAtaque: vlabExprAtaque(atacanteId),
          expressaoDano: vlabExprDanoStr(atacanteId), tipo: 'agua', magia: false, usaArma: true }
      : { nome: c.arma, custoPA: 0, expressaoAtaque: vlabExprAtaque(atacanteId),
          expressaoDano: vlabExprDanoStr(atacanteId), usaArma: true };
    const alvoFicha = (alvoId === PROPRIA && atacanteId !== PROPRIA)
      ? vlabFichaAlvoDela(opts.ataqueDeOportunidade === true) : vlabFichaAlvo(alvoId);
    const contexto = {
      semente: opts.semente != null ? opts.semente : vlabSemente(),
      verificacaoCritico: opts.verificacao || vlabVerificacao(),
      modoDesgraca: opts.modoDesgraca || 'sorte',
      aliadosAoAlcance: [],   // batalha a solo: sem aliados de nenhum dos lados nesta casca
      niveisDesvantagem: ESTADO_VLAB[atacanteId].desvantagemAtaque || 0
    };
    if (opts.ataqueDeOportunidade) {
      contexto.ataqueDeOportunidade = true;
      contexto.niveisVantagem = 1;   // Regra 3: ataque de oportunidade = ataque normal com Vantagem
    }
    if (atacanteId !== PROPRIA && alvoId === PROPRIA && vlabFlanqueandoSobre(PROPRIA, atacanteId))
      contexto.flanqueando = true;
    if (opts.desgracaEscolhida) contexto.desgracaEscolhida = opts.desgracaEscolhida;
    if (opts.confirmacaoDeProposta) contexto.confirmacaoDeProposta = opts.confirmacaoDeProposta;
    /* Arma caída de um monstro: apanhá-la gasta o movimento dele —
       quem chama declara a recuperação e a bandeira limpa-se aqui. */
    if (atacanteId !== PROPRIA && ESTADO_VLAB[atacanteId].armaCaida) {
      contexto.armaRecuperada = true;
      ESTADO_VLAB[atacanteId].armaCaida = false;
    }
    const reacaoEmUso = alvoFicha.reacaoDefensiva || null;
    /* CORRECÇÃO DA E3 (re-prova E7, 09/11/2026): a fotografia
       pré-golpe do estado de morte DELA tira-se AQUI, antes de
       o motor resolver — este adaptador é o funil único de
       todas as resoluções (IA, oportunidade e o golpe dela). A
       ficha de alvo passa a referência VIVA de
       ESTADO_VLAB.ong.estadoMorte ao motor (vlabFichaAlvo); se
       um motor futuro a mutar no lugar durante a resolução,
       quando o consumidor correr o objecto já traz os valores
       pós-golpe e nenhuma leitura lá dentro recupera o
       «antes» (a E3 fotografava dentro do consumidor, já
       depois da resolução — a E7 mediu a regra a morrer em
       silêncio nesse mundo). A fase e o número de falhas
       fotografados viajam no recibo (soDoMestre, o canal
       só-do-Mestre) e o consumidor decide contra eles. Só com
       ela por alvo: o ramo de morte do consumidor só existe
       para ela. */
    const fotoAlvoAntes = (alvoId === PROPRIA && ESTADO_VLAB.ong.estadoMorte)
      ? { fase: ESTADO_VLAB.ong.estadoMorte.fase, falhas: ESTADO_VLAB.ong.estadoMorte.falhas | 0 }
      : null;
    const saidaMotor = vlabComDmg(() => VLAB_MOTOR.resolverAtaque({
      atacante: vlabFichaAtacante(atacanteId), alvo: alvoFicha, tecnica, contexto }));
    /* C-39: a Reacção declarada consome-se SÓ com a resolução
       feita (espelho do consumo da reacção do ataque de
       oportunidade) — saída com erro não consome nada. O ramo de
       oportunidade chega aqui sem reacção na ficha (regra B0):
       um ataque de oportunidade nunca gasta a declaração. */
    if (reacaoEmUso && saidaMotor && !saidaMotor.erro && REACCOES_DECLARADAS[alvoId]) {
      delete REACCOES_DECLARADAS[alvoId];
      if (ESTADO_VLAB[alvoId]) ESTADO_VLAB[alvoId].reacaoDisponivel = false;
    }
    const recibo = vlabFiltrarReciboAtaque(saidaMotor, atacanteId, alvoId);
    if (fotoAlvoAntes && recibo && !recibo.erro) {
      if (!recibo.soDoMestre) recibo.soDoMestre = {};
      recibo.soDoMestre.fotoAlvoAntes = fotoAlvoAntes;
    }
    return recibo;
  }
  /* Consome o lado do ATACANTE de uma saída (desgraças e bandeiras).
     Devolve a info da falha crítica (ou null). */
  function vlabAplicarAtacanteDepois(id, saida) {
    const sm = saida.soDoMestre || {};
    const dep = sm.atacanteDepois;
    if (dep) {
      if (dep.armaCaida) ESTADO_VLAB[id].armaCaida = true;
      if (dep.armaQuebrada) ESTADO_VLAB[id].armaQuebrada = true;
      for (const e of dep.estadosNovos || [])
        if (!ESTADO_VLAB[id].estados.includes(e)) ESTADO_VLAB[id].estados.push(e);
      if (id === PROPRIA && Number.isFinite(dep.vidaActual)) {
        danoSofrido = FICHAS.ong.vida.total - dep.vidaActual;   // acerta-se: o motor já aplicou o tecto (nunca mata)
        atualizarChipVida();
      } else if (id !== PROPRIA && VIDA_MONSTROS[id] != null && Number.isFinite(dep.vidaActual)) {
        /* A01: o dano próprio do monstro (desgraça «acerta-se»)
           acumula-se na Vida interna dele — o motor aplicou o
           tecto de 1 de Vida, por isso nunca nasce uma queda aqui. */
        ESTADO_VLAB[id].danoSofrido = VIDA_MONSTROS[id] - dep.vidaActual;
      }
    }
    if (sm.falhaCritica && sm.falhaCritica.efeitoMecanico
        && sm.falhaCritica.efeitoMecanico.tipo === 'quebraCorporal') {
      ESTADO_VLAB[id].desvantagemAtaque = 1;
      ESTADO_VLAB[id].deslocMetade = true;
      /* T-QUEBRAR25 (regra do Mestre, 07/11 09:02): quebrar uma
         parte do corpo custa NA HORA 25% da vida ACTUAL de quem
         falhou o golpe — soma-se aos dois efeitos de cima. A perda
         é floor(25% da vida actual), com o tecto de nunca tirar a
         última vida: esta regra sozinha NUNCA mata (com vida 1–3
         a perda é 0). Assenta-se pela via normal da casca — o
         mesmo danoSofrido do «acerta-se» — e vê-se na vida (chip
         dela / Vida interna do monstro) e na frase da desgraça;
         sem parcela flutuante nova. */
      const vidaActualQ = id === PROPRIA ? vlabVidaOng()
        : (VIDA_MONSTROS[id] != null ? vlabVidaMonstro(id) : 0);
      let perdaQ = Math.floor(vidaActualQ / 4);
      if (perdaQ > vidaActualQ - 1) perdaQ = vidaActualQ - 1;
      if (perdaQ < 0) perdaQ = 0;
      sm.falhaCritica.perdaQuebraCorporal = perdaQ;
      if (perdaQ > 0) {
        if (id === PROPRIA) {
          danoSofrido += perdaQ;
          atualizarChipVida();
        } else if (VIDA_MONSTROS[id] != null) {
          ESTADO_VLAB[id].danoSofrido = (ESTADO_VLAB[id].danoSofrido | 0) + perdaQ;
        }
      }
    }
    return sm.falhaCritica || null;
  }
  /* Consome o lado do ALVO de uma saída. Para os monstros: estados
     internos e Vida interna, em silêncio total — e, desde o
     completamento, a QUEDA: o foraDeCombate do motor tomba a
     figura na cena (setVivo) e devolve 'caiu'. Para ela: Vida,
     corrida de morte. Devolve 'morreu' | 'aMorrer' | 'caiu' | null. */
  function vlabAplicarAlvoDepois(id, saida) {
    const dep = (saida.soDoMestre || {}).alvoDepois;
    if (!dep) return null;
    if (id !== PROPRIA) {
      for (const e of dep.estadosNovos || [])
        if (!ESTADO_VLAB[id].estados.includes(e)) ESTADO_VLAB[id].estados.push(e);
      for (const e of dep.estadosRemovidos || [])
        ESTADO_VLAB[id].estados = ESTADO_VLAB[id].estados.filter(x => x !== e);
      if (VIDA_MONSTROS[id] != null && Number.isFinite(dep.vidaActual))
        ESTADO_VLAB[id].danoSofrido = VIDA_MONSTROS[id] - dep.vidaActual;
      const caiu = VIDA_MONSTROS[id] != null
        && (dep.vidaActual === 0 || (dep.estadosNovos || []).includes('foraDeCombate'));
      if (caiu) {
        /* A queda VÊ-SE pela máquina de morte da cena quando ela
           existe; na cena sagrada do vivo cai no setVivo de sempre
           (o mesmo caminho do restauro de figura morta). */
        try {
          const pm = view.apresentarMorte(id);
          if (pm && pm.catch) pm.catch(() => {});
        } catch (_) { view.setVivo(id, false); }
        ambAoMorrerFigura(id);   // RAIO E FOGO: a morte apaga o fogo da figura
        return 'caiu';
      }
      return null;
    }
    if (Number.isFinite(dep.vidaActual)) {
      danoSofrido = FICHAS.ong.vida.total - dep.vidaActual;
      atualizarChipVida();
    }
    /* Tranche ATAQUE-CAIDA (regra do Mestre, 09/11/2026): a fase
       ANTES do golpe distingue a queda nova da falha nova. Com ela
       já 'aMorrer', um golpe que lhe sobe as falhas não é outra
       queda — o chamador não volta a anunciar que ela caiu; é uma
       falha de morte por golpe ('falhaDeMorte'), que o chamador
       narra e regista como falha. Sem subida de falhas, nada de
       morte muda (null, como um acerto comum). O nascimento da
       corrida e a reentrada da estabilizada continuam 'aMorrer'. */
    const emAntesGolpe = ESTADO_VLAB.ong.estadoMorte;
    /* CORRECÇÃO DA E3 (re-prova E7, 09/11/2026): a fotografia
       pré-golpe já não se tira aqui dentro. A E3 fotografava o
       número neste ponto, mas a resolução corre ANTES do
       consumo (o chamador resolve e só depois consome) — a E7
       mediu que, num motor que mute o objecto no lugar, a foto
       lia já o número pós-golpe, a comparação lia o número
       contra si mesmo e a regra morria em silêncio (casos
       H-A/H-F da re-prova). Quem fotografa é o ADAPTADOR,
       antes de chamar o motor: a fase e o número de falhas
       viajam no recibo (soDoMestre.fotoAlvoAntes) e a decisão
       abaixo é contra eles. Sem foto no recibo (recibo montado
       à mão, fora do adaptador), cai-se na leitura do objecto
       vivo, como a E3 fazia — com o motor de hoje os dois
       caminhos lêem os mesmos valores, porque nada muta o
       objecto entre a resolução e o consumo. */
    const fotoAntes = (saida.soDoMestre || {}).fotoAlvoAntes || null;
    const faseAntes = fotoAntes ? fotoAntes.fase
      : (emAntesGolpe ? emAntesGolpe.fase : null);
    const falhasAntes = fotoAntes ? (fotoAntes.falhas | 0)
      : (emAntesGolpe ? (emAntesGolpe.falhas | 0) : null);
    if (dep.estadoMorte) ESTADO_VLAB.ong.estadoMorte = dep.estadoMorte;
    if (dep.morteAdjudicada) return 'morreu';
    if (dep.estadoMorte && dep.estadoMorte.fase === 'aMorrer'
        && vlabVidaOng() <= 0) {
      if (faseAntes === 'aMorrer'
          && (dep.estadoMorte.falhas | 0) > falhasAntes)
        return 'falhaDeMorte';
      if (faseAntes === 'aMorrer') return null;
      return 'aMorrer';
    }
    return null;
  }
  /* ---------- consumo da cura nela (Q4) ----------
   * Espelho do vlabAplicarAlvoDepois para o recibo de cura
   * (vlabAplicarCura): é por aqui que uma cura que a tem por alvo
   * entra no estado da casca. Regra Q4 do Mestre: sobre a
   * estabilizada, a cura soma por cima do 1 de Vida que ela tem —
   * o motor aplica-a normalmente a partir dessa Vida e o recibo
   * traz a Vida depois; a marca de estabilizada é da casca e sai
   * aqui: curou e ela ficou acima de 0 → a marca apaga-se, ela
   * levanta-se na vista e a rotação volta a dar-lhe a vez quando
   * lá chegar (passarVez já não a salta sem a marca). O motor só
   * emite estadoMorte:null no recibo quando a cura parte de Vida
   * 0 — com a marca Q4 ela está a 1, por isso quem limpa é este
   * consumo, nos dois casos. Para outras figuras devolve null:
   * nenhuma cura de monstro tem consumidor vivo nesta casca,
   * como até aqui. */
  function vlabAplicarCuraDepois(id, saida) {
    const dep = (saida && saida.soDoMestre || {}).alvoDepois;
    if (!dep || id !== PROPRIA) return null;
    if (Number.isFinite(dep.vidaActual)) {
      danoSofrido = FICHAS.ong.vida.total - dep.vidaActual;
      atualizarChipVida();
    }
    if (dep.estadoMorte === null) ESTADO_VLAB.ong.estadoMorte = null;
    const em = ESTADO_VLAB.ong.estadoMorte;
    if (em && em.fase === 'estabilizado' && vlabVidaOng() > 0) {
      ESTADO_VLAB.ong.estadoMorte = null;
      view.setVivo(PROPRIA, true);   // levanta-se: a pose de caída sai
      return 'levantou';
    }
    return null;
  }
  /* Terminal de VITÓRIA (A01): os três monstros fora de combate
     na cena (a vista é a verdade da queda, como na rotação de vez
     e nos alvos vivos FID-R2). */
  function vlabTodosMonstrosForaDeCombate() {
    return ELENCO.every(u => u.id === PROPRIA
      || (unidade(u.id) || {}).vivo === false);
  }
  /* Frase de ficção de uma desgraça (sem números de ninguém). */
  function vlabFraseDesgraca(id, fc) {
    const nome = id === PROPRIA ? 'a <b>Ong</b>' : `<b>${nomeCena(id)}</b>`;
    const arma = DADOS_COMBATE[id].arma;
    switch (fc && fc.desgraca && fc.desgraca.id) {
      case 'cai': return `${nome} foi ao chão com o golpe falhado.`;
      case 'arma-cai': return `A arma (${arma}) caiu-lhe da mão.`;
      case 'arma-quebra': return `A arma (${arma}) quebrou — fica inutilizável até ser consertada.`;
      case 'acerta-se': return `${nome} atingiu-se a si ${id === PROPRIA ? 'própria' : 'próprio'} com o próprio golpe.`;
      case 'quebra-corpo': {
        const pronQ = id === PROPRIA ? 'dela' : 'dele';
        const perdaFraseQ = fc && Number.isFinite(fc.perdaQuebraCorporal) ? fc.perdaQuebraCorporal : 0;
        return `${nome} quebrou algo no corpo — os golpes ${pronQ} ficam prejudicados e anda metade até ao fim do combate.${perdaFraseQ > 0 ? ' Perde um quarto da vida que tem agora.' : ''}`;
      }
      case 'acerta-amigo': return `O golpe atingiu um aliado sem querer.`;
      default: return `O golpe correu mal.`;
    }
  }
  /* ---------- testes de morte dela (M3 do Mestre) ----------
   * CD = CON dela + k da classificação LIDA (motor LEVEL UP):
   * a expressão de Fortitude na forma canónica da bancada da morte
   * (dados da classificação + CON). O relógio é a viragem da ronda:
   * 1 teste por ronda, quando a vez voltaria a ela. Os contadores
   * (sucessos/falhas) vivem em ESTADO_VLAB e no registo do
   * Supervisor (a ferramenta do Mestre nesta casca) — nunca em
   * frase, ficha ou flutuante da Party. */
  const VLAB_CHAVE_CLASSIFICACAO = { 'Bronze': 'bronze', 'Prata': 'prata', 'Ouro': 'ouro', 'Ouro Negro': 'ouroNegro', 'Lendário': 'lendario' };
  function vlabMoribundo() {
    const cls = PROGRESSAO_LIDA.ong && PROGRESSAO_LIDA.ong.classificacao;
    const dado = PROGRESSAO_LIDA.ong && PROGRESSAO_LIDA.ong.dadoProgressao;
    const con = (FICHAS.ong.attrs.find(a => a[0] === 'CON') || [])[1];
    if (!cls || cls.estado !== 'lido' || !dado || !dado.valor || !dado.valor.texto
        || !VLAB_CHAVE_CLASSIFICACAO[cls.valor] || !Number.isFinite(con))
      return null;
    return {
      testesDeMorteDesignado: true,
      estadoMorte: ESTADO_VLAB.ong.estadoMorte,
      constituicao: con,
      classificacao: VLAB_CHAVE_CLASSIFICACAO[cls.valor],
      testes: { fortitude: `${dado.valor.texto}+${con}` }
    };
  }
  function vlabRelogioMorte() {
    const em = ESTADO_VLAB.ong.estadoMorte;
    if (!em || em.fase !== 'aMorrer') return null;
    const moribundo = vlabMoribundo();
    if (!VLAB_MOTOR || !moribundo) {
      supRegistar('bloqueada', { acao: 'teste-de-morte', actor: PROPRIA,
        razao: !VLAB_MOTOR ? 'MOTOR_VLAB_INDISPONIVEL' : 'PROGRESSAO_ILEGIVEL_PARA_TESTE_DE_MORTE' });
      fimDeBatalha('indeterminado');
      return null;
    }
    const s = VLAB_MOTOR.resolverTesteDeMorte({ moribundo, contexto: { semente: vlabSemente() } });
    if (s.erro) {
      supRegistar('bloqueada', { acao: 'teste-de-morte', actor: PROPRIA, razao: s.erro.codigo });
      fimDeBatalha('indeterminado');
      return null;
    }
    ESTADO_VLAB.ong.estadoMorte = s.estadoMorte;
    supRegistar('accao', { acao: 'teste-de-morte', actor: PROPRIA,
      sucessos: s.estadoMorte.sucessos, falhas: s.estadoMorte.falhas, desfecho: s.desfecho });
    if (s.desfecho === 'estabilizado') {
      /* Q4 (palavra do Mestre, 08/11/2026): estabilizar NÃO fecha
         a batalha. Ela volta com 1 de Vida, continua caída (a vista
         tem-na no chão desde entrarAMorrer — nada se levanta aqui)
         e fica sem lutar até receber uma cura; a cura soma por
         cima desse 1. A marca fica em estadoMorte com a fase
         'estabilizado' que o motor devolveu: este relógio só corre
         em 'aMorrer' (os testes param) e passarVez salta a vez
         dela enquanto a marca durar. A frase é a da regra, a mesma
         que o terminal antigo anunciava — agora sem fim. */
      danoSofrido = FICHAS.ong.vida.total - 1;
      atualizarChipVida();
      return 'A <b>Ong</b> caiu, mas estabilizou — ela volta com <b>1 de Vida</b> e fica caída, sem lutar, até receber uma cura. A cura soma por cima desse 1.';
    }
    if (s.desfecho === 'morreu') { fimDeBatalha('morte'); return null; }
    return s.sucesso
      ? 'A <b>Ong</b>, caída, aguenta-se — continua a respirar.'
      : 'A <b>Ong</b>, caída, piora visivelmente.';
  }
  function entrarAMorrer() {
    view.setVivo(PROPRIA, false);
    estado = 'a-morrer';
    atualizarVez(); renderAcoes();
    say('A <b>Ong</b> caiu — a batalha continua à volta dela.');
  }
  /* ---------- salvaguarda e cura (adaptadores) ----------
   * Ligados e exercidos nos casos da tranche; nesta batalha de
   * teste nenhuma técnica do elenco declara teste de salvaguarda
   * (nomeTeste) nem efeito de cura — os caminhos vivos são o ataque
   * e os testes de morte. Quem um dia declarar, resolve por aqui,
   * nunca por um resolvedor local novo. */
  function vlabResolverSalvaguarda(entrada) {
    if (!VLAB_MOTOR) return { erro: { codigo: 'MOTOR_VLAB_INDISPONIVEL' } };
    return vlabFiltrarReciboSalvaguarda(vlabComDmg(() => VLAB_MOTOR.resolverSalvaguarda(entrada)));
  }
  function vlabAplicarCura(entrada) {
    if (!VLAB_MOTOR) return { erro: { codigo: 'MOTOR_VLAB_INDISPONIVEL' } };
    return vlabFiltrarReciboCura(VLAB_MOTOR.aplicarCura(entrada),
      entrada && entrada.origem ? entrada.origem.nome : null);
  }
  /* ---------- movimento com regras (Parte C do contrato) ----------
   * Deslocamento base dela nesta vez: 9 m, a metade se estiver
   * Fraca (Regra 7) ou com o corpo partido (desgraça). */
  function vlabDeslocBaseOng() {
    let base = DESLOCAMENTO_ONG_M;
    if (vlabOngFraca()) base /= 2;
    if (ESTADO_VLAB.ong.deslocMetade) base /= 2;
    return base;
  }
  let partidaPendente = null;   // { de, adjacentes:[ids], desvincular } capturado à partida dela
  let correrUsado = false;      // Correr já gasto nesta vez
  const opcoesMovimento = { desvincular: false };   // intenção declarada no modo Mover
  let avisoInicioVez = null;    // frase extra ao abrir a vez dela (ex.: levantar-se)
  function vlabCapturarPartida(caminho) {
    const u = unidade(PROPRIA);
    if (!u) { partidaPendente = null; return; }
    const partida = { x: u.posicao.x, y: u.posicao.y };
    const adjacentes = ELENCO.filter(e => e.id !== PROPRIA
      && (unidade(e.id) || {}).vivo !== false   // A01: um monstro caído não golpeia de oportunidade
      && distanciaEntre(e.id, PROPRIA) === 1).map(e => e.id);
    /* Meio do caminho (contrato Parte C; achado 3 do Crítico 1):
       inimigos cuja zona ela atravessa E abandona durante o
       percurso também provocam ataque de oportunidade — e o
       Desvincular NÃO os cobre (cobre só os adjacentes no momento
       do uso). A zona é a adjacência ortogonal (grade 4-direcções);
       há provocação quando uma casa do caminho é adjacente ao
       inimigo e a casa seguinte já não é. */
    let meioCaminho = [];
    if (Array.isArray(caminho) && caminho.length) {
      const casas = [partida, ...caminho];
      meioCaminho = ELENCO.filter(e => e.id !== PROPRIA && !adjacentes.includes(e.id))
        .filter(e => {
          const m = unidade(e.id); if (!m || m.vivo === false) return false;   // A01: idem — morto não provoca
          const adj = c => Math.abs(c.x - m.posicao.x) + Math.abs(c.y - m.posicao.y) === 1;
          for (let i = 0; i < casas.length - 1; i++)
            if (adj(casas[i]) && !adj(casas[i + 1])) return true;
          return false;
        }).map(e => e.id);
    }
    partidaPendente = { de: partida, adjacentes, meioCaminho, desvincular: opcoesMovimento.desvincular };
    opcoesMovimento.desvincular = false;   // a intenção consome-se na partida
  }
  /* Saída de adjacência dela: valida no motor e resolve os ataques
     de oportunidade que nascerem, um a um, pelo mesmo resolver.
     Devolve { frase, abortada } (ou null sem motor): a frase
     composta (ou null se nada houver a dizer); abortada = o ciclo
     morreu a meio (época morta num parque) e o chamador cala tudo.
     M2 (Opção C dele, §4.2): ASSÍNCRONA — no modo do Mestre, um
     golpe cuja falha crítica traz proposta ESTACIONA dentro do
     ciclo e espera a decisão dele no cartão; sem MODO_MESTRE corre
     exactamente como a síncrona de sempre (nunca espera). */
  async function vlabResolverSaidaAdjacencia(partiu) {
    if (!VLAB_MOTOR) return null;
    const mk = ids => ids.map(id => ({
      id, reacaoDisponivel: ESTADO_VLAB[id].reacaoDisponivel }));
    const frases = [];
    /* Grupo A — adjacentes à partida que ela abandonou: o
       Desvincular pode cobri-los (todos, palavra do Mestre). */
    let val = VLAB_MOTOR.validarSaidaDeAdjacencia({
      inimigosAdjacentes: mk(partiu.adjacentes),
      desvincular: partiu.desvincular ? { gastouAccaoPadrao: !atacou } : undefined });
    if (val.erro && val.erro.codigo === 'DESVINCULAR_SEM_ACCAO_PADRAO') {
      frases.push('Ela já usou a acção principal desta vez — não dá para sair com segurança.');
      val = VLAB_MOTOR.validarSaidaDeAdjacencia({ inimigosAdjacentes: mk(partiu.adjacentes) });
    }
    if (val.erro) {
      supRegistar('bloqueada', { acao: 'saida-adjacencia', actor: PROPRIA, razao: val.erro.codigo });
      return { frase: frases.length ? frases.join(' ') : null, abortada: false };
    }
    /* Grupo B — encontrados e abandonados a meio do caminho:
       atacam na mesma e o Desvincular não os cobre (contrato). */
    let ataquesB = [];
    if (partiu.meioCaminho && partiu.meioCaminho.length) {
      const valB = VLAB_MOTOR.validarSaidaDeAdjacencia({ inimigosAdjacentes: mk(partiu.meioCaminho) });
      if (valB.erro) supRegistar('bloqueada', { acao: 'saida-adjacencia', actor: PROPRIA, razao: valB.erro.codigo });
      else ataquesB = valB.ataquesDeOportunidade;
    }
    const ataques = [...val.ataquesDeOportunidade, ...ataquesB];
    if (partiu.desvincular && val.cobertosPorDesvincular.length) {
      atacou = true;   // a Acção Padrão gastou-se no Desvincular
      if (!ataques.length)
        return { frase: 'A <b>Ong</b> afastou-se com segurança — nenhum inimigo a golpeia ao sair.', abortada: false };
      frases.push('A <b>Ong</b> afastou-se com segurança de quem tinha ao lado ao partir.');
    }
    for (const aoo of ataques) {
      /* M2 (§4.2): semente e verificação POR GOLPE, capturadas pela
         casca antes da rolagem — como o §3.1 faz no turno. No modo
         do Mestre o golpe rola em «proposta» (se a falha crítica
         trouxer proposta confirmável, o ciclo estaciona nela);
         sem MODO_MESTRE rola em «sorte» como hoje — a Party nunca
         espera por um cartão que não pode ver. */
      let sementeDG = null, verificacaoDG = null;
      if (MODO_MESTRE) { sementeDG = vlabSemente(); verificacaoDG = vlabVerificacao(); }
      const s = MODO_MESTRE
        ? vlabResolverAtaqueCompleto(aoo.inimigoId, PROPRIA, { ataqueDeOportunidade: true, modoDesgraca: 'proposta', semente: sementeDG, verificacao: verificacaoDG })
        : vlabResolverAtaqueCompleto(aoo.inimigoId, PROPRIA, { ataqueDeOportunidade: true });
      if (s.erro) {
        /* Erro nomeado = nada foi aplicado (regra de ouro): a
           Reacção NÃO se consome e o jogador ouve que algo falhou
           (achados 1 dos Críticos 1 e 3: nada de silêncio). */
        supRegistar('bloqueada', { acao: 'ataque', actor: aoo.inimigoId, razao: s.erro.codigo });
        frases.push('Um golpe de oportunidade não se resolveu.');
        continue;
      }
      ESTADO_VLAB[aoo.inimigoId].reacaoDisponivel = false;   // a Reacção consome-se só com a resolução feita
      const nome = `<b>${nomeCena(aoo.inimigoId)}</b>`;
      if (s.resultado === 'acerta' || s.resultado === 'critico') {
        mostrarImpacto(PROPRIA);
        supRegistar('accao', { acao: 'ataque', actor: aoo.inimigoId, alvo: PROPRIA, acerto: true, dano: s.totalEfectivo, oportunidade: true });
        const desfecho = vlabAplicarAlvoDepois(PROPRIA, s);
        if (desfecho === 'falhaDeMorte') {
          /* Espelho do ramo da IA: a falha por golpe regista-se e
             narra-se como agravamento, sem anunciar outra queda.
             (Inalcançável em jogo hoje: caída, ela não se move —
             fica o ramo coerente para o dia em que o for.) */
          const em = ESTADO_VLAB.ong.estadoMorte;
          supRegistar('accao', { acao: 'falha-de-morte-por-golpe', actor: aoo.inimigoId, alvo: PROPRIA, oportunidade: true,
            sucessos: em ? em.sucessos : null, falhas: em ? em.falhas : null });
          frases.push(`${nome} golpeia-a de oportunidade — ela, caída, piora visivelmente.`);
        } else {
          frases.push(`${nome} golpeia-a de oportunidade ao sair — ela perdeu <b>${s.totalEfectivo}</b> de vida.`);
        }
        if (desfecho === 'morreu') { fimDeBatalha('morte'); break; }
        if (desfecho === 'aMorrer') { entrarAMorrer(); break; }
      } else if (s.resultado === 'falhaCritica') {
        const fcProp = s.soDoMestre && s.soDoMestre.falhaCritica;
        if (MODO_MESTRE && fcProp && fcProp.requerConfirmacao) {
          /* M2 — O PARQUE DA OPORTUNIDADE (§4.2): o ciclo estaciona
             NESTE ponto, com ela já no destino e as contas do
             movimento fechadas; o mundo espera pela guarda única
             (§3.3) e pela recusa de captura (§3.6). Ao estacionar:
             zero eventos, zero frases — a frase composta continua
             única e só é dita no fim, pelo chamador. Um cartão de
             cada vez: o ciclo é a fila (§6). */
          const estadoPreParque = estado;
          const pendente = { origem: 'oportunidade', atacanteId: aoo.inimigoId,
            seq: seqTurno, supEpoca, semente: sementeDG, verificacao: verificacaoDG,
            recibo: s, proposta: fcProp.desgraca.id, escolhaMarcada: undefined, assentador: null };
          desgracaMonstroPendente = pendente;
          estado = 'desgraca-lista'; renderAcoes();
          const desfecho = await new Promise(resolver => { pendente.assentador = resolver; });
          /* Re-conferência dentro do ciclo (E-C1.4): época morta
             (restauro/gelo/fim entretanto) aborta o CICLO INTEIRO
             com sinal de aborto — golpes por resolver não se
             resolvem numa linha do tempo abandonada, e o chamador
             lê o sinal e cala (§4.2, guarda E-C1.7). */
          if (!desfecho || desfecho.morta || batalhaFim || supCongelado || supEpoca !== pendente.supEpoca)
            return { frase: null, abortada: true };
          const escolha = desfecho.escolha;
          estado = estadoPreParque; renderAcoes();
          if (escolha === 'nada') {
            /* «Não acontece nada»: SEM segunda chamada (efeito
               zero estrutural, §3.1) — a frase é a da falha
               simples e o ataque regista-se sem desgraça. */
            supRegistar('accao', { acao: 'ataque', actor: aoo.inimigoId, alvo: PROPRIA, acerto: false, oportunidade: true, falhaCritica: null });
            supRegistar('accao', { acao: 'desgraca-escolha', actor: aoo.inimigoId, proposta: pendente.proposta, escolha: 'nada' });
            frases.push(`${nome} tenta golpeá-la de oportunidade e falha. ` +
              vlabFraseDesgraca(aoo.inimigoId, null));
          } else {
            /* Segunda chamada com a semente DESTE golpe e a
               confirmação da proposta DESTE golpe — a decisão
               aplica-se ao facto que aconteceu, nunca a outro. */
            const s2 = vlabResolverAtaqueCompleto(aoo.inimigoId, PROPRIA, { ataqueDeOportunidade: true,
              modoDesgraca: 'escolha', semente: pendente.semente, verificacao: pendente.verificacao,
              desgracaEscolhida: escolha, confirmacaoDeProposta: { proposta: pendente.proposta } });
            if (s2.erro) {
              /* Aborto nomeado (§3.1): a decisão era válida mas a
                 resolução morreu — regista-se o bloqueio e a frase
                 composta leva só a linha de falha deste golpe,
                 SEM frase de desgraça: nenhuma aconteceu, e «O
                 golpe correu mal.» afirmaria um «nada» que ninguém
                 decidiu. O ciclo continua para o golpe seguinte. */
              supRegistar('bloqueada', { acao: 'ataque', actor: aoo.inimigoId, razao: s2.erro.codigo });
              frases.push(`${nome} tenta golpeá-la de oportunidade e falha.`);
            } else {
              const fc = vlabAplicarAtacanteDepois(aoo.inimigoId, s2);
              supRegistar('accao', { acao: 'ataque', actor: aoo.inimigoId, alvo: PROPRIA, acerto: false, oportunidade: true, falhaCritica: fc ? fc.desgraca.id : null });
              supRegistar('accao', { acao: 'desgraca-escolha', actor: aoo.inimigoId, proposta: pendente.proposta, escolha });
              if (s2.desgracaPendente)
                supRegistar('accao', { acao: 'desgraca-pendente', actor: aoo.inimigoId, tipo: s2.desgracaPendente.tipo, aplicada: false, motivo: 'desgraça pendente não aplicada nesta casca (sem aliados ao alcance — contexto da batalha a solo)' });
              frases.push(`${nome} tenta golpeá-la de oportunidade e falha. ` +
                vlabFraseDesgraca(aoo.inimigoId, fc));
            }
          }
        } else {
          const fc = vlabAplicarAtacanteDepois(aoo.inimigoId, s);
          supRegistar('accao', { acao: 'ataque', actor: aoo.inimigoId, alvo: PROPRIA, acerto: false, oportunidade: true, falhaCritica: fc ? fc.desgraca.id : null });
          frases.push(`${nome} tenta golpeá-la de oportunidade e falha. ` +
            vlabFraseDesgraca(aoo.inimigoId, (s.soDoMestre || {}).falhaCritica));
        }
      } else {
        supRegistar('accao', { acao: 'ataque', actor: aoo.inimigoId, alvo: PROPRIA, acerto: false, oportunidade: true });
        frases.push(`${nome} tenta golpeá-la de oportunidade e falha.`);
      }
      if (batalhaFim) break;
    }
    return { frase: frases.length ? frases.join(' ') : null, abortada: false };
  }

  /* ---------- estado da casca ---------- */
  let selecionada = PROPRIA;   // constante nesta vista: a figura activa é sempre a Ong
  let alvo = null;              // última figura não-própria tocada (ou nenhuma)
  let atacou = false;           // uso de atacar da vez dela (atacar ×1; a Transformação também o consome)
  let ataquePendente = null;    // rolagem dela entre o clique e o Confirmar (T1.4 §1: o resultado NÃO se revela antes)
  /* J1 (carta IBX-213): existe uma ROLAGEM POR RESOLVER quando o
     pendente é um golpe já rolado — o resultado nasceu no clique
     (ataque-basico) e espera o Confirmar. Enquanto ela existir,
     nenhuma das três portas de saída a deita fora (Voltar, toque
     nas figuras, chip): a rolagem fica até ao Confirmar. A
     Transformação pendente NÃO é uma rolagem (nenhum resultado
     foi rolado ao declará-la) e fica fora desta protecção:
     desistir dela antes do Confirmar continua a ser o fluxo
     legítimo de cancelar uma declaração. */
  const rolagemPorResolver = () => !!(ataquePendente && ataquePendente.tipo === 'chicote');
  const FRASE_ROLAGEM_PENDENTE = 'A rolagem já saiu — aperte <b>Confirmar</b> para resolver o golpe.';
  let apresentacaoEmCurso = false;   // T-D: uma apresentação de confronto da cena está a decorrer (o fluxo espera por ela)
  let continuarAposApresentacao = false;   // T-D: um «Continuar» premido durante o gesto executa-se quando ele fecha
  /* T-D/R1: o contador de ataques COM apresentação já NÃO vive aqui:
     passou para dentro do acumulador do Crítico (acc.ataquesComApresentacao,
     junto de acc.ataquesTotais) — os dois contadores da medida
     «ataque-sem-gesto» nascem e morrem juntos, no mesmo segmento
     (correcção R1 do julgamento de Fidelidade da T-D: antes eram
     universos diferentes e o 0 saía do clamp, não da contagem). */
  let campoPronto = false, falhaArranque = '', falhaDefinitiva = false;
  let estado = 'base';        // base | atacar | consumivel | mover | movendo | rolagem | resultado | vez-ia | confirmar-fim | fim
  /* Máquina de turnos (T1.3): a vez roda por ORDEM. vezAtual,
     indiceVez e rodada só mudam em passarVez()/iniciarVezIA() e no
     arranque — nenhum outro caminho os escreve. */
  let ordem = ORDEM, indiceVez = 0, vezAtual = PROPRIA, seqTurno = 0, rodada = 1;
  let batalhaFim = false;       // trava do fim de batalha (só a queda dela, §1.7 do desenho T1.3)
  let danoSofrido = 0;          // vida perdida acumulada DELA — nasce a 0; a ficha e o chip lêem daqui
  let paGasto = 0;              // PA gasto por ela em tempo de corrida — só a Transformação o escreve
  let transformada = false;     // snapshot da Transformação aplicado (expressão 8d6+34, CA 36 na forma transformada)
  let reservaMovimento = DESLOCAMENTO_ONG_M;   // metros que ela ainda pode andar NESTA vez
  let custoPendente = null;     // casas do caminho por toque, a descontar no moveend dela
  let caminhoPendente = null;   // o path (motor) desse caminho — custo do Parar pelas casas andadas (D-13.15)
  let passoEmCurso = false;     // um passo de seta está a animar (pressões novas ignoram-se)
  /* Tranche ESCALA: o preço da casa captura-se no DESPACHO do
     movimento (custoPendentePreco / passoPreco) — o débito do
     moveend cobra o preço de quando o movimento começou, nunca o
     de uma escala mudada a meio da animação. Só se lêem com o
     respectivo pendente vivo, e cada despacho os escreve. */
  let custoPendentePreco = null;
  let passoPreco = null;
  let contextoIA = null;        // { id, seq, relogio, destino? } do movimento/ataque da IA em voo — consumo único (G-13.3(d)); destino só no movimento (E-1)
  let guardaExpiradaIA = null;  // M-009: { id, seq } da última guarda de 5 s expirada cuja figura ainda vem a caminho — a chegada tardia dela diz-se, não se engole em silêncio
  /* Reserva de destino em voo (tranche do congelamento «Duas figuras
     na mesma casa»): id do monstro → { x, y } do destino que ele já
     escolheu e para onde ainda anda. É a metade que faltava ao
     contextoIA: o contexto consome-se quando a vez fecha (pontual ou
     pela guarda de 5 s), mas a figura continua em voo — e é nesse
     intervalo que o monstro seguinte escolhia sobre a fotografia a
     meio do trânsito e os dois acabavam na mesma casa. A reserva
     nasce no despacho (vezDaIA), é lida por calcularAlcancePara
     (a casa reservada de outra figura conta como ocupada) e morre
     só na chegada dessa figura (o moveend tardio incluído), na
     recusa da cena, ou quando o mundo é substituído/termina
     (restauro, saves, congelamento, fim de batalha). Uma reserva
     por figura: um despacho novo da mesma figura sobrescreve a
     anterior. Estado transitório de voo: nunca entra em snapshots
     nem em saves. */
  const reservasDestinoIA = new Map();
  let vezIASemMovimento = false; // T-J7: a vez da IA que se abre com um levantar — o movimento desta vez já está gasto (espelho da reservaMovimento = 0 da Ong em iniciarVez)
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
  /* EM-TJ12J13-01: carimbo do voo de monstro que ATRAVESSA o
     restauro ({ id, seq } do voo seguido nesse instante — contextoIA
     com destino, senão a marca de guarda expirada), ou null. O ramo
     de monstro do moveend só reafirma chegadas DESTE voo: sem
     carimbo, nenhuma chegada pós-restauro é devolvida. Estado
     transitório de voo, como as reservas: nunca entra em snapshots
     nem em saves, e nasce/morre sempre com o pendente. */
  let supRestauroVoo = null;
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
  function say(html) {
    if (!campoPronto) { msgTxt.textContent = falhaArranque || 'A preparar o campo…'; return; }
    msgTxt.innerHTML = html;
  }

  /* ---------- faixa: os estados trocam o miolo, nunca o tamanho ---------- */
  const B = (acao, glifo, rotulo, cls) =>
    `<button type="button" class="btn ${cls || ''}" data-acao="${acao}">` +
    (glifo ? `<span class="gi">${glifo}</span>` : '') +
    `<span class="gl">${rotulo}</span></button>`;
  /* ---------- cartão da desgraça (T-DESGRACA-NADA) ----------
   * Palavra do Mestre (desempate de 09/11/2026, que reforça a Q5):
   * ao recusar uma desgraça proposta, abre a LISTA COMPLETA para
   * ele escolher outra — e a lista inclui «Não acontece nada»,
   * opção SÓ dele: não é linha da tabela 1d100, não tem peso, o
   * acaso nunca a dá e a IA/H10 nunca a escolhe. Os pesos, o
   * sorteio e a renormalização vivem só no motor (vlab-completo);
   * aqui mora a decisão. */
  /* Rótulos da tabela por id (os nomes do motor): a casca usa-os
     só para apresentar as excluídas no cartão — o recibo da
     proposta traz nome para as aplicáveis, mas das excluídas traz
     só id e motivo. Apresentação apenas, como vlabFraseDesgraca. */
  const DESGRACA_NOMES = { 'cai': 'Ele cai', 'arma-cai': 'A arma cai',
    'acerta-amigo': 'Acerta um amigo sem querer', 'acerta-se': 'Acerta-se a si próprio',
    'arma-quebra': 'A arma quebra', 'quebra-corpo': 'Quebra parte do corpo' };
  /* A proposta de desgraça pendente (H10), se a houver: a rolagem
     DELA rolou em modo «proposta» e espera a decisão do Mestre. */
  function desgracaPropostaPendente() {
    if (!ataquePendente || ataquePendente.tipo !== 'chicote') return null;
    const fc = ataquePendente.vlab && ataquePendente.vlab.soDoMestre
      && ataquePendente.vlab.soDoMestre.falhaCritica;
    return (fc && fc.requerConfirmacao) ? fc : null;
  }
  /* ---------- portão das desgraças dos monstros (M1) ----------
   * Desenho LAVRADO com bancada: DESENHO.md desta tranche (§3).
   * A falha crítica de um monstro, na vista do Mestre, ESTACIONA
   * dentro de atacarIA: a rolagem corre em modo «proposta» (o
   * motor não aplica nada) e a decisão é dele, no mesmo cartão da
   * lista — aprova a proposta, troca da lista ou «Não acontece
   * nada», com marcar + «Aplicar» (escolher e autorizar são dois
   * actos, H10). Sem MODO_MESTRE não há parque: atacarIA corre em
   * «sorte», exactamente como antes — a Party nunca fica refém de
   * um cartão que não pode ver nem decidir. */
  let desgracaMonstroPendente = null;
  /* O assentador ÚNICO do pendente do monstro: a promessa de
     atacarIA resolve-se por esta porta e por mais nenhuma — a
     decisão dele ({ escolha }) ou um cancelador ({ morta: true }:
     aplicar um save, supRestaurar, o gelo, os fechos defensivos
     de fim de batalha — §3.5 do desenho). Idempotente: assentar
     duas vezes é assentar uma; e o pendente limpa-se ANTES de
     resolver, para uma decisão tardia sobre um pendente já morto
     ser inerte. */
  function fecharDesgracaMonstro(resultado) {
    const p = desgracaMonstroPendente;
    if (!p) return;
    desgracaMonstroPendente = null;
    if (p.assentador) p.assentador(resultado || { morta: true });
  }
  /* A guarda única de «decisão por resolver» (§3.3 do desenho):
     gémea de rolagemPorResolver(), mas sobre QUALQUER pendente de
     desgraça — o dela (a rolagem) ou o do monstro (o parque).
     Enquanto durar, nenhum caminho escreve estado nem
     ataquePendente: os guardas de toque tratam 'desgraca-lista'
     como estado cancelável (medido pela bancada) e, sem esta
     guarda, um toque a meio de um parque desfazia o estado por
     baixo da resolução estacionada. */
  const decisaoPorResolver = () =>
    rolagemPorResolver() || desgracaMonstroPendente != null;
  const FRASE_DECISAO_PENDENTE = 'A desgraça está por decidir — escolha no cartão.';
  const dgCartaoEl = $('desgraca-cartao'), dgPropostaEl = $('dg-proposta'), dgOpcoesEl = $('dg-opcoes');
  /* A fonte ÚNICA do cartão (M1, §3.2 do desenho): o pendente
     dela (a rolagem em 'desgraca-lista' dela) OU o pendente do
     monstro (o parque) — nunca os dois ao mesmo tempo: o dela
     vive só na vez dela em 'rolagem', o do monstro só na vez da
     IA, estados mutuamente exclusivos (invariante provada na
     construção). Devolve { origem, fc, pendente? } ou null. */
  function fonteCartaoDesgraca() {
    if (estado !== 'desgraca-lista') return null;
    const dela = desgracaPropostaPendente();
    if (dela) return { origem: 'dela', fc: dela };
    if (desgracaMonstroPendente) {
      const fc = desgracaMonstroPendente.recibo
        && desgracaMonstroPendente.recibo.soDoMestre
        && desgracaMonstroPendente.recibo.soDoMestre.falhaCritica;
      if (fc) return { origem: desgracaMonstroPendente.origem, fc, pendente: desgracaMonstroPendente };
    }
    return null;
  }
  /* A visibilidade do cartão deriva do estado, sincronizada em
     renderAcoes: visível só em 'desgraca-lista' — nenhum caminho
     (restauro, gelo, toque numa figura) o deixa órfão no ecrã. */
  function sincronizarCartaoDesgraca() {
    /* E1 (bancada): superfície SÓ do Mestre — sem MODO_MESTRE o
       cartão nunca é preenchido nem desescondido (padrão da casa:
       na Party a superfície do Mestre não se constrói). */
    if (!MODO_MESTRE) return;
    if (!dgCartaoEl) return;
    const fonte = fonteCartaoDesgraca();
    if (!fonte) {
      /* DÍVIDA 2 (t-dividas-vivo): fechar também LIMPA o cartão —
         opções e proposta saem do DOM. Sem isto os botões data-dg
         ficavam no DOM para sempre com o cartão escondido (sondas
         por existência liam «aberto» eternamente, e botões
         invisíveis presentes são uma armadilha). Limpar é seguro:
         quem reabre repinta tudo (proposta + opções) mais abaixo
         nesta função, nos dois modos (dela e monstro). */
      dgOpcoesEl.innerHTML = '';
      dgPropostaEl.innerHTML = '';
      dgCartaoEl.hidden = true; return;
    }
    const fc = fonte.fc;
    const doMonstro = fonte.origem !== 'dela';
    const marcada = doMonstro ? fonte.pendente.escolhaMarcada : undefined;
    let html = '';
    for (const l of fc.tabelaEfectiva || [])
      html += `<button type="button" class="btn${marcada === l.id ? ' marcada' : ''}" data-dg="${l.id}"><span class="gl">${l.nome}</span></button>`;
    for (const x of fc.excluidas || [])
      html += `<button type="button" class="btn" data-dg="${x.id}" disabled><span class="gl">${DESGRACA_NOMES[x.id] || x.id}</span></button>`
        + `<p class="dg-motivo">${x.motivo}</p>`;
    html += `<button type="button" class="btn ghost${marcada === 'nada' ? ' marcada' : ''}" data-dg="nada"><span class="gl">Não acontece nada</span></button>`;
    if (!doMonstro) {
      dgPropostaEl.innerHTML = `A proposta é <b>${fc.desgraca.nome}</b>. Escolha a desgraça que acontece — ou nenhuma.`;
      html += `<button type="button" class="btn ghost" data-dg-voltar><span class="gl">← Voltar</span></button>`;
    } else {
      /* Modo «monstro» (§3.2 do desenho): a lista abre DIRECTA no
         parque — não há gesto anterior a preservar —, com a linha
         de enquadramento da origem (a segunda frase é a da casa,
         a do cartão dela). Marcar + «Aplicar» são dois actos
         (H10): tocar numa opção marca-a e mostra a escolha; o
         «Aplicar» regista e assenta a promessa. O «← Voltar»
         NÃO existe neste modo: não há rolagem para trás. */
      const p = fonte.pendente;
      const verbosM = FRASES_IA[p.atacanteId] || { falha: 'tentou atacar' };
      /* O enquadramento é por origem (§3.2): o do turno é o da
         FRASES_IA; o da oportunidade é a frase lavrada do §3.2 —
         «tentou golpeá-la de oportunidade ao sair e falhou». */
      dgPropostaEl.innerHTML = p.origem === 'oportunidade'
        ? `<b>${nomeCena(p.atacanteId)}</b> tentou golpeá-la de oportunidade ao sair e falhou. A proposta é <b>${fc.desgraca.nome}</b>. Escolha a desgraça que acontece — ou nenhuma.`
        : `<b>${nomeCena(p.atacanteId)}</b> ${verbosM.falha} a <b>Ong</b> e falhou. A proposta é <b>${fc.desgraca.nome}</b>. Escolha a desgraça que acontece — ou nenhuma.`;
      const nomeMarcada = marcada === 'nada' ? 'Não acontece nada'
        : ((fc.tabelaEfectiva || []).find(l => l.id === marcada) || {}).nome;
      if (nomeMarcada) html += `<p class="dg-escolhida">Escolhida: <b>${nomeMarcada}</b></p>`;
      html += `<button type="button" class="btn primary" data-dg-aplicar${nomeMarcada ? '' : ' disabled'}><span class="gl">Aplicar</span></button>`;
    }
    dgOpcoesEl.innerHTML = html;
    dgCartaoEl.hidden = false;
  }
  if (dgCartaoEl) dgCartaoEl.addEventListener('click', e => {
    const bv = e.target.closest('button[data-dg-voltar]');
    if (bv) { tratarAcao('desgraca-voltar'); return; }
    const ba = e.target.closest('button[data-dg-aplicar]');
    if (ba) { if (!ba.disabled) tratarAcao('desgraca-aplicar'); return; }
    const b = e.target.closest('button[data-dg]');
    if (!b || b.disabled) return;
    tratarAcao('desgraca-escolher:' + b.dataset.dg);
  });
  const retrato = () => matchMedia('(max-width:560px)').matches;
  function renderAcoes() {
    if (!campoPronto) {
      document.getElementById('faixa').dataset.estado = falhaArranque ? 'falha-carregamento' : 'carregando';
      acoesEl.classList.remove('compacta');
      acoesEl.innerHTML = !falhaArranque ? 'A preparar…'
        : falhaDefinitiva ? 'A batalha não começou.'
        : B('tentar-modelos', '↻', 'Tentar de novo', 'primary');
      return;
    }
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
        B('encerrar', '✓', rp ? 'Fim' : 'Encerrar', 'ghost') +
        B('terminar', '✕', rp ? 'Term.' : 'Terminar', 'ghost') +
        /* RAIO E FOGO, fim seco (desenho §5, proposta 1): o botão
           só existe enquanto ela está A Arder a seco — como o
           «Trocar» da desgraça, é superfície de um estado. */
        (rfPodeApagarFogo() ? B('apagar-fogo', '🧯', rp ? 'Apagar' : 'Apagar o fogo') : '');
    } else if (estado === 'atacar') {
      // A gaveta tem o básico dela (o Chicote, 8 PA desde a tranche
      // VLAB) e a única técnica com fonte nesta tranche: a
      // Transformação — os dois com o custo no rótulo.
      acoesEl.innerHTML =
        B('voltar', '←', 'Voltar', 'ghost') +
        B('ataque-basico', '⚔', `${rp ? 'Chicote' : DADOS_COMBATE.ong.arma} <span class="pa">8 PA</span>`, 'primary') +
        B('transformacao', '✦', `Transformação <span class="pa">${DADOS_COMBATE.ong.transformacao.custo} PA</span>`);
    } else if (estado === 'vez-ia') {
      // Vez de um monstro: o miolo é um TEXTO de estado, não um botão
      // (um botão que nunca responde violaria o silêncio proibido).
      acoesEl.innerHTML = 'A agir…';
    } else if (estado === 'fim') {
      acoesEl.innerHTML = B('recomecar', '↻', 'Recomeçar', 'primary');
    } else if (estado === 'confirmar-fim') {
      // M-014: a saída da batalha pede confirmação — um toque errado
      // não fecha um encontro a meio.
      acoesEl.innerHTML = B('voltar', '←', 'Voltar', 'ghost') + B('terminar-sim', '✓', 'Sim, terminar', 'primary');
    } else if (estado === 'consumivel') {
      acoesEl.innerHTML = B('voltar', '←', 'Voltar', 'ghost');
    } else if (estado === 'mover') {
      /* Tranche VLAB (Parte C do contrato): dentro do modo Mover
         vivem as duas declarações de movimento com custo — Sair com
         segurança (Desvincular) e Correr. NÃO são botões da barra
         base (a barra continua Atacar/Mover/Consumível): são opções
         do próprio modo, como o Parar do 'movendo'. */
      acoesEl.innerHTML =
        B('cancelar', '✕', 'Cancelar', 'ghost') +
        B('desvincular', '↩', opcoesMovimento.desvincular ? 'Sair c/ segurança ✓' : 'Sair c/ segurança') +
        B('correr', '»', correrUsado ? 'A correr ✓' : 'Correr');
    } else if (estado === 'a-morrer') {
      // Ela caiu e está a morrer (M3): sem acções — a corrida corre
      // na viragem das rondas. O miolo é texto de estado, não botão.
      acoesEl.innerHTML = 'A Ong está caída…';
    } else if (estado === 'movendo') {
      acoesEl.innerHTML = B('parar', '■', 'Parar', 'ghost');
    } else if (estado === 'rolagem') {
      /* T-DESGRACA-NADA: com uma proposta de desgraça à espera, a
         faixa ganha o «Trocar» — recusar a proposta abre a lista
         completa no cartão. Sem proposta, a faixa é a de sempre.
         E1 (bancada): o «Trocar» é superfície SÓ do Mestre — sem
         MODO_MESTRE nem se constrói; a faixa fica byte-igual à base. */
      acoesEl.innerHTML = B('voltar', '←', 'Voltar', 'ghost')
        + (MODO_MESTRE && desgracaPropostaPendente() ? B('trocar-desgraca', '⇄', 'Trocar') : '')
        + B('confirmar', '✓', 'Confirmar', 'primary');
    } else if (estado === 'desgraca-lista') {
      // A decisão está no cartão: a faixa mostra só o estado, como
      // na vez da IA — um botão que não responde é proibido aqui.
      acoesEl.innerHTML = 'A escolher a desgraça…';
    } else if (estado === 'resultado') {
      acoesEl.innerHTML = B('continuar', '', 'Continuar ▸', 'primary');
    }
    sincronizarCartaoDesgraca();
    atualizarContadorVD();   // C-VD: a caixa segue cada mudança de estado
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
     monstro. Todas as casas ocupadas por figuras vivas bloqueiam
     (a da Ong e as dos outros monstros): ninguém anda para cima de
     ninguém vivo. (T-J12J13: o cadáver não bloqueia — a casa dele
     é atravessável, mas nunca destino; ver o fim da função.) */
  function calcularAlcancePara(id, tetoCasas) {
    const s = view.getState();
    const u = s.units.find(v => v.id === id);
    if (!u) return new Map();
    const ocupadas = new Set(s.units.filter(v => v.id !== u.id && v.vivo !== false)
      .map(v => chave(v.posicao.x, v.posicao.y)));
    /* Reserva de destino em voo: o destino já escolhido por outra
       figura que ainda anda conta como ocupado — bloqueia caminho
       e destino, como uma figura viva pousada. É isto que fecha a
       janela entre a guarda de 5 s fechar a vez de um monstro e a
       chegada tardia dele: quem escolhe a seguir já não pode cair
       na casa que está prometida. Reserva de dono morto é fuga
       (a figura já não chega): descarta-se aqui, na leitura. */
    for (const [dono, r] of reservasDestinoIA) {
      if (dono === u.id) continue;
      const donoU = s.units.find(v => v.id === dono);
      if (!donoU || donoU.vivo === false) { reservasDestinoIA.delete(dono); continue; }
      ocupadas.add(chave(r.x, r.y));
    }
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
    /* T-J12J13: as casas dos cadáveres saem do mapa devolvido,
       como a casa de partida: atravessam-se, não se pára nelas
       (duas figuras na mesma casa continua proibido — invariante
       do Supervisor e validação dos saves). */
    for (const v of s.units)
      if (v.id !== u.id && v.vivo === false)
        vistos.delete(chave(v.posicao.x, v.posicao.y));
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
     propósito, e a diferença fica registada nas NOTAS.
     (T-J12J13: quem bloqueia é só figura viva — o cadáver entre
     os dois não inflaciona a distância de arma.) */
  function distanciaEntre(deId, paraId) {
    const s = view.getState();
    const eu = s.units.find(v => v.id === deId);
    const ele = s.units.find(v => v.id === paraId);
    if (!eu || !ele) return Infinity;
    const bloqueadas = new Set(s.units
      .filter(v => v.id !== deId && v.id !== paraId && v.vivo !== false)
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
  /* M-019: a recusa de alcance distingue os dois casos que a jogadora
     consegue separar a olho: longe nas DUAS réguas (a frase de sempre)
     e dentro do alcance pela régua que atravessa corpos
     (mapaDistancias, a da pontuação da IA) mas com o caminho tapado
     por outras figuras — o portão mede pelo caminho (distanciaEntre)
     e a frase passa a dizer porquê, nos dois sítios do portão
     (ao Atacar e na revalidação do Confirmar). */
  function fraseForaDeAlcance(alvoId, contexto) {
    const u = unidade(alvoId);
    const atraves = u ? mapaDistancias(PROPRIA).get(chave(u.posicao.x, u.posicao.y)) : undefined;
    const tapado = atraves !== undefined && atraves <= alcanceEmCasas(DADOS_COMBATE.ong.alcance);
    if (contexto === 'confirmar') {
      return tapado
        ? 'O caminho até ele está tapado por outras figuras — aproxime-se com <b>Mover</b> e tente outra vez.'
        : 'O alvo está longe demais — aproxime-se com <b>Mover</b> e tente outra vez.';
    }
    return tapado
      ? `<b>${nomeCena(alvoId)}</b> — o caminho até ele está tapado por outras figuras — aproxime-se com <b>Mover</b> antes de atacar.`
      : `<b>${nomeCena(alvoId)}</b> está longe demais — aproxime-se com <b>Mover</b> antes de atacar.`;
  }

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
    /* Desde a tranche VLAB as parcelas são as do DMG (uma por tipo
       de dano) + o total por cima: o desfasamento e a dispersão apertam para a sequência
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
    const projecoes = new Map(); // Cache só deste frame, inclusive resultados nulos.
    for (let i = flutuantes.length - 1; i >= 0; i--) {
      const f = flutuantes[i];
      const t = agora - f.t0 - f.atraso;
      if (t < 0) continue;
      const prog = t / f.dur;
      if (prog >= 1) { f.el.remove(); flutuantes.splice(i, 1); continue; }
      if (!projecoes.has(f.id)) projecoes.set(f.id, view.projectUnit(f.id));
      const r = projecoes.get(f.id);
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
    return `A mover <b>Ong</b> · restam <b>${fmtM(reservaMovimento)}</b> — toque numa casa acesa ou ande pelas <b>setas do teclado</b>, casa a casa. As setas seguem o mapa.`;
  }
  function entrarMover() {
    const u = unidade(selecionada);
    if (!u) return;
    if (estado === 'movendo' || view.getState().moving) { say('Espere — a figura ainda está a andar.'); return; }
    if (reservaMovimento < CASA_M) {
      say(`A <b>Ong</b> andou o que podia andar nesta vez — aperte <b>Atacar</b> ou <b>Encerrar</b>.`);
      return;
    }
    alcance = calcularAlcance();
    estado = 'mover';
    desenharAlcance();
    renderAcoes();
    say(fraseRestante());
  }
  function sairMover() {
    opcoesMovimento.desvincular = false;   // pós-Crítico 3 (achado 6): a intenção de Desvincular não sobrevive à saída do modo Mover
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
    say(`A <b>Ong</b> andou o que podia andar nesta vez — aperte <b>Atacar</b> ou <b>Encerrar</b>.`);
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
    passoPreco = CASA_M;   // ESCALA: preço capturado no despacho do passo
    vlabCapturarPartida([{ x: u.posicao.x, y: u.posicao.y }, { x: nx, y: ny }]);   // tranche VLAB: adjacências à partida + meio do caminho
    supPartidaMovimentoOng({ x: nx, y: ny }, 1,
      [{ x: u.posicao.x, y: u.posicao.y }, { x: nx, y: ny }]);   // T1.7: caminho da seta = [actual, seguinte]
    view.move(PROPRIA, casaVista({ x: nx, y: ny }), {
      path: [casaVista({ x: nx, y: ny })], durationMs: ritmo(200)
    });
  }

  /* ---------- máquina de turnos (T1.3 §1) ---------- */
  const aguardar = ms => new Promise(res => setTimeout(res, ritmo(ms)));
  /* FUSÃO T-D: esquiva — função transplantada da casca-td (obra T-D
     §1.3): no máximo UMA por rodada por figura da IA (regra de
     sequência Q4); o alvo é quem se esquiva do golpe falhado. A cena
     sagrada do vivo NÃO expõe apresentarEsquiva: a chamada lança e o
     catch degrada em silêncio — a falha fica exactamente como estava
     no vivo. O orçamento (esquivaGasta) é estado de apresentação,
     nunca de mecânica: nenhum resultado muda com ou sem gesto. */
  const esquivaGasta = { rodada: 0, porMonstro: new Set() };
  function tentarEsquiva(monstro, alvo) {
    if (esquivaGasta.rodada !== rodada) { esquivaGasta.rodada = rodada; esquivaGasta.porMonstro.clear(); }
    if (esquivaGasta.porMonstro.has(monstro)) return;
    esquivaGasta.porMonstro.add(monstro);
    try {
      const p = view.apresentarEsquiva(monstro, alvo);
      if (p && p.catch) p.catch(() => {});
    } catch (_) { /* sem clipe de esquiva: a falha fica como estava */ }
  }
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
     Apresentações disparadas fora da casca (consola)
     nunca passam por aqui: não contam em
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
    fecharCfg();   // AMBIENTE: o painel ⚙ fecha-se sozinho ao arrancar uma apresentação de combate
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
      ? 'A batalha acabou — aperte <b>Recomeçar</b>.'
      : `É a vez de <b>${nomeCena(vezAtual)}</b> — espere que ele aja.`);
  }
  function iniciarVez(id) {
    vezAtual = id;
    atacou = false;
    /* C-39: a declaração de reacção é da ronda — ao abrir a vez
       dela, a declaração por usar expira e a Reacção renova
       (espelho da renovação das outras figuras em iniciarVezIA:
       «a Reacção renova na vez da própria figura»). */
    delete REACCOES_DECLARADAS[PROPRIA];
    ESTADO_VLAB.ong.reacaoDisponivel = true;
    /* Tranche VLAB: a reserva nasce da base efectiva (Regra 7 —
       Fraca anda metade; corpo partido, metade). Levantar-se do
       Caído (desgraça de falha crítica) gasta o movimento da vez. */
    correrUsado = false;
    opcoesMovimento.desvincular = false;
    avisoInicioVez = null;
    reservaMovimento = vlabDeslocBaseOng();   // a reserva nasce cheia, não acumula
    if (ESTADO_VLAB.ong.estados.includes('caido')) {
      ESTADO_VLAB.ong.estados = ESTADO_VLAB.ong.estados.filter(e => e !== 'caido');
      reservaMovimento = 0;
      avisoInicioVez = 'A <b>Ong</b> levanta-se — isso gasta o movimento desta vez.';
    }
    ataquePendente = null;
    estado = 'base';
    atualizarVez(); renderAcoes();
    autoJaMoveu = false;              // T1.5: a vez nova repõe o movimento automático
    autoAtaqueEmCurso = false;
    autoAtaqueRecusado = false;       // D-REC-01: a recusa é por vez — a vez nova limpa-a
    if (id === PROPRIA) agendarPassoAuto();   // T1.5: hook do Modo automático (desligado, não agenda)
    supSnapshot();                    // Supervisor: ponto de retorno deste turno
  }
  /* Único sítio onde a vez muda (com iniciarVezIA e o arranque). */
  /* A01: avança a rotação até à próxima figura COM vez — a Ong
     (a vez dela trata-se nos ramos próprios, incl. aMorrer) ou um
     monstro vivo. Monstro fora de combate não tem vez: não anda,
     não ataca, não reage. Devolve false se a rotação se esgotou
     em figuras mortas (inalcançável em batalha aberta: com os
     três mortos, o terminal de vitória já fechou a batalha). */
  function avancarParaFiguraComVez() {
    for (let n = 0; n < ordem.length; n++) {
      indiceVez = (indiceVez + 1) % ordem.length;
      if (indiceVez === 0) rodada++;
      const id = ordem[indiceVez];
      if (id === PROPRIA || (unidade(id) || {}).vivo !== false) return true;
    }
    return false;
  }
  function passarVez() {
    try { supCritAntesDePassarVez(); } catch (_) { supCritErrosCamada++; }   // T1.7: fecha a vez nos acumuladores (passivo)
    seqTurno++;                       // invalida qualquer sequência antiga
    avancarParaFiguraComVez();
    /* RAIO E FOGO (desenho 05/11): a viragem da ronda abre com o
       momento de ambiente, ANTES da primeira vez dela. O momento
       pode deitar a figura seguinte (impacto/tick não há aqui —
       impacto): a rotação avança até uma figura viva. */
    ambMomentoSeNovaRodada();
    if (batalhaFim) return;
    while (ordem[indiceVez] !== PROPRIA && (unidade(ordem[indiceVez]) || {}).vivo === false) {
      if (!avancarParaFiguraComVez()) return;
      ambMomentoSeNovaRodada();
      if (batalhaFim) return;
    }
    ataquePendente = null;
    const seguinte = ordem[indiceVez];
    if (seguinte === PROPRIA) {
      /* RAIO E FOGO: o tick dela corre na abertura da vez dela,
         antes de qualquer leitura de estado — pode incendiá-la,
         feri-la ou deitá-la; os ramos abaixo lêem o resultado
         (aMorrer/estabilizado/normal). */
      if (!ESTADO_VLAB.ong.estadoMorte) ambTickInicioTurno(PROPRIA);
      if (batalhaFim) return;
      const fraseAmbPV = rfTomarFrasePendente();
      /* Testes de morte (M3): a viragem da ronda é o relógio da
         corrida — com ela aMorrer, a «vez» dela é o teste da ronda,
         não uma acção; resolvido o teste, a vez passa ao seguinte. */
      if (ESTADO_VLAB.ong.estadoMorte && ESTADO_VLAB.ong.estadoMorte.fase === 'aMorrer') {
        const fraseMorte = vlabRelogioMorte();
        if (batalhaFim) return;
        /* A01: também aqui a vez seguinte é a do próximo monstro
           VIVO — um morto não abre vez nem com ela aMorrer. */
        avancarParaFiguraComVez();
        if (ordem[indiceVez] === PROPRIA) return;   // sem monstro vivo com vez (defensivo; o terminal trata)
        iniciarVezIA(ordem[indiceVez], true);
        if (fraseMorte) say(fraseAmbPV + fraseMorte + ` Vez de <b>${nomeCena(ordem[indiceVez])}</b>.`);
        return;
      }
      if (ESTADO_VLAB.ong.estadoMorte && ESTADO_VLAB.ong.estadoMorte.fase === 'estabilizado') {
        /* Q4: estabilizada, a vez dela SALTA — continua caída com
           1 de Vida, sem agir e sem testes de morte, até uma cura
           a levantar (a marca sai no consumo da cura,
           vlabAplicarCuraDepois). A vez passa ao próximo monstro
           vivo, pelo mesmo caminho do ramo da corrida de morte. */
        avancarParaFiguraComVez();
        if (ordem[indiceVez] === PROPRIA) return;   // sem monstro vivo com vez (defensivo; o terminal trata)
        iniciarVezIA(ordem[indiceVez], true);
        say(fraseAmbPV + `A <b>Ong</b> continua caída — estabilizou, mas só uma cura a levanta. Vez de <b>${nomeCena(ordem[indiceVez])}</b>.`);
        return;
      }
      iniciarVez(PROPRIA);
      say(fraseAmbPV + (avisoInicioVez
        ? `${avisoInicioVez} É a vez da <b>Ong</b> (rodada ${rodada}).`
        : `É a vez da <b>Ong</b> (rodada ${rodada}).`));
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
    ESTADO_VLAB[id].reacaoDisponivel = true;   // a Reacção renova na vez da própria figura
    delete REACCOES_DECLARADAS[id];            // C-39: declaração por usar expira ao abrir a vez da figura (espelho de iniciarVez)
    /* RAIO E FOGO (desenho 05/11): o tick corre na abertura da vez
       dele; se o fogo o deitar, a vez não acontece — fecha-se como
       um fim de vez sem acção. */
    if (ambTickInicioTurno(id) === 'caiu') {
      if (batalhaFim) return;
      const minhaSeq = ++seqTurno;
      fimDaVezIA(minhaSeq);
      return;
    }
    /* T-J7: o monstro caído levanta-se ao abrir a vez dele — espelho
       do levantar da Ong em iniciarVez (retira 'caido', gasta o
       movimento da vez, anuncia-se). A acção mantém-se, como a dela. */
    vezIASemMovimento = false;
    if ((ESTADO_VLAB[id].estados || []).includes('caido')) {
      ESTADO_VLAB[id].estados = ESTADO_VLAB[id].estados.filter(e => e !== 'caido');
      vezIASemMovimento = true;
    }
    if (fichaAberta) fecharFicha();          // D-13.12: a vez dele apresenta-se em ecrã limpo
    atualizarVez(); renderAcoes();
    const fraseLevantar = vezIASemMovimento
      ? ` <b>${nomeCena(id)}</b> levanta-se — isso gasta o movimento desta vez.` : '';
    say(rfTomarFrasePendente() + (aposOng
      ? `Vez da <b>Ong</b> encerrada — a batalha continua. Vez de <b>${nomeCena(id)}</b>.${fraseLevantar}`
      : `Vez de <b>${nomeCena(id)}</b>.${fraseLevantar}`));
    supSnapshot();                    // Supervisor: ponto de retorno deste turno
    const minhaSeq = ++seqTurno;
    aguardar(ESPERA_ANUNCIO_MS).then(() => {
      if (seqTurno !== minhaSeq || batalhaFim) return;   // vez morta: silêncio
      vezDaIA(id, minhaSeq);
    });
  }
  function vezDaIA(id, seq) {
    if (distanciaEntre(id, PROPRIA) <= alcanceEmCasas(DADOS_COMBATE[id].alcance)) {
      agendarAtaqueIA(id, seq);              // já ao alcance: não anda, ataca
      return;
    }
    if (vezIASemMovimento) {
      /* T-J7: levantou-se agora mesmo — o movimento desta vez já
         está gasto; fica onde está e a vez fecha sem andar. */
      say(`<b>${nomeCena(id)}</b> fica onde está — levantou-se agora mesmo.`);
      fimDaVezIA(seq);
      return;
    }
    const destino = escolherDestinoIA(id);
    if (!destino) {
      say(`<b>${nomeCena(id)}</b> não consegue aproximar-se.`);
      fimDaVezIA(seq);
      return;
    }
    /* Supervisor: o destino da IA tem de caber na reserva dela
       (a efectiva, já reduzida — orcamentoIA). */
    if (destino.passos > orcamentoIA(id)) {
      supRegistar('bloqueada', { acao: 'mover', actor: id, razao: 'Destino além da reserva do monstro' });
      fimDaVezIA(seq);
      return;
    }
    guardaExpiradaIA = null;   // M-009: movimento novo desta figura — a marca de expiração anterior já não descreve nada em voo
    contextoIA = { id, seq, destino: { x: destino.x, y: destino.y }, relogio: setTimeout(() => relogioIA(id, seq), GUARDA_IA_MS) };
    /* Reserva de destino em voo: nasce com o despacho e NÃO morre
       com o contexto — sobrevive à guarda de 5 s, até esta figura
       de facto pousar neste destino (ver o tratador de moveend). */
    reservasDestinoIA.set(id, { x: destino.x, y: destino.y });
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
      reservasDestinoIA.delete(id);   // a figura não vai a lado nenhum: a reserva morre com a recusa
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
    // G-13.3(b): o moveend não veio em 5 s — a vez fecha para nunca
    // ficar presa. M-009: a frase antiga («não conseguiu andar»)
    // era FALSA — a animação continua e a figura chega na mesma; o
    // que a guarda faz é fechar a VEZ (e com ela o ataque), não
    // parar a figura. A frase passa a dizer exactamente isso, e a
    // expiração fica marcada: quando o moveend tardio chegar, a
    // chegada nomeia-se (ver o tratador de moveend). A guarda em si
    // (5 s fixos, GUARDA_IA_MS) NÃO foi redesenhada nesta correcção.
    const ctx = consumirContextoIA(id);
    if (!ctx || ctx.seq !== seq || seqTurno !== seq || batalhaFim) return;
    guardaExpiradaIA = { id, seq };
    say(`<b>${nomeCena(id)}</b> demorou a chegar — a vez dele terminou sem atacar.`);
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
  /* T-J8 (IBX-212 item 8): o orçamento EFECTIVO da IA — a reserva
     do monstro reduzida pelas mesmas metades que já governam o
     deslocamento dela (vlabDeslocBaseOng): Fraco (Regra 7, derivado
     em vlabEstadosDe da Vida interna dele) corta a metade; corpo
     partido (deslocMetade, da quebra-corpo) corta a metade; as
     duas metades acumulam, como nas dela. Em casas a metade é o
     piso da divisão (7→3, 6→3, 9→4); com as reservas vigentes o
     mínimo possível é 1 — o enfraquecido anda menos, nunca fica
     colado por esta regra. Os dois leitores de ORCAMENTOS (a BFS
     de escolherDestinoIA e a guarda do Supervisor em vezDaIA)
     lêem este valor, para nunca discordarem. */
  function orcamentoIA(id) {
    let o = ORCAMENTOS[id] || 4;
    if (vlabEstadosDe(id).includes('fraco')) o = Math.floor(o / 2);
    if (ESTADO_VLAB[id].deslocMetade) o = Math.floor(o / 2);
    return o;
  }
  function escolherDestinoIA(id) {
    const eu = unidade(id);
    if (!eu) return null;
    const distOng = mapaDistancias(PROPRIA);
    const distActual = distOng.get(chave(eu.posicao.x, eu.posicao.y));
    let melhor = null;
    for (const c of calcularAlcancePara(id, orcamentoIA(id)).values()) {
      const d = distOng.get(chave(c.x, c.y));
      if (d === undefined) continue;
      if (!melhor || d < melhor.d || (d === melhor.d && c.passos < melhor.destino.passos))
        melhor = { d, destino: c };
      if (melhor.d <= alcanceEmCasas(DADOS_COMBATE[id].alcance)) break;   // 1 casa é o mínimo possível: a casa dela está ocupada
    }
    if (!melhor) return null;
    if (distActual !== undefined && melhor.d >= distActual) return null;
    return melhor.destino;
  }
  /* O ataque da IA (§2.3; desde a tranche VLAB resolve o motor
     pinado, pelo adaptador): o teste e o dano rolam-se DENTRO do
     motor — o teste é a expressão da ficha do monstro e o
     limiar é a CA da ficha dela (vlabFichaAlvoDela); o dano
     vem do DMG e aplica-se à Vida dela
     pelo soDoMestre do motor (vlabAplicarAlvoDepois escreve
     danoSofrido — a ficha e a barra do chip lêem daí, como antes).
     Mostra-se apenas o resultado narrado e, no acerto, o total que
     ELA perdeu (fronteira EM-P3: agregado por monstro é proibido).
     Sem flutuantes do monstro: o golpe marca-se com o impacto. A
     falha crítica de um monstro também produz a desgraça dele
     (tabela do Mestre, dentro do motor). */
  async function atacarIA(id, seq) {
    /* Supervisor: o ataque da IA também é validado antes — sem
       alcance, não acontece (a vez fecha pelo caminho normal). */
    if (distanciaEntre(id, PROPRIA) > alcanceEmCasas(DADOS_COMBATE[id].alcance)) {
      supRegistar('bloqueada', { acao: 'ataque', actor: id, razao: 'Monstro fora de alcance da Ong' });
      return;
    }
    const verbos = FRASES_IA[id];
    /* M1 (portão dos monstros, §3.1 do desenho): na vista do
       Mestre, o ataque resolve em modo «proposta» com semente e
       verificação capturadas ANTES — o padrão do clique dela. A
       captura consome exactamente os mesmos sorteios do PRNG que
       a chamada em «sorte» consumia por dentro (semente, depois
       as 3 faces), e em «proposta» o motor não aplica nada: se
       sair falha crítica com confirmação pedida, a desgraça
       ESTACIONA para a decisão dele (o parque, abaixo). Sem
       MODO_MESTRE a chamada é a de sempre — nem a entropia nem
       o comportamento mudam na Party. */
    let sementeDG = null, verificacaoDG = null;
    if (MODO_MESTRE) { sementeDG = vlabSemente(); verificacaoDG = vlabVerificacao(); }
    const s = MODO_MESTRE
      ? vlabResolverAtaqueCompleto(id, PROPRIA, {
          modoDesgraca: 'proposta', semente: sementeDG, verificacao: verificacaoDG })
      : vlabResolverAtaqueCompleto(id, PROPRIA, { modoDesgraca: 'sorte' });
    if (s.erro) {
      supRegistar('bloqueada', { acao: 'ataque', actor: id, razao: s.erro.codigo });
      if (s.erro.codigo === 'ARMA_QUEBRADA')
        say(`<b>${nomeCena(id)}</b> não consegue atacar — a arma dele está quebrada.`);
      return;
    }
    if (s.resultado === 'falhaCritica') {
      const fcProp = s.soDoMestre && s.soDoMestre.falhaCritica;
      if (MODO_MESTRE && fcProp && fcProp.requerConfirmacao) {
        /* O PARQUE: nasce o pendente do monstro e esta função
           espera a decisão — SEM relógio nenhum (a regra da casa
           dos cartões: nada se resolve por tempo; o caminho do
           ataque nunca teve guarda de tempo e este desenho não
           lhe cria nenhuma). Ao estacionar NÃO se regista evento
           nenhum: o registo do ataque e o da escolha nascem só
           depois da decisão, com a escolha final — registar ao
           estacionar gravaria a proposta como se fosse o
           desfecho e o registo mentiria. */
        const pendente = {
          origem: 'monstro', atacanteId: id, seq, supEpoca,
          semente: sementeDG, verificacao: verificacaoDG,
          recibo: s, proposta: fcProp.desgraca.id,
          escolhaMarcada: undefined, assentador: null
        };
        desgracaMonstroPendente = pendente;
        estado = 'desgraca-lista'; renderAcoes();
        const desfecho = await new Promise(res => { pendente.assentador = res; });
        /* Guarda quádrupla de época (o padrão completo dos ramos
           de acerto/falha, E-C1.4): época morta — cancelador,
           restauro, gelo ou fim —, a linha do tempo que rolou já
           não existe: devolve em silêncio, sem aplicar nada. */
        if (!desfecho || desfecho.morta || seqTurno !== seq || batalhaFim
            || supCongelado || supEpoca !== pendente.supEpoca) return;
        const escolha = desfecho.escolha;
        estado = 'vez-ia';   // o parque fechou; a vez continua do monstro até fimDaVezIA
        if (escolha === 'nada') {
          /* O Mestre recusou TODAS: sem segunda chamada — a saída
             da proposta já é a resolução sem aplicação
             (aplicado=false, sem lado do atacante para consumir),
             logo fc = null: zero efeitos e a frase de golpe
             falhado sem desgraça («O golpe correu mal.»). */
          supRegistar('accao', { acao: 'ataque', actor: id, alvo: PROPRIA, acerto: false, falhaCritica: null });
          supRegistar('accao', { acao: 'desgraca-escolha', actor: id, proposta: pendente.proposta, escolha: 'nada' });
          say(`<b>${nomeCena(id)}</b> ${verbos.falha} a <b>Ong</b> e falhou. ` + vlabFraseDesgraca(id, null));
          renderAcoes();
          return;
        }
        /* Aceitar a proposta ou trocar: segunda chamada ao motor,
           mesma semente e mesma verificação, modo «escolha» — o
           espelho exacto do Confirmar dela. */
        const s2 = vlabResolverAtaqueCompleto(id, PROPRIA, {
          modoDesgraca: 'escolha', semente: pendente.semente, verificacao: pendente.verificacao,
          desgracaEscolhida: escolha,
          confirmacaoDeProposta: { proposta: pendente.proposta } });
        if (s2.erro) {
          /* Aborto com desfecho lavrado (§3.1): nunca se continua
             com o recibo da proposta (não aplica efeito nenhum).
             Regista-se 'bloqueada' com o código do erro, diz-se só
             a linha de falha — SEM frase de desgraça: nenhuma
             aconteceu, e «O golpe correu mal.» afirmaria um
             «nada» que ninguém decidiu — e a vez fecha pela
             continuação de sempre, com o ataque consumido. */
          supRegistar('bloqueada', { acao: 'ataque', actor: id, alvo: PROPRIA, razao: s2.erro.codigo });
          say(`<b>${nomeCena(id)}</b> ${verbos.falha} a <b>Ong</b> e falhou.`);
          renderAcoes();
          return;
        }
        const fc = vlabAplicarAtacanteDepois(id, s2);
        supRegistar('accao', { acao: 'ataque', actor: id, alvo: PROPRIA, acerto: false, falhaCritica: fc ? fc.desgraca.id : null });
        supRegistar('accao', { acao: 'desgraca-escolha', actor: id, proposta: pendente.proposta, escolha });
        if (s2.desgracaPendente)
          supRegistar('accao', { acao: 'desgraca-pendente', actor: id, tipo: s2.desgracaPendente.tipo, aplicada: false, motivo: 'desgraça pendente não aplicada nesta casca (sem aliados ao alcance — contexto da batalha a solo)' });
        say(`<b>${nomeCena(id)}</b> ${verbos.falha} a <b>Ong</b> e falhou. ` + vlabFraseDesgraca(id, fc));
        renderAcoes();
        return;
      }
      const fc = vlabAplicarAtacanteDepois(id, s);
      supRegistar('accao', { acao: 'ataque', actor: id, alvo: PROPRIA, acerto: false, falhaCritica: fc ? fc.desgraca.id : null });
      if (s.desgracaPendente)
        supRegistar('accao', { acao: 'desgraca-pendente', actor: id, tipo: s.desgracaPendente.tipo, aplicada: false, motivo: 'desgraça pendente não aplicada nesta casca (sem aliados ao alcance — contexto da batalha a solo)' });
      say(`<b>${nomeCena(id)}</b> ${verbos.falha} a <b>Ong</b> e falhou. ` + vlabFraseDesgraca(id, fc));
      return;
    }
    if (s.resultado === 'erra') {
      /* Supervisor (pós-críticos T1.5): o ataque LEGAL do monstro
         entra no registo — actor, alvo e falha (sem Defesas nem
         constantes internas). */
      supRegistar('accao', { acao: 'ataque', actor: id, alvo: PROPRIA, acerto: false });
      tentarEsquiva(id, PROPRIA);          // FUSÃO T-D: ela esquiva-se do golpe falhado (degrada sem gesto na cena do vivo)
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
    /* Supervisor: parcelas = total — se não bater, a resolução
       ABORTA neste tick (sem aplicar dano). */
    if (!supConferirSoma(s.danoAplicado.parcelas.map(p => ({ valor: p.subtotal })), s.danoAplicado.total, id)) return;
    const total = s.totalEfectivo;
    supRegistar('accao', { acao: 'ataque', actor: id, alvo: PROPRIA, acerto: true, dano: total });
    /* T-D: validação do Supervisor completa → o gesto apresenta-se
       e SÓ DEPOIS o golpe marca (anel) e o dano do motor se aplica —
       os números da resolução VLAB não mudam, só ganham o gesto antes. */
    const epocaAcertoIA = supEpoca;
    await apresentarConfronto(id, PROPRIA, true);   // R1: ataque contado no total (evento «ataque» registado acima)
    if (seqTurno !== seq || batalhaFim || supCongelado || supEpoca !== epocaAcertoIA) { continuarAposApresentacao = false; return; }   // R1-Priv: idem
    mostrarImpacto(PROPRIA);
    const desfecho = vlabAplicarAlvoDepois(PROPRIA, s);
    if (desfecho === 'morreu') { fimDeBatalha('morte'); return; }
    if (desfecho === 'aMorrer') { entrarAMorrer(); return; }
    if (desfecho === 'falhaDeMorte') {
      /* Regra do Mestre (09/11/2026): golpe que acerta nela caída,
         em testes de morte, equivale a 1 falha. Narra-se o
         agravamento e regista-se a falha no Supervisor com os
         contadores, como nos testes — sem voltar a anunciar a
         queda que já tinha acontecido. Correcção de registo (E2
         da bancada): a frase abaixo NÃO é «a frase que o sistema
         já usa» — as três grafias de agravamento NÃO são a mesma
         frase; partilham só o núcleo final «piora visivelmente.»:
         relógio «A Ong, caída, piora visivelmente.» · IA (esta)
         «{monstro} {verbo} a Ong caída — ela piora
         visivelmente.» · oportunidade «{nome} golpeia-a de
         oportunidade — ela, caída, piora visivelmente.». A
         diferença é defensável (esta frase tem de nomear o
         atacante) — corrige-se a alegação, não a frase. */
      const em = ESTADO_VLAB.ong.estadoMorte;
      supRegistar('accao', { acao: 'falha-de-morte-por-golpe', actor: id, alvo: PROPRIA,
        sucessos: em ? em.sucessos : null, falhas: em ? em.falhas : null });
      say(`<b>${nomeCena(id)}</b> ${verbos.acerto} a <b>Ong</b> caída — ela piora visivelmente.`);
      return;
    }
    say(`<b>${nomeCena(id)}</b> ${verbos.acerto} a <b>Ong</b> — ela perdeu <b>${total}</b> de vida.`);
  }
  /* M-015: o chip reflecte SEMPRE a figura dela, nas duas barras e no
     rótulo da Alma — os valores compõem-se das mesmas fórmulas da
     ficha (Vida = total − danoSofrido; Alma livre = Total −
     Comprometido − paGasto). Antes, esta função só escrevia a barra
     da Vida e o rótulo/barra da Alma ficavam com o resíduo da maqueta
     («PA 7», 70%) para sempre. O nome da função mantém-se: é o ponto
     de actualização do chip chamado no arranque, no dano, no
     restauro — e, desde esta correcção, também na Transformação. */
  function atualizarChipVida() {
    const barraVida = chipEl.querySelector('.bar.vida i');
    if (barraVida) barraVida.style.width =
      Math.max(0, Math.round((FICHAS.ong.vida.total - danoSofrido) / FICHAS.ong.vida.total * 100)) + '%';
    const almaLivre = FICHAS.ong.alma.total - FICHAS.ong.alma.comprometido - paGasto;
    const barraAlma = chipEl.querySelector('.bar.alma i');
    if (barraAlma) barraAlma.style.width =
      Math.max(0, Math.round(almaLivre / FICHAS.ong.alma.total * 100)) + '%';
    const rotuloAlma = chipEl.querySelector('#chip-alma-rotulo');
    if (rotuloAlma) rotuloAlma.textContent = `ALMA · PA ${almaLivre}`;
    /* C-06/C-07 gradual: a tela vermelha segue a vida por AQUI —
       é o ponto por onde passa toda a mudança de vida dela
       (dano, restauro/cura, transformação, arranque), nos dois
       sentidos. */
    aplicarTelaVermelha();
    atualizarContadorVD();   // C-VD: a vida dela muda o «fraca» da caixa
  }
  /* Fim de batalha (§1.7): DOIS terminais adjudicados — a queda
     dela (morte/estabilização/queda, como sempre) e, desde o
     completamento, a VITÓRIA: todos os monstros fora de
     combate. A máquina pára onde está. */
  function fimDeBatalha(causa) {
    /* Supervisor (pós-críticos T1.5): evento TERMINAL do fim
       natural — o registo passa a provar que a batalha acabou.
       Tranche VLAB: a causa distingue a morte adjudicada pelo
       motor (testes de morte M3), a estabilização na corrida e o
       fecho indeterminado (motor/progressão ilegível — nomeado no
       registo, nunca disfarçado). Sem causa, o comportamento e a
       frase são os de sempre. */
    supRegistar('fim', { actor: PROPRIA, danoSofrido,
      causa: causa || 'queda', morteAdjudicada: causa === 'morte' });
    /* M1 (§3.5 do desenho): fecho defensivo — um parque de
       monstro aberto não atravessa o fim da batalha. Hoje é
       inalcançável com o parque aberto (a cadeia parada é a
       única fonte de fins); entra por coerência com o padrão da
       casa: nenhum Continuar diferido sobrevive ao fim. */
    fecharDesgracaMonstro({ morta: true });
    /* C-07 (forma gradual, 05/11/2026): a tela já vem a
       avermelhar com a vida baixa desde os 25% — quem a move é a
       vida, por atualizarChipVida. Aqui, a morte DELA adjudicada
       pelo motor (causa 'morte') só garante o FIM da escala: a
       bandeira força a fracção a zero e a intensidade ao tecto.
       Vitória, estabilização e fecho indeterminado não tocam na
       bandeira — o que se vê nesses fins é só o que a vida manda
       (na estabilização ela está a zero de vida: tecto, pela
       escala, não pela bandeira). */
    if (causa === 'morte') { mortePropriaAdjudicada = true; aplicarTelaVermelha(); }
    continuarAposApresentacao = false;   // R1-Priv: terminal — nenhum Continuar diferido sobrevive ao fim
    batalhaFim = true;
    seqTurno++;                              // invalida continuações pendentes
    if (contextoIA) consumirContextoIA(contextoIA.id);
    reservasDestinoIA.clear();   // a batalha acabou: nenhuma reserva de voo atravessa o fim
    supRestauroVoo = null;   // EM-TJ12J13-01: limpeza defensiva — o carimbo de travessia também não atravessa o fim
    /* FUSÃO T-D (casca-td §1.3): a queda entra pela máquina de morte
       da cena (Death_A -> pose persistente) quando ela existe —
       nunca pela prancha do setVivo; na cena sagrada do vivo, que
       não expõe apresentarMorte, o catch degrada para o setVivo de
       sempre: mesmo resultado visível hoje, caminho T-D pronto.
       A01: na VITÓRIA ela NÃO cai — nenhuma apresentação de morte
       dela corre; quem caiu foram os monstros, um a um. */
    if (causa !== 'vitoria') {
      try {
        const pm = view.apresentarMorte(PROPRIA);
        if (pm && pm.catch) pm.catch(() => {});
      } catch (_) { view.setVivo(PROPRIA, false); }
    }
    estado = 'fim';
    atualizarVez(); renderAcoes();
    say(causa === 'vitoria'
      ? 'Os inimigos caíram todos — <b>vitória</b> da <b>Ong</b> nesta batalha. Aperte <b>Recomeçar</b> para jogar outra vez.'
      : causa === 'estabilizada'
      ? 'A <b>Ong</b> caiu, mas estabilizou — ela volta com <b>1 de Vida</b> e fica caída, sem lutar, até receber uma cura. A cura soma por cima desse 1.'
      : 'A <b>Ong</b> caiu — fim desta batalha. Aperte <b>Recomeçar</b> para jogar outra vez.');
  }
  /* Terminar a batalha (M-014): a saída que a especificação reserva
     à mesa — fecha o encontro a meio, SEM a Ong cair (sem setVivo):
     é um fim declarado, não uma queda. O registo do Supervisor marca
     a origem ('terminar') para o fim declarado se distinguir do fim
     natural no registo exportado. */
  function terminarBatalha() {
    supRegistar('fim', { actor: PROPRIA, danoSofrido, origem: 'terminar' });
    /* M1 (§3.5 do desenho): fecho defensivo, como em
       fimDeBatalha — o Terminar só existe na vez dela em 'base',
       logo inalcançável com o parque aberto; o assentador é
       idempotente e a chamada não custa nada fora do parque. */
    fecharDesgracaMonstro({ morta: true });
    continuarAposApresentacao = false;   // terminal — nenhum Continuar diferido sobrevive
    batalhaFim = true;
    seqTurno++;                              // invalida continuações pendentes
    if (contextoIA) consumirContextoIA(contextoIA.id);
    reservasDestinoIA.clear();   // fim declarado: nenhuma reserva de voo atravessa o fim
    supRestauroPendente = null;
    supRestauroVoo = null;   // EM-TJ12J13-01: fim declarado — o par de restauro também não atravessa o fim
    estado = 'fim';
    atualizarVez(); renderAcoes();
    say('A batalha <b>terminou</b> — a mesa fechou este encontro. Aperte <b>Recomeçar</b> para jogar outra vez.');
  }

  /* ---------- acções da faixa ---------- */
  /* Handler nomeado (T1.5): o clique da faixa e o controlador do
     Modo automático chamam a MESMA função — o pipeline legal é um
     só; o automático não duplica resolução nenhuma. */
  async function tratarAcao(acao) {
    fecharPainelVd();   // C-VD (§5.1): ela age — o painel da caixa fecha
    if (!campoPronto) {
      if (acao === 'tentar-modelos' && falhaArranque && !falhaDefinitiva) location.reload();
      else say('');
      return;
    }
    const u = unidade(selecionada);
    /* Supervisor: batalha congelada — só o Recomeçar AGE; as
       outras acções não mutam nada, mas respondem com a frase do
       mundo (EXP-R1: pós-gelo, silêncio é proibido nesta casca). */
    if (supCongelado) {
      if (acao === 'recomecar') location.reload();
      else say('A batalha parou — aperte <b>Recomeçar</b>.');
      return;
    }
    /* Guarda de vez (§1.5): na vez de um monstro, cliques em botões
       da faixa (incl. botões obsoletos da transição de renderização)
       só produzem a frase de espera. Excepção EM-P2: no estado
       'fim', a acção recomecar NUNCA é bloqueada. */
    if (acao === 'recomecar') { location.reload(); return; }
    /* M1 (§3.2 do desenho): a decisão do cartão do MONSTRO
       despacha AQUI — depois da guarda de gelo e do atalho
       recomecar, ANTES da guarda de vez (na vez da IA a guarda
       fecharia tudo, o cartão incluído) e de supValidarAcaoOng
       (para a decisão nunca se registar como acção dela, com
       actor: PROPRIA — os únicos eventos da decisão são os do
       parque, registados em atacarIA depois de ela assentar).
       Cinco condições cumulativas; sem as cinco, a acção cai no
       fluxo de sempre: (1) vista do Mestre; (2) estado
       'desgraca-lista'; (3) pendente do monstro da origem
       esperada para esta vez ('monstro' na vez da IA,
       'oportunidade' na vez dela); (4) pendente da linha do
       tempo corrente — seq na origem IA, supEpoca na de
       oportunidade — e batalha a correr; (5) nenhum pendente
       dela. Marcar ≠ aplicar: escolher regista a marca no
       pendente e o cartão mostra-a; «Aplicar» é que assenta. */
    if (desgracaMonstroPendente && (acao === 'desgraca-aplicar' || acao.startsWith('desgraca-escolher:'))) {
      const p = desgracaMonstroPendente;
      const origemEsperada = vezAtual === PROPRIA ? 'oportunidade' : 'monstro';
      const epocaViva = p.origem === 'oportunidade' ? p.supEpoca === supEpoca : p.seq === seqTurno;
      if (MODO_MESTRE && estado === 'desgraca-lista' && p.origem === origemEsperada
          && epocaViva && !batalhaFim && !desgracaPropostaPendente()) {
        if (acao === 'desgraca-aplicar') {
          /* Aplicar sem marca é inerte: sem escolha nomeada não
             há nada para autorizar (o botão nasce desactivado;
             esta é a rede do ramo). */
          if (p.escolhaMarcada !== undefined)
            fecharDesgracaMonstro({ escolha: p.escolhaMarcada });
          return;
        }
        const esc = acao.slice('desgraca-escolher:'.length);
        const fcM = p.recibo.soDoMestre.falhaCritica;
        if (esc !== 'nada' && !(fcM.tabelaEfectiva || []).some(l => l.id === esc))
          return;   // excluída ou desconhecida: nem marca (o cartão nem a oferece activa)
        p.escolhaMarcada = esc;
        renderAcoes();
        return;
      }
    }
    if (vezAtual !== PROPRIA || batalhaFim) { fraseEsperaVez(); return; }
    /* M1 (§3.3): a guarda única em tratarAcao — com um parque de
       monstro aberto, só a decisão dele (acima) e o recomecar
       (acima) passam; nenhum outro caminho escreve estado nem
       ataquePendente por baixo da resolução estacionada. Na vez
       da IA a guarda de vez (acima) já respondeu; esta linha é a
       que fecha a vez dela — o parque de oportunidade da M2. */
    if (desgracaMonstroPendente) { say(FRASE_DECISAO_PENDENTE); return; }
    /* R1-Priv: «Continuar» premido DURANTE o gesto não é ainda uma
       acção executada — fica só a bandeira, SEM registo no
       Supervisor; o evento regista-se uma única vez, à execução
       (quando a continuação do Confirmar o chama de volta, já sem
       apresentação a correr). Sem isto, um clique durante o gesto
       despejava o evento duas vezes no export. */
    if (acao === 'continuar' && apresentacaoEmCurso) { continuarAposApresentacao = true; return; }
    /* Supervisor do Comestre (T1.5): TODA a acção é validada ANTES
       de acontecer. As acções de combate devolvem também a frase e
       a limpeza necessária: uma validação por chamada, partilhada
       pela casca e pelo registo. As restantes acções mantêm as
       guardas existentes. */
    const bloqueioSup = supValidarAcaoOng(acao);
    if (bloqueioSup) {
      supRegistar('bloqueada', { acao, actor: PROPRIA, razao: bloqueioSup.razao });
      if (bloqueioSup.mensagem) {
        if (bloqueioSup.limparPendente) {
          /* EM-J1-04 (quarta porta do J1): com uma rolagem por
             resolver, a recusa do Confirmar NÃO apaga a rolagem —
             devolve à frase-ponte, sem limpar o pendente nem
             mudar o estado. */
          if (rolagemPorResolver()) { say(FRASE_ROLAGEM_PENDENTE); return; }
          ataquePendente = null; estado = 'base'; renderAcoes();
        }
        say(bloqueioSup.mensagem);
        return;
      }
      if (bloqueioSup.duro) return;
    } else {
      supRegistar('accao', { acao, actor: PROPRIA });
    }
    if (acao === 'voltar') {
      /* J1 (carta IBX-213): com uma rolagem por resolver, o Voltar
         NÃO a deita fora — devolve à mesma rolagem pendente. Sem
         rolagem pendente, o Voltar é o de sempre (incl. cancelar a
         declaração de Transformação antes de rolar). */
      if (rolagemPorResolver()) { say(FRASE_ROLAGEM_PENDENTE); return; }
      estado = 'base'; ataquePendente = null; renderAcoes(); say('É a vez da <b>Ong</b>.'); return;
    }
    if (acao === 'mover') { entrarMover(); return; }
    if (acao === 'desvincular') {
      /* Declaração do modo Mover (Parte C): a intenção regista-se
         e consome-se na próxima partida dela (vlabCapturarPartida);
         a validação e o custo são do motor, à saída. */
      if (estado !== 'mover' && estado !== 'movendo') return;
      opcoesMovimento.desvincular = !opcoesMovimento.desvincular;
      renderAcoes();
      say(opcoesMovimento.desvincular
        ? 'Ao sair de junto de um inimigo, a <b>Ong</b> afasta-se com segurança — protege-a de <b>todos</b> os inimigos ao lado (gasta a acção principal ao sair).'
        : 'Sair com segurança desligado — ao afastar-se de um inimigo, ela fica exposta ao golpe de oportunidade dele.');
      return;
    }
    if (acao === 'correr') {
      /* Correr (Parte C): a validação e o novo limite são do motor
         (validarCorrer); a página só apresenta e aplica o orçamento. */
      if (estado !== 'mover' && estado !== 'movendo') return;
      if (!VLAB_MOTOR) { say('O motor de combate não respondeu — tente outra vez.'); return; }
      if (correrUsado) { say('Ela já está a correr nesta vez.'); return; }
      const base = vlabDeslocBaseOng();
      const val = VLAB_MOTOR.validarCorrer({ deslocamentoBase: base, acaoPadraoDisponivel: !atacou });
      if (val.erro) {
        supRegistar('bloqueada', { acao: 'correr', actor: PROPRIA, razao: val.erro.codigo });
        say(val.erro.codigo === 'CORRER_SEM_ACCAO_PADRAO'
          ? 'Correr gasta a acção principal — ela já a usou nesta vez.'
          : 'Não dá para correr agora.');
        return;
      }
      if (reservaMovimento < base) { say('Correr decide-se antes de começar a andar.'); return; }
      reservaMovimento = val.deslocamentoMaximo;
      correrUsado = true;
      atacou = true;                 // a Acção Padrão gastou-se a correr
      alcance = calcularAlcance();
      desenharAlcance();
      renderAcoes();
      say(`A <b>Ong</b> corre — pode andar até <b>${fmtM(reservaMovimento)}</b> nesta vez (gastou a acção principal).`);
      return;
    }
    if (acao === 'cancelar') {
      const restavam = fmtM(reservaMovimento);
      sairMover();
      say(`Você fica por aqui — restavam <b>${restavam}</b> nesta vez.`);
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
      // Abrir a gaveta não escolhe alvo: técnicas sobre si própria
      // ficam acessíveis; o Chicote valida o seu alvo ao ser escolhido.
      estado = 'atacar'; renderAcoes();
      say(alvo
        ? `Atacar <b>${nomeCena(alvo)}</b> com a <b>Ong</b> · escolha o ataque na faixa.`
        : 'Escolha o Chicote ou a Transformação da <b>Ong</b>. A Transformação é sobre si própria.');
      return;
    }
    if (acao === 'consumivel') {
      estado = 'consumivel'; renderAcoes();
      /* M-013 + LB-C-03: frase declarativa na voz do mundo, sem
         jargão de produção e sem prometer inventário futuro —
         nesta batalha ela não traz nada para usar. */
      say('Itens · nesta batalha ela não traz nada para usar.');
      return;
    }
    if (acao === 'terminar') {
      /* LB-C-05: terminar só a partir da base — de outro estado
         (rolagem, mover, …) a acção não abre a confirmação nem
         arrasta pendentes (as casas acesas do Mover ficariam
         fantasmas na base após o Voltar). */
      if (estado !== 'base') { say('Primeiro volte às acções base.'); return; }
      /* M-014: pedir a confirmação — a batalha não fecha por um toque. */
      estado = 'confirmar-fim'; renderAcoes();
      say(`Terminar esta batalha? A rodada ${rodada} fica por fechar — aperte <b>Sim, terminar</b> para fechar, ou <b>Voltar</b> para continuar a jogar.`);
      return;
    }
    if (acao === 'terminar-sim') {
      /* LB-C-05: terminar-sim só a partir de confirmar-fim — directo
         da base (ou de outro estado) não fecha a batalha. */
      if (estado !== 'confirmar-fim') { say('Primeiro aperte <b>Terminar</b> para confirmar.'); return; }
      terminarBatalha(); return;
    }
    if (acao === 'ataque-basico') {
      /* O teste DELA rola NA HORA, de verdade — desde a tranche
         VLAB, DENTRO do motor pinado (T1.4 §1.1 mantém-se: o
         resultado guarda-se em ataquePendente e NÃO se revela antes
         do Confirmar). A frase mostra só a fórmula e a rolagem DELA
         — a CA do alvo nunca aparece (lei anti-metagame), e sem o
         limiar ela não consegue saber se acertou. A desgraça de uma
         eventual falha crítica pede-se em modo «proposta» (H10): o
         motor devolve-a SEM aplicar; aplicar é o Confirmar, com
         segunda chamada ao motor (escolha = a proposta, troca
         registada se um dia houver). */
      const c = DADOS_COMBATE.ong;
      if (ESTADO_VLAB.ong.armaQuebrada) {
        say(`O ${c.arma} está quebrado — só volta a servir depois de consertado.`);
        return;
      }
      if (ESTADO_VLAB.ong.armaCaida) {
        /* Apanhar a arma = 1 Acção de Movimento (motor, desgraças
           J3): consome-se o movimento desta vez, sem ataque. */
        ESTADO_VLAB.ong.armaCaida = false;
        reservaMovimento = 0;
        say(`A <b>Ong</b> apanha o ${c.arma} do chão — isso gasta o movimento desta vez.`);
        return;
      }
      const semente = vlabSemente();
      const verificacao = vlabVerificacao();
      const s = vlabResolverAtaqueCompleto(PROPRIA, alvo, {
        modoDesgraca: 'proposta', semente, verificacao });
      if (s.erro) {
        supRegistar('bloqueada', { acao: 'ataque-basico', actor: PROPRIA, alvo, razao: s.erro.codigo });
        if (s.erro.codigo === 'PA_INSUFICIENTE') {
          const livre = FICHAS.ong.alma.total - FICHAS.ong.alma.comprometido - paGasto;
          say(`Alma livre não chega — o ${c.arma} custa <b>8 PA</b> e a livre dela é ${livre}.`);
        } else {
          say('O ataque não se resolveu — tente outra vez.');
        }
        return;
      }
      ataquePendente = { tipo: 'chicote', nome: c.arma, vlab: s, semente, verificacao };
      /* Supervisor (pós-críticos T1.5): a rolagem PÚBLICA dela
         (faces escolhidas e total, os mesmos da frase) entra no
         registo. */
      const rol = s.rolagem;
      const idxEsc = Math.max(0, rol.resultados.indexOf(rol.escolhido));
      const facesEsc = rol.conjuntosDeFaces[idxEsc] || rol.conjuntosDeFaces[0];
      supRegistar('accao', { acao: 'ataque-basico', actor: PROPRIA, alvo, faces: facesEsc, total: rol.total });
      estado = 'rolagem'; renderAcoes();
      let soma = facesEsc.join(' + ') + ' + ' + rol.bonus;
      if (rol.ajusteVantagemDesvantagem > 0) soma += ' + ' + rol.ajusteVantagemDesvantagem;
      if (rol.ajusteVantagemDesvantagem < 0) soma += ' − ' + (-rol.ajusteVantagemDesvantagem);
      const notaVD = rol.niveisLiquidos !== 0
        ? ` · (${rol.niveisLiquidos > 0 ? 'a melhor' : 'a pior'} de ${rol.conjuntosDeFaces.length} rolagens — ${rol.niveisLiquidos > 0 ? 'Vantagem' : 'Desvantagem'})` : '';
      say(`${c.arma} de <b>Ong</b> contra <b>${nomeCena(alvo)}</b> · <b>${rol.expressao} → ${soma} = ${rol.total}</b>${notaVD} · aperte <b>Confirmar</b> para saber se acertou.`);
      return;
    }
    if (acao === 'transformacao') {
      /* Não é um ataque: não pede alvo nem alcance; é a acção dela
         sobre si própria e consome o atacar da vez (no Confirmar).
         O validador comum recusa se ela já estiver transformada. */
      const t = DADOS_COMBATE.ong.transformacao;
      const livre = FICHAS.ong.alma.total - FICHAS.ong.alma.comprometido - paGasto;
      ataquePendente = { tipo: 'transformacao', nome: 'Transformação' };
      estado = 'rolagem'; renderAcoes();
      say(livre >= t.custo
        ? `Transformação · custa <b>${t.custo} PA</b> dos ${livre} livres — você ficaria com <b>${livre - t.custo}</b> de alma livre · o Chicote passa a 8d6+34 e a Defesa dela sobe.`
        : `Transformação · custa <b>${t.custo} PA</b> e a alma livre dela é ${livre} — não chega.`);
      return;
    }
    if (acao === 'trocar-desgraca') {
      /* T-DESGRACA-NADA: recusar a proposta abre a lista completa
         no cartão. Sem proposta pendente o gesto não existe —
         silêncio local, como noutros gestos fora do seu estado. */
      if (!MODO_MESTRE) return;   // E1 (bancada): a lista é decisão só do Mestre — ramo inerte na Party
      if (estado !== 'rolagem' || !desgracaPropostaPendente()) return;
      estado = 'desgraca-lista'; renderAcoes();
      say(`A proposta é <b>${desgracaPropostaPendente().desgraca.nome}</b> — escolha no cartão a desgraça que acontece, ou nenhuma.`);
      return;
    }
    if (acao === 'desgraca-voltar') {
      /* Voltar do cartão: a rolagem continua pendente, a escolha
         já feita (se houver) fica — só o Confirmar resolve. */
      if (!MODO_MESTRE) return;   // E1 (bancada): ramo inerte na Party
      if (desgracaMonstroPendente) return;   // M1 (E-C1.6-iv): com um parque de monstro aberto, o ramo dela é inerte por guarda explícita — quem despacha é o ramo novo da decisão
      if (estado !== 'desgraca-lista') return;
      estado = 'rolagem'; renderAcoes(); say(FRASE_ROLAGEM_PENDENTE); return;
    }
    if (acao.startsWith('desgraca-escolher:')) {
      if (!MODO_MESTRE) return;   // E1 (bancada): ramo inerte na Party
      if (desgracaMonstroPendente) return;   // M1 (E-C1.6-iv): idem — sem esta guarda, o ramo leria a fonte dela (null) e faria a transição para uma 'rolagem' vazia por baixo do parque
      if (estado !== 'desgraca-lista') return;
      const fc = desgracaPropostaPendente();
      if (!fc) { estado = 'rolagem'; renderAcoes(); return; }
      const esc = acao.slice('desgraca-escolher:'.length);
      const linhaEsc = (fc.tabelaEfectiva || []).find(l => l.id === esc);
      if (esc !== 'nada' && !linhaEsc) return;   // excluída ou desconhecida: o cartão nem a oferece activa
      ataquePendente.desgracaEscolha = esc;
      estado = 'rolagem'; renderAcoes();
      say(esc === 'nada'
        ? `Fica sem desgraça. ` + FRASE_ROLAGEM_PENDENTE
        : `Desgraça escolhida: <b>${linhaEsc.nome}</b>. ` + FRASE_ROLAGEM_PENDENTE);
      return;
    }
    if (acao === 'confirmar') {
      const pend = ataquePendente;
      ataquePendente = null;
      /* Guarda reposta (bancada, R3): sem pendente, o Confirmar
         fecha em silêncio na base — nunca lê pend.tipo a null. O
         validador já recusa este caso; a guarda é a rede local. */
      if (!pend) { estado = 'base'; renderAcoes(); return; }
      if (pend.tipo === 'transformacao') {
        /* O débito é REAL (T1.4 §3.3): paGasto escreve-se e a ficha
           compõe o PA livre a partir dele. Sem alma que chegue,
           recusa sem debitar e sem forçar (pagamento forçado com
           Exaustão fica fora desta tranche, declarado nas NOTAS). */
        const t = DADOS_COMBATE.ong.transformacao;
        const livre = FICHAS.ong.alma.total - FICHAS.ong.alma.comprometido - paGasto;
        estado = 'base'; renderAcoes();
        paGasto += t.custo;
        transformada = true;
        atualizarChipVida();           // M-015: o débito de PA reflecte-se já no chip (antes nem a chamada existia neste caminho)
        atacou = true;                 // transformar consome a acção do turno
        say(`<b>Transformação</b> · a <b>Ong</b> transformou-se — gastou <b>${t.custo} PA</b> (alma livre: ${livre - t.custo}). O Chicote passa a 8d6+34.`);
        return;
      }
      // Chicote: o Confirmar REVELA a resolução do motor (D-14.2).
      // O alcance revalida-se com o alcance real da arma dela (6).
      atacou = true;                   // a acção gasta-se, acerte ou erre
      estado = 'resultado'; renderAcoes();
      /* T-D: o alvo DESTE golpe fixa-se antes do gesto — um toque
         durante a apresentação pode marcar outro alvo para a acção
         seguinte, nunca para o golpe já confirmado. */
      const alvoDoGolpe = alvo;
      let s = pend.vlab;
      /* Falha crítica em modo «proposta»: o Confirmar do Mestre
         APLICA a desgraça — segunda chamada ao motor, mesma semente
         e mesma verificação de crítico, escolha = a proposta (H10:
         a IA propôs, o Mestre autorizou). */
      const fcProp = s.soDoMestre && s.soDoMestre.falhaCritica;
      /* T-DESGRACA-NADA: a escolha do Mestre no cartão, se a houve:
         um id da tabela (troca sobre a proposta) ou 'nada'. */
      let semDesgraca = false;
      if (fcProp && fcProp.requerConfirmacao) {
        /* E1 (bancada): sem MODO_MESTRE, uma escolha gravada no
           pendente é ignorada — o Confirmar aplica a proposta,
           exactamente como a base. */
        const escolhaDG = MODO_MESTRE ? pend.desgracaEscolha : undefined;
        if (escolhaDG === 'nada') {
          /* O Mestre recusou TODAS: a falha crítica fica sem
             desgraça. NÃO há segunda chamada — a saída da proposta
             já é a resolução sem aplicação (aplicado=false, sem
             atacanteDepois nem desgracaPendente: conferido no
             motor), e o ramo da falha crítica lê fc = null: zero
             efeitos, a frase sai «O golpe correu mal.». A decisão
             regista-se como escolha do Mestre. Os custos da falha
             crítica pagam-se na mesma, como sempre. */
          semDesgraca = true;
          supRegistar('accao', { acao: 'desgraca-escolha', actor: PROPRIA, proposta: fcProp.desgraca.id, escolha: 'nada' });
        } else {
          const s2 = vlabResolverAtaqueCompleto(PROPRIA, alvo, {
            modoDesgraca: 'escolha', semente: pend.semente, verificacao: pend.verificacao,
            desgracaEscolhida: escolhaDG || fcProp.desgraca.id,
            confirmacaoDeProposta: { proposta: fcProp.desgraca.id } });
          /* Pós-Crítico 3 (achado 4): se a segunda chamada falhar, o
             Confirmar ABORTA — nunca se continua com a saída da
             proposta (que não aplica efeito nenhum): sem PA cobrado,
             sem frase de desgraça, erro nomeado no registo. */
          if (s2.erro) {
            supRegistar('bloqueada', { acao: 'ataque', actor: PROPRIA, alvo, razao: s2.erro.codigo });
            say('O ataque não se resolveu — tente outra vez.');
            return;
          }
          s = s2;
          if (escolhaDG) supRegistar('accao', { acao: 'desgraca-escolha', actor: PROPRIA, proposta: fcProp.desgraca.id, escolha: escolhaDG });
        }
      }
      if (s.erro) {
        supRegistar('bloqueada', { acao: 'ataque', actor: PROPRIA, alvo, razao: s.erro.codigo });
        say('O ataque não se resolveu — tente outra vez.');
        return;
      }
      /* O custo da técnica paga-se ao resolver (acerte ou erre) —
         mas só depois das conferências que podem abortar a
         resolução (pós-Crítico 1, achado 6): no ramo de acerto, o
         débito vem DEPOIS de supConferirSoma. */
      if (s.resultado === 'erra') {
        paGasto += s.pa.custo;
        atualizarChipVida();           // M-015: o débito de PA reflecte-se já no chip (antes a plaquinha ficava no valor anterior ao ataque)
        // Falha: sem impacto, sem flutuantes, sem dano — mas a
        // tentativa VÊ-SE (gesto T-D do vivo): a frase da falha só
        // sai quando o gesto fecha; época mudada ou gelo = a
        // resolução pertence à linha do tempo abandonada.
        const epocaFalha = supEpoca;
        await apresentarConfronto(PROPRIA, alvoDoGolpe, false);   // R1: a falha da Ong NÃO é ataque contado (sem evento «ataque»)
        if (supEpoca !== epocaFalha || supCongelado) { continuarAposApresentacao = false; return; }   // R1-Priv: idem
        say(`<b>Falha</b> · ${pend.nome} não atinge ${ALVO_NOME[alvoDoGolpe] || nomeCena(alvoDoGolpe)} · o dano <b>${formulaDanoOng()}</b> não se rola.`);   // M-004 do vivo: a fórmula DELA vê-se também na falha
        if (continuarAposApresentacao) { continuarAposApresentacao = false; tratarAcao('continuar'); }
        return;
      }
      if (s.resultado === 'falhaCritica') {
        paGasto += s.pa.custo;
        atualizarChipVida();           // M-015: o débito de PA reflecte-se já no chip (antes a plaquinha ficava no valor anterior ao ataque)
        /* T-DESGRACA-NADA: com «não acontece nada» não há lado do
           atacante para consumir — fc fica null e a frase é a de
           golpe falhado sem desgraça («O golpe correu mal.»). */
        const fc = semDesgraca ? null : vlabAplicarAtacanteDepois(PROPRIA, s);
        supRegistar('accao', { acao: 'ataque', actor: PROPRIA, alvo: alvoDoGolpe, acerto: false, falhaCritica: fc ? fc.desgraca.id : null });
        if (s.desgracaPendente)
          supRegistar('accao', { acao: 'desgraca-pendente', actor: PROPRIA, tipo: s.desgracaPendente.tipo, aplicada: false, motivo: 'sem aliado ao alcance nesta batalha a solo' });
        say(`<b>Falha crítica</b> · ${pend.nome} não atinge ${ALVO_NOME[alvoDoGolpe] || nomeCena(alvoDoGolpe)}. ` + vlabFraseDesgraca(PROPRIA, fc));
        return;
      }
      /* Supervisor: parcelas = total — se não bater, a batalha
         congela e a resolução ABORTA neste tick (sem dano). */
      if (!supConferirSoma(s.danoAplicado.parcelas.map(p => ({ valor: p.subtotal })), s.danoAplicado.total, PROPRIA)) return;
      paGasto += s.pa.custo;           // conferido e fechado: debita-se o custo da técnica
      atualizarChipVida();           // M-015: o débito de PA reflecte-se já no chip (antes a plaquinha ficava no valor anterior ao ataque)
      supRegistar('accao', { acao: 'ataque', actor: PROPRIA, alvo: alvoDoGolpe, acerto: true, dano: s.totalEfectivo });
      /* T-D: validação do Supervisor completa → o gesto
         apresenta-se e SÓ DEPOIS o golpe marca (anel, flutuantes,
         frase) e o dano do motor se aplica ao alvo. Se a época
         mudou durante o gesto (restauro ou gelo), esta resolução
         pertence à linha do tempo abandonada e não se aplica. */
      const epocaAcerto = supEpoca;
      await apresentarConfronto(PROPRIA, alvoDoGolpe, true);   // R1: ataque contado no total (evento «ataque» registado acima)
      if (supEpoca !== epocaAcerto || supCongelado) { continuarAposApresentacao = false; return; }   // R1-Priv: idem
      mostrarImpacto(alvoDoGolpe);
      /* A01: o lado do alvo consome-se INTEIRO — Vida interna,
         estados e, se o golpe o deitou, a queda na cena. A frase
         narra a queda (ficção visível: a figura tomba no mundo);
         nenhum número de Vida do monstro aparece, como sempre. */
      const desfechoAlvo = vlabAplicarAlvoDepois(alvoDoGolpe, s);
      /* Os flutuantes passam a ser as parcelas do DMG, uma por TIPO
         de dano (especificação do Mestre), com o total por cima —
         mostrarDano soma e fecha como antes. */
      const parcelasTipo = s.danoAplicado.parcelas.map(p => ({
        classe: p.tipo || 'tecnica', rotulo: p.tipo || 'dano', valor: p.subtotal }));
      const total = numerosDano ? mostrarDano(alvoDoGolpe, parcelasTipo) : null;
      say(`<b>${s.resultado === 'critico' ? 'Acerto crítico' : 'Acerto'}</b> · ${pend.nome} atinge ${ALVO_NOME[alvoDoGolpe] || nomeCena(alvoDoGolpe)}.` +
        (total != null ? ' As parcelas do dano saem da figura em números.' : '') +
        (desfechoAlvo === 'caiu' ? ` <b>${nomeCena(alvoDoGolpe)}</b> caiu.` : ''));
      /* A01: com os três fora de combate, o terminal de VITÓRIA
         fecha a batalha — o Continuar diferido não sobrevive ao
         fim, como em qualquer outro terminal. */
      if (vlabTodosMonstrosForaDeCombate()) { fimDeBatalha('vitoria'); return; }
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
        ? 'A <b>Ong</b> já atacou nesta vez — aperte <b>Encerrar</b> para fechar a vez dela.'
        : 'É a vez da <b>Ong</b>.');
      return;
    }
    if (acao === 'encerrar') {
      // Fecha a vez dela e PASSA A VEZ ao próximo da ordem (§1.4):
      // a frase do Encerrar viaja no anúncio da vez seguinte.
      passarVez();
      return;
    }
    if (acao === 'apagar-fogo') {
      /* RAIO E FOGO, fim seco — proposta 1 do desenho §5: apagar-se
       * custa a Acção de Movimento desta vez (a reserva zera, como
       * ao levantar-se do Caído); o ataque continua livre. */
      if (!rfPodeApagarFogo()) return;
      reservaMovimento = 0;
      rfApagarPessoa(PROPRIA);
      supRegistar('accao', { acao: 'apagar-fogo', actor: PROPRIA });
      say('A <b>Ong</b> pára e apaga o fogo do corpo — isso gasta o movimento desta vez.');
      renderAcoes();
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
            <div><span>DANO · CHICOTE</span><b>${formulaDanoOng()}</b></div>
          </div>
        </div>
        <h2>Atributos</h2>
        <div class="attrs">${f.attrs.map(([n, v]) => `<div><b>${v}</b><span>${n}</span></div>`).join('')}</div>
        <h2>Técnicas</h2>
        ${f.tecnicas.map(([n, c]) => `<div class="tec"><span>${n}</span><em>${c}</em></div>`).join('')}
        <h2>Reacção</h2>
        ${seccaoReacaoDefender()}
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
    atualizarContadorVD();   // C-VD: a caixa nasce e morre com a plaquinha
  }
  function fecharFicha() { fichaAberta = null; fichaEl.hidden = true; chipEl.hidden = false; atualizarContadorVD(); }
  fichaEl.addEventListener('click', e => {
    if (e.target.closest('[data-fechar]')) fecharFicha();
    else if (e.target.closest('[data-declarar-defender]')) {
      /* M1 (§3.3): o botão Defender é um leitor sem guarda de
         estado — com um parque de monstro aberto, declarar
         escreveria REACCOES_DECLARADAS a meio da resolução
         estacionada. Barrado pela guarda do parque. (O braço da
         rolagem DELA não muda: declarar na vez dela com a sua
         rolagem pendente é o fluxo de hoje.) */
      if (desgracaMonstroPendente) { say(FRASE_DECISAO_PENDENTE); return; }
      const r = declararReacaoDefender(PROPRIA);
      if (r && r.erro) {
        /* O código do erro vive no registo do Supervisor; na tela
           da jogadora só entra a frase do mundo. */
        const frase = r.erro.startsWith('FORA_DA_JANELA')
          ? 'só se declara na vez dela, antes de a atacarem'
          : r.erro === 'REACCAO_JA_DECLARADA' ? 'já está declarada para o próximo ataque'
          : r.erro.startsWith('REACCAO_INDISPONIVEL') ? 'a Reacção desta ronda já se gastou'
          : r.erro.startsWith('SEM_COMPONENTES') ? 'a ficha não declara os componentes da reacção'
          : 'a batalha acabou';
        say(`A reacção <b>Defender</b> não se declarou — ${frase}.`);
      }
    }
  });
  chipEl.addEventListener('click', () => {
    if (!campoPronto) { say(''); return; }
    /* Supervisor (pós-críticos T1.5, Conflitos A1): batalha
       congelada — o chip não muta NADA (sem estado novo, sem
       apagar ataquePendente, sem repintar a faixa); correcções
       finais (EXP-R1): responde com a frase do mundo, sem
       silêncio. */
    if (supCongelado) { say('A batalha parou — aperte <b>Recomeçar</b>.'); return; }
    // Na vez de um monstro (ou no fim), o chip responde como os
    // toques: frase de espera (§1.5); a ficha dela vê-se antes e depois.
    if (vezAtual !== PROPRIA || batalhaFim) { fraseEsperaVez(); return; }
    // Passo de seta em curso: o toque não cancela o passo (E-T13L-2).
    if (estado === 'mover' && (passoEmCurso || view.getState().moving)) { say('Espere — ainda está a andar.'); return; }
    if (estado === 'movendo') { say(`Espere — <b>${nomeCena(selecionada)}</b> ainda está a andar.`); return; }
    /* M-010: com um resultado por ler (estado 'resultado' ou gesto
       do golpe ainda a decorrer), o chip também não destrói a saída:
       responde com a frase de espera e a ficha fica para depois do
       Continuar. */
    if (estado === 'resultado' || apresentacaoEmCurso) { say('Aperte <b>Continuar</b> para seguir.'); return; }
    /* J1 (carta IBX-213): com uma rolagem por resolver, o chip
       também não a destrói — a ficha fica para depois do
       Confirmar, como já acontece com o resultado (M-010). */
    if (rolagemPorResolver()) { say(FRASE_ROLAGEM_PENDENTE); return; }
    /* M1 (§3.3): a guarda única também no chip — com um parque
       de monstro aberto, o chip não repõe estado nem apaga
       pendentes (a linha seguinte a este bloco faz as duas
       coisas no fluxo normal). */
    if (decisaoPorResolver()) { say(FRASE_DECISAO_PENDENTE); return; }
    if (estado === 'mover') limparAjudaMover();
    estado = 'base'; ataquePendente = null;
    selecionar(PROPRIA); abrirFicha(PROPRIA); renderAcoes();
    say('A sua ficha, <b>Ong</b>.');
  });

  /* ---------- toque no mundo: hitTest (contenção), nunca íman ----------
   * A cena devolve {unitId, cell}: a figura pela caixa projectada e a
   * casa por contenção no plano do solo — sem raio de atracção em px. */
  function tratarToque(clientX, clientY) {
    if (!campoPronto) { say(''); return; }
    /* Supervisor (pós-críticos T1.5, Conflitos A1): batalha
       congelada — o toque não muta NADA (sem alvo novo, sem
       estado, sem abrir cartão nem ficha); correcções finais
       (EXP-R1): responde com a frase do mundo, sem silêncio. */
    if (supCongelado) { say('A batalha parou — aperte <b>Recomeçar</b>.'); return; }
    fecharCfg();
    // Intercepção à entrada (§1.5/§1.7): na vez de um monstro ou no
    // fim da batalha, qualquer toque só produz a frase de espera —
    // não abre cartão, não marca alvo, não selecciona.
    if (vezAtual !== PROPRIA || batalhaFim) { fraseEsperaVez(); return; }
    // Passo de seta em curso (E-T13L-2): o toque não chama view.move
    // (a cena cancelaria a fila do passo sem o moveend dele e o
    // desconto da reserva desalinhava).
    if (estado === 'mover' && (passoEmCurso || view.getState().moving)) { say('Espere — ainda está a andar.'); return; }
    /* M-010: enquanto houver um resultado por ler — estado
       'resultado' (antes OU depois do gesto) ou apresentação do
       golpe ainda em curso — o toque NÃO troca de alvo, NÃO repõe o
       estado e NÃO apaga o ataquePendente: responde com a frase de
       espera que o toque no chão já usava neste estado, e o
       Continuar e a frase do golpe sobrevivem. (Antes, o ramo de
       figura repunha estado='base' e ataquePendente=null também a
       partir de 'resultado' — era assim que a saída se destruía.) */
    if (estado === 'resultado' || apresentacaoEmCurso) { say('Aperte <b>Continuar</b> para seguir.'); return; }
    /* J1 (carta IBX-213): com uma rolagem por resolver, o toque
       também não troca de alvo nem a apaga — a rolagem fica até
       ao Confirmar (a protecção do M-010, um estado mais cedo,
       sobre as figuras e sobre o chão). */
    if (rolagemPorResolver()) { say(FRASE_ROLAGEM_PENDENTE); return; }
    /* M1 (§3.3): a guarda única de «decisão por resolver» no
       toque — com um parque de monstro aberto, o toque não troca
       de alvo, não repõe estado nem apaga pendentes (os ramos de
       figura abaixo tratam 'desgraca-lista' como cancelável: era
       a porta lateral medida pela bancada). Na M1 o parque é da
       vez da IA e a intercepção de vez acima já respondeu; esta
       linha é a que fecha a vez dela (o parque de oportunidade
       da M2) e fica lavrada já. */
    if (decisaoPorResolver()) { say(FRASE_DECISAO_PENDENTE); return; }
    const hit = view.hitTest(clientX, clientY);
    if (estado === 'movendo') {
      say(`Espere — <b>${nomeCena(selecionada)}</b> ainda está a andar.`);
      return;
    }
    if (hit.unitId) {
      const fig = unidade(hit.unitId);
      const nome = fig ? fig.nome : nomeCena(hit.unitId);
      if (hit.unitId === PROPRIA) {
        // A própria: abre a ficha dela. Em Mover, o toque nela só diz
        // que ela já está aqui (a casa dela não é destino).
        if (estado === 'mover') {
          say('<b>Ong</b> já está aqui — toque numa casa acesa para andar.');
          return;
        }
        if (estado === 'atacar' || estado === 'rolagem' || estado === 'consumivel' || estado === 'confirmar-fim' || estado === 'desgraca-lista') {
          estado = 'base'; ataquePendente = null; renderAcoes();
        }
        abrirFicha(PROPRIA);
        say('A sua ficha, <b>Ong</b>.');
        return;
      }
      /* Outra figura: NUNCA se torna a figura activa (decisão do
         Mestre, 03/11 07:52). O toque abre o cartão de vista dela
         (T1.1, intacto) e marca-a como ALVO da Ong; a figura activa
         e a vez continuam a ser da Ong. Um estado pendente que esteja
         aberto repõe-se à base, com a faixa a acompanhar. */
      alvo = hit.unitId;
      if (estado === 'mover') sairMover();
      else if (estado === 'atacar' || estado === 'rolagem' || estado === 'consumivel' || estado === 'confirmar-fim' || estado === 'desgraca-lista') {
        estado = 'base'; ataquePendente = null; renderAcoes();
      }
      abrirFicha(hit.unitId);
      say(`<b>${nome}</b> é o seu alvo. Aperte <b>Atacar</b> para a atacar com a Ong, ou <b>Mover</b> para você se aproximar.`);
      return;
    }
    if (estado === 'mover') {
      const cel = casaMotor(hit.cell);
      if (!cel) { say('Toque numa casa do campo para andar.'); return; }
      const u = unidade(selecionada);
      if (u && cel.x === u.posicao.x && cel.y === u.posicao.y) {
        say(`<b>${u.nome}</b> já está nessa casa — escolha outra.`);
        return;
      }
      const destino = alcance.get(chave(cel.x, cel.y));
      if (!destino) {
        supRegistar('bloqueada', { acao: 'mover', actor: PROPRIA, razao: 'Casa fora da reserva de movimento' });
        say(ajudaGrid
          ? 'Essa casa está longe demais — escolha uma das <b>casas acesas</b>.'
          : `Longe demais — você ainda tem <b>${fmtM(reservaMovimento)}</b> nesta vez.`);
        return;
      }
      estado = 'movendo'; parado = false; renderAcoes();
      // O custo (casas do caminho) e o caminho em si ficam pendentes:
      // descontam-se uma única vez, no moveend dela (§3.3/D-13.15).
      custoPendente = destino.passos;
      custoPendentePreco = CASA_M;   // ESCALA: preço capturado no despacho
      caminhoPendente = destino.path;
      view.showMovement([]); view.showHover(null);
      say(`<b>${u ? u.nome : nomeCena(selecionada)}</b> está a andar…`);
      vlabCapturarPartida(destino.path);   // tranche VLAB: adjacências à partida + meio do caminho
      supPartidaMovimentoOng(destino, destino.passos, destino.path);
      view.move(selecionada, casaVista(destino), {
        path: destino.path.map(casaVista),
        durationMs: ritmo(Math.min(1200, Math.max(220, destino.passos * 140)))
      });
      return;
    }
    if (estado === 'resultado') { say('Aperte <b>Continuar</b> para seguir.'); return; }
    if (estado !== 'base') { say('Isso é o chão. Aperte <b>Voltar</b> para regressar às acções base.'); return; }
    say('Isso é o chão. Aperte <b>Mover</b>, toque numa casa acesa. Ficha: toque na figura.');
  }

  /* O tratador de moveend ramifica por quem andou e pelo contexto
     pendente (§4.4): três figuras podem andar nesta tranche. */
  view.on('moveend', async u => {
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
        supRestauroVoo = null;   // EM-TJ12J13-01: a reafirmação geral resolve todas as travessias — o carimbo morre com o pendente
        supRestaurando = true;               // a reafirmação não é movimento de jogo
        for (const su of snapUnidades) {
          const uv = unidade(su.id);
          if (uv && (uv.posicao.x !== su.x || uv.posicao.y !== su.y)) {
            reservasDestinoIA.delete(su.id);   // EMENDA-V1: a reafirmação cancela o voo desta figura — a reserva dele morre com o voo cancelado, antes do move, porque o moveend cancelado é engolido em :2734
            view.move(su.id, casaVista({ x: su.x, y: su.y }), { immediate: true });
          }
        }
        supRestaurando = false;
        supConferirInvariantes('moveend-tardio');
      }
      return;
    }
    /* SAVES (S-CRIT-05, porta C-23): moveend tardio de um monstro com
       restauro pendente — a animação velha pousou a figura fora do
       estado restaurado; reafirma a posição DESTA figura a partir
       do pendente (o pendente em si fica: a Ong pode precisar dele,
       e o ramo de época dela, acima, é quem o consome).
       EM-TJ12J13-01 (porta por proveniência): o ramo só dispara
       para a chegada do voo CARIMBADO ao armar o pendente
       (supRestauroVoo) — e mesmo essa não dispara se a chegada
       casar com o destino do contexto vivo (é o voo NOVO da mesma
       figura a pousar, não a travessia). Sem carimbo, ou resolvida
       a travessia, nenhuma chegada é devolvida: os voos despachados
       já na linha restaurada pousam onde foram despachados. */
    if (supRestauroPendente && supRestauroVoo && u.id === supRestauroVoo.id) {
      const ctxVivo = (contextoIA && contextoIA.id === u.id && contextoIA.destino) ? contextoIA : null;
      const rViva = reservasDestinoIA.get(u.id);
      const chegadaNova =
        (ctxVivo && u.posicao.x === ctxVivo.destino.x && u.posicao.y === ctxVivo.destino.y)
        || (guardaExpiradaIA && guardaExpiradaIA.id === u.id && guardaExpiradaIA.seq > supRestauroVoo.seq)
        || (rViva && u.posicao.x === rViva.x && u.posicao.y === rViva.y);
      if (!chegadaNova) {
        const suR = supRestauroPendente.find(s => s.id === u.id);
        if (suR && (u.posicao.x !== suR.x || u.posicao.y !== suR.y)) {
          supRestaurando = true;
          reservasDestinoIA.delete(u.id);   // EMENDA-V1: idem — voo cancelado pela reafirmação; sem isto, o casamento por destino de :2781 falha contra a posição reafirmada e a reserva fica órfã
          view.move(u.id, casaVista({ x: suR.x, y: suR.y }), { immediate: true });
          supRestaurando = false;
        }
      }
      supRestauroVoo = null;   // EM-TJ12J13-01: a travessia resolveu-se — reafirmada, ou pousada pelo voo novo
    }
    supConferirInvariantes('moveend');         // Supervisor: invariantes após cada movimento
    try { supCritFecharMovimento(u.id); } catch (_) { supCritErrosCamada++; }   // T1.7: fecha o segmento de movimento (passivo)
    if (u.id !== PROPRIA) {
      /* Reserva de destino em voo: esta figura pousou — a reserva
         dela morre aqui, chegue o moveend a tempo ou tarde (depois
         da guarda). O casamento é por destino, como o E-1 do
         contexto: uma chegada a outra casa não liberta a reserva
         de um voo mais novo da mesma figura. Deste instante em
         diante quem ocupa a casa é a própria figura, pela posição. */
      { const rIA = reservasDestinoIA.get(u.id);
        if (rIA && rIA.x === u.posicao.x && rIA.y === u.posicao.y)
          reservasDestinoIA.delete(u.id); }
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
      if (!ctx) {
        /* M-009: chegada TARDIA depois da guarda de 5 s — a vez já
           fechou (sem ataque, e continua sem ataque: a guarda não
           foi redesenhada), mas a chegada já não se engole em
           silêncio: nomeia-se, para a história do ecrã bater com a
           figura que a mesa vê pousada. A marca consome-se aqui —
           uma chegada, uma frase. */
        if (guardaExpiradaIA && guardaExpiradaIA.id === u.id) {
          guardaExpiradaIA = null;
          say(`<b>${nomeCena(u.id)}</b> chegou — tarde demais para atacar nesta vez.`);
        }
        return;
      }
      if (guardaExpiradaIA && guardaExpiradaIA.id === u.id) guardaExpiradaIA = null;   // M-009: chegada normal consome a marca velha
      if (u.id !== vezAtual || ctx.seq !== seqTurno) return;   // sequência morta
      const seq = ctx.seq;
      if (distanciaEntre(u.id, PROPRIA) <= alcanceEmCasas(DADOS_COMBATE[u.id].alcance)) {
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
      reservaMovimento -= casas * (custoPendentePreco != null ? custoPendentePreco : CASA_M);   // ESCALA: cobra o preço do despacho
      custoPendente = null;
      custoPendentePreco = null;
      caminhoPendente = null;
    }
    if (eraPasso) { passoEmCurso = false; reservaMovimento -= (passoPreco != null ? passoPreco : CASA_M); passoPreco = null; }
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
          ? `<b>Ong</b> parou. Restam <b>${fmtM(reservaMovimento)}</b> — continue a andar, ou aperte <b>Cancelar</b> para voltar às acções.`
          : `<b>Ong</b> chegou. Restam <b>${fmtM(reservaMovimento)}</b> — continue a andar, ou aperte <b>Cancelar</b> para voltar às acções.`);
      }
    }
    /* Tranche VLAB: saída de adjacência — se ela partiu de junto
       de inimigos e mudou de casa, o motor valida a saída e os
       ataques de oportunidade resolvem-se aqui, depois das contas
       do movimento (nunca antes da chegada). */
    if (partidaPendente) {
      const partiu = partidaPendente;
      partidaPendente = null;
      const mudouDeCasa = u.posicao.x !== partiu.de.x || u.posicao.y !== partiu.de.y;
      /* Pós-Crítico 3 (achado 3): só há saída de adjacência para os
         inimigos de quem ela se afastou DE FACTO (distância final
         > 1). Orbitar ao lado do mesmo inimigo não é sair: sem AoO,
         sem custo de Desvincular, sem frase de afastamento. */
      const sairamDaZona = partiu.adjacentes.filter(id => distanciaEntre(id, PROPRIA) > 1);
      if (mudouDeCasa && sairamDaZona.length) {
        /* M2 (§4.2): a época captura-se ANTES de chamar o
           resolvedor, que agora pode estacionar; depois do await,
           época morta (ou o sinal de aborto do ciclo) devolve EM
           SILÊNCIO — sem dizer a frase, sem agendar a entrega
           aMorrer, sem reabrir a ficha e sem reagendar o
           automático por cima da batalha restaurada (guarda
           E-C1.7: a viragem fantasma depois de um restauro é o
           defeito que ela existe para não nascer). O custo já foi
           descontado e partidaPendente já foi consumida antes da
           chamada — a fronteira que o desenho mantém. */
        const epocaChamador = supEpoca;
        const saida = await vlabResolverSaidaAdjacencia({ ...partiu, adjacentes: sairamDaZona });
        if ((saida && saida.abortada) || supEpoca !== epocaChamador) return;
        const fraseSaida = saida ? saida.frase : null;
        if (fraseSaida) say(fraseSaida);
        /* Pós-Crítico 3 (achado 2): se o golpe de oportunidade a
           derrubou NA VEZ DELA, a vez entrega-se — sem isto o
           estado 'a-morrer' não tem botões, os monstros nunca agem
           e o relógio de morte (que vive em passarVez) nunca anda. */
        if (!batalhaFim && ESTADO_VLAB.ong.estadoMorte && ESTADO_VLAB.ong.estadoMorte.fase === 'aMorrer')
          setTimeout(() => { if (!batalhaFim) passarVez(); }, ritmo(600));
      }
    }
    if (fichaAberta === u.id) abrirFicha(u.id);   // reabre a ficha/cartão de vista da figura que andou
    if (!batalhaFim && !(ESTADO_VLAB.ong.estadoMorte && ESTADO_VLAB.ong.estadoMorte.fase === 'aMorrer'))
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
  view.on('modelerror', d => { supRegistar('modelo-indisponivel', { id: d && d.id }); if (d && d.message) say(d.message); });

  /* Câmera livre (tranche t-camera-livre, desenho v2): o estado do
     gesto de olhar e a pergunta «a livre está activa?», lidos pelos
     gestos abaixo; quem os preenche é o bloco do Mestre (mais abaixo
     neste ficheiro). Fora do modo livre os gestos são os de sempre —
     o ramo da livre só corre com a câmera em 'livre', e na vista da
     jogadora esse modo nunca chega. */
  let camLivreOlharGesto = null;
  const camLivreActiva = () => { try { return view.getState().camera === 'livre'; } catch (_) { return false; } };

  /* ---------- gestos no mapa (o padrão da demo dele): ----------
   * toque = seleccionar/agir · arrastar = órbita (só 360) ·
   * pinça = zoom · dois dedos ou arrasto >7 px cancelam o toque.
   * Os gestos não lutam: um gesto é uma coisa só, do início ao fim. */
  const ponteiros = new Map();
  let gesto = null, pinca = 0, multi = false;
  mapaEl.addEventListener('pointerdown', e => {
    if (camLivreActiva()) {
      /* Na livre, o toque no mapa é o OLHAR (a sala: arrastar em
         qualquer ponto = olhar à volta). Não selecciona, não joga,
         não chama hitTest. */
      fecharCfg();
      camLivreOlharGesto = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { mapaEl.setPointerCapture(e.pointerId); } catch (_) {}
      return;
    }
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
    if (camLivreActiva()) {
      if (camLivreOlharGesto && camLivreOlharGesto.id === e.pointerId) {
        view.livreOlhar(e.clientX - camLivreOlharGesto.x, e.clientY - camLivreOlharGesto.y);
        camLivreOlharGesto.x = e.clientX; camLivreOlharGesto.y = e.clientY;
      }
      return;
    }
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
    if (camLivreActiva()) {
      if (camLivreOlharGesto && camLivreOlharGesto.id === e.pointerId) camLivreOlharGesto = null;
      return;   // largar o olhar não é clique de jogo: tratarToque não corre
    }
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
      if (camLivreOlharGesto && camLivreOlharGesto.id === e.pointerId) camLivreOlharGesto = null;
      if (camLivreActiva()) return;
      ponteiros.delete(e.pointerId);
      view.showHover(null);
      pinca = 0;
      gesto = null;
    });
  mapaEl.addEventListener('wheel', e => {
    e.preventDefault();
    if (camLivreActiva()) return;   // na livre não há zoom (como na sala): aproxima-se andando para perto
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
  /* ---------- SAIR DAS CONFIGURAÇÕES (lei do Mestre, 11/11 10:36;
   * desenho J8) ----------
   * Três saídas para o MESMO fecho (fecharCfg): a engrenagem
   * alterna; o ✕ fecha; apertar fora fecha. 
   * O ✕ vive numa faixa de cabeçalho PEGAJOSA (position: sticky,
   * em jogo.css): é o primeiro filho do pop-up e fica visível no
   * topo mesmo com a lista rolada até ao fundo — nunca é preciso
   * descer (nem subir) à procura da saída. O título «Apresentação»
   * que já cá vivia muda-se para dentro da faixa. */
  const bandaCfg = document.createElement('div');
  bandaCfg.className = 'cfg-cabecalho';
  const tituloCfgOriginal = cfgEl.querySelector('h3');
  if (tituloCfgOriginal) bandaCfg.appendChild(tituloCfgOriginal);
  const btnFecharCfg = document.createElement('button');
  btnFecharCfg.type = 'button';
  btnFecharCfg.id = 'cfg-fechar';
  btnFecharCfg.className = 'cfg-fechar';
  btnFecharCfg.textContent = '✕';
  btnFecharCfg.setAttribute('aria-label', 'Fechar configurações');
  btnFecharCfg.addEventListener('click', () => fecharCfg());
  bandaCfg.appendChild(btnFecharCfg);
  cfgEl.insertBefore(bandaCfg, cfgEl.firstChild);
  /* Apertar FORA fecha — e o toque é CONSUMIDO por inteiro
   * (fecha-e-não-passa): um ouvinte em CAPTURA sobre document
   * corre antes de os gestos do mapa nascerem (selecção, arrasto
   * de câmera), fecha pelo verbo existente e engole o resto da
   * mesma pressão (pointerup e click), para o toque de fechar não
   * vazar para o mapa atrás do painel. Alvo dentro do painel é uso
   * normal; a engrenagem fica de fora da regra porque já alterna
   * pelo seu próprio ouvinte. */
  let pressaoDeFechoCfg = false;
  document.addEventListener('pointerdown', e => {
    if (cfgEl.hidden) return;
    if (cfgEl.contains(e.target)) return;
    if ($('btn-config').contains(e.target)) return;
    pressaoDeFechoCfg = true;
    fecharCfg();
    e.stopPropagation();
    e.preventDefault();
  }, true);
  document.addEventListener('pointerup', e => {
    if (!pressaoDeFechoCfg) return;
    e.stopPropagation();
    e.preventDefault();
  }, true);
  document.addEventListener('click', e => {
    if (!pressaoDeFechoCfg) return;
    pressaoDeFechoCfg = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
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
  /* S-001+M-016: o botão de alertas é superfície do Supervisor —
     só existe no HTML da vista do Mestre (mestre.html). Na vista
     da Party o elemento não está na página: sem elemento, sem
     ouvinte, sem superfície. */
  const btnAlertaEl = $('btn-alerta');
  if (btnAlertaEl) btnAlertaEl.addEventListener('click', () => say(supAlertas.length
    ? 'Alertas: veja nas configurações (⚙).'
    : 'Alertas: <b>nenhum</b> por agora.'));

  function sincronizarCamera() {
    const modo = view.getState().camera;
    $('cam-fixa').classList.toggle('on', modo === 'fixa');
    $('cam-seguir').classList.toggle('on', modo === 'seguir');
    $('cam-360').classList.toggle('on', modo === '360');
  }
  $('cam-fixa').addEventListener('click', () => {
    view.setCamera('fixa');
    say('Câmera <b>Fixa</b> — você vê o campo todo.');
  });
  $('cam-seguir').addEventListener('click', () => {
    view.setCamera('seguir');
    say('Câmera <b>Seguir</b> — a vista acompanha a figura seleccionada.');
  });
  $('cam-360').addEventListener('click', () => {
    view.setCamera('360');
    say('Câmera <b>360°</b> — arraste no mapa para girar à volta da figura.');
  });

  function mostrarZoom() {
    const s = view.getState();
    if (s.camera === 'livre') {   // na livre o zoom da cena é null (desenho v2 §3): o ⚙ mostra «—» e os botões de zoom dormem
      $('zoom-valor').textContent = '—';
      $('zoom-menos').disabled = true;
      $('zoom-mais').disabled = true;
      return;
    }
    $('zoom-valor').textContent = s.zoom.toFixed(1).replace('.', ',') + '×';
    $('zoom-menos').disabled = s.zoom <= s.zoomRange.min + .001;
    $('zoom-mais').disabled = s.zoom >= s.zoomRange.max - .001;
  }
  function fraseZoom() { if (camLivreActiva()) return; say(`Zoom a <b>${view.getState().zoom.toFixed(1).replace('.', ',')}×</b>.`); }
  /* R-T1-2: fora da câmera 360, orbit() não gira nada — o arrasto que
     virou órbita termina com a frase que aponta o caminho (⚙ → Câmera
     → 360°), em vez de terminar sem resposta nenhuma. */
  function fraseArrasto() {
    if (view.getState().camera === '360') return;
    say('O arrasto só gira na câmera <b>360°</b> — mude em <b>⚙ → Câmera → 360°</b>.');
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
  let autoAtaqueRecusado = false;  // D-REC-01: o ataque básico do controlador já foi recusado NESTA vez

  /* Volta S-001, V-02 (sentença §1, S1C-02): o Automático é
   * ferramenta de teste/supervisão do Mestre (X4/§7.4, inventário
   * A3) — a linha, o botão #tog-auto e o seu ouvinte só NASCEM
   * dentro de if (MODO_MESTRE), na mesma posição relativa do ⚙
   * (antes de #stats, antes da Velocidade na ordem de inserção),
   * por isso no Mestre a ordem e o aspecto do ⚙ não mudam e na
   * Party o controlo não existe. O controlador interno
   * (passoAutomatico/agendarPassoAuto/definirModoAutomatico e as
   * suas variáveis) fica na closure, inerte na Party: aí
   * modoAutomatico nasce false e não existe caminho alcançável
   * que o ligue — sem DOM, sem global, sem persistência — e
   * nenhum caminho executado na Party toca no botão inexistente
   * (botaoAuto fica null e os seus usos são guardados). */
  let botaoAuto = null;
  if (MODO_MESTRE) {
    const linhaAuto = document.createElement('div');
    linhaAuto.className = 'cfgrow';
    const rotuloAuto = document.createElement('span');
    rotuloAuto.className = 'cl';
    rotuloAuto.textContent = 'Modo automático';
    botaoAuto = document.createElement('button');
    botaoAuto.type = 'button';
    botaoAuto.id = 'tog-auto';
    botaoAuto.className = 'tog';
    botaoAuto.textContent = 'Desligado';
    botaoAuto.setAttribute('aria-pressed', 'false');
    linhaAuto.appendChild(rotuloAuto);
    linhaAuto.appendChild(botaoAuto);
    cfgEl.insertBefore(linhaAuto, $('stats'));
    botaoAuto.addEventListener('click', () => definirModoAutomatico(!modoAutomatico));
  }

  /* ---------- Controlo de velocidade (tranche T1.6) ----------
   * Linha «Velocidade» criada aqui (o index.html é sagrado),
   * IMEDIATAMENTE depois da linha do Modo automático e antes de
   * #stats: .cfgrow + rótulo .cl + grupo .seg (a classe já existe
   * no CSS — jogo.css não muda) com os cinco passos. Botão activo
   * com .on. NUNCA na barra de baixo. Sem frase say() nova: o
   * único texto novo é o rótulo e os passos, nas configurações.
   * Trocar grava a preferência (hudt1-velocidade) e marca o .on;
   * o ritmo em si lê-se em `ritmo`, no momento de cada uso.
   * A PORTA (t-config-entrada, sentença J2): a linha só NASCE em
   * MODO_MESTRE — como a do Modo automático — e definirVelocidade
   * fecha também na função. Na vista da jogadora não há linha, não
   * há botões e não há caminho alcançável que grave a chave. */
  const botoesVelocidade = [];
  if (MODO_MESTRE) {
    const linhaVelocidade = document.createElement('div');
    linhaVelocidade.className = 'cfgrow vel';
    const rotuloVelocidade = document.createElement('span');
    rotuloVelocidade.className = 'cl';
    rotuloVelocidade.textContent = 'Velocidade';
    const grupoVelocidade = document.createElement('div');
    grupoVelocidade.className = 'seg';
    grupoVelocidade.setAttribute('role', 'group');
    grupoVelocidade.setAttribute('aria-label', 'Velocidade');
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
  }
  function marcarVelocidade() {
    for (const { v, b } of botoesVelocidade) b.classList.toggle('on', v === velocidade);
  }
  function definirVelocidade(v) {
    if (!MODO_MESTRE) return;
    if (!VELOCIDADES.includes(v)) return;
    velocidade = v;
    try { localStorage.setItem('hudt1-velocidade', String(velocidade)); } catch (_) {}
    marcarVelocidade();
  }
  marcarVelocidade();

  /* ---------- Tela vermelha gradual (C-06/C-07) ----------
   * Linhas «Tela vermelha» e «Piscar da tela vermelha» criadas
   * aqui (o index.html é sagrado), depois da Velocidade e antes
   * de #stats — os interruptores que a palavra dele tornou
   * obrigatórios (04/11/2026 21:23 o geral; 05/11/2026 10:42 o
   * do piscar, separado). O estado, a escala e o ciclo vivem
   * junto das outras preferências (topo); aqui moram só as
   * linhas e os ouvintes, como nas outras opções. Trocar aplica
   * JÁ: desligar o geral apaga a tela mesmo acesa; desligar o
   * piscar deixa o vermelho parado na intensidade da vida. */
  const linhaVermelha = document.createElement('div');
  linhaVermelha.className = 'cfgrow';
  const rotuloVermelha = document.createElement('span');
  rotuloVermelha.className = 'cl';
  rotuloVermelha.innerHTML = 'Tela vermelha<small>avermelha com a vida baixa</small>';
  const togVermelha = document.createElement('button');
  togVermelha.id = 'tog-vermelha';
  togVermelha.className = 'tog';
  togVermelha.type = 'button';
  linhaVermelha.appendChild(rotuloVermelha);
  linhaVermelha.appendChild(togVermelha);
  cfgEl.insertBefore(linhaVermelha, $('stats'));
  function marcarVermelha() {
    togVermelha.classList.toggle('on', telaVermelha);
    togVermelha.textContent = telaVermelha ? 'Ligada' : 'Desligada';
    togVermelha.setAttribute('aria-pressed', String(telaVermelha));
  }
  togVermelha.addEventListener('click', () => {
    telaVermelha = !telaVermelha;
    try { localStorage.setItem('hudt1-tela-vermelha', telaVermelha ? 'ligado' : 'desligado'); } catch (_) {}
    marcarVermelha();
    aplicarTelaVermelha();
    say(telaVermelha
      ? 'Tela vermelha <b>ligada</b> — com a vida baixa, as bordas do ecrã vão avermelhando.'
      : 'Tela vermelha <b>desligada</b> — a vida baixa não pinta as bordas do ecrã.');
  });
  marcarVermelha();

  const linhaPiscar = document.createElement('div');
  linhaPiscar.className = 'cfgrow';
  const rotuloPiscar = document.createElement('span');
  rotuloPiscar.className = 'cl';
  rotuloPiscar.innerHTML = 'Piscar da tela vermelha<small>pulso lento das bordas</small>';
  const togPiscar = document.createElement('button');
  togPiscar.id = 'tog-vermelha-piscar';
  togPiscar.className = 'tog';
  togPiscar.type = 'button';
  linhaPiscar.appendChild(rotuloPiscar);
  linhaPiscar.appendChild(togPiscar);
  cfgEl.insertBefore(linhaPiscar, $('stats'));
  function marcarPiscar() {
    togPiscar.classList.toggle('on', telaVermelhaPiscar);
    togPiscar.textContent = telaVermelhaPiscar ? 'Ligado' : 'Desligado';
    togPiscar.setAttribute('aria-pressed', String(telaVermelhaPiscar));
  }
  togPiscar.addEventListener('click', () => {
    telaVermelhaPiscar = !telaVermelhaPiscar;
    try { localStorage.setItem('hudt1-tela-vermelha-piscar', telaVermelhaPiscar ? 'ligado' : 'desligado'); } catch (_) {}
    marcarPiscar();
    aplicarTelaVermelha();
    say(telaVermelhaPiscar
      ? 'Piscar <b>ligado</b> — o vermelho das bordas pulsa devagar.'
      : 'Piscar <b>desligado</b> — o vermelho das bordas fica parado.');
  });
  marcarPiscar();

  /* ---------- Secção SOM pessoal (tranche t-config-entrada) ----------
   * Os volumes desta pessoa, neste aparelho — as mesmas chaves, os
   * mesmos rótulos e a mesma nota do painel da entrada (a entrada
   * edita o que o jogo lê; aqui edita-se o mesmo, a valer na hora
   * no que estiver a soar). Na batalha soa o ambiente (chuva e
   * trovão): Geral, Efeitos e Mudo aplicam já no master; a Música
   * não tem nada a tocar aqui — guarda-se para o título e DECLARA-O
   * no sub-rótulo (sentença J6: sem sub-rótulo, o reguador saía
   * desta superfície). Os factores e a fórmula vivem junto ao
   * ambAudio («SOM PESSOAL»): master = 0,9 × G × E × mudo ×
   * somDoAmbiente. */
  const NOTA_SOM = 'Música: só a do título — na batalha não há música. Efeitos: hoje, a chuva e o trovão; os sons da batalha usarão este volume quando existirem.';
  const tituloSom = document.createElement('h3');
  tituloSom.textContent = 'Som';
  cfgEl.insertBefore(tituloSom, $('stats'));
  const somUI = {};
  function linhaVolumeSom(chaveCfg, rotulo, sub, ler, aoMudar) {
    const linha = document.createElement('div');
    linha.className = 'cfgrow';
    const rot = document.createElement('span');
    rot.className = 'cl';
    rot.innerHTML = sub ? `${rotulo}<small>${sub}</small>` : rotulo;
    const volctl = document.createElement('div');
    volctl.className = 'volctl';
    const reg = document.createElement('input');
    reg.type = 'range';
    reg.className = 'vol-range';
    reg.min = '0'; reg.max = '100'; reg.step = '1';
    reg.value = String(ler());
    reg.setAttribute('aria-label', rotulo);
    const saida = document.createElement('span');
    saida.className = 'vol-valor';
    saida.textContent = ler() + '%';
    reg.addEventListener('input', () => {
      saida.textContent = reg.value + '%';
      somGravar(chaveCfg, reg.value);
      aoMudar(Number(reg.value));
    });
    volctl.appendChild(reg);
    volctl.appendChild(saida);
    linha.appendChild(rot);
    linha.appendChild(volctl);
    cfgEl.insertBefore(linha, $('stats'));
    return { reg, saida };
  }
  somUI.geral = linhaVolumeSom('hudt1-som-geral', 'Volume geral', null,
    () => somGeral, v => { somGeral = v; ambAudioSincronizarChuva(); });
  somUI.musica = linhaVolumeSom('hudt1-som-musica', 'Música', 'só a do título',
    () => somMusica, v => { somMusica = v; });
  somUI.efeitos = linhaVolumeSom('hudt1-som-efeitos', 'Efeitos', 'chuva, trovão e sons da batalha',
    () => somEfeitos, v => { somEfeitos = v; ambAudioSincronizarChuva(); });
  const linhaMudo = document.createElement('div');
  linhaMudo.className = 'cfgrow';
  const rotuloMudo = document.createElement('span');
  rotuloMudo.className = 'cl';
  rotuloMudo.innerHTML = 'Mudo<small>Nenhum som, sem perder os volumes.</small>';
  const togMudo = document.createElement('button');
  togMudo.type = 'button';
  togMudo.id = 'tog-som-mudo';
  togMudo.className = 'tog';
  linhaMudo.appendChild(rotuloMudo);
  linhaMudo.appendChild(togMudo);
  cfgEl.insertBefore(linhaMudo, $('stats'));
  function marcarMudo() {
    togMudo.classList.toggle('on', somMudo);
    togMudo.textContent = somMudo ? 'Ligado' : 'Desligado';
    togMudo.setAttribute('aria-pressed', String(somMudo));
  }
  togMudo.addEventListener('click', () => {
    somMudo = !somMudo;
    somGravar('hudt1-som-mudo', somMudo ? 'ligado' : 'desligado');
    marcarMudo();
    ambAudioSincronizarChuva();
  });
  marcarMudo();
  somUI.mudo = { tog: togMudo, marcar: marcarMudo };
  const notaSomEl = document.createElement('p');
  notaSomEl.className = 'cfg-nota';
  notaSomEl.textContent = NOTA_SOM;
  cfgEl.insertBefore(notaSomEl, $('stats'));
  /* Restaurar o padrão (sentença J4): lista branca EXPLÍCITA, a
   * mesma da entrada — chave a chave, valores gravados à vista.
   * Proibido repor por prefixo/enumeração/clear(): as chaves do
   * Mestre que vivam neste aparelho ficam byte-idênticas. */
  const linhaRestaurarSom = document.createElement('div');
  linhaRestaurarSom.className = 'cfgrow';
  const btnRestaurarCfg = document.createElement('button');
  btnRestaurarCfg.type = 'button';
  btnRestaurarCfg.id = 'cfg-restaurar';
  btnRestaurarCfg.className = 'cfg-restaurar';
  btnRestaurarCfg.textContent = 'Restaurar o padrão';
  linhaRestaurarSom.appendChild(btnRestaurarCfg);
  cfgEl.insertBefore(linhaRestaurarSom, $('stats'));
  btnRestaurarCfg.addEventListener('click', () => {
    somGravar('hudt1-qualidade', 'alta');
    somGravar('hudt1-numeros-dano', 'ligado');
    somGravar('hudt1-tela-vermelha', 'ligado');
    somGravar('hudt1-tela-vermelha-piscar', 'ligado');
    somGravar('hudt1-som-geral', '100');
    somGravar('hudt1-som-musica', '100');
    somGravar('hudt1-som-efeitos', '100');
    somGravar('hudt1-som-mudo', 'desligado');
    if (qualidade !== 'alta') {
      qualidade = 'alta';
      try { view.setQualidade('alta'); } catch (_) {}
    }
    marcarQualidade();
    try { ambSincronizarPainel(); } catch (_) {}
    numerosDano = true; marcarDanos();
    telaVermelha = true; marcarVermelha();
    telaVermelhaPiscar = true; marcarPiscar();
    aplicarTelaVermelha();
    somGeral = 100; somMusica = 100; somEfeitos = 100; somMudo = false;
    for (const par of [[somUI.geral, 100], [somUI.musica, 100], [somUI.efeitos, 100]]) {
      par[0].reg.value = '100';
      par[0].saida.textContent = '100%';
    }
    marcarMudo();
    ambAudioSincronizarChuva();
    say('Configurações repostas no <b>padrão</b> — neste aparelho.');
  });

  /* ---------- Contador de Vantagem/Desvantagem (tranche C-VD) ----------
   * A caixa da Ong (desenho DESENHO-CONTADOR-VD-v2, adoptado com as
   * emendas EM-VD-01…19): colada ao lado direito da plaquinha dela,
   * a palavra do estado (NEUTRO / VANTAGEM / DESVANTAGEM) e o número
   * de níveis; ao toque (ou com o cursor por cima), o painel explica
   * o porquê, fonte a fonte. A conta é a do motor: as fontes de
   * estado lêem-se por derivação pura dos mesmos sítios onde o
   * adaptador as vai buscar (vlabEstadosDe + desvantagemAtaque) —
   * o adaptador NÃO se chama em prévia, porque chamar
   * vlabResolverAtaqueCompleto rola dados, consome a reacção do
   * alvo e limpa armaCaida (bancada prévia desta tranche; a
   * excepção à conta única de §7.1 fica lavrada como dívida: no dia
   * em que houver uma leitura pura da conta, a caixa passa a ela).
   * Fontes posicionais NÃO entram hoje: o flanco dela e o livro do
   * tiro não estão fiados na conta dela (o adaptador só fia o
   * flanco contra ela) — uma caixa que mostrasse o que o recibo não
   * aplica mentia (período intermédio de §4.4). A caixa mostra a
   * aritmética inteira, sem tecto (EM-VD-18); a linha «a rolagem
   * usa 4, o máximo» NÃO se constrói enquanto a P-VD-1 não for
   * respondida (sentença da bancada prévia desta tranche).
   * Privacidade: a caixa só lê a PROPRIA — nenhum número de outra
   * figura é lido nem mostrado, em nenhum modo. A caixa nasce e
   * morre com a plaquinha (espelha chipEl.hidden). */
  var vdMontado = false;   // os ganchos anteriores a esta secção lêem-no desarmado
  let contadorVdLigado = true;
  try { contadorVdLigado = localStorage.getItem('hudt1-contador-vantagem') !== 'desligado'; } catch (_) {}

  const caixaVd = document.createElement('button');
  caixaVd.type = 'button';
  caixaVd.id = 'contadorvd';
  caixaVd.setAttribute('aria-label', 'Vantagem e Desvantagem da Ong — aperte para ver o porquê');
  const caixaVdPalavra = document.createElement('span');
  caixaVdPalavra.className = 'cvd-palavra';
  const caixaVdNum = document.createElement('span');
  caixaVdNum.className = 'cvd-num';
  caixaVd.appendChild(caixaVdPalavra);
  caixaVd.appendChild(caixaVdNum);
  document.body.appendChild(caixaVd);   // depois do chip no DOM (guarda de camada: z 20)

  const painelVd = document.createElement('div');
  painelVd.id = 'cvd-painel';
  painelVd.hidden = true;
  document.body.appendChild(painelVd);

  /* As fontes de estado DELA, com os nomes do mundo. O nome da
     quebra corporal é o da frase que a jogadora já vê quando ela
     acontece («quebrou algo no corpo» — bancada prévia, Q6). */
  function vdFontesEstado() {
    const fontes = [];
    const estados = vlabEstadosDe(PROPRIA);
    if (estados.includes('caido')) fontes.push({ nome: 'caída', niveis: 1, lado: 'D' });
    if (estados.includes('fraco')) fontes.push({ nome: 'fraca', niveis: 1, lado: 'D' });
    const n = ESTADO_VLAB.ong ? (ESTADO_VLAB.ong.desvantagemAtaque | 0) : 0;
    if (n > 0) fontes.push({ nome: 'quebrou algo no corpo', niveis: n, lado: 'D' });
    return fontes;
  }
  function vdConta() {
    const fontes = vdFontesEstado();
    let v = 0, d = 0;
    for (const f of fontes) { if (f.lado === 'V') v += f.niveis; else d += f.niveis; }
    const bruto = v - d;
    return { fontes, v, d, bruto,
      palavra: bruto > 0 ? 'VANTAGEM' : bruto < 0 ? 'DESVANTAGEM' : 'NEUTRO',
      numero: Math.abs(bruto) };
  }
  /* Declaração = a gaveta do ataque aberta contra um alvo marcado,
     ou a rolagem do Chicote já rolada e por confirmar; o resto é
     repouso. (Hoje os dois modos lêem as mesmas fontes de estado —
     as posicionais ainda não estão na conta dela.) */
  function vdModo() {
    if (estado === 'rolagem' && ataquePendente && ataquePendente.tipo === 'chicote') return 'declaracao';
    if (estado === 'atacar' && alvo && alvo !== PROPRIA) {
      const u = unidade(alvo);
      if (u && u.vivo !== false) return 'declaracao';
    }
    return 'repouso';
  }
  function vdTextoPainel(conta, modo) {
    const cor = conta.bruto > 0 ? 'vd-vantagem' : conta.bruto < 0 ? 'vd-desvantagem' : '';
    let html = `<div class="cvd-titulo ${cor}">${conta.palavra} ${conta.numero}</div>`;
    for (const f of conta.fontes)
      html += `<div class="cvd-linha">— ${f.nome} · ${f.lado === 'V' ? 'Vantagem' : 'Desvantagem'} ${f.niveis}</div>`;
    if (conta.v > 0 && conta.d > 0) {
      const anula = Math.min(conta.v, conta.d);
      html += `<div class="cvd-linha">— a Vantagem ${conta.v} anula ${anula} da Desvantagem ${conta.d}</div>`;
    }
    if (modo === 'repouso')
      html += '<div class="cvd-linha">O flanco e o que estiver no caminho contam quando escolheres um alvo.</div>';
    html += `<div class="cvd-linha">— Fica: <b class="${cor}">${conta.palavra} ${conta.numero}</b></div>`;
    return html;
  }
  /* O painel tem dois donos de abertura (§5.1): o cursor por cima
     (transitório) e o toque (fixado). Sem esta separação, o toque
     num ecrã táctil — que dispara a entrada do cursor antes do
     clique — abriria e fecharia no mesmo gesto. */
  let vdHover = false, vdFixado = false;
  function fecharPainelVd() {
    if (!vdMontado) return;
    vdHover = false; vdFixado = false;
    painelVd.hidden = true;
  }
  function abrirPainelVd() {
    if (!vdMontado || caixaVd.hidden) return;
    painelVd.innerHTML = vdTextoPainel(vdConta(), vdModo());
    painelVd.hidden = false;
    try {
      const r = caixaVd.getBoundingClientRect();
      const largura = Math.min(280, window.innerWidth - 20);
      let left = r.left;
      if (left + largura > window.innerWidth - 10) left = window.innerWidth - 10 - largura;
      if (left < 10) left = 10;
      painelVd.style.left = left + 'px';
      painelVd.style.bottom = (window.innerHeight - r.top + 8) + 'px';
      /* Nunca cruza a linha do meio do ecrã (EM-VD-12): o que não
         couber rola dentro do painel. */
      painelVd.style.maxHeight = Math.max(90, (r.top - 8) - window.innerHeight / 2) + 'px';
    } catch (_) {}
  }
  let vdUltimo = null;   // { modo, vezKey, chave } — realce e fechos do painel
  function atualizarContadorVD() {
    if (!vdMontado) return;
    const vezKey = rodada + ':' + indiceVez;
    const modo = vdModo();
    /* Fechos do painel (§5.1): a vez muda, o modo muda, ou entra o
       cartão da desgraça (guarda da bancada) — o painel nunca fica
       a explicar uma conta velha. */
    if (vdUltimo && (vdUltimo.vezKey !== vezKey || vdUltimo.modo !== modo || estado === 'desgraca-lista'))
      fecharPainelVd();
    caixaVd.hidden = !contadorVdLigado || !!chipEl.hidden;
    if (caixaVd.hidden) { fecharPainelVd(); vdUltimo = { modo, vezKey, chave: null }; return; }
    const conta = vdConta();
    const chave = conta.palavra + ' ' + conta.numero;
    caixaVdPalavra.textContent = conta.palavra;
    caixaVdNum.textContent = String(conta.numero);
    caixaVd.classList.toggle('vd-vantagem', conta.bruto > 0);
    caixaVd.classList.toggle('vd-desvantagem', conta.bruto < 0);
    if (vdUltimo && vdUltimo.chave !== null && vdUltimo.chave !== chave) {
      caixaVd.classList.remove('cvd-pulso');
      void caixaVd.offsetWidth;   // reinicia a animação do realce breve (§1.5)
      caixaVd.classList.add('cvd-pulso');
    }
    if (!painelVd.hidden) painelVd.innerHTML = vdTextoPainel(conta, modo);
    vdUltimo = { modo, vezKey, chave };
  }
  /* Rato e toque têm leis diferentes (§5.1): o rato manda pelo
     cursor (entra abre, sai fecha; o clique do rato não fixa
     nada); o toque manda pelo toque (toca abre, toca fecha).
     Num toque, o navegador dispara uma «entrada do cursor» e um
     clique sintéticos: duas bandeiras de uso único marcam a
     origem para esses dois serem lidos como toque, nunca como
     rato — sem depender de relógios. */
  let vdHoverSintetico = false, vdOrigemClique = '';
  caixaVd.addEventListener('pointerdown', e => {
    if (!e) return;
    if (e.pointerType === 'touch') { vdHoverSintetico = true; vdOrigemClique = 'toque'; }
    else if (e.pointerType === 'mouse') vdOrigemClique = 'rato';
  });
  caixaVd.addEventListener('mouseenter', () => {
    if (vdHoverSintetico) { vdHoverSintetico = false; return; }
    vdHover = true; abrirPainelVd();
  });
  caixaVd.addEventListener('mouseleave', () => { vdHover = false; if (!vdFixado) painelVd.hidden = true; });
  caixaVd.addEventListener('click', () => {
    const origem = vdOrigemClique; vdOrigemClique = '';
    if (origem === 'rato') return; /* clique de rato: quem manda é o cursor */
    /* toque — ou clique sem pressão (teclado/leitor de ecrã): alterna */
    vdFixado = !vdFixado;
    if (vdFixado) abrirPainelVd();
    else if (!vdHover) painelVd.hidden = true;
  });
  document.addEventListener('pointerdown', e => {
    if (painelVd.hidden || typeof painelVd.contains !== 'function') return;
    if (e.target !== caixaVd && !painelVd.contains(e.target) && !caixaVd.contains(e.target)) fecharPainelVd();
  });

  /* O interruptor (§8 / EM-VD-14): nasce Ligado, vive no ⚙ junto
     aos outros interruptores de apresentação; desligado esconde a
     caixa E o painel. A explicação das fontes é desta caixa — com
     ela desligada, o líquido continua na frase de cada rolagem. */
  const linhaVd = document.createElement('div');
  linhaVd.className = 'cfgrow';
  const rotuloVd = document.createElement('span');
  rotuloVd.className = 'cl';
  rotuloVd.innerHTML = 'Contador de Vantagem<small>a Vantagem e a Desvantagem dela, junto à ficha</small>';
  const togVd = document.createElement('button');
  togVd.id = 'tog-contador-vantagem';
  togVd.className = 'tog';
  togVd.type = 'button';
  linhaVd.appendChild(rotuloVd);
  linhaVd.appendChild(togVd);
  cfgEl.insertBefore(linhaVd, $('stats'));
  function marcarVd() {
    togVd.classList.toggle('on', contadorVdLigado);
    togVd.textContent = contadorVdLigado ? 'Ligado' : 'Desligado';
    togVd.setAttribute('aria-pressed', String(contadorVdLigado));
  }
  togVd.addEventListener('click', () => {
    contadorVdLigado = !contadorVdLigado;
    try { localStorage.setItem('hudt1-contador-vantagem', contadorVdLigado ? 'ligado' : 'desligado'); } catch (_) {}
    marcarVd();
    atualizarContadorVD();
    say(contadorVdLigado
      ? 'Contador de Vantagem <b>ligado</b> — junto à ficha dela, a caixa mostra a Vantagem ou a Desvantagem das rolagens dela; aperte a caixa para ver o porquê.'
      : 'Contador de Vantagem <b>desligado</b> — a caixa esconde-se; o líquido continua na frase de cada rolagem.');
  });
  marcarVd();
  vdMontado = true;
  atualizarContadorVD();

  function definirModoAutomatico(ligado) {
    modoAutomatico = !!ligado;
    geracaoAuto++;                       // pendente de outra geração nunca corre
    if (relogioAuto) { clearTimeout(relogioAuto); relogioAuto = null; }
    if (botaoAuto) {   // V-02: na Party o botão não existe — nunca tocar nele nem lançar por ele faltar
      botaoAuto.classList.toggle('on', modoAutomatico);
      botaoAuto.textContent = modoAutomatico ? 'Ligado' : 'Desligado';
      botaoAuto.setAttribute('aria-pressed', String(modoAutomatico));
    }
    if (modoAutomatico) agendarPassoAuto();
  }
  function agendarPassoAuto() {
    if (!campoPronto) return;
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
    if (!campoPronto) return;
    if (!modoAutomatico || supCongelado || batalhaFim || vezAtual !== PROPRIA) return;
    if (apresentacaoEmCurso) { agendarPassoAuto(); return; }   // T-D: o gesto manda — o passo espera e reagenda (a apresentação da cena NÃO escala com a velocidade: a 3× o passo de 283 ms chegaria a meio dos 0,70 s)
    if (estado === 'movendo') return;    // a animação manda: o moveend retoma
    if (estado === 'desgraca-lista') { agendarPassoAuto(); return; }   // T-DESGRACA-NADA: a lista é decisão do Mestre — o automático espera, como espera pela proposta por confirmar
    if (estado === 'rolagem') {
      if (ataquePendente && ataquePendente.tipo === 'transformacao') { agendarPassoAuto(); return; }
      /* Tranche VLAB (pós-Crítico 3, achado 1): uma desgraça em modo
         «proposta» também NUNCA se confirma sozinha — é uma proposta
         H10 à espera do Mestre, como a Transformação: o automático
         reagenda e a decisão fica parada para confirmação manual. */
      const fcPend = ataquePendente && ataquePendente.vlab && ataquePendente.vlab.soDoMestre
        && ataquePendente.vlab.soDoMestre.falhaCritica;
      if (fcPend && fcPend.requerConfirmacao) { agendarPassoAuto(); return; }
      tratarAcao('confirmar'); agendarPassoAuto(); return;
    }
    if (estado === 'resultado') { tratarAcao('continuar'); agendarPassoAuto(); return; }
    if (estado === 'mover') { tratarAcao('cancelar'); agendarPassoAuto(); return; }
    if (estado === 'consumivel') { tratarAcao('voltar'); agendarPassoAuto(); return; }
    if (estado === 'confirmar-fim') { tratarAcao('voltar'); agendarPassoAuto(); return; }   // M-014: o automático nunca termina a batalha sozinho — a confirmação é gesto da mesa
    if (estado === 'atacar') {
      if (!autoAtaqueEmCurso) { tratarAcao('voltar'); agendarPassoAuto(); return; }
      autoAtaqueEmCurso = false;
      const seqAntesRecusa = supSeq;
      const armaCaidaAntes = ESTADO_VLAB.ong.armaCaida === true;
      tratarAcao('ataque-basico');
      /* D-REC-01: se a tentativa não produziu rolagem (o estado
       * ficou 'atacar') e não foi progresso (apanhar a arma caída
       * muda o estado das coisas — essa pode repetir-se), a recusa
       * fica marcada para ESTA vez: o motor recusou (evento
       * 'bloqueada' registado nesta chamada) ou a arma está
       * partida, e o ataque nunca passaria. Sem esta memória, o
       * controlador voltava à base e reabria a gaveta para
       * sempre — a batalha automática encravava. Com a marca, o
       * planeamento encerra a vez, como nos outros ramos sem
       * progresso deste controlador. */
      if (estado === 'atacar' && !(armaCaidaAntes && ESTADO_VLAB.ong.armaCaida !== true)
          && (ESTADO_VLAB.ong.armaQuebrada === true
            || supRegisto.some(e => e.seq > seqAntesRecusa && e.tipo === 'bloqueada' && e.acao === 'ataque-basico')))
        autoAtaqueRecusado = true;
      agendarPassoAuto(); return;
    }
    if (estado !== 'base') return;
    if (atacou) { tratarAcao('encerrar'); agendarPassoAuto(); return; }   // P-A: um encerrar recusado (uma figura ainda a andar na cena) não pode matar o controlador — reagenda e tenta outra vez no seu ritmo, como já faz à espera da apresentação
    if (autoAtaqueRecusado) { tratarAcao('encerrar'); agendarPassoAuto(); return; }   // D-REC-01: sem outra acção ofensiva do controlador (Transformação e consumível nunca são automáticos), a vez encerra — P-A: com reagendamento, como no ramo do atacou
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
    if (menor <= alcanceEmCasas(DADOS_COMBATE.ong.alcance)) {
      tratarAcao('atacar');
      if (estado === 'atacar') { autoAtaqueEmCurso = true; agendarPassoAuto(); }
      else { tratarAcao('encerrar'); agendarPassoAuto(); }   // P-A: idem — o encerrar de recurso também reagenda
      return;
    }
    if (autoJaMoveu) { tratarAcao('encerrar'); agendarPassoAuto(); return; }   // P-A: idem
    const destino = escolherDestinoAuto(alvoId);
    if (!destino) { try { supCritAutoSemDestino(); } catch (_) { supCritErrosCamada++; } tratarAcao('encerrar'); agendarPassoAuto(); return; }   // P-A: idem
    autoJaMoveu = true;
    /* O movimento automático é o do toque, tal e qual: estado
     * 'movendo', custo/caminho pendentes, view.move com a mesma
     * fórmula de duração — o desconto único acontece no moveend
     * dela, como no toque. */
    const u = unidade(selecionada);
    estado = 'movendo'; parado = false; renderAcoes();
    custoPendente = destino.passos;
    custoPendentePreco = CASA_M;   // ESCALA: preço capturado no despacho
    caminhoPendente = destino.path;
    view.showMovement([]); view.showHover(null);
    say(`<b>${u ? u.nome : nomeCena(selecionada)}</b> está a andar…`);
    vlabCapturarPartida(destino.path);   // tranche VLAB: adjacências à partida + meio do caminho
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
  /* S-001+M-016: elementos da superfície de bastidores — criados
     SÓ no bloco do Mestre, mais abaixo; na Party ficam null e
     todas as escritas neles são guardadas (a camada interna do
     Supervisor — validação, invariantes, snapshots — continua a
     correr igual nas duas vistas; o que muda é só a superfície). */
  let alertasSupEl = null, preSupEl = null, supUltimoEl = null, dicasSupEl = null;

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
    partidaPendente = null;   // pós-Crítico 3 (achado 3): uma partida cuja guarda expirou não resolve AoO tardios
    if (estado === 'movendo') { estado = 'base'; renderAcoes(); }
    supRegistar('guarda', { acao: 'mover', actor: PROPRIA, razao: 'O moveend dela não chegou em 5 s — movimento destravado sem desconto' });
    agendarPassoAuto();   // destravada, o Modo automático pode retomar
  }
  /* Só os ataques dirigidos a outra figura usam alvo e alcance.
     A confirmação chama novamente esta validação: o alvo pode ter
     mudado desde a escolha. Isso não é uma verificação duplicada. */
  function validarAlvoAtaqueOng(contexto) {
    if (!alvo) return { razao: 'Sem alvo escolhido',
      mensagem: 'Primeiro <b>toque no inimigo</b> que você quer atacar — ele fica marcado como alvo.' };
    const u = unidade(alvo);
    if (!u || u.vivo === false) return { razao: 'O alvo já não está na batalha',
      mensagem: 'O alvo já não está na batalha — escolha outro inimigo.' };
    if (distanciaAte(alvo) > alcanceEmCasas(DADOS_COMBATE.ong.alcance)) return { razao: 'Alvo fora de alcance',
      mensagem: fraseForaDeAlcance(alvo, contexto) };
    return null;
  }
  /* Validação das acções DELA, única em cada chamada a tratarAcao.
     A casca apresenta a mensagem devolvida; o Supervisor regista
     a mesma recusa. O débito continua exclusivamente no Confirmar. */
  function supValidarAcaoOng(acao) {
    if (acao === 'atacar') {
      if (estado === 'movendo' || view.getState().moving) return { razao: 'A figura ainda está a andar',
        mensagem: 'Espere — a figura ainda está a andar.' };
      if (atacou) return { razao: 'A Ong já atacou nesta vez',
        mensagem: 'A <b>Ong</b> já atacou nesta vez — aperte <b>Encerrar</b> para fechar a vez dela.' };
      /* Emenda da bancada (sentença Q1-(B) da tranche da página):
         COM alvo escolhido, a recusa de alvo morto ou fora de
         alcance regista-se já na casca «atacar», pela mesma régua
         de «ataque-basico» — a telemetria do Supervisor diz a
         verdade nos dois passos. SEM alvo, devolve null e a
         gaveta abre (F1 julgado: a Transformação é alcançável). */
      if (alvo) {
        const bloqueioAlvo = validarAlvoAtaqueOng('atacar');
        if (bloqueioAlvo) return bloqueioAlvo;
      }
      return null;
    }
    if (acao === 'ataque-basico') {
      if (estado !== 'atacar' || atacou) return { razao: 'Ataque básico sem condições para acontecer', duro: true, mensagem: atacou ? 'A <b>Ong</b> já atacou nesta vez — aperte <b>Encerrar</b> para fechar a vez dela.' : 'Primeiro aperte <b>Atacar</b> para escolher o golpe.' };
      return validarAlvoAtaqueOng('atacar');
    }
    if (acao === 'transformacao') {
      if (transformada) return { razao: 'A Ong já está transformada',
        mensagem: 'A <b>Ong</b> já está transformada.' };
      return null;
    }
    if (acao === 'confirmar') {
      if (!ataquePendente) return { razao: 'Nada para confirmar',
        mensagem: 'É a vez da <b>Ong</b>.', limparPendente: true };
      if (ataquePendente.tipo === 'transformacao') {
        if (transformada) return { razao: 'A Ong já está transformada',
          mensagem: 'A <b>Ong</b> já está transformada.', limparPendente: true };
        const t = DADOS_COMBATE.ong.transformacao;
        const livre = FICHAS.ong.alma.total - FICHAS.ong.alma.comprometido - paGasto;
        if (livre < t.custo) return { razao: 'Alma livre não chega para a Transformação',
          mensagem: `Alma livre não chega — a Transformação custa ${t.custo} PA.`, limparPendente: true };
      } else {
        const bloqueio = validarAlvoAtaqueOng('confirmar');
        if (bloqueio) return { ...bloqueio, limparPendente: true };
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
        return { razao: 'Não pode encerrar a vez enquanto anda', duro: true, mensagem: 'Espere — a figura ainda está a andar.' };
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
    /* Tranche VLAB: o tecto da reserva passa a ser o dobro da base —
       o Correr dobra o deslocamento (18 m). As metades (Fraca/corpo
       partido) só baixam a base; o invariante guarda o tecto absoluto. */
    if (reservaMovimento < -1e-9 || reservaMovimento > 2 * DESLOCAMENTO_ONG_M + 1e-9)
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
   * Recomeçar — a Ong NÃO caiu (sem fimDeBatalha, sem setVivo). A
   * razão nunca se anuncia na superfície de jogo: no Mestre vive
   * em #sup-alertas; na Party o gelo diz só a frase honesta do
   * V-04 (sentença §4), sem a razão e sem vocabulário de sistema. */
  function supCongelar(razao) {
    if (supCongelado) return;
    supCongelado = true;
    /* M1 (§3.5 do desenho, E-C1.1): o gelo é CANCELADOR do
       parque — o relógio de invariantes (500 ms) corre durante o
       parque e pode congelar a batalha a meio dele; sem o fecho,
       a promessa de atacarIA ficava pendurada para sempre (a
       re-conferência de época só corre depois de assentar). */
    fecharDesgracaMonstro({ morta: true });
    continuarAposApresentacao = false;   // R1-Priv: o Continuar diferido morre no gelo — não atravessa épocas
    supEpoca++;                          // guarda de época: moveend tardio dela não acerta contas
    supDesarmarGuardaMovimentoOng();
    supRestauroVoo = null;   // EM-TJ12J13-01: limpeza defensiva — no gelo nenhuma travessia se reafirma
    supAlertas.push({ rodada, vez: vezAtual, razao });
    supRegistar('alerta', { razao, congelou: true });
    /* Evento terminal do congelamento (pós-críticos T1.5): o
       registo marca onde a batalha parou e porquê. */
    supRegistar('fim', { actor: PROPRIA, congelamento: true, razao });
    supRenderAlertas();
    if (!MODO_MESTRE) {
      /* Volta S-001, V-04 (sentença §4, S1C-03): só na Party, o gelo
         diz-se NA HORA, pelo say() existente — frase honesta e
         distinta do fim natural, sem a razão (que nunca aparece na
         Party: nem na frase, nem no DOM, nem em título de botão) e
         sem vocabulário de sistema. O único algarismo é o nº de
         ordem deste alerta na sessão (supAlertas.length depois do
         registo), para o Mestre cruzar com o registo da sua cópia.
         Emite-se uma vez: a guarda supCongelado já o garante. No
         Mestre nada muda — a razão continua visível em #sup-alertas. */
      say(`A batalha parou por um erro do jogo — aperte <b>Recomeçar</b>. Se você puder, diga ao Mestre que parou no erro nº ${supAlertas.length}.`);
    }
    geracaoAuto++;
    if (relogioAuto) { clearTimeout(relogioAuto); relogioAuto = null; }
    seqTurno++;                          // continuações da IA morrem
    if (contextoIA) consumirContextoIA(contextoIA.id);
    reservasDestinoIA.clear();   // o mundo congela neste instante: reservas do mundo velho não vazam
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
      danoSofrido, paGasto, transformada, reservaMovimento, atacou, alvo,
      /* Tranche VLAB (pós-Crítico 3, achado 5): o estado do motor
         (estados, arma caída/quebrada, desvantagem, deslocamento a
         metade, reacção, corrida de morte) TAMBÉM entra no snapshot
         — voltar a um turno anterior repõe o combate inteiro, não
         só a casca clássica. Cópia profunda: o snapshot é um valor,
         nunca uma referência viva. */
      vlab: JSON.parse(JSON.stringify(ESTADO_VLAB)),
      /* Tranche AMBIENTE: o ambiente é estado da PARTIDA — entra no
         snapshot como cópia do estado semântico, com a versão da
         curva registada (só registo; os derivados recalculam-se). */
      ambiente: { ...ambientePartida },
      ambienteCurva: 'v1',
      /* Tranche ESCALA: a escala é estado da PARTIDA — entra no
         snapshot (o «voltar» repõe a escala daquele turno). */
      escala: CASA_M,
      /* Tranche VISÃO: o modo/forma/prazo da visão são estado da
         PARTIDA — entram no snapshot (o «voltar» repõe a visão
         daquele turno; a memória da Ultra não viaja — nasce vazia). */
      visao: { ...visaoPartida },
      /* RAIO E FOGO (desenho 05/11): casas a arder e figuras
         A Arder são estado da BATALHA — entram no snapshot do
         Supervisor como o ambiente. NÃO entram nos ficheiros de
         save (o estado do Ambiente guardado continua a ser
         {hora, chuva, raios}). */
      raioFogo: {
        casas: [...rfCasas.values()].map(c => ({ x: c.x, y: c.y, combustivel: c.combustivel, idade: c.idade })),
        aArder: [...rfAArder],
        /* EM-AV2-06: a memória do último tick entra no snapshot —
           sem ela, o restauro limpava-a e um monstro restaurado
           podia tickar segunda vez na mesma ronda. */
        ultimoTick: [...rfUltimoTick]
      }
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
    /* S-001+M-016: «Voltar ao último estado bom» é ferramenta do
       Mestre. Fora da vista do Mestre recusa à entrada — estado
       intacto, nada restaura — mesmo que algum chamador exista. */
    if (!MODO_MESTRE) {
      supRegistar('restauro', { ok: false, razao: 'Restauro só na vista do Mestre' });
      return;
    }
    if (supPilha.length < 2) {
      supRegistar('restauro', { ok: false, razao: 'Sem turno anterior guardado' });
      /* EXP-R2: o clique sem estado anterior responde DENTRO das
         configurações (linha #sup-ultimo) — sem say() novo. */
      if (supUltimoEl) supUltimoEl.textContent = 'Ainda não há um estado anterior guardado.';
      return;
    }
    /* M1 (§3.5 do desenho): o restauro que de facto corre MATA
       um parque de monstro aberto — o fecho entra só aqui, no
       caminho que restaura (depois das recusas de entrada: um
       «Voltar» sem snapshot não pode matar um parque). A vez
       restaurada recomeça pelo anúncio, sem a desgraça morta. */
    fecharDesgracaMonstro({ morta: true });
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
    /* EM-TJ12J13-01: carimba o voo de monstro seguido NESTE instante
       (antes de o contexto ser consumido abaixo): só a chegada dele
       pode ser reafirmada pelo ramo de monstro do moveend. */
    const vooAoArmar = (contextoIA && contextoIA.destino)
      ? { id: contextoIA.id, seq: contextoIA.seq }
      : (guardaExpiradaIA ? { id: guardaExpiradaIA.id, seq: guardaExpiradaIA.seq } : null);
    if (vooAoArmar) supRestauroVoo = vooAoArmar;
    // se vooAoArmar é null, PRESERVA o carimbo anterior ainda não resolvido:
    // uma travessia por resolver não morre por um segundo restauro sem voo seguido
    supDesarmarGuardaMovimentoOng();
    geracaoAuto++;
    if (relogioAuto) { clearTimeout(relogioAuto); relogioAuto = null; }
    seqTurno++;
    if (contextoIA) consumirContextoIA(contextoIA.id);
    reservasDestinoIA.clear();   // o restauro substitui o mundo: os voos da linha abandonada já não prometem casas
    for (const su of snap.unidades) {
      const u = unidade(su.id);
      if (u && (u.posicao.x !== su.x || u.posicao.y !== su.y))
        view.move(su.id, casaVista({ x: su.x, y: su.y }), { immediate: true });
      const uv = unidade(su.id);
      if (uv && (uv.vivo !== false) !== su.vivo) {
        /* FUSÃO T-D (casca-td §1.3): restauro de figura morta entra
           pela pose de morte rápida quando a cena a tem; na cena
           sagrada do vivo cai no setVivo de sempre. */
        if (su.vivo === false && typeof view.apresentarMorte === 'function') {
          try {
            const pm = view.apresentarMorte(su.id, { rapido: true });
            if (pm && pm.catch) pm.catch(() => {});
          } catch (_) { view.setVivo(su.id, false); }
        } else view.setVivo(su.id, su.vivo);
      }
    }
    danoSofrido = snap.danoSofrido; paGasto = snap.paGasto;
    transformada = snap.transformada;
    reservaMovimento = snap.reservaMovimento; atacou = snap.atacou;
    alvo = snap.alvo;
    /* Pós-Crítico 3 (achado 5): o estado VLAB do snapshot volta
       com o resto — campo a campo, por unidade. Snapshots antigos
       (sem o campo) mantêm o estado actual, declarado. As intenções
       transitórias da vez (partida, correr, desvincular) nascem
       limpas, como num iniciarVez. */
    if (snap.vlab) for (const id of Object.keys(ESTADO_VLAB)) {
      const sv = snap.vlab[id]; if (!sv) continue;
      const e = ESTADO_VLAB[id];
      e.danoSofrido = sv.danoSofrido | 0;   // A01: a Vida interna dos monstros volta com o resto do estado
      e.estados = [...(sv.estados || [])];
      e.armaCaida = !!sv.armaCaida; e.armaQuebrada = !!sv.armaQuebrada;
      e.desvantagemAtaque = sv.desvantagemAtaque | 0;
      e.deslocMetade = !!sv.deslocMetade;
      e.reacaoDisponivel = sv.reacaoDisponivel !== false;
      e.estadoMorte = sv.estadoMorte ? { ...sv.estadoMorte } : null;
    }
    partidaPendente = null; correrUsado = false; opcoesMovimento.desvincular = false;
    /* Tranche AMBIENTE: o ambiente do snapshot volta com o resto —
       válido aplica-se JÁ (imediato); ausente/inválido repõe a
       Noite seca do ritual e DECLARA-SE no registo (sem silêncio). */
    if (snap.ambiente && ambDominioValido(snap.ambiente)) {
      ambAssentar({ hora: snap.ambiente.hora, chuva: snap.ambiente.chuva, raios: snap.ambiente.raios, precip: snap.ambiente.precip === 'neve' ? 'neve' : 'chuva' }, { imediato: true });
    } else {
      ambAssentar({ ...AMBIENTE_RITUAL }, { imediato: true });
      supRegistar('ambiente', { origem: 'supRestaurar',
        razao: snap.ambiente ? 'Ambiente do snapshot inválido — Noite seca do ritual aplicada'
                             : 'Snapshot sem ambiente — Noite seca do ritual declarada' });
    }
    /* Tranche ESCALA: a escala do snapshot volta com o resto, em
       silêncio. Snapshot antigo sem o campo mantém a escala actual
       (declarado — sem default inventado por cima dela). */
    if (typeof snap.escala === 'number' && ESCALAS_CASA_M.includes(snap.escala))
      escalaAssentar(snap.escala, { silencioso: true });
    /* Tranche VISÃO: a visão do snapshot volta com o resto, em
       silêncio, com a memória da Ultra limpa (a batalha restaurada
       não herda lembranças). Snapshot antigo sem o campo mantém a
       visão actual (declarado — como a escala). */
    if (snap.visao && visaoDominioValido(snap.visao))
      visaoAssentar({ ...snap.visao }, { silencioso: true, limparMemoria: true });
    /* RAIO E FOGO: o fogo da batalha volta com o resto do snapshot
       (snapshot sem o campo — anterior à tranche — apaga tudo). */
    ambRestaurarFogo(snap.raioFogo);
    /* C-39: declarações de reacção são decisões da linha do tempo
       abandonada — o restauro apaga-as todas, como o Continuar. */
    for (const idDecl of Object.keys(REACCOES_DECLARADAS)) delete REACCOES_DECLARADAS[idDecl];
    /* C-06/C-07: o restauro volta a uma batalha viva — a morte
       adjudicada da linha abandonada não pode deixar a tela
       vermelha acesa nesta. */
    mortePropriaAdjudicada = false; aplicarTelaVermelha();
    rodada = snap.rodada; indiceVez = snap.indiceVez;
    ataquePendente = null; custoPendente = null; caminhoPendente = null;
    continuarAposApresentacao = false;   // R1-Priv: o Continuar diferido morre no restauro — pertencia à linha do tempo abandonada
    passoEmCurso = false; parado = false;
    /* Caso 12 VLAB (medido na sonda de 04/11): um snapshot só
       nasce num arranque de vez (iniciarVez/iniciarVezIA), nunca
       depois do fim — logo todo o snapshot da pilha é um estado
       NÃO terminal de uma batalha a correr. Com o VLAB, o
       vivo=false da vista também é o estado intermédio aMorrer
       (ela caiu, a corrida de morte corre e a batalha continua
       à volta dela), não só a morte adjudicada. Limpar
       batalhaFim só com vivo=true deixava o restauro pós-FIM
       preso no «FIM» sempre que o turno anterior era um turno
       dela caída (snapshot medido: rodada 2, vez do Orc, Ong
       aMorrer 0/1, dano 99): o turno restaurado anunciava-se
       mas a continuação da IA morria na guarda batalhaFim e
       nenhuma acção retomava. O restauro repõe um estado de
       batalha viva: batalhaFim limpa-se sempre. */
    batalhaFim = false;
    supPilha.length = idx + 1;                   // o futuro velho sai da pilha
    supCongelado = false;                        // voltar é também a saída do congelamento
    atualizarChipVida();
    supRestaurando = false;
    supRegistar('restauro', { ok: true, rodadaSnap: snap.rodada, vezSnap: snap.vez });
    /* EXP-R2: confirmação do voltar DENTRO das configurações
       (linha #sup-ultimo) — sem say() novo. */
    if (supUltimoEl) supUltimoEl.textContent = `Voltado ao turno anterior — rodada ${snap.rodada}, vez de ${nomeCena(snap.vez)}.`;
    if (snap.vez === PROPRIA) {
      iniciarVez(PROPRIA);
      say(`É a vez da <b>Ong</b> (rodada ${rodada}).`);
    } else {
      iniciarVezIA(snap.vez, false);
    }
    supConferirInvariantes('restauro');
  }

  /* ---------- ponte de estado para saves (tranche SAVES, C-23;
   * desenho DESENHO-SAVES com as adendas da Volta 1 (CRITICA-SAVES-01)
   * e da Volta 2 (JULGAMENTO-SAVES, via (α) completa); LIBERA da
   * conferência dirigida — aqui PORTADA para a base REF_5) ----------
   * Fronteira VERDADEIRA pós-(α) (desenho, adenda da Volta 2): esta
   * ponte fala do estado vivo em memória e NÃO é inócua — quem a
   * accionar lê a semente e pode escrever o estado. Por isso nasce
   * INACTIVA: só responde depois de registarModuloSaves() com o
   * token que vive APENAS em saves-mestre.js. Aqui mora só o DIGEST
   * SHA-256 do token (o mesmo token rodado da Volta 2 — o anterior,
   * cujo djb2 era público e colidível, aposentou-se): o SHA-256 é
   * resistente a pré-imagem, logo o digest público NÃO permite
   * forjar uma cadeia que active a ponte (a cadeia da conferência
   * que colidia no djb2 falha contra este mecanismo — provado na
   * sonda da Volta 2). A outra metade da fronteira: saves-mestre.js
   * e mestre.html estão FORA do artefacto publicado da Party
   * (manifesto NÃO-PUBLICAR) — quem tem o link da Party não lê o
   * token literal em sítio nenhum servido. A ponte não conhece
   * chaves de armazenamento nem localStorage de saves; quem
   * lê/escreve saves é o módulo do Mestre. */
  let ponteSavesActiva = false;
  const DIGEST_TOKEN_SAVES = '19c7ed94fea93c93a2ac913985bc1452b1d4503aa865463e0ee589dd586d58bc';   // SHA-256 do token rodado (o token vive só em saves-mestre.js)
  /* SHA-256 compacto SÍNCRONO (o registo da ponte é síncrono; não
     se usa crypto.subtle, que é assíncrono e depende de contexto
     seguro). Implementação de referência (FIPS 180-4) sobre os
     bytes UTF-8 da cadeia; conferida contra node:crypto em 312
     casos (sonda da Volta 2). Devolve o hex minúsculo. */
  function sha256HexSaves(str) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    const utf8 = unescape(encodeURIComponent(str));
    const len = utf8.length;
    const bytes = [];
    for (let i = 0; i < len; i++) bytes.push(utf8.charCodeAt(i));
    const bitLen = len * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    const hi = Math.floor(bitLen / 4294967296), lo = bitLen >>> 0;
    for (let i = 3; i >= 0; i--) bytes.push((hi >>> (i * 8)) & 0xff);
    for (let i = 3; i >= 0; i--) bytes.push((lo >>> (i * 8)) & 0xff);
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
      h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    const w = new Array(64);
    for (let bloco = 0; bloco < bytes.length; bloco += 64) {
      for (let i = 0; i < 16; i++)
        w[i] = (bytes[bloco + i * 4] << 24) | (bytes[bloco + i * 4 + 1] << 16)
          | (bytes[bloco + i * 4 + 2] << 8) | bytes[bloco + i * 4 + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7]
      .map(h => ('0000000' + (h >>> 0).toString(16)).slice(-8)).join('');
  }
  function hashTokenSaves(t) { return sha256HexSaves(t); }
  /* Validação TOTAL dentro da própria ponte (correcção nomeada 1:
   * defesa em profundidade — nunca confiar no chamador). Espelha os
   * limites dos invariantes do jogo (supInvarianteViolada) e as
   * coerências entre campos. Devolve nome de erro ou null.
   * PORTA C-23 (base REF_5): FASES_SAVE ganha 'confirmar-fim' (fase
   * nova desta base — ponto estável da vez dela, sem pendentes; a
   * fase nunca é restaurada como ecrã, §5) e o estado ganha o campo
   * 'vlab' (o estado do motor por figura, que o supEstadoCanonico
   * desta base já trata como parte do estado da batalha). */
  const FASES_SAVE = ['base', 'atacar', 'consumivel', 'mover', 'movendo',
    'rolagem', 'resultado', 'vez-ia', 'confirmar-fim', 'fim'];
  /* O bloco vlab de UMA figura (espelho exacto do validador do
     módulo em saves-mestre.js — os dois têm de concordar sempre). */
  function validarVlabUnidade(u, id) {
    const INV = 'SAVE_ESTADO_INVALIDO', FALTA = 'SAVE_CAMPOS_EM_FALTA';
    if (!u || typeof u !== 'object') return FALTA;
    const chaves = ['danoSofrido', 'estados', 'armaCaida', 'armaQuebrada',
      'desvantagemAtaque', 'deslocMetade', 'reacaoDisponivel', 'estadoMorte'];
    for (const c of chaves) if (!(c in u)) return FALTA;
    if (Object.keys(u).some(k => !chaves.includes(k))) return INV;
    if (!Number.isInteger(u.danoSofrido) || u.danoSofrido < 0 || u.danoSofrido > 999) return INV;
    if (!Array.isArray(u.estados) || u.estados.length > 16
      || u.estados.some(s => typeof s !== 'string' || s.length < 1 || s.length > 32)) return INV;
    if (typeof u.armaCaida !== 'boolean' || typeof u.armaQuebrada !== 'boolean'
      || typeof u.deslocMetade !== 'boolean' || typeof u.reacaoDisponivel !== 'boolean') return INV;
    if (!Number.isInteger(u.desvantagemAtaque) || u.desvantagemAtaque < 0
      || u.desvantagemAtaque > 99) return INV;
    /* estadoMorte é SÓ dela (invariante da casca): nas outras
       figuras tem de ser null. Nela: null, ou a sequência já
       estabilizada — 'aMorrer' é REJEITADO: capturar recusa-o com
       SAVE_EM_VOO (resolução pendente por rondas), logo nenhum
       produtor legítimo o emite (padrão S-CONF-03). */
    if (id !== PROPRIA) { if (u.estadoMorte !== null) return INV; }
    else if (u.estadoMorte !== null) {
      const em = u.estadoMorte;
      if (!em || typeof em !== 'object') return INV;
      const chavesEm = ['fase', 'sucessos', 'falhas'];
      if (Object.keys(em).some(k => !chavesEm.includes(k))
        || !chavesEm.every(c => c in em)) return INV;
      if (em.fase !== 'estabilizado') return INV;
      if (!Number.isInteger(em.sucessos) || em.sucessos < 0 || em.sucessos > 99
        || !Number.isInteger(em.falhas) || em.falhas < 0 || em.falhas > 99) return INV;
    }
    return null;
  }
  function validarVlabParaAplicar(v) {
    const INV = 'SAVE_ESTADO_INVALIDO', FALTA = 'SAVE_CAMPOS_EM_FALTA';
    if (!v || typeof v !== 'object') return FALTA;
    const ids = ELENCO.map(u => u.id);
    for (const id of ids) if (!(id in v)) return FALTA;
    if (Object.keys(v).some(k => !ids.includes(k))) return INV;
    for (const id of ids) {
      const erro = validarVlabUnidade(v[id], id);
      if (erro) return erro;
    }
    return null;
  }
  function validarEstadoParaAplicar(e) {
    const INV = 'SAVE_ESTADO_INVALIDO', FALTA = 'SAVE_CAMPOS_EM_FALTA';
    if (!e || typeof e !== 'object') return FALTA;
    /* guarda de versão (CP-01): uma entrada em FORMA DE ENVELOPE com
     * versao diferente da do formato (2) recusa-se como incompatível —
     * nunca como campos em falta nem estado inválido. Estados puros
     * não trazem o campo e a guarda é inerte para eles. Texto gémeo
     * no módulo (saves-mestre.js, validarEstado). */
    if ('versao' in e && e.versao !== 2) return 'SAVE_VERSAO_INCOMPATIVEL';
    const chavesEstado = ['rodada', 'indiceVez', 'vez', 'ordem', 'fase',
      'unidades', 'ong', 'batalhaFim', 'consumiveis', 'dados', 'vlab'];
    for (const c of chavesEstado) if (!(c in e)) return FALTA;
    /* Tranche AMBIENTE: 'ambiente'/'ambienteCurva' são campos
       OPCIONAIS do estado (save antigo sem eles é válido — carrega
       com Noite seca declarada no aplicar); qualquer outra chave
       fora da lista continua inválida.
       Tranche ESCALA: 'escala' é campo OPCIONAL do estado, na mesma
       régua (save antigo sem ele é válido — mantém a escala actual
       no aplicar). Sem esta excepção, TODO o save com escala era
       rejeitado aqui, antes de qualquer outra conferência. */
    if (Object.keys(e).some(k => !chavesEstado.includes(k) && k !== 'ambiente' && k !== 'ambienteCurva' && k !== 'escala' && k !== 'visao')) return INV;
    const ids = ELENCO.map(u => u.id);
    const inteiro = n => Number.isInteger(n);
    const finito = n => typeof n === 'number' && Number.isFinite(n);
    if (!inteiro(e.rodada) || e.rodada < 1 || e.rodada > 10000) return INV;
    if (!inteiro(e.indiceVez) || e.indiceVez < 0 || e.indiceVez >= ids.length) return INV;
    if (!Array.isArray(e.ordem) || e.ordem.length !== ids.length
      || !ids.every(id => e.ordem.includes(id))) return INV;
    if (e.vez !== e.ordem[e.indiceVez]) return INV;
    if (!FASES_SAVE.includes(e.fase)) return INV;
    /* VOLTA 2 (S-CONF-03, via de APERTAR): fases 'rolagem'/'movendo'
       são REJEITADAS — capturar nunca as emite (recusa-as com
       SAVE_EM_VOO), logo um save com essas fases é incoerente por
       construção. A coerência completa de fase está mais abaixo,
       junto de batalhaFim. */
    if (e.fase === 'rolagem' || e.fase === 'movendo') return INV;
    if (!Array.isArray(e.unidades) || e.unidades.length !== ids.length) return INV;
    const vistos = new Set(), casas = new Set();
    for (const u of e.unidades) {
      if (!u || typeof u !== 'object') return INV;
      if (Object.keys(u).some(k => !['id', 'x', 'y', 'vivo'].includes(k))) return INV;
      if (!ids.includes(u.id) || vistos.has(u.id)) return INV;
      vistos.add(u.id);
      if (!inteiro(u.x) || !inteiro(u.y)
        || u.x < AREA.origin.x || u.x >= AREA.origin.x + AREA.cols
        || u.y < AREA.origin.y || u.y >= AREA.origin.y + AREA.rows) return INV;
      if (typeof u.vivo !== 'boolean') return INV;
      const k = chave(u.x, u.y);
      if (casas.has(k)) return INV;              // duas figuras na mesma casa
      casas.add(k);
    }
    const porId = id => e.unidades.find(u => u.id === id);
    const ongU = porId(PROPRIA);
    if (!ongU) return INV;
    if (porId(e.vez).vivo !== true) return INV;  // vez de figura morta
    const o = e.ong;
    if (!o || typeof o !== 'object') return FALTA;
    const chavesOng = ['danoSofrido', 'paGasto', 'transformada',
      'reservaMovimento', 'atacou', 'alvo'];
    for (const c of chavesOng) if (!(c in o)) return FALTA;
    if (Object.keys(o).some(k => !chavesOng.includes(k))) return INV;
    /* VOLTA 2 (S-CONF-03): o dano do jogo é INTEIRO — 12,5 passa a
       inválido (antes bastava ser finito). */
    if (!inteiro(o.danoSofrido) || o.danoSofrido < 0 || o.danoSofrido > 999) return INV;
    /* danoSofrido coerente com vivo: viva ⇒ dano < Vida total;
       morta ⇒ dano >= Vida total (é assim que fimDeBatalha nasce).
       Q4 (08/11/2026): a estabilizada é a excepção desenhada —
       caída na vista (vivo false) com 1 de Vida (dano = total − 1)
       e a marca 'estabilizado' no bloco do motor, que o validador
       do bloco (validarVlabUnidade) já aceitava; sem a marca, ou
       com outro dano, vale a régua antiga. */
    const emSaveOng = e.vlab && e.vlab.ong ? e.vlab.ong.estadoMorte : null;
    const saveEstabilizada = !!(emSaveOng && emSaveOng.fase === 'estabilizado');
    if (saveEstabilizada) {
      if (ongU.vivo || o.danoSofrido !== FICHAS.ong.vida.total - 1) return INV;
    } else if (ongU.vivo ? o.danoSofrido >= FICHAS.ong.vida.total
                  : o.danoSofrido < FICHAS.ong.vida.total) return INV;
    if (!inteiro(o.paGasto) || o.paGasto < 0 || o.paGasto > FICHAS.ong.alma.total) return INV;
    if (typeof o.transformada !== 'boolean' || typeof o.atacou !== 'boolean') return INV;
    if (!finito(o.reservaMovimento) || o.reservaMovimento < 0
      || o.reservaMovimento > DESLOCAMENTO_ONG_M + 1e-9) return INV;
    /* VOLTA 2 (S-CONF-03): a reserva anda casa a casa — tem de ser
       MÚLTIPLO do preço da casa (tolerância 1e-9); 7,3 é inválido.
       Tranche ESCALA: com o campo 'escala' presente, a reserva pode
       ter sido gasta a preços MISTOS (a escala mudou a meio da vez)
       — a régua passa a ser o múltiplo de 0,5 m, o mdc dos três
       preços {1 · 1,5 · 2}: toda a reserva alcançável é uma base
       (múltiplo de 0,5) menos uma soma de preços (múltiplos de 0,5).
       Sem o campo (saves antigos), fica a régua original: múltiplo
       de 1,5, a única escala que existia quando foram escritos. */
    { const reguaReserva = ('escala' in e) ? 0.5 : 1.5;
      const passosReserva = o.reservaMovimento / reguaReserva;
      if (Math.abs(passosReserva - Math.round(passosReserva)) > 1e-9) return INV; }
    if (o.alvo !== null && (!ids.includes(o.alvo) || o.alvo === PROPRIA
      || porId(o.alvo).vivo !== true)) return INV;   // alvo-próprio ou morto
    if (typeof e.batalhaFim !== 'boolean') return INV;
    /* VOLTA 2 (S-CONF-03): coerência de fase — fase 'fim' ⇔
       batalhaFim; fase 'vez-ia' ⇒ vez não é a Ong (e vez da Ong ⇒
       fase não é 'vez-ia': é a mesma porta, vista dos dois lados). */
    if ((e.fase === 'fim') !== e.batalhaFim) return INV;
    if (e.fase === 'vez-ia' && e.vez === PROPRIA) return INV;
    if (saveEstabilizada) { if (e.batalhaFim || ongU.vivo) return INV; }   // Q4: caída com a batalha a correr
    else if (e.batalhaFim !== !ongU.vivo) return INV;     // batalhaFim coerente
    /* consumiveis (correcção nomeada 5): a v2 NÃO tem inventário —
       lista não-vazia é REJEITADA, nunca descartada em silêncio. */
    if (!Array.isArray(e.consumiveis) || e.consumiveis.length !== 0) return INV;
    const d = e.dados;
    if (!d || typeof d !== 'object') return FALTA;
    if (Object.keys(d).some(k => !['estado', 'roladas'].includes(k))) return INV;
    if (!inteiro(d.estado) || d.estado < 0 || d.estado > 4294967295) return INV;
    if (!inteiro(d.roladas) || d.roladas < 0 || d.roladas > 1000000) return INV;
    /* Tranche AMBIENTE: o campo, QUANDO PRESENTE, confere-se no
       domínio semântico — hora finita em [0,24), chuva ∈ {0,1,2},
       raios booleano, sem chaves estranhas; fora do domínio é
       SAVE_ESTADO_INVALIDO (erro nomeado), nunca clamp silencioso.
       A versão da curva, quando presente, tem de ser 'v1'.
       VOLTA 3: a chave precip é admitida (opcional — saves
       antigos não a têm e lêem Chuva), com domínio
       'chuva'|'neve' quando presente. */
    if ('ambiente' in e) {
      const a = e.ambiente;
      if (!a || typeof a !== 'object') return INV;
      if (Object.keys(a).some(k => !['hora', 'chuva', 'raios', 'precip'].includes(k))) return INV;
      if (!finito(a.hora) || a.hora < 0 || a.hora >= 24) return INV;
      if (!(a.chuva === 0 || a.chuva === 1 || a.chuva === 2)) return INV;
      if (typeof a.raios !== 'boolean') return INV;
      if ('precip' in a && a.precip !== 'chuva' && a.precip !== 'neve') return INV;
    }
    if ('ambienteCurva' in e && e.ambienteCurva !== 'v1') return INV;
    /* Tranche ESCALA: o campo, QUANDO PRESENTE, tem de ser um dos
       três preços oficiais {1 · 1,5 · 2}; fora do domínio é
       SAVE_ESTADO_INVALIDO (erro nomeado), nunca clamp silencioso. */
    if ('escala' in e && !ESCALAS_CASA_M.includes(e.escala)) return INV;
    /* VISÃO: presente, tem de trazer o domínio inteiro
       {modo, forma, prazo} ou, com o anel, {…, anel booleano} —
       sem chaves estranhas (a regra exacta é do visaoDominioValido). */
    if ('visao' in e && !visaoDominioValido(e.visao)) return INV;
    /* PORTA C-23: o bloco do motor confere-se com a mesma régua. */
    return validarVlabParaAplicar(e.vlab);
  }
  window.CampoSaveBridge = Object.freeze({
    versaoPonte: 3,
    /* Registo do módulo do Mestre: só saves-mestre.js conhece o
       token; sem ele a ponte fica inerte. A conferência é pelo
       digest SHA-256 — nem o token nem nenhuma cadeia que colida
       com ele por construção fraca activam a ponte. */
    registarModuloSaves(token) {
      if (typeof token === 'string' && hashTokenSaves(token) === DIGEST_TOKEN_SAVES) {
        ponteSavesActiva = true;
        return true;
      }
      return false;
    },
    capturar() {
      if (!ponteSavesActiva) return { ok: false, erro: 'SAVE_PONTE_INACTIVA' };
      /* Guarda de voo (correcção nomeada 3 / S-CRIT-04 e S-CRIT-09):
         a meio de um movimento a cena só actualiza a posição lógica
         no fim do passo e a reserva só desconta no moveend — o par
         capturado seria inconsistente e explorável. Rolagem já
         tirada por revelar (ataquePendente) também recusa: a face
         não evaporaria em silêncio. PORTA C-23: a sequência de morte
         dela em curso (estadoMorte 'aMorrer' — 1 teste por ronda,
         com semente nova a cada ronda) é uma resolução pendente da
         mesma natureza e recusa igual: o formato não guarda
         sequências a meio. */
      let emVoo = false;
      try { emVoo = !!(view.getState().moving); } catch (_) { emVoo = true; }
      const morteEmCurso = !!(ESTADO_VLAB.ong.estadoMorte
        && ESTADO_VLAB.ong.estadoMorte.fase === 'aMorrer');
      /* M1 (§3.6 do desenho): o parque do monstro entra na mesma
         recusa — sem a condição, uma captura a meio do parque
         serializaria a fase 'vez-ia' com o mundo pré-desgraça e,
         ao restaurar, a vez do monstro recomeçaria e rolaria
         OUTRO ataque com outra semente: a captura não guardaria
         uma batalha a meio, guardaria uma batalha diferente. A
         janela de recusa é exactamente o parque: antes do ataque
         e depois da decisão, a vez da IA grava como sempre. */
      if (emVoo || estado === 'movendo' || estado === 'rolagem'
        || apresentacaoEmCurso || passoEmCurso || ataquePendente != null
        || desgracaMonstroPendente != null
        || morteEmCurso)
        return { ok: false, erro: 'SAVE_EM_VOO' };
      return {
        rodada, indiceVez, vez: vezAtual, ordem: [...ordem], fase: estado,
        unidades: view.getState().units.map(u => ({
          id: u.id, x: u.posicao.x, y: u.posicao.y, vivo: u.vivo !== false
        })),
        ong: {
          danoSofrido, paGasto, transformada, reservaMovimento,
          atacou, alvo
        },
        batalhaFim,
        consumiveis: [],
        dados: { estado: dadoEstado, roladas: roladasDados },
        /* PORTA C-23: o estado do motor por figura entra na captura
           (cópia profunda — o save é um valor, nunca uma referência
           viva; é o mesmo gesto do supEstadoCanonico). */
        vlab: JSON.parse(JSON.stringify(ESTADO_VLAB)),
        /* Tranche AMBIENTE: o ambiente da partida entra na captura
           (estado semântico, cópia) com a versão da curva. */
        ambiente: { ...ambientePartida },
        ambienteCurva: 'v1',
        /* Tranche ESCALA: a escala da partida entra na captura —
           carregar repõe-na (a escala é estado da partida). */
        escala: CASA_M,
        /* Tranche VISÃO: a visão da partida entra na captura —
           carregar repõe-na (a memória da Ultra não viaja). */
        visao: { ...visaoPartida }
      };
    },
    aplicar(e) {
      if (!ponteSavesActiva) return { ok: false, erro: 'SAVE_PONTE_INACTIVA' };
      /* Validação total ANTES de tocar em qualquer coisa: save
         inválido não muda NADA (também fora do caminho UI). */
      const erroVal = validarEstadoParaAplicar(e);
      if (erroVal) return { ok: false, erro: erroVal };
      /* M1 (§3.5 do desenho): aplicar um save MATA um parque de
         monstro aberto — o fecho entra DEPOIS da validação passar
         (um save inválido promete «não muda NADA»: matar o parque
         com um save recusado violaria a promessa) e ANTES da
         primeira mutação. Se a aplicação falhar a meio e o
         pré-estado se repor (o catch abaixo), o pendente já
         assentado fica assentado — morto: a moldura de atacarIA
         acorda e morre na re-conferência de época. Nada pendura. */
      fecharDesgracaMonstro({ morta: true });
      /* VOLTA 2 (S-CONF-02): pré-snapshot interno ANTES da primeira
         mutação — se a vista lançar a meio da aplicação, o catch
         repõe este pré-estado e desarma qualquer pendente. Cobre
         posições/vivo (da vista) e os escalares da casca que o
         restauro escreve, mais a pilha e o gelo do Supervisor.
         PORTA C-23: cobre também o bloco do motor (vlab), as
         declarações de reacção e a bandeira da morte adjudicada.
         Constrói-se DENTRO do try: nem a leitura do pré-estado
         pode fazer a excepção escapar sem nome. */
      let preSave = null;
      try {
        preSave = {
          rodada, indiceVez, vez: vezAtual, ordem: [...ordem], fase: estado,
          unidades: view.getState().units.map(u => ({
            id: u.id, x: u.posicao.x, y: u.posicao.y, vivo: u.vivo !== false })),
          danoSofrido, paGasto, transformada, reservaMovimento, atacou, alvo,
          batalhaFim, dadoEstado, roladasDados, supCongelado,
          vlab: JSON.parse(JSON.stringify(ESTADO_VLAB)),
          /* EM-AV2-07: o pré-estado guarda também o fogo — a
             atomicidade do load vale para ele (aplicação falhada
             repõe os fogos que havia). */
          raioFogo: {
            casas: [...rfCasas.values()].map(c => ({ x: c.x, y: c.y, combustivel: c.combustivel, idade: c.idade })),
            aArder: [...rfAArder],
            ultimoTick: [...rfUltimoTick]
          },
          ambiente: { ...ambientePartida },   // AMBIENTE: o pré-estado cobre também o ambiente (atomicidade S-CONF-02)
          escala: CASA_M,   // ESCALA: idem — o pré-estado cobre também a escala
          visao: { ...visaoPartida },   // VISÃO: idem — o pré-estado cobre também a visão
          reaccoes: { ...REACCOES_DECLARADAS },
          mortePropriaAdjudicada, partidaPendente, correrUsado,
          desvincular: opcoesMovimento.desvincular,
          supPilha: supPilha.map(s => ({ turno: s.turno,
            estado: JSON.parse(JSON.stringify(s.estado)) }))
        };
        /* Restauro completo, na ordem do precedente supRestaurar()
           DESTA base (correcções nomeadas 2 e 3 / S-CRIT-03, 05, 06). */
        supRestaurando = true;                    // o moveend ignora a reposição
        supEpoca++;
        supRestauroPendente = e.unidades.map(u => ({ ...u }));
        /* EM-TJ12J13-01: idem supRestaurar — carimba o voo de monstro
           seguido NESTE instante, antes de o contexto ser consumido
           abaixo; só a chegada dele pode ser reafirmada. */
        const vooAoArmar = (contextoIA && contextoIA.destino)
          ? { id: contextoIA.id, seq: contextoIA.seq }
          : (guardaExpiradaIA ? { id: guardaExpiradaIA.id, seq: guardaExpiradaIA.seq } : null);
        if (vooAoArmar) supRestauroVoo = vooAoArmar;
        // se vooAoArmar é null, PRESERVA o carimbo anterior ainda não resolvido:
        // uma travessia por resolver não morre por um segundo restauro sem voo seguido
        supDesarmarGuardaMovimentoOng();
        geracaoAuto++;
        if (relogioAuto) { clearTimeout(relogioAuto); relogioAuto = null; }
        seqTurno++;
        if (contextoIA) consumirContextoIA(contextoIA.id);
        reservasDestinoIA.clear();   // idem supRestaurar: o save substitui o mundo, os voos velhos já não prometem casas
        /* Posições e vivo: move imediato INCONDICIONAL de todas as
           figuras — cancela animações em voo mesmo quando a posição
           lógica já bate com o save (era o buraco S-CRIT-05). Figura
           que o save traz morta entra pela pose de morte rápida
           quando a cena a tem (precedente FUSÃO T-D do restauro). */
        for (const su of e.unidades) {
          view.move(su.id, casaVista({ x: su.x, y: su.y }), { immediate: true });
          const uv = unidade(su.id);
          if (uv && (uv.vivo !== false) !== su.vivo) {
            if (su.vivo === false && typeof view.apresentarMorte === 'function') {
              try {
                const pm = view.apresentarMorte(su.id, { rapido: true });
                if (pm && pm.catch) pm.catch(() => {});
              } catch (_) { view.setVivo(su.id, su.vivo); }
            } else view.setVivo(su.id, su.vivo);
          }
        }
        /* Números e bandeiras — ordem HONRADA (atribuída, não
           ignorada) e batalhaFim como validado (sem correcção
           silenciosa: a coerência já foi conferida acima). */
        ordem = [...e.ordem];
        rodada = e.rodada; indiceVez = e.indiceVez;
        danoSofrido = e.ong.danoSofrido; paGasto = e.ong.paGasto;
        transformada = e.ong.transformada;
        /* O estado do motor volta campo a campo, como no restauro
           do Supervisor (PORTA C-23). */
        for (const id of Object.keys(ESTADO_VLAB)) {
          const sv = e.vlab[id]; if (!sv) continue;
          const ev = ESTADO_VLAB[id];
          ev.danoSofrido = sv.danoSofrido | 0;
          ev.estados = [...(sv.estados || [])];
          ev.armaCaida = !!sv.armaCaida; ev.armaQuebrada = !!sv.armaQuebrada;
          ev.desvantagemAtaque = sv.desvantagemAtaque | 0;
          ev.deslocMetade = !!sv.deslocMetade;
          ev.reacaoDisponivel = sv.reacaoDisponivel !== false;
          ev.estadoMorte = sv.estadoMorte ? { ...sv.estadoMorte } : null;
        }
        dadoEstado = e.dados.estado >>> 0; roladasDados = e.dados.roladas;
        ataquePendente = null; custoPendente = null; caminhoPendente = null;
        continuarAposApresentacao = false;
        passoEmCurso = false; parado = false;
        partidaPendente = null; correrUsado = false;
        opcoesMovimento.desvincular = false;
        /* C-39: declarações de reacção são decisões da linha do
           tempo abandonada — o carregar apaga-as todas, como o
           restauro do Supervisor. */
        for (const idDecl of Object.keys(REACCOES_DECLARADAS)) delete REACCOES_DECLARADAS[idDecl];
        batalhaFim = e.batalhaFim;
        /* A bandeira da morte adjudicada deriva-se do estado
           restaurado (morte pelo motor deixa estadoMorte null;
           estabilizada deixa 'estabilizado'; vitória deixa-a viva)
           — e a tela vermelha reaplica-se sobre a vida restaurada. */
        mortePropriaAdjudicada = !!(e.batalhaFim
          && e.unidades.find(u => u.id === PROPRIA).vivo === false
          && !(e.vlab.ong.estadoMorte && e.vlab.ong.estadoMorte.fase === 'estabilizado'));
        aplicarTelaVermelha();
        supPilha.length = 0;            // a linha do tempo abandonada sai da pilha
        supCongelado = false;           // carregar é também a saída do congelamento
        if (fichaAberta) fecharFicha();
        atualizarChipVida();
        /* Reentra na vez guardada; DEPOIS reimpõe reserva/atacou/
           alvo (a entrada na vez repõe esses três). Com a batalha
           terminada não há vez para reentrar: fica o estado 'fim'. */
        if (batalhaFim) {
          vezAtual = e.vez;
          estado = 'fim';
          atualizarVez(); renderAcoes();
        } else if (e.vez === PROPRIA) iniciarVez(PROPRIA);
        else iniciarVezIA(e.vez, false);
        reservaMovimento = e.ong.reservaMovimento;
        atacou = e.ong.atacou;
        alvo = e.ong.alvo;
        /* O snapshot do próprio carregar nasce DEPOIS da
           reimposição (o de iniciarVez/iniciarVezIA leu valores
           pré-carregar — snapshot híbrido S-CRIT-06): pilha limpa e
           UM snapshot novo, já com o estado carregado. */
        /* Tranche AMBIENTE: o ambiente do save assenta JÁ (imediato),
           antes do snapshot novo — o snapshot nasce já com ele.
           Save antigo sem o campo: Noite seca DECLARADA no registo
           (a validação já garantiu que um campo presente é válido). */
        if (e.ambiente && ambDominioValido(e.ambiente)) {
          ambAssentar({ hora: e.ambiente.hora, chuva: e.ambiente.chuva, raios: e.ambiente.raios, precip: e.ambiente.precip === 'neve' ? 'neve' : 'chuva' }, { imediato: true });
        } else {
          ambAssentar({ ...AMBIENTE_RITUAL }, { imediato: true });
          supRegistar('ambiente', { origem: 'save', razao: 'Save sem ambiente — Noite seca do ritual declarada' });
        }
        /* Tranche ESCALA: a escala do save assenta com o resto, em
           silêncio (a frase é a do carregar). Save antigo sem o
           campo mantém a escala actual — declarado: não se inventa
           um default por cima da definição do Mestre. */
        if ('escala' in e) escalaAssentar(e.escala, { silencioso: true });
        /* Tranche VISÃO: a visão do save assenta com o resto, com a
           memória da Ultra limpa. Save antigo SEM o campo: modo
           Total declarado no registo (o comportamento de hoje); a
           forma e o prazo correntes mantêm-se — como na escala, não
           se inventa um default por cima da definição dele. */
        if ('visao' in e) visaoAssentar({ ...e.visao }, { silencioso: true, limparMemoria: true });
        else {
          visaoAssentar({ ...visaoPartida, modo: 'total' }, { silencioso: true, limparMemoria: true });
          supRegistar('visao', { origem: 'save', razao: 'Save sem visão — modo Total declarado' });
        }
        /* EM-AV2-07: o fogo NÃO entra nos ficheiros de save — um
           load em sessão apaga os fogos da batalha actual, como a
           L10 anuncia (antes sobreviviam ao load, por desvio:
           o aplicar assentava o ambiente e nunca limpava o fogo). */
        ambRestaurarFogo(null);
        supPilha.length = 0;
        supSnapshot();
        supRestaurando = false;
        supConferirInvariantes('restauro-saves');   // fecha com a rede do jogo
        return { ok: true };
      } catch (_) {
        /* VOLTA 2 (S-CONF-02): atomicidade real. O pendente do save
           FALHADO desarma-se PRIMEIRO (nenhum moveend tardio pode
           reafirmar posições de uma aplicação que não aconteceu) e
           tenta-se repor o pré-estado do pré-snapshot — cada passo
           da reposição corre com o seu próprio try, dentro deste
           catch, para uma segunda excepção da vista não voltar a
           armar nada. As saídas deste catch deixam SEMPRE
           supRestauroPendente === null e supRestaurando === false. */
        supRestauroPendente = null;
        supRestauroVoo = null;   // EM-TJ12J13-01: simetria S-CONF-02 — aplicação que não aconteceu não deixa carimbo
        try {
          supRestaurando = true;              // os moveend da reposição ignoram-se
          if (preSave) for (const su of preSave.unidades) {
            try { view.move(su.id, casaVista({ x: su.x, y: su.y }), { immediate: true }); } catch (__) {}
            try {
              const uv = unidade(su.id);
              if (uv && (uv.vivo !== false) !== su.vivo) view.setVivo(su.id, su.vivo);
            } catch (__) {}
          }
          if (preSave) {
            ordem = [...preSave.ordem];
            rodada = preSave.rodada; indiceVez = preSave.indiceVez;
            vezAtual = preSave.vez;
            danoSofrido = preSave.danoSofrido; paGasto = preSave.paGasto;
            transformada = preSave.transformada;
            for (const id of Object.keys(ESTADO_VLAB)) {
              const sv = preSave.vlab[id]; if (!sv) continue;
              const ev = ESTADO_VLAB[id];
              ev.danoSofrido = sv.danoSofrido | 0;
              ev.estados = [...(sv.estados || [])];
              ev.armaCaida = !!sv.armaCaida; ev.armaQuebrada = !!sv.armaQuebrada;
              ev.desvantagemAtaque = sv.desvantagemAtaque | 0;
              ev.deslocMetade = !!sv.deslocMetade;
              ev.reacaoDisponivel = sv.reacaoDisponivel !== false;
              ev.estadoMorte = sv.estadoMorte ? { ...sv.estadoMorte } : null;
            }
            reservaMovimento = preSave.reservaMovimento;
            atacou = preSave.atacou; alvo = preSave.alvo;
            /* AMBIENTE: a aplicação falhada repõe também o ambiente
               do pré-estado — aplicação que não aconteceu não muda o céu. */
            if (preSave.ambiente && ambDominioValido(preSave.ambiente))
              try { ambAssentar({ ...preSave.ambiente }, { imediato: true }); } catch (__) {}
            /* ESCALA: a aplicação falhada repõe também a escala do
               pré-estado — aplicação que não aconteceu não muda o preço. */
            try { escalaAssentar(preSave.escala, { silencioso: true }); } catch (__) {}
            if (preSave.visao) try { visaoAssentar({ ...preSave.visao }, { silencioso: true, limparMemoria: true }); } catch (__) {}
            /* EM-AV2-07: aplicação que não aconteceu também não
               apaga fogos — repõe-se o fogo do pré-estado. */
            if (preSave.raioFogo) try { ambRestaurarFogo(preSave.raioFogo); } catch (__) {}
            batalhaFim = preSave.batalhaFim;
            dadoEstado = preSave.dadoEstado >>> 0; roladasDados = preSave.roladasDados;
            ataquePendente = null; custoPendente = null; caminhoPendente = null;
            continuarAposApresentacao = false;
            passoEmCurso = false; parado = false;
            partidaPendente = preSave.partidaPendente;
            correrUsado = preSave.correrUsado;
            opcoesMovimento.desvincular = preSave.desvincular;
            for (const idDecl of Object.keys(REACCOES_DECLARADAS)) delete REACCOES_DECLARADAS[idDecl];
            for (const idDecl of Object.keys(preSave.reaccoes)) REACCOES_DECLARADAS[idDecl] = preSave.reaccoes[idDecl];
            mortePropriaAdjudicada = preSave.mortePropriaAdjudicada;
            try { aplicarTelaVermelha(); } catch (__) {}
            supCongelado = preSave.supCongelado;
            supPilha.length = 0;
            for (const s of preSave.supPilha) supPilha.push(s);
            /* Fase reposta com coerência: fases de voo do pré-estado
               não se restauram como ecrã (os pendentes nasceram
               vazios) — normalizam para a base da vez, como no §5. */
            estado = batalhaFim ? 'fim'
              : (preSave.fase === 'movendo' || preSave.fase === 'rolagem' || preSave.fase === 'desgraca-lista') ? 'base'
              : preSave.fase;
            try { atualizarChipVida(); } catch (__) {}
            try { atualizarVez(); renderAcoes(); } catch (__) {}
          }
        } catch (__) { /* a reposição é tentativa: o erro nomeado sai na mesma */ }
        supRestauroPendente = null;
        supRestauroVoo = null;   // EM-TJ12J13-01: idem — pendente e carimbo saem sempre juntos deste catch
        supRestaurando = false;
        return { ok: false, erro: 'SAVE_APLICACAO_FALHOU' };
      }
    }
  });

  /* ---------- Ambiente: painel do Mestre (só #cfgpop, antes de #stats) ----------
   * Superfície do ambiente no ⚙, no padrão da casa (superfícies do
   * Supervisor): nasce SÓ com MODO_MESTRE. Na vista da jogadora
   * NADA disto é criado — sem nós, sem listeners, sem globais: ela
   * vê e ouve o mundo mudar, nunca o painel. O estado da mesa vive
   * em ambientePartida; esta função só o PINTA (e o ponto no ⚙). */
  function ambSincronizarPainel() {
    const e = ambientePartida;
    if (ambUI.estadoEl) {
      let txt = ambTextoEstado(e);
      if (ambDegrau > 0) txt += ` · apresentação reduzida: ${AMB_DEGRAUS[ambDegrau]}`;
      ambUI.estadoEl.textContent = txt;
    }
    if (ambUI.ponto) ambUI.ponto.hidden = (e.hora === AMBIENTE_RITUAL.hora && e.chuva === 0 && e.raios === false && e.precip === 'chuva');
    for (const reg of ambUI.botoesHora) reg.b.classList.toggle('on', Math.abs(e.hora - reg.hora) < 0.051);
    for (const reg of ambUI.botoesPrecip) reg.b.classList.toggle('on', e.precip === reg.precip);
    if (ambUI.notaNeve) ambUI.notaNeve.hidden = e.precip !== 'neve';
    for (const reg of ambUI.botoesChuva) {
      reg.b.classList.toggle('on', e.chuva === reg.chuva);
      if (reg.chuva === 2)   // em qualidade Baixa, o Forte activo rotula a apresentação reduzida
        reg.b.textContent = (qualidade === 'baixa' && e.chuva === 2)
          ? 'Forte — apresentação reduzida em qualidade Baixa' : 'Forte';
    }
    if (ambUI.deslizador && document.activeElement !== ambUI.deslizador)
      ambUI.deslizador.value = String(e.hora);
    if (ambUI.leitura && document.activeElement !== ambUI.deslizador)
      ambUI.leitura.textContent = ambFmtHora(e.hora);
    if (ambUI.togRaios) {
      const neveT = e.precip === 'neve';
      ambUI.togRaios.classList.toggle('on', e.raios);
      ambUI.togRaios.textContent = e.raios ? 'Ligados' : 'Desligados';
      ambUI.togRaios.setAttribute('aria-pressed', String(e.raios));
      ambUI.togRaios.disabled = neveT;   // VOLTA 3: com neve não há raios — a razão está na nota sob a Precipitação
      ambUI.togRaios.title = neveT ? 'Sem raios com neve' : '';
    }
    if (ambUI.btnRaio) {
      /* RAIO E FOGO (VOLTA 3): em fila, o botão mostra o pendente
       * (que resolve em segundos); fora de fila, activo com
       * raios ligados e precipitação a cair. Com neve fica
       * desactivado — a razão visível é a nota do painel. */
      const neveB = e.precip === 'neve';
      ambUI.btnRaio.disabled = neveB || (!(e.raios && e.chuva !== 0) && !ambRaioPendente);
      ambUI.btnRaio.classList.toggle('amb-pendente', ambRaioPendente);
      ambUI.btnRaio.textContent = ambRaioPendente ? '⚡ Raio pendente…' : '⚡ Raio agora';
      ambUI.btnRaio.title = neveB ? 'Sem raios com neve' : '';
    }
    if (ambUI.togSom) {
      ambUI.togSom.classList.toggle('on', ambSomLigado);
      ambUI.togSom.textContent = ambSomLigado ? 'Ligado' : 'Desligado';
      ambUI.togSom.setAttribute('aria-pressed', String(ambSomLigado));
    }
    if (ambUI.togTremulacao) {
      ambUI.togTremulacao.classList.toggle('on', ambTremulacaoLigada);
      ambUI.togTremulacao.textContent = ambTremulacaoLigada ? 'Ligada' : 'Desligada';
      ambUI.togTremulacao.setAttribute('aria-pressed', String(ambTremulacaoLigada));
    }
  }
  if (MODO_MESTRE) {
    const tituloAmb = document.createElement('h3');
    tituloAmb.textContent = 'Ambiente';
    cfgEl.insertBefore(tituloAmb, $('stats'));
    const estadoAmbEl = document.createElement('div');
    estadoAmbEl.id = 'amb-estado';
    estadoAmbEl.className = 'amb-estado';
    cfgEl.insertBefore(estadoAmbEl, $('stats'));
    ambUI.estadoEl = estadoAmbEl;
    /* Hora: 5 botões nomeados, ordem cronológica, âncoras exactas. */
    const linhaAmbHora = document.createElement('div');
    linhaAmbHora.className = 'cfgrow vel';
    const rotuloAmbHora = document.createElement('span');
    rotuloAmbHora.className = 'cl';
    rotuloAmbHora.textContent = 'Hora';
    const grupoAmbHora = document.createElement('div');
    grupoAmbHora.className = 'seg amb-seg';
    grupoAmbHora.setAttribute('role', 'group');
    grupoAmbHora.setAttribute('aria-label', 'Hora do dia');
    for (const ancora of AMBIENTE_ANcoras) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ancora.nome;
      b.addEventListener('click', () =>
        ambAssentar({ hora: ancora.hora, chuva: ambientePartida.chuva, raios: ambientePartida.raios }, {}));
      grupoAmbHora.appendChild(b);
      ambUI.botoesHora.push({ hora: ancora.hora, b });
    }
    linhaAmbHora.appendChild(rotuloAmbHora);
    linhaAmbHora.appendChild(grupoAmbHora);
    cfgEl.insertBefore(linhaAmbHora, $('stats'));
    /* Hora exacta: deslizador 0–24, passo 0,1. Arrastar PRÉ-VISUALIZA
       (aplicarAmbiente sem gravar estado nem preferência); largar
       ASSENTA (grava estado da partida + preferência do Mestre). */
    const linhaAmbFina = document.createElement('div');
    linhaAmbFina.className = 'cfgrow amb-slider-row';
    const rotuloAmbFina = document.createElement('span');
    rotuloAmbFina.className = 'cl';
    rotuloAmbFina.textContent = 'Hora exacta';
    const deslizadorAmb = document.createElement('input');
    deslizadorAmb.type = 'range';
    deslizadorAmb.id = 'amb-hora';
    deslizadorAmb.className = 'amb-range';
    deslizadorAmb.min = '0'; deslizadorAmb.max = '24'; deslizadorAmb.step = '0.1';
    deslizadorAmb.setAttribute('aria-label', 'Hora exacta do dia');
    const leituraAmb = document.createElement('span');
    leituraAmb.className = 'amb-leitura';
    linhaAmbFina.appendChild(rotuloAmbFina);
    linhaAmbFina.appendChild(deslizadorAmb);
    linhaAmbFina.appendChild(leituraAmb);
    cfgEl.insertBefore(linhaAmbFina, $('stats'));
    ambUI.deslizador = deslizadorAmb;
    ambUI.leitura = leituraAmb;
    deslizadorAmb.addEventListener('input', () => {
      const bruto = Number(deslizadorAmb.value);
      if (!Number.isFinite(bruto)) return;
      const h = bruto >= 24 ? 0 : bruto;   // 24,0h é a 0,0h do dia seguinte — o domínio é [0,24)
      leituraAmb.textContent = ambFmtHora(bruto);
      ambAplicarVista({ hora: h, chuva: ambientePartida.chuva, raios: ambientePartida.raios }, false);
      if (ambUI.estadoEl) {
        let txt = ambTextoEstado({ hora: h, chuva: ambientePartida.chuva, raios: ambientePartida.raios });
        if (ambDegrau > 0) txt += ` · apresentação reduzida: ${AMB_DEGRAUS[ambDegrau]}`;
        ambUI.estadoEl.textContent = txt;
      }
    });
    deslizadorAmb.addEventListener('change', () => {
      const bruto = Number(deslizadorAmb.value);
      if (Number.isFinite(bruto))
        ambAssentar({ hora: bruto >= 24 ? 0 : bruto, chuva: ambientePartida.chuva, raios: ambientePartida.raios }, {});
    });
    /* Chuva: 3 botões, as palavras dele — Sem · Pouca · Forte. */
    const linhaAmbChuva = document.createElement('div');
    linhaAmbChuva.className = 'cfgrow vel';
    const rotuloAmbChuva = document.createElement('span');
    rotuloAmbChuva.className = 'cl';
    rotuloAmbChuva.textContent = 'Chuva';
    const grupoAmbChuva = document.createElement('div');
    grupoAmbChuva.className = 'seg amb-seg';
    grupoAmbChuva.setAttribute('role', 'group');
    grupoAmbChuva.setAttribute('aria-label', 'Chuva');
    for (const nivel of [{ chuva: 0, nome: 'Sem' }, { chuva: 1, nome: 'Pouca' }, { chuva: 2, nome: 'Forte' }]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = nivel.nome;
      b.addEventListener('click', () =>
        ambAssentar({ hora: ambientePartida.hora, chuva: nivel.chuva, raios: ambientePartida.raios }, {}));
      grupoAmbChuva.appendChild(b);
      ambUI.botoesChuva.push({ chuva: nivel.chuva, b });
    }
    linhaAmbChuva.appendChild(rotuloAmbChuva);
    linhaAmbChuva.appendChild(grupoAmbChuva);
    cfgEl.insertBefore(linhaAmbChuva, $('stats'));
    /* Precipitação: Chuva | Neve (VOLTA 3 — palavra dele: «a
     * chuva anterior não tava ruim, só era neve — tem que ter a
     * opção de chuva e a opção de neve»). Os botões Sem/Pouca/
     * Forte, acima, são a intensidade da precipitação escolhida.
     * Com Neve, os raios apagam e o botão do raio desactiva; a
     * nota por baixo diz porquê (visível só aqui, no painel do
     * Mestre). A escolha guarda-se como as outras definições do
     * Ambiente (preferência do aparelho + estado da partida). */
    const linhaAmbPrecip = document.createElement('div');
    linhaAmbPrecip.className = 'cfgrow vel';
    const rotuloAmbPrecip = document.createElement('span');
    rotuloAmbPrecip.className = 'cl';
    rotuloAmbPrecip.textContent = 'Precipitação';
    const grupoAmbPrecip = document.createElement('div');
    grupoAmbPrecip.className = 'seg amb-seg';
    grupoAmbPrecip.setAttribute('role', 'group');
    grupoAmbPrecip.setAttribute('aria-label', 'Tipo de precipitação');
    for (const tipo of [{ precip: 'chuva', nome: 'Chuva' }, { precip: 'neve', nome: 'Neve' }]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = tipo.nome;
      b.addEventListener('click', () =>
        ambAssentar({ hora: ambientePartida.hora, chuva: ambientePartida.chuva, raios: ambientePartida.raios, precip: tipo.precip }, {}));
      grupoAmbPrecip.appendChild(b);
      ambUI.botoesPrecip.push({ precip: tipo.precip, b });
    }
    linhaAmbPrecip.appendChild(rotuloAmbPrecip);
    linhaAmbPrecip.appendChild(grupoAmbPrecip);
    cfgEl.insertBefore(linhaAmbPrecip, $('stats'));
    const notaNeveAmb = document.createElement('div');
    notaNeveAmb.className = 'amb-estado';
    notaNeveAmb.textContent = 'Com neve não há raios — o céu fica quieto.';
    notaNeveAmb.hidden = ambientePartida.precip !== 'neve';
    cfgEl.insertBefore(notaNeveAmb, $('stats'));
    ambUI.notaNeve = notaNeveAmb;
    /* Raios: interruptor + «⚡ Raio agora» (inactivo salvo raios
       ligados e chuva ≠ Sem; pendente visível no próprio botão). */
    const linhaAmbRaios = document.createElement('div');
    linhaAmbRaios.className = 'cfgrow';
    const rotuloAmbRaios = document.createElement('span');
    rotuloAmbRaios.className = 'cl';
    rotuloAmbRaios.textContent = 'Raios';
    const togAmbRaios = document.createElement('button');
    togAmbRaios.type = 'button';
    togAmbRaios.id = 'amb-raios';
    togAmbRaios.className = 'tog';
    linhaAmbRaios.appendChild(rotuloAmbRaios);
    linhaAmbRaios.appendChild(togAmbRaios);
    cfgEl.insertBefore(linhaAmbRaios, $('stats'));
    ambUI.togRaios = togAmbRaios;
    togAmbRaios.addEventListener('click', () =>
      ambAssentar({ hora: ambientePartida.hora, chuva: ambientePartida.chuva, raios: !ambientePartida.raios }, {}));
    const linhaAmbRaio = document.createElement('div');
    linhaAmbRaio.className = 'cfgrow';
    const rotuloAmbRaio = document.createElement('span');
    rotuloAmbRaio.className = 'cl';
    rotuloAmbRaio.textContent = 'Raio';
    const btnAmbRaio = document.createElement('button');
    btnAmbRaio.type = 'button';
    btnAmbRaio.id = 'amb-raio-agora';
    btnAmbRaio.className = 'tog amb-raio-btn';
    btnAmbRaio.textContent = '⚡ Raio agora';
    linhaAmbRaio.appendChild(rotuloAmbRaio);
    linhaAmbRaio.appendChild(btnAmbRaio);
    cfgEl.insertBefore(linhaAmbRaio, $('stats'));
    ambUI.btnRaio = btnAmbRaio;
    btnAmbRaio.addEventListener('click', () => ambPedirRaioManual());
    /* Som do ambiente: opção pessoal deste aparelho. */
    const linhaAmbSom = document.createElement('div');
    linhaAmbSom.className = 'cfgrow';
    const rotuloAmbSom = document.createElement('span');
    rotuloAmbSom.className = 'cl';
    rotuloAmbSom.innerHTML = 'Som do ambiente<small>chuva e trovão, só neste aparelho</small>';
    const togAmbSom = document.createElement('button');
    togAmbSom.type = 'button';
    togAmbSom.id = 'amb-som';
    togAmbSom.className = 'tog';
    linhaAmbSom.appendChild(rotuloAmbSom);
    linhaAmbSom.appendChild(togAmbSom);
    cfgEl.insertBefore(linhaAmbSom, $('stats'));
    ambUI.togSom = togAmbSom;
    togAmbSom.addEventListener('click', () => {
      ambSomLigado = !ambSomLigado;
      try { localStorage.setItem('hudt1-ambiente-som', ambSomLigado ? 'ligado' : 'desligado'); } catch (_) {}
      ambAudioSincronizarChuva();
      ambSincronizarPainel();
    });
    /* Tremulação do fogo: opção pessoal deste aparelho (EM-AMB-B1). */
    const linhaAmbTrem = document.createElement('div');
    linhaAmbTrem.className = 'cfgrow';
    const rotuloAmbTrem = document.createElement('span');
    rotuloAmbTrem.className = 'cl';
    rotuloAmbTrem.innerHTML = 'Tremulação do fogo<small>o fogo e a luz dele a tremular, só neste aparelho</small>';
    const togAmbTrem = document.createElement('button');
    togAmbTrem.type = 'button';
    togAmbTrem.id = 'amb-tremulacao';
    togAmbTrem.className = 'tog';
    linhaAmbTrem.appendChild(rotuloAmbTrem);
    linhaAmbTrem.appendChild(togAmbTrem);
    cfgEl.insertBefore(linhaAmbTrem, $('stats'));
    ambUI.togTremulacao = togAmbTrem;
    togAmbTrem.addEventListener('click', () => {
      ambTremulacaoLigada = !ambTremulacaoLigada;
      try { localStorage.setItem('hudt1-ambiente-tremulacao', ambTremulacaoLigada ? 'ligado' : 'desligado'); } catch (_) {}
      ambAplicarTremulacao();
      ambSincronizarPainel();
    });
    /* Regresso à casa: um toque repõe a noite do ritual. */
    const linhaAmbVoltar = document.createElement('div');
    linhaAmbVoltar.className = 'cfgrow';
    const rotuloAmbVoltar = document.createElement('span');
    rotuloAmbVoltar.className = 'cl';
    rotuloAmbVoltar.textContent = 'Ambiente';
    const btnAmbVoltar = document.createElement('button');
    btnAmbVoltar.type = 'button';
    btnAmbVoltar.id = 'amb-voltar-ritual';
    btnAmbVoltar.className = 'tog';
    btnAmbVoltar.textContent = 'Voltar à noite do ritual';
    linhaAmbVoltar.appendChild(rotuloAmbVoltar);
    linhaAmbVoltar.appendChild(btnAmbVoltar);
    cfgEl.insertBefore(linhaAmbVoltar, $('stats'));
    btnAmbVoltar.addEventListener('click', () => ambAssentar({ ...AMBIENTE_RITUAL }, {}));
    /* Ponto no ⚙ (só Mestre): visível quando o ambiente ≠ ritual. */
    const btnCfgAmb = $('btn-config');
    if (btnCfgAmb) {
      btnCfgAmb.style.position = 'relative';
      const pontoAmb = document.createElement('span');
      pontoAmb.id = 'amb-ponto';
      pontoAmb.className = 'amb-ponto';
      pontoAmb.setAttribute('aria-hidden', 'true');
      pontoAmb.hidden = true;
      btnCfgAmb.appendChild(pontoAmb);
      ambUI.ponto = pontoAmb;
    }
    ambSincronizarPainel();
  }
  /* ---------- Câmera livre do Mestre (só MODO_MESTRE) ----------
   * Tranche t-camera-livre, desenho v2: andar e voar dentro do mapa
   * em primeira pessoa, com a mecânica da sala/museu copiada. A porta
   * vive no ⚙ (secção «Câmera livre», depois do Ambiente, antes de
   * #stats) e a HUD de andar nasce escondida. Na vista da jogadora
   * NADA disto é criado — sem nós, sem ouvintes, sem globais (padrão
   * Ambiente) — e nenhum caminho chama setCamera('livre'). Os textos
   * novos já nascem na forma «você» (palavra do Mestre, 08/11 21:49).
   * Não persiste: nada disto entra em Salvar/Carregar nem em
   * localStorage — é um gesto do momento. */
  if (MODO_MESTRE) {
    const tituloCamLivre = document.createElement('h3');
    tituloCamLivre.textContent = 'Câmera livre';
    cfgEl.insertBefore(tituloCamLivre, $('stats'));
    const linhaCamLivre = document.createElement('div');
    linhaCamLivre.className = 'cfgrow';
    const rotuloCamLivre = document.createElement('span');
    rotuloCamLivre.className = 'cl';
    rotuloCamLivre.textContent = 'Andar no mapa';
    const btnCamLivre = document.createElement('button');
    btnCamLivre.type = 'button';
    btnCamLivre.id = 'cam-livre-entrar';
    btnCamLivre.className = 'tog';
    btnCamLivre.textContent = 'Entrar na câmera livre';
    linhaCamLivre.appendChild(rotuloCamLivre);
    linhaCamLivre.appendChild(btnCamLivre);
    cfgEl.insertBefore(linhaCamLivre, $('stats'));
    const ajudaCamLivre = document.createElement('div');
    ajudaCamLivre.className = 'cfgrow';
    const ajudaTxtCamLivre = document.createElement('span');
    ajudaTxtCamLivre.className = 'cl';
    ajudaTxtCamLivre.textContent = 'Você anda e voa dentro do mapa para o analisar. Só aparece para você.';
    ajudaCamLivre.appendChild(ajudaTxtCamLivre);
    cfgEl.insertBefore(ajudaCamLivre, $('stats'));

    /* ----- a HUD de andar: os elementos da sala, com os tamanhos dela ----- */
    const joyCamLivre = document.createElement('div');
    joyCamLivre.id = 'cam-livre-joy';
    joyCamLivre.hidden = true;
    const nubCamLivre = document.createElement('div');
    nubCamLivre.id = 'cam-livre-nub';
    joyCamLivre.appendChild(nubCamLivre);
    document.body.appendChild(joyCamLivre);
    const sobeCamLivre = document.createElement('div');
    sobeCamLivre.id = 'cam-livre-sobe';
    sobeCamLivre.className = 'cam-livre-hbtn';
    sobeCamLivre.textContent = '▲';
    sobeCamLivre.hidden = true;
    sobeCamLivre.setAttribute('role', 'button');
    sobeCamLivre.setAttribute('aria-label', 'Subir');
    document.body.appendChild(sobeCamLivre);
    const desceCamLivre = document.createElement('div');
    desceCamLivre.id = 'cam-livre-desce';
    desceCamLivre.className = 'cam-livre-hbtn';
    desceCamLivre.textContent = '▼';
    desceCamLivre.hidden = true;
    desceCamLivre.setAttribute('role', 'button');
    desceCamLivre.setAttribute('aria-label', 'Descer');
    document.body.appendChild(desceCamLivre);
    const velCamLivre = document.createElement('div');
    velCamLivre.id = 'cam-livre-vel';
    velCamLivre.hidden = true;
    const velBotoesCamLivre = [];
    for (const v of [1, 2, 4]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = v + '×';
      b.classList.toggle('on', v === 1);
      b.addEventListener('click', () => {
        view.livreEntrada({ vel: v });
        for (const x of velBotoesCamLivre) x.classList.toggle('on', x === b);
        camLivreAcordarDica();
      });
      velCamLivre.appendChild(b);
      velBotoesCamLivre.push(b);
    }
    document.body.appendChild(velCamLivre);
    const sairCamLivre = document.createElement('button');
    sairCamLivre.type = 'button';
    sairCamLivre.id = 'cam-livre-sair';
    sairCamLivre.textContent = '⟲ Voltar à câmera do jogo';
    sairCamLivre.hidden = true;
    document.body.appendChild(sairCamLivre);
    const dicaCamLivre = document.createElement('div');
    dicaCamLivre.id = 'cam-livre-dica';
    dicaCamLivre.textContent = 'Arraste na tela para olhar · manípulo ou WASD para andar · ▲▼ para subir e descer';
    dicaCamLivre.hidden = true;
    document.body.appendChild(dicaCamLivre);
    const hudCamLivre = [joyCamLivre, sobeCamLivre, desceCamLivre, velCamLivre, sairCamLivre, dicaCamLivre];

    /* A dica esbate-se para 0,35 após 6 s e acorda a qualquer toque
       nos controlos — o comportamento da #dica da sala. */
    let dicaCamLivreTimer = null;
    function camLivreAcordarDica() {
      dicaCamLivre.style.opacity = '1';
      clearTimeout(dicaCamLivreTimer);
      dicaCamLivreTimer = setTimeout(() => { dicaCamLivre.style.opacity = '0.35'; }, 6000);
    }

    /* manípulo — o manípulo() da sala, com os mesmos números: círculo
       de 132 px, botão central de 56 px que segue o dedo até 34 px,
       joyX/joyY normalizados (módulo preso a 1), analógico */
    {
      let id = null;
      const centro = () => { const r = joyCamLivre.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width / 2]; };
      const mexer = e => {
        const [cx, cy, rad] = centro();
        let dx = (e.clientX - cx) / rad, dy = (e.clientY - cy) / rad;
        const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
        view.livreEntrada({ joyX: dx, joyY: dy });
        nubCamLivre.style.transform = `translate(calc(-50% + ${dx * 34}px), calc(-50% + ${dy * 34}px))`;
      };
      joyCamLivre.addEventListener('pointerdown', e => { id = e.pointerId; try { joyCamLivre.setPointerCapture(id); } catch (_) {} mexer(e); camLivreAcordarDica(); });
      joyCamLivre.addEventListener('pointermove', e => { if (e.pointerId === id) mexer(e); });
      const largar = e => { if (e.pointerId === id) { id = null; view.livreEntrada({ joyX: 0, joyY: 0 }); nubCamLivre.style.transform = 'translate(-50%,-50%)'; } };
      ['pointerup', 'pointercancel'].forEach(ev => joyCamLivre.addEventListener(ev, largar));
    }
    /* botões de altura — apertar e segurar, como na sala (sobe só
       volta a 0 quando larga o botão que o pôs) */
    let sobeCamLivreVal = 0;
    const ligaAlturaCamLivre = (el, val) => {
      el.addEventListener('pointerdown', e => { e.preventDefault(); sobeCamLivreVal = val; view.livreEntrada({ sobe: val }); camLivreAcordarDica(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => el.addEventListener(ev, () => { if (sobeCamLivreVal === val) { sobeCamLivreVal = 0; view.livreEntrada({ sobe: 0 }); } }));
    };
    ligaAlturaCamLivre(sobeCamLivre, 1);
    ligaAlturaCamLivre(desceCamLivre, -1);
    /* teclado do andar: a casca entrega o estado contínuo das teclas
       à cena sempre que ele muda. Enquanto a livre está activa, estas
       teclas são do andar e têm precedência sobre as setas do
       «mover»: o ouvinte global das setas regista-se DEPOIS deste
       bloco no ficheiro, por isso o stopImmediatePropagation chega
       lá primeiro (desenho v2 §5, R6). */
    const teclasCamLivre = new Set();
    const CAM_LIVRE_TECLAS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', 'q', 'pageup', 'pagedown', 'shift'];
    function camLivreEnviarTeclas() {
      const t = {};
      teclasCamLivre.forEach(k => { t[k] = true; });
      view.livreEntrada({ teclas: t });
    }
    document.addEventListener('keydown', e => {
      if (!camLivreActiva()) return;
      const k = e.key.toLowerCase();
      if (!CAM_LIVRE_TECLAS.includes(k)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!teclasCamLivre.has(k)) { teclasCamLivre.add(k); camLivreEnviarTeclas(); }
      camLivreAcordarDica();
    });
    document.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      if (!teclasCamLivre.has(k)) return;
      if (camLivreActiva()) { e.preventDefault(); e.stopImmediatePropagation(); }
      teclasCamLivre.delete(k);
      camLivreEnviarTeclas();
    });
    addEventListener('blur', () => { if (teclasCamLivre.size) { teclasCamLivre.clear(); camLivreEnviarTeclas(); } });

    /* entrar / sair — a troca de HUD segue o evento 'camera' da cena,
       por isso qualquer caminho que mude o modo sincroniza o ecrã */
    let camLivreModoAnterior = null;
    function camLivreSincronizarHud() {
      const livre = camLivreActiva();
      $('faixa').hidden = livre;
      chipEl.hidden = livre;
      atualizarContadorVD();   // C-VD: a caixa segue a plaquinha também aqui
      $('cantos').hidden = livre;
      for (const el of hudCamLivre) el.hidden = !livre;
      if (livre) camLivreAcordarDica();
    }
    btnCamLivre.addEventListener('click', () => {
      camLivreModoAnterior = view.getState().camera;
      if (fichaAberta) fecharFicha();
      fecharCfg();
      view.setCamera('livre');   // o evento 'camera' sincroniza a HUD
    });
    sairCamLivre.addEventListener('click', () => {
      teclasCamLivre.clear();
      sobeCamLivreVal = 0;
      view.livreEntrada({ joyX: 0, joyY: 0, sobe: 0, teclas: {} });
      view.setCamera(camLivreModoAnterior && camLivreModoAnterior !== 'livre' ? camLivreModoAnterior : 'fixa');
      say('Câmera do jogo — de volta à vista de antes.');
    });
    view.on('camera', camLivreSincronizarHud);
  }
  /* Ouvintes da vista (as duas vistas): 'ambiente' ao assentar
   * refresca painel e som; 'raio' agenda o trovão com atraso
   * variável sorteado AQUI (0,3–2,5 s) e variante ao acaso — sem
   * áudio desbloqueado ou com o som desligado, não se agenda nada
   * (sem dívida). 'stats' alimenta a escada de degradação. */
  if (view && typeof view.on === 'function') {
    try {
      view.on('ambiente', () => { ambSincronizarPainel(); ambAudioSincronizarChuva(); });
      view.on('raio', () => {
        if (!ambSomLigado || !ambAudio.desbloqueado) return;
        const atraso = 300 + Math.random() * 2200;
        setTimeout(() => ambTocarTrovao(), atraso);
      });
      view.on('stats', s => { try { ambDegradacaoAmostra(s && s.fps); } catch (_) {} });
    } catch (_) {}
  }
  if (typeof document !== 'undefined')   // em fundo o agendador pausa; ao voltar, sorteia de novo
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { ambLimparRelogioAutoRaio(); ambSincronizarRelogioExploracao(); }
      else { ambAgendarAutoRaio(); ambSincronizarRelogioExploracao(); }
    });
  /* ---------- SOM-EM-FUNDO-INICIO — o ambiente cala-se fora do jogo ----------
   * Defeito apanhado pelo Mestre ao vivo (11/11/2026 08:43): sair
   * para a tela principal do telefone deixava a chuva a tocar cá
   * fora, com a app aberta em segundo plano — o AudioContext
   * ficava 'running' e os loops corriam. A guarda:
   *   · ao ESCONDER (visibilitychange para hidden, ou pagehide):
   *     se o contexto estiver 'running', levanta a bandeira e
   *     suspende — o relógio do contexto congela: os loops da
   *     chuva param onde estão e um trovão a meio cala-se;
   *   · ao VOLTAR (visible, ou pageshow de restauro): só com a
   *     bandeira posta (a prova de que estava a tocar — só se
   *     suspende um contexto 'running'), retoma com resume();
   *   · o interruptor do jogador não é tocado: quem manda no
   *     silêncio continua a ser o ganho master (som desligado =
   *     master a 0, suspender/retomar não lhe mexe); contexto
   *     por desbloquear ou já suspenso fica exactamente como
   *     estava — voltar nunca arranca som que estava parado.
   * (A trilha do título tem a guarda dela em entrada.js.)
   * ------------------------------------------------------------------------- */
  let ambSuspensoPorFundo = false;
  function ambSomEsconder() {
    const ctx = ambAudio.ctx;
    if (ctx && ctx.state === 'running') {
      ambSuspensoPorFundo = true;
      try { const p = ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
    }
  }
  function ambSomVoltar() {
    if (!ambSuspensoPorFundo) return;
    ambSuspensoPorFundo = false;
    const ctx = ambAudio.ctx;
    if (ctx && ctx.state === 'suspended') {
      try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ambSomEsconder(); else ambSomVoltar();
    });
    window.addEventListener('pagehide', ambSomEsconder);
    window.addEventListener('pageshow', e => { if (e && e.persisted) ambSomVoltar(); });
  }
  /* ---------- SOM-EM-FUNDO-FIM ---------- */
  ambAgendarAutoRaio();
  ambSincronizarRelogioExploracao();

  /* ---------- Escala: painel do Mestre (só #cfgpop, antes de #stats) ----------
   * A escala é definição do Mestre (desempate de 09/11): a secção
   * nasce SÓ com MODO_MESTRE, no padrão do Ambiente — na vista da
   * jogadora NADA disto é criado (sem nós, sem listeners, sem
   * globais). Os três preços oficiais; apertar muda a escala NA
   * HORA, a meio da batalha, sem custo e sem confirmação. O estado
   * vive em CASA_M; esta superfície só o pinta e o pede. */
  const escUI = { botoes: [] };
  function escSincronizarPainel() {
    for (const reg of escUI.botoes) reg.b.classList.toggle('on', reg.valor === CASA_M);
  }
  if (MODO_MESTRE) {
    const tituloEsc = document.createElement('h3');
    tituloEsc.textContent = 'Escala';
    cfgEl.insertBefore(tituloEsc, $('stats'));
    const linhaEsc = document.createElement('div');
    linhaEsc.className = 'cfgrow';
    const rotuloEsc = document.createElement('span');
    rotuloEsc.className = 'cl';
    rotuloEsc.innerHTML = 'Casa<small>quanto vale cada casa</small>';
    const grupoEsc = document.createElement('div');
    grupoEsc.className = 'seg';
    grupoEsc.setAttribute('role', 'group');
    grupoEsc.setAttribute('aria-label', 'Escala — metros por casa');
    for (const valor of ESCALAS_CASA_M) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'esc-' + String(valor).replace('.', '-');
      b.textContent = String(valor).replace('.', ',') + ' m';
      b.addEventListener('click', () => escalaAssentar(valor, {}));
      grupoEsc.appendChild(b);
      escUI.botoes.push({ valor, b });
    }
    linhaEsc.appendChild(rotuloEsc);
    linhaEsc.appendChild(grupoEsc);
    cfgEl.insertBefore(linhaEsc, $('stats'));
    escSincronizarPainel();
  }

  /* ---------- Supervisor: superfície do Mestre (só #cfgpop) ----------
   * S-001+M-016: esta superfície inteira só é CRIADA na vista do
   * Mestre (MODO_MESTRE). Na vista da Party nenhum destes elementos
   * entra no DOM, nenhum ouvinte é registado e supExportar recusa
   * à entrada — o registo (com o dano por golpe dos monstros e o
   * danoPorActor) nunca é gerado a partir da página da jogadora,
   * nem por toque nem por consola. */
  if (MODO_MESTRE) {
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
    alertasSupEl = document.createElement('div');
    alertasSupEl.id = 'sup-alertas';
    cfgEl.insertBefore(alertasSupEl, $('stats'));
    preSupEl = document.createElement('pre');
    preSupEl.id = 'sup-json';
    cfgEl.insertBefore(preSupEl, $('stats'));
    /* EXP-R2: linha de estado própria da secção do Supervisor —
       o retorno visível do «Voltar» e do «Exportar», só dentro
       das configurações. */
    supUltimoEl = document.createElement('div');
    supUltimoEl.id = 'sup-ultimo';
    cfgEl.insertBefore(supUltimoEl, $('stats'));
    botaoVoltarSup.addEventListener('click', () => supRestaurar());
    botaoExportarSup.addEventListener('click', () => supExportar());
  }
  function supRenderAlertas() {
    if (!alertasSupEl) return;   // Party: sem superfície, nada a pintar (o alerta fica no registo interno)
    alertasSupEl.innerHTML = '';
    for (const a of supAlertas) {
      const d = document.createElement('div');
      d.textContent = `Rodada ${a.rodada} · vez de ${nomeCena(a.vez)} — ${a.razao}`;
      alertasSupEl.appendChild(d);
    }
  }
  function supExportar() {
    /* S-001+M-016: o export NUNCA nasce na vista da Party — nem
       por toque (o botão não existe lá) nem por invocação forçada. */
    if (!MODO_MESTRE || !preSupEl) return;
    let dicasCrit = [], analisesCrit = {};
    try { dicasCrit = supCritDicasExport(); analisesCrit = supCritAnalises(); } catch (_) { supCritErrosCamada++; }
    preSupEl.textContent = JSON.stringify({
      eventos: supRegisto,
      recibosPublicos: RECIBOS_PUBLICOS.slice(),   // H-3: só os recibos FILTRADOS (prova do portão); o completo nunca se exporta
      alertas: supAlertas,
      snapshots: supPilha.map(e => e.estado),
      estadoActual: supEstadoCanonico(),
      fluidez: { amostrasFps: supAmostrasFps },
      dicas: dicasCrit,          // T1.7: anotações do Supervisor-Crítico
      analises: analisesCrit     // T1.7: resumos numéricos da camada de padrões
    }, null, 1);
    if (supUltimoEl) supUltimoEl.textContent = 'Registo exportado abaixo.';   // EXP-R2
  }

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
    if (!MODO_MESTRE) return supCritAggVazio();   // E2-07 (C-17): na Party, o agregado não se lê nem se persiste — perda declarada: o «crónico» alimenta-se só das batalhas vistas pelo Mestre. (A construção em memória vive só na closure, é idêntica ao vivo e morre com a sessão; DOM/consola/export estão guardados.)
    try {
      const j = JSON.parse(localStorage.getItem(SUPCRIT_AGG_CHAVE) || 'null');
      if (j && typeof j === 'object' && typeof j.batalhas === 'number')
        return Object.assign(supCritAggVazio(), j);
    } catch (_) {}
    return supCritAggVazio();
  }
  let supCritAgg = supCritAggLer();
  function supCritAggGuardar() {
    if (!MODO_MESTRE) return;   // E2-07 (C-17): na vista da Party o agregado não se persiste
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

  /* ---------- superfície do Crítico (só #cfgpop, antes de #stats) ----------
   * S-001+M-016: como o resto dos bastidores, esta superfície só é
   * CRIADA na vista do Mestre. Na Party, dicasSupEl fica null e
   * supCritRender não pinta nada (a camada interna continua a
   * observar — é passiva e invisível — mas não tem superfície). */
  if (MODO_MESTRE) {
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
    dicasSupEl = document.createElement('div');
    dicasSupEl.id = 'sup-dicas';
    cfgEl.insertBefore(dicasSupEl, $('stats'));
    botaoLimparCrit.addEventListener('click', () => {
      supCritAgg = supCritAggVazio();      // limpa SÓ o agregado entre batalhas
      supCritAggGuardar();
      supCrit.padroesBatalha.clear();
      if (supUltimoEl) supUltimoEl.textContent = 'Histórico de análises limpo.';
    });
  }
  const SUPCRIT_CATS = [['mecanica', 'Mecânica'], ['visual', 'Artes e visual'],
    ['maquina', 'Máquina'], ['animacao', 'Animações'], ['jogabilidade', 'Jogabilidade']];
  function supCritRender() {
    if (!dicasSupEl) return;   // S-001+M-016: Party não tem superfície do Crítico — nada a pintar
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
          && distanciaEntre(PROPRIA, u.id) <= alcanceEmCasas(DADOS_COMBATE.ong.alcance));
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
      /* LB-C-06: fim declarado (origem:'terminar') fecha a batalha
         sem somar queda nem avaliar padrões de queda — a batalha
         conta, a queda não. Só o fim natural soma queda e corre M5. */
      const fimDeclarado = ev.origem === 'terminar';
      supCritAvaliar(ev.rodada, true, fimDeclarado);
      supCritSomarAgregado(ev.rodada, !fimDeclarado);
    }
  }
  function supCritAutoSemDestino() {
    if (!supCritDesligado) supCrit.acc.autoSemDestino++;
  }
  function supCritSomarAgregado(rodadaQueda, contarQueda = true) {
    if (supCrit.agregadoSomado) return;
    supCrit.agregadoSomado = true;
    const acc = supCrit.acc, agg = supCritAgg;
    agg.batalhas++;
    if (contarQueda) agg.quedas[rodadaQueda] = (agg.quedas[rodadaQueda] || 0) + 1;
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
  function supCritAvaliar(r, fim, fimDeclarado = false) {
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
      /* LB-C-06: no fim declarado, M5 corre sem o padrão de queda —
         o dano-concentrado (não é padrão de queda) continua a avaliar. */
      try { supCritAvalM5(r, !fimDeclarado); } catch (_) { supCritErrosCamada++; }
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
  function supCritAvalM5(r, avaliarQueda = true) {
    if (avaliarQueda && (r <= 1 || r > 5)) {
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
        texto: `Entre uma vez sua e a outra, passaram ${supCritSeg(pior.durMs)} segundos a ver os monstros, na rodada ${pior.rodada}.`
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
        texto: `Entre uma vez sua e a outra, passam cerca de ${supCritSeg(medReal)} segundos a ver os monstros.`
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
          texto: `Você tocou ${n} vezes seguidas e o jogo só disse que não dava. A razão foi sempre a mesma: ${razao}.`
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
    ambSincronizarPainel();   // AMBIENTE: o rótulo «Forte» em qualidade Baixa segue a qualidade actual
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
        say(`Você fica por aqui — restavam <b>${restavam}</b> nesta vez.`);
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
  say('A preparar o campo…');
  view.ready.then(() => {
    const falhas = view.getStats().models.filter(m => m.loadError);
    if (falhas.some(m => m.id === PROPRIA)) {
      falhaArranque = 'Modelo da Ong indisponível. Batalha não iniciada.';
      renderAcoes(); say('');
      return;
    }
    selecionar(PROPRIA);
    sincronizarCamera();
    mostrarZoom();
    iniciarVez(PROPRIA);         // a batalha começa na vez dela, rodada 1 (D-13.3)
    /* Correcção E-02 da assimilação: a bandeira só sobe DEPOIS de o
       arranque estar completo — antes dela, say()/renderAcoes()
       mostram o estado de carregamento e nenhuma acção corre; se
       alguma função do arranque lançar, o catch apanha-a com a
       guarda ainda fechada e a falha fica visível com saída. */
    campoPronto = true;
    renderAcoes();
    /* A nota de modelo em falta JUNTA-SE à dica da primeira vez —
       nunca a sobrescreve (observação do juiz na análise do pacote). */
    say('É a vez da <b>Ong</b>. Aperte <b>Mover</b> e toque numa casa acesa para andar.'
      + (falhas.length
        ? `<br>Modelo indisponível: ${falhas.map(m => nomeCena(m.id)).join(', ')}. Marcador ativo.`
        : ''));
  }).catch(error => {
    /* Correcção E-07 da assimilação: falha de DADOS (a validação da
       cena lança TypeError/RangeError) não se cura com «Tentar de
       novo» — repetir repete a mesma falha para sempre. Distingue-se
       da falha de carregamento, que ganha o botão de recuperação. */
    falhaDefinitiva = error instanceof TypeError || error instanceof RangeError;
    falhaArranque = falhaDefinitiva
      ? 'Erro nos dados das figuras — a batalha não começou.'
      : 'Não foi possível preparar as figuras. A batalha não começou. Aperte Tentar de novo.';
    renderAcoes(); say('');
  });
  /* ════════════════════════════════════════════════════════════════════
     MODOS DE VISÃO/IMERSÃO — APLICAÇÃO À VISTA (integração no jogo vivo)
     Porta fiel da aplicação da página de referência (construcao-modos,
     blocos 1–2), com as adaptações declaradas no relatório da tranche:
       · o papel vem da entrada (MODO_MESTRE), não de um comutador de
         ensaio: nesta vista de Mestre, visaoAplicar devolve sem tocar
         em nada (A6 na forma mais forte — o ramo «mestre» da
         referência desfazia ocultações de um painel que aqui não
         existe, porque o papel nunca muda com a página aberta);
       · o olhar deriva da FRENTE REAL da figura (getStats), quantizado
         ao cardinal mais próximo pela correspondência da referência
         (VISAO_RAD) — a referência rodava a figura por um painel; aqui
         ninguém escreve a frente, só se lê;
       · obstáculos: visaoOpacos() devolve o registo de cobertura da
         arena viva — as 4 casas centrais do anel da fogueira, tapa-vista
         por palavra do Mestre (2026-11-11; DEFEITO-CIRCULO-PEDRAS §6-A);
         as pedras/ruínas restantes são decoração fora do registo. Na
         referência, os obstáculos eram cenário DECLARADO do ensaio
         (parede + árvore);
       · o sensor corre com os valores de ENSAIO da referência
         (VISAO_SENSOR — ver o bloco de estado);
       · a memória da Ultra morre também no fim da batalha (adenda):
         a vigia discreta detecta a transição e limpa os três registos.
     ════════════════════════════════════════════════════════════════════ */
  const visaoMemoria = { jaVisto: new Set(), lembrancas: new Map(), ultimaVisao: {} };
  const visaoCache = new Map();
  let visaoRelogioS = 0, visaoDesvioS = 0, visaoUltimoTick = performance.now();
  let visaoUltimoSnapshot = '', visaoMs = 0, visaoCasasVistas = 70, visaoEraFim = false;
  const visaoAgoraS = () => visaoRelogioS + visaoDesvioS;

  /* ---------- o sensor: elemento e estilo (só na vista da jogadora) ---------- */
  let visaoSensorEl = null;
  if (!MODO_MESTRE) {
    const visaoEstiloSensor = document.createElement('style');
    visaoEstiloSensor.textContent =
      '#sensor-visao{position:fixed;z-index:30;width:26px;height:26px;display:flex;align-items:center;justify-content:center;' +
      'color:#ffb52e;font-size:19px;text-shadow:0 0 6px rgba(255,160,20,.8);animation:sensorPisca 1.6s ease-in-out infinite;pointer-events:none}' +
      '#sensor-visao[hidden]{display:none}' +
      '@keyframes sensorPisca{0%,100%{opacity:.25}50%{opacity:1}}';
    document.head.appendChild(visaoEstiloSensor);
    visaoSensorEl = document.createElement('div');
    visaoSensorEl.id = 'sensor-visao';
    visaoSensorEl.hidden = true;
    visaoSensorEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(visaoSensorEl);
  }

  /* ---------- a função de visão (com cache por evento) ---------- */
  /* Registo de cobertura da arena viva: as 4 casas centrais — (4,2),
     (5,2), (4,3), (5,3) — onde assentam as 26 pedras do anel da fogueira
     (mundo.js:86-89, raio 1,35–1,65 m à volta do (0,0)). O anel é
     tapa-vista por palavra do Mestre (2026-11-11 11:46: «essa área na
     teoria ela não deveria tá vendo não?») — defeito medido e correcção
     custada em t-veu-suave/DEFEITO-CIRCULO-PEDRAS.md §6-A. As pedras e
     ruínas restantes continuam decoração fora do registo. Resíduo
     declarado: a LOS V2 permissiva vaza 1 casa longe do miolo em
     geometrias a olhar E (fechar esse resíduo é a opção C, por decidir). */
  function visaoOpacos() { return [[4, 2], [5, 2], [4, 3], [5, 3]]; }
  function visaoFrenteGraus(id) {
    const m = (view.getStats().models || []).find(m => m.id === id);
    return m ? m.frente : 0;
  }
  function visaoFrenteRad(id) { return visaoFrenteGraus(id) * Math.PI / 180; }
  /* O olhar dela = o cardinal mais próximo da frente real da figura
     (a correspondência VISAO_RAD da referência: N=180° · E=90° ·
     S=0° · W=270° em pivot.rotation.y). */
  function visaoOlharDerivadoDe(id) {
    const graus = ((visaoFrenteGraus(id) % 360) + 360) % 360;
    let melhor = 'S', melhorDist = 999;
    for (const [g, nome] of [[0, 'S'], [90, 'E'], [180, 'N'], [270, 'W']]) {
      const d = Math.min(Math.abs(graus - g), 360 - Math.abs(graus - g));
      if (d < melhorDist) { melhorDist = d; melhor = nome; }
    }
    return melhor;
  }
  function visaoOlharDerivado() { return visaoOlharDerivadoDe(PROPRIA); }
  function visaoCampo() {
    const ong = unidade(PROPRIA);
    const olhar = visaoOlharDerivado();
    const modelo = visaoModelo();
    const chaveCache = [ong.posicao.x, ong.posicao.y, olhar, modelo].join('|');
    if (visaoCache.has(chaveCache)) return visaoCache.get(chaveCache);
    const t0 = performance.now();
    const s = window.Visao.campo(AREA.cols, AREA.rows, [ong.posicao.x, ong.posicao.y], olhar, visaoOpacos(), 'V2', modelo);
    visaoMs = performance.now() - t0;
    visaoCache.set(chaveCache, s);
    return s;
  }
  function visaoLimparMemoria() {
    visaoMemoria.jaVisto.clear();
    visaoMemoria.lembrancas.clear();
    visaoMemoria.ultimaVisao = {};
    if (!MODO_MESTRE) view.limparFantasmas();
    else visaoPreviaLimparMemoria();   /* no Mestre, a mesma porta limpa também a memória da pré-vista */
  }

  /* ---------- a lembrança das figuras (só Ultra — adenda B) ---------- */
  function visaoLembrancasActualizar(campoVisto) {
    const agora = visaoAgoraS();
    for (const id of VISAO_INIMIGOS) {
      const u = unidade(id);
      if (!u) continue;
      const chaveCasa = u.posicao.x + ',' + u.posicao.y;
      const lem = visaoMemoria.lembrancas.get(id);
      if (campoVisto.has(chaveCasa)) {
        /* presença (viva ou caída à vista dela): não há lembrança —
           a última visão fica registada e o relógio reinicia */
        if (lem) { view.removeFantasma('lem-' + id); visaoMemoria.lembrancas.delete(id); }
        visaoMemoria.ultimaVisao[id] = { x: u.posicao.x, y: u.posicao.y, frenteRad: visaoFrenteRad(id), em: agora };
        continue;
      }
      const ult = visaoMemoria.ultimaVisao[id];
      if (!ult) continue;
      if (campoVisto.has(ult.x + ',' + ult.y)) {
        /* morte por contradição: ela olha para a casa lembrada e ele
           não está lá — a visão actual sobrepõe-se à crença */
        if (lem) view.removeFantasma('lem-' + id);
        visaoMemoria.lembrancas.delete(id);
        delete visaoMemoria.ultimaVisao[id];
        continue;
      }
      if (!lem || lem.x !== ult.x || lem.y !== ult.y) {
        view.addFantasma('lem-' + id, id, ult.x, ult.y, ult.frenteRad);
        visaoMemoria.lembrancas.set(id, { x: ult.x, y: ult.y });
      }
    }
  }

  /* ---------- o sensor (percepção base — §5.1 do estudo) ---------- */
  function visaoSensorActualizar(campoVisto, olhar) {
    if (!visaoSensorEl) return;
    let mostra = false, seta = '';
    if (visaoPartida.modo !== 'zero' && campoVisto) {
      const ong = unidade(PROPRIA), alvo = unidade(VISAO_SENSOR.alvo);
      if (ong && alvo && alvo.vivo) {
        const vx = alvo.posicao.x - ong.posicao.x, vy = alvo.posicao.y - ong.posicao.y;
        const dentro = Math.hypot(vx, vy) <= 6;               // círculo de 9 m
        const visto = campoVisto.has(alvo.posicao.x + ',' + alvo.posicao.y);
        if (dentro && VISAO_SENSOR.fb < VISAO_SENSOR.pb && !visto) {   // sentir ≠ ver
          mostra = true;
          const f = window.Visao.FRENTES[olhar];
          const frente = vx * f[0] + vy * f[1];
          const lado = f[0] * vy - f[1] * vx;                 // >0 = direita do corpo dela
          if (Math.abs(frente) >= Math.abs(lado)) seta = frente >= 0 ? '▲' : '▼';
          else seta = lado > 0 ? '▶' : '◀';
        }
      }
    }
    visaoSensorEl.hidden = !mostra;
    if (mostra) {
      visaoSensorEl.textContent = seta;
      const r = chipEl.getBoundingClientRect();               // mora à ESQUERDA da plaquinha
      visaoSensorEl.style.left = Math.max(0, r.left - 8) + 'px';
      visaoSensorEl.style.top = (r.top + r.height / 2 - 13) + 'px';
    }
  }

  /* ---------- aplicar o modo à vista ---------- */
  function visaoAplicar() {
    if (MODO_MESTRE) {   /* A6: a vista do Mestre é o jogo normal — nenhuma verba da visão corre aqui; com a pré-vista ligada por ele, aplica-se a pré-vista (bloco seguinte) */
      if (visaoPreviaMestre) visaoPreviaAplicar();
      return;
    }
    const ong = unidade(PROPRIA);
    if (!ong || !window.Visao) return;
    const modo = visaoPartida.modo;
    const olhar = visaoOlharDerivado();
    const todas = [];
    for (let y = 0; y < AREA.rows; y++) for (let x = 0; x < AREA.cols; x++) todas.push({ x, z: y });
    if (modo === 'zero') {
      for (const id of VISAO_INIMIGOS) if (unidade(id)) view.setOculto(id, false);
      view.setCamadas(null);
      view.limparFantasmas();
      visaoMemoria.lembrancas.clear();   /* EM-MODOS-01: o registo limpa-se como nos modos parcial/total */
      visaoCasasVistas = AREA.cols * AREA.rows;
      visaoSensorActualizar(new Set(todas.map(c => c.x + ',' + c.z)), olhar);
      return;
    }
    const campoVisto = visaoCampo();
    visaoCasasVistas = campoVisto.size;
    for (const id of VISAO_INIMIGOS) {
      const u = unidade(id);
      if (u) view.setOculto(id, !campoVisto.has(u.posicao.x + ',' + u.posicao.y));
    }
    const naoVistas = todas.filter(c => !campoVisto.has(c.x + ',' + c.z));
    if (modo === 'parcial') {
      view.setCamadas(null);
      view.limparFantasmas();
    } else if (modo === 'total') {
      view.setCamadas({ total: { cells: naoVistas, cor: 0x0b0e14, opacidade: 0.55 } });
      view.limparFantasmas();
    } else { /* ultra */
      for (const k of campoVisto) visaoMemoria.jaVisto.add(k);
      const nunca = naoVistas.filter(c => !visaoMemoria.jaVisto.has(c.x + ',' + c.z));
      const lembradas = naoVistas.filter(c => visaoMemoria.jaVisto.has(c.x + ',' + c.z));
      view.setCamadas({
        nunca: { cells: nunca, cor: 0x05070a, opacidade: 0.92 },
        memoria: { cells: lembradas, cor: 0x8b93a1, opacidade: 0.30 }
      });
      visaoLembrancasActualizar(campoVisto);
    }
    if (modo !== 'ultra') visaoMemoria.lembrancas.clear();
    visaoSensorActualizar(campoVisto, olhar);
  }

  /* ════════════════════════════════════════════════════════════════════
     PRÉ-VISTA DO MESTRE — «Ver como as jogadoras» (pedido dele,
     11/11/2026 08:44). Interruptor do ⚙ dele, DESLIGADO por omissão:
     a regra A6 fica intacta — só com o interruptor ligado é que o
     ecrã DESTE aparelho mostra o mundo como as jogadoras o veem
     (modo/forma/prazo em vigor), calculado sobre a UNIÃO dos campos
     das heroínas: o que qualquer uma vê, ele vê na pré-vista; o que
     nenhuma vê, fica escondido dele na pré-vista. É só a vista deste
     aparelho: não toca no estado da partida, não entra em saves nem
     snapshots, não muda o que as jogadoras veem nos aparelhos delas.
     A memória é PRÓPRIA (visaoPrevMemoria) — a memória da jogadora e
     a da partida nunca são tocadas pela pré-vista. O sensor fica de
     fora (declarado): é a marca de percepção privada do ecrã dela,
     não é campo de visão.
     Persistência (o padrão da casa dos outros interruptores do ⚙ —
     qualidade, velocidade, tela vermelha): preferência DESTE
     aparelho em localStorage 'hudt1-visao-previa' = 'ligado' |
     'desligado'; nasce desligado, lê-se ao arranque nos dois papéis
     e só se consome na vista do Mestre (a única onde o interruptor
     existe). NUNCA entra em visaoPartida: o domínio dela é fechado
     (modo/forma/prazo/anel) e viaja na partida — isto é do ecrã, não dela.
     ════════════════════════════════════════════════════════════════════ */
  let visaoPreviaMestre = false;
  try { visaoPreviaMestre = localStorage.getItem('hudt1-visao-previa') === 'ligado'; } catch (_) {}
  const visaoPrevMemoria = { jaVisto: new Set(), lembrancas: new Map(), ultimaVisao: {} };
  const visaoPrevCache = new Map();
  let visaoPrevCasasVistas = AREA.cols * AREA.rows;
  let visaoPrevUltimoSnapshot = null, visaoPrevEraFim = false;

  /* os olhos das jogadoras: as unidades do lado das heroínas (todas
     as do ELENCO fora de VISAO_INIMIGOS), cada uma com posição e
     olhar seus — hoje a Ong; no elenco real, as três heroínas */
  function visaoOlhosJogadoras() {
    const olhos = [];
    for (const e of ELENCO) {
      if (VISAO_INIMIGOS.includes(e.id)) continue;
      const u = unidade(e.id);
      if (u) olhos.push({ id: e.id, x: u.posicao.x, y: u.posicao.y, olhar: visaoOlharDerivadoDe(e.id) });
    }
    return olhos;
  }
  /* o campo de UM olho, pela mesma chamada que a vista dela usa,
     com cache por posição/olhar/modelo (paralela à cache dela) */
  function visaoCampoOlho(x, y, olhar) {
    const modelo = visaoModelo();
    const chaveCache = [x, y, olhar, modelo].join('|');
    if (visaoPrevCache.has(chaveCache)) return visaoPrevCache.get(chaveCache);
    const s = window.Visao.campo(AREA.cols, AREA.rows, [x, y], olhar, visaoOpacos(), 'V2', modelo);
    visaoPrevCache.set(chaveCache, s);
    return s;
  }
  /* a UNIÃO dos campos: o que qualquer heroína vê. Sem argumento,
     lê os olhos vivos; com olhos dados, é a mesma operação sobre
     eles (é por aqui que a bateria a prova com dois olhos) — um só
     sítio de consumo: visaoPreviaAplicar chama-a sem argumentos */
  function visaoCampoUniao(olhos) {
    const uniao = new Set();
    for (const o of (olhos || visaoOlhosJogadoras()))
      for (const k of visaoCampoOlho(o.x, o.y, o.olhar)) uniao.add(k);
    return uniao;
  }
  function visaoPreviaLimparMemoria() {
    /* os fantasmas da vista só se varrem quando o registo diz que
       existem (fantasma no ecrã ⇔ entrada em lembrancas — nascem e
       morrem sempre aos pares): com a pré-vista desligada ou sem
       fantasmas, limpar a memória não toca na vista, como a A6 manda */
    const tinhaFantasmas = visaoPrevMemoria.lembrancas.size > 0;
    visaoPrevMemoria.jaVisto.clear();
    visaoPrevMemoria.lembrancas.clear();
    visaoPrevMemoria.ultimaVisao = {};
    if (tinhaFantasmas) view.limparFantasmas();
  }
  /* gémea de visaoLembrancasActualizar sobre a memória da pré-vista */
  function visaoPreviaLembrancasActualizar(campoVisto) {
    const agora = visaoAgoraS();
    for (const id of VISAO_INIMIGOS) {
      const u = unidade(id);
      if (!u) continue;
      const chaveCasa = u.posicao.x + ',' + u.posicao.y;
      const lem = visaoPrevMemoria.lembrancas.get(id);
      if (campoVisto.has(chaveCasa)) {
        if (lem) { view.removeFantasma('lem-' + id); visaoPrevMemoria.lembrancas.delete(id); }
        visaoPrevMemoria.ultimaVisao[id] = { x: u.posicao.x, y: u.posicao.y, frenteRad: visaoFrenteRad(id), em: agora };
        continue;
      }
      const ult = visaoPrevMemoria.ultimaVisao[id];
      if (!ult) continue;
      if (campoVisto.has(ult.x + ',' + ult.y)) {
        if (lem) view.removeFantasma('lem-' + id);
        visaoPrevMemoria.lembrancas.delete(id);
        delete visaoPrevMemoria.ultimaVisao[id];
        continue;
      }
      if (!lem || lem.x !== ult.x || lem.y !== ult.y) {
        view.addFantasma('lem-' + id, id, ult.x, ult.y, ult.frenteRad);
        visaoPrevMemoria.lembrancas.set(id, { x: ult.x, y: ult.y });
      }
    }
  }
  /* aplicar a pré-vista: o espelho de visaoAplicar, movido pela união */
  function visaoPreviaAplicar() {
    if (!MODO_MESTRE || !visaoPreviaMestre || !window.Visao) return;
    const olhos = visaoOlhosJogadoras();
    if (!olhos.length) return;   /* sem heroína no estado, nada a pré-ver */
    const modo = visaoPartida.modo;
    const todas = [];
    for (let y = 0; y < AREA.rows; y++) for (let x = 0; x < AREA.cols; x++) todas.push({ x, z: y });
    if (modo === 'zero') {
      for (const id of VISAO_INIMIGOS) if (unidade(id)) view.setOculto(id, false);
      view.setCamadas(null);
      view.limparFantasmas();
      visaoPrevMemoria.lembrancas.clear();   /* como no modo zero dela: o registo de fantasmas limpa-se */
      visaoPrevCasasVistas = AREA.cols * AREA.rows;
      return;
    }
    const campoVisto = visaoCampoUniao(olhos);
    visaoPrevCasasVistas = campoVisto.size;
    for (const id of VISAO_INIMIGOS) {
      const u = unidade(id);
      if (u) view.setOculto(id, !campoVisto.has(u.posicao.x + ',' + u.posicao.y));
    }
    const naoVistas = todas.filter(c => !campoVisto.has(c.x + ',' + c.z));
    if (modo === 'parcial') {
      view.setCamadas(null);
      view.limparFantasmas();
    } else if (modo === 'total') {
      view.setCamadas({ total: { cells: naoVistas, cor: 0x0b0e14, opacidade: 0.55 } });
      view.limparFantasmas();
    } else { /* ultra */
      for (const k of campoVisto) visaoPrevMemoria.jaVisto.add(k);
      const nunca = naoVistas.filter(c => !visaoPrevMemoria.jaVisto.has(c.x + ',' + c.z));
      const lembradas = naoVistas.filter(c => visaoPrevMemoria.jaVisto.has(c.x + ',' + c.z));
      view.setCamadas({
        nunca: { cells: nunca, cor: 0x05070a, opacidade: 0.92 },
        memoria: { cells: lembradas, cor: 0x8b93a1, opacidade: 0.30 }
      });
      visaoPreviaLembrancasActualizar(campoVisto);
    }
    if (modo !== 'ultra') visaoPrevMemoria.lembrancas.clear();
  }
  /* desligar: a vista completa do Mestre volta no mesmo clique —
     desoculta tudo, tira os véus e os fantasmas. O jaVisto
     conserva-se entre ligar/desligar (espelho da vista dela, onde
     trocar de modo não o limpa); limpa-se pelas portas da casa
     (visaoLimparMemoria) e no fim da batalha */
  function visaoPreviaRepor() {
    for (const id of VISAO_INIMIGOS) if (unidade(id)) view.setOculto(id, false);
    view.setCamadas(null);
    view.limparFantasmas();
    visaoPrevMemoria.lembrancas.clear();
    visaoPrevCasasVistas = AREA.cols * AREA.rows;
  }
  function visaoPreviaDefinir(v) {
    const novo = !!v;
    if (novo !== visaoPreviaMestre) {
      visaoPreviaMestre = novo;
      try { localStorage.setItem('hudt1-visao-previa', novo ? 'ligado' : 'desligado'); } catch (_) {}
      if (novo) { visaoPrevUltimoSnapshot = null; visaoPreviaAplicar(); }
      else visaoPreviaRepor();
    }
    visaoSincronizarPainel();
    return true;
  }

  /* ---------- o ⚙ do Mestre: secção «Visão» (só nesta vista) ---------- */
  const visaoUI = { botoesModo: [], botoesForma: [], botoesAnel: [], botoesPrazo: [], botoesPrevia: [], estadoEl: null };
  function visaoSincronizarPainel() {
    const e = visaoPartida;
    if (visaoUI.estadoEl)
      visaoUI.estadoEl.textContent = 'Modo ' + VISAO_MODO_NOMES[e.modo] + ' · ' + VISAO_FORMA_NOMES[e.forma] +
        ' · ao redor ' + (e.anel ? 'ligado' : 'desligado') +
        ' · lembrança ' + (e.prazo === 'off' ? 'sem prazo' : 'com prazo de ' + e.prazo + ' min') +
        (visaoPreviaMestre ? ' · pré-vista ligada' : '');
    for (const reg of visaoUI.botoesModo) reg.b.classList.toggle('on', e.modo === reg.v);
    for (const reg of visaoUI.botoesForma) reg.b.classList.toggle('on', e.forma === reg.v);
    for (const reg of visaoUI.botoesAnel) reg.b.classList.toggle('on', e.anel === reg.v);
    for (const reg of visaoUI.botoesPrazo) reg.b.classList.toggle('on', e.prazo === reg.v);
    for (const reg of visaoUI.botoesPrevia) reg.b.classList.toggle('on', visaoPreviaMestre === reg.v);
  }
  if (MODO_MESTRE) {
    const tituloVisao = document.createElement('h3');
    tituloVisao.textContent = 'Visão';
    cfgEl.insertBefore(tituloVisao, $('stats'));
    const estadoVisaoEl = document.createElement('div');
    estadoVisaoEl.id = 'visao-estado';
    estadoVisaoEl.className = 'amb-estado';
    cfgEl.insertBefore(estadoVisaoEl, $('stats'));
    visaoUI.estadoEl = estadoVisaoEl;
    const visaoLinha = (rotulo, aria, opcoes, registro, chave) => {
      const linha = document.createElement('div');
      linha.className = 'cfgrow vel';
      const rot = document.createElement('span');
      rot.className = 'cl';
      rot.textContent = rotulo;
      const grupo = document.createElement('div');
      grupo.className = 'seg';
      grupo.setAttribute('role', 'group');
      grupo.setAttribute('aria-label', aria);
      for (const [v, nome] of opcoes) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = nome;
        b.addEventListener('click', () => {
          const prox = { ...visaoPartida };
          prox[chave] = v;
          if (visaoAssentar(prox, {}))
            say('Visão da partida: modo ' + VISAO_MODO_NOMES[visaoPartida.modo] + ', ' + VISAO_FORMA_NOMES[visaoPartida.forma] +
              ', ao redor ' + (visaoPartida.anel ? 'ligado' : 'desligado') +
              ', lembrança ' + (visaoPartida.prazo === 'off' ? 'sem prazo.' : 'com prazo de ' + visaoPartida.prazo + ' min.'));
        });
        grupo.appendChild(b);
        registro.push({ v, b });
      }
      linha.appendChild(rot);
      linha.appendChild(grupo);
      cfgEl.insertBefore(linha, $('stats'));
    };
    visaoLinha('Modo', 'Modo de visão das jogadoras',
      [['zero', 'Zero'], ['parcial', 'Parcial'], ['total', 'Total'], ['ultra', 'Ultra']], visaoUI.botoesModo, 'modo');
    visaoLinha('Forma', 'Forma do campo de visão',
      [['larga', 'Larga 180°'], ['maqueta', 'Maqueta 120°'], ['cone', 'Cone 120°']], visaoUI.botoesForma, 'forma');
    visaoLinha('Ver ao redor', 'Ver as casas ao redor da personagem',
      [[false, 'Desligado'], [true, 'Ligado']], visaoUI.botoesAnel, 'anel');
    visaoLinha('Lembrança', 'Prazo da lembrança (só Ultra)',
      [['off', 'Desligado'], ['1', '1 min'], ['2', '2 min']], visaoUI.botoesPrazo, 'prazo');
    const linhaPrevia = document.createElement('div');
    linhaPrevia.className = 'cfgrow vel';
    const rotPrevia = document.createElement('span');
    rotPrevia.className = 'cl';
    rotPrevia.textContent = 'Ver como as jogadoras';
    const grupoPrevia = document.createElement('div');
    grupoPrevia.className = 'seg';
    grupoPrevia.setAttribute('role', 'group');
    grupoPrevia.setAttribute('aria-label', 'Ver como as jogadoras');
    for (const [v, nome] of [[false, 'Desligado'], [true, 'Ligado']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = nome;
      b.addEventListener('click', () => {
        if (visaoPreviaDefinir(v))
          say(v ? 'Pré-vista ligada: vês o campo como as jogadoras.'
                : 'Pré-vista desligada: vista completa do Mestre.');
      });
      grupoPrevia.appendChild(b);
      visaoUI.botoesPrevia.push({ v, b });
    }
    linhaPrevia.appendChild(rotPrevia);
    linhaPrevia.appendChild(grupoPrevia);
    cfgEl.insertBefore(linhaPrevia, $('stats'));
    visaoSincronizarPainel();
  }

  /* ---------- eventos discretos + a vigia da lembrança ---------- */
  view.on('moveend', () => { visaoAplicar(); });
  setInterval(() => {
    if (MODO_MESTRE) {
      /* a vigia do Mestre só corre com a pré-vista ligada (desligada,
         custa uma leitura de bandeira e não muda nada — A6): o mesmo
         esqueleto da vigia dela, sobre a memória da pré-vista —
         relógio da visão, prazo dos fantasmas dela, a morte da
         lembrança no fim da batalha e a fotografia discreta */
      if (!visaoPreviaMestre) { visaoUltimoTick = performance.now(); return; }
      const agoraMsP = performance.now();
      visaoRelogioS += (agoraMsP - visaoUltimoTick) / 1000;
      visaoUltimoTick = agoraMsP;
      if (visaoPartida.prazo !== 'off' && visaoPartida.modo === 'ultra' && visaoPrevMemoria.lembrancas.size) {
        const limiteP = visaoPartida.prazo === '1' ? 60 : 120, agoraP = visaoAgoraS();
        for (const id of [...visaoPrevMemoria.lembrancas.keys()]) {
          const ult = visaoPrevMemoria.ultimaVisao[id];
          if (ult && agoraP - ult.em > limiteP) {
            view.removeFantasma('lem-' + id);
            visaoPrevMemoria.lembrancas.delete(id);
            delete visaoPrevMemoria.ultimaVisao[id];
          }
        }
      }
      if (batalhaFim && !visaoPrevEraFim) {
        visaoPrevEraFim = true;
        visaoPreviaLimparMemoria();
      } else if (!batalhaFim) visaoPrevEraFim = false;
      const snapP = ELENCO.map(e => {
        const u = unidade(e.id);
        return u ? e.id + ':' + u.posicao.x + ',' + u.posicao.y + ':' + (u.vivo ? 1 : 0) : e.id + ':?';
      }).join('|') + '|f' + visaoOlhosJogadoras().map(o => Math.round(visaoFrenteGraus(o.id))).join(',') +
        '|fim' + (batalhaFim ? 1 : 0) +
        '|' + visaoPartida.modo + '/' + visaoPartida.forma + '/' + visaoPartida.prazo + '/' + visaoPartida.anel;
      if (visaoPrevUltimoSnapshot === null) visaoPrevUltimoSnapshot = snapP;
      else if (snapP !== visaoPrevUltimoSnapshot) {
        visaoPrevUltimoSnapshot = snapP;
        visaoPreviaAplicar();
      }
      return;
    }
    const agoraMs = performance.now();
    visaoRelogioS += (agoraMs - visaoUltimoTick) / 1000;
    visaoUltimoTick = agoraMs;
    /* o prazo: ligado, o fantasma expira ao fim do tempo sem ser visto
       (conta da ÚLTIMA VISÃO registada — porta exacta da referência) */
    if (visaoPartida.prazo !== 'off' && visaoPartida.modo === 'ultra' && visaoMemoria.lembrancas.size) {
      const limite = visaoPartida.prazo === '1' ? 60 : 120, agora = visaoAgoraS();
      for (const id of [...visaoMemoria.lembrancas.keys()]) {
        const ult = visaoMemoria.ultimaVisao[id];
        if (ult && agora - ult.em > limite) {
          view.removeFantasma('lem-' + id);
          visaoMemoria.lembrancas.delete(id);
          delete visaoMemoria.ultimaVisao[id];
        }
      }
    }
    /* a lembrança morre no fim da batalha (adenda do desenho) */
    if (batalhaFim && !visaoEraFim) {
      visaoEraFim = true;
      visaoLimparMemoria();
    } else if (!batalhaFim) visaoEraFim = false;
    /* mudanças fora dos eventos (vezes da IA, rotações, o fim) — a
       vigia é por fotografia discreta, nunca por fotograma */
    const snap = ELENCO.map(e => {
      const u = unidade(e.id);
      return u ? e.id + ':' + u.posicao.x + ',' + u.posicao.y + ':' + (u.vivo ? 1 : 0) : e.id + ':?';
    }).join('|') + '|f' + Math.round(visaoFrenteGraus(PROPRIA)) + '|fim' + (batalhaFim ? 1 : 0) +
      '|' + visaoPartida.modo + '/' + visaoPartida.forma + '/' + visaoPartida.prazo + '/' + visaoPartida.anel;
    if (snap !== visaoUltimoSnapshot) {
      visaoUltimoSnapshot = snap;
      visaoAplicar();
    }
  }, 400);

  /* ---------- gancho de prova da bateria (não é mecânica) ---------- */
  window.__visao = Object.freeze({
    estado: () => ({
      papel: MODO_MESTRE ? 'mestre' : 'jogadora',
      modo: visaoPartida.modo, forma: visaoPartida.forma, prazo: visaoPartida.prazo, anel: visaoPartida.anel,
      olhar: MODO_MESTRE ? null : visaoOlharDerivado(),
      casasVistas: visaoCasasVistas, ms: visaoMs,
      fantasmas: view.listaFantasmas(),
      memoriaCasas: visaoMemoria.jaVisto.size,
      relogioS: visaoAgoraS(),
      previa: MODO_MESTRE ? { activa: visaoPreviaMestre, casasVistas: visaoPrevCasasVistas, memoriaCasas: visaoPrevMemoria.jaVisto.size } : null,
      ocultos: VISAO_INIMIGOS.filter(id => view.estaOculto(id)),
      sensorVisivel: visaoSensorEl ? !visaoSensorEl.hidden : false,
      sensorSeta: visaoSensorEl ? visaoSensorEl.textContent : ''
    }),
    definir: (parcial) => {
      const prox = { ...visaoPartida };
      if (parcial && typeof parcial === 'object') {
        if ('modo' in parcial) prox.modo = parcial.modo;
        if ('forma' in parcial) prox.forma = parcial.forma;
        if ('prazo' in parcial) prox.prazo = parcial.prazo;
        if ('anel' in parcial) prox.anel = parcial.anel;
      }
      return visaoAssentar(prox, {});
    },
    avancarSegundos: (s) => { visaoDesvioS += Number(s) || 0; },
    campo: () => {
      if (MODO_MESTRE || !window.Visao) return null;
      const ong = unidade(PROPRIA);
      if (!ong) return null;
      return [...window.Visao.campo(AREA.cols, AREA.rows, [ong.posicao.x, ong.posicao.y], visaoOlharDerivado(), visaoOpacos(), 'V2', visaoModelo())];
    },
    campoPrevia: () => {
      if (!MODO_MESTRE || !window.Visao) return null;
      return [...visaoCampoUniao()];
    },
    uniao: (olhos) => {
      if (!window.Visao) return null;
      return [...visaoCampoUniao(Array.isArray(olhos) ? olhos : undefined)];
    },
    previaDefinir: (v) => visaoPreviaDefinir(v)
  });

  /* ---------- arranque ---------- */
  view.ready.then(() => {
    visaoUltimoSnapshot = ELENCO.map(e => {
      const u = unidade(e.id);
      return u ? e.id + ':' + u.posicao.x + ',' + u.posicao.y + ':' + (u.vivo ? 1 : 0) : e.id + ':?';
    }).join('|') + '|f' + Math.round(visaoFrenteGraus(PROPRIA)) + '|fim' + (batalhaFim ? 1 : 0) +
      '|' + visaoPartida.modo + '/' + visaoPartida.forma + '/' + visaoPartida.prazo + '/' + visaoPartida.anel;
    visaoAplicar();
  });
})();
