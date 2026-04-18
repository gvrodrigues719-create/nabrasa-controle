"use client"

import { AlertCircle, Ghost, ArrowRight, Settings2 } from 'lucide-react'

interface Exception {
    type: 'dead_rule' | 'no_assignee' | 'late_critical';
    rule_id?: string;
    template_id?: string;
    message?: string;
}

interface ExceptionCenterProps {
    exceptions: Exception[];
}

export default function ExceptionCenter({ exceptions }: ExceptionCenterProps) {
    if (exceptions.length === 0) return null

    return (
        <div className="bg-red-50 border border-red-100 rounded-[32px] p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h4 className="font-black text-red-900 uppercase tracking-tight text-sm">Atenção Gerencial: Exceções no Turno</h4>
            </div>

            <div className="space-y-3">
                {exceptions.map((ex, i) => (
                    <div key={i} className="bg-white/80 p-4 rounded-2xl border border-red-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-2 rounded-xl text-red-600">
                                {ex.type === 'dead_rule' ? <Ghost className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-900">
                                    {ex.type === 'dead_rule' ? 'Regra Ativa Sem Correspondência' : 'Exceção Operacional'}
                                </p>
                                <p className="text-xs text-gray-500 font-medium leading-tight">
                                    {ex.type === 'dead_rule' ? 'Uma regra de atribuição está ativa mas não encontrou nenhum colaborador para gerar tarefas hoje.' : ex.message}
                                </p>
                            </div>
                        </div>
                        <button className="flex items-center gap-1.5 text-[10px] font-black uppercase text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-all">
                            Resolver <Settings2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
