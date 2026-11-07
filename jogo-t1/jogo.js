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
  const DESLOCAMENTO_ONG_M = 9, CASA_M = 1.5;
  /* LA-0: as constantes de alcance vivem em METROS; a conversão
     para casas (a régua das distâncias BFS) faz-se num sítio só. */
  const alcanceEmCasas = metros => metros / CASA_M;
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
    return vlabFiltrarReciboAtaque(saidaMotor, atacanteId, alvoId);
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
        return 'caiu';
      }
      return null;
    }
    if (Number.isFinite(dep.vidaActual)) {
      danoSofrido = FICHAS.ong.vida.total - dep.vidaActual;
      atualizarChipVida();
    }
    if (dep.estadoMorte) ESTADO_VLAB.ong.estadoMorte = dep.estadoMorte;
    if (dep.morteAdjudicada) return 'morreu';
    if (dep.estadoMorte && dep.estadoMorte.fase === 'aMorrer'
        && vlabVidaOng() <= 0) return 'aMorrer';
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
      case 'arma-quebra': return `A arma (${arma}) partiu-se — fica inutilizável até ser consertada.`;
      case 'acerta-se': return `${nome} atingiu-se a si ${id === PROPRIA ? 'própria' : 'próprio'} com o próprio golpe.`;
      case 'quebra-corpo': return `${nome} partiu algo no corpo — os golpes dela ficam prejudicados e anda metade até ao fim do combate.`.replace('dela', id === PROPRIA ? 'dela' : 'dele');
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
    if (s.desfecho === 'estabilizado') { fimDeBatalha('estabilizada'); return null; }
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
     Devolve a frase composta (ou null se nada houver a dizer). */
  function vlabResolverSaidaAdjacencia(partiu) {
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
      return frases.length ? frases.join(' ') : null;
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
        return 'A <b>Ong</b> afastou-se com segurança — nenhum inimigo a golpeia ao sair.';
      frases.push('A <b>Ong</b> afastou-se com segurança de quem tinha ao lado ao partir.');
    }
    for (const aoo of ataques) {
      const s = vlabResolverAtaqueCompleto(aoo.inimigoId, PROPRIA, { ataqueDeOportunidade: true });
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
        frases.push(`${nome} golpeia-a de oportunidade ao sair — ela perdeu <b>${s.totalEfectivo}</b> de vida.`);
        if (desfecho === 'morreu') { fimDeBatalha('morte'); break; }
        if (desfecho === 'aMorrer') { entrarAMorrer(); break; }
      } else if (s.resultado === 'falhaCritica') {
        vlabAplicarAtacanteDepois(aoo.inimigoId, s);
        frases.push(`${nome} tenta golpeá-la de oportunidade e falha. ` +
          vlabFraseDesgraca(aoo.inimigoId, (s.soDoMestre || {}).falhaCritica));
      } else {
        supRegistar('accao', { acao: 'ataque', actor: aoo.inimigoId, alvo: PROPRIA, acerto: false, oportunidade: true });
        frases.push(`${nome} tenta golpeá-la de oportunidade e falha.`);
      }
      if (batalhaFim) break;
    }
    return frases.length ? frases.join(' ') : null;
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
  const FRASE_ROLAGEM_PENDENTE = 'A rolagem já saiu — prime <b>Confirmar</b> para resolver o golpe.';
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
  let contextoIA = null;        // { id, seq, relogio, destino? } do movimento/ataque da IA em voo — consumo único (G-13.3(d)); destino só no movimento (E-1)
  let guardaExpiradaIA = null;  // M-009: { id, seq } da última guarda de 5 s expirada cuja figura ainda vem a caminho — a chegada tardia dela diz-se, não se engole em silêncio
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
    if (!campoPronto) { msgTxt.textContent = falhaArranque || 'A carregar o campo…'; return; }
    msgTxt.innerHTML = html;
  }

  /* ---------- faixa: os estados trocam o miolo, nunca o tamanho ---------- */
  const B = (acao, glifo, rotulo, cls) =>
    `<button type="button" class="btn ${cls || ''}" data-acao="${acao}">` +
    (glifo ? `<span class="gi">${glifo}</span>` : '') +
    `<span class="gl">${rotulo}</span></button>`;
  const retrato = () => matchMedia('(max-width:560px)').matches;
  function renderAcoes() {
    if (!campoPronto) {
      document.getElementById('faixa').dataset.estado = falhaArranque ? 'falha-carregamento' : 'carregando';
      acoesEl.classList.remove('compacta');
      acoesEl.innerHTML = !falhaArranque ? 'A carregar…'
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
        B('terminar', '✕', rp ? 'Term.' : 'Terminar', 'ghost');
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
        ? 'O caminho até ele está tapado por outras figuras — aproxima-te com <b>Mover</b> e tenta outra vez.'
        : 'O alvo está longe demais — aproxima-te com <b>Mover</b> e tenta outra vez.';
    }
    return tapado
      ? `<b>${nomeCena(alvoId)}</b> — o caminho até ele está tapado por outras figuras — aproxima-te com <b>Mover</b> antes de atacar.`
      : `<b>${nomeCena(alvoId)}</b> está longe demais — aproxima-te com <b>Mover</b> antes de atacar.`;
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
    return `A mover <b>Ong</b> · restam <b>${fmtM(reservaMovimento)}</b> — toca numa casa acesa ou anda pelas <b>setas do teclado</b>, casa a casa. As setas seguem o mapa.`;
  }
  function entrarMover() {
    const u = unidade(selecionada);
    if (!u) return;
    if (estado === 'movendo' || view.getState().moving) { say('Espera — a figura ainda está a andar.'); return; }
    if (reservaMovimento < CASA_M) {
      say(`A <b>Ong</b> andou o que podia andar nesta vez — prime <b>Atacar</b> ou <b>Encerrar</b>.`);
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
    say(`A <b>Ong</b> andou o que podia andar nesta vez — prime <b>Atacar</b> ou <b>Encerrar</b>.`);
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
    ataquePendente = null;
    const seguinte = ordem[indiceVez];
    if (seguinte === PROPRIA) {
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
        if (fraseMorte) say(fraseMorte + ` Vez de <b>${nomeCena(ordem[indiceVez])}</b>.`);
        return;
      }
      iniciarVez(PROPRIA);
      say(avisoInicioVez
        ? `${avisoInicioVez} É a vez da <b>Ong</b> (rodada ${rodada}).`
        : `É a vez da <b>Ong</b> (rodada ${rodada}).`);
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
    say(aposOng
      ? `Vez da <b>Ong</b> encerrada — a batalha continua. Vez de <b>${nomeCena(id)}</b>.${fraseLevantar}`
      : `Vez de <b>${nomeCena(id)}</b>.${fraseLevantar}`);
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
    const s = vlabResolverAtaqueCompleto(id, PROPRIA, { modoDesgraca: 'sorte' });
    if (s.erro) {
      supRegistar('bloqueada', { acao: 'ataque', actor: id, razao: s.erro.codigo });
      if (s.erro.codigo === 'ARMA_QUEBRADA')
        say(`<b>${nomeCena(id)}</b> não consegue atacar — a arma dele está partida.`);
      return;
    }
    if (s.resultado === 'falhaCritica') {
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
      ? 'Os inimigos caíram todos — <b>vitória</b> da <b>Ong</b> nesta batalha. Prime <b>Recomeçar</b> para jogar outra vez.'
      : causa === 'estabilizada'
      ? 'A <b>Ong</b> caiu, mas estabilizou — fim desta batalha. Prime <b>Recomeçar</b> para jogar outra vez.'
      : 'A <b>Ong</b> caiu — fim desta batalha. Prime <b>Recomeçar</b> para jogar outra vez.');
  }
  /* Terminar a batalha (M-014): a saída que a especificação reserva
     à mesa — fecha o encontro a meio, SEM a Ong cair (sem setVivo):
     é um fim declarado, não uma queda. O registo do Supervisor marca
     a origem ('terminar') para o fim declarado se distinguir do fim
     natural no registo exportado. */
  function terminarBatalha() {
    supRegistar('fim', { actor: PROPRIA, danoSofrido, origem: 'terminar' });
    continuarAposApresentacao = false;   // terminal — nenhum Continuar diferido sobrevive
    batalhaFim = true;
    seqTurno++;                              // invalida continuações pendentes
    if (contextoIA) consumirContextoIA(contextoIA.id);
    estado = 'fim';
    atualizarVez(); renderAcoes();
    say('A batalha <b>terminou</b> — a mesa fechou este encontro. Prime <b>Recomeçar</b> para jogar outra vez.');
  }

  /* ---------- acções da faixa ---------- */
  /* Handler nomeado (T1.5): o clique da faixa e o controlador do
     Modo automático chamam a MESMA função — o pipeline legal é um
     só; o automático não duplica resolução nenhuma. */
  async function tratarAcao(acao) {
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
       de acontecer. As acções de combate devolvem também a frase e
       a limpeza necessária: uma validação por chamada, partilhada
       pela casca e pelo registo. As restantes acções mantêm as
       guardas existentes. */
    const bloqueioSup = supValidarAcaoOng(acao);
    if (bloqueioSup) {
      supRegistar('bloqueada', { acao, actor: PROPRIA, razao: bloqueioSup.razao });
      if (bloqueioSup.mensagem) {
        if (bloqueioSup.limparPendente) {
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
      if (!VLAB_MOTOR) { say('O motor de combate não respondeu — tenta outra vez.'); return; }
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
      // Abrir a gaveta não escolhe alvo: técnicas sobre si própria
      // ficam acessíveis; o Chicote valida o seu alvo ao ser escolhido.
      estado = 'atacar'; renderAcoes();
      say(alvo
        ? `Atacar <b>${nomeCena(alvo)}</b> com a <b>Ong</b> · escolhe o ataque na faixa.`
        : 'Escolhe o Chicote ou a Transformação da <b>Ong</b>. A Transformação é sobre si própria.');
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
      if (estado !== 'base') { say('Primeiro volta às acções base.'); return; }
      /* M-014: pedir a confirmação — a batalha não fecha por um toque. */
      estado = 'confirmar-fim'; renderAcoes();
      say(`Terminar esta batalha? A rodada ${rodada} fica por fechar — prime <b>Sim, terminar</b> para fechar, ou <b>Voltar</b> para continuar a jogar.`);
      return;
    }
    if (acao === 'terminar-sim') {
      /* LB-C-05: terminar-sim só a partir de confirmar-fim — directo
         da base (ou de outro estado) não fecha a batalha. */
      if (estado !== 'confirmar-fim') { say('Primeiro prime <b>Terminar</b> para confirmar.'); return; }
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
        say(`O ${c.arma} está partido — só volta a servir depois de consertado.`);
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
          say('O ataque não se resolveu — tenta outra vez.');
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
      say(`${c.arma} de <b>Ong</b> contra <b>${nomeCena(alvo)}</b> · <b>${rol.expressao} → ${soma} = ${rol.total}</b>${notaVD} · prime <b>Confirmar</b> para saber se acertou.`);
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
        ? `Transformação · custa <b>${t.custo} PA</b> dos ${livre} livres — ficarias com <b>${livre - t.custo}</b> de alma livre · o Chicote passa a 8d6+34 e a Defesa dela sobe.`
        : `Transformação · custa <b>${t.custo} PA</b> e a alma livre dela é ${livre} — não chega.`);
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
      if (fcProp && fcProp.requerConfirmacao) {
        const s2 = vlabResolverAtaqueCompleto(PROPRIA, alvo, {
          modoDesgraca: 'escolha', semente: pend.semente, verificacao: pend.verificacao,
          desgracaEscolhida: fcProp.desgraca.id,
          confirmacaoDeProposta: { proposta: fcProp.desgraca.id } });
        /* Pós-Crítico 3 (achado 4): se a segunda chamada falhar, o
           Confirmar ABORTA — nunca se continua com a saída da
           proposta (que não aplica efeito nenhum): sem PA cobrado,
           sem frase de desgraça, erro nomeado no registo. */
        if (s2.erro) {
          supRegistar('bloqueada', { acao: 'ataque', actor: PROPRIA, alvo, razao: s2.erro.codigo });
          say('O ataque não se resolveu — tenta outra vez.');
          return;
        }
        s = s2;
      }
      if (s.erro) {
        supRegistar('bloqueada', { acao: 'ataque', actor: PROPRIA, alvo, razao: s.erro.codigo });
        say('O ataque não se resolveu — tenta outra vez.');
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
        const fc = vlabAplicarAtacanteDepois(PROPRIA, s);
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
  }
  function fecharFicha() { fichaAberta = null; fichaEl.hidden = true; chipEl.hidden = false; }
  fichaEl.addEventListener('click', e => {
    if (e.target.closest('[data-fechar]')) fecharFicha();
    else if (e.target.closest('[data-declarar-defender]')) {
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
    if (supCongelado) { say('A batalha parou — prime <b>Recomeçar</b>.'); return; }
    // Na vez de um monstro (ou no fim), o chip responde como os
    // toques: frase de espera (§1.5); a ficha dela vê-se antes e depois.
    if (vezAtual !== PROPRIA || batalhaFim) { fraseEsperaVez(); return; }
    // Passo de seta em curso: o toque não cancela o passo (E-T13L-2).
    if (estado === 'mover' && (passoEmCurso || view.getState().moving)) { say('Espera — ainda está a andar.'); return; }
    if (estado === 'movendo') { say(`Espera — <b>${nomeCena(selecionada)}</b> ainda está a andar.`); return; }
    /* M-010: com um resultado por ler (estado 'resultado' ou gesto
       do golpe ainda a decorrer), o chip também não destrói a saída:
       responde com a frase de espera e a ficha fica para depois do
       Continuar. */
    if (estado === 'resultado' || apresentacaoEmCurso) { say('Prime <b>Continuar</b> para seguir.'); return; }
    /* J1 (carta IBX-213): com uma rolagem por resolver, o chip
       também não a destrói — a ficha fica para depois do
       Confirmar, como já acontece com o resultado (M-010). */
    if (rolagemPorResolver()) { say(FRASE_ROLAGEM_PENDENTE); return; }
    if (estado === 'mover') limparAjudaMover();
    estado = 'base'; ataquePendente = null;
    selecionar(PROPRIA); abrirFicha(PROPRIA); renderAcoes();
    say('A tua ficha, <b>Ong</b>.');
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
    /* M-010: enquanto houver um resultado por ler — estado
       'resultado' (antes OU depois do gesto) ou apresentação do
       golpe ainda em curso — o toque NÃO troca de alvo, NÃO repõe o
       estado e NÃO apaga o ataquePendente: responde com a frase de
       espera que o toque no chão já usava neste estado, e o
       Continuar e a frase do golpe sobrevivem. (Antes, o ramo de
       figura repunha estado='base' e ataquePendente=null também a
       partir de 'resultado' — era assim que a saída se destruía.) */
    if (estado === 'resultado' || apresentacaoEmCurso) { say('Prime <b>Continuar</b> para seguir.'); return; }
    /* J1 (carta IBX-213): com uma rolagem por resolver, o toque
       também não troca de alvo nem a apaga — a rolagem fica até
       ao Confirmar (a protecção do M-010, um estado mais cedo,
       sobre as figuras e sobre o chão). */
    if (rolagemPorResolver()) { say(FRASE_ROLAGEM_PENDENTE); return; }
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
        if (estado === 'atacar' || estado === 'rolagem' || estado === 'consumivel' || estado === 'confirmar-fim') {
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
      else if (estado === 'atacar' || estado === 'rolagem' || estado === 'consumivel' || estado === 'confirmar-fim') {
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
      vlabCapturarPartida(destino.path);   // tranche VLAB: adjacências à partida + meio do caminho
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
    /* SAVES (S-CRIT-05, porta C-23): moveend tardio de um monstro com
       restauro pendente — a animação velha pousou a figura fora do
       estado restaurado; reafirma a posição DESTA figura a partir
       do pendente (o pendente em si fica: a Ong pode precisar dele,
       e o ramo de época dela, acima, é quem o consome). */
    if (supRestauroPendente && u.id !== PROPRIA) {
      const suR = supRestauroPendente.find(s => s.id === u.id);
      if (suR && (u.posicao.x !== suR.x || u.posicao.y !== suR.y)) {
        supRestaurando = true;
        view.move(u.id, casaVista({ x: suR.x, y: suR.y }), { immediate: true });
        supRestaurando = false;
      }
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
        const fraseSaida = vlabResolverSaidaAdjacencia({ ...partiu, adjacentes: sairamDaZona });
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
  /* S-001+M-016: o botão de alertas é superfície do Supervisor —
     só existe no HTML da vista do Mestre (mestre.html). Na vista
     da Party o elemento não está na página: sem elemento, sem
     ouvinte, sem superfície. */
  const btnAlertaEl = $('btn-alerta');
  if (btnAlertaEl) btnAlertaEl.addEventListener('click', () => say(supAlertas.length
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
    if (atacou) { tratarAcao('encerrar'); return; }
    if (autoAtaqueRecusado) { tratarAcao('encerrar'); return; }   // D-REC-01: sem outra acção ofensiva do controlador (Transformação e consumível nunca são automáticos), a vez encerra
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
      mensagem: 'Primeiro <b>toca no inimigo</b> que queres atacar — ele fica marcado como alvo.' };
    const u = unidade(alvo);
    if (!u || u.vivo === false) return { razao: 'O alvo já não está na batalha',
      mensagem: 'O alvo já não está na batalha — escolhe outro inimigo.' };
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
        mensagem: 'Espera — a figura ainda está a andar.' };
      if (atacou) return { razao: 'A Ong já atacou nesta vez',
        mensagem: 'A <b>Ong</b> já atacou nesta vez — prime <b>Encerrar</b> para fechar a vez dela.' };
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
      if (estado !== 'atacar' || atacou)
        return { razao: 'Ataque básico sem condições para acontecer', duro: true };
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
    continuarAposApresentacao = false;   // R1-Priv: o Continuar diferido morre no gelo — não atravessa épocas
    supEpoca++;                          // guarda de época: moveend tardio dela não acerta contas
    supDesarmarGuardaMovimentoOng();
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
      say(`A batalha parou por um erro do jogo — prime <b>Recomeçar</b>. Se puderes, diz ao Mestre que parou no erro nº ${supAlertas.length}.`);
    }
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
      danoSofrido, paGasto, transformada, reservaMovimento, atacou, alvo,
      /* Tranche VLAB (pós-Crítico 3, achado 5): o estado do motor
         (estados, arma caída/quebrada, desvantagem, deslocamento a
         metade, reacção, corrida de morte) TAMBÉM entra no snapshot
         — voltar a um turno anterior repõe o combate inteiro, não
         só a casca clássica. Cópia profunda: o snapshot é um valor,
         nunca uma referência viva. */
      vlab: JSON.parse(JSON.stringify(ESTADO_VLAB))
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
    if (Object.keys(e).some(k => !chavesEstado.includes(k))) return INV;
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
       morta ⇒ dano >= Vida total (é assim que fimDeBatalha nasce). */
    if (ongU.vivo ? o.danoSofrido >= FICHAS.ong.vida.total
                  : o.danoSofrido < FICHAS.ong.vida.total) return INV;
    if (!inteiro(o.paGasto) || o.paGasto < 0 || o.paGasto > FICHAS.ong.alma.total) return INV;
    if (typeof o.transformada !== 'boolean' || typeof o.atacou !== 'boolean') return INV;
    if (!finito(o.reservaMovimento) || o.reservaMovimento < 0
      || o.reservaMovimento > DESLOCAMENTO_ONG_M + 1e-9) return INV;
    /* VOLTA 2 (S-CONF-03): a reserva anda casa a casa (CASA_M =
       1,5 m) — tem de ser MÚLTIPLO de 1,5 (tolerância 1e-9);
       7,3 passa a inválido. */
    { const passosReserva = o.reservaMovimento / CASA_M;
      if (Math.abs(passosReserva - Math.round(passosReserva)) > 1e-9) return INV; }
    if (o.alvo !== null && (!ids.includes(o.alvo) || o.alvo === PROPRIA
      || porId(o.alvo).vivo !== true)) return INV;   // alvo-próprio ou morto
    if (typeof e.batalhaFim !== 'boolean') return INV;
    /* VOLTA 2 (S-CONF-03): coerência de fase — fase 'fim' ⇔
       batalhaFim; fase 'vez-ia' ⇒ vez não é a Ong (e vez da Ong ⇒
       fase não é 'vez-ia': é a mesma porta, vista dos dois lados). */
    if ((e.fase === 'fim') !== e.batalhaFim) return INV;
    if (e.fase === 'vez-ia' && e.vez === PROPRIA) return INV;
    if (e.batalhaFim !== !ongU.vivo) return INV;     // batalhaFim coerente
    /* consumiveis (correcção nomeada 5): a v2 NÃO tem inventário —
       lista não-vazia é REJEITADA, nunca descartada em silêncio. */
    if (!Array.isArray(e.consumiveis) || e.consumiveis.length !== 0) return INV;
    const d = e.dados;
    if (!d || typeof d !== 'object') return FALTA;
    if (Object.keys(d).some(k => !['estado', 'roladas'].includes(k))) return INV;
    if (!inteiro(d.estado) || d.estado < 0 || d.estado > 4294967295) return INV;
    if (!inteiro(d.roladas) || d.roladas < 0 || d.roladas > 1000000) return INV;
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
      if (emVoo || estado === 'movendo' || estado === 'rolagem'
        || apresentacaoEmCurso || passoEmCurso || ataquePendente != null
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
        vlab: JSON.parse(JSON.stringify(ESTADO_VLAB))
      };
    },
    aplicar(e) {
      if (!ponteSavesActiva) return { ok: false, erro: 'SAVE_PONTE_INACTIVA' };
      /* Validação total ANTES de tocar em qualquer coisa: save
         inválido não muda NADA (também fora do caminho UI). */
      const erroVal = validarEstadoParaAplicar(e);
      if (erroVal) return { ok: false, erro: erroVal };
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
        supDesarmarGuardaMovimentoOng();
        geracaoAuto++;
        if (relogioAuto) { clearTimeout(relogioAuto); relogioAuto = null; }
        seqTurno++;
        if (contextoIA) consumirContextoIA(contextoIA.id);
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
              : (preSave.fase === 'movendo' || preSave.fase === 'rolagem') ? 'base'
              : preSave.fase;
            try { atualizarChipVida(); } catch (__) {}
            try { atualizarVez(); renderAcoes(); } catch (__) {}
          }
        } catch (__) { /* a reposição é tentativa: o erro nomeado sai na mesma */ }
        supRestauroPendente = null;
        supRestaurando = false;
        return { ok: false, erro: 'SAVE_APLICACAO_FALHOU' };
      }
    }
  });

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
    say('É a vez da <b>Ong</b>. Prime <b>Mover</b> e toca numa casa acesa para andar.'
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
      : 'Não foi possível preparar as figuras. A batalha não começou. Prime Tentar de novo.';
    renderAcoes(); say('');
  });
})();
