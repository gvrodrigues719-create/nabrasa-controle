'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Plus, Search, Pencil, PowerOff, Power, Loader2, X, Check
} from 'lucide-react'
import {
    getCatalogItemsAction,
    createCatalogItemAction,
    updateCatalogItemAction,
} from '@/modules/kitchen/receivings-actions'
import toast from 'react-hot-toast'

const CATEGORIES = ['Carnes', 'Hortifruti', 'Laticínios', 'Mercearia', 'Limpeza', 'Descartáveis', 'Outros']
const UNITS = ['KG', 'UN', 'PCT', 'CX', 'L', 'ML', 'BALDE', 'SACO', 'ROLO', 'PEÇA', 'OUTRO']

const CATEGORY_COLORS: Record<string, string> = {
    'Carnes': 'bg-red-50 text-red-700',
    'Hortifruti': 'bg-green-50 text-green-700',
    'Laticínios': 'bg-yellow-50 text-yellow-700',
    'Mercearia': 'bg-blue-50 text-blue-700',
    'Limpeza': 'bg-cyan-50 text-cyan-700',
    'Descartáveis': 'bg-purple-50 text-purple-700',
    'Outros': 'bg-gray-50 text-gray-600',
}

type CatalogItem = {
    id: string
    name: string
    unit: string
    category?: string
    notes?: string
    is_active: boolean
    created_at: string
}

const emptyForm = { name: '', unit: 'KG', unitCustom: '', category: '', notes: '' }

export default function CatalogItemsPage() {
    const router = useRouter()
    const [items, setItems] = useState<CatalogItem[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterCat, setFilterCat] = useState('')
    const [filterActive, setFilterActive] = useState<boolean | undefined>(true)

    // Modal criar/editar
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<CatalogItem | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)

    async function fetchItems() {
        setLoading(true)
        const res = await getCatalogItemsAction({
            search: search || undefined,
            category: filterCat || undefined,
            active: filterActive,
        })
        if (res.success) setItems(res.data || [])
        else toast.error(res.error || 'Erro ao carregar')
        setLoading(false)
    }

    useEffect(() => { fetchItems() }, [search, filterCat, filterActive])

    function openCreate() {
        setEditing(null)
        setForm(emptyForm)
        setShowModal(true)
    }

    function openEdit(item: CatalogItem) {
        setEditing(item)
        setForm({ name: item.name, unit: UNITS.includes(item.unit) ? item.unit : 'OUTRO', unitCustom: UNITS.includes(item.unit) ? '' : item.unit, category: item.category || '', notes: item.notes || '' })
        setShowModal(true)
    }

    async function handleSave() {
        const finalUnit = form.unit === 'OUTRO' ? form.unitCustom.trim() : form.unit
        if (!form.name.trim()) { toast.error('Nome obrigatório'); return }
        if (!finalUnit) { toast.error('Unidade obrigatória'); return }
        setSaving(true)
        const payload = { name: form.name, unit: finalUnit, category: form.category || undefined, notes: form.notes || undefined }
        const res = editing
            ? await updateCatalogItemAction(editing.id, payload)
            : await createCatalogItemAction(payload)
        if (res.success) {
            toast.success(editing ? 'Insumo atualizado' : 'Insumo criado!')
            setShowModal(false)
            fetchItems()
        } else {
            toast.error(res.error || 'Erro')
        }
        setSaving(false)
    }

    async function toggleActive(item: CatalogItem) {
        const res = await updateCatalogItemAction(item.id, { is_active: !item.is_active })
        if (res.success) {
            toast.success(item.is_active ? 'Insumo desativado' : 'Insumo reativado')
            fetchItems()
        } else toast.error(res.error || 'Erro')
    }

    return (
        <div className="min-h-screen bg-[#F8F7F4] pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/dashboard/kitchen/receivings')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-sm font-black text-gray-900">Catálogo de Insumos</h1>
                            <p className="text-[10px] text-gray-400 font-bold">Itens para conferência de recebimentos</p>
                        </div>
                    </div>
                    <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                        <Plus className="w-4 h-4" />
                        <span>Novo Insumo</span>
                    </button>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                {/* Filtros */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar insumo..."
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="flex-1 min-w-[140px] px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 bg-white focus:outline-none">
                            <option value="">Todas categorias</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                            {([{ v: true, l: 'Ativos' }, { v: false, l: 'Inativos' }, { v: undefined, l: 'Todos' }] as const).map(opt => (
                                <button key={String(opt.v)} onClick={() => setFilterActive(opt.v)} className={`px-3 py-2 text-xs font-bold transition-colors ${filterActive === opt.v ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{opt.l}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Lista */}
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-blue-500 animate-spin" /></div>
                ) : items.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                        <p className="text-sm font-bold text-gray-400">Nenhum insumo encontrado.</p>
                        <button onClick={openCreate} className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700">+ Cadastrar primeiro insumo</button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map(item => (
                            <div key={item.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-3 ${!item.is_active ? 'opacity-50 border-gray-100' : 'border-gray-100'}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-black text-gray-900 truncate">{item.name}</h3>
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{item.unit}</span>
                                        {item.category && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${CATEGORY_COLORS[item.category] || 'bg-gray-50 text-gray-600'}`}>{item.category}</span>
                                        )}
                                        {!item.is_active && <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">Inativo</span>}
                                    </div>
                                    {item.notes && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.notes}</p>}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => toggleActive(item)} className={`p-2 rounded-xl transition-colors ${item.is_active ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}>
                                        {item.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal criar/editar */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-base font-black text-gray-900">{editing ? 'Editar Insumo' : 'Novo Insumo'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Nome do insumo *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: PICANHA INSUMO" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Unidade *</label>
                                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                {form.unit === 'OUTRO' && (
                                    <input value={form.unitCustom} onChange={e => setForm(f => ({ ...f, unitCustom: e.target.value }))} placeholder="Digite a unidade" className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Categoria</label>
                                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                                    <option value="">Sem categoria</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Observação</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ex: Usado para recebimento de compra" className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                            </div>
                            <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {editing ? 'Salvar alterações' : 'Criar insumo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
