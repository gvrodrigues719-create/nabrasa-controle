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
    ArrowRight
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

    // Carregar respostas existentes
    useEffect(() => {
        const loadResponses = async () => {
            const res = await getSessionResponsesAction(sessionId)
            if (res.success && res.data) {
                const initialMap: Record<string, Partial<ChecklistResponse>> = {}
                res.data.forEach((r: any) => {
                    initialMap[r.item_id] = {
                        value: r.value,
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
            current.value, 
            current.observation, 
            current.evidence_url || undefined,
            current.corrected_now || false,
            current.needs_manager_attention || false,
            current.numeric_value !== undefined ? Number(current.numeric_value) : undefined
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
    const requiredItems = template.items.filter(i => i.required)
    const filledRequired = requiredItems.filter(i => responses[i.id]?.value !== undefined && responses[i.id]?.value !== null).length
    const totalMandatory = requiredItems.length
    const isCompleteReady = filledRequired === totalMandatory
    const percent = Math.round((filledRequired / totalMandatory) * 100)

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

                    return (
                        <div key={item.id} className="relative">
                            {/* Card Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-[#B13A2B] bg-red-50 w-5 h-5 flex items-center justify-center rounded-lg border border-red-100">
                                            {idx + 1}
                                        </span>
                                        {item.criticality === 'critical' && (
                                            <span className="text-[8px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded uppercase tracking-widest shadow-sm">crítico</span>
                                        )}
                                    </div>
                                    <h4 className="text-lg font-black text-gray-900 leading-tight">
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

                            {/* Operational Inputs */}
                            <div className="space-y-4">
                                {item.response_type === 'boolean' ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => handleSave(item.id, { value: true, corrected_now: false, needs_manager_attention: false })}
                                            className={`py-5 rounded-3xl font-black text-sm flex flex-col items-center justify-center gap-2 transition-all border-2 ${
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
                                            className={`py-5 rounded-3xl font-black text-sm flex flex-col items-center justify-center gap-2 transition-all border-2 ${
                                                resp.value === false 
                                                    ? 'bg-red-50 border-red-500 text-red-700 shadow-md scale-[1.02]' 
                                                    : 'bg-white border-gray-100 text-gray-400 grayscale'
                                            }`}
                                        >
                                            <X className="w-6 h-6" />
                                            NÃO / FALHA
                                        </button>
                                    </div>
                                ) : item.response_type === 'number' ? (
                                    <NumberInput 
                                        label={item.label} 
                                        value={resp.value} 
                                        onChange={(val) => handleSave(item.id, { value: val })} 
                                    />
                                ) : (
                                    <TextInput 
                                        label={item.label} 
                                        value={resp.value} 
                                        onChange={(val) => handleSave(item.id, { value: val })} 
                                    />
                                )}

                                {/* Sub-fields conditional on "No" or specific need */}
                                {isNo && (
                                    <div className="bg-white border-2 border-red-100 rounded-[32px] p-6 space-y-5 animate-in zoom-in-95 duration-300">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descreva a Ocorrência</label>
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
                                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                                    resp.corrected_now 
                                                        ? 'bg-green-500 border-green-600 text-white' 
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
                                                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                                    resp.needs_manager_attention 
                                                        ? 'bg-amber-500 border-amber-600 text-white' 
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
                        className={`w-full py-6 rounded-3xl font-black flex justify-between items-center px-10 transition-all shadow-2xl ${
                            isCompleteReady 
                                ? 'bg-[#1b1c1a] text-white hover:scale-105 active:scale-95 shadow-black/30' 
                                : 'bg-gray-200 text-gray-400 grayscale'
                        }`}
                    >
                        <span className="text-lg">REVISAR E SALVAR</span>
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
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Confirmar Rotina</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Segurança e Integridade</p>
                        </div>

                        <div className="space-y-4">
                            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-5">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-200 shadow-sm">
                                    <UserCheck className="w-7 h-7 text-[#B13A2B]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Responsável</p>
                                    <p className="text-lg font-black text-gray-900 leading-tight">Colaborador Logado</p>
                                    <p className="text-xs font-bold text-gray-400">PIN Validado no Início</p>
                                </div>
                            </div>

                            <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                                Ao clicar em finalizar, você declara que todas as informações registradas nesta rotina de **{template.name}** são verídicas e condizem com o status real da operação no momento.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowSignature(false)}
                                className="flex-1 py-5 bg-gray-100 text-gray-400 rounded-3xl font-black uppercase text-xs tracking-widest"
                            >
                                Voltar
                            </button>
                            <button 
                                onClick={handleComplete}
                                disabled={completing}
                                className="flex-[2] py-5 bg-[#B13A2B] text-white rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-[#8c2e22] transition-colors shadow-lg shadow-red-900/20"
                            >
                                {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                                Finalizar Agora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
