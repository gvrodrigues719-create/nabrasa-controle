
'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMocDemoStore } from '@/demo/use-moc-demo-store'
import OperatorHome from '@/app/dashboard/components/operator/OperatorHome'
import DemoHeader from '../components/DemoHeader'
import DemoBottomNav from '../components/DemoBottomNav'
import { Leak } from '@/app/actions/efficiencyAction'
import { DashboardActions } from '@/app/dashboard/hooks/useDashboardData'

export default function MocDemoDashboard() {
    const router = useRouter()
    const { activeUser, users, areas, notices, events, addEvent, updateAreaStatus } = useMocDemoStore()
    const [mounted, setMounted] = React.useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (mounted && !activeUser) {
            router.push('/moc-demo')
        }
    }, [activeUser, router, mounted])

    if (!mounted || !activeUser) return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
            <div className="w-8 h-8 border-4 border-[#B13A2B] border-t-transparent rounded-full animate-spin" />
        </div>
    )

    // Mocking the data expected by OperatorHome
    const healthScore = 85
    const cmvStatus = { current: 0.32, target: 0.30, status: 'warning' as const }
    const weeklyFocus = { id: 'f1', title: 'Foco na integridade física do estoque e redução de sobras.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    
    // Sort users by weekly points for ranking
    const topRanking = [...users]
        .sort((a, b) => b.weekly_points - a.weekly_points)
        .slice(0, 10)
    
    const rankPosition = topRanking.findIndex(u => u.id === activeUser.id) + 1

    const myArea = areas.find(a => a.id === (activeUser.primary_area === 'Cozinha' ? 'area1' : activeUser.primary_area === 'Bar' ? 'area2' : activeUser.primary_area === 'Salão' ? 'area3' : activeUser.primary_area === 'Estoque seco' ? 'area4' : 'area6')) || areas[0]

    const demoActions: DashboardActions = {
        primary: {
            id: 'p1',
            label: 'Contagem de Proteínas',
            description: 'Ação sugerida pelo sistema',
            type: 'count',
            areaName: 'Cozinha',
            status: 'pending',
            priority: 'high',
            url: '/moc-demo/routines/count'
        },
        area: {
            id: 'a1',
            label: myArea.status === 'completed' ? 'Revisar área' : 'Iniciar Contagem',
            description: 'Tarefa do seu setor',
            type: 'count',
            areaName: myArea.name,
            status: 'pending',
            priority: 'medium',
            url: '/moc-demo/routines/count'
        },
        overdue: [],
        recommended: [
            { 
                id: 'c1', 
                label: 'Contagem de Proteínas', 
                description: 'Verificação diária de estoque',
                type: 'count',
                areaName: 'Cozinha',
                status: 'pending',
                priority: 'medium',
                url: '/moc-demo/routines/count'
            },
            { 
                id: 'ch1', 
                label: 'Checklist de Abertura', 
                description: 'Prévia da próxima rotina',
                type: 'checklist',
                areaName: 'Geral',
                status: 'pending',
                priority: 'low',
                url: '/moc-demo/routines/checklist'
            }
        ]
    }

    const handleUpdateFocus = async (title: string) => {
        addEvent('notice', `Foco atualizado: ${title}`)
        return Promise.resolve()
    }

    const handlers = {
        onViewGlobalClick: () => router.push('/moc-demo/areas'),
        onReportLoss: () => {},
        onOpenRewards: () => router.push('/moc-demo/profile'),
        onOpenAI: () => {},
        onUpdateFocus: handleUpdateFocus
    }

    return (
        <div className="flex flex-col min-h-screen">
            <DemoHeader />
            <div className="flex-1 p-4 pb-24 overflow-y-auto">
                <OperatorHome 
                    healthScore={healthScore}
                    activeLeaks={activeLeaks}
                    weeklyLeaks={weeklyLeaks}
                    cmvStatus={cmvStatus}
                    weeklyFocus={weeklyFocus}
                    userRole={activeUser.role}
                    routinesCount={3}
                    monthlyScore={85}
                    monthlyPoints={activeUser.weekly_points}
                    monthlyAvailable={100}
                    consistency={92}
                    participation={100}
                    highlightScore={88}
                    totalPoints={activeUser.points}
                    rankPosition={rankPosition > 0 ? rankPosition : null}
                    lastSealing={null}
                    topRanking={topRanking.map(u => ({ 
                        user_id: u.id, 
                        total_points: u.weekly_points, 
                        profiles: { name: u.name },
                        level: u.level,
                        streak: u.streak
                    }))}
                    isDemoMode={true}
                    notices={notices.map(n => ({
                        id: n.id,
                        title: n.title,
                        message: n.message,
                        type: n.type as 'operacional' | 'item_em_falta' | 'promocao' | 'mudanca_de_turno' | 'comunicado_geral',
                        priority: n.priority as 'normal' | 'importante' | 'urgente',
                        created_at: n.date,
                        reaction_count: n.reactions.reduce((acc, r) => acc + r.count, 0)
                    }))}
                    birthdays={[]}
                    lateCount={myArea.status === 'delayed' ? 1 : 0}
                    countsPending={2}
                    checklistsPending={1}
                    userId={activeUser.id}
                    activeSession={null}
                    myAreaStats={{
                        name: myArea.name,
                        pendingCount: myArea.pending_tasks,
                        delayCount: myArea.status === 'delayed' ? 1 : 0,
                        nextActionLabel: demoActions.area?.label || '',
                        nextActionUrl: demoActions.area?.url
                    }}
                    actions={demoActions}
                    {...handlers}
                />
            </div>
            <DemoBottomNav />
        </div>
    )
}
