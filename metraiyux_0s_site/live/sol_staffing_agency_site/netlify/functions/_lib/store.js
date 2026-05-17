const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const LOCAL_DIR = path.join(process.cwd(), ".staffing-db");
let blobStorePromise;

async function getBlobStore() {
  if (!process.env.NETLIFY && !process.env.NETLIFY_SITE_ID) return null;
  if (!blobStorePromise) {
    blobStorePromise = import("@netlify/blobs")
      .then(({ getStore }) => getStore({ name: "sol-staffing-os" }))
      .catch(() => null);
  }
  return blobStorePromise;
}

async function readLocal(key, fallback) {
  try {
    const raw = await fs.readFile(path.join(LOCAL_DIR, key), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeLocal(key, value) {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, key), JSON.stringify(value, null, 2));
}

async function readJson(key, fallback = []) {
  const store = await getBlobStore();
  if (store) {
    const value = await store.get(key, { type: "json" }).catch(() => null);
    return value || fallback;
  }
  return readLocal(key, fallback);
}

async function writeJson(key, value) {
  const store = await getBlobStore();
  if (store) {
    await store.setJSON(key, value);
    return;
  }
  await writeLocal(key, value);
}

function recordId(prefix = "rec") {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

async function append(collection, record) {
  const key = `${collection}.json`;
  const records = await readJson(key, []);
  records.unshift(record);
  await writeJson(key, records.slice(0, 5000));
  return record;
}

async function list(collection, limit = 250) {
  const records = await readJson(`${collection}.json`, []);
  return records.slice(0, limit);
}

async function get(collection, id) {
  const records = await readJson(`${collection}.json`, []);
  return records.find(record => record.id === id) || null;
}

async function put(collection, record) {
  const key = `${collection}.json`;
  const records = await readJson(key, []);
  const index = records.findIndex(item => item.id === record.id);
  if (index === -1) records.unshift(record);
  else records[index] = record;
  await writeJson(key, records);
  return record;
}

async function setObject(key, value) {
  const store = await getBlobStore();
  if (store) {
    await store.set(key, value);
    return;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, key.replaceAll("/", "__")), value);
}

async function getObject(key) {
  const store = await getBlobStore();
  if (store) return store.get(key);
  try {
    return await fs.readFile(path.join(LOCAL_DIR, key.replaceAll("/", "__")), "utf8");
  } catch {
    return null;
  }
}

module.exports = { append, get, getObject, list, put, readJson, recordId, setObject, writeJson };
