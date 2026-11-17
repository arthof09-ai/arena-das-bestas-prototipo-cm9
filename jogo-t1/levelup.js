'use strict';
/*
 * levelup.js — Motor de progressão de fichas do RPG Assimilação (frente LEVEL UP)
 *
 * Implementa o contrato da ENCOMENDA-LEVEL-UP §4:
 *  - Leitura: classificacao / rank / dadoProgressao com valor/estado/prov,
 *    prioridade de fontes `Rank:` > `Classificação:` > título (ENC-LU §1).
 *    Divergência entre fontes = UNRESOLVED_RANK_CONFLICT, NENHUM rank/dado
 *    inferido (ENC-LU §0.2/§6; LEVELUP-REFERENCIA §2.7).
 *  - Progressão: aplicarProgressao(ficha, evento) -> { fichaNova,
 *    reciboDeDiferencas, erro } — função PURA, determinística, NÃO escreve
 *    em lado nenhum. Sem Date, sem Math.random: rolagens só por faces
 *    injectadas (LACUNA-U3 — comportamento seguro).
 *  - A fórmula de Vida/Alma máximas na progressão (CAN-07 / DEP-LU-1) TEM
 *    fonte: CRIACAO_FICHA, Regra 5 (snapshot canónico) — crescimento e
 *    reajuste implementados em aplicarCrescimento. À parte disso, mudanças
 *    de recursos máximos (vidaTotal/almaTotal) só entram como delta
 *    DECLARADO no evento, com gatilho e regra citada (espelho de
 *    EV-PROG-06 do Motor Unificado), ou são recusadas.
 *  - Correcções pós-bancada (Crítico Adversarial, 03/11/2026): fonte de
 *    rank presente mas ilegível nunca rende «lido» limpo
 *    (FONTE_RANK_ILEGIVEL); T9 exige elegibilidade comprovada e debita;
 *    privacidade por remoção recursiva de chaves sensíveis; erros
 *    nomeados em vez de excepções (FICHA_NAO_CLONAVEL,
 *    FICHA_COM_VALORES_NAO_FINITOS); tabelas exportadas congeladas.
 *    O clone é JSON: campos não-JSON (Date, funções) não sobrevivem —
 *    limitação declarada, valores não-finitos são recusados à entrada.
 *
 * v2 (Missão Autónoma 2, 03/11/2026 — pós-decisões do Mestre):
 *  - Gatilho de subida por FA (Força da Alma = XP): limiares canónicos
 *    importados da página «Sistema de FA», Regra 1 (Notion do Mestre,
 *    lida só-leitura); derivação em derivarEstagioPorFA e integração nas
 *    subidas via evento.gatilhoFA (R-26/R-27).
 *  - Decisão 2b do questionário: perícias NÃO se ganham ao subir
 *    (PERICIA_NAO_SE_GANHA_AO_SUBIR, R-30); slots por nível NÃO existem
 *    (sem tecto — os 16 são moldura TEST do P12, R-31); proficiência
 *    deriva da classificação (lerProficiencia, R-28); mudança de
 *    classificação regista o direito a 1 ganho habilidade|magia|tecnica
 *    em PROPOSTA_PARA_O_MESTRE (R-29) — conteúdo nunca inventado.
 *  - O contrato de LEITURA (lerProgressao) está INTOCADO em relação à
 *    v1: é o que o jogo integra (SHA v1 3b5892f9…cfe).
 *
 * Sem dependências. Node >= 18. Uso: require('./levelup.js') ou
 * <script> no navegador (window.LevelUp).
 */

// ---------------------------------------------------------------- tabelas
var ESCALOES = ['Bronze', 'Prata', 'Ouro', 'Ouro Negro', 'Lendário'];

// Regra 2 do Sistema de Combate (cânone, ENC-LU §1/§6): dado de progressão.
var DADO_PROGRESSAO = {
  'Bronze':    { qtd: 1, faces: 6, bonus: 0, texto: '1d6' },
  'Prata':     { qtd: 2, faces: 6, bonus: 0, texto: '2d6' },
  'Ouro':      { qtd: 3, faces: 6, bonus: 0, texto: '3d6' },
  'Ouro Negro':{ qtd: 4, faces: 6, bonus: 0, texto: '4d6' },
  'Lendário':  { qtd: 6, faces: 6, bonus: 0, texto: '6d6' }
};

// Custos T9 (Transformação Demoníaca) por classificação — fonte TEST
// P23-041 (chats do LEVEL UP): Prata 40, Ouro 80, Ouro Negro 160,
// Lendário 320 PA; Bronze proibido (elegível só de Prata 1★ para cima).
var CUSTO_T9 = { 'Bronze': null, 'Prata': 40, 'Ouro': 80, 'Ouro Negro': 160, 'Lendário': 320 };

// Slots de habilidades da Besta assimilada por classificação do Orc (T5,
// errata P12): 2/3/4/5 — Prata/Ouro/Ouro Negro/Lendário. Bronze: 0 (sem
// assimilação antes de Prata 1★). TAP = 11 x ordinal (ver REGRAS-LEVEL-UP).
var SLOTS_BESTA_T5 = { 'Bronze': 0, 'Prata': 2, 'Ouro': 3, 'Ouro Negro': 4, 'Lendário': 5 };

// Moldura das fichas TEST geradas pelo P12: 16 posições de equipamento
// por ficha. NÃO é regra de progressão nem tecto (Decisão 2b/R-31:
// slots por nível não existem; governa a capacidade/Carga). Fica aqui
// só como constante declarada de moldura, para ninguém a ler como regra.
var MOLDURA_SLOTS_TEST = 16;

// Limiares de progressão por FA — metas CUMULATIVAS de FA/XP para
// ALCANÇAR cada estágio (índice = ordinal-1, ordinal 1..25).
// Fonte: página canónica «Sistema de FA» (Notion do Mestre, RPG /
// Sistema), Regra 1 — XP necessário para progressão + «Leitura da
// tabela». NÃO confundir com a Regra 2 da mesma página (FA-base de
// Núcleos — função diferente, a própria página o avisa).
var LIMIARES_FA = [100, 300, 600, 1000, 1500, 3000, 4700, 6600, 8700, 11000,
  22000, 33300, 44900, 56800, 69000, 138000, 207400, 277200, 349200, 421600,
  843200, 1256300, 1687900, 2111000, 2534600];

// Bónus de proficiência por classificação — SÓ onde há fonte
// (CRIACAO_FICHA, Regra 7 + reconciliação normativa nela registada).
// Prata e Ouro estão INTENCIONALMENTE ausentes: sem escala consolidada
// na Regra 7; os +4/+6 TEST do laboratório Orc NÃO entram aqui.
var BONUS_PROFICIENCIA_FONTE = {
  'Bronze':    { valor: 2,  estado: 'canone' },
  'Ouro Negro':{ valor: 10, estado: 'precedente-documentado' },
  'Lendário':  { valor: 20, estado: 'precedente-documentado' }
};

var ATRIBUTOS = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'];

function ordinalDe(classificacao, numeral) {
  var i = ESCALOES.indexOf(classificacao);
  if (i < 0 || !Number.isInteger(numeral) || numeral < 1 || numeral > 5) return null;
  return i * 5 + numeral; // 1..25
}
function rankDeOrdinal(ordinal) {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 25) return null;
  return { classificacao: ESCALOES[Math.floor((ordinal - 1) / 5)], numeral: ((ordinal - 1) % 5) + 1 };
}
var CLONE_FALHOU = { __cloneFalhou: true };
function clonar(x) {
  if (x === undefined) return undefined;
  try { return JSON.parse(JSON.stringify(x)); } catch (e) { return CLONE_FALHOU; }
}
function textoNaoVazio(x) { return typeof x === 'string' && x.trim() !== ''; }
// Detecta NaN/Infinity em qualquer profundidade (o clone JSON convertê-
// los-ia em null em silêncio). Seguro contra ciclos (conjunto de vistos).
function temValorNaoFinito(x, vistos) {
  if (typeof x === 'number') return !Number.isFinite(x);
  if (x && typeof x === 'object') {
    vistos = vistos || new Set();
    if (vistos.has(x)) return false;
    vistos.add(x);
    return Object.keys(x).some(function (k) { return temValorNaoFinito(x[k], vistos); });
  }
  return false;
}

