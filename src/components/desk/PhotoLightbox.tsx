import { useEffect } from 'react';
import Icon from '@/components/ui/icon';

interface PhotoLightboxProps {
  url: string;
  onClose: () => void;
}

/**
 * Просмотр фотографии поверх приложения.
 * Открывать снимок в новой вкладке нельзя: внутри приложения
 * на iPhone такую вкладку нечем закрыть.
 */
const PhotoLightbox = ({ url, onClose }: PhotoLightboxProps) => {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex flex-none justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть фотографию"
          className="flex h-10 items-center gap-1.5 rounded-sm border border-white/40 px-3 text-[0.8em] uppercase tracking-[0.08em] text-white transition-colors hover:bg-white hover:text-black"
        >
          <Icon name="X" size={16} />
          Закрыть
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <img src={url} alt="" className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  );
};

export default PhotoLightbox;
