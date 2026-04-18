"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import ContextualCommentsDrawer from '@/app/dashboard/components/ContextualCommentsDrawer'
import { Loader2, CheckCircle2, AlertCircle, Info, Camera, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
    template: ChecklistTemplate & { items: ChecklistTemplateItem[] }
    sessionId: string
    userId: string
}

export default function ChecklistExecution({ template, sessionId, userId }: Props) {
    const router = useRouter()
    const [responses, setResponses] = useState<Record<string, any>>({})
    const [evidences, setEvidences] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null) // itemId sendo salvo
    const [completing, setCompleting] = useState(false)
    const [isCommentsOpen, setIsCommentsOpen] = useState(false)

    // Carregar respostas existentes se houver
    useEffect(() => {
        const loadResponses = async () => {
            const res = await getSessionResponsesAction(sessionId)
            if (res.success && res.data) {
                const initialVals: Record<string, any> = {}
                const initialEvid: Record<string, string> = {}
                res.data.forEach((r: any) => {
                    initialVals[r.item_id] = r.value
                    if (r.evidence_url) {
                        initialEvid[r.item_id] = r.evidence_url
                    }
                })
                setResponses(initialVals)
                setEvidences(initialEvid)
            }
            setLoading(false)
        }
        loadResponses()
    }, [sessionId])

    const handleSave = async (itemId: string, value: any, evidenceUrl?: string) => {
        setSaving(itemId)
        
        const currentVal = value !== undefined ? value : responses[itemId]
        const currentEvid = evidenceUrl !== undefined ? evidenceUrl : evidences[itemId]

        if (value !== undefined) setResponses(prev => ({ ...prev, [itemId]: value }))
        if (evidenceUrl !== undefined) setEvidences(prev => ({ ...prev, [itemId]: evidenceUrl }))

        const res = await saveChecklistResponseAction(sessionId, itemId, currentVal, undefined, currentEvid)
        if (!res.success) {
            toast.error('Erro ao salvar resposta')
        }
        setSaving(null)
    }

    const handleComplete = async () => {
        setCompleting(true)
        const res = await completeChecklistSessionAction(sessionId)
        
        if (res.success) {
            toast.success('Checklist concluído com sucesso!')
            router.push('/dashboard/checklist')
        } else {
            toast.error(res.error || 'Erro ao concluir checklist')
            setCompleting(false)
        }
    }

    // Cálculos de Progresso
    const requiredItems = template.items.filter(i => i.required)
    const evidenceRequiredItems = template.items.filter(i => i.evidence_required)
    
    // Check de preenchimento (valor)
    const filledRequired = requiredItems.filter(i => responses[i.id] !== undefined && responses[i.id] !== null).length
    
    // Check de fotos
    const filledEvidence = evidenceRequiredItems.filter(i => !!evidences[i.id]).length
    
    // Total de travas (Obrigatórios + Fotos Obrigatórias)
    const totalMandatory = requiredItems.length + evidenceRequiredItems.length
    const totalFilled = filledRequired + filledEvidence
    
    const isCompleteReady = totalFilled === totalMandatory

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-[#2b58b1] animate-spin mb-4" />
                <p className="text-[#8c716c] font-bold animate-pulse">CARREGANDO ROTINA...</p>
            </div>
        )
    }

    return (
        <div className="pb-32">
            {/* PROGRESS BAR FLOATING */}
            <div className="sticky top-[73px] z-30 bg-white/80 backdrop-blur-md border-b border-[#e9e8e5] px-5 py-3 shadow-sm">
                <div className="max-w-md mx-auto">
                    <div className="flex justify-between items-end mb-1.5">
                        <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest">Progresso Auditoria</span>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsCommentsOpen(true)}
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#e9e8e5] rounded-lg shadow-sm text-[#8c716c] hover:text-[#1b1c1a] active:scale-95 transition-all"
                            >
                                <MessageSquare className="w-3 h-3" />
                                <span className="text-[10px] font-black uppercase">Dúvidas</span>
                            </button>
                            <span className="text-xs font-black text-[#2b58b1]">{totalFilled} / {totalMandatory}</span>
                        </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-[#2b58b1] to-[#3b71db] transition-all duration-500" 
                            style={{ width: `${(totalFilled / totalMandatory) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* LISTA DE ITENS */}
            <div className="max-w-md mx-auto px-5 mt-6 space-y-8">
                {template.items.map((item, idx) => {
                    const value = responses[item.id]
                    const isSaving = saving === item.id

                    return (
                        <div key={item.id} className="relative group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h4 className="text-base font-black text-[#1b1c1a] leading-tight flex items-baseline gap-2">
                                        <span className="text-[10px] text-[#dfbfba]">#{idx + 1}</span>
                                        {item.label}
                                        {item.required && <span className="text-red-500">*</span>}
                                    </h4>
                                    {item.description && (
                                        <p className="text-xs font-medium text-[#8c716c] mt-1 italic flex items-start gap-1">
                                            <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                                {isSaving && <Loader2 className="w-4 h-4 text-[#2b58b1] animate-spin ml-2" />}
                            </div>

                            {/* INPUT DINÂMICO */}
                            <div className="bg-white rounded-[24px] p-2">
                                {item.response_type === 'boolean' && (
                                    <BooleanInput 
                                        label={item.label} 
                                        value={value} 
                                        onChange={(val) => handleSave(item.id, val)} 
                                    />
                                )}
                                {item.response_type === 'number' && (
                                    <NumberInput 
                                        label={item.label} 
                                        value={value} 
                                        onChange={(val) => handleSave(item.id, val)} 
                                    />
                                )}
                                {item.response_type === 'temperature' && (
                                    <TemperatureInput 
                                        label={item.label} 
                                        value={value} 
                                        onChange={(val) => handleSave(item.id, val)} 
                                    />
                                )}
                                {item.response_type === 'text' && (
                                    <TextInput 
                                        label={item.label} 
                                        value={value} 
                                        onChange={(val) => handleSave(item.id, val)} 
                                    />
                                )}
                            </div>

                            {/* UPLOAD DE EVIDÊNCIA SE NECESSÁRIO */}
                            {item.evidence_required && (
                                <EvidenceUploader 
                                    sessionId={sessionId}
                                    itemId={item.id}
                                    initialValue={evidences[item.id]}
                                    onUploadSuccess={(url) => handleSave(item.id, undefined, url)}
                                    onRemove={() => handleSave(item.id, undefined, '')}
                                />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* BOTÃO FIXO DE CONCLUSÃO */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-[#e9e8e5] shadow-[0_-8px_30px_rgb(0,0,0,0.06)] z-50 rounded-t-[32px]">
                <div className="max-w-md mx-auto">
                    <button 
                        onClick={handleComplete}
                        disabled={!isCompleteReady || completing}
                        className={`w-full py-5 rounded-2xl font-black flex justify-center items-center text-lg active:scale-95 transition-all shadow-xl ${
                            isCompleteReady && !completing
                                ? 'bg-[#1b1c1a] text-white shadow-black/20' 
                                : 'bg-gray-100 text-gray-300'
                        }`}
                    >
                        {completing ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : isCompleteReady ? (
                            <>
                                <CheckCircle2 className="w-6 h-6 mr-2" />
                                Finalizar Checklist
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-5 h-5 mr-2" />
                                Preencha os obrigatórios
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* DRAWER DE COMENTÁRIOS */}
            <ContextualCommentsDrawer 
                isOpen={isCommentsOpen}
                onClose={() => setIsCommentsOpen(false)}
                referenceId={sessionId}
                referenceType="session"
                title={template.name}
            />
        </div>
    )
}
