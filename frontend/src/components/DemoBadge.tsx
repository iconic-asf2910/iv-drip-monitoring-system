import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const DemoBadge: React.FC = () => {
  return (
    <div className="bg-amber-500 text-slate-950 font-semibold px-3 py-1.5 text-xs sm:text-sm flex items-center justify-center gap-2 shadow-inner border-b border-amber-600">
      <ShieldAlert className="w-4 h-4 shrink-0 animate-pulse" />
      <span className="tracking-wide">
        DEMO MODE — SIMULATED SENSOR DATA — NO HARDWARE CONNECTED
      </span>
    </div>
  );
};
