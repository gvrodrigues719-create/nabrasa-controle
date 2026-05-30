'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import React, { use } from 'react'

export default function GenerateReportPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    // The [id] param is the routine_id (passed from reports/page.tsx via r.id)
    const { id: routineId } = use(params)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        generate()
    }, [])

    const generate = async () => {
        try {
            // 1. Resolve the latest execution for this routine
            //    (created when the manager clicks "Iniciar Ciclo Oficial")
            const { data: latestExec } = await supabase
                .from('routine_executions')
                .select('id')
                .eq('routine_id', routineId)
                .order('started_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            const executionId = latestExec?.id || null

            // 2. Check if a report already exists for this execution (or routine if no exec)
            let existingQuery = supabase.from('audit_reports').select('id')
            if (executionId) {
                existingQuery = existingQuery.eq('execution_id', executionId)
            } else {
                // Fallback: most recent report for this routine
                existingQuery = (existingQuery as any)
                    .eq('routine_id', routineId)
                    .order('created_at', { ascending: false })
                    .limit(1)
            }
            const { data: existing } = await existingQuery.maybeSingle()
            if (existing) {
                router.push(`/dashboard/admin/reports/${existing.id}`)
                return
            }

            // 3. Fetch completed sessions.
            //    Prefer by execution_id when available; otherwise use snapshot_started_at.
            let sessions: { id: string }[] | null = null

            if (executionId) {
                const { data } = await supabase
                    .from('count_sessions')
                    .select('id')
                    .eq('execution_id', executionId)
                    .eq('status', 'completed')
                sessions = data
            } else {
                // Fallback: sessions for this routine since snapshot_started_at
                const { data: routineData } = await supabase
                    .from('routines')
                    .select('snapshot_started_at')
                    .eq('id', routineId)
                    .single()

                if (!routineData?.snapshot_started_at) {
                    throw new Error('Ciclo não iniciado oficialmente. Peça ao gerente para iniciar o ciclo antes de consolidar.')
                }

                const { data } = await supabase
                    .from('count_sessions')
                    .select('id')
                    .eq('routine_id', routineId)
                    .eq('status', 'completed')
                    .gte('started_at', routineData.snapshot_started_at)
                sessions = data
            }

            if (!sessions || sessions.length === 0) {
                throw new Error('Nenhuma sessão de contagem finalizada encontrada para este ciclo.')
            }

            const sessionIds = sessions.map(s => s.id)

            // 4. Aggregate counted quantities per item
            const { data: countedItems } = await supabase
                .from('count_session_items')
                .select('item_id, counted_quantity')
                .in('session_id', sessionIds)

            const agg: Record<string, number> = {}
            if (countedItems) {
                for (const c of countedItems) {
                    if (c.counted_quantity === null) continue
                    if (!agg[c.item_id]) agg[c.item_id] = 0
                    agg[c.item_id] += Number(c.counted_quantity)
                }
            }

            const itemIds = Object.keys(agg)
            if (itemIds.length === 0) throw new Error('A contagem está vazia.')

            // 5. Fetch theoretical snapshot.
            //    Prefer by execution_id; fallback by routine_id (latest snapshot per item).
            let theo: { item_id: string, theoretical_quantity_snapshot: number, average_cost_snapshot: number }[] | null = null

            if (executionId) {
                const { data } = await supabase
                    .from('routine_theoretical_snapshot')
                    .select('item_id, theoretical_quantity_snapshot, average_cost_snapshot')
                    .eq('execution_id', executionId)
                    .in('item_id', itemIds)
                theo = data
            } else {
                // No execution: grab last snapshot per item for this routine
                const { data } = await supabase
                    .from('routine_theoretical_snapshot')
                    .select('item_id, theoretical_quantity_snapshot, average_cost_snapshot')
                    .eq('routine_id', routineId)
                    .in('item_id', itemIds)
                    .order('created_at', { ascending: false })
                theo = data
            }

            const costMap: Record<string, number> = {}
            const theoMap: Record<string, number> = {}

            if (!theo || theo.length === 0) {
                toast.error('Aviso: Nenhum snapshot teórico encontrado. Estoque teórico base assumido como 0.')
            }

            // Deduplicate: take first occurrence per item_id (already ordered desc by created_at)
            theo?.forEach(t => {
                if (theoMap[t.item_id] === undefined) {
                    theoMap[t.item_id] = Number(t.theoretical_quantity_snapshot || 0)
                    costMap[t.item_id] = Number(t.average_cost_snapshot || 0)
                }
            })

            // 6. Calculate divergences & financial impact
            let totalTheoValue = 0
            let totalCountedValue = 0
            let totalDivergValue = 0

            const reportItems = itemIds.map(iId => {
                const counted = agg[iId]
                const theoretical = theoMap[iId] ?? 0
                const cost = costMap[iId] ?? 0
                const div = counted - theoretical
                const finImpact = div * cost

                totalTheoValue += (theoretical * cost)
                totalCountedValue += (counted * cost)
                totalDivergValue += finImpact

                return {
                    item_id: iId,
                    theoretical_quantity: theoretical,
                    counted_quantity: counted,
                    divergence: div,
                    unit_cost: cost,
                    financial_impact: finImpact
                }
            })

            const accuracy = totalTheoValue > 0
                ? (totalCountedValue / totalTheoValue) * 100
                : (totalCountedValue > 0 ? 0 : 100)

            // 7. Create the audit report
            const { data: rep, error: rErr } = await supabase
                .from('audit_reports')
                .insert([{
                    routine_id: routineId,
                    execution_id: executionId, // may be null for legacy cycles
                    total_theoretical_value: totalTheoValue,
                    total_counted_value: totalCountedValue,
                    divergence_value: totalDivergValue,
                    accuracy_percentage: accuracy,
                    status_approval: 'pending'
                }])
                .select('id')
                .single()

            if (rErr) throw rErr

            if (rep) {
                const insertItems = reportItems.map(ri => ({ ...ri, audit_report_id: rep.id }))
                await supabase.from('audit_report_items').insert(insertItems)
                router.push(`/dashboard/admin/reports/${rep.id}`)
            }

        } catch (err: any) {
            setError(err.message || 'Erro desconhecido ao gerar.')
        }
    }

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center">
                <h2 className="text-xl font-bold text-red-900 mb-2">Ops! Ocorreu um erro.</h2>
                <p className="text-red-600 font-medium">{error}</p>
                <button onClick={() => router.push('/dashboard/admin/reports')} className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold">Voltar</button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center text-center">
                <div className="bg-[#FDF0EF] p-4 rounded-full mb-6">
                    <Loader2 className="w-12 h-12 text-[#B13A2B] animate-spin" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Consolidando Auditoria</h2>
                <p className="text-gray-500 mt-3 max-w-sm font-medium">Cruzando as contagens dos operadores com o estoque do sistema. Isso pode levar alguns segundos.</p>
            </div>
        </div>
    )
}
