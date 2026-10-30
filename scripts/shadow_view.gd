class_name ShadowView
extends Node2D
## Desenho procedural das "Sombras" (inimigos). Sem sprites.
## rápida: pequena, olhos laranja. bruta: grande, chifres, olhos vermelhos.
## Convenção: olha para +X; origem nos pés.

var kind: String = "rapida"
var face_angle: float = 0.0
var telegraph: float = 0.0    # 0..1 — preparação do ataque (pisca)
var hurt_flash: float = 0.0
var spawn_alpha: float = 0.0  # 0..1 ao nascer
var wobble: float = 0.0       # fase de oscilação (definida pelo inimigo)

func _process(_delta: float) -> void:
	queue_redraw()

func _draw() -> void:
	var big := kind == "bruta"
	var r := 34.0 if big else 21.0
	var h := 52.0 if big else 34.0
	var a := clampf(spawn_alpha, 0.0, 1.0)
	var base := Color(0.09, 0.07, 0.14)
	if telegraph > 0.0:
		base = base.lerp(Color(0.45, 0.10, 0.12), telegraph * (0.55 + 0.45 * sin(Time.get_ticks_msec() * 0.03)))
	if hurt_flash > 0.0:
		base = base.lerp(Color(0.95, 0.95, 1.0), hurt_flash)
	base.a = a
	# sombra no chão
	var sh := Color(0, 0, 0, 0.35 * a)
	var pts0 := PackedVector2Array()
	for i in range(18):
		var ang := TAU * float(i) / 18.0
		pts0.append(Vector2(cos(ang) * r * 0.95, 3 + sin(ang) * 6.0))
	draw_colored_polygon(pts0, sh)
	# corpo: massa espectral com base ondulada
	var pts := PackedVector2Array()
	var top := -h + sin(wobble * 2.0) * 2.0
	pts.append(Vector2(-r * 0.72, -h * 0.55))
	pts.append(Vector2(-r * 0.4, top))
	pts.append(Vector2(r * 0.4, top))
	pts.append(Vector2(r * 0.72, -h * 0.55))
	var hem := 7 if big else 5
	for i in range(hem + 1):
		var x := lerpf(r * 0.72, -r * 0.72, float(i) / hem)
		var y := -2.0 + (5.0 if i % 2 == 0 else -3.0) + sin(wobble * 3.0 + float(i)) * 1.5
		pts.append(Vector2(x, y))
	draw_colored_polygon(pts, base)
	# rasgos espectrais (linhas claras sutis)
	var tear := Color(0.45, 0.35, 0.65, 0.35 * a)
	draw_line(Vector2(-r * 0.3, -h * 0.6), Vector2(-r * 0.15, -h * 0.2), tear, 2.0)
	draw_line(Vector2(r * 0.25, -h * 0.7), Vector2(r * 0.35, -h * 0.3), tear, 2.0)
	# chifres da bruta
	if big:
		var horn := Color(0.75, 0.70, 0.62, a)
		draw_colored_polygon(PackedVector2Array([
			Vector2(-r * 0.55, -h * 0.82), Vector2(-r * 0.95, -h * 1.12), Vector2(-r * 0.25, -h * 0.95)]), horn)
		draw_colored_polygon(PackedVector2Array([
			Vector2(r * 0.55, -h * 0.82), Vector2(r * 0.95, -h * 1.12), Vector2(r * 0.25, -h * 0.95)]), horn)
	# olhos brilhantes voltados para a direção do olhar
	var eye_col := Color(1.0, 0.36, 0.18, a) if big else Color(1.0, 0.62, 0.2, a)
	var look := Vector2.from_angle(face_angle)
	var eye_y := -h * 0.62
	var ex := r * 0.30
	for s in [-1.0, 1.0]:
		var perp: Vector2 = Vector2(-look.y, look.x) * ex * float(s)
		var ep: Vector2 = Vector2(0, eye_y) + perp + look * r * 0.28
		draw_circle(ep, 3.4 if big else 2.6, eye_col)
	# aviso de telegrafia: triângulo pulsante sobre a cabeça
	if telegraph > 0.05:
		var pulse := 0.6 + 0.4 * sin(Time.get_ticks_msec() * 0.03)
		var wc := Color(1.0, 0.25, 0.15, telegraph * pulse * a)
		var cy := -h - 18.0
		draw_colored_polygon(PackedVector2Array([
			Vector2(0, cy - 9), Vector2(8, cy + 6), Vector2(-8, cy + 6)]), wc)
