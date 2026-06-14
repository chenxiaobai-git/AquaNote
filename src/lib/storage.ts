/**
 * AquaNote 本地存储服务
 * 所有数据存储在 localStorage，纯本地运行，无需服务器。
 */
import type {
  Workspace, WaterQualityRecord, Organism,
  MaintenanceTask, Supply, ParameterTemplate, Chronicle, Todo, EnvCheckRecord, KnowledgeBaseEntry, AiReport,
} from '@/types';

// ─── 存储 Key 定义 ────────────────────────────────────────────
export const KEYS = {
  nickname:            'aquanote_nickname',
  deepseekKey:         'aquanote_deepseek_key',
  rememberDeepseek:    'aquanote_deepseek_remember',
  workspaces:          'aquanote_workspaces',
  waterQualityRecords: 'aquanote_water_quality_records',
  organisms:           'aquanote_organisms',
  maintenanceTasks:    'aquanote_maintenance_tasks',
  supplies:            'aquanote_supplies',
  parameterTemplates:  'aquanote_parameter_templates',
  chronicles:          'aquanote_chronicles',
  todos:               'aquanote_todos',
  fontSize:            'aquanote_font_size',
  reduceMotion:        'aquanote_reduce_motion',
  theme:               'aquanote_theme',
  envCheckRecords:     'aquanote_env_check_records',
  customKnowledge:     'aquanote_custom_knowledge',
  aiReports:           'aquanote_ai_reports',
} as const;

// ─── 基础工具 ─────────────────────────────────────────────────

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

function now() { return new Date().toISOString(); }
function uid() { return crypto.randomUUID(); }

// ─── Nickname ───────────────────────────────────────────────

export const nicknameStorage = {
  get(): string | null {
    return localStorage.getItem(KEYS.nickname);
  },
  save(nickname: string): void {
    localStorage.setItem(KEYS.nickname, nickname.trim());
  },
  clear(): void {
    localStorage.removeItem(KEYS.nickname);
  },
};

// ─── DeepSeek Key ───────────────────────────────────────────

export interface DeepSeekKeyConfig {
  key: string;
  remember: boolean;
}

export const deepseekStorage = {
  get(): DeepSeekKeyConfig | null {
    try {
      const raw = localStorage.getItem(KEYS.deepseekKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { key: parsed.key ?? '', remember: true };
      }
    } catch { /* noop */ }
    try {
      const raw = sessionStorage.getItem(KEYS.deepseekKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { key: parsed.key ?? '', remember: false };
      }
    } catch { /* noop */ }
    return null;
  },
  save(config: DeepSeekKeyConfig): void {
    const item = JSON.stringify({ key: config.key });
    if (config.remember) {
      localStorage.setItem(KEYS.deepseekKey, item);
      localStorage.setItem(KEYS.rememberDeepseek, '1');
      sessionStorage.removeItem(KEYS.deepseekKey);
    } else {
      sessionStorage.setItem(KEYS.deepseekKey, item);
      localStorage.removeItem(KEYS.deepseekKey);
      localStorage.removeItem(KEYS.rememberDeepseek);
    }
  },
  clear(): void {
    localStorage.removeItem(KEYS.deepseekKey);
    localStorage.removeItem(KEYS.rememberDeepseek);
    sessionStorage.removeItem(KEYS.deepseekKey);
  },
};

// ─── 通用工作区过滤 ────────────────────────────────────────────

function forWorkspace<T extends { workspace_id: string }>(
  key: string,
  workspaceId: string,
): T[] {
  return read<T>(key).filter((item) => item.workspace_id === workspaceId);
}


interface CreateOpts {
  description?: string;
  tank_size?: { x: number; y: number; z: number };
  glass_thickness?: number;
  filter_excludes_glass?: boolean;
  filter_type?: 'back' | 'bottom' | 'hangon' | 'side' | 'none' | 'custom';
  side_filter_direction?: 'left' | 'right';
  filter_detail?: Workspace['filter_detail'];
}

// ─── Workspaces ───────────────────────────────────────────────

