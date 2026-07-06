import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTranslation, SUPPORTED_LANGUAGES } from './translations';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  isSimpleMode: boolean;
  setIsSimpleMode: (mode: boolean) => void;
  t: (key: string) => string;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  startListening: (onResult: (text: string) => void, onError?: (err: string) => void) => void;
  stopListening: () => void;
  isListening: boolean;
  showLanguageIntro: boolean;
  setShowLanguageIntro: (show: boolean) => void;
  translateDynamicText: (text: string) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Read initial language and simple mode from localStorage if available
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem('civic_lang') || '';
  });
  const [isSimpleMode, setIsSimpleModeState] = useState<boolean>(() => {
    return localStorage.getItem('civic_simple_mode') === 'true';
  });
  const [showLanguageIntro, setShowLanguageIntro] = useState<boolean>(!localStorage.getItem('civic_lang'));

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('civic_lang', lang);
    setShowLanguageIntro(false);
  }, []);

  const setIsSimpleMode = useCallback((mode: boolean) => {
    setIsSimpleModeState(mode);
    localStorage.setItem('civic_simple_mode', String(mode));
    
    // Voice guidance when toggled
    if (mode) {
      setTimeout(() => {
        speakText("Simple Mode turned on. Big buttons, clear writing, and voice helper are now ready.");
      }, 500);
    } else {
      stopSpeaking();
    }
  }, []);

  const t = useCallback((key: string): string => {
    const activeLang = language || 'en';
    return getTranslation(key, activeLang);
  }, [language]);

  // Voice Speaking Feature (Text-to-Speech)
  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn("Speech synthesis not supported in this browser.");
      return;
    }

    // Cancel active speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (!text) return;

    // Remove markdown symbols to read cleanly
    const cleanText = text
      .replace(/[\*\#\_]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Match language code
    const langCode = language || 'en';
    const langMap: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      kn: 'kn-IN',
      mr: 'mr-IN'
    };
    utterance.lang = langMap[langCode] || 'en-IN';
    
    // Adjust rate for senior citizens/simple mode
    utterance.rate = isSimpleMode ? 0.85 : 0.95;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [language, isSimpleMode]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Voice Listening Feature (Speech-to-Text)
  const startListening = useCallback((onResult: (text: string) => void, onError?: (err: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      if (onError) onError("Voice search not supported in this web browser. Please type your message.");
      return;
    }

    // Stop existing active recognition
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (_) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;

    // Match language locale
    const langCode = language || 'en';
    const langMap: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      kn: 'kn-IN',
      mr: 'mr-IN'
    };
    rec.lang = langMap[langCode] || 'en-IN';

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      onResult(resultText);
      setIsListening(false);
    };

    rec.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      if (onError) onError(event.error || "Could not hear clearly");
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    try {
      rec.start();
      setRecognitionInstance(rec);
    } catch (e: any) {
      console.error("Failed to start speech recognition:", e);
      if (onError) onError(String(e.message || e));
    }
  }, [language, recognitionInstance]);

  const stopListening = useCallback(() => {
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (_) {}
    }
    setIsListening(false);
  }, [recognitionInstance]);

  // Dynamic Translation via Gemini server endpoint
  const translateDynamicText = useCallback(async (text: string): Promise<string> => {
    const targetLang = language || 'en';
    if (targetLang === 'en' || !text) return text;
    
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang })
      });
      const data = await res.json();
      return data.translatedText || text;
    } catch (e) {
      console.error("Dynamic translation failed:", e);
      return text;
    }
  }, [language]);

  // Read instructions out loud if Simple Mode is turned on and language was changed
  useEffect(() => {
    if (isSimpleMode && language) {
      const welcomeMsg = t('welcome') + ". " + t('simpleModeTip') + " " + t('howCanWeHelp');
      speakText(welcomeMsg);
    }
  }, [language, isSimpleMode]);

  return (
    <LanguageContext.Provider value={{
      language: language || 'en',
      setLanguage,
      isSimpleMode,
      setIsSimpleMode,
      t,
      speakText,
      stopSpeaking,
      isSpeaking,
      startListening,
      stopListening,
      isListening,
      showLanguageIntro,
      setShowLanguageIntro,
      translateDynamicText
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
