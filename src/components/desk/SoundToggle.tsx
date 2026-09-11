import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { isSfxEnabled, playSfx, setSfxEnabled } from '@/lib/sfx';

/** Переключатель звуков интерфейса. Выбор запоминается на устройстве. */
const SoundToggle = () => {
  const [on, setOn] = useState(isSfxEnabled);

  const toggle = () => {
    const next = !on;
    setSfxEnabled(next);
    setOn(next);
    if (next) playSfx('success');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? 'Выключить звуки' : 'Включить звуки'}
      title={on ? 'Звуки включены' : 'Звуки выключены'}
      className={`flex h-10 w-10 flex-none items-center justify-center rounded-sm transition-colors hover:bg-secondary ${
        on ? 'text-accent' : 'text-muted-foreground'
      }`}
    >
      <Icon name={on ? 'Volume2' : 'VolumeX'} size={19} />
    </button>
  );
};

export default SoundToggle;
