import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ShieldCheck, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { EnvCheckRecord } from '@/types';
import { workspaceStorage, envCheckStorage } from '@/lib/storage';

interface Props {
  workspaceId: string;
}

export default function EnvCheckModule({ workspaceId }: Props) {
  const workspace = workspaceStorage.getById(workspaceId);
  const [openDialog, setOpenDialog] = useState(false);
  const [records, setRecords] = useState<EnvCheckRecord[]>(() => envCheckStorage.getForWorkspace(workspaceId));
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartOffset, setChartOffset] = useState(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);

  // 持久化同步：当 records 变化时写入 localStorage
  useEffect(() => {
    const stored = envCheckStorage.getForWorkspace(workspaceId);
    const storedIds = new Set(stored.map((r) => r.id));
    const newIds = new Set(records.map((r) => r.id));
    // 只写入新增的记录，避免循环
    const toAdd = records.filter((r) => !storedIds.has(r.id));
    const toDel = stored.filter((r) => !newIds.has(r.id));
    toDel.forEach((r) => envCheckStorage.delete(r.id));
    toAdd.forEach((r) => envCheckStorage.insert(r));
  }, [records, workspaceId]);

  // 录入表单
  const [form, setForm] = useState({
    ph: '', ammonia: '', nitrite: '', nitrate: '', temperature: '',
    kh: '', gh: '', tds: '',
    waterVolume: '', organismCount: '', organismVolume: '',
  });

  const calcScore = useCallback(() => {
    const ph = parseFloat(form.ph) || 7.0;
    const ammonia = parseFloat(form.ammonia) || 0;
    const nitrite = parseFloat(form.nitrite) || 0;
    const nitrate = parseFloat(form.nitrate) || 0;
    const temp = parseFloat(form.temperature) || 25;
    const kh = parseFloat(form.kh) || 0;
    const gh = parseFloat(form.gh) || 0;
    const tds = parseFloat(form.tds) || 0;
    const vol = parseFloat(form.waterVolume) || 0;
    const count = parseInt(form.organismCount) || 0;
    const avgVol = parseFloat(form.organismVolume) || 0;

    // ===== 水质评分 (0-40) =====
    let waterScore = 0;
    // pH: 淡水6.5-8.5=最优 (10分)
    if (ph >= 6.5 && ph <= 8.5) waterScore += 10;
    else if (ph >= 6.0 && ph <= 9.0) waterScore += 5;
    else waterScore += 2;
    // 氨氮: <0.1=安全 (10分)
    if (ammonia < 0.1) waterScore += 10;
    else if (ammonia < 0.5) waterScore += 5;
    else waterScore += 1;
    // 亚硝酸盐: <0.1=安全 (8分)
    if (nitrite < 0.1) waterScore += 8;
    else if (nitrite < 0.5) waterScore += 4;
    else waterScore += 1;
    // 硝酸盐: <20=安全 (7分)
    if (nitrate < 20) waterScore += 7;
    else if (nitrate < 50) waterScore += 3;
    else waterScore += 0;
    // 温度: 20-28°C 适宜 (5分)
    if (temp >= 20 && temp <= 28) waterScore += 5;
    else if (temp >= 18 && temp <= 30) waterScore += 2;
    else waterScore += 0;

    // ===== 水质稳定性 (0-15) =====
    let stabilityScore = 0;
    if (kh >= 3 && kh <= 8) stabilityScore += 5;
    else if (kh > 0) stabilityScore += 2;
    if (gh >= 3 && gh <= 15) stabilityScore += 5;
    else if (gh > 0) stabilityScore += 2;
    if (tds >= 100 && tds <= 400) stabilityScore += 5;
    else if (tds > 0) stabilityScore += 2;

    // ===== 玻璃安全评分 (0-20) =====
    const glassThick = workspace?.glass_thickness || 5;
    const tankH_cm = workspace?.tank_size?.y || 30; // cm
    // 行业标准: 浮法玻璃厚度 ≈ 高度(cm)/30 (最低要求)
    const requiredThick = tankH_cm / 30;
    const safetyFactor = glassThick / Math.max(requiredThick, 1);
    let safetyScore = Math.min(safetyFactor * 15, 20);
    // 水压(kPa) = ρgh = 1000 * 9.8 * h(m) / 1000 = 9.8 * h(m) kPa
    const pressure = 9.8 * (tankH_cm / 100);
    const maxPressure = Math.max(glassThick * glassThick * 0.4, 1); // 经验公式 MPa

    // ===== 生物负载评分 (0-15) =====
    const bioMass = count * avgVol; // cm³
    const bioRatio = vol > 0 ? bioMass / (vol * 1000) : 0;
    let bioScore = 0;
    if (bioRatio < 0.03) bioScore = 15;       // 低密度
    else if (bioRatio < 0.08) bioScore = 12;  // 适中
    else if (bioRatio < 0.15) bioScore = 8;   // 偏高
    else if (bioRatio < 0.25) bioScore = 4;   // 过载
    else bioScore = 1;                         // 严重过载

    // 代谢量估算 (g/天)
    const metabolism = count * avgVol * 0.0015;

    // ===== 辅助设备加成 (0-10) =====
    let equipBonus = 0;
    try {
      const raw = localStorage.getItem('aquanote_equipment_' + workspaceId);
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          equipBonus = items.reduce((sum: number, it: { safety_bonus?: number }) => sum + (it.safety_bonus || 0), 0);
        }
      }
    } catch { /* noop */ }
    equipBonus = Math.min(equipBonus, 10);

    const score = waterScore + stabilityScore + safetyScore + bioScore + equipBonus;

    // 生成建议
    const suggestions: string[] = [];
    if (ph < 6.0 || ph > 9.0) suggestions.push('pH 异常，建议检测缓冲系统或换水 30%');
    if (ammonia >= 0.1) suggestions.push('氨氮偏高，检查过滤系统并减少投喂量');
    if (nitrite >= 0.1) suggestions.push('亚硝酸盐偏高，建议增加换水频率或增强硝化系统');
    if (nitrate >= 50) suggestions.push('硝酸盐过高，建议换水并控制投喂');
    if (temp < 18 || temp > 30) suggestions.push('温度超出舒适区间，建议配置温控设备');
    if (kh < 3 || kh > 12) suggestions.push('KH 偏离适宜范围，注意 pH 波动风险');
    if (gh < 2 || gh > 20) suggestions.push('GH 偏离适宜范围，影响生物渗透压');
    if (tds > 500) suggestions.push('TDS 过高，建议部分换水降低总溶解固体');
    if (bioRatio >= 0.25) suggestions.push('生物密度严重过载，建议分缸或减少生物数量');
    if (safetyFactor < 1.2) suggestions.push('玻璃厚度偏薄，建议加固或降低水位');
    if (suggestions.length === 0) suggestions.push('各项指标良好，请继续保持当前养护方案');

    return {
      score: Math.min(Math.max(score, 0), 99.99),
      waterScore, stabilityScore, safetyScore, bioScore, equipBonus,
      metabolism, pressure, maxPressure, safetyFactor, bioRatio, suggestions,
    };
  }, [form, workspace, workspaceId]);

  const handleSubmit = useCallback(() => {
    const result = calcScore();
    const lastScore = records.length > 0 ? records[records.length - 1].score : 0;
    const delta = result.score - lastScore;

    const newRecord: EnvCheckRecord = {
      id: `env_${Date.now()}`,
      workspace_id: workspaceId,
      check_date: new Date().toISOString().slice(0, 10),
      water_data: {
        ph: parseFloat(form.ph) || null,
        ammonia: parseFloat(form.ammonia) || null,
        nitrite: parseFloat(form.nitrite) || null,
        nitrate: parseFloat(form.nitrate) || null,
        temperature: parseFloat(form.temperature) || null,
      },
      water_volume: parseFloat(form.waterVolume) || 0,
      organisms: [{ count: parseInt(form.organismCount) || 0, avg_volume_cm3: parseFloat(form.organismVolume) || 0 }],
      water_pressure: result.pressure,
      glass_capacity: result.maxPressure,
      metabolism: result.metabolism,
      equipment_bonus: result.equipBonus,
      score: result.score,
      score_delta: delta,
      suggestions: result.suggestions,
      created_at: new Date().toISOString(),
    };

    setRecords((prev) => [...prev, newRecord]);
    // 同步更新工作区的环境评分
    workspaceStorage.update(workspaceId, { env_score: result.score, last_env_check: newRecord.check_date });
    setOpenDialog(false);
    setForm({ ph: '', ammonia: '', nitrite: '', nitrate: '', temperature: '', kh: '', gh: '', tds: '', waterVolume: '', organismCount: '', organismVolume: '' });
  }, [calcScore, form, records, workspaceId]);

  // 图表拖拽
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartOffset.current = chartOffset;
  }, [chartOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStartX.current;
    setChartOffset(dragStartOffset.current + dx);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // 限制偏移
  useEffect(() => {
    if (records.length <= 1) { setChartOffset(0); return; }
    const maxOffset = Math.max(0, (records.length - 1) * 60 - 400);
    setChartOffset((v) => Math.max(-maxOffset, Math.min(0, v)));
  }, [records.length]);

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* 概览卡片 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            环境监测概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-3xl font-bold text-primary">
              {records.length > 0 ? records[records.length - 1].score.toFixed(1) : '--'}
            </div>
            <div className="text-xs text-muted-foreground">
              {records.length > 0 && (
                <span className={records[records.length - 1].score_delta >= 0 ? 'text-success' : 'text-destructive'}>
                  {records[records.length - 1].score_delta >= 0 ? '+' : ''}{records[records.length - 1].score_delta.toFixed(1)}
                </span>
              )}
              <p>最近检测: {records.length > 0 ? records[records.length - 1].check_date : '无记录'}</p>
            </div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="ml-auto">
                  <Plus className="w-3.5 h-3.5 mr-1" /> 新检测
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                <DialogHeader>
                  <DialogTitle>环境检测录入</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">pH</Label>
                      <Input type="number" step="0.1" value={form.ph} onChange={(e) => setForm({ ...form, ph: e.target.value })} placeholder="7.0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">氨氮 (mg/L)</Label>
                      <Input type="number" step="0.01" value={form.ammonia} onChange={(e) => setForm({ ...form, ammonia: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">亚硝酸盐 (mg/L)</Label>
                      <Input type="number" step="0.01" value={form.nitrite} onChange={(e) => setForm({ ...form, nitrite: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">硝酸盐 (mg/L)</Label>
                      <Input type="number" step="0.1" value={form.nitrate} onChange={(e) => setForm({ ...form, nitrate: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">温度 (°C)</Label>
                      <Input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} placeholder="25" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">KH (°dH)</Label>
                      <Input type="number" step="0.1" value={form.kh} onChange={(e) => setForm({ ...form, kh: e.target.value })} placeholder="5" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">GH (°dH)</Label>
                      <Input type="number" step="0.1" value={form.gh} onChange={(e) => setForm({ ...form, gh: e.target.value })} placeholder="8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">TDS (ppm)</Label>
                      <Input type="number" step="1" value={form.tds} onChange={(e) => setForm({ ...form, tds: e.target.value })} placeholder="200" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">水体体积 (L)</Label>
                      <Input type="number" step="0.1" value={form.waterVolume} onChange={(e) => setForm({ ...form, waterVolume: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">生物数量</Label>
                      <Input type="number" value={form.organismCount} onChange={(e) => setForm({ ...form, organismCount: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">平均体积 (cm³)</Label>
                      <Input type="number" step="0.1" value={form.organismVolume} onChange={(e) => setForm({ ...form, organismVolume: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded p-3 text-xs space-y-1">
                    {(() => {
                      const r = calcScore();
                      return (
                        <>
                          <p className="font-medium">预估评分: {r.score.toFixed(1)}</p>
                          <p className="text-muted-foreground">水质 {r.waterScore.toFixed(0)} + 稳定 {r.stabilityScore.toFixed(0)} + 安全 {r.safetyScore.toFixed(0)} + 生物 {r.bioScore.toFixed(0)} + 设备 {r.equipBonus.toFixed(0)}</p>
                          <p className="text-muted-foreground">代谢量: {r.metabolism.toFixed(2)} g/天 | 安全系数: {r.safetyFactor.toFixed(1)}x</p>
                        </>
                      );
                    })()}
                  </div>
                  <Button onClick={handleSubmit} className="w-full">提交检测</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* 评分折线图 */}
          {records.length > 0 && (
            <div className="border rounded bg-card/50 p-3">
              <p className="text-xs font-medium mb-2">评分趋势</p>
              <div className="relative h-36 w-full" ref={chartRef}>
                {(() => {
                  const padding = { top: 12, right: 12, bottom: 24, left: 32 };
                  const width = chartRef.current?.clientWidth ?? 400;
                  const height = 144;
                  const innerW = Math.max(width - padding.left - padding.right, 100);
                  const innerH = height - padding.top - padding.bottom;
                  const data = records;
                  const maxVal = Math.max(...data.map((d) => d.score), 60);
                  const minVal = Math.min(...data.map((d) => d.score), 0);
                  const range = Math.max(maxVal - minVal, 10);

                  const getX = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * innerW;
                  const getY = (v: number) => padding.top + innerH - ((v - minVal) / range) * innerH;

                  const points = data.map((d, i) => `${getX(i)},${getY(d.score)}`).join(' ');
                  const areaPoints = `${getX(0)},${padding.top + innerH} ${points} ${getX(data.length - 1)},${padding.top + innerH}`;

                  // Y轴刻度
                  const yTicks = 4;
                  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
                    const val = minVal + (range * i) / yTicks;
                    return { val, y: getY(val) };
                  });

                  return (
                    <svg width={width} height={height} className="block">
                      {/* 网格线 */}
                      {yLabels.map((t, i) => (
                        <line key={`h${i}`} x1={padding.left} y1={t.y} x2={padding.left + innerW} y2={t.y} stroke="hsl(var(--border))" strokeDasharray="3,3" opacity={0.5} />
                      ))}
                      {/* 面积填充 */}
                      <polygon points={areaPoints} fill="hsl(var(--primary))" opacity={0.08} />
                      {/* 折线 */}
                      <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      {/* 数据点 */}
                      {data.map((d, i) => (
                        <g key={d.id}>
                          <circle cx={getX(i)} cy={getY(d.score)} r={3} fill="hsl(var(--primary))" />
                          <circle cx={getX(i)} cy={getY(d.score)} r={6} fill="transparent" />
                          <text x={getX(i)} y={getY(d.score) - 6} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={9} fontWeight={500}>
                            {d.score.toFixed(0)}
                          </text>
                          <text x={getX(i)} y={padding.top + innerH + 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={8}>
                            {d.check_date.slice(5)}
                          </text>
                        </g>
                      ))}
                      {/* Y轴 */}
                      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH} stroke="hsl(var(--border))" />
                      {yLabels.map((t, i) => (
                        <text key={`yl${i}`} x={padding.left - 6} y={t.y + 3} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={8}>
                          {t.val.toFixed(0)}
                        </text>
                      ))}
                      {/* X轴 */}
                      <line x1={padding.left} y1={padding.top + innerH} x2={padding.left + innerW} y2={padding.top + innerH} stroke="hsl(var(--border))" />
                    </svg>
                  );
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 检测记录列表 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">历史记录</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              暂无检测记录，点击上方"新检测"开始
            </div>
          ) : (
            <div className="space-y-2">
              {[...records].reverse().map((r) => (
                <div key={r.id} className="p-2.5 rounded bg-muted/20 text-xs space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-medium w-20 shrink-0">{r.check_date}</span>
                    <span className="font-bold text-primary w-12">{r.score.toFixed(1)}</span>
                    <span className={r.score_delta >= 0 ? 'text-success' : 'text-destructive'}>
                      {r.score_delta >= 0 ? '+' : ''}{r.score_delta.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground ml-auto">代谢 {r.metabolism.toFixed(2)}g/天</span>
                  </div>
                  {r.suggestions && r.suggestions.length > 0 && (
                    <ul className="pl-4 space-y-0.5 list-disc text-muted-foreground/80">
                      {r.suggestions.map((s, i) => (
                        <li key={i} className="text-[11px]">{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
