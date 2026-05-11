'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
    ArrowLeft, Search, Save, CheckCircle2, ShoppingCart, 
    Calculator, AlertCircle, Info, X, 
    Loader2, ChevronRight
} from 'lucide-react'
import { 
    getProductionPlanningDataAction, 
    approveProductionPlanningAction,
    getCountItemsForLinkingAction,
    linkPurchaseToCountItemAction
} from '@/modules/purchases/production-actions'
import type { ProductionSuggestion, AdjustmentReason } from '@/modules/purchases/types'
import toast from 'react-hot-toast'

const REASONS: AdjustmentReason[] = [
    'estoque físico diferente',
    'produção estratégica',
    'validade próxima',
    'pedido ajustado',
    'falta de insumo',
    'decisão do gestor',
    'outro'
]

export default function ProductionPlanningPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [data, setData] = useState<ProductionSuggestion[]>([])
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedItemForReason, setSelectedItemForReason] = useState<string | null>(null)

    // Vínculo Manual
    const [linkingItem, setLinkingItem] = useState<{ purchaseItemId: string; name: string } | null>(null)
    const [countSearch, setCountSearch] = useState('')
    const [countItems, setCountItems] = useState<any[]>([])
    const [isSearchingCount, setIsSearchingCount] = useState(false)
    const [isSavingLink, setIsSavingLink] = useState(false)

    const categories = useMemo(() => {
        const cats = data.map(s => s.item?.category).filter(Boolean) as string[]
        return Array.from(new Set(cats)).sort()
    }, [data])

    async function fetchData() {
        setLoading(true)
        const res = await getProductionPlanningDataAction()
        if (res.success) {
            setData(res.data || [])
        } else {
            toast.error(res.error || 'Erro ao carregar dados')
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const filteredData = useMemo(() => {
        let result = data
        
        if (selectedCategory) {
            result = result.filter(s => s.item?.category === selectedCategory)
        }

        if (search) {
            const terms = search.toLowerCase().split(' ')
            result = result.filter(s => 
                terms.every(term => s.item?.name.toLowerCase().includes(term))
            )
        }

        return result
    }, [data, search, selectedCategory])

    const handleQtyChange = (itemId: string, val: string) => {
        const num = parseFloat(val) || 0
        setData(prev => prev.map(s => {
            if (s.item_id === itemId) {
                const isAdjusted = Math.abs(num - s.suggested_qty) > 0.001
                return { 
                    ...s, 
                    approved_qty: num,
                    adjustment_reason: isAdjusted ? s.adjustment_reason : null
                }
            }
            return s
        }))
    }

    const handleReasonChange = (itemId: string, reason: AdjustmentReason) => {
        setData(prev => prev.map(s => 
            s.item_id === itemId ? { ...s, adjustment_reason: reason } : s
        ))
        setSelectedItemForReason(null)
    }

    async function handleApprove() {
        const toApprove = data.filter(s => s.planning_category === 'production' && (s.approved_qty || 0) > 0)
        if (toApprove.length === 0) {
            toast.error('Nenhum item com quantidade para produzir')
            return
        }

        const missingReasons = toApprove.filter(s => 
            Math.abs((s.approved_qty || 0) - s.suggested_qty) > 0.001 && !s.adjustment_reason
        )

        if (missingReasons.length > 0) {
            toast.error(`Informe o motivo do ajuste para: ${missingReasons[0].item?.name}`)
            setSelectedItemForReason(missingReasons[0].item_id)
            return
        }

        setSubmitting(true)
        const locId = data[0].source_location_id || '' // Assume a localização do primeiro item
        const res = await approveProductionPlanningAction(locId, toApprove.map(s => ({
            item_id: s.item_id,
            quantity: s.approved_qty || 0,
            suggested_qty: s.suggested_qty,
            reason: s.adjustment_reason || undefined,
            notes: s.adjustment_notes || undefined,
            source_suggestion_id: s.id // Adiciona o ID da sugestão para rastreabilidade
        })))

        if (res.success) {
            toast.success('Ordem de produção gerada com sucesso!')
            router.push('/dashboard/kitchen')
        } else {
            toast.error(res.error || 'Erro ao aprovar produção')
        }
        setSubmitting(false)
    }

    async function searchCountItems(q: string) {
        setCountSearch(q)
        if (q.length < 2) {
            setCountItems([])
            return
        }
        setIsSearchingCount(true)
        const res = await getCountItemsForLinkingAction(q)
        if (res.success) {
            setCountItems(res.data || [])
        }
        setIsSearchingCount(false)
    }

    async function handleLinkItem(countItemId: string) {
        if (!linkingItem) return
        setIsSavingLink(true)
        const res = await linkPurchaseToCountItemAction(linkingItem.purchaseItemId, countItemId)
        if (res.success) {
            toast.success('Item vinculado com sucesso!')
            setLinkingItem(null)
            setCountSearch('')
            setCountItems([])
            fetchData() // to recalculate
        } else {
            toast.error(res.error || 'Erro ao vincular item.')
        }
        setIsSavingLink(false)
    }

    return (
        <div className="min-h-screen bg-[#FDFCFB] pb-32">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-orange-100/50 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-orange-50 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-base font-black text-gray-900 leading-none">Planejamento de Produção</h1>
                            <p className="text-[11px] text-orange-600 mt-1 font-bold uppercase tracking-wider">Cozinha Central</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                
                {/* Search & Actions Bar */}
                <div className="flex flex-col gap-4 bg-white p-4 rounded-[32px] border border-orange-100/50 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Buscar por produto (ex: mig, pic exec)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
                            />
                        </div>
                        
                        <button 
                            onClick={fetchData}
                            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-orange-200 text-orange-700 rounded-2xl text-sm font-bold hover:bg-orange-50 transition-colors shrink-0"
                        >
                            <Calculator className="w-4 h-4" />
                            Recalcular
                        </button>
                    </div>

                    {/* Category Pills */}
                    {categories.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-t border-gray-50 pt-4 mt-1">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    selectedCategory === null 
                                    ? 'bg-orange-600 text-white shadow-md shadow-orange-100' 
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                }`}
                            >
                                Todos
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                        selectedCategory === cat 
                                        ? 'bg-orange-600 text-white shadow-md shadow-orange-100' 
                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
                        <p className="text-sm text-gray-500 font-medium">Calculando sugestões...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[40px] border border-dashed border-gray-200">
                        <h3 className="text-lg font-black text-gray-900 mb-2">Tudo em dia</h3>
                        <p className="text-sm text-gray-400 max-w-[280px]">Não há pedidos pendentes ou o estoque disponível atende a demanda.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Seção de Produção */}
                        {filteredData.filter(s => s.planning_category === 'production').length > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 mb-6">
                                    <h2 className="text-xl font-black text-gray-900">Produção Necessária</h2>
                                    <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                                        {filteredData.filter(s => s.planning_category === 'production').length} itens
                                    </div>
                                </div>
                                {filteredData.filter(s => s.planning_category === 'production').map((s) => {
                                    const isAdjusted = Math.abs((s.approved_qty || 0) - s.suggested_qty) > 0.001
                                    const statusColor = (s.item as any).status_color || 'green'
                                    const missingW = (s.item as any).missing_ingredients || []
                                    
                                    return (
                                        <div key={s.item_id} className="bg-white rounded-[32px] border border-orange-100/30 p-6 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                                <div className="space-y-4 flex-1">
                                                    {/* Status Badge */}
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            statusColor === 'green' ? 'bg-emerald-500' :
                                                            statusColor === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'
                                                        }`} />
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                            statusColor === 'green' ? 'text-emerald-600' :
                                                            statusColor === 'yellow' ? 'text-amber-600' : 'text-rose-600'
                                                        }`}>
                                                            {statusColor === 'green' ? 'Estoque OK' : 
                                                            statusColor === 'yellow' ? 'Produção Necessária' : 'Falta Insumo'}
                                                        </span>
                                                    </div>

                                                    {/* Frase de Experiência */}
                                                    <div className="space-y-1">
                                                        <h3 className="text-lg font-black text-gray-900">{s.item?.name}</h3>
                                                        <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                                            Você pediu <span className="font-black text-gray-900">{s.requested_qty}</span>. 
                                                            Estoque contado: <span className="font-black text-gray-900">{s.ready_stock_qty}</span>. 
                                                            {s.scheduled_qty > 0 && <> Já existem <span className="font-black text-orange-600">{s.scheduled_qty}</span> em produção. </>}
                                                            Sugiro produzir <span className="font-black text-orange-600">{s.suggested_qty}</span>.
                                                        </p>
                                                        {s.last_count_date && (
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                                                                Base: {s.count_group_name || 'Cozinha Central'} • {new Date(s.last_count_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action Area */}
                                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-[24px] border border-gray-100">
                                                    <div className="text-right flex-1 md:flex-none">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Produzir agora</p>
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="number"
                                                                value={s.approved_qty || 0}
                                                                onChange={(e) => handleQtyChange(s.item_id, e.target.value)}
                                                                className={`w-24 text-right px-3 py-2 rounded-xl text-sm font-black border ${
                                                                    isAdjusted ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-white border-gray-200'
                                                                }`}
                                                            />
                                                            <span className="text-xs font-bold text-gray-400">{s.item?.order_unit}</span>
                                                        </div>
                                                        {isAdjusted && (
                                                            <button 
                                                                onClick={() => setSelectedItemForReason(s.item_id)}
                                                                className="mt-2 text-[9px] font-black uppercase text-orange-600 flex items-center gap-1 ml-auto"
                                                            >
                                                                {s.adjustment_reason || 'Informar Motivo'}
                                                                <ChevronRight className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </section>
                        )}

                        {/* Seção de Separação */}
                        {filteredData.filter(s => s.planning_category === 'separation').length > 0 && (
                            <section className="space-y-4 pt-8 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-6">
                                    <h2 className="text-xl font-black text-gray-900">Pedidos para Separar</h2>
                                    <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                                        {filteredData.filter(s => s.planning_category === 'separation').length} itens
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredData.filter(s => s.planning_category === 'separation').map((s) => (
                                        <div key={s.item_id} className="bg-white rounded-[24px] border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
                                            <div className="flex justify-between items-start gap-4 mb-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-sm leading-tight">{s.item?.name}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">{s.item?.category}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs text-gray-400 mb-1 uppercase font-bold">Pedido / Estoque</p>
                                                    <p className="text-sm font-black text-gray-900">
                                                        {s.requested_qty} <span className="text-gray-400">/</span> {s.ready_stock_qty} <span className="text-xs text-gray-400 font-bold">{s.item?.order_unit}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            {s.purchase_order_id && (
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Origem: Pedido Interno</span>
                                                    <button 
                                                        onClick={() => router.push(`/dashboard/purchases/${s.purchase_order_id}`)}
                                                        className="text-[11px] font-black text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                                                    >
                                                        Abrir Pedido <ChevronRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Seção de Revisão */}
                        {filteredData.filter(s => s.planning_category === 'review').length > 0 && (
                            <section className="space-y-4 pt-8 border-t border-red-100">
                                <div className="flex items-center gap-2 mb-6">
                                    <h2 className="text-xl font-black text-red-900">Itens para Revisar</h2>
                                    <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                        {filteredData.filter(s => s.planning_category === 'review').length} itens
                                    </div>
                                </div>
                                <div className="bg-red-50 rounded-[24px] border border-red-100 p-5">
                                    <div className="flex items-start gap-3 mb-4 text-red-800">
                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                        <p className="text-sm font-medium leading-relaxed">
                                            Os itens abaixo foram solicitados pela loja, mas <span className="font-bold">não possuem ficha técnica e nem classificação</span> como "produzido" ou "separado". Verifique o cadastro no módulo de catálogo.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {filteredData.filter(s => s.planning_category === 'review').map((s) => (
                                            <div key={s.item_id} className="bg-white rounded-2xl p-4 border border-red-100 flex flex-col gap-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-bold text-gray-800 truncate pr-2">{s.item?.name}</span>
                                                    <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg shrink-0">{s.item?.category || 'Sem Categoria'}</span>
                                                </div>
                                                {s.review_reason && (
                                                    <p className="text-xs text-red-600 bg-red-50/50 p-2 rounded-lg border border-red-50">{s.review_reason}</p>
                                                )}
                                                {s.planning_category === 'review' && s.review_reason?.includes('ainda não está ligado a um item da contagem') && (
                                                    <button
                                                        onClick={() => setLinkingItem({ purchaseItemId: s.item_id, name: s.item?.name || 'Item' })}
                                                        className="mt-1 w-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold py-2 rounded-lg transition-colors border border-red-200"
                                                    >
                                                        Vincular agora
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>

            {/* Footer Action */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-orange-100/50">
                <div className="max-w-5xl mx-auto flex justify-end">
                    <button 
                        onClick={handleApprove}
                        disabled={submitting || loading}
                        className="px-10 py-4 bg-orange-600 text-white rounded-[24px] text-sm font-black uppercase tracking-widest shadow-lg shadow-orange-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Gerar Ordem de Produção
                    </button>
                </div>
            </div>

            {/* Reason Modal */}
            {selectedItemForReason && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900">Motivo do Ajuste</h3>
                            <button onClick={() => setSelectedItemForReason(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-2">
                            {REASONS.map(reason => (
                                <button
                                    key={reason}
                                    onClick={() => handleReasonChange(selectedItemForReason, reason)}
                                    className="w-full text-left px-5 py-4 rounded-2xl text-sm font-bold text-gray-700 hover:bg-orange-50 transition-all capitalize"
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Vínculo */}
            {linkingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-sm font-black text-gray-900">Vincular Item de Contagem</h2>
                            <button onClick={() => setLinkingItem(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto">
                            <p className="text-xs text-gray-500 mb-4">
                                Você está vinculando o item do catálogo <span className="font-bold text-gray-900">{linkingItem.name}</span>. Busque e selecione o item correspondente no módulo de contagem da Cozinha Central.
                            </p>
                            
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={countSearch}
                                    onChange={e => searchCountItems(e.target.value)}
                                    placeholder="Buscar item na contagem..."
                                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 focus:bg-white transition-all"
                                />
                                {isSearchingCount && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                                )}
                            </div>

                            <div className="space-y-2">
                                {countItems.length > 0 ? (
                                    countItems.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => handleLinkItem(c.id)}
                                            disabled={isSavingLink}
                                            className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                                        >
                                            <div>
                                                <span className="block text-sm font-bold text-gray-900">{c.name}</span>
                                                <span className="block text-[10px] text-gray-400 font-medium mt-0.5">{c.unit || 'UN'}</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-300" />
                                        </button>
                                    ))
                                ) : countSearch.length >= 2 && !isSearchingCount ? (
                                    <p className="text-sm text-gray-500 text-center py-4">Nenhum item encontrado.</p>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
