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
import { MessageLog } from "@/types/environment";

export class HistoryService {
  private static readonly COLLECTION = "testLogs";

  static async logMessage(
    log: Omit<MessageLog, "id" | "timestamp">,
  ): Promise<string> {
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
