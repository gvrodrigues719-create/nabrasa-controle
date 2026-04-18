'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import RewardToast, { RewardType } from '../components/RewardToast'
import { supabase } from '@/lib/supabase/client'

interface RewardData {
    amount: string | number
    label: string
    type: RewardType
}

interface RewardContextType {
    showReward: (data: RewardData) => void
}

const RewardContext = createContext<RewardContextType | undefined>(undefined)

export function RewardProvider({ children, userId }: { children: React.ReactNode, userId?: string }) {
    const [activeReward, setActiveReward] = useState<RewardData | null>(null)

    const showReward = useCallback((data: RewardData) => {
        // Se já houver um ativo, esperamos um pouco ou substituímos
        setActiveReward(null)
        setTimeout(() => {
            setActiveReward(data)
        }, 100)
    }, [])

    // Lógica de Aniversário Automática
    useEffect(() => {
        if (!userId) return

        const checkBirthday = async () => {
            // 1. Pegar dados do usuário
            const { data: user } = await supabase
                .from('users')
                .select('birth_day, birth_month, name')
                .eq('id', userId)
                .single()

            if (!user || user.birth_day === null || user.birth_month === null) return

            const now = new Date()
            const isBirthday = now.getDate() === user.birth_day && (now.getMonth() + 1) === user.birth_month

            if (isBirthday) {
                // 2. Verificar se já recebeu hoje (evitar spam ao recarregar aba)
                const today = now.toISOString().split('T')[0]
                const { data: existing } = await supabase
                    .from('gamification_events')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('source_type', 'birthday_gift')
                    .gte('created_at', `${today}T00:00:00Z`)
                    .maybeSingle()

                if (!existing) {
                    // 3. Registrar prêmio (Pode ser via Action dps, mas fazemos aqui para a Demo ser imediata)
                    // Nota: Idealmente isso seria uma Server Action para segurança, 
                    // mas como estamos em "Arquitetura Encaminhada", mostramos o feedback visual.
                    showReward({
                        amount: 20,
                        label: `Parabéns, ${user.name.split(' ')[0]}! Mimo de Aniversário.`,
                        type: 'coins'
                    })
                    
                    // Registrar no banco para não repetir
                    await supabase.from('gamification_events').insert([{
                        user_id: userId,
                        source_type: 'birthday_gift',
                        source_id: userId, // auto-referência
                        points: 0, // Aniversário dá moedas, não pontos de ranking
                        reason: 'Mimo de Aniversário NaBrasa'
                    }])

                    // E as moedas?
                    await supabase.from('wallet_transactions').insert([{
                        user_id: userId,
                        type: 'earned',
                        amount: 20,
                        reference_id: 'birthday-' + today
                    }])
                }
            }
        }

        checkBirthday()
    }, [userId, showReward])

    return (
        <RewardContext.Provider value={{ showReward }}>
            {children}
            {activeReward && (
                <RewardToast 
                    {...activeReward} 
                    onClose={() => setActiveReward(null)} 
                />
            )}
        </RewardContext.Provider>
    )
}

export function useReward() {
    const context = useContext(RewardContext)
    if (!context) throw new Error('useReward must be used within a RewardProvider')
    return context
}
