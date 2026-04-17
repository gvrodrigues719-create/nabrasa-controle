'use client'

import React, { useEffect, useState } from 'react'
import { 
    X, 
    ChevronDown, 
    ChevronUp, 
    AlertTriangle, 
    Droplet, 
    History, 
    User, 
    Clock, 
    Package 
} from 'lucide-react'
import { getGlobalHouseHealthAction } from '@/app/actions/efficiencyAction'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
    isOpen: boolean
    onClose: () => void
}

type GroupedLoss = {
    itemName: string
    unit: string
    total: number
    records: any[]
}

export default function HouseHealthDrawer({ isOpen, onClose }: Props) {
    const [loading, setLoading] = useState(true)
    const [losses, setLosses] = useState<any[]>([])
    const [leaks, setLeaks] = useState<any[]>([])
    const [expandedItem, setExpandedItem] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            loadData()
        }
    }, [isOpen])

    async function loadData() {
        setLoading(true)
        const res = await getGlobalHouseHealthAction()
        if (res.success) {
            setLosses(res.losses)
            setLeaks(res.activeLeaks)
        }
        setLoading(false)
    }

    // Agrupamento por item
    const groupedLosses: GroupedLoss[] = losses.reduce((acc: any[], loss: any) => {
        const itemName = loss.items?.name || 'Item Desconhecido'
        const unit = loss.items?.unit || 'un'
        
        const existing = acc.find(a => a.itemName === itemName)
        if (existing) {
            existing.total += loss.quantity
            existing.records.push(loss)
        } else {
            acc.push({
                itemName,
                unit,
                total: loss.quantity,
                records: [loss]
            })
        }
        return acc
    }, [])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-lg bg-[#F8F7F4] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-[#e9e8e5] bg-white flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-[#1b1c1a] tracking-tight">Saúde Global da Casa</h2>
                        <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest mt-1">Acumulado da Semana Operacional</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-[#F8F7F4] rounded-full text-[#8c716c]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-8">
                    
                    {/* SEÇÃO 1: VAZAMENTOS ATIVOS NA SEMANA */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Droplet className="w-4 h-4 text-red-500" />
                            <h3 className="text-sm font-black text-[#1b1c1a] uppercase tracking-wider">Vazamentos Ativos na Semana</h3>
                        </div>
                        
                        {leaks.length > 0 ? (
                            <div className="space-y-3">
                                {leaks.map((leak, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-2xl border border-[#e9e8e5] flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${leak.severity === 'critical' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                                                <AlertTriangle className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#1b1c1a] text-sm">{leak.label}</p>
                                                <p className="text-[10px] font-medium text-[#8c716c] uppercase">{leak.type}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-black text-red-500/60">-{leak.penalty}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-green-50/50 border border-green-100 p-6 rounded-[32px] text-center">
                                <p className="text-sm font-bold text-green-700">Operação estanque nesta semana.</p>
                                <p className="text-[11px] text-green-600/70 mt-1">Continue mantendo os padrões de eficiência.</p>
                            </div>
                        )}
                    </section>

                    {/* SEÇÃO 2: PERDAS REGISTRADAS NA SEMANA */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4 text-[#B13A2B]" />
                                <h3 className="text-sm font-black text-[#1b1c1a] uppercase tracking-wider">Perdas Registradas na Semana</h3>
                            </div>
                            <span className="text-[10px] font-bold text-[#8c716c] bg-white px-2 py-1 rounded-full border border-[#e9e8e5]">Resumo Mensurável</span>
                        </div>

                        {loading ? (
                            <div className="space-y-3 animate-pulse">
                                {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-2xl border border-[#e9e8e5]" />)}
                            </div>
                        ) : groupedLosses.length > 0 ? (
                            <div className="space-y-3">
                                {groupedLosses.map((item) => (
                                    <div 
                                        key={item.itemName} 
                                        className="bg-white rounded-2xl border border-[#e9e8e5] overflow-hidden"
                                    >
                                        {/* Row Agrupada com Total Semanal */}
                                        <button 
                                            onClick={() => setExpandedItem(expandedItem === item.itemName ? null : item.itemName)}
                                            className="w-full p-4 flex items-center justify-between active:bg-[#F8F7F4] transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-[#FDF0EF] rounded-xl flex items-center justify-center text-[#B13A2B]">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-[#1b1c1a] text-sm">{item.itemName}</p>
                                                    <p className="text-xs font-black text-[#B13A2B]">{item.total} {item.unit} <span className="text-[10px] text-[#8c716c] font-medium uppercase ml-1">total na semana</span></p>
                                                </div>
                                            </div>
                                            {expandedItem === item.itemName ? <ChevronUp className="w-4 h-4 text-[#8c716c]" /> : <ChevronDown className="w-4 h-4 text-[#8c716c]" />}
                                        </button>

                                        {/* Detalhes Individuais Chronológicos */}
                                        {expandedItem === item.itemName && (
                                            <div className="bg-[#F8F7F4] border-t border-[#e9e8e5] p-2 space-y-1">
                                                {item.records.map((record: any) => (
                                                    <div key={record.id} className="bg-white p-3 rounded-xl border border-[#e9e8e5]/50 flex flex-col gap-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-[#8c716c]">
                                                                <Clock className="w-3 h-3" />
                                                                <span className="text-[10px] font-bold">{format(new Date(record.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase text-[#B13A2B] bg-red-50 px-1.5 py-0.5 rounded-md">{record.category}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-[#1b1c1a]">
                                                                <User className="w-3 h-3 text-[#dfbfba]" />
                                                                <span className="text-[11px] font-bold">{record.users?.name || 'Sistema'}</span>
                                                            </div>
                                                            <span className="text-xs font-black text-[#1b1c1a]">{record.quantity} {item.unit}</span>
                                                        </div>
                                                        {record.observation && (
                                                            <p className="text-[10px] text-[#8c716c] italic border-t border-dashed border-[#e9e8e5] pt-1.5 mt-1">"{record.observation}"</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white border border-[#e9e8e5] p-8 rounded-[32px] text-center">
                                <p className="text-sm font-bold text-[#8c716c]">Nenhuma perda na semana.</p>
                                <p className="text-[11px] text-[#c0b3b1] mt-1 italic">Estoque 100% conforme planejado.</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Footer Transparência */}
                <div className="p-6 bg-white border-t border-[#e9e8e5] text-center">
                    <p className="text-[9px] font-bold text-[#c0b3b1] uppercase tracking-[0.2em]">NaBrasa Controle · Eficiência Semanal</p>
                </div>
            </div>
        </div>
    )
}
