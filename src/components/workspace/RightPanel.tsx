import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronRight, ChevronLeft, CheckCircle2, Circle, Plus, Bot,
  Activity, ListTodo, Send, Wifi, WifiOff, Loader2, Trash2, KeyRound,
  Settings2, ShieldCheck, ArrowRight, Lightbulb, CalendarPlus,
} from 'lucide-react';
import { todosStorage, maintenanceStorage, deepseekStorage, workspaceStorage, wqrStorage } from '@/lib/storage';
import type { Todo, MaintenanceTask, Workspace } from '@/types';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import DeepSeekKeySetup from '@/components/deepseek/DeepSeekKeySetup';
import { aquabotReply, aquabotFallback } from '@/lib/aquabot';

interface ChatMessage { role: 'user' | 'ai'; text: string; }

interface RightPanelProps {
  workspaceId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const AI_MODEL_KEY = 'aquanote_ai_model';
type AIModel = 'wenxin' | 'deepseek';

function getStoredAIModel(): AIModel {
  try {
    const v = localStorage.getItem(AI_MODEL_KEY);
    if (v === 'deepseek' || v === 'wenxin') return v;
  } catch { /* noop */ }
  return 'wenxin';
}

function storeAIModel(model: AIModel) {
  try { localStorage.setItem(AI_MODEL_KEY, model); } catch { /* noop */ }
}

export default function RightPanel({ workspaceId, collapsed, onToggleCollapse }: RightPanelProps) {
  const isOnline = useOnlineStatus();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [pendingTasks, setPendingTasks] = useState<MaintenanceTask[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showPromptMenu, setShowPromptMenu] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: '你好！我是 AquaNote AI 助手，可回答水质、过滤、生物、设备等问题。在线时默认调用文心大模型，也可配置 DeepSeek Key 切换更强模型。' },
  ]);
  const [dsKey, setDsKey] = useState<string | null>(null);
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [aiModel, setAiModel] = useState<AIModel>(getStoredAIModel);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevOnline = useRef(isOnline);

  // 初始化读取 DeepSeek Key 和工作区
  useEffect(() => {
    const cfg = deepseekStorage.get();
    setDsKey(cfg?.key ?? null);
    setWorkspace(workspaceStorage.getById(workspaceId));
  }, [workspaceId]);

  // 网络状态变化时追加提示消息
  useEffect(() => {
    if (prevOnline.current !== isOnline) {
      setChatMessages((m) => [
        ...m,
        {
          role: 'ai',
          text: isOnline
            ? '✅ 已重新联网，AI 助手已就绪。'
            : '📴 当前处于离线状态，AI 功能暂不可用。',
        },
      ]);
      prevOnline.current = isOnline;
    }
  }, [isOnline]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchData = useCallback(() => {
    setTodos(todosStorage.getForWorkspace(workspaceId));
    setWorkspace(workspaceStorage.getById(workspaceId));
    const today = new Date().toISOString().split('T')[0];
    const tasks = maintenanceStorage.getForWorkspace(workspaceId);
    setPendingTasks(
      tasks
        .filter((t) => t.status !== 'completed')
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
        .slice(0, 5)
        .map((t) => ({
          ...t,
          status: t.due_date && t.due_date < today ? 'overdue' : t.status,
        }))
    );
  }, [workspaceId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddTodo = () => {
    const content = newTodo.trim();
    if (!content) return;
    todosStorage.insert(workspaceId, content);
    setNewTodo('');
    fetchData();
  };

  const handleToggleTodo = (todo: Todo) => {
    todosStorage.update(todo.id, { completed: !todo.completed });
    fetchData();
  };

  const handleDeleteTodo = (e: React.MouseEvent, todo: Todo) => {
    e.stopPropagation();
    todosStorage.delete(todo.id);
    fetchData();
  };

  const handleSwitchModel = (model: AIModel) => {
    setAiModel(model);
    storeAIModel(model);
    const name = model === 'deepseek' ? 'DeepSeek V3' : '文心大模型';
    setChatMessages((m) => [...m, { role: 'ai', text: `🔄 已切换至 ${name}。` }]);
  };

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || aiLoading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    setChatMessages((m) => [...m, userMsg]);
    setChatInput('');
    setAiLoading(true);

    const history = [...chatMessages.slice(-6), userMsg]
      .filter((m) => m.role === 'user' || m.role === 'ai')
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

    // 离线：使用本地知识库
    if (!isOnline) {
      setTimeout(() => {
        const reply = aquabotReply(text) ?? aquabotFallback();
        setChatMessages((m) => [...m, { role: 'ai', text: reply }]);
        setAiLoading(false);
      }, 400);
      return;
    }

    // 用户选择 DeepSeek 且已配置 Key
    if (aiModel === 'deepseek' && dsKey) {
      try {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dsKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: history,
            temperature: 0.7,
          }),
        });
        if (!res.ok) {
          if (res.status === 402) throw new Error('API Key 余额不足或无效（402）');
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content ?? '暂无回复';
        setChatMessages((m) => [...m, { role: 'ai', text: reply }]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '请求失败';
        const fallback = aquabotReply(text) ?? aquabotFallback();
        setChatMessages((m) => [...m, { role: 'ai', text: `${fallback}\n\n（DeepSeek 调用失败：${msg}，已切换至内置助手）` }]);
      } finally {
        setAiLoading(false);
      }
      return;
    }

    // 默认：在线调用百度文心大模型（平台托管，免费）
    try {
      const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aquabot-ai`;
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const reply = data.reply ?? '暂无回复';
      setChatMessages((m) => [...m, { role: 'ai', text: reply }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '请求失败';
      const fallback = aquabotReply(text) ?? aquabotFallback();
      setChatMessages((m) => [...m, { role: 'ai', text: `${fallback}\n\n（文心大模型调用失败：${msg}，已切换至内置助手）` }]);
    } finally {
      setAiLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([{ role: 'ai', text: '对话已清空，有什么可以帮您？' }]);
  };

  const handleKeySuccess = () => {
    const cfg = deepseekStorage.get();
    setDsKey(cfg?.key ?? null);
    setShowKeySetup(false);
  };

  const handleClearKey = () => {
    deepseekStorage.clear();
    setDsKey(null);
    if (aiModel === 'deepseek') {
      setAiModel('wenxin');
      storeAIModel('wenxin');
    }
  };

  const handleSendWaterData = () => {
    const records = wqrStorage.getForWorkspace(workspaceId);
    if (records.length === 0) {
      setChatMessages((m) => [...m, { role: 'ai', text: '📭 当前工作区暂无水质记录，请先在「水质实验室」录入数据。' }]);
      return;
    }
    const latest = records[0];
    const lines = [
      '以下是我的最新水质数据，请帮忙分析：',
      `记录时间：${new Date(latest.recorded_at).toLocaleString('zh-CN')}`,
      `pH：${latest.ph ?? '--'}`,
      `氨氮：${latest.ammonia ?? '--'} mg/L`,
      `亚硝酸盐：${latest.nitrite ?? '--'} mg/L`,
      `硝酸盐：${latest.nitrate ?? '--'} mg/L`,
      `温度：${latest.temperature ?? '--'} °C`,
      `KH：${latest.kh ?? '--'}`,
      `GH：${latest.gh ?? '--'}`,
      `TDS：${latest.tds ?? '--'} ppm`,
    ];
    setChatInput(lines.join('\n'));
  };

  const pendingCount = todos.filter((t) => !t.completed).length;
  const overdueCount = pendingTasks.filter((t) => {
    const today = new Date().toISOString().split('T')[0];
    return t.due_date && t.due_date < today;
  }).length;

  const envScore = workspace?.env_score;
  const hasEnvData = envScore != null;

  if (collapsed) {
    return (
      <aside className="sidebar-transition shrink-0 flex flex-col bg-card border-l border-border" style={{ width: '40px' }}>
        <button
          onClick={onToggleCollapse}
          className="h-12 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="展开右栏"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {/* 折叠时显示网络状态点 */}
        <div className="flex justify-center py-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} title={isOnline ? '已联网' : '离线'} />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="sidebar-transition shrink-0 hidden lg:flex flex-col bg-card border-l border-border overflow-hidden h-full"
      style={{ width: '288px' }}
    >
      {/* 顶部 */}
      <div className="h-12 flex items-center border-b border-border px-3 gap-2 shrink-0">
        <span className="text-sm font-semibold text-foreground flex-1">潮汐浮窗</span>
        {/* 网络状态指示器 */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${
            isOnline
              ? 'text-success bg-success/10'
              : 'text-muted-foreground bg-muted'
          }`}
          title={isOnline ? '网络正常，AI 可用' : '离线状态'}
        >
          {isOnline
            ? <Wifi className="w-3 h-3" />
            : <WifiOff className="w-3 h-3" />}
          <span>{isOnline ? '在线' : '离线'}</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* 概览卡片 — 洋流概览 */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">洋流概览</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* 环境评分 */}
            <div className={`rounded-sm p-2.5 border transition-colors ${
              hasEnvData ? 'bg-primary/5 border-primary/20' : 'bg-muted border-border/50'
            }`}>
              {hasEnvData ? (
                <>
                  <div className="text-xl font-mono font-bold text-primary">{envScore!.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">环境评分</div>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">暂无数据</span>
                  <button
                    onClick={() => {
                      // 触发环境检测模块打开（通过自定义事件或全局状态）
                      window.dispatchEvent(new CustomEvent('aquanote:open-module', { detail: 'env-check' }));
                    }}
                    className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    前往检测 <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="bg-muted rounded-sm p-2.5 border border-border/50">
              <div className="text-xl font-mono font-bold text-foreground">{pendingCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">待办事项</div>
            </div>
            <div className={`rounded-sm p-2.5 border transition-colors ${
              overdueCount > 0 ? 'bg-warning/8 border-warning/25' : 'bg-muted border-border/50'
            }`}>
              <div className={`text-xl font-mono font-bold ${overdueCount > 0 ? 'text-warning' : 'text-foreground'}`}>{overdueCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">逾期任务</div>
            </div>
            <div className="bg-muted rounded-sm p-2.5 border border-border/50">
              <div className="text-xl font-mono font-bold text-foreground">{pendingTasks.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">维护任务</div>
            </div>
          </div>
        </div>

        {/* 待办列表 */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-1.5 mb-2.5">
            <ListTodo className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">待办清单</span>
          </div>
          {/* 快速添加 */}
          <div className="flex gap-1.5 mb-2">
            <Input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
              className="px-2 h-7 bg-muted border-border text-foreground text-xs flex-1"
              placeholder="回车快速添加..."
            />
            <button
              onClick={handleAddTodo}
              className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/85 transition-colors shrink-0"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {todos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3 opacity-60">暂无待办事项</p>
          ) : (
            <div className="space-y-0.5 max-h-44 overflow-y-auto">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="group flex items-center gap-2 p-1.5 rounded hover:bg-muted transition-colors cursor-pointer select-none"
                  onClick={() => handleToggleTodo(todo)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleTodo(todo); }}
                    className="shrink-0 p-0.5 rounded hover:bg-muted/50"
                    title={todo.completed ? '标记为未完成' : '标记为已完成'}
                  >
                    {todo.completed
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <span className={`text-xs flex-1 min-w-0 truncate ${todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {todo.content}
                  </span>
                  <button
                    onClick={(e) => handleDeleteTodo(e, todo)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive text-muted-foreground transition-all shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI 助手对话区 */}
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Bot className={`w-3.5 h-3.5 ${isOnline ? (aiModel === 'deepseek' ? 'text-success' : 'text-primary') : 'text-muted-foreground'}`} />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">AI 水族助手</span>
            <button
              onClick={() => setShowKeySetup(true)}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="模型与密钥设置"
            >
              <Settings2 className="w-3 h-3" />
            </button>
            <button
              onClick={clearChat}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="清空对话"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {/* AI 模式标签与切换 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
              !isOnline
                ? 'border-warning/30 text-warning/80 bg-warning/5'
                : aiModel === 'deepseek'
                  ? 'border-success/30 text-success/80 bg-success/5'
                  : 'border-primary/30 text-primary/80 bg-primary/5'
            }`}>
              {!isOnline ? '离线 · 内置助手' : aiModel === 'deepseek' ? 'DeepSeek V3' : '文心大模型 · 免费'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSwitchModel('wenxin')}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                  aiModel === 'wenxin'
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                文心
              </button>
              <button
                onClick={() => dsKey ? handleSwitchModel('deepseek') : setShowKeySetup(true)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                  aiModel === 'deepseek'
                    ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {dsKey ? 'DeepSeek' : 'DeepSeek 🔒'}
              </button>
            </div>
          </div>

          {/* 密钥设置弹窗 */}
          {showKeySetup && (
            <div className="border border-border rounded bg-card p-2 space-y-2">
              {dsKey && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">当前已配置 DeepSeek Key</span>
                  <button
                    onClick={handleClearKey}
                    className="text-[10px] text-destructive hover:underline"
                  >
                    清除密钥
                  </button>
                </div>
              )}
              <DeepSeekKeySetup onSuccess={handleKeySuccess} />
              <button
                onClick={() => setShowKeySetup(false)}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
              >
                取消
              </button>
            </div>
          )}

          {/* 对话记录 */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded px-2.5 py-1.5 text-xs leading-relaxed text-pretty ${
                  msg.role === 'user'
                    ? 'bg-primary/18 text-primary border border-primary/20'
                    : 'bg-muted text-muted-foreground border border-border/50'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border/50 rounded px-2.5 py-1.5 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground">思考中...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 快捷操作 */}
          {!showKeySetup && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={handleSendWaterData}
                disabled={aiLoading}
                className="text-[10px] px-2 py-1 rounded border border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
              >
                📋 发送水质数据
              </button>
            </div>
          )}

          {/* 预设提示词 + 输入框 */}
          {!showKeySetup && (
            <div className="flex flex-col gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="relative">
                  <button
                    onClick={() => setShowPromptMenu((v) => !v)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Lightbulb className="w-3 h-3" />
                    快捷提问
                  </button>
                  {showPromptMenu && (
                    <div className="absolute bottom-full mb-1 left-0 w-48 bg-card border border-border rounded shadow-lg py-1 z-50">
                      {[
                        { label: '帮我分析水质问题', text: '请根据我的水质记录，分析当前水质状况并给出建议。' },
                        { label: '根据 NO₃ 推荐换水量', text: '我的硝酸盐(NO₃)含量偏高，请推荐合适的换水量和频率。' },
                        { label: '解释 KH/钙镁异常', text: '请解释 KH、钙、镁三者之间的关系，以及异常时的调整方法。' },
                        { label: '推荐适合的鱼种', text: '请根据我的缸体参数和现有生物，推荐适合混养的鱼种。' },
                        { label: '过滤器维护建议', text: '请根据我的过滤系统配置，给出维护周期和滤材更换建议。' },
                      ].map((p) => (
                        <button
                          key={p.label}
                          onClick={() => { setChatInput(p.text); setShowPromptMenu(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* 一键创建任务：检测AI回复中的建议 */}
                {chatMessages.length > 1 && chatMessages[chatMessages.length - 1].role === 'ai' && (
                  <button
                    onClick={() => {
                      const lastAi = chatMessages[chatMessages.length - 1].text;
                      const suggestion = lastAi.slice(0, 80);
                      maintenanceStorage.insert({
                        workspace_id: workspaceId,
                        title: `AI 建议: ${suggestion}...`,
                        task_type: '其他',
                        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                        notes: lastAi,
                        status: 'pending',
                        completed_at: null,
                      });
                      toast.success('已创建维护任务');
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-border/60 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <CalendarPlus className="w-3 h-3" />
                    转为任务
                  </button>
                )}
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                  className="px-2 h-7 bg-muted border-border text-foreground text-xs flex-1"
                  placeholder={!isOnline ? '离线中，内置助手待命…' : '问问水族助手…'}
                  disabled={aiLoading}
                />
                <button
                  onClick={handleSendChat}
                  disabled={aiLoading || !chatInput.trim()}
                  className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {aiLoading
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Send className="w-3 h-3" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
