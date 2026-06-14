import React, { useState, useCallback } from 'react';
import { Cpu, Plus, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { Equipment as EquipmentType } from '@/types';

interface Props {
  workspaceId: string;
}

const DEFAULT_EQUIPMENT = [
  { name: '蛋白分离器', configKeys: ['处理量 (L/h)', '功率 (W)'] },
  { name: '除油膜机', configKeys: ['流量 (L/h)', '功率 (W)'] },
  { name: '海缸灯', configKeys: ['功率 (W)', '光谱'] },
  { name: '卷纸机', configKeys: ['滤纸规格', '转速'] },
];

/** 辅助设备管理 */
export default function EquipmentModule({ workspaceId }: Props) {
  const [items, setItems] = useState<EquipmentType[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentType | null>(null);
  const [form, setForm] = useState({ name: '', brand: '', config: {} as Record<string, string> });

  const calcSafetyBonus = useCallback((eq: EquipmentType) => {
    let bonus = 0;
    if (eq.name === '蛋白分离器') {
      const cap = parseFloat(eq.config['处理量 (L/h)'] || '0');
      bonus = Math.min(cap / 500, 5);
    } else if (eq.name === '除油膜机') {
      const flow = parseFloat(eq.config['流量 (L/h)'] || '0');
      bonus = Math.min(flow / 1000, 3);
    } else if (eq.name === '海缸灯') {
      const w = parseFloat(eq.config['功率 (W)'] || '0');
      bonus = Math.min(w / 50, 2);
    } else if (eq.name === '卷纸机') {
      bonus = 1;
    } else {
      bonus = 2; // 其他设备默认加成
    }
    return Math.round(bonus * 10) / 10;
  }, []);

  const handleSave = useCallback(() => {
    const bonus = editing ? editing.safety_bonus : calcSafetyBonus({
      id: '', workspace_id: workspaceId, name: form.name, brand: form.brand,
      config: form.config, safety_bonus: 0, created_at: '', updated_at: '',
    });

    if (editing) {
      setItems((prev) => prev.map((i) =>
        i.id === editing.id ? { ...i, name: form.name, brand: form.brand, config: form.config, safety_bonus: bonus, updated_at: new Date().toISOString() } : i
      ));
    } else {
      const newItem: EquipmentType = {
        id: `eq_${Date.now()}`,
        workspace_id: workspaceId,
        name: form.name,
        brand: form.brand || 'DIY',
        config: form.config,
        safety_bonus: bonus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, newItem]);
    }
    setOpen(false);
    setEditing(null);
    setForm({ name: '', brand: '', config: {} });
  }, [editing, form, workspaceId, calcSafetyBonus]);

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const startEdit = useCallback((item: EquipmentType) => {
    setEditing(item);
    setForm({ name: item.name, brand: item.brand, config: item.config });
    setOpen(true);
  }, []);

  const startAdd = useCallback((presetName?: string) => {
    setEditing(null);
    setForm({ name: presetName || '', brand: '', config: {} });
    setOpen(true);
  }, []);

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            辅助设备
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {DEFAULT_EQUIPMENT.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-auto py-2"
                onClick={() => {
                  const exists = items.find((i) => i.name === preset.name);
                  if (exists) startEdit(exists);
                  else {
                    setForm({ name: preset.name, brand: '', config: Object.fromEntries(preset.configKeys.map((k) => [k, ''])) });
                    setEditing(null);
                    setOpen(true);
                  }
                }}
              >
                <Wrench className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs">{preset.name}</span>
                {items.find((i) => i.name === preset.name) && (
                  <span className="ml-auto text-[10px] text-primary">已添加</span>
                )}
              </Button>
            ))}
            <Button variant="ghost" size="sm" className="justify-start gap-2" onClick={() => startAdd()}>
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs">添加其他设备</span>
            </Button>
          </div>

          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-4">暂无辅助设备</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded bg-muted/20 border border-border/40">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.brand || 'DIY'}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                      {Object.entries(item.config).map(([k, v]) => (
                        <span key={k}>{k}: {v || '--'}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-primary shrink-0">+{item.safety_bonus.toFixed(1)}</div>
                  <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑设备' : '添加设备'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">名称</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="设备名称" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">品牌 <span className="text-muted-foreground">(品牌名/DIY)</span></Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="品牌名 或 DIY" />
            </div>
            {Object.keys(form.config).length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">配置参数</Label>
                {Object.entries(form.config).map(([key]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{key}</Label>
                    <Input
                      value={form.config[key] || ''}
                      onChange={(e) => setForm({ ...form, config: { ...form.config, [key]: e.target.value } })}
                    />
                  </div>
                ))}
              </div>
            )}
            <Button onClick={handleSave} className="w-full">保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
