import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Loader2, Download, Trash2, FileText, AlertCircle, ChevronRight, X, Clock, CheckCircle2, Zap, Lightbulb, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { AiReport, Workspace } from '@/types';
import { aiReportStorage, wqrStorage, organismsStorage, maintenanceStorage, suppliesStorage, envCheckStorage, deepseekStorage, workspaceStorage, todosStorage } from '@/lib/storage';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface AiReportPanelProps {
  workspaceId: string;
}

const FETCH_TIMEOUT = 30000;

async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function buildPrompt(workspace: Workspace | undefined): string {
  if (!workspace) return '';
  const water = wqrStorage.getForWorkspace(workspace.id).slice(-5);
  const organisms = organismsStorage.getForWorkspace(workspace.id);
  const tasks = maintenanceStorage.getForWorkspace(workspace.id);
  const supplies = suppliesStorage.getForWorkspace(workspace.id);
  const env = envCheckStorage.getForWorkspace(workspace.id);
  const latestEnv = env[env.length - 1];
  const tPending = tasks.filter((x) => x.status === 'pending').length;
  const tOverdue = tasks.filter((x) => x.status === 'overdue').length;
  const lowSupplies = supplies.filter((s) => s.quantity <= (s.threshold || 0));

  const lines = [
    `请以资深水族专家的身份，为工作区「${workspace.name}」撰写一份综合健康评估报告。`,
    '报告要求：',
    '1. 包含水质概况、生物状态、维护计划、耗材预警、环境评分、改进建议。',
    '2. 在报告末尾必须输出「紧急处理」和「简易处理」两个分类的建议清单，每项建议单独一行并以 "- " 开头。',
    '3. 「紧急处理」包含需要立即处理的水质异常、生物疾病、逾期任务、库存告急等。',
    '4. 「简易处理」包含日常维护、换水、喂食调整、设备检查等日常建议。',
    '5. 语言专业但易懂，使用中文，排版清晰。',
    '',
    '【水质检测最近 5 条】',
    water.length ? water.map((r) => `- ${new Date(r.recorded_at).toLocaleDateString('zh-CN')} pH=${r.ph} 氨氮=${r.ammonia} 亚硝酸=${r.nitrite} 硝酸=${r.nitrate} KH=${r.kh} GH=${r.gh} TDS=${r.tds} 温度=${r.temperature}`).join('\n') : '暂无记录',
    '',
    `【生物档案】共 ${organisms.length} 条`,
    organisms.length ? organisms.map((x) => `- ${x.name} (${x.scientific_name}) 来源=${x.source} 入缸=${x.added_date} 代谢=${x.metabolic_rate}`).join('\n') : '暂无记录',
    '',
    `【维护任务】待办=${tPending} 逾期=${tOverdue} 总计=${tasks.length}`,
    tasks.length ? tasks.slice(0, 5).map((x) => `- ${x.title} [${x.task_type}] 截止=${x.due_date} 状态=${x.status}`).join('\n') : '暂无记录',
    '',
    `【耗材库存】共 ${supplies.length} 条 预警=${lowSupplies.length}`,
    supplies.length ? supplies.map((s) => `- ${s.name} 库存=${s.quantity}${s.unit} 阈值=${s.threshold}${s.unit}`).join('\n') : '暂无记录',
    '',
    latestEnv ? `【最新环境检测】${new Date(latestEnv.check_date).toLocaleDateString('zh-CN')} 评分=${latestEnv.score} 代谢量=${latestEnv.metabolism}g/天 建议=${(latestEnv.suggestions || []).join(';')}` : '【环境检测】暂无记录',
  ];
  return lines.join('\n');
}

