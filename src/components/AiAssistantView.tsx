import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  MapPin, 
  PlusCircle, 
  Map, 
  ShieldCheck, 
  Volume2,
  Mic,
  MicOff,
  X,
  AlertTriangle
} from 'lucide-react';
import { CivicReport, CivicChatHistoryItem } from '../types';
import { useLanguage } from '../lib/LanguageContext';

interface AiAssistantProps {
  reports: CivicReport[];
  onNavigateTab: (tab: string) => void;
  onHighlightReportId: (id: string) => void;
  onClose?: () => void;
}

export default function AiAssistantView({ reports, onNavigateTab, onHighlightReportId, onClose }: AiAssistantProps) {
  const { language, isSimpleMode, t, speakText } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recognitionError, setRecognitionError] = useState('');
  const recognitionRef = useRef<any>(null);

  // Initialize native browser speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      // Match with active app language
      rec.lang = 
        language === 'hi' ? 'hi-IN' :
        language === 'ta' ? 'ta-IN' :
        language === 'te' ? 'te-IN' :
        language === 'kn' ? 'kn-IN' :
        language === 'mr' ? 'mr-IN' : 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        setRecognitionError('');
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInputText(prev => (prev ? prev + " " + text : text));
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error in AI Assistant", event);
        setRecognitionError(language === 'hi' ? "स्पष्ट सुनाई नहीं दिया, कृपया पुनः प्रयास करें।" : "Could not hear clearly. Please try again.");
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, [language]);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      setRecognitionError(language === 'hi' ? "इस उपकरण पर ध्वनि भाषण समर्थित नहीं है।" : "Voice speech is not supported on this device.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      speakText(language === 'hi' ? "मैं सुन रहा हूँ। कृपया स्पष्ट बोलें।" : "Listening now. Please speak clearly.");
      recognitionRef.current.start();
    }
  };
  
  // Localized welcome message
  const getWelcomeMessage = () => {
    if (language === 'hi') {
      return "नमस्ते! मैं आपका सहायता बॉट हूँ। आप मुझसे अपने क्षेत्र की समस्याओं के बारे में प्रश्न पूछ सकते हैं, जैसे:\n\n• *'सड़क की समस्याओं की सूची दिखाएं'*\n• *'कौन सी शिकायतें हल हो गई हैं?'*";
    }
    if (language === 'ta') {
      return "வணக்கம்! நான் உங்கள் உதவிப்பொறி. நமது பகுதியில் உள்ள பிரச்சனைகள் பற்றி நீங்கள் என்னிடம் கேட்கலாம்:\n\n• *'பூங்காவில் என்ன பிரச்சனை?'*\n• *'தீர்க்கப்பட்ட பிரச்சனைகளை காட்டு'*\n• *'தண்ணீர் கசிவு புகார் எங்குள்ளது?'*";
    }
    if (language === 'te') {
      return "నమస్కారం! నేను మీ డిజిటల్ సహాయకుడిని. మన ప్రాంతంలో ఉన్న సమస్యల గురించి మీరు నన్ను అడగవచ్చు:\n\n• *'పార్క్ దగ్గర ఏ సమస్య ఉంది?'*\n• *'పరిష్కరించబడిన సమస్యలను చూపించు'*\n• *'నీటి లీకేజీ ఫిర్యాదు ఎక్కడ ఉంది?'*";
    }
    if (language === 'kn') {
      return "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಸಹಾಯಕಿ. ನಮ್ಮ ಪ್ರದೇಶದಲ್ಲಿ ದಾಖಲಾದ ಸಮಸ್ಯೆಗಳ ಬಗ್ಗೆ ನೀವು ನನ್ನನ್ನು ಕೇಳಬಹುದು:\n\n• *'ಪಾರ್ಕ್ ಹತ್ತಿರ ಏನು ಸಮಸ್ಯೆಯಿದೆ?'*\n• *'ಪರಿಹರಿಸಲಾದ ಸಮಸ್ಯೆಗಳನ್ನು ತೋರಿಸಿ'*\n• *'ನೀರು ಸೋರಿಕೆಯಾಗುತ್ತಿರುವ ದೂರು ಎಲ್ಲಿದೆ?'*";
    }
    if (language === 'mr') {
      return "नमस्कार! मी आपला डिजिटल सहाय्यक आहे. आपल्या भागातील समस्यांबद्दल आपण मला विचारू शकता:\n\n• *'बागेजवळ काय समस्या आहे?'*\n• *'सुटलेल्या समस्या दाखवा'*\n• *'पाणी गळतीची तक्रार कुठे आहे?'*";
    }
    return "Hello! I am Sahayata Bot, your Swachhtam AI assistant. Ask me questions about local issues, like:\n\n• *'Show me list of active road problems.'*\n• *'Which complaints are solved?'*\n• *'How can I help with garbage issues?'*";
  };

  const [chatHistory, setChatHistory] = useState<CivicChatHistoryItem[]>([]);

  // Set initial greeting
  useEffect(() => {
    setChatHistory([
      {
        sender: 'bot',
        text: getWelcomeMessage(),
        timestamp: Date.now()
      }
    ]);
  }, [language]);

  const endOfChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsgText = inputText;
    setInputText('');
    setLoading(true);

    // 1. Add User message
    setChatHistory(prev => [
      ...prev,
      { sender: 'user', text: userMsgText, timestamp: Date.now() }
    ]);

    try {
      // 2. Fetch Gemini chat
      const res = await fetch("/api/chat-civic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          history: chatHistory,
          currentReports: reports,
          languageCode: language
        })
      });

      if (!res.ok) {
        throw new Error("Chat sequence failed on backend.");
      }

      const parsed = await res.json();
      const botReply = parsed.text || "I have received your request but need you to clarify.";

      // 3. Add bot reply
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'bot',
          text: botReply,
          timestamp: Date.now(),
          suggestedAction: parsed.suggestedAction || null
        }
      ]);

      // Speak text in Easy Mode automatically
      if (isSimpleMode) {
        speakText(botReply);
      }

    } catch (err) {
      console.error(err);
      const fallbackReply = `There are ${reports.length} problems reported currently. Would you like to check the area status map or report a new problem?`;
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'bot',
          text: fallbackReply,
          timestamp: Date.now()
        }
      ]);
      if (isSimpleMode) speakText(fallbackReply);
    } finally {
      setLoading(false);
    }
  };

  // Simple clean formatting
  const formatTextWithMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let refined = line;
      
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIdx = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIdx) {
          parts.push(line.substring(lastIdx, match.index));
        }
        parts.push(<strong key={match.index} className="font-extrabold text-white">{match[1]}</strong>);
        lastIdx = boldRegex.lastIndex;
      }
      if (lastIdx < line.length) {
        parts.push(line.substring(lastIdx));
      }

      const isBullet = line.startsWith('•') || line.trim().startsWith('*');
      const cleanLine = isBullet ? line.replace(/^[•*]\s*/, '') : (parts.length > 0 ? parts : refined);

      if (isBullet) {
        return (
          <li key={idx} className={`ml-4 list-disc text-slate-300 pl-1 leading-relaxed ${isSimpleMode ? 'text-base font-bold' : 'text-xs'}`}>
            {parts.length > 0 ? parts : cleanLine}
          </li>
        );
      }

      return (
        <p key={idx} className={`text-slate-200 leading-relaxed ${isSimpleMode ? 'text-base font-bold pb-2' : 'text-xs pb-1'} ${line.trim() === "" ? "h-2" : ""}`}>
          {parts.length > 0 ? parts : refined}
        </p>
      );
    });
  };

  const handleActionClick = (action: { type: string, payload?: string }) => {
    if (action.type === 'report_issue') {
      onNavigateTab('report');
    } else if (action.type === 'view_map') {
      onNavigateTab('map');
    } else if (action.type === 'view_report' && action.payload) {
      onHighlightReportId(action.payload);
      onNavigateTab('map');
    }
  };

  return (
    <div className={onClose 
      ? "h-full w-full flex flex-col bg-[#0c1017] text-slate-100" 
      : `max-w-4xl mx-auto h-[82vh] flex flex-col bg-[#0c1017] border-2 border-slate-800 rounded-3xl overflow-hidden text-slate-100 shadow-2xl ${isSimpleMode ? 'px-1' : ''}`
    }>
      
      {/* Bot Chat Header */}
      <div className="bg-[#05070a] border-b-2 border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 text-left">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Bot className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className={`block font-black text-white flex items-center ${isSimpleMode ? 'text-lg' : 'text-sm'}`}>
              {t('chatbot')}
            </span>
            <span className={`block text-slate-500 ${isSimpleMode ? 'text-sm font-semibold' : 'text-[10px]'}`}>
              {language === 'en' ? "Here to answer neighborhood questions" : "यहाँ सहायता के लिए हूँ"}
            </span>
          </div>
        </div>

        {/* Global Speak Assistance instructions */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => speakText(t('howCanWeHelp'))}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1 text-xs font-black"
          >
            <Volume2 className="w-4 h-4 animate-bounce" />
            {isSimpleMode && <span>सहायता</span>}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Close Chatbot / चैट बंद करें"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages Frame Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.map((h, hIdx) => {
          const isBot = h.sender === 'bot';
          return (
            <div 
              key={hIdx} 
              id={`chat-bubble-${hIdx}`}
              className={`flex items-start space-x-3 max-w-[90%] ${isBot ? 'mr-auto text-left' : 'ml-auto flex-row-reverse space-x-reverse text-left'}`}
            >
              {/* avatar */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 border-2 ${
                isBot 
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-400' 
                  : 'bg-slate-900 text-emerald-400 border-slate-800'
              }`}>
                {isBot ? <Bot className="w-4 h-4 text-emerald-400" /> : <User className="w-4 h-4 text-emerald-500" />}
              </div>

              {/* textual bubble details */}
              <div className="space-y-2.5 text-left">
                <div className={`p-4 rounded-3xl border-2 shadow-md ${
                  isBot 
                    ? 'bg-[#111621] border-slate-800 rounded-tl-sm text-left' 
                    : 'bg-emerald-500 border-emerald-400 text-slate-950 rounded-tr-sm'
                }`}>
                  {isBot ? (
                    <div className="space-y-1.5 text-left">{formatTextWithMarkdown(h.text)}</div>
                  ) : (
                    <p className={`font-black leading-relaxed text-left ${isSimpleMode ? 'text-base text-slate-950' : 'text-xs text-slate-950'}`}>{h.text}</p>
                  )}
                </div>

                {/* Read aloud bubble speaker button */}
                {isBot && (
                  <button
                    onClick={() => speakText(h.text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs hover:text-white font-bold"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen / सुनें</span>
                  </button>
                )}

                {/* suggestedAction click banner */}
                {isBot && h.suggestedAction && (
                  <button
                    id={`btn-chat-action-${hIdx}`}
                    onClick={() => handleActionClick(h.suggestedAction!)}
                    className="flex items-center space-x-2 p-2.5 rounded-2xl border-2 border-emerald-500/30 bg-[#111a26] text-xs font-black text-emerald-400 uppercase tracking-wide transition-all"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      {h.suggestedAction.type === 'view_report' ? 'Check Specific Issue' : 'Go to Tab'}
                    </span>
                  </button>
                )}
              </div>

            </div>
          );
        })}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex items-start space-x-3 mr-auto max-w-[80%] text-left" id="chat-loading-bubble">
            <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 text-slate-400" />
            </div>
            <div className="p-4 rounded-3xl bg-[#111621] border-2 border-slate-800 flex items-center space-x-2 text-sm font-bold text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Analyzing problem details...</span>
            </div>
          </div>
        )}

        <div ref={endOfChatRef} />
      </div>

      {recognitionError && (
        <div className="px-4 py-2 bg-rose-950/40 border-t border-rose-900 text-rose-400 text-xs font-bold text-left animate-fade-in flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          <span>{recognitionError}</span>
        </div>
      )}

      {/* Form Input fields */}
      <form onSubmit={handleSubmit} className="p-4 border-t-2 border-slate-800 bg-[#060a12] flex gap-2 z-10 w-full items-center">
        <input
          type="text"
          id="chat-input-text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isRecording 
              ? (language === 'hi' ? 'सुन रहा हूँ... बोलना जारी रखें' : 'Listening... Speak now') 
              : (language === 'hi' ? "प्रश्न पूछें... जैसे: गड्घा कहाँ है?" : "Ask a question about local issues...")
          }
          className={`flex-grow px-4 py-4 bg-[#111621] border-2 border-slate-800 rounded-2xl focus:outline-none focus:border-emerald-500 text-slate-100 placeholder-slate-500 font-bold ${
            isSimpleMode ? 'text-base' : 'text-xs'
          } ${isRecording ? 'border-emerald-500 shadow-inner' : ''}`}
        />

        <button
          id="btn-chat-mic"
          type="button"
          onClick={toggleVoiceRecording}
          className={`p-4 rounded-2xl border-2 font-extrabold flex items-center justify-center transition-all cursor-pointer ${
            isRecording 
              ? 'bg-rose-600 border-rose-500 text-white animate-pulse' 
              : 'bg-[#111621] hover:bg-[#182030] border-slate-800 text-emerald-400'
          }`}
          title="Speak your question / बोलकर पूछें"
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          id="btn-chat-send"
          type="submit"
          disabled={isRecording}
          className="px-5 py-4 rounded-2xl text-slate-950 bg-emerald-500 hover:bg-emerald-400 font-extrabold disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

    </div>
  );
}
