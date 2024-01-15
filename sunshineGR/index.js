// file system module to perform file operations
const fs = require('fs');
const os = require('os');

// const DAILY_LIST_ENDPOINT = `https://diavgeia.gov.gr/luminapi/api/search?`;
const DAILY_LIST_ENDPOINT = `https://diavgeia.gov.gr/opendata/search.json?`;
const DECISION_ENDPOINT = `https://diavgeia.gov.gr/opendata/decisions/`;
const CONCURRENT_REQUESTS = process.env.CONCURRENT_REQUESTS || 5;
const MAX_TASK_ATTEMPTS = process.env.MAX_TASK_ATTEMPTS || 10;
const DIAVGEIA_AUTHORIZATION = process.env.DIAVGEIA_AUTHORIZATION || false;
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'datagovgr';
const ADA_LIST_PAGE_SIZE = 500;
const DIAVGEIA_USERNAME = process.env.DIAVGEIA_USERNAME;
const DIAVGEIA_PASSWORD = process.env.DIAVGEIA_PASSWORD;
const BUCKET_NAME = 'diavgeia-decisions'
const CONSOLIDATED_BUCKET_NAME = 'diavgeia'
const DAILY_LIST_RETRIEVER_SRV_URL = 'https://daily-list-retriever-srv-2tezuqb66a-ew.a.run.app/dailylist'
const DECISION_RETRIEVER_SRV_URL = 'https://decision-retriever-srv-2tezuqb66a-ew.a.run.app/decision'
const DECISION_DISPATCHER_SRV_URL = 'https://decision-dispatcher-srv-2tezuqb66a-ew.a.run.app/decision_batch'

const { CloudTasksClient } = require('@google-cloud/tasks').v2;
const { Storage, TransferManager } = require('@google-cloud/storage');

const storage = new Storage();
const tasksClient = new CloudTasksClient();

const express = require('express');
const greekUtils = require('greek-utils');

const axios = require('axios');
const https = require('https');

const pLimit = require('p-limit');


const agent = new https.Agent({ keepAlive: true });

const axiosInstance = axios.create({
  httpAgent: agent,
  httpsAgent: agent
});

const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');

const path = require('path');
const util = require('util');
const stream = require('stream');
const finished = util.promisify(stream.finished);


class UrlNotFoundError extends Error {
  constructor(url) {
    super(`Url Not Found: ${url}`);
    this.name = "UrlNotFoundError";
    this.url = url;
  }
}

class FetchUrlError extends Error {
  constructor(url, error) {
    super(`Could not fetch URL: ${url}`);
    this.name = "FetchError";
    this.url = url;
    this.error = error;
  }
}

class CreateTaskError extends Error {
  constructor(error) {
    super(`Could not create task`);
    this.name = "CreateTaskError";
    this.error = error;
  }
}

// const {
//   toMessagePublishedData,
// } = require('@google/events/cloud/pubsub/v1/MessagePublishedData');
const app = express();

app.use(express.json());

app.post('/dailylist', async (req, res, next) => {
  const startTime = new Date();
  var retries = req.get('X-CloudTasks-TaskRetryCount');
  fetchDailyDecisions(req.body.date)
    .then((result) => {
      const completionTime = new Date();
      const duration__s = (completionTime - startTime) / 1000;
      console.log(`Fetched ${result} decisions for ${req.body.date} in ${duration__s} seconds`);
      res.status(200).send();
    })
    .catch((error) => {
      if (retries == MAX_TASK_ATTEMPTS - 1) {
        console.error(`SUNSHINEGR_FAIL_LIST_50X,${req.body.date},${JSON.stringify(error)}`)
      }
      return next(error);
    });
})

app.post('/decision_batch', async (req, res, next) => {
  const decisions = req.body.decisions;
  const requests = decisions.map(decision => createSingleDecisionTask(decision));
  Promise.all(requests)
    .then((results) => {
      return res.status(200).send();
    })
})

