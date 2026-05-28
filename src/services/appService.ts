import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { App, Environment, KafkaEnvironmentConfig, JmsEnvironmentConfig, Consumer } from '@/types/environment';

export class AppService {
  private static readonly COLLECTION = 'apps';

  static async getApps(): Promise<App[]> {
    const querySnapshot = await getDocs(collection(db, this.COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as App));
  }

  static async getApp(id: string): Promise<App | null> {
    const docRef = doc(db, this.COLLECTION, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as App) : null;
  }

  static async createApp(appData: Omit<App, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, this.COLLECTION), {
      ...appData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  }

  static async updateApp(id: string, appData: Partial<App>): Promise<void> {
    const docRef = doc(db, this.COLLECTION, id);
    await updateDoc(docRef, appData);
  }

  static async deleteApp(id: string): Promise<void> {
    await deleteDoc(doc(db, this.COLLECTION, id));
  }

  static async saveConsumer(appId: string, consumer: Consumer): Promise<void> {
    const app = await this.getApp(appId);
    if (!app) throw new Error('App not found');

    const consumers = [...app.consumers];
    const index = consumers.findIndex(c => c.name === consumer.name);
    
    if (index >= 0) {
      consumers[index] = consumer;
    } else {
      consumers.push(consumer);
    }

    await this.updateApp(appId, { consumers });
  }
}
