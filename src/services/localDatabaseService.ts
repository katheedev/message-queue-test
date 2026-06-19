import {
  LocalBackupDocument,
  LocalFirebaseBackup,
  localFirebaseBackup,
} from "@/data/localFirebaseBackup";

type LocalCollectionName =
  | "applications"
  | "users"
  | "userAccess"
  | "user-access"
  | "testLogs";

type CanonicalLocalCollectionName =
  | "applications"
  | "users"
  | "userAccess"
  | "testLogs";

type LocalCollections = Record<
  CanonicalLocalCollectionName,
  Record<string, Record<string, unknown>>
>;

interface LocalDatabaseState {
  version: number;
  seededAt: string;
  collections: LocalCollections;
}

interface LocalDocument<T> {
  id: string;
  data: T;
}

const STORAGE_KEY = "mq-tester:local-database";

const getCollectionKey = (
  collectionName: LocalCollectionName,
): CanonicalLocalCollectionName =>
  collectionName === "user-access" ? "userAccess" : collectionName;

const cloneBackupDocuments = (documents: LocalBackupDocument[] = []) =>
  documents.reduce<Record<string, Record<string, unknown>>>((accumulator, document) => {
    if (!document?.id || !document.data || typeof document.data !== "object") {
      return accumulator;
    }

    accumulator[document.id] = structuredClone(document.data);
    return accumulator;
  }, {});

const createSeedState = (backup: LocalFirebaseBackup): LocalDatabaseState => ({
  version: 1,
  seededAt: new Date().toISOString(),
  collections: {
    applications: cloneBackupDocuments(backup.applications),
    users: cloneBackupDocuments(backup.users),
    userAccess: cloneBackupDocuments(backup.userAccess),
    testLogs: cloneBackupDocuments(backup.testLogs),
  },
});

const countCollectionEntries = (collections: LocalCollections) =>
  Object.values(collections).reduce(
    (count, collection) => count + Object.keys(collection).length,
    0,
  );

const backupDocumentCount = (backup: LocalFirebaseBackup) =>
  (backup.applications?.length || 0) +
  (backup.users?.length || 0) +
  (backup.userAccess?.length || 0) +
  (backup.testLogs?.length || 0);

const parseState = (value: string | null): LocalDatabaseState | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as
      | (LocalDatabaseState & {
          collections?: Partial<
            Record<
              CanonicalLocalCollectionName | "user-access",
              Record<string, Record<string, unknown>>
            >
          >;
        })
      | null;

    if (!parsed?.collections) {
      return null;
    }

    return {
      version: parsed.version || 1,
      seededAt: parsed.seededAt || new Date().toISOString(),
      collections: {
        applications: parsed.collections.applications || {},
        users: parsed.collections.users || {},
        userAccess:
          parsed.collections.userAccess || parsed.collections["user-access"] || {},
        testLogs: parsed.collections.testLogs || {},
      },
    };
  } catch {
    return null;
  }
};

const loadState = () => {
  const existing = parseState(localStorage.getItem(STORAGE_KEY));
  if (existing) {
    const existingCount = countCollectionEntries(existing.collections);
    const backupCount = backupDocumentCount(localFirebaseBackup);

    // If local storage was initialized before the backup file was populated,
    // transparently reseed once so local mode shows the backed up data.
    if (existingCount === 0 && backupCount > 0) {
      const reseeded = createSeedState(localFirebaseBackup);
      saveState(reseeded);
      return reseeded;
    }

    return existing;
  }

  const seeded = createSeedState(localFirebaseBackup);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

const saveState = (state: LocalDatabaseState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export class LocalDatabaseService {
  static reset(seed: LocalFirebaseBackup = localFirebaseBackup) {
    saveState(createSeedState(seed));
  }

  static listDocuments<T extends Record<string, unknown>>(
    collectionName: LocalCollectionName,
  ): LocalDocument<T>[] {
    const collection = loadState().collections[getCollectionKey(collectionName)];
    return Object.entries(collection).map(([id, data]) => ({
      id,
      data: structuredClone(data) as T,
    }));
  }

  static getDocument<T extends Record<string, unknown>>(
    collectionName: LocalCollectionName,
    id: string,
  ): LocalDocument<T> | null {
    const collection = loadState().collections[getCollectionKey(collectionName)];
    const document = collection[id];
    if (!document) {
      return null;
    }

    return { id, data: structuredClone(document) as T };
  }

  static setDocument<T extends Record<string, unknown>>(
    collectionName: LocalCollectionName,
    id: string,
    data: T,
  ) {
    const state = loadState();
    state.collections[getCollectionKey(collectionName)][id] = structuredClone(data);
    saveState(state);
  }

  static updateDocument<T extends Record<string, unknown>>(
    collectionName: LocalCollectionName,
    id: string,
    partial: Partial<T>,
  ) {
    const state = loadState();
    const current = state.collections[getCollectionKey(collectionName)][id];
    if (!current) {
      throw new Error(`Document not found in ${collectionName}: ${id}`);
    }

    state.collections[getCollectionKey(collectionName)][id] = {
      ...current,
      ...structuredClone(partial),
    };
    saveState(state);
  }

  static createDocument<T extends Record<string, unknown>>(
    collectionName: LocalCollectionName,
    data: T,
    id = crypto.randomUUID(),
  ) {
    this.setDocument(collectionName, id, data);
    return id;
  }

  static deleteDocument(collectionName: LocalCollectionName, id: string) {
    const state = loadState();
    delete state.collections[getCollectionKey(collectionName)][id];
    saveState(state);
  }
}
