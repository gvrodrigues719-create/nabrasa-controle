import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function run() {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
        console.error("Missing SUPABASE_DB_URL in .env.local");
        return;
    }
    
    const client = new Client({ connectionString });
    await client.connect();

    const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260529_count_operation_logs.sql'), 'utf-8');
    
    try {
        await client.query(sql);
        console.log("Migration executada com sucesso!");
    } catch (e) {
        console.error("Erro na migration:", e);
    } finally {
        await client.end();
    }
}

run();
