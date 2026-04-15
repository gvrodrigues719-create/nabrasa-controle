'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, FileSearch, CheckCircle2, ChevronRight, Calculator } from 'lucide-react'
import toast from 'react-hot-toast'

type RoutineResult = {
    id: string
    name: string
    total_groups: number
    completed_groups: number
    report_id: string | null
    status_approval: string | null
}

export default function ReportsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [routines, setRoutines] = useState<RoutineResult[]>([])

    useEffect(() => {
        load()
    }, [])

    const load = async () => {
        setLoading(true)

        const { data: allRoutines } = await supabase
            .from('routines')
            .select('id, name')
            .order('created_at', { ascending: false })

        if (allRoutines) {
            // Calcula o "hoje" no fuso America/Sao_Paulo
            const brDate = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Sao_Paulo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date())
            const startOfDayBR = `${brDate}T03:00:00Z` // meia-noite BRT = 03:00 UTC
            const nextBrDate = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Sao_Paulo',
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(new Date(Date.now() + 86400000))
            const endOfDayBR = `${nextBrDate}T02:59:59Z`

            const results: RoutineResult[] = await Promise.all(allRoutines.map(async r => {
                // Total de grupos da rotina
                const { count: tGroups } = await supabase
                    .from('routine_groups')
                    .select('id', { count: 'exact' })
                    .eq('routine_id', r.id)

                // Grupos concluídos HOJE (count_sessions usa routine_id, não execution_id)
                const { count: cGroups } = await supabase
                    .from('count_sessions')
                    .select('id', { count: 'exact' })
                    .eq('routine_id', r.id)
                    .eq('status', 'completed')
                    .gte('started_at', startOfDayBR)
                    .lte('started_at', endOfDayBR)

                // Relatório mais recente da rotina (audit_reports usa routine_id)
                const { data: report } = await supabase
                    .from('audit_reports')
                    .select('id, status_approval')
                    .eq('routine_id', r.id)
                    .order('closed_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                return {
                    id: r.id,
                    name: r.name,
                    total_groups: tGroups || 0,
                    completed_groups: cGroups || 0,
                    report_id: report?.id || null,
                    status_approval: report?.status_approval || null
                }
            }))
            setRoutines(results)
        }
        setLoading(false)
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>

    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center mb-6 mt-2">
                <div className="flex items-center space-x-3">
                    <button onClick={() => router.push('/dashboard')} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Auditoria & Relatórios</h2>
                </div>
            </div>

            {routines.map(r => {
                const allDone = r.total_groups > 0 && r.completed_groups >= r.total_groups
                const hasReport = !!r.report_id

                return (
                    <div key={r.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{r.name}</h3>
                                <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">Grupos Contados: {r.completed_groups}/{r.total_groups}</p>
                            </div>

                            {hasReport ? (
                                r.status_approval === 'approved' ? (
                                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Aprovado</span>
                                ) : (
                                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Auditoria Pendente</span>
                                )
                            ) : allDone ? (
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Pronto para Consolidar</span>
                            ) : (
                                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Contagem em Andamento</span>
                            )}
                        </div>

                        <div className="border-t border-gray-50 pt-4 flex justify-end">
                            {hasReport ? (
                                <button onClick={() => router.push(`/dashboard/admin/reports/${r.report_id}`)} className="bg-white border border-gray-200 text-gray-800 py-2.5 px-4 rounded-xl flex items-center font-bold text-sm shadow-sm hover:bg-gray-50 active:scale-95 transition">
                                    <FileSearch className="w-4 h-4 mr-2" /> Acessar Auditoria
                                </button>
                            ) : allDone ? (
                                <button onClick={() => router.push(`/dashboard/admin/reports/generate/${r.id}`)} className="bg-[#B13A2B] text-white py-2.5 px-4 rounded-xl flex items-center font-bold text-sm shadow-sm hover:bg-[#8F2E21] active:scale-95 transition">
                                    <Calculator className="w-4 h-4 mr-2" /> Consolidar Dados
                                </button>
                            ) : (
                                <button onClick={() => toast.error('Conclua a contagem em todos os locais na aba Efetuar Contagem.', { icon: '⏳' })} className="bg-gray-100 text-gray-500 py-2.5 px-4 rounded-xl flex items-center font-bold text-sm transition active:scale-95">
                                    Aguardando Operadores
                                </button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
