'use client';

import { ChatMessage } from '@/lib/hooks/use-chat-stream';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: ChatMessage;
  showTimestamp?: boolean;
}

export function MessageBubble({ message, showTimestamp = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}
      >
        <div
          className={`px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-[#1BDD95] text-white rounded-tl-md'
              : 'bg-white text-gray-900 border border-gray-200 rounded-tr-md'
          }`}
          style={{
            boxShadow: isUser
              ? 'var(--shadow-small)'
              : 'var(--shadow-small-dark)',
          }}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 ml-1 bg-current align-middle" style={{ animation: 'cursorBlink 1s ease-in-out infinite' }} />
            )}
          </p>
          <style jsx>{`
            @keyframes cursorBlink {
              0%, 45% {
                opacity: 1;
              }
              50%, 95% {
                opacity: 0;
              }
              100% {
                opacity: 1;
              }
            }
          `}</style>
        </div>
        {showTimestamp && (
          <p
            className={`text-xs text-gray-500 mt-1 px-2 ${
              isUser ? 'text-right' : 'text-left'
            }`}
          >
            {format(message.timestamp, 'HH:mm')}
          </p>
        )}
      </div>
    </div>
  );
}

