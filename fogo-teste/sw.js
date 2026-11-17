// Service worker do Campo de Batalha · Assimilação (tranche t-app-instalavel).
//
// Este ficheiro existe por UMA razão: um jogo instalável (app de verdade no
// celular) precisa de um service worker activo. Ele NÃO guarda nada em
// cache — nunca, de nenhum ficheiro.
//
// Porquê sem cache: o jogo actualiza-se por publicações constantes (as
// REFs) e uma cópia guardada serviria um jogo velho. Aqui cada pedido vai
// DIRECTO À REDE e a resposta é a da rede, sempre fresca. Se a rede falhar,
// o pedido falha como falharia sem service worker — nada de versões
// escondidas a fingir que está tudo bem.
//
// Sem skipWaiting nem clients.claim: uma versão nova deste ficheiro entra
// pelo ciclo normal do navegador, sem tomar páginas abertas à força.

self.addEventListener('fetch', function (evento) {
  evento.respondWith(fetch(evento.request));
});
