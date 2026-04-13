'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import React, { use } from 'react'

export default function GenerateReportPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id: routineId } = use(params)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        generate()
    }, [])

    const generate = async () => {
        try {
            // Verifying if a report already exists to prevent duplication on reload
            const { data: existing } = await supabase.from('audit_reports').select('id').eq('routine_id', routineId).maybeSingle()
            if (existing) {
                router.push(`/dashboard/admin/reports/${existing.id}`)
                return
            }

            // Fetch the sessions
            const { data: sessions } = await supabase.from('count_sessions').select('id').eq('routine_id', routineId).eq('status', 'completed')
            if (!sessions || sessions.length === 0) throw new Error("Nenhuma sessão de contagem finalizada encontrada para esta rotina.")

            const sessionIds = sessions.map(s => s.id)

            // Fetch all counted items
            const { data: countedItems } = await supabase.from('count_session_items').select('item_id, counted_quantity').in('session_id', sessionIds)

            // Group by Item (if same item in two places)
            const agg: Record<string, number> = {}
            if (countedItems) {
                for (let c of countedItems) {
                    if (c.counted_quantity === null) continue
                    if (!agg[c.item_id]) agg[c.item_id] = 0
                    agg[c.item_id] += Number(c.counted_quantity)
                }
            }

            // Fetch items theoretical details from SNAPSHOT table instead of live DB
            const itemIds = Object.keys(agg)
            if (itemIds.length === 0) throw new Error("A contagem está vazia.")

            const { data: theo } = await supabase.from('routine_theoretical_snapshot').select('item_id, theoretical_quantity_snapshot, average_cost_snapshot').eq('routine_id', routineId).in('item_id', itemIds)

            const costMap: Record<string, number> = {}
            const theoMap: Record<string, number> = {}

            if (!theo || theo.length === 0) {
                toast.error("Aviso: Nenhum snapshot teórico foi encontrado para essa contagem. Assumindo estoque prévio base como 0.")
            }

            theo?.forEach(t => {
                theoMap[t.item_id] = Number(t.theoretical_quantity_snapshot || 0)
                costMap[t.item_id] = Number(t.average_cost_snapshot || 0)
            })

            let totalTheoValue = 0
            let totalCountedValue = 0
            let totalDivergValue = 0

            const reportItems = Object.keys(agg).map(iId => {
                const counted = agg[iId]
                const theoretical = theoMap[iId] || 0
                const cost = costMap[iId] || 0
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

            const accuracy = totalTheoValue > 0 ? (totalCountedValue / totalTheoValue) * 100 : (totalCountedValue > 0 ? 0 : 100)

            // Create Report
            const { data: rep, error: rErr } = await supabase.from('audit_reports').insert([{
                routine_id: routineId,
                total_theoretical_value: totalTheoValue,
                total_counted_value: totalCountedValue,
                divergence_value: totalDivergValue,
                accuracy_percentage: accuracy,
                status_approval: 'pending'
            }]).select('id').single()

            if (rErr) throw rErr

            if (rep) {
                const rId = rep.id
                const insertItems = reportItems.map(ri => ({ ...ri, audit_report_id: rId }))
                // Insert chunk mapping
                await supabase.from('audit_report_items').insert(insertItems)

                // Feito!
                router.push(`/dashboard/admin/reports/${rId}`)
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
                <div className="bg-indigo-50 p-4 rounded-full mb-6">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Consolidando Auditoria</h2>
                <p className="text-gray-500 mt-3 max-w-sm font-medium">Cruzando as contagens dos operadores com o estoque do sistema. Isso pode levar alguns segundos.</p>
            </div>
        </div>
    )
}
