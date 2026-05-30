'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Check, ShieldAlert, CloudOff, AlertTriangle, RefreshCw } from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'
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
    const [initFailed, setInitFailed] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [items, setItems] = useState<Item[]>([])
    const [counts, setCounts] = useState<Record<string, string>>({})
    const [groupName, setGroupName] = useState('')
    const [blocked, setBlocked] = useState<string | null>(null)
    const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced')
    const [isConfirming, setIsConfirming] = useState(false)

    // Keep refs so closures always see current values without stale captures
    const sessionIdRef = useRef<string | null>(null)
    // localKeyRef.current includes userId to prevent cross-user contamination on shared devices
    const localKeyRef = useRef<string>('')

    useEffect(() => {
        initSession()
    }, [])

    const initSession = async () => {
        setLoadingInit(true)
        setInitFailed(false)

        try {
            const { data: { user }, error: authErr } = await supabase.auth.getUser()
            if (authErr || !user) {
                console.error('[CountPage] Auth error:', authErr)
                router.push('/login')
                return
            }

            localKeyRef.current = `count_${user.id}_${routineId}_${groupId}`

            const { data: group, error: groupErr } = await supabase
                .from('groups').select('name').eq('id', groupId).single()
            if (groupErr) console.error('[CountPage] Group fetch error:', groupErr)
            if (group) setGroupName(group.name)

            // FIX: search for ANY non-completed session (no date filter) to prevent
            // unique constraint conflict when an old in_progress session exists.
            const { data: existingSession, error: sessionErr } = await supabase
                .from('count_sessions')
                .select('id, status, user_id, users(name)')
                .eq('routine_id', routineId)
                .eq('group_id', groupId)
                .neq('status', 'completed')
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (sessionErr) console.error('[CountPage] Session query error:', sessionErr)

            let currentSessionId: string | null = existingSession?.id ?? null

            if (existingSession) {
                if (existingSession.status === 'in_progress' && existingSession.user_id !== user.id) {
                    const uName = (existingSession.users as any)?.name || 'Outro usuário'
                    setBlocked(`Este grupo está em andamento por ${uName}. Contagem paralela no mesmo grupo não é permitida.`)
                    setLoadingInit(false)
                    return
                }
            } else {
                // No active session found — create one
                const { data: exec } = await supabase
                    .from('routine_executions')
                    .select('id')
                    .eq('routine_id', routineId)
                    .eq('status', 'in_progress')
                    .maybeSingle()

                const { data: newSession, error: insertErr } = await supabase
                    .from('count_sessions')
                    .insert([{
                        routine_id: routineId,
                        group_id: groupId,
                        user_id: user.id,
                        status: 'in_progress',
                        started_at: new Date().toISOString(),
                        execution_id: exec?.id || null
                    }])
                    .select('id')
                    .single()

                if (insertErr) {
                    console.error('[CountPage] Session insert error (possible constraint conflict):', insertErr)
                    // Constraint conflict: an in_progress session for this group already exists.
                    // Recover by fetching it directly without filters.
                    const { data: conflictSession, error: conflictErr } = await supabase
                        .from('count_sessions')
                        .select('id, status, user_id')
                        .eq('routine_id', routineId)
                        .eq('group_id', groupId)
                        .neq('status', 'completed')
                        .order('started_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()

                    if (conflictErr) console.error('[CountPage] Conflict session recovery error:', conflictErr)

                    if (conflictSession) {
                        console.error('[CountPage] Recovered existing session after conflict:', conflictSession.id)
                        currentSessionId = conflictSession.id
                    } else {
                        console.error('[CountPage] Could not recover session after constraint conflict.')
                        setInitFailed(true)
                        setLoadingInit(false)
                        return
                    }
                } else if (newSession) {
                    currentSessionId = newSession.id
                }
            }

            sessionIdRef.current = currentSessionId
            setSessionId(currentSessionId)

            const { data: itemsData, error: itemsErr } = await supabase
                .from('items')
                .select('id, name, unit, unit_observation')
                .eq('group_id', groupId)
                .eq('active', true)
                .order('name', { ascending: true })
            if (itemsErr) console.error('[CountPage] Items fetch error:', itemsErr)
            if (itemsData) setItems(itemsData)

            // Load previous answers: start with localStorage, then overlay DB values (DB wins)
            const stored = localStorage.getItem(localKeyRef.current)
            const localDict: Record<string, string> = stored ? JSON.parse(stored) : {}

            if (currentSessionId) {
                const { data: dbItems, error: dbItemsErr } = await supabase
                    .from('count_session_items')
                    .select('item_id, counted_quantity')
                    .eq('session_id', currentSessionId)
                if (dbItemsErr) console.error('[CountPage] DB items fetch error:', dbItemsErr)

                const newCounts = { ...localDict }
                if (dbItems) {
                    dbItems.forEach(d => {
                        if (d.counted_quantity !== null && d.counted_quantity !== undefined) {
                            newCounts[d.item_id] = d.counted_quantity.toString()
                        }
                    })
                }
                setCounts(newCounts)

                // FIX: Auto-recover unsynced localStorage data. If localStorage had
                // items but DB had fewer (sync previously failed), trigger an immediate sync.
                const localItemCount = Object.keys(localDict).length
                const dbItemCount = dbItems?.length ?? 0
                if (localItemCount > 0 && dbItemCount < localItemCount) {
                    console.error('[CountPage] localStorage has unsynced data — auto-recovering:', { localItemCount, dbItemCount })
                    toast('Recuperando dados salvos localmente...', { icon: '💾', id: 'recovery' })
                    // Trigger sync after state settles
                    setTimeout(() => debouncedSyncDirect(newCounts, currentSessionId!), 500)
                }
            }
        } catch (err) {
            console.error('[CountPage] Unexpected initSession error:', err)
            setInitFailed(true)
        } finally {
            setLoadingInit(false)
        }
    }

    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Direct sync (no debounce) — used for recovery on init
    const debouncedSyncDirect = async (currentCounts: Record<string, string>, sid: string) => {
        setSyncStatus('saving')
        await persistCounts(currentCounts, sid)
    }

    const debouncedSync = useCallback((currentCounts: Record<string, string>) => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
        setSyncStatus('saving')

        if (!navigator.onLine) {
            setSyncStatus('offline')
            return
        }

        syncTimeoutRef.current = setTimeout(async () => {
            const sid = sessionIdRef.current
            if (!sid) {
                // FIX: sessionId is null — data cannot be saved remotely; warn user.
                console.error('[CountPage] debouncedSync called but sessionId is null. Data remains local only.')
                setSyncStatus('offline')
                toast.error('Sessão não iniciada. Dados salvos apenas localmente. Recarregue a página.', { id: 'no-session' })
                return
            }
            await persistCounts(currentCounts, sid)
        }, 2000)
    }, [])

    // Core persistence: delete old rows then insert new ones. Isolated so both
    // debouncedSync and executeCompleteGroup share the same logic.
    const persistCounts = async (currentCounts: Record<string, string>, sid: string): Promise<boolean> => {
        const upserts = Object.keys(currentCounts).map(itemId => ({
            session_id: sid,
            item_id: itemId,
            counted_quantity: currentCounts[itemId] === '' ? null : parseFloat(currentCounts[itemId].replace(',', '.'))
        }))

        const { error: delErr } = await supabase
            .from('count_session_items')
            .delete()
            .eq('session_id', sid)

        if (delErr) {
            console.error('[CountPage] persistCounts delete error:', delErr)
            setSyncStatus('offline')
            toast.error('Falha de comunicação: salvamento aguardará recarga.', { id: 'sync-err' })
            return false
        }

        if (upserts.length > 0) {
            const { error: insErr } = await supabase
                .from('count_session_items')
                .insert(upserts)

            if (insErr) {
                console.error('[CountPage] persistCounts insert error:', insErr)
                setSyncStatus('offline')
                toast.error('Erro ao registrar dados na nuvem. Tente novamente.', { id: 'sync-err' })
                return false
            }
        }

        const { error: updErr } = await supabase
            .from('count_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sid)

        if (updErr) {
            console.error('[CountPage] persistCounts session update error:', updErr)
            setSyncStatus('offline')
            return false
        }

        setSyncStatus('synced')
        toast.success('Progresso salvo!', { icon: '☁️', id: 'sync-success' })
        return true
    }

    const handleChange = (itemId: string, val: string) => {
        const newCounts = { ...counts, [itemId]: val }
        setCounts(newCounts)
        localStorage.setItem(localKeyRef.current, JSON.stringify(newCounts))
        debouncedSync(newCounts)
    }

    const handleManualSave = () => {
        if (!navigator.onLine) {
            toast.success('Progresso salvo localmente. Será enviado quando houver rede.', { icon: '💾' })
            return
        }
        debouncedSync(counts)
    }

    const handleCompleteGroup = async () => {
        if (syncStatus === 'saving') {
            toast.error('Aguarde o salvamento online terminar.')
            return
        }

        const uncounted = items.filter(i => counts[i.id] === undefined || counts[i.id] === '')
        if (uncounted.length > 0) {
            toast.error(`Ainda há ${uncounted.length} itens não contados. Vazio ≠ Zero.`)
            return
        }

        if (!navigator.onLine) {
            toast.error('Dispositivo offline. Conecte-se para concluir este grupo.')
            return
        }

        setIsConfirming(true)
    }

    const executeCompleteGroup = async () => {
        setIsConfirming(false)

        const sid = sessionIdRef.current
        if (!sid) {
            console.error('[CountPage] executeCompleteGroup: sessionId is null, aborting.')
            toast.error('Sessão inválida. Recarregue a página e tente novamente.')
            return
        }

        setSyncStatus('saving')

        const finalPayload = items.map(i => ({
            session_id: sid,
            item_id: i.id,
            counted_quantity: parseFloat(counts[i.id].replace(',', '.'))
        }))

        const { error: delErr } = await supabase
            .from('count_session_items')
            .delete()
            .eq('session_id', sid)

        if (delErr) {
            console.error('[CountPage] executeCompleteGroup delete error:', delErr)
            setSyncStatus('offline')
            toast.error('Erro ao preparar conclusão. Verifique conexão e tente novamente.')
            return
        }

        const { data: insertedItems, error: insErr } = await supabase
            .from('count_session_items')
            .insert(finalPayload)
            .select('id')

        if (insErr) {
            console.error('[CountPage] executeCompleteGroup insert error:', insErr)
            setSyncStatus('offline')
            toast.error('Erro ao salvar itens finais. Dados seguros localmente. Tente novamente.')
            return
        }

        // FIX: verify all items were persisted before marking session completed
        if (!insertedItems || insertedItems.length !== finalPayload.length) {
            console.error('[CountPage] executeCompleteGroup item count mismatch:', {
                expected: finalPayload.length,
                inserted: insertedItems?.length ?? 0
            })
            toast.error('Contagem incompleta detectada. Tente novamente.')
            return
        }

        const { error: updErr } = await supabase
            .from('count_sessions')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString(),
                completed_at: new Date().toISOString()
            })
            .eq('id', sid)

        if (updErr) {
            console.error('[CountPage] executeCompleteGroup status update error:', updErr)
            toast.error('Erro ao marcar como concluído. Verifique a rede.')
            return
        }

        localStorage.removeItem(localKeyRef.current)
        router.push(`/dashboard/routines/${routineId}`)
    }

    if (loadingInit) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
    )

    if (initFailed) return (
        <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
            <AlertTriangle className="w-16 h-16 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900">Falha ao Iniciar Sessão</h2>
            <p className="text-gray-600 font-medium">Não foi possível criar ou recuperar a sessão de contagem. Verifique sua conexão.</p>
            <button onClick={initSession} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Tentar Novamente
            </button>
            <button onClick={() => router.push(`/dashboard/routines/${routineId}`)} className="text-gray-500 text-sm underline">
                Voltar para Locais
            </button>
        </div>
    )

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
                        {syncStatus === 'synced'
                            ? <><Check className="w-3 h-3 text-green-300" /><span className="text-indigo-100">Sincronizado</span></>
                            : syncStatus === 'saving'
                                ? <><Loader2 className="w-3 h-3 text-white animate-spin" /><span className="text-indigo-100">Salvando...</span></>
                                : <><CloudOff className="w-3 h-3 text-red-300" /><span className="text-red-100">Modo Offline (Local)</span></>
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
                <button
                    onClick={handleCompleteGroup}
                    disabled={isConfirming || syncStatus === 'saving'}
                    className={`flex-1 py-4 rounded-2xl font-bold flex justify-center items-center text-lg transition shadow-sm ${isConfirming || syncStatus === 'saving' ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'} ${itemsPendentes === 0 ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-gray-200 text-gray-400'}`}
                >
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
