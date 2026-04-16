import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

function loadEnv() {
    const envPath = path.resolve('.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join('=').trim();
        }
    });
    return env;
}

const env = loadEnv();
const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function debug() {
    console.log('--- Routines Columns ---')
    const { data: row } = await supabase.from('routines').select('*').limit(1).single()
    if (row) {
        console.log(Object.keys(row))
    } else {
        console.log('No rows in routines table or error.')
    }
}

debug()
