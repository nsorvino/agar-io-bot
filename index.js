import puppeteer from 'puppeteer';

// Function to launch a bot
const launchBot = async (botId, url) => {
    const browser = await puppeteer.launch({ headless: false }); // Set to true for headless mode
    const page = await browser.newPage();

    try {
        // url is given as command line argument (e.g. https://agar.io/)
        await page.goto(url, { waitUntil: 'networkidle2' });
        console.log(`Bot ${botId} connected to ${url}.`);
        await page.waitForSelector('#play'); // Replace with actual selector
        await page.click('#play');
        console.log(`Bot ${botId} clicked the Play button!`);
    } catch (error) {
        console.error(`Error with Bot ${botId}:`, error);
    } finally {
        // Optionally close the browser after use
        // await browser.close();
    }
};

// Get number of bots and URL from command-line arguments
const args = process.argv.slice(2);
const url = args[0]; // First argument is the URL
const numBots = parseInt(args[1], 10) || 1; // Second argument is the number of bots, default to 1

if (!url) {
    console.error('Error: No URL provided. Usage: node index.js <url> <numBots>');
    process.exit(1);
}

// Launch the specified number of bots
const startBots = async () => {
    const botPromises = [];
    for (let i = 1; i <= numBots; i++) {
        botPromises.push(launchBot(i, url));
    }
    await Promise.all(botPromises);
    console.log(`${numBots} bot(s) launched to ${url}!`);
};

startBots().catch(console.error);
