class_name KnightView
extends Node2D
## v2 (EXP-MUSE-004) — Cavaleiro com SPRITES PINTADOS gerados por IA.
## AnimatedSprite2D + SpriteFrames montados em código a partir de
## assets/knight_*.png (folhas geradas por IA, processadas por
## tools/process_sprites.py: chroma-key, fatiamento, pés alinhados).
##
## A interface pública é a MESMA da v1 (o Player escreve nestas vars todo
## physics frame): sword_angle/smear_* viraram legado — a espada e o arco
## do golpe vivem na arte. Os campos novos (atk_anim, atk_phase,
## is_dashing, speed_now) são escritos por Player._sync_view para casar
## os quadros com a FSM real do golpe (fases 25% / 62% das durações de
## Player.SWINGS). Origem do nó = ponto dos pés.

var face_angle: float = 0.0        # direção do olhar/mira
var walk_phase: float = 0.0        # legado v1 (a corrida usa speed_now)
var moving: bool = false
var sword_angle: float = -0.5      # legado v1 (não usado no desenho)
var smear_from: float = 0.0        # legado v1
var smear_to: float = 0.0          # legado v1
var smear_alpha: float = 0.0       # legado v1
var hurt_flash: float = 0.0
var invuln_blink: bool = false
var core_color: Color = Color(0.65, 0.9, 1.0)
var dead: bool = false
# --- sincronização nova (Player._sync_view) ---
var atk_anim: String = ""          # "", "attack1", "attack2", "attack3"
var atk_phase: float = 0.0         # 0..1 dentro do golpe
var is_dashing: bool = false
var speed_now: float = 0.0

const DISPLAY_SCALE := 0.62
const CANVAS := Vector2(145, 200)  # = assets/manifest.json v3 (knight)
const FEET := Vector2(72, 170)

var _spr: AnimatedSprite2D
var _glow: Sprite2D
var _dust: CPUParticles2D
var _cur_anim := ""

static var _radial: Texture2D = null

static func radial_texture() -> Texture2D:
	if _radial != null:
		return _radial
	var img := Image.create(128, 128, false, Image.FORMAT_RGBA8)
	for y in range(128):
		for x in range(128):
			var d := Vector2(x - 64, y - 64).length() / 64.0
			var a := clampf(1.0 - d, 0.0, 1.0)
			img.set_pixel(x, y, Color(1, 1, 1, a * a))
	_radial = ImageTexture.create_from_image(img)
	return _radial

func _ready() -> void:
	# sombra suave elíptica no chão (não vira com o flip)
	var shadow := Sprite2D.new()
	shadow.texture = radial_texture()
	shadow.modulate = Color(0, 0, 0, 0.38)
	shadow.scale = Vector2(0.46, 0.125)
	shadow.position = Vector2(0, 2)
	add_child(shadow)
	# sprite animado, origem nos pés
	_spr = AnimatedSprite2D.new()
	_spr.sprite_frames = _build_frames()
	_spr.offset = Vector2(CANVAS.x * 0.5 - FEET.x, CANVAS.y * 0.5 - FEET.y)
	_spr.scale = Vector2.ONE * DISPLAY_SCALE
	_spr.play("idle")
	add_child(_spr)
	_cur_anim = "idle"
	# núcleo de PA brilhando no peito (leitura do recurso, como na v1)
	_glow = Sprite2D.new()
	_glow.texture = radial_texture()
	var gm := CanvasItemMaterial.new()
	gm.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	_glow.material = gm
	_glow.scale = Vector2(0.17, 0.17)
	add_child(_glow)
	# poeira dos pés ao correr (mundo, não segue o cavaleiro)
	_dust = CPUParticles2D.new()
	_dust.amount = 12
	_dust.lifetime = 0.5
	_dust.local_coords = false
	_dust.emission_shape = CPUParticles2D.EMISSION_SHAPE_SPHERE
	_dust.emission_sphere_radius = 7.0
	_dust.direction = Vector2(0, -1)
	_dust.spread = 70.0
	_dust.gravity = Vector2(0, -26)
	_dust.initial_velocity_min = 18.0
	_dust.initial_velocity_max = 46.0
	_dust.scale_amount_min = 2.2
	_dust.scale_amount_max = 4.2
	_dust.color = Color(0.52, 0.43, 0.30, 0.30)
	_dust.emitting = false
	add_child(_dust)

func _tex(file: String) -> Texture2D:
	return load("res://assets/" + file) as Texture2D

func _add(sf: SpriteFrames, anim: String, files: Array, fps: float, loop: bool) -> void:
	sf.add_animation(anim)
	sf.set_animation_speed(anim, fps)
	sf.set_animation_loop(anim, loop)
	for f in files:
		sf.add_frame(anim, _tex(f))

