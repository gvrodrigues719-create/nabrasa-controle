"use client"

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Check, ShieldAlert, CloudOff, AlertTriangle, ChevronDown, Edit3, Lock, X, User, CheckCircle2, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import React, { use } from 'react'
import { initCountSessionAction, syncCountSessionAction } from '@/app/actions/countAction'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { getOperatorSummaryAction } from '@/app/actions/gamificationAction'
import { CountItem } from '@/modules/count/types'
import { isIntegerUnit, calculateCountProgress } from '@/modules/count/helpers'

export default function BlindCountPage({ params }: { params: Promise<{ routineId: string, groupId: string }> }) {
    const router = useRouter()
    const { routineId, groupId } = use(params)

    const [loadingInit, setLoadingInit] = useState(true)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [items, setItems] = useState<CountItem[]>([])
    const [counts, setCounts] = useState<Record<string, string>>({})
    const [zeroed, setZeroed] = useState<Record<string, boolean>>({})
    const [groupName, setGroupName] = useState('')
    const [blocked, setBlocked] = useState<string | null>(null)
    const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced')
    const [showSummary, setShowSummary] = useState(false)
    const [showFinished, setShowFinished] = useState(false)
    const [expandZeroed, setExpandZeroed] = useState(false)
    const [expandUncounted, setExpandUncounted] = useState(false)
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
    const [operator, setOperator] = useState<{ name: string, role: string } | null>(null)
    const [rankPosition, setRankPosition] = useState<number | null>(null)
    const [weeklyPoints, setWeeklyPoints] = useState<number>(0)

    const LOCAL_KEY = `count_${routineId}_${groupId}`
    const ZEROED_KEY = `zeroed_${routineId}_${groupId}`

    useEffect(() => {
        initSession()
    }, [])

    const initSession = async () => {
        setLoadingInit(true)

        const op = await getActiveOperator()
        let userId = op?.userId
        
        if (op) {
            setOperator({ name: op.name, role: op.role })
        } else {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) userId = user.id
        }

        if (!userId) return router.push('/login')

        // Load Ranking Data for Badge
        getOperatorSummaryAction(userId).then(res => {
            if (res.success) {
                setRankPosition(res.rankPosition ?? null)
                setWeeklyPoints(res.weeklyPoints ?? 0)
            }
        })

        const res = await initCountSessionAction(routineId, groupId, userId)

        if (res.blocked) {
            setBlocked(res.blocked)
            setLoadingInit(false)
            return
        }

        if (res.groupName) setGroupName(res.groupName)
        if (res.sessionId) setSessionId(res.sessionId)
        if (res.items) setItems(res.items)

        const stored = localStorage.getItem(LOCAL_KEY)
        const localDict = stored ? JSON.parse(stored) : {}

        const storedZeroed = localStorage.getItem(ZEROED_KEY)
        const localZeroed = storedZeroed ? JSON.parse(storedZeroed) : {}
        const mergedZeroed = { ...(res.dbZeroed || {}), ...localZeroed }
        setZeroed(mergedZeroed)

        const merged = { ...res.dbCounts, ...localDict }
        setCounts(merged)

        setLoadingInit(false)
    }

    const handleChange = (item: CountItem, val: string) => {
        const isInt = isIntegerUnit(item.unit)
        if (isInt) {
            val = val.split(/[.,]/)[0].replace(/\D/g, '')
        }

        if (zeroed[item.id]) {
            const newZeroed = { ...zeroed }
            delete newZeroed[item.id]
            setZeroed(newZeroed)
            localStorage.setItem(ZEROED_KEY, JSON.stringify(newZeroed))
        }

        const newCounts = { ...counts, [item.id]: val }
        setCounts(newCounts)
        localStorage.setItem(LOCAL_KEY, JSON.stringify(newCounts))

        const numVal = parseFloat(val)
        if (!isNaN(numVal) && numVal > 0) {
            if (item.max_expected != null && numVal > item.max_expected * 2) {
                toast(`Valor alto para ${item.name}: ${val} ${item.unit}. Confere se está certo.`, { icon: '⚠️', id: `range-high-${item.id}` })
            }
            if (item.min_expected != null && numVal < item.min_expected * 0.1) {
                toast(`Valor baixo para ${item.name}: ${val} ${item.unit}. Confere se está certo.`, { icon: '⚠️', id: `range-low-${item.id}` })
            }
        }

        debouncedSync(newCounts, zeroed)
    }

    const handleZerado = (item: CountItem) => {
        const newCounts = { ...counts, [item.id]: '0' }
        const newZeroed = { ...zeroed, [item.id]: true }
        setCounts(newCounts)
        setZeroed(newZeroed)
        localStorage.setItem(LOCAL_KEY, JSON.stringify(newCounts))
        localStorage.setItem(ZEROED_KEY, JSON.stringify(newZeroed))
        debouncedSync(newCounts, newZeroed)
    }

    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const debouncedSync = (currentCounts: Record<string, string>, currentZeroed?: Record<string, boolean>) => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
        setSyncStatus('saving')

        if (!navigator.onLine) {
            setSyncStatus('offline')
            return
        }

        syncTimeoutRef.current = setTimeout(async () => {
            if (!sessionId) return
            const res = await syncCountSessionAction(sessionId, currentCounts, false, currentZeroed || zeroed)
            if (res.error) {
                setSyncStatus('offline')
                toast.error(res.error, { id: 'sync-err' })
                return
            }
            setSyncStatus('synced')
        }, 2000)
    }

    const handleManualSave = () => {
        if (!navigator.onLine) {
            toast.success("Progresso salvo localmente!", { icon: '💾' })
            return
        }
        debouncedSync(counts)
    }

    const handleCompleteGroup = async () => {
        if (syncStatus === 'saving') return toast.error('Aguarde o salvamento online terminar.')
        const uncounted = items.filter(i => !zeroed[i.id] && (counts[i.id] === undefined || counts[i.id] === ''))
        if (uncounted.length > 0) {
            toast.error(`Ainda há ${uncounted.length} itens não contados.`)
            return
        }
        if (!navigator.onLine) {
            toast.error("Dispositivo offline.")
            return
        }
        setShowSummary(true)
    }

    const executeCompleteGroup = async () => {
        setSyncStatus('saving')
        if (!sessionId) return
        const res = await syncCountSessionAction(sessionId, counts, true, zeroed)
        if (res.error) {
            setSyncStatus('offline')
            toast.error(res.error)
            return
        }
        localStorage.removeItem(LOCAL_KEY)
        localStorage.removeItem(ZEROED_KEY)
        setShowSummary(false)
        setShowFinished(true)
    }

    if (loadingInit) return <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]"><Loader2 className="w-10 h-10 text-[#B13A2B] animate-spin" /></div>

    if (blocked) return (
        <div className="p-8 flex flex-col items-center justify-center min-h-screen bg-white text-center space-y-6">
            <div className="p-6 bg-red-50 rounded-3xl">
                <ShieldAlert className="w-16 h-16 text-[#B13A2B]" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-[#1b1c1a]">Acesso Bloqueado</h2>
                <p className="text-sm text-[#8c716c] font-medium mt-2">{blocked}</p>
            </div>
            <button onClick={() => router.push(`/dashboard/routines/${routineId}`)} className="w-full max-w-xs py-4 bg-[#1b1c1a] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition">
                Voltar
            </button>
        </div>
    )

    const itemsPendentes = items.filter(i => !zeroed[i.id] && (counts[i.id] === undefined || counts[i.id] === '')).length
    const progressPerc = calculateCountProgress(items.length, itemsPendentes)

    if (showFinished) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-xl border border-[#e9e8e5] animate-bounce">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                
                <h2 className="text-3xl font-black text-[#1b1c1a] mb-2 tracking-tight">Grupo Concluído!</h2>
                <p className="text-[#8c716c] font-medium text-base mb-10 px-4">
                    Tudo certo com a contagem do local <strong>{groupName}</strong>. 
                </p>

                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e9e8e5] mb-12">
                    <div className="flex items-center justify-between border-b border-[#F8F7F4] pb-4 mb-4">
                        <span className="text-sm font-bold text-[#8c716c] uppercase tracking-wider">Itens Contados</span>
                        <span className="text-lg font-black text-[#1b1c1a]">{items.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <span className="text-sm font-bold text-[#8c716c] uppercase tracking-wider">Premiação</span>
                        </div>
                        <span className="text-lg font-black text-amber-600">+50 pontos</span>
                    </div>
                </div>

                <button 
                    onClick={() => router.push(`/dashboard/routines/${routineId}`)} 
                    className="w-full max-w-sm py-5 bg-[#1b1c1a] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition"
                >
                    Próximo Grupo
                </button>
            </div>
        )
    }

    return (
        <div className="bg-[#F8F7F4] min-h-screen pb-32">
            {/* OPERATIONAL HEADER */}
            <div className="bg-white border-b border-[#e9e8e5] sticky top-0 z-40 shadow-sm">
                <div className="p-4 md:p-5 flex justify-between items-center bg-white">
                    <button onClick={() => router.push(`/dashboard/routines/${routineId}`)} className="p-2.5 bg-white rounded-xl shadow-sm border border-[#e9e8e5] text-[#58413e] hover:bg-gray-50 active:scale-95 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <h1 className="text-sm font-black text-[#1b1c1a] uppercase tracking-wider leading-none">{groupName}</h1>
                        <div className="flex items-center mt-1 space-x-1.5 opacity-60">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#8c716c]">Contagem em andamento</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="hidden sm:flex flex-col items-end mr-1">
                            <span className="text-[10px] font-black uppercase text-[#1b1c1a] leading-tight">{operator?.name?.split(' ')[0]}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[8px] font-bold uppercase text-[#8c716c] leading-none">{operator?.role}</span>
                                {rankPosition && weeklyPoints > 0 && (
                                    <span className="text-[8px] font-black text-[#b13a2b] bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-red-100/50">
                                        #{rankPosition} na semana
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#F8F7F4] border border-[#eeedea] flex items-center justify-center shadow-sm">
                            <User className="w-5 h-5 text-[#b13a2b]" />
                        </div>
                    </div>
                </div>

                {/* PROGRESS BAR */}
                <div className="px-5 pb-4 bg-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">Progresso do Local</span>
                        <div className="flex items-center space-x-1.5 font-black text-[10px]">
                            {syncStatus === 'synced' ? <><Check className="w-3 h-3 text-green-500" /><span className="text-green-600 uppercase tracking-tighter">Sincronizado</span></> :
                                syncStatus === 'saving' ? <><Loader2 className="w-3 h-3 text-[#b13a2b] animate-spin" /><span className="text-[#b13a2b] uppercase tracking-tighter">Salvando...</span></> :
                                    <><CloudOff className="w-3 h-3 text-amber-500" /><span className="text-amber-500 uppercase tracking-tighter">Modo Offline</span></>
                            }
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="bg-[#F8F7F4] h-3 flex-1 rounded-full border border-[#eeedea] overflow-hidden">
                            <div 
                                className="bg-[#B13A2B] h-full rounded-full transition-all duration-500 ease-out shadow-sm" 
                                style={{ width: `${progressPerc}%` }}
                            ></div>
                        </div>
                        <span className="text-[11px] font-black text-[#1b1c1a] w-12 text-right">{items.length - itemsPendentes} / {items.length}</span>
                    </div>
                </div>
            </div>

            {showSummary ? (
                <div className="p-5 space-y-6">
                    <div className="text-center py-8">
                        <div className="bg-white p-5 rounded-3xl shadow-lg border border-[#e9e8e5] inline-flex items-center justify-center mb-5">
                            <Lock className="w-10 h-10 text-[#B13A2B]" />
                        </div>
                        <h2 className="text-2xl font-black text-[#1b1c1a] tracking-tight">Conclusão do Grupo</h2>
                        <p className="text-sm text-[#8c716c] font-medium mt-1">Revise os dados antes de finalizar a contagem deste local.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-[#e9e8e5] rounded-3xl p-5 shadow-sm">
                            <p className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest mb-1">Contados / Zerados</p>
                            <p className="text-3xl font-black text-[#1b1c1a]">{items.length - items.filter(i => !zeroed[i.id] && (counts[i.id] === undefined || counts[i.id] === '')).length}</p>
                        </div>
                        <div className="bg-white border border-[#e9e8e5] rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center">
                            <span className="text-green-600 font-black text-sm uppercase tracking-wider">Status</span>
                            <span className="text-xs font-bold text-[#8c716c]">Pronto p/ Finalizar</span>
                        </div>
                    </div>

                    <div className="space-y-3 pt-6">
                        <button
                            onClick={executeCompleteGroup}
                            disabled={syncStatus === 'saving'}
                            className="w-full py-5 bg-[#1b1c1a] text-white rounded-2xl font-black text-lg flex justify-center items-center active:scale-95 transition shadow-xl disabled:opacity-50"
                        >
                            {syncStatus === 'saving' ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Finalizar Este Grupo'}
                        </button>
                        <button
                            onClick={() => setShowSummary(false)}
                            className="w-full py-4 text-[#8c716c] font-bold text-sm uppercase tracking-widest active:scale-95 transition"
                        >
                            Editar Contagem
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-4 space-y-4">
                    {items.length === 0 ? (
                        <p className="text-center mt-10 text-[#8c716c] font-medium">Não há itens vinculados a este local.</p>
                    ) : items.map((item, index) => {
                        const val = counts[item.id] ?? ''
                        const isZeroed = !!zeroed[item.id]
                        const isFilled = val !== '' || isZeroed
                        const isInt = isIntegerUnit(item.unit)

                        return (
                            <div key={item.id} className={`p-6 rounded-[32px] border-2 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus-within:border-[#B13A2B] ${
                                isZeroed ? 'bg-[#FDFDFD] border-gray-100 opacity-60' :
                                isFilled ? 'bg-white border-white' : 'bg-white border-white'
                            }`}>
                                <div className="flex justify-between items-start mb-5 pb-4 border-b border-[#F8F7F4]">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="bg-[#F8F7F4] text-[#8c716c] text-[10px] font-black px-2 py-0.5 rounded-md">ID #{index + 1}</span>
                                            {isZeroed && <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">Item Zerado</span>}
                                        </div>
                                        <h3 className={`text-xl font-black leading-tight ${isZeroed ? 'text-gray-400' : 'text-[#1b1c1a]'}`}>{item.name}</h3>
                                        {item.unit_observation && (
                                            <p className={`text-xs font-bold mt-1.5 flex items-center ${isZeroed ? 'text-amber-300' : 'text-amber-600'}`}>
                                                <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" /> {item.unit_observation}
                                            </p>
                                        )}
                                    </div>
                                    {item.image_url && (
                                        <button
                                            type="button"
                                            onClick={() => setLightboxUrl(item.image_url)}
                                            className="shrink-0 ml-3 active:scale-95 transition-transform"
                                        >
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="w-16 h-16 rounded-2xl object-cover border-4 border-[#F8F7F4] shadow-sm"
                                            />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center space-x-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[#8c716c] mb-1.5 block">Qtd. Física</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step={isInt ? "1" : "0.01"}
                                                inputMode={isInt ? "numeric" : "decimal"}
                                                className={`w-full text-3xl font-black p-5 bg-[#F8F7F4] border-2 border-transparent rounded-2xl outline-none focus:border-[#B13A2B] transition-all text-center ${
                                                    isZeroed ? 'text-gray-400' : 'text-[#1b1c1a]'
                                                }`}
                                                placeholder="..."
                                                value={val}
                                                onChange={(e) => handleChange(item, e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col space-y-2">
                                        <button
                                            onClick={() => handleZerado(item)}
                                            className={`h-14 px-5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center border-2 ${
                                                isZeroed
                                                    ? 'bg-red-50 text-red-600 border-red-100 shadow-inner'
                                                    : 'bg-white text-[#8c716c] border-[#eeedea] hover:bg-gray-50'
                                            }`}
                                        >
                                            Zerado
                                        </button>
                                        <div className="h-10 px-4 bg-[#F8F7F4] rounded-xl flex items-center justify-center border border-[#eeedea]">
                                            <span className="text-[11px] font-black text-[#b13a2b] uppercase">{item.unit}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* FLOAT BAR */}
                    <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-[#e9e8e5] shadow-[0_-8px_30px_rgb(0,0,0,0.06)] z-50 flex space-x-4 max-w-md mx-auto rounded-t-[32px]">
                        <button onClick={handleManualSave} className="p-5 bg-[#F8F7F4] text-[#58413e] rounded-2xl active:scale-95 transition hover:bg-gray-100 border border-[#eeedea]">
                            <Save className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={handleCompleteGroup} 
                            disabled={itemsPendentes > 0}
                            className={`flex-1 py-5 rounded-2xl font-black flex justify-center items-center text-lg active:scale-95 transition-all shadow-xl ${
                                itemsPendentes === 0 
                                    ? 'bg-[#1b1c1a] text-white shadow-black/20' 
                                    : 'bg-gray-100 text-gray-300'
                            }`}
                        >
                            Finalizar Grupo {itemsPendentes > 0 ? `(${itemsPendentes})` : ''}
                        </button>
                    </div>
                </div>
            )}

            {/* LIGHTBOX */}
            {lightboxUrl && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
                    <img src={lightboxUrl} alt="Visualização" className="max-w-full max-h-[80vh] rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-200" />
                    <button className="absolute top-8 right-8 bg-white/10 text-white p-3 rounded-full hover:bg-white/20"><X className="w-6 h-6" /></button>
                </div>
            )}
        </div>
    )
}
