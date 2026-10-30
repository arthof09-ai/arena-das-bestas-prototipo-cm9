class_name Player
extends CharacterBody2D
## Cavaleiro cultivador jogável: movimento 360°, combo de 3 golpes,
## dash com i-frames, PA (Pontos de Alma) e técnica especial.
## A lógica de ondas/placar mora no Main (referência `game`).

signal died

const SWINGS := [
	{"dmg": 10.0, "dur": 0.30, "range": 108.0, "from": -2.0, "to": 0.9},
	{"dmg": 12.0, "dur": 0.30, "range": 108.0, "from": 2.0, "to": -0.9},
	{"dmg": 18.0, "dur": 0.42, "range": 122.0, "from": -2.6, "to": 0.5},
]
const SPECIAL_COST := 40.0
const SPECIAL_DMG := 30.0
const SPECIAL_RADIUS := 175.0

var game: Node = null            # Main
var view: KnightView
var active := false              # só age durante a partida
var hp := 100.0
var hp_max := 100.0
var pa := 0.0
var pa_max := 100.0
var move_speed := 265.0
var damage_mult := 1.0
var reach_mult := 1.0
var pa_gain_mult := 1.0
var dash_cd_mult := 1.0
var special_mult := 1.0
var heal_on_kill := 0.0

var face_angle := 0.0
var walk_phase := 0.0
var moving := false

var combo_index := 0
var attacking := false
var atk_t := 0.0
var atk_hit_done := false
var atk_buffered := false
var combo_window := 0.0

var dashing := 0.0
var dash_dir := Vector2.RIGHT
var dash_cd := 0.0
var ghost_t := 0.0
var invuln := 0.0
var hurt_flash := 0.0
var dead := false

var touch_move := Vector2.ZERO   # preenchido pelo HUD (joystick)
var touch_aim := false           # true quando jogando por toque

func _ready() -> void:
	add_to_group("player")
	collision_layer = 2
	collision_mask = 0
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 16.0
	shape.shape = circle
	add_child(shape)
	view = KnightView.new()
	add_child(view)
	z_index = 0  # v2: quem ordena é o y-sort do nó `entities` (Main)

func reset() -> void:
	hp = hp_max
	pa = 0.0
	dead = false
	attacking = false
	combo_index = 0
	dashing = 0.0
	dash_cd = 0.0
	invuln = 0.0
	velocity = Vector2.ZERO
	view.dead = false
	modulate.a = 1.0

# ---------------- entrada ----------------

func input_vector() -> Vector2:
	var v := Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT):
		v.x -= 1.0
	if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT):
		v.x += 1.0
	if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP):
		v.y -= 1.0
	if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN):
		v.y += 1.0
	if v == Vector2.ZERO and touch_move.length() > 0.12:
		v = touch_move
	return v.limit_length(1.0)

func aim_angle() -> float:
	if touch_aim:
		var e := nearest_enemy(560.0)
		if e:
			return (e.global_position - global_position).angle()
		var iv := input_vector()
		if iv.length() > 0.1:
			return iv.angle()
		return face_angle
	return (get_global_mouse_position() - global_position).angle()

func nearest_enemy(max_dist: float) -> Node2D:
	var best: Node2D = null
	var bd := max_dist
	for n in get_tree().get_nodes_in_group("enemies"):
		var e := n as Node2D
		if e.get("dead") or e.get("state") == "spawn":
			continue
		var d := global_position.distance_to(e.global_position)
		if d < bd:
			bd = d
			best = e
	return best

func queue_attack() -> void:
	if not active or dead:
		return
	if dashing > 0.0:
		return
	if attacking:
		atk_buffered = true
		return
	_start_attack(combo_index)

func try_dash() -> void:
	if not active or dead or dash_cd > 0.0 or dashing > 0.0:
		return
	var iv := input_vector()
	dash_dir = iv if iv.length() > 0.1 else Vector2.from_angle(face_angle)
	dashing = 0.18
	dash_cd = 1.15 * dash_cd_mult
	invuln = maxf(invuln, 0.30)
	ghost_t = 0.0
	if game and game.has_method("sfx"):
		game.sfx("dash")

func try_special() -> void:
	if not active or dead or attacking or dashing > 0.0:
		return
	if pa < SPECIAL_COST:
		return
	pa -= SPECIAL_COST
	if game and game.has_method("perform_special"):
		game.perform_special(self)

# ---------------- combate ----------------

func _start_attack(idx: int) -> void:
	attacking = true
	atk_t = 0.0
	atk_hit_done = false
	atk_buffered = false
	combo_index = idx
	face_angle = aim_angle()
	if game and game.has_method("sfx"):
		game.sfx("swing")

func _apply_hit() -> void:
	var sw: Dictionary = SWINGS[combo_index]
	var range_r: float = sw["range"] * reach_mult
	var dmg: float = sw["dmg"] * damage_mult
	var hits := 0
	for n in get_tree().get_nodes_in_group("enemies"):
		var e := n as Node2D
		if e.get("dead") or e.get("state") == "spawn":
			continue
		var to_e := e.global_position - global_position
		var dist := to_e.length() - float(e.get("radius"))
		if dist > range_r:
			continue
		if absf(angle_difference(face_angle, to_e.angle())) > 1.2:
			continue
		e.call("take_damage", dmg, to_e.normalized(), combo_index == 2)
		hits += 1
	if hits > 0:
		pa = minf(pa_max, pa + 8.0 * hits * pa_gain_mult)
		if game and game.has_method("on_player_dealt_hit"):
			game.on_player_dealt_hit(combo_index == 2)

