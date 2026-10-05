import { useEffect, useRef, useState } from 'react';

export function useHideOnScroll(el, { threshold = 10, topOffset = 20, resetKey } = {}) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    setHidden(false);
    lastY.current = 0;
  }, [resetKey]);

  useEffect(() => {
    if (!el) return;

    const update = () => {
      const y = Math.max(0, el.scrollTop);
      const delta = y - lastY.current;

      if (y <= topOffset) {
        setHidden(false);
      } else if (Math.abs(delta) >= threshold) {
        setHidden(delta > 0);
        lastY.current = y;
      }
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [el, threshold, topOffset]);

  return hidden;
}
