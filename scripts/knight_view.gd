class_name KnightView
extends Node2D
## Desenho procedural do cavaleiro cultivador (sem sprites/assets).
## Corpo sempre "em pé" (2.5D); direção aparece na capa, na viseira
## e principalmente no braço da espada. Origem nos pés, espada em ângulo absoluto.

var face_angle: float = 0.0        # direção do olhar/mira
var walk_phase: float = 0.0
var moving: bool = false
var sword_angle: float = -0.5      # ângulo absoluto da espada
var smear_from: float = 0.0
var smear_to: float = 0.0
var smear_alpha: float = 0.0
var hurt_flash: float = 0.0
var invuln_blink: bool = false
var core_color: Color = Color(0.65, 0.9, 1.0)
var dead: bool = false

const STEEL := Color(0.52, 0.60, 0.70)
const STEEL_D := Color(0.33, 0.39, 0.48)
const STEEL_L := Color(0.78, 0.84, 0.92)
const CLOTH := Color(0.45, 0.13, 0.16)
const CLOTH_D := Color(0.30, 0.08, 0.11)
const GOLD := Color(0.85, 0.65, 0.30)

func _process(_delta: float) -> void:
	queue_redraw()

func _rot(points: PackedVector2Array, anchor: Vector2, ang: float) -> PackedVector2Array:
	var out := PackedVector2Array()
	for p in points:
		out.append(anchor + (p - anchor).rotated(ang))
	return out

