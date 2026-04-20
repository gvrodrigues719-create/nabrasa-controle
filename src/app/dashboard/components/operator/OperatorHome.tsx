"use client"

import OperationHeroCard from '../OperationHeroCard'
import ExecutionBlock from '../ExecutionBlock'
import OperationalAlertBanner from './OperationalAlertBanner'
import WeeklyProgressBar from '../WeeklyProgressBar'
import OperationalNoticeCard from './OperationalNoticeCard'
import { Sparkles, ArrowRight } from 'lucide-react'
import { WeeklyFocus } from '@/app/actions/weeklyFocusAction'
import { Leak } from '@/app/actions/efficiencyAction'
import RaffleCard from './RaffleCard'
import RaffleDrawer from '../RaffleDrawer'
import { useState } from 'react'
import HouseView from './HouseView'
import ContinueRoutineCard from './ContinueRoutineCard'
import MyAreaTodayCard from './MyAreaTodayCard'
import { ActiveSession, DashboardActions } from '../../hooks/useDashboardData'


interface OperatorHomeProps {
    healthScore: number;
    activeLeaks: Leak[];
    weeklyLeaks: Leak[];
    cmvStatus: any;
    weeklyFocus: WeeklyFocus | null;
    userRole: string | null;
    routinesCount: number;
    monthlyScore: number;
    monthlyPoints: number;
    monthlyAvailable: number;
    totalPoints: number;
    rankPosition: number | null;
    lastSealing: any;
    topRanking: any[];
    isDemoMode: boolean;
    notices?: any[];
    birthdays?: any[];
    lateCount?: number;
    countsPending: number;
    checklistsPending: number;
    userId: string;
    activeSession: ActiveSession | null;
    myAreaStats: {
        name: string;
        pendingCount: number;
        delayCount: number;
        nextActionLabel: string;
        nextActionUrl?: string;
    } | null;
    actions: DashboardActions;
    onViewGlobalClick: () => void;

    onReportLoss: () => void;
    onOpenRewards: () => void;
    onOpenAI: () => void;
    onUpdateFocus: (title: string) => Promise<void>;
}

export default function OperatorHome({
    healthScore,
    activeLeaks,
    weeklyLeaks,
    cmvStatus,
    weeklyFocus,
    userRole,
    routinesCount,
    monthlyScore,
    monthlyPoints,
    monthlyAvailable,
    totalPoints,
    rankPosition,
    lastSealing,
    topRanking,
    isDemoMode,
    notices = [],
    birthdays = [],
    lateCount = 0,
    countsPending = 0,
    checklistsPending = 0,
    userId,
    activeSession,
    myAreaStats,
    actions,
    onViewGlobalClick,

    onReportLoss,
    onOpenRewards,
    onOpenAI,
    onUpdateFocus
}: OperatorHomeProps) {
    const [isRaffleOpen, setIsRaffleOpen] = useState(false)

    return (
        <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
            {/* 1. ALERTAS — ATRASOS CRÍTICOS (CRÍTICO EM CIMA) */}
            <OperationalAlertBanner lateCount={lateCount} />

            {/* 2. EXECUÇÃO — CHECKLISTS E ROTINAS (CORAÇÃO DA OPERAÇÃO) */}
            <ExecutionBlock
                routinesCount={routinesCount}
                countsPending={countsPending}
                checklistsPending={checklistsPending}
                onReportLoss={onReportLoss}
                recommendedActions={actions.recommended}
            />

            {/* 2.1 CONTINUIDADE — CONTINUAR DE ONDE PAREI */}
            <ContinueRoutineCard session={activeSession} />

            {/* 2.2 RESPONSABILIDADE — SUA ÁREA HOJE */}
            <MyAreaTodayCard 
                stats={myAreaStats} 
                primaryAction={actions.area}
            />

            {/* 3. MURAL — AVISOS DA CASA (Mural como preview) */}
            <div id="mural">
                <OperationalNoticeCard notices={notices} birthdays={birthdays} userId={userId} />
            </div>

            {/* 4. HERO — SAÚDE DA OPERAÇÃO (EFICIÊNCIA) */}
            <OperationHeroCard
                score={healthScore}
                activeLeaks={activeLeaks}
                weeklyLeaks={weeklyLeaks}
                cmvCurrent={cmvStatus?.current}
                cmvTarget={cmvStatus?.target}
                cmvStatus={cmvStatus?.status}
                focus={weeklyFocus}
                userRole={userRole}
                onViewGlobalClick={onViewGlobalClick}
                onUpdateFocus={onUpdateFocus}
            />

            {/* 5. VISÃO DA CASA — MAPA OPERACIONAL */}
            <HouseView />

            {/* 6. APOIO — IA (AJUDA DA OPERAÇÃO) */}
            <button
                onClick={onOpenAI}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#fffcf0] border border-[#fef3c7] shadow-sm active:scale-[0.98] transition-all text-left cursor-pointer group animate-in fade-in duration-700"
            >
                <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center text-amber-500 group-hover:bg-amber-50 transition-colors border border-amber-100/50">
                    <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-amber-950">Ajuda da Operação</p>
                    <p className="text-[10px] text-amber-900/40 font-medium tracking-tight">Dúvidas sobre estoque, perdas e organização</p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-200 group-hover:text-amber-500 transition-colors" />
            </button>

            <RaffleDrawer 
                isOpen={isRaffleOpen} 
                onClose={() => setIsRaffleOpen(false)} 
                ticketCount={isDemoMode ? 12 : 0} 
            />
        </div>
    )
}
