import React, { useState, useEffect } from 'react';
import {
  Waves, FlaskConical, BookOpen, Wrench, Package,
  ChevronRight, Box, ScanLine, ShieldCheck, MessageSquare, Pipette, Fish, Github,
  BookOpenText, FileSpreadsheet, Lightbulb,
} from 'lucide-react';
import DeepSeaBg from '@/components/ui/DeepSeaBg';

interface Props {
  onComplete: () => void;
}

const INTRO_STEPS = [
  {
    title: 'AquaNote',
    subtitle: '水族养护科研级工作台',
    desc: '多维度数据记录、智能分析与 3D 可视化，为您的水族生态建立完整的数字档案。从淡水到海水，从新手到专家。',
    icon: <Waves className="w-12 h-12 text-primary" />,
  },
  {
    title: '3D 可视化建模',
    subtitle: '所见即所得',
    desc: '实时 3D 等轴测线框模型，直观展示鱼缸与过滤系统（背滤、底滤、瀑布滤、侧滤）的空间关系。参数变化即时预览。',
    icon: <Box className="w-10 h-10 text-primary" />,
  },
  {
    title: '水质实验室',
    subtitle: '精准追踪每一滴水',
    desc: '记录 pH、氨氮、亚硝酸盐、硝酸盐、硬度、TDS 等关键指标，生成趋势折线图，自动预警异常波动。',
    icon: <FlaskConical className="w-10 h-10 text-primary" />,
  },
  {
    title: '环境检测',
    subtitle: '综合评估安全边界',
    desc: '智能计算水体体积、生物代谢量、水压承载与玻璃安全上限，生成 0-99 分环境评分，为决策提供科学依据。',
    icon: <ScanLine className="w-10 h-10 text-primary" />,
  },
  {
    title: '辅助设备管理',
    subtitle: '品牌与 DIY 统一管理',
    desc: '记录加热棒、蛋白分离器、造浪泵等设备的品牌、型号与参数，自动计算安全点数加成，评估系统冗余。',
    icon: <ShieldCheck className="w-10 h-10 text-primary" />,
  },
  {
    title: '生物档案',
    subtitle: '每一尾生命都有记录',
    desc: '建立完整的生物档案，追踪来源、入缸日期、生长历程与繁殖记录，让每一个生命时刻都留下痕迹。',
    icon: <Fish className="w-10 h-10 text-primary" />,
  },
  {
    title: '维护日历',
    subtitle: '不再错过任何养护节点',
    desc: '换水、清洁、设备检修——设定周期性任务，自动提醒，逾期高亮，让养护井井有条。',
    icon: <Wrench className="w-10 h-10 text-primary" />,
  },
  {
    title: '补给站',
    subtitle: '库存预警，及时补充',
    desc: '饲料、药品、耗材统一管理，设置消耗周期自动扣减库存，低于阈值即时提醒。',
    icon: <Package className="w-10 h-10 text-primary" />,
  },
  {
    title: '知识库',
    subtitle: '30+ 专业养护指南',
    desc: '覆盖珊瑚、鱼类、水草、设备、鱼病、水质处理等全方位知识，含精确参数参考值。支持搜索和自定义添加个人经验条目，系统内置条目只读保护，您的心得永不丢失。',
    icon: <BookOpenText className="w-10 h-10 text-primary" />,
  },
  {
    title: 'CSV 导出',
    subtitle: '数据自由带走',
    desc: '水质记录、生物档案、维护任务、耗材消耗、环境检测——全部支持一键导出 CSV 文件。数据永远属于您，随时可以用 Excel 分析或分享给他人。',
    icon: <FileSpreadsheet className="w-10 h-10 text-primary" />,
  },
  {
    title: '快捷录入',
    subtitle: '效率翻倍',
    desc: '水质检测支持 7 套预设套餐一键勾选，离散值按钮快速输入，历史记录自动填充。维护任务完成后自动推荐耗材扣减，AI 助手提供 5 种预设快捷提问，一键转为待办任务。',
    icon: <Lightbulb className="w-10 h-10 text-primary" />,
  },
  {
    title: 'AI 水族助手',
    subtitle: '内置专家知识库 + 大模型',
    desc: '覆盖水质、过滤、鱼病、开缸、海水/淡水养护等 20+ 主题。在线时默认调用百度文心大模型（免费），也可配置 DeepSeek Key 切换更强模型。支持一键发送水质数据给 AI 分析。',
    icon: <MessageSquare className="w-10 h-10 text-primary" />,
  },
  {
    title: '开发者',
    subtitle: 'ChenXiaobai',
    desc: 'AquaNote 在 GitHub 完全开源，欢迎 Star、Fork 与贡献。由水族爱好者独立开发，持续迭代中。',
    icon: <Github className="w-10 h-10 text-primary" />,
  },
];

export default function WelcomeIntro({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (step >= INTRO_STEPS.length) {
      onComplete();
      return;
    }
    setFade(true);
  }, [step, onComplete]);

  const handleNext = () => {
    setFade(false);
    setTimeout(() => setStep((s) => s + 1), 250);
  };

  if (step >= INTRO_STEPS.length) return null;

  const current = INTRO_STEPS[step];
  const isFirst = step === 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <DeepSeaBg particleCount={20} rayCount={3} rippleCount={2} />

      <div
        className="relative z-10 w-full max-w-md px-6 flex flex-col items-center text-center transition-all duration-300"
        style={{
          opacity: fade ? 1 : 0,
          transform: fade ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        {/* 步骤指示器 */}
        <div className="flex gap-1.5 mb-8">
          {INTRO_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-primary' : i < step ? 'w-3 bg-primary/40' : 'w-3 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* 图标 */}
        <div className={`mb-6 ${isFirst ? 'jellyfish-breathe' : ''}`}>
          {isFirst ? (
            <div className="relative flex items-center justify-center">
              <div
                className="absolute rounded-full border border-primary/20"
                style={{ width: '96px', height: '96px', animation: 'onlinePulse 2s ease-in-out infinite' }}
              />
              <div className="w-20 h-20 rounded-full flex items-center justify-center border border-primary/30 bg-card glow-border">
                {current.icon}
              </div>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center border border-primary/20 bg-card/80">
              {current.icon}
            </div>
          )}
        </div>

        {/* 文字 */}
        <h1 className={`font-bold text-foreground mb-1 text-balance ${isFirst ? 'text-2xl' : 'text-xl'}`}>
          {current.title}
        </h1>
        <p className="text-sm text-primary/80 mb-3">{current.subtitle}</p>
        <p className="text-sm text-muted-foreground leading-relaxed text-pretty max-w-xs mx-auto mb-8">
          {current.desc}
        </p>

        {/* 按钮 */}
        {step === INTRO_STEPS.length - 1 ? (
          <div className="flex flex-col items-center gap-3">
            <a
              href="https://github.com/chenxiaobai-git/AquaNote"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2 rounded border border-border bg-card text-foreground hover:bg-muted transition-colors text-sm"
            >
              <Github className="w-4 h-4" />
              前往 GitHub
            </a>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded bg-primary text-primary-foreground hover:bg-primary/85 transition-colors text-sm font-medium btn-ripple"
            >
              开始使用
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded bg-primary text-primary-foreground hover:bg-primary/85 transition-colors text-sm font-medium btn-ripple"
          >
            {isFirst ? '开始探索' : '下一步'}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {isFirst && (
          <p className="text-xs text-muted-foreground/40 mt-6">版本 v62 — 2026.5.31</p>
        )}
      </div>
    </div>
  );
}
