import React, { useState, useEffect, useCallback } from 'react';
import { Plus, AlertTriangle, Edit2, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { suppliesStorage } from '@/lib/storage';
import type { Supply } from '@/types';

interface SuppliesProps { workspaceId: string; }

const CATEGORIES = ['饲料', '药品', '水质调节剂', '过滤耗材', '其他'];
const EMPTY_FORM = {
  name: '', category: '饲料', customCategory: '', quantity: '', unit: '个', threshold: '',
  notes: '', consumption_interval: '', consumption_amount: '',
};

export default function Supplies({ workspaceId }: SuppliesProps) {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supply | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supply | null>(null);

  const fetchSupplies = useCallback(async () => {
    const list = suppliesStorage.getForWorkspace(workspaceId);

    const now = new Date();
    const updatedList: Supply[] = [];
    const toWrite: Supply[] = [];

    for (const s of list) {
      if (!s.consumption_interval || !s.consumption_amount) {
        updatedList.push(s);
        continue;
      }
      const base = s.last_deducted_at ? new Date(s.last_deducted_at) : new Date(s.created_at);
      const elapsedDays = (now.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
      const periods = Math.floor(elapsedDays / s.consumption_interval);
      if (periods <= 0) { updatedList.push(s); continue; }
      const newQty = Math.max(0, s.quantity - periods * s.consumption_amount);
      const updated = { ...s, quantity: newQty, last_deducted_at: now.toISOString() };
      updatedList.push(updated);
      toWrite.push(updated);
    }

    if (toWrite.length > 0) suppliesStorage.updateRaw(toWrite);
    setSupplies(updatedList);
  }, [workspaceId]);

  useEffect(() => { fetchSupplies(); }, [fetchSupplies]);

  const isLow = (s: Supply) => s.threshold !== null && s.quantity <= s.threshold;

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setFormOpen(true); };
  const openEdit = (s: Supply) => {
    setEditing(s);
    const isOther = !CATEGORIES.slice(0, -1).includes(s.category);
    setForm({
      name: s.name,
      category: isOther ? '其他' : s.category,
      customCategory: isOther ? s.category : '',
      quantity: String(s.quantity), unit: s.unit,
      threshold: s.threshold !== null ? String(s.threshold) : '',
      notes: s.notes ?? '',
      consumption_interval: s.consumption_interval !== null ? String(s.consumption_interval) : '',
      consumption_amount: s.consumption_amount !== null ? String(s.consumption_amount) : '',
    });
    setFormOpen(true);
  };

  const finalCategory = form.category === '其他' ? form.customCategory.trim() : form.category;

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('请输入耗材详细名称'); return; }
    if (form.category === '其他' && !form.customCategory.trim()) {
      toast.error('「其他」分类需输入自定义分类名称'); return;
    }
    if (!form.consumption_interval) { toast.error('请输入消耗周期（天）'); return; }
    if (!form.consumption_amount) { toast.error('请输入每次消耗量'); return; }
    setSaving(true);
    const payload = {
      workspace_id: workspaceId,
      name: form.name.trim(),
      category: finalCategory,
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit || '个',
      threshold: form.threshold ? parseFloat(form.threshold) : null,
      notes: form.notes || null,
      consumption_interval: parseFloat(form.consumption_interval),
      consumption_amount: parseFloat(form.consumption_amount),
      last_deducted_at: editing ? (editing.last_deducted_at ?? new Date().toISOString()) : new Date().toISOString(),
    };
    if (editing) {
      suppliesStorage.update(editing.id, payload);
    } else {
      suppliesStorage.insert(payload);
    }
    setSaving(false);
    toast.success(editing ? '耗材已更新' : '耗材已添加');
    setFormOpen(false);
    fetchSupplies();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    suppliesStorage.delete(deleteTarget.id);
    toast.success('已删除');
    setDeleteTarget(null);
    fetchSupplies();
  };

  const lowCount = supplies.filter(isLow).length;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">补给站</h2>
          <p className="text-xs text-muted-foreground mt-0.5">管理饲料、药品等耗材库存</p>
        </div>
        <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />添加耗材
        </Button>
      </div>

      {lowCount > 0 && (
        <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded p-3">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span className="text-sm text-warning">{lowCount} 种耗材库存不足，请及时补充</span>
        </div>
      )}

      {supplies.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded p-10 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm">暂无耗材记录</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">名称</th>
                  <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">分类</th>
                  <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">库存</th>
                  <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">预警值</th>
                  <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">消耗周期</th>
                  <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium whitespace-nowrap">备注</th>
                  <th className="px-4 py-2.5 whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {supplies.map((s) => (
                  <tr key={s.id} className={`border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors ${isLow(s) ? 'bg-warning/5' : ''}`}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {isLow(s) && <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />}
                        <span className={`font-medium ${isLow(s) ? 'text-warning' : 'text-foreground'}`}>{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap"><span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">{s.category}</span></td>
                    <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
                      <span className={isLow(s) ? 'text-warning' : 'text-foreground'}>{s.quantity}</span>
                      <span className="text-muted-foreground ml-1 text-xs">{s.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground text-xs whitespace-nowrap">{s.threshold !== null ? `${s.threshold} ${s.unit}` : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground text-xs whitespace-nowrap">
                      {s.consumption_interval && s.consumption_amount
                        ? <span className="text-info">每 {s.consumption_interval} 天 / {s.consumption_amount} {s.unit}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-[120px] truncate whitespace-nowrap">{s.notes || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground text-balance">{editing ? '编辑耗材' : '添加耗材'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {/* 名称 */}
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">详细名称 *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="px-2 h-8 bg-muted border-border text-foreground text-sm"
                placeholder={
                  form.category === '饲料' ? '如：高够力小型鱼薄片饲料 100g'
                    : form.category === '药品' ? '如：亚甲基蓝 100ml'
                      : form.category === '水质调节剂' ? '如：API 硝化细菌 237ml'
                        : form.category === '过滤耗材' ? '如：白棉过滤棉 500g'
                          : '如：XX品牌 型号规格'
                }
              />
            </div>
            {/* 分类 */}
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">分类</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setForm((f) => ({ ...f, category: c, customCategory: '' }))} className={`text-xs px-2.5 py-1 rounded border transition-colors ${form.category === c ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}>{c}</button>
                ))}
              </div>
              {form.category === '其他' && (
                <div className="mt-2">
                  <label className="text-xs font-normal text-muted-foreground block mb-1">自定义分类名称 *</label>
                  <Input
                    value={form.customCategory}
                    onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
                    className="px-2 h-8 bg-muted border-border text-foreground text-sm"
                    placeholder="输入分类名称..."
                    autoFocus
                  />
                </div>
              )}
            </div>
            {/* 库存 & 单位 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-normal text-muted-foreground block">库存数量</label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder="0" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-normal text-muted-foreground block">单位</label>
                <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder="个/克/毫升" />
              </div>
            </div>
            {/* 消耗量设置（必填） */}
            <div className="rounded border border-primary/20 bg-primary/5 p-3 space-y-2.5">
              <p className="text-xs font-medium text-primary">消耗量设置 <span className="text-destructive">*</span></p>
              {/* 单位快选 */}
              <div className="space-y-1.5">
                <label className="text-xs font-normal text-muted-foreground block">单位</label>
                <div className="flex flex-wrap gap-1.5">
                  {['克', '毫升', '片', '粒', '包', '袋', '个', '升'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, unit: u }))}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        form.unit === u
                          ? 'border-primary text-primary bg-primary/15'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="px-2 h-7 bg-muted border-border text-foreground text-xs"
                  placeholder="自定义单位，如：瓶/支/颗"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-normal text-muted-foreground block">更换/添加周期（天）</label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={form.consumption_interval}
                    onChange={(e) => setForm((f) => ({ ...f, consumption_interval: e.target.value }))}
                    className="px-2 h-8 bg-muted border-border text-foreground text-sm"
                    placeholder="如：7"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-normal text-muted-foreground block">每次消耗量</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.consumption_amount}
                    onChange={(e) => setForm((f) => ({ ...f, consumption_amount: e.target.value }))}
                    className="px-2 h-8 bg-muted border-border text-foreground text-sm"
                    placeholder={`如：50（${form.unit || '克'}）`}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                系统将每满 <span className="text-foreground">{form.consumption_interval || 'N'}</span> 天，自动从库存扣减 <span className="text-foreground">{form.consumption_amount || 'N'}</span> {form.unit || '单位'}
              </p>
            </div>
            {/* 预警阈值 & 备注 */}
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">预警阈值</label>
              <Input type="number" value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder="低于此值时提醒" />
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-balance">删除耗材</AlertDialogTitle>
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
