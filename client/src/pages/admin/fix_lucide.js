const fs = require('fs');
const dir = 'c:/Users/Pawan/OneDrive/Desktop/The Turf/client/src/pages/admin/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const path = dir + file;
  let content = fs.readFileSync(path, 'utf8');

  // get the array of icons used in navItems
  const navItemsMatch = content.match(/const\s+navItems\s*=\s*\[(.*?)\];/s);
  if (navItemsMatch) {
    const navItemsBody = navItemsMatch[1];
    const iconMatches = [...navItemsBody.matchAll(/icon:\s*([A-Za-z0-9_]+)/g)];
    const usedIcons = iconMatches.map(m => m[1]);

    // get the lucide-react import
    const importMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/s);
    if (importMatch) {
      let importedIcons = importMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
      let changed = false;

      usedIcons.forEach(icon => {
        // Handle aliased imports like Settings as SettingsIcon
        let isImported = importedIcons.some(inc => {
          const parts = inc.split(/\s+as\s+/);
          return parts[parts.length - 1] === icon;
        });

        if (!isImported) {
          importedIcons.push(icon);
          changed = true;
          console.log(`Adding ${icon} to ${file}`);
        }
      });

      if (changed) {
        const newImportStr = importedIcons.join(',\n  ');
        const replaced = content.replace(importMatch[0], `import {\n  ${newImportStr}\n} from 'lucide-react'`);
        fs.writeFileSync(path, replaced);
      }
    }
  }
});
