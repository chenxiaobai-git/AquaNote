import React, { useEffect, useState } from 'react';
import { Home } from 'lucide-react';
import DeepSeaBg from '@/components/ui/DeepSeaBg';

/**
 * 退出工作区衔接动画
 * 与 WorkspaceEnterOverlay 对称：淡入 → 短暂停留 → 向下滑出消退
 */
export default function WorkspaceExitOverlay() {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 120);
    const t2 = setTimeout(() => setPhase('exit'), 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'hsl(216 28% 5%)',
        opacity: phase === 'exit' ? 0 : 1,
        transform: phase === 'exit' ? 'translateY(10px)' : 'translateY(0)',
        transition: phase === 'exit'
          ? 'opacity 180ms ease-in, transform 180ms ease-in'
          : phase === 'enter'
          ? 'opacity 110ms ease-out'
          : 'none',
      }}
    >
      {/* 深海背景 */}
      <DeepSeaBg particleCount={16} rayCount={2} rippleCount={2} />

      {/* 中央光晕 */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '380px', height: '380px',
          background: 'radial-gradient(circle, hsl(191 100% 50% / 0.05) 0%, transparent 65%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        }}
      />

      {/* 主内容 */}
      <div
        className="relative z-10 flex flex-col items-center gap-5"
        style={{
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(10px) scale(0.97)' : 'translateY(0) scale(1)',
          transition: 'opacity 180ms ease-out, transform 180ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* 图标 */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute rounded-full border border-primary/15"
            style={{ width: '72px', height: '72px', animation: 'onlinePulse 1.8s ease-in-out infinite' }}
          />
          <div className="w-14 h-14 rounded-full flex items-center justify-center border border-primary/25 bg-card">
            <Home className="w-6 h-6 text-primary" style={{ filter: 'drop-shadow(0 0 6px hsl(191 100% 50% / 0.5))' }} />
          </div>
        </div>

        {/* 文字 */}
        <div className="text-center space-y-1">
          <p className="text-muted-foreground text-xs tracking-widest uppercase">正在返回</p>
          <h2 className="text-lg font-bold gradient-text">主窗口</h2>
        </div>
      </div>
    </div>
  );
}
