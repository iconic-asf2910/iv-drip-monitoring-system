import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '../api';

interface SettingsPageProps {
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefresh }) => {
  const [settings, setSettings] = useState({
    lowFluidPct: 40,
    criticalFluidPct: 10,
    minDropRate: 10,
    maxDropRate: 100,
    dropFactor: 20,
    defaultBagCapMl: 500,
    speedMultiplier: 1,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings().then(s => {
      if (s) setSettings(s);
    }).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      await api.updateSettings(settings);
      setSaved(true);
      onRefresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset settings to factory defaults?')) return;
    try {
      await api.resetSim();
      const s = await api.settings();
      if (s) setSettings(s);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            System Configuration & Settings
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure default thresholds, bag capacity, and simulation drop factor.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Defaults
        </button>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-sm font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Settings successfully updated and applied to simulation engine!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Low Fluid Warning Threshold (%)
            </label>
            <input
              type="number"
              value={settings.lowFluidPct}
              onChange={(e) => setSettings({ ...settings, lowFluidPct: parseFloat(e.target.value) || 0 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Critical Fluid Threshold (%)
            </label>
            <input
              type="number"
              value={settings.criticalFluidPct}
              onChange={(e) => setSettings({ ...settings, criticalFluidPct: parseFloat(e.target.value) || 0 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Minimum Expected Drop Rate (drops/min)
            </label>
            <input
              type="number"
              value={settings.minDropRate}
              onChange={(e) => setSettings({ ...settings, minDropRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Maximum Safe Drop Rate (drops/min)
            </label>
            <input
              type="number"
              value={settings.maxDropRate}
              onChange={(e) => setSettings({ ...settings, maxDropRate: parseFloat(e.target.value) || 0 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Drop Factor (drops/mL)
            </label>
            <input
              type="number"
              value={settings.dropFactor}
              onChange={(e) => setSettings({ ...settings, dropFactor: parseFloat(e.target.value) || 20 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Default Bag Capacity (mL)
            </label>
            <input
              type="number"
              value={settings.defaultBagCapMl}
              onChange={(e) => setSettings({ ...settings, defaultBagCapMl: parseFloat(e.target.value) || 500 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 transition-colors"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
