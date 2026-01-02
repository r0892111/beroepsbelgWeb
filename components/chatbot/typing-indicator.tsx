'use client';

import { StreamingState } from '@/lib/hooks/use-chat-stream';
import { Brain, Loader2 } from 'lucide-react';

interface TypingIndicatorProps {
  state: StreamingState;
  className?: string;
}

export function TypingIndicator({ state, className = '' }: TypingIndicatorProps) {
  if (state === 'idle' || state === 'error') {
    return null;
  }

  const getContent = () => {
    switch (state) {
      case 'reasoning':
        return {
          text: 'Reasoning...',
          icon: Brain,
          iconClassName: '',
        };
      case 'thinking':
        return {
          text: 'Thinking...',
          icon: Loader2,
          iconClassName: '',
        };
      case 'streaming':
        return {
          text: 'Typing...',
          icon: null,
          iconClassName: '',
        };
      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  const Icon = content.icon;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-600 ${className}`}
    >
      {Icon && (
        <Icon 
          className={`h-4 w-4 ${content.iconClassName}`}
          style={state === 'reasoning' 
            ? { animation: 'pulseSmooth 2s ease-in-out infinite' }
            : state === 'thinking'
            ? { animation: 'spinSmooth 1.5s linear infinite' }
            : undefined
          }
        />
      )}
      <span>{content.text}</span>
      {!Icon && (
        <div className="flex gap-1.5 ml-2">
          <span className="w-2 h-2 bg-gray-500 rounded-full" style={{ animation: 'typingDot 1.4s infinite ease-in-out', animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-500 rounded-full" style={{ animation: 'typingDot 1.4s infinite ease-in-out', animationDelay: '200ms' }} />
          <span className="w-2 h-2 bg-gray-500 rounded-full" style={{ animation: 'typingDot 1.4s infinite ease-in-out', animationDelay: '400ms' }} />
        </div>
      )}
      <style jsx>{`
        @keyframes typingDot {
          0%, 60%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-6px) scale(1.1);
            opacity: 1;
          }
        }
        @keyframes pulseSmooth {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }
        @keyframes spinSmooth {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

