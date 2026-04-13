'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Loader2, Save, X, Search, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ConfirmModal'

type Item = {
    id: string
    code: string
    name: string
    unit: string
    unit_observation: string
    group_id: string
    average_cost: number
    active: boolean
    groups?: { name: string } | null
}

type Group = {
    id: string
    name: string
}

export default function ItemsPage() {
    const [items, setItems] = useState<Item[]>([])
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState<string | null>(null)
    const [itemToDelete, setItemToDelete] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // form
    const [name, setName] = useState('')
    const [unit, setUnit] = useState('un')
    const [unitObs, setUnitObs] = useState('')
    const [groupId, setGroupId] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const [itemsRes, groupsRes] = await Promise.all([
            supabase.from('items').select('*, groups(name)').order('name', { ascending: true }),
            supabase.from('groups').select('id, name').order('name', { ascending: true })
        ])
        if (itemsRes.data) setItems(itemsRes.data as unknown as Item[])
        if (groupsRes.data) setGroups(groupsRes.data)
        setLoading(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !groupId) return toast.error('Nome e local são obrigatórios.')

        const payload = {
            name,
            unit,
            unit_observation: unitObs,
            group_id: groupId
        }

        let error = null
        if (isEditing && isEditing !== 'new') {
            const res = await supabase.from('items').update(payload).eq('id', isEditing)
            error = res.error
        } else {
            const res = await supabase.from('items').insert([payload])
            error = res.error
        }

        if (error) {
            toast.error(error.message)
            return
        }

        toast.success(`Item ${isEditing === 'new' ? 'criado' : 'atualizado'} com sucesso!`)
        setIsEditing(null)
        setSearchQuery('') // Bug 6: limpa busca após salvar
        resetForm()
        fetchData()
    }

    const resetForm = () => {
        setName('')
        setUnit('un')
        setUnitObs('')
        setGroupId('')
    }

    const handleDelete = async (id: string) => {
        setItemToDelete(id)
    }

    const confirmDelete = async () => {
        if (!itemToDelete) return
        const { error } = await supabase.from('items').delete().eq('id', itemToDelete)
        if (error) toast.error("Erro ao deletar: " + error.message)
        else {
            toast.success('Excluído com sucesso!')
            fetchData()
        }
        setItemToDelete(null)
    }

    const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))

    return (
        <div className="p-4 space-y-4">
            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Excluir Item"
                message="Tem certeza que deseja excluir este item? Ações vinculadas a ele poderão ser perdidas."
                confirmText="Excluir"
                onCancel={() => setItemToDelete(null)}
                onConfirm={confirmDelete}
            />
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Itens de Estoque</h2>
                {!isEditing && (
                    <button onClick={() => { setIsEditing('new'); resetForm(); }} className="bg-indigo-600 text-white py-2 px-4 rounded-xl flex items-center space-x-2 shadow-sm hover:bg-indigo-700 transition active:scale-95">
                        <Plus className="w-5 h-5" />
                        <span className="text-sm font-semibold">Novo Item</span>
                    </button>
                )}
            </div>

            {!isEditing && (
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none bg-white shadow-sm font-medium"
                        placeholder="Buscar itens..."
                    />
                </div>
            )}

            {isEditing && (
                <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl shadow-lg border border-indigo-100 space-y-4 mb-6">
                    <h3 className="font-extrabold text-gray-900 text-lg border-b pb-2 border-gray-100">
                        {isEditing === 'new' ? 'Novo Item' : 'Editar Item'}
                    </h3>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nome do Produto</label>
                        <input required autoFocus value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-4 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium" placeholder="Ex: Cerveja Heineken 600ml" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Unidade</label>
                            <input required value={unit} onChange={e => setUnit(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-4 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium" placeholder="Ex: un, kg, pct" />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Local Primário</label>
                            <select required value={groupId} onChange={e => setGroupId(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-4 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium truncate">
                                <option value="" disabled>Selecione...</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Observação da Contagem</label>
                        <input value={unitObs} onChange={e => setUnitObs(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm" placeholder="Ex: Contar garrafas abertas em décimos" />
                    </div>

                    <div className="flex space-x-3 pt-4 sticky bottom-0 bg-white pb-4 pt-3 px-0 z-20">
                        <button type="button" onClick={() => { setIsEditing(null); resetForm() }} className="flex-1 py-4 border border-gray-200 text-gray-600 rounded-xl font-bold flex justify-center items-center hover:bg-gray-50 transition active:scale-95 text-sm">
                            <X className="w-5 h-5 mr-2" /> Cancelar
                        </button>
                        <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold flex justify-center items-center shadow-sm hover:bg-indigo-700 transition active:scale-95 text-sm">
                            <Save className="w-5 h-5 mr-2" /> Salvar
                        </button>
                    </div>
                </form>
            )}

            {!isEditing && (
                <div className="space-y-3 pb-8">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-10 px-4 text-gray-500 bg-white rounded-2xl border border-gray-200 border-dashed">
                            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="font-medium text-gray-600">Nenhum item encontrado</p>
                        </div>
                    ) : (
                        filteredItems.map(i => (
                            <div key={i.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-indigo-200 transition-colors">
                                <div className="flex-1 overflow-hidden pr-2">
                                    <h4 className="font-bold text-gray-900 text-base truncate">{i.name}</h4>
                                    <div className="flex flex-wrap items-center mt-1.5 gap-2">
                                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                            {i.unit}
                                        </span>
                                        <span className="text-xs text-gray-500 font-medium truncate max-w-[150px]">
                                            {i.groups?.name || 'Sem local'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex space-x-2 shrink-0">
                                    <button onClick={() => {
                                        setIsEditing(i.id);
                                        setName(i.name);
                                        setUnit(i.unit);
                                        setUnitObs(i.unit_observation || '');
                                        setGroupId(i.group_id || '');
                                    }} className="p-2.5 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition active:scale-95">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(i.id)} className="p-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition active:scale-95">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
