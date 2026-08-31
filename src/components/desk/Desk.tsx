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
import LoginDialog from '@/components/desk/LoginDialog';
import InspectorCabinet from '@/components/desk/sections/InspectorCabinet';
import Icon from '@/components/ui/icon';
import { SectionId, MENU } from '@/data/mock';

const Desk = () => {
  const [section, setSection] = useState<SectionId>('objects');
  const [menuOpen, setMenuOpen] = useState(false);
  const [objectId, setObjectId] = useState<string | null>(null);
  const [objectEdit, setObjectEdit] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const [history, setHistory] = useState<SectionId[]>([]);

  const select = (id: SectionId) => {
    if (id !== section) setHistory((h) => [...h, section]);
    setSection(id);
    setObjectId(null);
    setObjectEdit(false);
    setMenuOpen(false);
  };

  const openObject = (id: string, edit = false) => {
    setObjectId(id);
    setObjectEdit(edit);
    if (section !== 'sites') setHistory((h) => [...h, section]);
    setSection('sites');
  };

  const closeObject = () => {
    setObjectId(null);
    setObjectEdit(false);
  };

  const goBack = () => {
    if (objectId) {
      closeObject();
      return;
    }
    setHistory((h) => {
      if (!h.length) {
        setSection('objects');
        return h;
      }
      setSection(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };

  const canGoBack = !objectId && section !== 'objects';
  const backLabel = history.length
    ? `Назад · ${MENU.find((m) => m.id === history[history.length - 1])?.label ?? 'Главная'}`
    : 'На главную';



  const content = {
    cabinet: <InspectorCabinet onNavigate={select} />,
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
        <DeskHeader onLogin={() => setLoginOpen(true)} onMenu={() => setMenuOpen(true)} />
      </div>

      <main className="grid min-h-0 flex-1 animate-rise gap-3.5 px-4 pb-4 pt-3.5 [animation-delay:0.1s] sm:px-[22px] lg:grid-cols-[236px_1fr]">
        <SideMenu active={section} onSelect={select} className="hidden lg:flex" />
        <div key={`${section}-${objectId ?? ''}`} className="flex min-h-0 animate-fade-in flex-col">
          {canGoBack && (
            <div className="mb-2.5 flex flex-none items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-[0.82em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
              >
                <Icon name="ArrowLeft" size={15} className="text-accent" />
                {backLabel}
              </button>
              <span className="truncate font-head text-[0.82em] uppercase tracking-[0.1em] text-muted-foreground">
                {MENU.find((m) => m.id === section)?.short}
              </span>
            </div>
          )}
          {content}
        </div>
      </main>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[260px] border-0 bg-card p-0">
          <SheetTitle className="sr-only">Разделы</SheetTitle>
          <SideMenu active={section} onSelect={select} className="h-full rounded-none" />
        </SheetContent>
      </Sheet>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onEntered={(r) => r === 'inspector' && select('cabinet')}
      />
    </div>
  );
};

export default Desk;