// ---------------------------------------------------------------- leitura
// Analisa um texto bruto de rank ("Prata 3", "Ouro Negro 2★", "Lendário 5").
// Devolve {classificacao, numeral} ou null se não analisar sem ambiguidade.
function analisarRank(texto) {
  if (typeof texto !== 'string') return null;
  var t = texto.replace(/★/g, ' ').replace(/\s+/g, ' ').trim();
  // Numeral arábico (envelopes/testes) OU romano (formato real das fichas:
  // «Ouro Negro V», DESENHO-MOTOR-UNIFICADO §2.3/EM-D-ID).
  var m = /^(Bronze|Prata|Ouro Negro|Ouro|Lendário|Lendario)\s+([1-5]|I{1,3}|IV|V)$/.exec(t);
  if (!m) return null;
  var cls = m[1] === 'Lendario' ? 'Lendário' : m[1];
  var romanos = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
  var numeral = /^[1-5]$/.test(m[2]) ? parseInt(m[2], 10) : romanos[m[2]];
  return { classificacao: cls, numeral: numeral };
}

/*
 * lerProgressao(ficha) — leitura do contrato §4.
 * ficha.fontesRank: { rotuloRank?, rotuloClassificacao?, titulo? } — textos
 * brutos tal como escritos, cada um com a sua proveniência implícita no nome.
 * Prioridade de leitura (Motor de Fichas): Rank: > Classificação: > título.
 * Se TODAS as fontes presentes concordarem -> estado 'lido'.
 * Se discordarem -> estado 'divergente', erro UNRESOLVED_RANK_CONFLICT,
 * safe_to_apply_rank_rules=false e dadoProgressao NÃO é derivado.
 * Sem nenhuma fonte legível -> erro FICHA_SEM_RANK_LEGIVEL.
 */
function lerProgressao(ficha) {
  var fontes = (ficha && ficha.fontesRank) || {};
  var ordem = [
    { chave: 'rotuloRank', rotulo: 'Rank:' },
    { chave: 'rotuloClassificacao', rotulo: 'Classificação:' },
    { chave: 'titulo', rotulo: 'título' }
  ];
  var lidas = [];
  ordem.forEach(function (f) {
    var bruto = fontes[f.chave];
    if (typeof bruto === 'string' && bruto.trim() !== '') {
      lidas.push({ fonte: f.rotulo, textoBruto: bruto, rank: analisarRank(bruto) });
    }
  });
  // Chaves desconhecidas com texto presente: fonte que não sabemos ler —
  // nunca ignorada em silêncio (ataque do Crítico Adversarial, item 1).
  var chavesConhecidas = ordem.map(function (f) { return f.chave; });
  Object.keys(fontes).forEach(function (k) {
    if (chavesConhecidas.indexOf(k) < 0 && typeof fontes[k] === 'string' && fontes[k].trim() !== '') {
      lidas.push({ fonte: 'desconhecida:' + k, textoBruto: fontes[k], rank: null });
    }
  });
  var base = { classificacao: null, rank: null, dadoProgressao: null, erro: null };
  var legiveis = lidas.filter(function (l) { return l.rank !== null; });
  var ilegiveis = lidas.filter(function (l) { return l.rank === null; });
  if (legiveis.length > 0 && ilegiveis.length > 0) {
    // Fonte presente mas ilegível: a leitura NÃO é limpa — devolver
    // 'lido' a partir de outra fonte esconderia uma divergência potencial.
    base.erro = { codigo: 'FONTE_RANK_ILEGIVEL', fontesIlegiveis: ilegiveis.map(function (l) { return { fonte: l.fonte, textoBruto: l.textoBruto }; }), safe_to_apply_rank_rules: false };
    ['classificacao', 'rank', 'dadoProgressao'].forEach(function (c) {
      base[c] = { valor: null, estado: 'nao-lido', prov: { fontes: lidas.map(function (l) { return l.fonte; }) } };
    });
    return base;
  }
  if (legiveis.length === 0) {
    base.erro = { codigo: 'FICHA_SEM_RANK_LEGIVEL', fontes: lidas.map(function (l) { return { fonte: l.fonte, textoBruto: l.textoBruto }; }), safe_to_apply_rank_rules: false };
    ['classificacao', 'rank', 'dadoProgressao'].forEach(function (c) {
      base[c] = { valor: null, estado: 'nao-lido', prov: { fontes: lidas.map(function (l) { return l.fonte; }) } };
    });
    return base;
  }
  var primeiro = legiveis[0].rank;
  var conflito = legiveis.some(function (l) {
    return l.rank.classificacao !== primeiro.classificacao || l.rank.numeral !== primeiro.numeral;
  });
  if (conflito) {
    base.erro = {
      codigo: 'UNRESOLVED_RANK_CONFLICT',
      fontesEmConflito: legiveis.map(function (l) { return { fonte: l.fonte, textoBruto: l.textoBruto }; }),
      safe_to_apply_rank_rules: false
    };
    ['classificacao', 'rank', 'dadoProgressao'].forEach(function (c) {
      base[c] = { valor: null, estado: 'divergente', prov: { fontes: legiveis.map(function (l) { return { fonte: l.fonte, textoBruto: l.textoBruto }; }) } };
    });
    return base;
  }
  var prov = { fonte: legiveis[0].fonte, textoBruto: legiveis[0].textoBruto, fontesConsultadas: legiveis.map(function (l) { return l.fonte; }) };
  var dado = DADO_PROGRESSAO[primeiro.classificacao];
  base.classificacao = { valor: primeiro.classificacao, estado: 'lido', prov: clonar(prov) };
  base.rank = { valor: primeiro.numeral, estado: 'lido', prov: clonar(prov) };
  base.dadoProgressao = { valor: clonar(dado), estado: 'derivado', prov: { regra: 'Sistema de Combate, Regra 2', de: primeiro.classificacao } };
  return base;
}

/*
 * derivarEstagioPorFA(fa) — gatilho de subida (Decisão 2a; R-26/R-27).
 * fa = FA/XP FINAL já assimilada e registada (o ganho bruto passa pela
 * ordem de cálculo da página de FA — este motor não recalcula ganhos).
 * Estágio devido = maior ordinal cuja meta cumulativa (LIMIARES_FA) é
 * <= fa. fa < 100 -> devido 0 (abaixo de Bronze 1, nomeado, sem erro
 * de ficha). Devolve {erro} nomeado se a FA não for número finito >= 0.
 */
function derivarEstagioPorFA(fa) {
  if (typeof fa !== 'number' || !Number.isFinite(fa)) {
    return { erro: 'FA_INVALIDA', detalhe: { fa: typeof fa === 'number' ? String(fa) : (fa === null ? null : typeof fa), motivo: 'FA tem de ser um número finito >= 0' } };
  }
  if (fa < 0) return { erro: 'FA_INVALIDA', detalhe: { fa: fa, motivo: 'FA negativa' } };
  var devido = 0;
  for (var i = 0; i < LIMIARES_FA.length; i++) {
    if (fa >= LIMIARES_FA[i]) devido = i + 1; else break;
  }
  return {
    erro: null, fa: fa, ordinalDevido: devido,
    estagioDevido: devido > 0 ? rankDeOrdinal(devido) : null,
    metaDoDevido: devido > 0 ? LIMIARES_FA[devido - 1] : 0,
    proximaMeta: devido < 25 ? { ordinal: devido + 1, estagio: rankDeOrdinal(devido + 1), meta: LIMIARES_FA[devido] } : null,
    regra: 'Sistema de FA, Regra 1 (metas cumulativas de XP/FA)'
  };
}

