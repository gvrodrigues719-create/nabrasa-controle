'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getActiveOperator } from '@/app/actions/pinAuth'

export function useDashboardIdentity() {
    const [userRole, setUserRole] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')
    const [userId, setUserId] = useState<string>('')
    const [primaryAreaName, setPrimaryAreaName] = useState<string | null>(null)
    const [loadingIdentity, setLoadingIdentity] = useState(true)

    useEffect(() => {
        async function loadIdentity() {
            setLoadingIdentity(true)
            const op = await getActiveOperator()
            
            let currentUserId = ''
            if (op?.name) {
                setUserName(op.name.split(' ')[0])
                setUserRole(op.role || 'operator')
                setUserId(op.userId)
                currentUserId = op.userId
            } else {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setUserId(user.id)
                    currentUserId = user.id
                    const { data: profile } = await supabase.from('users').select('role, name').eq('id', user.id).single()
                    if (profile) {
                        setUserRole(profile.role || 'operator')
                        setUserName(profile.name?.split(' ')[0] || 'você')
                    }
                }
            }

            if (currentUserId) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('primary_group_id, groups(name)')
                    .eq('id', currentUserId)
                    .single()
                
                if (profile?.groups) {
                    setPrimaryAreaName((profile.groups as any).name)
                }
            }

            setLoadingIdentity(false)
        }
        loadIdentity()
    }, [])

    return { userRole, userName, userId, loadingIdentity, primaryAreaName }
}
