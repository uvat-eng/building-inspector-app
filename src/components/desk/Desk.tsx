import { useEffect, useRef, useState } from 'react';
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
import ManagerCabinet from '@/components/desk/sections/ManagerCabinet';
import ChiefCabinet from '@/components/desk/sections/ChiefCabinet';
import MechanicCabinet from '@/components/desk/sections/MechanicCabinet';
import DriverCabinet from '@/components/desk/sections/DriverCabinet';
import StaffSection from '@/components/desk/sections/StaffSection';
import ChangePassword from '@/components/desk/ChangePassword';
import AssetsSection from '@/components/desk/sections/AssetsSection';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SectionId, MENU } from '@/data/mock';
import { useProfile, ROLE_SECTIONS, ROLE_LABEL, Role } from '@/data/profile';
import { useModule } from '@/data/modules';
import { useScope } from '@/data/scope';
import ModulePicker from '@/components/desk/ModulePicker';
import ScopePicker from '@/components/desk/ScopePicker';
import ScopeCrumbs from '@/components/desk/ScopeCrumbs';
import { useUsers } from '@/data/users';
import { useToast } from '@/hooks/use-toast';
import useBackGuard from '@/hooks/use-back-guard';

const SECTION_KEY = 'gsi-section-v1';
const SCOPE_ENTERED = 'gsi-scope-entered-v1';

interface DeskProps {
  onLeaveScope: () => void;
  onLeaveModule: () => void;
}

