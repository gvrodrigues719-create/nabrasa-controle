"use client"

import OperationHeroCard from '../OperationHeroCard'
import ExecutionBlock from '../ExecutionBlock'
import OperationalAlertBanner from './OperationalAlertBanner'
import WeeklyProgressBar from '../WeeklyProgressBar'
import OperationalNoticeCard from './OperationalNoticeCard'
import { LifeBuoy, ArrowRight, Trophy, Sparkles } from 'lucide-react'
import { WeeklyFocus } from '@/app/actions/weeklyFocusAction'
import { Leak } from '@/app/actions/efficiencyAction'
import RaffleCard from './RaffleCard'
import RaffleDrawer from '../RaffleDrawer'
import { useState } from 'react'
import HouseView from './HouseView'
import ContinueRoutineCard from './ContinueRoutineCard'
import MyAreaTodayCard from './MyAreaTodayCard'
import PriorityActionCard from './PriorityActionCard'
import { ActiveSession, DashboardActions } from '../../hooks/useDashboardData'
import KitchenCard from '../KitchenCard'


interface OperatorHomeProps {
    // ── Wave 1 — Critical (fast) ──────────────────────────────────────────
    routinesCount: number;
    countsPending: number;
    checklistsPending: number;
    lateCount: number;
    activeSession: ActiveSession | null;
    myAreaStats: {
        name: string;
        pendingCount: number;
        delayCount: number;
        nextActionLabel: string;
        nextActionUrl?: string;
    } | null;
    actions: DashboardActions;
    loadingWave1?: boolean;

    // ── Wave 2 — Secondary (background) ──────────────────────────────────
    healthScore: number;
    activeLeaks: Leak[];
    weeklyLeaks: Leak[];
    cmvStatus: any;
    weeklyFocus: WeeklyFocus | null;
    userRole: string | null;
    userName?: string | null;
    fullName?: string | null;
    monthlyScore: number;
    monthlyPoints: number;
    monthlyAvailable: number;
    consistency: number;
    participation: number;
    highlightScore: number;
    totalPoints: number;
    rankPosition: number | null;
    lastSealing: any;
    topRanking: any[];
    notices?: any[];
    birthdays?: any[];
    loadingWave2?: boolean;

    // ── Contexto ─────────────────────────────────────────────────────────
    isDemoMode: boolean;
    userId: string;
    onViewGlobalClick: () => void;
    onReportLoss: () => void;
    onOpenRewards: () => void;
    onOpenAI: () => void;
    onUpdateFocus: (title: string) => Promise<void>;
}

