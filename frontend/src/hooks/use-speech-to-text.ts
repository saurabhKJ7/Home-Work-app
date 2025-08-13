import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UseSpeechToTextOptions = {
  language?: string; // e.g., 'en-US'
  interimResults?: boolean;
  continuous?: boolean;
};

type UseSpeechToTextReturn = {
  isSupported: boolean;
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  language: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  setLanguage: (lang: string) => void;
};

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const { language = 'en-US', interimResults = true, continuous = false } = options;

  const recognitionRef = useRef<any | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lang, setLang] = useState(language);

  const SpeechRecognitionCtor = useMemo(() => {
    const w = window as any;
    return (w.SpeechRecognition || w.webkitSpeechRecognition || null);
  }, []);

  const isSupported = !!SpeechRecognitionCtor;

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const stop = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      }
    } catch {}
    setIsRecording(false);
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionCtor || isRecording) return;
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = lang;
      recognition.interimResults = interimResults;
      recognition.continuous = continuous;

      recognition.onresult = (event: any) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript ?? '';
          if (res.isFinal) finalText += text;
          else interimText += text;
        }
        if (finalText) setTranscript(prev => (prev ? prev + ' ' : '') + finalText.trim());
        setInterimTranscript(interimText.trim());
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      setIsRecording(true);
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  }, [SpeechRecognitionCtor, continuous, interimResults, isRecording, lang]);

  useEffect(() => () => {
    // cleanup on unmount
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch {}
  }, []);

  return {
    isSupported,
    isRecording,
    transcript,
    interimTranscript,
    language: lang,
    start,
    stop,
    reset,
    setLanguage: setLang,
  };
}

export default useSpeechToText;


