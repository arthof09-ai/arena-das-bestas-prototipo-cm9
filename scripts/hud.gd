class_name Hud
extends CanvasLayer
## Interface completa construída por código: barras, placar, rank,
## telas (título/bênçãos/game over), banner de onda e controles de toque.

var game: Node = null

var _hp_bar: ProgressBar
var _pa_bar: ProgressBar
var _hp_text: Label
var _wave_label: Label
var _rank_label: Label
var _score_label: Label
var _combo_label: Label
var _dash_label: Label
var _banner: Label
var _banner_t := 0.0
var _hurt_rect: ColorRect
var _hurt_a := 0.0

var _title_panel: PanelContainer
var _upgrade_panel: PanelContainer
var _over_panel: PanelContainer
var _over_stats: Label
var _upgrade_box: HBoxContainer
var _touch_layer: Control
var _stick: TouchStick

const GOLD := Color(0.85, 0.65, 0.30)
const PAPER := Color(0.92, 0.90, 0.84)

func _ready() -> void:
	layer = 10
	_build_bars()
	_build_panels()
	_build_touch()

func _mk_label(text: String, size: int, col: Color = PAPER) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
	l.add_theme_constant_override("shadow_offset_x", 2)
	l.add_theme_constant_override("shadow_offset_y", 2)
	return l

func _style_bar(bar: ProgressBar, bg: Color, fill: Color) -> void:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.corner_radius_top_left = 6
	sb.corner_radius_top_right = 6
	sb.corner_radius_bottom_left = 6
	sb.corner_radius_bottom_right = 6
	sb.border_color = Color(0, 0, 0, 0.6)
	sb.set_border_width_all(2)
	bar.add_theme_stylebox_override("background", sb)
	var sf := StyleBoxFlat.new()
	sf.bg_color = fill
	sf.corner_radius_top_left = 6
	sf.corner_radius_top_right = 6
	sf.corner_radius_bottom_left = 6
	sf.corner_radius_bottom_right = 6
	bar.add_theme_stylebox_override("fill", sf)
	bar.show_percentage = false

func _build_bars() -> void:
	_hurt_rect = ColorRect.new()
	_hurt_rect.color = Color(0.7, 0.05, 0.05, 0.0)
	_hurt_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_hurt_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_hurt_rect)

	var top := VBoxContainer.new()
	top.position = Vector2(18, 14)
	top.add_theme_constant_override("separation", 5)
	add_child(top)
	_hp_text = _mk_label("VIDA", 15, Color(1, 0.85, 0.8))
	top.add_child(_hp_text)
	_hp_bar = ProgressBar.new()
	_hp_bar.custom_minimum_size = Vector2(300, 20)
	_hp_bar.max_value = 100
	_hp_bar.value = 100
	_style_bar(_hp_bar, Color(0.12, 0.05, 0.06, 0.85), Color(0.78, 0.22, 0.22))
	top.add_child(_hp_bar)
	var pa_row := HBoxContainer.new()
	pa_row.add_theme_constant_override("separation", 8)
	top.add_child(pa_row)
	var pa_lbl := _mk_label("PA", 15, Color(0.7, 0.9, 1.0))
	pa_row.add_child(pa_lbl)
	_pa_bar = ProgressBar.new()
	_pa_bar.custom_minimum_size = Vector2(258, 14)
	_pa_bar.max_value = 100
	_pa_bar.value = 0
	_style_bar(_pa_bar, Color(0.05, 0.08, 0.14, 0.85), Color(0.35, 0.65, 1.0))
	pa_row.add_child(_pa_bar)
	_dash_label = _mk_label("ESQUIVA PRONTA", 13, Color(0.65, 0.95, 0.8))
	top.add_child(_dash_label)

	var center_top := VBoxContainer.new()
	center_top.set_anchors_preset(Control.PRESET_CENTER_TOP)
	center_top.position = Vector2(-200, 10)
	center_top.custom_minimum_size = Vector2(400, 60)
	add_child(center_top)
	_wave_label = _mk_label("", 24, PAPER)
	_wave_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center_top.add_child(_wave_label)
	_rank_label = _mk_label("", 18, GOLD)
	_rank_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center_top.add_child(_rank_label)

	_score_label = _mk_label("", 18, PAPER)
	_score_label.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	_score_label.position = Vector2(-330, 14)
	_score_label.custom_minimum_size = Vector2(312, 30)
	_score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	add_child(_score_label)

	_combo_label = _mk_label("", 26, Color(1.0, 0.8, 0.3))
	_combo_label.set_anchors_preset(Control.PRESET_CENTER_RIGHT)
	_combo_label.position = Vector2(-240, -20)
	_combo_label.custom_minimum_size = Vector2(220, 40)
	_combo_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	add_child(_combo_label)

	_banner = _mk_label("", 44, GOLD)
	_banner.set_anchors_preset(Control.PRESET_CENTER)
	_banner.position = Vector2(-400, -150)
	_banner.custom_minimum_size = Vector2(800, 60)
	_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner.modulate.a = 0.0
	add_child(_banner)

