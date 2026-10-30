class_name TouchStick
extends Control
## Analógico virtual para toque (também responde ao mouse, p/ testes).
## Expõe `value` (vetor -1..1) e chama `on_change` quando muda.

var value := Vector2.ZERO
var on_change: Callable
var _touch_id := -1
var _radius := 62.0

func _ready() -> void:
	custom_minimum_size = Vector2(150, 150)
	size = custom_minimum_size
	mouse_filter = MOUSE_FILTER_STOP

func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var t := event as InputEventScreenTouch
		if t.pressed and _touch_id == -1:
			_touch_id = t.index
			_update_from(t.position)
		elif not t.pressed and t.index == _touch_id:
			_touch_id = -1
			value = Vector2.ZERO
			_emit()
	elif event is InputEventScreenDrag:
		var d := event as InputEventScreenDrag
		if d.index == _touch_id:
			_update_from(d.position)
	elif event is InputEventMouseButton:
		var b := event as InputEventMouseButton
		if b.button_index == MOUSE_BUTTON_LEFT:
			if b.pressed:
				_touch_id = 999
				_update_from(b.position)
			elif _touch_id == 999:
				_touch_id = -1
				value = Vector2.ZERO
				_emit()
	elif event is InputEventMouseMotion and _touch_id == 999:
		_update_from((event as InputEventMouseMotion).position)
	queue_redraw()

func _update_from(local_pos: Vector2) -> void:
	var center := size * 0.5
	var v := (local_pos - center) / _radius
	value = v.limit_length(1.0)
	_emit()

func _emit() -> void:
	if on_change.is_valid():
		on_change.call(value)
	queue_redraw()

func _draw() -> void:
	var center := size * 0.5
	draw_circle(center, _radius + 14.0, Color(0.05, 0.05, 0.09, 0.45))
	draw_arc(center, _radius + 14.0, 0, TAU, 48, Color(0.85, 0.65, 0.3, 0.55), 2.5)
	var knob := center + value * _radius * 0.62
	draw_circle(knob, 30.0, Color(0.75, 0.8, 0.9, 0.35))
	draw_arc(knob, 30.0, 0, TAU, 40, Color(0.9, 0.9, 0.95, 0.6), 2.0)