export default function OperatorHome({
    routinesCount,
    countsPending,
    checklistsPending,
    lateCount = 0,
    activeSession,
    myAreaStats,
    actions,
    loadingWave1 = false,
    healthScore,
    activeLeaks,
    weeklyLeaks,
    cmvStatus,
    weeklyFocus,
    userRole,
    userName,
    fullName,
    monthlyScore,
    monthlyPoints,
    monthlyAvailable,
    consistency,
    participation,
    highlightScore,
    totalPoints,
    rankPosition,
    lastSealing,
    topRanking,
    isDemoMode,
    notices = [],
    birthdays = [],
    loadingWave2 = false,
    userId,
    onViewGlobalClick,
    onReportLoss,
    onOpenRewards,
    onOpenAI,
    onUpdateFocus
}: OperatorHomeProps) {
    const [isRaffleOpen, setIsRaffleOpen] = useState(false)

    // Skeleton shimmer helper
    const SkeletonCard = ({ h = 'h-24' }: { h?: string }) => (
        <div className={`${h} rounded-3xl bg-gray-100 animate-pulse`} />
    )

    return (
        <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
            {/* COZINHA CENTRAL (Apenas role kitchen ou nome específico) */}
            {(userRole === 'kitchen' || userRole === 'admin' || fullName === 'Cozinha Central') && (
                <div className="mb-4">
                    <KitchenCard />
                </div>
            )}

            {/* 0. AÇÃO PRIORITÁRIA — ONDA 1 */}
            <div className="space-y-2">
                {loadingWave1 ? (
                    <SkeletonCard h="h-28" />
                ) : (
                    <PriorityActionCard
                        action={actions.primary}
                        loading={false}
                    />
                )}

                {/* 0.1 CONTINUIDADE */}
                {!loadingWave1 && (
                    <ContinueRoutineCard session={activeSession} isDemoMode={isDemoMode} />
                )}
            </div>

            {/* 1. ALERTAS — ONDA 1 */}
            {!loadingWave1 && (
                <OperationalAlertBanner lateCount={lateCount} isDemoMode={isDemoMode} />
            )}

            {/* DESTAQUE DO MÊS — ONDA 2 */}
            {!loadingWave2 && rankPosition === 1 && highlightScore > 0 && (
                <div className="mx-1 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-orange-200/50 flex items-center justify-between overflow-hidden relative group animate-in slide-in-from-top duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/30 shadow-inner">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-amber-100 uppercase tracking-widest mb-0.5">Reconhecimento</p>
                            <h4 className="text-sm font-black text-white tracking-tight">Você é o Destaque do Mês!</h4>
                        </div>
                    </div>
                    <Sparkles className="w-5 h-5 text-amber-200 animate-pulse relative z-10" />
                </div>
            )}

            {/* 2. EXECUÇÃO — ONDA 1 */}
            {loadingWave1 ? (
                <SkeletonCard h="h-40" />
            ) : (
                <ExecutionBlock
                routinesCount={routinesCount}
                countsPending={countsPending}
                checklistsPending={checklistsPending}
                onReportLoss={onReportLoss}
                recommendedActions={actions.recommended}
                isDemoMode={isDemoMode}
            />
            )}

            {/* 2.2 SUA ÁREA — ONDA 1 */}
            {loadingWave1 ? (
                <SkeletonCard h="h-28" />
            ) : (
                <MyAreaTodayCard 
                    stats={myAreaStats} 
                    primaryAction={actions.area}
                />
            )}

            {/* 2.3 MINHA EVOLUÇÃO — ONDA 1 (compact, dados da onda 1) */}
            <WeeklyProgressBar 
                variant="compact"
                weeklyPoints={monthlyPoints}
                totalPoints={totalPoints}
                rankPosition={rankPosition}
                lastSealing={lastSealing}
                topRanking={topRanking}
                coinBalance={isDemoMode ? 120 : 0}
                onOpenRewards={onOpenRewards}
                isManagerView={userRole === 'manager' || userRole === 'admin'}
                showTop3Recognition={true}
                showFullTeamRanking={false}
            />

            {/* 2.4 VISÃO DA CASA — ONDA 1 (self-contained, busca seus próprios dados) */}
            <HouseView />

            {/* 3. MURAL — ONDA 2 */}
            <div id="mural">
                {loadingWave2 ? (
                    <SkeletonCard h="h-32" />
                ) : (
                    <OperationalNoticeCard notices={notices} birthdays={birthdays} userId={userId} isDemoMode={isDemoMode} />
                )}
            </div>

            {/* 4. HERO — ONDA 2 */}
            {loadingWave2 ? (
                <SkeletonCard h="h-52" />
            ) : (
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
            )}

            {/* 6. APOIO — IA — ONDA 2 */}
            {!loadingWave2 && (
                <button
                    onClick={onOpenAI}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-[#fffcf0] border border-[#fef3c7] shadow-sm active:scale-[0.98] transition-all text-left cursor-pointer group animate-in fade-in duration-700"
                >
                    <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center text-amber-500 group-hover:bg-amber-50 transition-colors border border-amber-100/50">
                        <LifeBuoy className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-950">Ajuda da Operação</p>
                        <p className="text-[10px] text-amber-900/40 font-medium tracking-tight">Dúvidas sobre estoque, perdas e organização</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-200 group-hover:text-amber-500 transition-colors" />
                </button>
            )}

            <RaffleDrawer 
                isOpen={isRaffleOpen} 
                onClose={() => setIsRaffleOpen(false)} 
                ticketCount={isDemoMode ? 12 : 0} 
            />
        </div>
    )
}