func _panel_base() -> PanelContainer:
	var p := PanelContainer.new()
	p.anchor_left = 0.5
	p.anchor_top = 0.5
	p.anchor_right = 0.5
	p.anchor_bottom = 0.5
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.06, 0.05, 0.11, 0.94)
	sb.border_color = GOLD
	sb.set_border_width_all(3)
	sb.corner_radius_top_left = 14
	sb.corner_radius_top_right = 14
	sb.corner_radius_bottom_left = 14
	sb.corner_radius_bottom_right = 14
	sb.content_margin_left = 36
	sb.content_margin_right = 36
	sb.content_margin_top = 28
	sb.content_margin_bottom = 28
	p.add_theme_stylebox_override("panel", sb)
	p.visible = false
	add_child(p)
	return p

func _center_panel(p: PanelContainer, w: float, h: float) -> void:
	p.set_offset(SIDE_LEFT, -w * 0.5)
	p.set_offset(SIDE_RIGHT, w * 0.5)
	p.set_offset(SIDE_TOP, -h * 0.5)
	p.set_offset(SIDE_BOTTOM, h * 0.5)

func _big_button(text: String) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(280, 54)
	b.add_theme_font_size_override("font_size", 21)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.45, 0.13, 0.16)
	sb.corner_radius_top_left = 10
	sb.corner_radius_top_right = 10
	sb.corner_radius_bottom_left = 10
	sb.corner_radius_bottom_right = 10
	sb.border_color = GOLD
	sb.set_border_width_all(2)
	b.add_theme_stylebox_override("normal", sb)
	var sh := sb.duplicate() as StyleBoxFlat
	sh.bg_color = Color(0.60, 0.20, 0.22)
	b.add_theme_stylebox_override("hover", sh)
	b.add_theme_color_override("font_color", PAPER)
	return b

