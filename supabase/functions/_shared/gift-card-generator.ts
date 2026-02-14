/**
 * Gift Card Code Generator
 * Generates secure, unique gift card codes in format: XXXX-XXXX-XXXX-XXXX
 */

export function generateGiftCardCode(): string {
  // Generate 16 characters using crypto
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
  let code = '';
  
  for (let i = 0; i < 16; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  // Format as XXXX-XXXX-XXXX-XXXX
  return code.match(/.{1,4}/g)?.join('-') || code;
}

export async function generateUniqueGiftCardCode(
  supabase: any,
  maxAttempts = 10
): Promise<string> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const code = generateGiftCardCode();
    
    // Check if code exists in database
    const { data, error } = await supabase
      .from('gift_cards')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking gift card code uniqueness:', error);
      throw new Error('Failed to check code uniqueness');
    }
    
    if (!data) {
      // Code is unique
      return code;
    }
    
    attempts++;
  }
  
  throw new Error('Failed to generate unique gift card code after maximum attempts');
}
