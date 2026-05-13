const fs = require('fs'); 
const f = 'src/db/schema/index.ts'; 
let c = fs.readFileSync(f, 'utf8'); 
const lines = c.split('\n'); 
const out = []; 
let skip = 0; 
for (const l of lines) { 
  if (skip  { skip--; continue; } 
  out.push(l); 
} 
fs.writeFileSync(f, out.join('\n'), 'utf8'); 
console.log('OK'); 
