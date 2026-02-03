/**
 * Test script to verify datetime output from all booking creation functions
 * Run with: npx tsx scripts/test-datetime-output.ts
 */

import { 
  toBrusselsLocalISO, 
  toBrusselsISO, 
  parseBrusselsDateTime, 
  addMinutesBrussels,
  nowBrussels 
} from '../lib/utils/timezone';

console.log('=== Testing DateTime Output Functions ===\n');

// Test 1: toBrusselsLocalISO (should NOT have timezone offset)
console.log('1. Testing toBrusselsLocalISO:');
const testDate1 = new Date('2025-01-15T14:00:00Z');
const result1 = toBrusselsLocalISO(testDate1);
console.log(`   Input: ${testDate1.toISOString()}`);
console.log(`   Output: ${result1}`);
console.log(`   ✅ Has timezone offset: ${result1.includes('+') || result1.includes('-') ? 'NO (correct)' : 'YES (wrong)'}`);
console.log(`   Expected format: YYYY-MM-DDTHH:mm:ss (no offset)\n`);

// Test 2: toBrusselsISO (should have timezone offset - deprecated but still works)
console.log('2. Testing toBrusselsISO (deprecated):');
const testDate2 = new Date('2025-01-15T14:00:00Z');
const result2 = toBrusselsISO(testDate2);
console.log(`   Input: ${testDate2.toISOString()}`);
console.log(`   Output: ${result2}`);
console.log(`   ⚠️  Has timezone offset: ${result2.includes('+') || result2.includes('-') ? 'YES (expected)' : 'NO (unexpected)'}\n`);

// Test 3: parseBrusselsDateTime + toBrusselsLocalISO
console.log('3. Testing parseBrusselsDateTime + toBrusselsLocalISO:');
const parsedDate = parseBrusselsDateTime('2025-01-15', '14:00');
const result3 = toBrusselsLocalISO(parsedDate);
console.log(`   Input: Date: 2025-01-15, Time: 14:00`);
console.log(`   Parsed Date: ${parsedDate.toISOString()}`);
console.log(`   Output: ${result3}`);
console.log(`   ✅ Has timezone offset: ${result3.includes('+') || result3.includes('-') ? 'NO (correct)' : 'YES (wrong)'}\n`);

// Test 4: addMinutesBrussels
console.log('4. Testing addMinutesBrussels:');
const testDate4 = parseBrusselsDateTime('2025-01-15', '14:00');
const result4 = addMinutesBrussels(testDate4, 120);
console.log(`   Input: 2025-01-15 14:00 + 120 minutes`);
console.log(`   Output: ${result4}`);
console.log(`   ✅ Has timezone offset: ${result4.includes('+') || result4.includes('-') ? 'NO (correct)' : 'YES (wrong)'}\n`);

// Test 5: nowBrussels
console.log('5. Testing nowBrussels:');
const result5 = nowBrussels();
console.log(`   Output: ${result5}`);
console.log(`   ✅ Has timezone offset: ${result5.includes('+') || result5.includes('-') ? 'NO (correct)' : 'YES (wrong)'}\n`);

// Test 6: Different dates (winter vs summer DST)
console.log('6. Testing DST handling (winter vs summer):');
const winterDate = new Date('2025-01-15T14:00:00Z'); // Winter (CET, UTC+1)
const summerDate = new Date('2025-07-15T14:00:00Z'); // Summer (CEST, UTC+2)

const winterResult = toBrusselsLocalISO(winterDate);
const summerResult = toBrusselsLocalISO(summerDate);

console.log(`   Winter (Jan 15, 2025): ${winterResult}`);
console.log(`   ✅ No timezone offset: ${!winterResult.includes('+') && !winterResult.includes('-')}`);
console.log(`   Summer (Jul 15, 2025): ${summerResult}`);
console.log(`   ✅ No timezone offset: ${!summerResult.includes('+') && !summerResult.includes('-')}\n`);

// Test 7: Edge case - date string without timezone
console.log('7. Testing edge case - date string without timezone:');
const dateStr = '2025-01-15T14:00:00';
const result7 = toBrusselsLocalISO(dateStr);
console.log(`   Input: ${dateStr}`);
console.log(`   Output: ${result7}`);
console.log(`   ✅ Has timezone offset: ${result7.includes('+') || result7.includes('-') ? 'NO (correct)' : 'YES (wrong)'}\n`);

console.log('=== Test Summary ===');
console.log('All datetime outputs should be in format: YYYY-MM-DDTHH:mm:ss');
console.log('No timezone offsets (+01:00, +02:00, etc.) should be present.');
console.log('All dates represent Brussels local time.');

