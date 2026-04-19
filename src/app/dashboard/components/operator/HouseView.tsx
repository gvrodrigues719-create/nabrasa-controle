"use client"

import { Map as MapIcon, ChevronRight } from 'lucide-react'
import Image from 'next/image'

export default function HouseView() {
    return (
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-700 delay-150">
            <div className="relative bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-200/30 group transition-all duration-500 hover:border-[#B13A2B]/20">
                {/* Horizontal Panoramic Preview Wrapper */}
                <div className="relative w-full aspect-[2.4/1] md:aspect-[3.5/1] overflow-hidden bg-[#F8F7F4]">
                    <Image 
                        src="/assets/house_view.jpg" 
                        alt="Planta da Casa NaBrasa" 
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-[1.05]"
                        priority
                    />
                    
                    {/* Gradient Overlay sutil para legibilidade (Foco no topo esquerdo) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/5 to-transparent pointer-events-none" />
                    
                    {/* Integrated Header Content (Floating Labels) */}
                    <div className="absolute top-5 left-6 flex flex-col gap-1.5 pointer-events-none">
                        <div className="flex items-center gap-2">
                             <div className="bg-[#B13A2B] px-2 py-0.5 rounded-full shadow-lg">
                                <span className="text-[7px] font-black text-white uppercase tracking-[0.2em]">Novidade</span>
                            </div>
                            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em] drop-shadow-sm">Visão da Casa</h3>
                        </div>
                        <p className="text-[10px] font-bold text-white/70 tracking-tight leading-none drop-shadow-sm max-w-[200px]">
                            Leitura operacional por áreas
                        </p>
                    </div>

                    {/* Botão de Expansão Flutuante (Visual CTA) */}
                    <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                         <ChevronRight className="w-4 h-4" />
                    </div>
                </div>

                {/* Compact Footer — Uma barra de ação fina e premium */}
                <div className="px-6 py-4 bg-white flex items-center justify-between border-t border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-[#B13A2B]/10 group-hover:text-[#B13A2B] transition-all">
                            <MapIcon className="w-4 h-4" />
                        </div>
                        <p className="text-[11px] font-black text-[#1b1c1a] tracking-tight">Mapa Operativo · <span className="text-gray-400 font-bold uppercase text-[9px] tracking-widest">Acesse a planta</span></p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-[#B13A2B] uppercase tracking-tighter group-hover:translate-x-1 transition-transform">
                        Abrir <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                </div>
            </div>
        </section>
    )
}
