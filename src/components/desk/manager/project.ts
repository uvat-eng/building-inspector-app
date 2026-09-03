import { ProjectObject } from '@/data/store';

export interface Project {
  key: string;
  title: string;
  locationId: string;
  locationTitle: string;
  objects: ProjectObject[];
}

export const sumBy = (list: ProjectObject[], fn: (o: ProjectObject) => number) =>
  list.reduce((s, o) => s + (fn(o) || 0), 0);

export const pct = (fact: number, plan: number) => {
  if (plan <= 0) return fact > 0 ? 100 : 0;
  return Math.round((fact / plan) * 100);
};

export const loadTone = (fact: number, plan: number) => {
  if (fact >= plan) return 'text-emerald-600';
  return pct(fact, plan) >= 50 ? 'text-accent' : 'text-destructive';
};

export const loadBar = (fact: number, plan: number) => {
  if (fact >= plan) return 'bg-emerald-600';
  return pct(fact, plan) >= 50 ? 'bg-accent' : 'bg-destructive';
};
