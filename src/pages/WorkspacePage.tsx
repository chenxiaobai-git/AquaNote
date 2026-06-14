import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { workspaceStorage } from '@/lib/storage';
import type { Workspace } from '@/types';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import LeftNav from '@/components/workspace/LeftNav';
import CentralArea from '@/components/workspace/CentralArea';
import RightPanel from '@/components/workspace/RightPanel';
import CommandPalette from '@/components/workspace/CommandPalette';
import DeepSeaBg from '@/components/ui/DeepSeaBg';

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const fetchWorkspace = useCallback(async () => {
    if (!id) return;
    const ws = workspaceStorage.getById(id);
    if (!ws) {
      toast.error('工作区不存在');
      navigate('/');
      return;
    }
    setWorkspace(ws);
    setLoading(false);
    workspaceStorage.updateLastOpened(id);
  }, [id, navigate]);

  useEffect(() => { fetchWorkspace(); }, [fetchWorkspace]);

  // Ctrl+K 命令面板
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        <DeepSeaBg particleCount={18} rayCount={2} rippleCount={2} />
        <div className="relative z-10 flex flex-col items-center gap-4">
          {/* 外圈旋转 + 内圈图标 */}
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full bg-card border border-primary/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 80 100" fill="none">
                <ellipse cx="40" cy="32" rx="32" ry="22" fill="hsl(191 100% 50% / 0.15)" stroke="hsl(191 100% 50% / 0.5)" strokeWidth="2" />
              </svg>
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">正在加载工作区</p>
            <p className="text-xs text-muted-foreground">稍候片刻...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <WorkspaceProvider>
      <div className="flex h-screen max-h-screen w-full bg-background overflow-hidden page-enter">
        {/* 左栏 — 洋流导航 */}
        <LeftNav
          workspace={workspace}
          collapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed((v) => !v)}
        />

        {/* 中央区 */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* 环境评分条 */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 border-b border-border bg-muted/10">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">环境评分</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(workspace.env_score || 0, 99.99)}%` }}
              />
            </div>
            <span className="text-xs font-medium text-primary w-10 text-right">
              {workspace.env_score != null ? workspace.env_score.toFixed(1) : '--'}
            </span>
          </div>
          <CentralArea workspace={workspace} />
        </div>

        {/* 右栏 — 潮汐浮窗（宽屏显示） */}
        <RightPanel
          workspaceId={workspace.id}
          collapsed={rightCollapsed}
          onToggleCollapse={() => setRightCollapsed((v) => !v)}
        />
      </div>

      {/* 命令面板 */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} workspaceId={workspace.id} />
    </WorkspaceProvider>
  );
}
