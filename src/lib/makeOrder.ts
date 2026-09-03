import { Inspection, suggestNorms } from '@/data/inspections';
import { Order } from '@/data/orders';
import { ProjectObject } from '@/data/store';

const INSPECTIONS_API = 'https://functions.poehali.dev/26fd0e42-bb64-4022-acb0-097508981039';

interface DefectLite {
  id: string;
  pos: number;
  title: string;
  normRef?: string;
  deadline?: string;
  photos: string[];
}

export const orderPayload = async (
  insp: Inspection,
  objectTitle: string,
  inspectorFallback: string,
  issuedToFallback = '',
  object?: ProjectObject | null,
) => {
  const res = await fetch(`${INSPECTIONS_API}?id=${encodeURIComponent(insp.id)}`);
  const { defects } = (await res.json()) as { defects: DefectLite[] };

  const empty = defects.filter((d) => !d.normRef?.trim());
  if (empty.length) {
    try {
      const found = await suggestNorms(
        empty.map((d) => d.title),
        true,
      );
      await Promise.all(
        empty.map(async (d, k) => {
          const m = found[k];
          if (!m?.ref) return;
          d.normRef = `${m.ref} — ${m.name}`;
          await fetch(`${INSPECTIONS_API}?action=defect`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'defect', id: d.id, normRef: d.normRef }),
          });
        }),
      );
    } catch {
      /* без ссылок предписание всё равно оформим */
    }
  }

  const deadline =
    defects
      .map((d) => d.deadline || '')
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(a.split('.').reverse().join('-')).getTime() -
          new Date(b.split('.').reverse().join('-')).getTime(),
      )[0] ?? '';

  const data: Partial<Order> & { objectId: string } = {
    objectId: insp.objectId,
    inspectionId: insp.id,
    issuedTo: insp.subcontractor || insp.generalContractor || issuedToFallback,
    inspector: insp.inspector || inspectorFallback,
    deadline,
    body: {
      workType: insp.workType,
      docRef: insp.docRef,
      contractorRep: insp.contractorRep,
      generalContractor: insp.generalContractor,
      subcontractor: insp.subcontractor,
      objectTitle,
      objectCode: object?.contractNo || '',
      inspectionOrg: 'ООО «ГЛОБАЛ-Стройинжиниринг»',
      contractNo: object?.contractNo || '',
      customerName: object?.customer || '',
      time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }),
      items: defects.map((d) => ({
        pos: d.pos,
        title: d.title,
        normRef: d.normRef ?? '',
        deadline: d.deadline ?? '',
        photos: d.photos,
      })),
    },
  };

  return { data, count: defects.length };
};
