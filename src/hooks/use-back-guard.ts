import { useEffect, useRef } from 'react';

const STACK: (() => void)[] = [];
let bound = false;

const bind = () => {
  if (bound) return;
  bound = true;
  window.addEventListener('popstate', () => {
    const fn = STACK.pop();
    if (fn) fn();
  });
};

export const useBackGuard = (active: boolean, onBack: () => void) => {
  const ref = useRef(onBack);
  ref.current = onBack;

  useEffect(() => {
    if (!active) return;
    bind();

    const entry = () => ref.current();
    STACK.push(entry);
    window.history.pushState({ guard: STACK.length }, '');

    return () => {
      const i = STACK.lastIndexOf(entry);
      if (i !== -1) STACK.splice(i, 1);
    };
  }, [active]);
};

export default useBackGuard;