/*
 * lerProficiencia(ficha) — proficiência DERIVA da classificação
 * (Decisão 2b; R-28). Devolve o bónus de proficiência das perícias
 * treinadas só onde há fonte (BONUS_PROFICIENCIA_FONTE): Bronze +2 é
 * cânone (Regra 7); Ouro Negro +10 e Lendário +20 são precedentes
 * documentados na reconciliação da Regra 7 (estado declarado, não
 * disfarçado de cânone); Prata/Ouro -> PROFICIENCIA_SEM_ESCALA_
 * CONSOLIDADA com valor null — os +4/+6 TEST nunca são devolvidos.
 * Erros de leitura de rank propagam-se (conflito/sem rank/ilegível).
 */
function lerProficiencia(ficha) {
  var leitura = lerProgressao(ficha);
  if (leitura.erro) {
    return { valor: null, estado: leitura.classificacao ? leitura.classificacao.estado : 'nao-lido', erro: leitura.erro, prov: null };
  }
  var cls = leitura.classificacao.valor;
  var fonte = BONUS_PROFICIENCIA_FONTE[cls];
  if (!fonte) {
    return { valor: null, estado: 'nao-consolidado',
      erro: { codigo: 'PROFICIENCIA_SEM_ESCALA_CONSOLIDADA', classificacao: cls, nota: 'Regra 7 não consolida escala para Prata/Ouro; calibração TEST (+4/+6) não é devolvida como valor' },
      prov: { regra: 'CRIACAO_FICHA, Regra 7 (reconciliação normativa)', decisao: 'DECISOES-QUESTIONARIO 2b — proficiência depende da classificação' } };
  }
  return { valor: fonte.valor, estado: fonte.estado, erro: null,
    prov: { regra: 'CRIACAO_FICHA, Regra 7', classificacao: cls, naturezaDaFonte: fonte.estado, decisao: 'DECISOES-QUESTIONARIO 2b — proficiência depende da classificação' } };
}

// ---------------------------------------------------------------- progressão
function erroAplicacao(codigo, detalhe) {
  return { fichaNova: null, reciboDeDiferencas: [], erro: { codigo: codigo, detalhe: detalhe || null, safeToApply: false } };
}

// Valida faces injectadas contra o dado de progressão do rank ACTUAL.
// Sem faces, devolve null (a subida não depende de rolagem em nenhuma
// regra com fonte — a rolagem regista-se, nunca decide nem é gerada aqui).
function validarFaces(evento, leitura) {
  if (evento.facesProgressao === undefined || evento.facesProgressao === null) return null;
  var dado = leitura.dadoProgressao.valor;
  var f = evento.facesProgressao;
  if (!Array.isArray(f) || f.length !== dado.qtd) return 'FACES_PROGRESSAO_INVALIDAS';
  for (var i = 0; i < f.length; i++) {
    if (!Number.isInteger(f[i]) || f[i] < 1 || f[i] > dado.faces) return 'FACES_PROGRESSAO_INVALIDAS';
  }
  return null;
}

/*
 * analisarGanhoClassificacao(evento) — valida a declaração opcional
 * evento.ganhoClassificacao da Decisão 2b (R-29): no máximo UM ganho,
 * de um só tipo ('habilidade'|'magia'|'tecnica'), SEM conteúdo — o
 * conteúdo é criação do Mestre e é recusado pelo nome, nunca largado
 * em silêncio. Devolve { erro: codigo|null, tipo: string|null }.
 */
