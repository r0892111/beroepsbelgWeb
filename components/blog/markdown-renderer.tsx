'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
}

// Pre-process markdown to extract image width attributes
function preprocessMarkdown(markdown: string): { processed: string; imageWidths: Map<string, string> } {
  const imageWidths = new Map<string, string>();
  
  // Match all image markdown patterns with optional width attribute
  // Pattern: ![alt](url){width="25%"} - can be on its own line or within text
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)(?:\{width="(\d+)%"\})?/g;
  
  let processed = markdown;
  let match;
  
  // Find all image matches and extract width info
  while ((match = imageRegex.exec(markdown)) !== null) {
    const fullMatch = match[0];
    const alt = match[1] || '';
    const url = match[2];
    const width = match[3] || '100';
    
    // Store width mapping using URL as key
    imageWidths.set(url, width);
    
    // Replace the full match (including width attribute) with just the image markdown
    const imageMarkdown = `![${alt}](${url})`;
    processed = processed.replace(fullMatch, imageMarkdown);
  }
  
  return {
    processed,
    imageWidths,
  };
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { processed, imageWidths } = useMemo(() => preprocessMarkdown(content), [content]);
  
  return (
    <ReactMarkdown
      components={{
        // Headings
        h1: ({ node, ...props }) => (
          <h1 className="text-4xl font-serif font-bold text-navy mt-8 mb-4" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-3xl font-serif font-bold text-navy mt-6 mb-3" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-2xl font-serif font-bold text-navy mt-5 mb-2" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="text-xl font-serif font-bold text-navy mt-4 mb-2" {...props} />
        ),
        h5: ({ node, ...props }) => (
          <h5 className="text-lg font-serif font-bold text-navy mt-3 mb-2" {...props} />
        ),
        h6: ({ node, ...props }) => (
          <h6 className="text-base font-serif font-bold text-navy mt-3 mb-2" {...props} />
        ),
        // Paragraphs
        p: ({ node, ...props }) => (
          <p className="mb-4 text-gray-700 leading-relaxed" {...props} />
        ),
        // Links
        a: ({ node, ...props }) => (
          <a
            className="text-[#1BDD95] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
        // Lists
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className="text-gray-700" {...props} />
        ),
        // Images with width support
        img: ({ node, ...props }) => {
          const { src, alt } = props as { src?: string; alt?: string };
          if (!src) return null;

          // Get width from preprocessed map
          const widthPercent = imageWidths.get(src) || '100';
          const widthValue = `${widthPercent}%`;

          return (
            <div className={`my-6 ${widthValue === '100%' ? 'w-full' : 'mx-auto'}`} style={{ width: widthValue }}>
              <div className="relative w-full rounded-lg overflow-hidden">
                <img
                  src={src}
                  alt={alt || ''}
                  className="w-full h-auto object-contain rounded-lg"
                />
              </div>
            </div>
          );
        },
        // Code blocks
        code: ({ node, inline, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';

          if (!inline && language) {
            return (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                className="rounded-lg mb-4"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          }

          return (
            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          );
        },
        // Blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-[#1BDD95] pl-4 italic my-4 text-gray-600"
            {...props}
          />
        ),
        // Horizontal rule
        hr: ({ node, ...props }) => (
          <hr className="my-8 border-gray-300" {...props} />
        ),
        // Strong/Bold
        strong: ({ node, ...props }) => (
          <strong className="font-bold text-navy" {...props} />
        ),
        // Emphasis/Italic
        em: ({ node, ...props }) => (
          <em className="italic" {...props} />
        ),
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}

