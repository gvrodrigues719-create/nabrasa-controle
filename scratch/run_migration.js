const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Using port 6543 (Supavisor)
const connString = process.env.NEXT_PUBLIC_SUPABASE_URL
    .replace('https://', 'postgres://postgres:' + process.env.SUPABASE_SERVICE_ROLE_KEY + '@')
    .replace('.supabase.co', '.supabase.co:6543/postgres') + '?sslmode=require';

async function run() {
    console.log('Connecting to Supavisor...');
    const client = new Client({
        connectionString: connString,
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const sql = fs.readFileSync('supabase/migrations/20260504_purchase_suggestion_mapping.sql', 'utf8');
        console.log('Running migration...');
        await client.query(sql);
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Error running migration:', err);
    } finally {
        await client.end();
    }
}

run();
