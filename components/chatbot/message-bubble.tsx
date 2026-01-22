'use client';

import { useState } from 'react';
import { ChatMessage } from '@/lib/hooks/use-chat-stream';
import { format } from 'date-fns';
import { Copy, Check, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: ChatMessage;
  showTimestamp?: boolean;
  onRetry?: () => void;
}

export function MessageBubble({ message, showTimestamp = false, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const isError = message.isError;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}
      >
        <div className="relative">
          <div
            className={`px-4 py-2 rounded-2xl ${
              isUser
                ? 'bg-[#1BDD95] text-white rounded-tl-md'
                : isError
                ? 'bg-red-50 text-red-700 border border-red-200 rounded-tr-md'
                : 'bg-white text-gray-900 border border-gray-200 rounded-tr-md'
            }`}
            style={{
              boxShadow: isUser
                ? 'var(--shadow-small)'
                : 'var(--shadow-small-dark)',
            }}
          >
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            ) : (
              <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-a:text-[#B8860B] prose-a:underline prose-strong:font-semibold">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="my-1">{children}</p>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#B8860B] underline hover:opacity-80">
                        {children}
                      </a>
                    ),
                    ul: ({ children }) => <ul className="list-disc pl-4 my-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-0.5 h-4 ml-1 bg-current align-middle" style={{ animation: 'cursorBlink 1s ease-in-out infinite' }} />
                )}
              </div>
            )}
          </div>
          {/* Copy button for assistant messages */}
          {!isUser && !isStreaming && message.content && !isError && (
            <button
              onClick={handleCopy}
              className="absolute -right-8 top-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
              aria-label="Copy message"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
          )}
        </div>
        {/* Retry button for error messages */}
        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Try again</span>
          </button>
        )}
        {showTimestamp && (
          <p
            className={`text-xs text-gray-400 mt-1 px-2 ${
              isUser ? 'text-right' : 'text-left'
            }`}
          >
            {format(message.timestamp, 'HH:mm')}
          </p>
        )}
      </div>
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
  );
}

