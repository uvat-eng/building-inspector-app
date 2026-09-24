import { Order, useContractor } from '@/data/orders';
import OrderView from '@/components/desk/inspection/OrderView';

interface OrderQuickViewProps {
  order: Order;
  onBack: () => void;
}

const OrderQuickView = ({ order, onBack }: OrderQuickViewProps) => {
  const { general } = useContractor(order.objectId);
  return <OrderView order={order} contractor={general} onBack={onBack} />;
};

export default OrderQuickView;
