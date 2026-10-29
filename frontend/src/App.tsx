import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DemoBadge } from './components/DemoBadge';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { PatientsDevices } from './pages/PatientsDevices';
import { DeviceMonitoring } from './pages/DeviceMonitoring';
import { FlowControl } from './pages/FlowControl';
import { AlertsEvents } from './pages/AlertsEvents';
import { ReportsPage } from './pages/ReportsPage';
import { SimulationLab } from './pages/SimulationLab';
import { SettingsPage } from './pages/SettingsPage';
import { api, DeviceState } from './api';
import { AlertCircle } from 'lucide-react';

export function App() {
  const [devices, setDevices] = useState<DeviceState[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const data = await api.state();
      setDevices(data.devices);
      setAlerts(data.alerts);
      setRunning(data.simulation.running);
      setSpeed(data.simulation.speed);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <DemoBadge />

        {error && (
          <div className="bg-rose-600 text-white px-4 py-2 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Backend connection error: {error}. Please ensure Go server is running on port 8080.</span>
            <button
              onClick={fetchData}
              className="ml-4 px-2.5 py-1 bg-white text-rose-700 rounded-md font-semibold text-xs hover:bg-rose-50 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <Sidebar running={running} speed={speed} />

          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <Routes>
              <Route path="/" element={<OverviewDashboard devices={devices} alerts={alerts} running={running} speed={speed} onRefresh={fetchData} />} />
              <Route path="/devices" element={<PatientsDevices devices={devices} />} />
              <Route path="/monitoring" element={<DeviceMonitoring devices={devices} onRefresh={fetchData} />} />
              <Route path="/control" element={<FlowControl devices={devices} onRefresh={fetchData} />} />
              <Route path="/alerts" element={<AlertsEvents alerts={alerts} onRefresh={fetchData} />} />
              <Route path="/reports" element={<ReportsPage devices={devices} />} />
              <Route path="/simulation" element={<SimulationLab devices={devices} running={running} speed={speed} onRefresh={fetchData} />} />
              <Route path="/settings" element={<SettingsPage onRefresh={fetchData} />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
