import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Droplets,
  Gauge,
  Clock,
  ShieldAlert,
  Cpu,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DeviceState, api } from '../api';

interface DeviceMonitoringProps {
  devices: DeviceState[];
  onRefresh: () => void;
}

export const DeviceMonitoring: React.FC<DeviceMonitoringProps> = ({ devices, onRefresh }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const deviceIdParam = searchParams.get('device') || devices[0]?.id || 'IV-001';
  const selectedDevice = devices.find(d => d.id === deviceIdParam) || devices[0];

  const [targetRate, setTargetRate] = useState<number>(selectedDevice?.targetDropRate || 40);
  const [loading, setLoading] = useState(false);

  if (!selectedDevice) {
    return <div className="p-6 text-slate-500">No devices available.</div>;
  }

  const handleDeviceSelect = (id: string) => {
    setSearchParams({ device: id });
    const dev = devices.find(d => d.id === id);
    if (dev) setTargetRate(dev.targetDropRate);
  };

  const handleUpdateRate = async (newRate: number) => {
    setTargetRate(newRate);
    setLoading(true);
    try {
      await api.deviceControl(selectedDevice.id, { targetDropRate: newRate });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const chartData = selectedDevice.history?.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    fluidPct: Math.round(h.fluidPct),
    dropRate: Math.round(h.dropRate),
    pressure: Math.round(h.pressurePa),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header & Device Switcher */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Individual Device Monitoring
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Detailed sensor telemetry and actuator status for {selectedDevice.id} — {selectedDevice.label} ({selectedDevice.bedNumber})
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Select Bed:</span>
          <select
            value={selectedDevice.id}
            onChange={(e) => handleDeviceSelect(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {devices.map(d => (
              <option key={d.id} value={d.id}>
                {d.id} — {d.label} ({d.bedNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Critical Alerts Banner for this device if any */}
      {selectedDevice.alerts.filter(a => !a.resolved).length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-600 animate-pulse shrink-0" />
            <div>
              <h4 className="font-bold text-rose-900 text-sm">Active Alerts on {selectedDevice.id}</h4>
              <p className="text-xs text-rose-700">
                {selectedDevice.alerts.filter(a => !a.resolved).map(a => a.message).join(' | ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Fluid Level</div>
          <div className="text-2xl font-bold text-slate-900 mt-2 flex items-baseline justify-between">
            {Math.round(selectedDevice.fluidPct)}%
            <span className="text-xs font-mono text-slate-500">{Math.round(selectedDevice.fluidVolumeMl)} / {selectedDevice.bagCapacityMl} mL</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${selectedDevice.fluidPct <= 10 ? 'bg-rose-600' : selectedDevice.fluidPct <= 40 ? 'bg-amber-500' : 'bg-blue-600'}`}
              style={{ width: `${Math.max(0, Math.min(100, selectedDevice.fluidPct))}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Drop Rate (Measured)</div>
          <div className="text-2xl font-bold text-blue-600 mt-2 flex items-baseline justify-between">
            {Math.round(selectedDevice.dropRate)} <span className="text-xs font-normal text-slate-500">drops/min</span>
            <Gauge className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-3 text-xs text-slate-500 flex justify-between">
            <span>Target: {Math.round(selectedDevice.targetDropRate)} d/m</span>
            <span>Servo: {Math.round(selectedDevice.servoAngle)}°</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Estimated Time Remaining</div>
          <div className="text-2xl font-bold text-slate-900 mt-2 flex items-baseline justify-between">
            {selectedDevice.estTimeMinutes != null && !isNaN(selectedDevice.estTimeMinutes) ? `${Math.floor(selectedDevice.estTimeMinutes)} mins` : 'Stopped'}
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Based on current drop factor (20 drops/mL)
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bag Weight (HX711)</div>
          <div className="text-2xl font-bold text-slate-900 mt-2 flex items-baseline justify-between">
            {Math.round(selectedDevice.weightGrams)} g
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Load Cell OK</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Pressure: {Math.round(selectedDevice.pressurePa)} Pa
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            Fluid Level Trend (%)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="fluidPct" stroke="#2563eb" strokeWidth={2} dot={false} name="Fluid %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-600" />
            Drop Rate & Flow Trend (drops/min)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 120]} />
                <Tooltip />
                <Line type="monotone" dataKey="dropRate" stroke="#16a34a" strokeWidth={2} dot={false} name="Drop Rate" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hardware Status Panel */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-900 text-base mb-1 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-600" />
          Hardware Component Health Status (Simulated ESP32 & Peripherals)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Real-time status of embedded sensors and actuators connected to the microcontroller unit.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {selectedDevice.hardware.map((hw, idx) => (
            <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">{hw.name}</span>
                <span className="text-[10px] text-slate-500">{hw.note || 'Operational'}</span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                hw.status === 'ok' ? 'bg-emerald-500' :
                hw.status === 'warning' ? 'bg-amber-500' :
                hw.status === 'offline' ? 'bg-slate-400' :
                'bg-rose-500 animate-ping'
              }`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
