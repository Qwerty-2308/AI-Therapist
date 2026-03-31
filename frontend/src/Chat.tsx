import React, { useState, useRef, useEffect } from 'react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

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
    } catch {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm here for you. Would you like to tell me more about what you're feeling?",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
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
            placeholder="Share what's on your mind..."
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
      </div>
    </div>
  );
};