app.post('/decision', async (req, res, next) => {
  const decision = req.body.decision;
  const date = req.body.date;
  var retries = req.get('X-CloudTasks-TaskRetryCount');
  now = Date.now();
  fetchDecision(decision, date)
    .then(() => {
      console.log(`fetchDecision ${decision} ${date} succeeded after ${Date.now() - now} ms`);
      return res.status(200).send();
    })
    .catch(error => {
      // Check the design doc for the logic behind error handling.
      // https://docs.google.com/document/d/1UFSvNeFYncU1l8MbNt_yrMVO1BdyWO6CEcVMQ55lVkg/edit#heading=h.p7qy12jw9mtj
      if (error instanceof UrlNotFoundError) {
        console.error(`SUNSHINEGR_FAIL_DECISION_404,${date},${decision},${JSON.stringify(error)}`)
        uploadToBucket(`failed_decision_404_${date}_${decision}.json`, JSON.stringify(error))
          .then(() => res.status(200).send());
      }
      if (error instanceof FetchUrlError && retries == MAX_TASK_ATTEMPTS - 1) {
        console.error(`SUNSHINEGR_FAIL_DECISION_50X,${date},${decision},${JSON.stringify(error)}`)
        uploadToBucket(`failed_decision_50X_${date}_${decision}.json`, JSON.stringify(error))
          .then(() => res.status(500).send());
      }
      console.error(`SUNSHINEGR_FAIL_DECISION_OTHER,${date},${decision},${JSON.stringify(error)}`)
      return res.status(500).send();
    })
})

app.post('/consolidate', async (req, res, next) => {
  var retries = req.get('X-CloudTasks-TaskRetryCount');
  date = req.body.date;
  console.log(req.body);
  console.log(`Consolidating ${date}`);
  const result = await consolidate(date);
  if (result == 0) {
    return res.status(200).send();
  } else {
    return res.status(500).send();
  }
});

// app.post('/decisions', async (req, res, next) => {
//   const startTime = new Date();
//   const decisions = req.body;
//   const requests = decisions.map(decision => fetchDecision(decision));
//   Promise.all(requests)
//     .then((results) => {
//       const completionTime = new Date();
//       const duration__s = (completionTime - startTime) / 1000;
//       console.log(`Completed fetching ${decisions.length} decisions in ${duration__s} seconds`);
//       return res.status(200).send();
//     })
//     .catch(error => {
//       const completionTime = new Date();
//       const duration__s = (completionTime - startTime) / 1000;
//       console.warn(`Failed to fetch ${decisions.length} decisions in ${duration__s} seconds`)
//       return next(error);
//     })
// })

app.post('/resume', async (req, res, next) => {
  const queueName = req.body.queueName;
  const location = req.body.location;
  resumeCloudTaskQueue(queueName, location)
    .then(() => {
      return res.status(200).send();
    })
    .catch(error => {
      return next(error);
    })
})

app.post('/pause', async (req, res, next) => {
  const queueName = req.body.queueName;
  const location = req.body.location;
  pauseCloudTaskQueue(queueName, location)
    .then(() => {
      return res.status(200).send();
    })
    .catch(error => {
      return next(error);
    })
})


const resumeCloudTaskQueue = async (queueName, location) => {
  const queuePath = tasksClient.queuePath(GCP_PROJECT_ID, location, queueName);
  const [response] = await tasksClient.resumeQueue({ name: queuePath });
  console.log(`Resumed queue: ${response.name}`);
}

const pauseCloudTaskQueue = async (queueName, location) => {
  const queuePath = tasksClient.queuePath(GCP_PROJECT_ID, location, queueName);
  const [response] = await tasksClient.pauseQueue({ name: queuePath });
  console.log(`Paused queue: ${response.name}`);
}

function get_next_date(date) {
  date = `${date}T12:00:00+03:00`
  next_date = new Date(date)
  next_date.setDate(next_date.getDate() + 1)
  return next_date.toLocaleDateString('sv', { timezone: "Europe/Athens" });
}

const fetchDecision = async (decision, date) => {
  const url = `${DECISION_ENDPOINT}${decision}.json`;
  const filename = `decision_${date}_${decision}.json`;
  // const decision_exists = await filenameExistsInGoogleBucket(filename);
  // if (decision_exists) {
  //   console.log(`Decision ${date}-${decision} already exists in bucket`);
  //   return 0;
  // }
  return fetchDiavgeiaUrl(url)
    .then((response) => {
      return uploadToBucket(filename, JSON.stringify(response));
    })
};

const fetchNumberOfDailyDecisions = (date) => {
  return fetchDiavgeiaUrl(`${DAILY_LIST_ENDPOINT}page=0&size=1&from_issue_date=${date}&to_issue_date=${get_next_date(date)}`)
    .then((response) => {
      var num_adas = response.info.total;
      return num_adas;
    });
}

