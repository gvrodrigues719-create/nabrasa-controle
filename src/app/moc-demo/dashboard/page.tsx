
'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMocDemoStore } from '@/demo/use-moc-demo-store'
import OperatorHome from '@/app/dashboard/components/operator/OperatorHome'
import DemoHeader from '../components/DemoHeader'
import DemoBottomNav from '../components/DemoBottomNav'

export default function MocDemoDashboard() {
    const router = useRouter()
    const { activeUser, users, areas, notices, events, addEvent, updateAreaStatus } = useMocDemoStore()

    useEffect(() => {
        if (!activeUser) {
            router.push('/moc-demo')
        }
    }, [activeUser, router])

    if (!activeUser) return null

    // Mocking the data expected by OperatorHome
    const healthScore = 85
    const activeLeaks = [
        { id: '1', label: 'Desperdício de Proteína', type: 'waste' },
        { id: '2', label: 'Atraso na Limpeza L1', type: 'delay' }
    ]
    const weeklyLeaks: any[] = []
    const cmvStatus = { current: 0.32, target: 0.30, status: 'warning' }
    const weeklyFocus = { title: 'Foco na integridade física do estoque e redução de sobras.' }
    
    // Sort users by weekly points for ranking
    const topRanking = [...users]
        .sort((a, b) => b.weekly_points - a.weekly_points)
        .slice(0, 10)
    
    const rankPosition = topRanking.findIndex(u => u.id === activeUser.id) + 1

    const myArea = areas.find(a => a.id === (activeUser.primary_area === 'Cozinha' ? 'area1' : activeUser.primary_area === 'Bar' ? 'area2' : activeUser.primary_area === 'Salão' ? 'area3' : activeUser.primary_area === 'Estoque seco' ? 'area4' : 'area6')) || areas[0]

    const demoActions = {
        area: {
            label: myArea.status === 'completed' ? 'Revisar área' : 'Iniciar Contagem',
            url: '/moc-demo/routines/count'
        },
        recommended: [
            { label: 'Contagem de Proteínas', id: 'c1', type: 'count' },
            { label: 'Checklist de Abertura', id: 'ch1', type: 'checklist' }
        ]
    }

    const handleUpdateFocus = async (title: string) => {
        addEvent('notice', `Foco atualizado: ${title}`)
        return Promise.resolve()
    }

    return (
        <div className="flex flex-col min-h-screen">
            <DemoHeader />
            <div className="flex-1 p-4 pb-24 overflow-y-auto">
                <OperatorHome 
                    healthScore={healthScore}
                    activeLeaks={activeLeaks as any}
                    weeklyLeaks={weeklyLeaks as any}
                    cmvStatus={cmvStatus}
                    weeklyFocus={weeklyFocus as any}
                    userRole={activeUser.role}
                    routinesCount={3}
                    monthlyScore={85}
                    monthlyPoints={activeUser.weekly_points}
                    monthlyAvailable={100}
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
                        type: n.type,
                        priority: n.priority,
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
                        nextActionLabel: demoActions.area.label,
                        nextActionUrl: demoActions.area.url
                    }}
                    actions={demoActions as any}
                    onViewGlobalClick={() => router.push('/moc-demo/areas')}
                    onReportLoss={() => {}}
                    onOpenRewards={() => router.push('/moc-demo/profile')}
                    onOpenAI={() => {}}
                    onUpdateFocus={handleUpdateFocus}
                />
            </div>
            <DemoBottomNav />
        </div>
    )
}
