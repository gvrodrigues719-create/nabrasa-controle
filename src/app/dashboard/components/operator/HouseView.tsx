"use client"

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Map as MapIcon, ChevronRight, X, Maximize2, Loader2, Info } from 'lucide-react'
import Image from 'next/image'
import { getMacroDiagnosticAction, AreaDiagnostic } from '@/app/actions/groupsAction'

// Coordenadas refinadas para os Setores Macro da unidade
const MACRO_COORDINATES: Record<string, { x: number, y: number }> = {
    'Cozinha': { x: 38, y: 34 },
    'Salão': { x: 55, y: 64 },
    'Caixa': { x: 78, y: 74 },
    'Estoque & Delivery': { x: 82, y: 42 },
    'Churrasqueira': { x: 48, y: 18 }
}

export default function HouseView() {
    const [isExpanded, setIsExpanded] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [diagnostics, setDiagnostics] = useState<AreaDiagnostic[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSector, setSelectedSector] = useState<string | null>(null)

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
        const res = await getMacroDiagnosticAction()
        if (res.success && res.data) {
            setDiagnostics(res.data)
        }
        setLoading(false)
    }

    const getStatusTheme = (status: string) => {
        switch (status) {
            case 'completed': return {
                bg: 'bg-[#10B981]', 
                text: 'text-white',
                label: 'Em dia',
                dot: 'bg-white',
                progress: 'bg-emerald-300',
                light: 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }
            case 'attention': return {
                bg: 'bg-[#FBBF24]', 
                text: 'text-black',
                label: 'Atenção',
                dot: 'bg-black/40',
                progress: 'bg-black/20',
                light: 'bg-amber-50 text-amber-700 border-amber-100'
            }
            case 'pending': return {
                bg: 'bg-[#F59E0B]', 
                text: 'text-white',
                label: 'Pendente',
                dot: 'bg-white',
                progress: 'bg-white/30',
                light: 'bg-orange-50 text-orange-600 border-orange-100'
            }
            case 'delayed': return {
                bg: 'bg-[#F87171]', 
                text: 'text-white',
                label: 'Em atraso',
                dot: 'bg-white',
                progress: 'bg-white/40',
                light: 'bg-red-50 text-red-600 border-red-100'
            }
            case 'critical': return {
                bg: 'bg-[#EF4444]', 
                text: 'text-white',
                label: 'Crítico',
                dot: 'bg-white animate-pulse',
                progress: 'bg-white/50',
                light: 'bg-red-50 text-red-700 border-red-200'
            }
            default: return {
                bg: 'bg-gray-400', 
                text: 'text-white',
                label: 'Sem leitura',
                dot: 'bg-white/40',
                progress: 'bg-white/20',
                light: 'bg-gray-50 text-gray-400 border-gray-100'
            }
        }
    }

    const renderOverlays = (isLarge = false) => {
        return diagnostics.map(diag => {
            const coords = MACRO_COORDINATES[diag.name]
            if (!coords) return null

            const theme = getStatusTheme(diag.status)
            const isSelected = selectedSector === diag.name
            
            return (
                <div 
                    key={diag.id}
                    className={`absolute transition-all duration-700 flex flex-col items-center gap-1 z-20`}
                    style={{ 
                        left: `${coords.x}%`, 
                        top: `${coords.y}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                    onClick={(e) => {
                        if (!isLarge) {
                            e.stopPropagation()
                            setSelectedSector(diag.name === selectedSector ? null : diag.name)
                        }
                    }}
                >
                    {/* DESKTOP BADGE (Escondido em telas pequenas se não expandido) */}
                    <div className={`
                        hidden md:flex flex-col gap-1 p-1.5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.15)] border border-white/20
                        ${theme.bg} ${theme.text}
                        ${isLarge ? 'scale-110 min-w-[100px]' : 'min-w-[85px]'}
                        transition-all hover:scale-105 cursor-default
                    `}>
                        <div className="flex items-center justify-between gap-2 px-0.5">
                             <div className="flex items-center gap-1">
                                <div className={`w-1 h-1 rounded-full ${theme.dot}`} />
                                <span className="text-[9px] font-black uppercase tracking-tight whitespace-nowrap">
                                    {diag.name}
                                </span>
                            </div>
                            <span className="text-[8px] font-black opacity-90">{diag.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-black/15 rounded-full overflow-hidden border border-white/5">
                            <div className={`h-full transition-all duration-1000 ${theme.progress}`} style={{ width: `${diag.progress}%` }} />
                        </div>
                        <div className="px-0.5">
                            <span className="text-[7px] font-black uppercase tracking-[0.1em] opacity-80">{theme.label}</span>
                        </div>
                    </div>

                    {/* MOBILE MARKER (Visível apenas em telas pequenas) */}
                    <div className={`
                        md:hidden flex items-center gap-1 px-2 py-0.5 rounded-full border shadow-sm
                        ${isSelected ? theme.bg + ' ' + theme.text + ' scale-110 ring-4 ring-white/30' : theme.light}
                        transition-all duration-300
                    `}>
                        <div className={`w-1 h-1 rounded-full ${isSelected ? theme.dot : theme.bg}`} />
                        <span className="text-[8px] font-black uppercase tracking-tight whitespace-nowrap">{diag.name}</span>
                    </div>
                </div>
            )
        })
    }

    const renderMobileList = () => {
        return (
            <div className="md:hidden mt-4 space-y-3 px-1 animate-in fade-in slide-in-from-bottom-2 duration-700">
                {diagnostics.map(diag => {
                    const theme = getStatusTheme(diag.status)
                    const isSelected = selectedSector === diag.name

                    return (
                        <div 
                            key={diag.id}
                            className={`
                                p-3 rounded-2xl border transition-all duration-300
                                ${isSelected ? 'bg-white border-[#B13A2B] shadow-md -translate-y-1' : 'bg-white/50 border-gray-100'}
                            `}
                            onClick={() => setSelectedSector(diag.name === selectedSector ? null : diag.name)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${theme.bg}`} />
                                    <span className="text-[11px] font-black text-[#1b1c1a] uppercase tracking-tight">{diag.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${theme.light}`}>
                                        {theme.label}
                                    </span>
                                    <span className="text-xs font-black text-[#1b1c1a]">{diag.progress}%</span>
                                </div>
                            </div>

                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                                <div 
                                    className={`h-full transition-all duration-1000 ${theme.bg.replace('bg-', 'bg-')}`}
                                    style={{ 
                                        width: `${diag.progress}%`,
                                        backgroundColor: theme.bg.includes('#') ? theme.bg.replace('bg-[', '').replace(']', '') : undefined
                                    }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderModal = () => {
        if (!isExpanded || !mounted) return null

        const modalContent = (
            <div className="fixed inset-0 z-[9999] flex flex-col bg-[#0a0a0a] animate-in fade-in zoom-in duration-300">
                <div 
                    className="absolute inset-0 bg-black/80 backdrop-blur-2xl" 
                    onClick={() => setIsExpanded(false)} 
                />
                
                {/* Header */}
                <div className="relative z-10 p-6 pt-8 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md shrink-0">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                            <MapIcon className="w-4 h-4 text-[#B13A2B]" />
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Visão Macro da Unidade</h3>
                        </div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Leitura agregada por setores principais</p>
                    </div>
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="w-12 h-12 rounded-2xl bg-[#B13A2B] flex items-center justify-center text-white shadow-lg active:scale-90 transition-all border border-[#B13A2B]"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Map Section */}
                    <div className="relative w-full aspect-[1.8/1] md:flex-1 md:aspect-auto md:p-8 flex items-center justify-center shrink-0">
                        <div className="relative w-full h-full md:max-w-6xl md:aspect-[2.4/1] md:rounded-[2.5rem] overflow-hidden border-b md:border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#111]">
                            <Image 
                                src="/assets/house_view.jpg" 
                                alt="Mapa Expandido" 
                                fill
                                className="object-cover opacity-80"
                                priority
                            />
                            <div className="absolute inset-0 bg-black/20" />
                            {renderOverlays(true)}
                        </div>
                    </div>

                    {/* Detailed List Section (Visible on Mobile Modal) */}
                    <div className="flex-1 md:hidden overflow-y-auto no-scrollbar p-6 pt-4 space-y-4">
                        {diagnostics.map(diag => {
                            const theme = getStatusTheme(diag.status)
                            const isSelected = selectedSector === diag.name

                            return (
                                <div 
                                    key={diag.id}
                                    id={`modal-list-${diag.name}`}
                                    className={`
                                        p-4 rounded-[2rem] border transition-all duration-500
                                        ${isSelected ? 'bg-white border-[#B13A2B] shadow-2xl scale-[1.02]' : 'bg-white/5 border-white/10'}
                                    `}
                                    onClick={() => setSelectedSector(diag.name === selectedSector ? null : diag.name)}
                                >
                                    <div className="mb-2">
                                        <h4 className={`text-sm font-black uppercase tracking-tight mb-0.5 ${isSelected ? 'text-[#1b1c1a]' : 'text-white'}`}>
                                            {diag.name}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? theme.light.split(' ')[1] : 'text-white/40'}`}>
                                                {theme.label} — {diag.progress}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`w-full h-2 rounded-full overflow-hidden border ${isSelected ? 'bg-gray-100 border-gray-50' : 'bg-white/5 border-white/5'}`}>
                                        <div 
                                            className={`h-full transition-all duration-1000 ${isSelected ? theme.bg : theme.bg}`}
                                            style={{ width: `${diag.progress}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                        <div className="h-20" /> {/* Spacer */}
                    </div>

                    {/* Desktop Legend (Visible on Desktop Modal) */}
                    <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 z-10 p-6 flex justify-center">
                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 px-8 py-4 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10">
                            {['completed', 'attention', 'pending', 'delayed', 'critical', 'none'].map(s => {
                                const t = getStatusTheme(s)
                                return (
                                    <div key={s} className="flex items-center gap-2.5">
                                        <div className={`w-2 h-2 rounded-full ${t.bg}`} />
                                        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{t.label}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        )

        return createPortal(modalContent, document.body)
    }

    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            <div 
                className="relative bg-white border border-[#eceef0] rounded-[2.5rem] overflow-hidden shadow-sm shadow-gray-200/30 group transition-all duration-500 hover:border-[#B13A2B]/20"
            >
                {/* PLANTA COM OVERLAYS */}
                <div 
                    onClick={() => setIsExpanded(true)}
                    className="relative w-full aspect-[2.2/1] md:aspect-[3.2/1] overflow-hidden bg-[#F8F7F4] cursor-pointer active:scale-[0.99] transition-all"
                >
                    <Image 
                        src="/assets/house_view.jpg" 
                        alt="Planta da Casa NaBrasa" 
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-[1.03]"
                        priority
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
                    
                    {/* Macro Sector Overlays */}
                    {!loading && renderOverlays(false)}

                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-30">
                            <Loader2 className="w-6 h-6 text-[#B13A2B] animate-spin" />
                        </div>
                    )}

                    <div className="absolute top-5 left-6 flex items-center gap-2 pointer-events-none z-30">
                         <div className="bg-[#B13A2B] px-2 py-0.5 rounded-full shadow-lg text-[7px] font-black text-white uppercase tracking-[0.2em]">
                            Visão Macro
                        </div>
                        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em] drop-shadow-md">Mapa Operativo</h3>
                    </div>

                    <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
                         <Maximize2 className="w-4 h-4" />
                    </div>
                </div>

                {/* CONTEÚDO MOBILE / DESKTOP RODAPÉ */}
                <div className="px-5 py-4 bg-white border-t border-gray-50">
                    {/* LISTA MOBILE (Visível apenas em telas pequenas) */}
                    {renderMobileList()}

                    {/* RODAPÉ DESKTOP (Escondido em telas pequenas) */}
                    <div className="hidden md:flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-[#B13A2B]/10 group-hover:text-[#B13A2B] transition-all">
                                <MapIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-[#1b1c1a] tracking-tight leading-none mb-1">Status por Setores</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Leitura agregada da unidade</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="flex items-center gap-1.5 text-[10px] font-black text-[#B13A2B] uppercase tracking-tighter group-hover:translate-x-1 transition-transform"
                        >
                            Explorar Planta <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* DICA MOBILE */}
                    <div className="md:hidden flex items-center justify-center gap-2 mt-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                        <Info className="w-3 h-3" /> Toque nos setores para detalhes
                    </div>
                </div>
            </div>

            {renderModal()}
        </section>
    )
}
