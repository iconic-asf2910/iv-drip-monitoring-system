package simulation

type Scenario string

const (
	ScenarioNormal       Scenario = "normal"
	ScenarioLowFluid     Scenario = "low-fluid"
	ScenarioCritical     Scenario = "critical-fluid"
	ScenarioAirBubble    Scenario = "air-bubble"
	ScenarioBlockage     Scenario = "blockage"
	ScenarioAbnormalRate Scenario = "abnormal-rate"
	ScenarioOffline      Scenario = "offline"
	ScenarioSensorFail   Scenario = "sensor-failure"
)
