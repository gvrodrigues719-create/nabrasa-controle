'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getActiveNoticesAction, getWeeklyBirthdaysAction } from '@/app/actions/communicationAction'
import Header from '../components/operator/Header'
import OperationalNoticeCard from '../components/operator/OperationalNoticeCard'
import { useDashboardIdentity } from '../hooks/useDashboardIdentity'
import { useDashboardUI } from '../hooks/useDashboardUI'

function MuralContent() {
    const searchParams = useSearchParams()
    const isDemoMode = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1'
    
    const [notices, setNotices] = useState<any[]>([])
    const [birthdays, setBirthdays] = useState<any[]>([])

    const { userRole, userName, userId, loadingIdentity } = useDashboardIdentity()
    const { viewMode, setViewMode } = useDashboardUI(userRole)

    useEffect(() => {
        async function fetchData() {
            const [noticesRes, birthdaysRes] = await Promise.all([
                getActiveNoticesAction(),
                getWeeklyBirthdaysAction()
            ])
            if (noticesRes.success) setNotices(noticesRes.data || [])
            if (birthdaysRes.success) setBirthdays(birthdaysRes.data || [])
        }
        fetchData()
    }, [])

    const loading = loadingIdentity

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-10">
            <Header 
                userName={userName}
                isDemoMode={isDemoMode}
                isManager={userRole === 'admin' || userRole === 'manager'}
                viewMode={viewMode}
                setViewMode={setViewMode}
            />

            <div className="px-5 py-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-[#B13A2B] border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Carregando Mural...</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom duration-700">
                        <OperationalNoticeCard 
                            notices={notices} 
                            birthdays={birthdays} 
                            userId={userId} 
                            isDemoMode={isDemoMode} 
                        />
                        
                        <div className="mt-8 px-2">
                            <h3 className="text-sm font-black text-[#1b1c1a] mb-2">Sobre o Mural</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Este é o canal oficial de comunicação da unidade. Aqui você encontra comunicados operacionais, alertas de estoque e celebrações da equipe.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function MuralPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#B13A2B] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <MuralContent />
        </Suspense>
    )
}