func _build_panels() -> void:
	# ---- título ----
	_title_panel = _panel_base()
	var tv := VBoxContainer.new()
	tv.alignment = BoxContainer.ALIGNMENT_CENTER
	tv.add_theme_constant_override("separation", 10)
	_title_panel.add_child(tv)
	var t1 := _mk_label("ARENA DAS BESTAS", 52, GOLD)
	t1.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tv.add_child(t1)
	var t2 := _mk_label("Arena de combate 2.5D — derrote as ondas de Sombras, junte PA e suba de rank", 16)
	t2.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tv.add_child(t2)
	var seal := _mk_label("— PROTÓTIPO DE TESTE — CM-000009 —", 18, Color(1.0, 0.55, 0.35))
	seal.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tv.add_child(seal)
	var t3 := _mk_label("WASD/Setas: mover   •   Mouse: mirar   •   Clique: combo de 3 golpes\nShift/Espaço: esquiva (invencível)   •   E: Corte do Vento (40 PA)\nNo celular: analógico e botões na tela", 15, Color(0.75, 0.78, 0.85))
	t3.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tv.add_child(t3)
	var start_btn := _big_button("ENTRAR NA ARENA")
	start_btn.pressed.connect(func() -> void: if game: game.start_game())
	var bc := CenterContainer.new()
	bc.add_child(start_btn)
	tv.add_child(bc)
	_center_panel(_title_panel, 700, 390)

	# ---- bênçãos ----
	_upgrade_panel = _panel_base()
	var uv := VBoxContainer.new()
	uv.add_theme_constant_override("separation", 14)
	_upgrade_panel.add_child(uv)
	var u1 := _mk_label("A ARENA RESPIRA... ESCOLHA UMA TÉCNICA", 24, GOLD)
	u1.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	uv.add_child(u1)
	_upgrade_box = HBoxContainer.new()
	_upgrade_box.add_theme_constant_override("separation", 16)
	_upgrade_box.alignment = BoxContainer.ALIGNMENT_CENTER
	uv.add_child(_upgrade_box)
	_center_panel(_upgrade_panel, 860, 270)

	# ---- game over ----
	_over_panel = _panel_base()
	var ov := VBoxContainer.new()
	ov.alignment = BoxContainer.ALIGNMENT_CENTER
	ov.add_theme_constant_override("separation", 10)
	_over_panel.add_child(ov)
	var o1 := _mk_label("O CAVALEIRO CAIU", 40, Color(1.0, 0.45, 0.4))
	o1.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ov.add_child(o1)
	_over_stats = _mk_label("", 19)
	_over_stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ov.add_child(_over_stats)
	var again_btn := _big_button("JOGAR NOVAMENTE")
	again_btn.pressed.connect(func() -> void: if game: game.start_game())
	var bc2 := CenterContainer.new()
	bc2.add_child(again_btn)
	ov.add_child(bc2)
	_center_panel(_over_panel, 600, 310)

func _build_touch() -> void:
	_touch_layer = Control.new()
	_touch_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	_touch_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_touch_layer.visible = false
	add_child(_touch_layer)
	_stick = TouchStick.new()
	_stick.position = Vector2(28, 720 - 190)
	_touch_layer.add_child(_stick)
	_stick.on_change = func(v: Vector2) -> void:
		if game and game.player:
			game.player.touch_move = v
			if v.length() > 0.12:
				game.player.touch_aim = true
	# botões de ação
	var atk := _round_button("GOLPE", Vector2(1280 - 118, 720 - 128), 92, Color(0.55, 0.16, 0.18, 0.75))
	atk.pressed.connect(func() -> void: if game and game.player: game.player.queue_attack())
	var dash := _round_button("DASH", Vector2(1280 - 226, 720 - 108), 70, Color(0.10, 0.25, 0.35, 0.75))
	dash.pressed.connect(func() -> void: if game and game.player: game.player.try_dash())
	var spec := _round_button("VENTO", Vector2(1280 - 108, 720 - 238), 70, Color(0.30, 0.25, 0.08, 0.75))
	spec.pressed.connect(func() -> void: if game and game.player: game.player.try_special())

func _round_button(text: String, pos: Vector2, diam: float, bg: Color) -> Button:
	var b := Button.new()
	b.text = text
	b.position = pos
	b.custom_minimum_size = Vector2(diam, diam)
	b.size = Vector2(diam, diam)
	b.add_theme_font_size_override("font_size", 15)
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.corner_radius_top_left = int(diam / 2)
	sb.corner_radius_top_right = int(diam / 2)
	sb.corner_radius_bottom_left = int(diam / 2)
	sb.corner_radius_bottom_right = int(diam / 2)
	sb.border_color = GOLD
	sb.set_border_width_all(2)
	b.add_theme_stylebox_override("normal", sb)
	var sp := sb.duplicate() as StyleBoxFlat
	sp.bg_color = bg.lightened(0.25)
	b.add_theme_stylebox_override("pressed", sp)
	b.add_theme_color_override("font_color", PAPER)
	_touch_layer.add_child(b)
	return b

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch and not _touch_layer.visible:
		_touch_layer.visible = true
		if game and game.player:
			game.player.touch_aim = true

