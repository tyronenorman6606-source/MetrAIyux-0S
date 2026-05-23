import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Running manual migration to add missing columns...');
  
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'normal' NOT NULL`;
  console.log('Added leads.urgency');
  
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS quality_score integer`;
  console.log('Added leads.quality_score');
  
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata jsonb`;
  console.log('Added leads.metadata');

  await sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id)`;
  console.log('Added quotes.contact_id');

  await sql`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS details jsonb`;
  console.log('Added quotes.details');

  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_amount decimal(10, 2)`;
  console.log('Added jobs.total_amount');

  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_amount decimal(10, 2)`;
  console.log('Added appointments.deposit_amount');

  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_status text`;
  console.log('Added appointments.deposit_status');

  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text`;
  console.log('Added appointments.stripe_payment_intent_id');

  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
