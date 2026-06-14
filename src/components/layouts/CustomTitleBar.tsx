import { useState, useEffect } from 'react';
import { Minus, X } from 'lucide-react';

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).electronAPI;
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).__TAURI__;
}

export default function CustomTitleBar() {
  const [desktopMode, setDesktopMode] = useState(false);

  useEffect(() => {
    setDesktopMode(isElectron() || isTauri());
  }, []);

  if (!desktopMode) return null;

  const handleMinimize = () => {
    if (isElectron()) {
      const api = (window as unknown as { electronAPI: { minimize: () => void } }).electronAPI;
      api?.minimize?.();
    } else if (isTauri()) {
      const tauri = window as unknown as {
        __TAURI__: { window: { appWindow: { minimize: () => Promise<void> } } };
      };
      tauri?.__TAURI__?.window?.appWindow?.minimize?.().catch(() => {});
    }
  };

  const handleClose = () => {
    if (isElectron()) {
      const api = (window as unknown as { electronAPI: { close: () => void } }).electronAPI;
      api?.close?.();
    } else if (isTauri()) {
      const tauri = window as unknown as {
        __TAURI__: { window: { appWindow: { close: () => Promise<void> } } };
      };
      tauri?.__TAURI__?.window?.appWindow?.close?.().catch(() => {});
    }
  };

  const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;
  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <div
      className="h-8 flex items-center justify-between shrink-0 select-none bg-sidebar border-b border-sidebar-border"
      style={dragStyle}
    >
      <div className="flex items-center gap-2 px-3" style={noDragStyle}>
        <img src="/images/logo/aquanote-logo.png" alt="AquaNote" className="w-[22px] h-[22px] self-center object-contain rounded" />
        <span className="text-[11px] text-sidebar-foreground/80 font-medium">AquaNote</span>
      </div>
      <div className="flex items-center" style={noDragStyle}>
        <button
          onClick={handleMinimize}
          className="w-10 h-8 flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="最小化"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-8 flex items-center justify-center text-sidebar-foreground/60 hover:text-white hover:bg-destructive transition-colors"
          title="关闭"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