# ---------------- API p/ o Main ----------------

func show_touch_if_available() -> void:
	if DisplayServer.is_touchscreen_available():
		_touch_layer.visible = true

func show_title() -> void:
	_title_panel.visible = true
	_upgrade_panel.visible = false
	_over_panel.visible = false

func hide_panels() -> void:
	_title_panel.visible = false
	_upgrade_panel.visible = false
	_over_panel.visible = false

func show_gameover(score: int, best: int, wave: int, rank: String) -> void:
	_over_stats.text = "Onda alcançada: %d   •   Rank: %s\nPlacar: %d   •   Recorde: %d" % [wave, rank, score, best]
	_over_panel.visible = true

func show_upgrades(options: Array, on_pick: Callable) -> void:
	for c in _upgrade_box.get_children():
		c.queue_free()
	for opt in options:
		var d: Dictionary = opt
		var b := Button.new()
		b.text = "%s\n\n%s" % [d["name"], d["desc"]]
		b.custom_minimum_size = Vector2(258, 150)
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		b.add_theme_font_size_override("font_size", 16)
		var sb := StyleBoxFlat.new()
		sb.bg_color = Color(0.10, 0.09, 0.18, 0.95)
		sb.border_color = GOLD
		sb.set_border_width_all(2)
		sb.corner_radius_top_left = 12
		sb.corner_radius_top_right = 12
		sb.corner_radius_bottom_left = 12
		sb.corner_radius_bottom_right = 12
		sb.content_margin_left = 14
		sb.content_margin_right = 14
		sb.content_margin_top = 12
		sb.content_margin_bottom = 12
		b.add_theme_stylebox_override("normal", sb)
		var sh := sb.duplicate() as StyleBoxFlat
		sh.bg_color = Color(0.20, 0.16, 0.30, 0.98)
		b.add_theme_stylebox_override("hover", sh)
		b.add_theme_color_override("font_color", PAPER)
		var id: String = d["id"]
		b.pressed.connect(func() -> void: on_pick.call(id))
		_upgrade_box.add_child(b)
	_upgrade_panel.visible = true

func hide_upgrades() -> void:
	_upgrade_panel.visible = false

func banner(text: String) -> void:
	_banner.text = text
	_banner_t = 2.0

func hurt_pulse() -> void:
	_hurt_a = 1.0

func _process(delta: float) -> void:
	if _banner_t > 0.0:
		_banner_t -= delta
		_banner.modulate.a = clampf(_banner_t / 0.6, 0.0, 1.0) if _banner_t < 0.6 else 1.0
	else:
		_banner.modulate.a = 0.0
	if _hurt_a > 0.0:
		_hurt_a = maxf(0.0, _hurt_a - delta * 2.2)
		_hurt_rect.color.a = _hurt_a * 0.20

func set_values(hp: float, hp_max: float, pa: float, pa_max: float, score: int, best: int, wave: int, rank: String, combo: int, dash_ready: bool, special_ready: bool) -> void:
	_hp_bar.max_value = hp_max
	_hp_bar.value = hp
	_hp_text.text = "VIDA  %d / %d" % [int(ceil(hp)), int(hp_max)]
	_pa_bar.max_value = pa_max
	_pa_bar.value = pa
	var fill := _pa_bar.get_theme_stylebox("fill") as StyleBoxFlat
	if fill:
		fill.bg_color = Color(1.0, 0.75, 0.25) if special_ready else Color(0.35, 0.65, 1.0)
	_wave_label.text = "ONDA %d" % wave if wave > 0 else ""
	_rank_label.text = rank
	_score_label.text = "PLACAR %d   •   RECORDE %d" % [score, best]
	_combo_label.text = "%d HITS" % combo if combo >= 2 else ""
	_dash_label.text = "ESQUIVA PRONTA (Shift)" if dash_ready else "ESQUIVA RECARREGANDO..."
	_dash_label.add_theme_color_override("font_color", Color(0.65, 0.95, 0.8) if dash_ready else Color(0.55, 0.6, 0.65))
