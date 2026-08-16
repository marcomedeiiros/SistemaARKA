import { closeDatabase, getDatabase } from '../database/connection.js';
import { seedDatabase } from '../database/seed.js';
import { config } from '../config.js';

getDatabase();
seedDatabase();
closeDatabase();

console.log(`[arka-api] banco redefinido com os dados de demonstração: ${config.databaseFile}`);
