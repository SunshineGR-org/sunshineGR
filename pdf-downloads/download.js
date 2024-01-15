const async = require("async");
const request = require("request");
const fs = require("fs");

const folderPath = `oreokastro-downloads/anatheseis`;
const urlsFile = `${folderPath}/urls.csv`;
const maxRetries = 5;
const maxConcurrentDownloads = 50;
let urls = fs.readFileSync(urlsFile, "utf-8").split("\n").filter(url => url.trim() !== "");

const duplicates = urls.filter((item, index) => urls.indexOf(item) !== index);
const uniqueUrls = new Set(duplicates);
console.log(duplicates);

let failedUrls = [];

async.eachLimit(urls, maxConcurrentDownloads, async (url) => {
  const filename = `${folderPath}/${getFilenameFromUrl(url)}.pdf`;
  if (fs.existsSync(filename)) {
    console.log(`File ${filename} already exists, skipping download`);
    return;
  }
  let retries = 0;
  let successful = false;
  while (retries < maxRetries && !successful) {
    try {
      const req = request(encodeURI(url));
      const stream = fs.createWriteStream(filename);
      await new Promise((resolve, reject) => {
        req.on("response", (res) => {
          if (res.statusCode === 200) {
            res.pipe(stream);
          } else {
            reject(new Error(`Failed to download ${url}: HTTP status code ${res.statusCode} `));
          }
        });
        req.on("error", reject);
        stream.on("finish", resolve);
      });
      console.log(`Downloaded ${url} `);
      successful = true;
    } catch (err) {
      console.error(`Error downloading ${url}: ${err.message} `);
      retries++;
    }
  }
  if (!successful) {
    failedUrls.push(url);
    console.error(`Failed to download ${url} after ${maxRetries} retries`);
  }
}, (err) => {
  if (err) {
    console.error(`Error: ${err.message} `);
  }
  if (failedUrls.length > 0) {
    console.log(`Failed to download ${failedUrls.length} files: `);
    failedUrls.forEach(url => console.log(url));
  } else {
    console.log("All files downloaded successfully!");
  }
});

function getFilenameFromUrl(url) {
  const parts = url.split("/");
  return parts[parts.length - 1];
}
