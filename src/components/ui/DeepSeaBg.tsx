import React from 'react';

/**
 * 深海背景层 — 三层叠加效果：
 * 1. 浮动粒子（float-particle）
 * 2. 流动光线（light-ray）
 * 3. 涟漪扩散环（ripple-ring）
 *
 * 用法：放在容器 `absolute inset-0 overflow-hidden pointer-events-none z-0`
 */
interface DeepSeaBgProps {
  /** 粒子数量，默认 24 */
  particleCount?: number;
  /** 光线数量，默认 3 */
  rayCount?: number;
  /** 涟漪数量，默认 3 */
  rippleCount?: number;
}

// 粒子配置（通过 i 生成稳定随机）
const P_CONFIGS = Array.from({ length: 36 }, (_, i) => ({
  w: 1 + (i % 4) * 0.7,
  left: (i * 4.37 + 2.5) % 100,
  top: (i * 6.11 + 5.3) % 100,
  alpha: 0.04 + (i % 6) * 0.025,
  delay: (i * 0.28) % 4,
  dur: 4.5 + (i % 5),
}));

// 光线配置
const RAY_CONFIGS = [
  { left: '15%', top: '-10%', rotate: 28, dur: 10, delay: 0, alpha: 0.04 },
  { left: '60%', top: '-5%', rotate: -18, dur: 14, delay: 3.5, alpha: 0.03 },
  { left: '80%', top: '30%', rotate: -42, dur: 11, delay: 7, alpha: 0.035 },
  { left: '5%', top: '50%', rotate: 55, dur: 13, delay: 2, alpha: 0.025 },
];

// 涟漪配置
const RIPPLE_CONFIGS = [
  { cx: '30%', cy: '40%', size: 180, dur: 6, delay: 0, alpha: 0.12 },
  { cx: '70%', cy: '65%', size: 240, dur: 8, delay: 2.5, alpha: 0.08 },
  { cx: '50%', cy: '20%', size: 140, dur: 7, delay: 5, alpha: 0.1 },
];

export default function DeepSeaBg({
  particleCount = 24,
  rayCount = 3,
  rippleCount = 3,
}: DeepSeaBgProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
      {/* ── 层1: 浮动粒子 ── */}
      {P_CONFIGS.slice(0, particleCount).map((p, i) => (
        <div
          key={`p-${i}`}
          className="float-particle absolute rounded-full"
          style={{
            width: `${p.w}px`,
            height: `${p.w}px`,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: `hsl(191 100% 50% / ${p.alpha})`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}

      {/* ── 层2: 流动光线 ── */}
      {RAY_CONFIGS.slice(0, rayCount).map((r, i) => (
        // 外层 div 只负责定位 + 旋转（不参与动画，避免 transform 冲突）
        <div
          key={`r-${i}`}
          className="absolute pointer-events-none"
          style={{
            left: r.left,
            top: r.top,
            width: '2px',
            height: '60vh',
            transform: `rotate(${r.rotate}deg)`,
            transformOrigin: 'top center',
          }}
        >
          {/* 内层 beam 只负责 opacity 动画 */}
          <div
            className="light-ray-beam w-full h-full"
            style={{
              background: `linear-gradient(to bottom, transparent 0%, hsl(191 100% 60% / ${r.alpha}) 28%, hsl(191 100% 55% / ${r.alpha * 0.7}) 68%, transparent 100%)`,
              animationDuration: `${r.dur}s`,
              animationDelay: `${r.delay}s`,
            }}
          />
        </div>
      ))}

      {/* ── 层3: 涟漪扩散环 ── */}
      {RIPPLE_CONFIGS.slice(0, rippleCount).map((rp, i) => (
        <div
          key={`rp-${i}`}
          className="absolute"
          style={{
            left: rp.cx,
            top: rp.cy,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* 双环错开延迟，营造连续感 */}
          {[0, rp.dur / 2].map((offset, j) => (
            <div
              key={j}
              className="absolute rounded-full ripple-ring"
              style={{
                width: `${rp.size}px`,
                height: `${rp.size}px`,
                marginLeft: `-${rp.size / 2}px`,
                marginTop: `-${rp.size / 2}px`,
                border: `1px solid hsl(191 100% 60% / ${rp.alpha})`,
                animationDuration: `${rp.dur}s`,
                animationDelay: `${offset}s`,
              }}
            />
          ))}
        </div>
      ))}

      {/* ── 层4: 中央径向光晕 ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(191 100% 50% / 0.025) 0%, transparent 65%)',
        }}
      />

      {/* ── 层5: 边缘暗角压框 ── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, hsl(216 28% 4% / 0.4) 100%)',
        }}
      />
    </div>
  );
}
