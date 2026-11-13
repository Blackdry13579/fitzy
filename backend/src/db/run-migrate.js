import dotenv from 'dotenv';
import { initDb as initStateDb } from './store.js';
import { migrateStateToRelational } from './migrate.js';

dotenv.config();

(async () => {
  try {
    await initStateDb();
    await migrateStateToRelational();
    console.log('Migration vers les tables relationnelles terminée.');
    process.exit(0);
  } catch (e) {
    console.error('Migration échouée:', e);
    process.exit(1);
  }
})();
