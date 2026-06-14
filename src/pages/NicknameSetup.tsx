import React, { useState } from 'react';
import { Waves, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNickname } from '@/contexts/NicknameContext';
import DeepSeaBg from '@/components/ui/DeepSeaBg';

interface NicknameSetupProps {
  onComplete: () => void;
}

export default function NicknameSetup({ onComplete }: NicknameSetupProps) {
  const { setNickname } = useNickname();
  const [nickInput, setNickInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nickInput.trim();
    if (!name) {
      toast.error('请输入你的昵称');
      return;
    }
    setLoading(true);
    setNickname(name);
    toast.success(`欢迎来到深海，${name}！`);
    setLoading(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* 深海背景 */}
      <DeepSeaBg particleCount={28} rayCount={3} rippleCount={3} />

      {/* 背景光晕（保留原有渐变光晕） */}
      <div className="absolute inset-0 pointer-events-none z-[1]">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(191 100% 50% / 0.04) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-[2] w-full max-w-sm page-enter">
        {/* Logo 区域 */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-5">
            {/* 外圈光晕 */}
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-1 rounded-full border border-primary/15" />
            <div className="relative w-16 h-16 rounded-full bg-card border border-primary/30 flex items-center justify-center glow-border">
              <Waves className="w-8 h-8 text-primary icon-glow" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2 tracking-tight">AquaNote</h1>
          <p className="text-muted-foreground text-sm">深海数据管理工作台</p>
        </div>

        {/* 昵称设置卡片 */}
        <div className="bg-card border border-border rounded-sm p-7 gradient-border shadow-2xl" style={{ boxShadow: '0 0 40px hsl(191 100% 50% / 0.05), 0 20px 40px hsl(216 28% 4% / 0.5)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-foreground font-semibold text-base text-balance">设置你的昵称</h2>
          </div>
          <p className="text-muted-foreground text-xs mb-6 text-pretty leading-relaxed">
            首次使用 AquaNote，请设置昵称以开始你的深海探索之旅。
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-normal text-muted-foreground block mb-2">
                昵称
              </label>
              <Input
                className="px-3 h-10 bg-muted border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-colors"
                placeholder="例如：深海探索者"
                value={nickInput}
                onChange={(e) => setNickInput(e.target.value)}
                maxLength={30}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !nickInput.trim()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/85 font-medium h-10 text-sm gap-2 btn-ripple transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  正在初始化...
                </span>
              ) : (
                <>
                  <Waves className="w-4 h-4" />
                  进入 AquaNote
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-muted-foreground/50 text-xs mt-5">
          无需注册 · 数据存储在本地设备
        </p>
      </div>
    </div>
  );
}
