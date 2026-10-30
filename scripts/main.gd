extends Node2D
## ARENA DAS BESTAS — Protótipo CM-000009 (EXP-MUSE-003; v2 = EXP-MUSE-004;
## v3 = EXP-MUSE-005)
## PROTÓTIPO DE TESTE — não é o jogo oficial do RPG Assimilação.
## Gerente do jogo: estados, ondas, rank/estrelas, placar, efeitos.
## v2: camada visual refeita com sprites pintados gerados por IA
## (knight_view/shadow_view/arena_bg); sistemas e FSMs idênticos à v1.
## v3: animação fluida estilo Hades — ciclos completos dos monstros
## (rise/corrida/ataque em sequência/dissolução), anel de telegrafia,
## pós-imagem do dash; sistemas, números e mapa idênticos à v2.

const ARENA_CENTER := Vector2(640, 372)
const ARENA_RADII := Vector2(566, 306)
const RANKS := ["Bronze", "Prata", "Ouro", "Ouro Negro", "Lendário"]
const SAVE_PATH := "user://arena_cm9.cfg"

var arena_center := ARENA_CENTER
var arena_radii := ARENA_RADII

var state := "title"  # title | playing | upgrade | gameover
var player: Player
var hud: Hud
var sfx_node: Sfx
var camera: Camera2D
var fx_layer: Node2D
var entities: Node2D

var wave := 0
var score := 0
var best := 0
var combo_hits := 0
var combo_timer := 0.0
var trauma := 0.0

var _spawn_remaining := 0
var _spawn_pending := 0
var _spawn_timer := 0.0
var _spawn_kinds: Array = []
var _between_timer := 0.0
var _hitstop_seq := 0

const UPGRADES := [
	{"id": "dano", "name": "Lâmina Afiada", "desc": "+20% de dano em todos os golpes."},
	{"id": "vento", "name": "Corte do Vento+", "desc": "A técnica especial causa +50% de dano."},
	{"id": "velocidade", "name": "Passos do Cultivo", "desc": "+12% de velocidade de movimento."},
	{"id": "vida", "name": "Corpo de Ferro", "desc": "+25 de vida máxima e cura 25 agora."},
	{"id": "pa", "name": "Coração da Alma", "desc": "+50% de PA ganho ao acertar golpes."},
	{"id": "dash", "name": "Passo Fantasma", "desc": "A esquiva recarrega 25% mais rápido."},
	{"id": "alcance", "name": "Lâmina Longa", "desc": "+15% de alcance do combo."},
	{"id": "fome", "name": "Fome de Alma", "desc": "Cura 4 de vida a cada Sombra abatida."},
]

func _ready() -> void:
	randomize()
	_load_best()
	# cenário
	var bg := ArenaBg.new()
	bg.center = ARENA_CENTER
	bg.radii = ARENA_RADII
	add_child(bg)
	camera = Camera2D.new()
	camera.position = Vector2(640, 360)
	add_child(camera)
	camera.make_current()
	entities = Node2D.new()
	entities.y_sort_enabled = true  # v2: sprites se ordenam pelo pé (eixo Y)
	add_child(entities)
	fx_layer = Node2D.new()
	fx_layer.z_index = 50
	add_child(fx_layer)
	sfx_node = Sfx.new()
	add_child(sfx_node)
	# jogador
	player = Player.new()
	player.game = self
	player.global_position = ARENA_CENTER
	player.died.connect(_on_player_died)
	entities.add_child(player)
	# interface
	hud = Hud.new()
	hud.game = self
	add_child(hud)
	hud.show_title()
	hud.show_touch_if_available()
	if OS.get_cmdline_user_args().has("--auto-test"):
		_run_auto_test()

# ---------------- entrada global (mouse/teclas de tela) ----------------

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var b := event as InputEventMouseButton
		if b.button_index == MOUSE_BUTTON_LEFT and b.pressed:
			if state == "title" or state == "gameover":
				start_game()
			elif state == "playing":
				player.touch_aim = false
				player.queue_attack()
	elif event is InputEventKey:
		var k := event as InputEventKey
		if not k.pressed or k.echo:
			return
		if (state == "title" or state == "gameover") and (k.keycode == KEY_ENTER or k.keycode == KEY_KP_ENTER or k.keycode == KEY_SPACE):
			start_game()
		elif state == "gameover" and k.keycode == KEY_R:
			start_game()
		elif state == "playing" and k.keycode == KEY_J:
			player.queue_attack()

