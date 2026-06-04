const fs = require('fs');
const path = require('path');
const parser = require('./client/node_modules/@babel/parser');
const file = path.resolve('client/src/pages/LiveScoreView.jsx');
const src = fs.readFileSync(file, 'utf8');
try {
  parser.parse(src, { sourceType: 'module', plugins: ['jsx', 'optionalChaining'] });
  console.log('PARSE OK');
} catch (e) {
  console.error('PARSE ERROR');
  console.error(e.message);
  console.error(e.loc);
  // continue to run brace checker
}

// Additional: simple brace/paren counter to locate imbalance
const lines = src.split(/\r?\n/);
// Improved scanner: ignore braces inside strings, template literals, and comments
let curl = 0, par = 0;
const curlStack = [];
let inSingle = false, inDouble = false, inTemplate = false, inLineComment = false, inBlockComment = false;
for (let i = 0; i < src.length; i++) {
  const ch = src[i];
  const next = src[i+1];
  // handle comments
  if (!inSingle && !inDouble && !inTemplate) {
    if (!inBlockComment && ch === '/' && next === '/') { inLineComment = true; i++; continue; }
    if (!inLineComment && ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
  }
  if (inLineComment) { if (ch === '\n') inLineComment = false; continue; }
  if (inBlockComment) { if (ch === '*' && next === '/') { inBlockComment = false; i++; } continue; }

  // handle string/template literal entry/exit
  if (!inSingle && !inDouble && ch === '`') { inTemplate = !inTemplate; continue; }
  if (!inTemplate && !inDouble && ch === "'") { inSingle = !inSingle; continue; }
  if (!inTemplate && !inSingle && ch === '"') { inDouble = !inDouble; continue; }
  if (inTemplate) { if (ch === '$' && next === '{') { // treat ${ as enter expression
      // push a marker so braces inside expression are counted normally
      curlStack.push({line: src.slice(0,i).split(/\r?\n/).length, col: 0, tmplExpr: true});
      i++; // skip '{'
      curl++;
      continue;
    } else { continue; } }
  if (inSingle || inDouble) continue;

  // normal counting
  if (ch === '{') { curl++; curlStack.push({line: src.slice(0,i).split(/\r?\n/).length, col: (i - src.lastIndexOf('\n', i-1))}); }
  else if (ch === '}') { curl--; const popped = curlStack.pop(); }
  else if (ch === '(') par++;
  else if (ch === ')') par--;
  if (curl < 0 || par < 0) { console.log('imbalance at index', i, 'line', src.slice(0,i).split(/\r?\n/).length); break; }
}
console.log('final counts -> curl', curl, 'par', par);
if (curlStack.length) console.log('last unclosed { at', curlStack[curlStack.length-1]);

// count backticks
const backtickCount = (src.match(/`/g) || []).length;
console.log('backtick count:', backtickCount);

// print context around parser error position if available
try {
  const err = require('./client/node_modules/@babel/parser').parse.bind(null);
} catch (ex) {}
// manually output surrounding text at reported index 64432 (from earlier parse)
const idx = 64432;
if (idx && idx < src.length) {
  const from = Math.max(0, idx - 200);
  const to = Math.min(src.length, idx + 200);
  console.log('\n--- CONTEXT AROUND INDEX', idx, '---\n');
  console.log(src.slice(from, to));
}

// Find earliest line where parser fails
const parserModule = require('./client/node_modules/@babel/parser');
for (let L = 50; L <= lines.length; L += 10) {
  const snippet = lines.slice(0, L).join('\n');
  try {
    parserModule.parse(snippet, { sourceType: 'module', plugins: ['jsx', 'optionalChaining'] });
  } catch (e) {
    console.log('parser failed at approx line', L, 'message:', e.message);
    break;
  }
}

// Try removing 40-line segments to see which region causes failure
const seg = 40;
for (let start = 1; start < lines.length; start += seg) {
  const test = [...lines.slice(0, start-1), ...lines.slice(start-1+seg)].join('\n');
  try {
    parserModule.parse(test, { sourceType: 'module', plugins: ['jsx', 'optionalChaining'] });
    console.log('Parsing succeeds when removing segment lines', start, 'to', Math.min(lines.length, start-1+seg));
    break;
  } catch (e) {
    // continue
  }
}

// Narrow down: try removing each individual line in suspect range 840-880
for (let ln = 840; ln <= 880; ln++) {
  const test = [...lines.slice(0, ln-1), ...lines.slice(ln)].join('\n');
  try {
    parserModule.parse(test, { sourceType: 'module', plugins: ['jsx', 'optionalChaining'] });
    console.log('Parsing succeeds when removing single line', ln);
    break;
  } catch (e) {
    // continue
  }
}
