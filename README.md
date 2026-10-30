# ARENA DAS BESTAS — Protótipo CM-000009 (EXP-MUSE-003 · v2 = EXP-MUSE-004)

**PROTÓTIPO DE TESTE — NÃO é o jogo oficial do RPG Assimilação.**
Arena de combate 2.5D em Godot 4.7.2, criada pelo Comestre Muse 1 (CM-000009)
em 30/10/2026 por ordem do Mestre. Usa apenas sistemas genéricos inspirados
no Assimilação (PA, ranks, ondas) — nenhum personagem da Party, nenhum dado
confidencial.

## v2 — arte e animação refeitas (EXP-MUSE-004)

A v1 desenhava tudo por código (`_draw`) e o Mestre reprovou o visual
("muito falso e com pouca qualidade"). A v2 troca a camada visual inteira
por **sprites pintados gerados por IA de imagem**, com animações de verdade,
mantendo TODOS os sistemas, FSMs e o auto-teste da v1:

- **Folhas geradas** em `assets-src/` (fundo chroma #00FF00): cavaleiro
  idle (4) / corrida (5) / combo (7 poses) / dash+ferido+morte (5);
  sombra rápida andar (4) + investida (2); sombra bruta andar (4) +
  esmagamento (2); arena pintada 16:9.
- **Processamento** reproduzível: `tools/process_sprites.py` (Python + PIL +
  scipy) — chroma-key por distância de cor com despill, fatiamento por
  componentes (descarta vazamento dos quadros vizinhos), normalização por
  personagem com escala única e alinhamento pelo ponto dos pés; a arena é
  deformada para a elipse do anel de runas coincidir com a elipse de
  gameplay (centro 640,372 · raios 566,306). Saída em `assets/` +
  `assets/manifest.json`.
- **Integração:** `knight_view.gd` / `shadow_view.gd` reescritos sobre
  `AnimatedSprite2D + SpriteFrames` (mesma interface pública da v1). Os
  quadros do golpe são DIRIGIDOS pela FSM real (`atk_phase` nas faixas de
  25%/62% das durações de `Player.SWINGS`): antecipação → corte →
  recuperação. Combo montado das 7 poses: 1 = [0,1,4], 2 = [2,3,4],
  3 = [2,5,6]. Sombras leem a FSM (`state_name`): andar / telegrafia
  (pose de preparo + pulso vermelho + inchaço) / investida / recuperação.
- **Suco visual:** flash quente ao acertar/apanhar (modulate), squash &
  stretch no dash e no corte, sombra elíptica suave sob cada personagem,
  poeira nos pés ao correr, núcleo de PA brilhando no peito, tochas da
  arena com brilho tremulante aditivo, **y-sort** pelo pé, e "fantasma de
  morte" que dissolve a Sombra abatida (a FSM libera o nó na hora).
- Adições cirúrgicas fora das views: `Player._sync_view` publica
  `atk_anim/atk_phase/is_dashing/speed_now`; `Shadow._sync_view` publica
  `state_name`; `Main` liga o y-sort e cria o fantasma de morte. Nenhuma
  regra de gameplay mudou.

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

- `project.godot`, `scenes/main.tscn`, `scripts/` (GDScript).
- `assets/` — sprites finais processados + `manifest.json` (canvas/pés).
- `assets-src/` — folhas brutas geradas por IA (fora do export).
- `tools/process_sprites.py` — pipeline de sprites reproduzível.
- Rodar no editor: abrir a pasta no Godot 4.7.2.
- Auto-teste headless de gameplay:
  `godot --headless --path . -- --auto-test` (esperado: `RESULTADO: OK`).
- Export Web: preset "Web" com `exclude_filter` para arte-fonte/capturas
  (`.pck` ≈ 2 MB; total ≈ 41,5 MB com o wasm).
- `capturas/` — screenshots da validação (sessões ao vivo no Chromium +
  estúdio determinístico com tempo congelado: fases dos 3 golpes,
  telegrafia, investida, especial, morte, toque).
