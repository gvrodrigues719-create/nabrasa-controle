'use client'

import React, { useEffect, useState } from 'react'
import { MapPin, RefreshCw } from 'lucide-react'
import AreaDiagnosticCard from '../components/operator/AreaDiagnosticCard'
import { getAreasDiagnosticAction, AreaDiagnostic } from '@/app/actions/groupsAction'
import BottomNav from '../components/operator/BottomNav'
import Header from '../components/operator/Header'
import { toast } from 'react-hot-toast'

export default function AreasDiagnosticPage() {
    const [diagnostics, setDiagnostics] = useState<AreaDiagnostic[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    async function loadData(isRefresh = false) {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        
        const res = await getAreasDiagnosticAction()
        if (res.success && res.data) {
            setDiagnostics(res.data)
        } else {
            toast.error('Erro ao carregar diagnóstico das áreas')
        }
        
        setLoading(false)
        setRefreshing(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F7F4]">
            <Header />
            
            <main className="flex-1 p-6 pb-24 overflow-y-auto space-y-6">
                <header className="flex items-center justify-between px-1">
                    <div>
                        <h3 className="text-[10px] font-black text-[#8c716c] uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                            <MapPin className="w-4 h-4 text-[#B13A2B]" /> Diagnóstico das Áreas
                        </h3>
                        <p className="text-xs text-[#8c716c] font-medium">Situação operacional em tempo real por setor</p>
                    </div>
                    <button 
                        onClick={() => loadData(true)}
                        disabled={loading || refreshing}
                        className={`p-2 bg-white rounded-full border border-[#eeedea] text-[#8c716c] transition-all hover:bg-[#F8F7F4] active:scale-95 ${refreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </header>

                <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {loading ? (
                        // Skeletons
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="h-40 bg-white rounded-[2rem] border border-[#eeedea] animate-pulse" />
                        ))
                    ) : diagnostics.length > 0 ? (
                        diagnostics.map((area) => (
                            <AreaDiagnosticCard 
                                key={area.id}
                                {...area}
                            />
                        ))
                    ) : (
                        <div className="bg-white border border-dashed border-gray-200 rounded-[2rem] p-12 text-center">
                            <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-sm font-bold text-gray-400">Nenhuma área cadastrada no sistema.</p>
                        </div>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    )
}
