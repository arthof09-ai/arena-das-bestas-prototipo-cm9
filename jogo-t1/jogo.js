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

  /* ---------- VOO (tranche F-36, REF_89) — dados ----------
   * O desenho governante é a sentença de 08/11/2026 com a
   * inscrição do Mestre de 09/11 (07:09–07:12, refino 07:27) e as
   * complementares N1/N2; a análise cláusula a cláusula vive em
   * t-voo-c41/ANALISE-COMPLETA.md. A camada z ∈ {0,…,10} é estado
   * DA CASCA: a cena só conhece a projecção (altitude = camada ×
   * 1,5 m, o CELL do mundo). Quem pode voar declara a origem no
   * campo `voo` da ficha (origens fechadas: asas · transformacao ·
   * tecnica); unidade sem estado de voo lê-se camada 0 em todas
   * as portas, e campo novo em save/evento só aparece quando a
   * camada é > 0 (o padrão da casa: escala, visão, furtividade).
   * FIGURAS_TESTE: figuras de banco de ensaio — NÃO são elenco:
   * não nascem com a batalha, entram só por admissão (aba Testes
   * do Mestre ou aplicar um save que as traz) e a vitória ignora
   * as não-presentes. O Grifo é a figura de teste do desenho
   * (âncora IBX-191: CONCEPT/FULLSPEC de comportamento, sem ficha
   * numérica na fonte). Proveniência dos números, declarada como
   * a fonte PJR1 os declara (characters.gd, entrada grifo):
   * Vida 110, CA 30 e dano das Garras 2d6+3 são o PREENCHIMENTO
   * DE PROTÓTIPO daquela fonte; iniciativa 1 idem; a altura
   * 3,8 m é o corpus VZ (380 cm no ombro, SISTEMA-DE-MEDIDAS);
   * ataque 1d6+10 e reserva interna 6 são preenchimento DESTE
   * banco de ensaio (o «atk 7» do PJR1 é outra convenção de
   * protótipo e não se converte; +10 é o padrão corpo-a-corpo
   * desta casca; a reserva é constante interna, como os 7/6/9
   * do elenco). Alcance 1,5 = garras, corpo-a-corpo. */
  const VOO_TECTO = 10;
  const VOO_METROS_CAMADA = 1.5;
  const FIGURAS_TESTE = {
    grifo: {
      nome: 'Grifo-Matriarca de Sílica', modelo: 'marcador', alturaMetros: 3.8,
      voo: 'asas', vida: 110,
      combate: { ca: 30, atkQtd: 1, atkFaces: 6, atkBonus: 10, arma: 'Garras',
        dano: { qtd: 2, faces: 6, bonus: 3 }, alcance: 1.5 },
      orcamento: 6, iniciativa: 1,
      frases: { acerto: 'deu uma garrada', falha: 'tentou dar uma garrada' }
    }
  };
  const vooEstado = {};              // id -> { z, asaTorada } — só de quem pode voar e está presente
  const testesPresentes = new Set(); // ids das figuras de teste admitidas nesta batalha
  /* Instância de teste -> modelo ('grifo2' é a segunda voadora
     de ensaio da bateria; o jogo só admite o que a aba Testes e
     os saves nomeiam). */
  function vooModeloDe(id) {
    if (FIGURAS_TESTE[id]) return id;
    const base = String(id).replace(/\d+$/, '');
    return FIGURAS_TESTE[base] ? base : null;
  }
  function vooOrigemDe(id) {
    const m = vooModeloDe(id);
    if (m && testesPresentes.has(id)) return FIGURAS_TESTE[m].voo;
    const e = ELENCO.find(u => u.id === id);
    return e && e.voo ? e.voo : null;
  }
  function camadaDe(id) {
    const v = vooEstado[id];
    return v ? (v.z | 0) : 0;
  }
  function vooPodeVoar(id) {
    if (!vooOrigemDe(id)) return false;
    const v = vooEstado[id];
    if (v && v.asaTorada) return false;
    const u = unidade(id);
    return !!u && u.vivo !== false;
  }
  const chave3 = (x, y, z) => x + ',' + y + ',' + z;
  /* A conversão motor->vista de um ponto com camada: a altitude
     é a projecção da camada em metros do mundo (z=10 -> 15 m,
     dentro do domínio 0..60 da cena). */
  function casaVistaVoo(p) {
    const v = casaVista(p);
    v.altitude = (p.z || 0) * VOO_METROS_CAMADA;
    return v;
  }

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
    msgTxt.innerHTML = '<b>O campo 3D não pôde ser mostrado</b> neste aparelho — tenta outro navegador.';
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
  /* SENSOR (percepção base — §5.1 do estudo v2): corre com os
     valores REAIS lavrados em t-furtividade-base/VALORES-BASE.md
     (fórmula do Mestre, 11/11/2026: atributo + perícia + bónus
     fixos, os dados fora; P4 dissolvida — toda a ficha tem base).
     O trio de ensaio {pb:60, fb:50, alvo:'capanga'} SAIU: o alvo
     deixa de ser «só o Capanga» e a comparação corre para
     qualquer par (figura × observadora) em que os DOIS valores
     existam — par sem os dois valores não corre (sem estimativas).
     Regime P3 final (palavra dele, 14:22–14:23): fora do campo, é
     SEMPRE base contra base, automático, sem declaração e sem
     rolagens. O sensor não corre entre aliadas (H5: o sinal é
     sensação de perigo). O sensor nunca cria, move nem apaga
     lembranças: sente o LADO (sectores de 90°), nunca a casa.
     Contas abertas NÃO entram: Chen/Bushi (resíduo por decompor
     nas fichas) e o Capanga (atributos não lidos) ficam fora da
     tabela até as contas fecharem — os pares deles não correm. */
  const FURTIVIDADE_BASES = {
    wang:     { pb: 42, fb: 40 },   // da linha da ficha (roll: 2d6+42 / 2d6+40) — o elenco vivo de hoje ainda não a tem
    orc:      { pb: 3,  fb: 8 },    // SAB 3 · DES 8 (+ perícia 0 sem linha + fixos 0)
    lobo:     { pb: 7,  fb: 20 },   // SAB 7 · DES 20 (Estágio Prata 1, o desta arena)
    ong:      { pb: 8,  fb: 15 },   // SAB 8 · DES 15 (forma normal)
    espectro: { pb: 2,  fb: 55 }    // SAB 2 · DES 55 (bestiário — fora do elenco vivo)
  };
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
  /* Valores de fábrica dos volumes (REF_86, palavra do Mestre
   * 13/11/2026: «deixe o som da música pré-setado em 8%») — a
   * Música nasce a 8; quem tem valor guardado não passa por aqui:
   * o guardado manda sempre. */
  const SOM_PADRAO = { 'hudt1-som-geral': 100, 'hudt1-som-musica': 8, 'hudt1-som-efeitos': 100 };
  function lerVolumeSom(chave) {
    const padrao = SOM_PADRAO[chave] ?? 100;
    try {
      const v = localStorage.getItem(chave);
      if (v === null || !/^[0-9]+$/.test(v)) return padrao;
      const n = Number(v);
      return (n >= 0 && n <= 100) ? n : padrao;
    } catch (_) { return padrao; }
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
      /* MÚSICA DE BATALHA (t-musica-batalha): o bus da música nasce
       * com o contexto, ligado DIRECTO ao destino — fora do master
       * do ambiente, cujo factor é o dos Efeitos — e a faixa carrega
       * em fundo, como as chuvas. */
      try {
        musica.ganho = ctx.createGain();
        musica.ganho.gain.value = 0;
        musica.ganho.connect(ctx.destination);
      } catch (_) { musica.ganho = null; }
      musCarregar(ctx);
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
    /* A música da batalha sincroniza no mesmo sítio: os reguladores
     * que chamam esta função (Geral, Efeitos, Mudo, Restaurar, o
     * assentador do ambiente e o desbloqueio por gesto) são os
     * mesmos gestos que a podem acordar ou calar. */
    musSincronizar();
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

  /* ---------- MÚSICA DE BATALHA (tranche t-musica-batalha) ----------
   * Palavra do Mestre (12/11/2026 09:32): «Já pode pôr no jogo» — a
   * faixa «Batalha Calma — Pulso Contido» (Suno, Leva 2; o ficheiro
   * que ele próprio descarregou e enviou) é a música DA BATALHA:
   * toca em loop enquanto a batalha decorre e cala quando ela acaba
   * (fim natural, fim declarado, restauro de save ou Recomeçar —
   * este recarrega a página). A trilha do título é outra (entrada.js,
   * rotação da REF_60) e não se toca aqui.
   * BUS PRÓPRIO: musica.ganho liga DIRECTO ao destino, fora do
   * master do ambiente — o master carrega o factor dos Efeitos
   * (somFatorAmbiente) e a música não pode ser atenuada por ele.
   * O ganho calcula-se NUM SÍTIO SÓ, na fórmula do som pessoal:
   * 0,45 × G × M × (mudo?0:1), com G/M/mudo lidos das MESMAS chaves
   * hudt1-som-* e da mesma leitura defensiva. Música a 0 ou Mudo
   * ligado = batalha sem música, sem erros.
   * A faixa carrega em fundo como as chuvas (fetch + decode); se o
   * ficheiro falhar, a batalha fica sem música e nada parte. O
   * arranque obedece ao desbloqueio por gesto do ambiente: sem
   * gesto ainda, a música espera pelo primeiro toque, como o resto
   * dos sons da casa. Parar = fundido curto do bus + stop() diferido
   * da fonte (uma fonte parada não se reaproveita: ao retomar nasce
   * outra, do início da faixa).
   * FONTE E COSTURA DO LOOP: o m4a enviado chegou truncado no
   * índice do contentor — só os primeiros 2.071 quadros AAC
   * (44,18 s) se recuperam byte a byte; o musica-batalha.ogg é o
   * trecho firme dessa recuperação, com a emenda medida e tratada
   * na sede (ESTADO.md de t-musica-batalha). */
  const musica = { ganho: null, buffer: null, fonte: null, aTocar: false };
  function somFatorMusica() {
    return (somGeral / 100) * (somMusica / 100) * (somMudo ? 0 : 1);
  }
  function musCarregar(ctx) {
    try {
      fetch('musica-batalha.ogg')
        .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
        .then(ab => ctx.decodeAudioData(ab))
        .then(buf => { musica.buffer = buf; musSincronizar(); })
        .catch(() => { /* sem faixa: a batalha fica sem música */ });
    } catch (_) {}
  }
  function musSincronizar() {
    const ctx = ambAudio.ctx;
    if (!ctx || !musica.ganho) return;
    try {
      const deveTocar = ctx.state === 'running' && ambAudio.desbloqueado &&
        !!musica.buffer && !batalhaFim;
      const alvo = deveTocar ? 0.45 * somFatorMusica() : 0;
      const agora = ctx.currentTime;
      musica.ganho.gain.cancelScheduledValues(agora);
      musica.ganho.gain.setTargetAtTime(alvo, agora, 0.15);
      if (deveTocar && !musica.aTocar) {
        const s = ctx.createBufferSource();
        s.buffer = musica.buffer;
        s.loop = true;
        s.connect(musica.ganho);
        s.start();
        musica.fonte = s;
        musica.aTocar = true;
      } else if (!deveTocar && musica.aTocar) {
        const s = musica.fonte;
        musica.fonte = null;
        musica.aTocar = false;
        if (s) { try { s.stop(agora + 0.7); } catch (_) {} }
      }
    } catch (_) {}
  }
  /* Gancho de prova SÓ-LEITURA da música (o mesmo padrão do
   * __somEstado, sentença J10.4): só números e booleanos — o factor
   * calculado, o ganho vivo do bus e o estado da fonte. Sem setters
   * nem referências ao grafo. */
  window.__musicaEstado = function () {
    return {
      fator: somFatorMusica(),
      ganho: musica.ganho ? musica.ganho.gain.value : null,
      aTocar: musica.aTocar,
      temBuffer: !!musica.buffer,
      duracaoBuffer: musica.buffer ? musica.buffer.duration : null,
      loop: musica.fonte ? !!musica.fonte.loop : null
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
    /* VOO (F-36): o raio cai na camada do chão — o ocupante da
       casa é a figura que lá está NO CHÃO; quem voa por cima
       não é atingido (as áreas vivem na camada onde nascem). */
    for (const id of [...ELENCO.map(e => e.id), ...testesPresentes]) {
      const u = unidade(id);
      if (u && u.posicao && u.posicao.x === x && u.posicao.y === y && camadaDe(id) === 0) return id;
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
      vooCairCorpoSeEmVoo(id);   // VOO: quem morre em voo cai antes da pose
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
    /* VOO: estar POR CIMA de uma casa a arder não é estar nela —
       o tick do fogo só morde na camada onde o fogo vive (o chão). */
    const naCasa = camadaDe(id) === 0 && rfCasas.has(rfChave(u.posicao.x, u.posicao.y));
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
  /* ---------- VOO — admissão de figuras de teste ----------
   * Uma só função de admissão para todas as portas (aba Testes
   * do Mestre, gancho de prova, restauros): nasce a instância nas
   * tabelas da casca (cópias do modelo — a instância é uma figura
   * como as outras enquanto está presente), entra na ordem por
   * iniciativa (a vez corrente não se move: o índice recalcula-se
   * a partir dela) e nasce na cena no primeiro ponto de chão
   * livre, ou no ponto que o restauro manda. A remoção é o
   * inverso exacto e apaga a instância de todas as tabelas.
   * Mudar o elenco de teste invalida os instantâneos do
   * Supervisor (são de outra batalha): a pilha limpa-se —
   * declarado, como o carregar de um save já faz. */
  function vooPontoChaoOcupado(x, y, exceptoId) {
    for (const v of view.getState().units) {
      if (v.id === exceptoId) continue;
      if (v.posicao.x === x && v.posicao.y === y && camadaDe(v.id) === 0) return true;
    }
    return false;
  }
  function vooCasaLivreParaNascer(exceptoId) {
    for (let y = AREA.origin.y; y < AREA.origin.y + AREA.rows; y++)
      for (let x = AREA.origin.x; x < AREA.origin.x + AREA.cols; x++)
        if (!vooPontoChaoOcupado(x, y, exceptoId)) return { x, y };
    return { x: AREA.origin.x, y: AREA.origin.y };
  }
  function vooAdmitirFiguraTeste(instancia, opts = {}) {
    const mod = vooModeloDe(instancia);
    if (!mod) return { ok: false, erro: 'FIGURA_TESTE_DESCONHECIDA' };
    if (testesPresentes.has(instancia) || unidade(instancia))
      return { ok: false, erro: 'FIGURA_JA_PRESENTE' };
    const m = FIGURAS_TESTE[mod];
    DADOS_COMBATE[instancia] = JSON.parse(JSON.stringify(m.combate));
    VIDA_MONSTROS[instancia] = m.vida;
    ORCAMENTOS[instancia] = m.orcamento;
    INICIATIVA[instancia] = m.iniciativa;
    FRASES_IA[instancia] = { ...m.frases };
    ESTADO_VLAB[instancia] = {
      danoSofrido: 0, estados: [], armaCaida: false, armaQuebrada: false,
      desvantagemAtaque: 0, deslocMetade: false, reacaoDisponivel: true,
      estadoMorte: null };
    testesPresentes.add(instancia);
    vooEstado[instancia] = { z: 0, asaTorada: false };
    const nova = [...ordem, instancia];
    nova.sort((a, b) => ((INICIATIVA[b] || 0) - (INICIATIVA[a] || 0)));
    ordem = nova;
    indiceVez = ordem.indexOf(vezAtual);
    const casa = opts.casa || vooCasaLivreParaNascer(instancia);
    try {
      const p = view.addUnit({ id: instancia, nome: m.nome, modelo: m.modelo,
        x: casa.x, y: casa.y, alturaMetros: m.alturaMetros,
        vivo: opts.vivo !== false, altitude: (opts.z || 0) * VOO_METROS_CAMADA });
      if (p && p.catch) p.catch(() => {});
    } catch (_) { /* vista sem addUnit (arnês antigo): a presença fica só na casca */ }
    if (opts.z) vooEstado[instancia].z = opts.z | 0;
    if (!opts.silencioso) supPilha.length = 0;
    return { ok: true, casa };
  }
  function vooRemoverFiguraTeste(instancia, opts = {}) {
    if (!testesPresentes.has(instancia)) return { ok: false, erro: 'FIGURA_NAO_PRESENTE' };
    if (!opts.forcar && vezAtual === instancia)
      return { ok: false, erro: 'FIGURA_NA_SUA_VEZ' };
    if (contextoIA && contextoIA.id === instancia) consumirContextoIA(instancia);
    reservasDestinoIA.delete(instancia);
    try { if (typeof view.removeUnit === 'function') view.removeUnit(instancia); } catch (_) {}
    testesPresentes.delete(instancia);
    delete vooEstado[instancia];
    delete ESTADO_VLAB[instancia];
    delete DADOS_COMBATE[instancia];
    delete VIDA_MONSTROS[instancia];
    delete ORCAMENTOS[instancia];
    delete INICIATIVA[instancia];
    delete FRASES_IA[instancia];
    ordem = ordem.filter(id => id !== instancia);
    indiceVez = ordem.indexOf(vezAtual);
    if (!opts.silencioso) supPilha.length = 0;
    return { ok: true };
  }
  /* O estado do voo como valor (instantâneos e pré-saves):
     quem está presente e, por figura, camada + asa torada. */
  function vooCapturarEstado() {
    const estados = {};
    for (const id of testesPresentes)
      estados[id] = { z: camadaDe(id), asaTorada: !!(vooEstado[id] && vooEstado[id].asaTorada) };
    for (const id of Object.keys(vooEstado))
      if (!estados[id]) estados[id] = { z: camadaDe(id), asaTorada: !!vooEstado[id].asaTorada };
    return { presentes: [...testesPresentes], estados };
  }
  /* Reconciliação de elenco de teste para um restauro: admite
     quem o estado traz, remove quem ele não traz, e repõe
     camada + asa de cada presente. unidadesPorId traz as
     unidades do estado (com x, y, z, vivo). */
  /* O bloco 'voo' de um save: só nasce quando alguma figura
     presente tem a asa torada (a incapacidade é o único estado
     do voo que as unidades, com o seu z, não dizem sozinhas). */
  function vooBlocoSaveCaptura() {
    const b = {};
    for (const id of testesPresentes)
      if (vooEstado[id] && vooEstado[id].asaTorada) b[id] = { asaTorada: true };
    return Object.keys(b).length ? { voo: b } : {};
  }
  function vooReconciliarDeEstado(cap, unidadesPorId) {
    if (!cap) return;
    const alvo = cap.presentes || [];
    for (const id of [...testesPresentes])
      if (!alvo.includes(id)) vooRemoverFiguraTeste(id, { forcar: true, silencioso: true });
    for (const id of alvo) {
      if (testesPresentes.has(id)) continue;
      const su = unidadesPorId ? unidadesPorId[id] : null;
      vooAdmitirFiguraTeste(id, { forcar: true, silencioso: true,
        casa: su ? { x: su.x, y: su.y } : null,
        z: su ? (su.z || 0) : 0, vivo: su ? su.vivo : true });
    }
    for (const id of testesPresentes) {
      const e = (cap.estados || {})[id];
      const su = unidadesPorId ? unidadesPorId[id] : null;
      vooEstado[id] = { z: e ? (e.z | 0) : (su ? (su.z || 0) : 0),
        asaTorada: !!(e && e.asaTorada) };
    }
  }

  /* ---------- VOO — a fonte «altura» ----------
   * Atacante estritamente acima do alvo (dz >= 1) e técnica que
   * não é magia: exactamente 1 nível de Vantagem, sem escada
   * (dz=5 continua 1). A magia está fora do sistema VD (palavra
   * dele, 13/11/2026). Quem está por baixo não ganha nada além
   * da distância que a régua já cobra. A fonte entra no contexto
   * montado (vlabMontarContextoAtaque), onde o flanquear já
   * entra — a caixa do contador VD não a lê, como nunca leu
   * fontes posicionais. */
  function vooFonteAltura(atacanteId, alvoId, tecnica) {
    if (tecnica && tecnica.magia === true) return 0;
    return camadaDe(atacanteId) > camadaDe(alvoId) ? 1 : 0;
  }

  /* ---------- VOO — as quedas ----------
   * Resolvedor único (Art. 8 da análise): perder o voo a z>0 é
   * cair JÁ para (x, y, 0); se o ponto do chão estiver ocupado,
   * quem cai desvia-se para a casa livre mais próxima — a ordem
   * de procura é a da BFS da casa (a de mapaDistancias: (1,0),
   * (-1,0), (0,1), (0,-1)) — e ninguém é empurrado. O dano é
   * ⌊camadas × escala vigente NO MOMENTO DA QUEDA⌋ × 2d8, por
   * uma passagem própria: sem rolagem de ataque, sem Defesa,
   * sem reacção (gémea da passagem do ambiente, com o actor
   * «queda» no registo — nunca «ambiente»). NÃO é um ataque:
   * não importa as regras das falhas nem os 25% do
   * quebrar-o-corpo. Pode matar, pelo pipeline normal. Dano, por
   * si, nunca derruba ninguém (cânone dele): só se cai por
   * pouso voluntário (pelos passos, sem dano), por queda de
   * sistema (a origem expira ou a Vida chega a 0 — o corpo cai
   * sem dano novo, já está a 0) ou por adjudicação dele. */
  function vooResolverCasaQueda(x, y, exceptoId) {
    if (!vooPontoChaoOcupado(x, y, exceptoId)) return { x, y };
    const vistos = new Set([chave(x, y)]);
    const fila = [{ x, y }];
    for (let i = 0; i < fila.length; i++) {
      const p = fila[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = p.x + dx, ny = p.y + dy, k = chave(nx, ny);
        if (nx < AREA.origin.x || nx >= AREA.origin.x + AREA.cols
          || ny < AREA.origin.y || ny >= AREA.origin.y + AREA.rows
          || vistos.has(k)) continue;
        vistos.add(k);
        if (!vooPontoChaoOcupado(nx, ny, exceptoId)) return { x: nx, y: ny };
        fila.push({ x: nx, y: ny });
      }
    }
    return { x, y };   // arena sem casa livre: fica (inalcançável com o elenco actual)
  }
  function vooRolarParcelaQueda(nDados) {
    if (DMG_MOTOR) {
      try {
        const s = vlabComDmg(() => DMG_MOTOR.calcularDano({
          componentes: [{ tipo: null, expressao: nDados + 'd8' }], contexto: { semente: vlabSemente() } }));
        const p = s && !s.erro && s.parcelas && s.parcelas[0];
        if (p && Array.isArray(p.faces) && p.faces.length === nDados)
          return { tipo: 'queda', expressao: nDados + 'd8', faces: p.faces, subtotal: p.subtotal };
      } catch (_) {}
    }
    const faces = []; let subtotal = 0;
    for (let i = 0; i < nDados; i++) { const f = 1 + Math.floor(Math.random() * 8); faces.push(f); subtotal += f; }
    return { tipo: 'queda', expressao: nDados + 'd8', faces, subtotal };
  }
  function vooAplicarDanoQueda(id, parcela) {
    const u = unidade(id);
    if (!u || u.vivo === false) return null;
    if (id === PROPRIA && ESTADO_VLAB.ong.estadoMorte) return null;
    const aplicado = parcela.subtotal;
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
  /* via: 'sistema' | 'adjudicada'. A adjudicada marca a asa
     torada (a figura não volta a voar NESTA batalha) e regista
     o acto com quem ordenou, z e escala do momento — o registo
     que a frente da IA um dia lê (requisito nomeado: ler z E
     escala no momento da ordem). */
  function vooPerderVoo(id, via, opts = {}) {
    const u = unidade(id);
    if (!u) return null;
    const zAntes = camadaDe(id);
    const de = { x: u.posicao.x, y: u.posicao.y, z: zAntes };
    const escala = CASA_M;
    const metros = Math.floor(zAntes * escala);
    if (via === 'adjudicada' && vooEstado[id]) vooEstado[id].asaTorada = true;
    let casa = { x: de.x, y: de.y }, faces = [], aplicado = 0, desfecho = null;
    const nDados = zAntes > 0 ? metros * 2 : 0;
    if (zAntes > 0) {
      casa = vooResolverCasaQueda(de.x, de.y, id);
      /* a camada assenta ANTES do movimento (o moveend confere
         camada × altitude; ver vooCairCorpoSeEmVoo). */
      if (vooEstado[id]) vooEstado[id].z = 0;
      try { view.move(id, casaVistaVoo({ x: casa.x, y: casa.y, z: 0 }), { immediate: true }); } catch (_) {}
      if (nDados > 0) {
        const parcela = vooRolarParcelaQueda(nDados);
        faces = parcela.faces;
        const r = vooAplicarDanoQueda(id, parcela);
        if (r) { aplicado = r.aplicado; desfecho = r.desfecho; }
      }
    }
    supRegistar('accao', { acao: 'queda', actor: id, via, quem: opts.quem || null,
      de, para: { x: casa.x, y: casa.y }, escala, metros, dados: nDados, faces, dano: aplicado, desfecho });
    if (via === 'adjudicada')
      supRegistar('accao', { acao: 'torou-a-asa', quem: opts.quem || null, alvo: id,
        z: zAntes, escala, metros, rolagem: faces, resultado: desfecho || 'caiu' });
    if (zAntes > 0) {
      if (aplicado > 0 && numerosDano)
        mostrarDano(id, [{ classe: 'queda', rotulo: 'queda', valor: aplicado }]);
      if (via === 'adjudicada')
        say(`O Mestre torou a asa de <b>${nomeCena(id)}</b> — a queda foi feia e o voo acabou nesta batalha.`);
      else
        say(`<b>${nomeCena(id)}</b> perdeu o voo e caiu do alto!${desfecho === 'caiu' ? ' Não se levantou.' : ''}`);
    } else if (via === 'adjudicada') {
      say(`O Mestre torou a asa de <b>${nomeCena(id)}</b> — o voo acabou nesta batalha.`);
    }
    return { casaFinal: casa, zAntes, dados: nDados, faces, aplicado, desfecho };
  }
  /* Quem morre em voo cai: o corpo desce (pela mesma casa e
     desvio) ANTES da pose de morte — sem dano novo (inerte:
     já está a 0 de Vida) e sem «cadáver em z>0» persistente. */
  function vooCairCorpoSeEmVoo(id) {
    const zAntes = camadaDe(id);
    if (zAntes <= 0) return;
    const u = unidade(id);
    if (!u) return;
    const casa = vooResolverCasaQueda(u.posicao.x, u.posicao.y, id);
    /* a camada assenta ANTES do movimento: o moveend confere
       camada × altitude e um corpo já no chão com a camada
       ainda alta seria lido como desencontro (gelo). */
    if (vooEstado[id]) vooEstado[id].z = 0;
    try { view.move(id, casaVistaVoo({ x: casa.x, y: casa.y, z: 0 }), { immediate: true }); } catch (_) {}
    supRegistar('accao', { acao: 'queda', actor: id, via: 'morte', quem: null,
      de: { x: u.posicao.x, y: u.posicao.y, z: zAntes }, para: { x: casa.x, y: casa.y },
      escala: CASA_M, metros: Math.floor(zAntes * CASA_M), dados: 0, faces: [], dano: 0, desfecho: 'caiu' });
  }

  /* Gancho de prova da bateria do voo (não é mecânica): expõe
     a régua e os verbos de encenação que a BATERIA-SYNC-N2
     assere ao dígito — o padrão de __somEstado/__visao/
     __furtividade. Congelado; nenhum caminho do jogo o lê. */
  window.__voo = Object.freeze({
    admitir: (id, instancia) => vooAdmitirFiguraTeste(instancia || id),
    remover: id => vooRemoverFiguraTeste(id),
    estado: id => ({ presente: testesPresentes.has(id) || !!unidade(id),
      z: camadaDe(id), asaTorada: !!(vooEstado[id] && vooEstado[id].asaTorada),
      podeVoar: vooPodeVoar(id) }),
    teleportar: (id, x, y, z) => {
      if (!unidade(id)) return { ok: false };
      /* EMENDA DA CONFERÊNCIA REF_89 (LEVE-2): o gancho limita
         o z ao domínio lavrado {0,…,10} — um z=99 encenado não
         fica no estado à espera da invariante. */
      const zz = Math.max(0, Math.min(10, z | 0));
      if (vooOrigemDe(id) && !vooEstado[id]) vooEstado[id] = { z: 0, asaTorada: false };
      if (vooEstado[id]) vooEstado[id].z = zz;
      reservasDestinoIA.delete(id);
      try { view.move(id, casaVistaVoo({ x, y, z: zz }), { immediate: true }); } catch (_) {}
      return { ok: true, z: camadaDe(id) };
    },
    distancia: (a, b) => distanciaEntre(a, b),
    alcance: (id, teto) => [...calcularAlcancePara(id, teto).values()]
      .map(c => `${c.x},${c.y},${c.z || 0}:${c.passos}`)
      .sort(),
    fonteAltura: (a, b, tecnica) => vooFonteAltura(a, b, tecnica || null),
    contextoAtaque: (a, b) => {
      const m = vlabMontarContextoAtaque(a, b, {});
      return { niveisVantagem: m.contexto.niveisVantagem || 0,
        flanqueando: !!m.contexto.flanqueando };
    },
    flanqueando: (alvoId, atacanteId) => vlabFlanqueandoSobre(alvoId, atacanteId),
    queda: (id, via) => vooPerderVoo(id, via || 'sistema', { quem: 'prova' }),
    porEscala: v => { escalaAssentar(v, { silencioso: true }); return CASA_M; },
    escala: () => CASA_M,
    acenderCasa: (x, y) => { rfResolverImpacto(x, y); },
    tick: id => ambTickInicioTurno(id),
    aArder: id => rfAArder.has(id),
    reservar: (id, x, y, z) => { reservasDestinoIA.set(id, { x, y, z: z | 0 }); },
    voltarAtras: () => { supRestaurar(); return vooCapturarEstado(); },
    vidaMonstro: id => (VIDA_MONSTROS[id] != null ? vlabVidaMonstro(id) : null)
  });

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
  /* RN-2 (tranche «Órfãs do Ledger», A-17): tecto de REARMES das
     guardas de 5 s (a dela e a da IA) — 5 s + 23 × 5 s = 120 s à
     espera de um moveend legítimo em aparelho lento; passado o
     tecto sem a figura pousar nem se mover, o movimento trata-se
     como nunca completou (o caminho anti-bloqueio de sempre). */
  const GUARDA_REARMES_MAX = 23;
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
    /* PRÉVIA v2 (R-07): com uma prévia aberta, a troca de escala
       re-deriva banda, livro e geometria na hora (a prévia nunca
       mostra geometria congelada de outra escala). */
    if (mudou && estado === 'previa') renderAcoes();
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
    /* VOO (F-36): o flanquear é um fenómeno DE PLANO — o
       parceiro tem de estar na casa oposta exacta E à mesma
       camada do atacante (dz igual para os dois, medido contra
       o alvo); quem está por cima do alvo não flanqueia. Os
       parceiros contam-se entre o elenco e as figuras de teste
       presentes. No chão, as duas condições são as de hoje. */
    return [...ELENCO.map(u => u.id), ...testesPresentes].some(id => {
      if (id === atacanteId || id === alvoId) return false;
      const v = unidade(id);
      /* T-J12J13: cadáver não dá flanqueamento — o parceiro do
         outro lado tem de estar vivo (o padrão `vivo !== false`
         da casa, o mesmo das adjacências de oportunidade A01). */
      return v && v.vivo !== false && distanciaEntre(id, alvoId) === 1
        && camadaDe(id) === camadaDe(atacanteId)
        && v.posicao.x - t.posicao.x === -dx && v.posicao.y - t.posicao.y === -dy;
    });
  }
  /* ═══ Tranche PRÉVIA v2, passo ① (EM-S-06): a função ÚNICA de
     contexto montado. A montagem que vivia inline no adaptador
     extrai-se para aqui: devolve { tecnica, contexto,
     fichaAtacante, fichaAlvo } SEM chamar o motor e SEM tirar
     semente — a semente e a verificação só entram por injecção
     via opts; quando opts as omite, os campos ficam por preencher
     no contexto devolvido e é quem resolve (o adaptador, abaixo)
     que os preenche no instante da chamada, como antes. A prévia
     do ataque lê ESTE objecto montado: é o mesmo que o Confirmar
     entregará ao motor. Efeitos colaterais NÃO vivem aqui: a
     limpeza de armaCaida de monstro, a fotografia pré-golpe e o
     consumo da Reacção declarada ficam no adaptador, na ordem e
     no instante relativo de sempre. */
  function vlabMontarContextoAtaque(atacanteId, alvoId, opts) {
    opts = opts || {};
    const c = DADOS_COMBATE[atacanteId];
    const tecnica = atacanteId === PROPRIA
      ? { nome: c.arma, custoPA: 8, expressaoAtaque: vlabExprAtaque(atacanteId),
          expressaoDano: vlabExprDanoStr(atacanteId), tipo: 'agua', magia: false, usaArma: true }
      : { nome: c.arma, custoPA: 0, expressaoAtaque: vlabExprAtaque(atacanteId),
          expressaoDano: vlabExprDanoStr(atacanteId), usaArma: true };
    const fichaAlvo = (alvoId === PROPRIA && atacanteId !== PROPRIA)
      ? vlabFichaAlvoDela(opts.ataqueDeOportunidade === true) : vlabFichaAlvo(alvoId);
    const contexto = {
      semente: opts.semente != null ? opts.semente : undefined,
      verificacaoCritico: opts.verificacao || undefined,
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
    /* VOO (F-36): a fonte «altura» — atacante acima do alvo soma
       exactamente 1 nível pela contabilidade de fontes nomeadas
       (empilha com a Regra 3 e com o flanco até ao máximo do
       motor; a magia fica de fora, ver vooFonteAltura). */
    if (vooFonteAltura(atacanteId, alvoId, tecnica) > 0)
      contexto.niveisVantagem = (contexto.niveisVantagem | 0) + 1;
    if (opts.desgracaEscolhida) contexto.desgracaEscolhida = opts.desgracaEscolhida;
    if (opts.confirmacaoDeProposta) contexto.confirmacaoDeProposta = opts.confirmacaoDeProposta;
    /* DÍVIDA E1: as bandeiras de exclusão da fronteira T1 do motor
       (vlab-completo.js: dano em área/reflectido/periódico/ambiental
       sobre quem está 'aMorrer' NÃO soma falha de morte) repassam-se
       TAL E QUAL o motor as lê — só o valor ===true conta, como lá.
       A exclusão governa SÓ o +1 da corrida aberta: o dano em si
       aplica-se na mesma; o nascimento da corrida e a reentrada da
       estabilizada NÃO são suprimidos (fronteira do motor, medida
       no arnês da tranche). O dano-0 não é bandeira: já está
       excluído no motor pela condição totalEfectivo > 0 do T1. */
    if (opts.danoEmArea === true) contexto.danoEmArea = true;
    if (opts.danoReflectido === true) contexto.danoReflectido = true;
    if (opts.danoPeriodico === true) contexto.danoPeriodico = true;
    if (opts.danoAmbiental === true) contexto.danoAmbiental = true;
    return { tecnica, contexto, fichaAtacante: vlabFichaAtacante(atacanteId), fichaAlvo };
  }
  /* A chamada única ao motor. opts: { modoDesgraca, semente,
     verificacao, ataqueDeOportunidade, desgracaEscolhida,
     confirmacaoDeProposta, danoEmArea, danoReflectido,
     danoPeriodico, danoAmbiental } — o resto deriva-se do estado.
     Chave fora desta lista é erro nomeado (ver a guarda
     ADAPTADOR_OPCAO_DESCONHECIDA na função): nada se larga em
     silêncio (dívida E1 da REF_35). Bandeira com valor definido
     não booleano é erro nomeado ADAPTADOR_BANDEIRA_INVALIDA
     (Emenda n.º 1 da sentença da bancada E1): true repassa-se,
     false explícito vale como ausência, undefined é ausência.
     Estrutura (passo ① da PRÉVIA v2): montar (função única,
     acima) → preencher a semente/verificação que a montagem não
     tirou → efeitos colaterais pré-golpe → chamar o motor →
     efeitos colaterais pós-golpe, na mesma ordem de sempre. */
  function vlabResolverAtaqueCompleto(atacanteId, alvoId, opts) {
    opts = opts || {};
    if (!VLAB_MOTOR) return { erro: { codigo: 'MOTOR_VLAB_INDISPONIVEL', detalhe: 'vlab-completo.js não carregou' } };
    /* DÍVIDA E1 (REF_35; tranche Órfãs do Ledger, 11/11/2026): este
       adaptador monta o contexto do motor de uma lista FECHADA de
       opts — antes, qualquer chave fora dela (incl. as bandeiras de
       exclusão do motor) era largada EM SILÊNCIO e o golpe resolvia
       como se ela não existisse. A partir daqui, chave desconhecida
       com valor definido é ERRO NOMEADO e nada se resolve (a regra
       de ouro da casa: erro nomeado = nada foi aplicado) — largar
       deixou de ser silencioso, para esta e para qualquer bandeira
       futura que um chamador invente. */
    const VLAB_OPTS_CONHECIDAS = ['modoDesgraca', 'semente', 'verificacao',
      'ataqueDeOportunidade', 'desgracaEscolhida', 'confirmacaoDeProposta',
      'danoEmArea', 'danoReflectido', 'danoPeriodico', 'danoAmbiental'];
    const optsDesconhecidas = Object.keys(opts)
      .filter(k => opts[k] !== undefined && !VLAB_OPTS_CONHECIDAS.includes(k));
    if (optsDesconhecidas.length) return { erro: { codigo: 'ADAPTADOR_OPCAO_DESCONHECIDA',
      detalhe: 'opts fora da lista do adaptador: ' + optsDesconhecidas.join(', ') } };
    /* EMENDA N.º 1 DA SENTENÇA E1 (bancada, pré-fusão): a guarda de
       cima vigia o NOME das chaves; esta vigia o TIPO das 4 bandeiras.
       O motor lê as bandeiras com ===true — um valor definido
       não booleano (1, 0, 'true', null, objecto, NaN…) passava a
       guarda de nomes, não era repassado e o golpe somava a falha
       em silêncio (o vector medido SEMTICAO-1). A fronteira onde
       opts entra é aqui: bandeira presente (propriedade própria),
       com valor !== undefined e não booleano → ERRO NOMEADO, antes
       de qualquer mutação, e nada se resolve. true é válido
       (repassa-se abaixo, ===true); false explícito é válido
       (bandeira desligada = ausência); undefined conta como
       ausente, como em toda a guarda. */
    const bandeirasInvalidas = ['danoEmArea', 'danoReflectido', 'danoPeriodico', 'danoAmbiental']
      .filter(k => Object.prototype.hasOwnProperty.call(opts, k)
        && opts[k] !== undefined && typeof opts[k] !== 'boolean');
    if (bandeirasInvalidas.length) return { erro: { codigo: 'ADAPTADOR_BANDEIRA_INVALIDA',
      detalhe: 'bandeira(s) com valor definido não booleano: ' + bandeirasInvalidas.join(', ') } };
    const montado = vlabMontarContextoAtaque(atacanteId, alvoId, opts);
    const tecnica = montado.tecnica, contexto = montado.contexto;
    const alvoFicha = montado.fichaAlvo;
    if (contexto.semente == null) contexto.semente = vlabSemente();
    if (!contexto.verificacaoCritico) contexto.verificacaoCritico = vlabVerificacao();
    /* Arma caída de um monstro: apanhá-la gasta o movimento dele —
       quem chama declara a recuperação e a bandeira limpa-se aqui.
       A ficha do atacante sincroniza-se com a bandeira limpa:
       na forma inline antiga ela construía-se DEPOIS desta
       limpeza (na chamada ao motor), logo o motor lia sempre
       armaCaida:false + contexto.armaRecuperada:true — é esse
       par que se reproduz, campo a campo. */
    if (atacanteId !== PROPRIA && ESTADO_VLAB[atacanteId].armaCaida) {
      contexto.armaRecuperada = true;
      ESTADO_VLAB[atacanteId].armaCaida = false;
      montado.fichaAtacante.armaCaida = false;
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
      atacante: montado.fichaAtacante, alvo: alvoFicha, tecnica, contexto }));
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
      /* F-13 (palavra do Mestre, 08/11/2026): num monstro, o
         estado 'caido' (a desgraça «cai») não assenta — cair é
         morrer, e a morte aplica-se no fim deste consumo. Nela,
         o 'caido' assenta como sempre. */
      const quedaDeMonstro = id !== PROPRIA
        && (dep.estadosNovos || []).includes('caido');
      for (const e of dep.estadosNovos || []) {
        if (e === 'caido' && id !== PROPRIA) continue;
        if (!ESTADO_VLAB[id].estados.includes(e)) ESTADO_VLAB[id].estados.push(e);
      }
      if (id === PROPRIA && Number.isFinite(dep.vidaActual)) {
        danoSofrido = FICHAS.ong.vida.total - dep.vidaActual;   // acerta-se: o motor já aplicou o tecto (nunca mata)
        atualizarChipVida();
      } else if (id !== PROPRIA && VIDA_MONSTROS[id] != null && Number.isFinite(dep.vidaActual)) {
        /* A01: o dano próprio do monstro (desgraça «acerta-se»)
           acumula-se na Vida interna dele — o motor aplicou o
           tecto de 1 de Vida, por isso nunca nasce uma queda aqui. */
        ESTADO_VLAB[id].danoSofrido = VIDA_MONSTROS[id] - dep.vidaActual;
      }
      if (quedaDeMonstro) {
        /* F-13: a desgraça «cai» deitou o monstro — e monstro
           caído é monstro morto: a figura tomba já, a Vida interna
           fecha a zero e, se era o último, a batalha fecha em
           vitória (o padrão da morte por ambiente). */
        if (VIDA_MONSTROS[id] != null)
          ESTADO_VLAB[id].danoSofrido = VIDA_MONSTROS[id];
        vooCairCorpoSeEmVoo(id);   // VOO: quem morre em voo cai antes da pose
        try {
          const pm = view.apresentarMorte(id);
          if (pm && pm.catch) pm.catch(() => {});
        } catch (_) { view.setVivo(id, false); }
        ambAoMorrerFigura(id);
        if (vlabTodosMonstrosForaDeCombate()) fimDeBatalha('vitoria');
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
      /* F-13 (palavra do Mestre, 08/11/2026): monstro caído =
         monstro MORTO. O estado 'caido' nunca assenta num monstro:
         a queda dele entra na morte abaixo, como a Vida a zero. */
      const quedaDeMonstro = (dep.estadosNovos || []).includes('caido');
      for (const e of dep.estadosNovos || []) {
        if (e === 'caido') continue;
        if (!ESTADO_VLAB[id].estados.includes(e)) ESTADO_VLAB[id].estados.push(e);
      }
      for (const e of dep.estadosRemovidos || [])
        ESTADO_VLAB[id].estados = ESTADO_VLAB[id].estados.filter(x => x !== e);
      if (VIDA_MONSTROS[id] != null && Number.isFinite(dep.vidaActual))
        ESTADO_VLAB[id].danoSofrido = VIDA_MONSTROS[id] - dep.vidaActual;
      const caiu = VIDA_MONSTROS[id] != null
        && (dep.vidaActual === 0 || (dep.estadosNovos || []).includes('foraDeCombate')
          || quedaDeMonstro);
      if (caiu && quedaDeMonstro && VIDA_MONSTROS[id] != null)
        ESTADO_VLAB[id].danoSofrido = VIDA_MONSTROS[id];   // F-13: a queda mata — a Vida interna fecha a zero, tenha o golpe tirado o que tiver
      if (caiu) {
        /* VOO (F-36): quem morre em voo CAI — o corpo desce antes
           da pose de morte (sem dano novo: já está a 0). */
        vooCairCorpoSeEmVoo(id);
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
    /* VOO (F-36): contam o elenco E as figuras de teste
       PRESENTES — uma figura de teste que nunca foi admitida
       não pode tornar a vitória impossível. */
    return [...ELENCO.map(u => u.id), ...testesPresentes].every(id => id === PROPRIA
      || (unidade(id) || {}).vivo === false);
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
    /* EMENDA DA CONFERÊNCIA REF_89 (MÉDIO-1): o universo da
       partida inclui as figuras de teste PRESENTES — análise
       §2: adjacentes à partida e meio-caminho herdam a
       adjacência 3D como o flanco já herdava (jogo.js, função
       de flanquear). Sem figuras de teste, o universo é o
       ELENCO de hoje e as duas listas saem byte-iguais. */
    const universoPartida = [...ELENCO.map(e => e.id), ...testesPresentes];
    const adjacentes = universoPartida.filter(id => id !== PROPRIA
      && (unidade(id) || {}).vivo !== false   // A01: um monstro caído não golpeia de oportunidade
      && distanciaEntre(id, PROPRIA) === 1);
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
      meioCaminho = universoPartida.filter(id => id !== PROPRIA && !adjacentes.includes(id))
        .filter(id => {
          const m = unidade(id); if (!m || m.vivo === false) return false;   // A01: idem — morto não provoca
          /* A zona é a adjacência à casa do caminho (que vive
             na camada 0 — ela anda no chão): para uma figura
             de teste a adjacência 3D soma |dz| à horizontal,
             como a régua manda; para o ELENCO dz é 0 e a
             fórmula é a de hoje, verbatim. */
          const dz = testesPresentes.has(id) ? camadaDe(id) : 0;
          const adj = c => Math.abs(c.x - m.posicao.x) + Math.abs(c.y - m.posicao.y) + dz === 1;
          for (let i = 0; i < casas.length - 1; i++)
            if (adj(casas[i]) && !adj(casas[i + 1])) return true;
          return false;
        });
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
        /* F-19 (D3-P0-2): golpe de oportunidade que ela recebe —
           os números das parcelas + total, como na vez da IA. */
        if (numerosDano) mostrarDano(PROPRIA, s.danoAplicado.parcelas.map(p => ({
          classe: p.tipo || 'tecnica', rotulo: p.tipo || 'dano', valor: p.subtotal })));
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
  let estado = 'base';        // base | atacar | consumivel | mover | movendo | previa | rolagem | resultado | vez-ia | confirmar-fim | fim
                              // 'previa' (PRÉVIA v2): alvo marcado, ainda sem rolagem — a rolagem nasce no Confirmar
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
  /* D1 (defeitos do Mestre, 13/11): COMANDO DAS FIGURAS — o
     interruptor da aba Testes («Comandar as figuras»). Nasce
     DESLIGADO em cada abertura da página, como os outros testes;
     ligado, as vezes das figuras que não a Ong abrem MANUAIS para
     o Mestre (iniciarVezManual) em vez de serem jogadas pela IA.
     Desligado — e sempre na vista da Party —, nenhum caminho novo
     é alcançável: o comportamento é o de hoje, ao byte. A reserva
     da vez manual é SEPARADA da reservaMovimento dela (R3: os
     tectos do Supervisor e dos saves são da Ong). */
  let comandoMestreFiguras = false;   // o interruptor (só MODO_MESTRE o vê)
  let vezManualAberta = false;        // a vez corrente é uma vez manual do Mestre
  let comandada = null;               // a figura da vez manual (= vezAtual quando aberta)
  let reservaManual = 0;              // metros que a figura comandada ainda pode andar nesta vez
  let atacouManual = false;           // uso de atacar da vez manual
  let ctxMovManual = null;            // { id, destino:{x,y,z}, passos } do movimento manual em curso
  const comandoMestreActivo = () => MODO_MESTRE && comandoMestreFiguras;
  let passoEmCurso = false;     // um passo de seta está a animar (pressões novas ignoram-se)
  /* Tranche ESCALA: o preço da casa captura-se no DESPACHO do
     movimento (custoPendentePreco / passoPreco) — o débito do
     moveend cobra o preço de quando o movimento começou, nunca o
     de uma escala mudada a meio da animação. Só se lêem com o
     respectivo pendente vivo, e cada despacho os escreve. */
  let custoPendentePreco = null;
  let passoPreco = null;
  /* RN-1 (tranche «Órfãs do Ledger», A-16): os preços pendentes
     morrem SEMPRE com o pendente correspondente. Todo o caminho que
     anula custoPendente/passoEmCurso (restauro do Supervisor,
     carregar pela ponte, catch da aplicação, guarda de movimento,
     ramo de época do moveend tardio, fim da batalha) chama esta
     limpeza — nenhum preço velho sobrevive para ser relido por um
     despacho futuro. (Medido na sonda RN-1: na base nenhum caminho
     de leitura o relia — cada despacho reescreve o preço antes de
     qualquer leitura e os restauros sobem a época; a limpeza fecha
     o resíduo teórico nomeado na RN-1 da REF_36.) */
  function limparPrecosPendentes() { custoPendentePreco = null; passoPreco = null; }
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
  let ultimoSay = null;   // A-24 (E2 da sentença do P-A): a última frase escrita na faixa
  function say(html) {
    if (!campoPronto) { msgTxt.textContent = falhaArranque || 'A preparar o campo…'; return; }
    if (html === ultimoSay) return;   // repetição consecutiva da mesma frase: a faixa já a mostra — não se reescreve (as retentativas do controlador e os cliques repetidos deixam de a fazer piscar)
    ultimoSay = html;
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
        : `<b>${nomeCena(p.atacanteId)}</b> ${verbosM.falha} a <b>${nomeCena(p.alvoId || PROPRIA)}</b> e falhou. A proposta é <b>${fc.desgraca.nome}</b>. Escolha a desgraça que acontece — ou nenhuma.`;
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
    if (vezManualAberta) {
      /* D1: a faixa da vez manual — só as acções da figura
         comandada (sem Consumível nem Transformação, que são
         dela). Os ganchos de repintura do fim correm como sempre,
         para o cartão de desgraça e o contador VD acompanharem. */
      if (estado === 'base') {
        acoesEl.innerHTML =
          B('atacar', '⚔', 'Atacar', 'primary') +
          B('mover', '🚶', 'Mover') +
          B('encerrar', '✓', rp ? 'Fim' : 'Encerrar', 'ghost');
      } else if (estado === 'atacar') {
        acoesEl.innerHTML =
          B('voltar', '←', 'Voltar', 'ghost') +
          B('ataque-basico-mestre', '⚔', `${(DADOS_COMBATE[comandada] || {}).arma || 'Ataque'}`, 'primary');
      } else if (estado === 'mover') {
        acoesEl.innerHTML =
          B('cancelar', '✕', 'Cancelar', 'ghost') +
          (vooOrigemDe(comandada)
            ? B('subir-camada', '⬆', 'Subir camada') + B('descer-camada', '⬇', 'Descer camada')
            : '');
      } else if (estado === 'movendo') {
        acoesEl.innerHTML = 'A andar…';
      } else if (estado === 'resultado') {
        acoesEl.innerHTML = B('continuar', '', 'Continuar ▸', 'primary');
      } else if (estado === 'desgraca-lista') {
        acoesEl.innerHTML = 'A escolher a desgraça…';
      }
      ataquePreviaDesenhar();
      sincronizarCartaoDesgraca();
      atualizarContadorVD();
      return;
    }
    if (estado === 'base') {
      // Rótulos curtos em retrato (dívida S-2 do desenho): é o que liberta
      // os ≥120 px da linha de mensagem sem tocar nos alvos de 44 px.
      acoesEl.innerHTML =
        B('atacar', '⚔', 'Atacar', 'primary') +
        B('mover', '🚶', 'Mover') +
        B('consumivel', '🎒', rp ? 'Consum.' : 'Consumível') +
        B('encerrar', '✓', rp ? 'Fim' : 'Encerrar', 'ghost') +
        /* D3-P0-7: o «Terminar» saiu da barra — mora agora no ⚙
           (#cfg-terminar em index.html, accionado mais abaixo), com o
           fluxo M-014 intacto ('terminar' → 'confirmar-fim'). */
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
    } else if (estado === 'previa') {
      /* PRÉVIA v2: o assento do ramo 'rolagem' — [Confirmar]
         [Voltar] e ninguém mais; o rótulo de estado («prévia —
         ainda não lançou») vive na frase da gaveta, que o desenho
         da prévia diz a cada repintura (ataquePreviaDesenhar). */
      acoesEl.innerHTML = B('voltar', '←', 'Voltar', 'ghost')
        + B('confirmar', '✓', 'Confirmar', 'primary');
    } else if (estado === 'desgraca-lista') {
      // A decisão está no cartão: a faixa mostra só o estado, como
      // na vez da IA — um botão que não responde é proibido aqui.
      acoesEl.innerHTML = 'A escolher a desgraça…';
    } else if (estado === 'resultado') {
      acoesEl.innerHTML = B('continuar', '', 'Continuar ▸', 'primary');
    }
    /* PRÉVIA v2: cada repintura re-deriva (ou limpa) o desenho da
       prévia — é o gancho que mantém a geometria viva (R-07) e
       que apaga o overlay quando o estado muda por qualquer via
       (invalidadores incluídos). */
    ataquePreviaDesenhar();
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
    /* VOO (F-36): quem tem origem de voo anda no espaço de
       pontos (x, y, z): os quatro vizinhos do plano da sua
       camada + subir/descer 1 camada por passo (vizinhos
       verticais só para quem pode voar AGORA — asa torada ou
       figura morta não sobe), com o custo na mesma moeda da
       distância (H + |dz|). Ocupação é por PONTO: uma figura
       noutra camada não bloqueia este plano, e pousar sobre um
       ponto ocupado é ilegal; sobrevoar é livre. Cadáveres
       (sempre no chão: quem morre em voo cai) atravessam-se e
       não são destino, como no plano. Quem não tem origem de
       voo corre o código 2D de sempre, verbatim, mais abaixo —
       o braço z=0 é ao dígito por construção. */
    if (vooOrigemDe(id)) {
      const z0 = camadaDe(id);
      const podeVoarAgora = vooPodeVoar(id);
      const ocupadas3 = new Set(s.units.filter(v => v.id !== u.id && v.vivo !== false)
        .map(v => chave3(v.posicao.x, v.posicao.y, camadaDe(v.id))));
      for (const [dono, r] of reservasDestinoIA) {
        if (dono === u.id) continue;
        const donoU = s.units.find(v => v.id === dono);
        if (!donoU || donoU.vivo === false) { reservasDestinoIA.delete(dono); continue; }
        ocupadas3.add(chave3(r.x, r.y, r.z || 0));
      }
      const inicio = { x: u.posicao.x, y: u.posicao.y, z: z0, passos: 0, path: [] };
      const vistos = new Map([[chave3(inicio.x, inicio.y, inicio.z), inicio]]);
      const fila = [inicio];
      for (let i = 0; i < fila.length; i++) {
        const p = fila[i];
        if (p.passos >= tetoCasas) continue;
        const vizinhos = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
        if (podeVoarAgora) {
          if (p.z < VOO_TECTO) vizinhos.push([0, 0, 1]);
          if (p.z > 0) vizinhos.push([0, 0, -1]);
        }
        for (const [dx, dy, dz] of vizinhos) {
          const x = p.x + dx, y = p.y + dy, z = p.z + dz, k = chave3(x, y, z);
          if (x < AREA.origin.x || x >= AREA.origin.x + AREA.cols
            || y < AREA.origin.y || y >= AREA.origin.y + AREA.rows
            || vistos.has(k) || ocupadas3.has(k)) continue;
          const n = { x, y, z, passos: p.passos + 1, path: [...p.path, { x, y, z }] };
          vistos.set(k, n);
          fila.push(n);
        }
      }
      vistos.delete(chave3(inicio.x, inicio.y, inicio.z));
      for (const v of s.units)
        if (v.id !== u.id && v.vivo === false)
          vistos.delete(chave3(v.posicao.x, v.posicao.y, 0));
      return vistos;
    }
    /* VOO (F-36): no plano, só bloqueia quem está NO plano — a
       casa debaixo de uma voadora é caminho livre para quem
       anda no chão (ocupação por ponto, nunca por coluna). */
    const ocupadas = new Set(s.units.filter(v => v.id !== u.id && v.vivo !== false && camadaDe(v.id) === 0)
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
      /* VOO (F-36): reserva aérea nunca bloqueia destino terrestre. */
      if ((r.z || 0) === 0) ocupadas.add(chave(r.x, r.y));
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
    if (!ajudaGrid) { view.showMovement([]); return; }
    /* VOO (F-36): UMA só grade visível — a da camada activa de
       quem se move, desenhada à altura dessa camada (a cena
       honra a altitude por casa). Para quem está no chão — a
       Ong, sempre nesta tranche — é exactamente a grade de hoje. */
    const zSel = camadaDe(selecionada);
    view.showMovement([...alcance.values()]
      .filter(c => (c.z || 0) === zSel)
      .map(c => (c.z || 0) > 0 ? casaVistaVoo(c) : casaVista(c)));
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
    /* VOO (F-36): a régua 3D = a BFS horizontal de sempre, corrida
       no plano da camada de QUEM MEDE (só bloqueiam as figuras
       vivas nessa camada — um corpo noutra camada não tapa este
       plano), mais |dz| em camadas puras (a vertical nunca se
       converte pela escala). A casa do alvo conta como destino
       no plano, como sempre contou. Com as duas figuras no chão
       o conjunto de bloqueadoras é exactamente o de hoje e o
       resultado é o de hoje, ao dígito. */
    const zDe = camadaDe(deId), zPara = camadaDe(paraId);
    const bloqueadas = new Set(s.units
      .filter(v => v.id !== deId && v.id !== paraId && v.vivo !== false
        && camadaDe(v.id) === zDe)
      .map(v => chave(v.posicao.x, v.posicao.y)));
    const destino = chave(ele.posicao.x, ele.posicao.y);
    bloqueadas.delete(destino);   // a casa do alvo conta como destino no plano de quem mede, mesmo que uma terceira figura esteja nesse ponto da camada de quem mede (a descida faz-se na coluna)
    const vistos = new Map([[chave(eu.posicao.x, eu.posicao.y), 0]]);
    const fila = [{ x: eu.posicao.x, y: eu.posicao.y, passos: 0 }];
    for (let i = 0; i < fila.length; i++) {
      const p = fila[i];
      if (chave(p.x, p.y) === destino) return p.passos + Math.abs(zDe - zPara);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = p.x + dx, y = p.y + dy, k = chave(x, y);
        if (x < AREA.origin.x || x >= AREA.origin.x + AREA.cols
          || y < AREA.origin.y || y >= AREA.origin.y + AREA.rows
          || vistos.has(k) || bloqueadas.has(k)) continue;
        vistos.set(k, p.passos + 1);
        fila.push({ x, y, passos: p.passos + 1 });
      }
    }
    return vistos.has(destino) ? vistos.get(destino) + Math.abs(zDe - zPara) : Infinity;
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
    /* VOO: com o alvo no ar, a régua que manda é a 3D — a casa
       por baixo dela estar «perto» no mapa 2D não é caminho
       tapado, é altura; a frase honesta é a de longe demais. */
    const tapado = camadaDe(alvoId) === 0 && atraves !== undefined && atraves <= alcanceEmCasas(DADOS_COMBATE.ong.alcance);
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
   * estalo visual do acerto, sem números. Desde a F-19 (D3-P0-2),
   * os golpes dos monstros nela TAMBÉM geram os flutuantes das
   * parcelas — ver os dois sítios de golpe recebido (vez da IA e
   * ataques de oportunidade). */
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
       T1.4) — e o tick, abaixo, prende a posição ao ecrã.
       F-19 (D3-P0-2): tamanhos 26/34 px e contorno vivem no jogo.css;
       a dispersão sobe de 22 para 34 px para os glifos de 26 px não
       se sobreporem entre parcelas vizinhas. */
    let atraso = 40, total = 0;
    parcelas.forEach((p, i) => {
      total += p.valor;
      const el = document.createElement('span');
      el.className = 'dano t-' + p.classe;
      el.innerHTML = `<b>${p.valor}</b><small>${p.rotulo}</small>`;
      lancarFlutuante(el, id, (i - (parcelas.length - 1) / 2) * 34, atraso, 1100, 'dano');
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
    vezManualAberta = false; comandada = null; ctxMovManual = null;   // D1: a vez dela nunca é manual de monstro
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
        if (comandoMestreActivo()) iniciarVezManual(ordem[indiceVez]);
        else iniciarVezIA(ordem[indiceVez], true);
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
        if (comandoMestreActivo()) iniciarVezManual(ordem[indiceVez]);
        else iniciarVezIA(ordem[indiceVez], true);
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
      // D1: com o comando das figuras ligado, a vez seguinte é
      // MANUAL do Mestre; desligado, é a vez da IA de sempre.
      if (comandoMestreActivo()) iniciarVezManual(seguinte);
      else iniciarVezIA(seguinte, vezAtual === PROPRIA);
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
    vezManualAberta = false; comandada = null; ctxMovManual = null;   // D1: a vez da IA nunca é manual
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
    /* F-13 (palavra do Mestre, 08/11/2026): monstro caído =
       monstro MORTO. A REF_11 (T-J7) levantava-o aqui, como a
       Ong — essa palavra caiu: os consumos do golpe já matam o
       monstro à queda, e este ponto é a rede do que escapar
       (ex.: um save antigo restaurado com o monstro ainda
       'caido'): ele morre ao abrir a vez, sem agir nem voltar. */
    vezIASemMovimento = false;
    if ((ESTADO_VLAB[id].estados || []).includes('caido')) {
      ESTADO_VLAB[id].estados = ESTADO_VLAB[id].estados.filter(e => e !== 'caido');
      if (VIDA_MONSTROS[id] != null)
        ESTADO_VLAB[id].danoSofrido = VIDA_MONSTROS[id];
      vooCairCorpoSeEmVoo(id);   // VOO: quem morre em voo cai antes da pose
      try {
        const pm = view.apresentarMorte(id);
        if (pm && pm.catch) pm.catch(() => {});
      } catch (_) { view.setVivo(id, false); }
      ambAoMorrerFigura(id);   // RAIO E FOGO: a morte apaga o fogo da figura
      say(`<b>${nomeCena(id)}</b> está caído — e monstro caído não se levanta: morreu.`);
      if (vlabTodosMonstrosForaDeCombate()) { fimDeBatalha('vitoria'); return; }
      if (batalhaFim) return;
      const minhaSeq = ++seqTurno;
      fimDaVezIA(minhaSeq);
      return;
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
  /* ---------- D1: a vez MANUAL do Mestre sobre outra figura ----------
   * Gémea enxuta de iniciarVezIA: os mesmos portões de abertura
   * (o tick do ambiente e a morte do caído, F-13 — são lei da
   * batalha, não comportamento da IA), mas a vez NÃO se agenda:
   * fica à espera das mãos do Mestre. A reserva nasce do
   * orçamento da própria figura (orcamentoIA — a régua efectiva,
   * com as metades de Fraco/corpo partido), em metros, numa
   * variável separada da dela. Sem Transformação, sem consumível,
   * sem prévia: mover, atacar com a arma da figura, encerrar. */
  function iniciarVezManual(id) {
    vezAtual = id;
    vezManualAberta = false; comandada = null; ctxMovManual = null;
    ESTADO_VLAB[id].reacaoDisponivel = true;   // a Reacção renova na vez da própria figura
    delete REACCOES_DECLARADAS[id];            // C-39: a declaração por usar expira ao abrir a vez
    if (ambTickInicioTurno(id) === 'caiu') {
      if (batalhaFim) return;
      say(rfTomarFrasePendente() + `<b>${nomeCena(id)}</b> caiu com o ambiente — a vez dele não acontece.`);
      aguardar(ESPERA_FIM_MS).then(() => { if (!batalhaFim) passarVez(); });
      return;
    }
    if ((ESTADO_VLAB[id].estados || []).includes('caido')) {
      /* F-13: monstro caído = monstro MORTO ao abrir a vez — o
         mesmo assento de iniciarVezIA, sem a vez acontecer. */
      ESTADO_VLAB[id].estados = ESTADO_VLAB[id].estados.filter(e => e !== 'caido');
      if (VIDA_MONSTROS[id] != null)
        ESTADO_VLAB[id].danoSofrido = VIDA_MONSTROS[id];
      vooCairCorpoSeEmVoo(id);
      try {
        const pm = view.apresentarMorte(id);
        if (pm && pm.catch) pm.catch(() => {});
      } catch (_) { view.setVivo(id, false); }
      ambAoMorrerFigura(id);
      say(`<b>${nomeCena(id)}</b> está caído — e monstro caído não se levanta: morreu.`);
      if (vlabTodosMonstrosForaDeCombate()) { fimDeBatalha('vitoria'); return; }
      if (batalhaFim) return;
      aguardar(ESPERA_FIM_MS).then(() => { if (!batalhaFim) passarVez(); });
      return;
    }
    if (fichaAberta) fecharFicha();          // a vez apresenta-se em ecrã limpo, como a da IA
    vezManualAberta = true; comandada = id;
    selecionar(id);
    reservaManual = orcamentoIA(id) * CASA_M;
    atacouManual = false;
    alvo = null; ataquePendente = null;
    estado = 'base';
    atualizarVez(); renderAcoes();
    say(rfTomarFrasePendente() + `Vez de <b>${nomeCena(id)}</b> — <b>você comanda</b> esta figura: <b>Mover</b>, <b>Atacar</b> (toque primeiro no alvo) ou <b>Encerrar</b>.`);
    supSnapshot();                    // Supervisor: ponto de retorno deste turno
  }
  function entrarMoverManual() {
    const id = comandada;
    const u = unidade(id);
    if (!u) return;
    if (estado === 'movendo' || view.getState().moving) { say('Espere — a figura ainda está a andar.'); return; }
    if (reservaManual < CASA_M) {
      say(`<b>${nomeCena(id)}</b> andou o que podia andar nesta vez — aperte <b>Atacar</b> ou <b>Encerrar</b>.`);
      return;
    }
    alcance = calcularAlcancePara(id, Math.floor(reservaManual / CASA_M));
    estado = 'mover';
    desenharAlcance();
    renderAcoes();
    say(`A mover <b>${nomeCena(id)}</b> · restam <b>${fmtM(reservaManual)}</b> — toque numa casa acesa${vooOrigemDe(id) ? ', ou <b>Subir camada</b> / <b>Descer camada</b> para voar um nível' : ''}.`);
  }
  /* O despacho do movimento manual: a mesma view.move da IA, com
     o caminho e a conversão de voo da figura — mas SEM os
     capturadores de partida dela (R2: a saída de adjacência e os
     ataques de oportunidade são maquinaria da partida da Ong) e
     com contexto próprio (ctxMovManual), que o moveend assenta. */
  function despacharMovimentoManual(destino) {
    const id = comandada;
    const u = unidade(id);
    if (!u) return;
    estado = 'movendo'; renderAcoes();
    const ctx = { id, destino: { x: destino.x, y: destino.y, z: destino.z || 0 }, passos: destino.passos };
    ctxMovManual = ctx;
    view.showMovement([]); view.showHover(null);
    say(`<b>${nomeCena(id)}</b> está a andar…`);
    { const deEv = { x: u.posicao.x, y: u.posicao.y };
      if (camadaDe(id) > 0) deEv.z = camadaDe(id);
      const paraEv = { x: destino.x, y: destino.y };
      if ((destino.z || 0) > 0) paraEv.z = destino.z;
      supRegistar('accao', { acao: 'mover', actor: id, de: deEv, para: paraEv, passos: destino.passos,
        path: destino.path.map(p => { const q = { x: p.x, y: p.y }; if ((p.z || 0) > 0) q.z = p.z; return q; }) }); }
    const voa = vooOrigemDe(id) != null;
    try {
      view.move(id, voa ? casaVistaVoo(destino) : casaVista(destino), {
        path: destino.path.map(p => voa ? casaVistaVoo(p) : casaVista(p)),
        durationMs: ritmo(Math.min(1200, Math.max(220, destino.passos * 140)))
      });
    } catch (_) {
      ctxMovManual = null; estado = 'mover'; desenharAlcance(); renderAcoes();
      say(`<b>${nomeCena(id)}</b> não conseguiu andar.`);
      return;
    }
    /* Guarda contra um moveend perdido — NÃO destrutiva: a cena
       anima em câmara lenta quando o desenho está pesado (o dt
       por frame é truncado), por isso uma chegada pode demorar
       muito mais que o relógio. Enquanto a figura se mexer, a
       guarda rearma; se ela já estiver no destino (o evento é
       que se perdeu), a guarda assenta a chegada ela própria,
       pelo mesmo caminho do moveend. Só ao fim de várias voltas
       sem movimento nem destino é que devolve a vez ao Mover. */
    vigiarChegadaManual(ctx, 0);
  }
  function vigiarChegadaManual(ctx, tentativas) {
    setTimeout(() => {
      if (ctxMovManual !== ctx || estado !== 'movendo' || !vezManualAberta) return;
      const s = view.getState();
      const u = s.units.find(v => v.id === ctx.id);
      const zU = Math.round(((u && u.altitude) || 0) / VOO_METROS_CAMADA);
      if (u && u.posicao.x === ctx.destino.x && u.posicao.y === ctx.destino.y
          && (ctx.destino.z || 0) === zU) {
        assentarMovimentoManual(u, zU);
        return;
      }
      if (s.moving && tentativas < 5) { vigiarChegadaManual(ctx, tentativas + 1); return; }
      ctxMovManual = null;
      estado = 'mover';
      alcance = calcularAlcancePara(ctx.id, Math.floor(reservaManual / CASA_M));
      desenharAlcance(); renderAcoes();
      say(`<b>${nomeCena(ctx.id)}</b> parou.`);
    }, 30000);
  }
  /* O assento de uma chegada manual (do moveend, ou da guarda
     quando o evento se perde): a camada assenta (voo), a reserva
     manual desconta os passos e o Mover repinta ou fecha. */
  function assentarMovimentoManual(u, zChegada) {
    const ctxM = ctxMovManual;
    if (!ctxM) return;
    ctxMovManual = null;
    if (vooEstado[u.id]) vooEstado[u.id].z = zChegada;   // VOO: a camada assenta na chegada casada
    reservaManual = Math.max(0, reservaManual - ctxM.passos * CASA_M);
    if (estado === 'movendo' || estado === 'mover') {
      if (reservaManual < CASA_M) {
        estado = 'base'; alcance = new Map(); view.showMovement([]);
        renderAcoes();
        say(`<b>${nomeCena(u.id)}</b> chegou — e andou o que podia andar nesta vez.`);
      } else {
        estado = 'mover';
        alcance = calcularAlcancePara(u.id, Math.floor(reservaManual / CASA_M));
        desenharAlcance();
        renderAcoes();
        say(`<b>${nomeCena(u.id)}</b> chegou. Restam <b>${fmtM(reservaManual)}</b> — continue a andar, ou aperte <b>Cancelar</b>.`);
      }
    }
  }
  /* Subir/descer UM nível dentro do Mover (o desenho do voo,
     REF_89): o passo vertical é a entrada (x, y, z±1) do próprio
     alcance — ocupada ou fora da reserva, não existe e recusa-se. */
  function passoCamadaManual(dz) {
    const id = comandada;
    if (estado !== 'mover' || !vooOrigemDe(id)) return;
    if (dz > 0 && !vooPodeVoar(id)) { say(`<b>${nomeCena(id)}</b> não pode voar nesta batalha.`); return; }
    const u = unidade(id);
    if (!u) return;
    const zNovo = camadaDe(id) + dz;
    if (zNovo < 0) { say(`<b>${nomeCena(id)}</b> já está no chão.`); return; }
    if (zNovo > VOO_TECTO) { say(`<b>${nomeCena(id)}</b> já está na camada mais alta.`); return; }
    const destino = alcance.get(chave3(u.posicao.x, u.posicao.y, zNovo));
    if (!destino) { say('Não dá para mudar de camada aqui — o ponto está ocupado ou longe demais.'); return; }
    despacharMovimentoManual(destino);
  }
  /* Um passo de seta da figura comandada (só no Mover, só no
     plano dela): a entrada vizinha do alcance, pelo mesmo
     despacho do toque. Sem capturadores de partida (R2). */
  function passoSetaManual(dx, dy) {
    const id = comandada;
    if (!id || estado !== 'mover') return;
    if (view.getState().moving) return;
    const u = unidade(id);
    if (!u) return;
    const destino = vooOrigemDe(id)
      ? alcance.get(chave3(u.posicao.x + dx, u.posicao.y + dy, camadaDe(id)))
      : alcance.get(chave(u.posicao.x + dx, u.posicao.y + dy));
    if (!destino) { say('Não dá para andar para aí.'); return; }
    despacharMovimentoManual(destino);
  }

  /* As acções da vez manual: só as três da figura comandada.
     Tudo o resto (Consumível, Transformação, declarações dela)
     responde com a frase de âmbito — nunca cai nos caminhos da
     Ong, que validariam e registariam como se fosse ela. */
  function tratarAcaoManual(acao) {
    const id = comandada;
    if (!id || batalhaFim) return;
    if (acao === 'encerrar') { passarVez(); return; }
    if (acao === 'continuar') {
      if (estado === 'resultado') { estado = 'base'; renderAcoes(); say(`É a vez de <b>${nomeCena(id)}</b> — você comanda.`); }
      return;
    }
    if (acao === 'voltar') {
      if (estado === 'mover') sairMover();
      if (estado === 'atacar' || estado === 'mover') { estado = 'base'; renderAcoes(); }
      return;
    }
    if (acao === 'cancelar') {
      if (estado === 'mover') { sairMover(); say(`Você fica por aqui — restavam <b>${fmtM(reservaManual)}</b> nesta vez.`); }
      return;
    }
    if (acao === 'mover') { entrarMoverManual(); return; }
    if (acao === 'atacar') {
      estado = 'atacar'; renderAcoes();
      say(alvo && alvo !== id
        ? `Aperte <b>${(DADOS_COMBATE[id] || {}).arma || 'Ataque'}</b> para atacar <b>${nomeCena(alvo)}</b>.`
        : `Toque na figura que <b>${nomeCena(id)}</b> vai atacar; depois abra <b>Atacar</b> e aperte a arma.`);
      return;
    }
    if (acao === 'ataque-basico-mestre') { atacarManualMestre(); return; }
    if (acao === 'subir-camada') { passoCamadaManual(1); return; }
    if (acao === 'descer-camada') { passoCamadaManual(-1); return; }
    say(`Essa acção não é da figura comandada — <b>${nomeCena(id)}</b> só move, ataca e encerra a vez.`);
  }
  /* O ataque manual do Mestre: a gémea parametrizada de atacarIA
     — o mesmo motor (vlabResolverAtaqueCompleto em «proposta»,
     com a semente e a verificação capturadas antes), o mesmo
     parque de desgraças quando a falha crítica pede confirmação
     (o pendente nasce com origem 'monstro' e o alvo nomeado, e é
     o cartão de sempre que o assenta), os mesmos assentos de
     aplicação. O que muda: o alvo é o marcado pelo Mestre (não
     está cablado à Ong) e a vez não fecha sozinha — quem a fecha
     é o Encerrar dele. A apresentação do confronto corre como
     nos golpes da IA; a esquiva do alvo só se tenta quando o
     alvo é a Ong (o único uso provado dessa máquina). */
  async function atacarManualMestre() {
    const id = comandada;
    if (!id || (estado !== 'atacar' && estado !== 'base')) return;
    if (atacouManual) { say(`<b>${nomeCena(id)}</b> já atacou nesta vez.`); return; }
    if (!alvo || alvo === id) { say(`Toque primeiro na figura que <b>${nomeCena(id)}</b> vai atacar.`); return; }
    const alvoId = alvo;
    const alvoU = unidade(alvoId);
    if (!alvoU || alvoU.vivo === false) { say('Esse alvo já não está em combate.'); return; }
    if (distanciaEntre(id, alvoId) > alcanceEmCasas(DADOS_COMBATE[id].alcance)) {
      supRegistar('bloqueada', { acao: 'ataque', actor: id, alvo: alvoId, razao: 'Alvo fora de alcance da figura comandada' });
      say(`<b>${nomeCena(id)}</b> não alcança <b>${nomeCena(alvoId)}</b> — aproxime-o com <b>Mover</b>.`);
      return;
    }
    const verbos = FRASES_IA[id] || { acerto: 'atacou', falha: 'tentou atacar' };
    const sementeDG = vlabSemente(), verificacaoDG = vlabVerificacao();
    const s = vlabResolverAtaqueCompleto(id, alvoId, {
      modoDesgraca: 'proposta', semente: sementeDG, verificacao: verificacaoDG });
    if (s.erro) {
      supRegistar('bloqueada', { acao: 'ataque', actor: id, alvo: alvoId, razao: s.erro.codigo });
      say(s.erro.codigo === 'ARMA_QUEBRADA'
        ? `<b>${nomeCena(id)}</b> não consegue atacar — a arma dele está quebrada.`
        : `<b>${nomeCena(id)}</b> não consegue atacar agora.`);
      estado = 'base'; renderAcoes();
      return;
    }
    atacouManual = true;
    if (s.resultado === 'falhaCritica') {
      const fcProp = s.soDoMestre && s.soDoMestre.falhaCritica;
      if (fcProp && fcProp.requerConfirmacao) {
        /* O PARQUE, como o da IA: estaciona sem registar nada; o
           registo nasce depois da decisão dele, com a escolha. */
        const pendente = {
          origem: 'monstro', atacanteId: id, alvoId, seq: seqTurno, supEpoca,
          semente: sementeDG, verificacao: verificacaoDG,
          recibo: s, proposta: fcProp.desgraca.id,
          escolhaMarcada: undefined, assentador: null
        };
        desgracaMonstroPendente = pendente;
        estado = 'desgraca-lista'; renderAcoes();
        const desfecho = await new Promise(res => { pendente.assentador = res; });
        if (!desfecho || desfecho.morta || batalhaFim || supCongelado
            || supEpoca !== pendente.supEpoca || !vezManualAberta || vezAtual !== id) return;
        const escolha = desfecho.escolha;
        estado = 'base';
        if (escolha === 'nada') {
          supRegistar('accao', { acao: 'ataque', actor: id, alvo: alvoId, acerto: false, falhaCritica: null });
          supRegistar('accao', { acao: 'desgraca-escolha', actor: id, proposta: pendente.proposta, escolha: 'nada' });
          say(`<b>${nomeCena(id)}</b> ${verbos.falha} <b>${nomeCena(alvoId)}</b> e falhou. ` + vlabFraseDesgraca(id, null));
          renderAcoes();
          return;
        }
        const s2 = vlabResolverAtaqueCompleto(id, alvoId, {
          modoDesgraca: 'escolha', semente: pendente.semente, verificacao: pendente.verificacao,
          desgracaEscolhida: escolha,
          confirmacaoDeProposta: { proposta: pendente.proposta } });
        if (s2.erro) {
          supRegistar('bloqueada', { acao: 'ataque', actor: id, alvo: alvoId, razao: s2.erro.codigo });
          say(`<b>${nomeCena(id)}</b> ${verbos.falha} <b>${nomeCena(alvoId)}</b> e falhou.`);
          renderAcoes();
          return;
        }
        const fc = vlabAplicarAtacanteDepois(id, s2);
        supRegistar('accao', { acao: 'ataque', actor: id, alvo: alvoId, acerto: false, falhaCritica: fc ? fc.desgraca.id : null });
        supRegistar('accao', { acao: 'desgraca-escolha', actor: id, proposta: pendente.proposta, escolha });
        if (s2.desgracaPendente)
          supRegistar('accao', { acao: 'desgraca-pendente', actor: id, tipo: s2.desgracaPendente.tipo, aplicada: false, motivo: 'desgraça pendente não aplicada nesta casca (sem aliados ao alcance — contexto da batalha a solo)' });
        say(`<b>${nomeCena(id)}</b> ${verbos.falha} <b>${nomeCena(alvoId)}</b> e falhou. ` + vlabFraseDesgraca(id, fc));
        renderAcoes();
        return;
      }
      const fc = vlabAplicarAtacanteDepois(id, s);
      supRegistar('accao', { acao: 'ataque', actor: id, alvo: alvoId, acerto: false, falhaCritica: fc ? fc.desgraca.id : null });
      if (s.desgracaPendente)
        supRegistar('accao', { acao: 'desgraca-pendente', actor: id, tipo: s.desgracaPendente.tipo, aplicada: false, motivo: 'desgraça pendente não aplicada nesta casca (sem aliados ao alcance — contexto da batalha a solo)' });
      say(`<b>${nomeCena(id)}</b> ${verbos.falha} <b>${nomeCena(alvoId)}</b> e falhou. ` + vlabFraseDesgraca(id, fc));
      estado = 'base'; renderAcoes();
      return;
    }
    if (s.resultado === 'erra') {
      supRegistar('accao', { acao: 'ataque', actor: id, alvo: alvoId, acerto: false });
      if (alvoId === PROPRIA) tentarEsquiva(id, PROPRIA);
      const epocaFalhaM = supEpoca;
      await apresentarConfronto(id, alvoId, true);
      if (seqTurnoMorto(epocaFalhaM, id)) return;
      estado = 'resultado'; renderAcoes();
      say(`<b>${nomeCena(id)}</b> ${verbos.falha} <b>${nomeCena(alvoId)}</b> e falhou.`);
      return;
    }
    if (!supConferirSoma(s.danoAplicado.parcelas.map(p => ({ valor: p.subtotal })), s.danoAplicado.total, id)) { estado = 'base'; renderAcoes(); return; }
    const total = s.totalEfectivo;
    supRegistar('accao', { acao: 'ataque', actor: id, alvo: alvoId, acerto: true, dano: total });
    const epocaAcertoM = supEpoca;
    await apresentarConfronto(id, alvoId, true);
    if (seqTurnoMorto(epocaAcertoM, id)) { continuarAposApresentacao = false; return; }
    mostrarImpacto(alvoId);
    const desfecho = vlabAplicarAlvoDepois(alvoId, s);
    if (alvoId === PROPRIA) {
      if (desfecho === 'morreu') { fimDeBatalha('morte'); return; }
      if (desfecho === 'aMorrer') {
        entrarAMorrer();
        vezManualAberta = false; comandada = null; ctxMovManual = null;
        aguardar(ESPERA_FIM_MS).then(() => { if (!batalhaFim) passarVez(); });
        return;
      }
      if (desfecho === 'falhaDeMorte') {
        const em = ESTADO_VLAB.ong.estadoMorte;
        supRegistar('accao', { acao: 'falha-de-morte-por-golpe', actor: id, alvo: PROPRIA,
          sucessos: em ? em.sucessos : null, falhas: em ? em.falhas : null });
        estado = 'resultado'; renderAcoes();
        say(`<b>${nomeCena(id)}</b> ${verbos.acerto} a <b>Ong</b> caída — ela piora visivelmente.`);
        return;
      }
    } else if (desfecho === 'caiu') {
      if (alvo === alvoId) alvo = null;
      if (vlabTodosMonstrosForaDeCombate()) { fimDeBatalha('vitoria'); return; }
    }
    estado = 'resultado'; renderAcoes();
    say(`<b>${nomeCena(id)}</b> ${verbos.acerto} <b>${nomeCena(alvoId)}</b> — perdeu <b>${total}</b> de vida.`);
  }
  /* A guarda de época das continuações do ataque manual: a
     resolução pertence à linha do tempo que a rolou — restauro,
     gelo, fim de batalha ou a vez já fechada matam-na em silêncio,
     como nos ramos da IA. */
  function seqTurnoMorto(epoca, id) {
    return supEpoca !== epoca || batalhaFim || supCongelado || !vezManualAberta || vezAtual !== id;
  }
  /* O toque no mundo durante a vez manual: tocar noutra figura
     marca-a como alvo DA FIGURA COMANDADA (nunca «alvo da Ong»);
     tocar no chão em Mover despacha o movimento dela; tocar na
     própria figura comandada só a nomeia. As guardas de estado
     são as do toque de sempre (resultado por ler, decisão por
     resolver, figura a andar). */
  function tratarToqueManual(clientX, clientY) {
    const id = comandada;
    if (estado === 'movendo' || view.getState().moving) { say(`Espere — <b>${nomeCena(id)}</b> ainda está a andar.`); return; }
    if (estado === 'resultado' || apresentacaoEmCurso) { say('Aperte <b>Continuar</b> para seguir.'); return; }
    if (decisaoPorResolver()) { say(FRASE_DECISAO_PENDENTE); return; }
    const hit = view.hitTest(clientX, clientY);
    if (hit.unitId) {
      const fig = unidade(hit.unitId);
      const nome = fig ? fig.nome : nomeCena(hit.unitId);
      if (hit.unitId === id) {
        if (estado === 'mover') { say(`<b>${nome}</b> já está aqui — toque numa casa acesa para andar.`); return; }
        abrirFicha(hit.unitId);
        say(`Você comanda <b>${nome}</b> nesta vez.`);
        return;
      }
      alvo = hit.unitId;
      if (estado === 'mover') sairMover();
      else if (estado === 'atacar') { estado = 'base'; renderAcoes(); }
      abrirFicha(hit.unitId);
      say(`<b>${nome}</b> é o alvo. Aperte <b>Atacar</b> para <b>${nomeCena(id)}</b> o atacar.`);
      return;
    }
    if (estado === 'mover') {
      const cel = casaMotor(hit.cell);
      if (!cel) { say('Toque numa casa do campo para andar.'); return; }
      const u = unidade(id);
      /* O destino é a entrada do alcance nessa coluna: na camada
         actual, se existir; numa voadora, a mais próxima da camada
         dela (a subida/descida deliberada faz-se pelos botões). */
      const zAct = camadaDe(id);
      let destino = null;
      for (const c of alcance.values()) {
        if (c.x !== cel.x || c.y !== cel.y) continue;
        if ((c.z || 0) === zAct) { destino = c; break; }
        if (!destino
            || Math.abs((c.z || 0) - zAct) < Math.abs((destino.z || 0) - zAct)
            || (Math.abs((c.z || 0) - zAct) === Math.abs((destino.z || 0) - zAct) && c.passos < destino.passos))
          destino = c;
      }
      if (!destino) {
        supRegistar('bloqueada', { acao: 'mover', actor: id, razao: 'Casa fora da reserva de movimento' });
        say(ajudaGrid
          ? 'Essa casa está longe demais — escolha uma das <b>casas acesas</b>.'
          : `Longe demais — <b>${nomeCena(id)}</b> ainda tem <b>${fmtM(reservaManual)}</b> nesta vez.`);
        return;
      }
      if (u && destino.x === u.posicao.x && destino.y === u.posicao.y && (destino.z || 0) === zAct) {
        say(`<b>${u.nome}</b> já está nessa casa — escolha outra.`);
        return;
      }
      despacharMovimentoManual(destino);
      return;
    }
    if (estado !== 'base') { say('Isso é o chão. Aperte <b>Voltar</b> para regressar às acções base.'); return; }
    say('Isso é o chão. Aperte <b>Mover</b>, toque numa casa acesa. Alvo: toque na figura.');
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
    /* VOO (F-36): o destino e a reserva vivem por PONTO (x, y, z);
       o evento e o caminho ganham z só quando a camada é > 0 —
       a z=0 o registo fica byte-igual ao de hoje. */
    contextoIA = { id, seq, destino: { x: destino.x, y: destino.y, z: destino.z || 0 }, rearmes: 0, relogio: setTimeout(() => relogioIA(id, seq), GUARDA_IA_MS) };
    /* Reserva de destino em voo: nasce com o despacho e NÃO morre
       com o contexto — sobrevive à guarda de 5 s, até esta figura
       de facto pousar neste destino (ver o tratador de moveend). */
    reservasDestinoIA.set(id, { x: destino.x, y: destino.y, z: destino.z || 0 });
    /* Supervisor (pós-críticos T1.5): o movimento LEGAL do monstro
       também entra no registo — actor, de→para e passos. */
    { const uIA = unidade(id);
      const deEv = uIA ? { x: uIA.posicao.x, y: uIA.posicao.y } : null;
      if (deEv && camadaDe(id) > 0) deEv.z = camadaDe(id);
      const paraEv = { x: destino.x, y: destino.y };
      if ((destino.z || 0) > 0) paraEv.z = destino.z;
      supRegistar('accao', { acao: 'mover', actor: id,
        de: deEv,
        para: paraEv, passos: destino.passos,
        path: destino.path.map(p => { const q = { x: p.x, y: p.y }; if ((p.z || 0) > 0) q.z = p.z; return q; }) }); }   // T1.7: o caminho fica no evento mover
    try {
      const voa = vooOrigemDe(id) != null;
      view.move(id, voa ? casaVistaVoo(destino) : casaVista(destino), {
        path: destino.path.map(p => voa ? casaVistaVoo(p) : casaVista(p)),
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
    // chegada nomeia-se (ver o tratador de moveend).
    // RN-2 (tranche «Órfãs do Ledger», A-17) — a guarda FOI
    // redesenhada: medido em aparelho lento (moveend a chegar
    // depois dos 5 s), ela anulava o ataque legítimo de um monstro
    // que pousava na mesma. Agora, ao expirar, a guarda pergunta à
    // cena: a figura ainda se move, ou já pousou no destino e só o
    // moveend está atrasado? Se sim, REARMA (até GUARDA_REARMES_MAX)
    // sem consumir o contexto — o moveend tardio liquida a chegada
    // como completa (ataque incluído), pelo caminho de sempre. Só
    // quando a figura não se move nem pousou (nunca completou) é
    // que a guarda fecha a vez sem atacar, como antes.
    const ctx = (contextoIA && contextoIA.id === id && contextoIA.seq === seq) ? contextoIA : null;
    if (!ctx || seqTurno !== seq || batalhaFim) return;
    const uIAg = unidade(id);
    const pousado = !!(ctx.destino && uIAg
      && uIAg.posicao.x === ctx.destino.x && uIAg.posicao.y === ctx.destino.y
      && Math.round(((uIAg.altitude || 0) / VOO_METROS_CAMADA)) === (ctx.destino.z || 0));
    /* VOO: pousada no destino nas três coordenadas, a camada
       assenta já — o moveend pode ter-se perdido e a figura
       está fisicamente lá. */
    if (pousado && vooEstado[id]) vooEstado[id].z = ctx.destino.z || 0;
    let aMover = false;
    try { aMover = !!view.getState().moving; } catch (_) { aMover = false; }
    if ((aMover || pousado) && (ctx.rearmes || 0) < GUARDA_REARMES_MAX) {
      ctx.rearmes = (ctx.rearmes || 0) + 1;
      ctx.relogio = setTimeout(() => relogioIA(id, seq), GUARDA_IA_MS);
      supRegistar('guarda', { acao: 'mover', actor: id, razao: 'O moveend da IA não chegou em 5 s, mas o movimento ainda decorre ou a figura já pousou — guarda rearmada, contexto intacto' });
      return;
    }
    const consumido = consumirContextoIA(id);
    if (!consumido || consumido.seq !== seq) return;
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
    /* VOO (F-36): a pontuação de uma voadora é a régua do
       jogador aplicada ao mapa de pontuação — a distância 3D
       ao ponto candidato é H (do mapa) + |dz| até à camada
       dela (a Ong está no chão: |dz| = a camada do candidato).
       Para figuras terrestres os dois termos de camada são 0
       e a pontuação é a de hoje, ao dígito. */
    const dActCasa = distOng.get(chave(eu.posicao.x, eu.posicao.y));
    const distActual = dActCasa === undefined ? undefined : dActCasa + camadaDe(id);
    let melhor = null;
    for (const c of calcularAlcancePara(id, orcamentoIA(id)).values()) {
      const dCasa = distOng.get(chave(c.x, c.y));
      const d = dCasa === undefined ? undefined : dCasa + (c.z || 0);
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
    /* F-19 (D3-P0-2): o golpe que ela recebe também mostra os
       números — as parcelas do DMG por tipo + o total, pela mesma
       porta (mostrarDano) e com o mesmo interruptor dos golpes
       dela; a soma já foi conferida pelo Supervisor acima. */
    if (numerosDano) mostrarDano(PROPRIA, s.danoAplicado.parcelas.map(p => ({
      classe: p.tipo || 'tecnica', rotulo: p.tipo || 'dano', valor: p.subtotal })));
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
    limparPrecosPendentes();   // RN-1: no fim natural nenhum preço pendente sobrevive
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
    musSincronizar();   // MÚSICA DE BATALHA: a batalha acabou — a música cala
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
    limparPrecosPendentes();   // RN-1: no fim declarado nenhum preço pendente sobrevive
    batalhaFim = true;
    seqTurno++;                              // invalida continuações pendentes
    if (contextoIA) consumirContextoIA(contextoIA.id);
    reservasDestinoIA.clear();   // fim declarado: nenhuma reserva de voo atravessa o fim
    supRestauroPendente = null;
    supRestauroVoo = null;   // EM-TJ12J13-01: fim declarado — o par de restauro também não atravessa o fim
    estado = 'fim';
    atualizarVez(); renderAcoes();
    say('A batalha <b>terminou</b> — a mesa fechou este encontro. Aperte <b>Recomeçar</b> para jogar outra vez.');
    musSincronizar();   // MÚSICA DE BATALHA: fim declarado — a música cala
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
    /* D1: na vez manual do Mestre, as acções são da figura
       comandada — tratam-se no caminho próprio, ANTES da guarda
       de vez (que as fecharia a todas) e ANTES do validador dela
       (que as registaria com actor PROPRIA). Com um parque de
       desgraça aberto, só a decisão (acima) passa; o resto ouve
       a frase da decisão pendente, como na vez dela. */
    if (vezManualAberta) {
      if (desgracaMonstroPendente) { say(FRASE_DECISAO_PENDENTE); return; }
      tratarAcaoManual(acao);
      return;
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
    /* PRÉVIA v2: o Confirmar com uma prévia aberta é o Confirmar
       DA PRÉVIA (a rolagem nasce aí) — intercepta-se ANTES do
       validador, que sem ataquePendente recusaria com «Nada para
       confirmar». As guardas acima (gelo, recomeçar, parque de
       desgraça de monstro, vez, apresentação) já correram: a
       prévia nunca se confirma por cima delas. */
    if (acao === 'confirmar' && estado === 'previa') { ataquePreviaConfirmar(); return; }
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
    } else if (acao !== 'ataque-basico') {
      supRegistar('accao', { acao, actor: PROPRIA });
    }
    /* PRÉVIA v2: o gesto «ataque-basico» já não regista à cabeça —
       o ramo da declaração é dono do seu registo: nos ramos de
       arma (quebrada/caída) regista o gesto como antes; no
       nascimento da prévia NÃO regista (a acta guarda actos, não
       intenções — o registo do ataque nasce no Confirmar, por
       arrasto da rolagem, §7.3/EM-S-17). */
    if (acao === 'voltar') {
      /* J1 (carta IBX-213): com uma rolagem por resolver, o Voltar
         NÃO a deita fora — devolve à mesma rolagem pendente. Sem
         rolagem pendente, o Voltar é o de sempre (incl. cancelar a
         declaração de Transformação antes de rolar). */
      if (rolagemPorResolver()) { say(FRASE_ROLAGEM_PENDENTE); return; }
      /* PRÉVIA v2: Voltar na prévia desiste dela e volta à ESCOLHA
         DE ALVO (não à base) — custo zero, sem registo novo (a
         acta guarda actos, não intenções, §7.4). Um segundo Voltar,
         já na escolha de alvo, sai para a base como sempre. */
      if (estado === 'previa') {
        estado = 'atacar'; renderAcoes();
        say(`Escolha de alvo — toque no inimigo e aperte <b>${DADOS_COMBATE.ong.arma}</b>.`);
        return;
      }
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
        /* O gesto regista-se como antes (o ramo é dono do registo
           do ataque-basico desde a PRÉVIA v2) — e não nasce
           prévia: arma quebrada não lança. */
        supRegistar('accao', { acao: 'ataque-basico', actor: PROPRIA });
        say(`O ${c.arma} está quebrado — só volta a servir depois de consertado.`);
        return;
      }
      if (ESTADO_VLAB.ong.armaCaida) {
        /* Apanhar a arma = 1 Acção de Movimento (motor, desgraças
           J3): consome-se o movimento desta vez, sem ataque. */
        supRegistar('accao', { acao: 'ataque-basico', actor: PROPRIA });
        ESTADO_VLAB.ong.armaCaida = false;
        reservaMovimento = 0;
        say(`A <b>Ong</b> apanha o ${c.arma} do chão — isso gasta o movimento desta vez.`);
        return;
      }
      /* ═══ PRÉVIA v2 (passo ③): declarar já NÃO rola. Depois da
         validação (o portão da marcação, em validarAlvoAtaqueOng)
         nasce o estado 'previa' sobre o `alvo` global — SEM chamar
         o adaptador, SEM tirar semente, SEM registar o ataque e
         SEM recibo. A rolagem, o registo e o recibo nascem no
         Confirmar (ataquePreviaConfirmar). A gaveta pinta o ramo
         'previa' e renderAcoes desenha o caminho e diz o livro. */
      estado = 'previa'; renderAcoes();
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
      /* PRÉVIA v2 — cirurgia de ordem (EM-S-08): o pendente só se
         consome (ataquePendente = null) e atacou só se marca
         DEPOIS de a chamada que resolve correr sem erro. Na ordem
         antiga os dois escreviam-se AQUI, antes da segunda chamada
         e da leitura de s.erro: uma falha dela deixava o golpe
         gasto e a rolagem apagada. Em erro, o pendente fica — a
         rolagem continua por resolver e as guardas J1 mantêm-na. */
      /* Guarda reposta (bancada, R3): sem pendente, o Confirmar
         fecha em silêncio na base — nunca lê pend.tipo a null. O
         validador já recusa este caso; a guarda é a rede local. */
      if (!pend) { estado = 'base'; renderAcoes(); return; }
      if (pend.tipo === 'transformacao') {
        /* A Transformação não tem chamada que falhe depois da
           validação: consome o pendente dentro do seu ramo. */
        ataquePendente = null;
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
      /* A resolução correu sem erro: SÓ AGORA o pendente se
         consome e a acção se marca gasta (cirurgia EM-S-08) —
         a partir daqui o fluxo é o de sempre. */
      ataquePendente = null;
      atacou = true;                   // a acção gasta-se, acerte ou erre
      estado = 'resultado'; renderAcoes();
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
    // D1: na vez manual, a frase nomeia o comando em vez de mandar
    // esperar por uma IA que não vai jogar.
    if (vezManualAberta) { say(`É a vez de <b>${nomeCena(vezAtual)}</b> — você comanda essa figura. A ficha da <b>Ong</b> vê-se na vez dela.`); return; }
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
    /* D1: na vez manual do Mestre, o toque é o comando dele sobre
       a figura da vez — caminho próprio, antes da intercepção de
       espera (que o trataria como espectador da IA). */
    if (vezManualAberta) { tratarToqueManual(clientX, clientY); return; }
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
      /* PRÉVIA v2: com a prévia aberta, tocar noutra figura TROCA o
         alvo da prévia e re-deriva-a (o desenho §4.2: a prévia
         segue o alvo marcado) — ou mata-a para a escolha de alvo
         se o portão recusar o alvo novo. Sem registo novo (§7.4).
         O cartão da figura não se abre por cima da prévia. */
      if (estado === 'previa' && hit.unitId !== PROPRIA) {
        alvo = hit.unitId;
        const bloqueioToque = validarAlvoAtaqueOng('atacar');
        if (bloqueioToque) { estado = 'atacar'; renderAcoes(); say(bloqueioToque.mensagem); return; }
        renderAcoes();
        return;
      }
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
    /* VOO (F-36): a camada a que esta chegada pousou, lida da
       altitude que o próprio evento traz (a projecção da cena);
       o z da casca assenta quando a chegada casa com o destino
       prometido (reserva ou contexto), nos ramos abaixo. */
    const zChegada = Math.round(((u && u.altitude) || 0) / VOO_METROS_CAMADA);
    /* Supervisor (pós-críticos T1.5, Conflitos A2): guarda de
       ÉPOCA no moveend DELA. Se a época mudou desde a partida
       (congelamento ou restauro pelo meio), esta chegada é
       tardia: NÃO desconta reserva, NÃO repinta nada — e havendo
       restauro pendente, reafirma as posições do snapshot (a
       animação velha pode ter pousado a figura fora dele). */
    if (u.id === PROPRIA && epocaMovimentoOng !== supEpoca) {
      custoPendente = null; caminhoPendente = null;
      limparPrecosPendentes();   // RN-1: o preço do voo morto morre com ele
      passoEmCurso = false; parado = false;
      supDesarmarGuardaMovimentoOng();
      if (supRestauroPendente) {
        const snapUnidades = supRestauroPendente;
        supRestauroPendente = null;
        supRestauroVoo = null;   // EM-TJ12J13-01: a reafirmação geral resolve todas as travessias — o carimbo morre com o pendente
        supRestaurando = true;               // a reafirmação não é movimento de jogo
        for (const su of snapUnidades) {
          const uv = unidade(su.id);
          if (uv && (uv.posicao.x !== su.x || uv.posicao.y !== su.y || camadaDe(su.id) !== (su.z || 0))) {
            reservasDestinoIA.delete(su.id);   // EMENDA-V1: a reafirmação cancela o voo desta figura — a reserva dele morre com o voo cancelado, antes do move, porque o moveend cancelado é engolido em :2734
            view.move(su.id, (su.z || 0) > 0 ? casaVistaVoo(su) : casaVista({ x: su.x, y: su.y }), { immediate: true });
            if (vooEstado[su.id]) vooEstado[su.id].z = su.z || 0;   // VOO: a camada reafirmada assenta com a posição
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
        (ctxVivo && u.posicao.x === ctxVivo.destino.x && u.posicao.y === ctxVivo.destino.y && (ctxVivo.destino.z || 0) === zChegada)
        || (guardaExpiradaIA && guardaExpiradaIA.id === u.id && guardaExpiradaIA.seq > supRestauroVoo.seq)
        || (rViva && u.posicao.x === rViva.x && u.posicao.y === rViva.y && (rViva.z || 0) === zChegada);
      if (!chegadaNova) {
        const suR = supRestauroPendente.find(s => s.id === u.id);
        if (suR && (u.posicao.x !== suR.x || u.posicao.y !== suR.y || camadaDe(u.id) !== (suR.z || 0))) {
          supRestaurando = true;
          reservasDestinoIA.delete(u.id);   // EMENDA-V1: idem — voo cancelado pela reafirmação; sem isto, o casamento por destino de :2781 falha contra a posição reafirmada e a reserva fica órfã
          view.move(u.id, (suR.z || 0) > 0 ? casaVistaVoo(suR) : casaVista({ x: suR.x, y: suR.y }), { immediate: true });
          if (vooEstado[u.id]) vooEstado[u.id].z = suR.z || 0;   // VOO: idem — a camada reafirmada assenta
          supRestaurando = false;
        }
      }
      supRestauroVoo = null;   // EM-TJ12J13-01: a travessia resolveu-se — reafirmada, ou pousada pelo voo novo
    }
    /* VOO (F-36): a camada assenta ANTES da conferência de
       invariantes — a chegada que casa com o destino prometido
       (reserva ou contexto vivo) nas três coordenadas muda a
       camada da figura; é aqui, e só aqui, que um voo a muda. */
    if (u.id !== PROPRIA && vooEstado[u.id]) {
      const rC = reservasDestinoIA.get(u.id);
      const cC = (contextoIA && contextoIA.id === u.id && contextoIA.destino) ? contextoIA.destino : null;
      if ((rC && rC.x === u.posicao.x && rC.y === u.posicao.y && (rC.z || 0) === zChegada)
        || (cC && cC.x === u.posicao.x && cC.y === u.posicao.y && (cC.z || 0) === zChegada))
        vooEstado[u.id].z = zChegada;
    }
    /* D1: a camada de uma chegada MANUAL assenta TAMBÉM AQUI,
       antes da conferência de invariantes — como a da IA assenta
       no bloco acima (reserva/contexto). Sem isto, a invariante
       «Camada e altitude desencontradas» lê a altitude nova da
       cena contra a camada velha da casca e congela a batalha a
       meio do voo do Mestre. O resto do assento da chegada
       (reserva, repintura da faixa) corre no ramo próprio, mais
       abaixo, depois das conferências. */
    if (ctxMovManual && vezManualAberta && u.id === ctxMovManual.id
      && u.posicao.x === ctxMovManual.destino.x && u.posicao.y === ctxMovManual.destino.y
      && (ctxMovManual.destino.z || 0) === zChegada
      && vooEstado[u.id]) {
      vooEstado[u.id].z = zChegada;
    }
    supConferirInvariantes('moveend');         // Supervisor: invariantes após cada movimento
    try { supCritFecharMovimento(u.id); } catch (_) { supCritErrosCamada++; }   // T1.7: fecha o segmento de movimento (passivo)
    /* D1: a chegada de um movimento MANUAL do Mestre tem dono
       próprio (ctxMovManual), como a da IA tem o contextoIA:
       casa com o destino prometido → a camada assenta (voo), a
       reserva manual desconta os passos e o Mover repinta. Sem
       casamento, ignora-se — e NUNCA cai no ramo da IA abaixo,
       que a leria como um voo dela. */
    if (ctxMovManual && vezManualAberta && u.id === ctxMovManual.id) {
      const ctxM = ctxMovManual;
      if (u.posicao.x === ctxM.destino.x && u.posicao.y === ctxM.destino.y
          && (ctxM.destino.z || 0) === zChegada) {
        assentarMovimentoManual(u, zChegada);
      }
      return;
    }
    if (u.id !== PROPRIA) {
      /* Reserva de destino em voo: esta figura pousou — a reserva
         dela morre aqui, chegue o moveend a tempo ou tarde (depois
         da guarda). O casamento é por destino, como o E-1 do
         contexto: uma chegada a outra casa não liberta a reserva
         de um voo mais novo da mesma figura. Deste instante em
         diante quem ocupa a casa é a própria figura, pela posição. */
      { const rIA = reservasDestinoIA.get(u.id);
        if (rIA && rIA.x === u.posicao.x && rIA.y === u.posicao.y && (rIA.z || 0) === camadaDe(u.id))
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
        && u.posicao.x === contextoIA.destino.x && u.posicao.y === contextoIA.destino.y
        && (contextoIA.destino.z || 0) === camadaDe(u.id))
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
  /* D3-P0-1 (item 1.2 do inventário fechado): a linha de estatísticas
     (FPS · triângulos · chamadas) é texto técnico — na vista da Party
     o nó nem nasce no DOM; no Mestre, comportamento igual ao de hoje.
     A amostragem de fluidez do Supervisor e do Crítico corre nas DUAS
     vistas (alimenta-se também da página da Party) — a guarda cobre
     SÓ a escrita no nó, nunca o handler inteiro. */
  if (!MODO_MESTRE) { const stSemMestre = $('stats'); if (stSemMestre) stSemMestre.remove(); }
  view.on('stats', s => {
    if (MODO_MESTRE) { const st = $('stats'); if (st) st.textContent = `${Math.round(s.fps)} FPS · ${s.triangles ?? '—'} triângulos · ${s.drawCalls ?? '—'} chamadas`; }
    supAmostraStats(s);                      // Supervisor: fluidez (amostras e lacunas grandes)
    try { supCritAmostraStats(s); } catch (_) { supCritErrosCamada++; }   // T1.7: amostras do Crítico (passivo)
  });
  /* D3-P0-1 (itens 1.6 e 1.8 do inventário fechado): a mensagem crua
     de erro da vista 3D NUNCA chega à Party. No Mestre diz-se verbatim
     (o bastidor é a superfície dele); na Party vale o mapa fechado por
     origem: modelo em falta = silêncio (a consequência visível é a
     frase de mundo da abertura); perda de contexto ou origem
     desconhecida = a frase funcional da lista fechada. Origem nova
     entra no mapa por emenda, nunca por passagem directa da mensagem. */
  view.on('error', e => {
    if (MODO_MESTRE) { say((e && e.message) || 'Erro na vista 3D.'); return; }
    if (e && e.origem === 'modelo') return;
    say('A imagem perdeu-se. Atualiza a página para voltar à batalha.');
  });
  view.on('modelerror', d => { supRegistar('modelo-indisponivel', { id: d && d.id }); if (MODO_MESTRE && d && d.message) say(d.message); });

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
  /* D3-P0-7: a entrada «Terminar» do ⚙ acciona EXACTAMENTE a acção
     'terminar' de sempre (M-014: → estado 'confirmar-fim' → «Sim,
     terminar» → terminarBatalha). Só mudou a morada do botão; o ⚙
     fecha-se para a confirmação se ler na faixa. */
  $('cfg-terminar').addEventListener('click', () => {
    fecharCfg();
    tratarAcao('terminar');
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
  if (tituloCfgOriginal) tituloCfgOriginal.textContent = 'Configurações';
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
    rotuloAuto.innerHTML = 'Modo automático<small>joga a vez da Ong por si: anda e ataca com o ataque básico. Se o ligar a meio da vez dela, começa já nessa vez; se for a vez de outra figura, começa quando a vez dela chegar. Não usa Transformação nem consumíveis, nunca acaba a batalha e espera por si nas decisões que são suas. Só nesta sessão — não fica guardado.</small>';
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
      ? 'Tela vermelha <b>ligada</b> — com a vida baixa, as bordas da tela vão avermelhando.'
      : 'Tela vermelha <b>desligada</b> — a vida baixa não pinta as bordas da tela.');
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
   * toca no título e, desde a tranche t-musica-batalha, também na
   * batalha — o regulador dela sincroniza o bus da música na hora
   * (musSincronizar). Os factores e a fórmula vivem junto ao
   * ambAudio («SOM PESSOAL»): master = 0,9 × G × E × mudo ×
   * somDoAmbiente. */
  const NOTA_SOM = 'Música: a do título e a da batalha. Efeitos: hoje, a chuva e o trovão; os sons da batalha usarão este volume quando existirem.';
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
  somUI.musica = linhaVolumeSom('hudt1-som-musica', 'Música', 'do título e da batalha',
    () => somMusica, v => { somMusica = v; musSincronizar(); });
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
    somGravar('hudt1-som-musica', '8');
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
    somGeral = 100; somMusica = 8; somEfeitos = 100; somMudo = false;
    for (const par of [[somUI.geral, 100], [somUI.musica, 8], [somUI.efeitos, 100]]) {
      par[0].reg.value = String(par[1]);
      par[0].saida.textContent = par[1] + '%';
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
    /* PRÉVIA v2 (R-06): o piloto confirma a PRÓPRIA prévia no mesmo
       passo — sem este ramo, o estado 'previa' encravava o piloto
       em silêncio (nem resolve nem avança). A guarda H10 do ramo
       'rolagem' abaixo continua a valer DEPOIS do Confirmar. */
    if (estado === 'previa') { tratarAcao('confirmar'); agendarPassoAuto(); return; }
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

  /* ════════════════════════════════════════════════════════════
     PRÉVIA DE ATAQUE (tranche PRÉVIA v2, passos ③④⑤)
     A tese: a rolagem nasce no Confirmar, não na marcação do alvo.
     Entre a marcação e o Confirmar vive o estado 'previa'.
     EMENDA Q-02 (palavra do Mestre, 2026-11-11 22:39; REF_79):
     a VIRAGEM da personagem para o alvo durante a prévia é
     PÚBLICA — é facto de mundo: acontece na cena de quem mira
     (R-Q02-2) e viaja na captura da ponte de saves como
     `previaPublica.frenteRad`; quem aplica repõe a frente em
     qualquer papel (R-Q02-3). O DESENHO (caminho, anel, marcas)
     continua a ser interface: pinta-se em quem mira e, vindo na
     captura, SÓ no MODO_MESTRE ao aplicar; em papel de jogadora
     ao aplicar NUNCA se chama showPrevia com a prévia alheia.
     Não se inventa canal novo: o transporte é a ponte existente.
     Na prévia não há chamada ao motor, não há
     semente tirada, não há registo do ataque, não há recibo e
     ataquePendente é null (nenhum parque de desgraça pode abrir
     — R-01). O alvo da prévia é o `alvo` global (EM-S-08): não
     nasce variável nova de alvo.
     FRONTEIRA LAVRADA: a contagem de obstáculos de caminho
     MOSTRA-SE no livro como leitura da travessia; o consumo
     mecânico do +3 na rolagem é emenda do motor (frente
     C-42/VLAB) e NÃO se finge nesta casca — os níveis líquidos
     mostrados são os do contexto montado (passo ①), nem um a
     mais. O ramo dos −10% da cobertura média é de MAGIA e não
     há magias nesta batalha: não se constrói (fica nomeado).
     ════════════════════════════════════════════════════════════ */
  /* Fracções exactas (BigInt) — o MÉTODO de visao.js (intervaloRaio),
     reutilizado como régua de aritmética, não a função de visão. */
  function previaBgcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { const t = a % b; a = b; b = t; } return a || 1n; }
  function previaFrac(n, d) { let num = BigInt(n), den = d === undefined ? 1n : BigInt(d); if (den < 0n) { num = -num; den = -den; } const g = previaBgcd(num, den); return { n: num / g, d: den / g }; }
  const previaFracCmp = (a, b) => { const c = a.n * b.d - b.n * a.d; return c < 0n ? -1 : c > 0n ? 1 : 0; };
  const previaFracStr = f => f.d === 1n ? String(f.n) : f.n + '/' + f.d;
  /* A função ÚNICA de travessia (passo ④, EM-S-02): supercover
     centro-a-centro com fracções exactas. Devolve as casas POR
     ORDEM DE CHEGADA, cada uma com a fracção exacta de entrada;
     mesma fracção de entrada = simultâneos. Uma casa só entra se
     o segmento atravessar o seu INTERIOR (intervalo de entrada
     com comprimento positivo): o toque de vértice (raspão, E-09)
     não conta — a casa de raspão não é atravessada. Dela derivam
     o conjunto sem ordem (livro/contornos) e a leitura de
     cobertura — uma só geometria, duas leituras. */
  function ataquePreviaTravessia(de, para) {
    if (de.x === para.x && de.y === para.y) return [{ x: de.x, y: de.y, entrada: '0', simultaneo: false }];
    const E = [BigInt(2 * de.x + 1), BigInt(2 * de.y + 1)];
    const D = [BigInt(2 * (para.x - de.x)), BigInt(2 * (para.y - de.y))];
    const F0 = previaFrac(0n), F1 = previaFrac(1n);
    const casas = [];
    for (let cy = Math.min(de.y, para.y) - 1; cy <= Math.max(de.y, para.y) + 1; cy++)
    for (let cx = Math.min(de.x, para.x) - 1; cx <= Math.max(de.x, para.x) + 1; cx++) {
      let lo = null, hi = null, fora = false;
      const eixos = [[E[0], D[0], BigInt(2 * cx), BigInt(2 * cx + 2)],
                     [E[1], D[1], BigInt(2 * cy), BigInt(2 * cy + 2)]];
      for (const [e, d, l, h] of eixos) {
        if (d === 0n) { if (!(l < e && e < h)) { fora = true; break; } }
        else {
          const t1 = previaFrac(l - e, d), t2 = previaFrac(h - e, d);
          const ll = previaFracCmp(t1, t2) < 0 ? t1 : t2, hh = previaFracCmp(t1, t2) < 0 ? t2 : t1;
          lo = (lo === null || previaFracCmp(ll, lo) > 0) ? ll : lo;
          hi = (hi === null || previaFracCmp(hh, hi) < 0) ? hh : hi;
        }
      }
      if (fora || lo === null) continue;
      if (!(previaFracCmp(lo, hi) < 0 && previaFracCmp(hi, F0) > 0 && previaFracCmp(lo, F1) < 0)) continue;
      const entrada = previaFracCmp(lo, F0) < 0 ? F0 : lo;
      casas.push({ x: cx, y: cy, _e: entrada, entrada: previaFracStr(entrada) });
    }
    casas.sort((a, b) => previaFracCmp(a._e, b._e) || (a.x - b.x) || (a.y - b.y));
    let anterior = null;
    return casas.map(c => {
      const sim = anterior !== null && previaFracCmp(c._e, anterior) === 0;
      anterior = c._e;
      return { x: c.x, y: c.y, entrada: c.entrada, simultaneo: sim };
    });
  }
  /* Os obstáculos de um lançamento concreto, sobre o REGISTO
     REAL (nunca um registo paralelo): as casas de visaoOpacos()
     com o grau declarado (passo ②) + figuras vivas (média, por
     lei do desenho) + figuras caídas vivo===false (média), em
     casas da travessia, excepto a casa do atacante e a do alvo.
     Devolvidos por ordem de chegada na travessia. */
  function ataquePreviaObstaculos(travessia, atacanteId, alvoId) {
    const graus = new Map(visaoOpacosComGrau().map(o => [chave(o.x, o.y), o.grau]));
    const primeira = travessia[0], ultima = travessia[travessia.length - 1];
    const obstaculos = [];
    const unidades = view.getState().units;
    for (const casa of travessia) {
      if ((casa.x === primeira.x && casa.y === primeira.y)
        || (casa.x === ultima.x && casa.y === ultima.y)) continue;
      const grauCenario = graus.get(chave(casa.x, casa.y));
      if (grauCenario) obstaculos.push({ x: casa.x, y: casa.y, grau: grauCenario, fonte: 'cenario', entrada: casa.entrada });
      for (const u of unidades) {
        if (u.id === atacanteId || u.id === alvoId) continue;
        if (u.posicao.x === casa.x && u.posicao.y === casa.y)
          obstaculos.push({ x: casa.x, y: casa.y, grau: 'media', fonte: u.vivo === false ? 'figura-caida' : 'figura', id: u.id, entrada: casa.entrada });
      }
    }
    return obstaculos;
  }
  /* Os níveis líquidos que a prévia mostra: compostos do contexto
     MONTADO (passo ①) pela composição do próprio motor (D3,
     vlab-completo.js: v = niveisVantagem + flanco; d =
     niveisDesvantagem + fraco + caido da ficha do atacante;
     líquido preso a ±4) — leitura do mesmo objecto que o
     Confirmar entregará, nunca uma conta paralela. */
  function ataquePreviaLiquido(montado) {
    const ctx = montado.contexto;
    const est = montado.fichaAtacante.estado || [];
    const v = Math.max(0, ctx.niveisVantagem | 0) + (ctx.flanqueando ? 1 : 0);
    const d = Math.max(0, ctx.niveisDesvantagem | 0)
      + (est.includes('fraco') ? 1 : 0) + (est.includes('caido') ? 1 : 0);
    return Math.max(-4, Math.min(4, v - d));
  }
  /* O livro em palavras (§3.1 do desenho): cada linha de caminho
     corresponde a um contorno no chão, e cada contorno a uma
     linha — excepto a cobertura TOTAL, que não ganha linha
     nenhuma (EM-S-21: a peça total aparece como mundo, sem
     sinal). As fontes de estado entram só em palavras (não são
     geometria). */
  function ataquePreviaFraseLivro(montado, obstaculos, liquido) {
    const partes = [`<b>Prévia — ainda não lançou</b> · ${montado.tecnica.nome} contra <b>${nomeCena(alvo)}</b> · custa <b>${montado.tecnica.custoPA} PA</b> ao confirmar`];
    const figs = obstaculos.filter(o => o.fonte === 'figura' || o.fonte === 'figura-caida');
    const pedras = obstaculos.filter(o => o.fonte === 'cenario' && o.grau === 'media');
    if (figs.length === 1) partes.push('uma figura no caminho');
    else if (figs.length > 1) partes.push(`${figs.length} figuras no caminho`);
    if (pedras.length === 1) partes.push('uma pedra no caminho');
    else if (pedras.length > 1) partes.push(`${pedras.length} pedras no caminho`);
    const est = montado.fichaAtacante.estado || [];
    if (est.includes('fraco')) partes.push('a Ong está fraca');
    if (est.includes('caido')) partes.push('a Ong está caída');
    if ((montado.contexto.niveisDesvantagem | 0) > 0) partes.push('corpo partido');
    partes.push(liquido === 0 ? 'sem Vantagem nem Desvantagem'
      : liquido > 0 ? `<b>Vantagem ${liquido}</b>` : `<b>Desvantagem ${-liquido}</b>`);
    return partes.join(' · ') + ' — aperte <b>Confirmar</b> para lançar ou <b>Voltar</b> para desistir.';
  }
  /* O desenho corrente da prévia (estado serializável para as
     provas; null fora da prévia). O desenho RE-DERIVA-SE a cada
     repintura (chamado de renderAcoes): banda, livro e geometria
     lêem o mundo do instante — CASA_M pode mudar a meio (R-07) e
     a prévia nunca mostra geometria congelada. */
  let previaAtaqueDesenho = null;
  /* EMENDA Q-02 (R-Q02-2): a frente DELA antes da prévia (rad,
     pela primitiva da cena; null fora da prévia) e a bandeira de
     «manter» do Confirmar. O restauro é CENTRAL nesta limpeza —
     todos os invalidadores já passam por aqui (Voltar/desistir
     via renderAcoes, gelo, restauro do Supervisor, troca de alvo
     recusada) — e o Confirmar bem-sucedido arma a bandeira ANTES
     de mudar de estado, para a frente virada FICAR. */
  let previaAtaqueFrenteAnterior = null;
  let previaAtaqueManterFrente = false;
  /* EMENDA Q-02 (R-Q02-3): o estado público APLICADO neste ecrã
     vindo de uma captura alheia ({frenteRad, desenho} ou null) —
     o desenho dele só se pinta no MODO_MESTRE (ver o assentamento
     na ponte); em jogadora guarda-se só a frente. */
  let previaPublicaAplicada = null;
  function ataquePreviaFrenteActualRad() {
    try { if (typeof view.getFrente === 'function') return view.getFrente(PROPRIA); } catch (_) {}
    return visaoFrenteRad(PROPRIA);
  }
  function ataquePreviaVirar(eu, ele) {
    const desejada = Math.atan2(ele.posicao.x - eu.posicao.x, ele.posicao.y - eu.posicao.y);
    if (previaAtaqueFrenteAnterior === null)
      previaAtaqueFrenteAnterior = ataquePreviaFrenteActualRad();
    try { if (typeof view.setFrente === 'function') view.setFrente(PROPRIA, desejada); } catch (_) {}
  }
  function ataquePreviaLimparDesenho() {
    /* A frente trata-se SEMPRE (mesmo sem desenho corrente):
       manter (Confirmar) consome a bandeira e fica; qualquer
       outra saída da prévia repõe a frente anterior. */
    if (previaAtaqueFrenteAnterior !== null) {
      if (!previaAtaqueManterFrente) {
        try { if (typeof view.setFrente === 'function')
          view.setFrente(PROPRIA, previaAtaqueFrenteAnterior); } catch (_) {}
      }
      previaAtaqueFrenteAnterior = null;
    }
    previaAtaqueManterFrente = false;
    if (!previaAtaqueDesenho && !previaPublicaAplicada) return;
    previaAtaqueDesenho = null;
    previaPublicaAplicada = null;
    try { if (typeof view.showPrevia === 'function') view.showPrevia(null); else view.showMovement([]); } catch (_) {}
  }
  function ataquePreviaDesenhar() {
    if (estado !== 'previa') { ataquePreviaLimparDesenho(); return; }
    const eu = unidade(PROPRIA), ele = alvo ? unidade(alvo) : null;
    if (!eu || !ele) { ataquePreviaLimparDesenho(); return; }
    const travessia = ataquePreviaTravessia(eu.posicao, ele.posicao);
    const obstaculos = ataquePreviaObstaculos(travessia, PROPRIA, alvo);
    const montado = vlabMontarContextoAtaque(PROPRIA, alvo, { modoDesgraca: 'proposta' });
    const liquido = ataquePreviaLiquido(montado);
    previaAtaqueDesenho = { alvo, travessia, obstaculos, liquido, custoPA: montado.tecnica.custoPA };
    /* EMENDA Q-02 (R-Q02-2): a viragem acontece AQUI, na cena de
       quem mira, a cada re-derivação (troca de alvo incluída) —
       a frente anterior guarda-se só na primeira viragem. */
    ataquePreviaVirar(eu, ele);
    /* Forma do caminho: o SEGMENTO centro-a-centro + as casas
       acesas da travessia, pela primitiva mínima da cena
       (showPrevia) — ver a nota em cena.js: showMovement sozinha
       não distingue caminho, contorno de obstáculo e marca de
       alvo (um só estilo para tudo). Os obstáculos MÉDIOS ganham
       contorno; o alvo, a sua marca própria; a peça TOTAL não
       ganha sinal nenhum (EM-S-21). O caminho desenha-se INTEIRO
       até ao alvo, nunca truncado. Sem showPrevia (vista de
       recurso das baterias), cai nas casas acesas de sempre. */
    const medios = obstaculos.filter(o => o.grau === 'media');
    if (typeof view.showPrevia === 'function')
      view.showPrevia({ de: casaVista(eu.posicao), alvo: casaVista(ele.posicao),
        caminho: travessia.map(casaVista), obstaculos: medios.map(casaVista) });
    else view.showMovement(travessia.map(casaVista));
    say(ataquePreviaFraseLivro(montado, obstaculos, liquido));
  }
  /* EMENDA Q-02 (R-Q02-3): o facto público da prévia corrente
     deste ecrã — a frente virada para o alvo (geometria exacta
     das posições, a mesma que ataquePreviaVirar escreve na cena)
     e o desenho no formato que view.showPrevia consome (o mesmo
     objecto que ataquePreviaDesenhar pinta em quem mira).
     null fora do estado 'previa'. É ISTO que a captura da ponte
     transporta em `previaPublica`; a rolagem NÃO entra aqui —
     dados/roladas da captura ficam imóveis durante a prévia. */
  function ataquePreviaPublicaActual() {
    if (estado !== 'previa') return null;
    const eu = unidade(PROPRIA), ele = alvo ? unidade(alvo) : null;
    if (!eu || !ele) return null;
    const frenteRad = Math.atan2(ele.posicao.x - eu.posicao.x, ele.posicao.y - eu.posicao.y);
    let desenho = null;
    if (previaAtaqueDesenho) {
      const medios = previaAtaqueDesenho.obstaculos.filter(o => o.grau === 'media');
      desenho = { de: casaVista(eu.posicao), alvo: casaVista(ele.posicao),
        caminho: previaAtaqueDesenho.travessia.map(casaVista),
        obstaculos: medios.map(casaVista) };
    }
    return { frenteRad, desenho };
  }
  /* EMENDA Q-02 (R-Q02-3): assentamento do facto público ao
     APLICAR uma captura, chamado pela ponte depois da reentrada
     na vez (como ambiente/escala/visao). A FRENTE repõe-se em
     qualquer papel (é mundo). O DESENHO só se pinta no
     MODO_MESTRE; em papel de jogadora chama-se showPrevia(null)
     — zero elementos do desenho alheio. Sem o campo (save antigo
     ou fora de prévia), LIMPA o estado público aplicado: nenhum
     desenho público fica pendurado de uma captura anterior. */
  function ataquePreviaPublicaAplicar(pub) {
    previaPublicaAplicada = null;
    if (pub && typeof pub === 'object') {
      previaPublicaAplicada = JSON.parse(JSON.stringify(pub));
      try { if (typeof view.setFrente === 'function') view.setFrente(PROPRIA, pub.frenteRad); } catch (_) {}
      if (MODO_MESTRE && pub.desenho) {
        try { if (typeof view.showPrevia === 'function')
          view.showPrevia(JSON.parse(JSON.stringify(pub.desenho))); } catch (_) {}
        return;
      }
    }
    try { if (typeof view.showPrevia === 'function') view.showPrevia(null); } catch (_) {}
  }
  /* O Confirmar da prévia: é aqui que a rolagem nasce (passo ③),
     com a intercepção total decidida antes dela (passo ⑤). */
  function ataquePreviaConfirmar() {
    const c = DADOS_COMBATE.ong;
    /* Revalidação pelo MESMO portão da marcação (R-02). Recusada,
       REGISTA — herda o caminho da recusa do Confirmar actual
       (§7.4: Confirmar recusado regista; prévia invalidada, não). */
    const bloqueio = validarAlvoAtaqueOng('confirmar');
    if (bloqueio) {
      supRegistar('bloqueada', { acao: 'confirmar', actor: PROPRIA, razao: bloqueio.razao });
      estado = 'atacar'; renderAcoes(); say(bloqueio.mensagem); return;
    }
    supRegistar('accao', { acao: 'confirmar', actor: PROPRIA });
    const eu = unidade(PROPRIA), ele = unidade(alvo);
    const travessia = ataquePreviaTravessia(eu.posicao, ele.posicao);
    const obstaculos = ataquePreviaObstaculos(travessia, PROPRIA, alvo);
    const montado = vlabMontarContextoAtaque(PROPRIA, alvo, { modoDesgraca: 'proposta' });
    const frasePA = livre => `Alma livre não chega — o ${c.arma} custa <b>8 PA</b> e a livre dela é ${livre}.`;
    if (montado.fichaAtacante.paLivre < montado.tecnica.custoPA) {
      /* O motor recusaria com PA_INSUFICIENTE: nada rolado, nada
         debitado, atacou por marcar, prévia morta, custo zero
         (EM-S-08) — com o registo da recusa da declaração antiga. */
      supRegistar('bloqueada', { acao: 'ataque-basico', actor: PROPRIA, alvo, razao: 'PA_INSUFICIENTE' });
      estado = 'atacar'; renderAcoes(); say(frasePA(montado.fichaAtacante.paLivre)); return;
    }
    /* Passo ⑤ (§5.9): intercepção por cobertura TOTAL — sobre a
       travessia ordenada, ANTES de qualquer rolagem contra o
       alvo. Havendo obstáculo total entre ela e o alvo, o motor
       NÃO se chama contra o alvo; o custo paga-se por inteiro
       (o PA da técnica montada, pelo débito de sempre); regista-se
       o facto; e a frase pública narra o embate como mundo, só
       pós-Confirmar — na prévia, a peça total não teve sinal
       nenhum (EM-S-21).
       EMENDA DA CONFERÊNCIA REF_89 (GRAVE-2): o portão só é
       consultado com dz = 0 — análise §6: entre camadas
       diferentes NÃO há cobertura (o tiro cruza por cima ou
       por baixo do obstáculo do plano, nos dois sentidos).
       Com dz=0 o braço é o de hoje, byte-igual. */
    if (camadaDe(PROPRIA) === camadaDe(alvo) && obstaculos.some(o => o.grau === 'total')) {
      paGasto += montado.tecnica.custoPA;
      atualizarChipVida();           // M-015: o débito reflecte-se já no chip
      atacou = true;
      supRegistar('accao', { acao: 'ataque', actor: PROPRIA, alvo, acerto: false, cobertura: 'total' });
      previaAtaqueManterFrente = true;   // Q-02: Confirmar mantém a frente virada
      estado = 'resultado'; renderAcoes();
      say(`<b>${c.arma}</b> de <b>Ong</b> — o chicote bateu nas pedras do caminho e não chegou a <b>${nomeCena(alvo)}</b>.`);
      return;
    }
    /* A rolagem NASCE aqui: a semente e a verificação tiram-se
       neste instante e a chamada é a que vivia na declaração. */
    const semente = vlabSemente();
    const verificacao = vlabVerificacao();
    const s = vlabResolverAtaqueCompleto(PROPRIA, alvo, {
      modoDesgraca: 'proposta', semente, verificacao });
    if (s.erro) {
      /* EM-S-08: a 1.ª chamada falhou — nada rolado, nada
         debitado, atacou por marcar, prévia morta, volta à
         escolha de alvo com a razão em palavras, custo zero. */
      supRegistar('bloqueada', { acao: 'ataque-basico', actor: PROPRIA, alvo, razao: s.erro.codigo });
      estado = 'atacar'; renderAcoes();
      if (s.erro.codigo === 'PA_INSUFICIENTE') {
        const livre = FICHAS.ong.alma.total - FICHAS.ong.alma.comprometido - paGasto;
        say(frasePA(livre));
      } else say('O ataque não se resolveu — tente outra vez.');
      return;
    }
    ataquePendente = { tipo: 'chicote', nome: c.arma, vlab: s, semente, verificacao };
    /* O registo do ataque (faces/total) nasce AQUI, por arrasto
       da chamada (§7.3/EM-S-17) — e os RECIBOS_PUBLICOS com ele,
       dentro do adaptador. Na declaração antiga, nasciam os dois
       ao marcar o alvo. */
    const rol = s.rolagem;
    const idxEsc = Math.max(0, rol.resultados.indexOf(rol.escolhido));
    const facesEsc = rol.conjuntosDeFaces[idxEsc] || rol.conjuntosDeFaces[0];
    supRegistar('accao', { acao: 'ataque-basico', actor: PROPRIA, alvo, faces: facesEsc, total: rol.total });
    previaAtaqueManterFrente = true;   // Q-02: Confirmar mantém a frente virada
    estado = 'rolagem'; renderAcoes();
    let soma = facesEsc.join(' + ') + ' + ' + rol.bonus;
    if (rol.ajusteVantagemDesvantagem > 0) soma += ' + ' + rol.ajusteVantagemDesvantagem;
    if (rol.ajusteVantagemDesvantagem < 0) soma += ' − ' + (-rol.ajusteVantagemDesvantagem);
    const notaVD = rol.niveisLiquidos !== 0
      ? ` · (${rol.niveisLiquidos > 0 ? 'a melhor' : 'a pior'} de ${rol.conjuntosDeFaces.length} rolagens — ${rol.niveisLiquidos > 0 ? 'Vantagem' : 'Desvantagem'})` : '';
    say(`${c.arma} de <b>Ong</b> contra <b>${nomeCena(alvo)}</b> · <b>${rol.expressao} → ${soma} = ${rol.total}</b>${notaVD} · aperte <b>Confirmar</b> para saber se acertou.`);
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
    guardaMovimentoOng = { epoca, destino: para ? { x: para.x, y: para.y } : null, rearmes: 0, relogio: setTimeout(() => supRelogioGuardaMovimentoOng(epoca), SUP_GUARDA_MOVIMENTO_MS) };
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
    const guarda = guardaMovimentoOng;
    guardaMovimentoOng = null;
    if (supCongelado || epoca !== supEpoca) return;
    if (estado !== 'movendo' && !passoEmCurso) return;
    /* RN-2 (tranche «Órfãs do Ledger», A-17): ao expirar, a guarda
       pergunta à cena se o movimento ainda decorre ou se a figura
       já pousou no destino e só o moveend está atrasado (aparelho
       lento). Nesse caso REARMA (até GUARDA_REARMES_MAX) com os
       pendentes INTACTOS — o moveend tardio liquida o movimento
       como completo, com o débito ao preço do despacho, pelo
       tratador de sempre. Antes, a guarda limpava os pendentes sem
       débito e o movimento legítimo que chegava tarde nunca se
       pagava (medido: voo de 5 casas, reserva intacta nos 9). Só
       quando a figura não se move nem pousou — o movimento nunca
       completou — é que corre o destrave anti-bloqueio de sempre. */
    const uOng = unidade(PROPRIA);
    const pousada = !!(guarda && guarda.destino && uOng
      && uOng.posicao.x === guarda.destino.x && uOng.posicao.y === guarda.destino.y);
    let aMover = false;
    try { aMover = !!view.getState().moving; } catch (_) { aMover = false; }
    if ((aMover || pousada) && guarda && (guarda.rearmes || 0) < GUARDA_REARMES_MAX) {
      guarda.rearmes = (guarda.rearmes || 0) + 1;
      guarda.relogio = setTimeout(() => supRelogioGuardaMovimentoOng(epoca), SUP_GUARDA_MOVIMENTO_MS);
      guardaMovimentoOng = guarda;
      supRegistar('guarda', { acao: 'mover', actor: PROPRIA, razao: 'O moveend dela não chegou em 5 s, mas o movimento ainda decorre ou ela já pousou — guarda rearmada, pendentes intactos' });
      return;
    }
    custoPendente = null; caminhoPendente = null; passoEmCurso = false; parado = false;
    limparPrecosPendentes();   // RN-1: o preço morre com o pendente anulado
    partidaPendente = null;   // pós-Crítico 3 (achado 3): uma partida cuja guarda expirou não resolve AoO tardios
    if (estado === 'movendo') { estado = 'base'; renderAcoes(); }
    supRegistar('guarda', { acao: 'mover', actor: PROPRIA, razao: 'O moveend dela não chegou em 5 s — movimento destravado sem desconto' });
    agendarPassoAuto();   // destravada, o Modo automático pode retomar
  }
  /* Distância em LINHA RECTA centro-a-centro, em casas (PRÉVIA
     v2: a régua do portão dos ataques dela — ver validarAlvoAtaqueOng). */
  function distanciaRectaCasas(deId, paraId) {
    const a = unidade(deId), b = unidade(paraId);
    if (!a || !b) return Infinity;
    return Math.hypot(b.posicao.x - a.posicao.x, b.posicao.y - a.posicao.y);
  }
  /* Só os ataques dirigidos a outra figura usam alvo e alcance.
     A confirmação chama novamente esta validação: o alvo pode ter
     mudado desde a escolha. Isso não é uma verificação duplicada.
     PRÉVIA v2 (passo ③ — a ÚNICA mudança de régua da tranche):
     o portão dos ataques DELA passa a medir em linha recta
     centro-a-centro ≤ alcanceEmCasas(alcance), com o CASA_M vivo
     — é a banda da travessia da prévia. Corpos no caminho já NÃO
     recusam (o ramo «tapado» de fraseForaDeAlcance fica morto
     para estes ataques por construção: a recta nunca excede a
     régua que atravessa corpos): cobram-se no livro da prévia.
     A MESMA função corre na marcação (ataque-basico) e na
     revalidação do Confirmar (R-02: uma só régua nos dois
     instantes). A BFS (distanciaEntre) continua a governar o
     Mover e a IA, intactas.
     EMENDA DA CONFERÊNCIA REF_89 (GRAVE-1): a recta soma |dz|
     — o portão DELA herda a régua 3D como o §2/§5 da análise
     mandam (à mesma casa, z=10 fica a 10 > 6: o céu não se
     alcança do chão). Trocar a recta pela BFS mudaria o braço
     z=0 medido da PRÉVIA v2; somar |dz| deixa esse braço
     byte-igual (dz=0 ⇒ a régua de hoje, ao dígito). */
  function validarAlvoAtaqueOng(contexto) {
    if (!alvo) return { razao: 'Sem alvo escolhido',
      mensagem: 'Primeiro <b>toque no inimigo</b> que você quer atacar — ele fica marcado como alvo.' };
    const u = unidade(alvo);
    if (!u || u.vivo === false) return { razao: 'O alvo já não está na batalha',
      mensagem: 'O alvo já não está na batalha — escolha outro inimigo.' };
    if (distanciaRectaCasas(PROPRIA, alvo) + Math.abs(camadaDe(PROPRIA) - camadaDe(alvo)) > alcanceEmCasas(DADOS_COMBATE.ong.alcance)) return { razao: 'Alvo fora de alcance',
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
      /* VOO (F-36): a ocupação é por PONTO (x, y, z) — duas
         figuras na mesma casa em camadas diferentes são o voo
         a funcionar; no mesmo ponto continua proibido. A
         camada confere-se também contra a altitude da cena. */
      const zU = camadaDe(u.id);
      if (zU < 0 || zU > VOO_TECTO) return 'Figura fora do domínio de camadas';
      if (Math.abs((u.altitude || 0) - zU * VOO_METROS_CAMADA) > 0.01
        && !view.getState().moving) return 'Camada e altitude desencontradas';
      const k = chave3(u.posicao.x, u.posicao.y, zU);
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
    /* PRÉVIA v2 (invalidador nomeado): uma prévia aberta MORRE no
       gelo — o desenho limpa-se aqui explicitamente e o estado
       sai de 'previa' para 'fim' já a seguir; a frase é a de
       sempre do gelo. Sem registo (prévia invalidada, §7.4). */
    ataquePreviaLimparDesenho();
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
      unidades: view.getState().units.map(u => {
        const su = { id: u.id, x: u.posicao.x, y: u.posicao.y, vivo: u.vivo !== false };
        const z = camadaDe(u.id);   // VOO: a camada entra no instantâneo (só quando > 0)
        if (z > 0) su.z = z;
        return su;
      }),
      danoSofrido, paGasto, transformada, reservaMovimento, atacou, alvo,
      /* VOO (F-36): presença e estado do voo (camada + asa
         torada por figura) — o «voltar» repõe a batalha com o
         voo daquele turno, incapacidade incluída. */
      voo: vooCapturarEstado(),
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
      /* FURTIVIDADE (Fase 0, E-5): a matriz entra no snapshot nos
         DOIS domínios (o snapshot é ferramenta do Mestre, em
         memória) — snapshot sem o campo (anterior à tranche)
         repõe a matriz VAZIA, como o fogo. */
      furtividade: furtMatrizCapturaTotal(),
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
    /* VOO (F-36): o elenco de teste e o estado do voo do
       instantâneo voltam com o resto — antes das posições, para
       as figuras admitidas existirem quando forem movidas. */
    if (snap.voo) vooReconciliarDeEstado(snap.voo,
      Object.fromEntries((snap.unidades || []).map(su => [su.id, su])));
    for (const su of snap.unidades) {
      const u = unidade(su.id);
      if (u && (u.posicao.x !== su.x || u.posicao.y !== su.y || camadaDe(su.id) !== (su.z || 0))) {
        view.move(su.id, (su.z || 0) > 0 ? casaVistaVoo(su) : casaVista({ x: su.x, y: su.y }), { immediate: true });
        if (vooEstado[su.id]) vooEstado[su.id].z = su.z || 0;
      }
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
    /* FURTIVIDADE (Fase 0, E-5): a matriz do snapshot volta com o
       resto (o visaoAssentar acima limpou-a pela porta da memória;
       aqui repõe-se a guardada). Snapshot antigo sem o campo:
       matriz VAZIA declarada — nunca «mantém a actual». O restauro
       nunca rola nem instala: repõe-se exactamente o guardado. */
    if (snap.furtividade) furtMatrizRepor(snap.furtividade);
    else {
      furtMatrizRepor(null);
      supRegistar('furtividade', { origem: 'supRestaurar', razao: 'Snapshot sem matriz — matriz vazia declarada' });
    }
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
    limparPrecosPendentes();   // RN-1: os preços do voo abandonado morrem no restauro
    /* PRÉVIA v2 (invalidador nomeado): a prévia aberta morre no
       restauro — limpa-se o desenho aqui; a vez reentra por
       iniciarVez/iniciarVezIA a seguir e o estado sai de 'previa'.
       Sem registo (prévia invalidada, §7.4). */
    ataquePreviaLimparDesenho();
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
    musSincronizar();   // MÚSICA DE BATALHA: o restauro repõe uma batalha viva — a música retoma
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
    'rolagem', 'resultado', 'vez-ia', 'confirmar-fim', 'fim',
    /* PRÉVIA v2: 'previa' é ponto estável da vez dela SEM pendentes
       (como 'confirmar-fim'): pode ser capturada, mas ao carregar a
       prévia NÃO se restaura como ecrã — a vez reentra na base por
       iniciarVez (intenção não se guarda, §7.4 do desenho). Sem
       esta entrada, uma captura a meio da prévia nasceria com fase
       rejeitada pelo aplicar. */
    'previa'];
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
  function validarVlabParaAplicar(v, idsSave) {
    const INV = 'SAVE_ESTADO_INVALIDO', FALTA = 'SAVE_CAMPOS_EM_FALTA';
    if (!v || typeof v !== 'object') return FALTA;
    /* VOO (F-36): os ids são os do save inteiro (elenco + as
       figuras de teste que ele declara) — quem chama passa-os. */
    const ids = idsSave || ELENCO.map(u => u.id);
    for (const id of ids) if (!(id in v)) return FALTA;
    if (Object.keys(v).some(k => !ids.includes(k))) return INV;
    for (const id of ids) {
      const erro = validarVlabUnidade(v[id], id);
      if (erro) return erro;
    }
    return null;
  }
  /* EMENDA Q-02 (R-Q02-3): o campo OPCIONAL 'previaPublica' da
     captura — { frenteRad, desenho } no precedente de
     ambiente/escala/visao: save antigo sem a chave é válido;
     presente, confere-se no domínio e fora dele é
     SAVE_ESTADO_INVALIDO, nunca clamp silencioso. frenteRad:
     número finito em [-2π, 2π]. desenho: null, ou o objecto que
     view.showPrevia consome — { de, alvo, caminho, obstaculos }
     com casas de vista {x, z} inteiras dentro da área.
     NOTA DE GÉMEO: o validador gémeo de saves-mestre.js (fora
     desta árvore) tem de aprender esta chave — resíduo lavrado
     no ESTADO da sede REF_79. */
  function validarPreviaPublica(pp) {
    const INV = 'SAVE_ESTADO_INVALIDO', FALTA = 'SAVE_CAMPOS_EM_FALTA';
    if (!pp || typeof pp !== 'object' || Array.isArray(pp)) return INV;
    if (Object.keys(pp).some(k => !['frenteRad', 'desenho'].includes(k))) return INV;
    if (!('frenteRad' in pp)) return FALTA;
    if (typeof pp.frenteRad !== 'number' || !Number.isFinite(pp.frenteRad)
      || Math.abs(pp.frenteRad) > Math.PI * 2) return INV;
    if (!('desenho' in pp) || pp.desenho === null) return null;
    const d = pp.desenho;
    if (!d || typeof d !== 'object' || Array.isArray(d)) return INV;
    if (Object.keys(d).some(k => !['de', 'alvo', 'caminho', 'obstaculos'].includes(k))) return INV;
    const casaOk = c => c && typeof c === 'object' && !Array.isArray(c)
      && Object.keys(c).every(k => k === 'x' || k === 'z')
      && Number.isInteger(c.x) && Number.isInteger(c.z)
      && c.x >= AREA.origin.x && c.x < AREA.origin.x + AREA.cols
      && c.z >= AREA.origin.y && c.z < AREA.origin.y + AREA.rows;
    if (!casaOk(d.de) || !casaOk(d.alvo)) return INV;
    for (const lista of ['caminho', 'obstaculos']) {
      if (lista in d && (!Array.isArray(d[lista]) || d[lista].length > 256
        || d[lista].some(c => !casaOk(c)))) return INV;
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
    /* Tranche FURTIVIDADE (Fase 0): 'furtividade' é campo OPCIONAL
       do estado, na mesma régua (save antigo sem ele é válido —
       carrega com a matriz vazia declarada no aplicar; sem esta
       excepção, todo o save COM a matriz era rejeitado aqui). */
    /* Tranche VOO (F-36): 'voo' é campo OPCIONAL do estado, na
       mesma régua (save antigo sem ele é válido — ninguém traz
       asa torada); o 'z' das unidades confere-se junto delas. */
    if (Object.keys(e).some(k => !chavesEstado.includes(k) && k !== 'ambiente' && k !== 'ambienteCurva' && k !== 'escala' && k !== 'visao' && k !== 'furtividade' && k !== 'previaPublica' && k !== 'voo')) return INV;
    /* Os ids válidos são os do elenco MAIS as figuras de teste
       que o próprio save declara nas unidades (aplicar um save
       admite as que ele traz; um save não pode inventar figuras
       fora dos modelos de teste). */
    const idsTesteDoSave = (Array.isArray(e.unidades) ? e.unidades : [])
      .map(u => u && u.id).filter(id => typeof id === 'string' && vooModeloDe(id) && !ELENCO.some(x => x.id === id));
    const ids = [...ELENCO.map(u => u.id), ...idsTesteDoSave];
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
      if (Object.keys(u).some(k => !['id', 'x', 'y', 'vivo', 'z'].includes(k))) return INV;
      if (!ids.includes(u.id) || vistos.has(u.id)) return INV;
      vistos.add(u.id);
      if (!inteiro(u.x) || !inteiro(u.y)
        || u.x < AREA.origin.x || u.x >= AREA.origin.x + AREA.cols
        || u.y < AREA.origin.y || u.y >= AREA.origin.y + AREA.rows) return INV;
      if (typeof u.vivo !== 'boolean') return INV;
      /* VOO: z ausente lê-se 0; presente, tem de ser camada
         inteira no domínio {0,…,10}, só em quem pode voar, e
         nunca num corpo (quem morre em voo cai — cadáver em
         z>0 é incoerente por construção). */
      const z = u.z === undefined ? 0 : u.z;
      if (!inteiro(z) || z < 0 || z > VOO_TECTO) return INV;
      if (z > 0 && !vooOrigemDe(u.id) && !vooModeloDe(u.id)) return INV;
      if (u.vivo === false && z !== 0) return INV;
      const k = chave3(u.x, u.y, z);
      if (casas.has(k)) return INV;              // duas figuras no mesmo ponto
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
    /* RN-3: o tecto é o DOBRO do deslocamento — o Correr dobra
       os 9 m da ficha (18 m), como o invariante do Supervisor
       (2 * DESLOCAMENTO_ONG_M). A escala (CASA_M) NÃO entra:
       ela muda o preço da casa, nunca os metros da reserva —
       medido às escalas 1/1,5/2: o Correr emite sempre 18. */
    if (!finito(o.reservaMovimento) || o.reservaMovimento < 0
      || o.reservaMovimento > 2 * DESLOCAMENTO_ONG_M + 1e-9) return INV;
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
    /* FURTIVIDADE: presente, tem de trazer a matriz na forma dos
       dois domínios (ou só os pares, vinda de captura redigida). */
    if ('furtividade' in e && !furtMatrizValida(e.furtividade)) return INV;
    /* EMENDA Q-02: 'previaPublica', presente, confere-se no seu
       domínio (validarPreviaPublica) — ausente, save válido. */
    if ('previaPublica' in e) { const erroPP = validarPreviaPublica(e.previaPublica); if (erroPP) return erroPP; }
    /* VOO: o bloco opcional 'voo', presente, só pode nomear
       figuras de teste DESTE save, cada uma com {asaTorada}
       booleano e nenhuma outra chave. */
    if ('voo' in e) {
      const vv = e.voo;
      if (!vv || typeof vv !== 'object' || Array.isArray(vv)) return INV;
      for (const k of Object.keys(vv)) {
        if (!idsTesteDoSave.includes(k)) return INV;
        const av = vv[k];
        if (!av || typeof av !== 'object' || Array.isArray(av)) return INV;
        if (Object.keys(av).some(c => c !== 'asaTorada')) return INV;
        if (typeof av.asaTorada !== 'boolean') return INV;
      }
    }
    /* PORTA C-23: o bloco do motor confere-se com a mesma régua. */
    return validarVlabParaAplicar(e.vlab, ids);
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
        unidades: view.getState().units.map(u => {
          const su = { id: u.id, x: u.posicao.x, y: u.posicao.y, vivo: u.vivo !== false };
          const z = camadaDe(u.id);   // VOO: a camada viaja na unidade (só quando > 0)
          if (z > 0) su.z = z;
          return su;
        }),
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
        visao: { ...visaoPartida },
        /* FURTIVIDADE (Fase 0, E-4/E-5): a matriz entra na captura
           REDIGIDA POR PAPEL: no aparelho do Mestre viajam os dois
           domínios e restauram-se coerentes; no da Party viajam só
           os booleanos partilhados — escondidaRolagem (o número)
           nunca sai do domínio dele, e um restauro dessa captura
           não faz nascer pares novos. */
        furtividade: furtCapturaPorPapel(MODO_MESTRE),
        /* EMENDA Q-02 (R-Q02-3): a prévia pública entra na captura
           SÓ enquanto a prévia dura (chave opcional, como
           ambiente/escala/visao — fora da prévia a chave nem
           nasce, e saves sem ela continuam válidos). A rolagem
           NÃO viaja: 'dados' acima lê dadoEstado/roladasDados,
           imóveis durante a prévia por construção (a rolagem só
           nasce no Confirmar). */
        ...(estado === 'previa' && ataquePreviaPublicaActual()
          ? { previaPublica: ataquePreviaPublicaActual() } : {}),
        /* VOO (F-36): a asa torada viaja no bloco opcional
           'voo' — só nasce quando existe (ver vooBlocoSaveCaptura). */
        ...vooBlocoSaveCaptura()
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
          unidades: view.getState().units.map(u => {
            const su = { id: u.id, x: u.posicao.x, y: u.posicao.y, vivo: u.vivo !== false };
            const z = camadaDe(u.id);
            if (z > 0) su.z = z;
            return su;
          }),
          voo: vooCapturarEstado(),   // VOO: o pré-estado cobre também presença/camada/asa (atomicidade)
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
          furtividade: furtMatrizCapturaTotal(),   // FURTIVIDADE: idem — o pré-estado cobre também a matriz (dois domínios)
          /* Q-02: a frente actual entra no pré-estado — uma
             aplicação falhada também não muda a frente. */
          previaFrente: (() => { try { return typeof view.getFrente === 'function' ? view.getFrente(PROPRIA) : null; } catch (_) { return null; } })(),
          previaPublicaAplicada: previaPublicaAplicada ? JSON.parse(JSON.stringify(previaPublicaAplicada)) : null,
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
        /* VOO (F-36): o elenco de teste do save assenta ANTES
           das posições — admite quem ele traz, remove quem ele
           não traz, e repõe camada + asa torada de cada um. */
        { const presentesSave = e.unidades.map(u => u.id).filter(id => vooModeloDe(id));
          const estadosSave = {};
          for (const su of e.unidades)
            if (vooModeloDe(su.id)) estadosSave[su.id] = { z: su.z || 0,
              asaTorada: !!(e.voo && e.voo[su.id] && e.voo[su.id].asaTorada) };
          vooReconciliarDeEstado({ presentes: presentesSave, estados: estadosSave },
            Object.fromEntries(e.unidades.map(su => [su.id, su]))); }
        /* Posições e vivo: move imediato INCONDICIONAL de todas as
           figuras — cancela animações em voo mesmo quando a posição
           lógica já bate com o save (era o buraco S-CRIT-05). Figura
           que o save traz morta entra pela pose de morte rápida
           quando a cena a tem (precedente FUSÃO T-D do restauro). */
        for (const su of e.unidades) {
          view.move(su.id, (su.z || 0) > 0 ? casaVistaVoo(su) : casaVista({ x: su.x, y: su.y }), { immediate: true });
          if (vooEstado[su.id]) vooEstado[su.id].z = su.z || 0;
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
        limparPrecosPendentes();   // RN-1: os preços do voo substituído morrem no carregar
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
        /* FURTIVIDADE (Fase 0, E-5): a matriz do save volta com o
           resto (o visaoAssentar acima limpou-a; aqui repõe-se a
           guardada — de uma captura redigida vêm só os pares, e o
           domínio da rolagem fica vazio até à próxima rolagem).
           Save antigo SEM o campo: matriz VAZIA declarada no
           registo, como o ambiente e a visão — nunca «mantém a
           actual». O restauro nunca rola nem instala. */
        if ('furtividade' in e) furtMatrizRepor(e.furtividade);
        else {
          furtMatrizRepor(null);
          supRegistar('furtividade', { origem: 'save', razao: 'Save sem furtividade — matriz vazia declarada' });
        }
        /* EMENDA Q-02 (R-Q02-3): o facto público da prévia
           assenta com o resto, depois da reentrada na vez — a
           frente repõe-se em qualquer papel; o desenho só se
           pinta no MODO_MESTRE; em jogadora, zero elementos.
           Sem o campo, limpa o estado público aplicado. */
        ataquePreviaPublicaAplicar('previaPublica' in e ? e.previaPublica : null);
        /* EM-AV2-07: o fogo NÃO entra nos ficheiros de save — um
           load em sessão apaga os fogos da batalha actual, como a
           L10 anuncia (antes sobreviviam ao load, por desvio:
           o aplicar assentava o ambiente e nunca limpava o fogo). */
        ambRestaurarFogo(null);
        supPilha.length = 0;
        supSnapshot();
        supRestaurando = false;
        supConferirInvariantes('restauro-saves');   // fecha com a rede do jogo
        musSincronizar();   // MÚSICA DE BATALHA: o save assentou batalhaFim — a música segue o estado
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
          /* VOO: aplicação que não aconteceu também não muda o
             elenco de teste nem o voo — repõe-se o do pré-estado. */
          if (preSave && preSave.voo) {
            try { vooReconciliarDeEstado(preSave.voo,
              Object.fromEntries(preSave.unidades.map(su => [su.id, su]))); } catch (__) {}
          }
          if (preSave) for (const su of preSave.unidades) {
            try { view.move(su.id, (su.z || 0) > 0 ? casaVistaVoo(su) : casaVista({ x: su.x, y: su.y }), { immediate: true }); } catch (__) {}
            try { if (vooEstado[su.id]) vooEstado[su.id].z = su.z || 0; } catch (__) {}
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
            /* FURTIVIDADE: aplicação que não aconteceu também não
               mexe na matriz — repõe-se a do pré-estado. */
            if (preSave.furtividade) try { furtMatrizRepor(preSave.furtividade); } catch (__) {}
            /* EM-AV2-07: aplicação que não aconteceu também não
               apaga fogos — repõe-se o fogo do pré-estado. */
            if (preSave.raioFogo) try { ambRestaurarFogo(preSave.raioFogo); } catch (__) {}
            batalhaFim = preSave.batalhaFim;
            dadoEstado = preSave.dadoEstado >>> 0; roladasDados = preSave.roladasDados;
            ataquePendente = null; custoPendente = null; caminhoPendente = null;
            limparPrecosPendentes();   // RN-1: aplicação falhada também não deixa preços velhos
            continuarAposApresentacao = false;
            passoEmCurso = false; parado = false;
            partidaPendente = preSave.partidaPendente;
            correrUsado = preSave.correrUsado;
            opcoesMovimento.desvincular = preSave.desvincular;
            for (const idDecl of Object.keys(REACCOES_DECLARADAS)) delete REACCOES_DECLARADAS[idDecl];
            for (const idDecl of Object.keys(preSave.reaccoes)) REACCOES_DECLARADAS[idDecl] = preSave.reaccoes[idDecl];
            /* Q-02: aplicação que não aconteceu repõe a frente e
               o estado público que havia antes dela. */
            if (preSave.previaFrente !== null && preSave.previaFrente !== undefined) {
              try { if (typeof view.setFrente === 'function') view.setFrente(PROPRIA, preSave.previaFrente); } catch (__) {}
            }
            previaPublicaAplicada = preSave.previaPublicaAplicada || null;
            if (previaPublicaAplicada && MODO_MESTRE && previaPublicaAplicada.desenho) {
              try { if (typeof view.showPrevia === 'function') view.showPrevia(JSON.parse(JSON.stringify(previaPublicaAplicada.desenho))); } catch (__) {}
            }
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
        musSincronizar();   // MÚSICA DE BATALHA: a reposição também assentou batalhaFim
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
      if (ambDegrau > 0) txt += ' · apresentação reduzida para o aparelho aguentar';
      ambUI.estadoEl.textContent = txt;
    }
    if (ambUI.ponto) ambUI.ponto.hidden = (e.hora === AMBIENTE_RITUAL.hora && e.chuva === 0 && e.raios === false && e.precip === 'chuva');
    for (const reg of ambUI.botoesHora) reg.b.classList.toggle('on', Math.abs(e.hora - reg.hora) < 0.051);
    for (const reg of ambUI.botoesPrecip) reg.b.classList.toggle('on', e.precip === reg.precip);
    /* Sub-rótulo dinâmico da linha «Quanta chuva cai» (SPEC §5.5):
       diz chuva ou neve conforme o que cai do céu. */
    const subChuvaEl = document.getElementById('amb-chuva-sub');
    if (subChuvaEl) subChuvaEl.textContent = e.precip === 'neve' ? 'quanto de neve cai' : 'quanto de chuva cai';
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
        if (ambDegrau > 0) txt += ' · apresentação reduzida para o aparelho aguentar';
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
    rotuloAmbChuva.innerHTML = 'Quanta chuva cai<small id="amb-chuva-sub">quanto de chuva cai</small>';
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
    rotuloAmbPrecip.innerHTML = 'Chuva ou neve<small>o que cai do céu</small>';
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
    rotuloAmbTrem.innerHTML = 'A luz do fogo a piscar<small>o fogo e a luz dele a tremular, só neste aparelho</small>';
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
  const escUI = { botoes: [], vigenteParty: null };
  function escSincronizarPainel() {
    for (const reg of escUI.botoes) reg.b.classList.toggle('on', reg.valor === CASA_M);
    /* RN-4 (tranche «Órfãs do Ledger», A-18): o rótulo só-leitura
       da Party repinta-se da MESMA fonte que a simulação lê
       (CASA_M, assentada por escalaAssentar — que chama esta
       função) — valor do mundo, sem controlo e sem mais nada. */
    if (escUI.vigenteParty) escUI.vigenteParty.textContent = fmtM(CASA_M) + ' por casa';
  }
  if (MODO_MESTRE) {
    const tituloEsc = document.createElement('h3');
    tituloEsc.textContent = 'Escala';
    cfgEl.insertBefore(tituloEsc, $('stats'));
    const linhaEsc = document.createElement('div');
    linhaEsc.className = 'cfgrow';
    const rotuloEsc = document.createElement('span');
    rotuloEsc.className = 'cl';
    rotuloEsc.innerHTML = 'Casa<small>quanto mede cada quadrado do chão</small>';
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
  } else {
    /* RN-4 (tranche «Órfãs do Ledger», A-18): na vista da Party a
       escala vigente passa a VER-SE — só-leitura, no mesmo sítio do
       ⚙ onde o Mestre tem o selector. A escala é parâmetro do mundo
       (não é segredo do Mestre) e já regia a simulação dela (nasce
       da preferência do aparelho e dos saves) sem selector, valor
       nem aviso. Esta linha não tem botões nem ouvintes, não
       escreve armazenamento nenhum e o texto vem de CASA_M — a
       fonte única que a simulação lê — por isso o valor mostrado é
       sempre o valor em vigor. Nenhum outro elemento é criado:
       nenhum dado/estado do lado do Mestre atravessa para a Party. */
    const linhaEscParty = document.createElement('div');
    linhaEscParty.className = 'cfgrow';
    const rotuloEscParty = document.createElement('span');
    rotuloEscParty.className = 'cl';
    rotuloEscParty.innerHTML = 'Escala<small>quanto vale cada casa</small>';
    const valorEscParty = document.createElement('span');
    valorEscParty.id = 'esc-vigente';
    linhaEscParty.appendChild(rotuloEscParty);
    linhaEscParty.appendChild(valorEscParty);
    cfgEl.insertBefore(linhaEscParty, $('stats'));
    escUI.vigenteParty = valorEscParty;
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
    rotuloSupA.textContent = 'Último estado bom';
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
    rotuloCrit.textContent = 'Dicas da batalha';
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
          texto: `Quando é a vez de ${nomeCena(u.id)}, a figura mede só ${Math.round(supCritMediana(alturas))} pontinhos de tela (px) — pequeno demais para se ver o que ela faz.`
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
          ? `Na vez de ${nomeCena(u.id)}, a figura nem aparece na tela — a câmara ficou noutro sítio.`
          : `${nomeCena(u.id)} passa parte do tempo fora da tela (${piorParte} em cada 100 momentos).`
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
            texto: `${nomeCena(a)} e ${nomeCena(b)} ficam um em cima do outro na tela durante a luta — não se percebe quem é quem.`
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
    if (estado !== 'mover' || batalhaFim || fichaAberta || !cfgEl.hidden) return;
    /* D1: na vez manual, a seta anda a figura comandada (o mesmo
       Mover, pelo despacho do toque); na vez dela, é a de sempre. */
    if (vezManualAberta) { e.preventDefault(); passoSetaManual(dir[0], dir[1]); return; }
    if (vezAtual !== PROPRIA) return;
    e.preventDefault();          // o ramo actua: a página não rola a meio do gesto
    passoSeta(dir[0], dir[1]);
  });

  /* ---------- Teclas a funcionar (t-config-abas, SPEC §6.2) ----------
   * Handler NOVO e único para as teclas da tabela de Controles.
   * Coexiste com os handlers de sempre e NÃO os reescreve: o das
   * setas/Escape (acima) fica intacto, e o da câmera livre (registado
   * antes, com stopImmediatePropagation) continua a mandar nela.
   * ÂMBITO ESCRITO:
   * - foco num input/textarea/select/contenteditable → ignora tudo;
   * - atalhos do navegador (Ctrl/Meta/Alt) → ignora;
   * - câmera livre activa → NÃO actua (as teclas lá são do
   *   CAM_LIVRE_TECLAS, incl. Q/E com outro significado);
   * - com o ⚙ aberto, só o O actua (fecha); o Esc é do handler de
   *   sempre; letras, Espaço e Q/E ficam inertes;
   * - com outro modal/cartão por cima (ficha aberta, cartão de
   *   desgraça visível), letras e Espaço inertes; Esc como hoje;
   * - e.repeat é ignorado nas acções discretas (Q/E podem repetir:
   *   rodar é contínuo).
   * A/M/C/Espaço/F NÃO duplicam lógica: disparam o CLIQUE do botão
   * gémeo (a barra, o chip da ficha) e herdam todas as suas guardas.
   * A tecla I fica INERTE de propósito: no vivo não existe nenhuma
   * superfície de inventário/mochila (prova no relatório da
   * construção) — inventar um sistema estava proibido pela SPEC. */
  const PASSO_OLHAR = Math.PI / 12;   // 15° por toque de Q/E (sem precedente de passo: SPEC §6.2)
  document.addEventListener('keydown', e => {
    const alvo = e.target;
    if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' ||
      alvo.tagName === 'SELECT' || alvo.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (camLivreActiva()) return;
    const tecla = e.key;
    if (!cfgEl.hidden) {
      if (tecla === 'o' || tecla === 'O') { e.preventDefault(); fecharCfg(); }
      return;
    }
    if (tecla === 'Escape') return;   // comportamento de hoje, no handler de sempre
    const modalAberto = !!fichaAberta || (dgCartaoEl && !dgCartaoEl.hidden);
    if (modalAberto) return;
    const minuscula = tecla.length === 1 ? tecla.toLowerCase() : tecla;
    const botaoAcao = acao => $('acoes') ? $('acoes').querySelector('button[data-acao="' + acao + '"]') : null;
    if (minuscula === 'o') { e.preventDefault(); $('btn-config').click(); return; }
    if (minuscula === 'q' || minuscula === 'e') {
      /* Olhar à volta: roda SÓ a câmera deste aparelho (offset local
         na cena), a qualquer momento — a frente da personagem e o
         campo de visão (o véu) não se tocam. Q = esquerda (+passo,
         o mesmo sentido do arrasto para a esquerda no orbit). */
      view.rodarOlhar(minuscula === 'q' ? PASSO_OLHAR : -PASSO_OLHAR);
      return;
    }
    if (e.repeat) return;
    if (minuscula === 'a' || minuscula === 'm' || minuscula === 'c') {
      const b = botaoAcao(minuscula === 'a' ? 'atacar' : minuscula === 'm' ? 'mover' : 'consumivel');
      if (b) { e.preventDefault(); b.click(); }
      return;
    }
    if (tecla === ' ') {
      const b = botaoAcao('encerrar');   // o botão só existe na vez dela, no estado base
      if (b) { e.preventDefault(); b.click(); }
      return;
    }
    if (minuscula === 'f') { if (!fichaAberta) chipEl.click(); return; }
    if (minuscula === 'i') return;       // sem superfície de inventário no vivo — inerte (ver relatório)
    if (minuscula === 'v') {
      const botoes = ['cam-fixa', 'cam-seguir', 'cam-360'].map(id => $(id)).filter(Boolean);
      const actual = botoes.findIndex(b => b.id === 'cam-' + view.getState().camera);
      if (botoes.length && actual >= 0) botoes[(actual + 1) % botoes.length].click();
      return;
    }
    if (tecla === '+' || tecla === '=' || tecla === '-' || tecla === '_') {
      const zb = $(tecla === '+' || tecla === '=' ? 'zoom-mais' : 'zoom-menos');
      if (zb && !zb.disabled) zb.click();
      return;
    }
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
        ? `<br>${falhas.map(m => nomeCena(m.id)).join(', ')} ${falhas.length > 1 ? 'entram' : 'entra'} em cena como boneco de treino.`
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
       · o sensor corre com os valores REAIS lavrados
         (FURTIVIDADE_BASES — ver o bloco de estado);
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
     declarado: a LOS V2 permissiva vaza casas do miolo em algumas
     geometrias — o vazamento continua a existir na calculadora, mas
     a zona fechada (Opção C, logo abaixo) retira a casa que vaza do
     campo de quem está fora, e tudo o resto do campo de quem está
     dentro. */
  /* PRÉVIA v2, passo ②: a MESMA declaração passa a dizer também o
     GRAU de cobertura de cada casa (EM-S-01: o grau é declaração
     da peça/mapa, na mesma declaração que já alimentava a visão —
     uma só lista de casas, nunca uma segunda). O miolo 2×2 é
     'total': é um anel FECHADO de 26 pedras à volta do foco, já
     declarado tapa-vista por palavra do Mestre — uma figura atrás
     dele está coberta por completo, como atrás de uma parede.
     Alternativa nomeada: se o anel for julgado baixo demais para
     «por completo», o valor cai para 'media' AQUI, numa palavra
     desta declaração — o mecanismo não muda. Tudo o resto do mapa
     continua sem registo (efeito zero — «pequena» não existe).
     visaoOpacos() continua a devolver só [x, y]: a extensão é
     invisível aos consumidores de visão (visaoCampo,
     visaoCampoOlho e o gancho __visao.campo recebem exactamente
     o que recebiam). Quem lê o grau é visaoOpacosComGrau(),
     derivado desta mesma lista. */
  const VISAO_OPACOS_DECLARACAO = [[4, 2, 'total'], [5, 2, 'total'], [4, 3, 'total'], [5, 3, 'total']];
  function visaoOpacos() { return VISAO_OPACOS_DECLARACAO.map(([x, y]) => [x, y]); }
  function visaoOpacosComGrau() { return VISAO_OPACOS_DECLARACAO.map(([x, y, grau]) => ({ x, y, grau })); }
  /* ZONA FECHADA DO CÍRCULO (Opção C — palavra do Mestre, 2026-11-11
     15:15: «Se ela nunca tiver visto, é para ficar no escuro e não
     mostrar»): o interior do círculo de pedras é zona fechada nos dois
     sentidos — quem está fora nunca vê o miolo, de ângulo nenhum; quem
     está dentro não vê para fora. A zona é a pegada medida do disco do
     miolo (r < 1,35 m à volta do (0,0) do mundo): 6 casas, colunas
     4–5 × filas 2–4 — porque o mapa de cena (cena.js) põe o (0,0) ao
     centro da fila 3, não no canto das 4 casas do registo de opacos.
     O registo de opacos fica o da REF_63 (4 casas); a zona é maior do
     que ele pelas duas casas do miolo sul, (4,4) e (5,4). Mecanismo:
     filtro puro sobre o campo calculado, depois de máscara + LOS e
     antes da cache, chamado nos únicos três sítios onde o campo nasce
     ou se lê (visaoCampo, visaoCampoOlho e o gancho de prova). Sem
     estado novo: a zona é constante e o filtro só depende do campo e
     da casa de quem olha. Desenho + bancada: t-zona-fechada-circulo. */
  const VISAO_ZONA_FECHADA = new Set(['4,2', '5,2', '4,3', '5,3', '4,4', '5,4']);
  function visaoZonaFiltrar(campo, x, y) {
    const dentro = VISAO_ZONA_FECHADA.has(x + ',' + y);
    const out = new Set();
    for (const k of campo) if (VISAO_ZONA_FECHADA.has(k) === dentro) out.add(k);
    return out;
  }
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
    const bruto = window.Visao.campo(AREA.cols, AREA.rows, [ong.posicao.x, ong.posicao.y], olhar, visaoOpacos(), 'V2', modelo);
    const s = visaoZonaFiltrar(bruto, ong.posicao.x, ong.posicao.y);
    visaoMs = performance.now() - t0;
    visaoCache.set(chaveCache, s);
    return s;
  }
  function visaoLimparMemoria() {
    visaoMemoria.jaVisto.clear();
    visaoMemoria.lembrancas.clear();
    visaoMemoria.ultimaVisao = {};
    furtLimparMatriz();   /* E-5(i): a limpeza da matriz mora nesta porta (e na transição de batalhaFim que a vigia detecta) */
    if (!MODO_MESTRE) view.limparFantasmas();
    else visaoPreviaLimparMemoria();   /* no Mestre, a mesma porta limpa também a memória da pré-vista */
  }

  /* ════════════════════════════════════════════════════════════════
     FURTIVIDADE — FASE 0 (desenho fechado e DECIDIDO: DESENHO.md +
     ADENDA-DECISOES.md em t-furtividade-base). Peças neutras: a
     consulta pontual de cobertura (E-1), a estrutura da matriz em
     dois domínios (E-4) e as cláusulas de saves/restauro (E-5).
     O verbo «mover furtivo» está DESLIGADO: nada aqui instala
     escondidos, nenhuma rolagem dispara — a matriz nasce vazia e
     vazia fica até à tranche de activação.
     ════════════════════════════════════════════════════════════════ */
  /* Domínio do Mestre (FORA da captura da Party): o número da
     rolagem, uma vez por figura e por esconderijo. */
  const escondidaRolagem = {};
  /* Estado partilhado: só o booleano por par (figura × observadora)
     e a casa do esconderijo — é ele que os ecrãs lêem. */
  const escondidaDe = {};
  function furtLimparMatriz() {
    for (const k of Object.keys(escondidaRolagem)) delete escondidaRolagem[k];
    for (const k of Object.keys(escondidaDe)) delete escondidaDe[k];
  }
  /* O par (figura, observadora) está escondido? — leitura única da
     matriz partilhada, usada pelos fantasmas (E-7(i)) e, amanhã,
     pelo desenho. Sem par, não está escondida. */
  function furtEscondidaDe(figura, observadora) {
    const porObs = escondidaDe[figura];
    const par = porObs ? porObs[observadora] : null;
    return !!(par && par.escondida === true);
  }
  /* Escondida de TODAS as observadoras dadas (a leitura da
     pré-vista, cuja presença é uma união: basta uma vê-la). */
  function furtEscondidaDeTodas(figura, observadoras) {
    if (!observadoras.length) return false;
    return observadoras.every(o => furtEscondidaDe(figura, o));
  }
  /* A camada 2 corre para este par? (P3 final + §2a + H5): os dois
     valores existem, não é a própria, e não é entre aliadas (o
     sensor é sensação de perigo — aliada não é perigo). */
  function furtParCorre(figura, observadora) {
    if (figura === observadora) return false;
    const bf = FURTIVIDADE_BASES[figura], bo = FURTIVIDADE_BASES[observadora];
    if (!bf || !bo || typeof bf.fb !== 'number' || typeof bo.pb !== 'number') return false;
    const ladoF = VISAO_INIMIGOS.includes(figura), ladoO = VISAO_INIMIGOS.includes(observadora);
    return ladoF !== ladoO;   /* lados opostos: inimigos × heroínas */
  }
  /* CONSULTA PONTUAL DE COBERTURA (E-1): a figura está em cobertura
     em relação à observadora ⇔ d2≤36 ∧ a casa cai na máscara da
     forma em vigor ∧ a LOS V2 da observadora para a casa FALHA
     (ocluída pelo registo de opacos de produção). É uma relação
     por par — a calculadora de campos NÃO se toca (visao.js é
     byte-igual à referência provada); a oclusão lê-se pela mesma
     LOS exportada, casa a casa. A assimetria vem da máscara e da
     frente da observadora, nunca da LOS (medida simétrica). */
  function furtCoberturaConsulta(idFigura, idObservadora) {
    const F = unidade(idFigura), O = unidade(idObservadora);
    if (!F || !O || !window.Visao) return false;
    const dx = F.posicao.x - O.posicao.x, dy = F.posicao.y - O.posicao.y;
    if (dx * dx + dy * dy > 36) return false;
    const olhar = visaoOlharDerivadoDe(idObservadora);
    const facing = window.Visao.FRENTES[olhar];
    if (!window.Visao.mascara(VISAO_FORMAS[visaoPartida.forma], dx, dy, facing)) return false;
    const opacosSet = new Set(visaoOpacos().map(c => c[0] + ',' + c[1]));
    return !window.Visao.LOS.V2([O.posicao.x, O.posicao.y], [F.posicao.x, F.posicao.y], opacosSet);
  }
  /* Validação da matriz vinda de fora (saves/snapshots): a forma
     exacta dos dois domínios, como visaoDominioValido faz à visão.
     Casa = par de inteiros; resultado = inteiro da rolagem. */
  function furtMatrizValida(m) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) return false;
    const casaOk = c => Array.isArray(c) && c.length === 2 &&
      Number.isInteger(c[0]) && Number.isInteger(c[1]) && Math.abs(c[0]) <= 99 && Math.abs(c[1]) <= 99;
    if (m.rolagem !== undefined) {
      if (!m.rolagem || typeof m.rolagem !== 'object' || Array.isArray(m.rolagem)) return false;
      for (const v of Object.values(m.rolagem))
        if (!v || typeof v !== 'object' || !Number.isInteger(v.resultado) || v.resultado < 0 || v.resultado > 99999 || !casaOk(v.casa)) return false;
    }
    if (m.pares !== undefined) {
      if (!m.pares || typeof m.pares !== 'object' || Array.isArray(m.pares)) return false;
      for (const porObs of Object.values(m.pares)) {
        if (!porObs || typeof porObs !== 'object' || Array.isArray(porObs)) return false;
        for (const par of Object.values(porObs))
          if (!par || typeof par !== 'object' || typeof par.escondida !== 'boolean' || !casaOk(par.casa)) return false;
      }
    }
    return true;
  }
  /* Cópia profunda dos dois domínios (os saves do Mestre guardam
     os dois e restauram-nos coerentes). */
  function furtMatrizCapturaTotal() {
    return JSON.parse(JSON.stringify({ rolagem: escondidaRolagem, pares: escondidaDe }));
  }
  /* E-4 — a captura POR PAPEL: a da Party é REDIGIDA (omite
     escondidaRolagem inteiro — o número da rolagem nunca sai do
     domínio do Mestre); a dele leva os dois domínios. É o primeiro
     mecanismo de redacção por papel da captura. */
  function furtCapturaPorPapel(papelMestre) {
    if (papelMestre) return furtMatrizCapturaTotal();
    return { pares: JSON.parse(JSON.stringify(escondidaDe)) };
  }
  /* Repor a matriz vinda de um save/snapshot (E-5): ausente ou
     inválida ⇒ matriz VAZIA (declarado por quem chama — nunca
     «mantém a actual»); presente e válida repõe-se EXACTAMENTE o
     que está guardado. O restauro nunca rola nem instala: não
     nasce par novo, não se compara número nenhum — os booleanos
     guardados são o estado, e o domínio da rolagem repõe-se ou
     fica vazio até à próxima rolagem de esconderijo. */
  function furtMatrizRepor(m) {
    furtLimparMatriz();
    if (!furtMatrizValida(m)) return false;
    if (m.rolagem) for (const [f, v] of Object.entries(m.rolagem))
      escondidaRolagem[f] = { resultado: v.resultado, casa: [v.casa[0], v.casa[1]] };
    if (m.pares) for (const [f, porObs] of Object.entries(m.pares)) {
      escondidaDe[f] = {};
      for (const [o, par] of Object.entries(porObs))
        escondidaDe[f][o] = { escondida: par.escondida, casa: [par.casa[0], par.casa[1]] };
    }
    return true;
  }

  /* ---------- a lembrança das figuras (só Ultra — adenda B) ---------- */
  function visaoLembrancasActualizar(campoVisto) {
    const agora = visaoAgoraS();
    for (const id of VISAO_INIMIGOS) {
      const u = unidade(id);
      if (!u) continue;
      const chaveCasa = u.posicao.x + ',' + u.posicao.y;
      const lem = visaoMemoria.lembrancas.get(id);
      /* E-7(i): a matriz consulta-se ANTES do ramo de presença. Se
         ela está escondida dela (matriz) na casa em que está, a
         «presença» não aconteceu aos olhos dela: NÃO se actualiza
         ultimaVisao (actualizá-la envenenava a memória com a
         posição certa de quem não foi visto) — o ramo da
         contradição abaixo trata a casa lembrada como hoje. Com a
         matriz vazia (Fase 0), este ramo é exactamente o de hoje. */
      if (campoVisto.has(chaveCasa) && !furtEscondidaDe(id, PROPRIA)) {
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
  /* Camada 2 com valores reais (P3 final: base × base, automático,
     sem estado, sem rolagens): para cada figura adversária viva,
     o par corre se os dois valores existirem (furtParCorre) e ela
     é SENTIDA se a Furtividade Base dela for MENOR que a Percepção
     Base da dona deste ecrã, dentro do círculo de 9 m e fora do
     campo visto. Com várias sentidas, a seta aponta a MAIS PERTO
     (desempate pela ordem de VISAO_INIMIGOS) — a apresentação de
     hoje é um só triângulo; o sensor multi-par completo é da
     activação. Sentir ≠ ver: a seta diz o LADO, nunca a casa. */
  function visaoSensorActualizar(campoVisto, olhar) {
    if (!visaoSensorEl) return;
    let mostra = false, seta = '';
    if (visaoPartida.modo !== 'zero' && campoVisto) {
      const ong = unidade(PROPRIA);
      if (ong) {
        let melhor = null, melhorDist = Infinity;
        for (const id of VISAO_INIMIGOS) {
          if (!furtParCorre(id, PROPRIA)) continue;          // sem os dois valores, o par não corre
          const alvo = unidade(id);
          if (!alvo || !alvo.vivo) continue;
          const vx = alvo.posicao.x - ong.posicao.x, vy = alvo.posicao.y - ong.posicao.y;
          const dist = Math.hypot(vx, vy);
          if (dist > 6) continue;                            // fora do círculo de 9 m não corre
          if (campoVisto.has(alvo.posicao.x + ',' + alvo.posicao.y)) continue;   // vista ≠ sentida
          if (!(FURTIVIDADE_BASES[id].fb < FURTIVIDADE_BASES[PROPRIA].pb)) continue;   // a régua: < sente; ≥ não sente (empate é do furtivo)
          if (dist < melhorDist) { melhorDist = dist; melhor = { vx, vy }; }
        }
        if (melhor) {
          mostra = true;
          const f = window.Visao.FRENTES[olhar];
          const frente = melhor.vx * f[0] + melhor.vy * f[1];
          const lado = f[0] * melhor.vy - f[1] * melhor.vx;                 // >0 = direita do corpo dela
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
    const s = visaoZonaFiltrar(window.Visao.campo(AREA.cols, AREA.rows, [x, y], olhar, visaoOpacos(), 'V2', modelo), x, y);
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
      /* E-7(i), gémea: a matriz consulta-se ANTES do ramo de
         presença — na pré-vista, «presença» é união: ela só está
         presente se alguma heroína a vir de facto (não escondida
         dela pela matriz). Sem actualizar ultimaVisao quando
         ninguém a viu. Matriz vazia ⇒ comportamento de hoje. */
      if (campoVisto.has(chaveCasa) && !furtEscondidaDeTodas(id, ELENCO.filter(e => !VISAO_INIMIGOS.includes(e.id)).map(e => e.id))) {
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
        (visaoPreviaMestre ? ' · vendo como as jogadoras' : '');
    for (const reg of visaoUI.botoesModo) reg.b.classList.toggle('on', e.modo === reg.v);
    for (const reg of visaoUI.botoesForma) reg.b.classList.toggle('on', e.forma === reg.v);
    for (const reg of visaoUI.botoesAnel) reg.b.classList.toggle('on', e.anel === reg.v);
    for (const reg of visaoUI.botoesPrazo) reg.b.classList.toggle('on', e.prazo === reg.v);
    for (const reg of visaoUI.botoesPrevia) reg.b.classList.toggle('on', visaoPreviaMestre === reg.v);
    /* Lembrança fora do Ultra (SPEC §5.6/P12): a linha nasce
       DESACTIVADA e imóvel, com «Só funciona no modo Ultra.» no
       lugar do sub-rótulo — desactivar é só de superfície: o valor
       em hudt1-lembranca-prazo nunca se apaga aqui. Trocar o Modo
       actualiza na hora, por este mesmo sincronizador. */
    const ultraCfg = e.modo === 'ultra';
    for (const reg of visaoUI.botoesPrazo) {
      reg.b.disabled = !ultraCfg;
      const segLemb = reg.b.closest('.seg');
      if (segLemb) segLemb.classList.toggle('disabled', !ultraCfg);
    }
    const subLemb = document.getElementById('visao-lembranca-sub');
    if (subLemb) subLemb.textContent = ultraCfg
      ? 'Quanto tempo o mapa lembra o que já foi visto.'
      : 'Só funciona no modo Ultra.';
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
    const visaoLinha = (rotulo, aria, opcoes, registro, chave, sub) => {
      const linha = document.createElement('div');
      linha.className = 'cfgrow vel';
      const rot = document.createElement('span');
      rot.className = 'cl';
      if (sub) rot.innerHTML = rotulo + '<small' + (chave === 'prazo' ? ' id="visao-lembranca-sub"' : '') + '>' + sub + '</small>';
      else rot.textContent = rotulo;
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
      [['zero', 'Zero'], ['parcial', 'Parcial'], ['total', 'Total'], ['ultra', 'Ultra']], visaoUI.botoesModo, 'modo',
      'Quanto do mapa fica escondido de cada jogadora.');
    visaoLinha('Forma', 'Forma do campo de visão',
      [['larga', 'Larga 180°'], ['maqueta', 'Maqueta 120°'], ['cone', 'Cone 120°']], visaoUI.botoesForma, 'forma',
      'O formato do que cada uma vê à frente.');
    visaoLinha('Ver ao redor', 'Ver as casas ao redor da personagem',
      [[false, 'Desligado'], [true, 'Ligado']], visaoUI.botoesAnel, 'anel');
    visaoLinha('Lembrança', 'Prazo da lembrança (só Ultra)',
      [['off', 'Desligado'], ['1', '1 min'], ['2', '2 min']], visaoUI.botoesPrazo, 'prazo',
      'Quanto tempo o mapa lembra o que já foi visto.');
    const linhaPrevia = document.createElement('div');
    linhaPrevia.className = 'cfgrow vel';
    const rotPrevia = document.createElement('span');
    rotPrevia.className = 'cl';
    rotPrevia.innerHTML = 'Ver como as jogadoras<small>Mostra na sua tela o campo como uma jogadora o vê.</small>';
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
          say(v ? 'Ver como as jogadoras ligado: vês o campo como as jogadoras.'
                : 'Ver como as jogadoras desligado: vista completa do Mestre.');
      });
      grupoPrevia.appendChild(b);
      visaoUI.botoesPrevia.push({ v, b });
    }
    linhaPrevia.appendChild(rotPrevia);
    linhaPrevia.appendChild(grupoPrevia);
    cfgEl.insertBefore(linhaPrevia, $('stats'));
    visaoSincronizarPainel();
  }

  /* ==================================================================
   * CONFIGURAÇÕES EM ABAS (t-config-abas — SPEC-CONSTRUCAO fusão v1+v2)
   * ==================================================================
   * Montagem FINAL do ⚙: todas as linhas acima nasceram como sempre
   * (mesmos ids, mesmas chaves, mesmos ouvintes, mesmas portas) e
   * foram inseridas planas antes de #stats. Aqui RECOLHEM-SE os nós
   * — appendChild MOVE o nó e conserva os ouvintes — para dentro da
   * estrutura de abas. Nenhum controlo é recriado: muda só a casa.
   * Os títulos h3 de secção antigos («Som», «Ambiente», «Câmera
   * livre», «Escala», «Visão») fundem-se nos títulos de aba/grupo e
   * são removidos como elementos soltos (mapa §5.8 no relatório).
   * #stats fica FORA da rolagem, como faixa de 22 px no fundo.
   * REF_88 (palavra do Mestre, 13/11/2026 08:34: «Deixe uma única
   * coluna horizontal de abas, só com seus nomes, essa explicação
   * de o que é a aba pode ficar dentro da aba»): a barra é UMA
   * fileira horizontal só com os NOMES; a explicação de cada aba
   * (subP/subM) vive no TOPO do conteúdo da própria aba. */
  const CFG_ABAS_TODOS = [
    { id: 'jogo', nome: 'Jogo', subP: 'Câmera, zoom e ajuda do grid', subM: 'Câmera, velocidade e automático' },
    { id: 'graficos', nome: 'Gráficos', subP: 'Qualidade, números e tela vermelha', subM: 'A sua tela e a luz do fogo' },
    { id: 'som', nome: 'Som', subP: 'Volumes, música, efeitos e mudo', subM: 'Volumes, música e som do ambiente' },
    { id: 'controles', nome: 'Controles', subP: 'As teclas para jogar no computador', subM: 'As teclas para jogar no computador' }
  ];
  const CFG_ABAS_SUAS = [
    { id: 'ceu', nome: 'Céu', subM: 'Hora, chuva e raios' },
    { id: 'visao', nome: 'Visão', subM: 'O que as jogadoras veem' },
    { id: 'voltar', nome: 'Voltar atrás', subM: 'Último estado bom, registo e dicas' },
    { id: 'testes', nome: 'Testes', subM: 'Coisas em teste para analisar' }
  ];
  cfgEl.classList.add('com-abas');
  const corpoCfg = document.createElement('div'); corpoCfg.className = 'cfg-corpo';
  const indiceWrapCfg = document.createElement('div'); indiceWrapCfg.className = 'cfg-indice-wrap';
  const indiceCfg = document.createElement('nav'); indiceCfg.className = 'cfg-indice';
  indiceCfg.setAttribute('aria-label', 'Abas das configurações');
  const maisCfg = document.createElement('div'); maisCfg.className = 'cfg-mais'; maisCfg.textContent = 'Há mais abas →';
  indiceWrapCfg.appendChild(indiceCfg); indiceWrapCfg.appendChild(maisCfg);
  const conteudoCfg = document.createElement('div'); conteudoCfg.className = 'cfg-conteudo';
  corpoCfg.appendChild(indiceWrapCfg); corpoCfg.appendChild(conteudoCfg);
  const maisConteudoCfg = document.createElement('div'); maisConteudoCfg.className = 'cfg-mais-conteudo'; maisConteudoCfg.textContent = 'Há mais abaixo ↓';
  corpoCfg.appendChild(maisConteudoCfg);
  cfgEl.insertBefore(corpoCfg, $('stats'));
  const paineisCfg = {}, celulasCfg = {};
  let cfgAbaActual = 'jogo';   // memória da última aba DESTA superfície (só variável — nenhuma chave nova)
  function activarAbaCfg(id) {
    if (!paineisCfg[id]) id = 'jogo';
    cfgAbaActual = id;
    for (const k in paineisCfg) paineisCfg[k].classList.toggle('activa', k === id);
    for (const k in celulasCfg) celulasCfg[k].classList.toggle('on', k === id);
    conteudoCfg.scrollTop = 0;
    /* REF_88: na fileira horizontal, a célula activa fica visível —
       se estiver fora da janela do índice, a fileira desliza até ela. */
    const celA = celulasCfg[id];
    if (celA && celA.getBoundingClientRect && indiceCfg.scrollWidth > indiceCfg.clientWidth) {
      const rI = indiceCfg.getBoundingClientRect(), rC = celA.getBoundingClientRect();
      if (rC.left < rI.left) indiceCfg.scrollLeft -= (rI.left - rC.left) + 4;
      else if (rC.right > rI.right) indiceCfg.scrollLeft += (rC.right - rI.right) + 4;
    }
    cfgMaisCheck();
    cfgConteudoCheck();
  }
  function cfgMaisCheck() {
    /* REF_88: a fileira desliza na HORIZONTAL — o aviso mede a
       rolagem lateral (antes media a vertical da coluna). */
    const precisa = indiceCfg.scrollWidth > indiceCfg.clientWidth + 1 &&
      indiceCfg.scrollLeft + indiceCfg.clientWidth < indiceCfg.scrollWidth - 2;
    maisCfg.classList.toggle('on', precisa);
  }
  function cfgConteudoCheck() {
    const precisa = conteudoCfg.scrollHeight > conteudoCfg.clientHeight + 1 &&
      conteudoCfg.scrollTop + conteudoCfg.clientHeight < conteudoCfg.scrollHeight - 2;
    maisConteudoCfg.classList.toggle('on', precisa);
  }
  indiceCfg.addEventListener('scroll', cfgMaisCheck);
  conteudoCfg.addEventListener('scroll', cfgConteudoCheck);
  conteudoCfg.addEventListener('click', cfgConteudoCheck);
  $('btn-config').addEventListener('click', () => requestAnimationFrame(() => { cfgMaisCheck(); cfgConteudoCheck(); }));
  addEventListener('resize', () => { cfgMaisCheck(); cfgConteudoCheck(); });
  function faixaCfg(texto, extra) {
    const f = document.createElement('div');
    f.className = 'cfg-faixa' + (extra || '');
    f.textContent = texto;
    return f;
  }
  function novaAbaCfg(def, celulasEl) {
    const sec = document.createElement('section');
    sec.className = 'cfg-aba'; sec.dataset.aba = def.id; sec.setAttribute('aria-label', def.nome);
    conteudoCfg.appendChild(sec); paineisCfg[def.id] = sec;
    const cel = document.createElement('button');
    cel.type = 'button'; cel.className = 'cfg-celula'; cel.dataset.aba = def.id;
    /* REF_88: a célula leva SÓ o nome — a explicação mudou-se para
       dentro da aba (ver o bloco a seguir a cfgFraseAba). */
    const b = document.createElement('b'); b.textContent = def.nome;
    cel.appendChild(b);
    cel.addEventListener('click', () => activarAbaCfg(def.id));
    celulasEl.appendChild(cel); celulasCfg[def.id] = cel;
  }
  const celulasTodosCfg = document.createElement('div'); celulasTodosCfg.className = 'cfg-celulas-todos';
  indiceCfg.appendChild(faixaCfg('PARA TODOS'));
  indiceCfg.appendChild(celulasTodosCfg);
  for (const def of CFG_ABAS_TODOS) novaAbaCfg(def, celulasTodosCfg);
  if (MODO_MESTRE) {
    indiceCfg.appendChild(faixaCfg('SÓ SUAS — PARA COMANDAR A BATALHA', ' sticky'));
    const celulasSuasCfg = document.createElement('div'); celulasSuasCfg.className = 'cfg-celulas-suas';
    indiceCfg.appendChild(celulasSuasCfg);
    for (const def of CFG_ABAS_SUAS) novaAbaCfg(def, celulasSuasCfg);
  }
  function cfgGrupo(pane, titulo, frase) {
    const g = document.createElement('div'); g.className = 'cfg-grupo';
    if (titulo) { const h = document.createElement('h3'); h.className = 'cfg-grupo-titulo'; h.textContent = titulo; g.appendChild(h); }
    if (frase) { const p = document.createElement('p'); p.className = 'cfg-frase'; p.textContent = frase; g.appendChild(p); }
    pane.appendChild(g); return g;
  }
  function cfgFraseAba(pane, texto) {
    const p = document.createElement('p'); p.className = 'cfg-aba-frase'; p.textContent = texto;
    pane.appendChild(p); return p;
  }
  /* REF_88: a explicação que vivia debaixo do nome na célula passa
     a abrir cada aba, com o MESMO texto (subM no Mestre, subP na
     Party). Acrescentada agora — os painéis estão vazios e os
     enchimentos vêm depois — fica a primeira coisa de cada aba,
     sem reordenar mais nada nem apagar frase nenhuma existente. */
  for (const def of [...CFG_ABAS_TODOS, ...(MODO_MESTRE ? CFG_ABAS_SUAS : [])]) {
    cfgFraseAba(paineisCfg[def.id], MODO_MESTRE ? def.subM : (def.subP || def.subM));
  }
  function cfgPFrase(texto) {
    const p = document.createElement('p'); p.className = 'cfg-frase'; p.textContent = texto; return p;
  }
  function cfgZonaRestaurar(pane, linha) {
    const z = document.createElement('div'); z.className = 'cfg-restaurar-zona';
    z.appendChild(cfgPFrase('Repõe só as definições de Gráficos e Som.'));
    z.appendChild(linha); pane.appendChild(z); return z;
  }
  function cfgRotuloCam(id) {
    const b = $(id); if (!b) return null;
    return b.textContent.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  }
  function cfgFraseVista() {
    /* I-3: a lista de modos da frase do V nasce dos rótulos dos
       próprios botões da Câmera que existirem no DOM. */
    const nomes = ['cam-fixa', 'cam-seguir', 'cam-360'].map(cfgRotuloCam).filter(Boolean);
    return 'Vista: troca a câmera — ' + nomes.join(', ') + '.';
  }
  function cfgTabelaTeclas() {
    const linhas = [
      ['A', 'Atacar', 'Atacar: escolha o alvo no mapa.'],
      ['M', 'Mover', 'Mover: depois ande com as setas, casa a casa.'],
      ['C', 'Consumível', 'Consumível: escolha o item para usar.'],
      ['Espaço', 'Encerrar vez', 'Encerra a sua vez e passa ao próximo. Só na sua vez.'],
      ['F', 'Ficha', 'Ficha: abre a ficha da sua personagem.'],
      ['I', 'Inventário', 'Inventário: abre a mochila da sua personagem.'],
      ['O', 'Configurações', 'Configurações: abre e fecha este painel.'],
      ['V', 'Câmera', cfgFraseVista()],
      ['+ / −', 'Zoom', 'Zoom: aproxima e afasta a câmera.'],
      ['↑ ↓ ← →', 'Andar', 'Setas: andam casa a casa, só dentro do Mover, na sua vez, com nada aberto por cima.'],
      ['Q / E', 'Olhar à volta', 'Olhar: Q roda a câmera para a esquerda, E para a direita. Pode olhar a qualquer momento, mesmo fora da sua vez. Olhar não vira a personagem. Não se vê nada que o véu esconda.'],
      ['Esc', 'Fechar/cancelar', 'Fecha o que está aberto e cancela o modo activo.']
    ];
    const t = document.createElement('table'); t.className = 'cfg-keys';
    const tb = document.createElement('tbody'); t.appendChild(tb);
    for (const [tecla, accao, tut] of linhas) {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      const chip = document.createElement('span'); chip.className = 'cfg-chip'; chip.textContent = tecla;
      td1.appendChild(chip);
      const td2 = document.createElement('td'); td2.className = 'cfg-kact'; td2.textContent = accao;
      const td3 = document.createElement('td'); td3.className = 'cfg-ktut'; td3.textContent = tut;
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tb.appendChild(tr);
    }
    return t;
  }
  function cfgSubTabelaLivre() {
    const t = document.createElement('table'); t.className = 'cfg-keys cfg-keys-livre';
    const tb = document.createElement('tbody'); t.appendChild(tb);
    const linhas = [['W A S D e setas', 'andar'], ['PageUp / PageDown', 'subir e descer'],
      ['Q / E', 'rodar a vista'], ['Shift', 'mais depressa']];
    for (const [teclas, accao] of linhas) {
      const tr = document.createElement('tr');
      const td = document.createElement('td'); td.className = 'cfg-ktut';
      const b = document.createElement('b'); b.textContent = teclas;
      const resto = document.createElement('span'); resto.textContent = ' — ' + accao;
      td.appendChild(b); td.appendChild(resto);
      tr.appendChild(td); tb.appendChild(tr);
    }
    return t;
  }
  /* ---------- recolha das linhas existentes, por ordem e por sinal ---------- */
  const R = {};
  /* Nos DOMs de ensaio da casa, className e classList não estão
     sincronizados (o classList nasce vazio e o código atribui
     className) — temClasse lê os dois, como o navegador lê um só. */
  /* textoCfg: nos DOMs de ensaio o textContent não agrega os
     filhos; a procura profunda encontra o prefixo em qualquer
     descendente, como o textContent agregado do navegador. */
  const temTextoCfg = (el, prefixo) => {
    let sim = false;
    const andar = n => {
      if (sim || !n || typeof n !== 'object') return;
      if (typeof n.textContent === 'string' && n.textContent.indexOf(prefixo) === 0) { sim = true; return; }
      if (n.children) for (const f of n.children) andar(f);
    };
    andar(el);
    return sim;
  };
  const temClasse = (n, nome) => !!n && (
    (n.classList && n.classList.contains && n.classList.contains(nome)) ||
    (typeof n.className === 'string' && n.className.split(/\s+/).includes(nome)));
  const temCfg = (el, sel) => {
    const directo = el.querySelector ? el.querySelector(sel) : null;
    if (directo) return directo;
    /* Recurso de varredura profunda: nos DOMs de ensaio da casa o
       querySelector é um stub que devolve sempre null — sem isto a
       recolha classificava ZERO linhas nesses DOMs e lavrava «sem
       casa» por todas (falso positivo medido na bateria de parques).
       A varredura reconhece exactamente os selectores usados abaixo
       e devolve o mesmo nó que o querySelector devolveria. */
    const mId = /^#([\w-]+)$/.exec(sel);
    const mSeg = /^\.seg\[aria-label="(.+)"\]$/.exec(sel);
    const mInp = /^input\[aria-label="(.+)"\]$/.exec(sel);
    let achado = null;
    const andar = n => {
      if (achado || !n || typeof n !== 'object') return;
      if (mId && n.id === mId[1]) achado = n;
      else if (sel === '[data-qualidade]' && n.dataset && n.dataset.qualidade) achado = n;
      else if (mSeg && temClasse(n, 'seg') &&
        n.getAttribute && n.getAttribute('aria-label') === mSeg[1]) achado = n;
      else if (mInp && n.tagName === 'INPUT' &&
        n.getAttribute && n.getAttribute('aria-label') === mInp[1]) achado = n;
      if (!achado && n.children) for (const f of n.children) andar(f);
    };
    andar(el);
    return achado;
  };
  for (const el of [...cfgEl.children]) {
    if (el === bandaCfg || el === corpoCfg || el.id === 'stats') continue;
    if (el.tagName === 'H3') { el.remove(); continue; }   // títulos de secção → títulos de aba/grupo
    if (temCfg(el, '#cam-fixa')) R.cam = el;
    else if (temCfg(el, '#zoom-menos')) R.zoom = el;
    else if (temCfg(el, '#tog-grid')) R.grid = el;
    else if (temCfg(el, '#tog-danos')) R.danos = el;
    else if (temCfg(el, '[data-qualidade]')) R.qualidade = el;
    else if (temCfg(el, '#cfg-terminar')) R.terminar = el;
    else if (temCfg(el, '#tog-auto')) R.auto = el;
    else if (temCfg(el, '.seg[aria-label="Velocidade"]')) R.velocidade = el;
    else if (temCfg(el, '#tog-vermelha-piscar')) R.piscar = el;
    else if (temCfg(el, '#tog-vermelha')) R.vermelha = el;
    else if (temCfg(el, '#tog-som-mudo')) R.mudo = el;
    else if (temCfg(el, '#cfg-restaurar')) R.restaurar = el;
    else if (temCfg(el, '#tog-contador-vantagem')) R.vd = el;
    else if (el.id === 'amb-estado') R.ambEstado = el;
    else if (temCfg(el, '#amb-hora')) R.ambHoraFina = el;
    else if (temCfg(el, '.seg[aria-label="Hora do dia"]')) R.ambHora = el;
    else if (temCfg(el, '.seg[aria-label="Chuva"]')) R.ambChuva = el;
    else if (temCfg(el, '.seg[aria-label="Tipo de precipitação"]')) R.ambPrecip = el;
    else if (temCfg(el, '#amb-raios')) R.ambRaios = el;
    else if (temCfg(el, '#amb-raio-agora')) R.ambRaio = el;
    else if (temCfg(el, '#amb-som')) R.ambSom = el;
    else if (temCfg(el, '#amb-tremulacao')) R.ambTrem = el;
    else if (temCfg(el, '#amb-voltar-ritual')) R.ambVoltar = el;
    else if (temCfg(el, '#cam-livre-entrar')) R.camLivre = el;
    else if (temCfg(el, '#esc-1')) R.escala = el;
    else if (temCfg(el, '#esc-vigente')) R.escalaParty = el;
    else if (temCfg(el, '#sup-voltar')) R.supVoltar = el;
    else if (temCfg(el, '#sup-exportar')) R.supExportar = el;
    else if (el.id === 'sup-alertas') R.supAlertas = el;
    else if (el.id === 'sup-json') R.supJson = el;
    else if (el.id === 'sup-ultimo') R.supUltimo = el;
    else if (temCfg(el, '#sup-limpar-analises')) R.crit = el;
    else if (el.id === 'sup-dicas') R.supDicas = el;
    else if (el.id === 'visao-estado') R.visaoEstado = el;
    else if (temCfg(el, '.seg[aria-label="Modo de visão das jogadoras"]')) R.visaoModo = el;
    else if (temCfg(el, '.seg[aria-label="Forma do campo de visão"]')) R.visaoForma = el;
    else if (temCfg(el, '.seg[aria-label="Ver as casas ao redor da personagem"]')) R.visaoAnel = el;
    else if (temCfg(el, '.seg[aria-label="Prazo da lembrança (só Ultra)"]')) R.visaoPrazo = el;
    else if (temCfg(el, '.seg[aria-label="Ver como as jogadoras"]')) R.visaoPrevia = el;
    else if (temClasse(el, 'cfg-nota')) R.notaSom = el;
    else if (temCfg(el, 'input[aria-label="Volume geral"]')) R.volGeral = el;
    else if (temCfg(el, 'input[aria-label="Música"]')) R.volMusica = el;
    else if (temCfg(el, 'input[aria-label="Efeitos"]')) R.volEfeitos = el;
    else if (temClasse(el, 'amb-estado')) R.notaNeve = el;
    else if (temTextoCfg(el, 'Você anda e voa dentro do mapa')) R.camLivreAjuda = el;
    else console.error('abas: elemento do ⚙ sem casa:', el.tagName, el.className, el.textContent.slice(0, 40));
  }
  /* ---------- Jogo ---------- */
  {
    const pane = paineisCfg.jogo;
    if (MODO_MESTRE) cfgFraseAba(pane, 'Aqui manda na câmera da batalha e em como ela anda.');
    const g = cfgGrupo(pane, 'Vista da batalha', null);
    if (R.cam) g.appendChild(R.cam);
    if (R.zoom) g.appendChild(R.zoom);
    if (R.grid) g.appendChild(R.grid);
    /* Fusão REF_76 (emenda da cadeia): a linha só-leitura da
       escala da Party (RN-4, REF_70) também nasceu depois das
       abas — mora na aba Jogo, junto à vista da batalha. */
    if (R.escalaParty) g.appendChild(R.escalaParty);
    if (MODO_MESTRE) {
      const g2 = cfgGrupo(pane, 'Andamento e medidas — só do Mestre',
        'Quão depressa a batalha anda, se ela joga sozinha e quanto mede o chão.');
      if (R.velocidade) g2.appendChild(R.velocidade);
      if (R.auto) g2.appendChild(R.auto);
      if (R.escala) g2.appendChild(R.escala);
    }
    /* Fusão REF_76 (emenda da cadeia): a linha do «Terminar» da
       F-09 (REF_75) nasceu depois das abas e não tinha casa no
       classificador — mora na aba Jogo, no grupo com o nome dela. */
    const g3 = cfgGrupo(pane, 'Batalha', null);
    if (R.terminar) g3.appendChild(R.terminar);
  }
  /* ---------- Gráficos ---------- */
  {
    const pane = paineisCfg.graficos;
    const g = cfgGrupo(pane, 'A sua tela', null);
    if (R.qualidade) g.appendChild(R.qualidade);
    if (R.danos) g.appendChild(R.danos);
    if (R.vermelha) g.appendChild(R.vermelha);
    if (R.piscar) g.appendChild(R.piscar);
    if (R.vd) g.appendChild(R.vd);
    if (MODO_MESTRE) {
      const g2 = cfgGrupo(pane, 'Só do Mestre',
        'Só neste aparelho: não muda a partida nem o que as jogadoras veem.');
      if (R.ambTrem) g2.appendChild(R.ambTrem);
    }
    if (R.restaurar) cfgZonaRestaurar(pane, R.restaurar);
  }
  /* ---------- Som ---------- */
  {
    const pane = paineisCfg.som;
    if (R.volGeral) pane.appendChild(R.volGeral);
    if (R.volMusica) pane.appendChild(R.volMusica);
    if (R.volEfeitos) pane.appendChild(R.volEfeitos);
    if (R.mudo) pane.appendChild(R.mudo);
    if (R.notaSom) pane.appendChild(R.notaSom);
    if (MODO_MESTRE) {
      const g2 = cfgGrupo(pane, 'Só do Mestre',
        'Só neste aparelho: não muda a partida nem o que as jogadoras veem.');
      if (R.ambSom) g2.appendChild(R.ambSom);
    }
    if (R.restaurar) {
      /* O MESMO item «Restaurar o padrão» no fundo de Gráficos e de
         Som (sentença J4): o botão histórico fica em Gráficos; o
         gémeo do Som dispara o clique do histórico — um só caminho,
         uma só lista branca. */
      const btnOrig = temCfg(R.restaurar, '#cfg-restaurar');
      const linhaSom = document.createElement('div'); linhaSom.className = 'cfgrow';
      /* cloneNode pode não existir nos DOMs de ensaio da casa —
         aí o gémeo nasce como botão novo com a mesma face. */
      const btnSom = btnOrig.cloneNode
        ? btnOrig.cloneNode(true)
        : Object.assign(document.createElement('button'),
          { type: 'button', className: btnOrig.className, textContent: btnOrig.textContent });
      btnSom.id = 'cfg-restaurar-som';
      btnSom.addEventListener('click', () => btnOrig.click());
      linhaSom.appendChild(btnSom);
      cfgZonaRestaurar(pane, linhaSom);
    }
  }
  /* ---------- Controles ---------- */
  {
    const pane = paineisCfg.controles;
    cfgFraseAba(pane, 'Esquema fixo do computador — igual para todos. As teclas não se mudam aqui.');
    pane.appendChild(cfgTabelaTeclas());
  }
  if (MODO_MESTRE) {
    /* ---------- Céu ---------- */
    {
      const pane = paineisCfg.ceu;
      if (R.ambEstado) pane.appendChild(R.ambEstado);
      cfgFraseAba(pane, 'Aqui manda no céu da batalha: a hora, a chuva, a neve e os raios.');
      const g1 = cfgGrupo(pane, 'Céu pronto', 'O céu da noite do ritual, posto de uma vez.');
      if (R.ambVoltar) {
        const rot = R.ambVoltar.querySelector('.cl'); if (rot) rot.remove();
        const btn = R.ambVoltar.querySelector('#amb-voltar-ritual');
        if (btn) { btn.textContent = 'Noite do ritual (23h, sem chuva, sem raios)'; btn.classList.add('cfg-restaurar'); }
        g1.appendChild(R.ambVoltar);
      }
      g1.appendChild(cfgPFrase('Repõe o céu do ritual: noite (23h), nada a cair, o que cair volta a ser chuva (não neve), raios desligados.'));
      const g2 = cfgGrupo(pane, 'A hora do dia',
        'A que horas a batalha acontece. Pôr só «Noite» não é a noite do ritual — o botão pronto está no topo desta aba.');
      if (R.ambHora) g2.appendChild(R.ambHora);
      if (R.ambHoraFina) g2.appendChild(R.ambHoraFina);
      const g3 = cfgGrupo(pane, 'A chuva, a neve e os raios',
        'Quanto cai do céu, o que cai, e os raios que você chama.');
      if (R.ambChuva) g3.appendChild(R.ambChuva);
      if (R.ambPrecip) g3.appendChild(R.ambPrecip);
      if (R.notaNeve) g3.appendChild(R.notaNeve);
      if (R.ambRaios) g3.appendChild(R.ambRaios);
      if (R.ambRaio) g3.appendChild(R.ambRaio);
    }
    /* ---------- Visão ---------- */
    {
      const pane = paineisCfg.visao;
      if (R.visaoEstado) pane.appendChild(R.visaoEstado);
      cfgFraseAba(pane, 'Aqui manda no que cada jogadora consegue ver no mapa.');
      const g1 = cfgGrupo(pane, 'O que as jogadoras veem',
        'Isto manda no que elas veem; o último botão mostra-lhe a si o campo como elas o veem.');
      if (R.visaoModo) g1.appendChild(R.visaoModo);
      if (R.visaoForma) g1.appendChild(R.visaoForma);
      const gloss = document.createElement('p');
      gloss.className = 'cfg-nota cfg-glossario';
      gloss.innerHTML = '<b>Ultra</b> = esconder ao máximo. <b>Larga</b> = ela vê para a frente e para os lados (180°). <b>Maqueta</b> = ela vê para a frente, num leque mais estreito (120°). <b>Cone</b> = o mesmo leque de 120°, e nunca muda. <b>Ver ao redor</b> (nasce desligado): ligado, com a Larga e com a Maqueta ela vê também as casas mesmo encostadas a ela, de todos os lados, até atrás; com o Cone, não muda nada. Sem o Ver ao redor, a Maqueta e o Cone veem exactamente o mesmo. Do que menos esconde ao que mais esconde: Zero, Parcial, Total, Ultra.';
      g1.appendChild(gloss);
      if (R.visaoAnel) g1.appendChild(R.visaoAnel);
      if (R.visaoPrazo) g1.appendChild(R.visaoPrazo);
      if (R.visaoPrevia) g1.appendChild(R.visaoPrevia);
      const g2 = cfgGrupo(pane, 'Ver o mapa todo',
        'Só na sua tela: andar e voar pelo mapa para o analisar.');
      if (R.camLivre) g2.appendChild(R.camLivre);
      if (R.camLivreAjuda) g2.appendChild(R.camLivreAjuda);
      g2.appendChild(cfgSubTabelaLivre());
    }
    /* ---------- Voltar atrás ---------- */
    {
      const pane = paineisCfg.voltar;
      cfgFraseAba(pane, 'Aqui volta atrás, guarda a batalha e lê os avisos e as dicas.');
      const g1 = cfgGrupo(pane, 'Avisos', 'O último aviso e a última acção, para ver sem procurar.');
      if (R.supAlertas) g1.appendChild(R.supAlertas);
      if (R.supUltimo) g1.appendChild(R.supUltimo);
      const g2 = cfgGrupo(pane, 'Guardar e voltar atrás',
        'O estado guarda-se ao começo de cada vez. Voltar repõe o começo da vez anterior — na primeira vez da batalha ainda não há vez anterior para onde voltar. Aqui também guarda o registo da batalha.');
      if (R.supVoltar) g2.appendChild(R.supVoltar);
      if (R.supExportar) g2.appendChild(R.supExportar);
      if (R.supJson) g2.appendChild(R.supJson);
      const g3 = cfgGrupo(pane, 'As dicas', 'Dicas para mestrar melhor, escritas durante a batalha.');
      if (R.supDicas) g3.appendChild(R.supDicas);
      if (R.crit) g3.appendChild(R.crit);
    }
    /* ---------- Testes (t-aba-testes — só do Mestre) ----------
       Aba nova, nascida vazia de itens recolhidos: cada coisa em
       teste ganha aqui o seu grupo, com os seus controlos, para o
       Mestre ligar, desligar e mudar durante a partida. Os estados
       dos testes vivem em variáveis da sessão e NÃO se gravam em
       chave nenhuma — é um banco de ensaio, não uma definição: ao
       recarregar a página, tudo nasce desligado. Na vista da Party
       esta aba nem sequer nasce (a montagem inteira está dentro de
       MODO_MESTRE, como as outras abas suas). */
    {
      const pane = paineisCfg.testes;
      cfgFraseAba(pane, 'Aqui ficam as coisas em teste, para você analisar dentro do jogo. Desligadas, o jogo fica como está hoje.');
      /* — Chuva nova (teste): o efeito do dossiê 052 — */
      const g1 = cfgGrupo(pane, 'Chuva nova (teste)',
        'A chuva nova cai com anéis e respingos no chão, para a chuva se ver de cima. Ligue e veja na batalha; desligue e volta a chuva de hoje.');
      let testeChuva052Ligada = false;   // nasce DESLIGADA
      let testeChuva052Nivel = 2;        // nasce no Forte, o nível já provado
      const linhaTog052 = document.createElement('div'); linhaTog052.className = 'cfgrow';
      const rotTog052 = document.createElement('span'); rotTog052.className = 'cl';
      rotTog052.innerHTML = 'Chuva nova<small>anéis e respingos no chão</small>';
      const tog052 = document.createElement('button');
      tog052.type = 'button'; tog052.id = 'teste-chuva052'; tog052.className = 'tog';
      linhaTog052.appendChild(rotTog052); linhaTog052.appendChild(tog052);
      g1.appendChild(linhaTog052);
      const linhaNivel052 = document.createElement('div'); linhaNivel052.className = 'cfgrow vel';
      const rotNivel052 = document.createElement('span'); rotNivel052.className = 'cl';
      rotNivel052.textContent = 'Nível';
      const grupoNivel052 = document.createElement('div');
      grupoNivel052.className = 'seg'; grupoNivel052.setAttribute('role', 'group');
      grupoNivel052.setAttribute('aria-label', 'Nível da chuva nova');
      const btnFraco052 = document.createElement('button');
      btnFraco052.type = 'button'; btnFraco052.textContent = 'Fraco';
      const btnForte052 = document.createElement('button');
      btnForte052.type = 'button'; btnForte052.textContent = 'Forte';
      grupoNivel052.appendChild(btnFraco052); grupoNivel052.appendChild(btnForte052);
      linhaNivel052.appendChild(rotNivel052); linhaNivel052.appendChild(grupoNivel052);
      g1.appendChild(linhaNivel052);
      const sinc052 = () => {
        tog052.classList.toggle('on', testeChuva052Ligada);
        tog052.textContent = testeChuva052Ligada ? 'Ligada' : 'Desligada';
        tog052.setAttribute('aria-pressed', String(testeChuva052Ligada));
        btnFraco052.classList.toggle('on', testeChuva052Nivel === 1);
        btnForte052.classList.toggle('on', testeChuva052Nivel === 2);
      };
      const aplicar052 = () => {
        if (view && typeof view.setTesteChuva052 === 'function') {
          try { view.setTesteChuva052(testeChuva052Ligada, testeChuva052Nivel); } catch (_) {}
        }
        sinc052();
      };
      tog052.addEventListener('click', () => { testeChuva052Ligada = !testeChuva052Ligada; aplicar052(); });
      btnFraco052.addEventListener('click', () => { testeChuva052Nivel = 1; aplicar052(); });
      btnForte052.addEventListener('click', () => { testeChuva052Nivel = 2; aplicar052(); });
      sinc052();
      /* — O voo (teste): o Grifo e a adjudicação da asa —
         A figura de ensaio do voo em camadas (F-36): admite-se
         e tira-se da batalha por aqui; «Torou a asa» é a
         adjudicação manual do Mestre (a C-37 não existe — é a
         palavra dele, pelos meios actuais, com o acto registado
         com z e escala do momento). Estado de sessão: ao
         recarregar, o Grifo sai e a asa sara — batalha nova. */
      const gVoo = cfgGrupo(pane, 'O voo (teste)',
        'O Grifo entra na batalha como figura de ensaio do voo: sobe e desce em camadas, ataca de cima com Vantagem e, se cair, paga a queda em dados. Tire-o quando o ensaio acabar.');
      const linhaVooEstado = document.createElement('div'); linhaVooEstado.className = 'cfgrow';
      const rotVooEstado = document.createElement('span'); rotVooEstado.className = 'cl';
      rotVooEstado.innerHTML = 'O Grifo<small id="voo-estado-txt">fora da batalha</small>';
      linhaVooEstado.appendChild(rotVooEstado);
      gVoo.appendChild(linhaVooEstado);
      const mkBotaoVoo = (id, texto) => {
        const linha = document.createElement('div'); linha.className = 'cfgrow';
        const rot = document.createElement('span'); rot.className = 'cl'; rot.textContent = texto;
        const b = document.createElement('button');
        b.type = 'button'; b.id = id; b.className = 'tog'; b.textContent = texto;
        linha.appendChild(rot); linha.appendChild(b);
        gVoo.appendChild(linha);
        return b;
      };
      const btnVooAdmitir = mkBotaoVoo('voo-admitir-grifo', 'Admitir o Grifo');
      const btnVooTorcer = mkBotaoVoo('voo-torcer-asa', 'Torou a asa do Grifo');
      const btnVooTirar = mkBotaoVoo('voo-tirar-grifo', 'Tirar o Grifo');
      const sincVoo = () => {
        const txt = document.getElementById('voo-estado-txt');
        const presente = testesPresentes.has('grifo');
        const est = presente ? __vooEstadoTxt() : 'fora da batalha';
        if (txt) txt.textContent = est;
        btnVooAdmitir.disabled = presente;
        btnVooTorcer.disabled = !presente || !!(vooEstado.grifo && vooEstado.grifo.asaTorada);
        btnVooTirar.disabled = !presente;
      };
      const __vooEstadoTxt = () => {
        const z = camadaDe('grifo');
        const asa = vooEstado.grifo && vooEstado.grifo.asaTorada;
        return `na batalha — camada ${z}${asa ? ' · asa torada (não voa nesta batalha)' : ''}`;
      };
      btnVooAdmitir.addEventListener('click', () => {
        const r = vooAdmitirFiguraTeste('grifo');
        if (r.ok) say('O <b>Grifo</b> entrou na batalha — é a figura de ensaio do voo.');
        else say('O Grifo não entrou: ' + r.erro);
        sincVoo();
      });
      btnVooTorcer.addEventListener('click', () => {
        vooPerderVoo('grifo', 'adjudicada', { quem: 'mestre' });
        sincVoo();
      });
      btnVooTirar.addEventListener('click', () => {
        const r = vooRemoverFiguraTeste('grifo');
        if (r.ok) say('O <b>Grifo</b> saiu da batalha.');
        else say('O Grifo não saiu: ' + r.erro);
        sincVoo();
      });
      sincVoo();
      /* — Comandar as figuras (teste): o comando manual do
         Mestre sobre as figuras que não a Ong (D1). Nasce
         DESLIGADO em cada abertura da página, como os outros
         testes; ligado, as vezes deles abrem manuais para ele
         (mover, atacar, voar) em vez de serem jogadas pela IA. */
      const g3 = cfgGrupo(pane, 'Comandar as figuras (teste)',
        'Ligado: nas vezes dos monstros e das outras figuras, é você que comanda — mover, atacar e voar com o Grifo. Desligado: a IA joga por eles, como hoje. Vale a partir da próxima vez deles.');
      const linhaTogCmd = document.createElement('div'); linhaTogCmd.className = 'cfgrow';
      const rotTogCmd = document.createElement('span'); rotTogCmd.className = 'cl';
      rotTogCmd.innerHTML = 'Comandar as figuras<small>a IA não joga por elas</small>';
      const togCmd = document.createElement('button');
      togCmd.type = 'button'; togCmd.id = 'teste-comando'; togCmd.className = 'tog';
      linhaTogCmd.appendChild(rotTogCmd); linhaTogCmd.appendChild(togCmd);
      g3.appendChild(linhaTogCmd);
      const sincCmd = () => {
        togCmd.classList.toggle('on', comandoMestreFiguras);
        togCmd.textContent = comandoMestreFiguras ? 'Ligado' : 'Desligado';
        togCmd.setAttribute('aria-pressed', String(comandoMestreFiguras));
      };
      togCmd.addEventListener('click', () => {
        comandoMestreFiguras = !comandoMestreFiguras;
        sincCmd();
        say(comandoMestreFiguras
          ? 'Comando das figuras <b>ligado</b> — a partir da próxima vez de um monstro, é você que o comanda.'
          : 'Comando das figuras <b>desligado</b> — a IA volta a jogar pelos monstros.');
      });
      sincCmd();
    }
  }
  activarAbaCfg('jogo');

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

  /* ---------- gancho de prova da bateria (não é mecânica) ----------
     PRÉVIA v2: o estado serializado da prévia (PV-04 lê daqui a
     travessia ordenada, os obstáculos e o líquido para os conferir
     contra o desenho e o livro). null fora do estado 'previa'. */
  window.__previaAtaque = Object.freeze({
    estado: () => (estado === 'previa' && previaAtaqueDesenho)
      ? JSON.parse(JSON.stringify({ estado, ...previaAtaqueDesenho })) : null,
    /* EMENDA Q-02 (R-Q02-4): o facto público da prévia para as
       provas — o deste ecrã quando mira (origem 'local'), ou o
       aplicado de uma captura alheia (origem 'aplicada'). Em
       papel de jogadora, o aplicado devolve desenho:null: o
       desenho alheio não se expõe neste ecrã, nem pelo gancho —
       só a frente, que é mundo. null quando não há prévia
       pública nenhuma (nem local, nem aplicada). */
    publica: () => {
      if (estado === 'previa') {
        const pub = ataquePreviaPublicaActual();
        return pub ? { ...pub, origem: 'local' } : null;
      }
      if (previaPublicaAplicada) {
        return MODO_MESTRE
          ? { ...JSON.parse(JSON.stringify(previaPublicaAplicada)), origem: 'aplicada' }
          : { frenteRad: previaPublicaAplicada.frenteRad, desenho: null, origem: 'aplicada' };
      }
      return null;
    }
  });
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
      return [...visaoZonaFiltrar(window.Visao.campo(AREA.cols, AREA.rows, [ong.posicao.x, ong.posicao.y], visaoOlharDerivado(), visaoOpacos(), 'V2', visaoModelo()), ong.posicao.x, ong.posicao.y)];
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

  /* ---------- gancho de prova da bateria — FURTIVIDADE FASE 0
     (não é mecânica: nenhuma função daqui é chamada pelo jogo) --- */
  window.__furtividade = Object.freeze({
    /* a consulta pontual de cobertura de E-1, tal como o jogo a lê */
    cobertura: (f, o) => furtCoberturaConsulta(f, o),
    /* o portão de pares da camada 2 (os dois valores, lados opostos) */
    parCorre: (f, o) => furtParCorre(f, o),
    /* a leitura do booleano partilhado do par */
    escondidaDe: (f, o) => furtEscondidaDe(f, o),
    /* os dois domínios como valores (cópia) — para a bateria
       conferir ida-e-volta; o número só se lê no aparelho do
       Mestre, como em todo o lado */
    matriz: () => furtMatrizCapturaTotal(),
    capturaPorPapel: (mestre) => furtCapturaPorPapel(!!mestre),
    repor: (m) => furtMatrizRepor(m),
    limpar: () => { furtLimparMatriz(); return true; },
    /* plantar um PAR (só o booleano partilhado — o que os ecrãs
       lêem) para a bateria dos fantasmas: é estado partilhado,
       não guarda número nenhum */
    plantarPar: (f, o, escondida, casa) => {
      if (!unidade(f) || !unidade(o) || !Array.isArray(casa)) return false;
      (escondidaDe[f] = escondidaDe[f] || {})[o] = { escondida: !!escondida, casa: [casa[0] | 0, casa[1] | 0] };
      return true;
    },
    /* plantar o NÚMERO da rolagem (domínio do Mestre): SÓ no
       aparelho dele — no da Party recusa, como a captura redige */
    plantarRolagem: (f, resultado, casa) => {
      if (!MODO_MESTRE) return false;
      if (!unidade(f) || !Number.isInteger(resultado) || !Array.isArray(casa)) return false;
      escondidaRolagem[f] = { resultado, casa: [casa[0] | 0, casa[1] | 0] };
      return true;
    }
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
