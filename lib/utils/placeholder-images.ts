/**
 * Product placeholder image utility
 * Provides category-specific placeholder images for products
 */

export const getProductPlaceholder = (category: 'Book' | 'Merchandise' | 'Game' | string): string => {
  // Using placeholder.com with category-specific colors and text
  const placeholders: Record<string, string> = {
    Book: 'https://placehold.co/600x800/1BDD95/FFFFFF?text=Book',
    Merchandise: 'https://placehold.co/600x800/1a3628/FFFFFF?text=Merchandise',
    Game: 'https://placehold.co/600x800/F0F0EB/1a3628?text=Game',
  };

  return placeholders[category] || 'https://placehold.co/600x800/E5E5E5/666666?text=Product';
};

/**
 * Generate a placeholder image data URL (inline SVG)
 * Alternative to external placeholder service
 */
export const generatePlaceholderDataURL = (
  category: 'Book' | 'Merchandise' | 'Game' | string
): string => {
  const configs: Record<string, { bg: string; fg: string; text: string }> = {
    Book: { bg: '#1BDD95', fg: '#FFFFFF', text: 'Book' },
    Merchandise: { bg: '#1a3628', fg: '#FFFFFF', text: 'Merch' },
    Game: { bg: '#F0F0EB', fg: '#1a3628', text: 'Game' },
  };

  const config = configs[category] || { bg: '#E5E5E5', fg: '#666666', text: 'Product' };

  const svg = `
    <svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="800" fill="${config.bg}"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="48"
        font-weight="bold"
        fill="${config.fg}"
      >
        ${config.text}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};
