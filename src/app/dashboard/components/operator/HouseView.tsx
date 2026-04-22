"use client"

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Map as MapIcon, ChevronRight, X, Maximize2, Loader2, Zap } from 'lucide-react'
import Image from 'next/image'
import { getAreasDiagnosticAction, AreaDiagnostic } from '@/app/actions/groupsAction'

// Mapeamento lógico de coordenadas para os setores na planta
const AREA_COORDINATES: Record<string, { x: number, y: number }> = {
    'Cozinha': { x: 42, y: 34 },
    'Cozinha (Carnes)': { x: 34, y: 32 },
    'Cozinha (Geral)': { x: 48, y: 32 },
    'Salão': { x: 60, y: 64 },
    'Caixa': { x: 82, y: 74 },
    'Delivery': { x: 84, y: 44 },
    'Estoque': { x: 22, y: 34 },
    'Churrasqueira': { x: 48, y: 16 },
    'Bar': { x: 72, y: 46 },
    'Hortifruti': { x: 28, y: 68 },
    'Limpeza': { x: 16, y: 82 },
    'Copa': { x: 55, y: 30 },
    'Apoio': { x: 40, y: 55 },
    'Produção': { x: 30, y: 20 }
}

// Helper para converter nomes longos do banco em nomes curtos oficiais para o mapa
function getShortName(fullName: string) {
    const nameMap: Record<string, string> = {
        'Cozinha (Carnes)': 'Cozinha',
        'Cozinha (Geral)': 'Cozinha',
        'Cozinha Principal': 'Cozinha',
        'Salão Principal': 'Salão',
        'Caixa Central': 'Caixa',
        'Estoque Geral': 'Estoque',
        'Churrasqueira (Área)': 'Churrasqueira',
        'Delivery Express': 'Delivery',
    }
    return nameMap[fullName] || fullName
}

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

    const getStatusTheme = (status: string) => {
        switch (status) {
            case 'completed': return {
                bg: 'bg-[#10B981]', 
                text: 'text-white',
                label: 'Em dia',
                dot: 'bg-white'
            }
            case 'attention': return {
                bg: 'bg-[#FBBF24]', 
                text: 'text-black',
                label: 'Em atenção',
                dot: 'bg-black/40'
            }
            case 'pending': return {
                bg: 'bg-[#F59E0B]', 
                text: 'text-white',
                label: 'Pendente',
                dot: 'bg-white'
            }
            case 'delayed': return {
                bg: 'bg-[#F87171]', 
                text: 'text-white',
                label: 'Em atraso',
                dot: 'bg-white'
            }
            case 'critical': return {
                bg: 'bg-[#EF4444]', 
                text: 'text-white',
                label: 'Crítico',
                dot: 'bg-white animate-pulse'
            }
            default: return {
                bg: 'bg-gray-300', 
                text: 'text-gray-600',
                label: 'Sem leitura',
                dot: 'bg-gray-400'
            }
        }
    }

    const renderOverlays = (isLarge = false) => {
        return diagnostics.map(diag => {
            const coords = AREA_COORDINATES[diag.name] || AREA_COORDINATES[getShortName(diag.name)] || { x: 50, y: 50 }
            const theme = getStatusTheme(diag.status)
            const displayName = isLarge ? diag.name : getShortName(diag.name)
            
            return (
                <div 
                    key={diag.id}
                    className={`absolute transition-all duration-700 flex flex-col items-center gap-1 z-20`}
                    style={{ 
                        left: `${coords.x}%`, 
                        top: `${coords.y}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <div className={`
                        flex items-center gap-1.5 px-2.5 py-1 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-white/20
                        ${theme.bg} ${theme.text}
                        ${isLarge ? 'scale-110 px-3 py-1.5' : 'scale-[0.8] md:scale-90'}
                        transition-all hover:scale-105 cursor-default
                    `}>
                        <div className={`w-1 h-1 rounded-full ${theme.dot}`} />
                        <span className="text-[10px] font-black uppercase tracking-tight whitespace-nowrap truncate max-w-[100px]">
                            {displayName}
                        </span>
                    </div>
                    {isLarge && (
                        <span className="bg-black/60 backdrop-blur-sm text-[8px] font-black text-white/90 px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/5">
                            {theme.label}
                        </span>
                    )}
                </div>
            )
        })
    }

    const renderModal = () => {
        if (!isExpanded || !mounted) return null

        const modalContent = (
            <div className="fixed inset-0 z-[9999] flex flex-col bg-[#0a0a0a] animate-in fade-in zoom-in duration-300">
                <div 
                    className="absolute inset-0 bg-black/80 backdrop-blur-2xl" 
                    onClick={() => setIsExpanded(false)} 
                />
                
                <div className="relative z-10 p-6 pt-8 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                            <MapIcon className="w-4 h-4 text-[#B13A2B]" />
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Mapa da Unidade</h3>
                        </div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Visualização operacional detalhada</p>
                    </div>
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="w-12 h-12 rounded-2xl bg-[#B13A2B] flex items-center justify-center text-white shadow-lg active:scale-90 transition-all border border-[#B13A2B]"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="relative flex-1 overflow-auto no-scrollbar flex items-center justify-center p-4">
                    <div className="relative w-full max-w-6xl aspect-[2.4/1] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#111]">
                        <Image 
                            src="/assets/house_view.jpg" 
                            alt="Mapa Expandido" 
                            fill
                            className="object-cover"
                            priority
                        />
                        <div className="absolute inset-0 bg-black/10" />
                        {renderOverlays(true)}
                    </div>
                </div>

                <div className="relative z-10 p-6 pb-12 flex justify-center">
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
        )

        return createPortal(modalContent, document.body)
    }

    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            <div 
                onClick={() => setIsExpanded(true)}
                className="relative bg-white border border-[#eceef0] rounded-[2.5rem] overflow-hidden shadow-sm shadow-gray-200/30 group transition-all duration-500 hover:border-[#B13A2B]/20 cursor-pointer active:scale-[0.99]"
            >
                {/* PLANTA COM OVERLAYS */}
                <div className="relative w-full aspect-[2/1] md:aspect-[3/1] overflow-hidden bg-[#F8F7F4]">
                    <Image 
                        src="/assets/house_view.jpg" 
                        alt="Planta da Casa NaBrasa" 
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-[1.03]"
                        priority
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
                    
                    {/* Status Badges Over Image */}
                    {!loading && renderOverlays(false)}

                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-30">
                            <Loader2 className="w-6 h-6 text-[#B13A2B] animate-spin" />
                        </div>
                    )}

                    <div className="absolute top-5 left-6 flex items-center gap-2 pointer-events-none z-30">
                         <div className="bg-[#B13A2B] px-2 py-0.5 rounded-full shadow-lg text-[7px] font-black text-white uppercase tracking-[0.2em]">
                            Ao vivo
                        </div>
                        <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em] drop-shadow-md">Mapa Operativo</h3>
                    </div>

                    <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
                         <Maximize2 className="w-4 h-4" />
                    </div>
                </div>

                {/* RODAPÉ SIMPLIFICADO */}
                <div className="px-6 py-4 bg-white flex items-center justify-between border-t border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-[#B13A2B]/10 group-hover:text-[#B13A2B] transition-all">
                            <MapIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-[#1b1c1a] tracking-tight leading-none mb-1">Status por Áreas</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">Visão em tempo real</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-[#B13A2B] uppercase tracking-tighter group-hover:translate-x-1 transition-transform">
                        Explorar Planta <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>

            {renderModal()}
        </section>
    )
}
