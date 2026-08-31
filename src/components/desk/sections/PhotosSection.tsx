import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PHOTOS, Photo } from '@/data/mock';

const PhotosSection = () => {
  const [open, setOpen] = useState<Photo | null>(null);
  const idx = open ? PHOTOS.findIndex((p) => p.id === open.id) : -1;
  const step = (d: number) => setOpen(PHOTOS[(idx + d + PHOTOS.length) % PHOTOS.length]);

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-[2fr_1fr]">
        <Panel title="Фотоотчёты" note={`${PHOTOS.length} из 148`}>
          <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3">
            {PHOTOS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpen(p)}
                className="group animate-fade-in overflow-hidden rounded-sm border border-border text-left"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="block aspect-[4/3] overflow-hidden">
                  <img
                    src={p.src}
                    alt={p.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="block px-2.5 py-2">
                  <span className="block truncate text-[0.9em]">{p.title}</span>
                  <span className="mt-0.5 block truncate text-[0.78em] text-muted-foreground">
                    {p.meta}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Правила съёмки" note="на объекте">
          <ul className="space-y-3 p-4 text-[0.9em]">
            {[
              ['MapPin', 'Каждый снимок с координатами и временем — подделать дату нельзя'],
              ['Link', 'Фото привязывается к замечанию или акту одним касанием'],
              ['WifiOff', 'Съёмка работает без сети: выгрузка на сервер при появлении связи'],
              ['ShieldCheck', 'Оригиналы хранятся на едином сервере компании'],
            ].map(([icon, text]) => (
              <li key={text} className="flex gap-3">
                <Icon name={icon} size={16} className="mt-0.5 flex-none text-accent" />
                <span className="text-muted-foreground">{text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl rounded-sm border-t-2 border-t-accent p-0">
          {open && (
            <>
              <DialogTitle className="sr-only">{open.title}</DialogTitle>
              <DialogDescription className="sr-only">{open.meta}</DialogDescription>
              <img src={open.src} alt={open.title} className="max-h-[65vh] w-full object-cover" />
              <div className="flex items-center gap-3 px-5 pb-5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-head text-[0.95em] uppercase tracking-[0.08em]">
                    {open.title}
                  </div>
                  <div className="truncate text-[0.82em] text-muted-foreground">{open.meta}</div>
                  <div className="mt-1 text-[0.8em] text-accent">{open.tag}</div>
                </div>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Предыдущее фото"
                  className="rounded-sm border border-border p-2 transition-colors hover:bg-secondary"
                >
                  <Icon name="ChevronLeft" size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Следующее фото"
                  className="rounded-sm border border-border p-2 transition-colors hover:bg-secondary"
                >
                  <Icon name="ChevronRight" size={18} />
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotosSection;
