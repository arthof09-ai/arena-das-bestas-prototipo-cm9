/* Tabela Única de Dados de Apresentação — fonte única dos valores de
 * apresentação do jogo (paleta, alturas, ambiente). Só dados: nenhuma
 * função utilitária vive aqui. Cada cor escreve-se UMA vez, como string
 * hex; quem precisa do inteiro deriva-o na leitura
 * (parseInt(D.paleta.ouro.slice(1), 16) ou new THREE.Color(string)).
 * O objecto é congelado em profundidade: quem precisar de variar um
 * valor copia (spread), nunca muta. Espelho verificado do :root de
 * jogo.css: quem muda um lado muda o outro no mesmo commit (P-IGUAL).
 * Construção: t-tabela-dados (DESENHO aprovado 940/1000). */
window.DADOS_APRESENTACAO = {
  // — espelho verificado do :root de jogo.css + fundo do body —
  paleta: {
    fundo: '#0a0f0a',
    painel: 'rgba(16,12,8,.55)',
    painelDenso: 'linear-gradient(160deg, rgba(26,20,12,.95), rgba(14,11,7,.97))',
    pergaminho: '#f3e9d2',
    pergaminhoFraco: '#cbbd93',
    pergaminhoMudo: '#9d8f6d',
    pergaminhoLuz: '#fff3d0',
    creme: '#fff8e5',
    ouro: '#c9a227',
    ouroClaro: '#ffe9a8',
    lendario: '#ffd94d',
    bronze: '#a37f33',
    sangue: '#a83226',
    sangueVivo: '#d05545',
    sangueAlerta: '#ff5347',
    sangueEscuro: '#7a1f1f',
    raro: '#8ad6ff',
    magico: '#8a76c9',
    magicoClaro: '#d9ccff',
    sucesso: '#46c96a',
    tinta: '#1c1508',
    linha: 'rgba(201,162,39,.85)',
    linhaFraca: 'rgba(201,162,39,.3)'
  },

  // — tons próprios do ecrã de entrada: referência vigiada por P-IGUAL
  // (os literais vivem em entrada.css; esta secção nomeia-os) —
  entrada: {
    pergaminhoEntrada: '#cbbd97',
    pergaminhoClaro: '#efe6cf',
    pergaminhoMedio: '#e9dcb8',
    pergaminhoAreia: '#eee0ae',
    pergaminhoDourado: '#f6e3ac',
    pergaminhoLuz: '#fdf3c4',
    ouroSuave: '#ecb86e',
    ouroPalido: '#e8c877',
    ouroAreia: '#ecd28a',
    ouroForte: '#d9b45f',
    ouroEscuro: '#c88838',
    ouroVelho: '#b8933f',
    castanhoOuro: '#9b6429',
    brilhoOuro: '#ffbe5a',
    brilhoSuave: '#ffdf9a',
    brilhoCreme: '#ffe9b0',
    fundoEntrada: '#0a0505',
    fundoProfundo: '#070303',
    sombra1: '#100a04',
    sombra2: '#130d07',
    sombra3: '#1a1108',
    sombra4: '#21170c',
    sombra5: '#241a0e',
    sombra6: '#2b1f11',
    cinzaNoite1: '#131314',
    cinzaNoite2: '#17181d',
    cinzaNoite3: '#17191d',
    cinzaNoite4: '#1f1f1f',
    cinzaNoite5: '#1f2022',
    rosaPele: '#f0a596',
    cinzaClaro1: '#e8e8e8',
    cinzaClaro2: '#e3e3e3'
  },

  // — a família do fogo: 9 valores distintos, nunca fundidos.
  // Referência vigiada (P-IGUAL + porta de re-inventário); os
  // consumidores migram na Fase D. Dois são CHAVES DE IDENTIDADE
  // entre ficheiros: tochaChave (cena.js reconhece as luzes das
  // tochas por getHex()) e luzChama (visual.js idem). —
  fogo: {
    tochaChave: '#ff8f3f',
    luzChama: '#ff792b',
    chama: '#ff631d',
    nucleo: '#ffdf8e',
    brilho: '#ff7a26',
    calor: '#ff9a3c',
    fogueira: '#ff6724',
    luzChao: '#ff8f2e',
    brasa: '#e76c29'
  },

  // — alturas das figuras (a importação escala por estes valores) —
  figuras: {
    orc: { altura: 3.6 },
    ong: { altura: 2.625 },
    capanga: { altura: 2.7 },
    lobo: { altura: 1.35 },
    grifo: { altura: 3.8 }
  },

  // — o véu da vista (Party + pré-vista do Mestre lêem daqui;
  // consumo por spread: quem chama junta as casas) —
  veu: {
    total: { cor: '#0b0e14', opacidade: 0.55 },
    nunca: { cor: '#05070a', opacidade: 0.92 },
    memoria: { cor: '#8b93a1', opacidade: 0.30 }
  },

  // — marcadores e camadas da cena —
  marcadores: {
    fantasmaPedras: { cor: '#9aa7b4', opacidade: 0.45 },
    // ARBITRAGEM-FANTASMA (2026-11-17): governa 0,45 — o 0,55 do
    // desenho v2 era errata sem fonte no código. Hoje as figuras usam
    // o MESMO material partilhado de fantasmaPedras (ghostMat único);
    // a entrada fica separada (nunca fundida) como casa nomeada para
    // um material próprio futuro. SEM CONSUMIDOR: nenhum código a lê.
    fantasmaFiguras: { cor: '#9aa7b4', opacidade: 0.45 },
    contacto: '#080c12',
    previa: '#2e7fb8',
    anel: '#ff4747'
  },

  // — anéis, grelha, caminho e tintas de figura da cena —
  marcadoresCena: {
    destino: '#ffd28b',
    hover: '#fff0bf',
    grelha: '#c9c2a7',
    camadaMovimento: '#cab577',
    camadaContorno: '#f5d59b',
    caminho: '#9fd8ff',
    obstaculos: '#ffb52e',
    tether: '#ffdc94',
    tints: ['#87b4b0', '#e5bb74', '#b98b9d', '#b5c3ce', '#b7b77c'],
    marcadorLobo: '#777b79',
    marcadorOutro: '#817c73'
  },

  // — o sensor de toque: migram a cor e o brilho; os tamanhos
  // (26×26 px, fonte 19 px) são geometria local de um só sítio —
  sensor: { cor: '#ffb52e', brilho: 'rgba(255,160,20,.8)' },

  // — perfis de qualidade: a tabela fornece o TECTO de dpr e o
  // tamanho do mapa de sombras; a precedência do override de
  // sessão (dprSessao) fica onde está, à letra —
  perfis: {
    alta: { dpr: 2, sombraMapa: 512 },
    media: { dpr: 1.5, sombraMapa: 512 },
    baixa: { dpr: 1, sombraMapa: 256 }
  },
  // — ambiente: as tabelas do céu e da luz mudam de casa
  // sem mudar um valor (cópia por máquina dos literais) —
  ambiente: {
    base: { fundo: '#353b48', fogPerto: 130, fogLonge: 270,
            hemiCeu: '#96b4df', hemiChao: '#222632', hemiInt: 0.40,
            solCor: '#ffb16b', solInt: 1.35, solPos: [-24, 12, -18], sombraMapa: 512 },
    ancoras: [
      { hora: 3.5, exp: 0.88, hemiInt: 0.34, hemiCeu: '#5f7896', hemiChao: '#23211e', solInt: 0.5, solCor: '#cfd8e8', solPos: [-18, 27, -13.5], horizonte: '#2c3a4c', fogueira: 4.5, tochas: 7.5, chamas: 1 },
      { hora: 6.5, exp: 0.98, hemiInt: 0.52, hemiCeu: '#9db3c4', hemiChao: '#33302a', solInt: 0.82, solCor: '#f5e0c8', solPos: [24, 13, -10], horizonte: '#8fa3b5', fogueira: 3, tochas: 3.5, chamas: 0.55 },
      { hora: 12.5, exp: 1.02, hemiInt: 0.85, hemiCeu: '#bfd4e6', hemiChao: '#59544a', solInt: 1.32, solCor: '#fff2dd', solPos: [6, 34, 8], horizonte: '#a8bfd2', fogueira: 0, tochas: 0, chamas: 0 },
      { hora: 18, exp: 0.97, hemiInt: 0.5, hemiCeu: '#8d90a8', hemiChao: '#35302a', solInt: 0.98, solCor: '#f3c298', solPos: [-25, 14, 6], horizonte: '#b98a63', fogueira: 5, tochas: 6.5, chamas: 0.8 },
      { hora: 23, exp: 0.92, hemiInt: 0.4, hemiCeu: '#7d9ab8', hemiChao: '#2e2a24', solInt: 0.98, solCor: '#ffe3c0', solPos: [-18, 27, -13.5], horizonte: '#35485e', fogueira: 6, tochas: 7.5, chamas: 1 }
    ],
    ceus: [
      { paradas: [[0, '#070d16'], [0.5, '#14202f'], [0.78, '#22334a'], [1, '#2c3a4c']], claro: false },
      { paradas: [[0, '#2c4258'], [0.45, '#5d768c'], [0.75, '#87a0b4'], [1, '#8fa3b5']], claro: false },
      { paradas: [[0, '#5b97d6'], [0.5, '#8ab6e0'], [0.8, '#a5c2dc'], [1, '#a8bfd2']], claro: true },
      { paradas: [[0, '#232c4c'], [0.5, '#5c5570'], [0.78, '#96796b'], [1, '#b98a63']], claro: false },
      { paradas: [[0, '#0b1220'], [0.5, '#182636'], [0.78, '#27394c'], [0.93, '#4a4438'], [1, '#35485e']], claro: false }
    ],
    chuva: { cinzento: [0, 0.35, 0.6], molhado: [1, 0.97, 0.94], tochas: [1, 1, 0.8], gotas: [0, 1200, 3000], gotasBaixa: [0, 800, 800], opacidade: [0, 0.55, 0.85] },
    ceuPosicoes: [0, .45, .5, .75, .78, .8, .93, 1],
    ceuSolido: '#353b48',
    ceuLuaEsc: 0.75
  }
};

/* Congelamento em profundidade (mecanismo, não dado): escrever na
 * tabela falha e o valor fica intacto — a prova é P-FREEZE. */
(function congelar(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) congelar(o[k]);
  }
})(window.DADOS_APRESENTACAO);
