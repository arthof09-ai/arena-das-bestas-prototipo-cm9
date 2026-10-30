class_name Sfx
extends Node
## Sons 100% procedurais: tons sintetizados em código (AudioStreamWAV),
## sem nenhum arquivo de áudio externo.

var _players: Array[AudioStreamPlayer] = []
var _streams: Dictionary = {}
const POOL := 8

func _ready() -> void:
	for i in range(POOL):
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_players.append(p)
	_streams["swing"] = _tone(660.0, 340.0, 0.09, 0.20, 0.4)
	_streams["hit"] = _tone(190.0, 70.0, 0.10, 0.45, 0.9)
	_streams["hit3"] = _tone(140.0, 55.0, 0.16, 0.55, 1.0)
	_streams["hurt"] = _tone(300.0, 120.0, 0.14, 0.4, 0.8)
	_streams["dash"] = _tone(240.0, 720.0, 0.12, 0.22, 0.5)
	_streams["special"] = _tone(880.0, 220.0, 0.30, 0.4, 0.7)
	_streams["die"] = _tone(420.0, 60.0, 0.28, 0.4, 0.8)
	_streams["upgrade"] = _tone(523.0, 1046.0, 0.22, 0.35, 0.6)

func play(name: String) -> void:
	if not _streams.has(name):
		return
	for p in _players:
		if not p.playing:
			p.stream = _streams[name]
			p.pitch_scale = randf_range(0.94, 1.06)
			p.play()
			return

func _tone(f0: float, f1: float, dur: float, vol: float, decay: float) -> AudioStreamWAV:
	var rate := 22050
	var frames := int(dur * rate)
	var data := PackedByteArray()
	data.resize(frames * 2)
	for i in range(frames):
		var t := float(i) / rate
		var f := lerpf(f0, f1, t / dur)
		var env := pow(1.0 - t / dur, decay)
		var s := sin(TAU * f * t) * env * vol
		var v := int(clampf(s, -1.0, 1.0) * 32767.0)
		if v < 0:
			v += 65536
		data[i * 2] = v & 0xFF
		data[i * 2 + 1] = (v >> 8) & 0xFF
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = rate
	w.stereo = false
	w.data = data
	return w
