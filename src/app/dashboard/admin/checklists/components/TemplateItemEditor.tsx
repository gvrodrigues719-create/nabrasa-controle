"use client"

import { useState } from 'react'
import { Plus, Trash2, GripVertical, Settings2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { ChecklistTemplateItem } from '@/modules/checklist/types'

interface Props {
    items: ChecklistTemplateItem[]
    onUpdate: (items: ChecklistTemplateItem[]) => void
}

export default function TemplateItemEditor({ items, onUpdate }: Props) {
    const [newItemLabel, setNewItemLabel] = useState('')

    const addItem = () => {
        if (!newItemLabel.trim()) return
        const newItem: ChecklistTemplateItem = {
            id: crypto.randomUUID(),
            label: newItemLabel,
            response_type: 'boolean',
            required: true,
            evidence_required: false,
            display_order: items.length + 1,
            criticality: 'standard',
            generates_issue: true,
            generates_alert: false
        }
        onUpdate([...items, newItem])
        setNewItemLabel('')
    }

    const removeItem = (id: string) => {
        const filtered = items.filter(i => i.id !== id)
        // Re-reorder
        const reordered = filtered.map((item, idx) => ({ ...item, display_order: idx + 1 }))
        onUpdate(reordered)
    }

    const updateItem = (id: string, updates: Partial<ChecklistTemplateItem>) => {
        onUpdate(items.map(i => i.id === id ? { ...i, ...updates } : i))
    }

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...items]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= newItems.length) return

        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
        
        // Fix display_order
        const fixed = newItems.map((item, idx) => ({ ...item, display_order: idx + 1 }))
        onUpdate(fixed)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-gray-400" />
                    Itens do Checklist
                </h3>
                <span className="text-[10px] font-bold text-gray-400">{items.length} itens</span>
            </div>

            <div className="space-y-2">
                {items.sort((a, b) => a.display_order - b.display_order).map((item, index) => (
                    <div 
                        key={item.id} 
                        className="group flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 transition-all shadow-sm"
                    >
                        <div className="flex flex-col gap-1 mt-1">
                            <button 
                                onClick={() => moveItem(index, 'up')}
                                disabled={index === 0}
                                className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-0"
                            >
                                <ChevronUp className="w-3 h-3" />
                            </button>
                            <button 
                                onClick={() => moveItem(index, 'down')}
                                disabled={index === items.length - 1}
                                className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-0"
                            >
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="flex-1 space-y-3">
                            <div className="flex gap-3">
                                <input 
                                    type="text"
                                    value={item.label}
                                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                                    className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-gray-800 focus:ring-0 placeholder:text-gray-300"
                                    placeholder="Descreva o item operacional..."
                                />
                                <div className="flex items-center gap-1">
                                    <select 
                                        value={item.criticality}
                                        onChange={(e) => updateItem(item.id, { criticality: e.target.value as any })}
                                        className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border-none focus:ring-0 cursor-pointer ${
                                            item.criticality === 'critical' ? 'bg-red-50 text-red-600' :
                                            item.criticality === 'important' ? 'bg-amber-50 text-amber-600' :
                                            'bg-gray-50 text-gray-600'
                                        }`}
                                    >
                                        <option value="standard">Padrão</option>
                                        <option value="important">Importante</option>
                                        <option value="critical">Crítico</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400">
                                <label className="flex items-center gap-2 cursor-pointer hover:text-gray-600">
                                    <input 
                                        type="checkbox"
                                        checked={item.required}
                                        onChange={(e) => updateItem(item.id, { required: e.target.checked })}
                                        className="rounded text-[#B13A2B] focus:ring-[#B13A2B] bg-gray-50 border-gray-200"
                                    />
                                    Obrigatório
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer hover:text-gray-600">
                                    <input 
                                        type="checkbox"
                                        checked={item.generates_issue}
                                        onChange={(e) => updateItem(item.id, { generates_issue: e.target.checked })}
                                        className="rounded text-[#B13A2B] focus:ring-[#B13A2B] bg-gray-50 border-gray-200"
                                    />
                                    Gera Pendência
                                </label>
                                <select 
                                    value={item.response_type}
                                    onChange={(e) => updateItem(item.id, { response_type: e.target.value as any })}
                                    className="bg-transparent border-none p-0 text-[10px] font-bold text-gray-400 focus:ring-0"
                                >
                                    <option value="boolean">Sim/Não</option>
                                    <option value="number">Numérico</option>
                                    <option value="text">Texto</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                <input 
                    type="text"
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addItem()}
                    placeholder="Adicionar novo item..."
                    className="flex-1 bg-transparent border-none px-4 py-3 text-sm font-bold text-gray-700 focus:ring-0 placeholder:text-gray-400"
                />
                <button 
                    onClick={addItem}
                    className="px-4 bg-[#B13A2B] text-white rounded-xl hover:bg-[#8c2e22] transition-all"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
