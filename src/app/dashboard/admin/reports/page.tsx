'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, FileSearch, CheckCircle2, ChevronRight, Calculator, History } from 'lucide-react'
import toast from 'react-hot-toast'

type RoutineResult = {
    id: string
    name: string
    total_groups: number
    completed_groups: number
    report_id: string | null
    status_approval: string | null
    execution_id: string | null
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
            .select('id, name, snapshot_started_at')
            .order('created_at', { ascending: false })

        if (allRoutines) {
            const results: RoutineResult[] = await Promise.all(allRoutines.map(async r => {
                // Total de grupos da rotina
                const { count: tGroups } = await supabase
                    .from('routine_groups')
                    .select('id', { count: 'exact' })
                    .eq('routine_id', r.id)

                // Grupos concluídos
                let cGroups = 0
                let query = supabase
                    .from('count_sessions')
                    .select('id', { count: 'exact' })
                    .eq('routine_id', r.id)
                    .eq('status', 'completed')
                
                if (r.snapshot_started_at) {
                    query = query.gte('started_at', r.snapshot_started_at)
                } else {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    query = query.gte('started_at', today.toISOString())
                }

                const { count } = await query
                cGroups = count || 0

                // Execução ativa
                const { data: exec } = await supabase
                    .from('routine_executions')
                    .select('id')
                    .eq('routine_id', r.id)
                    .eq('status', 'active')
                    .maybeSingle()

                // Relatório mais recente da rotina
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
                    completed_groups: cGroups,
                    report_id: report?.id || null,
                    status_approval: report?.status_approval || null,
                    execution_id: exec?.id || null
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
                    <p className="text-[10px] text-gray-300">v1.0.5-audit</p>
                </div>
            </div>

            {/* Atalho Master para Auditoria */}
            <div className="bg-indigo-600 p-6 rounded-[32px] shadow-lg shadow-indigo-200 space-y-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                        <History className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-lg tracking-tight">Auditoria Master</h3>
                        <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Acesso total às contagens</p>
                    </div>
                </div>
                <button 
                    onClick={() => router.push('/dashboard/admin/history/sessions')}
                    className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition"
                >
                    Ver Todas as Sessões em Tempo Real
                </button>
                <p className="text-center text-[10px] text-indigo-200 font-medium">Use para encontrar contagens feitas fora de ciclos oficiais.</p>
            </div>

            {routines.map(r => {
                const allDone = r.total_groups > 0 && r.completed_groups >= r.total_groups
                const hasReport = !!r.report_id
                const hasCompletions = r.completed_groups > 0

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

                        <div className="border-t border-gray-50 pt-4 flex flex-col gap-2">
                            {hasReport && (
                                <button onClick={() => router.push(`/dashboard/admin/reports/${r.report_id}`)} className="w-full bg-white border border-gray-200 text-gray-800 py-3 px-4 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm hover:bg-gray-50 active:scale-95 transition">
                                    <FileSearch className="w-4 h-4 mr-2" /> Acessar Última Auditoria
                                </button>
                            )}
                            
                            {allDone && !hasReport && (
                                <button onClick={() => router.push(`/dashboard/admin/reports/generate/${r.id}`)} className="w-full bg-[#B13A2B] text-white py-3 px-4 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm hover:bg-[#8F2E21] active:scale-95 transition">
                                    <Calculator className="w-4 h-4 mr-2" /> Consolidar Dados Finais
                                </button>
                            )}

                            {hasCompletions && r.execution_id && (
                                <button onClick={() => router.push(`/dashboard/admin/history/${r.execution_id}`)} className="w-full bg-indigo-50 text-indigo-700 py-3 px-4 rounded-xl flex items-center justify-center font-bold text-sm hover:bg-indigo-100 active:scale-95 transition border border-indigo-100">
                                    <FileSearch className="w-4 h-4 mr-2" /> Ver Detalhes das Contagens Atuais
                                </button>
                            )}

                            {!allDone && !hasCompletions && (
                                <button onClick={() => toast.error('Conclua a contagem em todos os locais na aba Efetuar Contagem.', { icon: '⏳' })} className="w-full bg-gray-50 text-gray-400 py-3 px-4 rounded-xl flex items-center justify-center font-bold text-sm transition border border-gray-100 cursor-not-allowed">
                                    Aguardando Operadores...
                                </button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
