import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNickname } from '@/contexts/NicknameContext';
import { KEYS } from '@/lib/storage';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const FONT_SIZES = [
  { value: 'small' as const, label: '小' },
  { value: 'medium' as const, label: '中' },
  { value: 'large' as const, label: '大' },
] as const;
type FontSize = 'small' | 'medium' | 'large';

function loadFontSize(): FontSize {
  try {
    const raw = localStorage.getItem(KEYS.fontSize);
    if (raw) return JSON.parse(raw) as FontSize;
  } catch { /* noop */ }
  return 'medium';
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { nickname, setNickname } = useNickname();
  const [nickInput, setNickInput] = useState(nickname);
  const [fontSize, setFontSize] = useState<FontSize>(loadFontSize());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNickInput(nickname);
  }, [nickname, open]);

  const handleSave = () => {
    const name = nickInput.trim();
    if (!name) { toast.error('昵称不能为空'); return; }
    setSaving(true);
    setNickname(name);
    localStorage.setItem(KEYS.fontSize, JSON.stringify(fontSize));
    document.documentElement.setAttribute('data-font-size', fontSize);
    toast.success('设置已保存');
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground text-balance">设置</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* 昵称 */}
          <div className="space-y-1.5">
            <label className="text-sm font-normal text-muted-foreground block">昵称</label>
            <Input
              value={nickInput}
              onChange={(e) => setNickInput(e.target.value)}
              className="px-3 bg-muted border-border text-foreground"
              maxLength={30}
            />
          </div>

          {/* 字体大小 */}
          <div className="space-y-1.5">
            <label className="text-sm font-normal text-muted-foreground block">字体大小</label>
            <div className="flex gap-2">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setFontSize(s.value)}
                  className={`flex-1 h-9 rounded text-sm font-medium border transition-colors ${
                    fontSize === s.value
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="border border-border text-foreground hover:bg-muted h-9"
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-9"
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