function chaveNorm(k) {
  return String(k).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function analisarGanhoClassificacao(evento) {
  var g = evento.ganhoClassificacao;
  if (g === undefined || g === null) return { erro: null, tipo: null };
  if (typeof g !== 'object' || Array.isArray(g)) return { erro: 'GANHO_CLASSIFICACAO_INVALIDO', tipo: null };
  var norm = {};
  Object.keys(g).forEach(function (k) { norm[chaveNorm(k)] = k; });
  function val(nome) { return norm[nome] ? g[norm[nome]] : undefined; }
  // Perícia escondida no ganho: proibição dura, nomeada (R-30).
  if (norm.pericia || norm.pericias) return { erro: 'PERICIA_NAO_SE_GANHA_AO_SUBIR', tipo: null };
  // Conteúdo é criação do Mestre: recusado pelo nome, nunca largado (R-29).
  var camposConteudo = ['conteudo', 'nome', 'descricao', 'efeito'].filter(function (k) { return norm[k]; });
  if (camposConteudo.length > 0) return { erro: 'GANHO_CONTEUDO_E_CRIACAO_DO_MESTRE', tipo: null };
  // Chaves fora do contrato {tipo, tipos, quantidade}: nada some em silêncio.
  var permitidas = { tipo: 1, tipos: 1, quantidade: 1 };
  var desconhecidas = Object.keys(g).filter(function (k) { return !permitidas[chaveNorm(k)]; });
  if (desconhecidas.length > 0) return { erro: 'CAMPOS_DESCONHECIDOS_NO_EVENTO', tipo: null, detalhe: { onde: 'ganhoClassificacao', chaves: desconhecidas } };
  var quantidade = val('quantidade'), tipos = val('tipos'), tipoDeclarado = val('tipo');
  if (quantidade !== undefined && quantidade !== 1) return { erro: 'GANHO_CLASSIFICACAO_DEVE_SER_UNICO', tipo: null };
  if (tipos !== undefined && !Array.isArray(tipos)) return { erro: 'TIPO_DE_GANHO_INVALIDO', tipo: null };
  if (Array.isArray(tipos) && tipos.length > 1) return { erro: 'GANHO_CLASSIFICACAO_DEVE_SER_UNICO', tipo: null };
  if (tipoDeclarado !== undefined && (typeof tipoDeclarado !== 'string' || !tipoDeclarado)) return { erro: 'TIPO_DE_GANHO_INVALIDO', tipo: null };
  if (Array.isArray(tipos) && tipos.length === 1 && (typeof tipos[0] !== 'string' || !tipos[0])) return { erro: 'TIPO_DE_GANHO_INVALIDO', tipo: null };
  var tipoArray = (Array.isArray(tipos) && tipos.length === 1) ? tipos[0] : null;
  if (tipoDeclarado !== undefined && tipoDeclarado !== null && tipoArray !== null && tipoDeclarado !== tipoArray) {
    return { erro: 'GANHO_CLASSIFICACAO_TIPO_AMBIGUO', tipo: null };
  }
  var tipo = (tipoDeclarado !== undefined && tipoDeclarado !== null) ? tipoDeclarado : tipoArray;
  if (tipo !== null && ['habilidade', 'magia', 'tecnica'].indexOf(tipo) < 0) {
    return { erro: 'TIPO_DE_GANHO_INVALIDO', tipo: null };
  }
  return { erro: null, tipo: tipo };
}

/*
 * aplicarProgressao(ficha, evento) — função pura (ENC-LU §4).
 * Tipos de evento fechados:
 *  SUBIDA_ESTRELA | SUBIDA_CLASSIFICACAO | GANHO_ATRIBUTOS |
 *  MUDANCA_RECURSOS_MAXIMOS | REGISTO_T9 (regista e DEBITA o custo PA,
 *  com elegibilidade comprovada — correcção pós-bancada: o cabeçalho
 *  antigo dizia «só leitura», o comportamento e a bateria dizem débito)
 * Todo o evento exige: id (texto não vazio), regraCitada (texto não
 * vazio), e (para subidas e T9) elegibilidade. Desde a v2 (L-01
 * FECHADA), a elegibilidade de subida tem DOIS canais nomeados:
 * declarada {fonte, valor: true} (registo da mesa/Mestre), ou DERIVADA
 * da FA via evento.gatilhoFA {fa} contra os limiares canónicos
 * (Sistema de FA, Regra 1). Sem nenhum dos dois: ELEGIBILIDADE_
 * NAO_COMPROVADA — nunca inferida em silêncio. Na mudança de
 * classificação regista-se o direito R-29 (1 ganho em proposta).
 */
function aplicarProgressao(ficha, evento) {
  if (!ficha || typeof ficha !== 'object') return erroAplicacao('FICHA_INVALIDA');
  if (!evento || typeof evento !== 'object' || typeof evento.tipo !== 'string') return erroAplicacao('EVENTO_INVALIDO');
  if (!textoNaoVazio(evento.regraCitada)) return erroAplicacao('REGRA_NAO_CITADA', { tipo: evento.tipo });
  if (temValorNaoFinito(ficha)) return erroAplicacao('FICHA_COM_VALORES_NAO_FINITOS');

  var leitura = lerProgressao(ficha);
  if (leitura.erro && leitura.erro.codigo === 'UNRESOLVED_RANK_CONFLICT') {
    return erroAplicacao('UNRESOLVED_RANK_CONFLICT', leitura.erro);
  }

  // Perícia por progressão NÃO existe (Decisão 2b; R-30): a tentativa é
  // nomeada com os caminhos válidos — nunca cai no genérico nem é
  // aplicada em silêncio por outra porta.
  if (/PERICIA/.test(evento.tipo)) {
    return erroAplicacao('PERICIA_NAO_SE_GANHA_AO_SUBIR', { tipo: evento.tipo, caminhosValidos: ['CRIACAO_INICIAL_DA_FICHA', 'ESTUDO_DURANTE_DIAS'], fonte: 'DECISOES-QUESTIONARIO 2b; REGRAS R-30' });
  }

  var tipos = ['SUBIDA_ESTRELA', 'SUBIDA_CLASSIFICACAO', 'GANHO_ATRIBUTOS', 'MUDANCA_RECURSOS_MAXIMOS', 'REGISTO_T9'];
  if (tipos.indexOf(evento.tipo) < 0) return erroAplicacao('EVENTO_DESCONHECIDO', { tipo: evento.tipo });
  if (!textoNaoVazio(evento.id)) return erroAplicacao('EVENTO_SEM_ID', { tipo: evento.tipo });

  // Ganhos acoplados ao evento (Decisão 2b): validação ESTRITA por
  // PRESENÇA de chave (normalizada: caixa/acentos não escondem nada).
  // Perícia acoplada a qualquer evento de progressão é recusada pelo
  // nome; «ganhar slots» é erro de categoria — slots por nível não
  // existem (R-31); qualquer outra chave em `ganhos` é desconhecida do
  // contrato e sai nomeada — nada é ignorado em silêncio (bancada v2.1).
  if (evento.ganhos && typeof evento.ganhos === 'object') {
    var chavesGanhos = Object.keys(evento.ganhos);
    for (var gi = 0; gi < chavesGanhos.length; gi++) {
      var lk = chaveNorm(chavesGanhos[gi]);
      if (lk === 'pericia' || lk === 'pericias') {
        return erroAplicacao('PERICIA_NAO_SE_GANHA_AO_SUBIR', { tipo: evento.tipo, caminhosValidos: ['CRIACAO_INICIAL_DA_FICHA', 'ESTUDO_DURANTE_DIAS'], fonte: 'DECISOES-QUESTIONARIO 2b; REGRAS R-30' });
      }
      if (lk === 'slots' || lk === 'slot' || lk === 'slotsequipamento') {
        return erroAplicacao('SLOTS_POR_NIVEL_INEXISTENTES', { tipo: evento.tipo, fonte: 'DECISOES-QUESTIONARIO 2b; REGRAS R-31', nota: 'Sem slots fixos por nível; governa a capacidade de conseguir/usar/carregar (Carga)' });
      }
      return erroAplicacao('CAMPOS_DESCONHECIDOS_NO_EVENTO', { onde: 'ganhos', chave: chavesGanhos[gi], tipo: evento.tipo });
    }
  }

  if (evento.tipo === 'REGISTO_T9') {
    if (leitura.erro) return erroAplicacao(leitura.erro.codigo, leitura.erro);
    // Elegibilidade comprovada também no T9 (pós-bancada, item 2): sem
    // ela, o registo pagava mesmo com elegibilidade declarada falsa.
    if (!evento.elegibilidade || evento.elegibilidade.valor !== true || !textoNaoVazio(evento.elegibilidade.fonte)) {
      return erroAplicacao('ELEGIBILIDADE_NAO_COMPROVADA', { tipo: evento.tipo });
    }
    var cls = leitura.classificacao.valor;
    var custo = CUSTO_T9[cls];
    if (custo === null) return erroAplicacao('T9_PROIBIDA_EM_BRONZE', { classificacao: cls });
    var paLivre = (ficha.recursos && Number.isFinite(ficha.recursos.paLivre)) ? ficha.recursos.paLivre : null;
    if (paLivre === null) return erroAplicacao('PA_LIVRE_NAO_DECLARADO');
    if (!Number.isInteger(paLivre)) return erroAplicacao('PA_LIVRE_NAO_INTEIRO', { paLivre: paLivre });
    if (paLivre < 0) return erroAplicacao('PA_NEGATIVO', { paLivre: paLivre });
    var nova = clonar(ficha);
    if (nova === CLONE_FALHOU) return erroAplicacao('FICHA_NAO_CLONAVEL');
    if (nova.recursos && nova.recursos.custoDiarioAneisDaAlma !== undefined && nova.recursos.custoDiarioAneisDaAlma !== 0) {
      return erroAplicacao('ANEIS_DA_ALMA_SEM_CUSTO_DIARIO', { valor: nova.recursos.custoDiarioAneisDaAlma });
    }
    var paga = paLivre >= custo;
    var difs = [];
    if (paga) {
      nova.recursos.paLivre = paLivre - custo;
      difs.push({ campo: 'recursos.paLivre', forma: 'normal', antes: paLivre, depois: paLivre - custo, regraCitada: evento.regraCitada, eventoId: evento.id || null, tipoEventoUnificado: null, nota: 'Custo T9 declarado; sem homologação VLAB (registo, não combate)' });
    }
    return { fichaNova: nova, reciboDeDiferencas: difs, erro: null,
      t9: { elegivel: true, custo: custo, paLivreAntes: paLivre, paLivreDepois: paga ? paLivre - custo : paLivre, paga: paga,
            erroSeInsuficiente: paga ? null : 'PA_INSUFICIENTE_PARA_T9' } };
  }

  // Subidas e ganhos exigem rank resolvido.
  if (leitura.erro) return erroAplicacao(leitura.erro.codigo, leitura.erro);
  var erroFaces = validarFaces(evento, leitura);
  if (erroFaces) return erroAplicacao(erroFaces, { facesProgressao: evento.facesProgressao });

  var nova2 = clonar(ficha);
  if (nova2 === CLONE_FALHOU) return erroAplicacao('FICHA_NAO_CLONAVEL');
  // Anéis da Alma: invariante da correcção do Mestre — nunca cobrar custo
  // diário. Verificada UMA vez, antes de qualquer ramo/mutação, para
  // TODOS os tipos de evento (pós-bancada, item 11).
  if (nova2.recursos && nova2.recursos.custoDiarioAneisDaAlma !== undefined && nova2.recursos.custoDiarioAneisDaAlma !== 0) {
    return erroAplicacao('ANEIS_DA_ALMA_SEM_CUSTO_DIARIO', { valor: nova2.recursos.custoDiarioAneisDaAlma });
  }
  var diferencas = [];
  var rankAntes = { classificacao: leitura.classificacao.valor, numeral: leitura.rank.valor };
  var ordinalAntes = ordinalDe(rankAntes.classificacao, rankAntes.numeral);

  function registarRank(rankDepois) {
    diferencas.push({ campo: 'rank', forma: 'normal', antes: rankAntes.classificacao + ' ' + rankAntes.numeral, depois: rankDepois.classificacao + ' ' + rankDepois.numeral, regraCitada: evento.regraCitada, eventoId: evento.id || null, tipoEventoUnificado: 'EV-PROG-01' });
    var dadoAntes = DADO_PROGRESSAO[rankAntes.classificacao], dadoDepois = DADO_PROGRESSAO[rankDepois.classificacao];
    if (dadoAntes.texto !== dadoDepois.texto) {
      diferencas.push({ campo: 'dadoProgressao', forma: 'normal', antes: dadoAntes.texto, depois: dadoDepois.texto, regraCitada: 'Sistema de Combate, Regra 2', eventoId: evento.id || null, tipoEventoUnificado: 'EV-PROG-02' });
    }
    // Actualiza SÓ o rótulo Rank: — as outras fontes (Classificação:,
    // título) preservam-se; apagá-las era perda silenciosa (item 12).
    var fr = nova2.fontesRank || {};
    fr.rotuloRank = rankDepois.classificacao + ' ' + rankDepois.numeral;
    nova2.fontesRank = fr;
    // O par de formas acompanha: o rank é da unidade, não de uma forma só.
    if (nova2.formas && nova2.formas.transformada) {
      diferencas.push({ campo: 'rank', forma: 'transformada', antes: rankAntes.classificacao + ' ' + rankAntes.numeral, depois: rankDepois.classificacao + ' ' + rankDepois.numeral, regraCitada: evento.regraCitada, eventoId: evento.id || null, tipoEventoUnificado: 'EV-PROG-01', nota: 'Par normal/transformada: rank da unidade (LEVELUP-REFERENCIA §2.8)' });
      // Se a forma transformada for um OBJECTO com rank próprio, o dela
      // também avança — senão a fichaNova ficava divergente (item 13).
      var ft = nova2.formas.transformada;
      if (ft && typeof ft === 'object') {
        if (typeof ft.rank === 'string') ft.rank = rankDepois.classificacao + ' ' + rankDepois.numeral;
        if (ft.fontesRank && typeof ft.fontesRank === 'object') ft.fontesRank.rotuloRank = rankDepois.classificacao + ' ' + rankDepois.numeral;
      }
    }
  }

  if (evento.tipo === 'SUBIDA_ESTRELA' || evento.tipo === 'SUBIDA_CLASSIFICACAO') {
    // Canal FA (v2): evento.gatilhoFA presente -> elegibilidade
    // DERIVADA dos limiares canónicos; o canal declarado continua a
    // existir para registos da mesa. Elegibilidade declarada NEGATIVA
    // em simultâneo com gatilhoFA é contradição — falha nomeada.
    var viaFA = evento.gatilhoFA !== undefined && evento.gatilhoFA !== null;
    if (!viaFA) {
      if (!evento.elegibilidade || evento.elegibilidade.valor !== true || !textoNaoVazio(evento.elegibilidade.fonte)) {
        return erroAplicacao('ELEGIBILIDADE_NAO_COMPROVADA', { tipo: evento.tipo });
      }
    } else if (evento.elegibilidade && evento.elegibilidade.valor !== true) {
      return erroAplicacao('ELEGIBILIDADE_NAO_COMPROVADA', { tipo: evento.tipo, motivo: 'elegibilidade declarada não-positiva conflita com gatilhoFA presente' });
    }
    // Ganho de classificação (R-29): só existe na MUDANÇA de
    // classificação; declará-lo numa subida de estrela é erro nomeado.
    var ganhoInfo = { erro: null, tipo: null };
    if (evento.ganhoClassificacao !== undefined && evento.ganhoClassificacao !== null) {
      if (evento.tipo === 'SUBIDA_ESTRELA') {
        return erroAplicacao('GANHO_SO_NA_MUDANCA_DE_CLASSIFICACAO', { tipo: evento.tipo, fonte: 'DECISOES-QUESTIONARIO 2b; REGRAS R-29' });
      }
      ganhoInfo = analisarGanhoClassificacao(evento);
      if (ganhoInfo.erro === 'GANHO_CONTEUDO_E_CRIACAO_DO_MESTRE') {
        return erroAplicacao(ganhoInfo.erro, { tipo: evento.tipo, nota: 'O conteúdo do ganho é criação do Mestre (viabiliza/equilibra/cria); o motor regista só o direito e o tipo' });
      }
      if (ganhoInfo.erro === 'PERICIA_NAO_SE_GANHA_AO_SUBIR') {
        return erroAplicacao(ganhoInfo.erro, { tipo: evento.tipo, caminhosValidos: ['CRIACAO_INICIAL_DA_FICHA', 'ESTUDO_DURANTE_DIAS'], fonte: 'DECISOES-QUESTIONARIO 2b; REGRAS R-30' });
      }
      if (ganhoInfo.erro) return erroAplicacao(ganhoInfo.erro, Object.assign({ tipo: evento.tipo }, ganhoInfo.detalhe || {}));
    }
    var ordinalDepois = ordinalAntes + 1;
    if (ordinalDepois > 25) return erroAplicacao('TETO_MAXIMO_ATINGIDO', { rank: rankAntes });
    var rankDepois = rankDeOrdinal(ordinalDepois);
    if (evento.tipo === 'SUBIDA_ESTRELA' && rankDepois.classificacao !== rankAntes.classificacao) {
      return erroAplicacao('SUBIDA_ESTRELA_ATRAVESSA_CLASSIFICACAO', { rank: rankAntes, usar: 'SUBIDA_CLASSIFICACAO' });
    }
    if (evento.tipo === 'SUBIDA_CLASSIFICACAO' && rankDepois.classificacao === rankAntes.classificacao) {
      return erroAplicacao('SUBIDA_CLASSIFICACAO_SEM_MUDANCA', { rank: rankAntes, usar: 'SUBIDA_ESTRELA' });
    }
    var derivacaoFA = null;
    if (viaFA) {
      var faDeclarada = (evento.gatilhoFA && typeof evento.gatilhoFA === 'object') ? evento.gatilhoFA.fa : evento.gatilhoFA;
      derivacaoFA = derivarEstagioPorFA(faDeclarada);
      if (derivacaoFA.erro) return erroAplicacao(derivacaoFA.erro, { tipo: evento.tipo, detalhe: derivacaoFA.detalhe || null });
      if (ordinalDepois > derivacaoFA.ordinalDevido) {
        return erroAplicacao('FA_INSUFICIENTE_PARA_SUBIDA', { fa: derivacaoFA.fa, ordinalActual: ordinalAntes, ordinalPretendido: ordinalDepois, metaNecessaria: LIMIARES_FA[ordinalDepois - 1], ordinalDevido: derivacaoFA.ordinalDevido, regra: 'Sistema de FA, Regra 1' });
      }
    }
    registarRank(rankDepois);
    if (derivacaoFA) {
      diferencas.push({ campo: 'gatilhoFA', forma: 'normal', antes: null, depois: { fa: derivacaoFA.fa, ordinalDevido: derivacaoFA.ordinalDevido, estagioDevido: derivacaoFA.estagioDevido, metaDoDevido: derivacaoFA.metaDoDevido }, regraCitada: 'Sistema de FA, Regra 1 (limiares) + DECISOES-QUESTIONARIO 2a', eventoId: evento.id || null, tipoEventoUnificado: null, nota: 'Elegibilidade DERIVADA da FA: o passo fica dentro do estágio devido pela tabela canónica' });
    }
    var erroCresc = aplicarCrescimento(nova2, evento, diferencas, rankAntes, rankDepois);
    if (erroCresc) return erroAplicacao(erroCresc, { tipo: evento.tipo });
    if (evento.facesProgressao) {
      diferencas.push({ campo: 'rolagemProgressao', forma: 'normal', antes: null, depois: { faces: clonar(evento.facesProgressao), soma: evento.facesProgressao.reduce(function (a, b) { return a + b; }, 0), dado: leitura.dadoProgressao.valor.texto }, regraCitada: 'Faces injectadas pelo chamador (LACUNA-U3: sem rolagem interna)', eventoId: evento.id || null, tipoEventoUnificado: null });
    }
    if (evento.tipo === 'SUBIDA_CLASSIFICACAO') {
      // Direito R-29 (Decisão 2b): exactamente 1 ganho por mudança de
      // classificação, registado na ficha e no recibo em estado
      // PROPOSTA_PARA_O_MESTRE. Duplicado (mesmo evento OU mesma
      // transição já registada) = erro nomeado — nunca dois direitos
      // pela mesma mudança.
      var prog = nova2.progressao || (nova2.progressao = {});
      if (prog.ganhosPorClassificacao !== undefined && !Array.isArray(prog.ganhosPorClassificacao)) {
        return erroAplicacao('REGISTO_DE_GANHOS_INVALIDO', { eventoId: evento.id, nota: 'progressao.ganhosPorClassificacao existe mas não é uma lista — registo pré-existente nunca é descartado em silêncio' });
      }
      if (!Array.isArray(prog.ganhosPorClassificacao)) prog.ganhosPorClassificacao = [];
      var listaGanhos = prog.ganhosPorClassificacao;
      var deTxt = rankAntes.classificacao + ' ' + rankAntes.numeral;
      var paraTxt = rankDepois.classificacao + ' ' + rankDepois.numeral;
      var duplicado = listaGanhos.some(function (e) {
        if (!e || typeof e !== 'object') return false;
        if (e.eventoId === evento.id) return true;
        if (typeof e.de !== 'string' || typeof e.para !== 'string') return false;
        // Comparação por VALOR analisado (bancada v2.1): um registo
        // pré-existente escrito em romano/★/com espaços não derrota a
        // guarda — compara-se o par de ordinais, não o texto cru.
        var deA = analisarRank(e.de), paraA = analisarRank(e.para);
        if (deA && !deA.erro && paraA && !paraA.erro) {
          if (ordinalDe(deA.classificacao, deA.numeral) === ordinalAntes && ordinalDe(paraA.classificacao, paraA.numeral) === ordinalDepois) return true;
        }
        var normTxt = function (s) { return s.trim().toLowerCase().replace(/\s+/g, ' '); };
        return normTxt(e.de) === normTxt(deTxt) && normTxt(e.para) === normTxt(paraTxt);
      });
      if (duplicado) {
        return erroAplicacao('GANHO_CLASSIFICACAO_DUPLICADO', { eventoId: evento.id, de: deTxt, para: paraTxt, nota: 'Já existe um direito registado para este evento/transição' });
      }
      var direito = { eventoId: evento.id, de: deTxt, para: paraTxt, tipo: ganhoInfo.tipo, estado: 'PROPOSTA_PARA_O_MESTRE' };
      listaGanhos.push(direito);
      diferencas.push({ campo: 'progressao.ganhosPorClassificacao', forma: 'normal', antes: listaGanhos.length - 1, depois: listaGanhos.length, regraCitada: 'DECISOES-QUESTIONARIO 2b; REGRAS R-29', eventoId: evento.id || null, tipoEventoUnificado: null, nota: 'Direito a 1 ganho (habilidade OU magia OU técnica) registado em PROPOSTA_PARA_O_MESTRE — o conteúdo é criação do Mestre; o motor não o inventa', detalhe: clonar(direito) });
    }
    return { fichaNova: nova2, reciboDeDiferencas: diferencas, erro: null };
  }

  if (evento.tipo === 'GANHO_ATRIBUTOS') {
    var deltas = evento.deltas;
    if (!deltas || typeof deltas !== 'object' || Object.keys(deltas).length === 0) return erroAplicacao('DELTAS_EM_FALTA');
    if (!nova2.atributos || typeof nova2.atributos !== 'object') return erroAplicacao('FICHA_SEM_ATRIBUTOS');
    var chaves = Object.keys(deltas);
    for (var i = 0; i < chaves.length; i++) {
      var a = chaves[i];
      if (ATRIBUTOS.indexOf(a) < 0) return erroAplicacao('ATRIBUTO_DESCONHECIDO', { atributo: a });
      if (!Number.isInteger(deltas[a]) || deltas[a] === 0) return erroAplicacao('DELTA_INVALIDO', { atributo: a, delta: deltas[a] });
      if (!Number.isFinite(nova2.atributos[a])) return erroAplicacao('ATRIBUTO_NAO_NUMERICO', { atributo: a });
    }
    // Ganho de nível: se a ficha declarar a taxa racial de pontos por
    // nível (CRIACAO_FICHA, Regra 2 — raças: Humano +2/estrela, Orc +5,
    // Abissiano +5, Asa Prateada +4, Raça Superior +8) e o evento se
    // declarar ganho de nível, o total dos deltas tem de bater a taxa.
    if (evento.ganhoDeNivel === true && nova2.progressao && Number.isFinite(nova2.progressao.pontosAtributoPorNivel)) {
      var soma = chaves.reduce(function (s, a3) { return s + deltas[a3]; }, 0);
      if (soma !== nova2.progressao.pontosAtributoPorNivel) {
        return erroAplicacao('TOTAL_DE_PONTOS_DIVERGE_DA_TAXA', { soma: soma, taxa: nova2.progressao.pontosAtributoPorNivel });
      }
    }
    chaves.forEach(function (a2) {
      var antes = nova2.atributos[a2];
      nova2.atributos[a2] = antes + deltas[a2];
      diferencas.push({ campo: 'atributos.' + a2, forma: 'normal', antes: antes, depois: nova2.atributos[a2], regraCitada: evento.regraCitada, eventoId: evento.id || null, tipoEventoUnificado: 'EV-PROG-03' });
    });
    return { fichaNova: nova2, reciboDeDiferencas: diferencas, erro: null };
  }

  if (evento.tipo === 'MUDANCA_RECURSOS_MAXIMOS') {
    // vidaTotal/almaTotal (máximos derivados) não são os naturais da
    // Regra 5: aqui só entra delta declarado no evento, com gatilho de
    // progressão nomeado (espelho EV-PROG-06).
    if (evento.campo !== 'vidaTotal' && evento.campo !== 'almaTotal') return erroAplicacao('CAMPO_RECURSO_DESCONHECIDO', { campo: evento.campo || null });
    if (!textoNaoVazio(evento.gatilho)) return erroAplicacao('PROG-RECURSO-SEM-GATILHO', { campo: evento.campo });
    if (!Number.isInteger(evento.delta) || evento.delta === 0) return erroAplicacao('DELTA_INVALIDO', { delta: evento.delta });
    if (!nova2.recursos || !Number.isFinite(nova2.recursos[evento.campo])) return erroAplicacao('RECURSO_NAO_NUMERICO', { campo: evento.campo });
    var antesR = nova2.recursos[evento.campo];
    if (antesR + evento.delta < 0) return erroAplicacao('RECURSO_FICARIA_NEGATIVO', { campo: evento.campo, antes: antesR, delta: evento.delta });
    nova2.recursos[evento.campo] = antesR + evento.delta;
    diferencas.push({ campo: 'recursos.' + evento.campo, forma: 'normal', antes: antesR, depois: antesR + evento.delta, regraCitada: evento.regraCitada, eventoId: evento.id || null, tipoEventoUnificado: 'EV-PROG-06', gatilhoDeProgressao: evento.gatilho, nota: 'Delta DECLARADO no evento; fora da fórmula da Regra 5 (DEP-LU-1 fechada por fonte)' });
    return { fichaNova: nova2, reciboDeDiferencas: diferencas, erro: null };
  }

  return erroAplicacao('EVENTO_DESCONHECIDO', { tipo: evento.tipo });
}

// ------------------------------------------------------- crescimento (Regra 5)
// Dados de CRESCIMENTO de Vida/Alma por classificação — NÃO são os dados
// de teste/progressão da Regra 2 (o cânone separa-os expressamente).
// Fonte: CRIACAO_FICHA.notion.md, Regra 5 (snapshot canónico local).
var DADO_CRESCIMENTO = { 'Bronze': 6, 'Prata': 8, 'Ouro': 10, 'Ouro Negro': 12, 'Lendário': 20 };
var ESCADA_CATEGORIAS = [6, 8, 10, 12, 20, 30, 40, 50, 60];
// Opção fixa de 60% (Regra 5; d12 = 7 por esclarecimento expresso do
// Mestre de 09/10/2026 — o 8 histórico foi erro legado, não regra).
var FIXO_60 = { 6: 4, 8: 5, 10: 6, 12: 7, 20: 12, 30: 18, 40: 24, 50: 30, 60: 36 };

function categoriaDado(classificacao, bonusCategoria) {
  var base = DADO_CRESCIMENTO[classificacao];
  var i = ESCADA_CATEGORIAS.indexOf(base);
  var j = i + (bonusCategoria || 0);
  if (j < 0 || j >= ESCADA_CATEGORIAS.length) return null;
  return ESCADA_CATEGORIAS[j];
}

// Resolve os valores dos dados de crescimento de UM recurso.
// modo: faces injectadas (array) ou fixo60=true. Devolve {valores, soma}
// ou {erro}. Nunca gera aleatoriedade.
function valoresCrescimento(evento, recurso, qtd, facesDoDado) {
  if (evento.fixo60 === true) {
    var v = FIXO_60[facesDoDado];
    var arr = []; for (var i = 0; i < qtd; i++) arr.push(v);
    return { valores: arr, soma: v * qtd, modo: 'fixo60' };
  }
  var f = evento.facesCrescimento && evento.facesCrescimento[recurso];
  if (!Array.isArray(f) || f.length !== qtd) return { erro: 'FACES_CRESCIMENTO_EM_FALTA' };
  for (var k = 0; k < f.length; k++) {
    if (!Number.isInteger(f[k]) || f[k] < 1 || f[k] > facesDoDado) return { erro: 'FACES_CRESCIMENTO_INVALIDAS' };
  }
  return { valores: f.slice(), soma: f.reduce(function (a, b) { return a + b; }, 0), modo: 'rolado' };
}

var REGRA5 = 'CRIACAO_FICHA, Regra 5 (CAN-07)';

// Aplica crescimento (subida de estrela, mesma classificação) ou reajuste
// (mudança de classificação) a vidaNatural/almaNatural de `nova` (cópia),
// empurrando as diferenças EV-PROG-06 para `diferencas`.
// Devolve código de erro (string) ou null. Se a ficha não declarar os
// valores iniciais/naturais, regista declaração visível — nunca silencioso.
function aplicarCrescimento(nova, evento, diferencas, rankAntes, rankDepois) {
  var rec = nova.recursos || {};
  var temBase = Number.isFinite(rec.vidaInicial) && Number.isFinite(rec.almaInicial) &&
                Number.isFinite(rec.vidaNatural) && Number.isFinite(rec.almaNatural);
  if (!temBase) {
    diferencas.push({ campo: 'recursos.vidaNatural/almaNatural', forma: 'normal', antes: null, depois: null, regraCitada: REGRA5, eventoId: evento.id || null, tipoEventoUnificado: null, nota: 'CRESCIMENTO_NAO_APLICADO: ficha sem vidaInicial/almaInicial/vidaNatural/almaNatural declarados — valores não inventados' });
    return null;
  }
  var mudanca = rankDepois.classificacao !== rankAntes.classificacao;
  var ordinalDepois = ordinalDe(rankDepois.classificacao, rankDepois.numeral);
  var bonus = nova.bonusCategoriaDado || {};
  var alvos = [
    { recurso: 'vida', campo: 'vidaNatural', inicial: rec.vidaInicial, atributo: nova.atributos && nova.atributos.CON, bonusCat: bonus.vida || 0 },
    { recurso: 'alma', campo: 'almaNatural', inicial: rec.almaInicial, atributo: nova.atributos && nova.atributos.INT, bonusCat: bonus.alma || 0 }
  ];
  for (var i = 0; i < alvos.length; i++) {
    var a = alvos[i];
    if (!Number.isFinite(a.atributo)) return 'ATRIBUTO_BASE_CRESCIMENTO_EM_FALTA';
    var clsDado = mudanca ? rankDepois.classificacao : rankAntes.classificacao;
    var faces = categoriaDado(clsDado, a.bonusCat);
    if (faces === null) return 'CATEGORIA_DE_DADO_INVALIDA';
    var qtd = mudanca ? ordinalDepois : 1;
    var vals = valoresCrescimento(evento, a.recurso, qtd, faces);
    if (vals.erro) return vals.erro;
    var antes = rec[a.campo];
    var depois = mudanca
      ? a.inicial + vals.soma + ordinalDepois * a.atributo
      : antes + vals.valores[0] + a.atributo;
    rec[a.campo] = depois;
    diferencas.push({ campo: 'recursos.' + a.campo, forma: 'normal', antes: antes, depois: depois, regraCitada: REGRA5 + (mudanca ? ' — reajuste ao mudar de classificação' : ' — crescimento por nível'), eventoId: evento.id || null, tipoEventoUnificado: 'EV-PROG-06', gatilhoDeProgressao: evento.id || null, detalhe: { dado: 'd' + faces, quantidade: qtd, valores: vals.valores, modo: vals.modo, atributoBase: a.atributo } });
  }
  // PA Total/Livre (Regra 5): só a Alma natural é recalculada; bónus
  // externos NÃO são recalculados com ela. Só se os componentes vierem
  // declarados na ficha — senão, declaração visível.
  var comp = rec.componentesPA;
  if (comp && Number.isFinite(comp.bonusPermanentesAlma) && Number.isFinite(comp.titulosEvolucoesAlma) && Number.isFinite(comp.equipamentosAlma) && Number.isFinite(rec.paComprometido)) {
    var paTotalAntes = rec.paTotal;
    rec.paTotal = rec.almaNatural + comp.bonusPermanentesAlma + comp.titulosEvolucoesAlma + comp.equipamentosAlma;
    rec.paLivre = rec.paTotal - rec.paComprometido;
    diferencas.push({ campo: 'recursos.paTotal', forma: 'normal', antes: paTotalAntes === undefined ? null : paTotalAntes, depois: rec.paTotal, regraCitada: REGRA5 + ' — PA Total = Alma natural + bónus permanentes + títulos/evoluções + equipamentos', eventoId: evento.id || null, tipoEventoUnificado: 'EV-PROG-06', gatilhoDeProgressao: evento.id || null });
    diferencas.push({ campo: 'recursos.paLivre', forma: 'normal', antes: null, depois: rec.paLivre, regraCitada: REGRA5 + ' — PA Livre = PA Total − PA comprometido', eventoId: evento.id || null, tipoEventoUnificado: null });
  }
  return null;
}

// ---------------------------------------------------------------- encaixes
/*
 * paraEnvelopeUnificado(ficha, evento, resultado) — traduz a saída desta
 * frente para o vocabulário de envelopes EV-PROG-01..08 do Motor de
 * Fichas Unificado (DESENHO-MOTOR-UNIFICADO §2.3), SEM código partilhado:
 * é uma tradução de dados. Recusa -> EV-PROG-08 com o código de erro.
 */
function paraEnvelopeUnificado(ficha, evento, resultado) {
  if (!resultado || typeof resultado !== 'object') {
    return { eventos: [], reciboDeDiferencas: [], erros: ['RESULTADO_INVALIDO'], naoTraduzidos: [] };
  }
  var leitura = (ficha && typeof ficha === 'object') ? lerProgressao(ficha)
    : { classificacao: null, rank: null, dadoProgressao: null };
  var eventos = [];
  var erros = [];
  if (resultado.erro) {
    eventos.push({ eventoId: (evento && evento.id) || 'ev-recusa', tipo: 'EV-PROG-08', codigoErro: resultado.erro.codigo, detalhe: resultado.erro.detalhe || null, safeToApply: false });
    erros.push(resultado.erro.codigo);
    return { eventos: eventos, reciboDeDiferencas: [], erros: erros, naoTraduzidos: [] };
  }
  if (!Array.isArray(resultado.reciboDeDiferencas)) {
    return { eventos: [], reciboDeDiferencas: [], erros: ['RESULTADO_INVALIDO'], naoTraduzidos: [] };
  }
  var vistos = {};
  var naoTraduzidos = [];
  resultado.reciboDeDiferencas.forEach(function (d, i) {
    // Um evento por (tipo, forma, campo): o par normal/transformada gera
    // dois EV-PROG-01 distintos e dois atributos geram dois EV-PROG-03 —
    // colapsar por tipo+forma perdia dados em silêncio (itens 7/U1).
    var chave = d.tipoEventoUnificado + '|' + (d.forma || '') + '|' + (d.campo || '');
    if (!d.tipoEventoUnificado) {
      // Sem tipo no vocabulário EV-PROG (ex.: débito T9, rolagem): a
      // diferença NÃO desaparece — fica nomeada em naoTraduzidos.
      naoTraduzidos.push({ campo: d.campo, forma: d.forma || null, nota: d.nota || 'Sem tipo EV-PROG correspondente no vocabulário do Unificado' });
      return;
    }
    if (!vistos[chave]) {
      vistos[chave] = true;
      var ev = { eventoId: ((evento && evento.id) || 'ev') + '-' + (i + 1), tipo: d.tipoEventoUnificado, campo: d.campo, forma: d.forma || null, antes: d.antes, depois: d.depois, regraCitada: d.regraCitada };
      if (d.gatilhoDeProgressao) ev.gatilhoDeProgressao = d.gatilhoDeProgressao;
      if (ficha && ficha.fonte) {
        ev.proveniencia = { actor: (evento && evento.actor) || 'levelup', paginaId: ficha.fonte.paginaId || null, versaoObservada: ficha.fonte.versao || ficha.fonte.ultimaEdicao || null, rotaDeLeitura: ficha.fonte.rotaDeLeitura || null };
      }
      eventos.push(ev);
    }
  });
  // Recibo CLONADO: o envelope não partilha referências com o resultado
  // (mutar um não pode adulterar o outro — item 16).
  return { eventos: eventos, reciboDeDiferencas: clonar(resultado.reciboDeDiferencas), erros: erros, naoTraduzidos: naoTraduzidos,
           leitura: { classificacao: leitura.classificacao, rank: leitura.rank, dadoProgressao: leitura.dadoProgressao } };
}

/*
 * separarVisao(ficha, tipoUnidade) — privacidade (ENC-LU §0.5).
 * tipoUnidade: 'jogador' (vê a própria Vida/Alma) | 'besta' | 'npc'.
 * Para besta/NPC, o público NÃO recebe Vida/Alma/PA — nem número, nem
 * faixa, nem valor derivável (percentuais incluídos). FRONTEIRA
 * (sentença da bancada D6): o `publico` daqui é uma pré-visualização
 * defensiva desta frente, NÃO é a vista da Party. A vista da Party nasce
 * no jogo, por lista branca canónica, e é da frente do jogo. Nenhum
 * envelope EV-PROG e nenhum `publico` desta frente pode ser ligado
 * directamente a um cliente da Party. Pós-bancada
 * (itens 5/6): a remoção é RECURSIVA, em qualquer profundidade e dentro
 * de formas/histórico/raiz — a lista fixa de 3 campos no topo vazava
 * tudo o resto. E se a ficha declarar tipoUnidade diferente do pedido,
 * falha FECHADO (vale o mais restritivo).
 */
function chaveSensivel(nome) {
  if (/(vida|alma)/i.test(nome)) return true;
  if (/(^|_)pa(_|$)/i.test(nome)) return true;      // pa, pa_livre, custo_pa…
  if (/^pa[A-Z]/.test(nome)) return true;           // paLivre, paTotal…
  return false;
}
function removerSensivel(obj, mestre) {
  if (Array.isArray(obj)) { obj.forEach(function (v) { removerSensivel(v, mestre); }); return; }
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(function (k) {
      if (chaveSensivel(k) || (k === 'recursos' && Array.isArray(obj[k]))) {
        mestre[k] = obj[k]; delete obj[k];
      } else {
        removerSensivel(obj[k], mestre);
      }
    });
  }
}
function separarVisao(ficha, tipoUnidade) {
  if (!ficha || typeof ficha !== 'object') {
    return { publico: null, soDoMestre: null, erro: { codigo: 'FICHA_INVALIDA' } };
  }
  var completo = clonar(ficha);
  if (completo === CLONE_FALHOU) {
    return { publico: null, soDoMestre: null, erro: { codigo: 'FICHA_NAO_CLONAVEL' } };
  }
  // Jogador só vê os próprios números se AMBOS concordarem que é jogador.
  var declarado = typeof ficha.tipoUnidade === 'string' ? ficha.tipoUnidade : null;
  var ehJogador = tipoUnidade === 'jogador' && (declarado === null || declarado === 'jogador');
  if (ehJogador) return { publico: completo, soDoMestre: {} };
  var publico = completo;
  var soDoMestre = {};
  removerSensivel(publico, soDoMestre);
  return { publico: publico, soDoMestre: soDoMestre };
}

