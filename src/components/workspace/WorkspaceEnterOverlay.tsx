import React, { useEffect, useState } from 'react';
import { Waves, Box } from 'lucide-react';
import DeepSeaBg from '@/components/ui/DeepSeaBg';
import TankWireframe from '@/components/three/TankWireframe';
import type { Workspace } from '@/types';

interface Props {
  workspace: Workspace;
}

const LOADING_ITEMS = [
  '加载工作区配置',
  '生成 3D 模型',
  '加载水质数据',
  '加载生物记录',
  '初始化完成',
];

/**
 * 进入工作区衔接动画覆盖层
 * 包含 3D 线条模型和加载条目，时长约 6 秒
 */
export default function WorkspaceEnterOverlay({ workspace }: Props) {
  const [step, setStep] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    LOADING_ITEMS.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), 800 + i * 900));
    });
    timers.push(setTimeout(() => setFadeOut(true), 5600));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'hsl(216 28% 5%)',
        opacity: fadeOut ? 0 : 1,
        transition: fadeOut ? 'opacity 500ms ease-in' : 'none',
      }}
    >
      <DeepSeaBg particleCount={18} rayCount={2} rippleCount={2} />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md px-6">
        {/* Logo + 名称 */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute rounded-full border border-primary/20"
              style={{ width: '72px', height: '72px', animation: 'onlinePulse 2s ease-in-out infinite' }}
            />
            <div className="w-14 h-14 rounded-full flex items-center justify-center border border-primary/30 bg-card glow-border">
              <Waves className="w-7 h-7 text-primary icon-glow" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs tracking-widest uppercase">正在进入</p>
            <h2 className="text-lg font-bold gradient-text text-balance mt-0.5">{workspace.name}</h2>
          </div>
        </div>

        {/* 3D 模型区域 */}
        <div className="w-full aspect-video rounded-sm border border-border/40 bg-card/30 overflow-hidden relative">
          <TankWireframe workspace={workspace} rotate className="w-full h-full" />
        </div>

        {/* 加载条目 */}
        <div className="w-full space-y-1.5">
          {LOADING_ITEMS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border flex items-center justify-center shrink-0"
                style={{
                  borderColor: i < step ? 'hsl(191 100% 50%)' : 'hsl(var(--border))',
                  background: i < step ? 'hsl(191 100% 50% / 0.15)' : 'transparent',
                  transition: 'all 250ms ease',
                }}
              >
                {i < step && <div className="w-1 h-1 rounded-full bg-primary" />}
              </div>
              <span
                className="text-xs transition-colors duration-250"
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
