"use client"

import { useState, useEffect } from 'react'
import { 
    getChecklistTemplatesAction,
    getTemplateRulesAction,
    saveChecklistTemplateAction,
    saveAttributionRuleAction,
    runChecklistDistributionAction,
    getChecklistTemplateDetailsAction,
    saveTemplateItemsAction
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
import { ChecklistTemplate, ChecklistTemplateItem } from '@/modules/checklist/types'
import TemplateItemEditor from './components/TemplateItemEditor'

export default function AdminChecklistManager() {
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null)
    const [templateItems, setTemplateItems] = useState<ChecklistTemplateItem[]>([])
    const [rules, setRules] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [lastStats, setLastStats] = useState<any | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'config' | 'items'>('config')

    useEffect(() => {
        fetchTemplates()
        fetchUser()
    }, [])

    const fetchUser = async () => {
        const { getActiveOperator } = await import('@/app/actions/pinAuth')
        const usr = await getActiveOperator()
        if (usr) setCurrentUserId(usr.userId)
    }

    const fetchTemplates = async () => {
        setLoading(true)
        const res = await getChecklistTemplatesAction()
        if (res.success) setTemplates(res.data || [])
        setLoading(false)
    }

    const handleSelectTemplate = async (template: ChecklistTemplate) => {
        setLoading(true)
        setSelectedTemplate(template)
        
        // Busca detalhes completos including itens
        const detailsRes = await getChecklistTemplateDetailsAction(template.id)
        if (detailsRes.success) {
            setTemplateItems(detailsRes.data.items || [])
        }

        const rulesRes = await getTemplateRulesAction(template.id)
        if (rulesRes.success) setRules(rulesRes.data || [])
        
        setLoading(false)
    }

    const handleSaveTemplate = async () => {
        if (!selectedTemplate) return
        setIsSaving(true)
        
        const res = await saveChecklistTemplateAction(selectedTemplate)
        if (res.success) {
            // Atualiza lista local
            setTemplates(templates.map(t => t.id === selectedTemplate.id ? selectedTemplate : t))
            alert('Configuração salva com sucesso!')
        } else {
            alert('Erro ao salvar: ' + res.error)
        }
        setIsSaving(false)
    }

    const handleSaveItems = async () => {
        if (!selectedTemplate) return
        setIsSaving(true)
        
        const res = await saveTemplateItemsAction(selectedTemplate.id, templateItems)
        if (res.success) {
            alert('Itens salvos com sucesso!')
        } else {
            alert('Erro ao salvar itens: ' + res.error)
        }
        setIsSaving(false)
    }

    const createNewTemplate = async () => {
        const name = prompt('Nome do novo checklist:')
        if (!name) return

        const newTemplate: Partial<ChecklistTemplate> = {
            name,
            context: 'daily',
            priority: 'medium',
            frequency: 'daily',
            active: true,
            requires_signature: true
        }

        const res = await saveChecklistTemplateAction(newTemplate)
        if (res.success) {
            fetchTemplates()
            handleSelectTemplate(res.data)
        }
    }

    const runDistribution = async () => {
        setIsProcessing(true)
        setLastStats(null)
        const res = await runChecklistDistributionAction(currentUserId || undefined)
        if (res.success) {
            setLastStats(res.stats)
        }
        setIsProcessing(false)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LISTA DE TEMPLATES */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm h-fit">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Templates</h3>
                    <button 
                        onClick={createNewTemplate}
                        className="p-1.5 bg-[#B13A2B] text-white rounded-lg hover:bg-[#8c2e22] transition active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="divide-y divide-gray-50 max-h-[60vh] md:max-h-none overflow-y-auto">
                    {loading ? (
                        <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                    ) : templates.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Nenhum template cadastrado</p>
                        </div>
                    ) : (
                        templates.map(t => (
                            <button 
                                key={t.id}
                                onClick={() => handleSelectTemplate(t)}
                                className={`w-full p-4 text-left flex items-center justify-between group transition-all border-l-4 ${
                                    selectedTemplate?.id === t.id ? 'bg-red-50 border-[#B13A2B]' : 'hover:bg-gray-50 border-transparent'
                                }`}
                            >
                                <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        {t.area && (
                                            <span className="text-[8px] font-black text-blue-600 uppercase tracking-tight bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                {t.area}
                                            </span>
                                        )}
                                        {t.turno && (
                                            <span className="text-[8px] font-black text-orange-600 uppercase tracking-tight bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                                {t.turno}
                                            </span>
                                        )}
                                        {!t.active && (
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tight bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                Inativo
                                            </span>
                                        )}
                                    </div>
                                    <p className={`font-black text-sm truncate ${selectedTemplate?.id === t.id ? 'text-[#B13A2B]' : 'text-gray-900'}`}>
                                        {t.name}
                                    </p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">
                                        {t.frequency === 'daily' ? 'Diário' : t.frequency} • {t.priority === 'high' ? 'Alta Prioridade' : 'Padrão'}
                                    </p>
                                </div>
                                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${selectedTemplate?.id === t.id ? 'text-[#B13A2B] translate-x-1' : 'text-gray-300'}`} />
                            </button>
                        ))
                    )}
                </div>
                

            </div>

            {/* CONFIGURAÇÃO DO TEMPLATE SELECIONADO */}
            <div className="md:col-span-2 space-y-6">
                {selectedTemplate ? (
                    <>
                        <div className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                            Gestão Operacional
                                        </span>
                                        {!selectedTemplate.active && (
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                                                Inativo
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900">{selectedTemplate.name}</h2>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={activeTab === 'config' ? handleSaveTemplate : handleSaveItems}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} 
                                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-4 border-b border-gray-100 mb-6">
                                <button 
                                    onClick={() => setActiveTab('config')}
                                    className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === 'config' ? 'text-[#B13A2B] border-b-2 border-[#B13A2B]' : 'text-gray-400'
                                    }`}
                                >
                                    Configuração & Atribuição
                                </button>
                                <button 
                                    onClick={() => setActiveTab('items')}
                                    className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === 'items' ? 'text-[#B13A2B] border-b-2 border-[#B13A2B]' : 'text-gray-400'
                                    }`}
                                >
                                    Itens do Checklist ({templateItems.length})
                                </button>
                            </div>

                            {activeTab === 'config' ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                                <Users className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Atribuição Automática</span>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cargo / Função</label>
                                                <select 
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700"
                                                    value={rules.find(r => r.is_active)?.target_position || ''}
                                                    onChange={(e) => {
                                                        // Update rule logic would go here
                                                    }}
                                                >
                                                    <option value="">Todos</option>
                                                    <option value="estoquista">Estoquista</option>
                                                    <option value="cozinheiro">Cozinheiro</option>
                                                    <option value="lider_cozinha">Líder de Cozinha</option>
                                                    <option value="atendente">Atendente</option>
                                                    <option value="lider_salao">Líder de Salão</option>
                                                    <option value="caixa">Operador de Caixa</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Turno Fixo</label>
                                                <select 
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700"
                                                    value={selectedTemplate.turno || ''}
                                                    onChange={(e) => setSelectedTemplate({...selectedTemplate, turno: e.target.value})}
                                                >
                                                    <option value="">Qualquer Turno</option>
                                                    <option value="manha">Manhã</option>
                                                    <option value="tarde">Tarde</option>
                                                    <option value="noite">Noite</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                                <Layout className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Contexto Operacional</span>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Setor / Área</label>
                                                <select 
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700"
                                                    value={selectedTemplate.area || ''}
                                                    onChange={(e) => setSelectedTemplate({...selectedTemplate, area: e.target.value})}
                                                >
                                                    <option value="Geral">Geral (Unidade)</option>
                                                    <option value="Cozinha">Cozinha</option>
                                                    <option value="Salão">Salão</option>
                                                    <option value="Estoque">Estoque</option>
                                                    <option value="Caixa + Delivery">Caixa + Delivery</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Momento</label>
                                                <select 
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-700"
                                                    value={selectedTemplate.momento || ''}
                                                    onChange={(e) => setSelectedTemplate({...selectedTemplate, momento: e.target.value})}
                                                >
                                                    <option value="Abertura">Abertura</option>
                                                    <option value="Fechamento">Fechamento</option>
                                                    <option value="Rotina">Rotina Diária</option>
                                                    <option value="Audit">Auditoria</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input 
                                                type="checkbox"
                                                checked={selectedTemplate.requires_signature}
                                                onChange={(e) => setSelectedTemplate({...selectedTemplate, requires_signature: e.target.checked})}
                                                className="rounded text-[#B13A2B] focus:ring-[#B13A2B] bg-white border-gray-200"
                                            />
                                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">Exigir Assinatura</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input 
                                                type="checkbox"
                                                checked={selectedTemplate.active}
                                                onChange={(e) => setSelectedTemplate({...selectedTemplate, active: e.target.checked})}
                                                className="rounded text-[#B13A2B] focus:ring-[#B13A2B] bg-white border-gray-200"
                                            />
                                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">Template Ativo</span>
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <TemplateItemEditor 
                                    items={templateItems} 
                                    onUpdate={setTemplateItems} 
                                />
                            )}
                        </div>

                        {activeTab === 'config' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                {lastStats && (
                                    <div className="bg-[#1b1c1a] rounded-3xl p-6 border border-gray-800 shadow-xl">
                                        <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            Relatório de Distribuição
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Criados</p>
                                                <p className="text-2xl font-black text-white">{lastStats.sessionsCreated}</p>
                                            </div>
                                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Ignorados</p>
                                                <p className="text-2xl font-black text-white/60">{lastStats.sessionsSkipped}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex gap-4">
                                    <div className="bg-amber-100 p-3 rounded-2xl h-fit">
                                        <AlertCircle className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-amber-900 text-sm mb-1 uppercase tracking-tight">Regras de Atribuição Proativa</h4>
                                        <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                            Este template será gerado automaticamente para os colaboradores que se encaixarem nos critérios. 
                                            O versionamento é garantido: cada execução salva uma "fotografia" dos itens atuais, preservando o histórico mesmo se o template for editado futuramente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-[40px] p-10 text-center bg-gray-50/30">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <Settings2 className="w-8 h-8 text-gray-200" />
                        </div>
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Selecione um template</h3>
                        <p className="text-[10px] text-gray-400 font-bold max-w-[200px] mt-2 uppercase tracking-tight">Escolha na lista ao lado para configurar regras ou editar itens operacionais.</p>
                        <button 
                            onClick={createNewTemplate}
                            className="mt-6 px-6 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                        >
                            Criar Novo Checklist
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
