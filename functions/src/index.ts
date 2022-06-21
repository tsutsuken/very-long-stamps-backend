import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();

// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality.
// Any number of plugins can be added through `puppeteer.use()`
import puppeteer from "puppeteer-extra";

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
import StealthPlugin = require("puppeteer-extra-plugin-stealth");
// puppeteer.use(StealthPlugin());

export const fetchOpensea = functions.https.onRequest((request, response) => {
  functions.logger.info("fetchOpensea", { structuredData: true });

  puppeteer
    .use(StealthPlugin())
    .launch({ headless: true })
    .then(async (browser) => {
      const page = await browser.newPage();
      await page.goto("https://bot.sannysoft.com");
      await page.waitForTimeout(5000);
      const buffer = await page.screenshot({ fullPage: true });
      uploadImageToStorage(buffer);
      await browser.close();
    });

  response.send("fetchOpensea");
});

const uploadImageToStorage = async (buffer: string | Buffer) => {
  functions.logger.info("uploadImageToStorage", { structuredData: true });
  const bucket = admin.storage().bucket();
  const fileName = Date.now().toString();
  const savePath = "puppeteer_capture/" + fileName + ".jpeg";
  const bucketFile = bucket.file(savePath);
  await bucketFile.save(buffer, {
    metadata: {
      contentType: "image/png",
    },
  });
  functions.logger.info("saved", { structuredData: true });
};

export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});
