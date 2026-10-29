package models

import "time"

// SimulationSpeed multiplier
type SimSpeed float64

const (
	Speed1x  SimSpeed = 1.0
	Speed10x SimSpeed = 10.0
	Speed60x SimSpeed = 60.0
)

// HardwareComponent represents a simulated hardware component's state
type HardwareStatus string

const (
	StatusOK      HardwareStatus = "ok"
	StatusWarning HardwareStatus = "warning"
	StatusFault   HardwareStatus = "fault"
	StatusOffline HardwareStatus = "offline"
)

type HardwareComponent struct {
	Name   string         `json:"name"`
	Status HardwareStatus `json:"status"`
	Note   string         `json:"note,omitempty"`
}

type AlertSeverity string

const (
	SeverityInfo     AlertSeverity = "info"
	SeverityWarning  AlertSeverity = "warning"
	SeverityCritical AlertSeverity = "critical"
)

type AlertType string

const (
	AlertLowFluid      AlertType = "LOW_FLUID"
	AlertCriticalFluid AlertType = "CRITICAL_FLUID"
	AlertAirBubble     AlertType = "AIR_BUBBLE"
	AlertBlockage      AlertType = "BLOCKAGE"
	AlertAbnormalRate  AlertType = "ABNORMAL_RATE"
	AlertDeviceOffline AlertType = "DEVICE_OFFLINE"
	AlertSensorFault   AlertType = "SENSOR_FAULT"
	AlertBagEmpty      AlertType = "BAG_EMPTY"
)

type Alert struct {
	ID           string        `json:"id"`
	DeviceID     string        `json:"deviceId"`
	Type         AlertType     `json:"type"`
	Severity     AlertSeverity `json:"severity"`
	Message      string        `json:"message"`
	Timestamp    time.Time     `json:"timestamp"`
	Acknowledged bool          `json:"acknowledged"`
	Resolved     bool          `json:"resolved"`
	ResolvedAt   *time.Time    `json:"resolvedAt,omitempty"`
}

type ConnStatus string

const (
	ConnOnline  ConnStatus = "online"
	ConnOffline ConnStatus = "offline"
)

type Reading struct {
	Timestamp     time.Time `json:"timestamp"`
	FluidPct      float64   `json:"fluidPct"`
	FluidVolumeMl float64   `json:"fluidVolumeMl"`
	WeightGrams   float64   `json:"weightGrams"`
	DropRate      float64   `json:"dropRate"`
	ServoAngle    float64   `json:"servoAngle"`
	PressurePa    float64   `json:"pressurePa"`
}

type DeviceState struct {
	ID               string              `json:"id"`
	Label            string              `json:"label"`
	BedNumber        string              `json:"bedNumber"`
	BagCapacityMl    float64             `json:"bagCapacityMl"`
	FluidVolumeMl    float64             `json:"fluidVolumeMl"`
	FluidPct         float64             `json:"fluidPct"`
	WeightGrams      float64             `json:"weightGrams"`
	EmptyBagWeight   float64             `json:"emptyBagWeight"`
	DropRate         float64             `json:"dropRate"`
	TargetDropRate   float64             `json:"targetDropRate"`
	ServoAngle       float64             `json:"servoAngle"`
	PressurePa       float64             `json:"pressurePa"`
	BubbleDetected   bool                `json:"bubbleDetected"`
	BlockageDetected bool                `json:"blockageDetected"`
	FlowStopped      bool                `json:"flowStopped"`
	Connectivity     ConnStatus          `json:"connectivity"`
	Hardware         []HardwareComponent `json:"hardware"`
	Alerts           []Alert             `json:"alerts"`
	History          []Reading           `json:"history"`
	EstTimeMinutes   *float64            `json:"estTimeMinutes"`
	LastUpdate       time.Time           `json:"lastUpdate"`
	EmergencyStop    bool                `json:"emergencyStop"`
	BuzzerActive     bool                `json:"buzzerActive"`
	LEDStatus        string              `json:"ledStatus"`
	OLEDStatus       string              `json:"oledStatus"`
}

type SimSettings struct {
	LowFluidPct      float64  `json:"lowFluidPct"`
	CriticalFluidPct float64  `json:"criticalFluidPct"`
	MinDropRate      float64  `json:"minDropRate"`
	MaxDropRate      float64  `json:"maxDropRate"`
	DropFactor       float64  `json:"dropFactor"` // drops/mL
	DefaultBagCapMl  float64  `json:"defaultBagCapMl"`
	SpeedMultiplier  SimSpeed `json:"speedMultiplier"`
}

func DefaultSettings() SimSettings {
	return SimSettings{
		LowFluidPct:      40.0,
		CriticalFluidPct: 10.0,
		MinDropRate:      10.0,
		MaxDropRate:      100.0,
		DropFactor:       20.0,
		DefaultBagCapMl:  500.0,
		SpeedMultiplier:  Speed1x,
	}
}

type SimStatus struct {
	Running bool     `json:"running"`
	Speed   SimSpeed `json:"speed"`
}

type AppState struct {
	Devices  []*DeviceState `json:"devices"`
	Alerts   []Alert        `json:"alerts"`
	Settings SimSettings    `json:"settings"`
	Sim      SimStatus      `json:"simulation"`
}
