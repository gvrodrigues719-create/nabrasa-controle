'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getActiveOperator } from '@/app/actions/pinAuth'

export function useDashboardIdentity() {
    const [userRole, setUserRole] = useState<string | null>(null)
    const [userName, setUserName] = useState<string>('')
    const [fullName, setFullName] = useState<string>('')
    const [userId, setUserId] = useState<string>('')
    const [primaryAreaName, setPrimaryAreaName] = useState<string | null>(null)
    const [unitName, setUnitName] = useState<string>('')
    const [unitId, setUnitId] = useState<string | null>(null)
    const [loadingIdentity, setLoadingIdentity] = useState(true)

    useEffect(() => {
        async function loadIdentity() {
            setLoadingIdentity(true)
            const op = await getActiveOperator()
            
            let currentUserId = ''
            if (op?.name) {
                setUserName(op.name.split(' ')[0])
                setFullName(op.name)
                let role = op.role || 'operator'
                if (role === 'operator' && op.name === 'Cozinha Central') role = 'kitchen'
                setUserRole(role)
                setUserId(op.userId)
                currentUserId = op.userId
            } else {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setUserId(user.id)
                    currentUserId = user.id
                    const { data: profile } = await supabase.from('users').select('role, name').eq('id', user.id).single()
                    if (profile) {
                        let role = profile.role || 'operator'
                        if (role === 'operator' && profile.name === 'Cozinha Central') role = 'kitchen'
                        setUserRole(role)
                        setUserName(profile.name?.split(' ')[0] || 'você')
                        setFullName(profile.name || '')
                    }
                }
            }

            if (currentUserId) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', currentUserId)
                    .single()
                
                if (profile?.primary_group_id) {
                    const { data: gData } = await supabase
                        .from('groups')
                        .select('name')
                        .eq('id', profile.primary_group_id)
                        .single()
                    if (gData) setPrimaryAreaName(gData.name)
                }
                if (profile?.unit_id) {
                    setUnitId(profile.unit_id)
                    const { data: uData } = await supabase
                        .from('groups')
                        .select('name')
                        .eq('id', profile.unit_id)
                        .single()
                    if (uData) setUnitName(uData.name)
                }
            }

            setLoadingIdentity(false)
        }
        loadIdentity()
    }, [])

    return { userRole, userName, fullName, userId, unitId, loadingIdentity, primaryAreaName, unitName }
}
