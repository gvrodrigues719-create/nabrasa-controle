'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ClipboardList, ChevronRight, Loader2, ArrowLeft } from 'lucide-react'

type Routine = {
    id: string
    name: string
    frequency: string
}

export default function ActiveRoutinesPage() {
    const [routines, setRoutines] = useState<Routine[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        async function load() {
            const { data } = await supabase.from('routines').select('*').eq('active', true).order('created_at', { ascending: false })
            if (data) setRoutines(data)
            setLoading(false)
        }
        load()
    }, [])

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center space-x-3 mb-6 mt-2">
                <button onClick={() => router.push('/dashboard')} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Rotinas Ativas</h2>
            </div>

            {routines.length === 0 ? (
                <div className="text-center py-10 px-4 text-gray-500 bg-white rounded-2xl border border-gray-200 border-dashed">
                    <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="font-medium text-gray-600">Nenhuma rotina ativa no momento.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {routines.map(r => (
                        <button
                            key={r.id}
                            onClick={() => router.push(`/dashboard/routines/${r.id}`)}
                            className="w-full bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center hover:border-indigo-300 hover:shadow-md transition-all active:scale-95"
                        >
                            <div className="text-left">
                                <h3 className="font-bold text-gray-900 text-lg">{r.name}</h3>
                                <p className="text-sm font-semibold text-gray-400 mt-1 uppercase tracking-wider">
                                    {r.frequency === 'daily' ? 'Diária' : r.frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                                </p>
                            </div>
                            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                                <ChevronRight className="w-6 h-6" />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
