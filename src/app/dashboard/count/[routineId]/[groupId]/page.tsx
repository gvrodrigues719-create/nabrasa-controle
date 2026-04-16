'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Check, ShieldAlert, CloudOff, AlertTriangle, ChevronDown, Edit3, Lock, X } from 'lucide-react'
import toast from 'react-hot-toast'
import React, { use } from 'react'
import { initCountSessionAction, syncCountSessionAction } from '@/app/actions/countAction'
import { getActiveOperator } from '@/app/actions/pinAuth'
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
    const [expandZeroed, setExpandZeroed] = useState(false)
    const [expandUncounted, setExpandUncounted] = useState(false)
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

    const LOCAL_KEY = `count_${routineId}_${groupId}`
    const ZEROED_KEY = `zeroed_${routineId}_${groupId}`

    useEffect(() => {
        initSession()
    }, [])

    const initSession = async () => {
        setLoadingInit(true)

        // Descobre User ID hibrido (Operator Cookie vs Auth)
        const op = await getActiveOperator()
        let userId = null
        if (op) {
            userId = op.userId
        } else {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) userId = user.id
        }

        if (!userId) return router.push('/login')

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

    // Handle single count change
    const handleChange = (item: CountItem, val: string) => {
        const isInt = isIntegerUnit(item.unit)

        // Se for inteiro e vier com virgula ou ponto (ex: 5,06 ou 5.0), arrancamos o que vier depois
        if (isInt) {
            val = val.split(/[.,]/)[0].replace(/\D/g, '')
        }

        // Se o operador digitar manualmente, remove o estado zeroed
        if (zeroed[item.id]) {
            const newZeroed = { ...zeroed }
            delete newZeroed[item.id]
            setZeroed(newZeroed)
            localStorage.setItem(ZEROED_KEY, JSON.stringify(newZeroed))
        }

        const newCounts = { ...counts, [item.id]: val }
        setCounts(newCounts)
        localStorage.setItem(LOCAL_KEY, JSON.stringify(newCounts))

        // Range check warnings (non-blocking)
        const numVal = parseFloat(val)
        if (!isNaN(numVal) && numVal > 0) {
            if (item.max_expected != null && numVal > item.max_expected * 2) {
                toast(`Valor alto para ${item.name}: ${val} ${item.unit}. Confere se está certo.`, { icon: '⚠️', id: `range-high-${item.id}` })
            }
            if (item.min_expected != null && numVal < item.min_expected * 0.1) {
                toast(`Valor baixo para ${item.name}: ${val} ${item.unit}. Confere se está certo.`, { icon: '⚠️', id: `range-low-${item.id}` })
            }
        }

        debouncedSync(newCounts, zeroed) // Trigger remote save
    }

    // Handle zerado button
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
            toast.success("Progresso salvo localmente! Será enviado quando houver rede.", { icon: '💾' })
            return
        }
        debouncedSync(counts)
    }

    const handleCompleteGroup = async () => {
        if (syncStatus === 'saving') return toast.error('Aguarde o salvamento online terminar.')

        // Validate all items counted
        const uncounted = items.filter(i => !zeroed[i.id] && (counts[i.id] === undefined || counts[i.id] === ''))
        if (uncounted.length > 0) {
            toast.error(`Ainda há ${uncounted.length} itens não contados. Lembre-se: Vazio não é Zero.`)
            return
        }

        if (!navigator.onLine) {
            toast.error("Dispositivo offline. Conecte-se para concluir este grupo definitivo.")
            return
        }

        setShowSummary(true)
    }

    const executeCompleteGroup = async () => {
        setShowSummary(false)
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
        router.push(`/dashboard/routines/${routineId}`)
    }

    if (loadingInit) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#B13A2B] animate-spin" /></div>

    if (blocked) return (
        <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
            <ShieldAlert className="w-16 h-16 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Acesso Bloqueado</h2>
            <p className="text-gray-600 font-medium">{blocked}</p>
            <button onClick={() => router.push(`/dashboard/routines/${routineId}`)} className="bg-[#B13A2B] text-white px-6 py-3 rounded-xl font-bold mt-4 shrink-0 shadow-sm">
                Voltar para Locais
            </button>
        </div>
    )

    const itemsPendentes = items.filter(i => !zeroed[i.id] && (counts[i.id] === undefined || counts[i.id] === '')).length

    return (
        <div className="bg-gray-50 min-h-screen pb-32">
            {/* HEADER */}
            <div className="bg-[#B13A2B] text-white p-4 sticky top-0 z-40 shadow-md">
                <div className="flex justify-between items-center mb-2">
                    <button onClick={() => router.push(`/dashboard/routines/${routineId}`)} className="p-2 bg-[#8F2E21]/50 rounded-lg hover:bg-[#8F2E21] transition">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex items-center space-x-2 text-xs font-semibold bg-black/20 px-3 py-1 rounded-full">
                        {syncStatus === 'synced' ? <><Check className="w-3 h-3 text-green-300" /><span className="text-indigo-100">Sincronizado</span></> :
                            syncStatus === 'saving' ? <><Loader2 className="w-3 h-3 text-white animate-spin" /><span className="text-indigo-100">Salvando...</span></> :
                                <><CloudOff className="w-3 h-3 text-red-300" /><span className="text-red-100">Modo Offline (Local)</span></>
                        }
                    </div>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">{groupName}</h1>
                <div className="mt-3 flex items-center space-x-2">
                    <div className="bg-white/20 h-2 flex-1 rounded-full overflow-hidden">
                        <div className="bg-green-400 h-full rounded-full transition-all" style={{ width: `${calculateCountProgress(items.length, itemsPendentes)}%` }}></div>
                    </div>
                    <span className="text-xs font-bold w-12 text-right">{items.length - itemsPendentes}/{items.length}</span>
                </div>
            </div>

            {showSummary ? (() => {
                const zeroedItems = items.filter(i => zeroed[i.id])
                const uncountedItems = items.filter(i => !zeroed[i.id] && (counts[i.id] === undefined || counts[i.id] === ''))
                const countedItems = items.filter(i => !zeroed[i.id] && counts[i.id] !== undefined && counts[i.id] !== '')

                return (
                    <div className="p-4 space-y-4">
                        <div className="text-center py-6">
                            <div className="bg-[#FDF0EF] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock className="w-8 h-8 text-[#B13A2B]" />
                            </div>
                            <h2 className="text-2xl font-extrabold text-gray-900">Resumo da Contagem</h2>
                            <p className="text-sm text-gray-500 mt-1">Revise antes de concluir. Após confirmar, os dados serão bloqueados.</p>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                                <p className="text-3xl font-black text-green-600">{countedItems.length}</p>
                                <p className="text-xs font-bold text-green-500 uppercase mt-1">Contados</p>
                            </div>
                            <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4 text-center">
                                <p className="text-3xl font-black text-gray-500">{zeroedItems.length}</p>
                                <p className="text-xs font-bold text-gray-400 uppercase mt-1">Zerados</p>
                            </div>
                            <div className={`rounded-2xl p-4 text-center border ${uncountedItems.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                <p className={`text-3xl font-black ${uncountedItems.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>{uncountedItems.length}</p>
                                <p className={`text-xs font-bold uppercase mt-1 ${uncountedItems.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>Vazios</p>
                            </div>
                        </div>

                        {/* Expandable: Zerados */}
                        {zeroedItems.length > 0 && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <button onClick={() => setExpandZeroed(!expandZeroed)} className="w-full flex justify-between items-center p-4 text-left">
                                    <div className="flex items-center space-x-2">
                                        <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded">ZERADO</span>
                                        <span className="text-sm font-bold text-gray-700">{zeroedItems.length} {zeroedItems.length === 1 ? 'item' : 'itens'}</span>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandZeroed ? 'rotate-180' : ''}`} />
                                </button>
                                {expandZeroed && (
                                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                                        {zeroedItems.map(item => (
                                            <div key={item.id} className="px-4 py-3 flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-500">{item.name}</span>
                                                <span className="text-sm font-bold text-gray-400">0 {item.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Expandable: Não contados */}
                        {uncountedItems.length > 0 && (
                            <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                                <button onClick={() => setExpandUncounted(!expandUncounted)} className="w-full flex justify-between items-center p-4 text-left">
                                    <div className="flex items-center space-x-2">
                                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded">VAZIO</span>
                                        <span className="text-sm font-bold text-red-700">{uncountedItems.length} {uncountedItems.length === 1 ? 'item' : 'itens'} sem contagem</span>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-red-400 transition-transform ${expandUncounted ? 'rotate-180' : ''}`} />
                                </button>
                                {expandUncounted && (
                                    <div className="border-t border-red-100 divide-y divide-red-50">
                                        {uncountedItems.map(item => (
                                            <div key={item.id} className="px-4 py-3">
                                                <span className="text-sm font-medium text-red-600">{item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3 pt-4">
                            <button
                                onClick={executeCompleteGroup}
                                disabled={syncStatus === 'saving'}
                                className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-lg flex justify-center items-center active:scale-95 transition shadow-sm disabled:opacity-50"
                            >
                                {syncStatus === 'saving' ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Lock className="w-5 h-5 mr-2" /> Confirmar e Concluir</>}
                            </button>
                            <button
                                onClick={() => setShowSummary(false)}
                                className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm flex justify-center items-center active:scale-95 transition"
                            >
                                <Edit3 className="w-4 h-4 mr-2" /> Editar Contagem
                            </button>
                        </div>
                    </div>
                )
            })() : (
                <>
                    {/* LISTA BLIND COUNT */}
                    <div className="p-4 space-y-4">
                        {items.length === 0 ? (
                            <p className="text-center mt-10 text-gray-500 font-medium">Não há itens vinculados a este local.</p>
                        ) : items.map((item, index) => {
                            const val = counts[item.id] ?? ''
                            const isZeroed = !!zeroed[item.id]
                            const isFilled = val !== '' || isZeroed
                            const isInt = isIntegerUnit(item.unit)

                            return (
                                <div key={item.id} className={`p-5 rounded-2xl border-2 transition-colors shadow-sm ${
                                    isZeroed ? 'bg-gray-100 border-gray-200' :
                                    isFilled ? 'bg-white border-green-200' : 'bg-white border-gray-100'
                                }`}>
                                    <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-gray-400 mb-1">#{index + 1}</p>
                                            <h3 className={`text-lg font-bold leading-tight ${isZeroed ? 'text-gray-400' : 'text-gray-900'}`}>{item.name}</h3>
                                            {item.unit_observation && (
                                                <p className={`text-sm font-medium mt-1 flex items-center ${isZeroed ? 'text-amber-400' : 'text-amber-600'}`}>
                                                    <AlertTriangle className="w-4 h-4 mr-1 shrink-0" /> {item.unit_observation}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-start gap-2 ml-2">
                                            {item.image_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => setLightboxUrl(item.image_url)}
                                                    className="shrink-0"
                                                >
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="w-14 h-14 rounded-xl object-cover border-2 border-[#FDF0EF] shadow-sm"
                                                    />
                                                </button>
                                            )}
                                            {isZeroed && (
                                                <span className="bg-gray-300 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0">Zerado</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <div className="flex-1">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">Quantidade Física</label>
                                            <input
                                                type="number"
                                                step={isInt ? "1" : "0.01"}
                                                inputMode={isInt ? "numeric" : "decimal"}
                                                onKeyDown={(e) => {
                                                    if (isInt && (e.key === '.' || e.key === ',')) e.preventDefault()
                                                }}
                                                className={`w-full text-3xl font-extrabold p-4 border rounded-xl outline-none focus:ring-4 focus:ring-[#FDF0EF] focus:border-[#B13A2B] transition-all text-center ${
                                                    isZeroed ? 'text-gray-400 bg-gray-50 border-gray-200' : 'text-gray-900 bg-gray-50 border-gray-200'
                                                }`}
                                                placeholder=" "
                                                value={val}
                                                onChange={(e) => handleChange(item, e.target.value)}
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleZerado(item)}
                                            className={`shrink-0 px-3 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 mt-5 ${
                                                isZeroed
                                                    ? 'bg-gray-300 text-gray-500 border border-gray-300'
                                                    : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                            }`}
                                        >
                                            Zerado
                                        </button>
                                        <div className="flex flex-col items-center justify-center shrink-0 min-w-[55px] bg-[#FDF0EF] py-3 rounded-xl border border-red-100 mt-5">
                                            <span className="text-xs font-bold text-[#B13A2B] uppercase tracking-widest mb-1">UND</span>
                                            <span className="text-lg font-black text-[#B13A2B]">{item.unit}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* FLOAT BUTTON CONCLUDE */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 flex space-x-3 max-w-md mx-auto">
                        <button onClick={handleManualSave} className="p-4 bg-gray-100 text-gray-700 rounded-2xl active:scale-95 transition">
                            <Save className="w-6 h-6" />
                        </button>
                        <button onClick={handleCompleteGroup} className={`flex-1 py-4 rounded-2xl font-bold flex justify-center items-center text-lg active:scale-95 transition shadow-sm ${itemsPendentes === 0 ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-gray-200 text-gray-400'}`}>
                            <Check className="w-6 h-6 mr-2" />
                            Concluir Grupo {itemsPendentes > 0 ? `(${itemsPendentes})` : ''}
                        </button>
                    </div>
                </>
            )}

            {/* LIGHTBOX */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setLightboxUrl(null)}
                >
                    <img
                        src={lightboxUrl}
                        alt="Foto do item"
                        className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain"
                    />
                    <button
                        onClick={() => setLightboxUrl(null)}
                        className="absolute top-5 right-5 bg-white/20 text-white p-2 rounded-full hover:bg-white/30 transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    )
}
