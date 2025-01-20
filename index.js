// This module is pure mess, just for AppRunner deployment checks.
// Please don't write code like this unless you plan to throw it away.
import express from "express";
import pg from "pg";

const config = {
  app: {
    port: process.env.APP_PORT ?? 3000,
    pingRateMs: process.env.APP_PING_RATE_MS ?? 10000,
    webPingUrl: "https://jsonplaceholder.typicode.com/users/1",
  },
  pg: {
    host: process.env.PG_HOST ?? "localhost",
    port: process.env.PG_PORT ?? 5432,
    user: process.env.PG_USER ?? "postgres",
    password: process.env.PG_PASSWORD ?? "",
    database: process.env.PG_DATABASE ?? "postgres",
    ssl: { rejectUnauthorized: false }, // TODO: Configure
  },
};

function mkStatus(error) {
  return {
    pingedAt: new Date().toString(),
    isOk: !error,
    lastError: error ?? null,
  };
}

const status = {
  pg: mkStatus("Not checked"),
  web: mkStatus("Not checked"),
};

async function pingPg() {
  const client = new pg.Client(config.pg);
  try {
    await client.connect();
    console.log("PostgreSQL connection established");
    const res = await client.query("SELECT $1::text as message", ["test"]);
    status.pg = mkStatus(
      res?.rows?.[0]?.message === "test"
        ? null
        : `Incorrect data fetched: ${res?.rows?.[0]?.message}`
    );
    console.log(`Fetched from PG: ${res?.rows?.[0]?.message}`);
  } catch (err) {
    status.pg = mkStatus(err); // Extremely unsafe, don't use in production
    console.error(`PG error: ${err}`);
  } finally {
    await client.end();
  }
}

async function pingWeb() {
  try {
    const response = await fetch(config.app.webPingUrl);
    const data = await response.json();
    status.web = mkStatus(
      data.id === 1 && data.name === "Leanne Graham" // Plain shameful hardcode
        ? null
        : `Incorrect data fetched: ${JSON.stringify(data)}`
    );
    console.log(`Received data from web: ${JSON.stringify(data)}`);
  } catch (err) {
    status.web = mkStatus(err);
  }
}

// TODO: Duplicate calls checks
setInterval(() => {
  pingPg();
  pingWeb();
}, config.app.pingRateMs);

const app = express();

app.get("/", (req, res) => {
  res.send({ status });
});

app.listen(config.app.port, () => {
  console.log(`App listening on port ${config.app.port}`);
});
