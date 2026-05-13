
'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Loader2, ArrowLeft, CheckCircle2, AlertTriangle, 
    Save, History, Edit3, X, Check, Package, Calculator, Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { 
    getKitchenSessionDetailAction, 
    validateKitchenSessionAction,
    deleteKitchenSessionAction 
} from '@/app/actions/kitchenValidationAction'

export default function KitchenSessionDetailPage({ params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = use(params)
    const router = useRouter()
    
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [session, setSession] = useState<any>(null)
    const [items, setItems] = useState<any[]>([])
    const [corrections, setCorrections] = useState<Record<string, number>>({})
    const [isEditing, setIsEditing] = useState(false)
    const [reason, setReason] = useState('')

    useEffect(() => {
        loadDetail()
    }, [sessionId])

    const loadDetail = async () => {
        setLoading(true)
        const res = await getKitchenSessionDetailAction(sessionId)
        if (res.success) {
            setSession(res.session)
            const sessionItems = res.items || []
            setItems(sessionItems)
            
            // Initialize corrections with current validated or counted values
            const initialCorrections: Record<string, number> = {}
            sessionItems.forEach((item: any) => {
                initialCorrections[item.item_id] = item.validated_quantity ?? item.counted_quantity
            });
            setCorrections(initialCorrections)
        } else {
            toast.error(res.error || 'Erro ao carregar detalhes')
        }
        setLoading(false)
    }

    const handleSave = async () => {
        if (!reason && Object.keys(corrections).length > 0) {
            toast.error('Informe o motivo da correção/validação')
            return
        }

        setSaving(true)
        const itemsCorrections = items.map(item => ({
            itemId: item.item_id,
            quantity: corrections[item.item_id],
            isZeroed: corrections[item.item_id] === 0
        }))

        const res = await validateKitchenSessionAction(sessionId, itemsCorrections, reason)
        if (res.success) {
            toast.success('Contagem validada com sucesso!')
            setIsEditing(false)
            loadDetail()
        } else {
            toast.error(res.error || 'Erro ao salvar validação')
        }
        setSaving(false)
    }
    
    const handleDelete = async () => {
        if (!window.confirm('Tem certeza que deseja EXCLUIR esta contagem? Esta ação não pode ser desfeita.')) {
            return
        }

        setSaving(true)
        const res = await deleteKitchenSessionAction(sessionId)
        if (res.success) {
            toast.success('Contagem excluída com sucesso!')
            router.push('/dashboard/kitchen/history')
        } else {
            toast.error(res.error || 'Erro ao excluir contagem')
        }
        setSaving(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Carregando detalhes...</p>
            </div>
        )
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="font-black text-gray-900 uppercase">Sessão não encontrada</h3>
                <button onClick={() => router.back()} className="mt-4 text-orange-600 font-bold text-sm uppercase">Voltar</button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8F7F4] flex flex-col pb-32">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 h-16 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-50 rounded-xl transition">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-sm font-black text-gray-900 tracking-tight uppercase truncate max-w-[180px]">
                            {session.groups?.name?.replace('CK — ', '')}
                        </h1>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {new Date(session.completed_at || session.started_at).toLocaleDateString('pt-BR')} às {new Date(session.completed_at || session.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                
                {!isEditing && (
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleDelete}
                            disabled={saving}
                            className="p-2 text-gray-400 hover:text-red-500 transition"
                            title="Excluir contagem"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-100 transition"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            Corrigir
                        </button>
                    </div>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Info Card */}
                <div className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                            <History className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Responsável</p>
                            <p className="text-sm font-black text-gray-900 uppercase">{session.users?.name || 'Desconhecido'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-2xl">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${session.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
                                    {session.status === 'completed' ? 'Finalizada' : 'Em Aberto'}
                                </span>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-2xl">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Auditoria</p>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                session.validation_status === 'validated' ? 'text-emerald-600' :
                                session.validation_status === 'corrected' ? 'text-amber-600' :
                                'text-gray-400'
                            }`}>
                                {session.validation_status === 'validated' ? 'Validada' : session.validation_status === 'corrected' ? 'Corrigida' : 'Pendente'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Motivo da Correção (se estiver editando) */}
                {isEditing && (
                    <div className="bg-orange-50 p-5 rounded-[32px] border border-orange-100 shadow-sm">
                        <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-2 block">Motivo da Correção / Validação</label>
                        <textarea 
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Ex: Erro de digitação na contagem de espetos..."
                            className="w-full bg-white border border-orange-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 min-h-[80px]"
                        />
                    </div>
                )}

                {/* Items List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Itens Contados ({items.length})</h2>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Qtd</span>
                    </div>

                    {items.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                                    <Package className="w-5 h-5 text-gray-300" />
                                </div>
                                <div>
                                    <h3 className="text-[11px] font-black text-gray-900 leading-tight uppercase">{item.items?.name}</h3>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">{item.items?.unit}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {isEditing ? (
                                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                        <button 
                                            onClick={() => setCorrections(prev => ({ ...prev, [item.item_id]: Math.max(0, (prev[item.item_id] || 0) - 1) }))}
                                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-orange-600 transition"
                                        >
                                            -
                                        </button>
                                        <input 
                                            type="number" 
                                            value={corrections[item.item_id] ?? ''}
                                            onChange={e => setCorrections(prev => ({ ...prev, [item.item_id]: Number(e.target.value) }))}
                                            className="w-12 text-center bg-transparent text-sm font-black text-gray-900 outline-none"
                                        />
                                        <button 
                                            onClick={() => setCorrections(prev => ({ ...prev, [item.item_id]: (prev[item.item_id] || 0) + 1 }))}
                                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-orange-600 transition"
                                        >
                                            +
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-end">
                                        <span className={`text-base font-black ${
                                            item.is_zeroed ? 'text-red-600' :
                                            (item.validated_quantity !== null && item.validated_quantity !== item.counted_quantity ? 'text-amber-600' : 'text-gray-900')
                                        }`}>
                                            {item.is_zeroed ? 'ZERADO' : (item.validated_quantity ?? item.counted_quantity)}
                                        </span>
                                        {item.validated_quantity !== null && item.validated_quantity !== item.counted_quantity && (
                                            <span className="text-[8px] font-bold text-gray-400 line-through">Era: {item.counted_quantity}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Actions */}
            {isEditing && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex gap-3 z-50">
                    <button 
                        onClick={() => {
                            setIsEditing(false)
                            setReason('')
                        }}
                        className="flex-1 h-14 bg-gray-100 text-gray-500 rounded-[20px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-[2] h-14 bg-orange-600 text-white rounded-[20px] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Correção
                    </button>
                </div>
            )}
        </div>
    )
}
