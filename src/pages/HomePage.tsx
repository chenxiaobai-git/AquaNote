import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FolderOpen, Clock, Settings, Trash2, ChevronRight,
  AlertTriangle, Box, Ruler, Droplets, Layers, Eye, ShieldCheck, Octagon, Upload, Github,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useNickname } from '@/contexts/NicknameContext';
import { workspaceStorage, workspaceExportImport } from '@/lib/storage';
import type { Workspace } from '@/types';
import WorkspaceEnterOverlay from '@/components/workspace/WorkspaceEnterOverlay';
import TankWireframe from '@/components/three/TankWireframe';
import DeepSeaBg from '@/components/ui/DeepSeaBg';

type FilterType = 'back' | 'bottom' | 'hangon' | 'side' | 'none' | 'custom';

const FILTER_OPTIONS: { key: FilterType; label: string; icon: React.ReactNode }[] = [
  { key: 'back', label: '背滤', icon: <Droplets className="w-3.5 h-3.5" /> },
  { key: 'bottom', label: '底滤', icon: <Box className="w-3.5 h-3.5" /> },
  { key: 'hangon', label: '瀑布滤', icon: <Droplets className="w-3.5 h-3.5" /> },
  { key: 'side', label: '侧滤', icon: <Layers className="w-3.5 h-3.5" /> },
  { key: 'none', label: '裸缸 / 无过滤', icon: <Octagon className="w-3.5 h-3.5" /> },
  { key: 'custom', label: 'DIY / 自定义', icon: <Ruler className="w-3.5 h-3.5" /> },
];

