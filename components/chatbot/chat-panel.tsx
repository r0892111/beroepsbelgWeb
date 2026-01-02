'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { X, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageBubble } from './message-bubble';
import { TypingIndicator } from './typing-indicator';
import { ChatMessage, StreamingState } from '@/lib/hooks/use-chat-stream';

interface ChatPanelProps {
  messages: ChatMessage[];
  streamingState: StreamingState;
  onSendMessage: (message: string) => Promise<void>;
  onClose: () => void;
}

export function ChatPanel({ messages, streamingState, onSendMessage, onClose }: ChatPanelProps) {
  const t = useTranslations('chatbot');
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // Auto-scroll to bottom when new messages arrive (unless user scrolled up)
  useEffect(() => {
    if (!userHasScrolled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, userHasScrolled]);

  // Check if user has manually scrolled up
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setUserHasScrolled(!isNearBottom);
    }
  };

  // Reset scroll tracking when streaming starts
  useEffect(() => {
    if (streamingState === 'streaming') {
      setUserHasScrolled(false);
    }
  }, [streamingState]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending || streamingState !== 'idle') return;

    setIsSending(true);
    try {
      await onSendMessage(inputValue);
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setUserHasScrolled(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120; // ~4 lines
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);

  // Focus trap: keep focus within panel
  useEffect(() => {
    const panel = messagesContainerRef.current?.closest('[role="dialog"]') as HTMLElement;
    if (!panel) return;

    const focusableElements = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: Event) => {
      // Check if it's a keyboard event by checking for key property
      if (!('key' in e)) return;
      const key = (e as any).key;
      if (typeof key !== 'string' || key !== 'Tab') return;
      
      const shiftKey = 'shiftKey' in e ? (e as any).shiftKey : false;

      if (shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    panel.addEventListener('keydown', handleTabKey);
    return () => panel.removeEventListener('keydown', handleTabKey);
  }, []);

  return (
    <div
      className="flex flex-col h-full bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: 'var(--shadow-large)',
        backgroundColor: 'var(--surface-elevated-2)',
      }}
      role="dialog"
      aria-label={t('title')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{t('subtitle')}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full"
          aria-label={t('close')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-busy={streamingState !== 'idle' ? 'true' : 'false'}
        aria-label="Chat messages"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-sm text-gray-500">{t('placeholder')}</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {(streamingState === 'reasoning' || streamingState === 'thinking' || streamingState === 'streaming') && (
              <TypingIndicator state={streamingState} />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Footer */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            disabled={isSending || streamingState !== 'idle'}
            className="resize-none min-h-[44px] max-h-[120px] pr-12"
            rows={1}
            aria-label={t('placeholder')}
            aria-describedby="chat-input-hint"
          />
          <span id="chat-input-hint" className="sr-only">
            Press Enter to send, Shift+Enter for new line
          </span>
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending || streamingState !== 'idle'}
            className="h-[44px] w-[44px] rounded-full bg-[#1BDD95] hover:bg-[#2ABE7D] text-white p-0 flex-shrink-0"
            aria-label={t('send')}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

