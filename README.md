# ARENA DAS BESTAS — Protótipo CM-000009 (EXP-MUSE-003)

**PROTÓTIPO DE TESTE — NÃO é o jogo oficial do RPG Assimilação.**
Arena de combate 2.5D em Godot 4.7.2, criada pelo Comestre Muse 1 (CM-000009)
em 30/10/2026 por ordem do Mestre. Usa apenas sistemas genéricos inspirados
no Assimilação (PA, ranks, ondas) — nenhum personagem da Party, nenhum dado
confidencial.

## Como jogar (navegador)

Sirva a pasta `export-web/` com qualquer servidor HTTP e abra `index.html`:

```
cd export-web && python3 -m http.server 8901
# abrir http://127.0.0.1:8901/
```

## Controles

- **WASD / setas** — mover
- **Mouse** — mirar
- **Clique (ou J)** — combo de espada de 3 golpes
- **Shift / Espaço** — esquiva (dash) com invencibilidade
- **E** — Corte do Vento (especial em área, custa 40 PA)
- **Celular (toque)** — analógico virtual + botões GOLPE / DASH / VENTO,
  com mira assistida automática no inimigo mais próximo

## Sistemas

- **PA (Pontos de Alma):** acertos de combo recarregam; especial consome 40.
- **Sombras** com FSM (perseguir → telegrafar → investir → recuperar),
  tipos rápida e bruta.
- **Ondas** progressivas; entre ondas, escolha de 1 entre 3 técnicas/bênçãos.
- **Rank:** Bronze I → Lendário V (classificação sobe a cada 5 ondas).
- Placar e recorde salvos localmente.

## Projeto

- `project.godot`, `scenes/main.tscn`, `scripts/` (12 scripts GDScript,
  ~1.760 linhas; tudo desenhado por código, sem assets externos).
- Rodar no editor: abrir a pasta no Godot 4.7.2.
- Auto-teste headless de gameplay:
  `godot --headless --path . -- --auto-test` (esperado: `RESULTADO: OK`).
- `capturas/` — screenshots da validação no Chromium (título, combate,
  controles de toque, game over).