export default function HomePage() {
  const { nickname } = useNickname();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWs, setLoadingWs] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [enteringWs, setEnteringWs] = useState<Workspace | null>(null);

  // 工作区创建扩展字段
  const [tankX, setTankX] = useState('');
  const [tankY, setTankY] = useState('');
  const [tankZ, setTankZ] = useState('');
  const [glassThickness, setGlassThickness] = useState('');
  const [filterExcludesGlass, setFilterExcludesGlass] = useState(false);
  const [filterType, setFilterType] = useState<FilterType | ''>('');
  const [backInnerX, setBackInnerX] = useState('');
  const [backInnerY, setBackInnerY] = useState('');
  const [backInnerZ, setBackInnerZ] = useState('');
  const [bottomHeight, setBottomHeight] = useState('');
  const [bottomLength, setBottomLength] = useState('');
  const [bottomWidth, setBottomWidth] = useState('');
  const [hangonX, setHangonX] = useState('');
  const [hangonY, setHangonY] = useState('');
  const [hangonZ, setHangonZ] = useState('');
  const [sideDirection, setSideDirection] = useState<'left' | 'right'>('right');
  const [sideInnerX, setSideInnerX] = useState('');
  const [sideInnerY, setSideInnerY] = useState('');
  const [sideInnerZ, setSideInnerZ] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  const fetchWorkspaces = useCallback(() => {
    setLoadingWs(true);
    setWorkspaces(workspaceStorage.getAll());
    setLoadingWs(false);
  }, []);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const resetCreateForm = () => {
    setNewName('');
    setTankX(''); setTankY(''); setTankZ('');
    setGlassThickness('');
    setFilterExcludesGlass(false);
    setFilterType('');
    setBackInnerX(''); setBackInnerY(''); setBackInnerZ('');
    setBottomHeight(''); setBottomLength(''); setBottomWidth('');
    setHangonX(''); setHangonY(''); setHangonZ('');
    setSideDirection('right');
    setSideInnerX(''); setSideInnerY(''); setSideInnerZ('');
    setCustomDesc('');
  };

  // 过滤方式切换时自动填充默认值
  useEffect(() => {
    if (filterType === 'back') {
      if (!backInnerX && tankX) setBackInnerX(tankX);  // 长=主缸长
      if (!backInnerZ && tankY) setBackInnerZ(tankY);  // 高=主缸高
    } else if (filterType === 'bottom') {
      if (!bottomLength && tankX) setBottomLength(tankX);
      if (!bottomWidth && tankZ) setBottomWidth(tankZ);
      if (!bottomHeight) setBottomHeight('15');
    } else if (filterType === 'side') {
      if (!sideInnerX && tankZ) setSideInnerX(tankZ);  // 长=前后深度=主缸宽
      if (!sideInnerY && tankY) setSideInnerY(tankY);  // 宽=上下高度=主缸高
      if (!sideInnerZ) setSideInnerZ('10');            // 高=向侧面突出厚度=默认10cm
    }
  }, [filterType, tankX, tankY, tankZ]);

  // 实时预览用的 Workspace 对象
  const previewWorkspace = useMemo<Workspace>(() => {
    const x = parseFloat(tankX) || 60;
    const y = parseFloat(tankY) || 30;
    const z = parseFloat(tankZ) || 40;
    const gt = parseFloat(glassThickness) || 0;

    // 自动计算实际尺寸
    const calcActual = (val: number) => {
      if (!filterExcludesGlass || gt <= 0) return val;
      return Math.max(1, val - gt * 2 / 10); // mm → cm
    };

    let fd: Workspace['filter_detail'] = null;
    if (filterType === 'back') {
      const bx = parseFloat(backInnerX) || 10;  // 长=左右
      const by = parseFloat(backInnerY) || 12;  // 宽=前后厚度
      const bz = parseFloat(backInnerZ) || 30;  // 高=上下高度
      fd = { back: { inner_x: calcActual(bx), inner_y: calcActual(bz), inner_z: calcActual(by) } };
    } else if (filterType === 'bottom') {
      const h = parseFloat(bottomHeight) || 15;
      const bl = parseFloat(bottomLength) || parseFloat(tankX) || 60;
      const bw = parseFloat(bottomWidth) || parseFloat(tankZ) || 40;
      fd = { bottom: { height: calcActual(h), length: calcActual(bl), width: calcActual(bw) } };
    } else if (filterType === 'hangon') {
      const hx = parseFloat(hangonX) || 25;  // 长=上下高度
      const hy = parseFloat(hangonY) || 15;  // 宽=前后深度
      const hz = parseFloat(hangonZ) || 10;  // 高=向侧面突出厚度
      fd = { hangon: { slot_x: calcActual(hz), slot_y: calcActual(hx), slot_z: calcActual(hy) } };
    } else if (filterType === 'side') {
      const sx = parseFloat(sideInnerX) || 30;  // 长=前后深度
      const sy = parseFloat(sideInnerY) || 25;  // 宽=上下高度
      const sz = parseFloat(sideInnerZ) || 10;  // 高=向侧面突出厚度
      fd = { side: { inner_x: calcActual(sz), inner_y: calcActual(sy), inner_z: calcActual(sx) } };
    }

    return {
      id: 'preview', name: newName || '预览', description: null,
      created_at: new Date().toISOString(), last_opened_at: new Date().toISOString(),
      tank_size: { x: calcActual(x), y: calcActual(y), z: calcActual(z) },
      glass_thickness: gt || undefined,
      filter_excludes_glass: filterExcludesGlass,
      filter_type: filterType || null,
      side_filter_direction: sideDirection,
      filter_detail: fd,
      env_score: null, last_env_check: null,
    };
  }, [tankX, tankY, tankZ, glassThickness, filterExcludesGlass, filterType, backInnerX, backInnerY, backInnerZ, bottomHeight, bottomLength, bottomWidth, hangonX, hangonY, hangonZ, sideDirection, sideInnerX, sideInnerY, sideInnerZ, newName]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) { toast.error('请输入工作区名称'); return; }
    const x = parseFloat(tankX), y = parseFloat(tankY), z = parseFloat(tankZ);
    if (!x || !y || !z || x <= 0 || y <= 0 || z <= 0) {
      toast.error('请输入有效的鱼缸尺寸'); return;
    }
    const gt = parseFloat(glassThickness);
    if (!gt || gt <= 0) { toast.error('请输入有效的玻璃厚度'); return; }
    if (!filterType) { toast.error('请选择过滤方式'); return; }
    const calcActual = (val: number) => {
      if (!filterExcludesGlass || gt <= 0) return val;
      return Math.max(1, val - gt * 2 / 10);
    };

    const tankSize = { x: calcActual(x), y: calcActual(y), z: calcActual(z) };
    let filterDetail: Workspace['filter_detail'] = null;

    if (filterType === 'back') {
      const bx = parseFloat(backInnerX), by = parseFloat(backInnerY), bz = parseFloat(backInnerZ);
      if (!bx || !by || !bz || bx <= 0 || by <= 0 || bz <= 0) {
        toast.error('请输入背滤滤槽内径'); return;
      }
      // 映射：长=inner_x, 宽=inner_z, 高=inner_y
      filterDetail = { back: { inner_x: calcActual(bx), inner_y: calcActual(bz), inner_z: calcActual(by) } };
    } else if (filterType === 'bottom') {
      const h = parseFloat(bottomHeight);
      if (!h || h <= 0) { toast.error('请输入底滤滤槽高度'); return; }
      const bl = parseFloat(bottomLength) || x;
      const bw = parseFloat(bottomWidth) || z;
      filterDetail = { bottom: { height: calcActual(h), length: calcActual(bl), width: calcActual(bw) } };
    } else if (filterType === 'hangon') {
      const hx = parseFloat(hangonX), hy = parseFloat(hangonY), hz = parseFloat(hangonZ);
      if (!hx || !hy || !hz || hx <= 0 || hy <= 0 || hz <= 0) {
        toast.error('请输入瀑布滤滤槽尺寸'); return;
      }
      // 映射：长=slot_y(上下高度), 宽=slot_z(前后深度), 高=slot_x(向侧面突出)
      filterDetail = { hangon: { slot_x: calcActual(hz), slot_y: calcActual(hx), slot_z: calcActual(hy) } };
    } else if (filterType === 'side') {
      const sx = parseFloat(sideInnerX), sy = parseFloat(sideInnerY), sz = parseFloat(sideInnerZ);
      if (!sx || !sy || !sz || sx <= 0 || sy <= 0 || sz <= 0) {
        toast.error('请输入侧滤滤槽内径'); return;
      }
      // 映射：长=inner_z(前后深度), 宽=inner_y(上下高度), 高=inner_x(向侧面突出)
      filterDetail = { side: { inner_x: calcActual(sz), inner_y: calcActual(sy), inner_z: calcActual(sx) } };
    } else if (filterType === 'custom') {
      if (!customDesc.trim()) { toast.error('请输入 DIY / 自定义过滤详情'); return; }
      filterDetail = { custom: customDesc.trim() };
    }

    setCreating(true);
    const ws = workspaceStorage.insert(name, {
      tank_size: tankSize,
      glass_thickness: gt || undefined,
      filter_excludes_glass: filterExcludesGlass,
      filter_type: filterType,
      side_filter_direction: filterType === 'side' ? sideDirection : undefined,
      filter_detail: filterDetail,
    });
    setCreating(false);
    setCreateOpen(false);
    resetCreateForm();
    toast.success(`工作区「${name}」已创建`);
    setEnteringWs(ws);
    setTimeout(() => navigate(`/workspace/${ws.id}`), 5600);
  };

  const handleOpen = (ws: Workspace) => {
    workspaceStorage.updateLastOpened(ws.id);
    setEnteringWs(ws);
    setTimeout(() => navigate(`/workspace/${ws.id}`), 3200);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    workspaceStorage.delete(deleteTarget.id);
    toast.success(`工作区「${deleteTarget.name}」已删除`);
    setDeleteTarget(null);
    fetchWorkspaces();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* 进入工作区衔接动画 */}
      {enteringWs && <WorkspaceEnterOverlay workspace={enteringWs} />}

      {/* 深海背景 */}
      <DeepSeaBg particleCount={26} rayCount={3} rippleCount={3} />

      {/* 顶部导航 */}
      <header className="relative z-10 border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/logo/aquanote-logo.png" alt="AquaNote" className="w-[45px] h-[45px] self-center object-contain rounded" />
            <span className="font-bold text-sm gradient-text">AquaNote</span>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors px-2 py-1 rounded hover:bg-muted"
            title="设置"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden md:inline">{nickname || '探索者'}</span>
          </button>
        </div>
      </header>

      {/* 主内容 */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-8 md:py-12 page-enter">
        {/* 欢迎区域 */}
        <div className="mb-8 md:mb-10">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1.5 text-balance">
            欢迎回来，<span className="gradient-text">{nickname || '探索者'}</span>
          </h1>
          <p className="text-muted-foreground text-sm text-pretty">
            选择工作区开始记录，或创建新的数据空间。
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/85 font-medium h-10 gap-2 btn-ripple shadow-lg"
            style={{ boxShadow: '0 4px 20px hsl(191 100% 50% / 0.2)' }}
          >
            <Plus className="w-4 h-4" />
            新建工作区
          </Button>
          <Button
            variant="outline"
            className="h-10 gap-2"
            onClick={() => document.getElementById('import-an-file')?.click()}
          >
            <Upload className="w-4 h-4" />
            导入工作区
          </Button>
          <input
            id="import-an-file"
            type="file"
            accept=".an"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) => {
                try {
                  const text = ev.target?.result as string;
                  const data = workspaceExportImport.parse(text);
                  workspaceExportImport.import(data);
                  toast.success(`已导入工作区 "${data.workspace.name}"`);
                  fetchWorkspaces();
                } catch (err) {
                  toast.error('导入失败：' + (err instanceof Error ? err.message : '文件格式错误'));
                }
                (e.target as HTMLInputElement).value = '';
              };
              reader.readAsText(file);
            }}
          />
        </div>

        {/* 最近工作区 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">最近工作区</h2>
            {workspaces.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground/60 count-pop">{workspaces.length} 个</span>
            )}
          </div>

          {loadingWs ? (
            <div className="space-y-2.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 skeleton-wave rounded-sm" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-sm p-10 text-center gradient-border">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-6 h-6 text-muted-foreground opacity-50" />
              </div>
              <p className="text-muted-foreground text-sm mb-5 text-pretty">还没有工作区，创建第一个吧</p>
              <Button
                variant="ghost"
                onClick={() => setCreateOpen(true)}
                className="border border-border text-foreground hover:bg-muted hover:border-primary/40 gap-2 h-9"
              >
                <Plus className="w-4 h-4" />
                创建工作区
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {workspaces.map((ws, idx) => {
                const hues = [191, 142, 260, 42, 0];
                const hue = hues[idx % hues.length];
                return (
                  <div
                    key={ws.id}
                    className="group card-hover flex items-center gap-4 bg-card border border-border rounded-sm p-4 cursor-pointer"
                    onClick={() => handleOpen(ws)}
                    style={{ '--ws-hue': hue } as React.CSSProperties}
                  >
                    <div className="w-8 h-8 rounded-sm overflow-hidden shrink-0 border border-border/50 bg-card flex items-center justify-center">
                      <div className="w-[130%] h-[130%] -m-[15%]">
                        <TankWireframe workspace={ws} className="w-full h-full" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {ws.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 opacity-60" />
                        {formatDate(ws.last_opened_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(ws); }}
                        className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive text-muted-foreground transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="p-1.5 rounded text-muted-foreground group-hover:text-primary transition-colors">
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 底部 */}
      <footer className="relative z-10 border-t border-border py-3 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            设置与偏好
          </button>
          <a
            href="https://github.com/chenxiaobai-git/AqueNote"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs transition-colors"
            title="前往 GitHub"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </a>
        </div>
      </footer>

      {/* 创建工作区对话框 */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) resetCreateForm(); setCreateOpen(o); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-balance">创建新工作区</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 名称 */}
            <div className="space-y-1.5">
              <label className="text-xs font-normal text-muted-foreground">工作区名称</label>
              <Input
                className="px-3 bg-muted border-border text-foreground placeholder:text-muted-foreground h-9"
                placeholder="例如：主卧背滤缸"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={50}
              />
            </div>

            {/* 鱼缸尺寸 */}
            <div className="space-y-1.5">
              <label className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                <Ruler className="w-3 h-3" />
                鱼缸尺寸（cm）
              </label>
              <div className="flex gap-2">
                <Input type="number" min={1} className="px-2 bg-muted border-border text-foreground h-9 text-xs" placeholder="长" value={tankX} onChange={(e) => setTankX(e.target.value)} />
                <Input type="number" min={1} className="px-2 bg-muted border-border text-foreground h-9 text-xs" placeholder="宽" value={tankY} onChange={(e) => setTankY(e.target.value)} />
                <Input type="number" min={1} className="px-2 bg-muted border-border text-foreground h-9 text-xs" placeholder="高" value={tankZ} onChange={(e) => setTankZ(e.target.value)} />
              </div>
            </div>

            {/* 玻璃厚度 */}
            <div className="space-y-1.5">
              <label className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" /> 玻璃厚度（mm）
              </label>
              <Input type="number" min={1} step={0.1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="例如：5" value={glassThickness} onChange={(e) => setGlassThickness(e.target.value)} />
            </div>

            {/* 不含玻璃厚度勾选 */}
            <div className="flex items-center gap-2">
              <Checkbox id="excludeGlass" checked={filterExcludesGlass} onCheckedChange={(c) => setFilterExcludesGlass(c === true)} />
              <label htmlFor="excludeGlass" className="text-xs text-muted-foreground cursor-pointer">
                输入的过滤尺寸<strong>不包含</strong>玻璃厚度
              </label>
            </div>

            {/* 过滤方式 */}
            <div className="space-y-1.5">
              <label className="text-xs font-normal text-muted-foreground">过滤方式</label>
              <div className="grid grid-cols-2 gap-2">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setFilterType(opt.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-sm text-xs border transition-colors text-left ${
                      filterType === opt.key
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 侧滤方向 */}
            {filterType === 'side' && (
              <div className="space-y-1.5">
                <label className="text-xs font-normal text-muted-foreground">侧滤方向</label>
                <div className="flex gap-2">
                  <button onClick={() => setSideDirection('left')} className={`flex-1 px-2.5 py-2 rounded-sm text-xs border transition-colors ${sideDirection === 'left' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}>左侧滤</button>
                  <button onClick={() => setSideDirection('right')} className={`flex-1 px-2.5 py-2 rounded-sm text-xs border transition-colors ${sideDirection === 'right' ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}>右侧滤</button>
                </div>
              </div>
            )}

            {/* 过滤方式详情 */}
            {filterType === 'back' && (
              <div className="space-y-1.5">
                <label className="text-xs font-normal text-muted-foreground">背滤滤槽内径（cm）</label>
                <div className="flex gap-2">
                  <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="长" value={backInnerX} onChange={(e) => setBackInnerX(e.target.value)} />
                  <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="宽" value={backInnerY} onChange={(e) => setBackInnerY(e.target.value)} />
                  <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="高" value={backInnerZ} onChange={(e) => setBackInnerZ(e.target.value)} />
                </div>
              </div>
            )}
            {filterType === 'bottom' && (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-normal text-muted-foreground">底滤滤槽长度（cm）</label>
                  <div className="flex gap-2">
                    <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="底滤滤槽长度（默认=主缸长）" value={bottomLength} onChange={(e) => setBottomLength(e.target.value)} />
                    <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="底滤滤槽宽度（默认=主缸宽）" value={bottomWidth} onChange={(e) => setBottomWidth(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-normal text-muted-foreground">底滤滤槽高度（cm）</label>
                  <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="例如：15" value={bottomHeight} onChange={(e) => setBottomHeight(e.target.value)} />
                </div>
              </div>
            )}
            {filterType === 'hangon' && (
              <div className="space-y-1.5">
                <label className="text-xs font-normal text-muted-foreground">瀑布滤滤槽尺寸（cm）</label>
                <div className="flex gap-2">
                  <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="长" value={hangonX} onChange={(e) => setHangonX(e.target.value)} />
                  <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="宽" value={hangonY} onChange={(e) => setHangonY(e.target.value)} />
                  <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="高" value={hangonZ} onChange={(e) => setHangonZ(e.target.value)} />
                </div>
              </div>
            )}
            {filterType === 'side' && (
              <div className="space-y-1.5">
                <label className="text-xs font-normal text-muted-foreground">侧滤滤槽内径（cm）</label>
                <div className="flex gap-2">
                  <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="长" value={sideInnerX} onChange={(e) => setSideInnerX(e.target.value)} />
                  <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="宽" value={sideInnerY} onChange={(e) => setSideInnerY(e.target.value)} />
                  <Input type="number" min={1} className="px-2 bg-muted border-border h-9 text-xs" placeholder="高" value={sideInnerZ} onChange={(e) => setSideInnerZ(e.target.value)} />
                </div>
              </div>
            )}
            {filterType === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-xs font-normal text-muted-foreground">DIY / 自定义详情</label>
                <Input className="px-2 bg-muted border-border h-9 text-xs" placeholder="详细描述过滤系统..." value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} />
              </div>
            )}

            {/* 实时预览 */}
            <div className="space-y-1.5">
              <label className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                <Eye className="w-3 h-3" /> 模型预览
              </label>
              <div className="rounded border border-border bg-card/50 overflow-hidden" style={{ height: '200px' }}>
                <TankWireframe workspace={previewWorkspace} rotate previewMode className="w-full h-full" />
              </div>
            </div>

            {/* 不可更改警告 */}
            <div className="flex items-start gap-1.5 p-2 rounded bg-warning/8 border border-warning/20">
              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning leading-relaxed">
                以上参数创建后不可修改。请确认填写无误。
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setCreateOpen(false); resetCreateForm(); }} className="border border-border text-foreground hover:bg-muted h-9">取消</Button>
            <Button
              disabled={creating || !newName.trim()}
              onClick={handleCreate}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9"
            >
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-balance">删除工作区</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-pretty">
              确定要删除工作区「{deleteTarget?.name}」吗？此操作将删除所有相关数据且无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-muted h-9">取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

