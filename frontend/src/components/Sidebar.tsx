import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BedDouble,
  Activity,
  Sliders,
  BellRing,
  FileText,
  FlaskConical,
  Settings,
  Droplets
} from 'lucide-react';

export const Sidebar: React.FC<{ running: boolean; speed: number }> = ({ running, speed }) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/devices', label: 'Patients & Devices', icon: BedDouble },
    { to: '/monitoring', label: 'Device Monitoring', icon: Activity },
    { to: '/control', label: 'Flow Control', icon: Sliders },
    { to: '/alerts', label: 'Alerts & Events', icon: BellRing },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/simulation', label: 'Simulation Lab', icon: FlaskConical },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800 shadow-xl">
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
          <Droplets className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight">Smart IV Drip</h1>
          <p className="text-xs text-slate-400">Monitoring & Control</p>
        </div>
      </div>

      <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-400">Engine Status:</span>
        <span className={`px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5 ${running ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
          {running ? `${speed}x Running` : 'Paused'}
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0 opacity-80" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 text-center">
        College Hardware IoT Prototype <br />
        <span className="text-[10px] text-slate-500">Render & Vercel Ready</span>
      </div>
    </aside>
  );
};
