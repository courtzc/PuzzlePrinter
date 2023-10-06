const puppeteer = require('puppeteer');
const path = require('path'); // Import the 'path' module
const { PDFDocument, rgb } = require('pdf-lib');
const { format } = require('date-fns');
const fs = require('fs');
const sharp = require('sharp'); // Import the sharp library

// Check if a URL argument is provided
if (process.argv.length !== 3) {

  console.error('Usage: node script.js <json file>');
  process.exit(1);
}

const configFile = process.argv[2];

function runScript(puzzleName, url) {

  (async () => {

    // inputs
    const numPuzzles = 3;
    console.log(`Now printing ${numPuzzles} ${puzzleName} puzzles.`)

    // known constants
    const cookiePopupSelector = "#qc-cmp2-ui"
    const acceptButtonSelector = '#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button.css-47sehv'

    // functions
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const handleCookiePopup = async () => {
      
      const popup = await page.$(cookiePopupSelector);
      if (popup) {
        const button = await popup.$(acceptButtonSelector);
        if (button) {
          button.click();
          console.log('Clicked the "Accept" button on the cookie pop-up.');
          await delay(200);
        } else {
          console.error('"Accept" button not found within the cookie pop-up.');
        }
      } else {
        console.log("Cookie pop-up not found.");
      }
    };

    // logic

    // launch web page
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    await delay(500);

    // handle cookie popup
    await handleCookiePopup();

    // reload page
    await page.reload();

    // set up puzzle finders
    let puzzleDiv;
    let puzzleInfoDiv;
    let puzzleTitleDiv;
    let newPuzzleButton;
    newPuzzleButton = await page.$('#btnNew');

    // initialise PDF
    const pdfDoc = await PDFDocument.create();
    const pageHeight = 841.89; // px
    const pageWidth = 595; // px
    const puzzlePosX = (pageWidth / 2) - (pageWidth * 0.8 / 2); // px
    const puzzlePosY = (pageHeight / 2) - (pageWidth * 0.8 / 2); // px
    const pageDelay = 350; // ms

    // save puzzles
    console.log(`Saving ${numPuzzles} puzzles.`)

    for (let i = 0; i < numPuzzles; i++) {
      try
      {
        // Click on new puzzle
        await newPuzzleButton.evaluate(element => element.click());
        await delay(pageDelay);

        // Gather elements again
        puzzleDiv = await page.$('#puzzleContainerDiv');
        puzzleInfoDiv = await page.$('#puzzleForm > div.puzzleInfo');
        puzzleTitleDiv = await page.$('#logoLink > img');
        newPuzzleButton = await page.$('#btnNew');

        // Take screenshots, with puzzle zoomed in
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 3 });
        const screenshotPuzzle = await puzzleDiv.screenshot();
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
        const screenshotInfo = await puzzleInfoDiv.screenshot();
        const screenshotTitle = await puzzleTitleDiv.screenshot();


        // Get image sizes
        const titleImage = sharp(screenshotTitle);
        const { width: titleWidth, height: titleHeight } = await titleImage.metadata();
        const infoImage = sharp(screenshotInfo);
        const { width: infoWidth, height: infoHeight } = await infoImage.metadata();


        // Add the puzzle as a new page to the PDF
        const imagePage = pdfDoc.addPage([pageWidth, pageHeight]);
        const imageBytesPuzzle = await pdfDoc.embedPng(screenshotPuzzle);
        const imageBytesInfo = await pdfDoc.embedPng(screenshotInfo);
        const imageBytesTitle = await pdfDoc.embedPng(screenshotTitle);

    
        imagePage.drawImage(imageBytesPuzzle, {
          x: puzzlePosX,
          y: puzzlePosY,
          width: pageWidth * 0.8,
          height: pageWidth * 0.8,
        });

        imagePage.drawImage(imageBytesInfo, {
          x: (pageWidth / 2) - (infoWidth / 2),
          y: 50,
          width: infoWidth,
          height: infoHeight,
        });

        imagePage.drawImage(imageBytesTitle, {
          x: (pageWidth / 2) - (titleWidth / 2),
          y: pageHeight * 0.85,
          width: titleWidth,
          height: titleHeight,
        });

      }
      catch (error)
      {  
        console.error(`Error capturing puzzle ${i}: ${error.message}`);
        //i--;
        await page.reload();
        await page.goto(url);
        await delay(500);
        newPuzzleButton = await page.$('#btnNew');
      }
    }

    // Save the combined PDF with all the puzzles
    const pdfBytes = await pdfDoc.save();
    await browser.close();

    const currentDate = format(new Date(), 'yyyyMMdd');
    const filename = `puzzles/${puzzleName}_puzzles_${currentDate}.pdf`;

    console.log(`Saving PDF to ${filename}.`)

    // Write the PDF to a file
    const fs = require('fs');
    fs.writeFileSync(filename, pdfBytes);
  })();
}

// Read and parse the JSON data file
fs.readFile(configFile, 'utf8', (err, data) => {
  if (err) {
    console.error(`Error reading JSON file: ${err}`);
    process.exit(1);
  }

  try {
    const puzzleData = JSON.parse(data);

    // Loop through the JSON data and run the script for each puzzle
    for (const puzzle of puzzleData) {
      runScript(puzzle.puzzleName, puzzle.url);
    }
  } catch (jsonError) {
    console.error(`Error parsing JSON: ${jsonError}`);
    process.exit(1);
  }
});
