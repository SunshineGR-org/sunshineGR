const BUCKET_NAME = 'diavgeia-decisions'
const CONSOLIDATED_BUCKET_NAME = 'diavgeia'
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const util = require('util');
const stream = require('stream');
const { Transform } = require('stream');
const pipeline = promisify(stream.pipeline);
const express = require('express');
const finished = util.promisify(stream.finished);

const async = require('async');
const consolidate_app = express();


consolidate_app.use(express.json());

consolidate_app.post('/consolidate', async (req, res, next) => {
  var retrues = req.get('X-CloudTasks-TaskRetryCount');
  date = req.body.date;
  console.log(`Consolidating ${date}`);
  consolidateAsync(date);
  res.status(200).send();
});


const PORT = process.env.PORT || 8090;
consolidate_app.listen(PORT, () => {
  console.log(
    `Hello from Cloud Run! Waiting for dates to consolidate!`
  );
});

module.exports = consolidate_app;

// Get all decisions with a decision_date_ prefix 
// from a Google bucket for a specific date,
// and consolidate them in a single jsonl file.
// const consolidate = async (date) => {
//   const prefix = `decision_${date}`;
//   const bucket = storage.bucket(BUCKET_NAME);
//   const files = await bucket.getFiles({ prefix });
//   const fileNames = files[0].map((file) => file.name);
//   console.log(`Found ${fileNames.length} files for ${date}`);
//   const consolidatedFileName = `decisions_${date}.jsonl`;
//   const consolidatedFilePath = path.join(__dirname, consolidatedFileName);
//   for (const fileName of fileNames) {
//     // console.log(`Consolidating ${fileName}`);
//     const file = bucket.file(fileName);
//     await pipeline(
//       file.createReadStream({ encoding: 'utf8' }),
//       // Transform to stringify and append newline
//       new stream.Transform({
//         transform(chunk, encoding, callback) {
//           this.push(chunk.toString());
//           callback();
//         }
//       }),
//       // Create a write stream for each file
//       fs.createWriteStream(consolidatedFilePath, { encoding: 'utf8', flags: 'a' })
//     );
//     fs.appendFileSync(consolidatedFilePath, '\n');
//   }
//   console.log(`Consolidated ${fileNames.length} files for ${date}`);
// }
