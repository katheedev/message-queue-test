import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Environment, EnvironmentData, FirebaseEnvironmentDoc, KafkaEnvironmentConfig, JmsEnvironmentConfig } from '@/types/environment';

export class FirebaseService {
  private static readonly COLLECTION_NAME = 'environment-configs';
  private static readonly DEFAULT_DOC_ID = 'default-config';

  // Get default configurations for different environments
  static getDefaultKafkaConfig(env: Environment): KafkaEnvironmentConfig {
    const baseConfig = {
      groupId: `aero-ops-${env}`,
      securityProtocol: 'SASL_SSL',
      saslMechanism: 'PLAIN',
      autoOffsetReset: 'latest',
      enableAutoCommit: true,
      sessionTimeoutMs: 30000,
      heartbeatIntervalMs: 3000,
      maxPollRecords: 500,
      requestTimeoutMs: 30000,
      retryBackoffMs: 100,
      reconnectBackoffMs: 50,
      maxPollIntervalMs: 300000,
      fetchMinBytes: 1,
      fetchMaxWaitMs: 500,
      maxPartitionFetchBytes: 1048576,
      checksumType: 'CRC32',
      keySerializer: 'org.apache.kafka.common.serialization.StringSerializer',
      valueSerializer: 'org.apache.kafka.common.serialization.StringSerializer',
      keyDeserializer: 'org.apache.kafka.common.serialization.StringDeserializer',
      valueDeserializer: 'org.apache.kafka.common.serialization.StringDeserializer',
      compressionType: 'none',
      batchSize: 16384,
      lingerMs: 0,
      bufferMemory: 33554432,
      acks: '1',
      retries: 2147483647,
      maxInFlightRequestsPerConnection: 5,
      enableIdempotence: false,
      transactionTimeoutMs: 60000,
      transactionalId: '',
      isolationLevel: 'read_uncommitted',
      username: '',
      password: ''
    };

    // Environment-specific configurations
    switch (env) {
      case 'dev':
        return {
          ...baseConfig,
          bootstrapServers: 'localhost:9092',
          username: 'dev-user',
          password: 'dev-password'
        };
      case 'stage1':
        return {
          ...baseConfig,
          bootstrapServers: 'stage1-kafka.company.com:9092',
          username: 'stage1-user',
          password: 'stage1-password'
        };
      case 'stage2':
        return {
          ...baseConfig,
          bootstrapServers: 'stage2-kafka.company.com:9092',
          username: 'stage2-user',
          password: 'stage2-password'
        };
      case 'stage3':
        return {
          ...baseConfig,
          bootstrapServers: 'stage3-kafka.company.com:9092',
          username: 'stage3-user',
          password: 'stage3-password'
        };
      case 'prod':
        return {
          ...baseConfig,
          bootstrapServers: 'prod-kafka.company.com:9092',
          username: 'prod-user',
          password: 'prod-password'
        };
      default:
        return {
          ...baseConfig,
          bootstrapServers: 'localhost:9092'
        };
    }
  }

  static getDefaultJmsConfig(env: Environment): JmsEnvironmentConfig {
    const baseConfig = {
      connectionFactory: 'ConnectionFactory',
      clientId: `aero-ops-${env}`,
      sessionTransacted: false,
      sessionAcknowledgeMode: 'AUTO_ACKNOWLEDGE',
      deliveryMode: 'PERSISTENT',
      priority: 4,
      timeToLive: 0,
      disableMessageID: false,
      disableMessageTimestamp: false,
      connectionPoolSize: 10,
      connectionTimeout: 30000,
      receiveTimeout: 30000,
      sendTimeout: 30000,
      asyncSend: false,
      useCompression: false,
      optimizeAcknowledge: false,
      copyMessageOnSend: true,
      useAsyncSend: false,
      alwaysSyncSend: false,
      producerWindowSize: 65536,
      consumerWindowSize: 65536,
      username: '',
      password: ''
    };

    switch (env) {
      case 'dev':
        return {
          ...baseConfig,
          providerUrl: 'tcp://localhost:61616',
          username: 'dev-user',
          password: 'dev-password'
        };
      case 'stage1':
        return {
          ...baseConfig,
          providerUrl: 'tcp://stage1-jms.company.com:61616',
          username: 'stage1-user',
          password: 'stage1-password'
        };
      case 'stage2':
        return {
          ...baseConfig,
          providerUrl: 'tcp://stage2-jms.company.com:61616',
          username: 'stage2-user',
          password: 'stage2-password'
        };
      case 'stage3':
        return {
          ...baseConfig,
          providerUrl: 'tcp://stage3-jms.company.com:61616',
          username: 'stage3-user',
          password: 'stage3-password'
        };
      case 'prod':
        return {
          ...baseConfig,
          providerUrl: 'tcp://prod-jms.company.com:61616',
          username: 'prod-user',
          password: 'prod-password'
        };
      default:
        return {
          ...baseConfig,
          providerUrl: 'tcp://localhost:61616'
        };
    }
  }

