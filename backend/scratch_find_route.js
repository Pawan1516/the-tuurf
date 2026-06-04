const fs = require('fs');

const content = fs.readFileSync('c:/Users/Pawan/OneDrive/Desktop/The Turf/client/src/pages/ScoringDashboard.jsx', 'utf8');
const lines = content.split('\n');

console.log('Finding toss references in ScoringDashboard.jsx...');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("toss")) {
        console.log(`Line ${i + 1}: ${lines[i]}`);
    }
}
