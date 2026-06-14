import React, { useState, useEffect, useCallback } from 'react';
import { Plus, LayoutGrid, List, Edit2, Trash2, Fish, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { organismsStorage } from '@/lib/storage';
import type { Organism } from '@/types';

interface OrganismsProps { workspaceId: string; }

const today = () => new Date().toISOString().split('T')[0];
const EMPTY_FORM: Record<string, string> = { name: '', scientific_name: '', image_url: '', added_date: today(), source: '', notes: '', metabolic_rate: 'medium', volume_cm3: '' };

export default function Organisms({ workspaceId }: OrganismsProps) {
  const [organisms, setOrganisms] = useState<Organism[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Organism | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Organism | null>(null);

  const fetchOrganisms = useCallback(async () => {
    setOrganisms(organismsStorage.getForWorkspace(workspaceId));
  }, [workspaceId]);

  useEffect(() => { fetchOrganisms(); }, [fetchOrganisms]);

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM, added_date: today() }); setFormOpen(true); };
  const openEdit = (o: Organism) => {
    setEditing(o);
    setForm({
      name: o.name, scientific_name: o.scientific_name ?? '', image_url: o.image_url ?? '',
      added_date: o.added_date ?? '', source: o.source ?? '', notes: o.notes ?? '',
      metabolic_rate: o.metabolic_rate ?? 'medium',
      volume_cm3: o.volume_cm3 ? String(o.volume_cm3) : '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('请输入生物名称'); return; }
    setSaving(true);
    const payload = {
      workspace_id: workspaceId,
      name: form.name.trim(),
      scientific_name: form.scientific_name || null,
      image_url: form.image_url || null,
      added_date: form.added_date || null,
      source: form.source || null,
      notes: form.notes || null,
      metabolic_rate: (form.metabolic_rate as 'high' | 'medium' | 'low') || 'medium',
      volume_cm3: form.volume_cm3 ? parseFloat(form.volume_cm3) : null,
    };
    if (editing) {
      organismsStorage.update(editing.id, payload);
    } else {
      organismsStorage.insert(payload);
    }
    setSaving(false);
    toast.success(editing ? '生物信息已更新' : '生物已添加');
    setFormOpen(false);
    fetchOrganisms();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    organismsStorage.delete(deleteTarget.id);
    toast.success('已删除');
    setDeleteTarget(null);
    fetchOrganisms();
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">生物志</h2>
          <p className="text-xs text-muted-foreground mt-0.5">记录缸中的生物档案</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-3.5 h-3.5" /></button>
          </div>
          <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />添加生物
          </Button>
        </div>
      </div>

      {organisms.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded p-10 text-center">
          <Fish className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm">还没有生物记录，添加第一条吧</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {organisms.map((o) => (
            <div key={o.id} className="group bg-card border border-border rounded overflow-hidden hover:border-primary/30 transition-colors h-full flex flex-col">
              <div className="aspect-[4/3] w-full overflow-hidden bg-muted flex items-center justify-center">
                {o.image_url ? (
                  <img src={o.image_url} alt={o.name} className="w-full h-full object-cover" />
                ) : (
                  <Fish className="w-8 h-8 text-muted-foreground opacity-30" />
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <div className="font-medium text-sm text-foreground truncate text-balance">{o.name}</div>
                {o.scientific_name && <div className="text-xs text-muted-foreground italic mt-0.5 truncate">{o.scientific_name}</div>}
                {o.added_date && <div className="text-xs text-muted-foreground mt-1">入缸: {o.added_date}</div>}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Zap className={`w-3 h-3 ${o.metabolic_rate === 'high' ? 'text-warning' : o.metabolic_rate === 'low' ? 'text-success' : 'text-primary'}`} />
                  <span className="text-xs text-muted-foreground">
                    {o.metabolic_rate === 'high' ? '高代谢' : o.metabolic_rate === 'low' ? '低代谢' : '中代谢'}
                    {o.volume_cm3 ? ` · ${o.volume_cm3}cm³` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(o)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => setDeleteTarget(o)} className="p-1 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded overflow-hidden">
          {organisms.map((o) => (
            <div key={o.id} className="group flex items-center gap-3 p-3 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
              <div className="w-10 h-10 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                {o.image_url ? <img src={o.image_url} alt={o.name} className="w-full h-full object-cover" /> : <Fish className="w-5 h-5 text-muted-foreground opacity-30" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{o.name}</div>
                <div className="text-xs text-muted-foreground">{o.scientific_name || (o.added_date ? `入缸: ${o.added_date}` : '无学名')}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Zap className={`w-2.5 h-2.5 ${o.metabolic_rate === 'high' ? 'text-warning' : o.metabolic_rate === 'low' ? 'text-success' : 'text-primary'}`} />
                  <span className="text-xs text-muted-foreground/70">
                    {o.metabolic_rate === 'high' ? '高代谢' : o.metabolic_rate === 'low' ? '低代谢' : '中代谢'}
                    {o.volume_cm3 ? ` · ${o.volume_cm3}cm³` : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => openEdit(o)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteTarget(o)} className="p-1.5 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground text-balance">{editing ? '编辑生物' : '添加生物'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {[
              { key: 'name', label: '名称 *', placeholder: '如：小丑鱼' },
              { key: 'scientific_name', label: '学名', placeholder: '如：Amphiprioninae' },
              { key: 'image_url', label: '图片链接', placeholder: 'https://...' },
              { key: 'added_date', label: '入缸日期', placeholder: 'YYYY-MM-DD', type: 'date' },
              { key: 'source', label: '来源', placeholder: '如：本地水族店' },
              { key: 'volume_cm3', label: '体积 (cm³)', placeholder: '估算生物体积，用于代谢负荷计算', type: 'number' },
              { key: 'notes', label: '备注', placeholder: '可选...' },
            ].map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-normal text-muted-foreground block">{f.label}</label>
                <Input
                  type={f.type ?? 'text'}
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="px-2 h-8 bg-muted border-border text-foreground text-sm"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">代谢系数</label>
              <select
                value={form.metabolic_rate}
                onChange={(e) => setForm((prev) => ({ ...prev, metabolic_rate: e.target.value }))}
                className="w-full h-8 px-2 rounded border border-border bg-muted text-foreground text-sm"
              >
                <option value="high">高代谢 (金鱼/锦鲤)</option>
                <option value="medium">中代谢 (慈鲷/神仙)</option>
                <option value="low">低代谢 (灯科/小丑鱼)</option>
              </select>
              <p className="text-xs text-muted-foreground/60">默认中代谢，用于环境检测的代谢负荷估算</p>
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
            <AlertDialogTitle className="text-foreground text-balance">删除生物</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-pretty">确定删除「{deleteTarget?.name}」吗？</AlertDialogDescription>
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
