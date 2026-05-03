"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
    ChecklistTemplate, 
    ChecklistTemplateItem, 
    ChecklistResponse 
} from '@/modules/checklist/types'
import { 
    saveChecklistResponseAction, 
    completeChecklistSessionAction,
    getSessionResponsesAction
} from '@/app/actions/checklistAction'
import { 
    BooleanInput, 
    NumberInput, 
    TemperatureInput, 
    TextInput 
} from './ChecklistInputs'
import { EvidenceUploader } from './EvidenceUploader'
import { 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    Info, 
    Check,
    X,
    ClipboardCheck,
    UserCheck,
    ArrowRight,
    HelpCircle,
    Camera
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getSafeReturnTo } from '@/lib/navigation'

interface Props {
    template: ChecklistTemplate & { items: ChecklistTemplateItem[] }
    sessionId: string
    userId: string
}

export default function ChecklistExecution({ template, sessionId, userId }: Props) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const returnTo = getSafeReturnTo(searchParams.get('returnTo'), '/dashboard')
    
    const [responses, setResponses] = useState<Record<string, Partial<ChecklistResponse>>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [completing, setCompleting] = useState(false)
    const [showSignature, setShowSignature] = useState(false)
    const [selectedStep, setSelectedStep] = useState<number>(0)

    // Carregar respostas existentes
    useEffect(() => {
        const loadResponses = async () => {
            const res = await getSessionResponsesAction(sessionId)
            if (res.success && res.data) {
                const initialMap: Record<string, Partial<ChecklistResponse>> = {}
                res.data.forEach((r: any) => {
                    initialMap[r.item_id] = {
                        value: r.value === 'true' ? true : r.value === 'false' ? false : r.value,
                        observation: r.observation,
                        evidence_url: r.evidence_url,
                        corrected_now: r.corrected_now,
                        needs_manager_attention: r.needs_manager_attention,
                        numeric_value: r.numeric_value
                    }
                })
                setResponses(initialMap)
            }
            setLoading(false)
        }
        loadResponses()
    }, [sessionId])

    const handleSave = async (itemId: string, updates: Partial<ChecklistResponse>) => {
        setSaving(itemId)
        
        const current = { ...(responses[itemId] || {}), ...updates }
        setResponses(prev => ({ ...prev, [itemId]: current }))

        const res = await saveChecklistResponseAction(
            sessionId, 
            itemId, 
            {
                value: current.value, 
                observation: current.observation, 
                corrected_now: current.corrected_now || false,
                needs_manager_attention: current.needs_manager_attention || false,
                numeric_value: current.numeric_value !== undefined ? Number(current.numeric_value) : undefined
            }
        )

        if (!res.success) {
            toast.error('Erro ao salvar resposta')
        }
        setSaving(null)
    }

    const handleComplete = async () => {
        setCompleting(true)
        const res = await completeChecklistSessionAction(sessionId)
        
        if (res.success) {
            toast.success('Auditoria finalizada e registrada!')
            router.push(returnTo)
            router.refresh()
        } else {
            toast.error(res.error || 'Erro ao concluir')
            setCompleting(false)
            setShowSignature(false)
        }
    }

    // Progresso
    const requiredItems = template.items.filter(i => i.required && i.response_type !== 'info_only')
    const filledRequired = requiredItems.filter(i => {
        const resp = responses[i.id]
        if (!resp) return false
        return resp.value !== undefined && resp.value !== null && resp.value !== ''
    }).length
    const totalMandatory = requiredItems.length
    const isCompleteReady = filledRequired === totalMandatory
    const percent = totalMandatory > 0 ? Math.round((filledRequired / totalMandatory) * 100) : 100

    const renderInput = (item: ChecklistTemplateItem, resp: any) => {
        const isNumericIfYes = item.response_type === 'numeric_if_yes'
        
        if (item.response_type === 'boolean' || isNumericIfYes) {
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleSave(item.id, { value: true, corrected_now: false, needs_manager_attention: false })}
                            className={`py-6 rounded-[32px] font-black text-sm flex flex-col items-center justify-center gap-2 transition-all border-2 ${
                                resp.value === true 
                                    ? 'bg-green-50 border-green-500 text-green-700 shadow-md scale-[1.02]' 
                                    : 'bg-white border-gray-100 text-gray-400 grayscale'
                            }`}
                        >
                            <Check className="w-6 h-6" />
                            SIM / OK
                        </button>
                        <button
                            onClick={() => handleSave(item.id, { value: false })}
                            className={`py-6 rounded-[32px] font-black text-sm flex flex-col items-center justify-center gap-2 transition-all border-2 ${
                                resp.value === false 
                                    ? 'bg-red-50 border-red-500 text-red-700 shadow-md scale-[1.02]' 
                                    : 'bg-white border-gray-100 text-gray-400 grayscale'
                            }`}
                        >
                            <X className="w-6 h-6" />
                            NÃO / FALHA
                        </button>
                    </div>

                    {isNumericIfYes && resp.value === true && (
                        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[32px] p-6 animate-in zoom-in-95 duration-300">
                            <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 text-left">Informe o Valor</label>
                            <div className="flex items-center gap-4">
                                <span className="text-2xl font-black text-emerald-400">R$</span>
                                <input 
                                    type="number"
                                    value={resp.numeric_value || ''}
                                    onChange={(e) => handleSave(item.id, { numeric_value: e.target.value ? Number(e.target.value) : undefined })}
                                    className="w-full bg-white border-none rounded-2xl p-4 text-2xl font-black text-emerald-700 focus:ring-0 shadow-sm"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                    )}
                </div>
            )
        }

        if (item.response_type === 'number' || item.response_type === 'temperature') {
            return (
                <div className="bg-white border-2 border-gray-100 rounded-[32px] p-6">
                    <input 
                        type="number"
                        value={resp.numeric_value || ''}
                        onChange={(e) => handleSave(item.id, { numeric_value: e.target.value ? Number(e.target.value) : undefined, value: e.target.value })}
                        className="w-full bg-transparent border-none text-center text-5xl font-black text-gray-900 focus:ring-0 placeholder:text-gray-100"
                        placeholder="0.0"
                    />
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mt-4">
                        {item.response_type === 'temperature' ? 'Graus Celsius (°C)' : 'Valor Numérico'}
                    </p>
                </div>
            )
        }

        if (item.response_type === 'info_only') {
            return (
                <div className="p-6 bg-blue-50 border border-blue-100 rounded-[32px] flex items-center gap-4 text-left">
                    <Info className="w-6 h-6 text-blue-500 shrink-0" />
                    <p className="text-sm font-bold text-blue-700 leading-tight">Este item é informativo para apoio à rotina.</p>
                </div>
            )
        }

        return (
            <div className="bg-white border-2 border-gray-100 rounded-[32px] p-4 text-left">
                <input 
                    type="text"
                    value={resp.value || ''}
                    onChange={(e) => handleSave(item.id, { value: e.target.value })}
                    className="w-full bg-transparent border-none text-lg font-bold text-gray-800 focus:ring-0 placeholder:text-gray-200"
                    placeholder="Toque para escrever..."
                />
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-10 text-center">
                <Loader2 className="w-12 h-12 text-[#B13A2B] animate-spin mb-6" />
                <p className="text-gray-400 font-black uppercase tracking-widest animate-pulse">Sincronizando Rotina...</p>
            </div>
        )
    }

    return (
        <div className="pb-40 animate-in fade-in duration-700">
            {/* STICKY PROGRESS HEADER */}
            <div className="fixed top-[70px] left-0 right-0 z-30 px-5 py-4 bg-[#F8F7F4]/80 backdrop-blur-xl border-b border-gray-200">
                <div className="max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#B13A2B] animate-pulse" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status da Execução</span>
                        </div>
                        <span className="text-xs font-black text-gray-900">{percent}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-[#B13A2B] transition-all duration-700 ease-out" 
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-5 pt-28 space-y-10">
                {template.items.map((item, idx) => {
                    const resp = responses[item.id] || {}
                    const isNo = resp.value === false
                    const isSelected = selectedStep === idx

                    return (
                        <div 
                            key={item.id} 
                            className={`relative transition-all duration-500 ${isSelected ? 'opacity-100 scale-100' : 'opacity-40 scale-[0.98]'}`}
                            onClick={() => setSelectedStep(idx)}
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-xl border transition-colors ${
                                            resp.value !== undefined ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-400'
                                        }`}>
                                            {idx + 1}
                                        </span>
                                        {item.criticality === 'critical' && (
                                            <span className="text-[8px] font-black text-white bg-red-600 px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">crítico</span>
                                        )}
                                    </div>
                                    <h4 className="text-xl font-black text-gray-900 leading-tight">
                                        {item.label}
                                    </h4>
                                    {item.description && (
                                        <p className="text-xs font-medium text-gray-400 flex items-start gap-1">
                                            <Info className="w-3 h-3 shrink-0 mt-0.5" />
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                                {saving === item.id && <Loader2 className="w-4 h-4 text-[#B13A2B] animate-spin" />}
                            </div>

                            {/* Operational Inputs - Only visible when step is selected or has value */}
                            <div className={`space-y-6 overflow-hidden transition-all duration-500 ${(isSelected || resp.value !== undefined) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                {renderInput(item, resp)}

                                {/* Help Text Tooltip */}
                                {item.help_text && isSelected && (
                                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <HelpCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <p className="text-[10px] font-bold text-gray-500 leading-relaxed italic text-left">{item.help_text}</p>
                                    </div>
                                )}

                                {/* Evidence Required (Visual) */}
                                {item.evidence_required && isSelected && (
                                    <button className="w-full py-4 border-2 border-dashed border-gray-200 rounded-[28px] flex items-center justify-center gap-3 text-gray-400 hover:bg-gray-50 transition-all group">
                                        <Camera className="w-4 h-4 group-hover:scale-110" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Anexar Evidência</span>
                                    </button>
                                )}

                                {/* Sub-fields conditional on "No" or specific need */}
                                {isNo && (
                                    <div className="bg-white border-2 border-red-100 rounded-[32px] p-6 space-y-5 animate-in zoom-in-95 duration-300">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-left">Descreva a Ocorrência</label>
                                            <textarea 
                                                value={resp.observation || ''}
                                                onChange={(e) => handleSave(item.id, { observation: e.target.value })}
                                                placeholder="O que aconteceu? Por que está fora do padrão?"
                                                className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-800 placeholder:text-gray-300 min-h-[100px] focus:ring-0"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            <button 
                                                onClick={() => handleSave(item.id, { corrected_now: !resp.corrected_now })}
                                                className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                                                    resp.corrected_now 
                                                        ? 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-900/20' 
                                                        : 'bg-gray-50 border-gray-100 text-gray-500'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${resp.corrected_now ? 'border-white bg-white/20' : 'border-gray-200'}`}>
                                                    {resp.corrected_now && <Check className="w-3 h-3" />}
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-tight text-left">Corrigido na Hora</span>
                                            </button>

                                            <button 
                                                onClick={() => handleSave(item.id, { needs_manager_attention: !resp.needs_manager_attention })}
                                                className={`flex items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                                                    resp.needs_manager_attention 
                                                        ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-900/20' 
                                                        : 'bg-gray-50 border-gray-100 text-gray-500'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${resp.needs_manager_attention ? 'border-white bg-white/20' : 'border-gray-200'}`}>
                                                    {resp.needs_manager_attention && <Check className="w-3 h-3" />}
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-tight text-left">Requer Atenção do Gerente</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* FLOATING ACTION BAR */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8F7F4] via-[#F8F7F4] to-transparent z-40 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto">
                    <button 
                        onClick={() => isCompleteReady && setShowSignature(true)}
                        disabled={!isCompleteReady}
                        className={`w-full py-6 rounded-[32px] font-black flex justify-between items-center px-10 transition-all shadow-2xl ${
                            isCompleteReady 
                                ? 'bg-[#1b1c1a] text-white hover:scale-105 active:scale-95 shadow-black/30' 
                                : 'bg-gray-200 text-gray-400 grayscale'
                        }`}
                    >
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Ready to Commit</span>
                            <span className="text-lg uppercase">Finalizar Rotina</span>
                        </div>
                        <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* SIGNATURE & CONFIRMATION OVERLAY */}
            {showSignature && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-md p-5 animate-in slide-in-from-bottom duration-500">
                    <div className="w-full max-w-md bg-white rounded-[40px] p-8 space-y-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 opacity-50" />
                        
                        <div className="relative">
                            <h3 className="text-3xl font-black text-gray-900 mb-2">Condução de Elite</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Declaração de Integridade Operacional</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-5">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-200 shadow-sm">
                                    <UserCheck className="w-7 h-7 text-[#B13A2B]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsável</p>
                                    <p className="text-xl font-black text-gray-900 leading-tight">Colaborador em Turno</p>
                                    <p className="text-xs font-bold text-gray-400 tracking-tight">Validado por PIN Seguro</p>
                                </div>
                            </div>

                            <p className="text-xs text-gray-400 leading-relaxed font-bold uppercase tracking-tight bg-gray-50/50 p-4 rounded-2xl">
                                Ao finalizar, você confirma que seguiu todos os padrões de excelência Neon e que os dados reportados são 100% fidedignos à realidade da unidade.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowSignature(false)}
                                className="flex-1 py-6 bg-gray-100 text-gray-400 rounded-[28px] font-black uppercase text-[10px] tracking-widest"
                            >
                                Revisar
                            </button>
                            <button 
                                onClick={handleComplete}
                                disabled={completing}
                                className="flex-[2] py-6 bg-[#B13A2B] text-white rounded-[28px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-[#8c2e22] transition-colors shadow-lg shadow-red-900/20"
                            >
                                {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                                Confirmar e Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
