'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChatStream } from '@/lib/hooks/use-chat-stream';
import { ChatPanel } from './chat-panel';
import { useCartContext } from '@/lib/contexts/cart-context';

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
  const { isCartOpen } = useCartContext();
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [conversationId, setConversationId] = useState<string>(() => getOrCreateConversationId());
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const { messages, streamingState, sendMessage, clearMessages, retryLastMessage } = useChatStream(conversationId);

  // Auto-open chatbot on page load (with delay)
  useEffect(() => {
    if (!hasAutoOpened && !isCartOpen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasAutoOpened(true);
      }, 1500); // Open after 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [hasAutoOpened, isCartOpen]);

  // Close chatbot when cart opens
  useEffect(() => {
    if (isCartOpen && isOpen) {
      setIsOpen(false);
    }
  }, [isCartOpen, isOpen]);

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

  // Hide chatbot when cart is open
  if (isCartOpen) {
    return null;
  }

  return (
    <>
      {/* FAB Button - More Prominent */}
      <button
        ref={fabRef}
        onClick={handleToggle}
        className={`fixed bottom-6 right-6 z-[9999] ${isOpen ? 'h-14 w-14' : 'h-16 w-16'} rounded-full bg-[#1BDD95] text-white shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#1BDD95] focus:ring-offset-2 active:scale-95 ${!isOpen ? 'animate-pulse' : ''}`}
        style={{
          boxShadow: isOpen ? 'var(--shadow-medium)' : '0 0 20px rgba(27, 221, 149, 0.5), var(--shadow-medium)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-hover-glow)';
          e.currentTarget.classList.remove('animate-pulse');
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(27, 221, 149, 0.5), var(--shadow-medium)';
            e.currentTarget.classList.add('animate-pulse');
          } else {
            e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
          }
        }}
        aria-label={isOpen ? t('close') : t('title')}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-7 w-7" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed z-[9999] bottom-20 right-4 left-4 md:left-auto md:right-6 md:bottom-24 md:w-[380px] h-[500px] md:h-[600px] max-h-[calc(100vh-120px)]"
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
            onRestart={clearMessages}
            onRetry={retryLastMessage}
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

