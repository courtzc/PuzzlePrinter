const puppeteer = require("puppeteer");
const path = require("path"); // Import the 'path' module
const { PDFDocument, rgb, StandardFonts, degrees } = require("pdf-lib");
const { format } = require("date-fns");
const fs = require("fs");
const sharp = require("sharp"); // Import the sharp library
const { print, getPrinters } = require("pdf-to-printer");
const Jimp = require("jimp");

// Check if a URL argument is provided
if (process.argv.length !== 3) {
  console.error("Usage: node script.js <json file>");
  process.exit(1);
}

const configFile = process.argv[2];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const launchBrowser = async (url) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await delay(500);
  return { browser, page };
};

const handleCookiePopup = async (page) => {
  // known constants
  const cookiePopupSelector = "#qc-cmp2-ui";
  const acceptButtonSelector =
    "#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button.css-47sehv";

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
  const puzzleDiv = await page.$("#puzzleContainerDiv");
  const puzzleInfoDiv = await page.$("#puzzleForm > div.puzzleInfo");
  const puzzleTitleDiv = await page.$("#logoLink > img");

  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 3 });
  const screenshotPuzzle = await puzzleDiv.screenshot();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 5 });
  const screenshotInfo = await puzzleInfoDiv.screenshot();
  const screenshotTitle = await puzzleTitleDiv.screenshot();

  return { screenshotPuzzle, screenshotInfo, screenshotTitle };
};

const drawImages = async (
  pdfDoc,
  screenshotPuzzle,
  screenshotInfo,
  screenshotTitle,
  aspectRatio
) => {
  // Get image sizes
  const titleImage = sharp(screenshotTitle);
  const { width: titleWidth, height: titleHeight } =
    await titleImage.metadata();
  const infoImage = sharp(screenshotInfo);
  const { width: infoWidth, height: infoHeight } = await infoImage.metadata();

  const pageHeight = 3508; // px, A4
  const pageWidth = 2480; // px, A4
  const puzzlePosX = pageWidth / 2 - (pageWidth * 0.8 * aspectRatio.width) / 2; // px
  const puzzlePosY = pageHeight / 2 - (pageWidth * 0.8) / 2; // px

  // Add the puzzle as a new page to the PDF
  const imagePage = pdfDoc.addPage([pageWidth, pageHeight]);
  const imageBytesPuzzle = await pdfDoc.embedPng(screenshotPuzzle);
  const imageBytesInfo = await pdfDoc.embedPng(screenshotInfo);
  const imageBytesTitle = await pdfDoc.embedPng(screenshotTitle);

  imagePage.drawImage(imageBytesPuzzle, {
    x: puzzlePosX,
    y: puzzlePosY,
    width: pageWidth * 0.8 * aspectRatio.width,
    height: pageWidth * 0.8,
  });

  imagePage.drawImage(imageBytesInfo, {
    x: pageWidth / 2 - infoWidth / 2,
    y: 200,
    width: infoWidth,
    height: infoHeight,
  });

  imagePage.drawImage(imageBytesTitle, {
    x: pageWidth / 2 - titleWidth / 2,
    y: pageHeight * 0.85,
    width: titleWidth,
    height: titleHeight,
  });
};

const addTitlePage = async (pdfDoc, page, puzzleName) => {
  const pageHeight = 3508; // px, A4
  const pageWidth = 2480; // px, A4

  const imagePage = pdfDoc.addPage([pageWidth, pageHeight]);

  const puzzleTitleDiv = await page.$("#logoLink > img");
  const puzzleRulesDiv = await page.$("#rules");

  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 6 });
  const screenshotTitle = await puzzleTitleDiv.screenshot();
  const screenshotRules = await puzzleRulesDiv.screenshot();

  const titleImage = sharp(screenshotTitle);
  const { width: titleWidth, height: titleHeight } =
    await titleImage.metadata();
  const rulesImage = sharp(screenshotRules);
  const { width: rulesWidth, height: rulesHeight } =
    await rulesImage.metadata();

  const rulesAspectRatio = rulesHeight / rulesWidth;
  const rulesNewWidth = (pageHeight * 0.5) / rulesAspectRatio;

  const imageBytesTitle = await pdfDoc.embedPng(screenshotTitle);
  const imageBytesRules = await pdfDoc.embedPng(screenshotRules);

  imagePage.drawImage(imageBytesTitle, {
    x: pageWidth / 2 - titleWidth / 2,
    y: pageHeight * 0.85,
    width: titleWidth,
    height: titleHeight,
  });

  // Calculate the X-coordinate to center the text
  const textAfterComma = puzzleName.split(", ").slice(1).join(", ");
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 96;
  const textWidth = font.widthOfTextAtSize(textAfterComma, fontSize);
  const textX = (pageWidth - textWidth) / 2;

  // Add the text underneath the titleImage
  imagePage.drawText(textAfterComma, {
    x: textX,
    y: pageHeight * 0.85 - 250, // Adjust the Y-coordinate as needed
    size: fontSize,
    font: font,
    color: rgb(0.33, 0.33, 0.33), // Black color
  });

  imagePage.drawImage(imageBytesRules, {
    x: pageWidth / 2 - rulesNewWidth / 2,
    y: pageHeight * 0.2,
    width: rulesNewWidth,
    height: pageHeight * 0.5,
  });
};

