import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RussiaMap from "@/components/desk/RussiaMap";
import Icon from "@/components/ui/icon";
import { useToast } from "@/hooks/use-toast";
import { CITIES, DISTRICTS } from "@/data/geo";
import { ProjectObject, STATUS_LABEL, KIND_LABEL } from "@/data/store";

interface ObjectFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (o: Omit<ProjectObject, "id">) => void | Promise<unknown>;
}

const EMPTY = {
  title: "",
  field: "",
  kind: "area" as ProjectObject["kind"],
  capacity: "",
  startYear: "",
  endYear: "",
  inspectors: "0",
  vehicles: "0",
  cabins: "0",
  customer: "",
  customerLogo: "",
  contractNo: "",
  contractSum: "",
  address: "",
  stage: "",
  progress: "0",
  start: "",
  deadline: "",
  status: "work" as ProjectObject["status"],
  staffPlan: "0",
  staffFact: "0",
  techPlan: "0",
  techFact: "0",
  orders: "0",
  ordersOpen: "0",
};

const dist = (aLon: number, aLat: number, bLon: number, bLat: number) => {
  const dx =
    (aLon - bLon) * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180)) * 111;
  const dy = (aLat - bLat) * 111;
  return Math.sqrt(dx * dx + dy * dy);
};

const ObjectForm = ({ open, onOpenChange, onSave }: ObjectFormProps) => {
  const [f, setF] = useState(EMPTY);
  const [point, setPoint] = useState<{ lon: number; lat: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const set = (k: keyof typeof EMPTY, v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const near = useMemo(() => {
    if (!point) return [];
    return CITIES.map((c) => ({
      ...c,
      km: dist(point.lon, point.lat, c.lon, c.lat),
    }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 4);
  }, [point]);

  const submit = async () => {
    if (busy) return;
    if (!f.title.trim() || !f.customer.trim()) {
      toast({
        title: "Заполните название объекта и заказчика",
        variant: "destructive",
      });
      return;
    }
    if (!point) {
      toast({ title: "Отметьте объект на карте", variant: "destructive" });
      return;
    }
    const n = (v: string) => Number(v.replace(/\s/g, "")) || 0;
    const anchor = near[0];
    const districtId = anchor?.d ?? DISTRICTS[0].id;

    setBusy(true);
    try {
      await onSave({
        title: f.title.trim(),
        field: f.field.trim(),
        kind: f.kind,
        capacity: f.capacity.trim(),
        startYear: f.startYear.trim(),
        endYear: f.endYear.trim(),
        inspectors: n(f.inspectors),
        vehicles: n(f.vehicles),
        cabins: n(f.cabins),
        customer: f.customer.trim(),
        customerLogo: f.customerLogo.trim() || undefined,
        contractNo: f.contractNo.trim(),
        contractSum: n(f.contractSum),
        regionId: anchor?.n ?? "point",
        regionName:
          f.address.trim() ||
          (anchor
            ? `${Math.round(anchor.km)} км от г. ${anchor.n}`
            : "Точка на карте"),
        district: districtId,
        lon: Number(point.lon.toFixed(4)),
        lat: Number(point.lat.toFixed(4)),
        stage: f.stage.trim() || "Подготовительный этап",
        progress: Math.min(100, n(f.progress)),
        start: f.start,
        deadline: f.deadline,
        status: f.status,
        staffPlan: n(f.staffPlan),
        staffFact: n(f.staffFact),
        techPlan: n(f.techPlan),
        techFact: n(f.techFact),
        orders: n(f.orders),
        ordersOpen: n(f.ordersOpen),
      });
      toast({
        title: "Объект добавлен",
        description: "Сохранён на сервере — его увидят все пользователи.",
      });
      setF(EMPTY);
      setPoint(null);
      onOpenChange(false);
    } catch {
      toast({
        title: "Не удалось сохранить",
        description: "Проверьте соединение и попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const field = (
    k: keyof typeof EMPTY,
    label: string,
    props: Record<string, unknown> = {},
  ) => (
    <div className="space-y-1.5">
      <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      <Input
        value={f[k] as string}
        onChange={(e) => set(k, e.target.value)}
        className="rounded-sm"
        {...props}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-xl uppercase tracking-[0.04em]">
            Новый объект
          </DialogTitle>
          <DialogDescription>
            Отметьте место пальцем на карте — ближайшие города подскажут
            ориентир
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-sm border border-border">
          <RussiaMap
            objects={[]}
            pickMode
            marker={point}
            onPoint={(lon, lat) => setPoint({ lon, lat })}
            height="max-h-[38vh]"
          />
        </div>

        <div className="rounded-sm border border-border bg-secondary/50 p-3 text-[0.85em]">
          {point ? (
            <>
              <div className="flex items-center gap-2 font-head uppercase tracking-[0.06em]">
                <Icon name="MapPin" size={15} className="text-accent" />
                {point.lat.toFixed(3)}° с.ш., {point.lon.toFixed(3)}° в.д.
              </div>
              <div className="mt-1.5 text-muted-foreground">
                Ближайшие города:{" "}
                {near.map((c, i) => (
                  <span key={c.n}>
                    {i > 0 && ", "}
                    {c.n} — {Math.round(c.km)} км
                  </span>
                ))}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">
              Точка не выбрана: приблизьте округ и коснитесь нужного места на
              карте.
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {field("field", "Месторождение", {
              placeholder: "напр. Чаяндинское НГКМ",
            })}
          </div>
          <div className="sm:col-span-2">
            {field("title", "Название объекта")}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Тип объекта
            </Label>
            <Select value={f.kind} onValueChange={(v) => set("kind", v)}>
              <SelectTrigger className="rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {field(
            "capacity",
            f.kind === "line"
              ? "Протяжённость"
              : "Мощность / производительность",
            {
              placeholder:
                f.kind === "line" ? "напр. 128,4 км" : "напр. 4,5 млн т/год",
            },
          )}
          {field("startYear", "Год начала строительства", {
            inputMode: "numeric",
            placeholder: "2025",
          })}
          {field("endYear", "Плановый год завершения", {
            inputMode: "numeric",
            placeholder: "2027",
          })}
          {field("inspectors", "Численность инспекторов", {
            inputMode: "numeric",
          })}
          {field("vehicles", "Численность техники", { inputMode: "numeric" })}
          {field("cabins", "Численность вагонов", { inputMode: "numeric" })}
          {field("customer", "Заказчик")}
          {field("customerLogo", "Ссылка на эмблему заказчика", {
            placeholder: "https://…",
          })}
          <div className="sm:col-span-2">
            {field("address", "Адрес или привязка на местности", {
              placeholder: "напр. 42 км автодороги Ленск — Мирный",
            })}
          </div>
          {field("contractNo", "Номер договора")}
          {field("contractSum", "Сумма договора, ₽", { inputMode: "numeric" })}

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Статус
            </Label>
            <Select value={f.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {field("stage", "Текущий этап работ")}
          {field("progress", "Готовность, %", { inputMode: "numeric" })}
          {field("start", "Начало работ", { type: "date" })}
          {field("deadline", "Срок по договору", { type: "date" })}
          {field("staffPlan", "Персонал, план", { inputMode: "numeric" })}
          {field("staffFact", "Персонал, факт", { inputMode: "numeric" })}
          {field("techPlan", "Техника, план", { inputMode: "numeric" })}
          {field("techFact", "Техника, факт", { inputMode: "numeric" })}
          {field("orders", "Предписаний выдано", { inputMode: "numeric" })}
          {field("ordersOpen", "Из них не устранено", { inputMode: "numeric" })}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            className="rounded-sm"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            className="rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            onClick={submit}
            disabled={busy}
          >
            {busy ? 'Сохраняем…' : 'Сохранить объект'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ObjectForm;