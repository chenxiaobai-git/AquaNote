import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Home, FlaskConical,
  BookOpen, Wrench, Package, SlidersHorizontal, BookMarked, Bot,
  Wifi, WifiOff, ShieldCheck, Cpu, Download, BookOpenText, FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import type { Workspace, WorkspaceModule } from '@/types';
import { useWorkspaceTabs } from '@/contexts/WorkspaceContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import WorkspaceExitOverlay from '@/components/workspace/WorkspaceExitOverlay';
import TankWireframe from '@/components/three/TankWireframe';
import { workspaceExportImport, wqrStorage, organismsStorage, maintenanceStorage, suppliesStorage, envCheckStorage } from '@/lib/storage';
import {
  exportWaterQualityToCsv, exportOrganismsToCsv, exportMaintenanceToCsv,
  exportSuppliesToCsv, exportEnvCheckToCsv, downloadCsv,
} from '@/lib/exportCsv';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface LeftNavProps {
  workspace: Workspace;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: { module: WorkspaceModule; label: string; icon: React.ReactNode }[] = [
  { module: 'water-lab', label: '水质检测记录', icon: <FlaskConical className="w-4 h-4" /> },
  { module: 'organisms', label: '生物图鉴', icon: <BookOpen className="w-4 h-4" /> },
  { module: 'maintenance', label: '维护日历', icon: <Wrench className="w-4 h-4" /> },
  { module: 'supplies', label: '消耗品管理', icon: <Package className="w-4 h-4" /> },
  { module: 'parameters', label: '参数管理', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { module: 'chronicles', label: '常年图鉴', icon: <BookMarked className="w-4 h-4" /> },
  { module: 'env-check', label: '环境检测', icon: <ShieldCheck className="w-4 h-4" /> },
  { module: 'equipment', label: '辅助设备', icon: <Cpu className="w-4 h-4" /> },
  { module: 'knowledge', label: '知识库', icon: <BookOpenText className="w-4 h-4" /> },
];

type CsvExportType = 'water' | 'organisms' | 'maintenance' | 'supplies' | 'env';

const CSV_OPTIONS: { key: CsvExportType; label: string; icon: React.ReactNode }[] = [
  { key: 'water', label: '水质检测记录', icon: <FlaskConical className="w-4 h-4" /> },
  { key: 'organisms', label: '生物档案', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'maintenance', label: '维护任务', icon: <Wrench className="w-4 h-4" /> },
  { key: 'supplies', label: '耗材库存', icon: <Package className="w-4 h-4" /> },
  { key: 'env', label: '环境检测', icon: <ShieldCheck className="w-4 h-4" /> },
];

export default function LeftNav({ workspace, collapsed, onToggleCollapse }: LeftNavProps) {
  const navigate = useNavigate();
  const { openTab, activeTabId, tabs } = useWorkspaceTabs();
  const isOnline = useOnlineStatus();
  const [exiting, setExiting] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);

  const activeModule = tabs.find((t) => t.id === activeTabId)?.module;

  const handleGoHome = () => {
    setExiting(true);
    setTimeout(() => navigate('/'), 580);
  };

  const handleExport = async () => {
    try {
      const data = workspaceExportImport.export(workspace.id);
      const content = JSON.stringify(data, null, 2);
      const defaultPath = `${workspace.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.an`;

      const isElectron = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).electronAPI;
      const isTauri = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).__TAURI__;

      if (isTauri) {
        // Tauri 环境：使用原生 dialog 选择保存路径
        const tauri = window as unknown as {
          __TAURI__: { dialog: { save: (opts: { defaultPath: string; filters: { name: string; extensions: string[] }[] }) => Promise<string | null> } };
        };
        const filePath = await tauri.__TAURI__.dialog.save({
          defaultPath,
          filters: [{ name: 'AquaNote 工作区', extensions: ['an'] }],
        });
        if (filePath) {
          const fs = window as unknown as {
            __TAURI__: { fs: { writeTextFile: (path: string, contents: string) => Promise<void> } };
          };
          await fs.__TAURI__.fs.writeTextFile(filePath, content);
          alert(`已导出到：${filePath}`);
        }
      } else if (isElectron) {
        const api = (window as unknown as {
          electronAPI: { saveFile: (opts: { defaultPath: string; content: string }) => Promise<{ canceled: boolean; filePath?: string }> }
        }).electronAPI;
        const result = await api.saveFile({ defaultPath, content });
        if (!result.canceled && result.filePath) {
          alert(`已导出到：${result.filePath}`);
        }
      } else {
        // Web 预览：无法选择路径，只能浏览器下载
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultPath;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      alert('导出失败：' + (e instanceof Error ? e.message : '未知错误'));
    }
  };

  const handleExportCsv = async (type: CsvExportType) => {
    setCsvDialogOpen(false);
    try {
      let csv = '';
      let defaultName = '';
      switch (type) {
        case 'water':
          csv = exportWaterQualityToCsv(wqrStorage.getForWorkspace(workspace.id));
          defaultName = `水质记录_${workspace.name}_${new Date().toISOString().slice(0, 10)}.csv`;
          break;
        case 'organisms':
          csv = exportOrganismsToCsv(organismsStorage.getForWorkspace(workspace.id));
          defaultName = `生物档案_${workspace.name}_${new Date().toISOString().slice(0, 10)}.csv`;
          break;
        case 'maintenance':
          csv = exportMaintenanceToCsv(maintenanceStorage.getForWorkspace(workspace.id));
          defaultName = `维护任务_${workspace.name}_${new Date().toISOString().slice(0, 10)}.csv`;
          break;
        case 'supplies':
          csv = exportSuppliesToCsv(suppliesStorage.getForWorkspace(workspace.id));
          defaultName = `耗材库存_${workspace.name}_${new Date().toISOString().slice(0, 10)}.csv`;
          break;
        case 'env':
          csv = exportEnvCheckToCsv(envCheckStorage.getForWorkspace(workspace.id));
          defaultName = `环境检测_${workspace.name}_${new Date().toISOString().slice(0, 10)}.csv`;
          break;
      }

      const isElectron = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).electronAPI;
      const isTauri = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).__TAURI__;

      if (isTauri) {
        const tauri = window as unknown as {
          __TAURI__: { dialog: { save: (opts: { defaultPath: string; filters: { name: string; extensions: string[] }[] }) => Promise<string | null> } };
        };
        const filePath = await tauri.__TAURI__.dialog.save({
          defaultPath: defaultName,
          filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
        });
        if (filePath) {
          const fs = window as unknown as {
            __TAURI__: { fs: { writeTextFile: (path: string, contents: string) => Promise<void> } };
          };
          await fs.__TAURI__.fs.writeTextFile(filePath, csv);
          toast.success(`CSV 已导出到 ${filePath}`);
        }
      } else if (isElectron) {
        const api = (window as unknown as {
          electronAPI: { saveFile: (opts: { defaultPath: string; content: string }) => Promise<{ canceled: boolean; filePath?: string }> }
        }).electronAPI;
        const result = await api.saveFile({ defaultPath: defaultName, content: csv });
        if (!result.canceled && result.filePath) {
          toast.success(`CSV 已导出到 ${result.filePath}`);
        }
      } else {
        downloadCsv(csv, defaultName);
        toast.success('CSV 已下载');
      }
    } catch (e) {
      toast.error('CSV 导出失败：' + (e instanceof Error ? e.message : '未知错误'));
    }
  };



  return (
    <aside
      className="sidebar-transition shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border"
      style={{ width: collapsed ? '48px' : '220px' }}
    >
      {/* 退出动画覆盖层 */}
      {exiting && <WorkspaceExitOverlay />}
      {/* 顶部：工作区名称 + 折叠按钮 */}
      <div className="h-12 flex items-center border-b border-sidebar-border px-2 gap-2 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-5 h-5 rounded-sm overflow-hidden shrink-0 border border-sidebar-border/50 bg-sidebar flex items-center justify-center">
              <div className="w-[130%] h-[130%] -m-[15%]">
                <TankWireframe workspace={workspace} className="w-full h-full" />
              </div>
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground truncate">{workspace.name}</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors shrink-0 ml-auto"
          title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* 返回主窗口 */}
      <button
        onClick={handleGoHome}
        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        title="返回主窗口"
      >
        <Home className="w-4 h-4 shrink-0" />
        {!collapsed && <span>主窗口</span>}
      </button>

      {/* 导出工作区 */}
      <button
        onClick={handleExport}
        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        title="导出工作区 (.an)"
      >
        <Download className="w-4 h-4 shrink-0" />
        {!collapsed && <span>导出工作区</span>}
      </button>

      {/* 导出 CSV */}
      <button
        onClick={() => setCsvDialogOpen(true)}
        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        title="导出 CSV 数据"
      >
        <FileSpreadsheet className="w-4 h-4 shrink-0" />
        {!collapsed && <span>导出 CSV</span>}
      </button>

      {/* AI 报告 */}
      <button
        onClick={() => openTab('ai-report', 'AI 报告')}
        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        title="AI 综合报告"
      >
        <Sparkles className="w-4 h-4 shrink-0" />
        {!collapsed && <span>AI 报告</span>}
      </button>

      <div className="border-t border-sidebar-border my-1" />

      {/* 核心航道导航 */}
      {!collapsed && (
        <div className="px-3 pt-2.5 pb-1">
          <span className="text-xs text-muted-foreground/60 uppercase tracking-widest font-medium">模块</span>
        </div>
      )}
      <nav className="flex-1 px-1.5 space-y-0.5 overflow-y-auto py-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeModule === item.module;
          return (
            <button
              key={item.module}
              onClick={() => openTab(item.module, item.label)}
              className={`w-full flex items-center gap-2.5 px-2 py-2 text-sm transition-all relative ${
                isActive
                  ? 'text-primary bg-primary/8'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
              title={collapsed ? item.label : undefined}
              style={{ borderRadius: '2px' }}
            >
              {/* 激活状态左边框指示条 */}
              {isActive && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary" />
              )}
              <span className={`shrink-0 transition-all ${isActive ? 'icon-glow' : ''}`}>{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border my-1" />

      {/* AI 洋流助手入口 */}
      <div className="relative group/ai">
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all"
          style={{ color: isOnline ? 'hsl(191 100% 50% / 0.7)' : 'hsl(215 13% 45%)' }}
        >
          <Bot className={`w-4 h-4 shrink-0 transition-all ${isOnline ? 'group-hover/ai:icon-glow' : ''}`} />
          {!collapsed && (
            <span className="flex-1 text-left">AI 洋流助手</span>
          )}
          {!collapsed && isOnline && (
            <span className="w-1.5 h-1.5 rounded-full bg-success online-pulse shrink-0" />
          )}
        </button>

        {/* Hover 提示气泡 */}
        <div
          className="pointer-events-none absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/ai:opacity-100 transition-opacity duration-150"
          style={{ minWidth: '160px' }}
        >
          <div className={`text-xs px-3 py-2 rounded shadow-xl border whitespace-nowrap text-center
            ${isOnline
              ? 'bg-card border-primary/30 text-foreground'
              : 'bg-card border-border text-muted-foreground'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              {isOnline
                ? <><span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />AI 功能可用</>
                : <><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />当前离线</>
              }
            </div>
            <div className="text-muted-foreground/70 text-xs">
              {isOnline ? '点击右侧面板开始对话' : 'AI 功能需要网络连接'}
            </div>
          </div>
          {/* 小三角 */}
          <div className="flex justify-center">
            <div className={`w-2 h-2 rotate-45 border-r border-b -mt-1 ${isOnline ? 'border-primary/30 bg-card' : 'border-border bg-card'}`} />
          </div>
        </div>
      </div>

      {/* 底部 */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-sidebar-border flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Ctrl+K 命令面板</span>
          <div className={`flex items-center gap-1 text-xs ${isOnline ? 'text-success' : 'text-muted-foreground'}`} title={isOnline ? 'AI 可用' : '离线'}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          </div>
        </div>
      )}
      {collapsed && (
        <div className="py-2 flex justify-center border-t border-sidebar-border">
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} title={isOnline ? '在线' : '离线'} />
        </div>
      )}

      {/* CSV 导出类型选择弹窗 */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-balance text-base">导出 CSV 数据</DialogTitle>
            <DialogDescription className="sr-only">选择要导出的工作区数据类型</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            {CSV_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleExportCsv(opt.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded border border-border bg-muted/40 text-foreground hover:bg-muted transition-colors text-sm"
              >
                <span className="text-muted-foreground">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCsvDialogOpen(false)} className="border border-border text-foreground hover:bg-muted h-9 text-xs">取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </aside>
  );
}

