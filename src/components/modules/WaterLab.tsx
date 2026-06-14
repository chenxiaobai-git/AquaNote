import React, { useState, useEffect, useCallback } from 'react';
import { Plus, AlertTriangle, TrendingUp, Copy, Download, LayoutTemplate, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { wqrStorage, paramTemplatesStorage } from '@/lib/storage';
import type { WaterQualityRecord, ParameterTemplate } from '@/types';
import { TEST_TEMPLATES } from '@/lib/testTemplates';
import { exportWaterQualityToCsv, downloadCsv } from '@/lib/exportCsv';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface WaterLabProps { workspaceId: string; }

interface ParamDef {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  presetValues?: number[];
}

const PARAMS: ParamDef[] = [
  { key: 'ph', label: 'pH', unit: '', min: 6.5, max: 8.5 },
  { key: 'ammonia', label: '氨氮', unit: 'mg/L', min: 0, max: 0.25 },
  { key: 'nitrite', label: '亚硝酸', unit: 'mg/L', min: 0, max: 0.5 },
  { key: 'nitrate', label: '硝酸盐', unit: 'mg/L', min: 0, max: 40, presetValues: [0, 0.2, 0.5, 1, 2, 5, 10, 25, 40, 50] },
  { key: 'kh', label: 'KH', unit: '°dH', min: 3, max: 15, presetValues: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] },
  { key: 'gh', label: 'GH', unit: '°dH', min: 5, max: 20 },
  { key: 'tds', label: 'TDS', unit: 'ppm', min: 50, max: 500 },
  { key: 'temperature', label: '温度', unit: '°C', min: 22, max: 30 },
];

type ParamKey = ParamDef['key'];

