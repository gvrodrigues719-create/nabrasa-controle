'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Loader2, ShoppingCart, TrendingUp, Calculator,
    DollarSign, AlertTriangle, ChevronDown, ChevronUp, Package, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { calculateCMV, saveRevenue, getCMVTarget, getCMVItemDetail, getCMVConsolidated } from '@/app/actions/cmvActions'

function formatMoney(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}
function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function CMVPage() {
    const router = useRouter()

    // Ciclos
    const [executions, setExecutions] = useState<any[]>([])
    const [selectedId, setSelectedId] = useState<string>('')
    const [execution, setExecution] = useState<any>(null)
    const [purchases, setPurchases] = useState<any[]>([])
    const [loadingCycles, setLoadingCycles] = useState(true)
    const [loadingDetail, setLoadingDetail] = useState(false)

    // CMV
    const [revenueInput, setRevenueInput] = useState('')
    const [cmvTarget, setCmvTarget] = useState(0.30)
    const [cmvResult, setCmvResult] = useState<any>(null)
    const [isCalculating, setIsCalculating] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [details, setDetails] = useState<any[]>([])
    const [loadingDetails, setLoadingDetails] = useState(false)

    // Abas
    const [activeTab, setActiveTab] = useState<'summary' | 'cycle'>('cycle')
    const [summaryFilter, setSummaryFilter] = useState<'4' | '6' | 'month' | 'custom'>('4')
    const [customDates, setCustomDates] = useState({ start: '', end: '' })
    const [consolidatedData, setConsolidatedData] = useState<any>(null)
    const [loadingSummary, setLoadingSummary] = useState(false)

    useEffect(() => {
        loadCycles()
        getCMVTarget().then(t => setCmvTarget(t))
    }, [])

    useEffect(() => {
        if (activeTab === 'summary') {
            if (summaryFilter === 'custom') {
                if (customDates.start && customDates.end) loadConsolidated()
            } else {
                loadConsolidated()
            }
        }
    }, [activeTab, summaryFilter, customDates])

    const loadConsolidated = async () => {
        setLoadingSummary(true)
        try {
            const res = await getCMVConsolidated({ 
                mode: summaryFilter,
                startDate: customDates.start || undefined,
                endDate: customDates.end || undefined
            })
            if (res.success) setConsolidatedData(res.data)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoadingSummary(false)
        }
    }

    useEffect(() => {
        if (selectedId) loadCycleDetail(selectedId)
        else {
            setExecution(null)
            setPurchases([])
            setCmvResult(null)
            setRevenueInput('')
            setShowDetails(false)
            setDetails([])
        }
    }, [selectedId])

    const loadCycles = async () => {
        setLoadingCycles(true)
        const { data } = await supabase
            .from('routine_executions')
            .select('id, started_at, routines(name)')
            .order('started_at', { ascending: false })
            .limit(30)
        setExecutions(data || [])
        setLoadingCycles(false)
    }

    const loadCycleDetail = async (execId: string) => {
        setLoadingDetail(true)
        setCmvResult(null)
        setShowDetails(false)
        setDetails([])

        const { data: exec } = await supabase
            .from('routine_executions')
            .select('*, routines(name)')
            .eq('id', execId)
            .single()
        setExecution(exec || null)
        if (exec?.revenue) setRevenueInput(String(exec.revenue))

        const { data: entries } = await supabase
            .from('stock_entries')
            .select('converted_quantity, converted_unit_cost')
            .eq('execution_id', execId)
        setPurchases(entries || [])

        setLoadingDetail(false)
    }

    const totalPurchases = purchases.reduce((acc, e) =>
        acc + (Number(e.converted_quantity || 0) * Number(e.converted_unit_cost || 0)), 0)

    const handleSaveRevenue = async () => {
        if (!selectedId) return
        setIsCalculating(true)
        try {
            await saveRevenue(selectedId, Number(revenueInput))
            toast.success('Faturamento salvo!')
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsCalculating(false)
        }
    }

    const handleCalculateCMV = async () => {
        if (!selectedId) return
        setIsCalculating(true)
        try {
            const res = await calculateCMV(selectedId)
            if (res.success) {
                setCmvResult(res.data)
                toast.success('CMV recalculado!')
                if (showDetails) loadDetails()
            }
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsCalculating(false)
        }
    }

    const loadDetails = async () => {
        if (!selectedId) return
        setLoadingDetails(true)
        try {
            const res = await getCMVItemDetail(selectedId)
            if (res.success && res.data) setDetails(res.data)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoadingDetails(false)
        }
    }

    const toggleDetails = () => {
        if (!showDetails && details.length === 0) loadDetails()
        setShowDetails(!showDetails)
    }

    const isApproved = false // ciclo aberto por padrão nesta visão

    return (
        <div className="p-4 space-y-5 pb-24 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/dashboard/admin')} className="p-2 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-600 hover:bg-gray-50 transition active:scale-95">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gestão Financeira</p>
                        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">CMV & Compras</h1>
                    </div>
                </div>
                <button 
                    onClick={() => router.push('/dashboard/admin/cmv/invoices')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm active:scale-95"
                >
                    <FileText className="w-4 h-4 text-gray-400" /> Notas XML
                </button>
            </div>

            {/* Abas */}
            <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'summary' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Resumo
                </button>
                <button
                    onClick={() => setActiveTab('cycle')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'cycle' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Ciclo
                </button>
            </div>

            {activeTab === 'summary' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: '4', label: 'Últimos 4 ciclos' },
                                { id: '6', label: 'Últimos 6 ciclos' },
                                { id: 'month', label: 'Mês atual' },
                                { id: 'custom', label: 'Personalizado' },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setSummaryFilter(f.id as any)}
                                    disabled={loadingSummary}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${summaryFilter === f.id ? 'bg-[#B13A2B] border-[#B13A2B] text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {summaryFilter === 'custom' && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                                <input 
                                    type="date" 
                                    value={customDates.start}
                                    onChange={e => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                                    className="bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-[#B13A2B]"
                                />
                                <span className="text-gray-400 font-bold">até</span>
                                <input 
                                    type="date" 
                                    value={customDates.end}
                                    onChange={e => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                                    className="bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-[#B13A2B]"
                                />
                            </div>
                        )}
                    </div>

                    {loadingSummary ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-[#B13A2B]" />
                            <p className="text-sm font-bold text-gray-400">Consolidando dados do histórico...</p>
                        </div>
                    ) : !consolidatedData || consolidatedData.cycles.length === 0 ? (
                        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                            <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="font-bold text-gray-400">Nenhum dado encontrado para o período</p>
                            <p className="text-xs text-gray-400 mt-2">Selecione outro filtro ou registre novos ciclos.</p>
                        </div>
                    ) : (
                        <>
                            {/* Cards de Resumo */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {[
                                    { label: 'Receita Total', value: formatMoney(consolidatedData.summary.revenue_total), icon: DollarSign, color: 'text-gray-600', bg: 'bg-white' },
                                    { label: 'Compras Totais', value: formatMoney(consolidatedData.summary.purchases_total), icon: ShoppingCart, color: 'text-[#B13A2B]', bg: 'bg-[#FDF0EF]' },
                                    { label: 'CMV Total', value: formatMoney(consolidatedData.summary.cmv_total), icon: Calculator, color: 'text-indigo-600', bg: 'bg-indigo-50/50' },
                                    { 
                                        label: 'CMV %', 
                                        value: consolidatedData.summary.cmv_percentage_consolidated != null ? (consolidatedData.summary.cmv_percentage_consolidated * 100).toFixed(1) + '%' : '—', 
                                        icon: TrendingUp, 
                                        color: consolidatedData.summary.cmv_percentage_consolidated <= consolidatedData.summary.target ? 'text-green-600' : 'text-red-600', 
                                        bg: 'bg-white' 
                                    },
                                    { label: 'Meta', value: (consolidatedData.summary.target * 100).toFixed(1) + '%', icon: Package, color: 'text-gray-400', bg: 'bg-white' },
                                    { 
                                        label: 'Lacuna', 
                                        value: consolidatedData.summary.cmv_percentage_consolidated != null ? ((consolidatedData.summary.cmv_percentage_consolidated - consolidatedData.summary.target) * 100).toFixed(1) + '%' : '—', 
                                        icon: AlertTriangle, 
                                        color: consolidatedData.summary.gap <= 0 ? 'text-green-600' : 'text-amber-600', 
                                        bg: consolidatedData.summary.gap <= 0 ? 'bg-green-50/50' : 'bg-amber-50/50' 
                                    },
                                ].map((c, i) => (
                                    <div key={i} className={`${c.bg} border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2 transition-all hover:shadow-md`}>
                                        <div className="flex items-center gap-2">
                                            <c.icon className={`w-3 h-3 ${c.color}`} />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.label}</p>
                                        </div>
                                        <p className={`text-lg font-extrabold ${c.color.includes('text-gray') ? 'text-gray-900' : c.color}`}>{c.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Tabela de Ciclos Selecionados */}
                            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{consolidatedData.summary.cycles_count} Ciclos Selecionados</p>
                                    <div className="flex gap-2">
                                        {consolidatedData.summary.cycles_with_anomalies > 0 && (
                                            <span className="text-[9px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <AlertTriangle className="w-2.5 h-2.5" /> {consolidatedData.summary.cycles_with_anomalies} Anomalias
                                            </span>
                                        )}
                                        {consolidatedData.summary.cycles_with_uncounted > 0 && (
                                            <span className="text-[9px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <AlertTriangle className="w-2.5 h-2.5" /> {consolidatedData.summary.cycles_with_uncounted} Alert. Contagem
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {consolidatedData.cycles.map((c: any) => (
                                        <div 
                                            key={c.execution_id} 
                                            onClick={() => { setSelectedId(c.execution_id); setActiveTab('cycle'); }}
                                            className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${c.anomalies_count > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    {c.anomalies_count > 0 ? '!' : '#'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800 group-hover:text-[#B13A2B] transition-colors">{c.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[10px] text-gray-400">{formatDate(c.date)}</p>
                                                        {c.uncounted_count > 0 && <span className="text-[9px] text-amber-600 font-bold">· {c.uncounted_count} não contados</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-bold ${c.cmv_percentage != null && c.cmv_percentage <= consolidatedData.summary.target ? 'text-green-600' : 'text-[#B13A2B]'}`}>
                                                    {c.cmv_percentage != null ? (c.cmv_percentage * 100).toFixed(1) + '%' : '—'}
                                                </p>
                                                <p className="text-[10px] text-gray-400">{formatMoney(c.cmv_total)} CMV</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 text-center bg-gray-50/30 border-t border-gray-100 text-gray-400 text-[10px] font-medium uppercase tracking-widest">
                                    Fim do histórico selecionado
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'cycle' && (
                <div className="space-y-5">
                    {/* Seletor de Ciclo */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Ciclo de Referência</p>
                {loadingCycles ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                ) : (
                    <select
                        value={selectedId}
                        onChange={e => setSelectedId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#B13A2B]"
                    >
                        <option value="">Selecione um ciclo...</option>
                        {executions.map(ex => (
                            <option key={ex.id} value={ex.id}>
                                {ex.routines?.name} — {formatDate(ex.started_at)}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {loadingDetail && (
                <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
            )}

            {!loadingDetail && execution && (
                <>
                    {/* Card de Compras */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#FDF0EF] p-3 rounded-xl">
                                <ShoppingCart className="w-5 h-5 text-[#B13A2B]" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Compras do Período</p>
                                <p className="font-bold text-gray-900">{purchases.length} entradas · {formatMoney(totalPurchases)}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push(`/dashboard/admin/purchases/${selectedId}`)}
                            className="text-sm font-bold text-[#B13A2B] bg-[#FDF0EF] px-4 py-2 rounded-xl hover:bg-[#f5ddd9] transition active:scale-95"
                        >
                            Gerenciar →
                        </button>
                    </div>

                    {/* Card Indicador CMV */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="bg-indigo-100 p-2 rounded-lg">
                                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Indicador CMV</p>
                            </div>
                            {cmvResult?.cmv_percentage != null && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${cmvResult.cmv_percentage <= cmvTarget ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {(cmvResult.cmv_percentage * 100).toFixed(1)}% / {(cmvTarget * 100).toFixed(0)}% Meta
                                </span>
                            )}
                        </div>

                        {/* Faturamento */}
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="number" step="0.01"
                                    value={revenueInput}
                                    onChange={e => setRevenueInput(e.target.value)}
                                    placeholder="Faturamento do período R$"
                                    className="w-full pl-9 p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#B13A2B]"
                                />
                            </div>
                            <button onClick={handleSaveRevenue} disabled={isCalculating} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 disabled:opacity-50 min-w-[80px]">
                                Salvar
                            </button>
                        </div>

                        <button
                            onClick={handleCalculateCMV}
                            disabled={isCalculating}
                            className="w-full py-3 bg-[#B13A2B] text-white rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-[#8F2E21] transition active:scale-95 disabled:opacity-50"
                        >
                            {isCalculating
                                ? <Loader2 className="w-5 h-5 animate-spin" />
                                : <><Calculator className="w-4 h-4" /> Recalcular CMV</>
                            }
                        </button>

                        {/* Resultado */}
                        {cmvResult && (
                            <div className="pt-4 border-t border-gray-100 space-y-3">
                                {/* Cards de resumo */}
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] uppercase font-bold text-gray-500">Estoque Inicial</p>
                                        <p className="font-bold text-gray-800">{formatMoney(cmvResult.total_ei)}</p>
                                    </div>
                                    <div className="bg-[#FDF0EF] p-3 rounded-xl border border-[#f5ddd9]">
                                        <p className="text-[10px] uppercase font-bold text-[#B13A2B]">Compras (+)</p>
                                        <p className="font-bold text-[#B13A2B]">{formatMoney(cmvResult.total_compras)}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <p className="text-[10px] uppercase font-bold text-gray-500">Estoque Final (-)</p>
                                        <p className="font-bold text-gray-800">{formatMoney(cmvResult.total_ef)}</p>
                                    </div>
                                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                        <p className="text-[10px] uppercase font-bold text-indigo-700">CMV R$ (=)</p>
                                        <p className="font-bold text-indigo-800">{formatMoney(cmvResult.total_cmv)}</p>
                                    </div>
                                </div>

                                {/* Faturamento vs Meta */}
                                <div className="bg-white border border-gray-200 rounded-xl p-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400">Faturamento</p>
                                        <p className="font-extrabold text-gray-900">{formatMoney(cmvResult.revenue)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-gray-400">CMV% · Lacuna</p>
                                        {cmvResult.cmv_percentage != null ? (
                                            <p className="font-extrabold text-[#B13A2B]">
                                                {(cmvResult.cmv_percentage * 100).toFixed(1)}%
                                                <span className="text-xs ml-1 text-gray-400 font-medium">
                                                    ({((cmvResult.cmv_percentage - cmvTarget) * 100).toFixed(1)}% dif)
                                                </span>
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-400 font-bold">Sem faturamento</p>
                                        )}
                                    </div>
                                </div>

                                {/* Alertas */}
                                {cmvResult.uncounted_count > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-amber-800">{cmvResult.uncounted_count} Itens Não Contados</p>
                                            <p className="text-[10px] text-amber-700">Assumiu EF = 0 (Perda Total). Revise antes de aprovar.</p>
                                        </div>
                                    </div>
                                )}
                                {cmvResult.anomalies_count > 0 && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-red-800">{cmvResult.anomalies_count} Anomalias Detectadas</p>
                                            <p className="text-[10px] text-red-700">Itens encontrados sem registro de entrada ou estoque inicial.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Toggle detalhes */}
                                <button onClick={toggleDetails} className="w-full py-2 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition flex items-center justify-center gap-2 text-xs font-bold text-gray-600">
                                    {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    {showDetails ? 'Esconder Detalhes por Item' : 'Ver Detalhes por Item'}
                                </button>

                                {showDetails && (
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        {loadingDetails ? (
                                            <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                                        ) : (
                                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                                <table className="w-full text-left text-xs whitespace-nowrap">
                                                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 text-gray-500">
                                                        <tr>
                                                            <th className="p-3 font-bold">Item</th>
                                                            <th className="p-3 font-bold text-right">EI</th>
                                                            <th className="p-3 font-bold text-right text-[#B13A2B]">+ Compras</th>
                                                            <th className="p-3 font-bold text-right">- EF</th>
                                                            <th className="p-3 font-bold text-right text-indigo-700">CMV R$</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {details.map(d => (
                                                            <tr key={d.item_id} className={`hover:bg-gray-50 ${d.is_anomaly ? 'bg-red-50/30' : ''} ${!d.was_counted && (d.ei_qty > 0 || d.compras_qty > 0) ? 'bg-amber-50/30' : ''}`}>
                                                                <td className="p-3">
                                                                    <p className="font-bold text-gray-800 flex items-center gap-1">
                                                                        {d.item_name}
                                                                        {d.is_anomaly && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                                                        {!d.was_counted && (d.ei_qty > 0 || d.compras_qty > 0) && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400">{d.group_name} · {d.item_unit}</p>
                                                                </td>
                                                                <td className="p-3 text-right text-gray-600">
                                                                    <span className="block font-medium">{d.ei_qty}</span>
                                                                    <span className="text-[10px] text-gray-400">{formatMoney(d.ei_valor)}</span>
                                                                </td>
                                                                <td className="p-3 text-right text-[#B13A2B]">
                                                                    <span className="block font-medium">{d.compras_qty}</span>
                                                                    <span className="text-[10px] text-[#B13A2B]/60">{formatMoney(d.compras_valor)}</span>
                                                                </td>
                                                                <td className="p-3 text-right text-gray-600">
                                                                    <span className="block font-medium">{d.ef_qty}</span>
                                                                    <span className="text-[10px] text-gray-400">{formatMoney(d.ef_valor)}</span>
                                                                </td>
                                                                <td className="p-3 text-right font-bold text-indigo-700">
                                                                    {formatMoney(d.cmv_item)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {details.length === 0 && (
                                                            <tr><td colSpan={5} className="p-6 text-center text-gray-400">Nenhum dado disponível</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {!loadingDetail && !execution && !loadingCycles && (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-10 text-center">
                    <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-600">Selecione um ciclo acima</p>
                    <p className="text-sm text-gray-400 mt-1">para visualizar compras e calcular o CMV do período</p>
                </div>
            )}
                </div>
            )}
        </div>
    )
}
