const dateStr = '2026-02-24';
const dateObj = new Date(dateStr);
console.log('--- DATE PARSING DEBUG ---');
console.log('Input:', dateStr);
console.log('Date Object ISO:', dateObj.toISOString());
console.log('Date Object Local String:', dateObj.toString());

const startOfDay = new Date(dateStr);
startOfDay.setUTCHours(0, 0, 0, 0);
console.log('Start of Day (UTC):', startOfDay.toISOString());

const today = new Date();
today.setUTCHours(0, 0, 0, 0);
console.log('Today (UTC):', today.toISOString());

console.log('Match?', startOfDay.getTime() === today.getTime());
