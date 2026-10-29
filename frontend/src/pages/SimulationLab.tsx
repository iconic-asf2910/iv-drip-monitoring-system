import React, { useState } from 'react';
import { FlaskConical, Play, Pause, RotateCcw, ShieldAlert, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { api, DeviceState } from '../api';

interface SimulationLabProps {
  devices: DeviceState[];
  running: boolean;
  speed: number;
  onRefresh: () => void;
}

export const SimulationLab: React.FC<SimulationLabProps> = ({ devices, running, speed, onRefresh }) => {
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const triggerScenario = async (name: string, label: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      await api.scenario(name, selectedDevice);
      setFeedback(`Successfully triggered scenario: ${label}`);
      onRefresh();
    } catch (e: any) {
      setFeedback(`Error: ${e.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const scenarios = [
    { key: 'normal', label: 'Normal Operation', desc: 'Restore healthy infusion rate and fluid level', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
    { key: 'low-fluid', label: 'Low Fluid Warning', desc: 'Set fluid level to 25% (Warning threshold)', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
    { key: 'critical-fluid', label: 'Critical Fluid / Near Empty', desc: 'Set fluid level to 7% (Critical threshold)', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
    { key: 'air-bubble', label: 'Air Bubble Detected', desc: 'Simulate IR bubble sensor fault & emergency stop', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
    { key: 'blockage', label: 'Tube Blockage / Occlusion', desc: 'Simulate pressure spike & pinch valve closure', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
    { key: 'abnormal-rate', label: 'Abnormal Drip Rate', desc: 'Spike drop rate above safe maximum limit', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
    { key: 'offline', label: 'Device Offline', desc: 'Simulate ESP32 Wi-Fi disconnect and heartbeat loss', color: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' },
    { key: 'sensor-failure', label: 'Sensor Fault (HX711)', desc: 'Simulate load cell and drop counter sensor failure', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-blue-600" />
            Simulation Control Lab
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Instantly inject hardware faults, clinical scenarios, and sensor anomalies for demonstration.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Target Device:</span>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800"
          >
            <option value="all">All Devices (Global)</option>
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.id} — {d.label}</option>
            ))}
          </select>
        </div>
      </div>

      {feedback && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-sm font-medium text-blue-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Scenario Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenarios.map((sc) => (
          <button
            key={sc.key}
            onClick={() => triggerScenario(sc.key, sc.label)}
            disabled={loading}
            className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all shadow-sm hover:shadow-md ${sc.color}`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-base">{sc.label}</span>
                <Zap className="w-4 h-4 opacity-70" />
              </div>
              <p className="text-xs opacity-80 leading-relaxed">{sc.desc}</p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold underline underline-offset-4">
              <span>Trigger Scenario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
