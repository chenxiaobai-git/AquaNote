import React, { useEffect, useState } from 'react';
import { Waves } from 'lucide-react';
import DeepSeaBg from '@/components/ui/DeepSeaBg';

interface Props {
  onComplete: () => void;
}

const LOADING_STEPS = [
  '加载界面资源',
  '初始化本地存储',
  '检查主题配置',
  '准备就绪',
];

export default function AppLaunchOverlay({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    LOADING_STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), 700 + i * 500));
    });
    timers.push(setTimeout(() => setFadeOut(true), 3000));
    timers.push(setTimeout(() => onComplete(), 3600));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'hsl(216 28% 5%)',
        opacity: fadeOut ? 0 : 1,
        transition: fadeOut ? 'opacity 600ms ease-in' : 'none',
      }}
    >
      <DeepSeaBg particleCount={22} rayCount={3} rippleCount={3} />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo 动画 */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute rounded-full border border-primary/20"
            style={{
              width: '96px', height: '96px',
              animation: 'onlinePulse 2s ease-in-out infinite',
            }}
          />
          <div
            className="absolute rounded-full border border-primary/15"
            style={{
              width: '112px', height: '112px',
              animation: 'onlinePulse 2.5s ease-in-out infinite 0.3s',
            }}
          />
          <div className="w-20 h-20 rounded-full flex items-center justify-center border border-primary/30 bg-card glow-border">
            <Waves className="w-10 h-10 text-primary icon-glow" />
          </div>
        </div>

        {/* 名称 + 版本 */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold gradient-text tracking-tight">AquaNote</h1>
          <p className="text-muted-foreground text-xs">版本 2026.6</p>
        </div>

        {/* 加载条目 */}
        <div className="w-56 space-y-2">
          {LOADING_STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0"
                style={{
                  borderColor: i < step ? 'hsl(191 100% 50%)' : 'hsl(var(--border))',
                  background: i < step ? 'hsl(191 100% 50% / 0.15)' : 'transparent',
                  transition: 'all 300ms ease',
                }}
              >
                {i < step && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
              <span
                className="text-xs transition-colors duration-300"
                style={{
                  color: i < step ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
