import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Palette, Zap, Check, Trash2,
  Download, Upload, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useNickname } from '@/contexts/NicknameContext';
import { useTheme, type ThemeName } from '@/contexts/ThemeContext';
import { nicknameStorage, KEYS, workspaceStorage } from '@/lib/storage';
import { toast } from 'sonner';
import DeepSeaBg from '@/components/ui/DeepSeaBg';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

const APP_VERSION = '2026.6';

const FONT_SIZES = [
  { value: 'small' as const,  label: '小', px: '13px' },
  { value: 'medium' as const, label: '中', px: '15px' },
  { value: 'large' as const,  label: '大', px: '17px' },
] as const;

const THEMES: { key: ThemeName; label: string; desc: string; preview: string }[] = [
  { key: 'deep-ocean', label: '深海蓝', desc: '默认深色主题', preview: 'bg-[hsl(216,28%,7%)]' },
  { key: 'light',      label: '浅海白', desc: '明亮清晰', preview: 'bg-[hsl(0,0%,97%)]' },
  { key: 'coral',      label: '珊瑚礁', desc: '暖色调深色', preview: 'bg-[hsl(18,30%,8%)]' },
  { key: 'midnight',   label: '午夜紫', desc: '神秘紫色', preview: 'bg-[hsl(250,25%,7%)]' },
];

type FontSize = 'small' | 'medium' | 'large';
type SettingSection = 'profile' | 'appearance' | 'accessibility' | 'data';

const SECTIONS: { id: SettingSection; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: '个人信息',  icon: <User className="w-4 h-4" /> },
  { id: 'appearance',    label: '外观',      icon: <Palette className="w-4 h-4" /> },
  { id: 'accessibility', label: '辅助功能',  icon: <Zap className="w-4 h-4" /> },
  { id: 'data',          label: '数据管理',  icon: <Trash2 className="w-4 h-4" /> },
];

