import { collection, doc, getDoc, getDocs, setDoc, query, where, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MessageLog } from '@/types/environment';

export class HistoryService {
  private static readonly COLLECTION = 'testLogs';

  static async logMessage(log: Omit<MessageLog, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, this.COLLECTION), {
      ...log,
      timestamp: new Date().toISOString()
    });
    return docRef.id;
  }

  static async getLogsForApp(appId: string, maxLogs: number = 50): Promise<MessageLog[]> {
    const q = query(
      collection(db, this.COLLECTION), 
      where('appId', '==', appId),
      orderBy('timestamp', 'desc'),
      limit(maxLogs)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageLog));
  }

  static async getLogsForConsumer(appId: string, consumerName: string, maxLogs: number = 20): Promise<MessageLog[]> {
    const q = query(
      collection(db, this.COLLECTION), 
      where('appId', '==', appId),
      where('consumerName', '==', consumerName),
      orderBy('timestamp', 'desc'),
      limit(maxLogs)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageLog));
  }
}
