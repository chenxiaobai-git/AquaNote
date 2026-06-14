import React, { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle2, Circle, AlertCircle, Edit2, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { maintenanceStorage, suppliesStorage } from '@/lib/storage';
import type { MaintenanceTask, Supply } from '@/types';

interface MaintenanceCalendarProps { workspaceId: string; }

const TASK_TYPES = ['换水', '清洗过滤器', '修剪水草', '喂食', '检测水质', '其他'];
const today = () => new Date().toISOString().split('T')[0];
const EMPTY_FORM = { title: '', task_type: '换水', due_date: today(), notes: '' };

export default function MaintenanceCalendar({ workspaceId }: MaintenanceCalendarProps) {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceTask | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceTask | null>(null);
  const [supplyDeductionTask, setSupplyDeductionTask] = useState<MaintenanceTask | null>(null);
  const [relevantSupplies, setRelevantSupplies] = useState<Supply[]>([]);

  const fetchTasks = useCallback(async () => {
    const rows = maintenanceStorage.getForWorkspace(workspaceId);
    const today = new Date().toISOString().split('T')[0];
    setTasks(rows.map((t) => ({
      ...t,
      status: t.status === 'completed' ? 'completed' : (t.due_date && t.due_date < today ? 'overdue' : 'pending'),
    })));
  }, [workspaceId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleToggle = async (task: MaintenanceTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    maintenanceStorage.update(task.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    });
    fetchTasks();

    // 完成任务后，询问是否扣减耗材
    if (newStatus === 'completed') {
      const supplies = suppliesStorage.getForWorkspace(workspaceId);
      const keywords = getTaskKeywords(task.task_type);
      const matched = supplies.filter((s) =>
        keywords.some((k) => s.name.includes(k) || s.category.includes(k))
      );
      if (matched.length > 0) {
        setRelevantSupplies(matched);
        setSupplyDeductionTask(task);
      }
    }
  };

  const getTaskKeywords = (taskType: string): string[] => {
    switch (taskType) {
      case '换水': return ['盐', '海盐', '水质调节'];
      case '清洗过滤器': return ['滤棉', '活性炭', '陶瓷环', '生化棉'];
      case '修剪水草': return ['剪刀', '镊子'];
      case '喂食': return ['饲料', '鱼食', '丰年虾', '红虫'];
      case '检测水质': return ['测试', '试剂'];
      default: return [];
    }
  };

  const handleDeductionConfirm = () => {
    if (!supplyDeductionTask) return;
    for (const s of relevantSupplies) {
      if (s.consumption_amount && s.consumption_amount > 0 && s.quantity >= s.consumption_amount) {
        suppliesStorage.update(s.id, {
          quantity: s.quantity - s.consumption_amount,
          last_deducted_at: new Date().toISOString(),
        });
      }
    }
    toast.success('耗材已扣减');
    setSupplyDeductionTask(null);
    setRelevantSupplies([]);
  };

  const handleDeductionSkip = () => {
    setSupplyDeductionTask(null);
    setRelevantSupplies([]);
  };

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM, due_date: today() }); setFormOpen(true); };
  const openEdit = (t: MaintenanceTask) => {
    setEditing(t);
    setForm({ title: t.title, task_type: t.task_type, due_date: t.due_date ?? '', notes: t.notes ?? '' });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('请输入任务名称'); return; }
    setSaving(true);
    const payload = {
      workspace_id: workspaceId,
      title: form.title.trim(),
      task_type: form.task_type,
      due_date: form.due_date || null,
      notes: form.notes || null,
      status: 'pending' as const,
      completed_at: null,
    };
    if (editing) {
      maintenanceStorage.update(editing.id, payload);
    } else {
      maintenanceStorage.insert(payload);
    }
    setSaving(false);
    toast.success(editing ? '任务已更新' : '任务已添加');
    setFormOpen(false);
    fetchTasks();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    maintenanceStorage.delete(deleteTarget.id);
    toast.success('已删除');
    setDeleteTarget(null);
    fetchTasks();
  };

  const filtered = tasks.filter((t) => filter === 'all' ? true : filter === 'pending' ? t.status !== 'completed' : t.status === 'completed');

  const statusIcon = (status: MaintenanceTask['status']) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status === 'overdue') return <AlertCircle className="w-4 h-4 text-warning" />;
    return <Circle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">维护日历</h2>
          <p className="text-xs text-muted-foreground mt-0.5">管理维护任务和时间线</p>
        </div>
        <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />新建任务
        </Button>
      </div>

      {/* 过滤 */}
      <div className="flex border border-border rounded overflow-hidden w-fit">
        {(['all', 'pending', 'completed'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs transition-colors ${filter === f ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {f === 'all' ? '全部' : f === 'pending' ? '待办' : '已完成'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded p-10 text-center">
          <Wrench className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm">暂无维护任务</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div key={task.id} className={`group flex items-start gap-3 bg-card border rounded p-3.5 transition-colors ${task.status === 'overdue' ? 'border-warning/30' : 'border-border hover:border-primary/20'}`}>
              <button onClick={() => handleToggle(task)} className="mt-0.5 shrink-0 transition-transform hover:scale-110">
                {statusIcon(task.status)}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.title}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">{task.task_type}</span>
                  {task.due_date && (
                    <span className={`text-xs ${task.status === 'overdue' ? 'text-warning' : 'text-muted-foreground'}`}>
                      {task.status === 'overdue' ? '逾期: ' : '截止: '}{task.due_date}
                    </span>
                  )}
                  {task.notes && <span className="text-xs text-muted-foreground truncate max-w-[160px]">{task.notes}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => openEdit(task)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteTarget(task)} className="p-1.5 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground text-balance">{editing ? '编辑任务' : '新建维护任务'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">任务名称 *</label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder="如：换水 20%" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">任务类型</label>
              <div className="flex flex-wrap gap-1.5">
                {TASK_TYPES.map((t) => (
                  <button key={t} onClick={() => setForm((f) => ({ ...f, task_type: t }))} className={`text-xs px-2.5 py-1 rounded border transition-colors ${form.task_type === t ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">截止日期</label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">备注</label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder="可选..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} className="border border-border text-foreground hover:bg-muted h-9">取消</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9">{saving ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 耗材扣减确认弹窗 */}
      <Dialog open={!!supplyDeductionTask} onOpenChange={(open) => { if (!open) handleDeductionSkip(); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-balance">确认耗材扣减</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              已完成「{supplyDeductionTask?.title}」，是否消耗以下耗材？
            </p>
            {relevantSupplies.length === 0 ? (
              <p className="text-sm text-muted-foreground">未匹配到相关耗材</p>
            ) : (
              <div className="space-y-2">
                {relevantSupplies.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded bg-muted border border-border">
                    <div>
                      <div className="text-sm text-foreground font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">当前库存: {s.quantity} {s.unit}</div>
                    </div>
                    <div className="text-sm text-primary font-mono">
                      -{s.consumption_amount ?? 0} {s.unit}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={handleDeductionSkip} className="border border-border text-foreground hover:bg-muted h-9">跳过</Button>
            <Button onClick={handleDeductionConfirm} disabled={relevantSupplies.length === 0} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9">确认扣减</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-balance">删除任务</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-pretty">确定删除「{deleteTarget?.title}」吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-muted h-9">取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground h-9">删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
