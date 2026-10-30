class_name DamageNumber
extends Label
## Número de dano flutuante no espaço do mundo (some sozinho).

var _t := 0.0
var _dur := 0.8
var _vel := Vector2(randf_range(-14.0, 14.0), -95.0)

func setup(pos: Vector2, amount: int, crit: bool) -> void:
	position = pos + Vector2(randf_range(-8.0, 8.0), -46.0)
	text = str(amount)
	z_index = 90
	if crit:
		add_theme_font_size_override("font_size", 30)
		add_theme_color_override("font_color", Color(1.0, 0.78, 0.25))
	else:
		add_theme_font_size_override("font_size", 21)
		add_theme_color_override("font_color", Color(0.95, 0.96, 1.0))
	add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.85))
	add_theme_constant_override("shadow_offset_x", 2)
	add_theme_constant_override("shadow_offset_y", 2)

func _process(delta: float) -> void:
	_t += delta
	position += _vel * delta
	_vel.y += 150.0 * delta
	var u := _t / _dur
	modulate.a = 1.0 - smoothstep(0.55, 1.0, u)
	if _t >= _dur:
		queue_free()
