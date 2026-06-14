import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FlaskConical, BookOpen, Wrench, Package, SlidersHorizontal, BookMarked, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import type { WorkspaceModule } from '@/types';
import { useWorkspaceTabs } from '@/contexts/WorkspaceContext';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

const COMMANDS: { id: WorkspaceModule; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'water-lab', label: '水质检测记录', icon: <FlaskConical className="w-4 h-4" />, desc: '记录和监测水质参数' },
  { id: 'organisms', label: '生物图鉴', icon: <BookOpen className="w-4 h-4" />, desc: '管理缸中生物档案' },
  { id: 'maintenance', label: '维护日历', icon: <Wrench className="w-4 h-4" />, desc: '维护任务和时间线' },
  { id: 'supplies', label: '消耗品管理', icon: <Package className="w-4 h-4" />, desc: '耗材库存管理' },
  { id: 'parameters', label: '参数管理', icon: <SlidersHorizontal className="w-4 h-4" />, desc: '自定义参数模板' },
  { id: 'chronicles', label: '常年图鉴', icon: <BookMarked className="w-4 h-4" />, desc: '里程碑与历史记录' },
  { id: 'env-check', label: '环境检测', icon: <ShieldCheck className="w-4 h-4" />, desc: '环境监测与安全评分' },
  { id: 'equipment', label: '辅助设备', icon: <Cpu className="w-4 h-4" />, desc: '管理辅助设备及安全加成' },
];

export default function CommandPalette({ open, onClose, workspaceId: _workspaceId }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { openTab } = useWorkspaceTabs();

  const filtered = COMMANDS.filter((c) =>
    !query || c.label.includes(query) || c.desc.includes(query)
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = useCallback((cmd: typeof COMMANDS[number]) => {
    openTab(cmd.id, cmd.label);
    onClose();
  }, [openTab, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIdx]) { handleSelect(filtered[selectedIdx]); }
    if (e.key === 'Escape') { onClose(); }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 command-panel-overlay" />

      {/* 命令面板 */}
      <div
        className="relative z-10 w-full max-w-lg bg-card border border-primary/30 rounded shadow-2xl glow-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索框 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
            placeholder="搜索模块或功能..."
          />
          <kbd className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* 结果列表 */}
        <div className="py-1.5 max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">没有匹配的结果</div>
          ) : (
            filtered.map((cmd, idx) => (
              <button
                key={cmd.id}
                onClick={() => handleSelect(cmd)}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                  idx === selectedIdx ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
              >
                <span className={`shrink-0 ${idx === selectedIdx ? 'text-primary' : 'text-muted-foreground'}`}>
                  {cmd.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${idx === selectedIdx ? 'text-foreground' : 'text-foreground'}`}>{cmd.label}</div>
                  <div className="text-xs text-muted-foreground">{cmd.desc}</div>
                </div>
                {idx === selectedIdx && <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            ))
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border">
          <span className="text-xs text-muted-foreground">↑↓ 导航</span>
          <span className="text-xs text-muted-foreground">↵ 打开</span>
          <span className="text-xs text-muted-foreground">Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
