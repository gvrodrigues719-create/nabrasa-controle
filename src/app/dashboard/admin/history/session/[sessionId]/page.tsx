'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, ArrowLeft, Calendar, User, LayoutGrid, CheckCircle2, ShoppingCart, AlertCircle, UserCheck } from 'lucide-react'
import Link from 'next/link'
import PurchaseSuggestionDrawer from './PurchaseSuggestionDrawer'
import CountValidationDrawer from './CountValidationDrawer'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SessionDetailPage() {
    const { sessionId } = useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState<any>(null)
    const [items, setItems] = useState<any[]>([])
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isValidationOpen, setIsValidationOpen] = useState(false)

    useEffect(() => {
        loadData()
    }, [sessionId])

    async function loadData() {
        setLoading(true)
        try {
            const { data: sessionData } = await supabase
                .from('count_sessions')
                .select(`
                    *,
                    users!user_id(name),
                    routines!routine_id(name),
                    groups!group_id(name)
                `)
                .eq('id', sessionId)
                .single()

            const { data: itemsData } = await supabase
                .from('count_session_items')
                .select(`
                    *,
                    items!item_id(name, unit)
                `)
                .eq('session_id', sessionId)

            setSession(sessionData)
            setItems(itemsData || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        )
    }

    if (!session) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-xl font-bold text-gray-900">Contagem não encontrada</h1>
                <Link href="/dashboard/admin/history" className="mt-4 text-indigo-600 font-bold uppercase text-xs tracking-widest">Voltar ao Histórico</Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ArrowLeft className="w-6 h-6 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight uppercase">{session.routines?.name}</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{session.groups?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsValidationOpen(true)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-lg ${
                            session.validation_status === 'validated' || session.validation_status === 'corrected'
                            ? 'bg-green-50 text-green-600 border border-green-100 hover:bg-green-100'
                            : 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        <UserCheck className="w-4 h-4" />
                        {session.validation_status === 'validated' ? 'Validada' : session.validation_status === 'corrected' ? 'Corrigida' : 'Validar / Corrigir'}
                    </button>
                    <button 
                        onClick={() => setIsDrawerOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Sugestão de Compras
                    </button>
                </div>
            </div>

            {/* Session Info Cards */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data Conclusão</p>
                        <p className="text-sm font-black text-gray-900">
                            {new Date(session.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <User className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operador</p>
                        <p className="text-sm font-black text-gray-900">{session.users?.name}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                        <LayoutGrid className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Itens</p>
                        <p className="text-sm font-black text-gray-900">{items.length} itens contados</p>
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="px-6 pb-20">
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="text-sm font-black text-gray-900 tracking-tight uppercase">Itens Registrados</h2>
                        {session.validation_status === 'corrected' && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                <AlertCircle className="w-3 h-3" />
                                Contém Correções Gerenciais
                            </span>
                        )}
                    </div>
                    <div className="divide-y divide-gray-50">
                        {items.map((item) => (
                            <div key={item.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-gray-900">{item.items?.name}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {item.item_id.substring(0, 8)}</p>
                                        {item.validated_quantity !== null && (
                                            <span className="text-[9px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">Validado</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {item.validated_quantity !== null ? (
                                        <div className="flex flex-col items-end">
                                            {item.validated_is_zeroed ? (
                                                <span className="text-sm font-black text-red-500 uppercase tracking-widest">Zerado</span>
                                            ) : (
                                                <p className="text-lg font-black text-indigo-600">
                                                    {item.validated_quantity} <span className="text-[10px] text-indigo-400 font-bold uppercase ml-0.5">{item.items?.unit}</span>
                                                </p>
                                            )}
                                            <p className="text-[10px] font-bold text-gray-300 line-through uppercase">
                                                Original: {item.is_zeroed ? 'Zerado' : `${item.counted_quantity} ${item.items?.unit}`}
                                            </p>
                                        </div>
                                    ) : item.is_zeroed ? (
                                        <span className="text-sm font-black text-red-500 uppercase tracking-widest">Zerado</span>
                                    ) : (
                                        <p className="text-lg font-black text-gray-900">
                                            {item.counted_quantity} <span className="text-[10px] text-gray-400 font-bold uppercase ml-0.5">{item.items?.unit}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <PurchaseSuggestionDrawer 
                sessionId={sessionId as string}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />

            <CountValidationDrawer 
                sessionId={sessionId as string}
                items={items}
                isOpen={isValidationOpen}
                onClose={() => setIsValidationOpen(false)}
                onSuccess={loadData}
            />
        </div>
    )
}
