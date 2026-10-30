class_name FxRing
extends Node2D
## Anel expansivo (técnica especial "Corte do Vento" e avisos de spawn).

var radius_max := 175.0
var dur := 0.38
var col := Color(0.75, 0.92, 1.0)
var width := 7.0
var _t := 0.0

func setup(pos: Vector2, p_radius: float, p_col: Color, p_dur := 0.38) -> void:
	global_position = pos
	radius_max = p_radius
	col = p_col
	dur = p_dur
	z_index = 60

func _process(delta: float) -> void:
	_t += delta
	queue_redraw()
	if _t >= dur:
		queue_free()

func _draw() -> void:
	var u := clampf(_t / dur, 0.0, 1.0)
	var r := lerpf(12.0, radius_max, 1.0 - pow(1.0 - u, 2.0))
	var c := col
	c.a = (1.0 - u) * 0.85
	draw_arc(Vector2.ZERO, r, 0, TAU, 64, c, width * (1.0 - u * 0.6))
	var c2 := col
	c2.a = (1.0 - u) * 0.35
	draw_arc(Vector2.ZERO, r * 0.78, 0, TAU, 64, c2, width * 0.6)
