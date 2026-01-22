import { useState, useRef, useCallback } from 'react';

const WEBHOOK_URL = 'https://alexfinit.app.n8n.cloud/webhook/c770a142-6a42-4b3a-afa5-fdd2d905de55';

export type StreamingState = 'idle' | 'reasoning' | 'thinking' | 'streaming' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
  suggestions?: string[];
}

interface UseChatStreamReturn {
  messages: ChatMessage[];
  streamingState: StreamingState;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  error: string | null;
}

function parseSuggestions(content: string): { cleanContent: string; suggestions: string[] } {
  const suggestionsMarker = '---suggestions---';
  const markerIndex = content.toLowerCase().indexOf(suggestionsMarker);

  if (markerIndex === -1) {
    return { cleanContent: content, suggestions: [] };
  }

  const cleanContent = content.slice(0, markerIndex).trim();
  const suggestionsText = content.slice(markerIndex + suggestionsMarker.length).trim();

  // Split by newlines and filter out empty lines
  const suggestions = suggestionsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.length <= 50) // Max 50 chars per suggestion
    .slice(0, 3); // Max 3 suggestions

  return { cleanContent, suggestions };
}

export function useChatStream(conversationId: string): UseChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingState, setStreamingState] = useState<StreamingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const draftMessageRef = useRef<string>('');
  const rafRef = useRef<number | null>(null);
  const lastUserMessageRef = useRef<string>('');

  const updateDraftMessage = useCallback((chunk: string) => {
    draftMessageRef.current += chunk;
    
    // Throttle updates using requestAnimationFrame
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
            lastMessage.content = draftMessageRef.current;
            return [...newMessages.slice(0, -1), { ...lastMessage }];
          }
          
          return prev;
        });
        rafRef.current = null;
      });
    }
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || streamingState !== 'idle') return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    setError(null);
    draftMessageRef.current = '';

    // Store last user message for retry
    lastUserMessageRef.current = message.trim();

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setStreamingState('reasoning');

    try {
      // Prepare payload
      const payload = {
        message: message.trim(),
        conversationId: conversationId,
        pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        language: typeof navigator !== 'undefined' ? navigator.language : 'en',
        timestamp: new Date().toISOString(),
      };

      // Fetch with streaming
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Start reading stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasReceivedFirstToken = false;

      setStreamingState('thinking');

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines (newline-delimited JSON)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (!line.trim()) continue; // Skip empty lines
          
          try {
            // Parse JSON line
            const json = JSON.parse(line);
            
            // Only process items with content
            if (json.type === 'item' && json.content !== undefined && json.content !== null) {
              const content = String(json.content);
              
              if (content) {
                if (!hasReceivedFirstToken) {
                  hasReceivedFirstToken = true;
                  setStreamingState('streaming');
                }
                // Append content to message
                updateDraftMessage(content);
              }
            }
            // Ignore "begin", "end", and items without content
          } catch (e) {
            // If JSON parsing fails, skip this line
            // This handles malformed JSON or non-JSON content
            console.warn('Failed to parse streaming JSON:', e, line);
          }
        }
      }

      // Process any remaining buffer content
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer);
          if (json.type === 'item' && json.content !== undefined && json.content !== null) {
            const content = String(json.content);
            if (content) {
              if (!hasReceivedFirstToken) {
                hasReceivedFirstToken = true;
                setStreamingState('streaming');
              }
              updateDraftMessage(content);
            }
          }
        } catch (e) {
          // Ignore parsing errors for remaining buffer
        }
      }

      // Finalize message and parse suggestions
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];

        if (lastMessage && lastMessage.id === assistantMessageId) {
          const rawContent = draftMessageRef.current || lastMessage.content;
          const { cleanContent, suggestions } = parseSuggestions(rawContent);

          return [
            ...newMessages.slice(0, -1),
            {
              ...lastMessage,
              content: cleanContent,
              isStreaming: false,
              suggestions: suggestions.length > 0 ? suggestions : undefined,
            },
          ];
        }

        return newMessages;
      });

      setStreamingState('idle');
      draftMessageRef.current = '';
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted, clean up
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage && lastMessage.id === assistantMessageId && lastMessage.isStreaming) {
            // Remove incomplete message or keep partial content
            if (draftMessageRef.current.trim()) {
              return [
                ...newMessages.slice(0, -1),
                {
                  ...lastMessage,
                  content: draftMessageRef.current,
                  isStreaming: false,
                },
              ];
            } else {
              return newMessages.slice(0, -1);
            }
          }
          
          return newMessages;
        });
        setStreamingState('idle');
        return;
      }

      // Handle error
      setError(err.message || 'Failed to send message. Please try again.');
      setStreamingState('error');
      
      // Remove incomplete assistant message
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        
        if (lastMessage && lastMessage.id === assistantMessageId && lastMessage.isStreaming) {
          return newMessages.slice(0, -1);
        }
        
        return newMessages;
      });

      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      abortControllerRef.current = null;
    }
  }, [conversationId, streamingState, updateDraftMessage]);

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setStreamingState('idle');
    setError(null);
    draftMessageRef.current = '';
    lastUserMessageRef.current = '';
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current || streamingState !== 'idle') return;

    // Remove the error message and the last user message
    setMessages((prev) => {
      const newMessages = [...prev];
      // Remove last two messages (error + user message that failed)
      if (newMessages.length >= 2) {
        const lastMsg = newMessages[newMessages.length - 1];
        const secondLastMsg = newMessages[newMessages.length - 2];
        if (lastMsg.isError && secondLastMsg.role === 'user') {
          return newMessages.slice(0, -2);
        }
      }
      // Or just remove the error message
      if (newMessages.length >= 1 && newMessages[newMessages.length - 1].isError) {
        return newMessages.slice(0, -1);
      }
      return newMessages;
    });

    setStreamingState('idle');
    setError(null);

    // Resend the last message
    await sendMessage(lastUserMessageRef.current);
  }, [streamingState, sendMessage]);

  return {
    messages,
    streamingState,
    sendMessage,
    clearMessages,
    retryLastMessage,
    error,
  };
}

