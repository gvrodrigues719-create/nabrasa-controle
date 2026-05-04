'use client'

import { useState } from 'react'
import { X, Check, AlertTriangle, Loader2, Save, Info, RotateCcw, UserCheck } from 'lucide-react'
import { validateCountItemAction, validateEntireCountSessionAction } from '@/app/actions/countValidationAction'
import toast from 'react-hot-toast'

interface Props {
    sessionId: string
    items: any[]
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function CountValidationDrawer({ sessionId, items, isOpen, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [editingItem, setEditingItem] = useState<any | null>(null)
    const [form, setForm] = useState({
        quantity: 0,
        isZeroed: false,
        reason: '',
        notes: ''
    })

    const handleStartEdit = (item: any) => {
        setEditingItem(item)
        setForm({
            quantity: item.validated_quantity !== null ? item.validated_quantity : (item.counted_quantity || 0),
            isZeroed: item.validated_is_zeroed !== null ? item.validated_is_zeroed : (item.is_zeroed || false),
            reason: item.validation_reason || '',
            notes: item.validation_notes || ''
        })
    }

    const handleSaveItem = async () => {
        if (!editingItem) return
        if (!form.reason) {
            toast.error('O motivo da correção é obrigatório')
            return
        }

        setLoading(true)
        try {
            const res = await validateCountItemAction({
                sessionId,
                itemId: editingItem.item_id,
                newQuantity: form.isZeroed ? 0 : form.quantity,
                isZeroed: form.isZeroed,
                reason: form.reason,
                notes: form.notes
            })

            if (res.success) {
                toast.success('Item validado com sucesso')
                setEditingItem(null)
                onSuccess()
            } else {
                toast.error(res.error || 'Erro ao validar item')
            }
        } catch (e) {
            toast.error('Erro de conexão')
        } finally {
            setLoading(false)
        }
    }

    const handleValidateAll = async () => {
        if (!confirm('Deseja marcar esta contagem como Validada?')) return
        
        setLoading(true)
        try {
            const res = await validateEntireCountSessionAction(sessionId)
            if (res.success) {
                toast.success('Contagem validada com sucesso')
                onClose()
                onSuccess()
            } else {
                toast.error(res.error || 'Erro ao validar contagem')
            }
        } catch (e) {
            toast.error('Erro de conexão')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Revisão de Auditoria</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Validar ou corrigir quantidades contadas</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Info Alert */}
                <div className="p-6 bg-indigo-50 border-b border-indigo-100 flex gap-3">
                    <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                    <p className="text-[11px] font-bold text-indigo-700 leading-relaxed uppercase">
                        Correções não apagam a contagem original. O sistema mantém auditoria completa de quem alterou e por que alterou.
                    </p>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {items.map(item => (
                        <div key={item.item_id} className={`bg-white border rounded-[28px] p-4 transition-all ${
                            editingItem?.item_id === item.item_id ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-100 hover:border-gray-200'
                        }`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 tracking-tight">{item.items?.name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex flex-col">
                                            <span className="text-[7px] font-black text-gray-400 uppercase">Original</span>
                                            <span className="text-xs font-bold text-gray-600">{item.is_zeroed ? 'ZERADO' : `${item.counted_quantity} ${item.items?.unit}`}</span>
                                        </div>
                                        {item.validated_quantity !== null && (
                                            <div className="flex flex-col border-l border-gray-100 pl-3">
                                                <span className="text-[7px] font-black text-indigo-400 uppercase">Validado</span>
                                                <span className="text-xs font-black text-indigo-600">{item.validated_is_zeroed ? 'ZERADO' : `${item.validated_quantity} ${item.items?.unit}`}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleStartEdit(item)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${
                                        item.validated_quantity !== null 
                                        ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                                    }`}
                                >
                                    {item.validated_quantity !== null ? 'Revisar' : 'Corrigir'}
                                </button>
                            </div>

                            {/* Edit Form (Inline) */}
                            {editingItem?.item_id === item.item_id && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Nova Quantidade</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number"
                                                    value={form.quantity}
                                                    onChange={e => setForm({ ...form, quantity: Number(e.target.value), isZeroed: false })}
                                                    disabled={form.isZeroed}
                                                    className="w-full h-10 px-4 bg-white border border-gray-200 rounded-xl font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                                />
                                                <button 
                                                    onClick={() => setForm({ ...form, isZeroed: !form.isZeroed })}
                                                    className={`h-10 px-3 rounded-xl border font-black text-[9px] uppercase transition ${
                                                        form.isZeroed ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-red-400'
                                                    }`}
                                                >
                                                    Zerar
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Motivo (Obrigatório)</label>
                                            <select 
                                                value={form.reason}
                                                onChange={e => setForm({ ...form, reason: e.target.value })}
                                                className="w-full h-10 px-4 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="">Selecione um motivo...</option>
                                                <option value="Erro de digitação">Erro de digitação</option>
                                                <option value="Item não localizado">Item não localizado</option>
                                                <option value="Divergência física">Divergência física</option>
                                                <option value="Outro">Outro (especificar nas notas)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Observações Opcionais</label>
                                        <textarea 
                                            value={form.notes}
                                            onChange={e => setForm({ ...form, notes: e.target.value })}
                                            className="w-full p-4 bg-white border border-gray-200 rounded-xl font-medium text-xs text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                                            placeholder="Detalhes sobre a correção..."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleSaveItem}
                                            disabled={loading}
                                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Salvar Correção
                                        </button>
                                        <button 
                                            onClick={() => setEditingItem(null)}
                                            className="px-6 py-3 bg-white border border-gray-200 text-gray-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Validated Badge */}
                            {item.validated_quantity !== null && editingItem?.item_id !== item.item_id && (
                                <div className="mt-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                                        Corrigido: <span className="text-gray-600">{item.validation_reason}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-white shadow-2xl">
                    <button 
                        onClick={handleValidateAll}
                        disabled={loading}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                        Validar Toda Contagem
                    </button>
                </div>
            </div>
        </div>
    )
}
