'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, PlayCircle, CheckCircle2, Clock, Play, X, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import React, { use } from 'react'
import { PinConfirmModal } from '@/components/PinConfirmModal'
import { verifyCriticalPin } from '@/app/actions/criticalActions'
import { getRoutineDetailsAction, verifyAndStartRoutineAction } from '@/app/actions/routinesAction'

type GroupStatus = {
    id: string
    name: string
    item_count: number
    session_id: string | null
    status: string
    user_name: string | null
    updated_at: string | null
}

export default function RoutineDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: routineId } = use(params)
    const [data, setData] = useState<{ name: string, groups: GroupStatus[] } | null>(null)
    const [loading, setLoading] = useState(true)
    const [hasSnapshot, setHasSnapshot] = useState(false)
    const [starting, setStarting] = useState(false)
    const [showStartConfirm, setShowStartConfirm] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<GroupStatus | null>(null)
    const router = useRouter()

    useEffect(() => {
        load()
        const interv = setInterval(() => load(true), 10000)
        return () => clearInterval(interv)
    }, [routineId])

    const load = async (silent = false) => {
        if (!silent) setLoading(true)

        const res = await getRoutineDetailsAction(routineId)
        if (res.data) {
            setHasSnapshot(res.data.hasSnapshot)
            setData({ name: res.data.name, groups: res.data.groups })
        } else {
            toast.error(res.error || 'Erro ao carregar rotina')
        }

        if (!silent) setLoading(false)
    }

    const handleStartRoutine = async (pin: string) => {
        setStarting(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const res = await verifyAndStartRoutineAction(routineId, pin, user?.id)
            if (res.error) throw new Error(res.error)

            if (res.executionId) {
                sessionStorage.setItem(`exec_${routineId}`, res.executionId)
            }
            toast.success('Ciclo iniciado! Estoque teórico congelado.')
            load()
        } catch (err: any) {
            setStarting(false)
            throw new Error(err.message)
        }
        setStarting(false)
    }

    const handleGroupClick = (group: GroupStatus) => {
        if (!hasSnapshot) return toast.error('Clique em "Iniciar Ciclo Oficial" para liberar a contagem.', { icon: '🔒' })
        setSelectedGroup(group)
    }

    const confirmNavigation = () => {
        if (!selectedGroup) return
        router.push(`/dashboard/count/${routineId}/${selectedGroup.id}`)
        setSelectedGroup(null)
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>
    if (!data) return <div className="p-4 text-center">Rotina não encontrada</div>

    return (
        <div className="p-4 space-y-6">
            <PinConfirmModal
                isOpen={showStartConfirm}
                title="Iniciar Ciclo Oficial?"
                message="Isso congela o estoque teórico e abre a contagem. Digite seu PIN Gerencial para autorizar esse início."
                onClose={() => setShowStartConfirm(false)}
                onConfirmPin={async (pin) => {
                    await handleStartRoutine(pin);
                    setShowStartConfirm(false);
                }}
            />

            <div className="flex items-center space-x-3 mb-6 mt-2">
                <button onClick={() => router.push('/dashboard/routines')} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rotina</p>
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{data.name}</h2>
                </div>
            </div>

            {!hasSnapshot && (
                <div className="bg-[#FDF0EF] border border-[#D4564A] p-4 rounded-2xl shadow-sm text-center">
                    <p className="text-[#8F2E21] font-bold mb-1">Rotina Offline</p>
                    <p className="text-sm text-[#B13A2B] mb-4">Para iniciar a contagem hoje, precisamos congelar o estoque teórico.</p>
                    <button disabled={starting} onClick={() => setShowStartConfirm(true)} className="w-full py-3 bg-[#B13A2B] hover:bg-[#8F2E21] text-white rounded-xl font-bold flex justify-center items-center active:scale-95 transition">
                        {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Play className="w-5 h-5 mr-2" /> Iniciar Ciclo Oficial</>}
                    </button>
                </div>
            )}

            <div className={`space-y-4 ${!hasSnapshot ? 'opacity-40 select-none' : ''}`}>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">Locais / Grupos</h3>
                {!hasSnapshot && (
                    <p className="text-xs text-gray-400 pl-1 italic">Inicie o ciclo oficial para liberar os grupos abaixo.</p>
                )}
                <div className="space-y-3">
                    {data.groups.map(g => {
                        const isCompleted = g.status === 'completed'
                        const isInProgress = g.status === 'in_progress'

                        return (
                            <button
                                key={g.id}
                                onClick={() => handleGroupClick(g)}
                                className={`w-full p-4 rounded-2xl border text-left flex justify-between items-center transition-all shadow-sm ${isCompleted ? 'bg-gray-50 border-gray-200 opacity-80' :
                                    isInProgress ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' :
                                        'bg-white border-[#FDF0EF] hover:border-[#D4564A] hover:shadow-md'
                                    }`}
                            >
                                <div>
                                    <h4 className={`font-bold text-lg ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>{g.name}</h4>
                                    {isInProgress && (
                                        <div className="flex items-center text-orange-600 text-xs font-semibold mt-1 space-x-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{g.user_name ? `Em andamento por ${g.user_name}` : 'Em andamento'}</span>
                                        </div>
                                    )}
                                    {isCompleted && (
                                        <div className="flex items-center text-gray-500 text-xs font-semibold mt-1 space-x-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Finalizado{g.user_name ? ` por ${g.user_name}` : ''}</span>
                                        </div>
                                    )}
                                    {!isInProgress && !isCompleted && (
                                        <p className="text-xs font-semibold text-gray-400 mt-1 uppercase">Toque para iniciar</p>
                                    )}
                                </div>
                                <div>
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                                    ) : isInProgress ? (
                                        <PlayCircle className="w-8 h-8 text-orange-400" />
                                    ) : (
                                        <PlayCircle className="w-8 h-8 text-[#D4564A]" />
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* BOTTOM SHEET DE CONFIRMAÇÃO */}
            {selectedGroup && (
                <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSelectedGroup(null)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-6 pb-8 animate-in slide-in-from-bottom duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={() => setSelectedGroup(null)} className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center space-x-3 mb-5">
                            <div className="p-3 bg-[#FDF0EF] rounded-xl">
                                <ClipboardList className="w-7 h-7 text-[#B13A2B]" />
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900">{selectedGroup.name}</h3>
                                <p className="text-sm font-semibold text-gray-400">{selectedGroup.item_count} {selectedGroup.item_count === 1 ? 'item' : 'itens'} para contar</p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 mb-6">Confirme que você está no local correto antes de iniciar a contagem. Após começar, os itens deste grupo ficarão vinculados a você.</p>

                        <div className="space-y-3">
                            <button
                                onClick={confirmNavigation}
                                className="w-full py-4 bg-[#B13A2B] hover:bg-[#8F2E21] text-white rounded-2xl font-bold text-lg flex justify-center items-center active:scale-95 transition shadow-sm"
                            >
                                <Play className="w-5 h-5 mr-2" /> Estou aqui, começar
                            </button>
                            <button
                                onClick={() => setSelectedGroup(null)}
                                className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm active:scale-95 transition"
                            >
                                Voltar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
