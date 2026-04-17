'use client'

import React, { useState } from 'react'
import { Flame, ArrowUpRight, Edit2, Check, X, Loader2 } from 'lucide-react'
import type { WeeklyFocus } from '@/app/actions/weeklyFocusAction'

interface Props {
    focus?: WeeklyFocus | null
    userRole?: string | null
    onUpdateFocus?: (newTitle: string) => Promise<void>
}

export default function WeeklyFocusCard({ focus, userRole, onUpdateFocus }: Props) {
    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const canEdit = userRole === 'admin' || userRole === 'manager'
    const titleText = focus?.title || 'Manter a operação dentro da meta da casa e padrões de qualidade.'
    const isManual = focus?.source === 'manual'

    const handleEdit = () => {
        setDraft(titleText)
        setIsEditing(true)
    }

    const handleSave = async () => {
        if (!draft.trim() || !onUpdateFocus) return
        setIsSaving(true)
        try {
            await onUpdateFocus(draft.trim())
            setIsEditing(false)
        } finally {
            setIsSaving(false)
        }
    }

    const handleCancel = () => {
        setIsEditing(false)
        setDraft('')
    }

    return (
        <div className="bg-[#1b1c1a] rounded-[32px] p-6 shadow-xl relative overflow-hidden group">
            {/* Efeito visual de fundo sutil */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#B13A2B] to-transparent opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-white/40">
                        <Flame className="w-4 h-4 text-[#B13A2B] fill-[#B13A2B]" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Foco da Semana</span>
                    </div>

                    {canEdit && !isEditing && (
                        <button 
                            onClick={handleEdit}
                            className="text-white/20 hover:text-white transition-colors cursor-pointer"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                
                {isEditing ? (
                    <div className="space-y-3">
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-[#B13A2B] resize-none h-20 placeholder:text-white/20"
                            placeholder="Digite o foco da semana..."
                            disabled={isSaving}
                            autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button 
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving || !draft.trim()}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#B13A2B] text-white hover:bg-red-600 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h3 className="text-xl font-bold text-white leading-tight pr-4">
                            {titleText}
                        </h3>
                        
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center gap-1.5 text-[9px] font-black text-[#B13A2B] uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full">
                                Prioridade Máxima
                                <ArrowUpRight className="w-3 h-3" />
                            </div>
                            
                            <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                {isManual ? 'Definido Manualmente' : 'Sugestão do Sistema'}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
