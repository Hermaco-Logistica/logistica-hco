import { useState, useEffect, useRef } from 'react';

export function useInView(options = {}) {
  const { threshold = 0.1, rootMargin = '50px', triggerOnce = false } = options;
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        if (triggerOnce) {
          observer.unobserve(el);
        }
      } else if (!triggerOnce) {
        setIsInView(false);
      }
    }, { threshold, rootMargin });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isInView };
}

export function useCountUp(target, duration = 1000, start = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) {
      setCount(0); // Reset when not in view
      return;
    }

    let startTime = null;
    let animationFrame;
    const finalValue = Number(target) || 0;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing out cubic function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(finalValue * easeOut);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setCount(finalValue);
      }
    };

    animationFrame = window.requestAnimationFrame(step);
    
    return () => window.cancelAnimationFrame(animationFrame);
  }, [target, duration, start]);

  return count;
}
