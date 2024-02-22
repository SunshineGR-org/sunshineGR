const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');
// import pkg from 'pdfjs-dist/legacy/build/pdf.js';
// const { PDFDocument, getDocument } = pkg;
const { PDFDocument, getDocument } = require('pdfjs-dist/legacy/build/pdf.js');
const { get_encoding, encoding_for_model } = require('@dqbd/tiktoken');
const csv = require('csv-parser');
const rockset = require('@rockset/client');
const path = require('path');
const COHERE_API_KEY = process?.env?.COHERE_API_KEY ?? '';
const ROCKSET_API_KEY = process?.env?.ROCKSET_API_KEY ?? '';
const rocksetClient = rockset.default(ROCKSET_API_KEY, 'https://api.euc1a1.rockset.com');
const { CharacterTextSplitter, RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { DirectoryLoader } = require("langchain/document_loaders/fs/directory");
const { PDFLoader } = require("langchain/document_loaders/fs/pdf");
const { CohereEmbeddings } = require("langchain/embeddings/cohere");
const DocumentAIProjectId = 'datagovgr';
const DocumentAILocation = 'eu'; // Format is 'us' or 'eu'
const DocumentAIProcessorId = '4d90facdcd234fcb'; // Create processor in Cloud Console
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const client = new DocumentProcessorServiceClient({ apiEndpoint: 'eu-documentai.googleapis.com' });

const ROCKSET_WPS = 10;

// Function to read and extract text from a PDF file
async function extractTextFromPDFPlain(filePath) {
  try {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const pdf = await getDocument({ data: data, disableFontFace: true }).promise;
    let text = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const pageText = await page.getTextContent();
      const pageContent = pageText.items.map(item => item.str).join(' ');
      text += pageContent + ' ';
    }

    return text;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

function loadExistingEmbeddings(file) {
  const embeddingsFile = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : undefined;
  if (embeddingsFile === undefined) {
    return [];
  }
  const embeddings = [];
  embeddingsFile.split('\n').map(line => {
    if (line !== '') {
      embeddings.push(JSON.parse(line.trim()).ada);
    }
  });
  embedded_adas = [...new Set(embeddings)];
  console.log(`Loaded ${embedded_adas.length} existing embeddings`);
  return embedded_adas;
}

// Function to encode text using OpenAI's embedding model
async function encodeText(text, filePath) {
  const tokens = Array.from(enc.encode(text));
  console.log(`Got list of ${tokens.length} tokens for file ${filePath}`);
  if (tokens.length > 7000) {
    console.warn(`Text is too long (${tokens.length} tokens), truncating to 7000 tokens`);
    throw new Error(`Text for ${filePath} is too long`);
  }
  console.log('Calling OpenAI embedding model');
  request = { model: 'text-embedding-ada-002', input: [tokens] };
  const response = await openai.createEmbedding(request);
  const embedding = response.data.data[0].embedding;
  return embedding;
}

async function extractTextWithDocumentAIOCR(file) {
  const name = `projects/${DocumentAIProjectId}/locations/${DocumentAILocation}/processors/${DocumentAIProcessorId}`;

  return fs.promises.readFile(file)
    .then(imageFile => {
      const encodedImage = Buffer.from(imageFile).toString('base64');
      const request = {
        name,
        rawDocument: {
          content: encodedImage,
          mimeType: 'application/pdf',
        },
      };

      // Recognizes text entities in the PDF document
      return client.processDocument(request)
        .then(([result]) => {
          return result.document.text;
        })
    })
    .catch(error => {
      console.log(`Cannot extract text from file:${file}: ${error}`);
      throw error;
    });
}

async function extractTextFromPDF(file) {
  // getting the text directly from PDF is cheaper
  // and faster but not reliable. Even when the PDF 
  // is text, I encountered scrambled text. The same
  // happens even if you try and copy-paste the text
  // in OSX Preview.I guess it has something to do with
  // not-embedded fonts at creation time.
  return extractTextWithDocumentAIOCR(file);
}

async function readPdfOCR(file) {
  const { data } = await Tesseract.recognize(file, 'el', { logger: m => console.log(m) });
  console.log(data);
  return data;
}

async function processPDFFile(file, embeddingsFile) {
  console.log(`Start processing file ${file}`);
  return extractTextFromPDF(file)
    .then(text => {
      return createEmbeddingsCohere(text)
        .then(embeddings_vector => {
          console.log(`Got ${embeddings_vector.length} embeddings for ${file}`);
          return embeddings_vector.map(({ embedding, doc }, index) => {
            if (embedding === undefined) {
              console.log(`Skipping ${file} page ${index}, no embedding`);
              return;
            }
            const embedding_json = { ada: path.parse(file).name, index: index, embedding: embedding, doc: doc };
            // const line = `{"ada":"${file.split('.')[0]}","index":${index}, "embedding":${JSON.stringify(embedding)}, "doc":"${doc}"}`;
            fs.promises.appendFile(embeddingsFile, JSON.stringify(embedding_json) + '\n')
              .then(() => {
                return { ada: path.parse(file).name, index: index };
              })
          }
          )
        })
    })
    .catch(error => {
      console.log(error);
      return { ada: path.parse(file).name, index: -1 };
    });
}

async function createEmbeddingsCohere(text) {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 512, chunkOverlap: 0 });
  const embeddings_fetcher = new CohereEmbeddings({ verbose: true, apiKey: COHERE_API_KEY , maxConcurrency: 10, timeout: 10000, modelName: "embed-multilingual-v2.0" });
  return splitter.splitText(text)
    .then(docs => {
      return embeddings_fetcher.embedDocuments(docs)
        .then(embeddings => {
          return embeddings.map((embedding, index) => {
            return { embedding: embedding, doc: docs[index] }
          })
        })
    });
  // const docs = await splitter.splitText(text);
  // console.log(`Loaded ${docs.length} documents`);
  // const embeddings = embeddings_fetcher.embedDocuments(docs);
  // return embeddings;
  // return undefined;
}

