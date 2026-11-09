/* Entrada do protótipo — a porta do Mestre (tranche t-entrada-mestre).
 *
 * A página nasce neste ecrã (Layout de referência: LAYOUT-PAGINA-ENTRADA
 * + EMENDA de 06/11 21:02 — três botões, sem «Continuar») e o jogo NÃO
 * faz boot nem constrói nada até haver escolha: os scripts do jogo só
 * são injectados, pela ordem original, depois de «Entrar como
 * Jogadora» ou de a senha do Mestre verificar.
 *
 * A porta do Mestre: a verificação é por PBKDF2-HMAC-SHA256
 * (crypto.subtle; 250 000 iterações; sal fixo). A senha NUNCA é escrita
 * neste ficheiro nem em lado nenhum — mora aqui só o RESUMO esperado,
 * numa constante única (parâmetro de construção): trocar a constante
 * troca a senha que a porta aceita, sem tocar em mais nada.
 *
 * Modo Mestre = a receita do antigo mestre.html: levantar
 * window.CAMPO_MESTRE = true ANTES de jogo.js carregar (o trinco de
 * arranque de jogo.js lê a bandeira uma vez e sela-a). Sem a bandeira,
 * o boot é o da Party, byte a byte o de hoje.
 *
 * O aparelho guarda (FLUXO-DE-ENTRADA, emenda 1): depois de uma
 * entrada de Mestre com sucesso, o resumo verificado fica no
 * localStorage deste aparelho como chave dele; nas visitas seguintes,
 * «Entrar como Mestre» entra com um toque, sem senha. «Esquecer este
 * aparelho» (nas Configurações da entrada) apaga a chave. */
