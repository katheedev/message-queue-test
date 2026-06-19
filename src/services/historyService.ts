import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isLocalEnvironment } from "@/lib/runtimeEnvironment";
import { LocalDatabaseService } from "@/services/localDatabaseService";
import { MessageLog } from "@/types/environment";

export class HistoryService {
  private static readonly COLLECTION = "testLogs";

  static async logMessage(
    log: Omit<MessageLog, "id" | "timestamp">,
  ): Promise<string> {
    if (isLocalEnvironment()) {
      return LocalDatabaseService.createDocument(this.COLLECTION, {
        ...log,
        timestamp: new Date().toISOString(),
      });
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const reference = await addDoc(collection(db, this.COLLECTION), {
      ...log,
      timestamp: new Date().toISOString(),
    });
    return reference.id;
  }

  static async getLogsForApplication(
    applicationId: string,
    maxLogs = 20,
  ): Promise<MessageLog[]> {
    if (isLocalEnvironment()) {
      return LocalDatabaseService.listDocuments<MessageLog>(this.COLLECTION)
        .map((entry) => ({ id: entry.id, ...entry.data }))
        .filter((entry) => entry.appId === applicationId)
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(0, maxLogs);
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const logQuery = query(
      collection(db, this.COLLECTION),
      where("appId", "==", applicationId),
      orderBy("timestamp", "desc"),
      limit(maxLogs),
    );
    const snapshot = await getDocs(logQuery);
    return snapshot.docs.map(
      (entry) => ({ id: entry.id, ...entry.data() }) as MessageLog,
    );
  }
}
