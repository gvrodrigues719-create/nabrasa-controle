"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getChecklistSessionDetailsAction } from '@/app/actions/checklistAction'
import { 
    ArrowLeft, 
    Loader2, 
    User, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Camera,
    Info,
    LayoutGrid
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AuditDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const sessionId = params.sessionId as string
    
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            const res = await getChecklistSessionDetailsAction(sessionId)
            if (res.success) setData(res.data)
            setLoading(false)
        }
        load()
    }, [sessionId])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-[#B13A2B] animate-spin mb-4" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Carregando Auditoria...</p>
            </div>
        )
    }

    if (!data) return <div className="p-10 text-center">Auditoria não encontrada.</div>

    const { session, items, responses } = data
    const responsesMap = Object.fromEntries(responses.map((r: any) => [r.item_id, r]))

    return (
        <div className="pb-20">
            {/* HEADER */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-4 md:px-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-xl transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">Inspeção de Auditoria</h1>
                            <p className="text-[10px] font-bold text-[#B13A2B] uppercase tracking-widest">Sessão: {sessionId.slice(0, 8)}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-5 mt-8">
                {/* HERO INFO */}
                <div className="bg-white rounded-[32px] p-6 border border-gray-200 shadow-sm mb-8">
                    <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-[#B13A2B]">
                                <LayoutGrid className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-black text-xl text-gray-900">{session.checklist_templates?.name}</h2>
                                <p className="text-sm text-gray-500 font-medium">{session.checklist_templates?.description}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-100">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-black text-green-700 uppercase tracking-widest">Concluído</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-lg">
                                <User className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operador</p>
                                <p className="text-sm font-bold text-gray-900">{session.users?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-lg">
                                <Clock className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Concluído em</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {format(new Date(session.completed_at), "HH:mm '·' d 'de' MMM", { locale: ptBR })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LISTA DE ITENS AUDITADOS */}
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 pl-1">Respostas e Evidências</h3>
                <div className="space-y-4">
                    {items.map((item: any) => {
                        const response = responsesMap[item.id]
                        const hasEvidence = response?.evidence_url

                        return (
                            <div key={item.id} className="bg-white border border-gray-200 rounded-[24px] overflow-hidden">
                                <div className="p-5 flex flex-wrap gap-4 justify-between items-start">
                                    <div className="flex-1 min-w-[200px]">
                                        <h4 className="font-bold text-gray-900 mb-1">{item.label}</h4>
                                        <div className="flex items-center gap-2">
                                            {item.evidence_required && (
                                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                                    Foto Obrigatória
                                                </span>
                                            )}
                                            <span className="text-[10px] text-gray-400 font-medium">#{item.display_order}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        {/* VALOR DA RESPOSTA */}
                                        <div className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest ${
                                            response?.value === true ? 'bg-green-100 text-green-700' :
                                            response?.value === false ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {response?.value === true ? 'Sim' : 
                                             response?.value === false ? 'Não' : 
                                             response?.value || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {/* EVIDÊNCIA FOTOGRÁFICA */}
                                {hasEvidence ? (
                                    <div className="px-5 pb-5">
                                        <div className="relative group">
                                            <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-lg border border-white/20">
                                                <Camera className="w-3 h-3 text-white" />
                                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Evidência Real</span>
                                            </div>
                                            <img 
                                                src={response.evidence_url} 
                                                alt={`Evidência ${item.label}`}
                                                className="w-full aspect-[16/9] object-cover rounded-2xl border border-gray-200"
                                            />
                                        </div>
                                    </div>
                                ) : item.evidence_required ? (
                                    <div className="px-5 pb-5">
                                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
                                            <Info className="w-5 h-5 text-amber-500" />
                                            <p className="text-xs font-bold text-amber-700 uppercase tracking-tight">Faltou foto obrigatória</p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            </main>
        </div>
    )
}
