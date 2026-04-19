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
import { ActiveSession } from '../../hooks/useDashboardData'


interface OperatorHomeProps {
    healthScore: number;
    activeLeaks: Leak[];
    weeklyLeaks: Leak[];
    cmvStatus: any;
    weeklyFocus: WeeklyFocus | null;
    userRole: string | null;
    routinesCount: number;
    weeklyPoints: number;
    totalPoints: number;
    rankPosition: number | null;
    lastSealing: any;
    topRanking: any[];
    isDemoMode: boolean;
    notices?: any[];
    birthdays?: any[];
    lateCount?: number;
    userId: string;
    activeSession: ActiveSession | null;
    myAreaStats: {
        name: string;
        pendingCount: number;
        delayCount: number;
        nextActionLabel: string;
    } | null;
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
    weeklyPoints,
    totalPoints,
    rankPosition,
    lastSealing,
    topRanking,
    isDemoMode,
    notices = [],
    birthdays = [],
    lateCount = 0,
    userId,
    activeSession,
    myAreaStats,
    onViewGlobalClick,

    onReportLoss,
    onOpenRewards,
    onOpenAI,
    onUpdateFocus
}: OperatorHomeProps) {
    const [isRaffleOpen, setIsRaffleOpen] = useState(false)

    return (
        <div className="space-y-6">
            {/* 1. MURAL — AVISOS DA CASA + ANIVERSARIANTES */}
            <OperationalNoticeCard notices={notices} birthdays={birthdays} userId={userId} />

            {/* 2. ALERTAS — ATRASOS CRÍTICOS */}
            <OperationalAlertBanner lateCount={lateCount} />

            {/* 3. EXECUÇÃO — CHECKLISTS E ROTINAS */}
            <ExecutionBlock
                routinesCount={routinesCount}
                onReportLoss={onReportLoss}
            />

            {/* 3.1 CONTINUIDADE — CONTINUAR DE ONDE PAREI (NOVO) */}
            <ContinueRoutineCard session={activeSession} />

            {/* 3.2 RESPONSABILIDADE — SUA ÁREA HOJE (NOVO) */}
            <MyAreaTodayCard stats={myAreaStats} />

            {/* 4. VISÃO DA CASA — MAPA OPERACIONAL */}
            <HouseView />

            {/* 5. HERO — SAÚDE DA OPERAÇÃO (EFICIÊNCIA) */}
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

            {/* 6. APOIO — IA (AJUDA DA OPERAÇÃO) */}
            <button
                onClick={onOpenAI}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#e9e8e5] shadow-sm active:scale-[0.98] transition-all text-left cursor-pointer group"
            >
                <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] flex items-center justify-center text-amber-500 group-hover:bg-amber-50 transition-colors">
                    <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-[#1b1c1a]">Ajuda da Operação</p>
                    <p className="text-[10px] text-[#c0b3b1] font-medium">Dúvidas sobre estoque, perdas e organização</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#e9e8e5] group-hover:text-[#8c716c] transition-colors" />
            </button>

            {/* 7. PROGRESSO — MINHA SEMANA (RANKING) */}
            <WeeklyProgressBar
                weeklyPoints={weeklyPoints}
                totalPoints={totalPoints}
                rankPosition={rankPosition}
                lastSealing={lastSealing}
                topRanking={topRanking}
                coinBalance={isDemoMode ? 120 : 0}
                onOpenRewards={onOpenRewards}
            />

            <RaffleDrawer 
                isOpen={isRaffleOpen} 
                onClose={() => setIsRaffleOpen(false)} 
                ticketCount={isDemoMode ? 12 : 0} 
            />
        </div>
    )
}
