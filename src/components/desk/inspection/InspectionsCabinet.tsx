import { useState } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
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
import { ProjectObject } from '@/data/store';
import { useProfile } from '@/data/profile';
import { Inspection, useInspections } from '@/data/inspections';
import { useContractor, useOrders } from '@/data/orders';
import { downloadRegistry } from '@/lib/registryXls';
import NewInspection from '@/components/desk/inspection/NewInspection';
import ActEditor from '@/components/desk/inspection/ActEditor';

interface InspectionsCabinetProps {
  object: ProjectObject;
  onBack: () => void;
  onOrdersOpen?: () => void;
}

type View = 'menu' | 'new' | 'act' | 'list';

const InspectionsCabinet = ({ object, onBack, onOrdersOpen }: InspectionsCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { items, loading, create, update } = useInspections(object.id);
  const { general: contractor, subs } = useContractor(object.id);
  const { create: createOrder } = useOrders(object.id);

  const [view, setView] = usePersistedState<View>(`gsi-insp-view-${object.id}`, 'menu');
  const [activeId, setActiveId] = usePersistedState<string | null>(
    `gsi-insp-active-${object.id}`,
    null,
  );
  const active = items.find((i) => i.id === activeId) ?? null;
  const [ask, setAsk] = useState<Inspection | null>(null);
  const [busy, setBusy] = useState(false);

  const startNew = async (data: {
    workType: string;
    docRef: string;
    contractorRep: string;
    inspector: string;
    generalContractor: string;
    subcontractor: string;
  }) => {
    setBusy(true);
    try {
      const item = await create(data);
      setActiveId(item.id);
      setView('act');
    } catch {
      toast({ title: 'Не удалось создать осмотр', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const exportRegistry = () => {
    if (!items.length) {
      toast({ title: 'Актов пока нет', variant: 'destructive' });
      return;
    }
    downloadRegistry(items, object.title);
    setAsk(null);
    toast({ title: 'Реестр сформирован', description: `Excel · актов: ${items.length}` });
  };

  const makeOrder = async (insp: Inspection) => {
    setBusy(true);
    try {
      const res = await fetch(
        `https://functions.poehali.dev/26fd0e42-bb64-4022-acb0-097508981039?id=${insp.id}`,
      );
      const { defects } = (await res.json()) as {
        defects: {
          pos: number;
          title: string;
          normRef?: string;
          deadline?: string;
          photos: string[];
        }[];
      };
      const order = await createOrder({
        objectId: object.id,
        inspectionId: insp.id,
        issuedTo: insp.subcontractor || insp.generalContractor || contractor?.name || '',
        inspector: insp.inspector || profile.fio,
        deadline:
          defects
            .map((d) => d.deadline || '')
            .filter(Boolean)
            .sort(
              (a, b) =>
                new Date(a.split('.').reverse().join('-')).getTime() -
                new Date(b.split('.').reverse().join('-')).getTime(),
            )[0] ?? '',
        body: {
          workType: insp.workType,
          docRef: insp.docRef,
          contractorRep: insp.contractorRep,
          generalContractor: insp.generalContractor,
          subcontractor: insp.subcontractor,
          objectTitle: object.title,
          items: defects.map((d) => ({
            pos: d.pos,
            title: d.title,
            normRef: d.normRef ?? '',
            deadline: d.deadline ?? '',
            photos: d.photos,
          })),
        },
      });
      toast({
        title: `Предписание № ${order.number} создано`,
        description: 'Открыть можно в разделе «Предписания».',
      });
      setAsk(null);
      onOrdersOpen?.();
    } catch {
      toast({ title: 'Не удалось оформить предписание', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (view === 'new') {
    return (
      <NewInspection
        objectTitle={object.title}
        inspector={profile.fio}
        contractorName={contractor?.name}
        subs={subs}
        busy={busy}
        onBack={() => setView('menu')}
        onCreate={startNew}
      />
    );
  }

  if (view === 'act' && !active && loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 text-muted-foreground">
        <Icon name="Loader2" size={18} className="animate-spin" />
        Открываем акт…
      </div>
    );
  }

  if (view === 'act' && active) {
    return (
      <ActEditor
        inspection={active}
        objectTitle={object.title}
        contractorName={contractor?.name}
        onBack={() => {
          setActiveId(null);
          setView('menu');
        }}
        onFinish={(i) => update(i.id, { status: 'done' })}
        onOrder={(i) => makeOrder(i)}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={() => (view === 'list' ? setView('menu') : onBack())}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        {view === 'list' ? 'К проверкам' : 'К меню объекта'}
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            Проверки объекта
          </p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
            {object.title}
          </h1>
        </section>

        {view === 'menu' ? (
          <Panel title="Что делаем" note={`${items.length} осмотров`}>
            <div className="grid gap-px bg-border sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setView('new')}
                className="group flex items-center gap-3 bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                  <Icon name="ClipboardPlus" size={21} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-head text-[1em] uppercase tracking-[0.03em]">
                    Новый осмотр
                  </span>
                  <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                    Заполнить параметры и составить акт
                  </span>
                </span>
                <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
              </button>

              <button
                type="button"
                onClick={() => setView('list')}
                className="group flex items-center gap-3 bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                  <Icon name="ClipboardList" size={21} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-head text-[1em] uppercase tracking-[0.03em]">
                    Реестр осмотров
                  </span>
                  <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                    {loading ? 'Загрузка…' : `${items.length} записей по объекту`}
                  </span>
                </span>
                <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
              </button>
            </div>
          </Panel>
        ) : (
          <Panel
            title="Реестр осмотров"
            note={`${items.length}`}
            action={
              items.length > 0 ? (
                <button
                  type="button"
                  onClick={exportRegistry}
                  className="ml-3 flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.76em] uppercase tracking-[0.06em] text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  <Icon name="FileSpreadsheet" size={13} />
                  В Excel
                </button>
              ) : undefined
            }
          >
            {items.length === 0 ? (
              <Empty
                icon="ClipboardList"
                title="Осмотров пока нет"
                hint="Начните с кнопки «Новый осмотр»."
              />
            ) : (
              items.map((i, idx) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setAsk(i)}
                  className="group flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-foreground hover:text-background"
                >
                  <span className="w-6 flex-none text-center font-head text-[0.85em] text-muted-foreground group-hover:text-background/70">
                    {items.length - idx}
                  </span>
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground">
                    <Icon name={i.actUrl ? 'FileCheck' : 'FilePen'} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.02em]">
                      Акт № {i.number} · {i.workType || 'без вида работ'}
                    </span>
                    <span className="block truncate text-[0.76em] text-muted-foreground group-hover:text-background/70">
                      {new Date(i.createdAt).toLocaleString('ru', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {i.defectCount ? ` · замечаний: ${i.defectCount}` : ' · без замечаний'}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[0.72em] uppercase tracking-[0.06em] text-muted-foreground group-hover:text-background/70">
                      <Icon
                        name={i.actUrl ? 'CloudCheck' : 'CloudOff'}
                        size={12}
                        className="flex-none"
                      />
                      {i.actUrl ? 'в системе' : 'черновик'}
                    </span>
                  </span>
                  <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
                </button>
              ))
            )}
          </Panel>
        )}
      </div>

      <Dialog open={ask !== null} onOpenChange={(v) => !v && setAsk(null)}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Акт № {ask?.number}
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Что нужно сделать с этим актом?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                if (ask) {
                  setActiveId(ask.id);
                  setAsk(null);
                  setView('act');
                }
              }}
              className="gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon name="Eye" size={16} />
              Просмотреть акт
            </Button>
            {ask?.actUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(ask.actUrl, '_blank')}
                className="gap-2 rounded-sm font-head uppercase tracking-[0.06em]"
              >
                <Icon name="Download" size={16} />
                Скачать сохранённый акт
              </Button>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => ask && makeOrder(ask)}
              className="gap-2 rounded-sm font-head uppercase tracking-[0.06em]"
            >
              <Icon
                name={busy ? 'Loader2' : 'FileWarning'}
                size={16}
                className={busy ? 'animate-spin' : ''}
              />
              Оформить предписание
            </Button>
            <Button
              variant="outline"
              onClick={exportRegistry}
              className="gap-2 rounded-sm font-head uppercase tracking-[0.06em]"
            >
              <Icon name="FileSpreadsheet" size={16} />
              Реестр актов проверок
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InspectionsCabinet;