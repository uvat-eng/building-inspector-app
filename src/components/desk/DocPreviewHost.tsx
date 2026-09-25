import DocPreview from '@/components/desk/DocPreview';
import { useDocPreview, closeDoc } from '@/data/docPreview';

/** Одно окно просмотра документов на всё приложение. */
const DocPreviewHost = () => {
  const doc = useDocPreview();
  if (!doc) return null;
  return <DocPreview html={doc.html} title={doc.title} onClose={closeDoc} />;
};

export default DocPreviewHost;
