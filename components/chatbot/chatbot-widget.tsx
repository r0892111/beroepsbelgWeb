'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChatStream } from '@/lib/hooks/use-chat-stream';
import { ChatPanel } from './chat-panel';

function generateConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getOrCreateConversationId(): string {
  if (typeof window === 'undefined') return generateConversationId();
  
  const stored = sessionStorage.getItem('chatbot-conversation-id');
  if (stored) return stored;
  
  const newId = generateConversationId();
  sessionStorage.setItem('chatbot-conversation-id', newId);
  return newId;
}

interface ChatbotWidgetProps {
  locale: string;
}

export function ChatbotWidget({ locale }: ChatbotWidgetProps) {
  const t = useTranslations('chatbot');
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string>(() => getOrCreateConversationId());
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const { messages, streamingState, sendMessage, clearMessages } = useChatStream(conversationId);

  // Reset conversation ID when panel closes (optional - can be removed if you want persistence)
  // For now, we'll keep the same conversation until tab closes (sessionStorage)

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && panelRef.current) {
      // Focus the input when panel opens
      const input = panelRef.current.querySelector('textarea');
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    } else if (!isOpen && fabRef.current) {
      // Return focus to FAB when panel closes
      fabRef.current.focus();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        fabRef.current &&
        !fabRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <>
      {/* FAB Button */}
      <button
        ref={fabRef}
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-[9999] h-14 w-14 rounded-full bg-[#1BDD95] text-white shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#1BDD95] focus:ring-offset-2 active:scale-95"
        style={{
          boxShadow: 'var(--shadow-medium)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-hover-glow)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
        }}
        aria-label={isOpen ? t('close') : t('title')}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-[9999] w-[380px] h-[600px] max-h-[calc(100vh-120px)] md:w-[380px] sm:w-[calc(100vw-32px)] sm:right-4 sm:bottom-20 sm:max-h-[calc(100vh-120px)]"
          style={{
            animation: 'slideUpFadeIn 0.3s ease-out',
          }}
          role="complementary"
          aria-label={t('title')}
        >
          <ChatPanel
            messages={messages}
            streamingState={streamingState}
            onSendMessage={sendMessage}
            onClose={handleClose}
          />
        </div>
      )}

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slideUpFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

