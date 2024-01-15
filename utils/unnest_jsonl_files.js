const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Function to process JSON elements and generate new elements for each object in arrays
function processJSONElements(row) {
  // Check if the field is an array and contains objects
  const newArrayElements = [];
  if (row.decisionTypeId === 'Δ.1') {
    if (Array.isArray(row.extraFieldValues?.person)) {
      for (const person of row.extraFieldValues.person ?? []) {
        const newRow = { ...row };
        newRow.vendor_name = person?.name;
        newRow.vendor_afm = person?.afm;
        newRow.amount = row?.extraFieldValues?.awardAmount?.amount;
        newArrayElements.push(newRow);
      }
    }
    else {
      const newRow = { ...row };
      newRow.vendor_name = row.extraFieldValues?.person?.name;
      newRow.vendor_afm = row.extraFieldValues?.person?.afm;
      newRow.amount = row.extraFieldValues?.awardAmount?.amount;
      newArrayElements.push(newRow);
    }
  }
  else if ((row.decisionTypeId === 'Β.2.1') || (row.decisionTypeId === 'Β.2.2')) {
    for (const person of row?.extraFieldValues?.sponsor ?? []) {
      const newRow = { ...row };
      newRow.vendor_name = person?.SponsorAFMName?.name;
      newRow.vendor_afm = person?.SponsorAFMName?.afm;
      newRow.amount = person?.expenseAmount?.amount;
      newArrayElements.push(newRow);
    }
  }
  else {
    newArrayElements.push(row);
  }

  return newArrayElements; // If not an array or no objects, return the original element
}

// Function to process a JSONL file
function processJSONLFile(filePath) {
  // Create a write Stream using the same filename, but put it into the unnest folder. 
  writeFilePath = `/tmp/unnest/new/${path.basename(filePath)}`;
  const writeStream = fs.createWriteStream(writeFilePath, { encoding: 'utf8' });
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  rl.on('line', (line) => {
    const jsonElement = JSON.parse(line);
    const newArrayElements = processJSONElements(jsonElement);

    for (const newElement of newArrayElements) {
      // Process the new element as desired (e.g., save to a new file, perform further operations)
      writeStream.write(JSON.stringify(newElement) + '\n');
    }
  });

  rl.on('close', () => {
    console.log(`Finished processing file: ${filePath}`);
    writeStream.end();
  });
}

// Process all JSONL files in a directory
function processJSONLFilesInDirectory(directoryPath) {
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error(`Error reading directory: ${directoryPath}`);
      return;
    }

    files.forEach((file) => {
      const filePath = `${directoryPath}/${file}`;
      console.log(`Processing file: ${filePath}`);
      processJSONLFile(filePath);
    });
  });
}

// Usage: Provide the directory path containing the JSONL files
const directoryPath = '/tmp/unnest/2011/';
processJSONLFilesInDirectory(directoryPath);
