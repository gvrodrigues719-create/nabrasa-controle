"use client"

import { useState, useEffect } from 'react'
import { 
    getChecklistTemplatesAction,
    getTemplateRulesAction,
    saveChecklistTemplateAction,
    saveAttributionRuleAction,
    runChecklistDistributionAction
} from '@/app/actions/checklistAction'
import { 
    Plus, 
    Settings2, 
    Users, 
    Clock, 
    MapPin, 
    Play, 
    Save, 
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Layout
} from 'lucide-react'
import { ChecklistTemplate } from '@/modules/checklist/types'

export default function AdminChecklistManager() {
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null)
    const [rules, setRules] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)

    useEffect(() => {
        fetchTemplates()
    }, [])

    const fetchTemplates = async () => {
        setLoading(true)
        const res = await getChecklistTemplatesAction()
        if (res.success) setTemplates(res.data || [])
        setLoading(false)
    }

    const handleSelectTemplate = async (template: ChecklistTemplate) => {
        setSelectedTemplate(template)
        const res = await getTemplateRulesAction(template.id)
        if (res.success) setRules(res.data || [])
    }

    const runDistribution = async () => {
        setIsProcessing(true)
        const res = await runChecklistDistributionAction()
        if (res.success) {
            alert(`Sucesso! ${res.count} checklists distribuídos para os colaboradores.`)
        }
        setIsProcessing(false)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LISTA DE TEMPLATES */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm h-fit">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Templates</h3>
                    <button className="p-1.5 bg-[#B13A2B] text-white rounded-lg hover:bg-[#8c2e22] transition">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="divide-y divide-gray-50">
                    {loading ? (
                        <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                    ) : (
                        templates.map(t => (
                            <button 
                                key={t.id}
                                onClick={() => handleSelectTemplate(t)}
                                className={`w-full p-4 text-left flex items-center justify-between group transition-all ${
                                    selectedTemplate?.id === t.id ? 'bg-red-50' : 'hover:bg-gray-50'
                                }`}
                            >
                                <div>
                                    <p className={`font-bold text-sm ${selectedTemplate?.id === t.id ? 'text-[#B13A2B]' : 'text-gray-700'}`}>
                                        {t.name}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{t.context}</p>
                                </div>
                                <ChevronRight className={`w-4 h-4 transition-transform ${selectedTemplate?.id === t.id ? 'text-[#B13A2B] translate-x-1' : 'text-gray-300'}`} />
                            </button>
                        ))
                    )}
                </div>
                
                <div className="p-4 bg-[#1b1c1a] mt-4">
                    <button 
                        onClick={runDistribution}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Rodar Atribuição Agora
                    </button>
                </div>
            </div>

            {/* CONFIGURAÇÃO DO TEMPLATE SELECIONADO */}
            <div className="md:col-span-2 space-y-6">
                {selectedTemplate ? (
                    <>
                        <div className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-100 mb-2 inline-block">
                                        Configuração de Atribuição
                                    </span>
                                    <h2 className="text-2xl font-black text-gray-900">{selectedTemplate.name}</h2>
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition">
                                    <Save className="w-3 h-3" /> Salvar Alterações
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                                        <Users className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Público Alvo</span>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Função / Cargo</label>
                                        <select className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700">
                                            <option>Todos</option>
                                            <option>Estoquista</option>
                                            <option>Cozinheiro</option>
                                            <option>Atendente</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Turno</label>
                                        <select className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700">
                                            <option>Qualquer Turno</option>
                                            <option>Manhã</option>
                                            <option>Tarde</option>
                                            <option>Noite</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                                        <Layout className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Contexto</span>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Setor / Área</label>
                                        <select className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700">
                                            <option>Geral (Unidade)</option>
                                            <option>Cozinha</option>
                                            <option>Estoque</option>
                                            <option>Salão</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Unidade</label>
                                        <select className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700">
                                            <option>Minha Unidade</option>
                                            <option>Unidade Matriz</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex gap-4">
                            <div className="bg-amber-100 p-3 rounded-2xl h-fit">
                                <AlertCircle className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h4 className="font-black text-amber-900 text-sm mb-1 uppercase tracking-tight">Regras de Atribuição Ativas</h4>
                                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                    Este template será gerado automaticamente todos os dias para os colaboradores que se encaixarem nos critérios acima. 
                                    A reatribuição manual pode ser feita a qualquer momento pelo painel de monitoramento.
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[40px] p-10 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Settings2 className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Selecione um template para configurar</h3>
                        <p className="text-xs text-gray-300 font-medium max-w-[200px] mt-2">Personalize como e para quem os checklists serão distribuídos.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
