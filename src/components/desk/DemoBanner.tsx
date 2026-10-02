import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUsers } from '@/data/users';
import {
  Company,
  DEMO_LIMIT_EVENT,
  DemoLimits,
  confirmPurchase,
  fetchCompanyStatus,
  isMainCompany,
  saveCompany,
  useCompany,
} from '@/lib/company';
import { buyFullAccess, canPurchase, fetchPrice, restorePurchase } from '@/lib/iap';

export const OPEN_UPGRADE = 'gsi-open-upgrade';

/** Открыть окно покупки из любого места приложения. */
export const openUpgrade = () => window.dispatchEvent(new Event(OPEN_UPGRADE));

const LIMIT_LABEL: Record<keyof DemoLimits, string> = {
  objects: 'Объекты',
  users: 'Сотрудники',
  inspections: 'Акты осмотра',
  vehicles: 'Техника',
  locations: 'Локации',
};

const BUY_ERRORS: Record<string, string> = {
  cancelled: 'Покупка отменена',
  pending: 'Покупка ожидает подтверждения. Доступ откроется, как только Apple её подтвердит.',
  not_found: 'Покупка не найдена в App Store',
  unavailable: 'Покупка доступна в приложении «Инспектор СК» на iPhone и iPad',
  already_used: 'Эта покупка уже привязана к другой компании',
  revoked: 'Покупка отменена в App Store',
};

/**
 * Полоса демо-доступа под шапкой и окно покупки полного доступа.
 *
 * Видна только компаниям на демо-тарифе. Код приглашения сотрудников
 * показывается руководителю — по нему сотрудники входят в свою компанию.
 */
