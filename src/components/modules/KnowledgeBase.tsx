import React, { useState, useMemo } from 'react';
import { Search, BookOpen, Leaf, Fish, Droplets, Wrench, AlertTriangle, X, Plus, Edit2, Trash2, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { KNOWLEDGE_BASE, searchKnowledge } from '@/lib/knowledgeBase';
import { customKnowledgeStorage } from '@/lib/storage';
import type { KnowledgeBaseEntry } from '@/types';

interface KnowledgeBaseProps { workspaceId: string; }

const CATEGORY_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  coral:     { label: '珊瑚',   icon: <BookOpen className="w-3.5 h-3.5" />,    color: 'text-pink-400' },
  fish:      { label: '鱼类',   icon: <Fish className="w-3.5 h-3.5" />,        color: 'text-primary' },
  plant:     { label: '水草',   icon: <Leaf className="w-3.5 h-3.5" />,        color: 'text-success' },
  water:     { label: '水质',   icon: <Droplets className="w-3.5 h-3.5" />,    color: 'text-info' },
  equipment: { label: '设备',   icon: <Wrench className="w-3.5 h-3.5" />,      color: 'text-warning' },
  disease:   { label: '鱼病',   icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-destructive' },
};

const EMPTY_ENTRY: Omit<KnowledgeBaseEntry, 'id'> = {
  category: 'water', title: '', content: '', params: [], tags: [],
};

export default function KnowledgeBasePanel({}: KnowledgeBaseProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'system' | 'custom'>('system');

  // 自定义条目状态
  const [customEntries, setCustomEntries] = useState<KnowledgeBaseEntry[]>(() => customKnowledgeStorage.getAll());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeBaseEntry | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_ENTRY });
  const [paramRows, setParamRows] = useState<{ name: string; value: string; unit: string; note: string }[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBaseEntry | null>(null);

  const reload = () => setCustomEntries(customKnowledgeStorage.getAll());

  const systemFiltered = useMemo(() => {
    if (!query && !activeCategory) return KNOWLEDGE_BASE;
    return searchKnowledge(query, activeCategory ?? undefined);
  }, [query, activeCategory]);

  const customFiltered = useMemo(() => {
    const q = query.toLowerCase();
    return customEntries.filter((e) => {
      if (activeCategory && e.category !== activeCategory) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, activeCategory, customEntries]);

  const openAdd = () => {
    setEditing(null);
    setFormData({ ...EMPTY_ENTRY });
    setParamRows([{ name: '', value: '', unit: '', note: '' }]);
    setTagsInput('');
    setFormOpen(true);
  };

  const openEdit = (entry: KnowledgeBaseEntry) => {
    setEditing(entry);
    setFormData({ category: entry.category, title: entry.title, content: entry.content, params: entry.params ?? [], tags: entry.tags });
    setParamRows((entry.params ?? []).map((p) => ({ name: p.name, value: p.value, unit: p.unit, note: p.note ?? '' })));
    setTagsInput(entry.tags.join(', '));
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) { toast.error('请输入条目标题'); return; }
    const payload: Omit<KnowledgeBaseEntry, 'id'> = {
      category: formData.category as KnowledgeBaseEntry['category'],
      title: formData.title.trim(),
      content: formData.content.trim(),
      params: paramRows.filter((r) => r.name.trim()).map((r) => ({
        name: r.name.trim(), value: r.value.trim(), unit: r.unit.trim(), note: r.note.trim() || undefined,
      })),
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    };
    if (editing) {
      customKnowledgeStorage.update(editing.id, payload);
      toast.success('条目已更新');
    } else {
      customKnowledgeStorage.insert(payload);
      toast.success('条目已添加');
    }
    reload();
    setFormOpen(false);
    setActiveTab('custom');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    customKnowledgeStorage.delete(deleteTarget.id);
    toast.success('已删除');
    setDeleteTarget(null);
    reload();
  };

  const displayResults = activeTab === 'system' ? systemFiltered : customFiltered;
  const systemCount = systemFiltered.length;
  const customCount = customFiltered.length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">知识库</h2>
          <p className="text-xs text-muted-foreground mt-0.5">水族养护参考参数与指南</p>
        </div>
        <Button onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 text-xs shrink-0">
          <Plus className="w-3.5 h-3.5" />添加条目
        </Button>
      </div>

      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索关键词，如：硬骨珊瑚、白点病、氮循环..."
          className="pl-9 h-9 bg-muted border-border text-foreground text-sm"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-2.5 py-1 text-xs rounded border transition-colors ${!activeCategory ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          全部
        </button>
        {Object.entries(CATEGORY_MAP).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(activeCategory === key ? null : key)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition-colors ${
              activeCategory === key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {cfg.icon}
            {cfg.label}
          </button>
        ))}
      </div>

      {/* 系统/自定义 Tab */}
      <div className="flex border border-border rounded overflow-hidden">
        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 py-1.5 text-xs transition-colors ${activeTab === 'system' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          系统内置 ({systemCount})
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-1.5 text-xs transition-colors ${activeTab === 'custom' ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          我的条目 ({customCount})
        </button>
      </div>

      {/* 结果列表 */}
      <div className="space-y-2">
        {displayResults.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {activeTab === 'custom' ? (
              <div className="space-y-2">
                <p>还没有自定义条目</p>
                <Button variant="ghost" onClick={openAdd} className="h-8 text-xs border border-border text-foreground hover:bg-muted">
                  <Plus className="w-3.5 h-3.5 mr-1" />添加第一条
                </Button>
              </div>
            ) : '未找到相关内容'}
          </div>
        ) : (
          displayResults.map((entry) => (
            <KnowledgeCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              isCustom={activeTab === 'custom'}
              onEdit={() => openEdit(entry)}
              onDelete={() => setDeleteTarget(entry)}
            />
          ))
        )}
      </div>

      {/* 添加/编辑表单 */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-balance">{editing ? '编辑知识条目' : '添加知识条目'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-normal text-muted-foreground block">标题 *</label>
                <Input value={formData.title} onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder="条目标题" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-normal text-muted-foreground block">分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value as KnowledgeBaseEntry['category'] }))}
                  className="w-full h-8 px-2 rounded border border-border bg-muted text-foreground text-sm"
                >
                  {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">描述内容</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData((f) => ({ ...f, content: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-border bg-muted text-foreground text-sm resize-none"
                rows={3}
                placeholder="详细描述..."
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-normal text-muted-foreground">参数表</label>
                <button
                  onClick={() => setParamRows((r) => [...r, { name: '', value: '', unit: '', note: '' }])}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />添加行
                </button>
              </div>
              {paramRows.map((row, i) => (
                <div key={i} className="grid grid-cols-4 gap-1.5 items-center">
                  <Input value={row.name} onChange={(e) => setParamRows((r) => r.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="px-2 h-7 bg-muted border-border text-foreground text-xs" placeholder="参数名" />
                  <Input value={row.value} onChange={(e) => setParamRows((r) => r.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} className="px-2 h-7 bg-muted border-border text-foreground text-xs" placeholder="值" />
                  <Input value={row.unit} onChange={(e) => setParamRows((r) => r.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} className="px-2 h-7 bg-muted border-border text-foreground text-xs" placeholder="单位" />
                  <div className="flex gap-1">
                    <Input value={row.note} onChange={(e) => setParamRows((r) => r.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} className="px-2 h-7 bg-muted border-border text-foreground text-xs flex-1" placeholder="说明" />
                    <button onClick={() => setParamRows((r) => r.filter((_, j) => j !== i))} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">标签（逗号分隔）</label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="px-2 h-8 bg-muted border-border text-foreground text-sm" placeholder="如：珊瑚, SPS, 钙, 新手" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} className="border border-border text-foreground hover:bg-muted h-9">取消</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9">保存条目</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-balance">删除条目</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-pretty">确定删除「{deleteTarget?.title}」吗？此操作不可撤销。</AlertDialogDescription>
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

function KnowledgeCard({
  entry, expanded, onToggle, isCustom, onEdit, onDelete,
}: {
  entry: KnowledgeBaseEntry;
  expanded: boolean;
  onToggle: () => void;
  isCustom: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = CATEGORY_MAP[entry.category] || CATEGORY_MAP.water;
  return (
    <div className="bg-card border border-border rounded overflow-hidden group">
      <div className="flex items-center">
        <button onClick={onToggle} className="flex-1 text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors min-w-0">
          <span className={`${cfg.color} shrink-0`}>{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{entry.title}</div>
            <div className="text-xs text-muted-foreground truncate">{entry.content.slice(0, 55)}...</div>
          </div>
          <span className="text-muted-foreground shrink-0">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>
        {/* 操作按钮 */}
        <div className="flex items-center gap-0.5 px-2 shrink-0">
          {isCustom ? (
            <>
              <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3 h-3" /></button>
              <button onClick={onDelete} className="p-1.5 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-colors"><Trash2 className="w-3 h-3" /></button>
            </>
          ) : (
            <span title="系统内置，不可修改"><Lock className="w-3 h-3 text-muted-foreground/30" /></span>
          )}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{entry.content}</p>
          {entry.params && entry.params.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium whitespace-nowrap">参数</th>
                    <th className="text-left py-2 text-muted-foreground font-medium whitespace-nowrap">参考值</th>
                    <th className="text-left py-2 text-muted-foreground font-medium whitespace-nowrap">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.params.map((p, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-2 text-foreground whitespace-nowrap">{p.name}</td>
                      <td className="py-2 text-primary font-mono whitespace-nowrap">{p.value} {p.unit}</td>
                      <td className="py-2 text-muted-foreground">{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {entry.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


