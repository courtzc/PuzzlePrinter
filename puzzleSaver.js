const puppeteer = require('puppeteer');
const path = require('path'); // Import the 'path' module
const { PDFDocument, rgb } = require('pdf-lib');
const { format } = require('date-fns');

// Check if a URL argument is provided
if (process.argv.length !== 4) {
  // node puzzleSaver.js Thermometers https://www.puzzle-thermometers.com/?size=7
  console.error('Usage: node script.js <PuzzleName> <URL>');
  process.exit(1);
}

const puzzleName = process.argv[2];
const url = process.argv[3];

(async () => {

  // Inputs
  // const url = ''; // Replace with your target URL
  // const puzzleName = 'Thermometers';
  const numPuzzles = 50;

  // Known constants
  const cookiePopupSelector = "#qc-cmp2-ui"
  const acceptButtonSelector = '#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button.css-47sehv'

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

  // launch web page
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await delay(500);

  // handle cookie popup
  await handleCookiePopup();

  // reload page
  await page.reload();
  console.log(`Saving ${numPuzzles} puzzles.`)

  // set up puzzle finders
  let puzzleDiv;
  let newButton;
  newButton = await page.$('#btnNew');

  // initialise PDF
  const pdfDoc = await PDFDocument.create();
  const pageHeight = 841.89; 
  const pageWidth = 595;

  let pageDelay = 350;

  for (let i = 0; i < numPuzzles; i++) {
    try
    {
      // Click on new puzzle
      await newButton.evaluate(element => element.click());
      await delay(pageDelay);

      // Gather elements again
      puzzleDiv = await page.$('#puzzleContainerDiv');
      newButton = await page.$('#btnNew');

      // Take a screenshot of element B
      const screenshot = await puzzleDiv.screenshot();

      // Add the puzzle as a new page to the PDF
      const imagePage = pdfDoc.addPage([pageWidth, pageHeight]);
      const imageBytes = await pdfDoc.embedPng(screenshot);
      imagePage.drawImage(imageBytes, {
        x: (pageWidth / 2) - (pageWidth * 0.8 / 2),
        y: (pageHeight / 2) - (pageWidth * 0.8 / 2),
        width: pageWidth * 0.8,
        height: pageWidth * 0.8,
      });
    }
    catch (error)
    {  
      console.error(`Error capturing puzzle ${i}: ${error.message}`);
      i--;
      await page.reload();
      await page.goto(url);
      await delay(500);
      newButton = await page.$('#btnNew');
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
