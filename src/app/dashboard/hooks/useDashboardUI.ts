'use client'

import { useState, useEffect } from 'react'

export function useDashboardUI(userRole: string | null) {
    // Inicialização segura para SSR e persistência
    const [viewMode, setViewModeState] = useState<'manager' | 'operator'>('manager')
    const [initialized, setInitialized] = useState(false)

    const [isLossDrawerOpen, setIsLossDrawerOpen] = useState(false)
    const [isHealthDrawerOpen, setIsHealthDrawerOpen] = useState(false)
    const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false)
    const [isRewardsDrawerOpen, setIsRewardsDrawerOpen] = useState(false)

    // 1. Carregar persistência e respeitar regras de role
    useEffect(() => {
        if (typeof window === 'undefined') return

        if (userRole === 'operator') {
            setViewModeState('operator')
        } else if (userRole === 'admin' || userRole === 'manager') {
            const savedMode = localStorage.getItem('moc_view_mode') as 'manager' | 'operator'
            if (savedMode && (savedMode === 'manager' || savedMode === 'operator')) {
                setViewModeState(savedMode)
            } else {
                setViewModeState('manager')
            }
        }
        setInitialized(true)
    }, [userRole])

    // 2. Função de setter que persiste
    const setViewMode = (mode: 'manager' | 'operator') => {
        // Se for operador puro, não permite mudar de modo
        if (userRole === 'operator' && mode === 'manager') return

        setViewModeState(mode)
        if (typeof window !== 'undefined') {
            localStorage.setItem('moc_view_mode', mode)
        }
    }

    return {
        viewMode: initialized ? viewMode : 'manager', // Fallback durante hidratação
        setViewMode,
        isLossDrawerOpen,
        setIsLossDrawerOpen,
        isHealthDrawerOpen,
        setIsHealthDrawerOpen,
        isAIDrawerOpen,
        setIsAIDrawerOpen,
        isRewardsDrawerOpen,
        setIsRewardsDrawerOpen
    }
}
