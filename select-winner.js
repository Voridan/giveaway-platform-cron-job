const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: '172.22.48.1',
  database: 'Giveaway',
  password: '87vordan10',
  port: 5432,
});

async function selectWinner() {
  try {
    await client.connect();
    const endedWithoutWinner = await client.query(`
        SELECT id
        FROM giveaway
        WHERE giveaway.ended = TRUE AND "winnerId" IS null
      `);

    if (endedWithoutWinner.rows.length) {
      for (const giveaway of endedWithoutWinner.rows) {
        const participants = await client.query(
          `
            SELECT id
            FROM participant
            WHERE "giveawayId" = $1
            ORDER BY id ASC
          `,
          [giveaway.id]
        );
        if (participants.rows.length) {
          const rows = participants.rows;
          const min = participants.rows[0].id;
          const max = participants.rows[rows.length - 1].id;
          const winnerId = await getRandomNumberApiCall(min, max);

          await client.query(
            `
              UPDATE giveaway
              SET "winnerId" = $1
              WHERE id = $2
            `,
            [winnerId, giveaway.id]
          );
          console.log(
            `Giveaway ${giveaway.id}: Winner selected - Participant ${winnerId}`
          );
        }
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}

async function getRandomNumberApiCall(min, max) {
  const url = 'https://api.random.org/json-rpc/4/invoke';
  const apiKey = '27d5be5f-88f5-47ca-ab85-591c5010c6c5';

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

selectWinner();
