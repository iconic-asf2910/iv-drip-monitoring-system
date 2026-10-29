import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sliders, Settings, Droplets, Play, Pause, RotateCcw, Gauge, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DeviceState, api } from '../api';

interface FlowControlProps {
  devices: DeviceState[];
  onRefresh: () => void;
}

export const FlowControl: React.FC<FlowControlProps> = ({ devices, onRefresh }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const deviceIdParam = searchParams.get('device') || devices[0]?.id || 'IV-001';
  const selectedDevice = devices.find(d => d.id === deviceIdParam) || devices[0];

  const [targetRate, setTargetRate] = useState<number>(selectedDevice?.targetDropRate || 40);
  const [servoAngle, setServoAngle] = useState<number>(selectedDevice?.servoAngle || 90);
  const [loading, setLoading] = useState(false);

  const handleDeviceSelect = (id: string) => {
    setSearchParams({ device: id });
    const dev = devices.find(d => d.id === id);
    if (dev) {
      setTargetRate(dev.targetDropRate);
      setServoAngle(dev.servoAngle);
    }
  };

  const handleRateChange = async (newRate: number) => {
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

  const handleServoChange = async (angle: number) => {
    setServoAngle(angle);
    setLoading(true);
    try {
      await api.deviceControl(selectedDevice.id, { servoAngle: angle });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const chartData = selectedDevice.history?.filter((h, i) => i % 4 === 0).map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    'Actual Rate': Math.round(h.dropRate),
    'Target Rate': Math.round(selectedDevice.targetDropRate),
  })) || [];

  const hasActiveAlerts = selectedDevice.alerts.filter(a => !a.resolved).length > 0;

  return (
    <div className="space-y-6">
      {/* Header & Device Switcher */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-blue-600" />
            Flow Control Interface
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Target drop rate, servo positioning, and actuator commands for {selectedDevice.id}.
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

      {/* Alert Warning */}
      {hasActiveAlerts && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-amber-800">Active Alerts</span>
            <span className="text-amber-700 ml-2">
              {selectedDevice.alerts.filter(a => !a.resolved && a.severity === 'critical').length} critical,{' '}
              {selectedDevice.alerts.filter(a => !a.resolved && a.severity === 'warning').length} warning
            </span>
          </div>
        </div>
      )}

      {/* Control Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Target Rate Control */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                Target Infusion Rate
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Adjust the desired drops per minute</p>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">Current Measured</div>
              <div className="text-2xl font-bold text-blue-600 font-mono">
                {Math.round(selectedDevice.dropRate)} <span className="text-xs font-normal text-slate-500">/m</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="range"
              min="0"
              max="100"
              value={targetRate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              disabled={loading}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">0 d/m</span>
              <span className="text-xs font-semibold text-blue-600">Target: {Math.round(targetRate)} d/m</span>
              <span className="text-xs text-slate-600 font-medium">100 d/m</span>
            </div>

            {/* Actual vs Target Comparison */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mt-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">Flow Rate Comparison</div>
              <div className="h-10 w-full bg-white rounded-lg flex items-center px-3 border border-slate-200 relative">
                <div className="h-6 bg-blue-600 rounded-lg" style={{ width: `${Math.min(100, (selectedDevice.dropRate / selectedDevice.targetDropRate) * 100)}%` }}></div>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white mix-blend-difference">
                  {selectedDevice.dropRate >= selectedDevice.targetDropRate && selectedDevice.targetDropRate > 0
                    ? '✓'
                    : '→'}
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
                <span>Actual</span>
                <span>Target</span>
              </div>
            </div>
          </div>
        </div>

        {/* Servo Control */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Gauge className="w-5 h-5 text-blue-600" />
                Servo Motor Control
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Adjust roller clamp position</p>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="range"
              min="0"
              max="180"
              value={servoAngle}
              onChange={(e) => handleServoChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              disabled={loading}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">0° (Closed)</span>
              <span className="text-xs font-semibold text-blue-600">Servo: {Math.round(servoAngle)}°</span>
              <span className="text-xs text-slate-600 font-medium">180° (Open)</span>
            </div>

            {/* Visual Servo Indicator */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-700 mb-2">Current Position</div>
              <div className="h-8 w-full bg-slate-200 rounded-full flex items-center justify-center relative">
                <div
                  className="absolute h-12 w-12 rounded-full bg-blue-600 border-4 border-blue-200 shadow-lg shadow-blue-600/30"
                  style={{ left: `calc(${Math.max(0, Math.min(180, servoAngle))} / 180 * 100% - 24px)` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                <span>Closed</span>
                <span>Open</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flow Rate Chart */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Actual vs Target Drop Rate Over Time (drops/min)
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 120]} />
              <Tooltip />
              <Line type="monotone" dataKey="Actual Rate" stroke="#2563eb" strokeWidth={2} dot={false} name="Actual" />
              <Line type="monotone" dataKey="Target Rate" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Target" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
