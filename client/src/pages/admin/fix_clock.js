const fs = require('fs');
const dir = 'c:/Users/Pawan/OneDrive/Desktop/The Turf/client/src/pages/admin/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const path = dir + file;
  let content = fs.readFileSync(path, 'utf8');
  if (content.includes('Clock') && content.includes('lucide-react')) {
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/s;
    const match = content.match(importRegex);
    if (match && !match[1].includes('Clock')) {
      const replaced = content.replace(importRegex, "import { " + match[1].trim() + ", Clock } from 'lucide-react'");
      fs.writeFileSync(path, replaced);
      console.log('Fixed', file);
    }
  }
});
