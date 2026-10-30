class_name ShadowView
extends Node2D
## v2 (EXP-MUSE-004) — "Sombras" com SPRITES PINTADOS gerados por IA.
## Mesma interface da v1 (kind, face_angle, telegraph, hurt_flash,
## spawn_alpha, wobble) + dois campos novos:
##  - state_name: escrito por Shadow._sync_view (FSM real do inimigo);
##  - ghost_death: quando true, esta view é o "fantasma de morte" que o
##    Main cria em on_enemy_killed — a Sombra de verdade se libera na
##    hora (queue_free), então a animação de morte vive neste fantasma.
## Origem do nó = ponto dos "pés" (base do manto).

var kind: String = "rapida"
var face_angle: float = 0.0
var telegraph: float = 0.0    # 0..1 — preparação do ataque
var hurt_flash: float = 0.0
var spawn_alpha: float = 0.0  # 0..1 ao nascer
var wobble: float = 0.0       # fase de oscilação (definida pelo inimigo)
var state_name: String = "spawn"
var ghost_death: bool = false

const DATA := {
	"rapida": {"prefix": "rapida", "canvas": Vector2(114, 156),
		"feet": Vector2(57, 125), "scale": 0.60, "shadow": Vector2(48, 13),
		"fps": 9.0},
	"bruta": {"prefix": "bruta", "canvas": Vector2(204, 310),
		"feet": Vector2(102, 280), "scale": 0.62, "shadow": Vector2(78, 19),
		"fps": 6.5},
}

var _spr: AnimatedSprite2D
var _base_scale := 0.6
var _cur_anim := ""
var _ghost_t := -1.0

func _ready() -> void:
	var d: Dictionary = DATA.get(kind, DATA["rapida"])
	_base_scale = float(d["scale"])
	# sombra suave no chão
	var shadow := Sprite2D.new()
	shadow.texture = KnightView.radial_texture()
	shadow.modulate = Color(0, 0, 0, 0.40)
	var sh: Vector2 = d["shadow"]
	shadow.scale = Vector2(sh.x / 128.0, sh.y / 128.0)
	shadow.position = Vector2(0, 2)
	add_child(shadow)
	# sprite animado, origem na base do manto
	_spr = AnimatedSprite2D.new()
	_spr.sprite_frames = _build_frames(str(d["prefix"]), float(d["fps"]))
	var canvas: Vector2 = d["canvas"]
	var feet: Vector2 = d["feet"]
	_spr.offset = Vector2(canvas.x * 0.5 - feet.x, canvas.y * 0.5 - feet.y)
	_spr.scale = Vector2.ONE * _base_scale
	add_child(_spr)
	if ghost_death:
		_ghost_t = 0.0
		_spr.play("walk")
		_spr.frame = 1
		_spr.pause()
	else:
		_spr.play("walk")
		_cur_anim = "walk"

func _tex(file: String) -> Texture2D:
	return load("res://assets/" + file) as Texture2D

func _build_frames(prefix: String, fps: float) -> SpriteFrames:
	var sf := SpriteFrames.new()
	sf.remove_animation("default")
	sf.add_animation("walk")
	sf.set_animation_speed("walk", fps)
	sf.set_animation_loop("walk", true)
	for i in range(4):
		sf.add_frame("walk", _tex("%s_walk_%d.png" % [prefix, i]))
	sf.add_animation("attack")
	sf.set_animation_speed("attack", 8.0)
	sf.set_animation_loop("attack", false)
	sf.add_frame("attack", _tex("%s_attack_0.png" % prefix))  # preparo
	sf.add_frame("attack", _tex("%s_attack_1.png" % prefix))  # investida
	return sf

func _process(delta: float) -> void:
	if _spr == null:
		return
	# fantasma de morte: desvanece, incha e se desfaz sozinho
	if _ghost_t >= 0.0:
		_ghost_t += delta
		var t := clampf(_ghost_t / 0.5, 0.0, 1.0)
		_spr.modulate = Color(1.6, 1.2, 2.0, (1.0 - t) * 0.9)
		_spr.scale = Vector2.ONE * _base_scale * (1.0 + 0.3 * t)
		_spr.position.y = 4.0 * t
		if t >= 1.0:
			queue_free()
		return
	_spr.flip_h = cos(face_angle) < 0.0
	# flutuação espectral (a Sombra não pisa — paira)
	_spr.position.y = -1.5 + sin(wobble * 2.0) * 2.2
	# animação conforme a FSM
	var want := "walk"
	var drive := -1
	match state_name:
		"spawn":
			want = "walk"
			drive = 0
		"telegraph":
			want = "attack"
			drive = 0
		"attack":
			want = "attack"
			drive = 1
		"recover":
			want = "walk"
		_:
			want = "walk"
	if want != _cur_anim:
		_cur_anim = want
		_spr.play(want)
	if drive >= 0:
		_spr.pause()
		_spr.frame = drive
	elif want == "walk":
		_spr.speed_scale = 0.35 if state_name == "recover" else 1.0
		if not _spr.is_playing():
			_spr.play(want)
	# cor: flash branco ao apanhar; pulso vermelho na telegrafia
	var pulse := 0.55 + 0.45 * sin(Time.get_ticks_msec() * 0.03)
	var r := 1.0 + 2.2 * hurt_flash + 0.9 * telegraph * pulse
	var g := 1.0 + 2.2 * hurt_flash - 0.45 * telegraph * pulse
	var b := 1.0 + 2.2 * hurt_flash - 0.45 * telegraph * pulse
	_spr.modulate = Color(r, g, b, clampf(spawn_alpha, 0.0, 1.0))
	# inchaço sutil ao telegrafar (antecipação)
	var swell := 1.0 + 0.07 * telegraph
	_spr.scale = Vector2.ONE * _base_scale * swell
