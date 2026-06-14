import React, { useRef, useEffect } from 'react';
import { X, FlaskConical, BookOpen, Wrench, Package, SlidersHorizontal, BookMarked, ShieldCheck, Cpu, BookOpenText, Sparkles } from 'lucide-react';
import type { Workspace, WorkspaceModule } from '@/types';
import { useWorkspaceTabs } from '@/contexts/WorkspaceContext';
import DeepSeaEmpty from '@/components/workspace/DeepSeaEmpty';
import DeepSeaBg from '@/components/ui/DeepSeaBg';
import WaterLab from '@/components/modules/WaterLab';
import Organisms from '@/components/modules/Organisms';
import MaintenanceCalendar from '@/components/modules/MaintenanceCalendar';
import Supplies from '@/components/modules/Supplies';
import Parameters from '@/components/modules/Parameters';
import Chronicles from '@/components/modules/Chronicles';
import EnvCheck from '@/components/modules/EnvCheck';
import Equipment from '@/components/modules/Equipment';
import KnowledgeBasePanel from '@/components/modules/KnowledgeBase';
import AiReportPanel from '@/components/modules/AiReportPanel';

interface CentralAreaProps {
  workspace: Workspace;
}

const MODULE_ICONS: Record<WorkspaceModule, React.ReactNode> = {
  'water-lab': <FlaskConical className="w-3.5 h-3.5" />,
  'organisms': <BookOpen className="w-3.5 h-3.5" />,
  'maintenance': <Wrench className="w-3.5 h-3.5" />,
  'supplies': <Package className="w-3.5 h-3.5" />,
  'parameters': <SlidersHorizontal className="w-3.5 h-3.5" />,
  'chronicles': <BookMarked className="w-3.5 h-3.5" />,
  'env-check': <ShieldCheck className="w-3.5 h-3.5" />,
  'equipment': <Cpu className="w-3.5 h-3.5" />,
  'knowledge': <BookOpenText className="w-3.5 h-3.5" />,
  'ai-report': <Sparkles className="w-3.5 h-3.5" />,
};

const MODULE_COMPONENTS: Record<WorkspaceModule, React.ComponentType<{ workspaceId: string }>> = {
  'water-lab': WaterLab,
  'organisms': Organisms,
  'maintenance': MaintenanceCalendar,
  'supplies': Supplies,
  'parameters': Parameters,
  'chronicles': Chronicles,
  'env-check': EnvCheck,
  'equipment': Equipment,
  'knowledge': KnowledgeBasePanel,
  'ai-report': AiReportPanel,
};

export default function CentralArea({ workspace }: CentralAreaProps) {
  const { tabs, activeTabId, closeTab, setActiveTab, openTab } = useWorkspaceTabs();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const prevTabIdRef = useRef<string | null>(null);

  // 监听外部打开模块的事件（如右侧面板「前往检测」）
  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      const module = e.detail as WorkspaceModule;
      const labelMap: Record<string, string> = {
        'env-check': '环境检测',
        'water-lab': '水质实验室',
        'organisms': '生物档案',
        'maintenance': '维护日历',
        'supplies': '耗材库存',
        'parameters': '参数模板',
        'chronicles': '编年史',
        'equipment': '设备管理',
        'knowledge': '知识库',
        'ai-report': 'AI 报告',
      };
      openTab(module, labelMap[module] || module);
    };
    window.addEventListener('aquanote:open-module', handler as EventListener);
    return () => window.removeEventListener('aquanote:open-module', handler as EventListener);
  }, [openTab]);

  // 判断切换方向：新 tab 在旧 tab 右侧则从右滑入，否则从左滑入
  const getSlideClass = (tabId: string) => {
    const prevId = prevTabIdRef.current;
    if (!prevId || prevId === tabId) return 'tab-content-enter';
    const prevIdx = tabs.findIndex((t) => t.id === prevId);
    const curIdx  = tabs.findIndex((t) => t.id === tabId);
    return curIdx >= prevIdx ? 'tab-slide-from-right' : 'tab-slide-from-left';
  };

  const handleSetActiveTab = (id: string) => {
    prevTabIdRef.current = activeTabId;
    setActiveTab(id);
  };

  const ActiveComponent = activeTab ? MODULE_COMPONENTS[activeTab.module] : null;
  const slideClass = activeTab ? getSlideClass(activeTab.id) : '';

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
      {/* 深海背景层（仅在无标签页时明显可见，有内容时淡隐） */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${!activeTab ? 'opacity-100' : 'opacity-30'}`}>
        <DeepSeaBg particleCount={14} rayCount={2} rippleCount={2} />
      </div>
      {/* 标签页栏 */}
      <div className="relative z-10 h-9 flex items-end border-b border-border bg-card/60 backdrop-blur-sm overflow-x-auto shrink-0">
        {tabs.length === 0 ? (
          <div className="flex items-center px-4 h-full">
            <span className="text-xs text-muted-foreground opacity-60">点击左侧模块打开标签页</span>
          </div>
        ) : (
          tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSetActiveTab(tab.id)}
              className={`group flex items-center gap-1.5 px-3 h-full text-xs border-r border-border whitespace-nowrap transition-colors shrink-0 ${
                tab.id === activeTabId
                  ? 'bg-background text-foreground border-b-2 border-b-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span className={tab.id === activeTabId ? 'text-primary' : 'opacity-60 group-hover:opacity-100 transition-opacity'}>
                {MODULE_ICONS[tab.module]}
              </span>
              <span>{tab.label}</span>
              <span
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                className="opacity-0 group-hover:opacity-100 ml-0.5 p-0.5 rounded hover:bg-muted transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            </button>
          ))
        )}
      </div>

      {/* 面包屑导航 */}
      {activeTab && (
        <div className="relative z-10 flex items-center gap-1 px-4 py-1.5 border-b border-border bg-muted/10 text-xs text-muted-foreground shrink-0">
          <span className="hover:text-foreground cursor-default transition-colors">{workspace.name}</span>
          <span className="opacity-40">/</span>
          <span className="text-foreground font-medium">{activeTab.label}</span>
        </div>
      )}

      {/* 主内容区 — 空状态显示 3D 模型，有标签页则覆盖 */}
      <div className="relative z-10 flex-1 overflow-y-auto min-h-0">
        {!activeTab ? (
          <DeepSeaEmpty workspace={workspace} />
        ) : (
          <div key={activeTab.id} className={`${slideClass} h-full`}>
            {ActiveComponent && <ActiveComponent workspaceId={workspace.id} />}
          </div>
        )}
      </div>
    </div>
  );
}
