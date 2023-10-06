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

const delay = ms => new Promise(res => setTimeout(res, ms));

const launchBrowser = async (url) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await delay(500);
  return { browser, page }
}

const handleCookiePopup = async (page) => {
      
  // known constants
  const cookiePopupSelector = "#qc-cmp2-ui"
  const acceptButtonSelector = '#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button.css-47sehv'

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
  await page.reload();
};

const captureScreenshots = async (page) => {
    // Gather elements again
    const puzzleDiv = await page.$('#puzzleContainerDiv');
    const puzzleInfoDiv = await page.$('#puzzleForm > div.puzzleInfo');
    const puzzleTitleDiv = await page.$('#logoLink > img');
  
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 3 });
    const screenshotPuzzle = await puzzleDiv.screenshot();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 5 });
    const screenshotInfo = await puzzleInfoDiv.screenshot();
    const screenshotTitle = await puzzleTitleDiv.screenshot();

    return { screenshotPuzzle, screenshotInfo, screenshotTitle }
}


const drawImages = async (pdfDoc, screenshotPuzzle, screenshotInfo, screenshotTitle) => {

  // Get image sizes
  const titleImage = sharp(screenshotTitle);
  const { width: titleWidth, height: titleHeight } = await titleImage.metadata();
  const infoImage = sharp(screenshotInfo);
  const { width: infoWidth, height: infoHeight } = await infoImage.metadata();

  const pageHeight = 3508; // px
  const pageWidth = 2480; // px
  const puzzlePosX = (pageWidth / 2) - (pageWidth * 0.8 / 2); // px
  const puzzlePosY = (pageHeight / 2) - (pageWidth * 0.8 / 2); // px

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
    y: 200,
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


const addTitlePage = async (pdfDoc, page) => {

  const pageHeight = 3508; // px
  const pageWidth = 2480; // px

  const imagePage = pdfDoc.addPage([pageWidth, pageHeight]);

  const puzzleTitleDiv = await page.$('#logoLink > img');
  const puzzleRulesDiv = await page.$('#rules');

  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 6 });
  const screenshotTitle = await puzzleTitleDiv.screenshot();
  const screenshotRules = await puzzleRulesDiv.screenshot();

  const titleImage = sharp(screenshotTitle);
  const { width: titleWidth, height: titleHeight } = await titleImage.metadata();
  const rulesImage = sharp(screenshotRules);
  const { width: rulesWidth, height: rulesHeight } = await rulesImage.metadata();

  const rulesAspectRatio = rulesHeight / rulesWidth;
  const rulesNewWidth = (pageHeight * 0.5) / rulesAspectRatio

  const imageBytesTitle = await pdfDoc.embedPng(screenshotTitle);
  const imageBytesRules = await pdfDoc.embedPng(screenshotRules);

  imagePage.drawImage(imageBytesTitle, {
    x: (pageWidth / 2) - (titleWidth / 2),
    y: pageHeight * 0.85,
    width: titleWidth,
    height: titleHeight,
  });

  imagePage.drawImage(imageBytesRules, {
    x: (pageWidth / 2) - (rulesNewWidth / 2),
    y: pageHeight * 0.2,
    width: rulesNewWidth,
    height: pageHeight * 0.5,
  });

}

const savePdf = async (pdfDoc, puzzleName) => {
    // Save the combined PDF with all the puzzles
    const pdfBytes = await pdfDoc.save();

    const currentDate = format(new Date(), 'yyyyMMdd');
    const filename = `../puzzles/${puzzleName}_puzzles_${currentDate}.pdf`;
  
    console.log(`Saving PDF to ${filename}.`)
  
    // Write the PDF to a file
    const fs = require('fs');
    fs.writeFileSync(filename, pdfBytes);
}

const printPuzzleSet = async (puzzleName, url, numPuzzles) => {

  console.log(`Now printing ${numPuzzles} ${puzzleName} puzzles.`)

  // launch web page
  const { browser, page } = await launchBrowser(url);

  // handle cookie popup
  await handleCookiePopup(page);

  // set up puzzle finders
  let newPuzzleButton;
  newPuzzleButton = await page.$('#btnNew');

  // initialise PDF
  const pdfDoc = await PDFDocument.create();
  const pageDelay = 350; // ms

  // save title page
  await addTitlePage(pdfDoc, page);

  // save puzzles
  console.log(`Saving ${numPuzzles} puzzles.`)

  for (let i = 0; i < numPuzzles; i++) {
    try
    {
      // Click on new puzzle
      await newPuzzleButton.evaluate(element => element.click());
      await delay(pageDelay);
      newPuzzleButton = await page.$('#btnNew');

      // Take screenshots, with puzzle zoomed in
      const {screenshotPuzzle, screenshotInfo, screenshotTitle} = await captureScreenshots(page)

      // Add iamges to PDF
      await drawImages(pdfDoc, screenshotPuzzle, screenshotInfo, screenshotTitle);
    }
    catch (error)
    {  
      console.error(`Error capturing puzzle ${i}: ${error.message}`);
      
      // stop and wait, try again
      await page.reload();
      await page.goto(url);
      await delay(500);
      i--;
      newPuzzleButton = await page.$('#btnNew');
    }
  }

  await savePdf(pdfDoc, puzzleName);

  await browser.close();
}

// Read and parse the JSON data file
fs.readFile(configFile, 'utf8', (err, data) => {

  if (err) {
    console.error(`Error reading JSON file: ${err}`);
    process.exit(1);
  }

  try {
    const puzzleData = JSON.parse(data);
    const numPuzzles = 3;

    // Loop through the JSON data and run the script for each puzzle
    for (const puzzle of puzzleData) {
      printPuzzleSet(puzzle.puzzleName, puzzle.url, numPuzzles);
    }
  } catch (jsonError) {
    console.error(`Error parsing JSON: ${jsonError}`);
    process.exit(1);
  }

});