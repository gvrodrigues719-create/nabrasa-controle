'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, MapPin, User, Clock, CheckCircle2, AlertCircle, Package, Hash } from 'lucide-react'

type SessionItem = {
    item_id: string
    counted_quantity: number | null
    is_zeroed: boolean
    item_name?: string
    item_unit?: string
}

type Session = {
    id: string
    status: string
    started_at: string
    completed_at: string | null
    user_id: string
    group_id: string
    group_name?: string
    user_name?: string
}

export default function SessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const router = useRouter()
    const { sessionId } = use(params)
    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState<Session | null>(null)
    const [items, setItems] = useState<SessionItem[]>([])
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        setErrorMsg(null)
        
        try {
            // 1. Dados da Sessão (Puro)
            const { data: sData, error: sErr } = await supabase
                .from('count_sessions')
                .select('id, status, started_at, completed_at, group_id, user_id')
                .eq('id', sessionId)
                .single()
            
            if (sErr) throw sErr
            if (!sData) throw new Error('Sessão não encontrada')

            const rawSession = sData as Session

            // 2. Resolve nomes (Puro)
            const { data: gData } = await supabase.from('groups').select('name').eq('id', rawSession.group_id).single()
            const { data: uData } = await supabase.from('users').select('name').eq('id', rawSession.user_id).single()

            setSession({
                ...rawSession,
                group_name: gData?.name || 'Local desconhecido',
                user_name: uData?.name || 'Operador desconhecido'
            })

            // 3. Itens Contados (Puro)
            const { data: iData, error: iErr } = await supabase
                .from('count_session_items')
                .select('item_id, counted_quantity, is_zeroed')
                .eq('session_id', sessionId)
            
            if (iErr) throw iErr

            const rawItems = iData as SessionItem[]

            // 4. Resolve nomes dos itens
            const itemIds = rawItems.map(ri => ri.item_id)
            const { data: itemsRef } = await supabase.from('items').select('id, name, unit').in('id', itemIds)
            const itemMap = Object.fromEntries((itemsRef || []).map(ir => [ir.id, { name: ir.name, unit: ir.unit }]))

            const enrichedItems = rawItems.map(ri => ({
                ...ri,
                item_name: itemMap[ri.item_id]?.name || 'Item desconhecido',
                item_unit: itemMap[ri.item_id]?.unit || 'un'
            }))

            setItems(enrichedItems.sort((a, b) => (a.item_name || '').localeCompare(b.item_name || '')))
        } catch (err: any) {
            console.error('[SessionDetail] Erro:', err)
            setErrorMsg(err.message)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (d: string | null) => {
        if (!d) return '—'
        return new Date(d).toLocaleString('pt-BR', { 
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit' 
        })
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /></div>
    
    if (errorMsg || !session) return (
        <div className="p-10 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-gray-900">Erro ao carregar detalhes</h2>
            <p className="text-gray-500">{errorMsg || 'Sessão não encontrada.'}</p>
            <button onClick={() => router.back()} className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest">Voltar</button>
        </div>
    )

    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="p-4 flex items-center space-x-3">
                    <button onClick={() => router.push('/dashboard/admin/history/sessions')} className="p-2 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Detalhes da Contagem</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {session.id.substring(0, 8)}</p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Header Card */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-200 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">{session.group_name}</h3>
                                <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    <User className="w-3.5 h-3.5" />
                                    <span>{session.user_name}</span>
                                </div>
                            </div>
                        </div>
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${
                            session.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {session.status === 'completed' ? 'Finalizada' : 'Em Aberto'}
                        </span>
                    </div>

                    <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início</p>
                            <p className="text-sm font-bold text-gray-700">{formatDate(session.started_at)}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Término</p>
                            <p className="text-sm font-bold text-gray-700">{formatDate(session.completed_at)}</p>
                        </div>
                    </div>
                </div>

                {/* Items List */}
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center space-x-2">
                            <Package className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-black text-gray-800 uppercase tracking-tight">Itens Registrados</span>
                        </div>
                        <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-xs font-black text-gray-500">{items.length} itens</span>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {items.length === 0 ? (
                            <div className="p-10 text-center text-gray-400 text-sm font-medium">Nenhum item registrado nesta sessão ainda.</div>
                        ) : items.map((item, idx) => (
                            <div key={item.item_id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-300">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 leading-tight">{item.item_name}</p>
                                        <p className="text-[10px] font-black text-gray-400 uppercase mt-0.5">{item.item_unit}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {item.is_zeroed ? (
                                        <span className="text-xs font-black text-red-500 uppercase tracking-widest">Zerado</span>
                                    ) : (
                                        <p className="text-lg font-black text-gray-900">
                                            {item.counted_quantity} <span className="text-[10px] text-gray-400 font-bold uppercase ml-0.5">{item.item_unit}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
