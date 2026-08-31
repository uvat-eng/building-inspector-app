import { useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { queuePhoto, flushQueue, isWifi } from '@/data/photoQueue';

interface PhotoButtonProps {
  inspectionId: string;
  defectId: string;
  count: number;
  onDone: () => void;
}

const PhotoButton = ({ inspectionId, defectId, count, onDone }: PhotoButtonProps) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        await queuePhoto(inspectionId, defectId, f);
      }
      onDone();
      toast({
        title: `Снимков сохранено: ${files.length}`,
        description: isWifi()
          ? 'Отправляем на сервер…'
          : 'Выгрузим автоматически при подключении к Wi-Fi.',
      });
      if (isWifi()) flushQueue().then(onDone).catch(() => undefined);
    } catch {
      toast({ title: 'Не удалось сохранить фото', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex h-9 min-w-[52px] flex-none items-center justify-center gap-1 rounded-sm px-2 text-[0.78em] transition-colors',
          count ? 'bg-accent text-accent-foreground' : 'bg-secondary hover:bg-border',
        )}
      >
        <Icon
          name={busy ? 'Loader2' : 'Camera'}
          size={15}
          className={busy ? 'animate-spin' : ''}
        />
        {count > 0 && count}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => onPick(e.target.files)}
      />
    </>
  );
};

export default PhotoButton;
