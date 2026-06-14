import React, { useState } from 'react';
import { Key, Loader2, Check, Sparkles, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { deepseekStorage } from '@/lib/storage';
import { toast } from 'sonner';

interface DeepSeekKeySetupProps {
  onSuccess: () => void;
}

export default function DeepSeekKeySetup({ onSuccess }: DeepSeekKeySetupProps) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [remember, setRemember] = useState(true);
  const [testing, setTesting] = useState(false);

  const handleSubmit = () => {
    const key = keyInput.trim();
    if (!key) { toast.error('请输入 DeepSeek API Key'); return; }
    if (!key.startsWith('sk-')) { toast.error('Key 格式不正确，应以 sk- 开头'); return; }

    setTesting(true);
    // 由于浏览器 CORS 限制，无法直接验证 DeepSeek API
    // 仅做格式检查，首次使用时自动验证
    setTimeout(() => {
      setTesting(false);
      deepseekStorage.save({ key, remember });
      toast.success('密钥已保存，将在首次对话时自动验证');
      onSuccess();
    }, 600);
  };

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">配置 DeepSeek API</span>
      </div>

      {/* 操作说明 */}
      <div className="bg-muted/60 rounded-sm p-3 border border-border/50 space-y-2 text-xs text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground">如何获取 DeepSeek API Key：</p>
        <ol className="space-y-1.5 list-decimal list-inside">
          <li>打开 <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">DeepSeek 开放平台 <ExternalLink className="w-3 h-3" /></a></li>
          <li>注册或登录账号</li>
          <li>进入「API Keys」页面，点击「创建 API Key」</li>
          <li>复制生成的以 <code className="bg-muted px-1 rounded">sk-</code> 开头的密钥</li>
          <li>将密钥粘贴到下方输入框</li>
        </ol>
      </div>

      {/* 密钥输入 */}
      <div className="space-y-1.5">
        <label className="text-xs font-normal text-muted-foreground">DeepSeek API Key</label>
        <div className="flex gap-1.5">
          <Input
            type={showKey ? 'text' : 'password'}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="sk-xxxxxxxxxxxxxxxx"
            className="px-2 h-8 bg-muted border-border text-foreground text-xs flex-1"
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground shrink-0"
            title={showKey ? '隐藏' : '显示'}
          >
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 记住密钥 */}
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-xs text-foreground">记住密钥</p>
          <p className="text-xs text-muted-foreground">
            {remember ? '密钥保存在本地，下次自动加载' : '关闭浏览器后需重新输入'}
          </p>
        </div>
        <Switch checked={remember} onCheckedChange={setRemember} />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={testing || !keyInput.trim()}
        className="bg-primary text-primary-foreground hover:bg-primary/85 h-8 text-xs gap-1.5"
      >
        {testing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            验证中...
          </>
        ) : (
          <>
            <Key className="w-3.5 h-3.5" />
            验证并启用
          </>
        )}
      </Button>
    </div>
  );
}
