const fs = require('fs');
const path = require('path');

const targetDirs = [
    path.join(__dirname, 'client/src'),
    path.join(__dirname, 'server')
];

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === 'build') continue;
            processDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Replace standard new Date().toISOString() split logic
            if (content.includes("toISOString().split('T')[0]")) {
                content = content.replace(/new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/g, "new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())");
                content = content.replace(/new Date\((.*?)\)\.toISOString\(\)\.split\('T'\)\[0\]/g, "new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date($1))");
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated timezone logic in: ${fullPath}`);
            }
        }
    }
}

targetDirs.forEach(processDir);
console.log('Timezone correction complete.');