export default function WaterLab({ workspaceId }: WaterLabProps) {
  const [records, setRecords] = useState<WaterQualityRecord[]>([]);
  const [templates, setTemplates] = useState<ParameterTemplate[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [recordedAt, setRecordedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // 打开对话框时重置并预填今日
  const openAddDialog = () => {
    setForm({});
    setNotes('');
    setRecordedAt(new Date().toISOString().slice(0, 16));
    setActiveTemplateId(null);
    setAddOpen(true);
  };

  // 应用测试套餐模板
  const applyTemplate = (templateId: string) => {
    const tpl = TEST_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setActiveTemplateId(templateId);
    const newForm: Record<string, string> = {};
    tpl.params.forEach((p) => {
      if (!form[p.key]) newForm[p.key] = '';
    });
    setForm((prev) => ({ ...prev, ...newForm }));
    setTemplateMenuOpen(false);
    toast.success(`已加载「${tpl.name}」`);
  };

  // 与上次相同：复制前次记录的值
  const fillFromLast = () => {
    if (!latest) { toast.error('没有历史记录可复制'); return; }
    setForm({
      ph: latest.ph !== null ? String(latest.ph) : '',
      ammonia: latest.ammonia !== null ? String(latest.ammonia) : '',
      nitrite: latest.nitrite !== null ? String(latest.nitrite) : '',
      nitrate: latest.nitrate !== null ? String(latest.nitrate) : '',
      kh: latest.kh !== null ? String(latest.kh) : '',
      gh: latest.gh !== null ? String(latest.gh) : '',
      tds: latest.tds !== null ? String(latest.tds) : '',
      temperature: latest.temperature !== null ? String(latest.temperature) : '',
    });
    toast.success('已填充上次记录的值');
  };

  // CSV 导出
  const handleExportCsv = () => {
    const all = wqrStorage.getForWorkspace(workspaceId);
    if (all.length === 0) { toast.error('没有记录可导出'); return; }
    const csv = exportWaterQualityToCsv(all);
    const isElectron = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).electronAPI;
    if (isElectron) {
      const api = (window as unknown as {
        electronAPI: { saveFile: (opts: { defaultPath: string; content: string }) => Promise<{ canceled: boolean; filePath?: string }> }
      }).electronAPI;
      api.saveFile({
        defaultPath: `水质记录_${workspaceId.slice(0, 6)}_${new Date().toISOString().slice(0, 10)}.csv`,
        content: csv,
      }).then((result) => {
        if (!result.canceled && result.filePath) toast.success('CSV 已导出');
      });
    } else {
      downloadCsv(csv, `水质记录_${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('CSV 已下载');
    }
  };
  const [chartParam, setChartParam] = useState<ParamKey>('ph');
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');

  const fetchRecords = useCallback(async () => {
    setRecords(wqrStorage.getForWorkspace(workspaceId));
  }, [workspaceId]);

  const fetchTemplates = useCallback(async () => {
    setTemplates(paramTemplatesStorage.getForWorkspace(workspaceId));
  }, [workspaceId]);

  useEffect(() => { fetchRecords(); fetchTemplates(); }, [fetchRecords, fetchTemplates]);

  const getTemplate = (key: string) => templates.find((t) => t.param_key === key);

  const isWarning = (key: string, value: number | null) => {
    if (value === null) return false;
    const tmpl = getTemplate(key);
    if (tmpl) {
      if (tmpl.min_value !== null && value < tmpl.min_value) return true;
      if (tmpl.max_value !== null && value > tmpl.max_value) return true;
    } else {
      const def = PARAMS.find((p) => p.key === key);
      if (def && (value < def.min || value > def.max)) return true;
    }
    return false;
  };

  const handleSave = async (continueAdding = false) => {
    setSaving(true);
    const payload: Omit<WaterQualityRecord, 'id' | 'created_at'> = {
      workspace_id: workspaceId,
      ph: form['ph'] ? parseFloat(form['ph']) : null,
      ammonia: form['ammonia'] ? parseFloat(form['ammonia']) : null,
      nitrite: form['nitrite'] ? parseFloat(form['nitrite']) : null,
      nitrate: form['nitrate'] ? parseFloat(form['nitrate']) : null,
      kh: form['kh'] ? parseFloat(form['kh']) : null,
      gh: form['gh'] ? parseFloat(form['gh']) : null,
      tds: form['tds'] ? parseFloat(form['tds']) : null,
      temperature: form['temperature'] ? parseFloat(form['temperature']) : null,
      notes: notes || null,
      recorded_at: recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString(),
    };
    wqrStorage.insert(payload);
    setSaving(false);
    toast.success('水质记录已添加');
    fetchRecords();
    if (continueAdding) {
      // 再次录入：重置表单，保持对话框开启，时间刷新为现在
      setForm({});
      setNotes('');
      setRecordedAt(new Date().toISOString().slice(0, 16));
    } else {
      setAddOpen(false);
      setForm({});
      setNotes('');
    }
  };

  const chartData = [...records]
    .reverse()
    .slice(-20)
    .map((r) => ({
      time: new Date(r.recorded_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      value: r[chartParam as keyof WaterQualityRecord] as number | null,
    }))
    .filter((d) => d.value !== null);

  const latest = records[0];
  const paramDef = PARAMS.find((p) => p.key === chartParam);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground">水质实验室</h2>
          <p className="text-xs text-muted-foreground mt-0.5">记录和监测水族箱水质参数</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex border border-border rounded overflow-hidden">
            <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-xs transition-colors ${viewMode === 'table' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>表格</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs transition-colors ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>列表</button>
          </div>
          <Button variant="outline" onClick={handleExportCsv} className="h-9 gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />导出 CSV
          </Button>
          <Button onClick={openAddDialog} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />快速录入
          </Button>
        </div>
      </div>

      {/* 最新参数概览 */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PARAMS.slice(0, 8).map((p) => {
            const val = latest[p.key as keyof WaterQualityRecord] as number | null;
            const warn = isWarning(p.key, val);
            return (
              <div key={p.key} className={`bg-card border rounded p-3 ${warn ? 'border-warning/50 glow-border-warning' : 'border-border'}`}>
                <div className="text-xs text-muted-foreground mb-1">{p.label}</div>
                <div className={`text-lg font-mono font-semibold ${warn ? 'text-warning warning-pulse' : 'text-foreground'}`}>
                  {val !== null ? val : '—'}
                  {val !== null && <span className="text-xs font-normal ml-1 text-muted-foreground">{p.unit}</span>}
                </div>
                {warn && <div className="flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3 text-warning" /><span className="text-xs text-warning">超出范围</span></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* 趋势图 */}
      {records.length > 1 && (
        <div className="bg-card border border-border rounded p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">趋势图</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {PARAMS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setChartParam(p.key)}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${chartParam === p.key ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full min-w-0 overflow-hidden" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'hsl(215 13% 55%)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215 13% 55%)' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(216 22% 11%)', border: '1px solid hsl(216 18% 18%)', borderRadius: '2px', fontSize: '12px' }}
                  labelStyle={{ color: 'hsl(210 30% 91%)' }}
                  itemStyle={{ color: 'hsl(191 100% 50%)' }}
                />
                {paramDef && <ReferenceLine y={paramDef.max} stroke="hsl(42 100% 50% / 0.4)" strokeDasharray="4 2" />}
                {paramDef && <ReferenceLine y={paramDef.min} stroke="hsl(42 100% 50% / 0.4)" strokeDasharray="4 2" />}
                <Line type="monotone" dataKey="value" stroke="hsl(191 100% 50%)" strokeWidth={1.5} dot={{ r: 3, fill: 'hsl(191 100% 50%)' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 历史记录 */}
      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-medium text-foreground">历史记录</span>
        </div>
        {records.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-sm">暂无水质记录，点击「快速录入」添加第一条</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-medium whitespace-nowrap">时间</th>
                  {PARAMS.map((p) => (
                    <th key={p.key} className="text-right px-3 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{p.label}</th>
                  ))}
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-medium whitespace-nowrap">备注</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 20).map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(r.recorded_at).toLocaleDateString('zh-CN')}
                    </td>
                    {PARAMS.map((p) => {
                      const val = r[p.key as keyof WaterQualityRecord] as number | null;
                      const warn = isWarning(p.key, val);
                      return (
                        <td key={p.key} className={`px-3 py-2 text-right font-mono whitespace-nowrap ${warn ? 'text-warning' : 'text-foreground'}`}>
                          {val !== null ? val : '—'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {records.slice(0, 20).map((r) => (
              <div key={r.id} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{new Date(r.recorded_at).toLocaleString('zh-CN')}</span>
                  {r.notes && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{r.notes}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {PARAMS.map((p) => {
                    const val = r[p.key as keyof WaterQualityRecord] as number | null;
                    if (val === null) return null;
                    const warn = isWarning(p.key, val);
                    return (
                      <span key={p.key} className={`text-xs px-2 py-0.5 rounded border ${warn ? 'border-warning/40 text-warning bg-warning/10' : 'border-border text-foreground bg-muted'}`}>
                        {p.label}: {val}{p.unit}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快速录入对话框 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground text-balance">快速录入水质参数</DialogTitle>
          </DialogHeader>

          {/* 测试套餐选择器 */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs text-muted-foreground">测试套餐：</span>
            <div className="relative">
              <button
                onClick={() => setTemplateMenuOpen((v) => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded bg-muted hover:bg-muted/80 transition-colors text-foreground"
              >
                <LayoutTemplate className="w-3 h-3" />
                {activeTemplateId ? TEST_TEMPLATES.find((t) => t.id === activeTemplateId)?.name : '选择套餐'}
                <ChevronDown className="w-3 h-3" />
              </button>
              {templateMenuOpen && (
                <div className="absolute z-50 mt-1 w-52 bg-card border border-border rounded shadow-lg py-1">
                  {TEST_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t.id)}
                      className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      <div className="font-medium">{t.name}</div>
                      <div className="text-muted-foreground/70">{t.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {latest && (
              <Button variant="ghost" size="sm" onClick={fillFromLast} className="h-7 gap-1 text-xs border border-border">
                <Copy className="w-3 h-3" />与上次相同
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 py-2">
            {/* 检测日期 */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">检测时间</label>
              <Input
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className="px-2 h-8 bg-muted border-border text-foreground text-sm"
              />
            </div>
            {PARAMS.map((p) => (
              <div key={p.key} className="space-y-1">
                <label className="text-xs font-normal text-muted-foreground block">
                  {p.label}{p.unit && <span className="ml-1 opacity-60">({p.unit})</span>}
                </label>
                {/* 有预设离散值时用分段按钮，否则用自由输入 */}
                {p.presetValues ? (
                  <div className="flex flex-wrap gap-1">
                    {p.presetValues.map((v) => (
                      <button
                        key={v}
                        onClick={() => setForm((f) => ({ ...f, [p.key]: String(v) }))}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          form[p.key] === String(v)
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border bg-muted text-foreground hover:bg-muted/80'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                    <Input
                      type="number"
                      step="any"
                      value={form[p.key] && !p.presetValues.map((v) => String(v)).includes(form[p.key]) ? form[p.key] : ''}
                      onChange={(e) => setForm((f) => ({ ...f, [p.key]: e.target.value }))}
                      className="px-2 h-7 bg-muted border-border text-foreground text-xs w-16"
                      placeholder="其他"
                    />
                  </div>
                ) : (
                  <Input
                    type="number"
                    step="any"
                    value={form[p.key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [p.key]: e.target.value }))}
                    className="px-2 h-8 bg-muted border-border text-foreground text-sm"
                    placeholder={`${p.min}–${p.max}`}
                  />
                )}
              </div>
            ))}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-normal text-muted-foreground block">备注</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="px-2 h-8 bg-muted border-border text-foreground text-sm"
                placeholder="可选备注..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 flex-wrap sm:flex-nowrap">
            <Button variant="ghost" onClick={() => setAddOpen(false)} className="border border-border text-foreground hover:bg-muted h-9">取消</Button>
            <Button
              variant="ghost"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="border border-border text-foreground hover:bg-muted hover:border-primary/40 h-9 gap-1.5"
            >
              再次录入
            </Button>
            <Button onClick={() => handleSave(false)} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 h-9">
              {saving ? '保存中...' : '保存记录'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