const savePdf = async (pdfBytes, puzzleName) => {
  // Save the combined PDF with all the puzzles
  const currentDate = format(new Date(), "yyyyMMdd");

  let modifiedString = puzzleName.replace(/, | /g, "_");

  const filename = `C:/Users/Courtney/source/repos/PuzzlePrinter/puzzles/${modifiedString}_puzzles_${currentDate}.pdf`;

  console.log(`Saving PDF to ${filename}.`);

  // Write the PDF to a file
  const fs = require("fs");
  fs.writeFileSync(filename, pdfBytes);

  console.log(`Finished saving PDF to ${filename}.`);

  return filename;
};

// Function to convert a screenshot to black and white using jimp
const convertToBlackAndWhite = async (screenshotBuffer) => {
  const image = await Jimp.read(screenshotBuffer);

  // Thresholding to black and white
  image.threshold({ max: 128, replace: 255, below: 128 });

  return image.getBufferAsync(Jimp.MIME_PNG);
};

// shuffle pages to random order
const reorderPages = (pdfDoc) => {
  let a = pdfDoc.getPageIndices();
  console.log("old order: ", a);
  const pages = pdfDoc.getPages();

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  console.log("new order: ", a);

  for (let currentPage = 0; currentPage < a.length; currentPage++) {
    pdfDoc.removePage(currentPage);
    pdfDoc.insertPage(currentPage, pages[a[currentPage]]);
  }

  return pdfDoc;
};

// Function to draw evenly spaced black vertical lines on an image every 50 pixels
const drawThermometerLines = async (imageBuffer, puzzleName) => {
  const image = new Jimp(imageBuffer);

  const width = image.getWidth();
  const height = image.getHeight();

  const lineSpacing = 93; // px, distance between each line
  const startingLine = 162; // px, distance to first line

  let reduction = 1; // no reduction by default.

  if (puzzleName.includes("Weekly") || puzzleName.includes("Monthly")) {
    reduction = 0.33; // 33% of the pixels in a normal 15x15, weirdly
  }

  const finalLineSpacing = Math.round(lineSpacing * reduction);
  const finalStartingLine = Math.round(startingLine * reduction);

  for (let x = finalStartingLine; x < width; x += finalLineSpacing) {
    image.scan(x, 0, 1, image.getHeight(), function (x, y, idx) {
      this.bitmap.data.writeUInt32BE(0x000000ff, idx); // Set pixel to black (RGBA)
    });
  }
  for (let y = finalStartingLine; y < height; y += finalLineSpacing) {
    image.scan(0, y, image.getWidth(), 1, function (x, y, idx) {
      this.bitmap.data.writeUInt32BE(0x000000ff, idx); // Set pixel to black (RGBA)
    });
  }

  return new Promise((resolve) => {
    image.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
      if (err) {
        console.error(err);
        resolve(null);
      } else {
        resolve(buffer);
      }
    });
  });
};

// const makeTwoPagesPerSheet = async (pdfDoc) => {
//   // Load the existing PDF document

//   // Create a new PDF document
//   const newPdfDoc = await PDFDocument.create();

//   // Loop through the original pages and add them two to a sheet
//   for (let i = 0; i < pdfDoc.getPageCount(); i += 2) {
//     // Create a new A4 page for each pair of original pages, rotated 90 degrees
//     const [page1, page2] = await Promise.all([
//       newPdfDoc.addPage([842, 595], degrees(90)),
//       newPdfDoc.addPage([842, 595], degrees(90)),
//     ]);

//     // Get the original pages
//     const originalPage1 = pdfDoc.getPage(i);
//     const originalPage2 =
//       i + 1 < pdfDoc.getPageCount() ? pdfDoc.getPage(i + 1) : null;

