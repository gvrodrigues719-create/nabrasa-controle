"use client"

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Map as MapIcon, ChevronRight, X, Maximize2, Move, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { getAreasDiagnosticAction, AreaDiagnostic } from '@/app/actions/groupsAction'

export default function HouseView() {
    const [isExpanded, setIsExpanded] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [diagnostics, setDiagnostics] = useState<AreaDiagnostic[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setMounted(true)
        fetchStatus()
        
        if (isExpanded) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [isExpanded])

    const fetchStatus = async () => {
        const res = await getAreasDiagnosticAction()
        if (res.success && res.data) {
            setDiagnostics(res.data)
        }
        setLoading(false)
    }

    const renderModal = () => {
        if (!isExpanded || !mounted) return null

        const modalContent = (
            <div className="fixed inset-0 z-[9999] flex flex-col bg-black animate-in fade-in zoom-in duration-300">
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-xl" 
                    onClick={() => setIsExpanded(false)} 
                />
                
                <div className="relative z-10 p-6 pt-8 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                            <MapIcon className="w-4 h-4 text-[#B13A2B]" />
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Mapa da Unidade</h3>
                        </div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Toque e arraste para explorar</p>
                    </div>
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="w-12 h-12 rounded-2xl bg-[#B13A2B] flex items-center justify-center text-white shadow-lg active:scale-90 transition-all border border-[#B13A2B]"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="relative flex-1 overflow-auto no-scrollbar flex items-center bg-[#111]">
                    <div className="relative min-w-[800px] md:min-w-full w-full aspect-[2.4/1] mx-auto">
                        <Image 
                            src="/assets/house_view.jpg" 
                            alt="Mapa Expandido" 
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 pointer-events-none md:hidden">
                        <Move className="w-3 h-3 text-white/50" />
                        <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">Arraste para os lados</span>
                    </div>
                </div>

                <div className="relative z-10 p-6 pb-10 bg-gradient-to-t from-black to-transparent">
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="w-full py-5 bg-white text-[#1b1c1a] rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
                    >
                        Fechar Visualização
                    </button>
                </div>
            </div>
        )

        return createPortal(modalContent, document.body)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-50/50 border-emerald-100/50 text-emerald-800'
            case 'delayed': return 'bg-red-50/50 border-red-100/50 text-red-800'
            case 'pending': return 'bg-amber-50/50 border-amber-100/50 text-amber-800'
            default: return 'bg-gray-50 border-gray-100 text-gray-800'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'completed': return 'Em dia'
            case 'delayed': return 'Atrasado'
            case 'pending': return 'Em aberto'
            default: return 'Indefinido'
        }
    }

    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            <div 
                onClick={() => setIsExpanded(true)}
                className="relative bg-[#f8f9fa] border border-[#eceef0] rounded-[2.5rem] overflow-hidden shadow-sm shadow-gray-200/30 group transition-all duration-500 hover:border-[#B13A2B]/20 cursor-pointer active:scale-[0.99]"
            >
                <div className="relative w-full aspect-[2.4/1] md:aspect-[3.5/1] overflow-hidden bg-[#F8F7F4]">
                    <Image 
                        src="/assets/house_view.jpg" 
                        alt="Planta da Casa NaBrasa" 
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-[1.05]"
                        priority
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/5 to-transparent pointer-events-none" />
                    
                    <div className="absolute top-5 left-6 flex flex-col gap-1.5 pointer-events-none">
                        <div className="flex items-center gap-2">
                             <div className="bg-[#B13A2B] px-2 py-0.5 rounded-full shadow-lg text-[7px] font-black text-white uppercase tracking-[0.2em]">
                                Novidade
                            </div>
                            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em] drop-shadow-sm">Visão da Casa</h3>
                        </div>
                        <p className="text-[10px] font-bold text-white/70 tracking-tight leading-none drop-shadow-sm max-w-[200px]">
                            Leitura operacional por áreas
                        </p>
                    </div>

                    <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                         <Maximize2 className="w-4 h-4" />
                    </div>
                </div>

                <div className="px-6 py-4 bg-white flex flex-col gap-4 border-t border-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-[#B13A2B]/10 group-hover:text-[#B13A2B] transition-all">
                                <MapIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-[#1b1c1a] tracking-tight leading-none mb-1">Mapa Operativo</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Status por áreas</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-[#B13A2B] uppercase tracking-tighter group-hover:translate-x-1 transition-transform">
                            Ver Mapa <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                        {loading ? (
                            <div className="col-span-2 py-4 flex justify-center">
                                <Loader2 className="w-4 h-4 text-gray-200 animate-spin" />
                            </div>
                        ) : diagnostics.length > 0 ? (
                            diagnostics.slice(0, 4).map(diag => (
                                <div key={diag.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${getStatusColor(diag.status)}`}>
                                    <span className="text-[9px] font-black uppercase tracking-tight truncate max-w-[60px]">{diag.name}</span>
                                    <span className="text-[8px] font-bold uppercase whitespace-nowrap">{getStatusLabel(diag.status)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-2 p-4 text-center bg-gray-50 rounded-xl">
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Nenhuma área ativa hoje</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[8px] font-medium text-gray-400 italic">
                            Visão coletiva da unidade. Detalhes nominais restritos à gestão.
                        </p>
                    </div>
                </div>
            </div>

            {renderModal()}
        </section>
    )
}