const fetchDailyDecisionsPage = (date, page_index) =>
  fetchDiavgeiaUrl(`${DAILY_LIST_ENDPOINT}page=${page_index}&size=${ADA_LIST_PAGE_SIZE}&from_issue_date=${date}&to_issue_date=${get_next_date(date)}`)
    .then((response) => {
      if (response !== undefined) {
        // console.log(`Created decisions task for ${ date }(${ page_index })`)
        return response.decisions;
      }
    });

function delay(t, v) {
  return new Promise(resolve => setTimeout(resolve, t, v));
}

const rateLimit = (fn, n) => {
  let pendingPromises = [];
  return async function (...args) {
    while (pendingPromises.length >= n) {
      await Promise.race(pendingPromises).catch(() => { });
    }

    const p = fn.apply(this, args);
    pendingPromises.push(p);
    await p.catch(() => { });
    pendingPromises = pendingPromises.filter(pending => pending !== p);
    return p;
  };
};

const withTimeout = (fn, timeout) => {
  return async (...args) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const error = new Error(`Timeout of ${timeout}ms exceeded`);
        error.name = 'TimeoutError';
        reject(error);
      }, timeout);
    });

    const resultPromise = fn(...args);

    try {
      const result = await Promise.race([resultPromise, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
};

const fetchWithRetries = (url, retries = 5) => {
  const config = {
    headers: {
      "Accept": "application/json"
    },
    timeout: 300000
    // keepAlive: true
  };
  if (DIAVGEIA_AUTHORIZATION === true) {
    config.headers.Authorization = `Basic ${btoa(`${DIAVGEIA_USERNAME}:${DIAVGEIA_PASSWORD}`)}`;
  }
  return axiosInstance.get(url, config)
    .then(res => {
      if (res.status >= 200 && res.status < 300) {
        return res.data;
      } else {
        if (res.status >= 500) {
          if (retries > 0) {
            // Insert a random <1sec delay to prevent bombarding
            // the server with retries.
            return delay(Math.random())
              .then(function () {
                return fetchWithRetries(url, retries - 1);
              })
          }
          // FetchUrlError implies we don't want to retry anymore
          // internally. We may still retry the same task if the Cloud Task
          // service tries again. 
          throw new FetchUrlError(url, res);
        }
        else if (res.status == 404) {
          throw new UrlNotFoundError(url);
        }
      }
      // We throw this as a simple error, so that the catch 
      // handler can retry it. 
      throw new Error(`Error ${res.status} : ${JSON.stringify(res.data)}`);
    })
    .catch(error => {
      // console.log(error);
      if ((error instanceof UrlNotFoundError) || (error instanceof FetchUrlError)) {
        throw error;
      }
      else {
        if (retries > 0) {
          return delay(Math.random())
            .then(function () {
              return fetchWithRetries(url, retries - 1);
            })
        }
        throw new FetchUrlError(url, JSON.stringify(error));
      }
    });
}

const uploadToBucket = (filename, contents, retries = 5) => {
  return storage.bucket(BUCKET_NAME).file(filename).save(contents, { "resumable": false })
    .then(() => { return 0; })
    .catch(error => {
      if (retries > 0) {
        return delay(Math.random())
          .then(function () {
            return uploadToBucket(filename, contents, retries - 1);
          })
      }
      throw new Error(`${error}: failed to upload file ${filename} after all retries`);
    })
}

async function createSingleDecisionTask(decision_dict) {
  const project = 'datagovgr';
  const location = 'europe-west1';
  const url = DECISION_RETRIEVER_SRV_URL;
  const date = new Date(decision_dict.timestamp).toLocaleDateString('sv', { timezone: "Europe/Athens" });
  const decision = decision_dict.ada;
  const serviceAccountEmail = 'datagovgr-service-account@datagovgr.iam.gserviceaccount.com';
  // Use two queues to scale beyond the 500TPS Google Cloud limit. 
  const queues = ['decisions', 'decisions-01'];
  const queue_index = parseInt(date.split('-')[2]) % 2
  // Construct the fully qualified queue name.
  const parent = tasksClient.queuePath(project, location, queues[queue_index]);
  const payload = { "decision": decision, "date": date };
  // IMPORTANT DEDUP NOTE!!!
  // Diavgeia's API doesn't allow to get the tasks for a given day, and we 
  // need a workaround. 
  // To get the results for 2020-01-01 and 2022-01-02 we have to do:
  // from=2020-01-01&to=2020-01-02, AND from=2022-01-02&to=2022-01-03. 
  // which leads to several duplicated tasks for 2022-01-02 (all that are registered 
  // at time 00:00:00). 
  // The easier way I found to deal with this is to use Google Cloud's task deduplication, 
  // which requires tasks to be named (dedup takes place based on name). 
  // Decisions are in UTF-8 (Greek alphabet), and Google Cloud requires
  // Aa-Zz. 
  const task_name = greekUtils.toGreeklish(decision);
  const name = tasksClient.taskPath(project, location, queues[queue_index], task_name);

  const task = {
    httpRequest: {
      headers: {
        'Content-Type': 'application/json',
      },
      httpMethod: 'POST',
      url,
      oidcToken: {
        serviceAccountEmail,
      },
      body: Buffer.from(JSON.stringify(payload)).toString('base64')
    },
    name: name
  };

  // Send create task request.
  const request = { parent: parent, task: task };
  return tasksClient.createTask(request)
    .then((response) => {
      return 0;
    })
    .catch((error) => {
      // This is expected deduplication --- the task already exists. 
      // Search or "IMPORTANT DEDUP NOTE" comment. 
      if (error.code == 6) {
        return 0;
      }
      throw error;
    })
}

async function createDecisionBatchTask(decisions) {
  const project = 'datagovgr';
  const queue = 'decision-batches';
  const location = 'europe-west1';
  const url = DECISION_DISPATCHER_SRV_URL;
  const serviceAccountEmail = 'datagovgr-service-account@datagovgr.iam.gserviceaccount.com';
  const payload = { "decisions": decisions };

  const timeoutPromise = (promise) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 1000 * 60 * 1)
      ),
    ]);
  };

  // Construct the fully qualified queue name.
  const parent = tasksClient.queuePath(project, location, queue);
  const task = {
    httpRequest: {
      headers: {
        'Content-Type': 'application/json',
      },
      httpMethod: 'POST',
      url,
      oidcToken: {
        serviceAccountEmail,
      },
    },
  };

  if (payload) {
    task.httpRequest.body = Buffer.from(JSON.stringify(payload)).toString('base64'); // Buffer.from(payload).toString('base64');
  }
  // console.log(`Creating task for ${JSON.stringify(decisions[0])} with length ${decisions.length}`);
  // Send create task request.
  const request = { parent: parent, task: task };
  const task_promise = tasksClient.createTask(request)
    .then((response) => {
      // console.log(`Created task for ${JSON.stringify(decisions[0])}`);
      return 0;
    })
    .catch((error) => {
      console.log(`Failed to create task for (a) ${JSON.stringify(decisions[0])}`);
      throw new CreateTaskError(error);
    });
  return timeoutPromise(task_promise);
}

