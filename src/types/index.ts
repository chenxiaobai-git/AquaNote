// AquaNote 数据类型定义

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  nickname: string;
  font_size: 'small' | 'medium' | 'large';
  reduce_motion: boolean;
  theme: string;
  language: string;
  is_new_user: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  user_id?: string;
  name: string;
  description: string | null;
  created_at: string;
  last_opened_at: string;
  /** 鱼缸尺寸 cm */
  tank_size?: { x: number; y: number; z: number } | null;
  /** 玻璃厚度 mm */
  glass_thickness?: number | null;
  /** 过滤尺寸是否不含玻璃厚度 */
  filter_excludes_glass?: boolean;
  /** 过滤方式 */
  filter_type?: 'back' | 'bottom' | 'hangon' | 'side' | 'none' | 'custom' | null;
  /** 侧滤方向 */
  side_filter_direction?: 'left' | 'right' | null;
  /** 过滤方式详细数据 */
  filter_detail?: {
    back?: { inner_x: number; inner_y: number; inner_z: number };
    bottom?: { height: number; length?: number; width?: number };
    hangon?: { slot_x: number; slot_y: number; slot_z: number };
    side?: { inner_x: number; inner_y: number; inner_z: number };
    custom?: string;
  } | null;
  /** 当前环境评分 */
  env_score?: number | null;
  /** 上次环境检测日期 */
  last_env_check?: string | null;
}

/** 环境监测记录 */
export interface EnvCheckRecord {
  id: string;
  workspace_id: string;
  /** 检测日期 */
  check_date: string;
  /** 水质数据 JSON */
  water_data: {
    ph: number | null;
    ammonia: number | null;
    nitrite: number | null;
    nitrate: number | null;
    temperature: number | null;
  };
  /** 水体体积 L */
  water_volume: number;
  /** 生物数据 */
  organisms: { count: number; avg_volume_cm3: number }[];
  /** 水压 kPa */
  water_pressure: number;
  /** 玻璃安全承载 kPa */
  glass_capacity: number;
  /** 代谢量估算 g/天 */
  metabolism: number;
  /** 辅助设备加成 */
  equipment_bonus: number;
  /** 最终评分 (0-99.99) */
  score: number;
  /** 评分变化 (+/-) */
  score_delta: number;
  /** 建议说明 */
  suggestions: string[];
  created_at: string;
}

/** 辅助设备 */
export interface Equipment {
  id: string;
  workspace_id: string;
  /** 设备名称 */
  name: string;
  /** 品牌/DIY */
  brand: string;
  /** 配置参数 JSON */
  config: Record<string, string>;
  /** 安全加成点数 */
  safety_bonus: number;
  created_at: string;
  updated_at: string;
}

export interface WaterQualityRecord {
  id: string;
  workspace_id: string;
  ph: number | null;
  ammonia: number | null;
  nitrite: number | null;
  nitrate: number | null;
  kh: number | null;
  gh: number | null;
  tds: number | null;
  temperature: number | null;
  notes: string | null;
  recorded_at: string;
  created_at: string;
}

export interface Organism {
  id: string;
  workspace_id: string;
  name: string;
  scientific_name: string | null;
  image_url: string | null;
  added_date: string | null;
  source: string | null;
  notes: string | null;
  /** 代谢系数：高代谢(1.5)、中代谢(1.0)、低代谢(0.5) */
  metabolic_rate: 'high' | 'medium' | 'low';
  /** 生物体积 cm³ */
  volume_cm3: number | null;
  created_at: string;
  updated_at: string;
}

/** 知识库条目 */
export interface KnowledgeBaseEntry {
  id: string;
  category: 'coral' | 'fish' | 'plant' | 'water' | 'equipment' | 'disease';
  title: string;
  content: string;
  params?: { name: string; value: string; unit: string; note?: string }[];
  tags: string[];
}

/** 测试套餐模板 */
export interface TestTemplate {
  id: string;
  name: string;
  description: string;
  params: { key: string; label: string; unit: string; presetValues?: number[] }[];
  icon: string;
}

export interface MaintenanceTask {
  id: string;
  workspace_id: string;
  title: string;
  task_type: string;
  due_date: string | null;
  completed_at: string | null;
  status: 'pending' | 'completed' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supply {
  id: string;
  workspace_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  threshold: number | null;
  notes: string | null;
  /** 消耗周期（天），必填 */
  consumption_interval: number | null;
  /** 每次消耗量，必填 */
  consumption_amount: number | null;
  /** 上次自动扣减时间 */
  last_deducted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParameterTemplate {
  id: string;
  workspace_id: string;
  param_name: string;
  param_key: string;
  min_value: number | null;
  max_value: number | null;
  unit: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Chronicle {
  id: string;
  workspace_id: string;
  title: string;
  content: string | null;
  event_date: string;
  tags: string[];
  image_urls: string[];
  is_milestone: boolean;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  workspace_id: string;
  content: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

// 工作区模块标签页类型
export type WorkspaceModule =
  | 'water-lab'
  | 'organisms'
  | 'maintenance'
  | 'supplies'
  | 'parameters'
  | 'chronicles'
  | 'env-check'
  | 'equipment'
  | 'knowledge'
  | 'ai-report';

export interface AiReport {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  model: string;
  status: 'generating' | 'completed' | 'failed';
  created_at: string;
}

export interface WorkspaceTab {
  id: string;
  module: WorkspaceModule;
  label: string;
}
