import React, { createContext, useContext, useState, useCallback } from 'react';
import type { WorkspaceTab, WorkspaceModule } from '@/types';

interface WorkspaceContextType {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  openTab: (module: WorkspaceModule, label: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

const MODULE_LABELS: Record<WorkspaceModule, string> = {
  'water-lab': '水质检测记录',
  'organisms': '生物图鉴',
  'maintenance': '维护日历',
  'supplies': '消耗品管理',
  'parameters': '参数管理',
  'chronicles': '常年图鉴',
  'env-check': '环境检测',
  'equipment': '辅助设备',
  'knowledge': '知识库',
  'ai-report': 'AI 报告',
};

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const openTab = useCallback((module: WorkspaceModule, label?: string) => {
    // 如果该 module 已有标签页，切换到它
    const existing = tabs.find((t) => t.module === module);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const newTab: WorkspaceTab = {
      id: `${module}-${Date.now()}`,
      module,
      label: label || MODULE_LABELS[module],
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        const newActive = next[Math.max(0, idx - 1)]?.id ?? null;
        setActiveTabId(newActive);
      }
      return next;
    });
  }, [activeTabId]);

  const setActiveTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  return (
    <WorkspaceContext.Provider value={{ tabs, activeTabId, openTab, closeTab, setActiveTab }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceTabs() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspaceTabs must be used within WorkspaceProvider');
  return ctx;
}
