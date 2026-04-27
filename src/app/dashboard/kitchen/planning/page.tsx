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
    approveProductionPlanningAction 
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
    const [selectedItemForReason, setSelectedItemForReason] = useState<string | null>(null)

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
        if (!search) return data
        const terms = search.toLowerCase().split(' ')
        return data.filter(s => 
            terms.every(term => s.item?.name.toLowerCase().includes(term))
        )
    }, [data, search])

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
        const toApprove = data.filter(s => (s.approved_qty || 0) > 0)
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
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-orange-100/50 shadow-sm">
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
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-orange-200 text-orange-700 rounded-2xl text-sm font-bold hover:bg-orange-50 transition-colors"
                    >
                        <Calculator className="w-4 h-4" />
                        Recalcular
                    </button>
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
                    <div className="space-y-4">
                        {filteredData.map((s) => {
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
                                                    Temos <span className="font-black text-gray-900">{s.ready_stock_qty}</span> pronto. 
                                                    {s.scheduled_qty > 0 && <> Já existem <span className="font-black text-orange-600">{s.scheduled_qty}</span> em produção. </>}
                                                    Sugiro produzir <span className="font-black text-orange-600">{s.suggested_qty}</span>.
                                                    {status_color === 'red' && (
                                                        <span className="text-rose-600 block mt-2 bg-rose-50 p-2 rounded-xl border border-rose-100">
                                                            <AlertCircle className="w-4 h-4 inline mr-2" />
                                                            Falta comprar: <span className="font-black">{missingW.join(', ')}</span>
                                                        </span>
                                                    )}
                                                </p>
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
        </div>
    )
}
