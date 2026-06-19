import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isLocalEnvironment } from "@/lib/runtimeEnvironment";
import { LocalDatabaseService } from "@/services/localDatabaseService";
import {
  AppEnvironment,
  EnvironmentKind,
  MessagingApplication,
  ProducerProfile,
  createDefaultEnvironment,
  createDefaultJmsConfig,
  createDefaultKafkaConfig,
  createDefaultProducerProfile,
} from "@/types/environment";

const APPLICATIONS_COLLECTION = "applications";

const now = () => new Date().toISOString();

const createId = () => crypto.randomUUID();

const normalizeJsonString = (value: string, fallback = "{}") => {
  const trimmed = value.trim();
  return trimmed || fallback;
};

const prettifyLegacyEnvironmentName = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const normalizeProducer = (rawValue: unknown): ProducerProfile => {
  const rawProducer = toRecord(rawValue);
  const createdAt = rawProducer.createdAt || now();
  const updatedAt = rawProducer.updatedAt || createdAt;

  return {
    id: rawProducer.id || createId(),
    name: rawProducer.name || "Untitled Producer",
    description: rawProducer.description || "",
    transport:
      rawProducer.transport ||
      rawProducer.type ||
      (rawProducer.queue ? "jms" : "kafka"),
    status: rawProducer.status || "active",
    destination:
      rawProducer.destination || rawProducer.topic || rawProducer.queue || "",
    messageFormat: rawProducer.messageFormat || "json",
    defaultKey: rawProducer.defaultKey || rawProducer.sampleKey || "",
    defaultHeaders: normalizeJsonString(
      rawProducer.defaultHeaders || rawProducer.headers || "{}",
      "{}",
    ),
    defaultPayload:
      rawProducer.defaultPayload || rawProducer.samplePayload || "{\n  \n}",
    protoSchema: rawProducer.protoSchema || "",
    messageType: rawProducer.messageType || "",
    createdAt,
    updatedAt,
  };
};

const normalizeEnvironment = (rawValue: unknown): AppEnvironment => {
  const rawEnvironment = toRecord(rawValue);
  const createdAt = rawEnvironment.createdAt || now();
  const updatedAt = rawEnvironment.updatedAt || createdAt;

  return {
    id: rawEnvironment.id || createId(),
    name: rawEnvironment.name || "Environment",
    kind: rawEnvironment.kind || "staging",
    description: rawEnvironment.description || "",
    kafkaConfig: {
      ...createDefaultKafkaConfig(),
      ...(rawEnvironment.kafkaConfig || {}),
    },
    jmsConfig: {
      ...createDefaultJmsConfig(),
      ...(rawEnvironment.jmsConfig || {}),
    },
    producers: Array.isArray(rawEnvironment.producers)
      ? rawEnvironment.producers.map(normalizeProducer)
      : [],
    createdAt,
    updatedAt,
  };
};

const normalizeLegacyApplication = (
  rawValue: unknown,
  applicationId: string,
): MessagingApplication => {
  const rawApplication = toRecord(rawValue);
  const createdAt = rawApplication.createdAt || now();
  const updatedAt = rawApplication.updatedAt || createdAt;

  if (Array.isArray(rawApplication.environments)) {
    return {
      id: applicationId,
      name: rawApplication.name || "Untitled Application",
      description: rawApplication.description || "",
      environments: rawApplication.environments.map(normalizeEnvironment),
      createdAt,
      updatedAt,
    };
  }

  const legacyKafkaConfig = rawApplication.kafkaConfig || {};
  const legacyJmsConfig = rawApplication.jmsConfig || {};
  const legacyConsumers = Array.isArray(rawApplication.consumers)
    ? rawApplication.consumers.map(normalizeProducer)
    : [];

  const environmentKeys = Array.from(
    new Set([
      ...Object.keys(legacyKafkaConfig),
      ...Object.keys(legacyJmsConfig),
      "stage",
    ]),
  );

  const environments = environmentKeys.map((key, index) => ({
    id: key,
    name: prettifyLegacyEnvironmentName(key),
    kind: key.toLowerCase().includes("prod") ? "production" : "staging",
    description: index === 0 ? "Migrated from legacy configuration." : "",
    kafkaConfig: {
      ...createDefaultKafkaConfig(),
      ...(legacyKafkaConfig[key] || {}),
    },
    jmsConfig: {
      ...createDefaultJmsConfig(),
      ...(legacyJmsConfig[key] || {}),
    },
    producers: legacyConsumers.map((producer) => ({
      ...producer,
      id: createId(),
      createdAt: now(),
      updatedAt: now(),
    })),
    createdAt,
    updatedAt,
  }));

  return {
    id: applicationId,
    name: rawApplication.name || "Untitled Application",
    description: rawApplication.description || "",
    environments,
    createdAt,
    updatedAt,
  };
};

const persistApplication = async (
  applicationId: string,
  input: Partial<MessagingApplication>,
) => {
  if (isLocalEnvironment()) {
    LocalDatabaseService.updateDocument("applications", applicationId, {
      ...input,
      updatedAt: now(),
    });
    return;
  }

  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await updateDoc(doc(db, APPLICATIONS_COLLECTION, applicationId), {
    ...input,
    updatedAt: now(),
  });
};