# ---------------- fluxo do jogo ----------------

func start_game() -> void:
	score = 0
	wave = 0
	combo_hits = 0
	for n in get_tree().get_nodes_in_group("enemies"):
		n.queue_free()
	# restaura atributos base do jogador
	player.hp_max = 100.0
	player.damage_mult = 1.0
	player.special_mult = 1.0
	player.move_speed = 265.0
	player.pa_gain_mult = 1.0
	player.dash_cd_mult = 1.0
	player.reach_mult = 1.0
	player.heal_on_kill = 0.0
	player.global_position = ARENA_CENTER
	player.reset()
	player.active = true
	hud.hide_panels()
	state = "playing"
	sfx("upgrade")
	_start_wave(1)

func _start_wave(n: int) -> void:
	wave = n
	_spawn_kinds.clear()
	var total := 3 + 2 * n
	var brutes := 0
	if n >= 2:
		brutes = mini(total / 3, 1 + n / 3)
	for i in range(total):
		_spawn_kinds.append("bruta" if i < brutes else "rapida")
	_spawn_kinds.shuffle()
	_spawn_remaining = _spawn_kinds.size()
	_spawn_timer = 0.6
	hud.banner("ONDA %d" % n)
	if n > 1:
		hud.banner("ONDA %d — %s" % [n, rank_text(n)])

const STAR_ROMAN := ["I", "II", "III", "IV", "V"]

func rank_text(w: int) -> String:
	var idx := clampi((w - 1) / 5, 0, RANKS.size() - 1)
	var stars := (w - 1) % 5 + 1
	return "%s %s" % [RANKS[idx], STAR_ROMAN[stars - 1]]

func _process(delta: float) -> void:
	# câmera: tremor por trauma
	if trauma > 0.0:
		trauma = maxf(0.0, trauma - delta * 2.4)
		var sh := trauma * trauma * 16.0
		camera.offset = Vector2(randf_range(-sh, sh), randf_range(-sh, sh))
	else:
		camera.offset = Vector2.ZERO
	# combo
	if combo_timer > 0.0:
		combo_timer -= delta
		if combo_timer <= 0.0:
			combo_hits = 0
	if state == "playing":
		# nascimento das sombras da onda
		if _spawn_remaining > 0:
			_spawn_timer -= delta
			if _spawn_timer <= 0.0:
				_spawn_timer = 0.85
				_spawn_remaining -= 1
				_spawn_with_warning(_spawn_kinds[_spawn_remaining])
		elif _spawn_pending == 0 and _alive_enemies() == 0 and not player.dead:
			state = "upgrade"
			_between_timer = 0.0
			score += 100 * wave
			_offer_upgrades()
	# HUD
	hud.set_values(player.hp, player.hp_max, player.pa, player.pa_max,
		score, best, wave, rank_text(maxi(wave, 1)) if wave > 0 else "",
		combo_hits, player.dash_cd <= 0.0, player.pa >= Player.SPECIAL_COST)

func _alive_enemies() -> int:
	var c := 0
	for n in get_tree().get_nodes_in_group("enemies"):
		if not n.get("dead"):
			c += 1
	return c

func _spawn_with_warning(kind: String) -> void:
	_spawn_pending += 1
	var ang := randf() * TAU
	var pos := ARENA_CENTER + Vector2(cos(ang) * ARENA_RADII.x * 0.88, sin(ang) * ARENA_RADII.y * 0.88)
	var warn := FxRing.new()
	warn.setup(pos, 36.0, Color(1.0, 0.3, 0.2), 0.8)
	fx_layer.add_child(warn)
	await get_tree().create_timer(0.8).timeout
	_spawn_pending -= 1
	if state != "playing" and state != "upgrade":
		return
	_create_enemy(kind, pos)

func _create_enemy(kind: String, pos: Vector2) -> Shadow:
	var e := Shadow.new()
	e.game = self
	e.setup(kind, pos, 1.0 + float(wave - 1) * 0.12)
	e.target = player
	entities.add_child(e)
	return e

func _offer_upgrades() -> void:
	player.active = false
	var pool := UPGRADES.duplicate()
	pool.shuffle()
	hud.show_upgrades(pool.slice(0, 3), _on_upgrade_picked)
	sfx("upgrade")

