import 'reflect-metadata';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { container } from 'tsyringe';

let mongoServer: MongoMemoryServer;
let mongoUri: string;

beforeAll(async () => {
  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  mongoUri = mongoServer.getUri();
});

afterAll(async () => {
  // Clean up
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Export for use in individual tests
export { mongoUri };