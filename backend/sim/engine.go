package simulation

import (
	"fmt"
	"math"
	"math/rand"
	"sync"
	"time"

	"smart-iv-backend/models"
)

const maxHistory = 300

// Engine owns all mutable simulation state.
type Engine struct {
	mu       sync.RWMutex
	devices  []*models.DeviceState
	alerts   []models.Alert
	settings models.SimSettings
	running  bool
	ticker   *time.Ticker
	stop     chan struct{}
	alertSet map[string]bool // dedup: "deviceId:alertType" -> active
	events   []EventRecord   // for CSV export
}

// EventRecord is a plain-text log entry used for CSV export.
type EventRecord struct {
	Timestamp time.Time
	DeviceID  string
	EventType string
	Severity  string
	Message   string
}

func NewEngine() *Engine {
	e := &Engine{
		settings: models.DefaultSettings(),
		alertSet: make(map[string]bool),
	}
	e.devices = initDevices(e.settings)
	return e
}

// ---------- public read ----------

func (e *Engine) Snapshot() models.AppState {
	e.mu.RLock()
	defer e.mu.RUnlock()

	// Deep-copy devices so the caller owns clean data
	devsCopy := make([]*models.DeviceState, len(e.devices))
	for i, d := range e.devices {
		cp := *d
		cp.Hardware = append([]models.HardwareComponent{}, d.Hardware...)
		cp.Alerts = append([]models.Alert{}, d.Alerts...)
		cp.History = append([]models.Reading{}, d.History...)
		devsCopy[i] = &cp
	}

	alertsCopy := append([]models.Alert{}, e.alerts...)
	settings := e.settings

	return models.AppState{
		Devices:  devsCopy,
		Alerts:   alertsCopy,
		Settings: settings,
		Sim: models.SimStatus{
			Running: e.running,
			Speed:   e.settings.SpeedMultiplier,
		},
	}
}

func (e *Engine) GetDevice(id string) (*models.DeviceState, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	for _, d := range e.devices {
		if d.ID == id {
			cp := *d
			cp.Hardware = append([]models.HardwareComponent{}, d.Hardware...)
			cp.Alerts = append([]models.Alert{}, d.Alerts...)
			cp.History = append([]models.Reading{}, d.History...)
			return &cp, true
		}
	}
	return nil, false
}

func (e *Engine) GetEvents() []EventRecord {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return append([]EventRecord{}, e.events...)
}

// ---------- simulation lifecycle ----------

func (e *Engine) Start() {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.running {
		return
	}
	e.running = true
	e.stop = make(chan struct{})
	e.ticker = time.NewTicker(2 * time.Second)
	go e.loop()
}

func (e *Engine) Pause() {
	e.mu.Lock()
	defer e.mu.Unlock()
	if !e.running {
		return
	}
	e.running = false
	close(e.stop)
	e.ticker.Stop()
}

func (e *Engine) Reset() {
	e.mu.Lock()
	defer e.mu.Unlock()
	wasRunning := e.running
	if e.running {
		e.running = false
		close(e.stop)
		e.ticker.Stop()
	}
	e.settings = models.DefaultSettings()
	e.devices = initDevices(e.settings)
	e.alerts = nil
	e.alertSet = make(map[string]bool)
	e.events = nil
	if wasRunning {
		e.running = true
		e.stop = make(chan struct{})
		e.ticker = time.NewTicker(2 * time.Second)
		go e.loop()
	}
}

func (e *Engine) SetSpeed(speed models.SimSpeed) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.settings.SpeedMultiplier = speed
}

func (e *Engine) UpdateSettings(s models.SimSettings) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.settings = s
}

func (e *Engine) GetSettings() models.SimSettings {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.settings
}

// ---------- device control ----------

func (e *Engine) ControlDevice(id string, targetDropRate *float64, servoAngle *float64) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	d := e.findDevice(id)
	if d == nil {
		return fmt.Errorf("device %q not found", id)
	}
	if targetDropRate != nil {
		d.TargetDropRate = clamp(*targetDropRate, 0, 200)
		d.EmergencyStop = false
	}
	if servoAngle != nil {
		d.ServoAngle = clamp(*servoAngle, 0, 180)
	}
	return nil
}

func (e *Engine) AckAlert(id string) bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	for i, a := range e.alerts {
		if a.ID == id {
			e.alerts[i].Acknowledged = true
			// Also ack in device-level alerts
			for _, d := range e.devices {
				for j, da := range d.Alerts {
					if da.ID == id {
						d.Alerts[j].Acknowledged = true
					}
				}
			}
			return true
		}
	}
	return false
}

// ---------- scenarios ----------

