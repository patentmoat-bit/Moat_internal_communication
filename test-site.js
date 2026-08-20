import puppeteer from 'puppeteer';

(async () => {
  console.log("Starting browser...");
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  console.log("Navigating to https://moat-internal-communication-79bc.vercel.app/login...");
  await page.goto('https://moat-internal-communication-79bc.vercel.app/login', { waitUntil: 'networkidle0' });
  
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  console.log("HTML classes:", await page.evaluate(() => document.documentElement.className));
  console.log("Body classes:", await page.evaluate(() => document.body.className));
  
  await browser.close();
  console.log("Done.");
})();