export const workspaceStorage = {
  getAll(): Workspace[] {
    return read<Workspace>(KEYS.workspaces)
      .sort((a, b) => new Date(b.last_opened_at).getTime() - new Date(a.last_opened_at).getTime());
  },
  getById(id: string): Workspace | null {
    return read<Workspace>(KEYS.workspaces).find((w) => w.id === id) ?? null;
  },
  insert(
    name: string,
    opts?: CreateOpts,
  ): Workspace {
    const ws: Workspace = {
      id: uid(), name,
      description: opts?.description ?? null,
      created_at: now(), last_opened_at: now(),
      tank_size: opts?.tank_size ?? null,
      glass_thickness: opts?.glass_thickness ?? null,
      filter_excludes_glass: opts?.filter_excludes_glass ?? false,
      filter_type: opts?.filter_type ?? null,
      side_filter_direction: opts?.side_filter_direction ?? null,
      filter_detail: opts?.filter_detail ?? null,
      env_score: null,
      last_env_check: null,
    };
    const all = read<Workspace>(KEYS.workspaces);
    write(KEYS.workspaces, [...all, ws]);
    return ws;
  },
  updateLastOpened(id: string): void {
    const all = read<Workspace>(KEYS.workspaces).map((w) =>
      w.id === id ? { ...w, last_opened_at: now() } : w
    );
    write(KEYS.workspaces, all);
  },
  update(id: string, updates: Partial<Workspace>): void {
    const all = read<Workspace>(KEYS.workspaces).map((w) =>
      w.id === id ? { ...w, ...updates, last_opened_at: now() } : w
    );
    write(KEYS.workspaces, all);
  },
  delete(id: string): void {
    write(KEYS.workspaces, read<Workspace>(KEYS.workspaces).filter((w) => w.id !== id));
    const cascadeKeys = [
      KEYS.waterQualityRecords, KEYS.organisms, KEYS.maintenanceTasks,
      KEYS.supplies, KEYS.parameterTemplates, KEYS.chronicles, KEYS.todos,
    ];
    for (const key of cascadeKeys) {
      const items = read<{ workspace_id: string }>(key).filter((i) => i.workspace_id !== id);
      write(key, items);
    }
  },
};

// ─── WaterQualityRecords ──────────────────────────────────────

export const wqrStorage = {
  getForWorkspace(workspaceId: string): WaterQualityRecord[] {
    return forWorkspace<WaterQualityRecord>(KEYS.waterQualityRecords, workspaceId)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
      .slice(0, 50);
  },
  insert(record: Omit<WaterQualityRecord, 'id' | 'created_at'>): WaterQualityRecord {
    const item: WaterQualityRecord = { ...record, id: uid(), created_at: now() };
    write(KEYS.waterQualityRecords, [...read<WaterQualityRecord>(KEYS.waterQualityRecords), item]);
    return item;
  },
  delete(id: string): void {
    write(KEYS.waterQualityRecords, read<WaterQualityRecord>(KEYS.waterQualityRecords).filter((r) => r.id !== id));
  },
};

// ─── Organisms ────────────────────────────────────────────────

export const envCheckStorage = {
  getForWorkspace(workspaceId: string): EnvCheckRecord[] {
    return forWorkspace<EnvCheckRecord>(KEYS.envCheckRecords, workspaceId)
      .sort((a, b) => new Date(a.check_date).getTime() - new Date(b.check_date).getTime());
  },
  insert(record: Omit<EnvCheckRecord, 'id' | 'created_at'>): EnvCheckRecord {
    const item: EnvCheckRecord = { ...record, id: uid(), created_at: now() };
    write(KEYS.envCheckRecords, [...read<EnvCheckRecord>(KEYS.envCheckRecords), item]);
    return item;
  },
  delete(id: string): void {
    write(KEYS.envCheckRecords, read<EnvCheckRecord>(KEYS.envCheckRecords).filter((r) => r.id !== id));
  },
  deleteForWorkspace(workspaceId: string): void {
    write(KEYS.envCheckRecords, read<EnvCheckRecord>(KEYS.envCheckRecords).filter((r) => r.workspace_id !== workspaceId));
  },
};

// ─── Organisms ────────────────────────────────────────────────

