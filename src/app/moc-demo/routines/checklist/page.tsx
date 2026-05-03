
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMocDemoStore } from '@/demo/use-moc-demo-store'
import { ClipboardList, ChevronLeft, Check, Sparkles, AlertCircle } from 'lucide-react'

export default function DemoChecklistPreview() {
    const router = useRouter()
    const { activeUser, completeTask, addEvent } = useMocDemoStore()
    
    const [items, setItems] = useState([
        { id: '1', task: 'Verificar temperatura das geladeiras', completed: false, category: 'Segurança Alimentar' },
        { id: '2', task: 'Conferir alinhamento das mesas do salão', completed: false, category: 'Padrão Visual' },
        { id: '3', task: 'Validar limpeza do balcão de atendimento', completed: false, category: 'Operação' },
        { id: '4', task: 'Checar estoque de descartáveis (copos/canudos)', completed: false, category: 'Suprimentos' },
    ])

    const [isFinished, setIsFinished] = useState(false)

    if (!activeUser) return null

    const toggleItem = (id: string) => {
        setItems(items.map(item => 
            item.id === id ? { ...item, completed: !item.completed } : item
        ))
    }

    const completedCount = items.filter(i => i.completed).length
    const progress = (completedCount / items.length) * 100

    const handleFinish = () => {
        if (completedCount < items.length) return
        completeTask(activeUser.primary_area || 'area1', 100)
        addEvent('completion', `${activeUser.name} concluiu o checklist de abertura (Preview)`)
        setIsFinished(true)
    }

    if (isFinished) {
        return (
            <div className="flex flex-col min-h-screen bg-white">
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
                    <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-6 shadow-lg shadow-blue-50">
                        <Sparkles className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-black text-[#1b1c1a] mb-2">Checklist Concluído!</h2>
                    <p className="text-sm text-[#8c716c] mb-8">Esta é uma prévia da próxima rotina do MOC.</p>
                    
                    <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 mb-8 w-full max-w-xs text-left">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Bônus de Lançamento</p>
                        <p className="text-sm font-bold text-blue-900 leading-relaxed">
                            Em breve, esta rotina será integrada permanentemente com validação por foto e IA.
                        </p>
                    </div>

                    <button 
                        onClick={() => router.push('/moc-demo/dashboard')}
                        className="w-full max-w-xs py-4 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F7F4]">
            <header className="p-6 bg-white flex items-center justify-between border-b border-gray-100">
                <button onClick={() => router.back()} className="w-10 h-10 rounded-2xl bg-[#F8F7F4] flex items-center justify-center text-[#8c716c] active:scale-90 transition-all">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3" /> Preview
                    </h3>
                    <p className="text-sm font-black text-[#1b1c1a]">Checklist Diário</p>
                </div>
                <div className="w-10" />
            </header>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Progress Card */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-[10px] font-black text-[#c0b3b1] uppercase tracking-[0.2em]">Progresso do Checklist</p>
                            <h4 className="text-lg font-black text-[#1b1c1a]">{completedCount} de {items.length} itens</h4>
                        </div>
                        <div className="text-2xl font-black text-blue-600">{Math.round(progress)}%</div>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
                            style={{ width: `${progress}%` }} 
                        />
                    </div>
                </div>

                <section className="space-y-3">
                    <h3 className="text-[10px] font-black text-[#c0b3b1] uppercase tracking-[0.2em] px-1">Itens de Verificação</h3>
                    
                    {items.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            className={`w-full flex items-center gap-4 p-5 rounded-3xl border transition-all text-left ${
                                item.completed ? 'bg-white border-blue-100 shadow-sm' : 'bg-white/50 border-[#eeedea]'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                item.completed ? 'bg-blue-600 text-white animate-in zoom-in' : 'bg-gray-100 text-gray-300'
                            }`}>
                                {item.completed && <Check className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className={`text-[8px] font-black uppercase tracking-widest ${item.completed ? 'text-blue-400' : 'text-gray-400'}`}>
                                    {item.category}
                                </span>
                                <p className={`text-sm font-bold leading-tight ${item.completed ? 'text-[#1b1c1a] line-through opacity-50' : 'text-[#58413e]'}`}>
                                    {item.task}
                                </p>
                            </div>
                        </button>
                    ))}
                </section>

                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3 mt-4">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                        Esta é apenas uma demonstração visual. No sistema real, checkouts com pendências críticas podem exigir evidência fotográfica.
                    </p>
                </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100">
                <button 
                    disabled={completedCount < items.length}
                    onClick={handleFinish}
                    className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all shadow-xl ${
                        completedCount === items.length 
                        ? 'bg-blue-600 text-white shadow-blue-100' 
                        : 'bg-gray-100 text-gray-300 shadow-none cursor-not-allowed'
                    }`}
                >
                    Finalizar Checklist
                </button>
            </div>
        </div>
    )
}
