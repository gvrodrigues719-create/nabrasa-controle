'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getActiveOperator } from '@/app/actions/pinAuth'

export interface DashboardIdentity {
    userRole: string | null;
    userName: string;
    fullName: string;
    userId: string;
    primaryAreaName: string | null;
    unitName: string;
    unitId: string | null;
    loadingIdentity: boolean;
}

let globalIdentityCache: DashboardIdentity | null = null;
let identityPromise: Promise<DashboardIdentity> | null = null;

export function clearDashboardIdentityCache() {
    globalIdentityCache = null;
    identityPromise = null;
}

export function useDashboardIdentity() {
    const [identity, setIdentity] = useState<DashboardIdentity>(globalIdentityCache || {
        userRole: null,
        userName: '',
        fullName: '',
        userId: '',
        primaryAreaName: null,
        unitName: '',
        unitId: null,
        loadingIdentity: true
    });

    useEffect(() => {
        if (globalIdentityCache) {
            setIdentity(globalIdentityCache);
            return;
        }

        async function loadIdentity() {
            if (!identityPromise) {
                identityPromise = (async () => {
                    let userRole: string | null = null;
                    let userName = '';
                    let fullName = '';
                    let userId = '';
                    let primaryAreaName: string | null = null;
                    let unitName = '';
                    let unitId: string | null = null;

                    const op = await getActiveOperator()
                    
                    let currentUserId = ''
                    if (op?.name) {
                        userName = op.name.split(' ')[0]
                        fullName = op.name
                        let role = op.role || 'operator'
                        if (role === 'operator' && op.name === 'Cozinha Central') role = 'kitchen'
                        userRole = role
                        userId = op.userId
                        currentUserId = op.userId
                    } else {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (user) {
                            userId = user.id
                            currentUserId = user.id
                            const { data: profile } = await supabase.from('users').select('role, name').eq('id', user.id).single()
                            if (profile) {
                                let role = profile.role || 'operator'
                                if (role === 'operator' && profile.name === 'Cozinha Central') role = 'kitchen'
                                userRole = role
                                userName = profile.name?.split(' ')[0] || 'você'
                                fullName = profile.name || ''
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
                            if (gData) primaryAreaName = gData.name
                        }
                        if (profile?.unit_id) {
                            unitId = profile.unit_id
                            const { data: uData } = await supabase
                                .from('groups')
                                .select('name')
                                .eq('id', profile.unit_id)
                                .single()
                            if (uData) unitName = uData.name
                        }
                    }

                    return { userRole, userName, fullName, userId, unitId, loadingIdentity: false, primaryAreaName, unitName };
                })();
            }

            const data = await identityPromise;
            globalIdentityCache = data;
            setIdentity(data);
        }

        loadIdentity()
    }, [])

    return identity;
}
