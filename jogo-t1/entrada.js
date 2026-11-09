/* Entrada do protótipo — entrar é SEMPRE com a conta Google, dentro
 * dos botões (tranche t-entrada-google-nativa; antes: t-entrada-mestre
 * e t-entrada-google).
 *
 * A página nasce neste ecrã (Layout de referência: LAYOUT-PAGINA-ENTRADA
 * + EMENDA de 06/11 21:02 — três botões, sem «Continuar») e o jogo NÃO
 * faz boot nem constrói nada até haver entrada: os scripts do jogo só
 * são injectados, pela ordem original, depois de uma entrada.
 *
 * A PORTA (palavra do Mestre, 09/11/2026 11:22 — substitui a das
 * 09:48): «entrar fica sempre como Google, e tem que ser algo nativo
 * e integrado com o botão de entrar como mestre ou jogador». Logo:
 *  · NÃO há botão «Entrar com Google» separado nem porta anónima: o
 *    fluxo Google vive DENTRO dos botões «Entrar como Mestre» e
 *    «Entrar como Jogadora».
 *  · «Entrar como Mestre»: corre o fluxo Google; só a conta dele
 *    (EMAIL_MESTRE) entra — outra conta é recusada com mensagem e não
 *    entra em lado nenhum. Primeira vez = a entrada fica guardada;
 *    com o perfil de Mestre guardado, o botão entra com um toque.
 *  · «Entrar como Jogadora»: corre o fluxo Google; qualquer conta
 *    entra na Party, com o perfil (nome, e-mail, foto) guardado no
 *    aparelho; com o perfil de Jogadora guardado, um toque entra.
 *    «Usar outra conta do Google» vive nas Configurações da entrada.
 *  · Sem Google a responder, NÃO há entrada nenhuma (consequência
 *    declarada da palavra dele) — e a entrada avisa, não fica muda.
 *  · «Esquecer este aparelho» apaga o perfil e tudo o que o aparelho
 *    lembra.
 *
 * A SENHA DO MESTRE — CONFIRMADA POR ELE (09/11/2026 11:26, por
 * toque na opção): «A senha fica, como segunda porta pequena do
 * Mestre» — acesso secundário pequeno («Entrar com a senha») dentro
 * da vista do Mestre, com «Esqueci a senha» e «Trocar a senha» como
 * a REF_33 os fez. Vive nas secções marcadas «SENHA», isolada como
 * limpeza de código. O grau de guarda é o já declarado nas REF_32/33
 * (porta de organização por desenho dele): a guarda do aparelho
 * posta por uma entrada com a senha também dá um toque no botão do
 * Mestre.
 *
 * A verificação do token Google é a de protótipo: descodifica-se o ID
 * token e confere-se iss, aud (o Client ID desta página), exp e
 * email_verified no navegador; a assinatura é a do próprio fluxo GIS
 * (o token chega pelo callback oficial do Google neste navegador). A
 * verificação a sério (assinatura contra as chaves do Google, no
 * servidor) vive no jogo verdadeiro, que tem servidor — aqui não há
 * servidor.
 *
 * Modo Mestre = a receita do antigo mestre.html: levantar
 * window.CAMPO_MESTRE = true ANTES de jogo.js carregar (o trinco de
 * arranque de jogo.js lê a bandeira uma vez e sela-a). Sem a bandeira,
 * o boot é o da Party, byte a byte o de hoje — e o caminho da Party
 * apaga qualquer bandeira pré-levantada fora da porta (guarda da
 * REF_32, mantida). */
