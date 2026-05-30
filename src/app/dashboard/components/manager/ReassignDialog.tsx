"use client"

import { useState, useEffect } from 'react'
import { X, User, ArrowRight, Loader2, Check } from 'lucide-react'
import { getActiveEmployeesAction } from '@/app/actions/pinAuth'
import { updateSessionUserAction } from '@/app/actions/checklistAction'
import toast from 'react-hot-toast'

interface ReassignDialogProps {
    collaborator: {
        id: string;
        name: string;
        sessions: { id: string; name: string; isLate: boolean }[];
    } | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ReassignDialog({ collaborator, onClose, onSuccess }: ReassignDialogProps) {
    const [employees, setEmployees] = useState<any[]>([])
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
    const [targetUserId, setTargetUserId] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (collaborator && collaborator.sessions.length > 0) {
            setSelectedSessionId(collaborator.sessions[0].id)
        }
        fetchEmployees()
    }, [collaborator])

    const fetchEmployees = async () => {
        setIsLoading(true)
        const res = await getActiveEmployeesAction()
        if (res.success && res.data) {
            // Filtrar o próprio usuário atual da lista de destino
            setEmployees(res.data.filter((e: any) => e.id !== collaborator?.id))
        }

        setIsLoading(false)
    }

    const handleReassign = async () => {
        if (!selectedSessionId || !targetUserId) return
        
        setIsSaving(true)
        const res = await updateSessionUserAction(selectedSessionId, targetUserId)
        if (res.success) {
            toast.success("Tarefa reatribuída com sucesso!")
            onSuccess()
            onClose()
        } else {
            toast.error("Erro ao reatribuir: " + res.error)
        }
        setIsSaving(false)
    }

    if (!collaborator) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#1b1c1a]/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-gray-900 uppercase tracking-tight">Intervenção Operacional</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reatribuir tarefa de {collaborator.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* SELEÇÃO DA TAREFA */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Qual tarefa deseja mover?</label>
                        <div className="space-y-2">
                            {collaborator.sessions.map((s) => (
                                <button 
                                    key={s.id}
                                    onClick={() => setSelectedSessionId(s.id)}
                                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                                        selectedSessionId === s.id ? 'bg-[#B13A2B] border-[#B13A2B] text-white' : 'bg-gray-50 border-gray-100 text-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${selectedSessionId === s.id ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                                            <Loader2 className={`w-4 h-4 ${s.isLate ? 'text-red-500' : 'text-amber-500'} ${selectedSessionId === s.id ? 'text-white' : ''}`} />
                                        </div>
                                        <span className="text-sm font-bold">{s.name}</span>
                                    </div>
                                    {selectedSessionId === s.id && <Check className="w-5 h-5" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center py-2 opacity-20">
                        <ArrowRight className="w-6 h-6 rotate-90 md:rotate-0" />
                    </div>

                    {/* SELEÇÃO DO NOVO RESPONSÁVEL */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Quem assumirá esta tarefa?</label>
                        {isLoading ? (
                            <div className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
                        ) : (
                            <select 
                                value={targetUserId}
                                onChange={(e) => setTargetUserId(e.target.value)}
                                className="w-full h-12 px-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-black text-gray-900 focus:ring-2 focus:ring-[#B13A2B]/20 outline-none transition-all"
                            >
                                <option value="" disabled>Selecione um colaborador...</option>
                                {employees.map((e) => (
                                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-gray-50 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleReassign}
                        disabled={isSaving || !targetUserId || !selectedSessionId}
                        className="flex-[2] py-4 bg-[#B13A2B] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-white" /> : "Confirmar Reatribuição"}
                    </button>
                </div>
            </div>
        </div>
    )
}
