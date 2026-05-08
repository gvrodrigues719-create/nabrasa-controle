'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, RefreshCw, ClipboardList, CheckCircle2,
    Clock, AlertCircle, ChevronRight, Loader2, Package,
    Flame
} from 'lucide-react'
import { getKitchenCountStatusAction, KitchenCountRoutine, KitchenCountGroup } from '@/app/actions/kitchenCountAction'
import toast from 'react-hot-toast'

// ── Helpers ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: KitchenCountGroup['status'] }) {
    if (status === 'completed') {
        return (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-3 h-3" />
                Concluída
            </span>
        )
    }
    if (status === 'in_progress') {
        return (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                <Clock className="w-3 h-3" />
                Em andamento
            </span>
        )
    }
    return (
        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            <AlertCircle className="w-3 h-3" />
            Pendente
        </span>
    )
}

function ProgressBar({ value }: { value: number }) {
    return (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
                className="h-full bg-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, value)}%` }}
            />
        </div>
    )
}

function GroupCard({
    group,
    routineId,
    onNavigate
}: {
    group: KitchenCountGroup
    routineId: string
    onNavigate: (groupId: string) => void
}) {
    const progress = group.itemCount > 0
        ? Math.round((group.countedCount / group.itemCount) * 100)
        : 0

    // Strip the "CK — " prefix for display
    const displayName = group.groupName.replace(/^CK\s*[—-]\s*/, '')

    return (
        <button
            onClick={() => onNavigate(group.groupId)}
            className={`w-full text-left p-5 rounded-[24px] border-2 transition-all active:scale-[0.98] ${
                group.status === 'completed'
                    ? 'bg-emerald-50/30 border-emerald-100 shadow-sm hover:border-emerald-300'
                    : group.status === 'in_progress'
                    ? 'bg-white border-amber-200 shadow-md shadow-amber-50'
                    : 'bg-white border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md hover:shadow-orange-50'
            }`}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                    <h3 className={`font-black text-base leading-tight ${
                        group.status === 'completed' ? 'text-emerald-900' : 'text-gray-900'
                    }`}>
                        {displayName}
                    </h3>
                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                        {group.countedCount} de {group.itemCount} itens
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={group.status} />
                    {group.status === 'completed' ? (
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-white/50 px-2 py-1 rounded-lg border border-emerald-100">Ver / Editar</span>
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                    )}
                </div>
            </div>

            <ProgressBar value={progress} />

            {group.status === 'in_progress' && group.pendingCount > 0 && (
                <p className="text-[10px] font-bold text-amber-600 mt-2">
                    {group.pendingCount} {group.pendingCount === 1 ? 'item pendente' : 'itens pendentes'}
                </p>
            )}
        </button>
    )
}

// ── Página Principal ─────────────────────────────────────────

export default function KitchenCountPage() {
    const router = useRouter()
    const [data, setData] = useState<KitchenCountRoutine | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        const res = await getKitchenCountStatusAction()
        if (res.success && res.data) {
            setData(res.data)
        } else {
            toast.error(res.error || 'Erro ao carregar contagem')
        }

        setLoading(false)
        setRefreshing(false)
    }, [])

    useEffect(() => { load() }, [load])

    function handleNavigate(groupId: string) {
        if (!data) return
        const group = data.groups.find(g => g.groupId === groupId)
        
        if (group?.status === 'completed' && group.sessionId) {
            router.push(`/dashboard/kitchen/history/${group.sessionId}`)
            return
        }

        // Reuse the existing count engine, returnTo this page
        router.push(`/dashboard/count/${data.routineId}/${groupId}?returnTo=/dashboard/kitchen/count`)
    }

    // ── Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                        Carregando contagem...
                    </p>
                </div>
            </div>
        )
    }

    const allCompleted = data?.overallStatus === 'completed'
    const globalProgress = data && data.totalItems > 0
        ? Math.round((data.totalCounted / data.totalItems) * 100)
        : 0

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* ── Header ──────────────────────────────────────── */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-md lg:max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/dashboard/kitchen')}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-sm font-black text-gray-900 leading-none">
                                Contagem da Cozinha Central
                            </h1>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">
                                Insumos, espetos, carnes e descartáveis
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => load(true)}
                        disabled={refreshing}
                        className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors bg-gray-50"
                    >
                        <RefreshCw className={`w-4 h-4 text-orange-600 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-md lg:max-w-2xl mx-auto px-4 py-6 space-y-6 pb-16">

                {/* ── Status Geral ─────────────────────────────── */}
                {data && (
                    <div className={`rounded-[24px] p-5 ${
                        allCompleted
                            ? 'bg-emerald-600'
                            : data.overallStatus === 'in_progress'
                            ? 'bg-orange-500'
                            : 'bg-gray-800'
                    }`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {allCompleted
                                    ? <CheckCircle2 className="w-5 h-5 text-white" />
                                    : <Flame className="w-5 h-5 text-white" />
                                }
                                <span className="text-white font-black text-sm uppercase tracking-widest">
                                    {allCompleted ? 'Contagem Concluída!' :
                                     data.overallStatus === 'in_progress' ? 'Em andamento' : 'Aguardando início'}
                                </span>
                            </div>
                            <span className="text-white font-black text-lg">
                                {globalProgress}%
                            </span>
                        </div>

                        {/* Barra de progresso geral */}
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-700"
                                style={{ width: `${globalProgress}%` }}
                            />
                        </div>

                        <p className="text-white/70 text-[11px] font-bold mt-2">
                            {data.totalCounted} de {data.totalItems} itens em todas as categorias
                        </p>
                    </div>
                )}

                {/* ── Grupos / Categorias ──────────────────────── */}
                {!data ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                            <Package className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-bold">
                            Rotina não configurada.
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                            Execute a migration 20260508_kitchen_count_module.sql
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="h-px flex-1 bg-gray-200" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5">
                                <ClipboardList className="w-3.5 h-3.5" />
                                {data.groups.length} categorias
                            </span>
                            <div className="h-px flex-1 bg-gray-200" />
                        </div>

                        {data.groups.map(group => (
                            <GroupCard
                                key={group.groupId}
                                group={group}
                                routineId={data.routineId}
                                onNavigate={handleNavigate}
                            />
                        ))}
                    </div>
                )}

                {/* ── Mensagem final ───────────────────────────── */}
                {allCompleted && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-[24px] p-6 text-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                        <h3 className="font-black text-emerald-800 text-base">
                            Contagem do dia finalizada!
                        </h3>
                        <p className="text-emerald-600 text-sm font-medium mt-1">
                            Todos os {data!.totalItems} itens foram contados.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
