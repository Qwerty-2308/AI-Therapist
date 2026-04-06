import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import therapistImg from './assets/Emma-Watson-Just-Shared-a-Chocolate-Espresso-Martini-and-All-We-Can-Say-Is-Wow-f430738e367b40a5bf92a47c73d6bc7f.jpg';

/**
 * Speech Recognition API type definitions
 * Used for browser-based voice input functionality
 */
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

/**
 * Chat message interface representing a single message in the conversation
 */
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isSpoken?: boolean;
}

/**
 * Props for the Chat component
 */
interface ChatProps {
  onBackToHome: () => void;
  username: string;
}

/**
 * Extend global window interface to include browser APIs
 */
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
    anime: any;
  }
}

/**
 * Main Chat component for SereNova AI Therapist
 * Handles conversation, voice input/output, and avatar lip-sync animation
 */
export const Chat: React.FC<ChatProps> = ({ onBackToHome, username }) => {
  // State for managing chat messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello ${username || 'there'}! I'm here to listen. How are you feeling today?`,
      sender: 'ai',
      timestamp: new Date(),
      isSpoken: true
    }
  ]);

  // State for input field
  const [inputValue, setInputValue] = useState('');
  
  // State for loading indicator
  const [isLoading, setIsLoading] = useState(false);
  
  // State for voice input (speech recognition)
  const [isListening, setIsListening] = useState(false);
  
  // State for voice output (TTS playing)
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Toggle states
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  
  // Avatar active state (showing visual feedback)
  const [avatarActive, setAvatarActive] = useState(false);
  const [lipSyncFrames, setLipSyncFrames] = useState<string[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Refs for DOM elements and persistent values
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAiMessageRef = useRef<Partial<Message> | null>(null);
  
  // Audio API refs for lip-sync functionality
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Scroll to bottom of chat messages
   * Called whenever messages change
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Initialize speech recognition and socket connection on mount
   * Sets up event handlers for voice input and avatar service communication
   */
  useEffect(() => {
    // Initialize browser speech synthesis
    synthRef.current = window.speechSynthesis;
    
    // Initialize speech recognition (with browser compatibility)
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      recognitionRef.current = new SpeechRecognitionCtor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      // Handle recognition results
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result: SpeechRecognitionResult) => result[0].transcript)
          .join('');
        
        if (event.results[0].isFinal) {
          setInputValue(prev => prev + transcript);
        }
      };

      // Handle recognition errors
      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      // Handle recognition end
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Connect to avatar service via Socket.IO
    const socketUrl = import.meta.env.VITE_AVATAR_SERVICE_URL || 'http://localhost:5002';
    try {
      socketRef.current = io(socketUrl);
      
      // Handle socket connection
      socketRef.current.on('connect', () => {
        console.log('Connected to avatar service');
        setAvatarActive(true);
      });

      // Handle socket disconnection
      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from avatar service');
        setAvatarActive(false);
      });

      // Handle avatar audio events (for direct audio playback)
      socketRef.current.on('avatar_audio', (data) => {
        if (data.audio) {
          playElevenLabsAudio(data.audio, data.text);
        }
      });

      // Handle avatar ready events
      socketRef.current.on('avatar_ready', (data) => {
        console.log('Avatar ready:', data);
      });
    } catch (e) {
      console.warn('Could not connect to avatar service:', e);
    }

    // Cleanup on unmount
    return () => {
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
      socketRef.current?.disconnect();
    };
  }, []);

  /**
   * Play audio received from ElevenLabs API (via socket)
   * Sets up audio element, analyser, and lip-sync animation
   * @param audioBase64 - Base64 encoded audio data
   * @param messageId - Message ID to mark as spoken when audio ends
   */
  const playElevenLabsAudio = (audioBase64: string, messageId: string) => {
    try {
      // Decode base64 audio to blob
      const audioBytes = atob(audioBase64);
      const audioBlob = new Blob([new Uint8Array(audioBytes.split('').map(c => c.charCodeAt(0)))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Handle audio playback start
      audio.onplay = () => {
        setIsSpeaking(true);
        setAvatarActive(true);
      };
      
      // Handle audio playback end
      audio.onended = () => {
        setIsSpeaking(false);
        setAvatarActive(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        URL.revokeObjectURL(audioUrl);
        markMessageAsSpoken(messageId);
      };
      
      // Handle audio errors
      audio.onerror = () => {
        setIsSpeaking(false);
        setAvatarActive(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        URL.revokeObjectURL(audioUrl);
        markMessageAsSpoken(messageId);
      };

      // Start playback
      audio.play();
    } catch (e) {
      console.error('Error playing ElevenLabs audio:', e);
      markMessageAsSpoken(messageId);
    }
  };

  /**
   * Convert text to speech using ElevenLabs API via backend service
   * Fetches audio from avatar service and plays with lip-sync
   * @param text - Text to convert to speech
   * @param messageId - Message ID to mark as spoken when audio ends
   * @param preloadedFrames - Optional pre-fetched lip-sync frames
   */
  const speakText = useCallback(async (text: string, messageId: string, preloadedFrames: string[] = []) => {
    // Skip if voice output is disabled
    if (!voiceOutputEnabled) {
      markMessageAsSpoken(messageId);
      return;
    }

    setIsSpeaking(true);
    setAvatarActive(true);

    const avatarServiceUrl = import.meta.env.VITE_AVATAR_SERVICE_URL || 'http://localhost:5002';
    const lipsyncUrl = import.meta.env.VITE_LIPSYNC_URL || 'https://inferible-flockless-yahir.ngrok-free.dev';
    
    try {
      // Call avatar service TTS endpoint
      const response = await fetch(`${avatarServiceUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.audio) {
        throw new Error('No audio returned from TTS');
      }

      console.log('Received audio from backend, playing...');
      
      // Decode base64 audio to blob
      const audioBytes = atob(data.audio);
      const audioBlob = new Blob([new Uint8Array(audioBytes.split('').map(c => c.charCodeAt(0)))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audioEl = new Audio();
      audioEl.src = audioUrl;
      
      // Handle audio playback start - setup lip-sync
      audioEl.onplay = async () => {
        console.log('Audio started playing - starting lip sync');
        setIsSpeaking(true);
        setAvatarActive(true);
        
        // Use preloaded frames if available, otherwise fetch
        let frames = preloadedFrames;
        
        if (frames.length === 0) {
          console.log('No preloaded frames, fetching from service...');
          try {
            const lipsyncResponse = await fetch(`${lipsyncUrl}/animate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text })
            });
            
            if (lipsyncResponse.ok) {
              const lipsyncData = await lipsyncResponse.json();
              frames = lipsyncData.frames || [];
              console.log('Got lip-sync frames:', frames.length, 'frames');
            }
          } catch (e) {
            console.warn('Lip-sync service error:', e);
          }
        } else {
          console.log('Using', frames.length, 'preloaded frames');
        }
        
        // Store frames and start animation
        if (frames.length > 0) {
          setLipSyncFrames(frames);
          setCurrentFrameIndex(0);
          setupAudioAnalyser(audioEl);
          startLipSyncWithFrames(frames);
        }
      };
      
      // Handle audio playback end
      audioEl.onended = () => {
        console.log('Audio ended');
        setIsSpeaking(false);
        setAvatarActive(false);
        setLipSyncFrames([]);
        setCurrentFrameIndex(0);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        URL.revokeObjectURL(audioUrl);
        markMessageAsSpoken(messageId);
      };
      
      // Handle audio errors
      audioEl.onerror = (e) => {
        console.error('Audio error:', e);
        setIsSpeaking(false);
        setAvatarActive(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        URL.revokeObjectURL(audioUrl);
        markMessageAsSpoken(messageId);
      };
      
      await audioEl.play();
    } catch (e) {
      console.error('TTS Error:', e);
      setIsSpeaking(false);
      setAvatarActive(false);
      markMessageAsSpoken(messageId);
    }
  }, [voiceOutputEnabled]);

  /**
   * Start lip-sync with specific frames (passed directly, not from state)
   */
  const startLipSyncWithFrames = useCallback((frames: string[]) => {
    console.log('[LIP-SYNC] Starting with', frames.length, 'frames');
    
    if (frames.length === 0) {
      console.warn('[LIP-SYNC] No frames!');
      return;
    }
    
    const avatarImg = document.getElementById('animated-avatar') as HTMLImageElement;
    if (!avatarImg) {
      console.warn('[LIP-SYNC] No avatar image element found');
      return;
    }
    
    let frameIndex = 0;
    let isAnimating = true;
    let lastFrameUpdate = 0;
    const FRAME_RATE_MS = 50; // ~20fps for smooth but not too fast
    
    const animate = () => {
      if (!isAnimating) return;

      const now = Date.now();
      
      if (now - lastFrameUpdate > FRAME_RATE_MS) {
        const frameData = frames[frameIndex];
        
        if (avatarImg && frameData) {
          avatarImg.src = `data:image/jpeg;base64,${frameData}`;
        }
        
        frameIndex = (frameIndex + 1) % frames.length;
        lastFrameUpdate = now;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    
    return () => {
      isAnimating = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  /**
   * Setup Web Audio API analyser for lip-sync
   * Creates AudioContext and AnalyserNode to analyze audio data
   * @param audioElement - HTML audio element to analyze
   */
  const setupAudioAnalyser = useCallback((audioElement: HTMLAudioElement) => {
    try {
      console.log('Setting up audio analyser for:', audioElement.src);
      
      // Create or resume AudioContext (required for Web Audio API)
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext();
        console.log('Created new AudioContext');
      }
      
      // Resume suspended context (browser autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => console.log('AudioContext resumed'));
      }

      console.log('Creating MediaElementSource...');
      
      // Create media element source from audio element
      // Note: This can fail with blob URLs due to CORS, so we wrap in try-catch
      let source: MediaElementAudioSourceNode | null = null;
      try {
        source = audioContextRef.current.createMediaElementSource(audioElement);
      } catch (e) {
        console.warn('MediaElementSource failed (CORS issue with blob), using fallback:', e);
        // Don't throw - we'll use fallback animation
      }
      
      // Create and configure analyser node
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      analyser.minDecibels = -60;
      analyser.maxDecibels = -10;
      
      // Connect: source -> analyser -> destination (speakers)
      // Only connect if source was created successfully
      if (source) {
        source.connect(analyser);
        analyser.connect(audioContextRef.current.destination);
        console.log('Connected audio chain: source -> analyser -> destination');
      } else {
        // Still set the analyser for potential fallback animation
        console.log('Using analyser without source connection (fallback mode)');
      }
      
      analyserRef.current = analyser;
      console.log('Audio analyser setup complete!');
    } catch (e) {
      console.error('Audio analyser setup failed:', e);
    }
  }, []);

  /**
   * Mark a message as spoken (show in chat bubble)
   * Updates message state to reveal text after TTS completes
   * @param messageId - ID of message to mark as spoken
   */
  const markMessageAsSpoken = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isSpoken: true } : msg
    ));
  };

  /**
   * Stop currently playing audio
   * Used when user wants to interrupt AI speech
   */
  const stopSpeaking = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsSpeaking(false);
    setAvatarActive(false);
  };

  /**
   * Toggle voice input (speech recognition)
   * Starts/stops the browser's speech recognition API
   */
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

  /**
   * Send message to AI and get response
   * Handles the full flow: user input -> API call -> AI response -> TTS
   * @param content - Message text to send
   */
  const sendMessage = async (content: string) => {
    // Validate input
    if (!content.trim() || isLoading) return;

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
      isSpoken: true
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Stop listening if active
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    try {
      // Call chat API with user message
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      });

      const data = await response.json();
      
      // Generate unique ID for AI message
      const aiMessageId = (Date.now() + 1).toString();
      
      // Prepare AI message
      pendingAiMessageRef.current = {
        id: aiMessageId,
        content: data.response || "I'm here for you. Would you like to tell me more about what you're feeling?",
        sender: 'ai',
        timestamp: new Date(),
        isSpoken: false
      };

      // Add AI message to chat (initially hidden until spoken)
      setMessages(prev => [...prev, pendingAiMessageRef.current as Message]);
      
      const aiText = data.response || "I'm here for you. Would you like to tell me more about what you're feeling?";
      
      // Pre-fetch lip-sync frames in parallel with TTS for faster animation
      const lipsyncUrl = import.meta.env.VITE_LIPSYNC_URL || 'https://inferible-flockless-yahir.ngrok-free.dev';
      let preloadedFrames: string[] = [];
      
      if (voiceOutputEnabled) {
        fetch(`${lipsyncUrl}/animate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: aiText })
        })
        .then(res => res.json())
        .then(data => {
          preloadedFrames = data.frames || [];
          console.log('[PRELOAD] Got', preloadedFrames.length, 'lip-sync frames');
        })
        .catch(e => console.warn('[PRELOAD] Lip-sync failed:', e));
      }
      
      // Trigger TTS if voice output enabled
      if (voiceOutputEnabled) {
        speakText(aiText, aiMessageId, preloadedFrames);
      } else {
        markMessageAsSpoken(aiMessageId);
      }
    } catch {
      // Handle API errors with fallback response
      const aiMessageId = (Date.now() + 1).toString();
      const fallbackText = "I'm here for you. Would you like to tell me more about what you're feeling?";
      
      // Preload lip-sync for fallback message
      let preloadedFrames: string[] = [];
      if (voiceOutputEnabled) {
        const lipsyncUrl = import.meta.env.VITE_LIPSYNC_URL || 'https://inferible-flockless-yahir.ngrok-free.dev';
        try {
          const res = await fetch(`${lipsyncUrl}/animate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: fallbackText })
          });
          if (res.ok) {
            const data = await res.json();
            preloadedFrames = data.frames || [];
          }
        } catch {}
      }
      
      setMessages(prev => [...prev, {
        id: aiMessageId,
        content: fallbackText,
        sender: 'ai',
        timestamp: new Date(),
        isSpoken: voiceOutputEnabled ? false : true
      }]);
      
      if (voiceOutputEnabled) {
        speakText(fallbackText, aiMessageId, preloadedFrames);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle send button click
   */
  const handleSend = () => sendMessage(inputValue);

  /**
   * Handle Enter key press in input field
   * @param e - Keyboard event
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Format timestamp for message display
   * @param date - Date object to format
   * @returns Formatted time string (e.g., "10:30 AM")
   */
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-view">
      {/* Chat header with controls */}
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
        
        {/* Voice controls and status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Voice input toggle */}
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
          
          {/* Voice output toggle */}
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
          
          {/* AI status indicator */}
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

      {/* Main content area - split between avatar and chat */}
      <div style={{ 
        display: 'flex', 
        height: 'calc(100vh - 200px)',
        minHeight: '400px'
      }}>
        {/* Avatar panel with Emma Watson image and lip-sync overlay */}
        <div style={{
          width: '280px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: 'linear-gradient(180deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          borderRight: '1px solid var(--color-border)'
        }}>
          {/* Avatar container with glow effect when active */}
          <div style={{
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            border: avatarActive ? '4px solid var(--color-primary)' : '4px solid transparent',
            boxShadow: avatarActive 
              ? '0 0 30px rgba(102, 126, 234, 0.5), 0 0 60px rgba(102, 126, 234, 0.3)' 
              : '0 4px 20px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.5s ease',
            animation: avatarActive ? 'avatarGlow 2s ease-in-out infinite' : 'none',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Primary: Show animated frames from Colab lip-sync service */}
            {lipSyncFrames.length > 0 ? (
              <img 
                id="animated-avatar"
                src={`data:image/jpeg;base64,${lipSyncFrames[currentFrameIndex]}`}
                alt="AI Therapist Animated"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              /* Fallback: Static Emma Watson image */
              <img 
                src={therapistImg} 
                alt="AI Therapist"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: avatarActive ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.5s ease'
                }}
              />
            )}
          </div>
          
          {/* Avatar info and status */}
          <div style={{
            marginTop: '1.5rem',
            textAlign: 'center'
          }}>
            <h3 style={{
              color: 'var(--color-text)',
              fontSize: '1.1rem',
              marginBottom: '0.5rem'
            }}>
              Emma Watson (AI Therapist)
            </h3>
            <p style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.85rem'
            }}>
              {isSpeaking ? 'Speaking...' : avatarActive ? 'Listening' : 'Ready'}
            </p>
          </div>
          
          {/* Speaking indicator dots */}
          {isSpeaking && (
            <div style={{
              marginTop: '1rem',
              display: 'flex',
              gap: '4px',
              alignItems: 'center'
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse 0.5s ease-in-out infinite' }}></div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse 0.5s ease-in-out infinite 0.1s' }}></div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse 0.5s ease-in-out infinite 0.2s' }}></div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse 0.5s ease-in-out infinite 0.3s' }}></div>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse 0.5s ease-in-out infinite 0.4s' }}></div>
            </div>
          )}
        </div>

        {/* Chat messages and input area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Messages container */}
          <div className="chat-messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message message-${message.sender}`}
                style={{
                  animation: 'fadeUp 0.4s ease-out forwards',
                  opacity: message.sender === 'ai' && !message.isSpoken ? 0.5 : 1
                }}
              >
                <div className="message-bubble">
                  {message.content}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                  {message.sender === 'ai' && !message.isSpoken && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)' }}>
                      🔊 Speaking...
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
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

          {/* Input area with send button */}
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
            
            {/* Listening indicator */}
            {isListening && (
              <div className="listening-indicator">
                <span className="listening-dot"></span>
                <span>Listening...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};