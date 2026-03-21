const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
    
    // Test both routes. Wait 3 seconds to see if it mounts.
    console.log("Testing LiveScoreView...");
    await page.goto('http://localhost:3000/live/65faea1c9b24b8915ad3abcd'); // Mock ID
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Testing ScoringDashboard...");
    await page.goto('http://localhost:3000/scorer/65faea1c9b24b8915ad3abcd');
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
})();
