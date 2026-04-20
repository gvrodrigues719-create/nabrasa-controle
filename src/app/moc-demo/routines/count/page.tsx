
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMocDemoStore } from '@/demo/use-moc-demo-store'
import DemoHeader from '../../components/DemoHeader'
import { Package, ChevronLeft, Check, ArrowRight, AlertCircle, Save } from 'lucide-react'

export default function DemoCountRoutine() {
    const router = useRouter()
    const { activeUser, completeTask, addEvent } = useMocDemoStore()
    const [step, setStep] = useState(1) // 1: List, 2: Success
    const [counts, setCounts] = useState({
        'Picanha (kg)': '',
        'Maminha (kg)': '',
        'Costela (kg)': '',
        'Linguiça (kg)': ''
    })

    if (!activeUser) return null

    const handleSave = () => {
        // Complete the task in store
        completeTask('area1', 150)
        addEvent('completion', `${activeUser.name} concluiu a contagem de proteínas`)
        setStep(2)
    }

    if (step === 2) {
        return (
            <div className="flex flex-col min-h-screen bg-white">
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
                    <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6 shadow-lg shadow-emerald-50">
                        <Check className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-black text-[#1b1c1a] mb-2">Contagem Enviada!</h2>
                    <p className="text-sm text-[#8c716c] mb-8">Você ganhou 150 pontos por esta rotina.</p>
                    
                    <div className="bg-[#F8F7F4] p-4 rounded-2xl border border-[#eeedea] mb-8 w-full max-w-xs">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-[#c0b3b1] uppercase tracking-widest">Seu novo score</span>
                            <span className="text-[#B13A2B] font-black">{activeUser.weekly_points + 150} pts</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full">
                            <div className="h-full bg-[#B13A2B] rounded-full" style={{ width: '75%' }} />
                        </div>
                    </div>

                    <button 
                        onClick={() => router.push('/moc-demo/dashboard')}
                        className="w-full max-w-xs py-4 bg-[#1b1c1a] text-white rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            <header className="p-6 flex items-center justify-between border-b border-gray-50">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-2xl bg-[#F8F7F4] flex items-center justify-center text-[#8c716c] active:scale-90 transition-all">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <h3 className="text-xs font-black text-[#8c716c] uppercase tracking-[0.2em]">Rotina</h3>
                    <p className="text-sm font-black text-[#1b1c1a]">Contagem de Proteínas</p>
                </div>
                <div className="w-10" />
            </header>

            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                <section className="space-y-4">
                    <div className="bg-[#fff7f6] p-4 rounded-3xl border border-red-50 flex items-start gap-4">
                        <AlertCircle className="w-5 h-5 text-[#B13A2B] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#B13A2B] font-medium leading-relaxed">
                            Registre o peso líquido atual das proteínas em estoque para cálculo automático do CMV.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {Object.keys(counts).map((item) => (
                            <div key={item} className="flex items-center justify-between p-4 bg-[#F8F7F4] rounded-3xl border border-[#eeedea] transition-all focus-within:border-[#B13A2B]/30 focus-within:bg-white shadow-sm">
                                <div>
                                    <p className="text-sm font-black text-[#1b1c1a]">{item}</p>
                                    <p className="text-[9px] font-bold text-[#c0b3b1] uppercase tracking-widest">Peso Total</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        placeholder="0.00"
                                        className="w-20 bg-transparent text-right font-black text-[#B13A2B] focus:outline-none placeholder:opacity-20"
                                        value={counts[item as keyof typeof counts]}
                                        onChange={(e) => setCounts({...counts, [item]: e.target.value})}
                                    />
                                    <span className="text-[10px] font-black text-gray-400">KG</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="pt-4">
                    <button 
                        onClick={handleSave}
                        className="w-full py-5 bg-[#B13A2B] text-white rounded-[2rem] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-3 shadow-xl shadow-red-100 active:scale-95 transition-all"
                    >
                        <Save className="w-5 h-5" />
                        Finalizar Contagem
                    </button>
                </div>
            </div>
        </div>
    )
}
