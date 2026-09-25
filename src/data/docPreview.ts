import { useEffect, useState } from 'react';

export type PreviewDoc = { html: string; title: string };

const EVENT = 'doc-preview';

let current: PreviewDoc | null = null;

/** Показать документ в окне просмотра поверх приложения. */
export const openDoc = (html: string, title = 'Документ') => {
  current = { html, title };
  window.dispatchEvent(new Event(EVENT));
};

/** Закрыть окно просмотра. */
export const closeDoc = () => {
  current = null;
  window.dispatchEvent(new Event(EVENT));
};

export const useDocPreview = () => {
  const [doc, setDoc] = useState<PreviewDoc | null>(current);

  useEffect(() => {
    const sync = () => setDoc(current);
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  return doc;
};
