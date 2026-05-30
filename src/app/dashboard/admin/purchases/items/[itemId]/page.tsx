'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertTriangle, Trash2 } from 'lucide-react'
import { getPurchaseItemByIdAction, updatePurchaseItemAction } from '@/modules/purchases/actions'
import type { PurchaseItem } from '@/modules/purchases/types'
import { ITEM_CATEGORIES, getDefaultUnit, needsReview } from '@/modules/purchases/types'
import toast from 'react-hot-toast'

export default function EditPurchaseItemPage() {
    const params = useParams()
    const router = useRouter()
    const itemId = params.itemId as string
    const isNew = itemId === 'new'

    const [form, setForm] = useState<Partial<PurchaseItem>>({
        name: '',
        category: 'Proteínas',
        order_unit: 'un',
        count_unit: 'un',
        allows_decimal: false,
        min_stock: null,
        max_stock: null,
        origin: 'cozinha_central',
        is_active: true,
        pending_review: false,
    })
    const [loading, setLoading] = useState(!isNew)
    const [saving, setSaving] = useState(false)

    const reviewNeeded = needsReview(form.min_stock ?? null, form.max_stock ?? null)

    const fetchItem = useCallback(async () => {
        if (isNew) return
        setLoading(true)
        const res = await getPurchaseItemByIdAction(itemId)
        if (res.success && res.data) {
            setForm(res.data)
        } else {
            toast.error('Item não encontrado')
            router.push('/dashboard/admin/purchases/items')
        }
        setLoading(false)
    }, [isNew, itemId, router])

    useEffect(() => { fetchItem() }, [fetchItem])

    // Auto-apply unit rules when category changes
    function handleCategoryChange(cat: string) {
        const defaults = getDefaultUnit(cat)
        setForm(prev => ({
            ...prev,
            category: cat,
            order_unit: defaults.order_unit,
            count_unit: defaults.order_unit,
            allows_decimal: defaults.allows_decimal,
        }))
    }

    function update<K extends keyof PurchaseItem>(field: K, value: PurchaseItem[K]) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    async function handleSave() {
        if (!form.name?.trim()) {
            toast.error('Nome é obrigatório')
            return
        }

        setSaving(true)
        const payload = {
            ...form,
            pending_review: reviewNeeded,
        } as Omit<PurchaseItem, 'id' | 'created_at' | 'updated_at'>

        let res
        if (isNew) {
            // For new items, we'd call createPurchaseItemAction — import it
            const { createPurchaseItemAction } = await import('@/modules/purchases/actions')
            res = await createPurchaseItemAction(payload)
        } else {
            res = await updatePurchaseItemAction(itemId, payload)
        }

        if (res.success) {
            toast.success(isNew ? 'Item criado!' : 'Item atualizado!')
            router.push('/dashboard/admin/purchases/items')
        } else {
            toast.error(res.error ?? 'Erro ao salvar')
        }
        setSaving(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
                <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h1 className="text-sm font-black text-gray-900">{isNew ? 'Novo Item' : 'Editar Item'}</h1>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60"
                    >
                        {saving ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )}
                        Salvar
                    </button>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-5 space-y-4 pb-24">

                {/* Review warning */}
                {reviewNeeded && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">
                            <strong>Pendente de revisão:</strong> Configure mínimo e máximo válidos (mín ≤ máx).
                        </p>
                    </div>
                )}

                {/* Name */}
                <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Nome *</label>
                    <input
                        type="text"
                        value={form.name ?? ''}
                        onChange={e => update('name', e.target.value)}
                        placeholder="Ex: Frango Grelhado"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 shadow-sm"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Categoria *</label>
                    <select
                        value={form.category ?? ''}
                        onChange={e => handleCategoryChange(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 shadow-sm"
                    >
                        {ITEM_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    {form.category === 'Funcionário' && (
                        <p className="text-[10px] text-indigo-600 font-bold mt-1.5 ml-1">
                            → Unidade automática: kg · permite decimal
                        </p>
                    )}
                </div>

                {/* Units */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                            Unidade de Pedido
                        </label>
                        <input
                            type="text"
                            value={form.order_unit ?? ''}
                            onChange={e => update('order_unit', e.target.value)}
                            placeholder="un, kg, cx..."
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                            Unidade de Contagem
                        </label>
                        <input
                            type="text"
                            value={form.count_unit ?? ''}
                            onChange={e => update('count_unit', e.target.value)}
                            placeholder="un, kg..."
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 shadow-sm"
                        />
                    </div>
                </div>

                {/* Allows decimal */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Permite Decimal</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Ex: 1,5 kg, 2,5 un</p>
                    </div>
                    <button
                        onClick={() => update('allows_decimal', !form.allows_decimal)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${form.allows_decimal ? 'bg-indigo-500' : 'bg-gray-200'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.allows_decimal ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                {/* Min/Max stock */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                            Estoque Mínimo
                        </label>
                        <input
                            type="number"
                            value={form.min_stock ?? ''}
                            onChange={e => update('min_stock', e.target.value === '' ? null : parseFloat(e.target.value))}
                            placeholder="—"
                            min={0}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                            Estoque Máximo
                        </label>
                        <input
                            type="number"
                            value={form.max_stock ?? ''}
                            onChange={e => update('max_stock', e.target.value === '' ? null : parseFloat(e.target.value))}
                            placeholder="—"
                            min={0}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 shadow-sm"
                        />
                    </div>
                </div>

                {/* Origin */}
                <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Origem</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(['cozinha_central', 'fornecedor_externo'] as const).map(origin => (
                            <button
                                key={origin}
                                onClick={() => update('origin', origin)}
                                className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${form.origin === origin
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                            >
                                {origin === 'cozinha_central' ? 'Cozinha Central' : 'Fornecedor Externo'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Item Ativo</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Gerentes podem adicionar ao pedido</p>
                    </div>
                    <button
                        onClick={() => update('is_active', !form.is_active)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
            </div>
        </div>
    )
}
