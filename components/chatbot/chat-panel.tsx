'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { X, Send, RotateCcw, Bot } from 'lucide-react';
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
  onRestart: () => void;
  onRetry: () => Promise<void>;
}

export function ChatPanel({ messages, streamingState, onSendMessage, onClose, onRestart, onRetry }: ChatPanelProps) {
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Bot className="w-5 h-5 text-gray-600" />
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#1BDD95] border-2 border-white rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{t('title')}</h3>
          <p className="text-xs text-gray-500">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRestart}
              className="h-8 w-8 rounded-full text-gray-500 hover:text-gray-700"
              aria-label="Restart conversation"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-gray-500 hover:text-gray-700"
            aria-label={t('close')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
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
          <div className="flex flex-col items-center justify-center h-full px-4">
            <p className="text-gray-600 text-sm mb-4">{t('emptyStateTitle')}</p>
            <div className="flex flex-col gap-2 w-full max-w-[280px]">
              <button
                onClick={() => onSendMessage(t('starterPrompt1'))}
                className="px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all text-left"
              >
                {t('starterPrompt1')}
              </button>
              <button
                onClick={() => onSendMessage(t('starterPrompt2'))}
                className="px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all text-left"
              >
                {t('starterPrompt2')}
              </button>
              <button
                onClick={() => onSendMessage(t('starterPrompt3'))}
                className="px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all text-left"
              >
                {t('starterPrompt3')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                showTimestamp={
                  index === messages.length - 1 ||
                  (index < messages.length - 1 &&
                    messages[index + 1].timestamp.getTime() - message.timestamp.getTime() > 5 * 60 * 1000)
                }
                onRetry={message.isError ? onRetry : undefined}
              />
            ))}
            {(streamingState === 'reasoning' || streamingState === 'thinking' || streamingState === 'streaming') && (
              <TypingIndicator state={streamingState} />
            )}
            {/* Suggested replies */}
            {streamingState === 'idle' &&
              messages.length > 0 &&
              messages[messages.length - 1].role === 'assistant' &&
              messages[messages.length - 1].suggestions &&
              !messages[messages.length - 1].isError && (
                <div className="flex flex-wrap gap-2 mt-2 mb-4">
                  {messages[messages.length - 1].suggestions!.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(suggestion)}
                      className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
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

