import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { paramTemplatesStorage } from '@/lib/storage';
import type { ParameterTemplate } from '@/types';

interface ParametersProps { workspaceId: string; }

const DEFAULT_PARAMS = [
  { param_name: 'pH', param_key: 'ph', min_value: 6.5, max_value: 8.5, unit: '' },
  { param_name: '氨氮', param_key: 'ammonia', min_value: 0, max_value: 0.25, unit: 'mg/L' },
  { param_name: '亚硝酸', param_key: 'nitrite', min_value: 0, max_value: 0.5, unit: 'mg/L' },
  { param_name: '硝酸盐', param_key: 'nitrate', min_value: 0, max_value: 40, unit: 'mg/L' },
  { param_name: 'KH', param_key: 'kh', min_value: 3, max_value: 15, unit: '°dH' },
  { param_name: 'GH', param_key: 'gh', min_value: 5, max_value: 20, unit: '°dH' },
  { param_name: 'TDS', param_key: 'tds', min_value: 50, max_value: 500, unit: 'ppm' },
  { param_name: '温度', param_key: 'temperature', min_value: 22, max_value: 30, unit: '°C' },
];

const EMPTY_FORM = { param_name: '', param_key: '', min_value: '', max_value: '', unit: '', description: '' };

export default function Parameters({ workspaceId }: ParametersProps) {
  const [templates, setTemplates] = useState<ParameterTemplate[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ParameterTemplate | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ParameterTemplate | null>(null);
  const [initializing, setInitializing] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setTemplates(paramTemplatesStorage.getForWorkspace(workspaceId));
  }, [workspaceId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleInitDefaults = async () => {
    setInitializing(true);
    const rows = DEFAULT_PARAMS.map((p) => ({ ...p, workspace_id: workspaceId, description: null }));
    paramTemplatesStorage.insertMany(rows);
    setInitializing(false);
    toast.success('已初始化默认参数模板');
    fetchTemplates();
  };

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setFormOpen(true); };
  const openEdit = (t: ParameterTemplate) => {
    setEditing(t);
    setForm({ param_name: t.param_name, param_key: t.param_key, min_value: t.min_value !== null ? String(t.min_value) : '', max_value: t.max_value !== null ? String(t.max_value) : '', unit: t.unit ?? '', description: t.description ?? '' });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.param_name.trim()) { toast.error('请输入参数名称'); return; }
    setSaving(true);
    const payload = {
      workspace_id: workspaceId,
      param_name: form.param_name.trim(),
      param_key: form.param_key.trim() || form.param_name.trim().toLowerCase().replace(/\s+/g, '_'),
      min_value: form.min_value ? parseFloat(form.min_value) : null,
      max_value: form.max_value ? parseFloat(form.max_value) : null,
      unit: form.unit || null,
      description: form.description || null,
    };
    if (editing) {
      paramTemplatesStorage.update(editing.id, payload);
    } else {
      paramTemplatesStorage.insert(payload);
    }
    setSaving(false);
    toast.success(editing ? '参数已更新' : '参数已添加');
    setFormOpen(false);
    fetchTemplates();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    paramTemplatesStorage.delete(deleteTarget.id);
    toast.success('已删除');
    setDeleteTarget(null);
    fetchTemplates();
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">参数工坊</h2>
          <p className="text-xs text-muted-foreground mt-0.5">自定义水质参数的目标区间和预警阈值</p>
        </div>
        <div className="flex items-center gap-2">
          {templates.length === 0 && (
            <Button variant="ghost" onClick={handleInitDefaults} disabled={initializing} className="border border-border text-foreground hover:bg-muted h-9 text-xs">
              {initializing ? '初始化中...' : '使用默认模板'}
            </Button>
          )}
          <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />添加参数
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded p-10 text-center">
          <SlidersHorizontal className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm mb-3">暂无参数模板，使用默认模板快速开始</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div key={t.id} className="group bg-card border border-border rounded p-4 hover:border-primary/20 transition-colors h-full flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground">{t.param_name}</div>
                  {t.description && <div className="text-xs text-muted-foreground mt-0.5 text-pretty">{t.description}</div>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteTarget(t)} className="p-1 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 bg-muted rounded h-1.5 relative">
                  <div className="absolute inset-0 bg-primary/20 rounded" />
                  <div className="absolute left-1/4 right-1/4 top-0 bottom-0 bg-primary/50 rounded" />
                </div>
                <div className="text-xs text-muted-foreground font-mono shrink-0">
                  {t.min_value !== null ? t.min_value : '?'} – {t.max_value !== null ? t.max_value : '?'}
                  {t.unit && <span className="ml-1">{t.unit}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground text-balance">{editing ? '编辑参数' : '添加自定义参数'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: 'param_name', label: '参数名称 *', placeholder: '如：pH' },
              { key: 'param_key', label: '参数键（英文）', placeholder: '如：ph（可留空自动生成）' },
              { key: 'unit', label: '单位', placeholder: '如：mg/L、°C' },
              { key: 'description', label: '说明', placeholder: '可选...' },
            ].map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-normal text-muted-foreground block">{f.label}</label>
                <Input value={form[f.key as keyof typeof form]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder={f.placeholder} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-normal text-muted-foreground block">最小值</label>
                <Input type="number" step="any" value={form.min_value} onChange={(e) => setForm((f) => ({ ...f, min_value: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder="0" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-normal text-muted-foreground block">最大值</label>
                <Input type="number" step="any" value={form.max_value} onChange={(e) => setForm((f) => ({ ...f, max_value: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder="100" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} className="border border-border text-foreground hover:bg-muted h-9">取消</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9">{saving ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-balance">删除参数</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-pretty">确定删除参数「{deleteTarget?.param_name}」吗？</AlertDialogDescription>
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
