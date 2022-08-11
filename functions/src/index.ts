import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();

// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality.
// Any number of plugins can be added through `puppeteer.use()`
import puppeteer from "puppeteer-extra";

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
import StealthPlugin = require("puppeteer-extra-plugin-stealth");
import { ElementHandle } from "puppeteer";
// puppeteer.use(StealthPlugin());

interface Asset {
  imageUrl: string;
  assetName: string;
  assetId: string;
  contractAddress: string;
  chain: string;
}

interface AssetPageUrlElements {
  assetId: string;
  contractAddress: string;
  chain: string;
}

export const fetchOpensea = functions.https.onRequest((request, response) => {
  functions.logger.info("fetchOpensea", { structuredData: true });

  puppeteer
    .use(StealthPlugin())
    .launch({ headless: true, args: ["--start-maximized"] })
    .then(async (browser) => {
      const page = await browser.newPage();
      await page.goto("https://opensea.io/collection/very-long-animals");
      functions.logger.info("...🚧 waiting for cloudflare to resolve");
      await page.waitForSelector(".cf-browser-verification", { hidden: true });
      //   await page.waitForTimeout(5000);
      // const html = await page.content();
      // functions.logger.info("html", html, { structuredData: true });
      // uploadHTMLToStorage(html);

      const assetAnchors = await page.$$(".Asset--anchor");
      const _parsedAssets = await parsedAssets(assetAnchors);
      functions.logger.info("assets", _parsedAssets, { structuredData: true });

      const assetJson = JSON.stringify(Array.from(_parsedAssets));
      functions.logger.info("assetJson", assetJson, { structuredData: true });
      uploadJsonToStorage(assetJson);

      // functions.logger.info("take screenshot and upload imag");
      // const buffer = await page.screenshot({ fullPage: false });
      // uploadImageToStorage(buffer);

      await browser.close();
    });

  response.send("fetchOpensea");
});

const parsedAssets = async (
  assetAnchors: ElementHandle<Element>[]
): Promise<Set<Asset>> => {
  const assets = new Set<Asset>();

  for (const assetAnchor of assetAnchors) {
    const imgTag = await assetAnchor.$("img");
    let imageUrl = "";
    let assetName = "";
    functions.logger.info("imgTag", imgTag);
    if (imgTag != null) {
      imageUrl = (await (
        await imgTag.getProperty("src")
      ).jsonValue()) as string;
      assetName = (await (
        await imgTag.getProperty("alt")
      ).jsonValue()) as string;
    }

    const assetPageUrl = (await (
      await assetAnchor.getProperty("href")
    ).jsonValue()) as string;
    const _assetPageUrlElements = assetPageUrlElements(assetPageUrl);
    if (_assetPageUrlElements == null) {
      functions.logger.info("null _assetPageUrlElements");
    } else {
      const asset: Asset = {
        assetName: assetName,
        imageUrl: imageUrl,
        assetId: _assetPageUrlElements.assetId,
        contractAddress: _assetPageUrlElements.contractAddress,
        chain: _assetPageUrlElements.chain,
      };
      assets.add(asset);
    }
  }

  return assets;
};

const assetPageUrlElements = (
  assetPageUrl: string
): AssetPageUrlElements | null => {
  // assetPageUrl example: https://opensea.io/assets/matic/0xc52d9642260830055c986a97794b7b27393edf5e/16
  const elements = assetPageUrl.split("/");
  if (elements.length <= 3) {
    return null;
  }

  const lastIndex = elements.length - 1;
  const assetInfo: AssetPageUrlElements = {
    assetId: elements[lastIndex],
    contractAddress: elements[lastIndex - 1],
    chain: elements[lastIndex - 2],
  };

  return assetInfo;
};

const uploadJsonToStorage = async (json: string) => {
  functions.logger.info("uploadJsonToStorage", { structuredData: true });
  const bucket = admin.storage().bucket();
  const fileName = Date.now().toString();
  const savePath = "collections_json/" + fileName + ".json";
  const bucketFile = bucket.file(savePath);
  await bucketFile.save(json, {
    metadata: {
      contentType: "text/json",
    },
  });
  functions.logger.info("saved", { structuredData: true });
};

// const uploadHTMLToStorage = async (html: string) => {
//   functions.logger.info("uploadHTMLToStorage", { structuredData: true });
//   const bucket = admin.storage().bucket();
//   const fileName = Date.now().toString();
//   const savePath = "puppeteer_capture/" + fileName + ".html";
//   const bucketFile = bucket.file(savePath);
//   await bucketFile.save(html, {
//     metadata: {
//       contentType: "text/html",
//     },
//   });
//   functions.logger.info("saved", { structuredData: true });
// };

// const uploadImageToStorage = async (buffer: string | Buffer) => {
//   functions.logger.info("uploadImageToStorage", { structuredData: true });
//   const bucket = admin.storage().bucket();
//   const fileName = Date.now().toString();
//   const savePath = "puppeteer_capture/" + fileName + ".jpeg";
//   const bucketFile = bucket.file(savePath);
//   await bucketFile.save(buffer, {
//     metadata: {
//       contentType: "image/png",
//     },
//   });
//   functions.logger.info("saved", { structuredData: true });
// };

export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});
