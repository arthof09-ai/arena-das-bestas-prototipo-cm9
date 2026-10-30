class_name ArenaBg
extends Node2D
## v2 (EXP-MUSE-004) — Cenário = ARTE PINTADA gerada por IA
## (assets/arena.png, 1280×720). No processamento (tools/process_sprites.py)
## a elipse do anel de runas da arte foi alinhada à elipse de gameplay
## (centro 640,372 · raios 566,306), então a textura é desenhada 1:1.
## Este nó só acrescenta o brilho tremulante das 4 tochas da pintura
## (sprites aditivos pulsando) para a cena não ficar estática.

var center := Vector2(640, 372)
var radii := Vector2(566, 306)
var _flicker := 0.0
var _glows: Array = []

# posições das tochas medidas na arte processada (coords de tela)
const TORCHES := [Vector2(176, 292), Vector2(738, 104),
	Vector2(1194, 292), Vector2(742, 624)]

func _ready() -> void:
	var spr := Sprite2D.new()
	spr.texture = load("res://assets/arena.png") as Texture2D
	spr.centered = false
	spr.z_index = -10
	add_child(spr)
	for tp in TORCHES:
		var glow := Sprite2D.new()
		glow.texture = KnightView.radial_texture()
		var m := CanvasItemMaterial.new()
		m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		glow.material = m
		glow.position = tp + Vector2(0, -6)
		glow.modulate = Color(1.0, 0.55, 0.16, 0.16)
		add_child(glow)
		_glows.append(glow)

func _process(delta: float) -> void:
	_flicker += delta
	for j in range(_glows.size()):
		var fl := 0.78 + 0.22 * sin(_flicker * 11.0 + float(j) * 1.7)
		var glow := _glows[j] as Sprite2D
		glow.scale = Vector2.ONE * 0.62 * fl
		glow.modulate = Color(1.0, 0.55, 0.16, 0.13 + 0.06 * fl)
