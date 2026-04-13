'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, CheckCircle, XCircle, AlertTriangle, ChevronRight, Calculator, FileWarning } from 'lucide-react'
import toast from 'react-hot-toast'
import React, { use } from 'react'

export default function ReportDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id: reportId } = use(params)

    const [loading, setLoading] = useState(true)
    const [report, setReport] = useState<any>(null)
    const [items, setItems] = useState<any[]>([])
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        load()
    }, [])

    const load = async () => {
        setLoading(true)
        const { data: rep } = await supabase.from('audit_reports').select('*, routines(name)').eq('id', reportId).maybeSingle()
        if (rep) {
            setReport(rep)
            const { data: repItems } = await supabase.from('audit_report_items').select('*, items(name, unit)').eq('audit_report_id', reportId)
            if (repItems) {
                // Sort by higher financial impact first
                repItems.sort((a, b) => Math.abs(b.financial_impact) - Math.abs(a.financial_impact))
                setItems(repItems)
            }
        }
        setLoading(false)
    }

    const handleApproval = async (status: 'approved' | 'rejected') => {
        if (!confirm(`Tem certeza que deseja ${status === 'approved' ? 'APROVAR e AJUSTAR O ESTOQUE FISICAMENTE' : 'REPROVAR'} a contagem?`)) return

        setProcessing(true)

        const { data: { user } } = await supabase.auth.getUser()

        if (status === 'approved') {
            const { error: rpcErr } = await supabase.rpc('approve_audit_report', { p_report_id: reportId, p_user_id: user?.id })

            if (rpcErr) {
                toast.error(rpcErr.message || "Erro ao efetivar transação de estoque no banco.")
                setProcessing(false)
                return
            }
            toast.success("Auditoria aprovada e estoque físico ajustado!")
        } else {
            // Rejeição Simples
            const { error: repErr } = await supabase.from('audit_reports').update({
                status_approval: status,
                approved_by: user?.id,
                approved_at: new Date().toISOString()
            }).eq('id', reportId)

            if (repErr) {
                toast.error("Erro ao reprovar: " + repErr.message)
                setProcessing(false)
                return
            }
            // Manteve log isolado pra reprova
            await supabase.from('audit_logs').insert([{ action: status, user_id: user?.id, entity_type: 'audit_report', entity_id: reportId }])
            toast.success("Auditoria reprovada/descartada.")
        }

        setProcessing(false)
        load()
    }

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>
    if (!report) return <div className="p-4 text-center">Relatório não encontrado.</div>

    const isPending = report.status_approval === 'pending'
    const isApproved = report.status_approval === 'approved'

    // filter only divergences
    const divergentItems = items.filter(i => i.divergence !== 0)

    return (
        <div className="p-4 space-y-6 pb-24">
            <div className="flex items-center space-x-3 mt-2">
                <button onClick={() => router.push('/dashboard/admin/reports')} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Relatório</p>
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{report.routines?.name}</h2>
                </div>
            </div>

            {/* DASHBOARD CARDS */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Acurácia</span>
                    <span className="text-2xl font-black text-indigo-600">{report.accuracy_percentage.toFixed(1)}%</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Divergência Financeira</span>
                    <span className={`text-xl font-black ${report.divergence_value < 0 ? 'text-red-500' : 'text-gray-900'}`}>{formatMoney(report.divergence_value)}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Teórico $</span>
                    <span className="text-lg font-bold text-gray-700">{formatMoney(report.total_theoretical_value)}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Contado $</span>
                    <span className="text-lg font-bold text-gray-700">{formatMoney(report.total_counted_value)}</span>
                </div>
            </div>

            {/* DIV TABLE MOBILE VIEW */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1 mb-3">Itens com Diferência ({divergentItems.length})</h3>

                {divergentItems.length === 0 ? (
                    <div className="bg-green-50 p-6 rounded-2xl border border-green-200 text-center text-green-700 font-bold flex flex-col items-center">
                        <CheckCircle className="w-10 h-10 mb-2 text-green-500" />
                        Estoque perfeitamente batido. Parabéns à operação!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {divergentItems.map(i => (
                            <div key={i.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start border-b border-gray-50 pb-2 mb-2">
                                    <h4 className="font-bold text-gray-900 text-sm">{i.items?.name}</h4>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i.divergence > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {i.divergence > 0 ? '+' : ''}{i.divergence} {i.items?.unit}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-400 font-semibold block">Teórico vs Real</span>
                                        <span className="font-bold text-gray-700">{i.theoretical_quantity} <ArrowLeft className="inline w-3 h-3 mx-0.5 text-gray-300" /> {i.counted_quantity}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-gray-400 font-semibold block">Impacto DRE</span>
                                        <span className="font-bold text-gray-700">{formatMoney(i.financial_impact)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isPending && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 flex space-x-3 max-w-md mx-auto">
                    <button
                        disabled={processing}
                        onClick={() => handleApproval('rejected')}
                        className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl active:scale-95 transition flex flex-col items-center justify-center min-w-[80px]"
                    >
                        {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <XCircle className="w-6 h-6" />}
                        <span className="text-[10px] font-bold mt-1 uppercase">Reprovar</span>
                    </button>
                    <button
                        disabled={processing}
                        onClick={() => handleApproval('approved')}
                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex flex-col justify-center items-center active:scale-95 transition shadow-sm hover:bg-indigo-700"
                    >
                        {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                        <span className="text-xs mt-1 uppercase tracking-wider">Aprovar & Ajustar</span>
                    </button>
                </div>
            )}

            {isApproved && (
                <div className="bg-green-50 p-4 rounded-xl border border-green-200 flex items-center justify-center text-green-700 font-bold mb-8">
                    <CheckCircle className="w-5 h-5 mr-2" /> Auditoria Aprovada e Atualizada
                </div>
            )}
            {report.status_approval === 'rejected' && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-center justify-center text-red-700 font-bold mb-8">
                    <XCircle className="w-5 h-5 mr-2" /> Auditoria Reprovada/Descartada
                </div>
            )}

        </div>
    )
}
