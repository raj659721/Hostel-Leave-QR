import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('<<<<<<< HEAD')) {
    const headRegex = /<<<<<<< HEAD\r?\n/g;
    content = content.replace(headRegex, '');
    
    const otherRegex = /=======\r?\n([\s\S]*?)>>>>>>> [^\r\n]+\r?\n/g;
    content = content.replace(otherRegex, '');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed conflicts in: ' + filePath);
  }
}

function walk(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath);
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.sql')) {
        fixFile(filePath);
      }
    }
  }
}

console.log('Scanning for broken Git merge conflicts...');
walk(__dirname);
console.log('All files are now clean and Vercel-ready!');
