import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envFile = fs.readFileSync('.env.local', 'utf8')
const envs = {}
envFile.split('\n').filter(l => l.includes('=')).forEach(line => {
    const idx = line.indexOf('=')
    if (idx !== -1) envs[line.substring(0, idx).trim()] = line.substring(idx + 1).trim()
})
const supabase = createClient(envs.NEXT_PUBLIC_SUPABASE_URL, envs.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
    const { data: items } = await supabase.from('items').select('id, code, group_id, groups(name)')
    const { data: groups } = await supabase.from('groups').select('*')

    const totalItems = items.length

    const byGroup = {}
    items.forEach(i => {
        const gn = i.groups?.name || 'UNKNOWN'
        byGroup[gn] = (byGroup[gn] || 0) + 1
    })

    const nullGroups = items.filter(i => !i.group_id).length

    const codes = {}
    let duplicated = []
    items.forEach(i => {
        if (codes[i.code]) duplicated.push(i.code)
        codes[i.code] = true
    })

    console.log(JSON.stringify({
        totalItems,
        byGroup,
        nullGroups,
        duplicatedCount: duplicated.length,
        duplicatedCodes: duplicated.splice(0, 5)
    }, null, 2))
}
run()
