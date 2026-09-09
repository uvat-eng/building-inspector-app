const Privacy = () => (
  <div className="mx-auto max-w-2xl px-5 py-10 text-[0.92em] leading-relaxed text-foreground">
    <h1 className="font-head text-[24px] uppercase tracking-[0.02em]">
      Политика конфиденциальности
    </h1>
    <p className="mt-2 text-[0.82em] uppercase tracking-[0.12em] text-muted-foreground">
      ООО «Глобал-Стройинжиниринг»
    </p>

    <div className="mt-6 space-y-4 text-muted-foreground">
      <p>
        Настоящая Политика определяет порядок обработки персональных данных
        пользователей приложения «Инспектор СК» в соответствии с Федеральным
        законом № 152-ФЗ «О персональных данных».
      </p>

      <div>
        <h2 className="font-head text-[1.05em] uppercase tracking-[0.02em] text-foreground">
          1. Какие данные обрабатываются
        </h2>
        <p className="mt-1.5">
          Фамилия, имя, отчество, должность, контактный телефон, данные учётной
          записи, а также данные о рабочих перемещениях сотрудников (геопозиция,
          маршрут, пробег, время в движении и на простое) в рабочее время.
        </p>
      </div>

      <div>
        <h2 className="font-head text-[1.05em] uppercase tracking-[0.02em] text-foreground">
          2. Цели обработки
        </h2>
        <p className="mt-1.5">
          Организация и контроль производственной деятельности, учёт рабочего
          времени и перемещений, обеспечение безопасности сотрудников на линии,
          формирование отчётности.
        </p>
      </div>

      <div>
        <h2 className="font-head text-[1.05em] uppercase tracking-[0.02em] text-foreground">
          3. Геолокация
        </h2>
        <p className="mt-1.5">
          Данные о местоположении собираются, пока приложение открыто, и
          доступны исключительно руководству компании. Сбор осуществляется
          только после явного согласия сотрудника, выраженного при входе в
          приложение.
        </p>
      </div>

      <div>
        <h2 className="font-head text-[1.05em] uppercase tracking-[0.02em] text-foreground">
          4. Хранение и защита
        </h2>
        <p className="mt-1.5">
          Данные хранятся на защищённых серверах и не передаются третьим лицам,
          за исключением случаев, предусмотренных законодательством РФ.
        </p>
      </div>

      <div>
        <h2 className="font-head text-[1.05em] uppercase tracking-[0.02em] text-foreground">
          5. Права субъекта данных
        </h2>
        <p className="mt-1.5">
          Сотрудник вправе запросить сведения об обработке своих персональных
          данных, их уточнение или удаление, обратившись к работодателю.
        </p>
      </div>
    </div>

    <a
      href="/"
      className="mt-8 inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-[0.85em] uppercase tracking-[0.06em] transition-colors hover:border-accent hover:text-accent"
    >
      ← Вернуться в приложение
    </a>
  </div>
);

export default Privacy;