func _draw() -> void:
	if dead:
		var pts := PackedVector2Array()
		for i in range(20):
			var a := TAU * float(i) / 20.0
			pts.append(Vector2(cos(a) * 30.0, sin(a) * 10.0))
		draw_colored_polygon(pts, Color(0.2, 0.2, 0.25, 0.8))
		draw_line(Vector2(14, -2), Vector2(52, 8), Color(0.8, 0.85, 0.9, 0.8), 3.5)
		return
	var alpha := 1.0
	if invuln_blink and int(Time.get_ticks_msec() / 70) % 2 == 0:
		alpha = 0.45
	var bob := 0.0
	var leg_a := 0.0
	var leg_b := 0.0
	if moving:
		bob = absf(sin(walk_phase)) * 2.2
		leg_a = sin(walk_phase) * 7.0
		leg_b = sin(walk_phase + PI) * 7.0
	var body_col := STEEL.lerp(Color(1, 0.3, 0.25), hurt_flash * 0.7)
	var dark_col := STEEL_D.lerp(Color(0.7, 0.15, 0.12), hurt_flash * 0.7)

	# sombra no chão
	var sh := PackedVector2Array()
	for i in range(20):
		var a2 := TAU * float(i) / 20.0
		sh.append(Vector2(cos(a2) * 22.0, 3 + sin(a2) * 7.0))
	draw_colored_polygon(sh, Color(0, 0, 0, 0.35))

	# capa: flui na direção OPOSTA ao olhar (polígono base p/ -X, girado)
	var wave := sin(walk_phase * 0.9 + 1.2) * (3.0 if moving else 1.2)
	var anchor := Vector2(0, -38 + bob)
	var cloak_base := PackedVector2Array([
		Vector2(-2, -56 + bob), Vector2(-26, -44 + bob + wave),
		Vector2(-30, -16 + wave * 1.6), Vector2(-14, -4 + wave),
		Vector2(-4, -18 + bob)])
	draw_colored_polygon(_rot(cloak_base, anchor, face_angle), Color(CLOTH_D, alpha))
	var cloak2_base := PackedVector2Array([
		Vector2(-2, -54 + bob), Vector2(-20, -42 + bob + wave),
		Vector2(-22, -20 + wave), Vector2(-8, -10 + wave * 0.6), Vector2(-3, -24 + bob)])
	draw_colored_polygon(_rot(cloak2_base, anchor, face_angle), Color(CLOTH, alpha))

	# pernas/botas
	draw_rect(Rect2(-9 + leg_a, -18, 7, 17), Color(dark_col, alpha))
	draw_rect(Rect2(3 + leg_b, -18, 7, 17), Color(dark_col, alpha))
	draw_rect(Rect2(-10 + leg_a, -3, 9, 4), Color(0.16, 0.13, 0.11, alpha))
	draw_rect(Rect2(2 + leg_b, -3, 9, 4), Color(0.16, 0.13, 0.11, alpha))

	# tronco (armadura)
	var torso := PackedVector2Array([
		Vector2(-11, -58 + bob), Vector2(11, -58 + bob), Vector2(13, -30 + bob),
		Vector2(8, -18 + bob), Vector2(-8, -18 + bob), Vector2(-13, -30 + bob)])
	draw_colored_polygon(torso, Color(body_col, alpha))
	draw_rect(Rect2(-11, -50 + bob, 22, 4), Color(STEEL_L, alpha * 0.9))
	draw_rect(Rect2(-9, -30 + bob, 18, 3), Color(GOLD, alpha))
	draw_circle(Vector2(0, -42 + bob), 3.5, Color(core_color, alpha))

	# braço do escudo
	draw_line(Vector2(-8, -52 + bob), Vector2(-16, -36 + bob), Color(dark_col, alpha), 5.0)
	var shield := PackedVector2Array([
		Vector2(-22, -48 + bob), Vector2(-12, -48 + bob), Vector2(-12, -28 + bob),
		Vector2(-17, -22 + bob), Vector2(-22, -28 + bob)])
	draw_colored_polygon(shield, Color(STEEL_D, alpha))
	draw_polyline(PackedVector2Array(shield + PackedVector2Array([shield[0]])), Color(GOLD, alpha), 1.6)

	# cabeça: elmo + pluma + viseira deslocada p/ o olhar
	var look_x := cos(face_angle) * 3.0
	draw_circle(Vector2(1, -64 + bob), 9.5, Color(body_col, alpha))
	draw_rect(Rect2(-6 + look_x, -66 + bob, 13, 3.4), Color(0.10, 0.10, 0.13, alpha))
	var plume := PackedVector2Array([
		Vector2(-2, -72 + bob), Vector2(-14 - cos(face_angle) * 3.0, -78 + bob),
		Vector2(-18 - cos(face_angle) * 3.0, -70 + bob), Vector2(-8, -66 + bob)])
	draw_colored_polygon(plume, Color(CLOTH.lightened(0.15), alpha))

	# braço da espada + espada (ângulo absoluto)
	var shoulder := Vector2(9, -52 + bob)
	var hand := shoulder + Vector2.from_angle(sword_angle) * 13.0
	draw_line(shoulder, hand, Color(body_col, alpha), 5.5)
	if smear_alpha > 0.01:
		var pts := PackedVector2Array()
		var steps := 10
		for i in range(steps + 1):
			var a3 := lerpf(smear_from, smear_to, float(i) / steps)
			pts.append(hand + Vector2.from_angle(a3) * 47.0)
		pts.append(hand)
		draw_colored_polygon(pts, Color(0.85, 0.93, 1.0, smear_alpha * 0.35 * alpha))
	var tip := hand + Vector2.from_angle(sword_angle) * 47.0
	draw_line(hand, tip, Color(0.92, 0.95, 0.99, alpha), 4.0)
	draw_line(hand, hand + Vector2.from_angle(sword_angle) * 10.0, Color(0.65, 0.75, 0.85, alpha), 5.0)
	var guard_dir := Vector2.from_angle(sword_angle + PI * 0.5)
	draw_line(hand + guard_dir * 6.0, hand - guard_dir * 6.0, Color(GOLD, alpha), 3.0)
	draw_line(hand, hand - Vector2.from_angle(sword_angle) * 6.0, Color(0.25, 0.18, 0.12, alpha), 4.0)