function generateOfflineReport(workspace: Workspace | undefined): string {
  if (!workspace) return '未找到工作区信息';
  const water = wqrStorage.getForWorkspace(workspace.id);
  const organisms = organismsStorage.getForWorkspace(workspace.id);
  const tasks = maintenanceStorage.getForWorkspace(workspace.id);
  const supplies = suppliesStorage.getForWorkspace(workspace.id);
  const env = envCheckStorage.getForWorkspace(workspace.id);
  const latestWater = water[water.length - 1];
  const tOverdue = tasks.filter((x) => x.status === 'overdue').length;
  const lowSupplies = supplies.filter((s) => s.quantity <= (s.threshold || 0));
  const latestEnv = env[env.length - 1];

  const urgent: string[] = [];
  const easy: string[] = [];

  if (latestWater) {
    if ((latestWater.ammonia ?? 0) > 0.5) urgent.push('氨氮偏高，建议立即换水 30% 并检查过滤系统');
    if ((latestWater.nitrite ?? 0) > 0.3) urgent.push('亚硝酸盐偏高，建议增加硝化细菌并减少喂食');
    if ((latestWater.ph ?? 7) < 6.5 || (latestWater.ph ?? 7) > 8.5) urgent.push(`pH 值异常（${latestWater.ph}），建议检测水质缓冲能力`);
  }
  if (tOverdue > 0) urgent.push(`有 ${tOverdue} 项维护任务已逾期，请尽快处理`);
  if (lowSupplies.length > 0) urgent.push(`耗材库存预警：${lowSupplies.map((s) => s.name).join('、')}，请及时补充`);
  if (latestEnv && latestEnv.score < 60) urgent.push(`环境评分较低（${latestEnv.score} 分），请检查过滤与光照系统`);

  easy.push('每周换水 20-30%，保持水质稳定');
  easy.push('定期检查过滤器运行状态，清洗滤材');
  easy.push('观察生物状态，记录异常行为');
  if (organisms.length > 0) {
    const map: Record<string, number> = { high: 10, medium: 5, low: 2 };
    const totalMetabolism = organisms.reduce((sum, o) => sum + (map[o.metabolic_rate] ?? 5), 0);
    easy.push(`当前总代谢量约 ${totalMetabolism.toFixed(1)}g/天，据此调整喂食量`);
  }

  return [
    `【${workspace.name}】综合评估报告（离线简化版）`,
    '',
    `📊 水质概况：共 ${water.length} 条记录。${latestWater ? `最新一次 ${new Date(latestWater.recorded_at).toLocaleDateString('zh-CN')} pH=${latestWater.ph}，氨氮=${latestWater.ammonia}，亚硝酸=${latestWater.nitrite}，硝酸=${latestWater.nitrate}。` : '暂无水质记录。'}`,
    '',
    `🐠 生物状态：共 ${organisms.length} 条档案。${organisms.length ? `包含 ${organisms.map((o) => o.name).join('、')}。` : ''}`,
    '',
    `🔧 维护计划：总计 ${tasks.length} 项任务，${tasks.filter((x) => x.status === 'completed').length} 项已完成，${tOverdue} 项已逾期。${tOverdue > 0 ? '⚠️ 请尽快处理逾期任务！' : ''}`,
    '',
    `📦 耗材库存：${supplies.length} 种耗材。${lowSupplies.length > 0 ? `⚠️ 库存预警：${lowSupplies.map((s) => s.name).join('、')}。` : '库存充足。'}`,
    '',
    latestEnv ? `🌡️ 环境评分：最新评分 ${latestEnv.score}/100。代谢量 ${latestEnv.metabolism}g/天。${latestEnv.suggestions?.length ? `建议：${latestEnv.suggestions.join('；')}。` : ''}` : '',
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '🚨 紧急处理',
    ...((urgent.length ? urgent : ['暂无紧急事项，继续保持良好状态！']).map((s) => `- ${s}`)),
    '',
    '✅ 简易处理',
    ...(easy.map((s) => `- ${s}`)),
    '',
    '💡 提示：接入网络并配置 DeepSeek API 后，可获得由大模型生成的深度分析报告。',
  ].join('\n');
}

