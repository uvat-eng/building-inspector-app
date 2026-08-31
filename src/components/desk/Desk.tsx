import { useState } from 'react';
import Topbar from '@/components/desk/Topbar';
import DeskHeader from '@/components/desk/DeskHeader';
import SideMenu from '@/components/desk/SideMenu';
import ObjectsSection from '@/components/desk/sections/ObjectsSection';
import SitesSection from '@/components/desk/sections/SitesSection';
import ObjectPage from '@/components/desk/ObjectPage';
import InspectionsSection from '@/components/desk/sections/InspectionsSection';
import DefectsSection from '@/components/desk/sections/DefectsSection';
import PhotosSection from '@/components/desk/sections/PhotosSection';
import DocumentsSection from '@/components/desk/sections/DocumentsSection';
import ReportsSection from '@/components/desk/sections/ReportsSection';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { SectionId } from '@/data/mock';

const Desk = () => {
  const [section, setSection] = useState<SectionId>('objects');
  const [menuOpen, setMenuOpen] = useState(false);
  const [objectId, setObjectId] = useState<string | null>(null);
  const [objectEdit, setObjectEdit] = useState(false);
  const { toast } = useToast();

  const select = (id: SectionId) => {
    setSection(id);
    setObjectId(null);
    setObjectEdit(false);
    setMenuOpen(false);
  };

  const openObject = (id: string, edit = false) => {
    setObjectId(id);
    setObjectEdit(edit);
    setSection('sites');
  };

  const closeObject = () => {
    setObjectId(null);
    setObjectEdit(false);
  };

  const start = () => {
    setSection('defects');
    toast({
      title: 'Проверка начата',
      description: 'Время фиксируется в табеле, микрофон готов к диктовке замечания.',
    });
  };

  const content = {
    objects: <ObjectsSection onOpenObject={openObject} />,
    sites: objectId ? (
      <ObjectPage id={objectId} editOnOpen={objectEdit} onBack={closeObject} />
    ) : (
      <SitesSection onOpen={(id) => id && openObject(id)} />
    ),
    inspections: <InspectionsSection />,
    defects: <DefectsSection />,
    photos: <PhotosSection />,
    documents: <DocumentsSection />,
    reports: <ReportsSection />,
  }[section];

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <div className="animate-rise">
        <Topbar />
      </div>
      <div className="animate-rise [animation-delay:0.05s]">
        <DeskHeader onStart={start} onMenu={() => setMenuOpen(true)} />
      </div>

      <main className="grid min-h-0 flex-1 animate-rise gap-3.5 px-4 pb-4 pt-3.5 [animation-delay:0.1s] sm:px-[22px] lg:grid-cols-[236px_1fr]">
        <SideMenu active={section} onSelect={select} className="hidden lg:flex" />
        <div key={`${section}-${objectId ?? ''}`} className="flex min-h-0 animate-fade-in flex-col">
          {content}
        </div>
      </main>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[260px] border-0 bg-deep p-0">
          <SheetTitle className="sr-only">Разделы</SheetTitle>
          <SideMenu active={section} onSelect={select} className="h-full rounded-none" />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Desk;