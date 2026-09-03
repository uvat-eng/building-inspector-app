import { ReactNode, useEffect, useState } from 'react';
import CabinetBar, { Crumb } from '@/components/desk/CabinetBar';
import DocsCabinet from '@/components/desk/DocsCabinet';
import ReportsCabinet from '@/components/desk/inspection/ReportsCabinet';
import InspectionsCabinet from '@/components/desk/inspection/InspectionsCabinet';
import OrdersCabinet from '@/components/desk/inspection/OrdersCabinet';
import ContractorCard from '@/components/desk/inspection/ContractorCard';
import FoldersCabinet from '@/components/desk/inspection/FoldersCabinet';
import ObjectMenuAlerts from '@/components/desk/inspection/ObjectMenuAlerts';
import useBackGuard from '@/hooks/use-back-guard';
import { ProjectObject } from '@/data/store';

export type ObjView =
  | 'menu'
  | 'docs'
  | 'contract'
  | 'reports'
  | 'inspections'
  | 'orders'
  | 'company'
  | 'tests'
  | 'ks'
  | 'incoming'
  | 'pos';

const OBJ_VIEW_TITLE: Record<ObjView, string> = {
  menu: 'Разделы объекта',
  docs: 'Документация',
  contract: 'Договор',
  reports: 'Отчёты',
  inspections: 'Проверки и выезды',
  orders: 'Предписания',
  company: 'Подрядчик',
  tests: 'Протоколы испытаний',
  ks: 'Акты КС',
  incoming: 'Входящие документы',
  pos: 'ПОС и ППР',
};

const OPENABLE = [
  'docs',
  'contract',
  'reports',
  'inspections',
  'orders',
  'company',
  'tests',
  'ks',
  'incoming',
  'pos',
];

interface ObjectRoutesProps {
  object: ProjectObject;
  crumbs: Crumb[];
  backLabel?: string;
  onBack: () => void;
  onExit?: () => void;
}

const ObjectRoutes = ({ object, crumbs, backLabel, onBack, onExit }: ObjectRoutesProps) => {
  const [objectView, setObjectView] = useState<ObjView>('menu');

  useEffect(() => {
    setObjectView('menu');
  }, [object.id]);

  useBackGuard(objectView !== 'menu', () => setObjectView('menu'));
  useBackGuard(objectView === 'menu', onBack);

  const bar = (
    <CabinetBar
      crumbs={[
        ...crumbs,
        { label: object.title, onClick: () => setObjectView('menu') },
        ...(objectView !== 'menu' ? [{ label: OBJ_VIEW_TITLE[objectView] }] : []),
      ]}
      backLabel={backLabel ?? 'К проекту'}
      onBack={objectView === 'menu' ? onBack : undefined}
      onExit={onExit}
    />
  );

  const wrap = (node: ReactNode) => (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      {bar}
      <div className="flex min-h-0 flex-1 flex-col">{node}</div>
    </div>
  );

  const toMenu = () => setObjectView('menu');

  if (objectView === 'docs' || objectView === 'contract') {
    return wrap(
      <DocsCabinet
        object={object}
        onBack={toMenu}
        only={objectView === 'contract' ? 'contract' : undefined}
      />,
    );
  }
  if (objectView === 'reports') {
    return wrap(<ReportsCabinet object={object} onBack={toMenu} />);
  }
  if (objectView === 'inspections') {
    return wrap(
      <InspectionsCabinet
        object={object}
        onBack={toMenu}
        onOrdersOpen={() => setObjectView('orders')}
      />,
    );
  }
  if (objectView === 'orders') {
    return wrap(<OrdersCabinet object={object} onBack={toMenu} />);
  }
  if (objectView === 'company') {
    return wrap(<ContractorCard object={object} onBack={toMenu} />);
  }
  if (objectView === 'tests' || objectView === 'ks' || objectView === 'incoming') {
    return wrap(<FoldersCabinet object={object} section={objectView} onBack={toMenu} />);
  }
  if (objectView === 'pos') {
    return wrap(
      <DocsCabinet
        object={object}
        onBack={toMenu}
        sections={['pos', 'ppr']}
        title="ПОС и ППР"
        hint="Загрузка вручную инспектором. Прикрепите сканы ПОС и ППР в формате PDF или фото."
      />,
    );
  }

  return wrap(
    <ObjectMenuAlerts
      object={object}
      onBack={onBack}
      onOpen={(id) => {
        if (OPENABLE.includes(id)) setObjectView(id as ObjView);
      }}
    />,
  );
};

export default ObjectRoutes;
