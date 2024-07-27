const fs = require('fs/promises');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({
  path: path.join(__dirname, '.env')
});
const uri = process.env.MONGO_REMOTE_URI;
const client = new MongoClient(uri);

const dbName = 'test';
const database = client.db(dbName);
const collection = 'giveawaydocuments';

async function selectWinner() {
  try {
    await client.connect();
    const giveawaysCollection = database.collection(collection);
    const endedGiveaways = await giveawaysCollection
      .find({
        ended: true,
        winner: null,
      })
      .project({ participants: 1 })
      .toArray();

    if (endedGiveaways.length !== 0) {
      for (const giveaway of endedGiveaways) {
        const { participants } = giveaway;
        if (participants.length !== 0) {
          const min = 0;
          const max = participants.length - 1;
          const winnerIdx = await getRandomNumberApiCall(min, max);
          const winner = participants[winnerIdx];
          await giveawaysCollection.updateOne(
            { _id: giveaway._id },
            { $set: { winner } }
          );
          await logToFile(`Giveaway ${giveaway.id}: Winner selected - Participant ${winner}`);
        }
      }
    }
  } catch (error) {
    await logToFile(error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

selectWinner();

async function getRandomNumberApiCall(min, max) {
  const url = 'https://api.random.org/json-rpc/4/invoke';
  const apiKey = process.env.API_KEY;

  const payload = {
    jsonrpc: '2.0',
    method: 'generateIntegers',
    params: {
      apiKey,
      n: 1,
      min,
      max,
    },
    id: 42,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return data.result.random.data[0];
}

async function logToFile(message) {
  try {
    const logFilePath = path.join(__dirname, 'application.log');
    await fs.appendFile(logFilePath, `${new Date().toISOString()} - ${message}\n`);
  } catch (err) {
    console.error('Failed to write log:', err);
  }
}