export class AppService {
  static async getApplications(): Promise<MessagingApplication[]> {
    if (isLocalEnvironment()) {
      return LocalDatabaseService.listDocuments<Record<string, unknown>>(
        APPLICATIONS_COLLECTION,
      ).map((entry) => normalizeLegacyApplication(entry.data, entry.id));
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const snapshot = await getDocs(collection(db, APPLICATIONS_COLLECTION));
    return snapshot.docs.map((entry) =>
      normalizeLegacyApplication(entry.data(), entry.id),
    );
  }

  static async getApplication(
    applicationId: string,
  ): Promise<MessagingApplication | null> {
    if (isLocalEnvironment()) {
      const document = LocalDatabaseService.getDocument<Record<string, unknown>>(
        APPLICATIONS_COLLECTION,
        applicationId,
      );
      return document
        ? normalizeLegacyApplication(document.data, document.id)
        : null;
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const reference = doc(db, APPLICATIONS_COLLECTION, applicationId);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) {
      return null;
    }

    return normalizeLegacyApplication(snapshot.data(), snapshot.id);
  }

  static async createApplication(input: {
    name: string;
    description: string;
  }): Promise<string> {
    const timestamp = now();
    if (isLocalEnvironment()) {
      return LocalDatabaseService.createDocument(APPLICATIONS_COLLECTION, {
        name: input.name.trim(),
        description: input.description.trim(),
        environments: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    const reference = await addDoc(collection(db, APPLICATIONS_COLLECTION), {
      name: input.name.trim(),
      description: input.description.trim(),
      environments: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return reference.id;
  }

  static async updateApplication(
    applicationId: string,
    input: Partial<Pick<MessagingApplication, "name" | "description">>,
  ): Promise<void> {
    await persistApplication(applicationId, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
    });
  }

  static async deleteApplication(applicationId: string): Promise<void> {
    if (isLocalEnvironment()) {
      LocalDatabaseService.deleteDocument(APPLICATIONS_COLLECTION, applicationId);
      return;
    }

    if (!db) {
      throw new Error("Firebase is not configured.");
    }

    await deleteDoc(doc(db, APPLICATIONS_COLLECTION, applicationId));
  }

  static async createEnvironment(
    applicationId: string,
    input: { name: string; kind: EnvironmentKind; description: string },
  ): Promise<void> {
    const application = await this.getApplication(applicationId);
    if (!application) {
      throw new Error("Application not found.");
    }

    const duplicate = application.environments.find(
      (environment) =>
        environment.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
    );
    if (duplicate) {
      throw new Error("An environment with this name already exists.");
    }

    const timestamp = now();
    const environment: AppEnvironment = {
      id: createId(),
      ...createDefaultEnvironment(input.name.trim(), input.kind),
      description: input.description.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await persistApplication(applicationId, {
      environments: [...application.environments, environment],
    });
  }

  static async updateEnvironment(
    applicationId: string,
    environmentId: string,
    input: Partial<Omit<AppEnvironment, "id" | "createdAt">>,
  ): Promise<void> {
    const application = await this.getApplication(applicationId);
    if (!application) {
      throw new Error("Application not found.");
    }

    const environments = application.environments.map((environment) =>
      environment.id === environmentId
        ? {
            ...environment,
            ...input,
            kafkaConfig: input.kafkaConfig
              ? { ...createDefaultKafkaConfig(), ...input.kafkaConfig }
              : environment.kafkaConfig,
            jmsConfig: input.jmsConfig
              ? { ...createDefaultJmsConfig(), ...input.jmsConfig }
              : environment.jmsConfig,
            updatedAt: now(),
          }
        : environment,
    );

    await persistApplication(applicationId, { environments });
  }

  static async deleteEnvironment(
    applicationId: string,
    environmentId: string,
  ): Promise<void> {
    const application = await this.getApplication(applicationId);
    if (!application) {
      throw new Error("Application not found.");
    }

    await persistApplication(applicationId, {
      environments: application.environments.filter(
        (environment) => environment.id !== environmentId,
      ),
    });
  }

  static async upsertProducer(
    applicationId: string,
    environmentId: string,
    input: Partial<ProducerProfile>,
  ): Promise<void> {
    const application = await this.getApplication(applicationId);
    if (!application) {
      throw new Error("Application not found.");
    }

    const environments = application.environments.map((environment) => {
      if (environment.id !== environmentId) {
        return environment;
      }

      const baseProducer = input.id
        ? environment.producers.find((producer) => producer.id === input.id)
        : null;
      const timestamp = now();
      const nextProducer: ProducerProfile = {
        ...createDefaultProducerProfile(),
        ...baseProducer,
        ...input,
        id: input.id || createId(),
        defaultHeaders: normalizeJsonString(
          input.defaultHeaders || baseProducer?.defaultHeaders || "{}",
          "{}",
        ),
        createdAt: baseProducer?.createdAt || timestamp,
        updatedAt: timestamp,
      } as ProducerProfile;

      const remaining = environment.producers.filter(
        (producer) => producer.id !== nextProducer.id,
      );

      return {
        ...environment,
        producers: [...remaining, nextProducer].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
        updatedAt: timestamp,
      };
    });

    await persistApplication(applicationId, { environments });
  }

  static async deleteProducer(
    applicationId: string,
    environmentId: string,
    producerId: string,
  ): Promise<void> {
    const application = await this.getApplication(applicationId);
    if (!application) {
      throw new Error("Application not found.");
    }

    const environments = application.environments.map((environment) =>
      environment.id === environmentId
        ? {
            ...environment,
            producers: environment.producers.filter(
              (producer) => producer.id !== producerId,
            ),
            updatedAt: now(),
          }
        : environment,
    );

    await persistApplication(applicationId, { environments });
  }
}
