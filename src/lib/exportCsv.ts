import type { WaterQualityRecord, Organism, MaintenanceTask, Supply, Chronicle, EnvCheckRecord } from '@/types';

function escapeCsv(val: string | number | null): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function makeCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))];
  return '\uFEFF' + lines.join('\n');
}

export function exportWaterQualityToCsv(records: WaterQualityRecord[]): string {
  const headers = ['记录日期', 'pH', '氨氮(mg/L)', '亚硝酸(mg/L)', '硝酸盐(mg/L)', 'KH(°dH)', 'GH(°dH)', 'TDS(ppm)', '温度(°C)', '备注'];
  const rows = records.map((r) => [
    new Date(r.recorded_at).toLocaleString('zh-CN'),
    r.ph, r.ammonia, r.nitrite, r.nitrate, r.kh, r.gh, r.tds, r.temperature, r.notes,
  ]);
  return makeCsv(headers, rows);
}

export function exportOrganismsToCsv(organisms: Organism[]): string {
  const headers = ['名称', '学名', '来源', '入缸日期', '代谢系数', '备注'];
  const rows = organisms.map((o) => [
    o.name,
    o.scientific_name,
    o.source,
    o.added_date,
    o.metabolic_rate === 'high' ? '高' : o.metabolic_rate === 'low' ? '低' : '中',
    o.notes,
  ]);
  return makeCsv(headers, rows);
}

export function exportMaintenanceToCsv(tasks: MaintenanceTask[]): string {
  const headers = ['任务', '类型', '截止日期', '完成日期', '状态', '备注'];
  const rows = tasks.map((t) => [
    t.title, t.task_type, t.due_date, t.completed_at, t.status === 'completed' ? '已完成' : t.status === 'overdue' ? '已逾期' : '待办', t.notes,
  ]);
  return makeCsv(headers, rows);
}

export function exportSuppliesToCsv(supplies: Supply[]): string {
  const headers = ['名称', '类别', '库存', '单位', '预警阈值', '备注'];
  const rows = supplies.map((s) => [
    s.name, s.category, s.quantity, s.unit, s.threshold, s.notes,
  ]);
  return makeCsv(headers, rows);
}

export function exportEnvCheckToCsv(records: EnvCheckRecord[]): string {
  const headers = ['检测日期', 'pH', '氨氮', '亚硝酸', '硝酸盐', '温度', '水体体积(L)', '水压(kPa)', '玻璃承载(kPa)', '代谢量(g/天)', '设备加成', '评分', '建议'];
  const rows = records.map((r) => [
    new Date(r.check_date).toLocaleString('zh-CN'),
    r.water_data.ph,
    r.water_data.ammonia,
    r.water_data.nitrite,
    r.water_data.nitrate,
    r.water_data.temperature,
    r.water_volume,
    r.water_pressure,
    r.glass_capacity,
    r.metabolism,
    r.equipment_bonus,
    r.score,
    (r.suggestions || []).join('; '),
  ]);
  return makeCsv(headers, rows);
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
