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
  /* A VERSÃO DO JOGO (palavra do Mestre, 12/11/2026 08:20): a
   * marca discreta do canto inferior esquerdo da entrada lê ESTA
   * constante — é o sítio ÚNICO dela: cada publicação actualiza
   * aqui o número da sua REF e a marca acompanha. */
  var VERSAO_JOGO = 'REF_79';

  var SCRIPTS_JOGO = [
    'vendor/three.min.js', 'vendor/GLTFLoader.js', 'mundo.js', 'cena.js',
    'visao.js', 'visual.js', 'levelup.js', 'vlab-completo.js', 'jogo.js'
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
    /* A média da entrada (filme/loop/trilha) é da tela do título:
     * ao entrar no jogo, ela acaba — secção «FILME + LOOP + TRILHA». */
    if (typeof pararMidiaEntrada === 'function') pararMidiaEntrada();
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

  /* ---------- SOM PESSOAL (tranche t-config-entrada, sentença J1/J3/J5) ----------
   * Os volumes DESTA pessoa, NESTE aparelho: três reguadores (Geral,
   * Música, Efeitos) e o Mudo. São FACTORES sobre os níveis aprovados
   * pelo Mestre: 100 = exactamente o som de hoje; a gama é 0–100 e só
   * atenua. A leitura defensiva é UMA tabela, igual aqui e no jogo.js:
   * ausente → 100 · inteiro em [0,100] → o valor · qualquer outra
   * coisa → 100, sem clamp nem truncar (um valor corrupto nunca pode
   * impor silêncio). O Mudo só cala com o literal 'ligado'.
   * A trilha do título é a única coisa que soa nesta tela: o volume
   * físico dela escreve-se por UMA função na secção da trilha
   * (aplicarVolumeTrilha), que multiplica o progresso da rampa pelo
   * factor daqui: G × M × (mudo ? 0 : 1). */
  function lerVolumeSom(chave) {
    try {
      var v = localStorage.getItem(chave);
      if (v === null || !/^[0-9]+$/.test(v)) return 100;
      var n = Number(v);
      return (n >= 0 && n <= 100) ? n : 100;
    } catch (_) { return 100; }
  }
  function lerSomMudo() {
    try { return localStorage.getItem('hudt1-som-mudo') === 'ligado'; } catch (_) { return false; }
  }
  var somGeral = lerVolumeSom('hudt1-som-geral');
  var somMusica = lerVolumeSom('hudt1-som-musica');
  var somEfeitos = lerVolumeSom('hudt1-som-efeitos');
  var somMudo = lerSomMudo();
  function somFatorTrilha() {
    return (somGeral / 100) * (somMusica / 100) * (somMudo ? 0 : 1);
  }

  /* ---------- as definições da entrada = as do ⚙ que persistem ----------
   * Mesmas chaves, mesmos valores, mesmos rótulos do painel do jogo:
   * o painel da entrada edita o que o jogo lê ao arrancar. Câmera, Zoom
   * e Ajuda do grid não persistem no jogo (são só da sessão) — por isso
   * não estão aqui: prometer guardá-las seria mentir.
   * A Velocidade SAIU daqui (palavra do Mestre, 11/11 10:26): muda a
   * partida, é definição DELE — vive só na vista do Mestre, no ⚙,
   * lida da mesma chave. A secção Som abre o painel: os volumes são
   * da pessoa e do aparelho, como as outras linhas. */
  var NOTA_SOM = 'Música: só a do título — na batalha não há música. Efeitos: hoje, a chuva e o trovão; os sons da batalha usarão este volume quando existirem.';
  var DEFINICOES = [
    { chave: 'hudt1-som-geral', rotulo: 'Volume geral', tipo: 'vol', padrao: '100', seccao: 'Som' },
    { chave: 'hudt1-som-musica', rotulo: 'Música', tipo: 'vol', padrao: '100' },
    { chave: 'hudt1-som-efeitos', rotulo: 'Efeitos', tipo: 'vol', padrao: '100',
      sub: 'chuva e trovão — na batalha' },
    { chave: 'hudt1-som-mudo', rotulo: 'Mudo', tipo: 'tog',
      padrao: 'desligado', ligado: 'Ligado', desligado: 'Desligado',
      sub: 'Nenhum som, sem perder os volumes.' },
    { tipo: 'nota', texto: NOTA_SOM },
    { chave: 'hudt1-qualidade', rotulo: 'Qualidade', tipo: 'seg', padrao: 'alta',
      opcoes: [['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']] },
    { chave: 'hudt1-numeros-dano', rotulo: 'Números de dano', tipo: 'tog',
      padrao: 'ligado', ligado: 'Ligados', desligado: 'Desligados' },
    { chave: 'hudt1-tela-vermelha', rotulo: 'Tela vermelha', tipo: 'tog',
      padrao: 'ligado', ligado: 'Ligada', desligado: 'Desligada' },
    { chave: 'hudt1-tela-vermelha-piscar', rotulo: 'Piscar da tela vermelha', tipo: 'tog',
      padrao: 'ligado', ligado: 'Ligado', desligado: 'Desligado' }
  ];
  function lerDefinicao(def) {
    try {
      if (def.tipo === 'vol') return String(lerVolumeSom(def.chave));
      var v = localStorage.getItem(def.chave);
      if (def.tipo === 'seg') {
        for (var i = 0; i < def.opcoes.length; i++) if (def.opcoes[i][0] === v) return v;
        return def.padrao;
      }
      /* tog: o lado do omisso manda na leitura — quem nasce desligado
       * (o Mudo) só liga com o literal 'ligado'; quem nasce ligado só
       * desliga com o literal 'desligado'. */
      if (def.padrao === 'desligado') return v === 'ligado' ? 'ligado' : 'desligado';
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

  /* A marca da versão no canto inferior esquerdo: nasce com a
   * entrada e fica enquanto ela estiver no ecrã. Não é interface
   * de acção (sem clique) e NÃO entra na lista que o filme
   * esconde — o «sempre» da palavra dele. O estilo é a regra
   * .ent-versao de entrada.css. */
  var marcaVersao = el('div', 'ent-versao', VERSAO_JOGO);
  marcaVersao.id = 'ent-versao';
  raiz.appendChild(marcaVersao);

  /* Vista 1 — os três botões do layout. NÃO há botão do Google
   * separado: o fluxo Google vive dentro dos dois botões de entrar. */
  var vistaBotoes = el('div');
  var erroEntrada = el('p', 'ent-erro-entrada');
  erroEntrada.setAttribute('role', 'alert');
  var btnMestre = el('button', 'ent-btn'); btnMestre.id = 'ent-mestre'; btnMestre.type = 'button';
  var btnJogadora = el('button', 'ent-btn'); btnJogadora.id = 'ent-jogadora'; btnJogadora.type = 'button';
  var btnConfig = el('button', 'ent-btn', 'Configurações');
  btnConfig.id = 'ent-config'; btnConfig.type = 'button';
  /* A frase «Você entra com a sua conta Google. Ela fica guardada
   * neste celular.» SAIU (palavra do Mestre, 12/11/2026 09:01: a
   * frase por baixo dos botões que fala de entrar com a conta Google
   * e de ela ficar guardada neste celular). Sai só o texto visível:
   * o fluxo Google dentro dos botões e a guarda da conta no aparelho
   * ficam exactamente iguais. */
  vistaBotoes.appendChild(erroEntrada);
  vistaBotoes.appendChild(btnMestre);
  vistaBotoes.appendChild(btnJogadora);
  vistaBotoes.appendChild(btnConfig);
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
  /* Cabeçalho PEGAJOSO (lei do Mestre, 11/11 10:36): a faixa é o
   * primeiro filho e fica colada ao topo quando a lista rola — o ✕
   * está sempre visível, sem descer à procura dele. O clique no ✕ é
   * o mesmo destino a que o antigo «Voltar» levava. */
  var cabecalhoConfig = el('div', 'ent-cabecalho');
  cabecalhoConfig.appendChild(el('h2', null, 'Configurações'));
  var btnFecharConfig = el('button', 'ent-fechar', '✕');
  btnFecharConfig.id = 'ent-fechar-config'; btnFecharConfig.type = 'button';
  btnFecharConfig.setAttribute('aria-label', 'Fechar configurações');
  btnFecharConfig.addEventListener('click', function () { mostrar('botoes'); });
  cabecalhoConfig.appendChild(btnFecharConfig);
  vistaConfig.appendChild(cabecalhoConfig);
  var linhasDef = el('div');
  vistaConfig.appendChild(linhasDef);
  var btnRestaurar = el('button', 'ent-esquecer', 'Restaurar o padrão');
  btnRestaurar.id = 'ent-restaurar'; btnRestaurar.type = 'button';
  vistaConfig.appendChild(btnRestaurar);
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
  /* O «Voltar» no fundo SAIU (lei do Mestre, 11/11 10:36: «Não
   * precisa ter essa opção Voltar»): sai-se apertando fora do painel
   * (o ouvinte de captura junto a esta vista) ou no ✕ do cabeçalho. */
  raiz.appendChild(vistaConfig);

  /* ---------- Configurações em ABAS na entrada (t-config-abas,
   * SPEC §3): a vista ganha 3 abas — Gráficos · Som · Controles —
   * com a geometria v1 (coluna no Largo, grelha 2+1 no Estreito,
   * sem faixas-régua) e a zona Conta separada depois das abas.
   * NADA do Mestre nasce aqui. A aba por omissão é Gráficos; a
   * última aba fica lembrada numa variável desta superfície. */
  var entAbaActual = 'graficos';
  vistaConfig.classList.add('com-abas');
  var corpoEnt = el('div', 'entab-corpo');
  var indiceEnt = el('nav', 'entab-indice');
  indiceEnt.setAttribute('aria-label', 'Abas das configurações');
  var conteudoEnt = el('div', 'entab-conteudo');
  corpoEnt.appendChild(indiceEnt);
  corpoEnt.appendChild(conteudoEnt);
  vistaConfig.insertBefore(corpoEnt, btnRestaurar);
  var paineisEnt = {}, celulasEnt = {};
  function activarAbaEnt(id) {
    if (!paineisEnt[id]) id = 'graficos';
    entAbaActual = id;
    for (var k in paineisEnt) paineisEnt[k].classList.toggle('activa', k === id);
    for (var k2 in celulasEnt) celulasEnt[k2].classList.toggle('on', k2 === id);
    conteudoEnt.scrollTop = 0;
  }
  var ABAS_ENT = [
    ['graficos', 'Gráficos', 'Qualidade, números e tela vermelha'],
    ['som', 'Som', 'Volumes, música, efeitos e mudo'],
    ['controles', 'Controles', 'As teclas para jogar no computador']
  ];
  ABAS_ENT.forEach(function (def) {
    var sec = el('section', 'entab-aba');
    sec.dataset.aba = def[0];
    sec.setAttribute('aria-label', def[1]);
    conteudoEnt.appendChild(sec);
    paineisEnt[def[0]] = sec;
    var cel = el('button', 'entab-celula');
    cel.type = 'button';
    cel.dataset.aba = def[0];
    var b = el('b', null, def[1]);
    var i = el('i', null, def[2]);
    cel.appendChild(b); cel.appendChild(i);
    cel.addEventListener('click', function () { activarAbaEnt(def[0]); });
    indiceEnt.appendChild(cel);
    celulasEnt[def[0]] = cel;
  });
  /* Aba Gráficos: grupo «O seu ecrã» + Restaurar no fundo. */
  paineisEnt.graficos.appendChild(el('h3', 'ent-subtitulo', 'O seu ecrã'));
  var linhasDefG = el('div');
  paineisEnt.graficos.appendChild(linhasDefG);
  var zonaRestG = el('div', 'ent-restaurar-zona');
  zonaRestG.appendChild(el('p', 'ent-frase', 'Repõe só as definições de Gráficos e Som.'));
  zonaRestG.appendChild(btnRestaurar);
  paineisEnt.graficos.appendChild(zonaRestG);
  /* Aba Som: as linhas do som + a nota + Restaurar no fundo (o MESMO
     item nas duas abas, sentença J4: o gémeo dispara o clique do
     botão histórico — um só caminho, uma só lista branca). */
  var linhasDefS = el('div');
  paineisEnt.som.appendChild(linhasDefS);
  var zonaRestS = el('div', 'ent-restaurar-zona');
  zonaRestS.appendChild(el('p', 'ent-frase', 'Repõe só as definições de Gráficos e Som.'));
  var btnRestaurarSom = el('button', 'ent-esquecer', 'Restaurar o padrão');
  btnRestaurarSom.id = 'ent-restaurar-som'; btnRestaurarSom.type = 'button';
  btnRestaurarSom.addEventListener('click', function () { btnRestaurar.click(); });
  zonaRestS.appendChild(btnRestaurarSom);
  paineisEnt.som.appendChild(zonaRestS);
  /* Aba Controles: frase de abertura + a tabela de teclas (esquema
     FIXO, só-leitura — a mesma tabela do ⚙; a frase do V gera-se
     dos rótulos dos botões da Câmera do ⚙, I-3). */
  function fraseVistaEnt() {
    var nomes = [];
    ['cam-fixa', 'cam-seguir', 'cam-360'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) nomes.push(b.textContent.replace(/^[^\p{L}\p{N}]+/u, '').trim());
    });
    return 'Vista: troca a câmera — ' + nomes.join(', ') + '.';
  }
  function tabelaTeclasEnt() {
    var linhas = [
      ['A', 'Atacar', 'Atacar: escolha o alvo no mapa.'],
      ['M', 'Mover', 'Mover: depois ande com as setas, casa a casa.'],
      ['C', 'Consumível', 'Consumível: escolha o item para usar.'],
      ['Espaço', 'Encerrar vez', 'Encerra a sua vez e passa ao próximo. Só na sua vez.'],
      ['F', 'Ficha', 'Ficha: abre a ficha da sua personagem.'],
      ['I', 'Inventário', 'Inventário: abre a mochila da sua personagem.'],
      ['O', 'Configurações', 'Configurações: abre e fecha este painel.'],
      ['V', 'Câmera', fraseVistaEnt()],
      ['+ / −', 'Zoom', 'Zoom: aproxima e afasta a câmera.'],
      ['↑ ↓ ← →', 'Andar', 'Setas: andam casa a casa, só dentro do Mover, na sua vez, com nada aberto por cima.'],
      ['Q / E', 'Olhar à volta', 'Olhar: Q roda a câmera para a esquerda, E para a direita. Pode olhar a qualquer momento, mesmo fora da sua vez. Olhar não vira a personagem. Não se vê nada que o véu esconda.'],
      ['Esc', 'Fechar/cancelar', 'Fecha o que está aberto e cancela o modo activo.']
    ];
    var t = el('table', 'cfg-keys');
    var tb = el('tbody');
    t.appendChild(tb);
    linhas.forEach(function (lin) {
      var tr = el('tr');
      var td1 = el('td');
      td1.appendChild(el('span', 'cfg-chip', lin[0]));
      var td2 = el('td', 'cfg-kact', lin[1]);
      var td3 = el('td', 'cfg-ktut', lin[2]);
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
      tb.appendChild(tr);
    });
    return t;
  }
  var fraseCtrlEnt = el('p', 'ent-aba-frase',
    'Esquema fixo do computador — igual para todos. As teclas não se mudam aqui.');
  paineisEnt.controles.appendChild(fraseCtrlEnt);
  paineisEnt.controles.appendChild(tabelaTeclasEnt());
  /* O contentor plano antigo sai: as linhas pintam-se por aba. */
  linhasDef.remove();
  /* Zona Conta — depois das abas, com divisória: nota do aparelho
     no topo, título e os três botões com as visibilidades de sempre
     (quem as pinta continua a ser pintarConfig). */
  var contaEnt = el('div', 'ent-conta');
  contaEnt.appendChild(notaAparelho);
  contaEnt.appendChild(el('h3', 'ent-subtitulo', 'Conta guardada neste aparelho'));
  contaEnt.appendChild(btnOutraConta);
  contaEnt.appendChild(btnTrocar);
  contaEnt.appendChild(btnEsquecer);
  vistaConfig.appendChild(contaEnt);
  activarAbaEnt('graficos');

  /* ---------- RESTAURAR O PADRÃO (sentença J4) ----------
   * Lista branca EXPLÍCITA, chave a chave — a mesma do ⚙ do jogo.
   * Proibido repor por prefixo, por enumeração do armazenamento ou
   * por clear(): num aparelho partilhado, isso destruiria as chaves
   * do Mestre (velocidade, ambiente, visão, escala). Só entra o que
   * este painel mostra como definição pessoal persistida. */
  var RESTAURAR_ENTRADA = [
    ['hudt1-qualidade', 'alta'],
    ['hudt1-numeros-dano', 'ligado'],
    ['hudt1-tela-vermelha', 'ligado'],
    ['hudt1-tela-vermelha-piscar', 'ligado'],
    ['hudt1-som-geral', '100'],
    ['hudt1-som-musica', '100'],
    ['hudt1-som-efeitos', '100'],
    ['hudt1-som-mudo', 'desligado']
  ];
  btnRestaurar.addEventListener('click', function () {
    try {
      for (var i = 0; i < RESTAURAR_ENTRADA.length; i++)
        localStorage.setItem(RESTAURAR_ENTRADA[i][0], RESTAURAR_ENTRADA[i][1]);
    } catch (_) {}
    somGeral = 100; somMusica = 100; somEfeitos = 100; somMudo = false;
    if (typeof aplicarVolumeTrilha === 'function') aplicarVolumeTrilha();
    pintarConfig();
  });

  /* Tecla O na entrada (SPEC §6.2): alterna a vista Configurações
     pelo MESMO caminho dos botões — mostrar('config')/('botoes').
     Âmbito: ignora foco em campos (a senha escreve-se sem sustos),
     atalhos do navegador e repetições; só actua da vista de botões
     ou da própria vista de configurações; depois do arranque do
     jogo a vista sai do documento e esta tecla fica inerte (no
     jogo manda o handler do ⚙). */
  document.addEventListener('keydown', function (e) {
    if (!vistaConfig.isConnected) return;
    var alvo = e.target;
    if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' ||
      alvo.tagName === 'SELECT' || alvo.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.key !== 'o' && e.key !== 'O') return;
    if (!vistaConfig.hidden) { e.preventDefault(); mostrar('botoes'); }
    else if (!vistaBotoes.hidden) { e.preventDefault(); mostrar('config'); }
  });

  /* ---------- SAIR DAS CONFIGURAÇÕES: apertar fora fecha ----------
   * (lei do Mestre, 11/11 10:36; desenho J8.1) Ouvinte em CAPTURA
   * sobre document: com a vista de configurações aberta, um toque
   * fora do painel volta à vista de botões e é CONSUMIDO por inteiro
   * (a pressão inteira: pointerdown + o pointerup e o click dela),
   * para não activar nada atrás do painel. Alvo dentro do painel é
   * uso normal; as outras vistas da entrada não ganham este gesto. */
  var pressaoDeFechoEntrada = false;
  document.addEventListener('pointerdown', function (e) {
    if (vistaConfig.hidden) return;
    if (vistaConfig.contains(e.target)) return;
    pressaoDeFechoEntrada = true;
    mostrar('botoes');
    e.stopPropagation();
    e.preventDefault();
  }, true);
  document.addEventListener('pointerup', function (e) {
    if (!pressaoDeFechoEntrada) return;
    e.stopPropagation();
    e.preventDefault();
  }, true);
  document.addEventListener('click', function (e) {
    if (!pressaoDeFechoEntrada) return;
    pressaoDeFechoEntrada = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  /* Mexer num controlo de som actualiza o ESTADO partilhado com a
   * secção da trilha e aplica já: a fórmula única (aplicarVolumeTrilha)
   * lê o estado, nunca uma cópia. */
  function sincronizarEstadoSom(def) {
    if (def.chave === 'hudt1-som-geral') somGeral = lerVolumeSom(def.chave);
    else if (def.chave === 'hudt1-som-musica') somMusica = lerVolumeSom(def.chave);
    else if (def.chave === 'hudt1-som-efeitos') somEfeitos = lerVolumeSom(def.chave);
    else if (def.chave === 'hudt1-som-mudo') somMudo = lerSomMudo();
    else return;
    if (typeof aplicarVolumeTrilha === 'function') aplicarVolumeTrilha();
  }
  function pintarConfig() {
    /* Abas (SPEC §3): cada definição pinta-se na SUA aba — as do som
       (chaves hudt1-som-*) e a nota na aba Som; as outras na aba
       Gráficos. O título de secção antigo fundiu-se nos títulos das
       abas/grupos. */
    linhasDefG.textContent = '';
    linhasDefS.textContent = '';
    DEFINICOES.forEach(function (def) {
      var destino = (def.tipo === 'nota' || (def.chave || '').indexOf('hudt1-som-') === 0)
        ? linhasDefS : linhasDefG;
      if (def.tipo === 'nota') {
        destino.appendChild(el('p', 'ent-nota som-nota', def.texto));
        return;
      }
      var linha = el('div', 'cfgrow');
      var rot = el('span', 'cl');
      rot.appendChild(document.createTextNode(def.rotulo));
      if (def.sub) {
        var pequeno = el('small', null, def.sub);
        rot.appendChild(pequeno);
      }
      linha.appendChild(rot);
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
      } else if (def.tipo === 'vol') {
        var volctl = el('div', 'volctl');
        var reg = document.createElement('input');
        reg.type = 'range';
        reg.className = 'vol-range';
        reg.min = '0'; reg.max = '100'; reg.step = '1';
        reg.value = valor;
        reg.setAttribute('aria-label', def.rotulo);
        var saida = el('span', 'vol-valor', valor + '%');
        reg.addEventListener('input', function () {
          saida.textContent = reg.value + '%';
          gravarDefinicao(def, reg.value);
          sincronizarEstadoSom(def);
        });
        volctl.appendChild(reg);
        volctl.appendChild(saida);
        linha.appendChild(volctl);
      } else {
        var tog = el('button', 'tog' + (valor === 'ligado' ? ' on' : ''),
          valor === 'ligado' ? def.ligado : def.desligado);
        tog.type = 'button';
        tog.setAttribute('aria-pressed', valor === 'ligado' ? 'true' : 'false');
        tog.addEventListener('click', function () {
          gravarDefinicao(def, valor === 'ligado' ? 'desligado' : 'ligado');
          sincronizarEstadoSom(def);
          pintarConfig();
        });
        linha.appendChild(tog);
      }
      destino.appendChild(linha);
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

  /* ================================================================
   * FILME + LOOP + TRILHA — o pacote da entrada (tranche
   * t-entrada-filme; palavra do Mestre via chat da Entrada,
   * 10/11/2026 ~18:10 — tudo escolhido e aprovado por ele; a regra
   * da rotação vive em ROTACAO-TRILHA.md)
   *
   * A coreografia:
   *  · A página abre e o FILME (video-entrada.mp4, só imagem, 18 s)
   *    toca UMA vez em ecrã inteiro. Enquanto ele toca, a raiz tem a
   *    classe «a-tocar-filme»: as placas e os painéis estão
   *    invisíveis e sem toque — é só o filme. Saltar, só com a
   *    marca deste aparelho (secção «PULAR O FILME» abaixo,
   *    t-pular-filme): na primeira vez não há botão nenhum e o
   *    filme toca inteiro.
   *  · A MÚSICA (trilha-titulo.m4a, a faixa inteira, −12 dB já no
   *    ficheiro) é um elemento de áudio SEPARADO e contínuo: arranca
   *    com o filme, no ponto do bloco de 15 min (abaixo), com rampa
   *    de volume de 4 s na reprodução, e NÃO pára nem emenda na
   *    passagem filme→loop — na tela do título toca a faixa inteira
   *    e repete para sempre. Se o navegador travar o som sem toque,
   *    o arranque repete-se no primeiro toque, com o ponto do bloco
   *    desse instante. A trilha é do filme e do título: ao entrar no
   *    jogo (arrancarJogo), faz um fade curto e pára.
   *  · O filme termina sobre um ciclo do loop: quando ele acaba, o
   *    LOOP (video-loop.mp4) — já pré-carregado — começa e faz
   *    crossfade por cima do último fotograma; as placas aparecem.
   *    O loop é o fundo animado eterno da tela de entrada. Enquanto
   *    o filme carrega, a espera mostra SÓ o fotograma 0 do próprio
   *    filme (o poster do elemento): quando o filme arranca, a
   *    imagem parada é a imagem que começa a mexer — sem corte e
   *    sem sinal, emblema ou texto nenhum por cima (palavra dele,
   *    10/11 22:16; conserto t-poster-filme: antes o poster era a
   *    cena final V17 e o começo cortava para o fim — o «relâmpago»
   *    que ele apanhou). A arte pintada (v12, no CSS) fica como
   *    fallback sem vídeo.
   *  · Sem filme (rede/codec): salta directo para o título. Sem
   *    loop: fica o fundo pintado. Nada disto trava as portas.
   *  · A abertura tenta travar a paisagem (desenho de 06/11: a
   *    introdução trava o celular deitado; depois livre): no
   *    primeiro toque durante o filme pede ecrã inteiro + trava de
   *    paisagem, melhor esforço — as falhas são ignoradas em
   *    silêncio e a trava liberta-se quando o filme acaba.
   *
   * A rotação (relógio partilhado, ROTACAO-TRILHA.md):
   *    B = floor((agora_unix − 1794163200) / 900)
   *    PONTO = [76,0 ; 0,0 ; 128,5][B mod 3]   (o pódio dele: 5·1·2)
   * O módulo é o matemático (positivo): para B ≥ 0 é exactamente a
   * fórmula da spec; antes da âncora (B < 0) a rotação continua a
   * ciclar em vez de rebentar o índice.
   * ================================================================ */
  var ANCORA_TRILHA = 1794163200; /* 2026-11-11 00:00 America/Recife */
  var PONTOS_TRILHA = [76.0, 0.0, 128.5];
  function pontoDaTrilha(agoraMs) {
    var b = Math.floor((Math.floor(agoraMs / 1000) - ANCORA_TRILHA) / 900);
    return PONTOS_TRILHA[((b % 3) + 3) % 3];
  }
  window.__entradaPontoTrilha = pontoDaTrilha; /* gancho de prova */
  /* A posição que o relógio manda AGORA (palavra do Mestre,
   * 11/11/2026 09:15–09:18: o som sincronizado em todos os
   * aparelhos): o ponto do bloco MAIS o que já decorreu dentro
   * dele, no módulo da duração da faixa. Quem (re)arranca, volta
   * de fundo ou é corrigido aterra aqui — nunca num ponto
   * congelado. A duração é a da faixa inteira (194,581 s). */
  var DURACAO_TRILHA = 194.581;
  function posicaoDaTrilha(agoraMs) {
    var decorrido = (((agoraMs / 1000) - ANCORA_TRILHA) % 900 + 900) % 900;
    return (pontoDaTrilha(agoraMs) + decorrido) % DURACAO_TRILHA;
  }
  window.__entradaPosicaoTrilha = posicaoDaTrilha; /* gancho de prova */

  /* ---------- PULAR O FILME — só da segunda vez (t-pular-filme;
   * palavra do Mestre, 11/11/2026 09:04: «a primeira vez que a
   * pessoa entra no jogo não aparece esse botão de pular; depois
   * que ela fez o login e tudo mais, a segunda vez que ela entrou,
   * aí pode aparecer a opção de pular; mas a primeira vez, naquele
   * aparelho, não pode pular — é obrigado a assistir o filme»).
   *
   * A marca «este aparelho já viu o filme inteiro»:
   *  · chave localStorage «entrada-filme-visto» = '1' — a família
   *    das chaves da própria entrada; o âmbito é O APARELHO (a
   *    origem neste navegador), não a conta: trocar de conta no
   *    mesmo aparelho mantém a marca, outro aparelho não a tem, e
   *    apagar os dados do site apaga a marca (a obrigação renasce);
   *  · escreve-se SÓ no «ended» do filme — o filme acabou por si.
   *    O clique em PULAR não escreve (o botão só existe com a marca
   *    já gravada); o erro do filme (fallback) não escreve — o
   *    filme não foi visto, a entrada segue para o título como
   *    hoje e ninguém fica preso por uma falha técnica; a rede
   *    dos 60 s não escreve; fechar a meio não escreve;
   *  · leitura e escrita sempre em try/catch, como o resto da
   *    casa: armazenamento morto lê «sem marca» e a escrita é sem
   *    efeito — esse navegador nunca ganha o botão, e nunca fica
   *    preso por causa disso.
   * O botão é um elemento real (#ent-pular), visível só durante o
   * filme E com a marca (a raiz ganha «tem-marca-filme»); o clique
   * chama terminarFilme() — o MESMO caminho do fim natural: loop,
   * placas e a trilha contínua, sem atalho paralelo. ---------- */
  var CHAVE_FILME_VISTO = 'entrada-filme-visto';
  function filmeJaVistoNesteAparelho() {
    try { return localStorage.getItem(CHAVE_FILME_VISTO) === '1'; } catch (_) { return false; }
  }
  function gravarFilmeVisto() {
    try { localStorage.setItem(CHAVE_FILME_VISTO, '1'); } catch (_) {}
  }
  var filmeJaVisto = filmeJaVistoNesteAparelho();

  var videoFilme = el('video', 'ent-video');
  videoFilme.id = 'ent-video-filme';
  videoFilme.src = 'video-entrada.mp4';
  videoFilme.poster = 'filme-quadro0.webp'; /* o fotograma 0 do próprio filme: a espera mostra o começo, não o fim (t-poster-filme) */
  videoFilme.muted = true; /* o filme não tem faixa de áudio: quem soa é a trilha */
  videoFilme.setAttribute('playsinline', '');
  videoFilme.preload = 'auto';

  var videoLoop = el('video', 'ent-video');
  videoLoop.id = 'ent-video-loop';
  videoLoop.src = 'video-loop.mp4';
  videoLoop.poster = 'loop-quadro0.webp'; /* o fotograma 0 do próprio loop: o que desbota por cima do filme é sempre um fotograma do loop, nunca o fundo pintado (t-piscada-layout) */
  videoLoop.muted = true;
  videoLoop.loop = true;
  videoLoop.setAttribute('playsinline', '');
  videoLoop.preload = 'auto';

  /* ---------- a logo como tela de carregamento (t-logo-carregamento;
   * palavra do Mestre, 11/11/2026 09:20: «deixe esse vídeo como a
   * primeira parte, com tela de carregamento, enquanto o filme tá
   * carregando; esse vídeo não é obrigado a ser visto todo —
   * carregou, já pode ir para o filme») ----------
   * A logo (logo-proverbio.mp4: o vídeo do provérbio, ciclo perfeito
   * de 13,8 s, mudo) é a PRIMEIRA camada visível da abertura: toca em
   * ciclo por cima de tudo (CSS: z-index 4, object-fit contain sobre
   * o fundo escuro dela) enquanto o filme carrega. Quando o filme
   * está pronto a tocar (readyState ≥ 3 — ver o bloco do arranque,
   * abaixo), a logo desbota em ~350 ms e o filme arranca do
   * fotograma 0, como hoje. A logo NÃO é o filme: não conta como
   * «filme visto», não grava marca nenhuma (a marca da tranche
   * t-pular-filme só nasce no «ended» do filme) e o botão PULAR
   * nunca aparece durante ela — fica-lhe por baixo, sem toque.
   * Se a própria logo falhar, ela sai e o filme arranca já pelo
   * caminho de hoje: a entrada nunca fica refém da tela de
   * carregamento. */
  var TECTO_LOGO_MS = 45000; /* o tecto anti-armadilha: ver o bloco do arranque */
  var videoLogo = el('video', 'ent-video-logo');
  videoLogo.id = 'ent-video-logo';
  videoLogo.src = 'logo-proverbio.mp4';
  videoLogo.poster = 'logo-quadro0.webp'; /* o fotograma 0 da própria logo: a espera da espera também é a imagem que começa a mexer */
  videoLogo.muted = true; /* a logo não tem faixa de áudio: quem soa é a trilha */
  videoLogo.loop = true;
  videoLogo.setAttribute('playsinline', '');
  videoLogo.preload = 'auto';
  raiz.appendChild(videoLogo);
  var promLogo = videoLogo.play();
  if (promLogo && promLogo.catch) promLogo.catch(function () {});
  /* Se a logo falhar, o filme arranca já sem ela (a declaração de
   * arrancarFilme está no bloco do arranque, abaixo — as declarações
   * de função sobem no âmbito, e o erro nunca dispara em síncrono). */
  videoLogo.addEventListener('error', function () { arrancarFilme(); });

  var trilha = el('audio');
  trilha.id = 'ent-trilha';
  trilha.src = 'trilha-titulo.m4a';
  trilha.loop = true;
  trilha.preload = 'auto';
  trilha.volume = 0;

  raiz.insertBefore(videoFilme, raiz.firstChild);
  raiz.insertBefore(videoLoop, raiz.firstChild);
  raiz.classList.add('a-tocar-filme');

  /* O botão PULAR: nasce sempre no DOM mas escondido — quem o
   * mostra é a regra do CSS (só com «a-tocar-filme» E
   * «tem-marca-filme» na raiz). Sem a marca, nenhum fotograma do
   * filme o tem visível. */
  var btnPular = el('button', 'ent-pular', 'PULAR');
  btnPular.type = 'button';
  btnPular.id = 'ent-pular';
  btnPular.setAttribute('aria-label', 'Pular o filme de entrada');
  raiz.appendChild(btnPular);
  if (filmeJaVisto) raiz.classList.add('tem-marca-filme');
  btnPular.addEventListener('click', function () { terminarFilme(); });

  /* ---------- a paisagem da abertura (melhor esforço) ---------- */
  var paisagemTentada = false;
  function libertarPaisagem() {
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (_) {}
  }
  function tentarPaisagem() {
    if (paisagemTentada) return;
    paisagemTentada = true;
    try {
      var travar = function () {
        try {
          if (screen.orientation && screen.orientation.lock) {
            var r = screen.orientation.lock('landscape');
            if (r && r.catch) r.catch(function () {});
          }
        } catch (_) {}
      };
      var prom = null;
      if (document.documentElement.requestFullscreen) {
        /* Carimbo partilhado com a gestão «TELA CHEIA PERMANENTE»
         * (fim do ficheiro): este pedido conta para o freio de
         * ~1 s, para o toque não disparar dois pedidos ao mesmo
         * tempo. A variável é declarada lá em baixo (var da mesma
         * função) e só é escrita em gestos, já com o ficheiro todo
         * avaliado. */
        tcUltimaTentativa = Date.now();
        try { prom = document.documentElement.requestFullscreen(); } catch (_) {}
      }
      if (prom && prom.then) prom.then(travar, travar); else travar();
    } catch (_) {}
  }

  /* ---------- o fim do filme: o loop assume, as placas aparecem --- */
  var filmeTerminou = false;
  var loopFalhou = false;
  function terminarFilme() {
    if (filmeTerminou) return;
    filmeTerminou = true;
    raiz.classList.remove('a-tocar-filme');
    raiz.classList.add('filme-fim');
    libertarPaisagem();
    var comecarLoop = function () {
      if (loopFalhou) return; /* E1: sem loop, o fundo é a arte pintada */
      var p = videoLoop.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (videoLoop.readyState >= 2) comecarLoop();
    else videoLoop.addEventListener('canplay', comecarLoop, { once: true });
    setTimeout(function () {
      try { videoFilme.pause(); } catch (_) {}
      try { videoFilme.remove(); } catch (_) {}
    }, 1200);
  }
  videoFilme.addEventListener('ended', function () {
    /* O filme acabou por si: este aparelho já o viu inteiro —
     * a marca grava-se ANTES de o título assumir (t-pular-filme).
     * É o ÚNICO sítio que escreve a marca. */
    gravarFilmeVisto();
    terminarFilme();
  });
  videoFilme.addEventListener('error', function () {
    /* Sem filme, a entrada não fica muda nem presa: título directo. */
    try { videoFilme.style.display = 'none'; } catch (_) {}
    terminarFilme();
  });
  videoLoop.addEventListener('error', function () {
    /* Sem loop, o fundo do título NÃO fica preto: espelho do caminho
     * do filme — o elemento esconde-se. E sai do DOM, para a regra
     * «.filme-fim #ent-video-loop { opacity: 1 }» nunca acender um
     * elemento partido (o .ent-video tem background: #000) sobre a
     * arte pintada de hoje, que é o fundo declarado para este caso.
     * Emenda E1 da conferência independente (CONFERENCIA.md §5). */
    loopFalhou = true;
    try { videoLoop.style.display = 'none'; } catch (_) {}
    try { videoLoop.remove(); } catch (_) {}
  });
  /* Rede de segurança: se o filme estiver a tocar há 60 s sem acabar
   * (o normal são 18 s), a tela do título não fica refém dele. A
   * rede arma-se no bloco do arranque (abaixo), no «playing» do
   * filme, e conta desde o arranque REAL — com a logo a segurar a
   * espera (t-logo-carregamento), o arranque pode ser tardio e a
   * contagem desde a abertura cortaria um filme acabado de começar. */
  var filmeInicioMs = 0;

  /* ---------- o arranque do filme, com a logo a segurar a espera ----
   * (t-logo-carregamento) O filme NÃO arranca às cegas ao abrir:
   * arranca quando está pronto a tocar (readyState ≥ 3, o «canplay»),
   * com a logo a desbotar por cima dele. Até lá, quem carrega é o
   * preload='auto' de hoje — medido antes de desenhar: só com o
   * preload, o canplay chegou em 9,0 s a 500 kB/s, 18,9 s a
   * 125 kB/s e 9,8 s a 60 kB/s. Os caminhos de recurso:
   *  · tecto de 45 s sem sinal → arranca na mesma e o fluxo segue
   *    pelo caminho de hoje (poster REF_53 → filme); 45 s é ≥ 2,3×
   *    o pior canplay medido, cabe mais de 3 ciclos inteiros da
   *    logo (3 × 13,8 s) e fica abaixo da rede dos 60 s;
   *  · a logo falhar → o erro dela chama o arranque já;
   *  · o filme falhar → o ouvinte de erro dele (acima) já chamou
   *    terminarFilme: um gémeo aqui só tira a logo do caminho.
   * O gesto de recurso do autoplay travado é o mesmo de hoje. */
  var filmeArrancou = false;
  var tectoLogo = null;
  function tocarFilme() {
    var promFilme = videoFilme.play();
    if (promFilme && promFilme.catch) {
      promFilme.catch(function () {
        /* Autoplay do filme travado (raro: ele é mudo e sem faixa de
         * áudio): o primeiro toque põe-no a andar. */
        window.addEventListener('pointerdown', function () {
          var p2 = videoFilme.play();
          if (p2 && p2.catch) p2.catch(function () {});
        }, { once: true });
      });
    }
  }
  function tirarLogo() {
    if (!videoLogo) return;
    var lg = videoLogo;
    videoLogo = null;
    raiz.classList.add('logo-fora');
    setTimeout(function () {
      try { lg.pause(); } catch (_) {}
      try { lg.remove(); } catch (_) {}
    }, 600);
  }
  function arrancarFilme() {
    if (filmeArrancou) return;
    filmeArrancou = true;
    if (tectoLogo) { clearTimeout(tectoLogo); tectoLogo = null; }
    tirarLogo();
    tocarFilme();
  }
  videoFilme.addEventListener('playing', function () {
    /* A rede de segurança dos 60 s, armada no arranque real. */
    if (filmeInicioMs) return;
    filmeInicioMs = Date.now();
    setTimeout(function () {
      if (!filmeTerminou && !videoFilme.paused && !videoFilme.ended) terminarFilme();
    }, 60000);
  });
  if (videoFilme.readyState >= 3) arrancarFilme();
  else videoFilme.addEventListener('canplay', arrancarFilme, { once: true });
  tectoLogo = setTimeout(arrancarFilme, TECTO_LOGO_MS);
  videoFilme.addEventListener('error', tirarLogo);

  /* ---------- a trilha: ponto do bloco + rampa de 4 s ---------- */
  var trilhaIniciada = false;
  var idRampaTrilha = null;
  var trilhaRampaFeita = false; /* trinco: a rampa é da abertura — uma vez por vida da trilha (emenda TRILHA-RELOGIO) */
  /* O VOLUME DA TRILHA TEM UM SÓ DONO (t-config-entrada, sentença
   * J3): aplicarVolumeTrilha é a ÚNICA função que escreve
   * trilha.volume depois da criação do elemento. A rampa é dona do
   * PROGRESSO (0→1 em 4 s), o fade de saída é dono do seu factor
   * (1→0 em 0,6 s) e os volumes pessoais são donos dos factores
   * deles (somFatorTrilha, na secção SOM PESSOAL) — o volume físico
   * é sempre o produto dos três, recalculado no instante da escrita.
   * É isto que faz o Mudo e os reguadores valerem na hora, mesmo a
   * meio da rampa, sem saltos nem ressurreições. */
  var trilhaProgressoRampa = 0;
  var trilhaFatorFade = 1;
  function aplicarVolumeTrilha() {
    try { trilha.volume = trilhaProgressoRampa * trilhaFatorFade * somFatorTrilha(); } catch (_) {}
  }
  function iniciarTrilha() {
    if (trilhaIniciada) return;
    trilhaIniciada = true;
    var tocar = function () {
      /* O seek lê o relógio NESTE instante (o do canplay): a
       * posição mandada é a do relógio, não a do carregamento. */
      try { trilha.currentTime = posicaoDaTrilha(Date.now()); } catch (_) {}
      aplicarVolumeTrilha();
      var prom = trilha.play();
      if (prom && prom.catch) {
        prom.catch(function () {
          /* Som travado sem toque: o arranque repete-se no primeiro
           * toque/clique de tecla, com a posição do relógio desse
           * instante (posicaoDaTrilha volta a ser lida lá dentro). */
          trilhaIniciada = false;
          var outraVez = function () { iniciarTrilha(); };
          window.addEventListener('pointerdown', outraVez, { once: true });
          window.addEventListener('keydown', outraVez, { once: true });
        });
      }
    };
    /* O seek espera pelo «canplay» (não só pelos metadados): com
     * dados a sério na mão, o ponto do bloco aterra de forma fiável
     * nos servidores com Range — como o anfitrião da página. */
    if (trilha.readyState >= 3) tocar();
    else trilha.addEventListener('canplay', tocar, { once: true });
  }
  trilha.addEventListener('playing', function () {
    if (idRampaTrilha || trilhaRampaFeita) return;
    var t0 = performance.now();
    idRampaTrilha = setInterval(function () {
      var v = (performance.now() - t0) / 4000;
      if (v >= 1) {
        v = 1;
        clearInterval(idRampaTrilha);
        idRampaTrilha = null;
        trilhaRampaFeita = true;
      }
      trilhaProgressoRampa = v;
      aplicarVolumeTrilha();
    }, 100);
  });
  document.body.appendChild(trilha);
  iniciarTrilha();

  /* O primeiro toque durante o filme também é o gesto que deixa a
   * abertura tentar a paisagem travada. */
  window.addEventListener('pointerdown', function () {
    if (!filmeTerminou) tentarPaisagem();
  });

  /* Ao entrar no jogo (qualquer porta): a trilha do título acaba em
   * fade curto, os vídeos páram e a paisagem liberta-se. */
  function pararMidiaEntrada() {
    libertarPaisagem();
    if (idRampaTrilha) { clearInterval(idRampaTrilha); idRampaTrilha = null; }
    try { videoFilme.pause(); } catch (_) {}
    try { videoLoop.pause(); } catch (_) {}
    try {
      var a = trilha;
      var t0 = performance.now();
      var idFade = setInterval(function () {
        var k = (performance.now() - t0) / 600;
        if (k >= 1) {
          clearInterval(idFade);
          try { a.pause(); } catch (_) {}
          try { a.remove(); } catch (_) {}
          return;
        }
        /* O fade é dono só do seu factor (1→0): o volume físico
         * continua a ser o produto da fórmula única, por isso o
         * fade desce do nível EFECTIVO (rampa × volumes pessoais). */
        trilhaFatorFade = 1 - k;
        aplicarVolumeTrilha();
      }, 50);
    } catch (_) {}
  }

  /* ---------- SOM-EM-FUNDO-INICIO — a trilha cala-se fora do jogo ----------
   * Defeito apanhado pelo Mestre ao vivo (11/11/2026 08:43): sair
   * para a tela principal do telefone deixava o som a tocar cá
   * fora, com a app aberta em segundo plano. A guarda é só da
   * trilha (os vídeos são mudos; o som da batalha tem a guarda
   * dele em jogo.js):
   *   · ao ESCONDER (visibilitychange para hidden, ou pagehide):
   *     se a trilha estiver a tocar, pausa e levanta a bandeira —
   *     a bandeira é a prova de que estava a tocar;
   *   · ao VOLTAR (visible, ou pageshow de restauro): só com a
   *     bandeira posta, retoma com play() — saltando para a
   *     posição que o relógio manda nesse instante — e só se o
   *     elemento ainda estiver
   *     no documento: depois de entrar no jogo, pararMidiaEntrada
   *     removeu-o e ele nunca pode ressuscitar;
   *   · sem bandeira, voltar é no-op: trilha por iniciar (antes
   *     do primeiro toque) ou já parada não arranca — a regra
   *     «começa mudo, o primeiro toque repõe o som» fica intacta.
   * --------------------------------------------------------------- */
  var trilhaPausadaPorFundo = false;
  function trilhaEsconder() {
    try {
      if (!trilha.paused && !trilha.ended) {
        trilhaPausadaPorFundo = true;
        trilha.pause();
      }
    } catch (_) {}
  }
  function trilhaVoltar() {
    if (!trilhaPausadaPorFundo) return;
    trilhaPausadaPorFundo = false;
    try {
      if (!document.contains(trilha)) return;
      /* O 'playing' do retomar não pode re-arrancar a rampa de
       * 4 s da abertura: o ouvinte da rampa (secção da trilha)
       * cria um intervalo novo quando a anterior já acabou, e o
       * progresso cairía a zero ao voltar. Se neste 'playing'
       * surgir um intervalo novo, ele morre aqui; se a rampa
       * original ainda correr, fica intocada.
       * O VOLUME não se guarda nem se repõe à letra (guardar o
       * volume físico era a porta por onde um Mudo ligado ao
       * esconder era desfeito ao voltar): ao retomar, a fórmula
       * única recalcula o volume do instante — progresso da rampa
       * × factores actuais. Com o Mudo ligado, o regresso é a 0;
       * ao desligar o Mudo depois, o som volta ao valor da fórmula
       * desse instante, não a um fantasma guardado. */
      var rampaAntes = idRampaTrilha;
      trilha.addEventListener('playing', function () {
        try {
          if (idRampaTrilha && idRampaTrilha !== rampaAntes) { clearInterval(idRampaTrilha); idRampaTrilha = null; }
          aplicarVolumeTrilha();
        } catch (_) {}
      }, { once: true });
      /* Ao voltar, a trilha NÃO retoma do ponto congelado: salta
       * para onde o relógio manda agora — o mesmo ponto onde
       * estão os outros aparelhos (palavra do Mestre, 11/11/2026
       * 09:15–09:18; fora do jogo fica calada — a pausa acima
       * fica —, mas o relógio nunca parou). */
      try { trilha.currentTime = posicaoDaTrilha(Date.now()); } catch (_) {}
      var p = trilha.play();
      if (p && p.catch) p.catch(function () {});
    } catch (_) {}
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) trilhaEsconder(); else trilhaVoltar();
  });
  window.addEventListener('pagehide', trilhaEsconder);
  window.addEventListener('pageshow', function (e) { if (e && e.persisted) trilhaVoltar(); });
  /* ---------- SOM-EM-FUNDO-FIM ---------- */
  /* ---------- TRILHA-RELOGIO-INICIO — a deriva corrige-se ----------
   * A posição mandada (posicaoDaTrilha) é função do relógio;
   * quem toca sem interrupção atravessa a fronteira do bloco
   * (15 min) sem saltar, e relógios de média imperfeitos derivam.
   * De 5 em 5 s, SÓ com a página visível e a trilha a tocar: se a
   * distância circular à posição do relógio passar de 2 s, um
   * seek repõe a posição. Dentro da tolerância, nada se toca —
   * no máximo uma correcção por verificação, sem espasmos.
   * Emenda medida na 1.ª bateria desta tranche: cada seek (o do
   * regresso e os do corrector) pode fazer o elemento disparar
   * outro 'playing' (re-buffer na posição nova), e o ouvinte da
   * rampa da abertura — que só olhava para idRampaTrilha —
   * re-arrancava a rampa: o volume mergulhava e re-subia em 4 s
   * a cada correcção. O trinco trilhaRampaFeita (secção da
   * trilha) fecha isso: a rampa corre uma única vez, na abertura;
   * a emenda da REF_57 em trilhaVoltar fica como segunda rede.
   * --------------------------------------------------------------- */
  setInterval(function () {
    try {
      if (document.hidden) return;
      if (!document.contains(trilha) || trilha.paused || trilha.ended) return;
      var manda = posicaoDaTrilha(Date.now());
      var desvio = ((trilha.currentTime - manda + DURACAO_TRILHA / 2) % DURACAO_TRILHA + DURACAO_TRILHA) % DURACAO_TRILHA - DURACAO_TRILHA / 2;
      if (Math.abs(desvio) > 2) trilha.currentTime = manda;
    } catch (_) {}
  }, 5000);
  /* ---------- TRILHA-RELOGIO-FIM ---------- */
  /* ============ FILME + LOOP + TRILHA — fim da secção ============ */

  /* ================================================================
   * TELA CHEIA PERMANENTE (pedido do Mestre, 10/11/2026 19:28:
   * «Tem como sempre ficar tela cheia?»)
   *
   * A regra do navegador manda: a tela cheia só entra depois de um
   * gesto — sem gesto, não há pedido possível (não é defeito, é a
   * regra do Chrome). O desenho, portanto:
   *   · o PRIMEIRO toque/clique da sessão pede a tela cheia (durante
   *     o filme, quem pede é o caminho da REF_48, tentarPaisagem —
   *     que carimba tcUltimaTentativa; fora do filme, é aqui);
   *   · depois desse gesto, TODO o toque/clique volta a pedir se a
   *     tela cheia tiver caído (um gesto do sistema — barra de
   *     notificações, botão de voltar — pode tirá-la e a página não
   *     pode impedir a saída; o toque seguinte repõe, sem o Mestre
   *     ter de pensar nisso). Vale na entrada e dentro do jogo: esta
   *     camada continua carregada depois do boot;
   *   · freio: no máximo 1 tentativa a cada ~1 s, e um pedido em
   *     curso bloqueia o seguinte — nunca rajadas, nem sobre erros
   *     (a tentativa conta para o freio mesmo quando é recusada);
   *   · quando a tela cheia entra já dentro do jogo (ou ainda
   *     durante o filme), tenta-se a trava de paisagem em melhor
   *     esforço; na tela do título, a paisagem continua liberta,
   *     como a REF_48 desenhou;
   *   · tudo embrulhado: promessas recusadas engolidas em silêncio,
   *     e sem a API a página vive exactamente como hoje.
   * ================================================================ */
  var tcJaHouveGesto = false;
  var tcUltimaTentativa = 0;
  var tcPedidoEmCurso = false;

  function tcEmTelaCheia() {
    try {
      return !!(document.fullscreenElement || document.webkitFullscreenElement);
    } catch (_) { return false; }
  }
  function tcTravarPaisagem() {
    try {
      if (screen.orientation && screen.orientation.lock) {
        var r = screen.orientation.lock('landscape');
        if (r && r.catch) r.catch(function () {});
      }
    } catch (_) {}
  }
  function tcPedir() {
    if (!tcJaHouveGesto) return; /* sem gesto, o navegador não deixa */
    if (tcEmTelaCheia() || tcPedidoEmCurso) return;
    var agora = Date.now();
    if (agora - tcUltimaTentativa < 1000) return; /* o freio de ~1 s */
    var alvo = document.documentElement;
    if (!alvo || (!alvo.requestFullscreen && !alvo.webkitRequestFullscreen)) return;
    tcUltimaTentativa = agora;
    tcPedidoEmCurso = true;
    var fim = function () { tcPedidoEmCurso = false; };
    try {
      var prom = null;
      if (alvo.requestFullscreen) {
        try { prom = alvo.requestFullscreen({ navigationUI: 'hide' }); }
        catch (_) { try { prom = alvo.requestFullscreen(); } catch (_) {} }
      } else if (alvo.webkitRequestFullscreen) {
        try { alvo.webkitRequestFullscreen(); } catch (_) {}
      }
      if (prom && prom.then) {
        prom.then(function () {
          fim();
          /* Dentro do jogo (ou ainda no filme): paisagem travada. */
          if (arrancou || !filmeTerminou) tcTravarPaisagem();
        }, fim);
      } else fim();
    } catch (_) { fim(); }
  }
  window.addEventListener('pointerdown', function () {
    tcJaHouveGesto = true;
    tcPedir();
  });
  /* Rede extra: se a tela cheia entrar dentro do jogo por outro
   * caminho (ex.: o pedido do filme resolve já com o jogo a correr),
   * a trava de paisagem tenta na mesma. */
  function tcAoMudarTelaCheia() {
    if (tcEmTelaCheia() && arrancou) tcTravarPaisagem();
  }
  document.addEventListener('fullscreenchange', tcAoMudarTelaCheia);
  document.addEventListener('webkitfullscreenchange', tcAoMudarTelaCheia);
  /* Gancho de prova (o mesmo padrão de __entradaPontoTrilha): o
   * estado do gestor, legível pelas sondas e pela conferência. */
  window.__tcEstado = function () {
    return {
      gesto: tcJaHouveGesto,
      ultimaTentativa: tcUltimaTentativa,
      pedidoEmCurso: tcPedidoEmCurso,
      emTelaCheia: tcEmTelaCheia()
    };
  };
  /* ============ TELA CHEIA PERMANENTE — fim da secção ============ */

  pintarBotaoMestre();
  pintarBotaoJogadora();
  document.body.appendChild(raiz);
})();
