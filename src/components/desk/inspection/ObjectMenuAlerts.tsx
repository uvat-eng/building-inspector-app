import ObjectMenu, { ObjectMenuId } from '@/components/desk/ObjectMenu';
import { ProjectObject } from '@/data/store';
import { collectAlerts, useReports } from '@/data/reports';

interface Props {
  object: ProjectObject;
  onBack: () => void;
  onOpen: (id: ObjectMenuId) => void;
}

const ObjectMenuAlerts = ({ object, onBack, onOpen }: Props) => {
  const { items } = useReports(object.id);
  const alerts = collectAlerts(items);

  return (
    <ObjectMenu
      object={object}
      onBack={onBack}
      onOpen={onOpen}
      badges={alerts.total > 0 ? { reports: alerts.total } : undefined}
    />
  );
};

export default ObjectMenuAlerts;
