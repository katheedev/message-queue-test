import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Assignment } from '@/types/environment';

export class UserService {
  private static readonly USER_COLLECTION = 'users';
  private static readonly ASSIGNMENT_COLLECTION = 'assignments';

  static async getUsers(): Promise<User[]> {
    const querySnapshot = await getDocs(collection(db, this.USER_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }

  static async getQAs(): Promise<User[]> {
    const q = query(collection(db, this.USER_COLLECTION), where('role', '==', 'qa'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }

  static async createUser(user: User): Promise<void> {
    await setDoc(doc(db, this.USER_COLLECTION, user.id), user);
  }

  static async assignUserToApp(userId: string, appId: string): Promise<void> {
    const id = `${userId}_${appId}`;
    await setDoc(doc(db, this.ASSIGNMENT_COLLECTION, id), {
      userId,
      appId,
      assignedAt: new Date().toISOString()
    });
  }

  static async getAssignmentsForUser(userId: string): Promise<string[]> {
    const q = query(collection(db, this.ASSIGNMENT_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => (doc.data() as Assignment).appId);
  }

  static async getAssignmentsForApp(appId: string): Promise<string[]> {
    const q = query(collection(db, this.ASSIGNMENT_COLLECTION), where('appId', '==', appId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => (doc.data() as Assignment).userId);
  }

  static async removeAssignment(userId: string, appId: string): Promise<void> {
    const id = `${userId}_${appId}`;
    await deleteDoc(doc(db, this.ASSIGNMENT_COLLECTION, id));
  }
}
