'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Check, ShieldAlert, CloudOff, Wifi, AlertTriangle } from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'
import toast from 'react-hot-toast'
import React, { use } from 'react'
import { initCountSessionAction, syncCountSessionAction } from '@/app/actions/countAction'
import { getActiveOperator } from '@/app/actions/pinAuth'

type Item = {
    id: string
    name: string
    unit: string
    unit_observation: string
}

export default function BlindCountPage({ params }: { params: Promise<{ routineId: string, groupId: string }> }) {
    const router = useRouter()
    const { routineId, groupId } = use(params)

    const [loadingInit, setLoadingInit] = useState(true)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [items, setItems] = useState<Item[]>([])
    const [counts, setCounts] = useState<Record<string, string>>({})
    const [groupName, setGroupName] = useState('')
    const [blocked, setBlocked] = useState<string | null>(null)
    const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced')
    const [isConfirming, setIsConfirming] = useState(false)

    const LOCAL_KEY = `count_${routineId}_${groupId}`

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

        setCounts({ ...localDict, ...res.dbCounts })

        setLoadingInit(false)
    }

    // Handle single count change
    const handleChange = (item: Item, val: string) => {
        const isInt = ['un', 'und', 'cx', 'pct'].includes(item.unit.toLowerCase().trim())

        // Se for inteiro e vier com virgula ou ponto (ex: 5,06 ou 5.0), arrancamos o que vier depois
        if (isInt) {
            val = val.split(/[.,]/)[0].replace(/\D/g, '')
        }

        const newCounts = { ...counts, [item.id]: val }
        setCounts(newCounts)
        localStorage.setItem(LOCAL_KEY, JSON.stringify(newCounts))
        debouncedSync(newCounts) // Trigger remote save
    }

    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const debouncedSync = (currentCounts: Record<string, string>) => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
        setSyncStatus('saving')

        if (!navigator.onLine) {
            setSyncStatus('offline')
            return
        }

        syncTimeoutRef.current = setTimeout(async () => {
            if (!sessionId) return

            const res = await syncCountSessionAction(sessionId, currentCounts, false)
            if (res.error) {
                setSyncStatus('offline')
                toast.error(res.error, { id: 'sync-err' })
                return
            }

            setSyncStatus('synced')
            toast.success("Progresso salvo no banco!", { icon: '☁️', id: 'sync-success' })
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
        const uncounted = items.filter(i => counts[i.id] === undefined || counts[i.id] === '')
        if (uncounted.length > 0) {
            toast.error(`Ainda há ${uncounted.length} itens não contados. Lembre-se: Vazio não é Zero.`)
            return
        }

        if (!navigator.onLine) {
            toast.error("Dispositivo offline. Conecte-se para concluir este grupo definitivo.")
            return
        }

        setIsConfirming(true)
    }

    const executeCompleteGroup = async () => {
        setIsConfirming(false)
        setSyncStatus('saving')

        if (!sessionId) return

        const res = await syncCountSessionAction(sessionId, counts, true)
        if (res.error) {
            setSyncStatus('offline')
            toast.error(res.error)
            return
        }

        localStorage.removeItem(LOCAL_KEY)
        router.push(`/dashboard/routines/${routineId}`)
    }

    if (loadingInit) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /></div>

    if (blocked) return (
        <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
            <ShieldAlert className="w-16 h-16 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Acesso Bloqueado</h2>
            <p className="text-gray-600 font-medium">{blocked}</p>
            <button onClick={() => router.push(`/dashboard/routines/${routineId}`)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold mt-4 shrink-0 shadow-sm">
                Voltar para Locais
            </button>
        </div>
    )

    const itemsPendentes = items.filter(i => counts[i.id] === undefined || counts[i.id] === '').length

    return (
        <div className="bg-gray-50 min-h-screen pb-32">
            {/* HEADER */}
            <div className="bg-indigo-600 text-white p-4 sticky top-0 z-40 shadow-md">
                <div className="flex justify-between items-center mb-2">
                    <button onClick={() => router.push(`/dashboard/routines/${routineId}`)} className="p-2 bg-indigo-700/50 rounded-lg hover:bg-indigo-700 transition">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex items-center space-x-2 text-xs font-semibold bg-indigo-800/40 px-3 py-1 rounded-full">
                        {syncStatus === 'synced' ? <><Check className="w-3 h-3 text-green-300" /><span className="text-indigo-100">Sincronizado</span></> :
                            syncStatus === 'saving' ? <><Loader2 className="w-3 h-3 text-white animate-spin" /><span className="text-indigo-100">Salvando...</span></> :
                                <><CloudOff className="w-3 h-3 text-red-300" /><span className="text-red-100">Modo Offline (Local)</span></>
                        }
                    </div>
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight">{groupName}</h1>
                <div className="mt-3 flex items-center space-x-2">
                    <div className="bg-indigo-500/30 h-2 flex-1 rounded-full overflow-hidden">
                        <div className="bg-green-400 h-full rounded-full transition-all" style={{ width: `${((items.length - itemsPendentes) / (items.length || 1)) * 100}%` }}></div>
                    </div>
                    <span className="text-xs font-bold w-12 text-right">{items.length - itemsPendentes}/{items.length}</span>
                </div>
            </div>

            {/* LISTA BLIND COUNT */}
            <div className="p-4 space-y-4">
                {items.length === 0 ? (
                    <p className="text-center mt-10 text-gray-500 font-medium">Não há itens vinculados a este local.</p>
                ) : items.map((item, index) => {
                    const val = counts[item.id] ?? ''
                    const isFilled = val !== ''
                    const isInt = ['un', 'und', 'cx', 'pct'].includes(item.unit.toLowerCase().trim())

                    return (
                        <div key={item.id} className={`p-5 rounded-2xl border-2 transition-colors shadow-sm ${isFilled ? 'bg-white border-green-200' : 'bg-white border-gray-100'}`}>
                            <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 mb-1">#{index + 1}</p>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{item.name}</h3>
                                    {item.unit_observation && (
                                        <p className="text-sm font-medium text-amber-600 mt-1 flex items-center">
                                            <AlertTriangle className="w-4 h-4 mr-1 shrink-0" /> {item.unit_observation}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">Quantidade Física</label>
                                    <input
                                        type="number"
                                        step={isInt ? "1" : "0.01"}
                                        inputMode={isInt ? "numeric" : "decimal"}
                                        onKeyDown={(e) => {
                                            if (isInt && (e.key === '.' || e.key === ',')) e.preventDefault()
                                        }}
                                        className="w-full text-3xl font-extrabold text-gray-900 p-4 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-center bg-gray-50"
                                        placeholder=" "
                                        value={val}
                                        onChange={(e) => handleChange(item, e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col items-center justify-center shrink-0 min-w-[70px] bg-indigo-50 py-3 rounded-xl border border-indigo-100 mt-5">
                                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">UND</span>
                                    <span className="text-xl font-black text-indigo-600">{item.unit}</span>
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

            <ConfirmModal
                isOpen={isConfirming}
                title="Concluir Contagem"
                message="Deseja realmente CONCLUIR esta contagem? Você não poderá alterá-la depois e os dados ficarão bloqueados."
                confirmText="Verifiquei e Quero Concluir"
                cancelText="Cancelar"
                onConfirm={executeCompleteGroup}
                onCancel={() => setIsConfirming(false)}
            />
        </div>
    )
}
