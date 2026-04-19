"use client"

import { Map as MapIcon, ChevronRight } from 'lucide-react'
import Image from 'next/image'

export default function HouseView() {
    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-0.5 bg-[#B13A2B] rounded-full shadow-lg shadow-red-100 ring-2 ring-white/20">
                            <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Novidade</span>
                        </div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Visão da Casa</h3>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] pl-0.5 opacity-80 leading-relaxed">
                        Prévia visual da nova leitura operacional por áreas
                    </p>
                </div>
            </div>

            <div className="relative bg-white border border-gray-100 rounded-[40px] overflow-hidden shadow-2xl shadow-gray-200/40 group transition-all duration-500 hover:border-[#B13A2B]/10">
                {/* Image Container — Imersivo com Hand-Scroll no Mobile */}
                <div className="relative w-full overflow-x-auto no-scrollbar touch-pan-x cursor-grab active:cursor-grabbing">
                    <div className="relative min-w-[500px] md:min-w-full aspect-[1.44/1]">
                        <Image 
                            src="/assets/house_view.jpg" 
                            alt="Planta da Casa NaBrasa" 
                            fill
                            className="object-contain md:object-cover bg-[#F8F7F4] transition-transform duration-1000 group-hover:scale-[1.015]"
                            priority
                        />
                        
                        {/* Overlay sutil para profundidade */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />
                        
                        {/* 
                            PLACEHOLDER PARA OVERLAYS FUTUROS
                            Estrutura preparada para receber marcadores dinâmicos (Setores, Status, etc) na fase 2
                        */}
                    </div>
                </div>

                {/* Footer do Card — Premium Layout */}
                <div className="p-6 bg-white border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-[20px] flex items-center justify-center text-gray-400 group-hover:bg-red-50 group-hover:text-[#B13A2B] transition-all duration-500">
                            <MapIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Mapa Operativo</p>
                            <p className="text-sm font-bold text-gray-900">Preview dinâmico da planta NaBrasa</p>
                        </div>
                    </div>
                    
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 group-hover:bg-gray-900 group-hover:text-white transition-all duration-500">
                        <ChevronRight className="w-5 h-5" />
                    </div>
                </div>

                {/* Glow de Borda (Hover) */}
                <div className="absolute inset-0 rounded-[40px] border-2 border-transparent group-hover:border-[#B13A2B]/5 pointer-events-none transition-colors duration-500" />
            </div>
        </section>
    )
}
