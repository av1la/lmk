import { container } from 'tsyringe';
import { MongoClientProviderImpl } from '@/adapters/mongodb/provider/MongoClientProvider';
import { mongoUri } from '../setup';

let isSetup = false;

export async function setupRepositoryTest() {
  // Only setup once per test run to reuse connections
  if (!isSetup) {
    // Clear any previous registrations
    container.clearInstances();
    
    // Register MongoDB config with test URI
    container.register('MONGO_URI', { useValue: mongoUri });
    container.register('MONGO_DB_NAME', { useValue: 'test_lmk' });
    
    // Register MongoDB provider
    container.registerSingleton('MongoClientProvider', MongoClientProviderImpl);
    
    // Wait for connection
    const mongoProvider = container.resolve('MongoClientProvider');
    await mongoProvider.waitForConnection();
    
    isSetup = true;
    return mongoProvider;
  }
  
  // Return existing provider
  return container.resolve('MongoClientProvider');
}

export function resetSetup() {
  isSetup = false;
}