class_name ShadowView
extends Node2D
## v3 (EXP-MUSE-005) — Sombras com ANIMAÇÃO FLUIDA estilo Hades:
## ciclos completos gerados por IA e processados por
## tools/process_sprites_v3.py — surgir do chão (rise), corrida/andar
## (6 quadros), ataque em SEQUÊNCIA de 6 poses dirigido pela FSM
## (telegrafia -> investida/esmagamento -> recuperação), ferido e
## dissolução de morte. Extras de código: ANEL DE TELEGRAFIA no chão
## que se fecha conforme o golpe se aproxima e inclinação do corpo
## conforme a velocidade.
##
## Interface (escrita por Shadow._sync_view): kind, face_angle,
## telegraph, hurt_flash, spawn_alpha, wobble, state_name,
## state_progress (0..1 dentro do estado atual), speed_now.
## ghost_death: view autônoma de morte criada pelo Main (a Sombra real
## se libera na hora) — toca a dissolução e se apaga sozinha.
## Origem do nó = ponto dos "pés" (base do manto).

var kind: String = "rapida"
var face_angle: float = 0.0
var telegraph: float = 0.0    # 0..1 — preparação do ataque
var hurt_flash: float = 0.0
var spawn_alpha: float = 0.0  # 0..1 ao nascer
var wobble: float = 0.0       # fase de oscilação (definida pelo inimigo)
var state_name: String = "spawn"
var state_progress: float = 0.0
var speed_now: float = 0.0
var ghost_death: bool = false

const DATA := {
	"rapida": {"prefix": "rapida", "canvas": Vector2(157, 206),
		"feet": Vector2(78, 176), "scale": 0.60, "shadow": Vector2(48, 13),
		"walk_fps": 13.0, "ref_speed": 178.0, "ring_r": 48.0},
	"bruta": {"prefix": "bruta", "canvas": Vector2(287, 365),
		"feet": Vector2(143, 335), "scale": 0.62, "shadow": Vector2(78, 19),
		"walk_fps": 9.0, "ref_speed": 98.0, "ring_r": 68.0},
}

var _spr: AnimatedSprite2D
var _shadow: Sprite2D
var _base_scale := 0.6
var _cur_anim := ""
var _ghost_t := -1.0
var _ring_was := false

func _ready() -> void:
	var d: Dictionary = DATA.get(kind, DATA["rapida"])
	_base_scale = float(d["scale"])
	# sombra suave no chão
	_shadow = Sprite2D.new()
	_shadow.texture = KnightView.radial_texture()
	_shadow.modulate = Color(0, 0, 0, 0.40)
	var sh: Vector2 = d["shadow"]
	_shadow.scale = Vector2(sh.x / 128.0, sh.y / 128.0)
	_shadow.position = Vector2(0, 2)
	add_child(_shadow)
	# sprite animado, origem na base do manto
	_spr = AnimatedSprite2D.new()
	_spr.sprite_frames = _build_frames(str(d["prefix"]), float(d["walk_fps"]))
	var canvas: Vector2 = d["canvas"]
	var feet: Vector2 = d["feet"]
	_spr.offset = Vector2(canvas.x * 0.5 - feet.x, canvas.y * 0.5 - feet.y)
	_spr.scale = Vector2.ONE * _base_scale
	add_child(_spr)
	if ghost_death:
		_ghost_t = 0.0
		_spr.play("dissolve")
	else:
		_spr.play("rise")
		_cur_anim = "rise"

func _tex(file: String) -> Texture2D:
	return load("res://assets/" + file) as Texture2D

func _add(sf: SpriteFrames, anim: String, files: Array, fps: float, loop: bool) -> void:
	sf.add_animation(anim)
	sf.set_animation_speed(anim, fps)
	sf.set_animation_loop(anim, loop)
	for f in files:
		sf.add_frame(anim, _tex(f))

func _build_frames(prefix: String, walk_fps: float) -> SpriteFrames:
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	# surgir do chão (dirigido pela FSM durante o estado spawn)
	_add(sf, "rise", ["%s_rise_0.png" % prefix, "%s_rise_1.png" % prefix,
		"%s_rise_2.png" % prefix, "%s_rise_3.png" % prefix], 8.0, false)
	# locomoção: rápida corre (folha "run"), bruta anda (folha "walk")
	var move_pref := "run" if prefix == "rapida" else "walk"
	var move_files: Array = []
	for i in range(6):
		move_files.append("%s_%s_%d.png" % [prefix, move_pref, i])
	_add(sf, "walk", move_files, walk_fps, true)
	# ataque em sequência (6 poses dirigidas pela FSM)
	var atk_files: Array = []
	for i in range(6):
		atk_files.append("%s_attack_%d.png" % [prefix, i])
	_add(sf, "attack", atk_files, 8.0, false)
	# ferido: bruta tem poses próprias; a rápida usa as poses de recuo
	# do ataque (a folha misc dela não pôde ser gerada — ver relatório)
	if prefix == "bruta":
		_add(sf, "hurt", ["bruta_hurt_0.png", "bruta_hurt_1.png"], 10.0, false)
	else:
		_add(sf, "hurt", ["rapida_attack_4.png", "rapida_attack_5.png"], 10.0, false)
	# dissolução: bruta tem folha própria; a rápida "afunda" de volta —
	# rise ao contrário + desvanecer (procedural, ver _process do fantasma)
	if prefix == "bruta":
		_add(sf, "dissolve", ["bruta_dissolve_0.png", "bruta_dissolve_1.png",
			"bruta_dissolve_2.png", "bruta_dissolve_3.png"], 7.0, false)
	else:
		_add(sf, "dissolve", ["rapida_rise_3.png", "rapida_rise_2.png",
			"rapida_rise_1.png", "rapida_rise_0.png"], 7.0, false)
	return sf

