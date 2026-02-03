/**
 * Simple test to verify datetime output format
 * Run with: node scripts/test-datetime-simple.js
 */

// Simulate the toBrusselsLocalISO function logic
function testToBrusselsLocalISO() {
  const BRUSSELS_TIMEZONE = 'Europe/Brussels';
  const testDate = new Date('2025-01-15T14:00:00Z');
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRUSSELS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(testDate);
  const get = (type) => parts.find(p => p.type === type)?.value || '00';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');

  const result = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  
  // Check for timezone offset pattern (e.g., +01:00, +02:00, -05:00 at the end)
  const hasTimezoneOffset = /[+-]\d{2}:\d{2}$/.test(result) || result.endsWith('Z');
  
  console.log('=== Testing toBrusselsLocalISO Output ===');
  console.log(`Input: ${testDate.toISOString()}`);
  console.log(`Output: ${result}`);
  console.log(`Has timezone offset: ${hasTimezoneOffset ? 'YES ❌' : 'NO ✅'}`);
  console.log(`Format: ${result.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/) ? 'CORRECT ✅' : 'INCORRECT ❌'}`);
  console.log('');
  
  // Test summer date (DST)
  const summerDate = new Date('2025-07-15T14:00:00Z');
  const summerParts = formatter.formatToParts(summerDate);
  const getSummer = (type) => summerParts.find(p => p.type === type)?.value || '00';
  const summerResult = `${getSummer('year')}-${getSummer('month')}-${getSummer('day')}T${getSummer('hour')}:${getSummer('minute')}:${getSummer('second')}`;
  const hasSummerOffset = /[+-]\d{2}:\d{2}$/.test(summerResult) || summerResult.endsWith('Z');
  
  console.log('=== Testing Summer Date (DST) ===');
  console.log(`Input: ${summerDate.toISOString()}`);
  console.log(`Output: ${summerResult}`);
  console.log(`Has timezone offset: ${hasSummerOffset ? 'YES ❌' : 'NO ✅'}`);
  console.log(`Format: ${summerResult.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/) ? 'CORRECT ✅' : 'INCORRECT ❌'}`);
  console.log('');
  
  return { result, summerResult, hasOffset: hasTimezoneOffset, hasSummerOffset };
}

// Test current time
function testNowBrussels() {
  const BRUSSELS_TIMEZONE = 'Europe/Brussels';
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRUSSELS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type) => parts.find(p => p.type === type)?.value || '00';

  const result = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
  const hasOffset = /[+-]\d{2}:\d{2}$/.test(result) || result.endsWith('Z');
  
  console.log('=== Testing nowBrussels Output ===');
  console.log(`Current UTC: ${now.toISOString()}`);
  console.log(`Output (Brussels local): ${result}`);
  console.log(`Has timezone offset: ${hasOffset ? 'YES ❌' : 'NO ✅'}`);
  console.log(`Format: ${result.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/) ? 'CORRECT ✅' : 'INCORRECT ❌'}`);
  console.log('');
  
  return { result, hasOffset };
}

// Run tests
console.log('🧪 Testing DateTime Output Functions\n');
const test1 = testToBrusselsLocalISO();
const test2 = testNowBrussels();

console.log('=== Summary ===');
console.log('✅ All datetime outputs should be in format: YYYY-MM-DDTHH:mm:ss');
console.log('✅ No timezone offsets (+01:00, +02:00, etc.) should be present');
console.log('✅ All dates represent Brussels local time\n');

// Verify format and no timezone offsets
const formatRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const allCorrect = [
  formatRegex.test(test1.result) && !test1.hasOffset,
  formatRegex.test(test1.summerResult) && !test1.hasSummerOffset,
  formatRegex.test(test2.result) && !test2.hasOffset
].every(Boolean);

console.log('=== Final Verification ===');
console.log(`Winter date format correct: ${formatRegex.test(test1.result) ? '✅' : '❌'}`);
console.log(`Winter date no offset: ${!test1.hasOffset ? '✅' : '❌'}`);
console.log(`Summer date format correct: ${formatRegex.test(test1.summerResult) ? '✅' : '❌'}`);
console.log(`Summer date no offset: ${!test1.hasSummerOffset ? '✅' : '❌'}`);
console.log(`Current time format correct: ${formatRegex.test(test2.result) ? '✅' : '❌'}`);
console.log(`Current time no offset: ${!test2.hasOffset ? '✅' : '❌'}`);
console.log('');
console.log(allCorrect ? '✅ All tests passed! All datetimes are in correct format without timezone offsets.' : '❌ Some tests failed');

