import { useState, useEffect, useCallback, useRef } from "react";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const languageMap: Record<string, string> = {
  'en': 'en-US',
  'hi': 'hi-IN',
  'te': 'te-IN',
};

interface SpeechRecognitionHook {
  isTranscribing: boolean;
  currentTranscript: string;
  finalTranscript: string;
  startListening: (lang?: string) => void;
  stopListening: () => void;
  hasRecognitionSupport: boolean;
}

export default function useSpeechRecognition(): SpeechRecognitionHook {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>('en-US');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setHasRecognitionSupport(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = currentLanguage;

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        setCurrentTranscript(interim);
        if (final.trim()) {
          setFinalTranscript(prev => prev + ' ' + final.trim());
        }
        console.log('SpeechRecognition onresult: interim=', interim, 'final=', final);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsTranscribing(false);
        if (event.error === 'no-speech') {
          // Allow recognition to continue for no-speech errors
          setCurrentTranscript('');
        } else {
          // Stop recognition for other errors (e.g., not-allowed, aborted)
          recognition.stop();
        }
      };

      recognition.onend = () => {
        console.log('SpeechRecognition ended');
        setIsTranscribing(false);
      };

      recognitionRef.current = recognition;
    } else {
      setHasRecognitionSupport(false);
      console.warn('SpeechRecognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current = null;
      }
    };
  }, [currentLanguage]);

  const startListening = useCallback((lang?: string) => {
    if (!recognitionRef.current || isTranscribing) {
      console.log('startListening skipped: no recognition instance or already transcribing');
      return;
    }

    const bcp47Lang = languageMap[lang || 'en'] || 'en-US';
    if (bcp47Lang !== currentLanguage) {
      setCurrentLanguage(bcp47Lang);
      recognitionRef.current.lang = bcp47Lang;
    }

    setCurrentTranscript("");
    setFinalTranscript("");
    try {
      recognitionRef.current.start();
      setIsTranscribing(true);
      console.log('SpeechRecognition started, language:', bcp47Lang);
    } catch (error) {
      console.error("SpeechRecognition start error:", error);
      setIsTranscribing(false);
    }
  }, [currentLanguage, isTranscribing]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isTranscribing) {
      console.log('stopListening skipped: no recognition instance or not transcribing');
      return;
    }

    try {
      recognitionRef.current.stop();
      setIsTranscribing(false);
      console.log('SpeechRecognition stopped');
    } catch (error) {
      console.error("SpeechRecognition stop error:", error);
      setIsTranscribing(false);
    }
  }, [isTranscribing]);

  return {
    isTranscribing,
    currentTranscript,
    finalTranscript,
    startListening,
    stopListening,
    hasRecognitionSupport
  };
}