const Desk = ({ onLeaveScope, onLeaveModule }: DeskProps) => {
  const [section, setSection] = useState<SectionId>(
    () => (localStorage.getItem(SECTION_KEY) as SectionId) || 'objects',
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [objectId, setObjectId] = useState<string | null>(null);
  const [objectEdit, setObjectEdit] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { profile, save, isAdmin, viewingAs } = useProfile();
  const { current, reload: reloadUsers } = useUsers();
  const { toast } = useToast();
  const { scope } = useScope();

  useEffect(() => {
    localStorage.setItem(SECTION_KEY, section);
  }, [section]);

  const [history, setHistory] = useState<SectionId[]>([]);
  const [leaveTo, setLeaveTo] = useState<SectionId | null>(null);
  const leaveOk = useRef(false);

  const confirmLeave = () => {
    if (!leaveTo) return;
    leaveOk.current = true;
    const target = leaveTo;
    setLeaveTo(null);
    select(target);
  };

  const select = (id: SectionId) => {
    if (current && !isAdmin && !ROLE_SECTIONS[profile.role].includes(id)) {
      toast({
        title: 'Раздел недоступен',
        description: `Для роли «${ROLE_LABEL[profile.role]}» этот раздел закрыт.`,
        variant: 'destructive',
      });
      return;
    }
    leaveOk.current = false;
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

  useBackGuard(!!objectId, closeObject);
  useBackGuard(!objectId && section !== 'objects', goBack);

  const canGoBack = !objectId && section !== 'objects' && section !== 'cabinet';
  const backLabel = history.length
    ? `Назад · ${MENU.find((m) => m.id === history[history.length - 1])?.label ?? 'Главная'}`
    : 'На главную';



  const content = {
    cabinet: profile.role === 'driver' ? (
      <DriverCabinet
        onExit={() => {
          leaveOk.current = true;
          select('objects');
        }}
      />
    ) : profile.role === 'mechanic' ? (
      <MechanicCabinet
        onExit={() => {
          leaveOk.current = true;
          select('objects');
        }}
      />
    ) : profile.role === 'engineer' ? (
      <ChiefCabinet
        onExit={() => {
          leaveOk.current = true;
          select('objects');
        }}
      />
    ) : ['admin', 'pm', 'coordinator', 'director', 'manager'].includes(profile.role) ? (
      <ManagerCabinet
        onExit={() => {
          leaveOk.current = true;
          select('objects');
        }}
      />
    ) : (
      <InspectorCabinet
        onExit={() => {
          leaveOk.current = true;
          select('objects');
        }}
      />
    ),
    staff: <StaffSection />,
    assets: <AssetsSection />,
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
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <div className="animate-rise">
        <Topbar />
      </div>
      <div className="animate-rise [animation-delay:0.05s]">
        <DeskHeader onLogin={() => setLoginOpen(true)} onMenu={() => setMenuOpen(true)} />
      </div>

      <div className="animate-rise [animation-delay:0.07s]">
        <ScopeCrumbs
          onLeaveModule={onLeaveModule}
          onLeaveScope={onLeaveScope}
          onCabinet={() => select('cabinet')}
        />
      </div>

      {viewingAs && (
        <div className="flex flex-none items-center gap-2 border-b border-accent bg-accent/10 px-4 py-2 text-[0.78em] uppercase tracking-[0.06em] sm:px-[22px]">
          <Icon name="ShieldUser" fallback="Shield" size={14} className="flex-none text-accent" />
          <span className="min-w-0 truncate">
            Администратор · вы смотрите как «{ROLE_LABEL[viewingAs]}»
          </span>
          <button
            type="button"
            onClick={() => save({ role: 'admin' })}
            className="ml-auto flex flex-none items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Icon name="RotateCcw" size={13} />
            Вернуть права
          </button>
        </div>
      )}

      <main className="grid flex-1 animate-rise items-start gap-3.5 px-4 pb-4 pt-3.5 [animation-delay:0.1s] sm:px-[22px] lg:grid-cols-[236px_1fr]">
        <SideMenu active={section} onSelect={select} className="hidden lg:sticky lg:top-3.5 lg:flex" />
        <div key={`${section}-${objectId ?? ''}`} className="flex animate-fade-in flex-col">
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

      <Dialog open={!!current && !current.password} onOpenChange={() => undefined}>
        <DialogContent
          className="max-w-md rounded-sm [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Задайте свой пароль
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Первый вход выполнен без пароля. Придумайте постоянный — дальше входить будете
              только с ним.
            </DialogDescription>
          </DialogHeader>
          {current && <ChangePassword user={current} onDone={reloadUsers} />}
        </DialogContent>
      </Dialog>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[260px] border-0 bg-card p-0">
          <SheetTitle className="sr-only">Разделы</SheetTitle>
          <SideMenu active={section} onSelect={select} className="h-full rounded-none" />
        </SheetContent>
      </Sheet>

      <Dialog open={!!leaveTo} onOpenChange={(v) => !v && setLeaveTo(null)}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Выйти из кабинета?
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Вы находитесь в кабинете инспектора. Перейти в раздел «
              {MENU.find((m) => m.id === leaveTo)?.label}»?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-sm" onClick={() => setLeaveTo(null)}>
              Остаться
            </Button>
            <Button
              className="flex-1 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              onClick={confirmLeave}
            >
              Выйти
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onEntered={(r) =>
          ['inspector', 'admin', 'pm', 'coordinator', 'manager', 'director'].includes(r) && select('cabinet')
        }
      />
    </div>
  );
};

const DeskRoot = () => {
  const { module, pick } = useModule();
  const { current } = useUsers();
  const { profile, save: saveProfile } = useProfile();

  useEffect(() => {
    if (!current) return;
    if (current.role === 'admin' && profile.baseRole !== 'admin') saveProfile({ baseRole: 'admin' });
    if (current.role !== 'admin' && profile.baseRole === 'admin') saveProfile({ baseRole: current.role });
  }, [current, profile.baseRole, saveProfile]);

  const { save: saveScope, clear: clearScope } = useScope();
  const [loginOpen, setLoginOpen] = useState(false);
  const [wantRole, setWantRole] = useState<Role | null>(null);
  const [adminLogin, setAdminLogin] = useState(false);
  const [inScope, setInScope] = useState(() => !!localStorage.getItem(SCOPE_ENTERED));

  useBackGuard(inScope, () => {
    localStorage.removeItem(SCOPE_ENTERED);
    setInScope(false);
  });

  const enterScope = (locationId: string, project: string) => {
    saveScope({ locationId, project });
    localStorage.setItem(SCOPE_ENTERED, '1');
    setInScope(true);
  };

  const leaveScope = () => {
    localStorage.removeItem(SCOPE_ENTERED);
    setInScope(false);
  };

  const leaveModule = () => {
    leaveScope();
    clearScope();
    pick(null);
  };

  if (!module)
    return (
      <>
        <ModulePicker onPick={pick} onAdmin={() => setAdminLogin(true)} />
        <LoginDialog
          open={adminLogin}
          onOpenChange={setAdminLogin}
          adminMode
          onEntered={() => pick('sk')}
        />
      </>
    );

  if (!inScope) {
    return (
      <>
        <ScopePicker
          onReady={enterScope}
          onBackToModules={leaveModule}
          onLogin={(r) => {
            setWantRole(r);
            setLoginOpen(true);
          }}
        />
        <LoginDialog
          open={loginOpen}
          onOpenChange={setLoginOpen}
          expectRole={wantRole}
          onEntered={() => {}}
        />
      </>
    );
  }

  return <Desk onLeaveScope={leaveScope} onLeaveModule={leaveModule} />;
};

export default DeskRoot;