"use client"

import { Map as MapIcon, Maximize2 } from 'lucide-react'
import Image from 'next/image'

export default function HouseView() {
    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-[#B13A2B] rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Visão da Casa</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-full">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Live Demo</span>
                </div>
            </div>

            <div className="relative bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm shadow-gray-200/50 group">
                {/* Image Container with Horizontal Scroll for Mobile if needed */}
                <div className="relative w-full overflow-x-auto no-scrollbar touch-pan-x">
                    <div className="relative min-w-[500px] md:min-w-full aspect-[10.1/7] md:aspect-[1.44/1]">
                        <Image 
                            src="/assets/house_view.png" 
                            alt="Planta da Casa NaBrasa" 
                            fill
                            className="object-contain bg-[#F8F7F4] transition-transform duration-700 group-hover:scale-[1.01]"
                            priority
                        />

                        
                        {/* Overlay Gradiente suave para profundidade */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                        
                        {/* 
                            ESTRUTURA PREPARADA PARA OVERLAYS FUTUROS
                            Aqui entrarão os marcadores absolutos de setor, status, etc.
                        */}
                    </div>
                </div>

                {/* Legenda/Footer do Card */}
                <div className="p-5 bg-white border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-50 rounded-xl text-gray-400 group-hover:text-[#B13A2B] transition-colors">
                            <MapIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Mapa Operacional</p>
                            <p className="text-xs font-bold text-gray-900">Visão geral dos setores e fluxo</p>
                        </div>
                    </div>
                    
                    <button className="p-3 bg-gray-50 text-gray-300 rounded-2xl hover:bg-gray-100 hover:text-gray-600 transition-all active:scale-95">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Glow decorativo no hover */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#B13A2B]/5 rounded-[32px] pointer-events-none transition-colors" />
            </div>
        </section>
    )
}
