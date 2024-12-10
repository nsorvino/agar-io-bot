import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility function to introduce a delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to handle the bot's actions, including death and restart
const playGame = async (url, page, botId) => {
    // Navigate to the given URL
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log(`Bot ${botId} connected to ${url}.`);

    try {
        // Wait for the Play button and click it
        await page.waitForSelector('#play', { visible: true }); // Replace with actual selector for Play button
        await page.click('#play');
        console.log(`Bot ${botId} clicked the Play button!`);

        // Simulate a click to move bot -- NOT WORKING
        try {
            const canvasElement = await page.$('canvas'); // Selector for the canvas
            if (canvasElement) {
                
                const canvasBox = await canvasElement.boundingBox();
                if (canvasBox) {
                    // Calculate the coordinates
                    const x = canvasBox.x + canvasBox.width - 20;
                    const y = canvasBox.y + 20;

                    // Simulate a mouse click at the calculated coordinates
                    await page.mouse.click(x, y);
                    console.log(`Bot ${botId} clicked at the calculated coordinates.`);
                }
            }
        } catch (err) {
            console.log(`Bot ${botId} failed to click at the calculated coordinates. Error: ${err.message}`);
        }

        // Enter main loop
        let loopCount = 0;
        let optOutClicked = false;
        while (true) {
            console.log(`Bot ${botId} loop count ${loopCount++}`);

            try {

                // Step 1: Check for the Opt-Out button once
                if (!optOutClicked) {
                    const optOutButton = await page.waitForSelector('.fc-cta-opt-out', {
                        visible: true,
                        timeout: 1000, // Check for up to 1 second
                    }).catch(() => null); // Ignore timeout errors if the button isn't found
    
                    if (optOutButton) {
                        console.log(`Bot ${botId} detected the Opt-Out button. Clicking it...`);
                        try {
                            await optOutButton.click();
                            optOutClicked = true;
                            console.log(`Bot ${botId} successfully clicked the Opt-Out button.`);
                        } catch (err) {
                            console.log(`Bot ${botId} failed to click the Opt-Out button. Error: ${err.message}`);
                        }
                    } else {
                        console.log(`Bot ${botId} did not find the Opt-Out button this loop.`);
                    }
                }

                // Step 2: Check for the Play button or Continue button and click if visible
                console.log(`Bot ${botId} waiting indefinitely for either the Play button or Continue button...`);
                let buttonType = null; // To track which button was found
                let buttonElement = null;
                while (!buttonElement) {
                    try {
                        buttonElement = await Promise.race([
                            page.waitForSelector('#play', {
                                visible: true, 
                                timeout: 0, // No timeout, wait indefinitely
                            }).then((element) => {
                                buttonType = 'play';
                                return element;
                            }),
                            page.waitForSelector('#statsContinue', {
                                visible: true, 
                                timeout: 0, // No timeout, wait indefinitely
                            }).then((element) => {
                                buttonType = 'continue';
                                return element;
                            }),
                        ]);
                    } catch (err) {
                        console.log(`Error waiting for buttons: ${err.message}`);
                    }
                }

                if (buttonType === 'play' && buttonElement) {
                    console.log(`Bot ${botId} detected the Play button. Clicking it and skipping to the next loop...`);
                    try {
                        await buttonElement.click();
                        console.log(`Bot ${botId} clicked the Play button.`);
                        continue; // Skip the rest of the loop and start over
                    } catch (err) {
                        console.log(`Bot ${botId} failed to click the Play button. Error: ${err.message}`);
                    }
                }

                if (buttonType === 'continue' && buttonElement) {
                    console.log(`Bot ${botId} detected the Continue button. Clicking it...`);
                    try {
                        await buttonElement.click();
                        console.log(`Bot ${botId} clicked the Continue button.`);
                    } catch (err) {
                        console.log(`Bot ${botId} failed to click the Continue button. Error: ${err.message}`);
                    }
                }

                // Step 2: Press Escape twice to close any canvas-based popups
                console.log(`Bot ${botId} pressing Escape twice to close potential popups.`);
                try {
                    await page.keyboard.press('Escape');
                    console.log(`Bot ${botId} pressed the Escape key once.`);
                    await delay(1000); // 1-second delay between presses
                    await page.keyboard.press('Escape');
                    console.log(`Bot ${botId} pressed the Escape key a second time.`);
                } catch (err) {
                    console.log(`Bot ${botId} failed to press Escape. Error: ${err.message}`);
                }

                // Step 3: Click the Play button to restart the game
                console.log(`Bot ${botId} attempting to restart the game.`);
                await page.waitForSelector('#play', {
                    visible: true,
                    timeout: 1000, // 1-second timeout
                }).catch(() => null); // Return null if not found within the timeout
                await page.click('#play');
                console.log(`Bot ${botId} clicked the Play button to restart.`);
            } catch (err) {
                console.log(`Error checking for popups or buttons for Bot ${botId}: ${err.message}`);
            }

            // Add a short delay to avoid overwhelming the page
            await delay(1000);
        }
    } catch (error) {
        console.error(`Error in Bot ${botId}'s game loop: ${error.message}`);
    }
};

// Function to launch a bot
const launchBot = async (botId, url) => {
    const extensionPath = path.resolve(__dirname, './adblock-plus'); // Location of manifest file for ad block extension
    const browser = await puppeteer.launch({ 
        headless: false, // Set to true for headless mode
        args: [
            `--disable-extensions-except=${extensionPath}`, // Load only ad block extension
            `--load-extension=${extensionPath}` // Specify the extension folder to load
        ],
        
    });
    
    // Get the list of all browser pages (tabs)
    const pages = await browser.pages();
    const page = pages[0]; // Default first page

    console.log(pages);

    try {
        // Open the extensions menu by simulating a click on the extensions button
        await page.goto('chrome://extensions/', { waitUntil: 'networkidle2' });
        console.log(`Navigated to extensions page for Bot ${botId}.`);

        // Wait for the welcome tab to open
        const newPagePromise = new Promise(resolve =>
            browser.once('targetcreated', target => resolve(target.page()))
        );
        const welcomePage = await newPagePromise;

        console.log(`Welcome tab opened for Bot ${botId}.`);
        
        try {
            await welcomePage.waitForSelector('.installed-main__block-1__image-1', {
                timeout: 10000
            });
            console.log(`Welcome tab fully loaded for Bot ${botId}.`);
        } catch (error) {
            console.error(`Failed to load the welcome tab in time for Bot ${botId}:`, error);
        }

        // Forced delay to stop installation page from popping up
        await delay(2000);
        
        // Close the welcome tab
        await welcomePage.close();
        console.log(`Welcome tab closed for Bot ${botId}.`);

        // Continue with game logic
        await playGame(url, page, botId);
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