func _on_upgrade_picked(id: String) -> void:
	match id:
		"dano":
			player.damage_mult *= 1.20
		"vento":
			player.special_mult *= 1.5
		"velocidade":
			player.move_speed *= 1.12
		"vida":
			player.hp_max += 25.0
			player.heal(25.0)
		"pa":
			player.pa_gain_mult *= 1.5
		"dash":
			player.dash_cd_mult *= 0.75
		"alcance":
			player.reach_mult *= 1.15
		"fome":
			player.heal_on_kill += 4.0
	hud.hide_upgrades()
	player.active = true
	state = "playing"
	_start_wave(wave + 1)

func _on_player_died() -> void:
	shake(0.6)
	await get_tree().create_timer(1.1, true, false, true).timeout
	state = "gameover"
	if score > best:
		best = score
		_save_best()
	hud.show_gameover(score, best, wave, rank_text(maxi(wave, 1)))

# ---------------- callbacks de combate ----------------

func sfx(name: String) -> void:
	sfx_node.play(name)

func shake(amount: float) -> void:
	trauma = minf(1.0, trauma + amount)

func hitstop(duration: float, scale: float) -> void:
	_hitstop_seq += 1
	var seq := _hitstop_seq
	Engine.time_scale = scale
	await get_tree().create_timer(duration, true, false, true).timeout
	if seq == _hitstop_seq:
		Engine.time_scale = 1.0

func on_player_dealt_hit(heavy: bool) -> void:
	if heavy:
		hitstop(0.09, 0.05)
		shake(0.30)
		sfx("hit3")
	else:
		hitstop(0.045, 0.08)
		shake(0.16)
		sfx("hit")

func on_enemy_hit(e: Shadow, dmg: float, heavy: bool) -> void:
	combo_hits += 1
	combo_timer = 1.2
	var dn := DamageNumber.new()
	dn.setup(e.global_position, int(round(dmg)), heavy)
	fx_layer.add_child(dn)
	_burst(e.global_position + Vector2(0, -30), Color(0.65, 0.55, 0.95), 8, 170.0)

func on_enemy_killed(e: Shadow) -> void:
	# v2: fantasma de morte — a Sombra se libera na hora (queue_free),
	# então a dissolução animada vive numa ShadowView autônoma.
	var dv := ShadowView.new()
	dv.kind = e.kind
	dv.ghost_death = true
	dv.face_angle = e.face_angle
	dv.global_position = e.global_position
	fx_layer.add_child(dv)
	score += e.score_value
	player.pa = minf(player.pa_max, player.pa + 6.0)
	if player.heal_on_kill > 0.0:
		player.heal(player.heal_on_kill)
	_burst(e.global_position + Vector2(0, -26), Color(0.55, 0.4, 0.9), 22, 260.0)
	_burst(e.global_position + Vector2(0, -26), Color(0.9, 0.85, 1.0), 8, 150.0)
	sfx("die")

func on_player_hurt() -> void:
	combo_hits = 0
	shake(0.35)
	hud.hurt_pulse()
	sfx("hurt")

func perform_special(p: Player) -> void:
	var ring := FxRing.new()
	ring.setup(p.global_position, Player.SPECIAL_RADIUS, Color(0.75, 0.92, 1.0), 0.38)
	fx_layer.add_child(ring)
	var ring2 := FxRing.new()
	ring2.setup(p.global_position, Player.SPECIAL_RADIUS * 0.7, Color(1.0, 0.8, 0.3), 0.3)
	fx_layer.add_child(ring2)
	shake(0.38)
	hitstop(0.06, 0.1)
	sfx("special")
	var dmg := Player.SPECIAL_DMG * p.special_mult
	for n in get_tree().get_nodes_in_group("enemies"):
		var e := n as Node2D
		if e.get("dead") or e.get("state") == "spawn":
			continue
		var d := p.global_position.distance_to(e.global_position) - float(e.get("radius"))
		if d <= Player.SPECIAL_RADIUS:
			var dir := (e.global_position - p.global_position).normalized()
			e.call("take_damage", dmg, dir, true)

func spawn_ghost(p: Player) -> void:
	# v3: pós-imagem enxuta — Sprite2D com o quadro atual do dash
	# (a v2 instanciava uma KnightView inteira por fantasma)
	var img := p.view.make_afterimage()
	if img == null:
		return
	img.z_index = 9
	fx_layer.add_child(img)
	var tw := create_tween()
	tw.tween_property(img, "modulate:a", 0.0, 0.25)
	tw.tween_callback(img.queue_free)