function reportHtml(workspace: Workspace | undefined, reportText: string): string {
  const wsName = workspace?.name ?? '未知工作区';
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>AquaNote AI 报告 · ${wsName}</title>
<style>@page{size:A4;margin:20mm}body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;line-height:1.7;color:#1f2937;max-width:800px;margin:0 auto;padding:40px 20px}h1{font-size:22px;font-weight:600;margin-bottom:4px;border-bottom:2px solid #0ea5e9;padding-bottom:8px}.meta{font-size:12px;color:#6b7280;margin-bottom:24px}.report{white-space:pre-wrap;font-size:14px}@media print{body{padding:0}}</style></head>
<body><h1>AquaNote AI 综合报告</h1><div class="meta">工作区：${wsName} &nbsp;|&nbsp; 生成时间：${new Date().toLocaleString('zh-CN')}</div>
<div class="report">${reportText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></body></html>`;
}

export default function AiReportPanel({ workspaceId }: AiReportPanelProps) {
  const [reports, setReports] = useState<AiReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AiReport | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const isOnline = useOnlineStatus();
  const mountedRef = useRef(true);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const workspace = workspaceStorage.getById(workspaceId) ?? undefined;

  const refresh = useCallback(() => {
    setReports(aiReportStorage.getForWorkspace(workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  const startProgress = useCallback(() => {
    setProgress(0);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) { clearInterval(progressTimerRef.current!); return 95; }
        const step = prev < 30 ? 5 : prev < 60 ? 3 : prev < 85 ? 1 : 0.5;
        return Math.min(prev + step, 95);
      });
    }, 600);
  }, []);

  const stopProgress = useCallback(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setProgress(100);
    setTimeout(() => setProgress(0), 800);
  }, []);

  const generateReport = async () => {
    const report = aiReportStorage.insert({
      workspace_id: workspaceId,
      title: `AI 综合报告 ${new Date().toLocaleString('zh-CN')}`,
      content: '',
      model: isOnline ? (deepseekStorage.get()?.key ? 'DeepSeek V3' : '文心大模型') : '离线助手',
      status: 'generating',
      created_at: new Date().toISOString(),
    });
    refresh();
    setGeneratingId(report.id);
    setSelectedReport(report);
    startProgress();

    let content = '';
    try {
      if (isOnline) {
        const dsCfg = deepseekStorage.get();
        if (dsCfg?.key) {
          const res = await fetchWithTimeout(
            'https://api.deepseek.com/chat/completions',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dsCfg.key}` },
              body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: buildPrompt(workspace) }], stream: false }),
            },
            FETCH_TIMEOUT,
          );
          if (!res.ok) throw new Error(`DeepSeek API ${res.status}`);
          const data = await res.json();
          content = data.choices?.[0]?.message?.content || '';
        } else {
          const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aquabot-ai`;
          const res = await fetchWithTimeout(
            edgeUrl,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [{ role: 'user', content: buildPrompt(workspace) }] }),
            },
            FETCH_TIMEOUT,
          );
          if (!res.ok) throw new Error(`Edge Function ${res.status}`);
          const data = await res.json();
          content = data.choices?.[0]?.message?.content || data.text || '';
        }
      }
      if (!content.trim()) content = generateOfflineReport(workspace);
    } catch (e) {
      content = generateOfflineReport(workspace);
      toast.warning('AI 调用失败，已切换至离线报告');
    }

    aiReportStorage.update(report.id, { content, status: 'completed' });
    if (mountedRef.current) {
      stopProgress();
      setGeneratingId(null);
      refresh();
      setSelectedReport((prev) => (prev && prev.id === report.id) ? { ...prev, content, status: 'completed' } : prev);
    }
  };

  const deleteReport = (id: string) => {
    aiReportStorage.delete(id);
    refresh();
    if (selectedReport?.id === id) setSelectedReport(null);
    toast.success('已删除');
  };

  const exportPdf = (report: AiReport) => {
    const html = reportHtml(workspace, report.content);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
    toast.success('已打开打印对话框，请选择「保存为 PDF」');
  };

  const isGenerating = !!generatingId;

  /** 从报告内容提取建议 */
  const parseSuggestions = useCallback((text: string): { urgent: string[]; easy: string[] } => {
    const urgent: string[] = [];
    const easy: string[] = [];
    const lines = text.split('\n');
    let mode: 'urgent' | 'easy' | null = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (/^[🚨#\s]*紧急处理/i.test(line)) { mode = 'urgent'; continue; }
      if (/^[✅#\s]*简易处理/i.test(line)) { mode = 'easy'; continue; }
      if (line.startsWith('-') || line.startsWith('•')) {
        const item = line.replace(/^[-•]\s*/, '').trim();
        if (item && mode === 'urgent') urgent.push(item);
        if (item && mode === 'easy') easy.push(item);
      }
    }
    return { urgent, easy };
  }, []);

  /** 将建议添加到待办清单 */
  const addToTodo = (content: string) => {
    todosStorage.insert(workspaceId, content);
    toast.success('已添加到待办清单');
  };

  const suggestions = selectedReport?.content ? parseSuggestions(selectedReport.content) : { urgent: [], easy: [] };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* 头部工具栏 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">AI 综合报告</h2>
        </div>
        <Button
          onClick={generateReport}
          disabled={isGenerating}
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 gap-1.5 text-xs"
        >
          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {isGenerating ? '生成中…' : '生成新报告'}
        </Button>
      </div>

      {/* 进度条 */}
      {isGenerating && (
        <div className="shrink-0 px-4 py-2 border-b border-border bg-card/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              正在分析工作区数据并请求 AI 助手…
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 主体：左侧列表 + 右侧详情 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧报告列表 */}
        <div className="w-64 shrink-0 border-r border-border bg-muted/20 overflow-y-auto">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center gap-3">
              <FileText className="w-8 h-8 text-muted-foreground/40" />
              <div className="text-xs text-muted-foreground">
                <p>暂无报告</p>
                <p className="mt-1 opacity-70">点击「生成新报告」开始</p>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {reports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`w-full text-left px-3 py-2.5 rounded border text-xs transition-colors ${
                    selectedReport?.id === r.id
                      ? 'bg-primary/8 border-primary/30 text-foreground'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {r.status === 'generating' && <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />}
                    {r.status === 'completed' && <FileText className="w-3 h-3 text-success shrink-0" />}
                    {r.status === 'failed' && <AlertCircle className="w-3 h-3 text-destructive shrink-0" />}
                    <span className="font-medium truncate flex-1">{r.title}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] opacity-70">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(r.created_at).toLocaleString('zh-CN')}
                    <span className="ml-auto">{r.model}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右侧详情 */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-background">
          {!selectedReport ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <FileText className="w-12 h-12 opacity-20" />
              <p className="text-sm">选择左侧报告查看详情</p>
            </div>
          ) : (
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{selectedReport.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(selectedReport.created_at).toLocaleString('zh-CN')} · {selectedReport.model}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedReport.status === 'completed' && (
                    <Button variant="ghost" size="sm" onClick={() => exportPdf(selectedReport)} className="h-7 text-xs gap-1 border border-border hover:bg-muted">
                      <Download className="w-3.5 h-3.5" />
                      导出 PDF
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => deleteReport(selectedReport.id)} className="h-7 text-xs gap-1 border border-border hover:bg-muted text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                  </Button>
                  <button onClick={() => setSelectedReport(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {selectedReport.status === 'generating' ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-sm">报告生成中，请稍候…</p>
                  <p className="text-xs opacity-60">关闭此标签页不会影响生成进度</p>
                </div>
              ) : selectedReport.status === 'failed' ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-destructive">
                  <AlertCircle className="w-6 h-6" />
                  <p className="text-sm">生成失败</p>
                  <p className="text-xs opacity-70">{selectedReport.content || '未知错误'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-muted/30 border border-border rounded-lg p-5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedReport.content}
                  </div>

                  {/* 建议操作区 */}
                  {(suggestions.urgent.length > 0 || suggestions.easy.length > 0) && (
                    <div className="space-y-3">
                      {suggestions.urgent.length > 0 && (
                        <div className="border border-destructive/20 rounded-lg bg-destructive/5 overflow-hidden">
                          <div className="px-4 py-2 flex items-center gap-2 bg-destructive/10 border-b border-destructive/15">
                            <Zap className="w-3.5 h-3.5 text-destructive" />
                            <span className="text-xs font-semibold text-destructive">紧急处理</span>
                            <span className="ml-auto text-[10px] text-destructive/70">{suggestions.urgent.length} 项</span>
                          </div>
                          <div className="p-2 space-y-1">
                            {suggestions.urgent.map((item, idx) => (
                              <div key={`u-${idx}`} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-destructive/5 transition-colors group">
                                <AlertCircle className="w-3 h-3 text-destructive shrink-0 opacity-70" />
                                <span className="text-xs text-foreground flex-1">{item}</span>
                                <button
                                  onClick={() => addToTodo(item)}
                                  className="shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-primary hover:underline transition-opacity px-1.5 py-0.5 rounded hover:bg-primary/10"
                                  title="添加到待办清单"
                                >
                                  <Plus className="w-3 h-3" />
                                  待办
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {suggestions.easy.length > 0 && (
                        <div className="border border-primary/15 rounded-lg bg-primary/5 overflow-hidden">
                          <div className="px-4 py-2 flex items-center gap-2 bg-primary/8 border-b border-primary/10">
                            <Lightbulb className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-semibold text-primary">简易处理</span>
                            <span className="ml-auto text-[10px] text-primary/70">{suggestions.easy.length} 项</span>
                          </div>
                          <div className="p-2 space-y-1">
                            {suggestions.easy.map((item, idx) => (
                              <div key={`e-${idx}`} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-primary/5 transition-colors group">
                                <CheckCircle2 className="w-3 h-3 text-primary shrink-0 opacity-70" />
                                <span className="text-xs text-foreground flex-1">{item}</span>
                                <button
                                  onClick={() => addToTodo(item)}
                                  className="shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-primary hover:underline transition-opacity px-1.5 py-0.5 rounded hover:bg-primary/10"
                                  title="添加到待办清单"
                                >
                                  <Plus className="w-3 h-3" />
                                  待办
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 px-1">
                        <Lightbulb className="w-2.5 h-2.5" />
                        悬停建议项可点击「待办」快速添加到维护清单
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