func take_damage(dmg: float, from_pos: Vector2) -> bool:
	if not active or dead or invuln > 0.0 or dashing > 0.0:
		return false
	hp -= dmg
	invuln = 0.65
	hurt_flash = 1.0
	var kb := (global_position - from_pos).normalized() * 260.0
	velocity += kb
	if game and game.has_method("on_player_hurt"):
		game.on_player_hurt()
	if hp <= 0.0:
		hp = 0.0
		dead = true
		active = false
		view.dead = true
		emit_signal("died")
	return true

func heal(amount: float) -> void:
	hp = minf(hp_max, hp + amount)

# ---------------- processo ----------------

func _physics_process(delta: float) -> void:
	if dead:
		velocity = Vector2.ZERO
		return
	invuln = maxf(0.0, invuln - delta)
	dash_cd = maxf(0.0, dash_cd - delta)
	combo_window = maxf(0.0, combo_window - delta)
	if combo_window <= 0.0 and not attacking:
		combo_index = 0
	if not active:
		velocity = velocity.move_toward(Vector2.ZERO, 900.0 * delta)
		move_and_slide()
		_sync_view(delta)
		return

	# mira (fora de ataque)
	if not attacking and dashing <= 0.0:
		var target := aim_angle()
		face_angle = lerp_angle(face_angle, target, clampf(delta * 18.0, 0.0, 1.0))

	# teclas de ação (polling simples, sem InputMap)
	if Input.is_physical_key_pressed(KEY_SHIFT) or Input.is_physical_key_pressed(KEY_SPACE):
		if not _dash_key_held:
			try_dash()
		_dash_key_held = true
	else:
		_dash_key_held = false
	if Input.is_physical_key_pressed(KEY_E) or Input.is_physical_key_pressed(KEY_L):
		if not _spec_key_held:
			try_special()
		_spec_key_held = true
	else:
		_spec_key_held = false

	var iv := input_vector()

	if dashing > 0.0:
		dashing -= delta
		velocity = dash_dir * 920.0
		ghost_t -= delta
		if ghost_t <= 0.0:
			ghost_t = 0.032
			if game and game.has_method("spawn_ghost"):
				game.spawn_ghost(self)
	elif attacking:
		var sw: Dictionary = SWINGS[combo_index]
		atk_t += delta
		var dur: float = sw["dur"]
		# avanço do golpe durante a janela ativa
		if atk_t >= 0.06 and atk_t <= 0.18:
			velocity = Vector2.from_angle(face_angle) * 200.0
		else:
			velocity = velocity.move_toward(Vector2.ZERO, 1400.0 * delta)
		if not atk_hit_done and atk_t >= 0.09:
			atk_hit_done = true
			_apply_hit()
		if atk_t >= dur:
			attacking = false
			combo_window = 1.0
			if atk_buffered:
				_start_attack((combo_index + 1) % 3)
	else:
		var target_vel := iv * move_speed
		velocity = velocity.move_toward(target_vel, 2600.0 * delta)

	moving = velocity.length() > 30.0 and dashing <= 0.0
	if moving:
		walk_phase += delta * velocity.length() * 0.055
	move_and_slide()
	_clamp_to_arena()
	_sync_view(delta)

var _dash_key_held := false
var _spec_key_held := false

func _clamp_to_arena() -> void:
	if game == null:
		return
	var c: Vector2 = game.get("arena_center")
	var r: Vector2 = game.get("arena_radii")
	var rel := (global_position - c) / r
	if rel.length() > 0.96:
		global_position = c + rel.normalized() * 0.96 * r

func _sync_view(delta: float) -> void:
	hurt_flash = maxf(0.0, hurt_flash - delta * 5.0)
	view.face_angle = face_angle
	view.walk_phase = walk_phase
	view.moving = moving
	view.hurt_flash = hurt_flash
	view.invuln_blink = invuln > 0.0 and dashing <= 0.0 and not dead
	# cor do núcleo: azul (PA baixo) -> dourado (PA cheio p/ especial)
	var u := pa / pa_max
	view.core_color = Color(0.65, 0.9, 1.0).lerp(Color(1.0, 0.8, 0.3), u)
	# espada: repouso ou animação do golpe
	if attacking:
		var sw: Dictionary = SWINGS[combo_index]
		var dur: float = sw["dur"]
		var t := clampf(atk_t / dur, 0.0, 1.0)
		var from_a: float = face_angle + float(sw["from"])
		var to_a: float = face_angle + float(sw["to"])
		var s: float
		if t < 0.25:  # preparação (puxa para trás)
			s = -0.25 * sin(t / 0.25 * PI * 0.5)
			view.sword_angle = from_a + s * 0.35
			view.smear_alpha = 0.0
		elif t < 0.62:  # o corte
			var u2 := (t - 0.25) / 0.37
			u2 = 1.0 - pow(1.0 - u2, 3.0)
			view.sword_angle = lerpf(from_a, to_a, u2)
			view.smear_from = from_a
			view.smear_to = view.sword_angle
			view.smear_alpha = 1.0
		else:  # recuperação
			var u3 := (t - 0.62) / 0.38
			view.sword_angle = lerpf(to_a, face_angle - 0.5, u3 * u3)
			view.smear_alpha = maxf(0.0, 1.0 - u3 * 2.2)
	else:
		view.sword_angle = face_angle - 0.5 + sin(Time.get_ticks_msec() * 0.0016) * 0.06
		view.smear_alpha = 0.0
	# v2 (sprites): a view nova dirige os quadros do golpe pela FSM real —
	# nome da animação + fase normalizada (corta nas faixas 25%/62%).
	view.atk_anim = ("attack%d" % (combo_index + 1)) if attacking else ""
	view.atk_phase = clampf(atk_t / float(SWINGS[combo_index]["dur"]), 0.0, 1.0) if attacking else 0.0
	view.is_dashing = dashing > 0.0
	view.speed_now = velocity.length()
