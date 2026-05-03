import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Tenta carregar .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStorage() {
    console.log("--- Supabase Storage Analysis ---")
    
    // 1. List Buckets
    const { data: buckets, error: bError } = await supabase.storage.listBuckets()
    if (bError) {
        console.error("Error listing buckets:", bError)
    } else {
        console.log("Buckets found:", buckets.map(b => `${b.id} (Public: ${b.public})`))
    }

    const targetBucket = 'checklist-evidences'
    const bucket = buckets?.find(b => b.id === targetBucket)

    if (!bucket) {
        console.error(`ERROR: Bucket '${targetBucket}' not found!`)
        return
    }

    // 2. Test Service Role Connection (Bypass RLS)
    console.log(`Testing service-role upload to ${targetBucket}/test_connection.txt...`)
    const { data, error: uError } = await supabase.storage
        .from(targetBucket)
        .upload('test_connection.txt', Buffer.from('connection test'), { upsert: true })

    if (uError) {
        console.error("Service role upload failed:", uError)
    } else {
        console.log("Service role upload SUCCESSful. The bucket and path are valid.")
    }
    
    // 3. Try to check policies (Optional, requires direct SQL usually, but we can check via RPC if exists)
    // Supabase storage doesn't have an API to list policies.
}

checkStorage()
