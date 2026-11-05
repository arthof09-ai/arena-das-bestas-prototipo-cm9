// ASSIMILAÇÃO — motores DMG+VLAB (gerado por gerar-bundle.js; NÃO editar à mão)
// ===== DMG (frente DMG) =====
(function () {
"use strict";
/*
 * dmg.js — DMG (motor de dano) para a página do jogo.
 * JavaScript puro, sem dependências. Versão 0.1 — 03/11/2026.
 *
 * Responsável: este chat (frente DMG), por palavra do Mestre em 03/11/2026 20:08.
 * Âmbito: SÓ o dano. Ataque/acerto/PA/estados são do VLAB (outra frente).
 *
 * Contrato: ENCOMENDA-JOGO-VLAB-DMG.md §2 (função calcularDano)
 * Norma: DMG-RANK-01 v1.1 (oficial/vigente) — ~/workspace/referencias/dmg/DMG-RANK-01.md
 * Base provada: a função calcularDano de vlab-dmg.js v0.1 (bateria conjunta 9/9 PASS
 * em 03/11/2026), extraída para ficheiro próprio sem mudar as contas.
 *
 * Regras desta versão:
 *  1. Dano explícito na ficha NUNCA é substituído pela derivação (precedência
 *     da DMG-RANK-01 §2: valor explícito > norma).
 *  2. Parcelas por tipo: uma parcela por tipo. Com vários tipos e uma só
 *     expressão, o orçamento é do efeito inteiro (§22) — sem `reparticao`
 *     ou `componentes` declarados, erro DIVISAO_TIPOS_EM_FALTA. Nunca duplicar.
 *  3. Crítico (só quando o VLAB disser critico:true; magia não tem crítico —
 *     quem decide isso é o VLAB): dano = dados rolados + bónus fixo + valor
 *     MÁXIMO de todos os dados de dano (Sistema de Combate, Regra 6).
 *  4. Dano ausente: derivar pela DMG-RANK-01 exige classificação (RE) E
 *     posição interna FIP (Entrada/Baixa/Media/Alta/Apice, §5/§7).
 *     Sem FIP -> erro DANO_AUSENTE_E_SEM_POSICAO_FIP (a banda larga sozinha
 *     não dá um número honesto). Com FIP -> faixaDME + dmeAlvo (ponto médio)
 *     marcados derivadoPor:"DMG-RANK-01", e erro DERIVACAO_SEM_EXPRESSAO:
 *     a conversão DME -> expressão de dados é identidade do efeito (§14),
 *     fica como passo seguinte declarado, não é inventada aqui.
 *  5. RD (redução de dano): PENDENTE de propósito — a encomenda deixou em
 *     aberto se entra no DMG ou no VLAB. Esta versão NÃO aplica RD e
 *     declara rdAplicada: null em cada saída com parcelas.
 *  6. Nada inventado: o que não der para resolver sai como erro nomeado,
 *     nunca um número fabricado nem zero disfarçado.
 *  7. Determinístico: `contexto.faces` são consumidas por ordem e devolvidas
 *     nas parcelas; sem faces, `contexto.semente` gera (mulberry32) e as
 *     faces geradas saem na resposta. Mesma entrada -> mesma saída.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fonteDeFaces(contexto) {
  const facesDadas = Array.isArray(contexto.faces) ? contexto.faces.slice() : null;
  const rng = contexto.semente != null ? mulberry32(contexto.semente) : null;
  const usadas = [];
  let idx = 0;
  return {
    tirar(lados) {
      let f;
      if (facesDadas) {
        if (idx >= facesDadas.length) return { erro: "FACES_INSUFICIENTES" };
        f = facesDadas[idx++];
        if (!Number.isInteger(f) || f < 1 || f > lados)
          return { erro: "FACE_FORA_DO_INTERVALO", detalhe: `face ${f} inválida para d${lados}` };
      } else if (rng) {
        f = 1 + Math.floor(rng() * lados);
      } else {
        return { erro: "SEM_FACES_NEM_SEMENTE" };
      }
      usadas.push(f);
      return { face: f };
    },
    usadas,
    sobraram() { return facesDadas ? facesDadas.length - idx : 0; },
  };
}

// Gramática: termos NdM separados por "+", bónus fixo opcional no fim.
// Aceita a forma decomposta da FichaJogo: { qtd, faces, bonus }
function analisarExpressao(expr) {
  if (expr == null) return { erro: "EXPRESSAO_EM_FALTA" };
  if (typeof expr === "object" && !Array.isArray(expr)) {
    const { qtd, faces, bonus } = expr;
    if (!Number.isInteger(qtd) || !Number.isInteger(faces) || qtd < 1 || faces < 2)
      return { erro: "EXPRESSAO_FORA_DA_GRAMATICA", detalhe: "objeto decomposto precisa de qtd>=1 e faces>=2" };
    return { termos: [{ qtd, faces }], bonus: Number.isInteger(bonus) ? bonus : 0,
             texto: `${qtd}d${faces}${bonus ? (bonus > 0 ? "+" + bonus : "" + bonus) : ""}` };
  }
  if (typeof expr !== "string") return { erro: "EXPRESSAO_FORA_DA_GRAMATICA" };
  const limpa = expr.replace(/\s+/g, "");
  const m = limpa.match(/^(\d+d\d+(?:\+\d+d\d+)*)([+-]\d+)?$/i);
  if (!m) return { erro: "EXPRESSAO_FORA_DA_GRAMATICA", detalhe: expr };
  const termos = m[1].split("+").map((t) => {
    const [q, f] = t.toLowerCase().split("d").map(Number);
    if (q < 1 || f < 2) return null;
    return { qtd: q, faces: f };
  });
  if (termos.some((t) => t === null)) return { erro: "EXPRESSAO_FORA_DA_GRAMATICA", detalhe: expr };
  return { termos, bonus: m[2] ? parseInt(m[2], 10) : 0, texto: expr };
}

function dmeDaExpressao(parsed) {
  // DME = média dos dados + bónus fixo intrínseco (DMG-RANK-01 §4)
  return parsed.termos.reduce((s, t) => s + t.qtd * ((t.faces + 1) / 2), 0) + parsed.bonus;
}
function maximoDosDados(parsed) {
  return parsed.termos.reduce((s, t) => s + t.qtd * t.faces, 0);
}

function rolarExpressao(parsed, fonte) {
  const faces = [];
  for (const t of parsed.termos) {
    for (let i = 0; i < t.qtd; i++) {
      const r = fonte.tirar(t.faces);
      if (r.erro) return r;
      faces.push(r.face);
    }
  }
  return { faces, somaDados: faces.reduce((a, b) => a + b, 0) };
}

// DMG-RANK-01 §5 — sub-bandas de DME por classificação (RE) e posição FIP: [mín, máx]
const BANDAS_DME = {
  Bronze:       { Entrada: [4, 6],   Baixa: [7, 9],   Media: [10, 12], Alta: [13, 15],  Apice: [16, 18] },
  Prata:        { Entrada: [14, 18], Baixa: [19, 22], Media: [23, 26], Alta: [27, 31],  Apice: [32, 36] },
  Ouro:         { Entrada: [22, 28], Baixa: [29, 35], Media: [36, 44], Alta: [45, 52],  Apice: [53, 62] },
  "Ouro Negro": { Entrada: [38, 48], Baixa: [49, 58], Media: [59, 69], Alta: [70, 82],  Apice: [83, 96] },
  Lendario:     { Entrada: [58, 72], Baixa: [73, 90], Media: [91, 112], Alta: [113, 136], Apice: [137, 160] },
};

function erroSaida(codigo, detalhe, extra) {
  return Object.assign({ parcelas: [], total: 0, dme: null, recibo: null,
                         erro: { codigo, detalhe: detalhe || "" } }, extra || {});
}

function calcularDano(entrada) {
  if (!entrada || typeof entrada !== "object")
    return erroSaida("ENTRADA_EM_FALTA", "calcularDano precisa de um objeto de entrada");
  const ctx = entrada.contexto || {};

  // Componentes: um por tipo. Sem componentes, um único a partir de expressaoDano+tipos.
  let componentes = null;
  if (Array.isArray(entrada.componentes) && entrada.componentes.length) {
    componentes = entrada.componentes.map((c) => ({ tipo: c.tipo, expressao: c.expressao }));
  } else if (entrada.expressaoDano != null) {
    const tipos = Array.isArray(entrada.tipos) && entrada.tipos.length ? entrada.tipos : [null];
    if (tipos.length > 1) {
      if (!Array.isArray(entrada.reparticao) || entrada.reparticao.length !== tipos.length)
        return erroSaida("DIVISAO_TIPOS_EM_FALTA",
          "vários tipos com uma só expressão exigem `reparticao` (uma expressão por tipo, cuja soma respeita o orçamento do efeito — DMG-RANK-01 §22)");
      componentes = tipos.map((tipo, i) => ({ tipo, expressao: entrada.reparticao[i] }));
    } else {
      componentes = [{ tipo: tipos[0], expressao: entrada.expressaoDano }];
    }
  }

  // Dano ausente -> derivação DMG-RANK-01
  if (!componentes) {
    if (!entrada.classificacao || !BANDAS_DME[entrada.classificacao])
      return erroSaida("DANO_AUSENTE_E_SEM_CLASSIFICACAO",
        "sem expressão de dano e sem classificação válida não há derivação honesta");
    const pos = entrada.posicaoFIP || entrada.posicao;
    const banda = pos ? BANDAS_DME[entrada.classificacao][pos] : null;
    if (!banda)
      return erroSaida("DANO_AUSENTE_E_SEM_POSICAO_FIP",
        `classificação ${entrada.classificacao} sozinha dá uma faixa larga demais; falta a posição interna (Entrada/Baixa/Media/Alta/Apice) ou as estrelas do efeito`,
        { derivadoPor: "DMG-RANK-01", faixaDME: null });
    const alvo = (banda[0] + banda[1]) / 2;
    return erroSaida("DERIVACAO_SEM_EXPRESSAO",
      "faixa e DME-alvo derivados; a expressão de dados (identidade do efeito) ainda não foi escolhida — DMG-RANK-01 §14",
      { dme: alvo, derivadoPor: "DMG-RANK-01", faixaDME: banda, dmeAlvo: alvo });
  }

  const fonte = fonteDeFaces(ctx);
  const parcelas = [];
  let total = 0, dmeTotal = 0;
  for (const comp of componentes) {
    const parsed = analisarExpressao(comp.expressao);
    if (parsed.erro) return erroSaida(parsed.erro, parsed.detalhe || String(comp.expressao));
    const rol = rolarExpressao(parsed, fonte);
    if (rol.erro) return erroSaida(rol.erro, rol.detalhe || "");
    let subtotal = rol.somaDados + parsed.bonus;
    if (ctx.critico) subtotal += maximoDosDados(parsed); // Regra 6: + máximo de todos os dados
    parcelas.push({ tipo: comp.tipo, expressao: parsed.texto, faces: rol.faces, subtotal });
    total += subtotal;
    dmeTotal += dmeDaExpressao(parsed) + (ctx.critico ? maximoDosDados(parsed) : 0);
  }
  if (fonte.sobraram() > 0)
    return erroSaida("FACES_A_MAIS", `sobraram ${fonte.sobraram()} faces por consumir`);

  const recibo = parcelas.map((p) =>
    `${p.expressao} → [${p.faces.join(",")}] = ${p.subtotal}${p.tipo ? ` (${p.tipo})` : ""}`).join(" + ");
  return { parcelas, total, dme: dmeTotal, recibo, rdAplicada: null, erro: null };
}

// ============================================================================
// CONV-DME-02 — conversão determinística DME→expressão de dados
// Especificação fixada pela bancada DMG (juiz, 03/11/2026). Convenção da
// bancada, revogável: a norma (§14) só manda ficar na faixa e preservar a
// identidade; o alvo=centro é convenção declarada, não leitura da norma.
// - Face fixa por classificação (âncora §14): Bronze d6, Prata d8, Ouro d10,
//   Ouro Negro d10, Lendário d12. Nenhuma outra face na v1.
// - Espaço fechado: N∈[1,24]; B∈[0, F+1] (= 2× média da face).
// - Selecção lexicográfica: min |DME−centro| → min B → min N. Saída única.
// - Âmbito v1: um pool + bónus. Pools mistos e termos de atributo fora.
// ============================================================================
const FACES_CONV = { Bronze: 6, Prata: 8, Ouro: 10, "Ouro Negro": 10, Lendario: 12 };

function converterDmeParaDados(classificacaoIn, posicao) {
  const classificacao = classificacaoIn === "OuroNegro" ? "Ouro Negro" : classificacaoIn;
  const F = FACES_CONV[classificacao];
  const banda = BANDAS_DME[classificacao] && BANDAS_DME[classificacao][posicao];
  if (!F || !banda) return erroSaida("CONVERSAO_ENTRADA_INVALIDA", "classificacao/posicao desconhecidas", { classificacao, posicao });
  const [min, max] = banda;
  const centro2 = min + max;              // trabalhar em unidades ×2 (inteiros)
  const bMax = F + 1;
  let melhor = null;
  for (let n = 1; n <= 24; n++) {
    for (let b = 0; b <= bMax; b++) {
      const dme2 = n * (F + 1) + 2 * b;   // DME×2 exacto
      if (dme2 < 2 * min || dme2 > 2 * max) continue;
      const dev2 = Math.abs(dme2 - centro2);
      if (!melhor || dev2 < melhor.dev2 ||
          (dev2 === melhor.dev2 && (b < melhor.b || (b === melhor.b && n < melhor.n)))) {
        melhor = { n, b, dme2, dev2 };
      }
    }
  }
  if (!melhor) return erroSaida("CONVERSAO_SEM_CANDIDATO", "nenhum (N,B) do espaço fechado cai na faixa", { classificacao, posicao, faixa: banda });
  return {
    expressao: `${melhor.n}d${F}${melhor.b ? `+${melhor.b}` : ""}`,
    classificacao, posicao,
    faixa: banda, centro: centro2 / 2,
    dme: melhor.dme2 / 2, desvio: melhor.dev2 / 2,
  };
}

const API = { calcularDano, BANDAS_DME, converterDmeParaDados };
if (typeof module !== "undefined" && module.exports) module.exports = API;
if (typeof window !== "undefined") window.Dmg = API;

})();
// ===== VLAB (frente VLAB) =====
(function () {
"use strict";
/*
 * vlab.js — VLAB (motor de ataque) para a página do jogo.
 * JavaScript puro, sem dependências. Versão 0.2 — 03/11/2026.
 *
 * Responsável: este chat (frente VLAB), por palavra do Mestre em 03/11/2026 20:10
 * («Você vai ser responsável pelo vlab»).
 * Âmbito: SÓ o ataque — validar e resolver um ataque: rolagem contra a defesa,
 * Vantagem/Desvantagem, crítico, custo de PA/Exaustão, aplicação do dano à Vida
 * (com RD) e estados que nascem (Fraco, fora de combate). O DANO bruto é do DMG
 * (frente própria, ~/workspace/dmg-responsavel/dmg.js — função calcularDano);
 * este ficheiro CHAMA o DMG, nunca o reimplementa.
 *
 * Contrato: ENCOMENDA-JOGO-VLAB-DMG.md §1. Conferência: ADENDA-01 (armadilhas
 * P1–P3) e ADENDA-02 (prova do código original R237/R326), nesta pasta e em
 * ~/workspace/vlab-dmg-finalizacao/.
 *
 * Regras desta versão (cada uma com a sua fonte):
 *  D1. Defesa: por defeito compara contra a CA do alvo (código original:
 *      determine_attack_success contra defense_ca). Se a entrada trouxer
 *      alvo.defesaAplicavel {valor, nomeDaRegra, origem} — a defesa de uma
 *      reacção declarada (Defender = 6+CON+Armadura+Fortitude; Esquivar =
 *      CA+Reflexo; Sistema de Combate, Regra 4) — é essa que vale e sai
 *      citada na saída. Sem CA e sem defesaAplicavel -> DEFESA_EM_FALTA.
 *  D2. Acerto é SUPERAR (total > defesa); empate erra (Regra 3 + código).
 *  D3. Vantagem/Desvantagem (Regra 5): anulam 1-por-1 antes de rolar,
 *      líquido limitado a ±4; cada nível líquido = +1 conjunto de rolagem e
 *      +2/−2 por rolagem; escolhe-se o melhor (vantagem) ou o pior (desvantagem).
 *      Flanquear = +1 Vantagem (Regra 7). Atacante Fraco = +1 Desvantagem
 *      (Regra 7 + código original: o fraco é o do ATACANTE). Atacante Caído =
 *      +1 Desvantagem (Regra 7 do cânone — «atacar enquanto continuar caído»;
 *      o código original não implementa Caído: NÃO ENCONTRADO, ver Adenda 02).
 *  D4. Crítico (Regra 6 + código original classify_critical_sequence):
 *      verificação separada e sequencial de 3d6 em contexto.verificacaoCritico
 *      [d1,d2,d3] — 6,6 e 3º ∈ {5,6} (a margem, máx +4, pode baixar o 3º dado).
 *      Crítico positivo FORÇA o acerto (código original, vlab_effects_v08) e
 *      o DMG soma o máximo dos dados (quem aplica é o DMG, com critico:true).
 *      Magia NÃO tem crítico (Sistema de Magia).
 *  D5. Falha crítica (1,1 e 3º ∈ {1,2}): o código original DETECTA e BLOQUEIA
 *      — a consequência nunca foi definida na fonte (RulesUnresolved /
 *      UNRESOLVED_CRITICAL_FAILURE). Aqui devolve o erro nomeado
 *      FALHA_CRITICA_SEM_CONSEQUENCIA_DEFINIDA, sem aplicar nada.
 *  D6. PA: custo > PA Livre, sem contexto.forcarSemPA -> erro PA_INSUFICIENTE
 *      (não rola). Com forcarSemPA -> resolve e declara Exaustão Espiritual
 *      (Sistema de Magia, Regra 1: inconsciente; em batalha, na prática morte)
 *      em soDoMestre.efeitosAtacante.
 *  D7. RD é do VLAB (prova Adenda 02: vlab_rd_v08.mitigate é a autoridade e
 *      aplica na passagem para a Vida, depois do dano bruto com crítico):
 *      um só componente/tipo por evento; RD geral vale para qualquer tipo,
 *      RD específica só no tipo certo; geral+específica coincidentes ->
 *      RD_EMPILHAMENTO_SEM_DECISAO; vários tipos com RD ->
 *      RD_SEM_DISTRIBUICAO_POR_TIPO. Líquido nunca < 0. A saída traz
 *      rdAplicada e totalEfectivo ao nível do ataque (o danoAplicado do DMG
 *      fica bruto, intocado).
 *  D8. Vida a 0 NÃO é morte (código original: trava em 0, «LAB-STOP-HP0-NOT-
 *      CANON», morte NÃO adjudicada): estadoNovo "foraDeCombate" e
 *      soDoMestre.alvoDepois.morteAdjudicada = false. Fraco: Vida > 0 e
 *      estritamente < 10% da Vida total (10×vida < vidaTotal).
 *  D9. Privacidade: vida/alma e o depois do alvo vão SÓ em soDoMestre;
 *      publico traz o recibo (fórmula, faces, dano por tipo) — encomenda §0.5.
 *  D10. Determinismo: contexto.faces consumidas por ordem (conjuntos do
 *      ataque primeiro, dano a seguir — encomenda §1.4) ou contexto.semente
 *      com o mesmo gerador do DMG; faces devolvidas na saída.
 */

// O DMG: em Node vem do ficheiro da frente DMG; no navegador, de window.Dmg
// (carregar dmg.js antes de vlab.js na página).
function obterCalcularDano() {
  if (typeof module !== "undefined" && module.exports) {
    try { return require("../dmg-responsavel/dmg.js").calcularDano; } catch (e) { /* cai para o global */ }
  }
  if (typeof window !== "undefined" && window.Dmg) return window.Dmg.calcularDano;
  if (typeof globalThis !== "undefined" && globalThis.Dmg) return globalThis.Dmg.calcularDano;
  return null;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function analisarExpressaoAtaque(expr) {
  if (typeof expr === "object" && expr !== null && !Array.isArray(expr)) {
    const { qtd, faces, bonus } = expr;
    if (!Number.isInteger(qtd) || !Number.isInteger(faces) || qtd < 1 || faces < 2)
      return { erro: "EXPRESSAO_FORA_DA_GRAMATICA" };
    return { termos: [{ qtd, faces }], bonus: Number.isInteger(bonus) ? bonus : 0, texto: `${qtd}d${faces}${bonus ? (bonus > 0 ? "+" + bonus : "" + bonus) : ""}` };
  }
  if (typeof expr !== "string") return { erro: "EXPRESSAO_FORA_DA_GRAMATICA" };
  const limpa = expr.replace(/\s+/g, "");
  const m = limpa.match(/^(\d+d\d+(?:\+\d+d\d+)*)([+-]\d+)?$/i);
  if (!m) return { erro: "EXPRESSAO_FORA_DA_GRAMATICA", detalhe: expr };
  const termos = m[1].split("+").map((t) => {
    const [q, f] = t.toLowerCase().split("d").map(Number);
    return q >= 1 && f >= 2 ? { qtd: q, faces: f } : null;
  });
  if (termos.some((t) => t === null)) return { erro: "EXPRESSAO_FORA_DA_GRAMATICA", detalhe: expr };
  return { termos, bonus: m[2] ? parseInt(m[2], 10) : 0, texto: expr };
}

function resolverAtaque(entrada) {
  const { atacante, alvo, tecnica } = entrada || {};
  const ctx = (entrada && entrada.contexto) || {};
  const falha = (codigo, detalhe) => ({ resultado: null, rolagem: null, defesaUsada: null, pa: null, danoAplicado: null, rdAplicada: null, totalEfectivo: null, reacaoConsumida: null, contraAtaquePendente: null, publico: null, soDoMestre: null, erro: { codigo, detalhe } });

  if (!atacante || !alvo || !tecnica) return falha("ENTRADA_INCOMPLETA", "atacante, alvo e tecnica são obrigatórios");
  // B0 — contra um Ataque de Oportunidade NÃO há reacção nenhuma do alvo
  // (confirmação do Mestre na sessão Chat 3, DECISAO §12): nem reacção-
  // limiar, nem Contra-atacar. Declarar uma é erro nomeado, não é ignorado.
  if (ctx.ataqueDeOportunidade === true && (alvo.reacaoDefensiva || alvo.defesaAplicavel || alvo.contraAtaque)) {
    return falha("REACCAO_CONTRA_ATAQUE_DE_OPORTUNIDADE", "o alvo de um Ataque de Oportunidade não pode reagir (sessão Chat 3, confirmação registada)");
  }
  // Bandeiras de desgraça de falhas críticas anteriores (bancada das
  // desgraças, J3): arma no chão ou quebrada recusa o ataque com arma
  // antes de rolar — apanhar a arma custa 1 Acção de Movimento e quem
  // chama declara a recuperação com contexto.armaRecuperada: true.
  const usaArmaTec = tecnica.usaArma !== false;
  if (atacante.armaCaida === true && usaArmaTec && ctx.armaRecuperada !== true)
    return falha("ARMA_CAIDA", "a arma está no chão (desgraça de falha crítica); apanhá-la custa 1 Acção de Movimento — declarar contexto.armaRecuperada");
  if (atacante.armaQuebrada === true && usaArmaTec)
    return falha("ARMA_QUEBRADA", "a arma está quebrada até ao fim do combate (desgraça de falha crítica)");
  const expressaoAtaque = tecnica.expressaoAtaque || (atacante.testes && atacante.testes.ataque);
  if (!expressaoAtaque) return falha("TECNICA_SEM_ATAQUE", "nem a técnica nem a ficha trazem expressão de ataque");
  if (tecnica.expressaoDano == null && !Array.isArray(tecnica.componentes)) return falha("TECNICA_SEM_DANO", "a técnica não traz expressão de dano nem componentes");

  // D1 — defesa aplicável. A forma recomendada pela bancada C1 (Q4) é a
  // reacção declarada de forma explícita: alvo.reacaoDefensiva
  // { tipo: "Defender"|"Esquivar"|…, valor, origem } — ela preenche a
  // defesa aplicável e sai citada com o seu tipo como nome da regra.
  // alvo.defesaAplicavel continua aceite (compatibilidade com a encomenda).
  let defesa;
  if (alvo.reacaoDefensiva && Number.isFinite(alvo.reacaoDefensiva.valor)) {
    defesa = { valor: alvo.reacaoDefensiva.valor, nomeDaRegra: alvo.reacaoDefensiva.tipo || "ReaccaoDefensiva", origem: alvo.reacaoDefensiva.origem || "reacção declarada antes do ataque (bancada C1)" };
  } else if (alvo.defesaAplicavel && Number.isFinite(alvo.defesaAplicavel.valor)) {
    defesa = { valor: alvo.defesaAplicavel.valor, nomeDaRegra: alvo.defesaAplicavel.nomeDaRegra || null, origem: alvo.defesaAplicavel.origem || null };
  } else if (Number.isFinite(alvo.ca)) {
    defesa = { valor: alvo.ca, nomeDaRegra: "CA", origem: "alvo.ca — comparação base, sem reacção defensiva declarada (código original do VLAB)" };
  } else {
    return falha("DEFESA_EM_FALTA", "a entrada precisa de alvo.ca ou alvo.defesaAplicavel {valor, nomeDaRegra, origem}");
  }

  // D6 — PA
  const custo = Number.isInteger(tecnica.custoPA) ? tecnica.custoPA : 0;
  const paAntes = atacante.paLivre;
  if (!Number.isFinite(paAntes)) return falha("PA_EM_FALTA", "atacante.paLivre não veio na ficha");
  // Guarda de escala (bancada das pendências, D5): inteiros acima do
  // limite exacto do JavaScript recusam-se com erro nomeado — nunca
  // saem aproximados em silêncio. Fraccionários legítimos (CA 137/2)
  // ficam fora da guarda.
  for (const [campo, v] of [["atacante.paLivre", paAntes], ["alvo.vidaActual", alvo.vidaActual], ["alvo.vidaTotal", alvo.vidaTotal], ["tecnica.custoPA", custo]]) {
    if (Number.isInteger(v) && !Number.isSafeInteger(v)) return falha("VALOR_ACIMA_DO_LIMITE_EXACTO", `${campo} excede o limite exacto (2^53): o motor recusa em vez de aproximar`);
  }
  const exaustao = custo > paAntes;
  if (exaustao && !ctx.forcarSemPA) return falha("PA_INSUFICIENTE", `custo ${custo} PA > PA Livre ${paAntes}; com contexto.forcarSemPA o motor resolve e declara Exaustão Espiritual`);

  // D3 — Vantagem/Desvantagem líquida
  const estadoAtacante = Array.isArray(atacante.estado) ? atacante.estado : [];
  let v = Math.max(0, ctx.niveisVantagem | 0) + (ctx.flanqueando ? 1 : 0);
  let d = Math.max(0, ctx.niveisDesvantagem | 0)
    + (ctx.atacanteFraco || estadoAtacante.includes("fraco") ? 1 : 0)
    + (ctx.atacanteCaido || estadoAtacante.includes("caido") ? 1 : 0);
  const liquido = Math.max(-4, Math.min(4, v - d));
  const nConjuntos = 1 + Math.abs(liquido);
  const ajustePorRolagem = 2 * liquido;

  const parsedAtk = analisarExpressaoAtaque(expressaoAtaque);
  if (parsedAtk.erro) return falha(parsedAtk.erro, parsedAtk.detalhe || String(expressaoAtaque));

  // Faces do ataque: das faces dadas (por ordem) ou da semente
  const facesDadas = Array.isArray(ctx.faces) ? ctx.faces : null;
  const rng = !facesDadas && ctx.semente != null ? mulberry32(ctx.semente) : null;
  let cursor = 0;
  const tirar = (lados) => {
    if (facesDadas) {
      if (cursor >= facesDadas.length) return { erro: "FACES_INSUFICIENTES" };
      const f = facesDadas[cursor++];
      if (!Number.isInteger(f) || f < 1 || f > lados) return { erro: "FACE_FORA_DO_INTERVALO", detalhe: `face ${f} inválida para d${lados}` };
      return { face: f };
    }
    if (rng) return { face: 1 + Math.floor(rng() * lados) };
    return { erro: "SEM_FACES_NEM_SEMENTE" };
  };

  const conjuntos = [], resultados = [];
  for (let i = 0; i < nConjuntos; i++) {
    const facesConj = [];
    let soma = 0;
    for (const t of parsedAtk.termos) for (let k = 0; k < t.qtd; k++) {
      const r = tirar(t.faces);
      if (r.erro) return falha(r.erro, r.detalhe || "");
      facesConj.push(r.face); soma += r.face;
    }
    conjuntos.push(facesConj);
    resultados.push(soma + parsedAtk.bonus + ajustePorRolagem);
  }
  const total = liquido > 0 ? Math.max(...resultados) : liquido < 0 ? Math.min(...resultados) : resultados[0];

  // D4/D5 — crítico e falha crítica (verificação separada e sequencial)
  let critico = false;
  let falhaCriticaDetectada = false;
  if (Array.isArray(ctx.verificacaoCritico) && ctx.verificacaoCritico.length === 3 && !tecnica.magia) {
    const [a, b, c] = ctx.verificacaoCritico;
    const margem = Math.max(0, Math.min(4, ctx.margemCritico | 0));
    if (a === 6 && b === 6 && c >= 5 - margem) critico = true;
    if (a === 1 && b === 1 && (c === 1 || c === 2)) falhaCriticaDetectada = true; // D5 novo: resolve-se como DESGRAÇA (regra do Mestre, questionário 03/11/2026; bancada BANCADA-DESGRACA-JULGAMENTO.md)
  }

  const acerta = !falhaCriticaDetectada && (critico || total > defesa.valor); // D2 + D4
  const resultado = falhaCriticaDetectada ? "falhaCritica" : critico ? "critico" : acerta ? "acerta" : "erra";

  // Dano (do DMG) + RD (do VLAB) + estados
  let danoAplicado = null, rdAplicada = null, totalEfectivo = null;
  let vidaDepois = Number.isFinite(alvo.vidaActual) ? alvo.vidaActual : null;
  const estadosNovos = [], estadosRemovidos = [];
  let morteAdjudicada = null;
  let estadoMorteDepois = null, morteVia = null; // testes de morte (M3)

  if (acerta) {
    const calcularDano = obterCalcularDano();
    if (!calcularDano) return falha("DMG_INDISPONIVEL", "calcularDano não encontrado — carregar dmg.js (frente DMG) antes do vlab.js");
    const facesRestantes = facesDadas ? facesDadas.slice(cursor) : undefined;
    const dmg = calcularDano({
      expressaoDano: tecnica.expressaoDano,
      componentes: tecnica.componentes,
      tipos: tecnica.tipos || (tecnica.tipo ? [tecnica.tipo] : []),
      reparticao: tecnica.reparticao,
      classificacao: tecnica.classificacao,
      posicaoFIP: tecnica.posicaoFIP,
      contexto: { faces: facesRestantes, semente: facesRestantes ? undefined : ctx.semente, critico },
    });
    if (dmg.erro) return falha(dmg.erro.codigo, dmg.erro.detalhe || "");
    danoAplicado = dmg;
    totalEfectivo = dmg.total;

    // D7 — RD na aplicação à Vida
    const rd = alvo.rd;
    if (rd && ((rd.geral | 0) > 0 || (rd.porTipo && Object.values(rd.porTipo).some((x) => x > 0)))) {
      const tipos = [...new Set(dmg.parcelas.map((p) => p.tipo))];
      if (dmg.parcelas.length !== 1 || tipos.length !== 1)
        return falha("RD_SEM_DISTRIBUICAO_POR_TIPO", "o VLAB original não distribui RD por vários componentes/tipos — falta decisão registada para esse caso");
      const geral = rd.geral | 0;
      const especifica = (rd.porTipo && rd.porTipo[tipos[0]]) | 0;
      if (geral > 0 && especifica > 0)
        return falha("RD_EMPILHAMENTO_SEM_DECISAO", "RD geral e RD específica do mesmo tipo ao mesmo tempo: o código original recusa (empilhamento sem decisão)");
      rdAplicada = geral > 0 ? geral : especifica;
      totalEfectivo = Math.max(0, dmg.total - rdAplicada);
    }

    if (!Number.isSafeInteger(dmg.total) || !Number.isSafeInteger(totalEfectivo))
      return falha("VALOR_ACIMA_DO_LIMITE_EXACTO", "o dano calculado excede o limite exacto (2^53): o motor recusa em vez de aproximar");

    // D8 — aplicar à Vida e derivar estados
    // Testes de morte (M3 do Mestre; bancada BANCADA-MORTE-JULGAMENTO.md):
    // alvo DESIGNADO (alvo.testesDeMorteDesignado === true) que zera a
    // Vida nasce em soDoMestre.alvoDepois.estadoMorte {fase:"aMorrer"};
    // dano directo qualificado sobre quem já está aMorrer soma +1 falha
    // (fronteira T1); estabilizado ferido outra vez reentra a 0/0.
    if (vidaDepois !== null) {
      const vidaAntesDoGolpe = vidaDepois;
      vidaDepois = vidaDepois - totalEfectivo;
      const antes = Array.isArray(alvo.estado) ? alvo.estado : [];
      if (vidaDepois <= 0) {
        vidaDepois = 0;
        if (!antes.includes("foraDeCombate")) estadosNovos.push("foraDeCombate");
        morteAdjudicada = false;
      } else if (Number.isFinite(alvo.vidaTotal) && vidaDepois * 10 < alvo.vidaTotal && !antes.includes("fraco")) {
        estadosNovos.push("fraco");
      }
      if (tecnica.derruba && vidaDepois > 0 && !antes.includes("caido")) estadosNovos.push("caido");
      const em = alvo.estadoMorte && typeof alvo.estadoMorte === "object" ? alvo.estadoMorte : null;
      if (em && em.fase === "aMorrer") {
        const excluido = ctx.danoEmArea === true || ctx.danoReflectido === true || ctx.danoPeriodico === true || ctx.danoAmbiental === true;
        if (!excluido && totalEfectivo > 0) {
          const falhasNovas = (em.falhas | 0) + 1; // crítico incluído: +1, nunca +2 (T1)
          estadoMorteDepois = { fase: "aMorrer", sucessos: em.sucessos | 0, falhas: falhasNovas };
          if (falhasNovas >= 3) { morteAdjudicada = true; morteVia = "testesDeMorte"; }
        } else {
          estadoMorteDepois = { fase: "aMorrer", sucessos: em.sucessos | 0, falhas: em.falhas | 0 };
        }
      } else if (em && em.fase === "estabilizado" && totalEfectivo > 0) {
        estadoMorteDepois = { fase: "aMorrer", sucessos: 0, falhas: 0 }; // reentrada (T1)
      } else if (vidaAntesDoGolpe > 0 && vidaDepois === 0 && alvo.testesDeMorteDesignado === true) {
        estadoMorteDepois = { fase: "aMorrer", sucessos: 0, falhas: 0 }; // nascimento da corrida
      }
    }
    // Fecho de faces: ataque + dano têm de consumir exactamente as dadas
    if (facesDadas) {
      const consumidasDano = dmg.parcelas.reduce((s, p) => s + p.faces.length, 0);
      if (cursor + consumidasDano !== facesDadas.length)
        return falha("FACES_A_MAIS", "a lista de faces não fecha com o consumo do ataque+dano");
    }
  }

  const pa = { custo, paLivreAntes: paAntes, paLivreDepois: paAntes - custo, exaustao };
  // B — reacção do alvo: consumida quando declarada (acerte ou erre o
  // ataque — regra da sessão/cânone: a Reacção gasta-se ao ser usada).
  const usouReacaoLimiar = Boolean(alvo.reacaoDefensiva || alvo.defesaAplicavel);
  const reacaoConsumida = usouReacaoLimiar || Boolean(alvo.contraAtaque);
  // Contra-atacar: só nasce se o ataque ERROU contra a CA (sem reacção-
  // limiar a gastar a mesma Reacção) e o defensor declarou Contra-atacar.
  // O contra-ataque em si resolve-se com OUTRA chamada a resolverAtaque
  // (papéis trocados, vantagemExtra: 1, defesa = CA base do agressor).
  let contraAtaquePendente = null;
  if (resultado === "erra" && alvo.contraAtaque && alvo.contraAtaque.expressaoAtaque && !usouReacaoLimiar) {
    contraAtaquePendente = {
      expressaoAtaque: alvo.contraAtaque.expressaoAtaque,
      contextoSugerido: { vantagem: 1 },
      defesaDoAlvo: "CA base do agressor original (sem Reflexo — não existe reacção da reacção)",
      instrucao: "resolver com nova chamada a resolverAtaque: atacante = quem contra-ataca (técnica com esta expressaoAtaque), alvo = agressor original com a sua CA base, contexto = contextoSugerido",
    };
  }
  const reciboAtaque = `${parsedAtk.texto} → ${conjuntos.map((c) => `[${c.join(",")}]`).join(" | ")} = ${total} vs ${defesa.nomeDaRegra || "Defesa"} ${defesa.valor} → ${resultado.toUpperCase()}`;
  let recibo = acerta && danoAplicado
    ? `${reciboAtaque} · dano ${totalEfectivo}${rdAplicada ? ` (bruto ${danoAplicado.total}, RD ${rdAplicada})` : ""}${danoAplicado.parcelas.length && danoAplicado.parcelas[0].tipo ? ` (${danoAplicado.parcelas.map((p) => p.tipo).join("+")})` : ""}`
    : reciboAtaque;

  // ============================================================
  // FALHA CRÍTICA → DESGRAÇA (regra do Mestre no questionário de
  // 03/11/2026; especificação BANCADA-DESGRACA-JULGAMENTO.md J1–J9).
  // O ataque errou, o alvo sofre 0, os custos pagaram-se — e acontece
  // exactamente UMA desgraça ao atacante, por sorte (1d100), por
  // escolha do Mestre, ou como proposta a confirmar (fluxo H10).
  // ============================================================
  let falhaCriticaInfo = null, desgracaPendente = null, atacanteDepois = null;
  if (falhaCriticaDetectada) {
    const TABELA_DESGRACAS = [
      { id: "cai", nome: "Ele cai", gravidade: 1, peso: 35 },
      { id: "arma-cai", nome: "A arma cai", gravidade: 2, peso: 26 },
      { id: "acerta-amigo", nome: "Acerta um amigo sem querer", gravidade: 3, peso: 17 },
      { id: "acerta-se", nome: "Acerta-se a si próprio", gravidade: 4, peso: 16 },
      { id: "arma-quebra", nome: "A arma quebra", gravidade: 5, peso: 3 },
      { id: "quebra-corpo", nome: "Quebra parte do corpo", gravidade: 6, peso: 3 },
    ];
    // Pesos FINAIS do Mestre: as duas graves a 3% cada (23:14) e o
    // ajuste das 23:18 — tirou 3 de «Ele cai» (38→35) para «Acerta-se
    // a si próprio» (13→16). As 3 ideias da bancada foram rejeitadas.
    const modo = ctx.modoDesgraca === undefined ? "sorte" : ctx.modoDesgraca;
    if (!["sorte", "escolha", "proposta"].includes(modo))
      return falha("MODO_DESGRACA_INVALIDO", `modoDesgraca "${modo}" — valores: "sorte" | "escolha" | "proposta"`);
    const elegiveis = (Array.isArray(ctx.aliadosAoAlcance) ? ctx.aliadosAoAlcance : [])
      .filter((a) => a && a.id && (a.posicao === "adjacente" || a.posicao === "naLinha"));
    const aplicavel = (dg) => {
      if (dg.id === "arma-cai" || dg.id === "arma-quebra") return usaArmaTec;
      if (dg.id === "acerta-amigo") return elegiveis.length > 0;
      return true;
    };
    const motivoExclusao = (dg) => dg.id === "acerta-amigo" ? "sem aliado adjacente ou na linha (o «se possível» do Mestre)" : "o ataque não usa arma";
    const aplicaveis = TABELA_DESGRACAS.filter(aplicavel);
    const excluidas = TABELA_DESGRACAS.filter((dg) => !aplicavel(dg)).map((dg) => ({ id: dg.id, motivo: motivoExclusao(dg) }));
    // Renormalização declarada (J7): bandas inteiras por arredondamento
    // acumulado da percentagem renormalizada, empate para baixo.
    const somaPesos = aplicaveis.reduce((s, dg) => s + dg.peso, 0);
    const arredBaixo = (x) => Math.ceil(x - 0.5);
    let acumulado = 0, inicio = 1;
    const tabelaEfectiva = aplicaveis.map((dg) => {
      acumulado += (dg.peso / somaPesos) * 100;
      const fim = arredBaixo(acumulado);
      const linha = { id: dg.id, nome: dg.nome, gravidade: dg.gravidade, pesoOriginal: dg.peso, probabilidadeReal: Math.round((dg.peso / somaPesos) * 1000) / 10, banda: [inicio, fim] };
      inicio = fim + 1;
      return linha;
    });

    let desgraca = null, rolagemDesgraca = null;
    if (modo === "escolha") {
      const id = ctx.desgracaEscolhida;
      if (!id) return falha("DESGRACA_ESCOLHA_SEM_ID", "modo \"escolha\" exige contexto.desgracaEscolhida");
      desgraca = TABELA_DESGRACAS.find((dg) => dg.id === id) || null;
      if (!desgraca) return falha("DESGRACA_ID_DESCONHECIDO", `desgraça "${id}" não existe na tabela`);
      if (!aplicavel(desgraca)) return falha("DESGRACA_ESCOLHIDA_INAPLICAVEL", `"${id}" não é aplicável nesta cena; aplicáveis: ${aplicaveis.map((d) => d.id).join(", ")}`);
    } else {
      const r100 = tirar(100);
      if (r100.erro) return falha(r100.erro, r100.detalhe || "");
      rolagemDesgraca = r100.face;
      const linha = tabelaEfectiva.find((l) => rolagemDesgraca >= l.banda[0] && rolagemDesgraca <= l.banda[1]);
      desgraca = TABELA_DESGRACAS.find((dg) => dg.id === linha.id);
    }
    const aplicado = modo !== "proposta";
    falhaCriticaInfo = {
      modo, rolagemDesgraca, tabelaEfectiva, excluidas,
      desgraca: { id: desgraca.id, nome: desgraca.nome, gravidade: desgraca.gravidade },
      aplicado,
      ...(modo === "proposta" ? { requerConfirmacao: true } : {}),
      ...(ctx.confirmacaoDeProposta ? { propostaOriginal: ctx.confirmacaoDeProposta.proposta || null, trocadaSobreProposta: Boolean(ctx.confirmacaoDeProposta.trocada) || (ctx.confirmacaoDeProposta.proposta != null && ctx.confirmacaoDeProposta.proposta !== desgraca.id) } : {}),
    };

    // Dano derivado (amigo / si próprio): 1 rolagem pelo DMG, NUNCA
    // crítico, metade com piso → RD → tecto de 1 de Vida (J2).
    let consumidasDerivado = 0;
    const rolarDerivado = () => {
      const calc = obterCalcularDano();
      if (!calc) return { erro: "DMG_INDISPONIVEL" };
      const resto = facesDadas ? facesDadas.slice(cursor) : undefined;
      const d = calc({
        expressaoDano: tecnica.expressaoDano, componentes: tecnica.componentes,
        tipos: tecnica.tipos || (tecnica.tipo ? [tecnica.tipo] : []),
        reparticao: tecnica.reparticao, classificacao: tecnica.classificacao, posicaoFIP: tecnica.posicaoFIP,
        contexto: { faces: resto, semente: resto ? undefined : ctx.semente, critico: false },
      });
      if (d.erro) return { erro: d.erro.codigo, detalhe: d.erro.detalhe };
      consumidasDerivado = d.parcelas.reduce((s, p) => s + p.faces.length, 0);
      return { dmg: d, metade: Math.floor(d.total / 2) };
    };
    const rdDe = (quem, dmgRef) => {
      const rd = quem && quem.rd;
      if (!rd || !((rd.geral | 0) > 0 || (rd.porTipo && Object.values(rd.porTipo).some((x) => x > 0)))) return { rd: 0 };
      const tipos = [...new Set(dmgRef.parcelas.map((p) => p.tipo))];
      if (dmgRef.parcelas.length !== 1 || tipos.length !== 1) return { erro: "RD_SEM_DISTRIBUICAO_POR_TIPO" };
      const geral = rd.geral | 0, especifica = (rd.porTipo && rd.porTipo[tipos[0]]) | 0;
      if (geral > 0 && especifica > 0) return { erro: "RD_EMPILHAMENTO_SEM_DECISAO" };
      return { rd: geral > 0 ? geral : especifica };
    };

    if (aplicado && desgraca.id === "cai") {
      const jaCaido = (Array.isArray(atacante.estado) ? atacante.estado : []).includes("caido");
      atacanteDepois = { estadosNovos: jaCaido ? [] : ["caido"] };
      falhaCriticaInfo.jaCaido = jaCaido;
    } else if (aplicado && desgraca.id === "arma-cai") {
      atacanteDepois = { armaCaida: true, custoRecuperacao: "1 accao de movimento" };
    } else if (aplicado && desgraca.id === "arma-quebra") {
      // Palavra FINAL do Mestre (03/11/2026 23:14), que substitui o
      // «até ao fim do combate» da bancada: a arma quebra DE VEZ e fica
      // quebrada até ser consertada. A bandeira persiste na ficha até
      // quem chama declarar o conserto (deixando de a enviar); o motor
      // recusa ataques com ela (ARMA_QUEBRADA, pré-verificação B0).
      atacanteDepois = { armaQuebrada: true, duracao: "ateSerConsertada" };
    } else if (aplicado && desgraca.id === "quebra-corpo") {
      falhaCriticaInfo.efeitoMecanico = { tipo: "quebraCorporal", parteDoCorpo: ctx.parteDoCorpo || null, niveisDesvantagemAtaque: 1, deslocamentoMetade: true, duracao: "ateFimDoCombate", instrucao: "quem chama aplica +1 nível de Desvantagem nos ataques dele e deslocamento a metade até ao fim do combate; não é um estado da ficha" };
    } else if (aplicado && desgraca.id === "acerta-amigo") {
      let aliado = null;
      if (ctx.aliadoAtingidoId) {
        aliado = elegiveis.find((a) => a.id === ctx.aliadoAtingidoId) || null;
        if (!aliado) return falha("ALIADO_ATINGIDO_NAO_ELEGIVEL", `aliadoAtingidoId "${ctx.aliadoAtingidoId}" não está entre os elegíveis (adjacentes ou na linha)`);
        falhaCriticaInfo.criterioAmigo = "declarado";
      } else { aliado = elegiveis[0]; falhaCriticaInfo.criterioAmigo = "primeiroDaListaPorProximidade"; }
      const der = rolarDerivado();
      if (der.erro) return falha(der.erro, der.detalhe || "");
      desgracaPendente = { tipo: "acertaAmigo", aliadoId: aliado.id, danoBruto: der.dmg.total, danoAntesDaRD: der.metade, tipos: der.dmg.parcelas.map((p) => p.tipo), reflectivel: false, verificavel: false, instrucao: "quem chama aplica ao aliado: metade (já calculada) → RD dele → Vida dele, com o tecto de nunca baixar de 1 de Vida, e sem reacção defensiva" };
    } else if (aplicado && desgraca.id === "acerta-se") {
      const der = rolarDerivado();
      if (der.erro) return falha(der.erro, der.detalhe || "");
      if (Number.isFinite(atacante.vidaActual)) {
        const r = rdDe(atacante, der.dmg);
        if (r.erro) return falha(r.erro, "RD do próprio atacante no dano da desgraça");
        const preTecto = Math.max(0, der.metade - r.rd);
        const efectivo = Math.min(preTecto, Math.max(0, atacante.vidaActual - 1)); // tecto J2: nunca abaixo de 1
        const vidaDep = atacante.vidaActual - efectivo;
        const estadosNovosAtk = [];
        if (vidaDep > 0 && Number.isFinite(atacante.vidaTotal) && vidaDep * 10 < atacante.vidaTotal && !(Array.isArray(atacante.estado) ? atacante.estado : []).includes("fraco")) estadosNovosAtk.push("fraco");
        atacanteDepois = { vidaActual: vidaDep, danoSofrido: efectivo, danoAntesDaRD: der.metade, rdAplicada: r.rd, tetoAplicado: efectivo < preTecto, estadosNovos: estadosNovosAtk };
      } else {
        desgracaPendente = { tipo: "acertaSiProprio", danoBruto: der.dmg.total, danoAntesDaRD: der.metade, tipos: der.dmg.parcelas.map((p) => p.tipo), reflectivel: false, verificavel: false, instrucao: "quem chama aplica ao atacante: metade (já calculada) → RD dele → Vida dele, com o tecto de nunca baixar de 1 de Vida, e sem reacção defensiva" };
      }
    }
    // Fecho exacto de faces do caminho da falha crítica (J9.3)
    if (facesDadas && cursor + consumidasDerivado !== facesDadas.length)
      return falha("FACES_A_MAIS", "a lista de faces não fecha com o consumo (ataque + d100/dano derivado da desgraça)");
    recibo = modo === "proposta"
      ? `${reciboAtaque} → FALHA CRÍTICA (a aguardar a decisão do Mestre)`
      : `${reciboAtaque} → FALHA CRÍTICA — ${desgraca.nome}${desgraca.id === "acerta-amigo" && desgracaPendente ? ` (${desgracaPendente.aliadoId})` : ""}${desgraca.id === "quebra-corpo" && ctx.parteDoCorpo ? ` (${ctx.parteDoCorpo})` : ""}`;
    totalEfectivo = 0; // o alvo sofre zero, explicitamente (J9.4)
  }

  const alvoDepois = { vidaActual: vidaDepois, estadosNovos, estadosRemovidos };
  if (morteAdjudicada !== null) alvoDepois.morteAdjudicada = morteAdjudicada;
  if (morteVia) alvoDepois.morteVia = morteVia;
  if (estadoMorteDepois) alvoDepois.estadoMorte = estadoMorteDepois;
  // D4 (bancada das pendências): forçar uma MAGIA sem PA ⇒ colapso da
  // Regra 1 do Sistema de Magia — inconsciente; em batalha, «considerado,
  // na prática: Morte». Só em soDoMestre; nunca toca em morteAdjudicada.
  const colapso = exaustao && tecnica.magia === true
    ? { inconsciente: true, mortePraticaEmBatalha: true, fonte: "Sistema de Magia, Regra 1 — Exaustão Espiritual extrema ao conjurar sem PA Livre suficiente" }
    : null;

  return {
    resultado,
    rolagem: { expressao: parsedAtk.texto, conjuntosDeFaces: conjuntos, bonus: parsedAtk.bonus, ajusteVantagemDesvantagem: ajustePorRolagem, niveisLiquidos: liquido, resultados, escolhido: total, total },
    defesaUsada: defesa,
    pa,
    danoAplicado,
    rdAplicada,
    totalEfectivo,
    reacaoConsumida,
    contraAtaquePendente,
    desgracaPendente,
    publico: { recibo },
    soDoMestre: { alvoDepois, efeitosAtacante: exaustao ? ["exaustaoEspiritual"] : [], ...(colapso ? { colapso } : {}), ...(falhaCriticaInfo ? { falhaCritica: falhaCriticaInfo } : {}), ...(atacanteDepois ? { atacanteDepois } : {}) },
    erro: null,
  };
}

// ---------------------------------------------------------------------
// PARTE C — validações de movimento (contrato v1.1). Não resolvem
// ataques: validam custos e dizem que ataques de oportunidade nascem.
// ---------------------------------------------------------------------

function novoCursorC(ctx) {
  const faces = Array.isArray(ctx.faces) ? ctx.faces : null;
  let cursor = 0;
  let estado = (ctx.semente >>> 0) || 0x9e3779b9;
  return {
    facesDadas: faces,
    proxima(lados) {
      if (faces) {
        if (cursor >= faces.length) throw Object.assign(new Error("faces insuficientes"), { codigo: "FACES_INSUFICIENTES" });
        const f = faces[cursor++];
        if (!Number.isInteger(f) || f < 1 || f > lados) throw Object.assign(new Error("face fora do intervalo"), { codigo: "FACE_FORA_DO_INTERVALO" });
        return f;
      }
      estado ^= estado << 13; estado >>>= 0; estado ^= estado >> 17; estado ^= estado << 5; estado >>>= 0;
      return (estado % lados) + 1;
    },
    consumidas: () => cursor,
  };
}

function rolarTesteC(expressao, cur) {
  const p = analisarExpressaoAtaque(expressao);
  if (!p || p.erro) throw Object.assign(new Error("expressão fora da gramática"), { codigo: "EXPRESSAO_FORA_DA_GRAMATICA" });
  const faces = [];
  for (const t of p.termos) for (let i = 0; i < t.qtd; i++) faces.push(cur.proxima(t.faces));
  return { total: faces.reduce((a, b) => a + b, 0) + p.bonus, faces, expressao: p.texto };
}

function validarForcarPassagem(entrada) {
  const falhaC = (codigo, detalhe) => ({ passou: null, rolagemAtacante: null, rolagemDefensor: null, accaoPadraoGasta: null, erro: { codigo, detalhe } });
  const { atacante, defensor, contexto } = entrada || {};
  if (!atacante || !defensor || !atacante.expressaoForca || !defensor.expressaoForca)
    return falhaC("EMPURRAO_ALVO_EM_FALTA", "forçar passagem precisa das expressões de Força dos dois lados");
  const ctx = contexto || {};
  if (!Array.isArray(ctx.faces) && !Number.isFinite(ctx.semente))
    return falhaC("SEM_FACES_NEM_SEMENTE", "o contexto tem de trazer faces ou semente");
  const cur = novoCursorC(ctx);
  try {
    const ra = rolarTesteC(atacante.expressaoForca, cur);
    const rd = rolarTesteC(defensor.expressaoForca, cur);
    if (cur.facesDadas && cur.consumidas() !== cur.facesDadas.length)
      return falhaC("FACES_A_MAIS", "a lista de faces não fecha com o consumo do teste");
    // Regra 3 + sessão (3ª explicação): empurrar é Acção Padrão; empatar
    // NÃO passa; perder = não passa e a Padrão fica gasta sem efeito.
    return { passou: ra.total > rd.total, rolagemAtacante: ra, rolagemDefensor: rd, accaoPadraoGasta: true, erro: null };
  } catch (e) {
    return falhaC(e.codigo || "EXPRESSAO_FORA_DA_GRAMATICA", e.message);
  }
}

function validarSaidaDeAdjacencia(entrada) {
  const falhaC = (codigo, detalhe) => ({ ataquesDeOportunidade: null, cobertosPorDesvincular: null, erro: { codigo, detalhe } });
  const { inimigosAdjacentes, desvincular } = entrada || {};
  if (!Array.isArray(inimigosAdjacentes)) return falhaC("ENTRADA_INCOMPLETA", "inimigosAdjacentes (lista) é obrigatório");
  // C2 FECHADO pelo Mestre (questionário, 03/11/2026, opção B): Afastar
  // com segurança cobre TODOS os inimigos adjacentes no momento do uso;
  // inimigos encontrados depois, no caminho, atacam na mesma.
  let cobertos = [];
  if (desvincular) {
    if (!desvincular.gastouAccaoPadrao) return falhaC("DESVINCULAR_SEM_ACCAO_PADRAO", "Afastar com segurança custa 1 Acção Padrão (Regra 3)");
    cobertos = inimigosAdjacentes.filter((i) => i && i.id).map((i) => i.id);
  }
  const ataques = inimigosAdjacentes
    .filter((i) => i && i.reacaoDisponivel && !cobertos.includes(i.id))
    .map((i) => ({ inimigoId: i.id, instrucao: "resolver com resolverAtaque e contexto.ataqueDeOportunidade = true (o alvo não pode reagir)" }));
  return { ataquesDeOportunidade: ataques, cobertosPorDesvincular: cobertos, erro: null };
}

function validarCorrer(entrada) {
  const falhaC = (codigo, detalhe) => ({ deslocamentoMaximo: null, custoDeclarado: null, erro: { codigo, detalhe } });
  const { deslocamentoBase, acaoPadraoDisponivel } = entrada || {};
  if (!Number.isFinite(deslocamentoBase)) return falhaC("ENTRADA_INCOMPLETA", "deslocamentoBase (já com a metade do Fraco, se aplicável) é obrigatório");
  if (!acaoPadraoDisponivel) return falhaC("CORRER_SEM_ACCAO_PADRAO", "Correr gasta a Acção Padrão como segundo movimento");
  return { deslocamentoMaximo: deslocamentoBase * 2, custoDeclarado: "AccaoPadrao", erro: null };
}

// ---------------------------------------------------------------------
// SALVAGUARDA E REFLEXÃO (Sistema de Magia Regra 4; Sistema de Combate
// Regra 8) — especificação da bancada das pendências (D1/D2, 03/11/2026).
// Ordem de faces fechada: reflexão → salvaguarda → dano. Com «anula» +
// resistência, o dano NÃO rola e as faces fecham exactas.
// ---------------------------------------------------------------------

function rolarComNiveisC(parsed, liquido, cur) {
  const conjuntos = [];
  const nConj = 1 + Math.abs(liquido);
  for (let s = 0; s < nConj; s++) {
    const faces = [];
    for (const t of parsed.termos) for (let i = 0; i < t.qtd; i++) faces.push(cur.proxima(t.faces));
    conjuntos.push(faces);
  }
  const ajuste = liquido * 2;
  const resultados = conjuntos.map((f) => f.reduce((a, b) => a + b, 0) + parsed.bonus + ajuste);
  const escolhido = liquido > 0 ? Math.max(...resultados) : liquido < 0 ? Math.min(...resultados) : resultados[0];
  return { conjuntos, resultados, total: escolhido };
}

function resolverSalvaguarda(entrada) {
  const falha = (codigo, detalhe) => ({ cd: null, teste: null, reflexao: null, resistiu: null, danoBruto: null, totalAposSalvaguarda: null, rdAplicada: null, totalEfectivo: null, danoReflectidoPendente: null, efeitoDaMagia: null, publico: null, soDoMestre: null, erro: { codigo, detalhe } });
  const { conjurador, alvo, magia, contexto } = entrada || {};
  const ctx = contexto || {};
  if (!conjurador || !alvo || !magia) return falha("ENTRADA_INCOMPLETA", "conjurador, alvo e magia são obrigatórios");
  if (!Number.isFinite(conjurador.proficiencia) || !Number.isFinite(conjurador.inteligencia))
    return falha("CD_EM_FALTA", "a CD precisa de proficiência e INT do conjurador (CD = Proficiência + INT + bónus)");
  const cd = conjurador.proficiencia + conjurador.inteligencia + (conjurador.bonusCD || 0);
  if (!Number.isSafeInteger(cd)) return falha("VALOR_ACIMA_DO_LIMITE_EXACTO", "a CD excede o limite exacto (2^53)");

  // Teste do alvo: ancorado na ficha (alvo.testes.<nomeTeste>); override
  // só com origem citada — nenhuma expressão nasce dentro do motor.
  let expressaoTeste = null, origemTeste = null;
  if (entrada.testeExpressao) {
    if (!entrada.testeOrigem) return falha("TESTE_SEM_ORIGEM", "expressão de teste declarada por fora da ficha exige a origem citada");
    expressaoTeste = entrada.testeExpressao; origemTeste = entrada.testeOrigem;
  } else if (magia.nomeTeste && alvo.testes && alvo.testes[magia.nomeTeste]) {
    expressaoTeste = alvo.testes[magia.nomeTeste]; origemTeste = `alvo.testes.${magia.nomeTeste} (ficha do alvo)`;
  }
  if (!expressaoTeste) return falha("TESTE_DE_SALVAGUARDA_EM_FALTA", "nem a ficha do alvo nem um override com origem trazem o teste indicado pela magia");
  const parsedTeste = analisarExpressaoAtaque(expressaoTeste);
  if (!parsedTeste || parsedTeste.erro) return falha("EXPRESSAO_FORA_DA_GRAMATICA", "a expressão do teste está fora da gramática de dados");
  if (magia.expressaoDano == null && !Array.isArray(magia.componentes)) return falha("TECNICA_SEM_DANO", "a magia não traz expressão de dano nem componentes");
  if (!Array.isArray(ctx.faces) && !Number.isFinite(ctx.semente)) return falha("SEM_FACES_NEM_SEMENTE", "o contexto tem de trazer faces ou semente");

  const cur = novoCursorC(ctx);
  const facesDadas = cur.facesDadas;
  const efeito = magia.efeitoSeResistir || "nenhum";
  let reflexao = null, danoReflectidoPendente = null, resistiu = null, testeInfo = null;
  let danoBruto = null, totalAposSalvaguarda = null, rdAplicada = null, totalEfectivo = null, dmg = null;
  try {
    // 1) REFLEXÃO (Reacção, antes do resultado) — teste de Arcanismo do
    // alvo contra a CD. Superar ⇒ sem dano para o alvo e metade do dano
    // definido volta como pendente (nunca reflectível outra vez).
    if (alvo.reacaoRefletir) {
      const exprArc = alvo.testes && alvo.testes.arcanismo;
      if (!exprArc) return falha("REFLEXAO_SEM_TESTE_DE_ARCANISMO", "Refletir Magias exige o teste de Arcanismo da ficha do alvo");
      const pArc = analisarExpressaoAtaque(exprArc);
      if (!pArc || pArc.erro) return falha("EXPRESSAO_FORA_DA_GRAMATICA", "a expressão de Arcanismo está fora da gramática");
      const r = rolarComNiveisC(pArc, 0, cur);
      reflexao = { expressao: pArc.texto, conjuntos: r.conjuntos, total: r.total, superou: r.total > cd };
    }
    const reflectiu = reflexao && reflexao.superou;
    // 2) SALVAGUARDA — só se a reflexão não teve sucesso (convenção
    // registada da bancada: nunca as duas com sucesso sobre o mesmo dano).
    if (!reflectiu) {
      let liq = (ctx.vantagem | 0) - (ctx.desvantagem | 0);
      liq = Math.max(-4, Math.min(4, liq));
      const r = rolarComNiveisC(parsedTeste, liq, cur);
      const maximoRolavel = parsedTeste.termos.reduce((s, t) => s + t.qtd * t.faces, 0) + parsedTeste.bonus + 2 * liq;
      resistiu = r.total > cd;
      testeInfo = { nome: magia.nomeTeste || null, expressao: parsedTeste.texto, origem: origemTeste, conjuntos: r.conjuntos, resultados: r.resultados, total: r.total, maximoRolavel, aviso: cd >= maximoRolavel ? "CD_ACIMA_DO_MAXIMO_DO_TESTE" : null };
    }
    // 3) DANO — rola-se quando: sem resistência-anula, ou para calcular
    // a metade reflectida. Com «anula» + resistência, NÃO rola.
    const anulaEResistiu = resistiu === true && efeito === "anula";
    if (!anulaEResistiu) {
      const calcularDano = obterCalcularDano();
      if (!calcularDano) return falha("DMG_INDISPONIVEL", "a frente DMG (calcularDano) não está carregada");
      const resto = facesDadas ? facesDadas.slice(cur.consumidas()) : null;
      dmg = calcularDano({
        expressaoDano: magia.expressaoDano, componentes: magia.componentes,
        tipos: magia.tipos || (magia.tipo ? [magia.tipo] : []),
        reparticao: magia.reparticao, classificacao: magia.classificacao, posicaoFIP: magia.posicaoFIP,
        contexto: { faces: resto, semente: resto ? undefined : ctx.semente, critico: false },
      });
      if (dmg.erro) return falha(dmg.erro.codigo, dmg.erro.detalhe);
      danoBruto = dmg.total;
      if (!Number.isSafeInteger(danoBruto)) return falha("VALOR_ACIMA_DO_LIMITE_EXACTO", "o dano da magia excede o limite exacto (2^53)");
    }
    if (reflectiu) {
      // Metade do dano definido (bruto), piso — política TEST confirmada
      // pelo Mestre em 2026-10-21, canonização pendente.
      danoReflectidoPendente = { valor: Math.floor(danoBruto / 2), tipo: magia.tipo || (dmg.parcelas[0] && dmg.parcelas[0].tipo) || null, reflectivel: false, destino: "conjurador", aplicarPor: "via normal de dano (com a RD do conjurador); sem salvaguarda de retorno" };
      totalEfectivo = 0;
    } else if (anulaEResistiu) {
      totalAposSalvaguarda = 0; totalEfectivo = 0;
    } else {
      totalAposSalvaguarda = resistiu === true && efeito === "metade" ? Math.floor(danoBruto / 2) : danoBruto;
      totalEfectivo = totalAposSalvaguarda;
      const rd = alvo.rd;
      if (rd && ((rd.geral | 0) > 0 || (rd.porTipo && Object.values(rd.porTipo).some((x) => x > 0)))) {
        const tipos = [...new Set(dmg.parcelas.map((p) => p.tipo))];
        if (dmg.parcelas.length !== 1 || tipos.length !== 1)
          return falha("RD_SEM_DISTRIBUICAO_POR_TIPO", "o VLAB original não distribui RD por vários componentes/tipos — falta decisão registada para esse caso");
        const geral = rd.geral | 0;
        const especifica = (rd.porTipo && rd.porTipo[tipos[0]]) | 0;
        if (geral > 0 && especifica > 0)
          return falha("RD_EMPILHAMENTO_SEM_DECISAO", "RD geral e RD específica do mesmo tipo ao mesmo tempo: o código original recusa (empilhamento sem decisão)");
        rdAplicada = geral > 0 ? geral : especifica;
        totalEfectivo = Math.max(0, totalAposSalvaguarda - rdAplicada);
      }
    }
    if (facesDadas) {
      const consumidasDmg = dmg ? dmg.parcelas.reduce((s, p) => s + p.faces.length, 0) : 0;
      if (cur.consumidas() + consumidasDmg !== facesDadas.length)
        return falha("FACES_A_MAIS", "a lista de faces não fecha com o consumo (reflexão+salvaguarda+dano)");
    }
  } catch (e) {
    return falha(e.codigo || "EXPRESSAO_FORA_DA_GRAMATICA", e.message);
  }

  // Aplicação à Vida (a mesma derivação do ataque)
  let vidaDepois = Number.isFinite(alvo.vidaActual) ? alvo.vidaActual : null;
  const estadosNovos = [], estadosRemovidos = [];
  let estadoMorteSg = null;
  if (vidaDepois !== null && totalEfectivo !== null) {
    const vidaAntesSg = vidaDepois;
    vidaDepois -= totalEfectivo;
    if (vidaDepois <= 0) { vidaDepois = 0; if (!(alvo.estado || []).includes("foraDeCombate")) estadosNovos.push("foraDeCombate"); }
    else if (Number.isFinite(alvo.vidaTotal) && vidaDepois * 10 < alvo.vidaTotal && !(alvo.estado || []).includes("fraco")) estadosNovos.push("fraco");
    // Testes de morte (M3; julgamento T9): o gatilho nasce também por
    // esta via, mas a salvaguarda NUNCA soma falhas a uma corrida aberta.
    const emSg = alvo.estadoMorte && typeof alvo.estadoMorte === "object" ? alvo.estadoMorte : null;
    if (emSg && emSg.fase === "estabilizado" && totalEfectivo > 0) estadoMorteSg = { fase: "aMorrer", sucessos: 0, falhas: 0 };
    else if (emSg && emSg.fase === "aMorrer") estadoMorteSg = { fase: "aMorrer", sucessos: emSg.sucessos | 0, falhas: emSg.falhas | 0 };
    else if (vidaAntesSg > 0 && vidaDepois === 0 && alvo.testesDeMorteDesignado === true) estadoMorteSg = { fase: "aMorrer", sucessos: 0, falhas: 0 };
  }
  const recibo = reflexao && reflexao.superou
    ? `reflexão ${reflexao.total} vs CD ${cd} → REFLETE metade (${danoReflectidoPendente.valor})`
    : `salvaguarda ${testeInfo ? testeInfo.total : "—"} vs CD ${cd} → ${resistiu ? "RESISTE" : "não resiste"}${totalEfectivo !== null ? ` · dano efectivo ${totalEfectivo}` : ""}`;
  const alvoDepoisSg = { vidaActual: vidaDepois, estadosNovos, estadosRemovidos };
  if (vidaDepois === 0) alvoDepoisSg.morteAdjudicada = false;
  if (estadoMorteSg) alvoDepoisSg.estadoMorte = estadoMorteSg;
  return {
    cd, teste: testeInfo, reflexao, resistiu,
    danoBruto, totalAposSalvaguarda, rdAplicada, totalEfectivo,
    danoReflectidoPendente,
    efeitoDaMagia: magia.textoEfeito || null, // citado, NUNCA aplicado pelo motor
    publico: { recibo },
    soDoMestre: { alvoDepois: alvoDepoisSg },
    erro: null,
  };
}

// ---------------------------------------------------------------------
// CURA (aplicarCura) — especificação da bancada das pendências (D3).
// Cura é componente declarado por magia/habilidade documentada: origem
// obrigatória, nunca ressuscita, teto = Vida máxima com excesso
// registado, números de Vida só em soDoMestre.
// ---------------------------------------------------------------------

function aplicarCura(entrada) {
  const falha = (codigo, detalhe) => ({ curaRolada: null, publico: null, soDoMestre: null, erro: { codigo, detalhe } });
  const { origem, quemCura, alvo, expressaoCura, contexto } = entrada || {};
  const ctx = contexto || {};
  if (!origem || !origem.nome) return falha("CURA_SEM_ORIGEM", "toda a cura cita a magia/habilidade documentada que a concede");
  if (entrada.curaBloqueada === true) return falha("CURA_BLOQUEADA_PELA_FONTE", "a ferida-fonte proíbe cura mágica (forma documentada: heal_blocked)");
  if (!alvo || !Number.isFinite(alvo.vidaTotal)) return falha("CURA_SEM_VIDA_MAXIMA", "a cura precisa da Vida máxima do alvo (teto)");
  if (!Number.isFinite(alvo.vidaActual)) return falha("ENTRADA_INCOMPLETA", "a cura precisa da Vida actual do alvo");
  // Emenda dos testes de morte (julgamento T4): «a cura não acorda quem
  // está a morrer (aMorrer) nem ressuscita mortos; sobre um alvo
  // ESTABILIZADO, a cura aplica-se normalmente, a partir de Vida 0.»
  const faseMorteCura = alvo.estadoMorte && alvo.estadoMorte.fase;
  if (alvo.vidaActual <= 0) {
    if (faseMorteCura === "aMorrer") return falha("CURA_SOBRE_QUEM_ESTA_A_MORRER", "quem está a morrer não pode ser curado — primeiro é preciso estabilizar (testes de morte, M3)");
    if (faseMorteCura !== "estabilizado") return falha("CURA_NAO_RESSUSCITA", "cura não ressuscita: alvo a Vida 0 está fora do alcance da cura");
  }
  if (alvo.vidaActual >= alvo.vidaTotal) return falha("CURA_ALVO_VIDA_CHEIA", "o alvo já está com a Vida cheia");
  if (!Number.isSafeInteger(alvo.vidaActual) || !Number.isSafeInteger(alvo.vidaTotal))
    return falha("VALOR_ACIMA_DO_LIMITE_EXACTO", "valores de Vida acima do limite exacto (2^53) recusam-se");
  const custo = Number.isInteger(entrada.custoPA) ? entrada.custoPA : 0;
  const paAntes = quemCura && quemCura.paLivre;
  if (!Number.isFinite(paAntes)) return falha("PA_EM_FALTA", "quemCura.paLivre não veio na entrada");
  let exaustao = false;
  if (paAntes < custo) {
    if (!entrada.forcarSemPA) return falha("PA_INSUFICIENTE", "PA livre insuficiente para o custo da cura");
    exaustao = true;
  }
  if (!Array.isArray(ctx.faces) && !Number.isFinite(ctx.semente)) return falha("SEM_FACES_NEM_SEMENTE", "o contexto tem de trazer faces ou semente");
  const parsed = analisarExpressaoAtaque(expressaoCura);
  if (!parsed || parsed.erro) return falha("EXPRESSAO_FORA_DA_GRAMATICA", "a expressão de cura está fora da gramática de dados");
  const cur = novoCursorC(ctx);
  let faces;
  try { const r = rolarTesteC(expressaoCura, cur); faces = r.faces; var curaRolada = r.total; } catch (e) { return falha(e.codigo || "EXPRESSAO_FORA_DA_GRAMATICA", e.message); }
  if (cur.facesDadas && cur.consumidas() !== cur.facesDadas.length) return falha("FACES_A_MAIS", "a lista de faces não fecha com a rolagem da cura");
  if (!Number.isSafeInteger(curaRolada)) return falha("VALOR_ACIMA_DO_LIMITE_EXACTO", "a cura rolada excede o limite exacto (2^53)");
  const efectiva = Math.min(curaRolada, alvo.vidaTotal - alvo.vidaActual);
  const excesso = curaRolada - efectiva;
  const vidaDepois = alvo.vidaActual + efectiva;
  const antes = Array.isArray(alvo.estado) ? alvo.estado : [];
  const estadosRemovidos = [];
  if (antes.includes("fraco") && vidaDepois * 10 >= alvo.vidaTotal) estadosRemovidos.push("fraco");
  const eraEstabilizado = faseMorteCura === "estabilizado" && alvo.vidaActual <= 0;
  if (eraEstabilizado && vidaDepois > 0 && antes.includes("foraDeCombate")) estadosRemovidos.push("foraDeCombate");
  const colapso = exaustao && entrada.magia === true
    ? { inconsciente: true, mortePraticaEmBatalha: true, fonte: "Sistema de Magia, Regra 1 — Exaustão Espiritual extrema ao conjurar sem PA Livre suficiente" }
    : null;
  return {
    curaRolada: null, // o total vive em soDoMestre (privacidade, bancada D3e)
    publico: { recibo: `cura ${parsed.texto} → [${faces.join(",")}] (origem: ${origem.nome})` },
    soDoMestre: {
      curaRolada, curaEfectiva: efectiva, excesso,
      pa: { custo, paLivreAntes: paAntes, paLivreDepois: paAntes - custo, exaustaoEspiritual: exaustao },
      alvoDepois: { vidaActual: vidaDepois, estadosRemovidos, ...(eraEstabilizado ? { estadoMorte: null } : {}) },
      ...(colapso ? { colapso } : {}),
    },
    erro: null,
  };
}

// ---------------------------------------------------------------------
// TESTES DE MORTE (resolverTesteDeMorte) — opção M3 do Mestre no
// questionário de 03/11/2026, construída pela bancada
// (BANCADA-MORTE-JULGAMENTO.md, decisões T1–T9):
//  · Âmbito por DESIGNAÇÃO: só quem traz testesDeMorteDesignado: true.
//    Sem designação, Vida 0 = foraDeCombate como sempre (T2).
//  · CD = CON do moribundo + k da classificação dele (T3). A CON
//    cancela-se dos dois lados: a probabilidade emerge só dos dados.
//  · Corrida: quem chegar a 3 primeiro — 3 sucessos estabilizam,
//    3 falhas matam (a bancada propôs 2×3; o Mestre decidiu 3×3, o
//    modelo de que ele se lembrava — palavra dele, 03/11/2026). Um
//    teste por ronda, no FIM da ronda — quem chama é o relógio (T5).
//  · Sem crítico nem falha crítica dentro do teste (T7).
//  · Com ajudante = tentativa de estabilização: Fortitude DO AJUDANTE
//    contra a CD do moribundo; sucesso = +1 sucesso; falha não soma.
//  · morteAdjudicada só aqui (e no dano directo qualificado de
//    resolverAtaque), sempre com via: "testesDeMorte". O colapso por
//    Exaustão é outra via e nunca se mistura (T9).
// ---------------------------------------------------------------------

const K_TESTE_DE_MORTE = { bronze: 3, prata: 6, ouro: 10, ouroNegro: 13, lendario: 20 };

function resolverTesteDeMorte(entrada) {
  const falha = (codigo, detalhe) => ({ cd: null, cdEfectiva: null, teste: null, sucesso: null, estadoMorte: null, estabilizado: null, morteAdjudicada: null, morteVia: null, desfecho: null, publico: null, soDoMestre: null, erro: { codigo, detalhe } });
  const { moribundo, ajudante, contexto } = entrada || {};
  const ctx = contexto || {};
  if (!moribundo) return falha("ENTRADA_INCOMPLETA", "moribundo é obrigatório");
  if (moribundo.testesDeMorteDesignado !== true)
    return falha("TESTE_DE_MORTE_NAO_DESIGNADO", "testes de morte só correm para quem o Mestre designou na ficha (testesDeMorteDesignado: true)");
  const em = moribundo.estadoMorte;
  if (em && em.fase === "estabilizado") return falha("TESTE_DE_MORTE_EM_ESTABILIZADO", "a corrida já fechou: estabilizado não rola testes de morte");
  if (!em || em.fase !== "aMorrer" || !Number.isInteger(em.sucessos) || !Number.isInteger(em.falhas))
    return falha("TESTE_DE_MORTE_SEM_ESTADO", "é preciso um estadoMorte em fase aMorrer com contadores inteiros");
  if (!Number.isSafeInteger(moribundo.constituicao))
    return falha("TESTE_DE_MORTE_SEM_CONSTITUICAO", "a CD deriva da CON do moribundo (CD = CON + k da classificação)");
  const k = K_TESTE_DE_MORTE[moribundo.classificacao];
  if (k === undefined)
    return falha("TESTE_DE_MORTE_CLASSIFICACAO_DESCONHECIDA", `sem k de teste de morte para a classificação "${moribundo.classificacao}"`);
  const cd = moribundo.constituicao + k;
  const quemRola = ajudante || moribundo;
  const expressao = quemRola.testes && quemRola.testes.fortitude;
  if (!expressao)
    return falha("TESTE_DE_MORTE_SEM_FORTITUDE", ajudante ? "o ajudante não traz testes.fortitude na ficha" : "o moribundo não traz testes.fortitude na ficha");
  // TESTE QUASE PURO (palavra do Mestre, 03/11/2026, duas voltas):
  // o bónus de Fortitude NÃO conta inteiro (um +5 é fácil — artefacto
  // Prata — e a corrida partia: 90–100% por teste); mas ignorá-lo todo
  // tornava a corrida sorte pura e punia quem investiu em Fortitude.
  // A conversão DELE: a cada 7 pontos de bónus de Fortitude EXTRA, a
  // CD desce 1. EXTRA = o que vem ALÉM da base normal da personagem
  // (Constituição + proficiência): títulos, artefactos/itens,
  // habilidades — declarado por quem chama em bonusFortitude (o motor
  // NÃO o deriva da expressão: a expressão mistura base e extra, e
  // contar a proficiência na conversão foi erro meu, corrigido pela
  // explicação dele com o exemplo CON 10 + prof 8 + título 2 +
  // artefacto 8 = extra 10 ⇒ CD −2). Rolam-se os DADOS da expressão +
  // a CONSTITUIÇÃO de quem rola, contra a CD reduzida.
  if (!Number.isSafeInteger(quemRola.constituicao))
    return falha("TESTE_DE_MORTE_SEM_CONSTITUICAO", ajudante ? "a estabilização precisa da CONSTITUIÇÃO do ajudante (teste de morte: dados + CON dele)" : "o teste de morte precisa da CONSTITUIÇÃO de quem rola (dados + CON)");
  const parsed = analisarExpressaoAtaque(expressao);
  if (!parsed || parsed.erro) return falha("EXPRESSAO_FORA_DA_GRAMATICA", "a expressão de Fortitude está fora da gramática de dados");
  if (!Array.isArray(ctx.faces) && !Number.isFinite(ctx.semente)) return falha("SEM_FACES_NEM_SEMENTE", "o contexto tem de trazer faces ou semente");

  const cur = novoCursorC(ctx);
  let r;
  try { r = rolarComNiveisC(parsed, 0, cur); } catch (e) { return falha(e.codigo || "EXPRESSAO_FORA_DA_GRAMATICA", e.message); }
  if (cur.facesDadas && cur.consumidas() !== cur.facesDadas.length)
    return falha("FACES_A_MAIS", "a lista de faces não fecha com o consumo do teste (sem faces de verificação: não há crítico nos testes de morte)");
  // Sem crítico (T7). Total = dados + CON de quem rola; a CD desce
  // floor(bónus/5) — conversão do Mestre, declarada na saída.
  const somaDados = r.conjuntos[0].reduce((a, b) => a + b, 0);
  const totalPuro = somaDados + quemRola.constituicao;
  const bonusDeclarado = Number.isInteger(quemRola.bonusFortitude) && quemRola.bonusFortitude >= 0;
  const bonusFortitude = bonusDeclarado ? quemRola.bonusFortitude : 0; // sem declaração, extra = 0 (a base CON+prof nunca converte)
  const reducaoCD = Math.floor(bonusFortitude / 7); // divisor FINAL dele (03/11/2026 22:59): a cada 7 de extra, −1 na CD
  const cdEfectiva = cd - reducaoCD;
  const sucesso = totalPuro > cdEfectiva;
  let { sucessos, falhas } = em;
  if (ajudante) { if (sucesso) sucessos += 1; } // ajuda falhada não soma falha (T6)
  else if (sucesso) sucessos += 1; else falhas += 1;
  let desfecho = "continua", estabilizado = false, morteAdjudicada = false;
  if (sucessos >= 3) { desfecho = "estabilizado"; estabilizado = true; } // corrida 3×3 — palavra do Mestre (03/11/2026): «quem chegar a 3 primeiro»
  else if (falhas >= 3) { desfecho = "morreu"; morteAdjudicada = true; }
  const estadoMorte = { fase: estabilizado ? "estabilizado" : "aMorrer", sucessos, falhas };
  const recibo = estabilizado
    ? "teste de morte → estabilizou"
    : morteAdjudicada ? "teste de morte → não resistiu" : `teste de morte → ${sucesso ? "aguenta-se" : "agrava-se"}`;
  return {
    cd,
    cdEfectiva,
    teste: { expressao: parsed.texto, origem: ajudante ? "testes.fortitude do ajudante (estabilização)" : "testes.fortitude do moribundo", conjuntos: r.conjuntos, somaDados, constituicaoSomada: quemRola.constituicao, bonusFortitude, bonusFonte: bonusDeclarado ? "declarado" : "nenhum", reducaoCD, total: totalPuro },
    sucesso,
    estadoMorte,
    estabilizado,
    morteAdjudicada,
    morteVia: morteAdjudicada ? "testesDeMorte" : null,
    desfecho,
    publico: { recibo },
    soDoMestre: { cd, cdEfectiva, estadoMorte, rodadaPor: ajudante ? "ajudante" : "moribundo" },
    erro: null,
  };
}

const API = { resolverAtaque, validarForcarPassagem, validarSaidaDeAdjacencia, validarCorrer, resolverSalvaguarda, aplicarCura, resolverTesteDeMorte };
if (typeof module !== "undefined" && module.exports) module.exports = API;
if (typeof window !== "undefined") window.Vlab = API;

})();