func (e *Engine) ApplyScenario(name string, deviceID string) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	targets := e.targetDevices(deviceID)
	if len(targets) == 0 {
		return fmt.Errorf("no matching device")
	}

	switch Scenario(name) {
	case ScenarioNormal:
		for _, d := range targets {
			e.restoreDevice(d)
		}
	case ScenarioLowFluid:
		for _, d := range targets {
			e.restoreDevice(d)
			d.FluidVolumeMl = d.BagCapacityMl * 0.25
			e.recalc(d)
		}
	case ScenarioCritical:
		for _, d := range targets {
			e.restoreDevice(d)
			d.FluidVolumeMl = d.BagCapacityMl * 0.07
			e.recalc(d)
		}
	case ScenarioAirBubble:
		for _, d := range targets {
			d.BubbleDetected = true
			d.EmergencyStop = true
			d.FlowStopped = true
			d.DropRate = 0
			d.BuzzerActive = true
			d.LEDStatus = "critical_red"
			d.Hardware = patchHardware(d.Hardware, "IR Bubble Detector", models.StatusFault, "Air bubble detected")
			e.raiseAlert(d, models.AlertAirBubble, models.SeverityCritical, "Air bubble detected — flow stopped (demo)")
		}
	case ScenarioBlockage:
		for _, d := range targets {
			d.BlockageDetected = true
			d.EmergencyStop = true
			d.FlowStopped = true
			d.DropRate = 0
			d.BuzzerActive = true
			d.LEDStatus = "critical_red"
			d.Hardware = patchHardware(d.Hardware, "MPX5010 Pressure Sensor", models.StatusFault, "Abnormal pressure — blockage")
			e.raiseAlert(d, models.AlertBlockage, models.SeverityCritical, "Tube blockage detected — flow stopped (demo)")
		}
	case ScenarioAbnormalRate:
		for _, d := range targets {
			d.DropRate = e.settings.MaxDropRate * 1.4
			e.raiseAlert(d, models.AlertAbnormalRate, models.SeverityCritical, fmt.Sprintf("Drop rate %.0f drops/min exceeds max %.0f (demo)", d.DropRate, e.settings.MaxDropRate))
		}
	case ScenarioOffline:
		for _, d := range targets {
			d.Connectivity = models.ConnOffline
			d.Hardware = patchHardware(d.Hardware, "Wi-Fi", models.StatusOffline, "Connection lost")
			d.Hardware = patchHardware(d.Hardware, "ESP32", models.StatusWarning, "No heartbeat")
			e.raiseAlert(d, models.AlertDeviceOffline, models.SeverityWarning, "Device went offline (demo)")
		}
	case ScenarioSensorFail:
		for _, d := range targets {
			d.Hardware = patchHardware(d.Hardware, "Load Cell + HX711", models.StatusFault, "Sensor error")
			d.Hardware = patchHardware(d.Hardware, "TCRT5000 Drop Counter", models.StatusFault, "No signal")
			e.raiseAlert(d, models.AlertSensorFault, models.SeverityCritical, "Multiple sensor failures (demo)")
		}
	default:
		return fmt.Errorf("unknown scenario %q", name)
	}
	return nil
}

// ---------- internal ----------

func (e *Engine) loop() {
	for {
		select {
		case <-e.stop:
			return
		case <-e.ticker.C:
			e.tick()
		}
	}
}

func (e *Engine) tick() {
	e.mu.Lock()
	defer e.mu.Unlock()

	speed := float64(e.settings.SpeedMultiplier)
	// Each tick is 2 real seconds → 2*speed simulated seconds
	dtSec := 2.0 * speed

	for _, d := range e.devices {
		if d.Connectivity == models.ConnOffline || d.EmergencyStop || d.FlowStopped {
			// Still record history for offline/stopped devices
			e.appendHistory(d)
			continue
		}

		// Gradually converge drop rate toward target
		diff := d.TargetDropRate - d.DropRate
		d.DropRate += diff * 0.15
		d.DropRate = clamp(d.DropRate, 0, 200)

		// Add small plausible noise
		noise := (rand.Float64()*2 - 1) * 0.5
		d.DropRate = clamp(d.DropRate+noise, 0, 200)

		// Drops/min → mL/min using drop factor, then to volume consumed in dtSec
		mlPerMin := d.DropRate / e.settings.DropFactor
		consumed := mlPerMin * (dtSec / 60.0)
		d.FluidVolumeMl = clamp(d.FluidVolumeMl-consumed, 0, d.BagCapacityMl)

		// Pressure noise
		d.PressurePa = 120 + rand.Float64()*20 - 10

		e.recalc(d)
		e.checkThresholds(d)
		e.appendHistory(d)
	}
}