(function () {
  'use strict';
  document.documentElement.classList.add('entrada-pendente');

  /* ---------- parâmetros de construção (constantes) ---------- */
  var GOOGLE_CLIENT_ID = '138536166035-rmfvrhguihp5ec1oiat02m0uoil7sou1.apps.googleusercontent.com';
  var EMAIL_MESTRE = 'arth.of.09@gmail.com';
  var CHAVE_PERFIL_GOOGLE = 'entrada-google-perfil';
  /* SENHA (confirmada por ele, 09/11 11:26): constantes da porta da
   * senha — ver a secção «SENHA». */
  var RESUMO_MESTRE_HEX = '10689e70ce4c5dfc4e4150e051d993e2168c9318163a2128b176f0984d915f15';
  var SAL_MESTRE_HEX = 'a3f9c41d77e04b2c9d15f0e68b3a52c1';
  var ITERACOES_PBKDF2 = 250000;
  var CHAVE_APARELHO = 'entrada-mestre-aparelho';
  var CHAVE_RESUMO_APARELHO = 'entrada-mestre-resumo-aparelho';

  var SCRIPTS_JOGO = [
    'vendor/three.min.js', 'vendor/GLTFLoader.js', 'mundo.js', 'cena.js',
    'visual.js', 'levelup.js', 'vlab-completo.js', 'jogo.js'
  ];

  /* ---------- utilidades ---------- */
  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  /* ---------- o perfil Google guardado neste aparelho ----------
   * Nasce do ID token na primeira vez (criar conta = o perfil nasce)
   * e guarda nome, e-mail, foto e o papel (mestre/jogadora). */
  function perfilGuardado() {
    try {
      var p = JSON.parse(localStorage.getItem(CHAVE_PERFIL_GOOGLE) || 'null');
      if (p && typeof p.email === 'string' && (p.papel === 'mestre' || p.papel === 'jogadora')) {
        /* Emenda A da bancada (REF_33): TODAS as leituras do perfil
         * passam por aqui, e o papel «mestre» guardado só vale com a
         * conta dele. Uma etiqueta «mestre» escrita à mão com outro
         * e-mail é perfil inválido: não entra, não destrava nada. */
        if (p.papel === 'mestre' && p.email.toLowerCase() !== EMAIL_MESTRE) return null;
        return p;
      }
    } catch (_) {}
    return null;
  }
  function guardarPerfil(dados, papel) {
    var p = { nome: dados.nome || '', email: dados.email || '', foto: dados.foto || '', papel: papel };
    try { localStorage.setItem(CHAVE_PERFIL_GOOGLE, JSON.stringify(p)); } catch (_) {}
    return p;
  }

  /* Esquecer este aparelho: apaga o perfil Google e tudo o que o
   * aparelho lembra (a guarda da senha e o resumo trocado incluídos)
   * — o aparelho volta a não lembrar nada. */
  function esquecerAparelho() {
    try {
      localStorage.removeItem(CHAVE_PERFIL_GOOGLE);
      localStorage.removeItem(CHAVE_APARELHO);
      localStorage.removeItem(CHAVE_RESUMO_APARELHO);
    } catch (_) {}
  }

  /* O Mestre está lembrado neste aparelho se o perfil Google guardado
   * é o da conta dele com o papel de Mestre — ou, enquanto a senha
   * existir (secção «SENHA»), se a guarda posta por uma entrada com a
   * senha bate com o resumo em vigor. */
  function mestreLembrado() {
    var p = perfilGuardado();
    if (p && p.papel === 'mestre') return true;
    return typeof aparelhoLembra === 'function' ? aparelhoLembra() : false;
  }

  /* ---------- a conta Google: verificação do ID token (protótipo) --- */
  function decodificarJwt(credencial) {
    var partes = String(credencial || '').split('.');
    if (partes.length !== 3) return null;
    try {
      var b64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder('utf-8').decode(bytes));
    } catch (_) { return null; }
  }
  /* Confere o que se pode conferir no navegador: quem emitiu (iss), a
   * quem se destina (aud = o Client ID desta página), o prazo (exp) e
   * o e-mail confirmado. Devolve os dados do perfil ou o motivo. */
  function verificarTokenGoogle(credencial) {
    var t = decodificarJwt(credencial);
    if (!t) return { ok: false, motivo: 'token-ilegivel' };
    if (t.iss !== 'https://accounts.google.com' && t.iss !== 'accounts.google.com') {
      return { ok: false, motivo: 'emissor-errado' };
    }
    if (t.aud !== GOOGLE_CLIENT_ID) return { ok: false, motivo: 'destino-errado' };
    var agora = Math.floor(Date.now() / 1000);
    if (typeof t.exp !== 'number' || t.exp <= agora) return { ok: false, motivo: 'token-expirado' };
    if (t.email_verified !== true && t.email_verified !== 'true') {
      return { ok: false, motivo: 'email-nao-confirmado' };
    }
    if (typeof t.email !== 'string' || !t.email) return { ok: false, motivo: 'sem-email' };
    return {
      ok: true,
      dados: {
        nome: typeof t.name === 'string' ? t.name : '',
        email: t.email.toLowerCase(),
        foto: typeof t.picture === 'string' ? t.picture : ''
      }
    };
  }

  /* ---------- o fluxo GIS: carrega quando é preciso ----------
   * O script do Google só é pedido quando alguém aperta um caminho
   * do Google (a entrada não fala com a rede antes disso). O callback
   * é único — window.__entradaGoogleCallback — e é o MESMO caminho
   * que recebe o token verdadeiro e o token da prova do mecanismo.
   * Usos: 'mestre' (botão/vista do Mestre) · 'jogadora' (botão da
   * Jogadora) · 'entrar' (trocar de conta nas Configurações — a conta
   * decide o papel) · 'recuperar' (SENHA: prova para a senha nova). */
  var gisCarregado = null;
  var pendenteGoogle = null; /* { uso, aoFalhar } */
  var GIS_TIMEOUT_MS = 10000;
  var MSG_GOOGLE_MORTO = 'Não foi possível falar com o Google agora. Tente outra vez.';
  function carregarGis() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    if (gisCarregado) return gisCarregado;
    gisCarregado = new Promise(function (resolve, reject) {
      /* Emenda C da bancada (REF_33): GIS pendurado não pode ser um
       * botão morto e mudo — se o script nem carrega nem falha dentro
       * do prazo, a promessa rejeita e quem chamou avisa na vista
       * activa. */
      var estourou = false;
      var temporizador = setTimeout(function () {
        estourou = true;
        gisCarregado = null;
        reject(new Error('gis-timeout'));
      }, GIS_TIMEOUT_MS);
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = function () { if (!estourou) { clearTimeout(temporizador); resolve(); } };
      s.onerror = function () {
        if (!estourou) { clearTimeout(temporizador); gisCarregado = null; reject(new Error('gis-falhou')); }
      };
      document.head.appendChild(s);
    });
    return gisCarregado;
  }
  function pedirGoogle(uso, aoFalhar) {
    pendenteGoogle = { uso: uso, aoFalhar: aoFalhar };
    carregarGis().then(function () {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: function (resposta) { window.__entradaGoogleCallback(resposta); }
      });
      google.accounts.id.prompt(function (momento) {
        /* Emenda C da bancada (REF_33): o One Tap não-exibido ou
         * suprimido (isNotDisplayed / isSkippedMoment) também avisa —
         * um clique sem efeito e sem mensagem não é caminho. */
        if (momento && (momento.isNotDisplayed() || momento.isSkippedMoment())) {
          var p = pendenteGoogle;
          pendenteGoogle = null;
          if (p && p.aoFalhar) p.aoFalhar(MSG_GOOGLE_MORTO);
        }
      });
    }).catch(function () {
      pendenteGoogle = null;
      if (aoFalhar) aoFalhar(MSG_GOOGLE_MORTO);
    });
  }

  /* ---------- boot do jogo (só depois de uma entrada) ---------- */
  var arrancou = false;
  function arrancarJogo(comoMestre) {
    if (arrancou) return;
    arrancou = true;
    if (comoMestre) {
      window.CAMPO_MESTRE = true;
    } else {
      /* Emenda 1 da bancada (Vector B, REF_32): no caminho da
       * Jogadora, nenhuma bandeira levantada fora da porta pode vazar
       * para o boot — apaga-se qualquer valor pré-existente e força-se
       * o false explícito ANTES de injectar os scripts do jogo. */
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
  var raiz = el('div');
  raiz.id = 'entrada';
  raiz.setAttribute('aria-label', 'Entrada do jogo');

  var placa = el('div', 'ent-placa');
  placa.appendChild(el('div', 'ent-titulo', 'ASSIMILAÇÃO'));
  placa.appendChild(el('div', 'ent-faixa', 'Campo de batalha'));
  raiz.appendChild(placa);

  /* Vista 1 — os três botões do layout. NÃO há botão do Google
   * separado: o fluxo Google vive dentro dos dois botões de entrar. */
  var vistaBotoes = el('div');
  var erroEntrada = el('p', 'ent-erro-entrada');
  erroEntrada.setAttribute('role', 'alert');
  var btnMestre = el('button', 'ent-btn'); btnMestre.id = 'ent-mestre'; btnMestre.type = 'button';
  var btnJogadora = el('button', 'ent-btn'); btnJogadora.id = 'ent-jogadora'; btnJogadora.type = 'button';
  var btnConfig = el('button', 'ent-btn', 'Configurações');
  btnConfig.id = 'ent-config'; btnConfig.type = 'button';
  var ajuda = el('p', 'ent-ajuda', 'Você entra com a sua conta Google. Ela fica guardada neste celular.');
  vistaBotoes.appendChild(erroEntrada);
  vistaBotoes.appendChild(btnMestre);
  vistaBotoes.appendChild(btnJogadora);
  vistaBotoes.appendChild(btnConfig);
  vistaBotoes.appendChild(ajuda);
  raiz.appendChild(vistaBotoes);

  function pintarBotaoMestre() {
    var p = perfilGuardado();
    btnMestre.textContent = '';
    btnMestre.appendChild(el('span', null, 'Entrar como Mestre'));
    if (p && p.papel === 'mestre') {
      btnMestre.appendChild(el('span', 'sub', 'você já entrou como ' + (p.nome || p.email) + ' — um toque e entra'));
    } else if (typeof aparelhoLembra === 'function' && aparelhoLembra()) {
      btnMestre.appendChild(el('span', 'sub', 'você já entrou neste aparelho — um toque e entra'));
    }
  }
  function pintarBotaoJogadora() {
    var p = perfilGuardado();
    btnJogadora.textContent = '';
    btnJogadora.appendChild(el('span', null, 'Entrar como Jogadora'));
    if (p && p.papel === 'jogadora') {
      btnJogadora.appendChild(el('span', 'sub', 'você já entrou como ' + (p.nome || p.email) + ' — um toque e entra'));
    }
  }

  /* Vista 2 — a vista do Mestre: o Google é a porta (botão principal)
   * e, enquanto a palavra dele sobre a senha não chega, o acesso
   * pequeno «Entrar com a senha» (secção «SENHA» monta-se no
   * anfitrião abaixo). */
  var vistaMestre = el('div', 'ent-painel');
  vistaMestre.hidden = true;
  vistaMestre.appendChild(el('h2', null, 'Entrar como Mestre'));
  vistaMestre.appendChild(el('p', 'ent-nota', 'Entre com a conta Google do Mestre.'));
  var erroMestre = el('p', 'ent-erro');
  erroMestre.setAttribute('role', 'alert');
  vistaMestre.appendChild(erroMestre);
  var btnGoogleMestre = el('button', 'ent-google painel', 'Entrar com a sua conta Google');
  btnGoogleMestre.id = 'ent-google-mestre'; btnGoogleMestre.type = 'button';
  vistaMestre.appendChild(btnGoogleMestre);
  var zonaSenhaHost = el('div');
  zonaSenhaHost.id = 'ent-zona-senha-host';
  vistaMestre.appendChild(zonaSenhaHost);
  var btnVoltarMestre = el('button', 'ent-accao sec', 'Voltar');
  btnVoltarMestre.type = 'button';
  btnVoltarMestre.style.marginTop = '10px';
  btnVoltarMestre.style.width = '100%';
  vistaMestre.appendChild(btnVoltarMestre);
  raiz.appendChild(vistaMestre);

  /* Vista 3 — a senha nova (SENHA): construída na secção «SENHA». */
  var vistaNovaSenha = null;

  /* Vista 4 — configurações (as do ⚙ que persistem) + o aparelho. */
  var vistaConfig = el('section', 'ent-painel');
  vistaConfig.hidden = true;
  vistaConfig.setAttribute('aria-label', 'Configurações');
  vistaConfig.appendChild(el('h2', null, 'Configurações'));
  var linhasDef = el('div');
  vistaConfig.appendChild(linhasDef);
  var notaAparelho = el('p', 'ent-nota');
  vistaConfig.appendChild(notaAparelho);
  var btnOutraConta = el('button', 'ent-esquecer', 'Usar outra conta do Google');
  btnOutraConta.id = 'ent-outra-conta'; btnOutraConta.type = 'button'; btnOutraConta.hidden = true;
  vistaConfig.appendChild(btnOutraConta);
  var btnTrocar = el('button', 'ent-esquecer', 'Trocar a senha do Mestre');
  btnTrocar.id = 'ent-trocar-senha'; btnTrocar.type = 'button'; btnTrocar.hidden = true;
  vistaConfig.appendChild(btnTrocar);
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
    var p = perfilGuardado();
    var notas = [];
    if (p) notas.push('Este aparelho lembra a sua conta: ' + (p.nome || p.email) + ' (' + p.email + ').');
    if (typeof notasSenhaDoAparelho === 'function') notas = notas.concat(notasSenhaDoAparelho());
    if (!notas.length) notas.push('Este aparelho ainda não lembra nenhuma entrada.');
    notaAparelho.textContent = notas.join(' ');
    btnOutraConta.hidden = !p;
    btnTrocar.hidden = !mestreLembrado();
    /* Emenda I da bancada (REF_33): o override órfão (sem perfil e
     * sem guarda) também torna o «Esquecer este aparelho» visível —
     * nenhum estado do aparelho fica inalcançável pela interface. */
    var temSenhaGuardada = typeof temOverride === 'function' && temOverride();
    btnEsquecer.hidden = !(p || mestreLembrado() || temSenhaGuardada);
  }

  /* ---------- navegação entre vistas ---------- */
  function mostrar(vista) {
    vistaBotoes.hidden = vista !== 'botoes';
    vistaMestre.hidden = vista !== 'mestre';
    if (vistaNovaSenha) vistaNovaSenha.hidden = vista !== 'novasenha';
    vistaConfig.hidden = vista !== 'config';
    if (vista === 'mestre') {
      erroMestre.textContent = '';
      if (typeof fecharZonaSenha === 'function') fecharZonaSenha();
    }
    if (vista === 'config') pintarConfig();
    if (vista === 'botoes') { pintarBotaoMestre(); pintarBotaoJogadora(); }
  }

  /* ---------- o que acontece com a conta Google, por uso ---------- */
  window.__entradaGoogleCallback = function (resposta) {
    var pendente = pendenteGoogle;
    pendenteGoogle = null;
    var v = verificarTokenGoogle(resposta && resposta.credential);
    if (!v.ok) {
      var msg = v.motivo === 'token-expirado'
        ? 'A entrada com o Google expirou. Tente outra vez.'
        : 'Não foi possível confirmar a sua conta Google. Tente outra vez.';
      if (pendente && pendente.aoFalhar) pendente.aoFalhar(msg);
      return;
    }
    var uso = pendente ? pendente.uso : 'entrar';
    if (uso === 'mestre') {
      if (v.dados.email === EMAIL_MESTRE) {
        guardarPerfil(v.dados, 'mestre');
        arrancarJogo(true);
      } else if (pendente.aoFalhar) {
        /* Recusa limpa: não entra, não guarda perfil nenhum. */
        pendente.aoFalhar('Esta conta não é a conta do Mestre. Entre com a conta dele.');
      }
      return;
    }
    if (uso === 'jogadora') {
      guardarPerfil(v.dados, 'jogadora');
      arrancarJogo(false);
      return;
    }
    if (uso === 'recuperar') {
      /* SENHA: a prova para definir a senha nova — tratada na
       * secção «SENHA». */
      if (typeof tratarRecuperacaoGoogle === 'function') tratarRecuperacaoGoogle(v.dados, pendente);
      return;
    }
    /* 'entrar' (trocar de conta): a conta decide o papel. */
    if (v.dados.email === EMAIL_MESTRE) {
      guardarPerfil(v.dados, 'mestre');
      arrancarJogo(true);
    } else {
      guardarPerfil(v.dados, 'jogadora');
      arrancarJogo(false);
    }
  };

  /* ---------- botões principais ---------- */
  btnMestre.addEventListener('click', function () {
    if (mestreLembrado()) { arrancarJogo(true); return; }
    erroEntrada.textContent = '';
    mostrar('mestre');
  });
  btnJogadora.addEventListener('click', function () {
    var p = perfilGuardado();
    if (p && p.papel === 'jogadora') { arrancarJogo(false); return; }
    erroEntrada.textContent = '';
    pedirGoogle('jogadora', function (msg) { erroEntrada.textContent = msg; });
  });
  btnGoogleMestre.addEventListener('click', function () {
    erroMestre.textContent = '';
    pedirGoogle('mestre', function (msg) { erroMestre.textContent = msg; });
  });
  btnConfig.addEventListener('click', function () { mostrar('config'); });
  btnVoltarMestre.addEventListener('click', function () { mostrar('botoes'); });
  btnVoltarConfig.addEventListener('click', function () { mostrar('botoes'); });
  btnOutraConta.addEventListener('click', function () {
    mostrar('botoes');
    erroEntrada.textContent = '';
    pedirGoogle('entrar', function (msg) { erroEntrada.textContent = msg; });
  });
  btnEsquecer.addEventListener('click', function () {
    esquecerAparelho();
    pintarConfig();
    pintarBotaoMestre();
    pintarBotaoJogadora();
  });

  /* ================================================================
   * SENHA — segunda porta do Mestre, confirmada por ele a
   * 09/11/2026 11:26 (início da secção)
   * A porta da senha do Mestre: PBKDF2-HMAC-SHA256 (crypto.subtle;
   * 250 000 iterações; sal fixo). A senha NUNCA é escrita neste
   * ficheiro nem em lado nenhum — mora aqui só o RESUMO esperado.
   * Quando ele troca a senha neste aparelho, o resumo novo fica
   * guardado NESTE aparelho e passa a ser o que a porta aceita aqui;
   * a constante continua a valer nos outros aparelhos até uma
   * republicação com o resumo novo (limite do protótipo, registado
   * no relatório da tranche REF_33).
   * ================================================================ */
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
  /* O resumo em vigor neste aparelho: se ele trocou a senha aqui, o
   * resumo novo guardado manda; senão, a constante com que a página
   * nasceu. A porta e a guarda lêem sempre daqui — uma função só. */
  function resumoEmVigor() {
    try {
      var r = localStorage.getItem(CHAVE_RESUMO_APARELHO);
      if (r && /^[0-9a-f]{64}$/.test(r)) return r;
    } catch (_) {}
    return RESUMO_MESTRE_HEX;
  }
  function temOverride() {
    try { return !!localStorage.getItem(CHAVE_RESUMO_APARELHO); } catch (_) { return false; }
  }
  function aparelhoLembra() {
    try { return localStorage.getItem(CHAVE_APARELHO) === resumoEmVigor(); }
    catch (_) { return false; }
  }
  function lembrarAparelho() {
    try { localStorage.setItem(CHAVE_APARELHO, resumoEmVigor()); } catch (_) {}
  }
  function notasSenhaDoAparelho() {
    var notas = [];
    if (aparelhoLembra()) notas.push('Este aparelho lembra a sua entrada como Mestre pela senha.');
    if (temOverride()) notas.push('Este aparelho guarda uma senha do Mestre trocada neste aparelho.');
    return notas;
  }

  /* --- a zona da senha dentro da vista do Mestre --- */
  var btnSenhaLigacao = el('button', 'ent-ligacao', 'Entrar com a senha');
  btnSenhaLigacao.id = 'ent-senha-ligacao'; btnSenhaLigacao.type = 'button';
  zonaSenhaHost.appendChild(btnSenhaLigacao);
  var formSenha = el('form', 'ent-zona-senha');
  formSenha.hidden = true;
  var rotuloSenha = el('label', 'cl', 'A sua senha');
  rotuloSenha.htmlFor = 'ent-senha-campo';
  var campoSenha = el('input', 'ent-campo');
  campoSenha.id = 'ent-senha-campo';
  campoSenha.type = 'password';
  campoSenha.setAttribute('autocomplete', 'current-password');
  var erroSenha = el('p', 'ent-erro');
  erroSenha.setAttribute('role', 'alert');
  var btnEntrarSenha = el('button', 'ent-accao', 'Entrar');
  btnEntrarSenha.id = 'ent-entrar-senha'; btnEntrarSenha.type = 'submit';
  btnEntrarSenha.style.width = '100%';
  var btnEsqueci = el('button', 'ent-ligacao', 'Esqueci a senha');
  btnEsqueci.id = 'ent-esqueci'; btnEsqueci.type = 'button';
  formSenha.appendChild(rotuloSenha);
  formSenha.appendChild(campoSenha);
  formSenha.appendChild(erroSenha);
  formSenha.appendChild(btnEntrarSenha);
  formSenha.appendChild(btnEsqueci);
  zonaSenhaHost.appendChild(formSenha);

  function fecharZonaSenha() {
    formSenha.hidden = true;
    erroSenha.textContent = '';
    campoSenha.value = '';
  }
  btnSenhaLigacao.addEventListener('click', function () {
    var abrir = formSenha.hidden;
    formSenha.hidden = !abrir;
    if (abrir) { erroSenha.textContent = ''; campoSenha.focus(); }
  });
  formSenha.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var senha = campoSenha.value;
    if (!senha) { erroSenha.textContent = 'Escreva a sua senha para entrar.'; return; }
    erroSenha.textContent = 'A verificar…';
    btnEntrarSenha.disabled = true;
    derivarResumoHex(senha).then(function (resumo) {
      btnEntrarSenha.disabled = false;
      if (resumosIguais(resumo, resumoEmVigor())) {
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

  /* --- Vista 3: a senha nova (recuperar com a prova do Google;
   * trocar para quem já entrou neste aparelho) --- */
  vistaNovaSenha = el('form', 'ent-painel');
  vistaNovaSenha.hidden = true;
  var tituloNovaSenha = el('h2', null, 'Definir a nova senha');
  vistaNovaSenha.appendChild(tituloNovaSenha);
  var passoGoogle = el('div');
  passoGoogle.appendChild(el('p', 'ent-nota',
    'Para ter a certeza de que é você, entre primeiro com a sua conta Google. Depois define a senha nova.'));
  var erroNovaGoogle = el('p', 'ent-erro');
  erroNovaGoogle.setAttribute('role', 'alert');
  var btnGoogleNova = el('button', 'ent-google painel', 'Entrar com a sua conta Google');
  btnGoogleNova.id = 'ent-google-nova'; btnGoogleNova.type = 'button';
  passoGoogle.appendChild(erroNovaGoogle);
  passoGoogle.appendChild(btnGoogleNova);
  vistaNovaSenha.appendChild(passoGoogle);
  var passoCampos = el('div');
  passoCampos.hidden = true;
  var rotuloNova = el('label', 'cl', 'A senha nova');
  rotuloNova.htmlFor = 'ent-nova-campo';
  var campoNova = el('input', 'ent-campo');
  campoNova.id = 'ent-nova-campo'; campoNova.type = 'password';
  campoNova.setAttribute('autocomplete', 'new-password');
  var rotuloNova2 = el('label', 'cl', 'Escreva outra vez a senha nova');
  rotuloNova2.htmlFor = 'ent-nova-campo2';
  var campoNova2 = el('input', 'ent-campo');
  campoNova2.id = 'ent-nova-campo2'; campoNova2.type = 'password';
  campoNova2.setAttribute('autocomplete', 'new-password');
  var erroNova = el('p', 'ent-erro');
  erroNova.setAttribute('role', 'alert');
  var btnGuardarNova = el('button', 'ent-accao', 'Guardar a senha nova');
  btnGuardarNova.id = 'ent-guardar-nova'; btnGuardarNova.type = 'submit';
  btnGuardarNova.style.width = '100%';
  passoCampos.appendChild(rotuloNova);
  passoCampos.appendChild(campoNova);
  passoCampos.appendChild(rotuloNova2);
  passoCampos.appendChild(campoNova2);
  passoCampos.appendChild(erroNova);
  passoCampos.appendChild(btnGuardarNova);
  passoCampos.appendChild(el('p', 'ent-nota',
    'A senha nova passa a valer neste aparelho. Nos outros aparelhos, vale a senha antiga até o jogo ser actualizado com a nova.'));
  vistaNovaSenha.appendChild(passoCampos);
  var passoFeito = el('div');
  passoFeito.hidden = true;
  passoFeito.appendChild(el('p', 'ent-nota', 'Senha nova guardada neste aparelho.'));
  var btnEntrarFeito = el('button', 'ent-accao', 'Entrar como Mestre');
  btnEntrarFeito.id = 'ent-nova-entrar'; btnEntrarFeito.type = 'button';
  btnEntrarFeito.style.width = '100%';
  passoFeito.appendChild(btnEntrarFeito);
  vistaNovaSenha.appendChild(passoFeito);
  var btnVoltarNova = el('button', 'ent-accao sec', 'Voltar');
  btnVoltarNova.type = 'button';
  btnVoltarNova.style.marginTop = '8px';
  btnVoltarNova.style.width = '100%';
  vistaNovaSenha.appendChild(btnVoltarNova);
  raiz.appendChild(vistaNovaSenha);

  var modoNovaSenha = 'recuperar'; /* 'recuperar' | 'trocar' */
  /* Emenda B da bancada (REF_33): a autorização para guardar uma
   * senha nova é uma bandeira de SESSÃO — variável em memória, nunca
   * localStorage e nunca o estado visível/escondido do formulário. É
   * posta SÓ pelo callback do Google com a conta dele, no fluxo de
   * recuperação; no modo «trocar», a autorização é reconferida no
   * acto de gravar. */
  var autorizadaNovaSenha = false;
  function abrirNovaSenha(modo) {
    if (modo === 'trocar' && !mestreLembrado()) {
      /* Emenda B: abrir a troca reverifica — um clique programático
       * no botão escondido, num aparelho que não lembra o Mestre,
       * não abre campo nenhum. */
      return;
    }
    modoNovaSenha = modo;
    autorizadaNovaSenha = false; /* cada abertura começa sem autorização */
    tituloNovaSenha.textContent = modo === 'trocar' ? 'Trocar a senha' : 'Definir a nova senha';
    erroNovaGoogle.textContent = '';
    erroNova.textContent = '';
    campoNova.value = '';
    campoNova2.value = '';
    passoGoogle.hidden = modo !== 'recuperar';
    passoCampos.hidden = modo === 'recuperar';
    passoFeito.hidden = true;
    mostrar('novasenha');
    if (modo === 'trocar') campoNova.focus();
  }
  function tratarRecuperacaoGoogle(dados, pendente) {
    if (dados.email === EMAIL_MESTRE) {
      guardarPerfil(dados, 'mestre');
      /* Emenda B: é ESTE acto — o callback do Google com a conta
       * dele — que autoriza guardar a senha nova nesta sessão. */
      autorizadaNovaSenha = true;
      passoGoogle.hidden = true;
      passoCampos.hidden = false;
      passoFeito.hidden = true;
      campoNova.focus();
    } else if (pendente && pendente.aoFalhar) {
      pendente.aoFalhar('Esta conta não é a conta do Mestre. A senha só muda com a conta dele.');
    }
  }
  btnEsqueci.addEventListener('click', function () { abrirNovaSenha('recuperar'); });
  btnTrocar.addEventListener('click', function () { abrirNovaSenha('trocar'); });
  btnGoogleNova.addEventListener('click', function () {
    erroNovaGoogle.textContent = '';
    pedirGoogle('recuperar', function (msg) { erroNovaGoogle.textContent = msg; });
  });
  btnVoltarNova.addEventListener('click', function () { mostrar(modoNovaSenha === 'trocar' ? 'config' : 'mestre'); });
  btnEntrarFeito.addEventListener('click', function () { arrancarJogo(true); });
  vistaNovaSenha.addEventListener('submit', function (ev) {
    ev.preventDefault();
    /* Emenda B da bancada (REF_33): guardar exige autorização NO
     * ACTO, não no ecrã — na recuperação, a bandeira de sessão posta
     * pelo callback do Google com a conta dele; na troca, o aparelho
     * a lembrar o Mestre neste momento. Um submit programático sem
     * autorização não grava override nenhum. */
    var autorizado = modoNovaSenha === 'trocar' ? mestreLembrado() : autorizadaNovaSenha;
    if (!autorizado) {
      erroNova.textContent = modoNovaSenha === 'trocar'
        ? 'Para trocar a senha, este aparelho tem de lembrar a sua entrada como Mestre.'
        : 'Para definir a senha nova, entre primeiro com a sua conta Google.';
      return;
    }
    var nova = campoNova.value;
    if (!nova) { erroNova.textContent = 'Escreva a senha nova.'; return; }
    if (nova !== campoNova2.value) { erroNova.textContent = 'As duas escritas da senha nova não são iguais. Tente outra vez.'; return; }
    erroNova.textContent = 'A guardar…';
    btnGuardarNova.disabled = true;
    derivarResumoHex(nova).then(function (resumo) {
      btnGuardarNova.disabled = false;
      autorizadaNovaSenha = false; /* a autorização consome-se ao gravar */
      try { localStorage.setItem(CHAVE_RESUMO_APARELHO, resumo); } catch (_) {}
      lembrarAparelho(); /* a guarda passa a esperar o resumo novo */
      campoNova.value = '';
      campoNova2.value = '';
      passoCampos.hidden = true;
      passoFeito.hidden = false;
    }).catch(function () {
      btnGuardarNova.disabled = false;
      erroNova.textContent = 'Este aparelho não conseguiu guardar a senha nova agora. Tente outra vez.';
    });
  });
  /* ============ SENHA — fim da secção ============ */

  pintarBotaoMestre();
  pintarBotaoJogadora();
  document.body.appendChild(raiz);
})();
