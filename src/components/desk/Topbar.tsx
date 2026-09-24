const Topbar = () => (
  <div className="pt-safe flex h-[38px] flex-none items-center justify-between border-b border-border bg-card px-4 text-[0.8em] tracking-[0.02em] text-muted-foreground [height:calc(38px+env(safe-area-inset-top,0px))] sm:px-[22px]">
    <div className="truncate">
      <a href="tel:+73452901244" className="font-bold text-foreground transition-colors hover:text-accent">
        8 3452 90-12-44
      </a>
      <span className="inline-block w-3.5" />
      <a
        href="tel:+73452687049"
        className="hidden font-bold text-foreground transition-colors hover:text-accent sm:inline"
      >
        8 3452 68-70-49
      </a>
    </div>
    <div className="hidden text-[0.95em] uppercase tracking-[0.09em] md:block">
      ООО «Глобал-Стройинжиниринг» · Тюмень
    </div>
    <div className="text-[0.95em] uppercase tracking-[0.09em] md:hidden">Глобал-СИ</div>
  </div>
);

export default Topbar;