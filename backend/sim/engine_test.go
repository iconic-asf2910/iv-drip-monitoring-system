package simulation

import (
	"testing"
)

func TestEngineInitialization(t *testing.T) {
	eng := NewEngine()
	snap := eng.Snapshot()

	if len(snap.Devices) != 3 {
		t.Errorf("Expected 3 devices, got %d", len(snap.Devices))
	}
	if snap.Devices[0].ID != "IV-001" {
		t.Errorf("Expected device IV-001, got %s", snap.Devices[0].ID)
	}
	if snap.Devices[0].FluidPct <= 0 {
		t.Errorf("Expected positive fluid percentage, got %f", snap.Devices[0].FluidPct)
	}
}

func TestControlDevice(t *testing.T) {
	eng := NewEngine()
	target := 60.0
	angle := 108.0

	err := eng.ControlDevice("IV-001", &target, &angle)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	dev, found := eng.GetDevice("IV-001")
	if !found {
		t.Fatalf("Device not found")
	}
	if dev.TargetDropRate != 60.0 {
		t.Errorf("Expected target drop rate 60, got %f", dev.TargetDropRate)
	}
}

func TestScenarioApplication(t *testing.T) {
	eng := NewEngine()
	err := eng.ApplyScenario(string(ScenarioLowFluid), "IV-001")
	if err != nil {
		t.Fatalf("Unexpected error applying scenario: %v", err)
	}

	dev, _ := eng.GetDevice("IV-001")
	if dev.FluidPct > 30 {
		t.Errorf("Expected low fluid pct <= 30, got %f", dev.FluidPct)
	}
}