function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function savePref<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { nickname, setNickname } = useNickname();
  const { theme, setTheme } = useTheme();

  const [activeSection, setActiveSection] = useState<SettingSection>('profile');
  const [nickInput, setNickInput] = useState(nickname);
  const [fontSize, setFontSize] = useState<FontSize>(loadPref<FontSize>(KEYS.fontSize, 'medium'));
  const [reduceMotion, setReduceMotion] = useState(loadPref<boolean>(KEYS.reduceMotion, false));
  const [savingProfile, setSavingProfile] = useState(false);
  const [clearDataOpen, setClearDataOpen] = useState(false);
  const [factoryResetOpen, setFactoryResetOpen] = useState(false);
  const [resetConfirmName, setResetConfirmName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 保存个人信息 ──
  const handleSaveProfile = () => {
    const name = nickInput.trim();
    if (!name) { toast.error('昵称不能为空'); return; }
    setSavingProfile(true);
    setNickname(name);
    toast.success('设置已保存');
    setSavingProfile(false);
  };

  // ── 切换减少动效 ──
  const handleToggleMotion = (val: boolean) => {
    setReduceMotion(val);
    document.documentElement.setAttribute('data-reduce-motion', val ? '1' : '0');
    savePref(KEYS.reduceMotion, val);
  };

  // ── 切换字体大小 ──
  const handleFontSize = (val: FontSize) => {
    setFontSize(val);
    document.documentElement.setAttribute('data-font-size', val);
    savePref(KEYS.fontSize, val);
  };

  // ── 导出 .an 文件 ──
  const handleExport = () => {
    const payload = {
      version: APP_VERSION,
      exported_at: new Date().toISOString(),
      data: {
        [KEYS.workspaces]: localStorage.getItem(KEYS.workspaces),
        [KEYS.waterQualityRecords]: localStorage.getItem(KEYS.waterQualityRecords),
        [KEYS.organisms]: localStorage.getItem(KEYS.organisms),
        [KEYS.maintenanceTasks]: localStorage.getItem(KEYS.maintenanceTasks),
        [KEYS.supplies]: localStorage.getItem(KEYS.supplies),
        [KEYS.parameterTemplates]: localStorage.getItem(KEYS.parameterTemplates),
        [KEYS.chronicles]: localStorage.getItem(KEYS.chronicles),
        [KEYS.todos]: localStorage.getItem(KEYS.todos),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aquanote-backup-${new Date().toISOString().slice(0, 10)}.an`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('备份文件已导出');
  };

  // ── 导入 .an 文件 ──
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result as string);
        if (payload.version !== APP_VERSION) {
          toast.error(`版本不匹配：文件为 ${payload.version ?? '未知'}，当前软件为 ${APP_VERSION}`);
          return;
        }
        const data = payload.data as Record<string, string | null>;
        if (!data || typeof data !== 'object') {
          toast.error('备份文件格式错误'); return;
        }
        for (const [key, value] of Object.entries(data)) {
          if (value !== null) localStorage.setItem(key, value);
        }
        toast.success('数据导入成功，请刷新页面');
      } catch {
        toast.error('无法解析备份文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── 恢复出厂设置 ──
  const handleFactoryReset = () => {
    if (resetConfirmName.trim() !== nickname.trim()) {
      toast.error('昵称输入不正确，请输入当前昵称以确认');
      return;
    }
    localStorage.clear();
    setFactoryResetOpen(false);
    toast.success('已恢复出厂设置，即将重新开始');
    setTimeout(() => { window.location.href = '/'; }, 1200);
  };

  // ── 清除所有本地数据 ──
  const handleClearData = () => {
    const keysToClear = [
      KEYS.workspaces, KEYS.waterQualityRecords, KEYS.organisms,
      KEYS.maintenanceTasks, KEYS.supplies, KEYS.parameterTemplates,
      KEYS.chronicles, KEYS.todos,
    ];
    for (const k of keysToClear) localStorage.removeItem(k);
    toast.success('所有数据已清除');
    setClearDataOpen(false);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <DeepSeaBg particleCount={16} rayCount={2} rippleCount={2} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-6 page-enter">
        {/* 顶部导航 */}
        <div className="flex items-center gap-3 mb-7">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-foreground text-balance">设置</h1>
        </div>

        <div className="flex gap-5 flex-col md:flex-row">
          {/* 左侧导航 */}
          <nav className="md:w-44 shrink-0">
            <ul className="space-y-0.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors text-left ${
                      activeSection === s.id
                        ? 'bg-primary/10 text-primary border-l-2 border-primary pl-[10px]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {s.icon}
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* 右侧内容 */}
          <div className="flex-1 min-w-0">
            <div className="bg-card border border-border rounded-sm p-5 space-y-5">

              {/* ── 个人信息 ── */}
              {activeSection === 'profile' && (
                <>
                  <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2 text-balance">个人信息</h2>
                  <div className="space-y-1.5">
                    <label className="text-xs font-normal text-muted-foreground">昵称</label>
                    <Input className="px-3 h-9 bg-muted border-border" value={nickInput}
                      onChange={(e) => setNickInput(e.target.value)} maxLength={30} />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={savingProfile}
                    className="bg-primary text-primary-foreground hover:bg-primary/85 h-9 text-sm">
                    {savingProfile ? '保存中...' : '保存更改'}
                  </Button>
                </>
              )}

              {/* ── 外观 ── */}
              {activeSection === 'appearance' && (
                <>
                  <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2 text-balance">外观</h2>
                  <div className="space-y-3">
                    <label className="text-xs font-normal text-muted-foreground block">字体大小</label>
                    <div className="flex gap-2">
                      {FONT_SIZES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => handleFontSize(s.value)}
                          className={`flex-1 h-10 rounded text-sm font-medium border transition-colors relative ${
                            fontSize === s.value
                              ? 'border-primary text-primary bg-primary/10'
                              : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                          }`}
                        >
                          {s.label}
                          <span className="block text-xs opacity-60 font-normal">{s.px}</span>
                          {fontSize === s.value && (
                            <Check className="absolute top-1 right-1 w-3 h-3 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground/60">字体大小即时生效</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-normal text-muted-foreground block">主题</label>
                    <div className="grid grid-cols-2 gap-2">
                      {THEMES.map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setTheme(t.key)}
                          className={`flex items-center gap-2 p-2.5 rounded text-xs border text-left transition-colors ${
                            theme === t.key
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full border border-border/50 shrink-0 ${t.preview}`} />
                          <div>
                            <div className="font-medium">{t.label}</div>
                            <div className="text-muted-foreground text-[10px]">{t.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── 辅助功能 ── */}
              {activeSection === 'accessibility' && (
                <>
                  <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2 text-balance">辅助功能</h2>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">减少动效</p>
                      <p className="text-xs text-muted-foreground text-pretty">
                        关闭背景粒子、光线、涟漪以及页面过渡动画。
                        系统「减少动态效果」设置也会自动生效。
                      </p>
                    </div>
                    <Switch checked={reduceMotion} onCheckedChange={handleToggleMotion} />
                  </div>
                  <div className="p-3 bg-muted/50 rounded border border-border/50 text-xs text-muted-foreground text-pretty">
                    💡 当系统开启「减少动态效果」时，AquaNote 会自动遵守，无需手动设置。
                  </div>
                </>
              )}

              {/* ── 数据管理 ── */}
              {activeSection === 'data' && (
                <>
                  <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2 text-balance">数据管理</h2>
                  <div className="space-y-5">
                    {/* 导出 */}
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">导出备份</p>
                      <p className="text-xs text-muted-foreground mb-3 text-pretty">将所有工作区数据导出为 .an 文件。</p>
                      <Button variant="ghost"
                        className="border border-border text-foreground hover:bg-muted h-9 text-sm gap-1.5"
                        onClick={handleExport}>
                        <Download className="w-3.5 h-3.5" />
                        导出 .an 文件
                      </Button>
                    </div>
                    {/* 导入 */}
                    <div className="border-t border-border pt-4">
                      <p className="text-sm font-medium text-foreground mb-1">导入备份</p>
                      <p className="text-xs text-muted-foreground mb-3 text-pretty">从 .an 备份文件恢复数据。仅接受版本 {APP_VERSION} 的备份。</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".an"
                        className="hidden"
                        onChange={handleImportFile}
                      />
                      <Button variant="ghost"
                        className="border border-border text-foreground hover:bg-muted h-9 text-sm gap-1.5"
                        onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-3.5 h-3.5" />
                        导入 .an 文件
                      </Button>
                    </div>
                    {/* 清除数据 */}
                    <div className="border-t border-border pt-4">
                      <p className="text-sm font-medium text-destructive mb-1">清除数据</p>
                      <p className="text-xs text-muted-foreground mb-3 text-pretty">清除后所有工作区和记录将被永久删除。</p>
                      <Button variant="ghost"
                        className="border border-destructive/50 text-destructive hover:bg-destructive/10 h-9 text-sm"
                        onClick={() => setClearDataOpen(true)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        清除数据
                      </Button>
                    </div>
                    {/* 恢复出厂设置 */}
                    <div className="border-t border-border pt-4">
                      <p className="text-sm font-medium text-destructive mb-1">恢复出厂设置</p>
                      <p className="text-xs text-muted-foreground mb-3 text-pretty">
                        恢复后所有数据、设置和昵称将被清除，软件回到初始状态。需输入昵称确认防止误触。
                      </p>
                      <Button variant="ghost"
                        className="border border-destructive/50 text-destructive hover:bg-destructive/10 h-9 text-sm gap-1.5"
                        onClick={() => { setResetConfirmName(''); setFactoryResetOpen(true); }}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        恢复出厂设置
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 清除数据确认 */}
      <AlertDialog open={clearDataOpen} onOpenChange={setClearDataOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive text-balance">确认清除所有数据？</AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">此操作不可撤销，所有工作区及相关数据将被永久删除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-sm border-border text-foreground hover:bg-muted">取消</AlertDialogCancel>
            <AlertDialogAction className="h-9 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleClearData}>
              确认清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 恢复出厂设置确认（需输入昵称） */}
      <AlertDialog open={factoryResetOpen} onOpenChange={setFactoryResetOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-1.5 text-balance">
              <AlertTriangle className="w-4 h-4" />
              恢复出厂设置
            </AlertDialogTitle>
            <AlertDialogDescription className="text-pretty">
              此操作将清除所有数据并恢复初始状态。请输入你的昵称「{nickname}」以确认。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            className="px-3 h-9 bg-muted border-border my-1"
            placeholder={`输入昵称「${nickname}」确认`}
            value={resetConfirmName}
            onChange={(e) => setResetConfirmName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFactoryReset()}
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-sm border-border text-foreground hover:bg-muted">取消</AlertDialogCancel>
            <AlertDialogAction
              className="h-9 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleFactoryReset}
              disabled={resetConfirmName.trim() !== nickname.trim()}
            >
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