const DemoBanner = () => {
  const company = useCompany();
  const { current } = useUsers();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Company | null>(null);
  const [busy, setBusy] = useState<'' | 'buy' | 'restore'>('');
  const [price, setPrice] = useState('');
  const [inApp] = useState(canPurchase);

  const refresh = useCallback(async () => {
    if (!company || isMainCompany(company)) return;
    try {
      const fresh = await fetchCompanyStatus(company.token, current?.id ?? '');
      setInfo(fresh);
      if (fresh.plan !== company.plan || fresh.name !== company.name) {
        saveCompany({ ...company, plan: fresh.plan, name: fresh.name, limits: fresh.limits });
      }
    } catch {
      // Нет связи — покажем то, что есть.
    }
  }, [company, current?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const on = () => {
      setOpen(true);
      refresh();
    };
    const onLimit = (e: Event) => {
      const table = (e as CustomEvent<string>).detail as keyof DemoLimits;
      toast({
        title: 'Лимит демо-доступа исчерпан',
        description: `${LIMIT_LABEL[table] ?? 'Раздел'}: в демо-доступе больше добавить нельзя. Откройте полный доступ.`,
        variant: 'destructive',
      });
      on();
    };
    window.addEventListener(OPEN_UPGRADE, on);
    window.addEventListener(DEMO_LIMIT_EVENT, onLimit);
    return () => {
      window.removeEventListener(OPEN_UPGRADE, on);
      window.removeEventListener(DEMO_LIMIT_EVENT, onLimit);
    };
  }, [refresh, toast]);

  useEffect(() => {
    if (!open || !inApp || price) return;
    fetchPrice().then((r) => r.price && setPrice(r.price));
  }, [open, inApp, price]);

  if (!company || isMainCompany(company)) return null;

  const demo = company.plan === 'demo';
  const code = info?.accessCode;

  const finish = async (kind: 'buy' | 'restore') => {
    setBusy(kind);
    try {
      const r = kind === 'buy' ? await buyFullAccess() : await restorePurchase();
      if (!r.ok || !r.jws) {
        if (r.error !== 'cancelled') {
          toast({
            title: 'Полный доступ не открыт',
            description: BUY_ERRORS[r.error ?? ''] ?? 'Повторите попытку позже.',
            variant: 'destructive',
          });
        }
        return;
      }
      const updated = await confirmPurchase(company.token, r.jws);
      saveCompany({ ...company, plan: updated.plan, limits: null });
      setInfo((p) => (p ? { ...p, plan: updated.plan } : p));
      toast({ title: 'Полный доступ открыт', description: 'Ограничения демо-доступа сняты.' });
      setOpen(false);
    } catch (e) {
      toast({
        title: 'Не удалось подтвердить покупку',
        description: BUY_ERRORS[(e as Error).message] ?? 'Нет связи с сервером. Повторите.',
        variant: 'destructive',
      });
    } finally {
      setBusy('');
    }
  };

  const limits = info?.limits ?? company.limits;
  const usage = info?.usage ?? {};

  return (
    <>
      {demo && (
        <div className="flex flex-none flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-accent/40 bg-accent/10 px-4 py-2 text-[0.8em] sm:px-[22px]">
          <Icon name="Sparkles" size={15} className="flex-none text-accent" />
          <span className="min-w-0 flex-1">
            <b className="font-head uppercase tracking-[0.06em]">Демо-доступ</b>
            <span className="text-muted-foreground"> · ограничено число объектов, сотрудников и актов</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              refresh();
            }}
            className="flex flex-none items-center gap-1.5 rounded-sm bg-accent px-3 py-1 font-head uppercase tracking-[0.06em] text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Icon name="Unlock" size={13} />
            Полный доступ
          </button>
        </div>
      )}

      {!demo && code && current && ['director', 'admin'].includes(current.role) && (
        <div className="flex flex-none items-center gap-2 border-b border-border bg-secondary/40 px-4 py-1.5 text-[0.76em] text-muted-foreground sm:px-[22px]">
          <Icon name="KeyRound" size={13} className="text-accent" />
          Код компании для сотрудников:
          <b className="font-mono tracking-[0.2em] text-foreground">{code}</b>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.3em] uppercase tracking-[0.03em]">
              {demo ? 'Полный доступ' : 'Полный доступ открыт'}
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">{company.name}</DialogDescription>
          </DialogHeader>

          {demo && limits && (
            <div className="rounded-sm border border-border">
              <p className="border-b border-border bg-secondary/50 px-3 py-2 text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
                Использовано в демо-доступе
              </p>
              {(Object.keys(LIMIT_LABEL) as (keyof DemoLimits)[]).map((k) => {
                const used = usage[k] ?? 0;
                const max = limits[k];
                const full = used >= max;
                return (
                  <div
                    key={k}
                    className="flex items-center justify-between border-b border-border px-3 py-1.5 text-[0.85em] last:border-b-0"
                  >
                    <span>{LIMIT_LABEL[k]}</span>
                    <span className={full ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
                      {used} из {max}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {code && (
            <div className="rounded-sm border border-border bg-secondary/40 p-3 text-[0.82em]">
              <p className="text-muted-foreground">
                Код компании — передайте его сотрудникам. Они выбирают «Войти по коду компании» и
                входят под учётной записью, которую вы им создадите.
              </p>
              <p className="mt-2 text-center font-mono text-[1.5em] font-bold tracking-[0.3em]">
                {code}
              </p>
            </div>
          )}

          {demo &&
            (inApp ? (
              <div className="space-y-2">
                <p className="text-[0.82em] leading-snug text-muted-foreground">
                  Полный доступ снимает все ограничения для всей компании: объекты, сотрудники,
                  акты, техника и локации без лимитов. Оплата разовая, через App Store.
                </p>
                <Button
                  onClick={() => finish('buy')}
                  disabled={!!busy}
                  className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
                >
                  <Icon
                    name={busy === 'buy' ? 'Loader2' : 'Unlock'}
                    size={16}
                    className={busy === 'buy' ? 'animate-spin' : ''}
                  />
                  {busy === 'buy' ? 'Ожидаем App Store…' : `Купить${price ? ` за ${price}` : ''}`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => finish('restore')}
                  disabled={!!busy}
                  className="w-full gap-2 rounded-sm font-head uppercase tracking-[0.06em]"
                >
                  <Icon
                    name={busy === 'restore' ? 'Loader2' : 'RotateCcw'}
                    size={15}
                    className={busy === 'restore' ? 'animate-spin' : ''}
                  />
                  Восстановить покупку
                </Button>
              </div>
            ) : (
              <p className="rounded-sm border border-border p-3 text-[0.82em] leading-snug text-muted-foreground">
                Полный доступ оформляется в приложении «Инспектор СК» на iPhone или iPad. После
                покупки ограничения снимаются для всех сотрудников компании на любых
                устройствах.
              </p>
            ))}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DemoBanner;