//     // Copy the original pages to the new pages
//     page1.drawImage(originalPage1, {
//       x: 0,
//       y: 0,
//       width: 595,
//       height: 842 / 2,
//     });

//     if (page2) {
//       page2.drawImage(originalPage2, {
//         x: 0,
//         y: 842 / 2,
//         width: 595,
//         height: 842 / 2,
//       });
//     }
//   }

//   // Save the modified PDF document to a file
//   return newPdfDoc;
// };

const printPuzzleSet = async (puzzle, metadata, pdfDoc) => {
  console.log(
    `Now printing ${puzzle.numPuzzles} ${puzzle.puzzleName} puzzles.`
  );

  // launch web page
  const { browser, page } = await launchBrowser(puzzle.url);

  // handle cookie popup
  await handleCookiePopup(page);

  // set up puzzle finders
  let newPuzzleButton;
  newPuzzleButton = await page.$("#btnNew");

  const pageDelay = 350; // ms

  // Title page for normal sets
  // if (metadata.type == "normal")
  // {
  //   await addTitlePage(pdfDoc, page, puzzle.puzzleName);
  // }

  // save puzzles
  console.log(`Saving ${puzzle.numPuzzles} puzzles.`);

  for (let i = 0; i < puzzle.numPuzzles; i++) {
    try {
      // Take screenshots, with puzzle zoomed in
      const { screenshotPuzzle, screenshotInfo, screenshotTitle } =
        await captureScreenshots(page);

      // thermometer has annoying shading, get rid of it
      let finalScreenshotPuzzle = screenshotPuzzle;
      if (puzzle.puzzleName.includes("Thermometers")) {
        finalScreenshotPuzzle = await convertToBlackAndWhite(screenshotPuzzle);
        const image = await Jimp.read(finalScreenshotPuzzle);
        // console.log(image)
        finalScreenshotPuzzle = await drawThermometerLines(
          image,
          puzzle.puzzleName
        );
      }

      // Add images to PDF
      await drawImages(
        pdfDoc,
        finalScreenshotPuzzle,
        screenshotInfo,
        screenshotTitle,
        puzzle.aspectRatio
      );

      // Click on new puzzle for normal sets
      if (metadata.type == "normal") {
        await newPuzzleButton.evaluate((element) => element.click());
        await delay(pageDelay);
        newPuzzleButton = await page.$("#btnNew");
      }
    } catch (error) {
      console.error(`Error capturing puzzle ${i}: ${error.message}`);

      // stop and wait, try again
      await page.reload();
      await page.goto(puzzle.url);
      await delay(500);
      i--;

      if (metadata.type == "normal") {
        newPuzzleButton = await page.$("#btnNew");
      }
    }
  }
  await browser.close();

  return pdfDoc;
};

// Read and parse the JSON data file
fs.readFile(configFile, "utf8", async (err, data) => {
  if (err) {
    console.error(`Error reading JSON file: ${err}`);
    process.exit(1);
  }

  try {
    const puzzleData = JSON.parse(data);

    const metadata = puzzleData.metadata;
    const puzzles = puzzleData.puzzles;

    // initialise PDF
    const pdfDoc = await PDFDocument.create();

    // Loop through the JSON data and run the script for each puzzle
    for (const puzzle of puzzles) {
      if (
        puzzle.puzzleName != null &&
        puzzle.url != null &&
        puzzle.numPuzzles != null &&
        puzzle.aspectRatio != null &&
        metadata.type != null
      ) {
        await printPuzzleSet(puzzle, metadata, pdfDoc);
      } else {
        console.log(
          "config not correct for this puzzle. Example of the format required: "
        );
        console.log(
          `{
            "metadata": {
              "type": "normal"
            },
            "puzzles": [
              {
                "puzzleName": "Renzoku, 9x9, Hard",
                "url": "https://www.puzzle-futoshiki.com/renzoku-9x9-hard/",
                "numPuzzles": 25,
                "aspectRatio": {"height": 1, "width": 1.14516}
              }
            ]
          }`
        );
      }
    }
    let finalPdfDoc = pdfDoc;

    if (metadata.type == "normal") {
      finalPdfDoc = await reorderPages(pdfDoc);
      console.log("Shuffled pages.");
    }

    // if (metadata.nup == 2) {
    //   finalPdfDoc = await makeTwoPagesPerSheet(finalPdfDoc);
    // }

    // console.log(pages)
    const pdfBytes = await finalPdfDoc.save();
    await savePdf(pdfBytes, metadata.name);
  } catch (jsonError) {
    console.error(`Error parsing JSON: ${jsonError}`);
    process.exit(1);
  }
});
