import React, { useState, useRef, useEffect, useCallback } from 'react';

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
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event { error: string; }
interface SpeechRecognitionResultList { [index: number]: SpeechRecognitionResult; length: number; }
interface SpeechRecognitionResult { [index: number]: SpeechRecognitionAlternative; length: number; }
interface SpeechRecognitionAlternative { transcript: string; confidence: number; }

/* ── Icons ──────────────────────────────────────────────── */
const BackArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const Chat: React.FC<ChatProps> = ({ onBackToHome, username }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello ${username || 'there'}! I'm SereNova, your compassionate AI companion. I'm here to listen. How are you feeling today?`,
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Track scroll position to show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
      setShowScrollBtn(!atBottom);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  // Speech init
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event) => {
        setInputValue(event.results[0][0].transcript);
        setIsRecording(false);
      };
      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);
    }
    return () => {
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
    };
  }, []);

  const handleMicrophoneClick = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInputValue('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSpeakerClick = () => {
    setIsAudioEnabled(prev => {
      if (prev && synthRef.current) synthRef.current.cancel();
      return !prev;
    });
  };

  const speakMessage = (text: string) => {
    if (!isAudioEnabled || !synthRef.current) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    synthRef.current.speak(utterance);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });
      const data = await response.json();
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || "I'm here for you. Would you like to tell me more about what you're feeling?",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      speakMessage(aiMessage.content);
    } catch {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm here for you. Would you like to tell me more about what you're feeling?",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      speakMessage(aiMessage.content);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="chat-view">
      {/* ── Header ── */}
      <header className="chat-header">
        <div className="chat-header-left">
          <button className="chat-back-btn" onClick={onBackToHome}>
            <BackArrowIcon /> Back
          </button>
          <h1 className="chat-header-title">
            Sere<span>Nova</span>
          </h1>
        </div>

        <div className="chat-status">
          <span className="chat-status-dot" />
          AI Therapist · Active
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.map(message => (
          <div key={message.id} className={`message message-${message.sender}`}>
            {message.sender === 'ai' ? (
              <div className="message-ai-row">
                <div className="ai-avatar" aria-hidden="true">SN</div>
                <div>
                  <div className="message-bubble">{message.content}</div>
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="message-bubble">{message.content}</div>
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="message message-ai">
            <div className="message-ai-row">
              <div className="ai-avatar" aria-hidden="true">SN</div>
              <div className="typing-indicator">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          className="scroll-to-bottom"
          onClick={() => scrollToBottom()}
          aria-label="Scroll to latest message"
        >
          <ChevronDownIcon />
        </button>
      )}

      {/* ── Input ── */}
      <div className="chat-input-container">
        <div className="chat-input-wrapper">
          {/* Mic button */}
          <button
            className={`chat-icon-btn chat-mic-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleMicrophoneClick}
            disabled={isLoading}
            title={isRecording ? 'Stop recording' : 'Voice input'}
            aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? '⏹' : '🎤'}
          </button>

          {/* Text input */}
          <input
            type="text"
            className="chat-input"
            placeholder="Share what's on your mind…"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            aria-label="Chat message input"
          />

          {/* Speaker button */}
          <button
            className={`chat-icon-btn chat-speaker-btn ${!isAudioEnabled ? 'muted' : ''}`}
            onClick={handleSpeakerClick}
            title={isAudioEnabled ? 'Mute audio responses' : 'Enable audio responses'}
            aria-label={isAudioEnabled ? 'Mute audio' : 'Enable audio'}
          >
            {isAudioEnabled ? '🔊' : '🔇'}
          </button>

          {/* Send button */}
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};
