import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Star, Edit2, Trash2, BookMarked, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { chroniclesStorage } from '@/lib/storage';
import type { Chronicle } from '@/types';

interface ChroniclesProps { workspaceId: string; }

const EMPTY_FORM = { title: '', content: '', event_date: new Date().toISOString().split('T')[0], tags: '', is_milestone: false };

export default function Chronicles({ workspaceId }: ChroniclesProps) {
  const [chronicles, setChronicles] = useState<Chronicle[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Chronicle | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Chronicle | null>(null);

  const fetchChronicles = useCallback(async () => {
    setChronicles(chroniclesStorage.getForWorkspace(workspaceId));
  }, [workspaceId]);

  useEffect(() => { fetchChronicles(); }, [fetchChronicles]);

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setFormOpen(true); };
  const openEdit = (c: Chronicle) => {
    setEditing(c);
    setForm({ title: c.title, content: c.content ?? '', event_date: c.event_date, tags: c.tags.join(', '), is_milestone: c.is_milestone });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('请输入标题'); return; }
    setSaving(true);
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const payload = {
      workspace_id: workspaceId,
      title: form.title.trim(),
      content: form.content || null,
      event_date: form.event_date,
      tags,
      is_milestone: form.is_milestone,
      image_urls: [],
    };
    if (editing) {
      chroniclesStorage.update(editing.id, payload);
    } else {
      chroniclesStorage.insert(payload);
    }
    setSaving(false);
    toast.success(editing ? '记录已更新' : '记录已添加');
    setFormOpen(false);
    fetchChronicles();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    chroniclesStorage.delete(deleteTarget.id);
    toast.success('已删除');
    setDeleteTarget(null);
    fetchChronicles();
  };

  // 按月分组
  const grouped = chronicles.reduce<Record<string, Chronicle[]>>((acc, c) => {
    const month = c.event_date.slice(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(c);
    return acc;
  }, {});

  const displayList = viewMode === 'month'
    ? Object.entries(grouped).slice(0, 3).flatMap(([, items]) => items)
    : chronicles;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">长期年鉴</h2>
          <p className="text-xs text-muted-foreground mt-0.5">记录里程碑与重要事件</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded overflow-hidden">
            <button onClick={() => setViewMode('all')} className={`px-3 py-1.5 text-xs transition-colors ${viewMode === 'all' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>全部</button>
            <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-xs transition-colors ${viewMode === 'month' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>近3月</button>
          </div>
          <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />新建记录
          </Button>
        </div>
      </div>

      {chronicles.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded p-10 text-center">
          <BookMarked className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm">暂无记录，添加第一个里程碑</p>
        </div>
      ) : (
        <div className="relative">
          {/* 时间线 */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4 pl-10">
            {displayList.map((c) => (
              <div key={c.id} className="group relative">
                {/* 时间线节点 */}
                <div className={`absolute -left-6 top-3 w-3 h-3 rounded-full border-2 transition-colors ${c.is_milestone ? 'border-warning bg-warning/30' : 'border-primary bg-primary/20'}`} />
                <div className={`bg-card border rounded p-4 hover:border-primary/20 transition-colors ${c.is_milestone ? 'border-warning/30' : 'border-border'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {c.is_milestone && <Star className="w-3.5 h-3.5 text-warning shrink-0" />}
                        <span className="font-medium text-sm text-foreground text-balance">{c.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">{c.event_date}</div>
                      {c.content && <p className="text-sm text-muted-foreground text-pretty">{c.content}</p>}
                      {c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.tags.map((tag) => (
                            <span key={tag} className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                              <Tag className="w-2.5 h-2.5" />{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground text-balance">{editing ? '编辑记录' : '新建年鉴记录'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">标题 *</label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder="如：开缸纪念日" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">日期</label>
              <Input type="date" value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">内容</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={3}
                className="w-full px-2 py-1.5 text-sm bg-muted border border-border rounded text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="记录详细内容..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">标签（逗号分隔）</label>
              <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder="如：开缸, 里程碑" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="milestone"
                checked={form.is_milestone}
                onChange={(e) => setForm((f) => ({ ...f, is_milestone: e.target.checked }))}
                className="w-3.5 h-3.5 accent-primary"
              />
              <label htmlFor="milestone" className="text-sm text-foreground flex items-center gap-1 cursor-pointer">
                <Star className="w-3.5 h-3.5 text-warning" />标记为里程碑
              </label>
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
            <AlertDialogTitle className="text-foreground text-balance">删除记录</AlertDialogTitle>
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
