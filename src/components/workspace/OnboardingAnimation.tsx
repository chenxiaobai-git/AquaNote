import React, { useState, useEffect } from 'react';
import { Waves, FlaskConical, BookOpen, Wrench, Package, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DeepSeaBg from '@/components/ui/DeepSeaBg';

interface OnboardingProps {
  nickname: string;
  onComplete: () => void;
}

const STEPS = [
  {
    icon: <Waves className="w-10 h-10 text-primary icon-glow" />,
    title: '欢迎来到 AquaNote',
    desc: '一款专为水族爱好者打造的深海数据管理工作台，让数据记录与分析如观海般清晰直观。',
  },
  {
    icon: <FlaskConical className="w-10 h-10 text-primary icon-glow" />,
    title: '水质检测记录',
    desc: '记录 pH、氨氮、亚硝酸盐、硝酸盐等关键水质参数，追踪水质变化趋势，守护生态健康。',
  },
  {
    icon: <BookOpen className="w-10 h-10 text-primary icon-glow" />,
    title: '生物图鉴 & 常年图鉴',
    desc: '建立专属生物档案，记录每位成员的状态与历程，用图文日志留存珍贵的水族记忆。',
  },
  {
    icon: <Wrench className="w-10 h-10 text-primary icon-glow" />,
    title: '维护日历 & 消耗品管理',
    desc: '智能维护提醒与消耗品库存追踪，让每次换水、换滤材都不再遗漏，告别手忙脚乱。',
  },
  {
    icon: <Package className="w-10 h-10 text-primary icon-glow" />,
    title: '工作区 · 多缸管理',
    desc: '每个工作区对应一个水族缸，独立管理数据。多缸饲养？轻松切换，数据互不干扰。',
  },
];

export default function OnboardingAnimation({ nickname, onComplete }: OnboardingProps) {
  const [current, setCurrent]   = useState(0);
  const [visible, setVisible]   = useState(false);

  useEffect(() => {
    // 入场
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // 切换步骤时重置可见性
  const handleNext = () => {
    setVisible(false);
    setTimeout(() => {
      if (current < STEPS.length - 1) {
        setCurrent((c) => c + 1);
        setVisible(true);
      } else {
        onComplete();
      }
    }, 200);
  };

  const handleSkip = () => onComplete();

  const step = STEPS[current];

  return (
    <div className="fixed inset-0 z-[99] bg-background flex flex-col items-center justify-center p-6 overflow-hidden">
      <DeepSeaBg particleCount={22} rayCount={3} rippleCount={3} />

      {/* 跳过按钮 */}
      <button
        onClick={handleSkip}
        className="absolute top-5 right-5 z-10 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded border border-border hover:bg-muted"
      >
        跳过
      </button>

      {/* 主内容 */}
      <div
        className="relative z-10 flex flex-col items-center text-center max-w-sm w-full"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
          transition: 'opacity 220ms cubic-bezier(0.16,1,0.3,1), transform 220ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* 欢迎词（仅第一步） */}
        {current === 0 && (
          <div className="flex items-center gap-1.5 mb-4 text-sm text-primary">
            <Sparkles className="w-4 h-4" />
            <span>你好，{nickname} 👋</span>
          </div>
        )}

        {/* 图标圈 */}
        <div className="relative w-24 h-24 flex items-center justify-center mb-7">
          <div className="absolute inset-0 rounded-full border border-primary/15"
            style={{ animation: 'onlinePulse 2s ease-in-out infinite' }} />
          <div className="w-20 h-20 rounded-full bg-card border border-primary/25 flex items-center justify-center"
            style={{ boxShadow: '0 0 30px hsl(191 100% 50% / 0.08)' }}>
            {step.icon}
          </div>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-3 text-balance">{step.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed text-pretty max-w-xs">{step.desc}</p>
      </div>

      {/* 进度 + 下一步 */}
      <div className="relative z-10 mt-10 flex flex-col items-center gap-5 w-full max-w-sm">
        {/* 步骤点 */}
        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? '20px' : '6px',
                height: '6px',
                background: i === current ? 'hsl(191 100% 50%)' : 'hsl(216 18% 25%)',
              }}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          className="w-full max-w-xs bg-primary text-primary-foreground hover:bg-primary/85 h-10 gap-2"
        >
          {current < STEPS.length - 1 ? (
            <>下一步 <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>开始探索 <Waves className="w-4 h-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
