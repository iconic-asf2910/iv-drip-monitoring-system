import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
  Droplets,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ChevronRight,
  Clock,
  Gauge
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { DeviceState, api } from '../api';
import { QRCodeModal } from '../components/QRCodeModal';

interface OverviewDashboardProps {
  devices: DeviceState[];
  alerts: any[];
  running: boolean;
  speed: number;
  onRefresh: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ devices, alerts, running, speed, onRefresh }) => {
  const [selectedQRDevice, setSelectedQRDevice] = useState<DeviceState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Summary metrics
  const totalDevices = devices.length;
  const normalDevices = devices.filter(d => d.connectivity === 'online' && !d.emergencyStop && d.alerts.filter(a => !a.resolved).length === 0).length;
  const warningDevices = devices.filter(d => d.alerts.some(a => !a.resolved && a.severity === 'warning')).length;
  const criticalAlerts = alerts.filter(a => !a.resolved && a.severity === 'critical').length;
  const offlineDevices = devices.filter(d => d.connectivity === 'offline').length;

  const avgFluid = totalDevices > 0
    ? Math.round(devices.reduce((acc, d) => acc + d.fluidPct, 0) / totalDevices)
    : 0;

  const handleToggleSim = async () => {
    setActionLoading(true);
    try {
      if (running) {
        await api.pauseSim();
      } else {
        await api.startSim();
      }
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetSim = async () => {
    if (!window.confirm('Reset all simulation state to defaults?')) return;
    setActionLoading(true);
    try {
      await api.resetSim();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSpeedChange = async (newSpeed: number) => {
    setActionLoading(true);
    try {
      await api.speed(newSpeed);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Prepare chart data from first device or combined average
  const chartData = devices[0]?.history?.slice(-30).map((h, i) => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    'Device 1 (%)': Math.round(h.fluidPct),
    'Device 1 Rate': Math.round(h.dropRate),
    'Device 2 (%)': Math.round(devices[1]?.history[i]?.fluidPct || 0),
    'Device 3 (%)': Math.round(devices[2]?.history[i]?.fluidPct || 0),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Banner with Simulation Controls */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Live Clinical IoT Overview
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time multi-channel IV infusion monitoring & simulation engine control.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleSpeedChange(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${speed === 1 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              1x
            </button>
            <button
              onClick={() => handleSpeedChange(10)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${speed === 10 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              10x
            </button>
            <button
              onClick={() => handleSpeedChange(60)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${speed === 60 ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              60x
            </button>
          </div>

          <button
            onClick={handleToggleSim}
            disabled={actionLoading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md transition-all ${
              running
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? 'Pause Sim' : 'Start Sim'}
          </button>

          <button
            onClick={handleResetSim}
            disabled={actionLoading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Devices</div>
          <div className="text-2xl font-bold text-slate-900 mt-2 flex items-baseline justify-between">
            {totalDevices}
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Active</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Normal Operation</div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 flex items-baseline justify-between">
            {normalDevices}
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Warnings</div>
          <div className="text-2xl font-bold text-amber-500 mt-2 flex items-baseline justify-between">
            {warningDevices}
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Critical Alerts</div>
          <div className="text-2xl font-bold text-rose-600 mt-2 flex items-baseline justify-between">
            {criticalAlerts}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${criticalAlerts > 0 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
              {criticalAlerts > 0 ? 'Attention' : 'None'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Fluid Level</div>
          <div className="text-2xl font-bold text-blue-600 mt-2 flex items-baseline justify-between">
            {avgFluid}%
            <Droplets className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Offline Devices</div>
          <div className="text-2xl font-bold text-slate-400 mt-2 flex items-baseline justify-between">
            {offlineDevices}
            <WifiOff className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Live Device Overview Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Connected Infusion Pumps</h3>
          <span className="text-xs text-slate-500 font-medium">Auto-polling every 2s</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4">Device / Bed</th>
                <th className="p-4">Patient Label</th>
                <th className="p-4">Fluid Level</th>
                <th className="p-4">Volume Remaining</th>
                <th className="p-4">Drop Rate</th>
                <th className="p-4">Est. Time</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {devices.map((d) => {
                const activeAlerts = d.alerts.filter(a => !a.resolved);
                const hasCritical = activeAlerts.some(a => a.severity === 'critical');
                const hasWarning = activeAlerts.some(a => a.severity === 'warning');

                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-medium text-slate-900 flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${d.connectivity === 'offline' ? 'bg-slate-400' : hasCritical ? 'bg-rose-500 animate-ping' : hasWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <div>
                        <div>{d.id}</div>
                        <div className="text-xs text-slate-500 font-normal">{d.bedNumber}</div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-800 font-medium">{d.label}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${d.fluidPct <= 10 ? 'bg-rose-600' : d.fluidPct <= 40 ? 'bg-amber-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.max(0, Math.min(100, d.fluidPct))}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-10 text-right">{Math.round(d.fluidPct)}%</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs">{Math.round(d.fluidVolumeMl)} mL / {d.bagCapacityMl} mL</td>
                    <td className="p-4 font-mono text-xs font-semibold">
                      {Math.round(d.dropRate)} <span className="text-slate-400 font-normal">drops/min</span>
                    </td>
                    <td className="p-4 text-xs">
                      {d.estTimeMinutes != null && !isNaN(d.estTimeMinutes) ? (
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {Math.floor(d.estTimeMinutes)} mins
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Stopped</span>
                      )}
                    </td>
                    <td className="p-4">
                      {d.connectivity === 'offline' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">Offline</span>
                      ) : hasCritical ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">Critical Alert</span>
                      ) : hasWarning ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">Warning</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Normal</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedQRDevice(d)}
                          className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                        >
                          QR Code
                        </button>
                        <a
                          href={`/monitoring?device=${d.id}`}
                          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm"
                        >
                          Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-600" />
            Fluid Level History (%)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Device 1 (%)" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Device 2 (%)" stroke="#16a34a" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Device 3 (%)" stroke="#d97706" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-600" />
            Infusion Drop Rate (drops/min)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 120]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Device 1 Rate" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {selectedQRDevice && (
        <QRCodeModal
          deviceId={selectedQRDevice.id}
          label={selectedQRDevice.label}
          bedNumber={selectedQRDevice.bedNumber}
          isOpen={true}
          onClose={() => setSelectedQRDevice(null)}
        />
      )}
    </div>
  );
};
