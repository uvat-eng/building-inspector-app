import { useCallback, useEffect, useState } from "react";

export interface ProjectObject {
  id: string;
  title: string;
  field: string;
  location: string;
  kind: "area" | "line";
  capacity: string;
  startYear: string;
  endYear: string;
  inspectors: number;
  vehicles: number;
  cabins: number;
  customer: string;
  customerLogo?: string;
  contractNo: string;
  contractSum: number;
  regionId: string;
  regionName: string;
  district: string;
  lon: number;
  lat: number;
  stage: string;
  progress: number;
  start: string;
  deadline: string;
  status: "work" | "plan" | "done" | "risk";
  staffPlan: number;
  staffFact: number;
  techPlan: number;
  techFact: number;
  orders: number;
  ordersOpen: number;
}

export const KIND_LABEL: Record<ProjectObject["kind"], string> = {
  area: "Площадочный объект",
  line: "Линейный объект",
};

export const NO_FIELD = "Без месторождения";

export const NO_LOCATION = "Без локации";

export const inScope = (
  list: ProjectObject[],
  scope: { locationId: string; project: string },
) =>
  list.filter(
    (o) =>
      (!scope.locationId || o.location === scope.locationId) &&
      (!scope.project || (o.field?.trim() || "") === scope.project),
  );

export const groupByLocation = (
  list: ProjectObject[],
  order: string[] = [],
) => {
  const map = new Map<string, ProjectObject[]>();
  list.forEach((o) => {
    const key = o.location?.trim() || "";
    map.set(key, [...(map.get(key) ?? []), o]);
  });
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? 999 : i;
  };
  return [...map.entries()].sort(
    (a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0], "ru"),
  );
};

export const groupByField = (list: ProjectObject[]) => {
  const map = new Map<string, ProjectObject[]>();
  list.forEach((o) => {
    const key = o.field?.trim() || NO_FIELD;
    map.set(key, [...(map.get(key) ?? []), o]);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "ru"));
};

export const STATUS_LABEL: Record<ProjectObject["status"], string> = {
  work: "В работе",
  plan: "Подготовка",
  done: "Завершён",
  risk: "Риск срыва",
};

const API =
  "https://functions.poehali.dev/78133056-3e64-4567-9c70-8387ccbfb929";
const CACHE = "gsi-objects-cache";
const EVENT = "gsi-objects-changed";

let cache: ProjectObject[] = (() => {
  try {
    const raw = localStorage.getItem(CACHE);
    return raw ? (JSON.parse(raw) as ProjectObject[]) : [];
  } catch {
    return [];
  }
})();

const publish = (list: ProjectObject[]) => {
  cache = list;
  try {
    localStorage.setItem(CACHE, JSON.stringify(list));
  } catch {
    /* переполнение хранилища не критично */
  }
  window.dispatchEvent(new Event(EVENT));
};

export const fetchObjects = async () => {
  const res = await fetch(API);
  if (!res.ok) throw new Error("load failed");
  const data = (await res.json()) as { items: ProjectObject[] };
  publish(data.items ?? []);
};

const migrateLocal = async () => {
  const raw = localStorage.getItem("gsi-objects-v1");
  if (!raw) return;
  localStorage.removeItem("gsi-objects-v1");
  try {
    const old = JSON.parse(raw) as ProjectObject[];
    for (const o of old) {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o),
      });
    }
  } catch {
    /* перенос не удался — работаем с сервером как есть */
  }
};

export const useObjects = () => {
  const [list, setList] = useState<ProjectObject[]>(cache);
  const [loading, setLoading] = useState(cache.length === 0);

  useEffect(() => {
    const sync = () => setList(cache);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    migrateLocal()
      .then(fetchObjects)
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const add = useCallback(async (o: Omit<ProjectObject, "id">) => {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(o),
    });
    if (!res.ok) throw new Error("save failed");
    const { item } = (await res.json()) as { item: ProjectObject };
    publish([...cache, item]);
    return item;
  }, []);

  const update = useCallback(
    async (id: string, patch: Partial<ProjectObject>) => {
      publish(cache.map((o) => (o.id === id ? { ...o, ...patch } : o)));
      const res = await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, patch }),
      });
      if (!res.ok) throw new Error("update failed");
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    publish(cache.filter((o) => o.id !== id));
    await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }, []);

  return { list, loading, add, update, remove, reload: fetchObjects };
};

export const summarize = (list: ProjectObject[]) => {
  const inWork = list.filter((o) => o.status === "work" || o.status === "risk");
  const sum = (fn: (o: ProjectObject) => number, src = list) =>
    src.reduce((s, o) => s + (fn(o) || 0), 0);

  return {
    portfolio: sum((o) => o.contractSum),
    total: list.length,
    inWork: inWork.length,
    staffPlan: sum((o) => o.staffPlan, inWork),
    staffFact: sum((o) => o.staffFact, inWork),
    techPlan: sum((o) => o.techPlan, inWork),
    techFact: sum((o) => o.techFact, inWork),
    orders: sum((o) => o.orders),
    ordersOpen: sum((o) => o.ordersOpen),
  };
};

export const money = (v: number) => {
  if (!v) return "0 ₽";
  if (v >= 1_000_000_000)
    return `${(v / 1_000_000_000).toFixed(1).replace(".", ",")} млрд ₽`;
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(1).replace(".", ",")} млн ₽`;
  if (v >= 1_000) return `${Math.round(v / 1000)} тыс ₽`;
  return `${v} ₽`;
};