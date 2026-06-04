const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const clientDir = "c:\\Users\\Pawan\\OneDrive\\Desktop\\The Turf\\client";
console.log('Scanning client directory:', clientDir);

let filesFixed = 0;

walkDir(clientDir, filePath => {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('tranzinc')) {
            // Replace tranzinc with translate
            let updated = content.replace(/tranzinc/g, 'translate');
            fs.writeFileSync(filePath, updated, 'utf8');
            console.log('Fixed:', filePath);
            filesFixed++;
        }
    }
});

console.log(`Successfully fixed ${filesFixed} files.`);
