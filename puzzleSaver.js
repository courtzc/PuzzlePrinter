const puppeteer = require('puppeteer');
const path = require('path'); // Import the 'path' module


// Define the URL you want to navigate to.
const url = 'https://www.puzzle-thermometers.com/?size=7'; // Replace with your target URL
const puzzleName = 'Thermometers';
const numPuzzles = 3;
let counter = 3;

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const delay = ms => new Promise(res => setTimeout(res, ms));

    const cookiePopupSelector = "#qc-cmp2-ui"
    const acceptButtonSelector = '#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button.css-47sehv'

    // Define your elements here, e.g., by CSS selector.
    await delay(500);

    console.log("dealing with popup...")

    const handleCookiePopup = async () => {
        const popup = await page.$(cookiePopupSelector);
    
        if (popup) {
          const button = await popup.$(acceptButtonSelector);
          if (button) {
            button.click();
            console.log('Clicked the "Accept" button on the cookie pop-up.');
            await delay(500);
            console.log("Waited 2s");
          } else {
            console.error('Button not found within the pop-up.');
          }
        } else {
          console.log("Cookie pop-up not found.");
        }
    };

    await handleCookiePopup();

    console.log("waiting for the popup to go away...")
    await page.reload()
    // await delay(3000)
    console.log("finding the puzzle...")
    // const elementCookiePopupAccept = await page.$(acceptButton)
    const elementA = await page.$('#puzzleForm > div.noprint.puzzleButtons');
    const elementB = await page.$('#puzzleContainerDiv');
    const elementC = await page.$('#btnNew');

    if (elementB)
    {
        const textB = await page.evaluate(el => el.textContent, elementB);
        console.log('Text from the puzzle:', textB);
    } else {
        console.log('Puzzle not found after accepting cookies.');
    }

    if (elementA)
    {
        const textA = await page.evaluate(el => el.textContent, elementA);
        console.log('Text from all puzzle buttons:', textA);
    } else {
        console.log('all puzzle button not found after accepting cookies.');
    }

    if (elementC)
    {
        const textC = await page.evaluate(el => el.textContent, elementC);
        // console.log("Value of 'btnNew' element:", elementC.value);
        console.log("'btnNew' element:", elementC);
        const elementInfo = await elementC.evaluate(el => {
            return {
              tagName: el.tagName,
              id: el.id,
              className: el.className,
              // Add more properties as needed
            };
          });
          
          console.log("Element Info:", elementInfo);
    } else {
        console.log('new puzzle button not found after accepting cookies.');
    }
  
    
    console.log(`saving ${numPuzzles} puzzles...`)

    let puzzleDiv;
    let newButton;
    newButton = await page.$('#btnNew');

    for (let i = 0; i < numPuzzles; i++) {

        try
        {
            console.log("Clicking on new puzzle...")
            await newButton.evaluate(element => element.click());
            await delay(1000);

            console.log("Gathering elements again...")
            puzzleDiv = await page.$('#puzzleContainerDiv');
            newButton = await page.$('#btnNew');

             // Take a screenshot of element B
            console.log("Taking a screenshot of puzzle...")
            await puzzleDiv.screenshot({ path: path.join(__dirname, `${puzzleName}_${counter}.png`) }); // Save screenshot in the script's directory

            const boundingBox = await puzzleDiv.boundingBox();
            const pageHeight = 841.89; // Height of A4 page in points (11.69 inches)

            
            await page.pdf({
                path: `${puzzleName}_${counter}.pdf`,
                format: 'A4',
                margin: {
                    top: `${pageHeight/2 - boundingBox.height / 2}px`, // Halfway down the page
                    left: '0',
                    right: '0',
                    bottom: '0',
                  },
              });

            console.log(`Successfully captured screenshot ${i}`);
            await delay(100); // 0.1 second delay, adjust as needed
            counter++;
        }
        catch (error)
        {  
            console.error(`Error capturing screenshot ${i}: ${error.message}`);
        }

    }

    await browser.close();
})();
