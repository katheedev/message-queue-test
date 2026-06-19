import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isLocalEnvironment } from "@/lib/runtimeEnvironment";
import { LocalDatabaseService } from "@/services/localDatabaseService";
import {
  SessionUser,
  User,
  UserApplicationAccess,
  UserRole,
  toSessionUser,
} from "@/types/environment";
import { SecurityService } from "@/services/securityService";

const USERS_COLLECTION = "users";
const USER_ACCESS_COLLECTION = "user-access";

export const DEFAULT_ADMIN_CREDENTIALS = {
  email: "admin@mqtester.local",
  password: "admin123",
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const ensureAdminCount = async () => {
  const admins = await UserService.getUsersByRole("admin");
  if (admins.length === 0) {
    throw new Error("At least one admin user is required.");
  }
};

const listLocalUsers = () =>
  LocalDatabaseService.listDocuments<User>(USERS_COLLECTION).map((entry) => ({
    id: entry.id,
    ...entry.data,
    email: normalizeEmail(entry.data.email || ""),
  }));

export class UserService {
  static async ensureBootstrapAdmin(): Promise<void> {
    if (isLocalEnvironment()) {
      const users = listLocalUsers();
      const bootstrapAdmin = users.find(
        (user) => user.email === DEFAULT_ADMIN_CREDENTIALS.email,
      );
      const now = new Date().toISOString();

      if (bootstrapAdmin?.passwordHash) {
        return;
      }

      const passwordHash = await SecurityService.hashPassword(
        DEFAULT_ADMIN_CREDENTIALS.password,
      );

      if (bootstrapAdmin) {
        LocalDatabaseService.updateDocument<User>(USERS_COLLECTION, bootstrapAdmin.id, {
          name: bootstrapAdmin.name || "System Admin",
          role: "admin",
          passwordHash,
          active: bootstrapAdmin.active ?? true,
          updatedAt: now,
          createdAt: bootstrapAdmin.createdAt || now,
        });
        return;
      }

      LocalDatabaseService.createDocument(USERS_COLLECTION, {
        email: DEFAULT_ADMIN_CREDENTIALS.email,
        name: "System Admin",
        role: "admin",
        passwordHash,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users = snapshot.docs.map(
      (entry) =>
        ({
          id: entry.id,
          ...entry.data(),
          email: normalizeEmail(entry.data().email || ""),
        }) as User,
    );
    const bootstrapAdmin = users.find(
      (user) => user.email === DEFAULT_ADMIN_CREDENTIALS.email,
    );
    const now = new Date().toISOString();

    if (bootstrapAdmin?.passwordHash) {
      return;
    }

    const passwordHash = await SecurityService.hashPassword(
      DEFAULT_ADMIN_CREDENTIALS.password,
    );

    if (bootstrapAdmin) {
      await updateDoc(doc(db, USERS_COLLECTION, bootstrapAdmin.id), {
        name: bootstrapAdmin.name || "System Admin",
        role: "admin",
        passwordHash,
        active: bootstrapAdmin.active ?? true,
        updatedAt: now,
        createdAt: bootstrapAdmin.createdAt || now,
      });
      return;
    }

    await addDoc(collection(db, USERS_COLLECTION), {
      email: DEFAULT_ADMIN_CREDENTIALS.email,
      name: "System Admin",
      role: "admin",
      passwordHash,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static async getUsers(): Promise<User[]> {
    if (isLocalEnvironment()) {
      return listLocalUsers();
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    return snapshot.docs.map(
      (entry) =>
        ({
          id: entry.id,
          ...entry.data(),
          email: normalizeEmail(entry.data().email || ""),
        }) as User,
    );
  }

  static async getUser(userId: string): Promise<User | null> {
    if (isLocalEnvironment()) {
      const document = LocalDatabaseService.getDocument<User>(USERS_COLLECTION, userId);
      return document
        ? {
            id: document.id,
            ...document.data,
            email: normalizeEmail(document.data.email || ""),
          }
        : null;
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const reference = doc(db, USERS_COLLECTION, userId);
    const snapshot = await getDoc(reference);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
      email: normalizeEmail(snapshot.data().email || ""),
    } as User;
  }

  static async getUsersByRole(role: UserRole): Promise<User[]> {
    if (isLocalEnvironment()) {
      return listLocalUsers().filter((user) => user.role === role);
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const roleQuery = query(
      collection(db, USERS_COLLECTION),
      where("role", "==", role),
    );
    const snapshot = await getDocs(roleQuery);
    return snapshot.docs.map(
      (entry) =>
        ({
          id: entry.id,
          ...entry.data(),
          email: normalizeEmail(entry.data().email || ""),
        }) as User,
    );
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    if (isLocalEnvironment()) {
      return (
        listLocalUsers().find(
          (user) => user.email === normalizeEmail(email),
        ) || null
      );
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const userQuery = query(
      collection(db, USERS_COLLECTION),
      where("email", "==", normalizeEmail(email)),
    );
    const snapshot = await getDocs(userQuery);
    if (snapshot.empty) {
      return null;
    }

    const userDoc = snapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data(),
      email: normalizeEmail(userDoc.data().email || ""),
    } as User;
  }

  static async authenticate(
    email: string,
    password: string,
  ): Promise<SessionUser> {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new Error("Invalid email or password.");
    }

    if (!user.active) {
      throw new Error("This user account is disabled.");
    }

    if (!user.passwordHash) {
      throw new Error(
        "This account does not have a password yet. Sign in with the bootstrap admin and reset it.",
      );
    }

    const matches = await SecurityService.verifyPassword(password, user.passwordHash);
    if (!matches) {
      throw new Error("Invalid email or password.");
    }

    if (isLocalEnvironment()) {
      LocalDatabaseService.updateDocument<User>(USERS_COLLECTION, user.id, {
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return toSessionUser(user);
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    await updateDoc(doc(db, USERS_COLLECTION, user.id), {
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return toSessionUser(user);
  }

  static async createUser(input: {
    email: string;
    name: string;
    role: UserRole;
    password: string;
  }): Promise<string> {
    const email = normalizeEmail(input.email);
    const existing = await this.getUserByEmail(email);
    if (existing) {
      throw new Error("A user with this email already exists.");
    }

    const now = new Date().toISOString();
    const passwordHash = await SecurityService.hashPassword(input.password);

    if (isLocalEnvironment()) {
      return LocalDatabaseService.createDocument(USERS_COLLECTION, {
        email,
        name: input.name.trim(),
        role: input.role,
        passwordHash,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const reference = doc(collection(db, USERS_COLLECTION));

    await setDoc(reference, {
      email,
      name: input.name.trim(),
      role: input.role,
      passwordHash,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    return reference.id;
  }

  static async updateUser(
    userId: string,
    input: Partial<Pick<User, "email" | "name" | "role" | "active">>,
  ): Promise<void> {
    const current = await this.getUser(userId);
    if (!current) {
      throw new Error("User not found.");
    }

    const nextEmail = input.email ? normalizeEmail(input.email) : current.email;
    if (nextEmail !== current.email) {
      const existing = await this.getUserByEmail(nextEmail);
      if (existing && existing.id !== userId) {
        throw new Error("A user with this email already exists.");
      }
    }

    if (isLocalEnvironment()) {
      LocalDatabaseService.updateDocument<User>(USERS_COLLECTION, userId, {
        ...(input.email ? { email: nextEmail } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.role ? { role: input.role } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        updatedAt: new Date().toISOString(),
      });
      await ensureAdminCount();
      return;
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      ...(input.email ? { email: nextEmail } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      updatedAt: new Date().toISOString(),
    });

    await ensureAdminCount();
  }

  static async resetPassword(userId: string, password: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const passwordHash = await SecurityService.hashPassword(password);
    if (isLocalEnvironment()) {
      LocalDatabaseService.updateDocument<User>(USERS_COLLECTION, userId, {
        passwordHash,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      passwordHash,
      updatedAt: new Date().toISOString(),
    });
  }

  static async deleteUser(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      return;
    }

    if (user.role === "admin") {
      const admins = await this.getUsersByRole("admin");
      if (admins.length <= 1) {
        throw new Error("You cannot delete the last admin user.");
      }
    }

    if (isLocalEnvironment()) {
      LocalDatabaseService.deleteDocument(USERS_COLLECTION, userId);
      LocalDatabaseService.deleteDocument(USER_ACCESS_COLLECTION, userId);
      await ensureAdminCount();
      return;
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    await deleteDoc(doc(db, USERS_COLLECTION, userId));
    await deleteDoc(doc(db, USER_ACCESS_COLLECTION, userId));
    await ensureAdminCount();
  }

  static async getUserAccess(userId: string): Promise<UserApplicationAccess[]> {
    if (isLocalEnvironment()) {
      const document = LocalDatabaseService.getDocument<{
        applications?: UserApplicationAccess[];
      }>(USER_ACCESS_COLLECTION, userId);
      if (!document) {
        return [];
      }

      const accessList = Array.isArray(document.data.applications)
        ? document.data.applications
        : [];

      return accessList
        .filter((entry) => entry?.appId)
        .map((entry) => ({
          appId: entry.appId,
          environmentIds: Array.isArray(entry.environmentIds)
            ? entry.environmentIds.filter(Boolean)
            : [],
        }));
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const snapshot = await getDoc(doc(db, USER_ACCESS_COLLECTION, userId));
    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.data();
    const accessList = Array.isArray(data.applications) ? data.applications : [];
    return accessList
      .filter((entry) => entry?.appId)
      .map((entry) => ({
        appId: entry.appId,
        environmentIds: Array.isArray(entry.environmentIds)
          ? entry.environmentIds.filter(Boolean)
          : [],
      }));
  }

  static async updateUserAccess(
    userId: string,
    applications: UserApplicationAccess[],
  ): Promise<void> {
    if (isLocalEnvironment()) {
      LocalDatabaseService.setDocument(USER_ACCESS_COLLECTION, userId, {
        applications: applications
          .filter((entry) => entry.appId && entry.environmentIds.length > 0)
          .map((entry) => ({
            appId: entry.appId,
            environmentIds: Array.from(new Set(entry.environmentIds)),
          })),
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    await setDoc(doc(db, USER_ACCESS_COLLECTION, userId), {
      applications: applications
        .filter((entry) => entry.appId && entry.environmentIds.length > 0)
        .map((entry) => ({
          appId: entry.appId,
          environmentIds: Array.from(new Set(entry.environmentIds)),
        })),
      updatedAt: new Date().toISOString(),
    });
  }
}
