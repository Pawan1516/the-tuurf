const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'client', 'src', 'pages', 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(adminDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Remove the aside block completely
  content = content.replace(/\{\/\*\s*Sidebar\s*\(Desktop( Only)?\)\s*\*\/\}\s*<aside[\s\S]*?<\/aside>/g, '');
  
  // Remove desktop-only headers
  content = content.replace(/\{\/\*\s*Header\s*\(Desktop Only\)\s*\*\/\}\s*<header className="hidden md:flex[\s\S]*?<\/header>/g, '');

  // Remove other isolated <aside>
  content = content.replace(/<aside\s+className="hidden md:flex[\s\S]*?<\/aside>/g, '');
  
  // Remove flex flex-col md:flex-row classes and just use flex-col
  content = content.replace(/flex flex-col md:flex-row/g, 'flex flex-col');

  // Change md:p-10 and md:px-10 and other desktop-specific paddings if we want, but keeping them is fine for large screen mobile UI
  // Add mobile bottom padding to main to prevent overlapping with bottom tab bar
  content = content.replace(/<main className="(flex-1 overflow-y-auto( relative)?)"/g, '<main className="$1 pb-24"');

  // Any explicit md:hidden on headers inside pages? Let's leave them if they are custom mobile headers. Most admin pages just have <MobileNav>!
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Processed', file);
});

console.log('Done tweaking pages.');
