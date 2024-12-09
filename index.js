import puppeteer from 'puppeteer';

// Utility function to introduce a delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to handle the bot's actions, including death and restart
const playGame = async (page, botId) => {
    try {
        // Wait for the Play button and click it
        await page.waitForSelector('#play', { visible: true }); // Replace with actual selector for Play button
        await page.click('#play');
        console.log(`Bot ${botId} clicked the Play button!`);

        let checkCount = 0;
        while (true) {
            console.log(`check ${checkCount++}`);
            // Check if the bot has died by detecting if the Continue button is visible
            try {
                const continueButton = await page.$('#statsContinue'); // Replace with actual selector
                if (continueButton) {
                    const isVisible = await page.evaluate(
                        (btn) => btn.offsetParent !== null,
                        continueButton
                    );

                    if (isVisible) {
                        console.log(`Bot ${botId} died. Clicking Continue and restarting...`);
                        
                        const box = await continueButton.boundingBox();
                        if (box) {
                            await continueButton.click();

                            // Wait for the Play button and click it again
                            await page.waitForSelector('#play', { visible: true });
                            await page.click('#play');
                            console.log(`Bot ${botId} restarted the game!`);
                        } else {
                            console.log(`Bot ${botId}: Continue button is not clickable.`);
                        }
                    } else {
                        console.log(`Bot ${botId} is still alive.`);
                    }
                } else {
                    console.log(`Bot ${botId} is still alive.`);
                }
            } catch (err) {
                console.log(`Error checking for Continue button for Bot ${botId}:`, err);
            }

            // Add a short delay to avoid overwhelming the page
            await delay(1000);
        }
    } catch (error) {
        console.error(`Error in Bot ${botId}'s game loop:`, error);
    }
};

// Function to launch a bot
const launchBot = async (botId, url) => {
    const browser = await puppeteer.launch({ 
        headless: false, // Set to true for headless mode
    });
    const page = await browser.newPage();

    try {
        // Navigate to the given URL
        await page.goto(url, { waitUntil: 'networkidle2' });
        console.log(`Bot ${botId} connected to ${url}.`);

        // Start the game and handle death/restart logic
        await playGame(page, botId);
    } catch (error) {
        console.error(`Error with Bot ${botId}:`, error);
    } finally {
        console.log(`Bot ${botId} closing browser.`);
        await browser.close();
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
