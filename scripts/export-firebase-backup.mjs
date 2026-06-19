import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULT_COLLECTIONS = [
  "applications",
  "users",
  "user-access",
  "testLogs",
];

const DEFAULT_TS_OUTPUT = path.join(
  projectRoot,
  "src",
  "data",
  "localFirebaseBackup.ts",
);

const DEFAULT_JSON_OUTPUT = path.join(projectRoot, "firebase-backup.json");

const ENV_FILES = [".env.local", ".env"];

const toCamelCase = (value) =>
  value.replace(/-([a-z])/g, (_, character) => character.toUpperCase());

const parseEnvFile = (content) => {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
};

const loadEnvironment = () => {
  const env = { ...process.env };

  for (const envFile of ENV_FILES) {
    const envPath = path.join(projectRoot, envFile);
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const fileValues = parseEnvFile(fs.readFileSync(envPath, "utf8"));
    for (const [key, value] of Object.entries(fileValues)) {
      if (!(key in env)) {
        env[key] = value;
      }
    }
  }

  return env;
};

const requiredFirebaseKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const createFirebaseConfig = (env) => {
  const missingKeys = requiredFirebaseKeys.filter((key) => !env[key]);
  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase environment variables: ${missingKeys.join(", ")}`,
    );
  }

  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
};

const parseArgs = (argv) => {
  const options = {
    format: "ts",
    outputPath: DEFAULT_TS_OUTPUT,
    collections: DEFAULT_COLLECTIONS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      options.format = "json";
      options.outputPath = DEFAULT_JSON_OUTPUT;
      continue;
    }

    if (arg === "--ts") {
      options.format = "ts";
      options.outputPath = DEFAULT_TS_OUTPUT;
      continue;
    }

    if (arg === "--out") {
      options.outputPath = path.resolve(projectRoot, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === "--collections") {
      options.collections = argv[index + 1]
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === "--help") {
      options.help = true;
      continue;
    }
  }

  return options;
};

const isTimestampLike = (value) =>
  value &&
  typeof value === "object" &&
  typeof value.toDate === "function" &&
  typeof value.seconds === "number";

const sanitizeValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (isTimestampLike(value)) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        sanitizeValue(entryValue),
      ]),
    );
  }

  return value;
};

const exportCollections = async (firestore, collections) => {
  const result = {};

  for (const collectionName of collections) {
    const snapshot = await getDocs(collection(firestore, collectionName));
    result[toCamelCase(collectionName)] = snapshot.docs.map((document) => ({
      id: document.id,
      data: sanitizeValue(document.data()),
    }));
  }

  return result;
};

const toTypeScriptModule = (backup) => `export interface LocalBackupDocument<T = Record<string, unknown>> {
  id: string;
  data: T;
}

export interface LocalFirebaseBackup {
  applications?: LocalBackupDocument[];
  users?: LocalBackupDocument[];
  userAccess?: LocalBackupDocument[];
  testLogs?: LocalBackupDocument[];
}

export const localFirebaseBackup: LocalFirebaseBackup = ${JSON.stringify(backup, null, 2)};\n`;

const printHelp = () => {
  console.log(`Usage:
  npm run export:firebase-backup
  npm run export:firebase-backup -- --json
  npm run export:firebase-backup -- --out tmp/my-backup.json
  npm run export:firebase-backup -- --collections applications,users

Default behavior writes:
  src/data/localFirebaseBackup.ts

The script reads Firebase config from:
  .env.local, then .env, then existing process environment
`);
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const env = loadEnvironment();
  const firebaseConfig = createFirebaseConfig(env);
  const app = initializeApp(firebaseConfig);
  const firestore = getFirestore(app);
  const backup = await exportCollections(firestore, options.collections);

  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });

  const output =
    options.format === "json"
      ? `${JSON.stringify(backup, null, 2)}\n`
      : toTypeScriptModule(backup);

  fs.writeFileSync(options.outputPath, output, "utf8");

  console.log(
    `Exported ${options.collections.join(", ")} to ${path.relative(projectRoot, options.outputPath)}`,
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
