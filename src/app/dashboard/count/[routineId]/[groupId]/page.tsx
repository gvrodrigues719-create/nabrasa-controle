'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Check, ShieldAlert, CloudOff, Wifi, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import React, { use } from 'react'

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

    const LOCAL_KEY = `count_${routineId}_${groupId}`

    useEffect(() => {
        initSession()
    }, [])

    const initSession = async () => {
        setLoadingInit(true)

        // Auth info
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push('/login')

        // Group info
        const { data: group } = await supabase.from('groups').select('name').eq('id', groupId).single()
        if (group) setGroupName(group.name)

        // Verify existing session for today
        const today = new Date().toISOString().split('T')[0]
        const { data: existingSession } = await supabase
            .from('count_sessions')
            .select('id, status, user_id, users(name)')
            .eq('routine_id', routineId)
            .eq('group_id', groupId)
            .gte('started_at', `${today}T00:00:00Z`)
            .order('started_at', { ascending: false })
            .limit(1)
            .single()

        let currentSessionId = existingSession?.id

        if (existingSession) {
            if (existingSession.status === 'completed') {
                setBlocked('Este grupo já foi concluído hoje e não pode mais ser editado.')
                setLoadingInit(false)
                return
            }
            if (existingSession.status === 'in_progress' && existingSession.user_id !== user.id) {
                const uName = (existingSession.users as any)?.name || 'Outro usuário'
                setBlocked(`Este grupo está em andamento por ${uName}. Contagem paralela no mesmo grupo não é permitida sem permissão.`)
                setLoadingInit(false)
                return
            }
        } else {
            // Create Session
            const { data: newSession } = await supabase.from('count_sessions').insert([{
                routine_id: routineId,
                group_id: groupId,
                user_id: user.id,
                status: 'in_progress',
                started_at: new Date().toISOString()
            }]).select('id').single()

            if (newSession) currentSessionId = newSession.id
        }

        setSessionId(currentSessionId)

        // Load items for this group
        const { data: itemsData } = await supabase.from('items').select('id, name, unit, unit_observation').eq('group_id', groupId).eq('active', true).order('name', { ascending: true })
        if (itemsData) setItems(itemsData)

        // Load previous answers (DB first, local fallback)
        const stored = localStorage.getItem(LOCAL_KEY)
        const localDict = stored ? JSON.parse(stored) : {}

        if (currentSessionId) {
            const { data: dbItems } = await supabase.from('count_session_items').select('item_id, counted_quantity').eq('session_id', currentSessionId)
            const newCounts = { ...localDict }
            if (dbItems) {
                dbItems.forEach(d => {
                    if (d.counted_quantity !== null && d.counted_quantity !== undefined) {
                        newCounts[d.item_id] = d.counted_quantity.toString()
                    }
                })
            }
            setCounts(newCounts)
        }

        setLoadingInit(false)
    }

    // Handle single count change
    const handleChange = (itemId: string, val: string) => {
        // Only numbers dots and commas allowed roughly handled
        const newCounts = { ...counts, [itemId]: val }
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

            const upserts = Object.keys(currentCounts).map(itemId => {
                const qty = currentCounts[itemId]
                return {
                    session_id: sessionId,
                    item_id: itemId,
                    counted_quantity: qty === '' ? null : parseFloat(qty.replace(',', '.'))
                }
            })

            // Delete old and insert to update (since our N:M doesn't have simple composite unique yet easily accessible via PK)
            // Actually count_session_items has UUID PK, so we could just insert them, but there'll be duplicates.
            // Easiest is to manually clear and write, OR just push it on "Save/Conclude" but requirement says partial resilient.
            // Since supabase JS SDK doesn't natively do "upsert by non-PK" cleanly unless configured, we'll clear and recreate.
            await supabase.from('count_session_items').delete().eq('session_id', sessionId)
            if (upserts.length > 0) {
                await supabase.from('count_session_items').insert(upserts)
            }
            await supabase.from('count_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId)

            setSyncStatus('synced')
        }, 2000)
    }

    const handleManualSave = () => {
        if (!navigator.onLine) {
            toast.success("Progresso salvo localmente! Será enviado quando houver rede.", { icon: '💾' })
            return
        }
        debouncedSync(counts)
        toast.success("Progresso salvo no banco!", { icon: '☁️' })
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

        if (confirm('Deseja realmente CONCLUIR esta contagem? Você não poderá alterá-la depois.')) {
            setSyncStatus('saving')

            // Final Sync Ensure
            const finalPayload = items.map(i => ({
                session_id: sessionId,
                item_id: i.id,
                counted_quantity: parseFloat(counts[i.id].replace(',', '.'))
            }))

            await supabase.from('count_session_items').delete().eq('session_id', sessionId)
            await supabase.from('count_session_items').insert(finalPayload)

            await supabase.from('count_sessions').update({
                status: 'completed',
                updated_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            }).eq('id', sessionId)

            localStorage.removeItem(LOCAL_KEY)
            router.push(`/dashboard/routines/${routineId}`)
        }
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
                        {syncStatus === 'synced' ? <><Check className="w-3 h-3 text-green-300" /><span className="text-indigo-100">Sicronizado</span></> :
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
                                        step="0.01"
                                        inputMode="decimal"
                                        className="w-full text-3xl font-extrabold text-gray-900 p-4 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-center bg-gray-50"
                                        placeholder=" "
                                        value={val}
                                        onChange={(e) => handleChange(item.id, e.target.value)}
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

        </div>
    )
}