// Wrapper that does two things:
// 1. Retries all requests that failed with 5XX (Diavgeia has many of those)
// 2. Rate Limits the number of concurrent requests to Diavgeia.
const fetchDiavgeiaUrl = rateLimit(fetchWithRetries, CONCURRENT_REQUESTS);

const fetchDailyDecisions = async (date) => {
  var DailyDecisions = [];
  const filename = `daily_list_${date}.json`
  try {
    const daily_list_exists = await filenameExistsInGoogleBucket(filename);
    if (daily_list_exists) {
      console.log(`Daily list for ${date} already exists`);
      return 0;
    }
    const num_adas = await fetchNumberOfDailyDecisions(date);
    var num_pages = Math.ceil(num_adas / ADA_LIST_PAGE_SIZE);
    console.log(`${num_adas} decisions over ${num_pages} pages`);
    var arr_pages = Array.from(Array(num_pages).keys());
    var requests = arr_pages.map(async page_index => {
      return fetchDailyDecisionsPage(date, page_index)
        .then((page_decision_data) => {
          var decision_adas = page_decision_data.map((decision) => {
            return { "ada": decision.ada, "timestamp": decision.issueDate };
          })
          DailyDecisions.push(...decision_adas);
          // console.log(`Creating task for ${decision_adas.length} decisions (${decision_adas[0].ada})`);
          return createDecisionBatchTask(decision_adas)
            .then((res) => {
              // console.log(`Created task for ${decision_adas.length} decisions ${decision_adas[0].ada}`);
              return 0;
            })
        });
    });
    await Promise.all(requests)
      .then(() => {
        console.log("All requests completed and tasks created!!");
        return 0;
      })

    console.log("Uploading to Google bucket");
    const res = await uploadToBucket(filename, JSON.stringify(DailyDecisions));
    return DailyDecisions.length;
  } catch (err) {
    console.error("Error:", err);
    throw err;
  }
};
const ONE_MINUTE = 60 * 1000;

