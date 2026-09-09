import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

const APK = '/app/stroykontrol.apk';

const STEPS = [
  {
    icon: 'Download',
    title: 'Скачайте файл',
    text: 'Нажмите кнопку выше или наведите камеру на QR-код. Файл весит меньше мегабайта.',
  },
  {
    icon: 'ShieldQuestion',
    title: 'Разрешите установку',
    text: 'Телефон спросит разрешение на установку из этого источника — нажмите «Разрешить». Так Android спрашивает про все приложения не из Play Market.',
  },
  {
    icon: 'MapPin',
    title: 'Дайте доступ к камере и геолокации',
    text: 'При первом запуске приложение запросит камеру — для фотофиксации замечаний, и геолокацию — для отметок на объектах и трекера.',
  },
];

const AppDownload = () => {
  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center text-center">
          <img src="/icon-512.png" alt="" className="h-20 w-20 rounded-sm" />
          <h1 className="mt-4 font-head text-[1.7em] uppercase leading-tight tracking-[0.04em] text-foreground">
            Стройконтроль
          </h1>
          <span className="mt-2 block h-[3px] w-[90px] rounded-full bg-accent" />
          <p className="mt-3 max-w-md text-[0.9em] leading-relaxed text-muted-foreground">
            Мобильное приложение для инспекторов и водителей
            ООО «Глобал-Стройинжиниринг». Объекты, проверки, замечания,
            фотоотчёты и путевые листы — в телефоне.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="order-2 sm:order-1">
            <Button
              asChild
              className="w-full gap-2 rounded-sm bg-accent py-6 font-head text-[1em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <a href={APK} download>
                <Icon name="Download" size={18} />
                Скачать для Android
              </a>
            </Button>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[0.78em] uppercase tracking-[0.05em] text-muted-foreground sm:justify-start">
              <span className="flex items-center gap-1.5">
                <Icon name="Smartphone" size={13} />
                Android 7 и новее
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="HardDrive" size={13} />
                версия 1.2
              </span>
            </div>
          </div>

          <div className="order-1 flex flex-col items-center sm:order-2">
            <img
              src="/app-qr.png"
              alt="QR-код для скачивания приложения"
              className="h-40 w-40 rounded-sm border border-border bg-white p-1.5"
            />
            <span className="mt-2 text-[0.74em] uppercase tracking-[0.08em] text-muted-foreground">
              Наведите камеру
            </span>
          </div>
        </div>

        <div className="mt-9 space-y-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="flex gap-3.5 rounded-sm border border-border bg-card p-4"
            >
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-accent/10 text-accent">
                <Icon name={s.icon} size={17} />
              </div>
              <div className="min-w-0">
                <h2 className="font-head text-[0.95em] uppercase tracking-[0.03em] text-foreground">
                  {i + 1}. {s.title}
                </h2>
                <p className="mt-1 text-[0.85em] leading-relaxed text-muted-foreground">
                  {s.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-sm border border-border border-l-2 border-l-accent bg-card p-4">
          <h2 className="flex items-center gap-2 font-head text-[0.95em] uppercase tracking-[0.03em]">
            <Icon name="Apple" size={16} className="text-accent" />
            На iPhone
          </h2>
          <p className="mt-1.5 text-[0.85em] leading-relaxed text-muted-foreground">
            Откройте сайт в Safari, нажмите «Поделиться» и выберите «На экран
            "Домой"». Система появится на рабочем столе как обычное приложение.
          </p>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-[0.85em] text-accent underline-offset-2 hover:underline"
          >
            <Icon name="ArrowLeft" size={14} />
            Вернуться в систему
          </a>
        </div>
      </div>
    </div>
  );
};

export default AppDownload;
