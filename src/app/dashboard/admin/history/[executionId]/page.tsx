'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import React, { use } from 'react'
import { Loader2, ArrowLeft, CheckCircle2, Clock, XCircle, FileSearch, User, Calendar, AlertTriangle, Calculator, DollarSign, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { calculateCMV, saveRevenue, getCMVTarget, getCMVItemDetail } from '@/app/actions/cmvActions'
import toast from 'react-hot-toast'

export default function ExecutionDetailPage({ params }: { params: Promise<{ executionId: string }> }) {
    const { executionId } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [execution, setExecution] = useState<any>(null)
    const [sessions, setSessions] = useState<any[]>([])
    const [reportItems, setReportItems] = useState<any[]>([])
    const [logs, setLogs] = useState<any[]>([])
    const [purchases, setPurchases] = useState<any[]>([])

    // CMV
    const [revenueInput, setRevenueInput] = useState('')
    const [cmvTarget, setCmvTarget] = useState(0)
    const [cmvResult, setCmvResult] = useState<any>(null)
    const [isCalculating, setIsCalculating] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [details, setDetails] = useState<any[]>([])
    const [loadingDetails, setLoadingDetails] = useState(false)

    useEffect(() => {
        load()
    }, [executionId])

    const load = async () => {
        setLoading(true)

        // Dados do ciclo
        const { data: exec } = await supabase
            .from('routine_executions')
            .select('*, routines(name), users(name)')
            .eq('id', executionId)
            .maybeSingle()
        if (exec) {
            setExecution(exec)
            if (exec.revenue) setRevenueInput(String(exec.revenue))
        }

        const target = await getCMVTarget()
        setCmvTarget(target)

        // Sessões de contagem vinculadas ao execution_id
        const { data: sess } = await supabase
            .from('count_sessions')
            .select('id, status, started_at, completed_at, groups(name), users(name)')
            .eq('execution_id', executionId)
            .order('started_at')
        if (sess) setSessions(sess)

        // Compras do ciclo
        const { data: stockEntries } = await supabase
            .from('stock_entries')
            .select('converted_quantity, converted_unit_cost')
            .eq('execution_id', executionId)
        if (stockEntries) setPurchases(stockEntries)

        // Auditoria vinculada ao execution_id
        const { data: rep } = await supabase
            .from('audit_reports')
            .select('*, users!audit_reports_approved_by_fkey(name)')
            .eq('execution_id', executionId)
            .maybeSingle()
        if (rep) {
            setReport(rep)
            const { data: items } = await supabase
                .from('audit_report_items')
                .select('*, items(name, unit)')
                .eq('audit_report_id', rep.id)
                .neq('divergence', 0)
                .order('financial_impact', { ascending: true })
                .limit(20)
            if (items) setReportItems(items)
        }

        // Logs de auditoria
        const { data: auditLogs } = await supabase
            .from('audit_logs')
            .select('*, users(name)')
            .eq('execution_id', executionId)
            .order('action_at')
        if (auditLogs) setLogs(auditLogs)

        setLoading(false)
    }

    const formatDate = (d: string | null) => {
        if (!d) return '—'
        return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const formatMoney = (v: number | null) =>
        v !== null && v !== undefined ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—'

    const handleSaveRevenue = async () => {
        setIsCalculating(true)
        try {
            await saveRevenue(executionId, Number(revenueInput))
            toast.success("Faturamento salvo com sucesso!")
            load() // Recarrega para refletir
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsCalculating(false)
        }
    }

    const loadDetails = async () => {
        setLoadingDetails(true)
        try {
            const res = await getCMVItemDetail(executionId)
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

    const handleCalculateCMV = async () => {
        setIsCalculating(true)
        try {
            const res = await calculateCMV(executionId)
            if (res.success) {
                setCmvResult(res.data)
                toast.success("CMV Recalculado!")
                if (showDetails) loadDetails()
            }
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsCalculating(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>
    if (!execution) return <div className="p-4 text-center text-gray-500">Ciclo não encontrado.</div>

    const totalPurchases = purchases.reduce((acc, curr) => acc + (Number(curr.converted_quantity || 0) * Number(curr.converted_unit_cost || 0)), 0)
    const purchaseCount = purchases.length

    const hasCompletedSessions = sessions.some(s => s.status === 'completed')
    const isApproved = !!report?.approved_at

    return (
        <div className="p-4 space-y-5 pb-20">
            {/* Header */}
            <div className="flex items-center space-x-3 mt-2">
                <button onClick={() => router.push('/dashboard/admin/history')} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Histórico · Detalhe</p>
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{execution.routines?.name}</h2>
                </div>
            </div>

            {/* Info do ciclo */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Iniciado em <strong>{formatDate(execution.started_at)}</strong></span>
                </div>
                {execution.users?.name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>Por <strong>{execution.users.name}</strong></span>
                    </div>
                )}
                {report?.approved_at && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Aprovado por <strong>{(report.users as any)?.name || '—'}</strong> em {formatDate(report.approved_at)}</span>
                    </div>
                )}
            </div>

            {/* Grupos contados */}
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2">Grupos</p>
                {sessions.length === 0 && <p className="text-sm text-gray-400 pl-1">Nenhum grupo registrado neste ciclo.</p>}
                <div className="space-y-2">
                    {sessions.map(s => (
                        <div key={s.id} className={`bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm ${s.status === 'completed' ? 'border-gray-200' : 'border-orange-200'}`}>
                            <div>
                                <p className="font-semibold text-gray-800 text-sm">{s.groups?.name || '—'}</p>
                                <p className="text-xs text-gray-400">{s.users?.name ? `${s.users.name}` : 'Sem operador'} · Início: {formatDate(s.started_at)}</p>
                            </div>
                            {s.status === 'completed'
                                ? <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                                : <Clock className="w-5 h-5 text-orange-400 flex-shrink-0" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Compras do Período */}
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2">Compras do Período</p>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-lg font-bold text-gray-800">{purchaseCount} entradas</p>
                        <p className="text-sm text-gray-500 font-medium">Total: <span className="font-bold text-[#B13A2B]">{formatMoney(totalPurchases)}</span></p>
                    </div>
                    <button onClick={() => router.push(`/dashboard/admin/purchases/${executionId}`)} className="text-sm font-bold text-[#B13A2B] bg-[#FDF0EF] px-4 py-2 rounded-xl hover:bg-[#f5ddd9] transition active:scale-95 flex items-center gap-2">
                        Gerenciar →
                    </button>
                </div>
            </div>

            {/* Módulo CMV */}
            {execution && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Indicador CMV</p>
                            {!isApproved && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">
                                    Prévia
                                </span>
                            )}
                        </div>
                        {cmvResult?.cmv_percentage != null && (
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${cmvResult.cmv_percentage <= cmvTarget ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {(cmvResult.cmv_percentage * 100).toFixed(1)}% / {(cmvTarget * 100).toFixed(0)}% Meta
                            </span>
                        )}
                    </div>

                    {!hasCompletedSessions && purchases.length === 0 ? (
                        <div className="p-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center space-y-1">
                            <p className="text-sm font-bold text-gray-600">Base Insuficiente para Cálculo</p>
                            <p className="text-xs font-medium text-gray-400">É necessário haver sessões de contagem finalizadas ou registros de compras para engajar o recálculo provisório.</p>
                        </div>
                    ) : (
                        <>
                            {/* Controles do CMV */}
                            <div className="grid grid-cols-1 gap-3">
                        <div className="flex space-x-2">
                            <div className="flex-1 relative">
                                <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input 
                                    type="number" step="0.01" 
                                    className="w-full pl-9 p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm outline-none" 
                                    placeholder="Faturamento (Receita) R$" 
                                    value={revenueInput} 
                                    onChange={e => setRevenueInput(e.target.value)} 
                                />
                            </div>
                            <button onClick={handleSaveRevenue} disabled={isCalculating} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 min-w-[80px]">
                                Salvar
                            </button>
                        </div>
                        <button onClick={handleCalculateCMV} disabled={isCalculating} className="w-full py-3 bg-[#B13A2B] text-white rounded-xl font-bold flex justify-center items-center shadow-sm hover:bg-[#8F2E21] transition active:scale-95 disabled:opacity-50 text-sm">
                            {isCalculating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Calculator className="w-4 h-4 mr-2" /> Recalcular CMV Base Completa</>}
                        </button>
                    </div>

                    {/* Exibição do Resultado Calculado em Memória */}
                    {cmvResult && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] uppercase font-bold text-gray-500">Estoque Inicial (EI)</p>
                                    <p className="font-bold text-gray-800">{formatMoney(cmvResult.total_ei)}</p>
                                </div>
                                <div className="bg-[#FDF0EF] p-3 rounded-xl border border-[#f5ddd9]">
                                    <p className="text-[10px] uppercase font-bold text-[#B13A2B]">Compras (+)</p>
                                    <p className="font-bold text-[#B13A2B]">{formatMoney(cmvResult.total_compras)}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] uppercase font-bold text-gray-500">Estoque Final (EF) (-)</p>
                                    <p className="font-bold text-gray-800">{formatMoney(cmvResult.total_ef)}</p>
                                </div>
                                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                    <p className="text-[10px] uppercase font-bold text-indigo-700">CMV R$ (=)</p>
                                    <p className="font-bold text-indigo-800">{formatMoney(cmvResult.total_cmv)}</p>
                                </div>
                            </div>
                            
                            {/* CMV Lacuna e Fechamento */}
                            <div className="bg-white border border-gray-200 p-3 rounded-xl flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Faturamento Referência</p>
                                    <p className="font-extrabold text-gray-800">{formatMoney(cmvResult.revenue)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 font-bold uppercase">Meta e Lacuna</p>
                                    {cmvResult.cmv_percentage != null ? (
                                        <p className="font-extrabold text-[#B13A2B]">
                                            {(cmvResult.cmv_percentage * 100).toFixed(1)}% CMV 
                                            <span className="text-xs ml-1 text-gray-400 font-medium">({((cmvResult.cmv_percentage - cmvTarget) * 100).toFixed(1)}% dif)</span>
                                        </p>
                                    ) : (
                                        <p className="text-sm font-bold text-gray-400">R$ 0,00</p>
                                    )}
                                </div>
                            </div>
                            
                            {(cmvResult.uncounted_count > 0 || cmvResult.anomalies_count > 0) && (
                                <div className="space-y-2 mt-2">
                                    {cmvResult.uncounted_count > 0 && (
                                        <div className="bg-amber-50 p-3 rounded-xl flex items-start gap-2 border border-amber-200">
                                            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold text-amber-800">{cmvResult.uncounted_count} Itens Não Contados</p>
                                                <p className="text-[10px] text-amber-700">Havia estoque inicial ou compras, mas o saldo final não foi batido. Assumiu EF = 0 (Perda Total).</p>
                                            </div>
                                        </div>
                                    )}
                                    {cmvResult.anomalies_count > 0 && (
                                        <div className="bg-red-50 p-3 rounded-xl flex items-start gap-2 border border-red-200">
                                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold text-red-800">{cmvResult.anomalies_count} Anomalias Registradas</p>
                                                <p className="text-[10px] text-red-700">Itens encontrados no fim do período que não constavam no início e não possuem registros de compra.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TOGGLE E DETALHES */}
                            <button onClick={toggleDetails} className="w-full py-2 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition flex items-center justify-center gap-2 text-xs font-bold text-gray-600 mt-4">
                                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                {showDetails ? 'Esconder Detalhes por Item' : 'Ver Detalhes por Item'}
                            </button>

                            {showDetails && (
                                <div className="mt-3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    {loadingDetails ? (
                                        <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                                    ) : (
                                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                            <table className="w-full text-left text-xs whitespace-nowrap">
                                                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 shadow-sm z-10 text-gray-500">
                                                    <tr>
                                                        <th className="p-3 font-bold">Item</th>
                                                        <th className="p-3 font-bold text-right bg-gray-50 border-x border-gray-100">EI</th>
                                                        <th className="p-3 font-bold text-right text-[#B13A2B] bg-[#FDF0EF]/30 border-r border-gray-100">+ Compras</th>
                                                        <th className="p-3 font-bold text-right bg-gray-50 border-r border-gray-100">- EF</th>
                                                        <th className="p-3 font-bold text-right bg-indigo-50/50 text-indigo-700">CMV R$</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {details.map(d => (
                                                        <tr key={d.item_id} className={`hover:bg-gray-50 transition ${d.is_anomaly ? 'bg-red-50/30' : ''} ${!d.was_counted && (d.ei_qty > 0 || d.compras_qty > 0) ? 'bg-amber-50/30' : ''}`}>
                                                            <td className="p-3">
                                                                <p className="font-bold text-gray-800 flex items-center gap-1">
                                                                    {d.item_name}
                                                                    {d.is_anomaly && <AlertTriangle className="w-3 h-3 text-red-500" title="Anomalia" />}
                                                                    {!d.was_counted && (d.ei_qty > 0 || d.compras_qty > 0) && <AlertTriangle className="w-3 h-3 text-amber-500" title="Não contado" />}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 truncate w-24 sm:w-auto">{d.group_name} · ({d.item_unit})</p>
                                                            </td>
                                                            <td className="p-3 text-right bg-gray-50/50 font-medium text-gray-600 border-x border-gray-50">
                                                                <span className="block">{d.ei_qty}</span>
                                                                <span className="text-[10px] text-gray-400 font-normal">{formatMoney(d.ei_valor)}</span>
                                                            </td>
                                                            <td className="p-3 text-right font-medium text-[#B13A2B] border-r border-gray-50">
                                                                <span className="block">{d.compras_qty}</span>
                                                                <span className="text-[10px] text-[#B13A2B]/60 font-normal">{formatMoney(d.compras_valor)}</span>
                                                            </td>
                                                            <td className="p-3 text-right bg-gray-50/50 font-medium text-gray-600 border-r border-gray-50">
                                                                <span className="block">{d.ef_qty}</span>
                                                                <span className="text-[10px] text-gray-400 font-normal">{formatMoney(d.ef_valor)}</span>
                                                            </td>
                                                            <td className="p-3 text-right bg-indigo-50/20 font-bold text-indigo-700">
                                                                {formatMoney(d.cmv_item)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {details.length === 0 && (
                                                        <tr><td colSpan={5} className="p-6 text-center text-gray-400">Nenhum dado encontrado</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Resumo da auditoria */}
            {report && (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Auditoria</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-xs text-gray-400">Teórico</p>
                            <p className="text-sm font-bold text-gray-800">{formatMoney(report.total_theoretical_value)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Contado</p>
                            <p className="text-sm font-bold text-gray-800">{formatMoney(report.total_counted_value)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Divergência</p>
                            <p className={`text-sm font-bold ${report.divergence_value !== 0 ? 'text-red-500' : 'text-green-600'}`}>{formatMoney(report.divergence_value)}</p>
                        </div>
                    </div>
                    <div className="text-center pt-2 border-t border-gray-50">
                        <p className="text-xs text-gray-400">Acurácia</p>
                        <p className={`text-2xl font-extrabold ${report.accuracy_percentage >= 95 ? 'text-green-600' : 'text-amber-500'}`}>
                            {report.accuracy_percentage?.toFixed(1)}%
                        </p>
                    </div>
                    <button onClick={() => router.push(`/dashboard/admin/reports/${report.id}`)} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 transition">
                        <FileSearch className="w-4 h-4" /> Ver Auditoria Completa
                    </button>
                </div>
            )}

            {/* Top divergências */}
            {reportItems.length > 0 && (
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2">Maiores Divergências</p>
                    <div className="space-y-2">
                        {reportItems.map(item => (
                            <div key={item.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">{item.items?.name}</p>
                                    <p className="text-xs text-gray-400">Teórico: {item.theoretical_quantity} · Contado: {item.counted_quantity ?? '—'} · Dif: {item.divergence > 0 ? '+' : ''}{item.divergence}</p>
                                </div>
                                <span className={`text-xs font-bold ${item.financial_impact < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {formatMoney(item.financial_impact)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Linha do tempo de logs */}
            {logs.length > 0 && (
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2">Linha do Tempo</p>
                    <div className="relative border-l-2 border-gray-200 pl-5 space-y-4 ml-2">
                        {logs.map(log => (
                            <div key={log.id} className="relative">
                                <div className="absolute -left-7 top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-300" />
                                <p className="text-xs font-bold text-gray-600 capitalize">{log.action.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-gray-400">{log.users?.name || '—'} · {formatDate(log.action_at)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
