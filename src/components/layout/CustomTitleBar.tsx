import React from 'react';

export function CustomTitleBar() {
  return (
    <div
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="h-8 shrink-0 w-full bg-[#0f172a] text-white flex items-center justify-between px-4 z-[100] select-none shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="font-semibold text-sm tracking-wide text-slate-200">
          Invenza - Advanced ERP Management System
        </span>
      </div>
      {/* Spacer for native window controls on Windows/Linux */}
      <div className="w-[140px] h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}></div>
    </div>
  );
}
