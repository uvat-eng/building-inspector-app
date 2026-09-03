import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechResultItem {
  transcript: string;
}

interface SpeechResult {
  isFinal: boolean;
  0: SpeechResultItem;
}

interface SpeechEvent {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechResult };
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => Recognition;

const getCtor = (): RecognitionCtor | null => {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const speechSupported = () => !!getCtor();

export const useSpeech = (onText: (chunk: string) => void) => {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const ref = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  const stop = useCallback(() => {
    ref.current?.stop();
    ref.current = null;
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError('Браузер не поддерживает распознавание речи');
      return;
    }
    setError('');
    const rec = new Ctor();
    rec.lang = 'ru-RU';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) cb.current(r[0].transcript);
        else live += r[0].transcript;
      }
      setInterim(live);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
        setError('Нет доступа к микрофону — разрешите его в браузере');
      else if (e.error === 'no-speech') setError('');
      else setError('Микрофон недоступен');
    };
    rec.onend = () => {
      if (ref.current === rec) {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      }
    };

    ref.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError('Не удалось включить микрофон');
    }
  }, []);

  useEffect(() => () => {
    ref.current = null;
  }, []);

  return { listening, interim, error, start, stop, supported: speechSupported() };
};
