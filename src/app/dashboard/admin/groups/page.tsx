'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Loader2, Save, X, LayoutGrid } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ConfirmModal'

type Group = {
    id: string
    name: string
    macro_sector: string
    description: string
    order_index: number
    active: boolean
}

export default function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState<string | null>(null)
    const [itemToDelete, setItemToDelete] = useState<string | null>(null)

    // form
    const [name, setName] = useState('')
    const [macroSector, setMacroSector] = useState('')
    const [description, setDescription] = useState('')

    useEffect(() => {
        fetchGroups()
    }, [])

    const fetchGroups = async () => {
        setLoading(true)
        const { data } = await supabase.from('groups').select('*').order('order_index', { ascending: true })
        if (data) setGroups(data)
        setLoading(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return toast.error('Nome do local é obrigatório')

        let error = null
        if (isEditing && isEditing !== 'new') {
            const res = await supabase.from('groups').update({ name, macro_sector: macroSector, description }).eq('id', isEditing)
            error = res.error
        } else {
            const res = await supabase.from('groups').insert([{ name, macro_sector: macroSector, description, order_index: groups.length }])
            error = res.error
        }

        if (error) {
            toast.error(error.message)
            return
        }

        toast.success(`Grupo ${isEditing === 'new' ? 'criado' : 'atualizado'} com sucesso!`)
        setIsEditing(null)
        setName('')
        setMacroSector('')
        setDescription('')
        fetchGroups()
    }

    const handleDelete = async (id: string) => {
        setItemToDelete(id)
    }

    const confirmDelete = async () => {
        if (!itemToDelete) return
        const { error } = await supabase.from('groups').delete().eq('id', itemToDelete)
        if (error) {
            if (error.code === '23503') toast.error("Não pode ser excluído, pois há itens atrelados a este grupo.")
            else toast.error("Erro ao deletar: " + error.message)
        } else {
            toast.success('Excluído com sucesso!')
            fetchGroups()
        }
        setItemToDelete(null)
    }

    return (
        <div className="p-4 flex flex-col h-screen overflow-hidden">
            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Excluir Local"
                message="Tem certeza que deseja excluir? Esta ação não pode ser desfeita e locais com itens vinculados não poderão ser apagados."
                confirmText="Sim, excluir"
                onCancel={() => setItemToDelete(null)}
                onConfirm={confirmDelete}
            />
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Cenários/Locais</h2>
                {!isEditing && (
                    <button onClick={() => {
                        setIsEditing('new');
                        setName('');
                        setMacroSector('');
                        setDescription('');
                    }} className="bg-indigo-600 text-white py-2 px-4 rounded-xl flex items-center space-x-2 shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all active:scale-95">
                        <Plus className="w-5 h-5" />
                        <span className="text-sm font-semibold">Novo Local</span>
                    </button>
                )}
            </div>

            {isEditing && (
                <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl shadow-lg border border-indigo-100 space-y-4 mb-6">
                    <h3 className="font-extrabold text-gray-900 text-lg border-b pb-2 border-gray-100">
                        {isEditing === 'new' ? 'Novo Local de Contagem' : 'Editar Local'}
                    </h3>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nome do Local</label>
                        <input required autoFocus value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-4 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-gray-900" placeholder="Ex: Câmara Fria 01" />
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Setor/Macro (Opcional)</label>
                        <input value={macroSector} onChange={e => setMacroSector(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-4 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-gray-900" placeholder="Ex: Cozinha Principal" />
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Descrição</label>
                        <input value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-gray-900 text-sm" placeholder="Opcional..." />
                    </div>

                    <div className="flex space-x-3 pt-4 sticky bottom-4 bg-white p-3 rounded-2xl shadow-xl z-20 border border-gray-100">
                        <button type="button" onClick={() => { setIsEditing(null); setName(''); setMacroSector('') }} className="flex-1 py-4 border border-gray-200 text-gray-600 rounded-xl font-bold flex justify-center items-center hover:bg-gray-50 transition active:scale-95 text-sm">
                            <X className="w-5 h-5 mr-2" /> Cancelar
                        </button>
                        <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold flex justify-center items-center shadow-sm hover:bg-indigo-700 transition active:scale-95 text-sm">
                            <Save className="w-5 h-5 mr-2" /> Salvar
                        </button>
                    </div>
                </form>
            )}

            {!isEditing && (
                <div className="space-y-4 overflow-y-auto flex-1 pb-8">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                    ) : groups.length === 0 ? (
                        <div className="text-center py-10 px-4 text-gray-500 bg-white rounded-2xl border border-gray-200 border-dashed">
                            <LayoutGrid className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="font-medium text-gray-600">Nenhum local configurado</p>
                            <p className="text-sm mt-1">Crie seus grupos operacionais, como "Estoque Seco" ou "Geladeira 1".</p>
                        </div>
                    ) : (
                        groups.map(g => (
                            <div key={g.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-indigo-200 transition-colors">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">{g.name}</h4>
                                    {g.macro_sector && (
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">{g.macro_sector}</p>
                                    )}
                                    {g.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{g.description}</p>}
                                </div>
                                <div className="flex space-x-2 pl-4">
                                    <button onClick={() => {
                                        setIsEditing(g.id);
                                        setName(g.name);
                                        setMacroSector(g.macro_sector || '');
                                        setDescription(g.description || '')
                                    }} className="p-3 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition active:scale-95">
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(g.id)} className="p-3 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition active:scale-95">
                                        <Trash2 className="w-5 h-5" />
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