  // Get environment configuration from Firebase
  static async getEnvironmentConfig(docId: string = this.DEFAULT_DOC_ID): Promise<FirebaseEnvironmentDoc | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as FirebaseEnvironmentDoc;
      } else {
        // Create default configuration if it doesn't exist
        const defaultConfig = this.createDefaultConfiguration();
        await this.saveEnvironmentConfig(defaultConfig, docId);
        return defaultConfig;
      }
    } catch (error) {
      console.error('Error getting environment config:', error);
      return null;
    }
  }

  // Save environment configuration to Firebase
  static async saveEnvironmentConfig(
    config: FirebaseEnvironmentDoc, 
    docId: string = this.DEFAULT_DOC_ID
  ): Promise<boolean> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, docId);
      await setDoc(docRef, {
        ...config,
        metadata: {
          ...config.metadata,
          lastUpdated: new Date().toISOString()
        }
      });
      return true;
    } catch (error) {
      console.error('Error saving environment config:', error);
      return false;
    }
  }

  // Update specific environment data
  static async updateEnvironmentData(
    environment: Environment,
    data: Partial<EnvironmentData>,
    docId: string = this.DEFAULT_DOC_ID
  ): Promise<boolean> {
    try {
      const currentConfig = await this.getEnvironmentConfig(docId);
      if (!currentConfig) return false;

      const updatedConfig: FirebaseEnvironmentDoc = {
        ...currentConfig,
        environments: {
          ...currentConfig.environments,
          [environment]: {
            ...currentConfig.environments[environment],
            ...data
          }
        },
        metadata: {
          ...currentConfig.metadata,
          lastUpdated: new Date().toISOString()
        }
      };

      return await this.saveEnvironmentConfig(updatedConfig, docId);
    } catch (error) {
      console.error('Error updating environment data:', error);
      return false;
    }
  }

  // Create default configuration for all environments
  private static createDefaultConfiguration(): FirebaseEnvironmentDoc {
    const environments: Record<Environment, EnvironmentData> = {} as Record<Environment, EnvironmentData>;
    
    const envs: Environment[] = ['dev', 'stage1', 'stage2', 'stage3', 'prod'];
    
    envs.forEach(env => {
      environments[env] = {
        kafka: this.getDefaultKafkaConfig(env),
        jms: this.getDefaultJmsConfig(env),
        consumers: [] // Will be populated with environment-specific consumers
      };
    });

    return {
      environments,
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  // Copy configuration from one environment to another
  static async copyEnvironmentConfig(
    fromEnv: Environment,
    toEnv: Environment,
    docId: string = this.DEFAULT_DOC_ID
  ): Promise<boolean> {
    try {
      const currentConfig = await this.getEnvironmentConfig(docId);
      if (!currentConfig) return false;

      const sourceData = currentConfig.environments[fromEnv];
      if (!sourceData) return false;

      return await this.updateEnvironmentData(toEnv, sourceData, docId);
    } catch (error) {
      console.error('Error copying environment config:', error);
      return false;
    }
  }
}

export default FirebaseService;