import React from 'react';
import { FileText, Download, Activity, Droplets, CheckCircle2 } from 'lucide-react';
import { api, DeviceState } from '../api';

interface ReportsPageProps {
  devices: DeviceState[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ devices }) => {
  const downloadCsv = () => {
    window.open(api.eventsCsv(), '_blank');
  };

  const totalEvents = devices.reduce((acc, d) => acc + d.alerts.length, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Clinical Reports & CSV Export
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Download event logs and review session telemetry summaries for reporting and auditing.
          </p>
        </div>

        <button
          onClick={downloadCsv}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Event CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Monitored Devices</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{devices.length}</div>
          <p className="text-xs text-slate-400 mt-1">Active IoT simulation endpoints</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Total Recorded Events</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{totalEvents}</div>
          <p className="text-xs text-slate-400 mt-1">Alerts, warnings & state changes</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Simulation State</div>
          <div className="text-3xl font-bold text-emerald-600 mt-2 flex items-center gap-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            Ready
          </div>
          <p className="text-xs text-slate-400 mt-1">Exportable in standard CSV format</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Session Summary</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          This simulation report compiles all sensor readings, fluid consumption metrics, drop rate adjustments, and critical alert logs across all connected infusion pump channels. The exported CSV file can be opened in spreadsheet software or used for engineering analysis and academic presentation.
        </p>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-mono">
          Endpoint: {api.eventsCsv()}
        </div>
      </div>
    </div>
  );
};
