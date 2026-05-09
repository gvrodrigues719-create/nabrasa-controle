'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Loader2, ArrowLeft, Search, Filter, CheckCircle2, Clock, 
    Calendar, ChevronRight, History, AlertCircle, FileSpreadsheet,
    X, Download, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { getKitchenSessionHistoryAction, getConsolidatedKitchenDataAction } from '@/app/actions/kitchenHistoryAction'

export default function KitchenHistoryPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [sessions, setSessions] = useState<any[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [consolidatedData, setConsolidatedData] = useState<any[]>([])
    const [isConsolidating, setIsConsolidating] = useState(false)
    
    const [filterDate, setFilterDate] = useState(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date()))
    
    useEffect(() => {
        loadSessions()
    }, [filterDate])

    const loadSessions = async () => {
        setLoading(true)
        setSelectedIds([])
        const res = await getKitchenSessionHistoryAction({ date: filterDate })
        if (res.success) {
            setSessions(res.data || [])
        } else {
            toast.error(res.error || 'Erro ao carregar histórico')
        }
        setLoading(false)
    }

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleConsolidate = async () => {
        if (selectedIds.length === 0) return
        
        setIsConsolidating(true)
        const res = await getConsolidatedKitchenDataAction(selectedIds)
        if (res.success) {
            setConsolidatedData(res.data || [])
            setIsDrawerOpen(true)
        } else {
            toast.error(res.error || 'Erro ao consolidar dados')
        }
        setIsConsolidating(false)
    }

    const handleExportExcel = () => {
        if (consolidatedData.length === 0) return

        const dataToExport = consolidatedData.map(item => ({
            'Categoria': item.groupName?.replace('CK — ', ''),
            'Item': item.name,
            'Quantidade': item.total,
            'Unidade': item.unit
        }))

        const ws = XLSX.utils.json_to_sheet(dataToExport)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Contagem Consolidada')
        
        const fileName = `Contagem_Cozinha_${filterDate}.xlsx`
        XLSX.writeFile(wb, fileName)
        toast.success('Excel gerado com sucesso!')
    }

    return (
        <div className="min-h-screen bg-[#F8F7F4] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 h-16 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/dashboard/kitchen')} className="p-2 hover:bg-gray-50 rounded-xl transition">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-sm font-black text-gray-900 tracking-tight uppercase">Histórico Cozinha</h1>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Contagens finalizadas</p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Filtro de Data */}
                <div className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1 block mb-2">Filtrar por Data</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={e => setFilterDate(e.target.value)} 
                            className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all" 
                        />
                    </div>
                </div>

                {/* Lista */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Buscando registros...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
                            <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhuma contagem encontrada</p>
                        </div>
                    ) : (
                        sessions.map(s => (
                            <div 
                                key={s.id} 
                                onClick={() => router.push(`/dashboard/kitchen/history/${s.id}`)}
                                className={`bg-white p-4 rounded-[24px] border shadow-sm flex items-center justify-between active:scale-[0.98] transition-all hover:border-orange-200 ${
                                    selectedIds.includes(s.id) ? 'border-orange-500 bg-orange-50/30' : 'border-gray-100'
                                }`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {/* Checkbox */}
                                    <button 
                                        onClick={(e) => toggleSelect(s.id, e)}
                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                                            selectedIds.includes(s.id) 
                                                ? 'bg-orange-600 border-orange-600 text-white' 
                                                : 'border-gray-200 bg-gray-50'
                                        }`}
                                    >
                                        {selectedIds.includes(s.id) && <Check className="w-4 h-4" />}
                                    </button>

                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                        s.validation_status === 'validated' ? 'bg-emerald-50 text-emerald-600' :
                                        s.validation_status === 'corrected' ? 'bg-amber-50 text-amber-600' :
                                        'bg-gray-50 text-gray-400'
                                    }`}>
                                        {s.validation_status === 'validated' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black text-gray-900 leading-tight uppercase truncate">{s.groups?.name?.replace('CK — ', '')}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                {new Date(s.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-gray-200">•</span>
                                            <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest truncate">{s.users?.name?.split(' ')[0]}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
                                        s.validation_status === 'validated' ? 'bg-emerald-100 text-emerald-700' :
                                        s.validation_status === 'corrected' ? 'bg-amber-100 text-amber-700' :
                                        'bg-gray-100 text-gray-400'
                                    }`}>
                                        {s.validation_status === 'validated' ? 'Validada' : s.validation_status === 'corrected' ? 'Corrigida' : 'Pendente'}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-300" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Floating Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-4 right-4 z-[60]">
                    <div className="bg-gray-900/90 backdrop-blur-xl p-4 rounded-[32px] border border-white/10 shadow-2xl flex items-center justify-between gap-4">
                        <div className="flex flex-col ml-2">
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Selecionados</span>
                            <span className="text-white text-sm font-black">{selectedIds.length} sessões</span>
                        </div>
                        <button 
                            onClick={handleConsolidate}
                            disabled={isConsolidating}
                            className="h-12 px-6 bg-white text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isConsolidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                            Consolidar
                        </button>
                    </div>
                </div>
            )}

            {/* Consolidated View Drawer */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-[100] flex items-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
                    <div className="relative w-full bg-white rounded-t-[40px] max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                        {/* Drawer Handle */}
                        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />
                        
                        {/* Drawer Header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50 shrink-0">
                            <div>
                                <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Relatório Consolidado</h2>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Resumo de {selectedIds.length} contagens</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleExportExcel}
                                    className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-100 transition shadow-sm"
                                    title="Exportar para Excel"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => setIsDrawerOpen(false)}
                                    className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Drawer Content - Table */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-12 px-2 pb-2 border-b border-gray-100">
                                    <span className="col-span-8 text-[9px] font-black text-gray-400 uppercase tracking-widest">Item / Categoria</span>
                                    <span className="col-span-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Total</span>
                                </div>
                                {consolidatedData.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 items-center p-3 hover:bg-gray-50 rounded-2xl transition border border-transparent hover:border-gray-100">
                                        <div className="col-span-8">
                                            <p className="text-[11px] font-black text-gray-900 uppercase truncate">{item.name}</p>
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{item.groupName?.replace('CK — ', '')}</p>
                                        </div>
                                        <div className="col-span-4 text-right">
                                            <span className="text-sm font-black text-orange-600">{item.total}</span>
                                            <span className="ml-1 text-[9px] font-bold text-gray-400 uppercase">{item.unit}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-6 bg-gray-50 shrink-0 flex items-center justify-between rounded-b-[40px]">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{consolidatedData.length} itens totais</span>
                            <button 
                                onClick={handleExportExcel}
                                className="px-6 h-12 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 flex items-center gap-2 hover:bg-black transition-all"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Baixar Planilha
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
