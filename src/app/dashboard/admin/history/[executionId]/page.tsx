'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import React, { use } from 'react'
import { Loader2, ArrowLeft, CheckCircle2, Clock, XCircle, FileSearch, User, Calendar } from 'lucide-react'

export default function ExecutionDetailPage({ params }: { params: Promise<{ executionId: string }> }) {
    const { executionId } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [execution, setExecution] = useState<any>(null)
    const [sessions, setSessions] = useState<any[]>([])
    const [report, setReport] = useState<any>(null)
    const [reportItems, setReportItems] = useState<any[]>([])
    const [logs, setLogs] = useState<any[]>([])

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
        if (exec) setExecution(exec)

        // Sessões de contagem vinculadas ao execution_id
        const { data: sess } = await supabase
            .from('count_sessions')
            .select('id, status, started_at, completed_at, groups(name), users(name)')
            .eq('execution_id', executionId)
            .order('started_at')
        if (sess) setSessions(sess)

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

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>
    if (!execution) return <div className="p-4 text-center text-gray-500">Ciclo não encontrado.</div>

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