async function processPDFFileOpenAI(file) {
  const text = await extractTextFromPDF(filePath);
  console.log(`Extracted text for ${file}`);
  const embeddings = await encodeText(text, filePath);
  return embeddings;
}

// Function to process PDF files in a folder
async function processPDFFiles(folderPath, embeddingsFile, existingEmbeddings) {
  const files = fs.readdirSync(folderPath);
  const document_promises = [];
  for (const file of files) {
    try {
      if (path.parse(file).ext !== '.pdf') {
        continue;
      }
      const ada = path.parse(file).name;
      if (existingEmbeddings.find(e => e === ada)) {
        console.log(`Skipping ${file}, already processed`);
        continue;
      }
      const filePath = `${folderPath}/${file}`;
      document_promises.push(limit(() => processPDFFile(filePath, embeddingsFile)));
    }
    catch (error) {
      console.error(`Embeddings failed for ${file}:${error}`);
    }
  }
  Promise.all(document_promises);
}

async function loadRocksetIds(file) {
  return new Promise((resolve, reject) => {
    results = [];
    return fs.createReadStream(file)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        // console.log(results);
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  })
}

async function patchRocksetDocument(id, embedding) {
  const patch = {
    data: [
      {
        _id: id,
        patch: [
          {
            op: 'ADD',
            path: '/embedding',
            value: embedding
          }
        ]
      }
    ]
  }
  return rocksetClient.documents.patchDocuments("commons", "diavgeia", patch)
    .then(response => { console.log(response); return response; })
    .catch(error => {
      console.error(error);
      throw error;
    });
  console.log(response);
  return response;
}

// Gets a list of existing embeddings from a jsonl file
// and uploads them to Rockset. 
// the embeddings file contains a {ada, embedding} object per line (in jsonl format)
// The ids file contains a {ada, id} object per line (in csv format)
// This function uses the adas to match the embeddings with the ids,
// where ID is the id of the record in Rockset, and used to update the record
// through the patch API command.
// Rockset already has related records
async function uploadEmbeddingsToRockset(embeddingsFile, idsFile) {
  let embeddings = loadExistingEmbeddings(embeddingsFile);
  ids = await loadRocksetIds(idsFile);
  var completed = 0;
  var failed = 0;
  while (embeddings.length > 0) {
    let batch = embeddings.splice(0, ROCKSET_WPS);
    const promises = batch.map(e => {
      const id = ids.find(i => i.ada === e.ada)._id;
      console.log(`Updating ${e.ada} with id ${id}`);
      return patchRocksetDocument(id, e.embedding)
        .then(response => {
          completed += 1;
          return 0;
        })
        .catch(error => {
          failed += 1;
          console.log(error);
          return -1;
        });
    });
    promises.push(new Promise(resolve => setTimeout(resolve, 1000)));
    await Promise.all(promises);
    console.log(`Completed ${completed} updates, failed ${failed}, ${embeddings.length} remaining`);
  }
  console.log(`Completed ${completed} updates, failed ${failed}`);
  return completed;
}

// Usage example
async function main() {
  const folderPath = 'oreokastro-downloads/anatheseis';
  // const folderPath = 'test';
  const embeddingsFile = `${folderPath}/embeddings.jsonl`;
  const idsFile = `${folderPath}/ids.csv`;
  // await uploadEmbeddingsToRockset(embeddingsFile, idsFile);
  // return;
  // We run into memory issues when loading large (>500M) files with 
  // existing embeddings. Skip this optimization for now --- it will
  // result to slower embeddings, and duplicated costs.
  const existingEmbeddings = loadExistingEmbeddings(embeddingsFile);
  // const existingEmbeddings = [];
  console.log(`Loaded ${existingEmbeddings.length} existing embeddings`);
  import('p-limit')
    .then(pLimit => {
      limit = pLimit.default(10);
      return processPDFFiles(folderPath, embeddingsFile, existingEmbeddings);

    })
}

main();