func _build_frames() -> SpriteFrames:
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	_add(sf, "idle", ["knight_idle_0.png", "knight_idle_1.png",
		"knight_idle_2.png", "knight_idle_3.png"], 5.0, true)
	# v3: corrida nova de 6 quadros (folha knight-run8; a geração
	# entregou 6 poses aproveitáveis das 8 pedidas)
	_add(sf, "run", ["knight_run_0.png", "knight_run_1.png", "knight_run_2.png",
		"knight_run_3.png", "knight_run_4.png", "knight_run_5.png"], 13.0, true)
	# v3: combo expandido — folha nova de 8 poses (0..7) mapeadas em
	# 4 quadros por golpe: antecipação / corte / rastro / recuperação
	# (o quadro é escolhido pela FASE do golpe em _process).
	# poses: 0 preparo, 1 corte c/ rastro fino, 2 guarda pronta,
	#        3 lâminas cruzadas, 4 corpo assentado c/ arco residual,
	#        5 corte reverso c/ arco azul, 6 finalizador aéreo, 7 postura final
	_add(sf, "attack1", ["knight_combo_0.png", "knight_combo_1.png",
		"knight_combo_1.png", "knight_combo_4.png"], 10.0, false)
	_add(sf, "attack2", ["knight_combo_3.png", "knight_combo_5.png",
		"knight_combo_5.png", "knight_combo_2.png"], 10.0, false)
	_add(sf, "attack3", ["knight_combo_2.png", "knight_combo_6.png",
		"knight_combo_6.png", "knight_combo_7.png"], 7.2, false)
	_add(sf, "dash", ["knight_dash_0.png", "knight_dash_1.png"], 12.0, false)
	_add(sf, "hurt", ["knight_hurt_0.png"], 1.0, false)
	_add(sf, "death", ["knight_death_0.png", "knight_death_1.png"], 2.2, false)
	return sf

func _process(_delta: float) -> void:
	if _spr == null:
		return
	var flip := cos(face_angle) < 0.0
	_spr.flip_h = flip
	# prioridade: morte > dash > ataque > ferido > corrida > idle
	var want := "idle"
	var drive := -1
	if dead:
		want = "death"
	elif is_dashing:
		want = "dash"
	elif atk_anim != "":
		want = atk_anim
		# v3: 4 quadros por golpe — antecipação / corte / rastro / recuperação
		drive = 0 if atk_phase < 0.25 else (1 if atk_phase < 0.45 else (2 if atk_phase < 0.62 else 3))
	elif hurt_flash > 0.5:
		want = "hurt"
	elif moving:
		want = "run"
	if want != _cur_anim:
		_cur_anim = want
		_spr.play(want)
	if drive >= 0:
		_spr.pause()
		_spr.frame = drive
	elif want == "run":
		_spr.speed_scale = clampf(speed_now / 265.0, 0.6, 1.5)
		if not _spr.is_playing():
			_spr.play(want)
	elif want != "death":
		_spr.speed_scale = 1.0
		if not _spr.is_playing():
			_spr.play(want)
	# squash & stretch: dash alonga; o corte "assenta" o corpo
	var ts := Vector2.ONE * DISPLAY_SCALE
	if is_dashing:
		ts = Vector2(DISPLAY_SCALE * 1.10, DISPLAY_SCALE * 0.93)
	elif drive == 1:
		ts = Vector2(DISPLAY_SCALE * 1.05, DISPLAY_SCALE * 0.96)
	_spr.scale = ts
	# flash de dano (vermelho quente) + piscar de invulnerabilidade
	var a := 1.0
	if invuln_blink and int(Time.get_ticks_msec() / 70) % 2 == 0:
		a = 0.45
	var hf := 0.0 if dead else hurt_flash
	_spr.modulate = Color(1.0 + 1.5 * hf, 1.0 - 0.5 * hf, 1.0 - 0.5 * hf, a)
	# núcleo de PA: posição no peito, lado conforme a mira
	_glow.position = Vector2(-10.0 if flip else 10.0, -56.0)
	var pulse := 0.42 + 0.20 * sin(Time.get_ticks_msec() * 0.006)
	_glow.modulate = Color(core_color, 0.0 if dead else pulse)
	# poeira ao correr
	_dust.emitting = moving and not dead and not is_dashing

## v3 — pós-imagem do dash (assinatura estilo Hades): um Sprite2D leve
## com o quadro ATUAL do cavaleiro (pose do dash, não a view inteira),
## tingido de ciano; o Main desvanece e libera.
func make_afterimage() -> Sprite2D:
	if _spr == null or _spr.sprite_frames == null:
		return null
	var tex := _spr.sprite_frames.get_frame_texture(_spr.animation, _spr.frame)
	if tex == null:
		return null
	var img := Sprite2D.new()
	img.texture = tex
	img.offset = _spr.offset
	img.scale = _spr.scale
	img.flip_h = _spr.flip_h
	img.position = global_position
	img.modulate = Color(0.55, 0.85, 1.0, 0.45)
	return img
