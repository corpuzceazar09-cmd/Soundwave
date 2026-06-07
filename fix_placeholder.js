const fs = require('fs');
const filePath = 'Soundwave/src/app/index.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find all placeholder= occurrences and log their char codes
let idx = 0;
let count = 0;
while ((idx = content.indexOf('placeholder="', idx)) !== -1) {
  count++;
  const snippet = content.substring(idx, idx + 50);
  const charCodes = [...snippet].map(c => c.charCodeAt(0));
  console.log(`\nOccurrence ${count} at index ${idx}:`);
  console.log('snippet:', JSON.stringify(snippet));
  console.log('char codes:', charCodes);
  idx += 13;
}
