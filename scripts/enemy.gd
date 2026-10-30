class_name Shadow
extends CharacterBody2D
## "Sombra" — inimigo com FSM: nascer -> perseguir -> telegrafar ->
## atacar (avanço) -> recuperar. Dois tipos: rápida e bruta.

signal died(shadow: Shadow)

var kind := "rapida"
var game: Node = null
var view: ShadowView

var hp := 30.0
var hp_max := 30.0
var speed := 175.0
var damage := 8.0
var radius := 20.0
var score_value := 50

var state := "spawn"
var state_t := 0.0
var dead := false
var face_angle := 0.0
var wobble := 0.0
var hurt_flash := 0.0
var stagger := 0.0
var lunge_dir := Vector2.RIGHT
var lunge_hit_done := false
var target: Node2D = null

func setup(p_kind: String, pos: Vector2, hp_mult: float) -> void:
	kind = p_kind
	global_position = pos
	if kind == "bruta":
		hp_max = 95.0
		speed = 98.0
		damage = 16.0
		radius = 30.0
		score_value = 120
	else:
		hp_max = 30.0
		speed = 178.0
		damage = 8.0
		radius = 20.0
		score_value = 50
	hp = hp_max * hp_mult

func _ready() -> void:
	add_to_group("enemies")
	collision_layer = 4
	collision_mask = 0
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = radius
	shape.shape = circle
	add_child(shape)
	view = ShadowView.new()
	view.kind = kind
	add_child(view)
	z_index = 0  # v2: quem ordena é o y-sort do nó `entities` (Main)
	wobble = randf() * 10.0

func _telegraph_time() -> float:
	return 0.55 if kind == "bruta" else 0.42

func _attack_range() -> float:
	return 120.0 if kind == "bruta" else 105.0

func take_damage(dmg: float, dir: Vector2, heavy: bool) -> void:
	if dead or state == "spawn":
		return
	hp -= dmg
	hurt_flash = 1.0
	stagger = 0.28 if heavy else 0.16
	velocity += dir * (300.0 if heavy else 170.0)
	if game and game.has_method("on_enemy_hit"):
		game.on_enemy_hit(self, dmg, heavy)
	if hp <= 0.0:
		dead = true
		state = "dead"
		if game and game.has_method("on_enemy_killed"):
			game.on_enemy_killed(self)
		emit_signal("died", self)
		queue_free()

func _physics_process(delta: float) -> void:
	if dead:
		return
	wobble += delta * 3.0
	hurt_flash = maxf(0.0, hurt_flash - delta * 6.0)
	if game and game.get("state") != "playing":
		velocity = velocity.move_toward(Vector2.ZERO, 800.0 * delta)
		move_and_slide()
		_sync_view()
		return
	state_t += delta
	var p := target
	if p == null or not is_instance_valid(p):
		_sync_view()
		return
	var to_p: Vector2 = p.global_position - global_position
	var dist := to_p.length()
	face_angle = to_p.angle()

	if stagger > 0.0:
		stagger -= delta
		velocity = velocity.move_toward(Vector2.ZERO, 1500.0 * delta)
		move_and_slide()
		_sync_view()
		return

	match state:
		"spawn":
			velocity = Vector2.ZERO
			if state_t >= 0.5:
				state = "chase"
				state_t = 0.0
		"chase":
			var desired := to_p.normalized() * speed
			# separação simples entre sombras
			for n in get_tree().get_nodes_in_group("enemies"):
				if n == self:
					continue
				var o := n as Node2D
				var d := global_position.distance_to(o.global_position)
				var min_d := radius + float(o.get("radius")) + 6.0
				if d > 0.01 and d < min_d:
					desired += (global_position - o.global_position).normalized() * 90.0
			velocity = velocity.move_toward(desired, 900.0 * delta)
			if dist < _attack_range() and state_t > 0.35:
				state = "telegraph"
				state_t = 0.0
		"telegraph":
			velocity = velocity.move_toward(Vector2.ZERO, 1200.0 * delta)
			if state_t >= _telegraph_time():
				state = "attack"
				state_t = 0.0
				lunge_dir = to_p.normalized()
				lunge_hit_done = false
		"attack":
			var lunge_speed := 560.0 if kind == "bruta" else 640.0
			velocity = lunge_dir * lunge_speed
			if not lunge_hit_done and dist < radius + 26.0:
				lunge_hit_done = true
				if p.has_method("take_damage"):
					p.call("take_damage", damage, global_position)
			if state_t >= 0.22:
				state = "recover"
				state_t = 0.0
		"recover":
			velocity = velocity.move_toward(Vector2.ZERO, 1100.0 * delta)
			var rec := 0.85 if kind == "bruta" else 0.65
			if state_t >= rec:
				state = "chase"
				state_t = 0.0
	move_and_slide()
	_clamp_to_arena()
	_sync_view()

func _clamp_to_arena() -> void:
	if game == null:
		return
	var c: Vector2 = game.get("arena_center")
	var r: Vector2 = game.get("arena_radii")
	var rel := (global_position - c) / r
	if rel.length() > 0.97:
		global_position = c + rel.normalized() * 0.97 * r

func _sync_view() -> void:
	view.state_name = state  # v2: a view de sprites lê a FSM real
	view.face_angle = face_angle
	view.wobble = wobble
	view.hurt_flash = hurt_flash
	view.spawn_alpha = clampf(state_t / 0.5, 0.0, 1.0) if state == "spawn" else 1.0
	view.telegraph = clampf(state_t / _telegraph_time(), 0.0, 1.0) if state == "telegraph" else 0.0
	var sc := clampf(state_t / 0.5, 0.2, 1.0) if state == "spawn" else 1.0
	view.scale = Vector2.ONE * sc
