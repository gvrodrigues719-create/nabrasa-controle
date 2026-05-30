'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
    Loader2, ArrowLeft, Search, Filter, CheckCircle2, Clock, 
    ShoppingCart, ListChecks, Calendar, Trash2, AlertTriangle, ChevronRight,
    Undo2
} from 'lucide-react'
import toast from 'react-hot-toast'
import ConsolidatedPurchaseSuggestionDrawer from './ConsolidatedPurchaseSuggestionDrawer'
import { getScopedFilterMetadataAction } from '@/app/actions/commonMetadataAction'
import { getScopedSessionsAction } from '@/app/actions/sessionAction'

export default function ConsolidatedHistoryPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [sessions, setSessions] = useState<any[]>([])
    const [units, setUnits] = useState<any[]>([])
    const [groups, setGroups] = useState<any[]>([])
    
    // Filtros
    const [filterUnit, setFilterUnit] = useState('')
    const [filterGroup, setFilterGroup] = useState('')
    const [filterStatus, setFilterStatus] = useState('completed')
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
    
    // Seleção
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    useEffect(() => {
        loadMetadata()
        loadSessions()
    }, [])

    const loadMetadata = async () => {
        const res = await getScopedFilterMetadataAction()
        if (res.success) {
            setUnits(res.units || [])
            setGroups(res.groups || [])
        }
    }

    const loadSessions = async () => {
        setLoading(true)
        try {
            const res = await getScopedSessionsAction({
                unitId: filterUnit,
                groupId: filterGroup,
                status: filterStatus,
                date: filterDate
            })
            if (res.success && res.data) {
                setSessions(res.data)
            } else if (res.error) {
                throw new Error(res.error)
            }
        } catch (e: any) {
            toast.error('Erro ao carregar sessões')
        } finally {
            setLoading(false)
        }
    }

    const toggleSession = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const selectTodaysLatest = () => {
        // Lógica: Para cada grupo, pegar a contagem mais recente de hoje
        const latestByGroup = new Map<string, string>()
        sessions.forEach(s => {
            const groupId = s.groups?.id
            if (groupId && !latestByGroup.has(groupId)) {
                latestByGroup.set(groupId, s.id)
            }
        })
        setSelectedIds(new Set(Array.from(latestByGroup.values())))
        toast.success(`${latestByGroup.size} contagens selecionadas (uma por grupo)`)
    }

    const clearSelection = () => setSelectedIds(new Set())

    // Verificação de duplicidade de grupos na seleção
    const duplicateGroupsWarning = useMemo(() => {
        const selectedSessions = sessions.filter(s => selectedIds.has(s.id))
        const groupCount = new Map<string, number>()
        selectedSessions.forEach(s => {
            const name = s.groups?.name || 'Sem grupo'
            groupCount.set(name, (groupCount.get(name) || 0) + 1)
        })
        return Array.from(groupCount.entries()).filter(([_, count]) => count > 1).map(([name]) => name)
    }, [selectedIds, sessions])

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard/admin/history')} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <ArrowLeft className="w-6 h-6 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight uppercase">Consolidação de Compras</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selecione as contagens para gerar o pedido</p>
                    </div>
                </div>
                {selectedIds.size > 0 && (
                    <button 
                        onClick={() => setIsDrawerOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 animate-in zoom-in duration-300"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Gerar Sugestão Consolidada ({selectedIds.size})
                    </button>
                )}
            </div>

            {/* Filtros e Ações Rápidas */}
            <div className="p-6 space-y-4">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Unidade</label>
                            <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">Todas as Unidades</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Grupo/Categoria</label>
                            <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="">Todos os Grupos</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Data da Contagem</label>
                            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="flex items-end">
                            <button onClick={loadSessions} className="w-full h-11 bg-gray-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition flex items-center justify-center gap-2">
                                <Search className="w-4 h-4" /> Filtrar
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex flex-wrap gap-2">
                        <button onClick={selectTodaysLatest} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition">
                            Últimas de Hoje (1 por grupo)
                        </button>
                        <button onClick={clearSelection} className="px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition">
                            Limpar Seleção
                        </button>
                    </div>
                </div>

                {/* Alerta de Duplicidade */}
                {duplicateGroupsWarning.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                            <p className="text-[11px] font-black text-amber-800 uppercase">Atenção: Grupos Duplicados</p>
                            <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                                Você selecionou mais de uma contagem para os grupos: <span className="font-black underline">{duplicateGroupsWarning.join(', ')}</span>. 
                                O sistema irá **somar** os estoques de todas as sessões selecionadas. Certifique-se de que não são contagens repetidas do mesmo estoque físico.
                            </p>
                        </div>
                    </div>
                )}

                {/* Lista de Sessões */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Buscando sessões...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
                            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhuma sessão encontrada para este filtro</p>
                        </div>
                    ) : (
                        sessions.map(s => (
                            <div 
                                key={s.id} 
                                onClick={() => toggleSession(s.id)}
                                className={`bg-white p-5 rounded-[28px] border transition-all cursor-pointer group flex items-center justify-between ${
                                    selectedIds.has(s.id) ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-gray-100 hover:border-indigo-200'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                                        selectedIds.has(s.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 border-gray-200 text-transparent'
                                    }`}>
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">{s.groups?.name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {s.users?.units?.name || 'Unidade —'}
                                            </p>
                                            <span className="text-gray-200">•</span>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {new Date(s.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <span className="text-gray-200">•</span>
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{s.users?.name}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${
                                            s.validation_status === 'validated' ? 'bg-green-100 text-green-700' :
                                            s.validation_status === 'corrected' ? 'bg-indigo-100 text-indigo-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {s.validation_status === 'validated' ? 'Validada' : s.validation_status === 'corrected' ? 'Corrigida' : 'Pendente'}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-200 group-hover:text-indigo-400 transition" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <ConsolidatedPurchaseSuggestionDrawer 
                sessionIds={Array.from(selectedIds)}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />
        </div>
    )
}