// Besta assimilada do Orc (errata P12, correcção do Mestre): Espírito NÃO
// sobe com o Orc (fixo Lendário, ex-Titã); TAP = 11 x ordinal do Orc.
// A estrela exacta da Besta (5★) é HIPÓTESE TEST, não cânone.
function tapBestaAssimilada(classificacao, numeral) {
  // Diagnóstico honesto (item 17): classificação desconhecida ou numeral
  // inválido NÃO são «Bronze legítimo» — trazem erro nomeado.
  if (ESCALOES.indexOf(classificacao) < 0) return { tap: 0, slots: 0, erro: 'CLASSIFICACAO_DESCONHECIDA', nota: 'Classificação fora da matriz: ' + String(classificacao) };
  if (!Number.isInteger(numeral) || numeral < 1 || numeral > 5) return { tap: 0, slots: 0, erro: 'NUMERAL_INVALIDO', nota: 'Numeral fora de 1–5: ' + String(numeral) };
  var ordinal = ordinalDe(classificacao, numeral);
  if (ordinal < 6) return { tap: 0, slots: 0, erro: null, nota: 'Sem assimilação antes de Prata 1★ (ordinal 6)' };
  return { tap: 11 * ordinal, slots: SLOTS_BESTA_T5[classificacao], erro: null, espirito: { classificacao: 'Lendário', sobeComOrc: false, estrelaExacta: 'HIPOTESE_TEST_5' } };
}

