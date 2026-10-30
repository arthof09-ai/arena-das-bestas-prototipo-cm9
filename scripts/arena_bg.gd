class_name ArenaBg
extends Node2D
## Cenário da arena desenhado por código: clareira escura, círculo de
## pedras com runas, tochas nos cantos. Sem texturas externas.

var center := Vector2(640, 372)
var radii := Vector2(566, 306)
var _flicker := 0.0

func _process(delta: float) -> void:
	_flicker += delta
	queue_redraw()

func _draw() -> void:
	# fundo geral (fora da arena): mata escura
	draw_rect(Rect2(0, 0, 1280, 720), Color(0.035, 0.05, 0.045))
	# chão da arena em camadas elípticas (terra batida)
	_ellipse(center, radii + Vector2(26, 26), Color(0.10, 0.085, 0.07))
	_ellipse(center, radii + Vector2(10, 10), Color(0.16, 0.125, 0.09))
	_ellipse(center, radii, Color(0.20, 0.155, 0.105))
	_ellipse(center, radii * 0.72, Color(0.22, 0.17, 0.115))
	_ellipse(center, radii * 0.4, Color(0.24, 0.185, 0.12))
	# manchas de terra (determinísticas)
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	for i in range(46):
		var a := rng.randf() * TAU
		var rr := sqrt(rng.randf()) * 0.92
		var p := center + Vector2(cos(a) * radii.x * rr, sin(a) * radii.y * rr)
		var s := rng.randf_range(8.0, 30.0)
		_ellipse(p, Vector2(s, s * 0.55), Color(0.13, 0.10, 0.07, 0.5))
	# anel de pedras
	var stone_col := Color(0.32, 0.33, 0.38)
	var stone_d := Color(0.20, 0.20, 0.24)
	for i in range(28):
		var a := TAU * float(i) / 28.0
		var p := center + Vector2(cos(a) * (radii.x + 14), sin(a) * (radii.y + 14))
		var w := 16.0 + fmod(float(i) * 7.3, 9.0)
		draw_rect(Rect2(p.x - w * 0.5, p.y - 7, w, 14), stone_d if i % 2 == 0 else stone_col)
	# círculo de runas (anel elíptico interno, acompanhando a arena)
	var ring := PackedVector2Array()
	for i in range(97):
		var a := TAU * float(i) / 96.0
		ring.append(center + Vector2(cos(a) * radii.x * 0.86, sin(a) * radii.y * 0.86))
	draw_polyline(ring, Color(0.85, 0.62, 0.28, 0.20), 3.0)
	for i in range(24):
		var a := TAU * float(i) / 24.0
		var p1 := center + Vector2(cos(a) * radii.x * 0.83, sin(a) * radii.y * 0.83)
		var p2 := center + Vector2(cos(a) * radii.x * 0.895, sin(a) * radii.y * 0.895)
		draw_line(p1, p2, Color(0.85, 0.62, 0.28, 0.30), 3.0)
	# tochas: brilho tremulante nos 4 cantos da arena
	var torches := [
		center + Vector2(-radii.x - 30, -radii.y * 0.55),
		center + Vector2(radii.x + 30, -radii.y * 0.55),
		center + Vector2(-radii.x - 30, radii.y * 0.55),
		center + Vector2(radii.x + 30, radii.y * 0.55)]
	for j in range(torches.size()):
		var tp: Vector2 = torches[j]
		var fl := 0.75 + 0.25 * sin(_flicker * 11.0 + float(j) * 1.7)
		draw_rect(Rect2(tp.x - 3, tp.y, 6, 26), Color(0.25, 0.16, 0.09))
		draw_circle(tp + Vector2(0, -6), 26.0 * fl, Color(1.0, 0.55, 0.15, 0.10))
		draw_circle(tp + Vector2(0, -6), 10.0 * fl, Color(1.0, 0.62, 0.2, 0.28))
		draw_circle(tp + Vector2(0, -7), 4.5 * fl, Color(1.0, 0.85, 0.45, 0.9))

func _ellipse(c: Vector2, r: Vector2, col: Color) -> void:
	var pts := PackedVector2Array()
	for i in range(48):
		var a := TAU * float(i) / 48.0
		pts.append(c + Vector2(cos(a) * r.x, sin(a) * r.y))
	draw_colored_polygon(pts, col)