export const organismsStorage = {
  getForWorkspace(workspaceId: string): Organism[] {
    return forWorkspace<Organism>(KEYS.organisms, workspaceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  insert(payload: Omit<Organism, 'id' | 'created_at' | 'updated_at'>): Organism {
    const item: Organism = { ...payload, id: uid(), created_at: now(), updated_at: now() };
    write(KEYS.organisms, [...read<Organism>(KEYS.organisms), item]);
    return item;
  },
  update(id: string, updates: Partial<Organism>): void {
    write(KEYS.organisms, read<Organism>(KEYS.organisms).map((o) =>
      o.id === id ? { ...o, ...updates, updated_at: now() } : o
    ));
  },
  delete(id: string): void {
    write(KEYS.organisms, read<Organism>(KEYS.organisms).filter((o) => o.id !== id));
  },
};

// ─── MaintenanceTasks ─────────────────────────────────────────

export const maintenanceStorage = {
  getForWorkspace(workspaceId: string): MaintenanceTask[] {
    return forWorkspace<MaintenanceTask>(KEYS.maintenanceTasks, workspaceId)
      .sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
  },
  insert(payload: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'>): MaintenanceTask {
    const item: MaintenanceTask = { ...payload, id: uid(), created_at: now(), updated_at: now() };
    write(KEYS.maintenanceTasks, [...read<MaintenanceTask>(KEYS.maintenanceTasks), item]);
    return item;
  },
  update(id: string, updates: Partial<MaintenanceTask>): void {
    write(KEYS.maintenanceTasks, read<MaintenanceTask>(KEYS.maintenanceTasks).map((t) =>
      t.id === id ? { ...t, ...updates, updated_at: now() } : t
    ));
  },
  delete(id: string): void {
    write(KEYS.maintenanceTasks, read<MaintenanceTask>(KEYS.maintenanceTasks).filter((t) => t.id !== id));
  },
};

// ─── Supplies ─────────────────────────────────────────────────

export const suppliesStorage = {
  getForWorkspace(workspaceId: string): Supply[] {
    return forWorkspace<Supply>(KEYS.supplies, workspaceId)
      .sort((a, b) => a.category.localeCompare(b.category));
  },
  insert(payload: Omit<Supply, 'id' | 'created_at' | 'updated_at'>): Supply {
    const item: Supply = { ...payload, id: uid(), created_at: now(), updated_at: now() };
    write(KEYS.supplies, [...read<Supply>(KEYS.supplies), item]);
    return item;
  },
  update(id: string, updates: Partial<Supply>): void {
    write(KEYS.supplies, read<Supply>(KEYS.supplies).map((s) =>
      s.id === id ? { ...s, ...updates, updated_at: now() } : s
    ));
  },
  updateRaw(items: Supply[]): void {
    const other = read<Supply>(KEYS.supplies).filter(
      (s) => !items.find((i) => i.id === s.id)
    );
    write(KEYS.supplies, [...other, ...items]);
  },
  delete(id: string): void {
    write(KEYS.supplies, read<Supply>(KEYS.supplies).filter((s) => s.id !== id));
  },
};

// ─── ParameterTemplates ───────────────────────────────────────

export const paramTemplatesStorage = {
  getForWorkspace(workspaceId: string): ParameterTemplate[] {
    return forWorkspace<ParameterTemplate>(KEYS.parameterTemplates, workspaceId)
      .sort((a, b) => a.param_name.localeCompare(b.param_name));
  },
  insertMany(payloads: Omit<ParameterTemplate, 'id' | 'created_at' | 'updated_at'>[]): void {
    const items: ParameterTemplate[] = payloads.map((p) => ({
      ...p, id: uid(), created_at: now(), updated_at: now(),
    }));
    write(KEYS.parameterTemplates, [...read<ParameterTemplate>(KEYS.parameterTemplates), ...items]);
  },
  insert(payload: Omit<ParameterTemplate, 'id' | 'created_at' | 'updated_at'>): ParameterTemplate {
    const item: ParameterTemplate = { ...payload, id: uid(), created_at: now(), updated_at: now() };
    write(KEYS.parameterTemplates, [...read<ParameterTemplate>(KEYS.parameterTemplates), item]);
    return item;
  },
  update(id: string, updates: Partial<ParameterTemplate>): void {
    write(KEYS.parameterTemplates, read<ParameterTemplate>(KEYS.parameterTemplates).map((t) =>
      t.id === id ? { ...t, ...updates, updated_at: now() } : t
    ));
  },
  delete(id: string): void {
    write(KEYS.parameterTemplates, read<ParameterTemplate>(KEYS.parameterTemplates).filter((t) => t.id !== id));
  },
};

// ─── Chronicles ───────────────────────────────────────────────

export const chroniclesStorage = {
  getForWorkspace(workspaceId: string): Chronicle[] {
    return forWorkspace<Chronicle>(KEYS.chronicles, workspaceId)
      .sort((a, b) => b.event_date.localeCompare(a.event_date));
  },
  insert(payload: Omit<Chronicle, 'id' | 'created_at' | 'updated_at'>): Chronicle {
    const item: Chronicle = { ...payload, id: uid(), created_at: now(), updated_at: now() };
    write(KEYS.chronicles, [...read<Chronicle>(KEYS.chronicles), item]);
    return item;
  },
  update(id: string, updates: Partial<Chronicle>): void {
    write(KEYS.chronicles, read<Chronicle>(KEYS.chronicles).map((c) =>
      c.id === id ? { ...c, ...updates, updated_at: now() } : c
    ));
  },
  delete(id: string): void {
    write(KEYS.chronicles, read<Chronicle>(KEYS.chronicles).filter((c) => c.id !== id));
  },
};

// ─── Todos ────────────────────────────────────────────────────

export const customKnowledgeStorage = {
  getAll(): KnowledgeBaseEntry[] {
    return read<KnowledgeBaseEntry>(KEYS.customKnowledge);
  },
  insert(payload: Omit<KnowledgeBaseEntry, 'id'>): KnowledgeBaseEntry {
    const item: KnowledgeBaseEntry = { ...payload, id: 'kb-user-' + uid() };
    write(KEYS.customKnowledge, [...read<KnowledgeBaseEntry>(KEYS.customKnowledge), item]);
    return item;
  },
  update(id: string, updates: Partial<KnowledgeBaseEntry>): void {
    write(KEYS.customKnowledge, read<KnowledgeBaseEntry>(KEYS.customKnowledge).map((e) =>
      e.id === id ? { ...e, ...updates } : e
    ));
  },
  delete(id: string): void {
    write(KEYS.customKnowledge, read<KnowledgeBaseEntry>(KEYS.customKnowledge).filter((e) => e.id !== id));
  },
};

export const todosStorage = {
  getForWorkspace(workspaceId: string): Todo[] {
    return forWorkspace<Todo>(KEYS.todos, workspaceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);
  },
  insert(workspaceId: string, content: string, dueDate?: string): Todo {
    const item: Todo = {
      id: uid(), workspace_id: workspaceId, content,
      completed: false, due_date: dueDate ?? null,
      created_at: now(), updated_at: now(),
    };
    write(KEYS.todos, [...read<Todo>(KEYS.todos), item]);
    return item;
  },
  update(id: string, updates: Partial<Todo>): void {
    write(KEYS.todos, read<Todo>(KEYS.todos).map((t) =>
      t.id === id ? { ...t, ...updates, updated_at: now() } : t
    ));
  },
  delete(id: string): void {
    write(KEYS.todos, read<Todo>(KEYS.todos).filter((t) => t.id !== id));
  },
};

/* ─── AI 报告存储 ─── */
export const aiReportStorage = {
  getForWorkspace(workspaceId: string): AiReport[] {
    return forWorkspace<AiReport>(KEYS.aiReports, workspaceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  insert(item: Omit<AiReport, 'id'>): AiReport {
    const newItem: AiReport = { ...item, id: uid() };
    write(KEYS.aiReports, [...read<AiReport>(KEYS.aiReports), newItem]);
    return newItem;
  },
  update(id: string, patch: Partial<AiReport>): AiReport | null {
    const reports = read<AiReport>(KEYS.aiReports);
    const idx = reports.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    reports[idx] = { ...reports[idx], ...patch };
    write(KEYS.aiReports, reports);
    return reports[idx];
  },
  delete(id: string): boolean {
    const reports = read<AiReport>(KEYS.aiReports);
    const filtered = reports.filter((r) => r.id !== id);
    if (filtered.length === reports.length) return false;
    write(KEYS.aiReports, filtered);
    return true;
  },
};

// ─── Workspace Export / Import (.an 文件) ───────────────────

export interface AnFileData {
  version: '1.0';
  app: 'AquaNote';
  exported_at: string;
  workspace: Workspace;
  waterQualityRecords: WaterQualityRecord[];
  organisms: Organism[];
  maintenanceTasks: MaintenanceTask[];
  supplies: Supply[];
  parameterTemplates: ParameterTemplate[];
  chronicles: Chronicle[];
  todos: Todo[];
  envCheckRecords: EnvCheckRecord[];
}

export const workspaceExportImport = {
  /** 导出指定工作区为 .an 文件 */
  export(workspaceId: string): AnFileData {
    const workspace = workspaceStorage.getById(workspaceId);
    if (!workspace) throw new Error('工作区不存在');

    const data: AnFileData = {
      version: '1.0',
      app: 'AquaNote',
      exported_at: now(),
      workspace,
      waterQualityRecords: read<WaterQualityRecord>(KEYS.waterQualityRecords).filter((r) => r.workspace_id === workspaceId),
      organisms: read<Organism>(KEYS.organisms).filter((r) => r.workspace_id === workspaceId),
      maintenanceTasks: read<MaintenanceTask>(KEYS.maintenanceTasks).filter((r) => r.workspace_id === workspaceId),
      supplies: read<Supply>(KEYS.supplies).filter((r) => r.workspace_id === workspaceId),
      parameterTemplates: read<ParameterTemplate>(KEYS.parameterTemplates).filter((r) => r.workspace_id === workspaceId),
      chronicles: read<Chronicle>(KEYS.chronicles).filter((r) => r.workspace_id === workspaceId),
      todos: read<Todo>(KEYS.todos).filter((r) => r.workspace_id === workspaceId),
      envCheckRecords: read<EnvCheckRecord>(KEYS.envCheckRecords).filter((r) => r.workspace_id === workspaceId),
    };
    return data;
  },

  /** 解析 .an 文件内容 */
  parse(raw: string): AnFileData {
    const parsed = JSON.parse(raw) as AnFileData;
    if (parsed.app !== 'AquaNote') throw new Error('无效的文件格式');
    if (!parsed.workspace) throw new Error('文件缺少工作区数据');
    return parsed;
  },

  /** 导入 .an 文件数据，生成新工作区并恢复关联数据 */
  import(data: AnFileData): Workspace {
    const newWsId = uid();
    const nowStr = now();

    const ws: Workspace = {
      ...data.workspace,
      id: newWsId,
      name: data.workspace.name + ' (导入)',
      created_at: nowStr,
      last_opened_at: nowStr,
    };
    write(KEYS.workspaces, [...read<Workspace>(KEYS.workspaces), ws]);

    const remap = (items: { workspace_id: string }[]) =>
      items.map((item) => ({ ...item, workspace_id: newWsId }));

    if (data.waterQualityRecords?.length) {
      write(KEYS.waterQualityRecords, [...read<WaterQualityRecord>(KEYS.waterQualityRecords), ...remap(data.waterQualityRecords)]);
    }
    if (data.organisms?.length) {
      write(KEYS.organisms, [...read<Organism>(KEYS.organisms), ...remap(data.organisms)]);
    }
    if (data.maintenanceTasks?.length) {
      write(KEYS.maintenanceTasks, [...read<MaintenanceTask>(KEYS.maintenanceTasks), ...remap(data.maintenanceTasks)]);
    }
    if (data.supplies?.length) {
      write(KEYS.supplies, [...read<Supply>(KEYS.supplies), ...remap(data.supplies)]);
    }
    if (data.parameterTemplates?.length) {
      write(KEYS.parameterTemplates, [...read<ParameterTemplate>(KEYS.parameterTemplates), ...remap(data.parameterTemplates)]);
    }
    if (data.chronicles?.length) {
      write(KEYS.chronicles, [...read<Chronicle>(KEYS.chronicles), ...remap(data.chronicles)]);
    }
    if (data.todos?.length) {
      write(KEYS.todos, [...read<Todo>(KEYS.todos), ...remap(data.todos)]);
    }
    if (data.envCheckRecords?.length) {
      write(KEYS.envCheckRecords, [...read<EnvCheckRecord>(KEYS.envCheckRecords), ...remap(data.envCheckRecords)]);
    }

    return ws;
  },
};