func (e *Engine) recalc(d *models.DeviceState) {
	d.FluidPct = (d.FluidVolumeMl / d.BagCapacityMl) * 100.0
	d.FluidPct = clamp(d.FluidPct, 0, 100)
	d.WeightGrams = d.EmptyBagWeight + d.FluidVolumeMl*1.0
	d.LastUpdate = time.Now()

	// Estimated time remaining
	if d.DropRate > 0 && d.FluidVolumeMl > 0 {
		mlPerMin := d.DropRate / e.settings.DropFactor
		if mlPerMin > 0 {
			t := (d.FluidVolumeMl / mlPerMin)
			d.EstTimeMinutes = &t
		} else {
			d.EstTimeMinutes = nil
		}
	} else {
		d.EstTimeMinutes = nil
	}

	// Servo angle: map drop rate to 0-180° linearly (demo model)
	d.ServoAngle = (d.TargetDropRate / 100.0) * 180.0
	d.ServoAngle = clamp(d.ServoAngle, 0, 180)
}

func (e *Engine) checkThresholds(d *models.DeviceState) {
	s := e.settings
	pct := d.FluidPct

	if pct <= 0 {
		d.DropRate = 0
		d.FlowStopped = true
		e.raiseAlert(d, models.AlertBagEmpty, models.SeverityCritical, "Bag empty — flow stopped automatically (demo)")
	} else if pct < s.CriticalFluidPct {
		e.raiseAlert(d, models.AlertCriticalFluid, models.SeverityCritical, fmt.Sprintf("Critical fluid level %.1f%% (demo)", pct))
		e.resolveAlert(d, models.AlertLowFluid)
	} else if pct < s.LowFluidPct {
		e.raiseAlert(d, models.AlertLowFluid, models.SeverityWarning, fmt.Sprintf("Low fluid level %.1f%% (demo)", pct))
		e.resolveAlert(d, models.AlertCriticalFluid)
	} else {
		e.resolveAlert(d, models.AlertLowFluid)
		e.resolveAlert(d, models.AlertCriticalFluid)
	}

	if d.DropRate > s.MaxDropRate {
		e.raiseAlert(d, models.AlertAbnormalRate, models.SeverityCritical, fmt.Sprintf("Drop rate %.0f exceeds max %.0f (demo)", d.DropRate, s.MaxDropRate))
	} else {
		e.resolveAlert(d, models.AlertAbnormalRate)
	}
}

func (e *Engine) raiseAlert(d *models.DeviceState, t models.AlertType, sev models.AlertSeverity, msg string) {
	key := d.ID + ":" + string(t)
	if e.alertSet[key] {
		return
	}
	e.alertSet[key] = true

	a := models.Alert{
		ID:        fmt.Sprintf("%s-%s-%d", d.ID, t, time.Now().UnixNano()),
		DeviceID:  d.ID,
		Type:      t,
		Severity:  sev,
		Message:   msg,
		Timestamp: time.Now(),
	}
	e.alerts = append([]models.Alert{a}, e.alerts...) // prepend newest
	d.Alerts = append([]models.Alert{a}, d.Alerts...)

	e.events = append(e.events, EventRecord{
		Timestamp: a.Timestamp,
		DeviceID:  d.ID,
		EventType: string(t),
		Severity:  string(sev),
		Message:   msg,
	})

	// Update LED / buzzer for critical
	if sev == models.SeverityCritical {
		d.BuzzerActive = true
		d.LEDStatus = "critical_red"
	}
}

func (e *Engine) resolveAlert(d *models.DeviceState, t models.AlertType) {
	key := d.ID + ":" + string(t)
	if !e.alertSet[key] {
		return
	}
	delete(e.alertSet, key)
	now := time.Now()

	for i := range e.alerts {
		if e.alerts[i].DeviceID == d.ID && e.alerts[i].Type == t && !e.alerts[i].Resolved {
			e.alerts[i].Resolved = true
			e.alerts[i].ResolvedAt = &now
		}
	}
	for i := range d.Alerts {
		if d.Alerts[i].Type == t && !d.Alerts[i].Resolved {
			d.Alerts[i].Resolved = true
			d.Alerts[i].ResolvedAt = &now
		}
	}
}

func (e *Engine) appendHistory(d *models.DeviceState) {
	r := models.Reading{
		Timestamp:     time.Now(),
		FluidPct:      d.FluidPct,
		FluidVolumeMl: d.FluidVolumeMl,
		WeightGrams:   d.WeightGrams,
		DropRate:      d.DropRate,
		ServoAngle:    d.ServoAngle,
		PressurePa:    d.PressurePa,
	}
	d.History = append(d.History, r)
	if len(d.History) > maxHistory {
		d.History = d.History[len(d.History)-maxHistory:]
	}
}

