import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ColumnDef {
  key: string;
  label: string;
  placeholder?: string;
  width?: string;
}

interface RowsEditorProps<T extends Record<string, string>> {
  title: string;
  columns: ColumnDef[];
  rows: T[];
  empty: T;
  addLabel: string;
  onChange: (rows: T[]) => void;
}

const RowsEditor = <T extends Record<string, string>>({
  title,
  columns,
  rows,
  empty,
  addLabel,
  onChange,
}: RowsEditorProps<T>) => {
  const patch = (i: number, key: string, value: string) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  return (
    <div className="rounded-sm border border-border">
      <p className="border-b border-border bg-secondary/50 px-3 py-2 font-head text-[0.78em] uppercase tracking-[0.1em]">
        {title}
      </p>

      <div className="space-y-2 p-2.5">
        {rows.length === 0 && (
          <p className="px-1 py-1 text-[0.8em] text-muted-foreground">Строк пока нет.</p>
        )}

        {rows.map((r, i) => (
          <div key={i} className="rounded-sm border border-border/70 p-2">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-sm bg-secondary font-head text-[0.7em]">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                className="ml-auto flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {columns.map((c) => (
                <div key={c.key} className={c.width === 'full' ? 'sm:col-span-2' : undefined}>
                  <Label className="text-[0.66em] uppercase tracking-[0.1em] text-muted-foreground">
                    {c.label}
                  </Label>
                  <Input
                    value={r[c.key] ?? ''}
                    onChange={(e) => patch(i, c.key, e.target.value)}
                    placeholder={c.placeholder}
                    className="mt-1 h-9 rounded-sm text-[0.86em]"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onChange([...rows, { ...empty }])}
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-input py-2 text-[0.82em] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <Icon name="Plus" size={15} />
          {addLabel}
        </button>
      </div>
    </div>
  );
};

export default RowsEditor;
