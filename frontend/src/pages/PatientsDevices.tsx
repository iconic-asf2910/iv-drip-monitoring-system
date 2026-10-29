import React, { useState } from 'react';
import { BedDouble, Search, QrCode, ExternalLink, Activity, ShieldAlert } from 'lucide-react';
import { DeviceState } from '../api';
import { QRCodeModal } from '../components/QRCodeModal';

interface PatientsDevicesProps {
  devices: DeviceState[];
}

export const PatientsDevices: React.FC<PatientsDevicesProps> = ({ devices }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical' | 'offline'>('all');
  const [qrDevice, setQrDevice] = useState<DeviceState | null>(null);

  const filtered = devices.filter(d => {
    const matchText = `${d.id} ${d.label} ${d.bedNumber}`.toLowerCase();
    if (search && !matchText.includes(search.toLowerCase())) return false;

    const activeAlerts = d.alerts.filter(a => !a.resolved);
    const hasCrit = activeAlerts.some(a => a.severity === 'critical');
    const hasWarn = activeAlerts.some(a => a.severity === 'warning');

    if (filterStatus === 'normal' && (hasCrit || hasWarn || d.connectivity === 'offline')) return false;
    if (filterStatus === 'warning' && !hasWarn) return false;
    if (filterStatus === 'critical' && !hasCrit) return false;
    if (filterStatus === 'offline' && d.connectivity !== 'offline') return false;

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BedDouble className="w-6 h-6 text-blue-600" />
            Patients & Devices Directory
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage monitored hospital beds, infusion pump hardware IDs, and QR access tags.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, bed, or patient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'normal', 'warning', 'critical', 'offline'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
              filterStatus === st
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {st} ({st === 'all' ? devices.length : devices.filter(d => {
              const active = d.alerts.filter(a => !a.resolved);
              const crit = active.some(a => a.severity === 'critical');
              const warn = active.some(a => a.severity === 'warning');
              if (st === 'normal') return !crit && !warn && d.connectivity !== 'offline';
              if (st === 'warning') return warn;
              if (st === 'critical') return crit;
              if (st === 'offline') return d.connectivity === 'offline';
              return true;
            }).length})
          </button>
        ))}
      </div>

      {/* Device Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((d) => {
          const activeAlerts = d.alerts.filter(a => !a.resolved);
          const hasCrit = activeAlerts.some(a => a.severity === 'critical');
          const hasWarn = activeAlerts.some(a => a.severity === 'warning');

          return (
            <div key={d.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                    {d.id}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    d.connectivity === 'offline' ? 'bg-slate-100 text-slate-600' :
                    hasCrit ? 'bg-rose-100 text-rose-700' :
                    hasWarn ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {d.connectivity === 'offline' ? 'Offline' : hasCrit ? 'Critical' : hasWarn ? 'Warning' : 'Normal'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{d.label}</h3>
                <p className="text-xs text-slate-500 font-medium">{d.bedNumber} — Infusion Pump Unit</p>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                      <span>Fluid Remaining</span>
                      <span>{Math.round(d.fluidPct)}% ({Math.round(d.fluidVolumeMl)} mL)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.fluidPct <= 10 ? 'bg-rose-600' : d.fluidPct <= 40 ? 'bg-amber-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.max(0, Math.min(100, d.fluidPct))}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block">Drop Rate</span>
                      <span className="font-bold text-slate-900 text-sm font-mono">{Math.round(d.dropRate)} <span className="text-xs font-normal text-slate-500">d/m</span></span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block">Bag Weight</span>
                      <span className="font-bold text-slate-900 text-sm font-mono">{Math.round(d.weightGrams)} g</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setQrDevice(d)}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors shadow-sm"
                >
                  <QrCode className="w-4 h-4 text-blue-600" />
                  QR Code
                </button>

                <a
                  href={`/monitoring?device=${d.id}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-colors"
                >
                  <Activity className="w-4 h-4" />
                  Monitor
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {qrDevice && (
        <QRCodeModal
          deviceId={qrDevice.id}
          label={qrDevice.label}
          bedNumber={qrDevice.bedNumber}
          isOpen={true}
          onClose={() => setQrDevice(null)}
        />
      )}
    </div>
  );
};