# ---------------- efeitos ----------------

func _burst(pos: Vector2, col: Color, amount: int, speed: float) -> void:
	var cp := CPUParticles2D.new()
	cp.position = pos
	cp.z_index = 70
	cp.amount = amount
	cp.lifetime = 0.4
	cp.one_shot = true
	cp.explosiveness = 1.0
	cp.direction = Vector2(0, -1)
	cp.spread = 180.0
	cp.gravity = Vector2(0, 320)
	cp.initial_velocity_min = speed * 0.4
	cp.initial_velocity_max = speed
	cp.damping_min = 60.0
	cp.damping_max = 120.0
	cp.scale_amount_min = 2.0
	cp.scale_amount_max = 3.6
	cp.color = col
	fx_layer.add_child(cp)
	cp.emitting = true
	get_tree().create_timer(0.9).timeout.connect(cp.queue_free)

# ---------------- recorde ----------------

func _load_best() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) == OK:
		best = int(cfg.get_value("records", "best", 0))

func _save_best() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("records", "best", best)
	cfg.save(SAVE_PATH)

# ---------------- teste automatizado (headless) ----------------

func _run_auto_test() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	print("[AUTO-TEST] iniciando partida...")
	start_game()
	var e1 := _create_enemy("rapida", player.global_position + Vector2(85, 0))
	var e2 := _create_enemy("bruta", player.global_position + Vector2(-95, 10))
	e1.state = "chase"
	e1.state_t = 1.0
	e2.state = "chase"
	e2.state_t = 1.0
	await get_tree().create_timer(0.3, true, false, true).timeout
	# combo: mira e ataca repetidamente
	player.face_angle = 0.0
	for i in range(7):
		player.queue_attack()
		await get_tree().create_timer(0.42, true, false, true).timeout
	var e1_hp := e1.hp if is_instance_valid(e1) else -1.0
	print("[AUTO-TEST] sombra rápida: hp=", e1_hp, " (morreu=", not is_instance_valid(e1) or e1.dead, ")")
	# espera o combo terminar antes de testar o especial
	var guard := 0
	while player.attacking and guard < 30:
		guard += 1
		await get_tree().create_timer(0.1, true, false, true).timeout
	# especial: fixa a bruta ao lado do jogador (teste determinístico)
	if is_instance_valid(e2):
		e2.global_position = player.global_position + Vector2(-100, 0)
		e2.velocity = Vector2.ZERO
		e2.stagger = 2.0
	player.pa = 100.0
	var e2_hp_before := e2.hp if is_instance_valid(e2) else -1.0
	player.face_angle = PI
	player.try_special()
	await get_tree().create_timer(0.3, true, false, true).timeout
	var e2_hp_after := e2.hp if is_instance_valid(e2) else -1.0
	print("[AUTO-TEST] especial: bruta hp ", e2_hp_before, " -> ", e2_hp_after)
	# dash
	player.try_dash()
	await get_tree().create_timer(0.1, true, false, true).timeout
	var dash_ok := player.dash_cd > 0.0
	print("[AUTO-TEST] dash: dash_cd=", player.dash_cd, " state=", state, " wave=", wave, " score=", score)
	# fluxo de onda -> bênção -> onda 2: abate tudo até abrir a tela de técnicas
	var waited := 0.0
	while state != "upgrade" and waited < 25.0:
		player.invuln = 1.0
		player.hp = player.hp_max
		for n in get_tree().get_nodes_in_group("enemies"):
			if not n.get("dead") and n.get("state") != "spawn":
				n.call("take_damage", 999.0, Vector2.RIGHT, true)
		await get_tree().create_timer(0.25, true, false, true).timeout
		waited += 0.25
	var up_ok := state == "upgrade"
	print("[AUTO-TEST] tela de técnicas: state=", state, " após ", waited, "s")
	if up_ok:
		_on_upgrade_picked("dano")
		up_ok = state == "playing" and wave == 2 and player.damage_mult > 1.0
		print("[AUTO-TEST] pós-bênção: state=", state, " wave=", wave, " dano_mult=", player.damage_mult)
	var ok := (e1_hp < 30.0) and (e2_hp_after < e2_hp_before or e2_hp_after == -1.0) and dash_ok and up_ok
	print("[AUTO-TEST] RESULTADO: ", "OK" if ok else "FALHOU")
	get_tree().quit(0 if ok else 1)
