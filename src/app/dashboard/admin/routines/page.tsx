'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Loader2, Save, X, CalendarSync, CheckSquare, Square } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ConfirmModal'

type Routine = {
    id: string
    name: string
    frequency: string
    active: boolean
    routine_type: 'count' | 'checklist'
}

type Group = {
    id: string
    name: string
}

export default function RoutinesPage() {
    const [routines, setRoutines] = useState<Routine[]>([])
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState<string | null>(null)
    const [itemToDelete, setItemToDelete] = useState<string | null>(null)

    // form
    const [name, setName] = useState('')
    const [frequency, setFrequency] = useState('daily')
    const [selectedGroups, setSelectedGroups] = useState<string[]>([])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const [rRes, gRes] = await Promise.all([
            supabase.from('routines').select('*').order('created_at', { ascending: false }),
            supabase.from('groups').select('id, name').order('name', { ascending: true })
        ])
        if (rRes.data) setRoutines(rRes.data)
        if (gRes.data) setGroups(gRes.data)
        setLoading(false)
    }

    const loadRoutineData = async (r: Routine) => {
        setIsEditing(r.id)
        setName(r.name)
        setFrequency(r.frequency || 'daily')
        // routine_type fallback at read is handled naturally by DB/REST
        const { data } = await supabase.from('routine_groups').select('group_id').eq('routine_id', r.id)
        if (data) {
            setSelectedGroups(data.map(d => d.group_id))
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return toast.error('Nome da rotina obrigatório')

        let routineId = isEditing
        let inserted = false
        let hasError = false

        if (isEditing && isEditing !== 'new') {
            const { error } = await supabase.from('routines').update({ name, frequency, routine_type: 'count' }).eq('id', isEditing)
            if (error) { hasError = true; toast.error(error.message) }
            else inserted = true
        } else {
            const { data, error } = await supabase.from('routines').insert([{ name, frequency, routine_type: 'count' }]).select().single()
            if (error) { hasError = true; toast.error(error.message) }
            if (data) {
                routineId = data.id
                inserted = true
            }
        }

        if (inserted && routineId && !hasError) {
            await supabase.from('routine_groups').delete().eq('routine_id', routineId)
            if (selectedGroups.length > 0) {
                const inserts = selectedGroups.map(gId => ({ routine_id: routineId, group_id: gId }))
                const { error: insErr } = await supabase.from('routine_groups').insert(inserts)
                if (insErr) { toast.error("Erro ao atrelar grupos: " + insErr.message); return }
            }
            toast.success(`Rotina ${isEditing === 'new' ? 'criada' : 'atualizada'} com sucesso!`)
            setIsEditing(null)
            resetForm()
            fetchData()
        }
    }

    const resetForm = () => {
        setName('')
        setFrequency('daily')
        setSelectedGroups([])
    }

    const toggleGroup = (id: string) => {
        if (selectedGroups.includes(id)) {
            setSelectedGroups(selectedGroups.filter(g => g !== id))
        } else {
            setSelectedGroups([...selectedGroups, id])
        }
    }

    const handleDelete = async (id: string) => {
        setItemToDelete(id)
    }

    const confirmDelete = async () => {
        if (!itemToDelete) return
        const { error } = await supabase.from('routines').delete().eq('id', itemToDelete)
        if (error) toast.error("Erro ao deletar: " + error.message)
        else {
            toast.success('Excluída com sucesso!')
            fetchData()
        }
        setItemToDelete(null)
    }

    return (
        <div className="p-4 space-y-4">
            <ConfirmModal
                isOpen={!!itemToDelete}
                title="Excluir Rotina"
                message="Tem certeza que deseja excluir esta rotina? Ações atreladas serão apagadas permanentemente."
                confirmText="Excluir"
                onCancel={() => setItemToDelete(null)}
                onConfirm={confirmDelete}
            />
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Rotinas</h2>
                {!isEditing && (
                    <button onClick={() => { setIsEditing('new'); resetForm(); }} className="bg-indigo-600 text-white py-2 px-4 rounded-xl flex items-center space-x-2 shadow-sm hover:bg-indigo-700 transition active:scale-95">
                        <Plus className="w-5 h-5" />
                        <span className="text-sm font-semibold">Criar</span>
                    </button>
                )}
            </div>

            {isEditing && (
                <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl shadow-lg border border-indigo-100 space-y-4 mb-6">
                    <h3 className="font-extrabold text-gray-900 text-lg border-b pb-2 border-gray-100">
                        {isEditing === 'new' ? 'Nova Rotina' : 'Editar Rotina'}
                    </h3>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nome da Rotina</label>
                        <input required autoFocus value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-4 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium" placeholder="Ex: Contagem Semanal Bar" />
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Frequência</label>
                        <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-4 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium">
                            <option value="daily">Diária</option>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2 mt-4">Locais a Contar na Rotina</label>
                        <div className="space-y-2 border border-gray-100 bg-gray-50 p-3 rounded-xl max-h-60 overflow-y-auto">
                            {groups.length === 0 ? <p className="text-sm text-gray-500">Nenhum local cadastrado.</p> : null}
                            {groups.map(g => (
                                <div key={g.id} onClick={() => toggleGroup(g.id)} className="flex items-center space-x-3 p-2 bg-white rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-300 transition">
                                    {selectedGroups.includes(g.id) ? (
                                        <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                                    ) : (
                                        <Square className="w-5 h-5 text-gray-400 shrink-0" />
                                    )}
                                    <span className="font-medium text-gray-800 text-sm">{g.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex space-x-3 pt-4 sticky bottom-4 bg-white p-3 rounded-2xl shadow-xl z-20 border border-gray-100">
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
                    ) : routines.length === 0 ? (
                        <div className="text-center py-10 px-4 text-gray-500 bg-white rounded-2xl border border-gray-200 border-dashed">
                            <CalendarSync className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="font-medium text-gray-600">Nenhuma rotina configurada</p>
                            <p className="text-sm mt-1">Crie as agendas de contagem vinculando os locais.</p>
                        </div>
                    ) : (
                        routines.map(r => (
                            <div key={r.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-indigo-200 transition-colors">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">{r.name}</h4>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">
                                        {r.frequency === 'daily' ? 'Diária' : r.frequency === 'weekly' ? 'Semanal' : 'Mensal'}
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => loadRoutineData(r)} className="p-2.5 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition active:scale-95">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(r.id)} className="p-2.5 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition active:scale-95">
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
