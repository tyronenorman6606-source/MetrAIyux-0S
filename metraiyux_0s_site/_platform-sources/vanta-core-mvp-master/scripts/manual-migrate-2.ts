import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Running manual migration to drop old columns...');
  
  await sql`ALTER TABLE quotes DROP COLUMN IF EXISTS line_items`;
  console.log('Dropped quotes.line_items');

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
