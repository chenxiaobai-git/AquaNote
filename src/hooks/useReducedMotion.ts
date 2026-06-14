import { useEffect, useState } from 'react';

/**
 * 检测是否启用「减少动效」：
 * 优先使用 DOM 属性（由 AuthContext 根据 profile.reduce_motion 或系统偏好设置），
 * 降级读取 matchMedia。
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    // 读 DOM 属性（由 AuthContext 注入）
    const attr = document.documentElement.getAttribute('data-reduce-motion');
    if (attr !== null) return attr === '1';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const attr = document.documentElement.getAttribute('data-reduce-motion');
      setReduced(attr === '1');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-reduce-motion'],
    });
    return () => observer.disconnect();
  }, []);

  return reduced;
}
