'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, Users, Shield, Lock, Power } from 'lucide-react'
import { adminUpdateUserAction } from '@/app/actions/criticalActions'
import { PinConfirmModal } from '@/components/PinConfirmModal'
import toast from 'react-hot-toast'

type UserProfile = {
    id: string
    email: string
    name: string
    role: string
    active: boolean
    has_pin?: boolean
}

export default function UsersPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<UserProfile[]>([])

    // Editor State
    const [editingUser, setEditingUser] = useState<Partial<UserProfile> | null>(null)
    const [newPin, setNewPin] = useState('')
    const [showConfirmPin, setShowConfirmPin] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadUsers()
    }, [])

    const loadUsers = async () => {
        setLoading(true)
        // Fetch users using the existing table. Since this is admin page, RLS should allow manager to view all users.
        const { data, error } = await supabase.from('users').select('*').order('name')
        if (error) {
            toast.error("Erro ao carregar usuários.")
        } else {
            setUsers(data || [])
        }
        setLoading(false)
    }

    const openCreate = () => {
        setEditingUser({ name: '', email: '', role: 'operator', active: true })
        setNewPin('')
    }

    const openEdit = (u: UserProfile) => {
        setEditingUser(u)
        setNewPin('')
    }

    const handleSaveConfirm = async (managerPin: string) => {
        if (!editingUser) return
        setSaving(true)
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            if (!currentUser) throw new Error("Usuário não autenticado.")

            await adminUpdateUserAction(currentUser.id, managerPin, {
                id: editingUser.id,
                name: editingUser.name || '',
                email: editingUser.email || '',
                role: editingUser.role || 'operator',
                active: editingUser.active === undefined ? true : editingUser.active,
                newPin: newPin || undefined
            })

            toast.success("Usuário salvo com sucesso!")
            setEditingUser(null)
            setShowConfirmPin(false)
            loadUsers()
        } catch (err: any) {
            setSaving(false)
            throw new Error(err.message) // let modal catch it
        }
        setSaving(false)
    }

    const requestSave = (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingUser?.name || !editingUser?.email) {
            return toast.error("Preencha nome e e-mail")
        }
        if (newPin && newPin.length !== 4) {
            return toast.error("O PIN deve ter exatamente 4 dígitos")
        }
        setShowConfirmPin(true)
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>

    if (editingUser) return (
        <div className="p-4 space-y-4">
            <PinConfirmModal
                isOpen={showConfirmPin}
                title="Salvar Alterações de Acesso?"
                message={`Digite seu PIN Gerencial para confirmar e ${editingUser.id ? 'modificar os acessos' : 'criar a credencial'} para este membro.`}
                onConfirmPin={handleSaveConfirm}
                onClose={() => setShowConfirmPin(false)}
            />

            <div className="flex items-center space-x-3 mb-6">
                <button onClick={() => setEditingUser(null)} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-extrabold text-gray-900">{editingUser.id ? 'Editar Usuário' : 'Novo Funcionário'}</h2>
            </div>

            <form onSubmit={requestSave} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Nome Completo</label>
                    <input
                        type="text" required value={editingUser.name || ''}
                        onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                        className="w-full bg-gray-50 border-gray-200 border p-3 rounded-xl focus:bg-white outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">E-mail Operacional</label>
                    <input
                        type="email" required value={editingUser.email || ''}
                        onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                        disabled={!!editingUser.id}
                        className="w-full bg-gray-50 border-gray-200 border p-3 rounded-xl focus:bg-white outline-none disabled:opacity-50"
                        placeholder="nome@nabrasa.local"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Novo PIN (Opcional se já existir)</label>
                    <input
                        type="tel" maxLength={4} minLength={4} value={newPin}
                        onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full bg-gray-50 border-gray-200 border p-3 rounded-xl font-bold tracking-[0.5em] text-center text-lg focus:bg-white outline-none"
                        placeholder="••••"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">4 dígitos numéricos para acessar tablets.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Papel</label>
                        <select
                            value={editingUser.role || 'operator'}
                            onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                            className="w-full bg-gray-50 border-gray-200 border p-3 rounded-xl focus:bg-white outline-none"
                        >
                            <option value="operator">Operador (PIN)</option>
                            <option value="manager">Gerente (Admin)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Status</label>
                        <select
                            value={editingUser.active ? 'true' : 'false'}
                            onChange={e => setEditingUser({ ...editingUser, active: e.target.value === 'true' })}
                            className={`w-full bg-gray-50 border-gray-200 border p-3 rounded-xl focus:bg-white outline-none font-bold ${editingUser.active ? 'text-green-600' : 'text-red-500'}`}
                        >
                            <option value="true">Ativo</option>
                            <option value="false">Inativado</option>
                        </select>
                    </div>
                </div>

                <div className="pt-4">
                    <button type="submit" disabled={saving} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl active:scale-95 transition-transform flex justify-center">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
    )

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between space-x-3 mb-6 mt-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/dashboard/admin')} className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Equipe</h2>
                    </div>
                </div>
                <button onClick={openCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 active:scale-95">
                    + Adicionar
                </button>
            </div>

            <div className="space-y-3">
                {users.map(u => (
                    <button key={u.id} onClick={() => openEdit(u)} className="w-full bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center hover:border-indigo-200 transition-colors text-left">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${u.active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                            {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4 flex-1">
                            <h3 className={`font-bold ${u.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{u.name}</h3>
                            <div className="flex gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${u.role === 'manager' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {u.role === 'manager' ? 'Gerente' : 'Operador'}
                                </span>
                                {!u.active && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 font-bold rounded-md">Inativo</span>}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
