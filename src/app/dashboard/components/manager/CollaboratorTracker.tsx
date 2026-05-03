import { useState } from 'react'
import { User, Clock, CheckCircle2, ChevronRight } from 'lucide-react'
import ReassignDialog from './ReassignDialog'

interface Collaborator {
    id: string;
    name: string;
    position: string;
    sector: string;
    total: number;
    completed: number;
    late: number;
    sessions: { id: string; name: string; isLate: boolean }[];
}

interface CollaboratorTrackerProps {
    collaborators: Collaborator[];
    onRefresh: () => void;
}

export default function CollaboratorTracker({ collaborators, onRefresh }: CollaboratorTrackerProps) {
    const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null)

    if (collaborators.length === 0) {
        return (
            <div className="bg-white border border-gray-100 p-10 rounded-[32px] text-center">
                <User className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhum colaborador com tarefas no turno</p>
            </div>
        )
    }


    return (
        <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm">Monitoramento por Equipe</h4>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{collaborators.length} Pessoas</span>
            </div>
            <div className="divide-y divide-gray-50">
                {collaborators.map((worker, i) => {
                    const progress = worker.total > 0 ? (worker.completed / worker.total) * 100 : 0
                    const hasPendingOrLate = worker.sessions?.length > 0
                    
                    return (
                        <div 
                            key={i} 
                            onClick={() => hasPendingOrLate && setSelectedCollaborator(worker)}
                            className={`p-5 transition-colors flex items-center justify-between group ${hasPendingOrLate ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60 cursor-default'}`}
                        >

                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#B13A2B] group-hover:text-white transition-all">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h5 className="font-black text-gray-900">{worker.name}</h5>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{worker.position || 'Colaborador'}</span>
                                        <span className="text-gray-200 text-[10px]">•</span>
                                        <span className="text-[10px] font-black text-[#B13A2B] uppercase tracking-widest">{worker.sector || 'Geral'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="hidden md:flex flex-col items-end">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-xs font-black text-gray-900">{worker.completed}/{worker.total}</span>
                                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-green-500 transition-all" 
                                                style={{ width: `${progress}%` }} 
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        {worker.late > 0 && (
                                            <div className="flex items-center gap-1 text-red-600">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase tracking-tighter">{worker.late} Atrasados</span>
                                            </div>
                                        )}
                                        {progress === 100 && (
                                            <div className="flex items-center gap-1 text-green-600">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase tracking-tighter">Em Dia</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 group-hover:bg-gray-900 group-hover:text-white transition-all">
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* DIÁLOGO DE REATRIBUIÇÃO */}
            {selectedCollaborator && (
                <ReassignDialog 
                    collaborator={selectedCollaborator}
                    onClose={() => setSelectedCollaborator(null)}
                    onSuccess={onRefresh}
                />
            )}
        </div>
    )
}

