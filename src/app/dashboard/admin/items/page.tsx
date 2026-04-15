'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Loader2, Save, X, Search, Package, Camera, ImageOff } from 'lucide-react'
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
    cost_mode: 'direct' | 'conversion' | 'manual'
    purchase_unit: string | null
    conversion_factor: number | null
    min_expected: number | null
    max_expected: number | null
    image_url: string | null
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
    const [costMode, setCostMode] = useState<'direct' | 'conversion' | 'manual'>('direct')
    const [purchaseUnit, setPurchaseUnit] = useState('')
    const [conversionFactor, setConversionFactor] = useState('')
    const [minExpected, setMinExpected] = useState('')
    const [maxExpected, setMaxExpected] = useState('')
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [imageUploading, setImageUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    // Normaliza texto para comparação: lowercase, trim, sem acentos
    const normalize = (s: string) => s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    const handleImageUpload = async (file: File) => {
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Selecione apenas arquivos de imagem.')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Imagem muito grande. Máximo 5MB.')
            return
        }

        setImageUploading(true)
        // Gera um nome único para o arquivo
        const ext = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { data, error } = await supabase.storage
            .from('item-images')
            .upload(fileName, file, { upsert: true, contentType: file.type })

        if (error) {
            toast.error(`Erro ao fazer upload: ${error.message}`)
            setImageUploading(false)
            return
        }

        const { data: { publicUrl } } = supabase.storage
            .from('item-images')
            .getPublicUrl(data.path)

        setImageUrl(publicUrl)
        toast.success('Imagem carregada!')
        setImageUploading(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !groupId) return toast.error('Nome e local são obrigatórios.')

        const payload: any = {
            name,
            unit,
            unit_observation: unitObs,
            group_id: groupId,
            cost_mode: costMode,
            purchase_unit: costMode === 'conversion' ? purchaseUnit : null,
            conversion_factor: costMode === 'conversion' ? (conversionFactor ? parseFloat(conversionFactor) : null) : null,
            min_expected: minExpected === '' ? null : parseFloat(minExpected),
            max_expected: maxExpected === '' ? null : parseFloat(maxExpected),
            image_url: imageUrl ?? null,
        }

        if (costMode === 'conversion' && (!purchaseUnit || !conversionFactor)) {
            return toast.error('Unidade de compra e fator de conversão são obrigatórios neste modo.')
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
        setSearchQuery('')
        resetForm()
        fetchData()
    }

    const resetForm = () => {
        setName('')
        setUnit('un')
        setUnitObs('')
        setGroupId('')
        setCostMode('direct')
        setPurchaseUnit('')
        setConversionFactor('')
        setMinExpected('')
        setMaxExpected('')
        setImageUrl(null)
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

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                    e.target.value = ''
                }}
            />

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Itens de Estoque</h2>
                {!isEditing && (
                    <button onClick={() => { setIsEditing('new'); resetForm(); }} className="bg-[#B13A2B] text-white py-2 px-4 rounded-xl flex items-center space-x-2 shadow-sm hover:bg-[#8F2E21] transition active:scale-95">
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
                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-[#B13A2B] focus:border-[#B13A2B] text-sm outline-none bg-white shadow-sm font-medium"
                        placeholder="Buscar itens..."
                    />
                </div>
            )}

            {isEditing && (
                <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl shadow-lg border border-[#FDF0EF] space-y-4 mb-6">
                    <h3 className="font-extrabold text-gray-900 text-lg border-b pb-2 border-gray-100">
                        {isEditing === 'new' ? 'Novo Item' : 'Editar Item'}
                    </h3>

                    {/* ── FOTO DO ITEM ── */}
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Foto do Item</label>
                        <div className="mt-1.5 flex items-center gap-3">
                            {/* Preview */}
                            <div
                                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-[#F5F4F1] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-[#B13A2B] transition"
                                onClick={() => !imageUploading && fileInputRef.current?.click()}
                            >
                                {imageUploading ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-[#B13A2B]" />
                                ) : imageUrl ? (
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Camera className="w-7 h-7 text-gray-300" />
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={imageUploading}
                                    className="text-sm font-semibold text-[#B13A2B] bg-[#FDF0EF] px-4 py-2 rounded-xl hover:bg-[#f5ddd9] transition active:scale-95 flex items-center gap-2"
                                >
                                    <Camera className="w-4 h-4" />
                                    {imageUrl ? 'Trocar foto' : 'Carregar foto'}
                                </button>
                                {imageUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setImageUrl(null)}
                                        className="text-sm font-semibold text-gray-500 bg-gray-100 px-4 py-2 rounded-xl hover:bg-gray-200 transition active:scale-95 flex items-center gap-2"
                                    >
                                        <ImageOff className="w-4 h-4" />
                                        Remover foto
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1.5">JPG, PNG ou WEBP · Máx 5MB · Aparece na tela de contagem</p>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Nome do Produto</label>
                        <input required autoFocus value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-4 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-[#B13A2B] text-gray-900 font-medium" placeholder="Ex: Cerveja Heineken 600ml" />
                        {(() => {
                            if (!name.trim() || !groupId) return null
                            const normalName = normalize(name)
                            const similar = items.filter(i =>
                                i.group_id === groupId &&
                                i.id !== isEditing &&
                                normalize(i.name) === normalName
                            )
                            if (similar.length === 0) return null
                            return (
                                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start space-x-2">
                                    <span className="text-amber-500 text-lg leading-none shrink-0">⚠️</span>
                                    <div>
                                        <p className="text-xs font-bold text-amber-700">Item parecido já existe neste local:</p>
                                        {similar.map(s => (
                                            <p key={s.id} className="text-xs text-amber-600 font-medium">• {s.name} ({s.unit})</p>
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Unidade</label>
                            <select required value={unit} onChange={e => setUnit(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-4 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-[#B13A2B] text-gray-900 font-medium">
                                {!['kg', 'g', 'L', 'ml', 'un', 'cx', 'pct', 'dz'].includes(unit) && unit !== '' && (
                                    <option value={unit}>{unit} (legado)</option>
                                )}
                                <option value="un">un</option>
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="L">L</option>
                                <option value="ml">ml</option>
                                <option value="cx">cx</option>
                                <option value="pct">pct</option>
                                <option value="dz">dz</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Local Primário</label>
                            <select required value={groupId} onChange={e => setGroupId(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-4 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-[#B13A2B] text-gray-900 font-medium truncate">
                                <option value="" disabled>Selecione...</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="border border-gray-200 bg-white rounded-xl p-4 shadow-sm space-y-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Modo de custo</label>
                            <select value={costMode} onChange={e => setCostMode(e.target.value as any)} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-[#B13A2B] text-gray-900 font-medium">
                                <option value="direct">Direto (Custo da própria unidade)</option>
                                <option value="conversion">Com conversão (Ex: Compra Kg, Conta g)</option>
                                <option value="manual">Manual (Insere custo de caixa/fechamento)</option>
                            </select>
                            <p className="text-xs text-gray-400 mt-1">Define como o CMV e o custo médio serão tratados nas entradas.</p>
                        </div>

                        {costMode === 'conversion' && (
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Unidade de compra</label>
                                    <input value={purchaseUnit} onChange={e => setPurchaseUnit(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-[#B13A2B] text-gray-900 text-sm" placeholder="Ex: CX, fardo" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Fator de conv.</label>
                                    <input type="number" step="0.01" value={conversionFactor} onChange={e => setConversionFactor(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-[#B13A2B] text-gray-900 text-sm" placeholder="Ex: 12" />
                                </div>
                                {(purchaseUnit && conversionFactor) && (
                                    <div className="col-span-2 text-xs text-gray-500 font-medium bg-[#FDF0EF] text-[#B13A2B] p-2 rounded-lg">
                                        💡 1 {purchaseUnit} equivale a {conversionFactor} {unit}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Observação da Contagem</label>
                        <input value={unitObs} onChange={e => setUnitObs(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-[#B13A2B] text-gray-900 text-sm" placeholder="Ex: Contar garrafas abertas em décimos" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Mínimo esperado</label>
                            <input type="number" step="0.01" value={minExpected} onChange={e => setMinExpected(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-[#B13A2B] text-gray-900 text-sm" placeholder="Ex: 5" />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Máximo esperado</label>
                            <input type="number" step="0.01" value={maxExpected} onChange={e => setMaxExpected(e.target.value)} className="w-full border border-gray-200 bg-gray-50 p-3 rounded-xl mt-1.5 outline-none focus:ring-2 focus:ring-[#B13A2B] text-gray-900 text-sm" placeholder="Ex: 50" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 -mt-2">Usado para alertar contagens fora do padrão</p>

                    <div className="flex space-x-3 pt-4 sticky bottom-0 bg-white pb-4 pt-3 px-0 z-20">
                        <button type="button" onClick={() => { setIsEditing(null); resetForm() }} className="flex-1 py-4 border border-gray-200 text-gray-600 rounded-xl font-bold flex justify-center items-center hover:bg-gray-50 transition active:scale-95 text-sm">
                            <X className="w-5 h-5 mr-2" /> Cancelar
                        </button>
                        <button type="submit" className="flex-1 py-4 bg-[#B13A2B] text-white rounded-xl font-bold flex justify-center items-center shadow-sm hover:bg-[#8F2E21] transition active:scale-95 text-sm">
                            <Save className="w-5 h-5 mr-2" /> Salvar
                        </button>
                    </div>
                </form>
            )}

            {!isEditing && (
                <div className="space-y-3 pb-8">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#B13A2B]" /></div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-10 px-4 text-gray-500 bg-white rounded-2xl border border-gray-200 border-dashed">
                            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="font-medium text-gray-600">Nenhum item encontrado</p>
                        </div>
                    ) : (
                        filteredItems.map(i => (
                            <div key={i.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-[#D4564A] transition-colors">
                                <div className="flex items-center gap-3 flex-1 overflow-hidden pr-2">
                                    {/* Thumbnail na lista */}
                                    {i.image_url ? (
                                        <img src={i.image_url} alt={i.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-[#F5F4F1] flex items-center justify-center shrink-0 border border-gray-100">
                                            <Package className="w-5 h-5 text-gray-300" />
                                        </div>
                                    )}
                                    <div className="overflow-hidden">
                                        <h4 className="font-bold text-gray-900 text-base truncate">{i.name}</h4>
                                        <div className="flex flex-wrap items-center mt-1 gap-2">
                                            <span className="bg-[#FDF0EF] text-[#B13A2B] text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                {i.unit}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium truncate max-w-[130px]">
                                                {i.groups?.name || 'Sem local'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-2 shrink-0">
                                    <button onClick={() => {
                                        setIsEditing(i.id);
                                        setName(i.name);
                                        setUnit(i.unit);
                                        setUnitObs(i.unit_observation || '');
                                        setGroupId(i.group_id || '');
                                        setCostMode(i.cost_mode || 'direct');
                                        setPurchaseUnit(i.purchase_unit || '');
                                        setConversionFactor(i.conversion_factor != null ? String(i.conversion_factor) : '');
                                        setMinExpected(i.min_expected != null ? String(i.min_expected) : '');
                                        setMaxExpected(i.max_expected != null ? String(i.max_expected) : '');
                                        setImageUrl(i.image_url || null);
                                    }} className="p-2.5 text-[#B13A2B] bg-[#FDF0EF] rounded-xl hover:bg-[#f5ddd9] transition active:scale-95">
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