(function () {
  'use strict';
  document.documentElement.classList.add('entrada-pendente');

  /* ---------- parâmetros de construção da porta (constantes) ---------- */
  var RESUMO_MESTRE_HEX = '10689e70ce4c5dfc4e4150e051d993e2168c9318163a2128b176f0984d915f15';
  var SAL_MESTRE_HEX = 'a3f9c41d77e04b2c9d15f0e68b3a52c1';
  var ITERACOES_PBKDF2 = 250000;
  var CHAVE_APARELHO = 'entrada-mestre-aparelho';

  var SCRIPTS_JOGO = [
    'vendor/three.min.js', 'vendor/GLTFLoader.js', 'mundo.js', 'cena.js',
    'visual.js', 'levelup.js', 'vlab-completo.js', 'jogo.js'
  ];

  /* ---------- utilidades ---------- */
  function hexParaBytes(hex) {
    var b = new Uint8Array(hex.length / 2);
    for (var i = 0; i < b.length; i++) b[i] = parseInt(hex.substr(i * 2, 2), 16);
    return b;
  }
  function bytesParaHex(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += ('0' + bytes[i].toString(16)).slice(-2);
    return s;
  }
  /* Comparação sem atalhos: percorre sempre os dois resumos inteiros. */
  function resumosIguais(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    var dif = 0;
    for (var i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return dif === 0;
  }
  function derivarResumoHex(senha) {
    if (!window.crypto || !crypto.subtle || !crypto.subtle.importKey) {
      return Promise.reject(new Error('sem-crypto-subtle'));
    }
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits'])
      .then(function (chave) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', hash: 'SHA-256', salt: hexParaBytes(SAL_MESTRE_HEX), iterations: ITERACOES_PBKDF2 },
          chave, 256);
      })
      .then(function (bits) { return bytesParaHex(new Uint8Array(bits)); });
  }

  /* ---------- o aparelho guarda ---------- */
  function aparelhoLembra() {
    try { return localStorage.getItem(CHAVE_APARELHO) === RESUMO_MESTRE_HEX; }
    catch (_) { return false; }
  }
  function lembrarAparelho() {
    try { localStorage.setItem(CHAVE_APARELHO, RESUMO_MESTRE_HEX); } catch (_) {}
  }
  function esquecerAparelho() {
    try { localStorage.removeItem(CHAVE_APARELHO); } catch (_) {}
  }

  /* ---------- boot do jogo (só depois da escolha) ---------- */
  var arrancou = false;
  function arrancarJogo(comoMestre) {
    if (arrancou) return;
    arrancou = true;
    if (comoMestre) {
      window.CAMPO_MESTRE = true;
    } else {
      /* Emenda 1 da bancada (Vector B): no caminho da Jogadora,
       * nenhuma bandeira levantada fora da porta pode vazar para o
       * boot — apaga-se qualquer valor pré-existente e força-se o
       * false explícito ANTES de injectar os scripts do jogo. */
      try { delete window.CAMPO_MESTRE; } catch (_) {}
      window.CAMPO_MESTRE = false;
    }
    document.documentElement.classList.remove('entrada-pendente');
    var ov = document.getElementById('entrada');
    if (ov) ov.remove();
    for (var i = 0; i < SCRIPTS_JOGO.length; i++) {
      var s = document.createElement('script');
      s.src = SCRIPTS_JOGO[i];
      s.async = false;
      document.body.appendChild(s);
    }
  }

  /* ---------- as definições da entrada = as do ⚙ que persistem ----------
   * Mesmas chaves, mesmos valores, mesmos rótulos do painel do jogo:
   * o painel da entrada edita o que o jogo lê ao arrancar. Câmera, Zoom
   * e Ajuda do grid não persistem no jogo (são só da sessão) — por isso
   * não estão aqui: prometer guardá-las seria mentir. */
  var DEFINICOES = [
    { chave: 'hudt1-qualidade', rotulo: 'Qualidade', tipo: 'seg', padrao: 'alta',
      opcoes: [['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']] },
    { chave: 'hudt1-numeros-dano', rotulo: 'Números de dano', tipo: 'tog',
      padrao: 'ligado', ligado: 'Ligados', desligado: 'Desligados' },
    { chave: 'hudt1-velocidade', rotulo: 'Velocidade', tipo: 'seg', padrao: '1',
      opcoes: [['1', '1×'], ['1.5', '1,5×'], ['2', '2×'], ['2.5', '2,5×'], ['3', '3×']] },
    { chave: 'hudt1-tela-vermelha', rotulo: 'Tela vermelha', tipo: 'tog',
      padrao: 'ligado', ligado: 'Ligada', desligado: 'Desligada' },
    { chave: 'hudt1-tela-vermelha-piscar', rotulo: 'Piscar da tela vermelha', tipo: 'tog',
      padrao: 'ligado', ligado: 'Ligado', desligado: 'Desligado' }
  ];
  function lerDefinicao(def) {
    try {
      var v = localStorage.getItem(def.chave);
      if (def.tipo === 'seg') {
        for (var i = 0; i < def.opcoes.length; i++) if (def.opcoes[i][0] === v) return v;
        return def.padrao;
      }
      return v === 'desligado' ? 'desligado' : 'ligado';
    } catch (_) { return def.padrao; }
  }
  function gravarDefinicao(def, valor) {
    try { localStorage.setItem(def.chave, valor); } catch (_) {}
  }

  /* ---------- construção do ecrã ---------- */
  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  var raiz = el('div');
  raiz.id = 'entrada';
  raiz.setAttribute('aria-label', 'Entrada do jogo');

  var placa = el('div', 'ent-placa');
  placa.appendChild(el('div', 'ent-titulo', 'ASSIMILAÇÃO'));
  placa.appendChild(el('div', 'ent-faixa', 'Campo de batalha'));
  raiz.appendChild(placa);

  /* Vista 1 — os três botões do layout. */
  var vistaBotoes = el('div');
  var btnMestre = el('button', 'ent-btn'); btnMestre.id = 'ent-mestre'; btnMestre.type = 'button';
  var btnJogadora = el('button', 'ent-btn', 'Entrar como Jogadora');
  btnJogadora.id = 'ent-jogadora'; btnJogadora.type = 'button';
  var btnConfig = el('button', 'ent-btn', 'Configurações');
  btnConfig.id = 'ent-config'; btnConfig.type = 'button';
  var ajuda = el('p', 'ent-ajuda', 'A sua conta fica guardada neste celular.');
  vistaBotoes.appendChild(btnMestre);
  vistaBotoes.appendChild(btnJogadora);
  vistaBotoes.appendChild(btnConfig);
  vistaBotoes.appendChild(ajuda);
  raiz.appendChild(vistaBotoes);

  function pintarBotaoMestre() {
    btnMestre.textContent = '';
    btnMestre.appendChild(el('span', null, 'Entrar como Mestre'));
    if (aparelhoLembra()) {
      btnMestre.appendChild(el('span', 'sub', 'você já entrou neste aparelho — um toque e entra'));
    }
  }

  /* Vista 2 — a senha do Mestre. */
  var vistaSenha = el('form', 'ent-painel');
  vistaSenha.hidden = true;
  vistaSenha.appendChild(el('h2', null, 'Entrar como Mestre'));
  var rotuloSenha = el('label', 'cl', 'A sua senha');
  rotuloSenha.htmlFor = 'ent-senha-campo';
  var campoSenha = el('input', 'ent-campo');
  campoSenha.id = 'ent-senha-campo';
  campoSenha.type = 'password';
  campoSenha.setAttribute('autocomplete', 'current-password');
  var erroSenha = el('p', 'ent-erro');
  erroSenha.setAttribute('role', 'alert');
  var linhaSenha = el('div', 'ent-linha-botoes');
  var btnEntrarSenha = el('button', 'ent-accao', 'Entrar');
  btnEntrarSenha.type = 'submit';
  var btnVoltarSenha = el('button', 'ent-accao sec', 'Voltar');
  btnVoltarSenha.type = 'button';
  linhaSenha.appendChild(btnEntrarSenha);
  linhaSenha.appendChild(btnVoltarSenha);
  vistaSenha.appendChild(rotuloSenha);
  vistaSenha.appendChild(campoSenha);
  vistaSenha.appendChild(erroSenha);
  vistaSenha.appendChild(linhaSenha);
  raiz.appendChild(vistaSenha);

  /* Vista 3 — configurações (as do ⚙ que persistem) + o aparelho. */
  var vistaConfig = el('section', 'ent-painel');
  vistaConfig.hidden = true;
  vistaConfig.setAttribute('aria-label', 'Configurações');
  vistaConfig.appendChild(el('h2', null, 'Configurações'));
  var linhasDef = el('div');
  vistaConfig.appendChild(linhasDef);
  var notaAparelho = el('p', 'ent-nota');
  vistaConfig.appendChild(notaAparelho);
  var btnEsquecer = el('button', 'ent-esquecer', 'Esquecer este aparelho');
  btnEsquecer.type = 'button';
  vistaConfig.appendChild(btnEsquecer);
  var linhaConfig = el('div', 'ent-linha-botoes');
  linhaConfig.style.marginTop = '10px';
  var btnVoltarConfig = el('button', 'ent-accao sec', 'Voltar');
  btnVoltarConfig.type = 'button';
  linhaConfig.appendChild(btnVoltarConfig);
  vistaConfig.appendChild(linhaConfig);
  raiz.appendChild(vistaConfig);

  function pintarConfig() {
    linhasDef.textContent = '';
    DEFINICOES.forEach(function (def) {
      var linha = el('div', 'cfgrow');
      linha.appendChild(el('span', 'cl', def.rotulo));
      var valor = lerDefinicao(def);
      if (def.tipo === 'seg') {
        var seg = el('div', 'seg');
        seg.setAttribute('role', 'group');
        seg.setAttribute('aria-label', def.rotulo);
        def.opcoes.forEach(function (op) {
          var b = el('button', op[0] === valor ? 'on' : '', op[1]);
          b.type = 'button';
          b.addEventListener('click', function () {
            gravarDefinicao(def, op[0]);
            pintarConfig();
          });
          seg.appendChild(b);
        });
        linha.appendChild(seg);
      } else {
        var tog = el('button', 'tog' + (valor === 'ligado' ? ' on' : ''),
          valor === 'ligado' ? def.ligado : def.desligado);
        tog.type = 'button';
        tog.setAttribute('aria-pressed', valor === 'ligado' ? 'true' : 'false');
        tog.addEventListener('click', function () {
          gravarDefinicao(def, valor === 'ligado' ? 'desligado' : 'ligado');
          pintarConfig();
        });
        linha.appendChild(tog);
      }
      linhasDef.appendChild(linha);
    });
    if (aparelhoLembra()) {
      notaAparelho.textContent = 'Este aparelho lembra a sua entrada como Mestre.';
      btnEsquecer.hidden = false;
    } else {
      notaAparelho.textContent = 'Este aparelho ainda não lembra nenhuma entrada.';
      btnEsquecer.hidden = true;
    }
  }

  /* ---------- navegação entre vistas ---------- */
  function mostrar(vista) {
    vistaBotoes.hidden = vista !== 'botoes';
    vistaSenha.hidden = vista !== 'senha';
    vistaConfig.hidden = vista !== 'config';
    if (vista === 'senha') { erroSenha.textContent = ''; campoSenha.value = ''; campoSenha.focus(); }
    if (vista === 'config') pintarConfig();
    if (vista === 'botoes') pintarBotaoMestre();
  }

  btnMestre.addEventListener('click', function () {
    if (aparelhoLembra()) { arrancarJogo(true); return; }
    mostrar('senha');
  });
  btnJogadora.addEventListener('click', function () { arrancarJogo(false); });
  btnConfig.addEventListener('click', function () { mostrar('config'); });
  btnVoltarSenha.addEventListener('click', function () { mostrar('botoes'); });
  btnVoltarConfig.addEventListener('click', function () { mostrar('botoes'); });
  btnEsquecer.addEventListener('click', function () {
    esquecerAparelho();
    pintarConfig();
    pintarBotaoMestre();
  });

  vistaSenha.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var senha = campoSenha.value;
    if (!senha) { erroSenha.textContent = 'Escreva a sua senha para entrar.'; return; }
    erroSenha.textContent = 'A verificar…';
    btnEntrarSenha.disabled = true;
    derivarResumoHex(senha).then(function (resumo) {
      btnEntrarSenha.disabled = false;
      if (resumosIguais(resumo, RESUMO_MESTRE_HEX)) {
        lembrarAparelho();
        arrancarJogo(true);
      } else {
        erroSenha.textContent = 'Senha errada. Tente outra vez.';
        campoSenha.value = '';
        campoSenha.focus();
      }
    }).catch(function () {
      btnEntrarSenha.disabled = false;
      erroSenha.textContent = 'Este aparelho não conseguiu verificar a senha agora. Tente outra vez.';
    });
  });

  pintarBotaoMestre();
  document.body.appendChild(raiz);
})();
