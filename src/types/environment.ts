export type Environment = 'dev' | 'stage1' | 'stage2' | 'stage3' | 'prod';

export interface EnvironmentConfig {
  name: Environment;
  displayName: string;
  color: string;
  description: string;
}

export interface KafkaEnvironmentConfig {
  bootstrapServers: string;
  groupId: string;
  securityProtocol: string;
  saslMechanism?: string;
  saslUsername?: string;
  saslPassword?: string;
  sslEnabled?: boolean;
  autoOffsetReset: string;
  enableAutoCommit: boolean;
  sessionTimeoutMs: number;
  heartbeatIntervalMs: number;
  maxPollRecords: number;
  requestTimeoutMs: number;
  retryBackoffMs: number;
  reconnectBackoffMs: number;
  maxPollIntervalMs: number;
  fetchMinBytes: number;
  fetchMaxWaitMs: number;
  maxPartitionFetchBytes: number;
  checksumType: string;
  keySerializer: string;
  valueSerializer: string;
  keyDeserializer: string;
  valueDeserializer: string;
  compressionType: string;
  batchSize: number;
  lingerMs: number;
  bufferMemory: number;
  acks: string;
  retries: number;
  maxInFlightRequestsPerConnection: number;
  enableIdempotence: boolean;
  transactionTimeoutMs: number;
  transactionalId: string;
  isolationLevel: string;
}

export interface JmsEnvironmentConfig {
  providerUrl: string;
  connectionFactory: string;
  username?: string;
  password?: string;
  clientId: string;
  sessionTransacted: boolean;
  sessionAcknowledgeMode: string;
  deliveryMode: string;
  priority: number;
  timeToLive: number;
  disableMessageID: boolean;
  disableMessageTimestamp: boolean;
  connectionPoolSize: number;
  connectionTimeout: number;
  receiveTimeout: number;
  sendTimeout: number;
  asyncSend: boolean;
  useCompression: boolean;
  optimizeAcknowledge: boolean;
  copyMessageOnSend: boolean;
  useAsyncSend: boolean;
  alwaysSyncSend: boolean;
  producerWindowSize: number;
  consumerWindowSize: number;
}

export interface Consumer {
  name: string;
  type: 'kafka' | 'jms';
  status: 'active' | 'inactive' | 'error';
  description?: string; // Feature explanation
  lastTested?: string;
  topic?: string;
  protoSchema?: string;
  messageType?: string;
  samplePayload?: string;
  sampleKey?: string;
  messageFormat?: 'protobuf' | 'json' | 'string';
}

export interface App {
  id: string;
  name: string;
  description: string;
  kafkaConfig?: Partial<Record<Environment, Partial<KafkaEnvironmentConfig>>>;
  jmsConfig?: Partial<Record<Environment, Partial<JmsEnvironmentConfig>>>;
  consumers: Consumer[];
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'qa';
}

export interface Assignment {
  appId: string;
  userId: string;
  assignedAt: string;
}

export interface MessageLog {
  id: string;
  appId: string;
  userId: string;
  userName: string;
  consumerName: string;
  environment: Environment;
  type: 'kafka' | 'jms';
  payload: string;
  timestamp: string;
  status: 'success' | 'error';
  result: string;
  messageFormat: string;
}

export interface EnvironmentData {
  kafka: KafkaEnvironmentConfig;
  jms: JmsEnvironmentConfig;
  consumers: Consumer[];
}

export interface FirebaseEnvironmentDoc {
  environments: Record<Environment, EnvironmentData>;
  metadata: {
    lastUpdated: string;
    version: string;
    userId?: string;
  };
}

export const ENVIRONMENTS: EnvironmentConfig[] = [
  {
    name: 'dev',
    displayName: 'Development',
    color: 'bg-blue-500',
    description: 'Local development environment'
  },
  {
    name: 'stage1',
    displayName: 'Stage 1',
    color: 'bg-yellow-500',
    description: 'Initial staging environment'
  },
  {
    name: 'stage2',
    displayName: 'Stage 2',
    color: 'bg-orange-500',
    description: 'Secondary staging environment'
  },
  {
    name: 'stage3',
    displayName: 'Stage 3',
    color: 'bg-purple-500',
    description: 'Pre-production staging environment'
  },
  {
    name: 'prod',
    displayName: 'Production',
    color: 'bg-red-500',
    description: 'Production environment'
  }
];