import { MongoClient, Db } from 'mongodb';
import { createLogger } from '@/shared/logger';

const logger = createLogger('MongoClientProvider');

export interface MongoClientProvider {
  waitForConnection(): Promise<void>;
  getDb(): Db;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export class MongoClientProviderImpl implements MongoClientProvider {
  private client?: MongoClient;
  private db?: Db;
  private connected = false;
  private connectingPromise?: Promise<void>;
  private readonly uri: string;
  private readonly dbName: string;

  constructor() {
    this.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.dbName = process.env.MONGODB_DB_NAME || 'lmk';
    this.connectingPromise = this.connect();
  }

  private async connect() {
    if (this.connected) return;
    logger.info('Connecting to MongoDB...');
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.connected = true;
    logger.info('MongoDB connected');
  }

  async waitForConnection(): Promise<void> {
    if (this.connected) return;
    if (!this.connectingPromise) {
      this.connectingPromise = this.connect();
    }
    await this.connectingPromise;
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('MongoDB is not connected yet. Call waitForConnection() before using getDb().');
    }
    return this.db;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.close();
      this.connected = false;
      this.db = undefined;
      this.client = undefined;
      logger.info('MongoDB disconnected');
    }
  }
}