// Custo T9 por classificação (null = proibida). Classificação
// desconhecida também devolve null — falha FECHADO (nunca «permitido»).
function custoT9(classificacao) {
  return Object.prototype.hasOwnProperty.call(CUSTO_T9, classificacao) ? CUSTO_T9[classificacao] : null;
}

// Tabelas congeladas (item 15): na página do jogo os scripts partilham o
// global — nenhum código pode adulterar o motor por mutação das tabelas.
[ESCALOES, ATRIBUTOS, ESCADA_CATEGORIAS, LIMIARES_FA].forEach(function (t) { Object.freeze(t); });
[DADO_PROGRESSAO, CUSTO_T9, SLOTS_BESTA_T5, DADO_CRESCIMENTO, FIXO_60, BONUS_PROFICIENCIA_FONTE].forEach(function (t) {
  Object.keys(t).forEach(function (k) { if (t[k] && typeof t[k] === 'object') Object.freeze(t[k]); });
  Object.freeze(t);
});

var LevelUp = {
  VERSAO: '2.1-pos-bancada-20261103',
  ESCALOES: ESCALOES, DADO_PROGRESSAO: DADO_PROGRESSAO, CUSTO_T9: CUSTO_T9,
  DADO_CRESCIMENTO: DADO_CRESCIMENTO, FIXO_60: FIXO_60, ESCADA_CATEGORIAS: ESCADA_CATEGORIAS, categoriaDado: categoriaDado,
  LIMIARES_FA: LIMIARES_FA, BONUS_PROFICIENCIA_FONTE: BONUS_PROFICIENCIA_FONTE, MOLDURA_SLOTS_TEST: MOLDURA_SLOTS_TEST,
  analisarRank: analisarRank, lerProgressao: lerProgressao, lerProficiencia: lerProficiencia,
  derivarEstagioPorFA: derivarEstagioPorFA,
  aplicarProgressao: aplicarProgressao, paraEnvelopeUnificado: paraEnvelopeUnificado,
  separarVisao: separarVisao, tapBestaAssimilada: tapBestaAssimilada, custoT9: custoT9,
  ordinalDe: ordinalDe, rankDeOrdinal: rankDeOrdinal
};
Object.freeze(LevelUp);
if (typeof module !== 'undefined' && module.exports) module.exports = LevelUp;
if (typeof window !== 'undefined') window.LevelUp = LevelUp;
