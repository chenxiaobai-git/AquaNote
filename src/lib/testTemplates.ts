import type { TestTemplate } from '@/types';

/** 预设测试套餐 — 降低输入门槛，一键调出常用参数组合 */
export const TEST_TEMPLATES: TestTemplate[] = [
  {
    id: 'tpl-startup',
    name: '开缸套餐',
    description: '新缸 setup 或氮循环监测必备',
    icon: 'FlaskConical',
    params: [
      { key: 'ammonia', label: '氨氮', unit: 'mg/L' },
      { key: 'nitrite', label: '亚硝酸', unit: 'mg/L' },
      { key: 'nitrate', label: '硝酸盐', unit: 'mg/L' },
      { key: 'ph', label: 'pH', unit: '' },
    ],
  },
  {
    id: 'tpl-coral-sps',
    name: 'SPS 珊瑚套餐',
    description: '硬骨珊瑚日常监测',
    icon: 'Coral',
    params: [
      { key: 'ca', label: '钙', unit: 'ppm' },
      { key: 'mg', label: '镁', unit: 'ppm' },
      { key: 'kh', label: 'KH', unit: '°dH' },
      { key: 'po4', label: 'PO₄', unit: 'ppm' },
      { key: 'no3', label: 'NO₃', unit: 'ppm' },
      { key: 'ph', label: 'pH', unit: '' },
      { key: 'temperature', label: '温度', unit: '°C' },
    ],
  },
  {
    id: 'tpl-coral-lps',
    name: 'LPS 珊瑚套餐',
    description: '软体/ LPS 珊瑚日常监测',
    icon: 'Coral',
    params: [
      { key: 'ca', label: '钙', unit: 'ppm' },
      { key: 'kh', label: 'KH', unit: '°dH' },
      { key: 'po4', label: 'PO₄', unit: 'ppm' },
      { key: 'no3', label: 'NO₃', unit: 'ppm' },
      { key: 'ph', label: 'pH', unit: '' },
    ],
  },
  {
    id: 'tpl-freshwater',
    name: '淡水社区套餐',
    description: '淡水混养缸常规检测',
    icon: 'Fish',
    params: [
      { key: 'ph', label: 'pH', unit: '' },
      { key: 'gh', label: 'GH', unit: '°dH' },
      { key: 'kh', label: 'KH', unit: '°dH' },
      { key: 'nitrate', label: 'NO₃', unit: 'ppm' },
      { key: 'temperature', label: '温度', unit: '°C' },
    ],
  },
  {
    id: 'tpl-salifert-no3',
    name: '莎利法 NO₃',
    description: '滴定测试专用：硝酸盐离散读数',
    icon: 'Droplets',
    params: [
      { key: 'nitrate', label: '硝酸盐', unit: 'mg/L', presetValues: [0, 0.2, 0.5, 1, 2, 5, 10, 25, 50] },
    ],
  },
  {
    id: 'tpl-salifert-po4',
    name: '莎利法 PO₄',
    description: '滴定测试专用：磷酸盐离散读数',
    icon: 'Droplets',
    params: [
      { key: 'po4', label: 'PO₄', unit: 'ppm', presetValues: [0, 0.03, 0.1, 0.3, 1, 3, 10] },
    ],
  },
  {
    id: 'tpl-weekly',
    name: '周检套餐',
    description: '每周必测的基础参数',
    icon: 'Calendar',
    params: [
      { key: 'ph', label: 'pH', unit: '' },
      { key: 'nitrate', label: 'NO₃', unit: 'ppm' },
      { key: 'temperature', label: '温度', unit: '°C' },
      { key: 'tds', label: 'TDS', unit: 'ppm' },
    ],
  },
];

export function getTemplateById(id: string): TestTemplate | undefined {
  return TEST_TEMPLATES.find((t) => t.id === id);
}