const filenameExistsInGoogleBucket = async (filename) => {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(filename);
  const exists = await file.exists();
  return exists[0];
}

const addFileToConsolidatedFile = async (fileName, consolidatedFile, retries = 0) => {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(fileName);
  const readStream = file.createReadStream({ encoding: 'utf8' });
  const chunks = [];
  readStream.on('data', (data) => {
    chunks.push(data);
  });
  return finished(readStream)
    .then(() => {
      const dataString = chunks.join('') + '\n';
      consolidatedFile.write(dataString);
      return 0;
    })
    .catch((err) => {
      if (retries < 5) {
        console.log(`Failed to process file ${fileName}. Retry for ${retries} time(s}`);
        return delay(Math.random())
          .then(function () {
            return addFileToConsolidatedFile(fileName, consolidatedFile, retries + 1);
          })
      }
      console.log(`Failed to process file ${fileName}. Retried ${retries} time(s} - quitting...`);
      throw err;
    });
}

const consolidateB = async (date) => {
  const start_time = new Date();
  const prefix = `decision_${date}`;
  const bucket = storage.bucket(BUCKET_NAME);
  const transfer_manager = new TransferManager(bucket);
  const tmp_dir = fs.mkdtempSync(path.join(os.tmpdir(), `consolidate_${date}`));
  console.log(tmp_dir);
  await transfer_manager.downloadManyFiles(prefix, { concurrency: 200, prefix: tmp_dir });
  return 0;
}

const consolidate = async (date) => {
  const start_time = new Date();
  const prefix = `decision_${date}`;
  const bucket = storage.bucket(BUCKET_NAME);
  // Convert callback-style function to Promise-style
  const [files] = await bucket.getFiles({ prefix });
  const fileNames = files.map((file) => file.name);

  console.log(`Found ${fileNames.length} files for ${date}`);

  const consolidatedFileName = `decisions_${date}.jsonl`;
  const consolidatedFilePath = path.join(__dirname, consolidatedFileName);
  const consolidatedFile = fs.createWriteStream(consolidatedFilePath, { encoding: 'utf8' });

  const limit = pLimit(20);
  const promises = fileNames.map((fileName) => limit(() => addFileToConsolidatedFile(fileName, consolidatedFile)));

  await Promise.all(promises);

  consolidatedFile.end();
  await storage.bucket(CONSOLIDATED_BUCKET_NAME).upload(consolidatedFilePath);

  console.log(`Consolidated ${fileNames.length} files for ${date} in ${(new Date() - start_time) / 1000} seconds`);
  return 0;



  // bucket.getFiles({ prefix }, (err, files) => {
  //   const fileNames = files.map((file) => file.name);
  //   console.log(`Found ${fileNames.length} files for ${date}`);
  //   const consolidatedFileName = `decisions_${date}.jsonl`;
  //   const consolidatedFilePath = path.join(__dirname, consolidatedFileName);
  //   const consolidatedFile = fs.createWriteStream(consolidatedFilePath, { encoding: 'utf8' });
  //   import('p-limit').then((pLimit) => {
  //     limit = pLimit.default(20);
  //     const promises = fileNames.map((fileName) => limit(() => addFileToConsolidatedFile(fileName, consolidatedFile)));
  //     return Promise.all(promises)
  //       .then(() => {
  //         consolidatedFile.end();
  //         return storage.bucket(CONSOLIDATED_BUCKET_NAME).upload(consolidatedFilePath)
  //           .then(() => {
  //             console.log(`Consolidated ${fileNames.length} files for ${date} in ${(new Date() - start_time) / 1000} seconds`);
  //             return 0;
  //           });
  //       });
  //   });
  // });
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(
    `Hello from Cloud Run! The container started successfully and is listening for HTTP requests on ${PORT} `
  );
});

module.exports = app;