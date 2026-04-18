'use client'

import { useState, useEffect } from 'react'

export function useDashboardUI(userRole: string | null) {
    const [viewMode, setViewMode] = useState<'manager' | 'operator'>('manager')
    const [isLossDrawerOpen, setIsLossDrawerOpen] = useState(false)
    const [isHealthDrawerOpen, setIsHealthDrawerOpen] = useState(false)
    const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false)
    const [isRewardsDrawerOpen, setIsRewardsDrawerOpen] = useState(false)

    useEffect(() => {
        if (userRole === 'operator') {
            setViewMode('operator')
        } else if (userRole === 'admin' || userRole === 'manager') {
            setViewMode('manager')
        }
    }, [userRole])

    return {
        viewMode,
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
