/**
 * Script to clear Facebook cache for Open Graph images
 * Run with: node scripts/clear-facebook-cache.js
 */

const BASE_URL = 'https://beroepsbelg.be';
const locales = ['nl', 'en', 'fr', 'de'];

async function clearFacebookCache(url) {
  const apiUrl = `https://graph.facebook.com/?id=${encodeURIComponent(url)}&scrape=true&access_token=`;
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.error) {
      console.log(`❌ ${url}: ${data.error.message}`);
    } else {
      console.log(`✅ ${url}: Cache cleared successfully`);
    }
  } catch (error) {
    console.log(`❌ ${url}: ${error.message}`);
  }
}

async function main() {
  console.log('Clearing Facebook cache for homepage URLs...\n');
  
  for (const locale of locales) {
    const url = `${BASE_URL}/${locale}`;
    await clearFacebookCache(url);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✅ Done! Check Facebook Sharing Debugger to verify:');
  console.log('https://developers.facebook.com/tools/debug/');
}

main();
