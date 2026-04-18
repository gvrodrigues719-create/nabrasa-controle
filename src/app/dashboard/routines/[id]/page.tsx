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
import { CountGroupStatus } from '@/modules/count/types'


export default function RoutineDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: routineId } = use(params)
    const [data, setData] = useState<{ name: string, groups: CountGroupStatus[] } | null>(null)
    const [loading, setLoading] = useState(true)
    const [hasSnapshot, setHasSnapshot] = useState(false)
    const [starting, setStarting] = useState(false)
    const [showStartConfirm, setShowStartConfirm] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<CountGroupStatus | null>(null)
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
            const res = await verifyAndStartRoutineAction(routineId, pin)

            if (res.error) {
                // Se o erro menciona PIN, relança para o modal mostrar no campo
                // Caso contrário, é falha de RPC/banco — mostra toast e fecha o modal
                const isPinError = res.error.toLowerCase().includes('pin') || res.error.toLowerCase().includes('incorreto') || res.error.toLowerCase().includes('autenticado')
                if (isPinError) {
                    throw new Error(res.error)
                }
                // Erro de infra (RPC, banco, migration faltando)
                setShowStartConfirm(false)
                setStarting(false)
                toast.error(`Erro ao iniciar ciclo: ${res.error}`)
                return
            }

            if (res.executionId) {
                sessionStorage.setItem(`exec_${routineId}`, res.executionId)
            }
            toast.success('Ciclo iniciado! Estoque teórico congelado.')
            setShowStartConfirm(false)
            load()
        } catch (err: any) {
            setStarting(false)
            throw new Error(err.message)
        }
        setStarting(false)
    }

    const handleGroupClick = (group: CountGroupStatus) => {
        if (!hasSnapshot) return toast.error('Clique em "Iniciar Ciclo Oficial" para liberar a contagem.', { icon: '🔒' })
        setSelectedGroup(group)
    }

    const confirmNavigation = () => {
        if (!selectedGroup) return
        router.push(`/dashboard/count/${routineId}/${selectedGroup.id}`)
        setSelectedGroup(null)
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#B13A2B] w-8 h-8" /></div>
    if (!data) return <div className="p-4 text-center">Rotina não encontrada</div>

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-10">
            <PinConfirmModal
                isOpen={showStartConfirm}
                title="Iniciar Ciclo Oficial?"
                message="Isso congela o estoque teórico e abre a contagem. Digite seu PIN Gerencial para autorizar este início."
                onClose={() => setShowStartConfirm(false)}
                onConfirmPin={async (pin) => {
                    await handleStartRoutine(pin);
                    setShowStartConfirm(false);
                }}
            />

            {/* HEADER */}
            <div className="bg-white border-b border-[#e9e8e5] px-5 pt-6 pb-5 shadow-sm sticky top-0 z-10">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.push('/dashboard/routines')} className="p-2.5 bg-white rounded-xl shadow-sm border border-[#e9e8e5] text-[#58413e] hover:bg-gray-50 active:scale-95 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-[0.2em] mb-0.5">Andamento da Rotina</p>
                        <h2 className="text-xl font-black text-[#1b1c1a] leading-none">{data.name}</h2>
                    </div>
                </div>
            </div>

            <div className="px-5 py-6 space-y-6">
                {!hasSnapshot && (
                    <div className="bg-white border border-[#D4564A] p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3">
                            <Clock className="w-5 h-5 text-[#D4564A] opacity-20" />
                        </div>
                        <p className="text-[#8F2E21] text-xs font-black uppercase tracking-widest mb-1">Operação Aguardando</p>
                        <h3 className="text-lg font-black text-[#1b1c1a] mb-2 px-4">Esta rotina ainda não foi iniciada hoje.</h3>
                        <p className="text-sm text-[#58413e] mb-6 px-2">É necessário congelar o estoque teórico antes de liberar os grupos de contagem.</p>
                        <button 
                            disabled={starting} 
                            onClick={() => setShowStartConfirm(true)} 
                            className="w-full py-4 bg-[#B13A2B] hover:bg-[#902216] text-white rounded-2xl font-bold flex justify-center items-center active:scale-95 transition shadow-lg shadow-red-900/10"
                        >
                            {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Play className="w-5 h-5 mr-2" /> Iniciar Agora</>}
                        </button>
                    </div>
                )}

                <div className={`space-y-4 ${!hasSnapshot ? 'opacity-40 select-none grayscale-[0.5]' : ''}`}>
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-bold text-[#8c716c] uppercase tracking-[0.15em]">Grupos de Contagem</h3>
                        {hasSnapshot && (
                            <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-1 rounded-md uppercase">Em Operação</span>
                        )}
                    </div>
                    
                    {!hasSnapshot && (
                        <p className="text-xs text-[#8c716c] font-medium pl-1 italic">Libere o ciclo oficial para visualizar os detalhes.</p>
                    )}

                    <div className="space-y-3">
                        {data.groups.map(g => {
                            const isCompleted = g.status === 'completed'
                            const isInProgress = g.status === 'in_progress'

                            return (
                                <button
                                    key={g.id}
                                    onClick={() => handleGroupClick(g)}
                                    className={`w-full p-5 rounded-3xl border-2 text-left flex justify-between items-center transition-all bg-white hover:shadow-md ${
                                        isCompleted ? 'border-gray-100 opacity-70' :
                                        isInProgress ? 'border-orange-200' :
                                        'border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)]'
                                    }`}
                                >
                                    <div className="flex-1">
                                        <h4 className={`font-black text-lg ${isCompleted ? 'text-gray-400' : 'text-[#1b1c1a]'}`}>{g.name}</h4>
                                        
                                        <div className="flex items-center mt-2 space-x-2">
                                            {isCompleted ? (
                                                <div className="flex items-center bg-green-50 text-green-700 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider border border-green-100">
                                                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                                    <span>Concluído</span>
                                                </div>
                                            ) : isInProgress ? (
                                                <div className="flex items-center bg-orange-50 text-orange-700 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider border border-orange-100">
                                                    <Clock className="w-2.5 h-2.5 mr-1 animate-pulse" />
                                                    <span>Em andamento</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center bg-[#F8F7F4] text-[#8c716c] text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider border border-[#eeedea]">
                                                    <span>Pendente</span>
                                                </div>
                                            )}
                                            
                                            {g.user_name && (
                                                <span className="text-[10px] font-bold text-[#8c716c] uppercase">• {g.user_name.split(' ')[0]}</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                                        isCompleted ? 'bg-green-50 text-green-400' :
                                        isInProgress ? 'bg-orange-50 text-orange-400' :
                                        'bg-[#FDF0EF] text-[#D4564A]'
                                    }`}>
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-7 h-7" />
                                        ) : isInProgress ? (
                                            <PlayCircle className="w-7 h-7" />
                                        ) : (
                                            <PlayCircle className="w-7 h-7" />
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* BOTTOM SHEET DE CONFIRMAÇÃO */}
            {selectedGroup && (
                <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSelectedGroup(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-md bg-white rounded-t-[40px] shadow-2xl p-8 pb-10 animate-in slide-in-from-bottom duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
                        
                        <button onClick={() => setSelectedGroup(null)} className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center space-x-4 mb-6">
                            <div className="p-4 bg-[#FDF0EF] rounded-2xl">
                                <ClipboardList className="w-8 h-8 text-[#B13A2B]" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-[#1b1c1a]">{selectedGroup.name}</h3>
                                <p className="text-sm font-bold text-[#8c716c] uppercase tracking-wider">{selectedGroup.item_count} itens na lista</p>
                            </div>
                        </div>

                        <p className="text-base text-[#58413e] font-medium leading-relaxed mb-8">
                            Certifique-se de estar no local correto. Ao iniciar, os registros deste grupo serão vinculados ao seu usuário.
                        </p>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={confirmNavigation}
                                className="w-full py-5 bg-[#1b1c1a] text-white rounded-2xl font-black text-lg flex justify-center items-center active:scale-95 transition shadow-xl"
                            >
                                Iniciar Contagem
                            </button>
                            <button
                                onClick={() => setSelectedGroup(null)}
                                className="w-full py-4 text-[#8c716c] font-bold text-sm uppercase tracking-widest active:scale-95 transition"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
