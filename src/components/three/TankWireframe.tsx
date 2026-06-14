import React, { useEffect, useRef } from 'react';
import type { Workspace } from '@/types';

interface Props {
  workspace: Workspace;
  className?: string;
  rotate?: boolean;
  /** 创建工作区预览模式：显示实际尺寸标签 */
  previewMode?: boolean;
}

/** 等轴测线框模型：开放顶部鱼缸 + 过滤系统 */
export default function TankWireframe({ workspace, className = '', rotate = false, previewMode = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const angleRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;
    let cx = 0, cy = 0;

    // 等轴测投影
    function proj(v: { x: number; y: number; z: number }, ang: number, scc: number) {
      const s = Math.sin(ang);
      const c = Math.cos(ang);
      const rx = v.x * c - v.z * s;
      const rz = v.x * s + v.z * c;
      return {
        x: cx + (rx - rz) * 0.866 * scc,
        y: cy + (rx + rz) * 0.5 * scc - v.y * scc,
      };
    }

    // 尺寸标准化：无论输入多大，统一等比缩放
    const raw = workspace.tank_size ?? { x: 60, y: 30, z: 40 };
    const maxDim = Math.max(raw.x, raw.y, raw.z, 1);
    const norm = 80;
    const ns = (v: number) => (v / maxDim) * norm;

    const tw = ns(raw.x);
    const th = ns(raw.y);
    const td = ns(raw.z);
    const hw = tw * 0.5;
    const hh = th * 0.5;
    const hd = td * 0.5;

    // 归一化过滤尺寸（用于计算包围盒）
    const ft = workspace.filter_type;
    let fExt = { x: 0, y: 0, z: 0 }; // 过滤系统在归一化空间中的扩展尺寸

    if (ft === 'back') {
      const fd = workspace.filter_detail?.back;
      fExt.z = fd ? ns(fd.inner_z) : td * 0.15;
    } else if (ft === 'bottom') {
      const fd = workspace.filter_detail?.bottom;
      fExt.y = fd ? ns(fd.height) : th * 0.25;
    } else if (ft === 'hangon') {
      const fd = workspace.filter_detail?.hangon;
      fExt.x = fd ? ns(fd.slot_x) : tw * 0.2;
      fExt.y = fd ? ns(fd.slot_y) : th * 0.3;
    } else if (ft === 'side') {
      const fd = workspace.filter_detail?.side;
      const dir = workspace.side_filter_direction ?? 'left';
      const fw = fd ? ns(fd.inner_x) : td * 0.2;
      fExt.x = dir === 'right' ? fw : fw; // 两侧都扩展
    }

    // 计算总包围盒（归一化3D空间）
    const totalW = tw + fExt.x;
    const totalH = th + fExt.y;
    const totalD = td + fExt.z;

    // 等轴测投影下估算2D范围
    // 最坏角度约45度，估算
    const estAng = Math.PI / 4;
    const s = Math.sin(estAng);
    const c = Math.cos(estAng);
    const corners = [
      { x: -hw, y: -hh - fExt.y, z: -hd },
      { x: hw + fExt.x, y: -hh - fExt.y, z: -hd },
      { x: -hw, y: hh, z: -hd },
      { x: hw + fExt.x, y: hh, z: -hd },
      { x: -hw, y: -hh - fExt.y, z: hd + fExt.z },
      { x: hw + fExt.x, y: -hh - fExt.y, z: hd + fExt.z },
      { x: -hw, y: hh, z: hd + fExt.z },
      { x: hw + fExt.x, y: hh, z: hd + fExt.z },
    ];
    let minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
    for (const v of corners) {
      const rx = v.x * c - v.z * s;
      const rz = v.x * s + v.z * c;
      const px = (rx - rz) * 0.866;
      const py = (rx + rz) * 0.5 - v.y;
      minPx = Math.min(minPx, px); maxPx = Math.max(maxPx, px);
      minPy = Math.min(minPy, py); maxPy = Math.max(maxPy, py);
    }
    const projW = maxPx - minPx;
    const projH = maxPy - minPy;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      W = canvas!.clientWidth;
      H = canvas!.clientHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2;
      cy = H / 2 + H * 0.02;
    }

    resize();

    // 自适应缩放：确保整体在画布内，按比例缩放
    const margin = 24;
    const scX = projW > 0 ? (W - margin * 2) / projW : 1;
    const scY = projH > 0 ? (H - margin * 2) / projH : 1;
    // 取较小值确保完整显示，同时保证最小可见尺寸
    const sc = Math.max(0.35, Math.min(scX, scY));

    // 实际显示值（已乘 sc）
    const dsw = tw * sc;
    const dh = th * sc;
    const dd = td * sc;
    const dhw = dsw * 0.5;
    const dhh = dh * 0.5;
    const dhd = dd * 0.5;

    function stroke(color: string, lw = 1) {
      ctx!.strokeStyle = color;
      ctx!.lineWidth = lw;
    }
    function line(p1: { x: number; y: number }, p2: { x: number; y: number }) {
      ctx!.beginPath();
      ctx!.moveTo(p1.x, p1.y);
      ctx!.lineTo(p2.x, p2.y);
      ctx!.stroke();
    }
    function poly(points: { x: number; y: number }[], close = false) {
      if (points.length < 2) return;
      ctx!.beginPath();
      ctx!.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx!.lineTo(points[i].x, points[i].y);
      if (close) ctx!.closePath();
      ctx!.stroke();
    }

    /* 主缸体（开放顶部） */
    function drawTank(ang: number) {
      const c = [
        { x: -dhw, y: -dhh, z: -dhd },
        { x: dhw,  y: -dhh, z: -dhd },
        { x: dhw,  y: dhh,  z: -dhd },
        { x: -dhw, y: dhh,  z: -dhd },
        { x: -dhw, y: -dhh, z: dhd },
        { x: dhw,  y: -dhh, z: dhd },
        { x: dhw,  y: dhh,  z: dhd },
        { x: -dhw, y: dhh,  z: dhd },
      ].map((v) => proj(v, ang, 1));

      stroke('hsl(191 100% 60% / 0.7)', 1.5);
      line(c[0], c[3]); line(c[1], c[2]); line(c[4], c[7]); line(c[5], c[6]);
      poly([c[0], c[1], c[5], c[4]], true);
      line(c[3], c[2]); line(c[2], c[1]); line(c[3], c[0]);
      line(c[7], c[6]); line(c[6], c[5]); line(c[7], c[4]);
      line(c[0], c[4]); line(c[1], c[5]);
      line(c[3], c[7]); line(c[2], c[6]);
      line(c[3], c[2]); line(c[7], c[6]);
    }

    /* 背滤：在背面(+z) */
    function drawBackFilter(ang: number) {
      const fd = workspace.filter_detail?.back ?? { inner_x: tw * 0.12, inner_y: th * 0.8, inner_z: td * 0.15 };
      const fw = ns(fd.inner_x) * sc;
      const fh = ns(fd.inner_y) * sc;
      const fdz = ns(fd.inner_z) * sc;
      const fz0 = dhd;
      const fz1 = dhd + fdz;
      const fx0 = -dhw + (dsw - fw) * 0.5;
      const fx1 = fx0 + fw;
      const fy0 = -dhh;
      const fy1 = fy0 + Math.min(fh, dh * 0.92);

      const v = [
        { x: fx0, y: fy0, z: fz0 }, { x: fx1, y: fy0, z: fz0 },
        { x: fx1, y: fy1, z: fz0 }, { x: fx0, y: fy1, z: fz0 },
        { x: fx0, y: fy0, z: fz1 }, { x: fx1, y: fy0, z: fz1 },
        { x: fx1, y: fy1, z: fz1 }, { x: fx0, y: fy1, z: fz1 },
      ].map((p) => proj(p, ang, 1));

      stroke('hsl(142 80% 55% / 0.6)', 1.2);
      line(v[0], v[3]); line(v[1], v[2]); line(v[4], v[7]); line(v[5], v[6]);
      poly([v[0], v[1], v[5], v[4]], true);
      line(v[1], v[5]); line(v[0], v[4]); line(v[3], v[7]); line(v[2], v[6]);
      line(v[3], v[2]); line(v[7], v[6]);

      // 隔板
      stroke('hsl(191 100% 60% / 0.35)', 1);
      line(v[0], v[3]);

      // 内部水平挡板
      for (let i = 1; i <= 2; i++) {
        const by = fy0 + (Math.min(fh, dh * 0.92) * i) / 3;
        const p1 = proj({ x: fx0, y: by, z: fz0 }, ang, 1);
        const p2 = proj({ x: fx0, y: by, z: fz1 }, ang, 1);
        const p3 = proj({ x: fx1, y: by, z: fz1 }, ang, 1);
        const p4 = proj({ x: fx1, y: by, z: fz0 }, ang, 1);
        stroke('hsl(142 80% 55% / 0.3)', 0.8);
        poly([p1, p2, p3, p4], true);
      }

      // 顶部格栅线
      stroke('hsl(142 80% 55% / 0.35)', 0.6);
      const step = (fz1 - fz0) / 5;
      for (let i = 1; i < 5; i++) {
        const zz = fz0 + step * i;
        line(proj({ x: fx0, y: fy1, z: zz }, ang, 1), proj({ x: fx1, y: fy1, z: zz }, ang, 1));
      }
    }

    /* 底滤：在底面(-y) */
    function drawBottomFilter(ang: number) {
      const fd = workspace.filter_detail?.bottom ?? { height: th * 0.25 };
      const fh = ns(fd.height) * sc;
      const bLen = fd.length ? ns(fd.length) * sc : dsw;
      const bDep = fd.width ? ns(fd.width) * sc : dd;
      const blw = bLen * 0.5;
      const bdw = bDep * 0.5;
      // 修复：高度根据实际输入变化
      const fy0 = -dhh - fh;
      const fy1 = -dhh;

      const v = [
        { x: -blw, y: fy0, z: -bdw }, { x: blw, y: fy0, z: -bdw },
        { x: blw, y: fy0, z: bdw },   { x: -blw, y: fy0, z: bdw },
        { x: -blw, y: fy1, z: -bdw }, { x: blw, y: fy1, z: -bdw },
        { x: blw, y: fy1, z: bdw },   { x: -blw, y: fy1, z: bdw },
      ].map((p) => proj(p, ang, 1));

      stroke('hsl(260 70% 65% / 0.55)', 1.2);
      line(v[0], v[4]); line(v[1], v[5]); line(v[2], v[6]); line(v[3], v[7]);
      poly([v[0], v[1], v[2], v[3]], true);
      poly([v[4], v[5], v[6], v[7]], true);
      line(v[0], v[1]); line(v[1], v[2]); line(v[2], v[3]); line(v[3], v[0]);

      // 底板网格
      stroke('hsl(260 70% 65% / 0.28)', 0.6);
      for (let i = 1; i < 4; i++) {
        const xx = -blw + (bLen * i) / 4;
        line(proj({ x: xx, y: fy1, z: -bdw }, ang, 1), proj({ x: xx, y: fy1, z: bdw }, ang, 1));
      }
      for (let i = 1; i < 4; i++) {
        const zz = -bdw + (bDep * i) / 4;
        line(proj({ x: -blw, y: fy1, z: zz }, ang, 1), proj({ x: blw, y: fy1, z: zz }, ang, 1));
      }
    }

    /* 瀑布滤：外挂式，参考图设计 */
    function drawHangOnFilter(ang: number) {
      const fd = workspace.filter_detail?.hangon ?? { slot_x: tw * 0.15, slot_y: th * 0.7, slot_z: td * 0.12 };
      const fw = ns(fd.slot_x) * sc;
      const fh = ns(fd.slot_y) * sc;
      const fdz = ns(fd.slot_z) * sc;

      // 挂在鱼缸右侧面（+x），紧贴外壁
      const fx0 = dhw;
      const fx1 = dhw + fw;
      // z 方向居中于鱼缸后侧（参考图中过滤器在右后方）
      const fzCenter = dhd * 0.3;
      const fz0 = fzCenter - fdz * 0.5;
      const fz1 = fzCenter + fdz * 0.5;
      // y 方向：瀑布滤挂在缸壁上方，顶部平齐或略高于缸顶
      const fy1 = dhh + dh * 0.03;
      const fy0 = fy1 - Math.min(fh, dh * 0.82);

      const v = [
        { x: fx0, y: fy0, z: fz0 }, { x: fx1, y: fy0, z: fz0 },
        { x: fx1, y: fy1, z: fz0 }, { x: fx0, y: fy1, z: fz0 },
        { x: fx0, y: fy0, z: fz1 }, { x: fx1, y: fy0, z: fz1 },
        { x: fx1, y: fy1, z: fz1 }, { x: fx0, y: fy1, z: fz1 },
      ].map((p) => proj(p, ang, 1));

      stroke('hsl(42 90% 55% / 0.6)', 1.2);
      line(v[0], v[3]); line(v[1], v[2]); line(v[4], v[7]); line(v[5], v[6]);
      poly([v[0], v[1], v[5], v[4]], true);
      line(v[0], v[4]); line(v[1], v[5]); line(v[3], v[7]); line(v[2], v[6]);
      line(v[3], v[2]); line(v[7], v[6]);
      line(v[2], v[1]); line(v[3], v[0]);
      line(v[6], v[5]); line(v[7], v[4]);

      // 内部水平分层隔板（4层）
      for (let i = 1; i <= 3; i++) {
        const by = fy0 + ((fy1 - fy0) * i) / 4;
        const p1 = proj({ x: fx0, y: by, z: fz0 }, ang, 1);
        const p2 = proj({ x: fx0, y: by, z: fz1 }, ang, 1);
        const p3 = proj({ x: fx1, y: by, z: fz1 }, ang, 1);
        const p4 = proj({ x: fx1, y: by, z: fz0 }, ang, 1);
        stroke('hsl(42 90% 55% / 0.3)', 0.8);
        poly([p1, p2, p3, p4], true);
      }

      // 进水弯管：从鱼缸顶部边缘弯入过滤器顶部
      stroke('hsl(42 90% 55% / 0.55)', 1.2);
      const inletStart = proj({ x: dhw - fw * 0.1, y: dhh, z: fz0 + fdz * 0.3 }, ang, 1);
      const inletKnee = proj({ x: dhw + fw * 0.2, y: dhh + dh * 0.06, z: fz0 + fdz * 0.3 }, ang, 1);
      const inletEnd = proj({ x: dhw + fw * 0.35, y: fy1, z: fz0 + fdz * 0.3 }, ang, 1);
      ctx!.beginPath();
      ctx!.moveTo(inletStart.x, inletStart.y);
      ctx!.quadraticCurveTo(inletKnee.x, inletKnee.y, inletEnd.x, inletEnd.y);
      ctx!.stroke();
      // 进水口小矩形（入水口）
      const inletRect = [
        proj({ x: dhw + fw * 0.25, y: fy1 + 2, z: fz0 + fdz * 0.15 }, ang, 1),
        proj({ x: dhw + fw * 0.45, y: fy1 + 2, z: fz0 + fdz * 0.15 }, ang, 1),
        proj({ x: dhw + fw * 0.45, y: fy1 - 1, z: fz0 + fdz * 0.15 }, ang, 1),
        proj({ x: dhw + fw * 0.25, y: fy1 - 1, z: fz0 + fdz * 0.15 }, ang, 1),
      ];
      stroke('hsl(42 90% 55% / 0.4)', 0.8);
      poly(inletRect, true);

      // 出水弯管：从过滤器底部弯回鱼缸
      stroke('hsl(42 90% 55% / 0.55)', 1.2);
      const outletStart = proj({ x: dhw + fw * 0.65, y: fy0, z: fz0 + fdz * 0.6 }, ang, 1);
      const outletKnee = proj({ x: dhw + fw * 0.5, y: fy0 - dh * 0.06, z: fz0 + fdz * 0.6 }, ang, 1);
      const outletEnd = proj({ x: dhw - fw * 0.05, y: fy0 - dh * 0.04, z: fz0 + fdz * 0.6 }, ang, 1);
      ctx!.beginPath();
      ctx!.moveTo(outletStart.x, outletStart.y);
      ctx!.quadraticCurveTo(outletKnee.x, outletKnee.y, outletEnd.x, outletEnd.y);
      ctx!.stroke();

      // 过滤器顶部进水槽（一个小盒子在顶部）
      const topY = fy1 + dh * 0.02;
      const topBox = [
        proj({ x: fx0 + fw * 0.1, y: topY, z: fz0 + fdz * 0.1 }, ang, 1),
        proj({ x: fx1 - fw * 0.1, y: topY, z: fz0 + fdz * 0.1 }, ang, 1),
        proj({ x: fx1 - fw * 0.1, y: topY, z: fz1 - fdz * 0.1 }, ang, 1),
        proj({ x: fx0 + fw * 0.1, y: topY, z: fz1 - fdz * 0.1 }, ang, 1),
      ];
      stroke('hsl(42 90% 55% / 0.35)', 0.7);
      poly(topBox, true);
    }

    /* 侧滤：左/右 */
    function drawSideFilter(ang: number) {
      const dir = workspace.side_filter_direction ?? 'left';
      const fd = workspace.filter_detail?.side ?? { inner_x: td * 0.2, inner_y: th * 0.8, inner_z: th * 0.15 };
      const fw = ns(fd.inner_x) * sc;
      const fh = ns(fd.inner_y) * sc;
      const fdz = ns(fd.inner_z) * sc;

      let fx0: number, fx1: number, fz0: number, fz1: number;
      if (dir === 'right') {
        fx0 = dhw; fx1 = dhw + fw;
        fz0 = -dhd; fz1 = dhd;
      } else {
        fx0 = -dhw - fw; fx1 = -dhw;
        fz0 = -dhd; fz1 = dhd;
      }
      const fy0 = -dhh;
      const fy1 = fy0 + Math.min(fh, dh * 0.92);

      const v = [
        { x: fx0, y: fy0, z: fz0 }, { x: fx1, y: fy0, z: fz0 },
        { x: fx1, y: fy1, z: fz0 }, { x: fx0, y: fy1, z: fz0 },
        { x: fx0, y: fy0, z: fz1 }, { x: fx1, y: fy0, z: fz1 },
        { x: fx1, y: fy1, z: fz1 }, { x: fx0, y: fy1, z: fz1 },
      ].map((p) => proj(p, ang, 1));

      const color = dir === 'right' ? 'hsl(280 70% 60% / 0.6)' : 'hsl(320 70% 60% / 0.6)';
      stroke(color, 1.2);
      line(v[0], v[3]); line(v[1], v[2]); line(v[4], v[7]); line(v[5], v[6]);
      poly([v[0], v[1], v[5], v[4]], true);
      line(v[1], v[5]); line(v[0], v[4]); line(v[3], v[7]); line(v[2], v[6]);
      line(v[3], v[2]); line(v[7], v[6]);

      // 隔板
      stroke('hsl(191 100% 60% / 0.35)', 1);
      line(v[0], v[3]);

      // 内部挡板
      for (let i = 1; i <= 2; i++) {
        const by = fy0 + (Math.min(fh, dh * 0.92) * i) / 3;
        const p1 = proj({ x: fx0, y: by, z: fz0 }, ang, 1);
        const p2 = proj({ x: fx0, y: by, z: fz1 }, ang, 1);
        const p3 = proj({ x: fx1, y: by, z: fz1 }, ang, 1);
        const p4 = proj({ x: fx1, y: by, z: fz0 }, ang, 1);
        stroke(color.replace('0.6', '0.3'), 0.8);
        poly([p1, p2, p3, p4], true);
      }

      // 顶部格栅
      stroke(color.replace('0.6', '0.35'), 0.6);
      const step = (fz1 - fz0) / 5;
      for (let i = 1; i < 5; i++) {
        const zz = fz0 + step * i;
        line(proj({ x: fx0, y: fy1, z: zz }, ang, 1), proj({ x: fx1, y: fy1, z: zz }, ang, 1));
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      const ang = angleRef.current;
      drawTank(ang);

      const ftt = workspace.filter_type;
      if (ftt === 'back') drawBackFilter(ang);
      else if (ftt === 'bottom') drawBottomFilter(ang);
      else if (ftt === 'hangon') drawHangOnFilter(ang);
      else if (ftt === 'side') drawSideFilter(ang);
      // DIY 只显示主缸

      // 尺寸标签
      if (previewMode) {
        ctx!.fillStyle = 'hsl(var(--muted-foreground))';
        ctx!.font = '11px sans-serif';
        ctx!.textAlign = 'center';
        const label = `${raw.x}×${raw.y}×${raw.z} cm`;
        ctx!.fillText(label, cx, H - 12);
      }
    }

    function loop() {
      if (rotate) angleRef.current += 0.003;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [workspace, rotate, previewMode]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ imageRendering: 'auto' }}
    />
  );
}
