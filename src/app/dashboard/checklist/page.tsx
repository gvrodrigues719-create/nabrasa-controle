import Link from 'next/link'
import { ArrowLeft, ClipboardList, CheckCircle2, ChevronRight, Sunrise, Sunset, Calendar, ListChecks } from 'lucide-react'
import { getChecklistTemplatesAction } from '@/app/actions/checklistAction'

export default async function ChecklistSelectionPage() {
    const res = await getChecklistTemplatesAction()
    const templates = res.success ? res.data || [] : []

    // Helper para ícones de contexto
    const getContextIcon = (context: string) => {
        switch (context) {
            case 'opening': return <Sunrise className="w-5 h-5 text-amber-500" />
            case 'closing': return <Sunset className="w-5 h-5 text-indigo-500" />
            case 'daily': return <Calendar className="w-5 h-5 text-green-500" />
            default: return <ListChecks className="w-5 h-5 text-blue-500" />
        }
    }

    // Helper para labels de contexto
    const getContextLabel = (context: string) => {
        switch (context) {
            case 'opening': return 'Abertura'
            case 'closing': return 'Fechamento'
            case 'daily': return 'Diário'
            case 'receiving': return 'Recebimento'
            default: return 'Geral'
        }
    }

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-10">
            {/* HEADER */}
            <header className="bg-white border-b border-[#e9e8e5] sticky top-0 z-10 px-4 py-4 md:px-6">
                <div className="max-w-md mx-auto flex items-center gap-4">
                    <Link 
                        href="/dashboard/routines" 
                        className="p-2.5 bg-white rounded-xl shadow-sm border border-[#e9e8e5] text-[#58413e] hover:bg-gray-50 active:scale-95 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-black text-[#1b1c1a] uppercase tracking-wider leading-none">Checklists</h1>
                        <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest mt-1">Selecione a rotina</p>
                    </div>
                </div>
            </header>

            <div className="max-w-md mx-auto px-5 py-8">
                {templates.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-white rounded-3xl border border-[#e9e8e5] border-dashed">
                        <ClipboardList className="w-12 h-12 mx-auto text-[#dfbfba] mb-3" />
                        <p className="font-bold text-[#58413e]">Nenhum checklist disponível.</p>
                        <p className="text-xs text-[#8c716c] mt-1">Fale com o gerente se isso for um erro.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {templates.map(t => (
                            <Link 
                                key={t.id}
                                href={`/dashboard/checklist/${t.id}`}
                                className="group bg-white rounded-[32px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-[#e9e8e5] hover:border-[#b13a2b]/30 transition-all active:scale-[0.98] block relative overflow-hidden"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="p-2 bg-[#F8F7F4] rounded-lg border border-[#eeedea]">
                                                {getContextIcon(t.context)}
                                            </div>
                                            <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest bg-[#F8F7F4] px-2.5 py-1 rounded-full border border-[#eeedea]">
                                                {getContextLabel(t.context)}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-black text-[#1b1c1a] leading-tight mb-1.5 group-hover:text-[#b13a2b] transition-colors">
                                            {t.name}
                                        </h3>
                                        <p className="text-sm text-[#8c716c] line-clamp-2 pr-4">{t.description}</p>
                                    </div>
                                    <div className="mt-1 bg-[#F8F7F4] p-2 rounded-xl border border-[#eeedea] group-hover:bg-[#b13a2b] group-hover:text-white transition-all">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                                
                                {/* Indicador Visual Sutil */}
                                <div className="absolute bottom-0 right-0 w-24 h-24 bg-[#b13a2b]/[0.02] rounded-full -mr-12 -mb-12 group-hover:bg-[#b13a2b]/[0.05] transition-colors" />
                            </Link>
                        ))}
                    </div>
                )}

                {/* INFO DISCRETA */}
                <div className="mt-10 px-2 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 rounded-full border border-[#e9e8e5] shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#b13a2b]" />
                        <span className="text-[9px] font-bold text-[#8c716c] uppercase tracking-widest">Rotinas de qualidade NaBrasa</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
