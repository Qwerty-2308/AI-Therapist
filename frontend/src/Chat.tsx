import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onsoundend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onstart: (() => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatProps {
  onBackToHome: () => void;
  username: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const Chat: React.FC<ChatProps> = ({ onBackToHome, username }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello ${username || 'there'}! I'm here to listen. How are you feeling today?`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      recognitionRef.current = new SpeechRecognitionCtor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result: SpeechRecognitionResult) => result[0].transcript)
          .join('');
        
        if (event.results[0].isFinal) {
          setInputValue(prev => prev + transcript);
        }
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
    };
  }, []);

  const speakText = useCallback((text: string) => {
    if (!voiceOutputEnabled || !synthRef.current) return;

    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, [voiceOutputEnabled]);

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setVoiceInputEnabled(true);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      });

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || "I'm here for you. Would you like to tell me more about what you're feeling?",
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      if (voiceOutputEnabled) {
        speakText(aiMessage.content);
      }
    } catch {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm here for you. Would you like to tell me more about what you're feeling?",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      
      if (voiceOutputEnabled) {
        speakText(aiMessage.content);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => sendMessage(inputValue);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-view">
      <header className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={onBackToHome}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600
            }}
          >
            ← Back
          </button>
          <h1 className="chat-header-title">Sere<span style={{ color: 'var(--color-primary)' }}>Nova</span></h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className={`voice-toggle ${voiceInputEnabled ? 'active' : ''}`}
            onClick={toggleVoiceInput}
            disabled={isLoading}
            title={isListening ? 'Stop listening' : 'Voice input'}
          >
            {isListening ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="pulse-icon">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            )}
          </button>
          <button 
            className={`voice-toggle ${voiceOutputEnabled ? 'active' : ''}`}
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
              } else {
                setVoiceOutputEnabled(!voiceOutputEnabled);
              }
            }}
            title={isSpeaking ? 'Stop speaking' : 'Voice output'}
          >
            {isSpeaking ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="pulse-icon">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : voiceOutputEnabled ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            )}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: 'var(--color-primary)',
              animation: 'pulse 2s ease-in-out infinite'
            }}></span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>AI Therapist</span>
          </div>
        </div>
      </header>

      <div className="chat-messages">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message message-${message.sender}`}
            style={{
              animation: 'fadeUp 0.4s ease-out forwards'
            }}
          >
            <div className="message-bubble">
              {message.content}
            </div>
            <span className="message-time">{formatTime(message.timestamp)}</span>
          </div>
        ))}
        
        {isLoading && (
          <div className="message message-ai">
            <div className="message-bubble" style={{ display: 'flex', gap: '4px' }}>
              <span style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                background: 'var(--color-primary)',
                animation: 'pulse 1s ease-in-out infinite'
              }}></span>
              <span style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                background: 'var(--color-primary)',
                animation: 'pulse 1s ease-in-out infinite',
                animationDelay: '0.2s'
              }}></span>
              <span style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                background: 'var(--color-primary)',
                animation: 'pulse 1s ease-in-out infinite',
                animationDelay: '0.4s'
              }}></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder={isListening ? "Listening..." : "Share what's on your mind..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />
          <button 
            className="chat-send-btn"
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
          >
            Send
          </button>
        </div>
        {isListening && (
          <div className="listening-indicator">
            <span className="listening-dot"></span>
            <span>Listening...</span>
          </div>
        )}
      </div>
    </div>
  );
};
