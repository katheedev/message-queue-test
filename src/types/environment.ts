export type UserRole = "admin" | "qa";
export type EnvironmentKind = "staging" | "production";
export type TransportType = "kafka" | "jms";
export type MessageFormat = "json" | "protobuf" | "string";

export interface KafkaConfig {
  bootstrapServers: string;
  clientId: string;
  groupId: string;
  securityProtocol: string;
  saslMechanism: string;
  saslUsername: string;
  saslPassword: string;
  sslEnabled: boolean;
  extraProperties: string;
}

export interface JmsConfig {
  qmgr: string;
  host: string;
  port: number;
  channel: string;
  user: string;
  password: string;
  connectionFactory: string;
  extraProperties: string;
}

export interface ProducerProfile {
  id: string;
  name: string;
  description: string;
  transport: TransportType;
  status: "active" | "inactive";
  destination: string;
  messageFormat: MessageFormat;
  defaultKey: string;
  defaultHeaders: string;
  defaultPayload: string;
  protoSchema: string;
  messageType: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppEnvironment {
  id: string;
  name: string;
  kind: EnvironmentKind;
  description: string;
  kafkaConfig: KafkaConfig;
  jmsConfig: JmsConfig;
  producers: ProducerProfile[];
  createdAt: string;
  updatedAt: string;
}

export interface MessagingApplication {
  id: string;
  name: string;
  description: string;
  environments: AppEnvironment[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
}

export interface LocalEnvironmentOverride {
  kafkaConfig?: KafkaConfig;
  jmsConfig?: JmsConfig;
}

export interface MessageLog {
  id: string;
  appId: string;
  appName: string;
  environmentId: string;
  environmentName: string;
  producerId: string;
  producerName: string;
  userId: string;
  userName: string;
  transport: TransportType;
  payload: string;
  timestamp: string;
  status: "success" | "error";
  result: string;
  messageFormat: MessageFormat;
}

export const ENVIRONMENT_KIND_META: Record<
  EnvironmentKind,
  { label: string; badgeClassName: string }
> = {
  staging: {
    label: "Staging",
    badgeClassName: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  },
  production: {
    label: "Production",
    badgeClassName: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  },
};

export const createDefaultKafkaConfig = (): KafkaConfig => ({
  bootstrapServers: "",
  clientId: "mq-tester-client",
  groupId: "mq-tester-group",
  securityProtocol: "PLAINTEXT",
  saslMechanism: "",
  saslUsername: "",
  saslPassword: "",
  sslEnabled: false,
  extraProperties: "{}",
});

export const createDefaultJmsConfig = (): JmsConfig => ({
  qmgr: "",
  host: "localhost",
  port: 1414,
  channel: "DEV.APP.SVRCONN",
  user: "",
  password: "",
  connectionFactory: "ConnectionFactory",
  extraProperties: "{}",
});

export const createDefaultProducerProfile = (): Omit<
  ProducerProfile,
  "id" | "createdAt" | "updatedAt"
> => ({
  name: "",
  description: "",
  transport: "kafka",
  status: "active",
  destination: "",
  messageFormat: "json",
  defaultKey: "",
  defaultHeaders: "{}",
  defaultPayload: "{\n  \n}",
  protoSchema: 'syntax = "proto3";\n\nmessage SampleMessage {\n  string id = 1;\n}\n',
  messageType: "SampleMessage",
});

export const createDefaultEnvironment = (
  name = "Staging",
  kind: EnvironmentKind = "staging",
): Omit<AppEnvironment, "id" | "createdAt" | "updatedAt"> => ({
  name,
  kind,
  description: "",
  kafkaConfig: createDefaultKafkaConfig(),
  jmsConfig: createDefaultJmsConfig(),
  producers: [],
});

export const toSessionUser = (user: User): SessionUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  active: user.active,
});
