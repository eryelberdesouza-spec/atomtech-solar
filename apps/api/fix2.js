const fs = require('fs');
const lines = fs.readFileSync('src/db/schema/index.ts', 'utf8').split(/\r?\n/);
const out = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].includes("custoMaoObraModulo: decimal('custo_mao_obra_modulo', { precision: 10")) {
    i += 5;
    continue;
  }
  out.push(lines[i]);
  i++;
}
fs.writeFileSync('src/db/schema/index.ts', out.join('\n'), 'utf8');
console.log('Feito! Total de linhas: ' + out.length);
