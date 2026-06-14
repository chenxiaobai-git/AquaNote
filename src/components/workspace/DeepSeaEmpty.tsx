import React from 'react';
import type { Workspace } from '@/types';
import TankWireframe from '@/components/three/TankWireframe';

interface Props {
  workspace?: Workspace;
}

/** 中央空状态：仅显示大幅 3D 模型 */
export default function DeepSeaEmpty({ workspace }: Props) {
  return (
    <div className="h-full flex items-center justify-center relative overflow-hidden bg-background select-none">
      {/* 背景粒子 */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="float-particle absolute rounded-full pointer-events-none"
          style={{
            width: `${1 + (i % 3)}px`,
            height: `${1 + (i % 3)}px`,
            left: `${(i * 7.1 + 8) % 100}%`,
            top: `${(i * 4.7 + 12) % 100}%`,
            background: `hsl(191 100% 50% / ${0.03 + (i % 5) * 0.015})`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${6 + (i % 4)}s`,
          }}
        />
      ))}

      {/* 3D 模型：占满大部分中央区域 */}
      {workspace ? (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="w-full h-full max-h-full">
            <TankWireframe workspace={workspace} rotate />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-muted-foreground/40">
          <svg width="48" height="60" viewBox="0 0 80 100" fill="none">
            <ellipse cx="40" cy="32" rx="28" ry="20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <path d="M22 50 Q16 60 24 74" stroke="currentColor" strokeWidth="1" opacity="0.2" />
            <path d="M30 50 Q24 60 32 74" stroke="currentColor" strokeWidth="1" opacity="0.2" />
            <path d="M38 50 Q32 60 40 74" stroke="currentColor" strokeWidth="1" opacity="0.2" />
          </svg>
          <span className="text-xs">选择工作区以查看模型</span>
        </div>
      )}
    </div>
  );
}