func (e *Engine) restoreDevice(d *models.DeviceState) {
	d.BubbleDetected = false
	d.BlockageDetected = false
	d.EmergencyStop = false
	d.FlowStopped = false
	d.BuzzerActive = false
	d.LEDStatus = "normal_green"
	d.Connectivity = models.ConnOnline
	d.FluidVolumeMl = d.BagCapacityMl * 0.8
	d.TargetDropRate = 40
	d.DropRate = 40
	d.Hardware = defaultHardware()
	// Clear device alerts
	d.Alerts = nil
	// Clear global alert dedup for this device
	for k := range e.alertSet {
		if len(k) > len(d.ID) && k[:len(d.ID)] == d.ID {
			delete(e.alertSet, k)
		}
	}
	e.recalc(d)
}

func (e *Engine) findDevice(id string) *models.DeviceState {
	for _, d := range e.devices {
		if d.ID == id {
			return d
		}
	}
	return nil
}

func (e *Engine) targetDevices(id string) []*models.DeviceState {
	if id == "" || id == "all" {
		return e.devices
	}
	d := e.findDevice(id)
	if d != nil {
		return []*models.DeviceState{d}
	}
	return nil
}

// ---------- helpers ----------

func clamp(v, lo, hi float64) float64 {
	return math.Max(lo, math.Min(hi, v))
}

func patchHardware(hw []models.HardwareComponent, name string, status models.HardwareStatus, note string) []models.HardwareComponent {
	for i, c := range hw {
		if c.Name == name {
			hw[i].Status = status
			hw[i].Note = note
			return hw
		}
	}
	return hw
}

func defaultHardware() []models.HardwareComponent {
	names := []string{
		"ESP32", "Load Cell + HX711", "TCRT5000 Drop Counter",
		"IR Bubble Detector", "MPX5010 Pressure Sensor", "SG90 Servo",
		"OLED Display", "Buzzer", "WS2812B LED Strip", "Wi-Fi", "Cloud API",
		"Battery",
	}
	hw := make([]models.HardwareComponent, len(names))
	for i, n := range names {
		hw[i] = models.HardwareComponent{Name: n, Status: models.StatusOK}
	}
	return hw
}

func initDevices(s models.SimSettings) []*models.DeviceState {
	seeds := []struct {
		id    string
		label string
		bed   string
		vol   float64
		rate  float64
	}{
		{"IV-001", "Patient Alpha", "Bed A-01", s.DefaultBagCapMl * 0.85, 40},
		{"IV-002", "Patient Beta", "Bed A-02", s.DefaultBagCapMl * 0.60, 35},
		{"IV-003", "Patient Gamma", "Bed B-01", s.DefaultBagCapMl * 0.30, 50},
	}

	devs := make([]*models.DeviceState, len(seeds))
	for i, seed := range seeds {
		d := &models.DeviceState{
			ID:             seed.id,
			Label:          seed.label,
			BedNumber:      seed.bed,
			BagCapacityMl:  s.DefaultBagCapMl,
			FluidVolumeMl:  seed.vol,
			EmptyBagWeight: 50,
			DropRate:       seed.rate,
			TargetDropRate: seed.rate,
			Connectivity:   models.ConnOnline,
			LEDStatus:      "normal_green",
			OLEDStatus:     "active",
			Hardware:       defaultHardware(),
		}
		d.FluidPct = (d.FluidVolumeMl / d.BagCapacityMl) * 100
		d.WeightGrams = d.EmptyBagWeight + d.FluidVolumeMl
		d.PressurePa = 125
		t := d.FluidVolumeMl / (d.DropRate / s.DropFactor)
		d.EstTimeMinutes = &t
		d.ServoAngle = (d.TargetDropRate / 100.0) * 180.0

		// Seed some historical readings
		now := time.Now()
		for j := maxHistory / 4; j >= 0; j-- {
			ts := now.Add(time.Duration(-j*2) * time.Second)
			pct := clamp(d.FluidPct+(float64(j)*0.02), 0, 100)
			d.History = append(d.History, models.Reading{
				Timestamp:     ts,
				FluidPct:      pct,
				FluidVolumeMl: pct / 100 * d.BagCapacityMl,
				WeightGrams:   d.EmptyBagWeight + (pct / 100 * d.BagCapacityMl),
				DropRate:      seed.rate + (rand.Float64()*4 - 2),
				ServoAngle:    d.ServoAngle,
				PressurePa:    120 + rand.Float64()*10,
			})
		}

		devs[i] = d
	}
	return devs
}