# anel de telegrafia no chão (FX por código): círculo-alvo da zona de
# perigo + anel externo que SE FECHA sobre ele conforme o golpe chega
func _draw() -> void:
	if ghost_death or telegraph <= 0.0:
		return
	var d: Dictionary = DATA.get(kind, DATA["rapida"])
	var r0 := float(d["ring_r"])
	var t := clampf(telegraph, 0.0, 1.0)
	var col := Color(1.0, 0.25, 0.15)
	# zona de perigo: contorno + preenchimento que intensifica
	draw_arc(Vector2.ZERO, r0, 0.0, TAU, 48, Color(col, 0.35 + 0.3 * t), 2.5)
	draw_circle(Vector2.ZERO, r0, Color(col, 0.05 + 0.10 * t))
	# anel que se fecha: raio encolhe de 1.6*r0 até r0
	var rr := r0 * lerpf(1.6, 1.0, t)
	draw_arc(Vector2.ZERO, rr, 0.0, TAU, 48, Color(col, 0.55 + 0.4 * t), 3.5)
	# marcador na direção do golpe
	var dir := Vector2.from_angle(face_angle)
	draw_line(dir * (r0 * 0.55), dir * (r0 * 0.95), Color(col, 0.5 * t + 0.2), 3.0)

func _process(delta: float) -> void:
	if _spr == null:
		return
	# fantasma de morte: dissolução + desvanecer + leve afundar/subir
	if _ghost_t >= 0.0:
		_ghost_t += delta
		var t := clampf(_ghost_t / 0.6, 0.0, 1.0)
		_spr.modulate = Color(1.5, 1.15, 1.9, (1.0 - t) * 0.95)
		_spr.scale = Vector2.ONE * _base_scale * (1.0 + 0.18 * t)
		_spr.position.y = -6.0 * t if kind == "bruta" else 3.0 * t
		_shadow.modulate = Color(0, 0, 0, 0.40 * (1.0 - t))
		if t >= 1.0:
			queue_free()
		return
	_spr.flip_h = cos(face_angle) < 0.0
	# flutuação espectral (a Sombra não pisa — paira)
	_spr.position.y = -1.5 + sin(wobble * 2.0) * 2.2
	# inclinação sutil conforme a velocidade (peso/momentum)
	var lean := clampf(speed_now / 300.0, 0.0, 1.0) * 0.05
	_spr.rotation = -lean if _spr.flip_h else lean
	# --- máquina de animação casada à FSM ---
	var want := "walk"
	var drive := -1
	match state_name:
		"spawn":
			want = "rise"
			drive = mini(3, int(state_progress * 4.0))
		"telegraph":
			want = "attack"
			drive = 0 if state_progress < 0.55 else 1
		"attack":
			want = "attack"
			drive = 2 if state_progress < 0.5 else 3
		"recover":
			# começa no impacto (3) e volta à guarda (5); ferido tem prioridade
			if hurt_flash > 0.12:
				want = "hurt"
				drive = 0 if hurt_flash > 0.5 else 1
			else:
				want = "attack"
				drive = 3 if state_progress < 0.25 else (4 if state_progress < 0.65 else 5)
		_:  # chase e demais
			if hurt_flash > 0.12:
				want = "hurt"
				drive = 0 if hurt_flash > 0.5 else 1
			else:
				want = "walk"
	if want != _cur_anim:
		_cur_anim = want
		_spr.play(want)
	if drive >= 0:
		_spr.pause()
		_spr.frame = drive
	elif want == "walk":
		var d: Dictionary = DATA.get(kind, DATA["rapida"])
		_spr.speed_scale = clampf(speed_now / float(d["ref_speed"]), 0.45, 1.7)
		if not _spr.is_playing():
			_spr.play(want)
	# anel de telegrafia: redesenha enquanto prepara (e limpa ao sair)
	if telegraph > 0.0:
		_ring_was = true
		queue_redraw()
	elif _ring_was:
		_ring_was = false
		queue_redraw()
	# cor: flash branco ao apanhar; pulso vermelho na telegrafia
	var pulse := 0.55 + 0.45 * sin(Time.get_ticks_msec() * 0.03)
	var r := 1.0 + 2.2 * hurt_flash + 0.9 * telegraph * pulse
	var g := 1.0 + 2.2 * hurt_flash - 0.45 * telegraph * pulse
	var b := 1.0 + 2.2 * hurt_flash - 0.45 * telegraph * pulse
	_spr.modulate = Color(r, g, b, clampf(spawn_alpha, 0.0, 1.0))
	_shadow.modulate = Color(0, 0, 0, 0.40 * clampf(spawn_alpha, 0.0, 1.0))
	# inchaço sutil ao telegrafar (antecipação)
	var swell := 1.0 + 0.07 * telegraph
	_spr.scale = Vector2.ONE * _base_scale * swell
