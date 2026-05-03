'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, ChevronRight, Plus, Minus, AlertTriangle, CheckCircle2, Camera, Trash2, Loader2 as LoaderIcon } from 'lucide-react'
import { getGlobalItemsAction, recordLossAction } from '@/app/actions/lossAction'
import { useReward } from '../context/RewardContext'
import CameraCapture from '@/components/CameraCapture'
import { supabase } from '@/lib/supabase/client'

interface Props {
    isOpen: boolean
    onClose: () => void
    userId: string
    currentGroupId?: string
    isDemoMode?: boolean
}

export default function LossRegistrationDrawer({ isOpen, onClose, userId, currentGroupId, isDemoMode }: Props) {
    const [step, setStep] = useState<'search' | 'form' | 'success'>('search')
    const [searchQuery, setSearchQuery] = useState('')
    const [items, setItems] = useState<any[]>([])
    const [selectedItem, setSelectedItem] = useState<any>(null)
    const [quantity, setQuantity] = useState(1)
    const [category, setCategory] = useState<'quebra' | 'estragado' | 'preparo' | 'vencido' | 'outro'>('quebra')
    const [observation, setObservation] = useState('')
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const [evidenceBlob, setEvidenceBlob] = useState<Blob | null>(null)
    const [evidencePreview, setEvidencePreview] = useState<string | null>(null)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    const { showReward } = useReward()

    // Debounce busca de itens
    useEffect(() => {
        if (!isOpen) return
        if (searchQuery.length < 2) {
            setItems([])
            return
        }

        const timer = setTimeout(async () => {
            setSearching(true)
            
            if (isDemoMode) {
                // Mock search
                const mockItems = [
                    { id: 'm1', name: 'Picanha Maturada', unit: 'KG', group_id: currentGroupId },
                    { id: 'm2', name: 'Cerveja NaBrasa 600ml', unit: 'UN', group_id: 'Geral' },
                    { id: 'm3', name: 'Tomate Italiano', unit: 'KG', group_id: currentGroupId },
                    { id: 'm4', name: 'Óleo de Soja 900ml', unit: 'UN', group_id: currentGroupId },
                ].filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
                
                setItems(mockItems)
                setSearching(false)
                return
            }

            const res = await getGlobalItemsAction(searchQuery, currentGroupId)
            if (res.success) setItems(res.data || [])
            setSearching(false)
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery, isOpen, currentGroupId])

    if (!isOpen) return null

    const handleSelectItem = (item: any) => {
        setSelectedItem(item)
        setStep('form')
    }

    const handleSubmit = async () => {
        setLoading(true)
        let finalUrl = ''

        // 1. Upload da foto se existir
        if (evidenceBlob) {
            setUploadingPhoto(true)
            try {
                const fileName = `loss_${userId}_${Date.now()}.jpg`
                const filePath = `losses/${userId}/${fileName}`
                
                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from('checklist-evidences')
                    .upload(filePath, evidenceBlob, { contentType: 'image/jpeg' })

                if (uploadErr) throw uploadErr

                const { data: { publicUrl } } = supabase.storage
                    .from('checklist-evidences')
                    .getPublicUrl(uploadData.path)
                
                finalUrl = publicUrl
            } catch (err: any) {
                console.error("Erro upload foto perda:", err)
            } finally {
                setUploadingPhoto(false)
            }
        }

        if (isDemoMode) {
            // Mock success
            await new Promise(r => setTimeout(r, 1000))
            setLoading(false)
            setStep('success')
            showReward({
                amount: 10,
                label: 'Perda registrada (Demo)',
                type: 'points'
            })
            setTimeout(() => handleClose(), 2000)
            return
        }

        // 2. Registro da perda
        const res = await recordLossAction({
            itemId: selectedItem.id,
            userId,
            quantity,
            category,
            observation,
            evidenceUrl: finalUrl
        })
        setLoading(false)

        if (res.success) {
            setStep('success')
            
            // Disparar Reward Toast
            showReward({
                amount: 10,
                label: 'Perda registrada corretamente',
                type: 'points'
            })

            if (finalUrl) {
                // Pequeno delay para mostrar um segundo reward se houver bonus de foto no futuro
                setTimeout(() => {
                    showReward({
                        amount: 5,
                        label: 'Bônus de Auditoria (Foto)',
                        type: 'coins'
                    })
                }, 1000)
            }

            setTimeout(() => {
                handleClose()
            }, 2500)
        } else {
            alert('Erro ao salvar: ' + res.error)
        }
    }

    const handleClose = () => {
        setStep('search')
        setSearchQuery('')
        setSelectedItem(null)
        setQuantity(1)
        setCategory('quebra')
        setObservation('')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Overlay */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
                onClick={handleClose}
            />

            {/* Content Container */}
            <div className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#eeedea]">
                    <div>
                        <h2 className="text-lg font-extrabold text-[#1b1c1a] tracking-tight">
                            {step === 'search' ? 'Relatar Perda' : step === 'form' ? 'Detalhes da Perda' : 'Sucesso'}
                        </h2>
                        {step !== 'success' && (
                            <p className="text-[10px] font-bold text-[#8c716c] uppercase tracking-widest">Ação Operacional</p>
                        )}
                    </div>
                    <button onClick={handleClose} className="p-2 bg-[#F8F7F4] rounded-full text-[#8c716c]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    
                    {/* STEP 1: BUSCA DE ITEM */}
                    {step === 'search' && (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8c716c]" />
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="Qual item foi perdido?"
                                    className="w-full bg-[#F8F7F4] border-none rounded-2xl py-4 pl-12 pr-4 text-[#1b1c1a] font-medium placeholder:text-[#c0b3b1] focus:ring-2 focus:ring-[#B13A2B]/20 transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                {searching ? (
                                    <div className="py-8 text-center text-sm text-[#8c716c] animate-pulse">Buscando itens...</div>
                                ) : items.length > 0 ? (
                                    items.map(item => (
                                        <button 
                                            key={item.id}
                                            onClick={() => handleSelectItem(item)}
                                            className="w-full flex items-center justify-between p-4 bg-white border border-[#eeedea] rounded-2xl hover:border-[#B13A2B] hover:bg-[#FDF0EF]/30 transition-all text-left group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.group_id === currentGroupId ? 'bg-[#FDF0EF] text-[#B13A2B]' : 'bg-[#F8F7F4] text-[#8c716c]'}`}>
                                                    <span className="text-xs font-bold uppercase">{item.unit}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#1b1c1a] text-sm">{item.name}</p>
                                                    {item.group_id === currentGroupId && (
                                                        <span className="text-[9px] font-black text-[#B13A2B] uppercase tracking-tighter">Setor Atual</span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-[#eeedea] group-hover:text-[#B13A2B]" />
                                        </button>
                                    ))
                                ) : searchQuery.length >= 2 ? (
                                    <div className="py-8 text-center text-sm text-[#8c716c]">Nenhum item encontrado.</div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <AlertTriangle className="w-8 h-8 text-[#eeedea] mx-auto mb-2" />
                                        <p className="text-sm text-[#8c716c]">Digite o nome do produto para começar.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: FORMULÁRIO DE DETALHES */}
                    {step === 'form' && selectedItem && (
                        <div className="space-y-6">
                            {/* Item Badge */}
                            <div className="flex items-center gap-3 p-4 bg-[#FDF0EF] rounded-2xl border border-[#B13A2B]/10">
                                <div className="w-10 h-10 bg-[#B13A2B] rounded-xl flex items-center justify-center text-white">
                                    <span className="text-xs font-bold uppercase">{selectedItem.unit}</span>
                                </div>
                                <div>
                                    <p className="font-black text-[#1b1c1a] text-sm">{selectedItem.name}</p>
                                    <button onClick={() => setStep('search')} className="text-[10px] font-bold text-[#B13A2B] uppercase tracking-widest underline decoration-2 underline-offset-2">Trocar Item</button>
                                </div>
                            </div>

                            {/* Quantidade */}
                            <div>
                                <label className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest mb-2 block">Quantidade Perdida</label>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setQuantity(Math.max(0.1, quantity - 1))}
                                        className="w-14 h-14 bg-[#F8F7F4] rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
                                    >
                                        <Minus className="w-6 h-6 text-[#1b1c1a]" />
                                    </button>
                                    <div className="flex-1 bg-[#F8F7F4] rounded-2xl py-4 flex items-center justify-center">
                                        <span className="text-2xl font-black text-[#1b1c1a]">{quantity}</span>
                                        <span className="ml-2 text-sm font-bold text-[#8c716c] uppercase">{selectedItem.unit}</span>
                                    </div>
                                    <button 
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-14 h-14 bg-[#F8F7F4] rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
                                    >
                                        <Plus className="w-6 h-6 text-[#1b1c1a]" />
                                    </button>
                                </div>
                            </div>

                            {/* Motivo (Categorias) */}
                            <div>
                                <label className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest mb-2 block">Motivo da Perda</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['quebra', 'estragado', 'preparo', 'vencido', 'outro'] as const).map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setCategory(cat)}
                                            className={`py-3 px-4 rounded-xl border font-bold text-xs capitalize transition-all ${category === cat ? 'bg-[#B13A2B] border-[#B13A2B] text-white shadow-lg shadow-[#B13A2B]/20' : 'bg-white border-[#eeedea] text-[#58413e] hover:border-[#B13A2B]'}`}
                                        >
                                            {cat === 'preparo' ? 'Erro de Preparo' : cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Observação Opcional */}
                            <div>
                                <label className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest mb-2 block">Observação (Opcional)</label>
                                <textarea 
                                    className="w-full bg-[#F8F7F4] border-none rounded-2xl p-4 text-sm text-[#1b1c1a] font-medium placeholder:text-[#c0b3b1] focus:ring-2 focus:ring-[#B13A2B]/20 transition-all h-20 resize-none"
                                    placeholder="Ex: Caiu no chão durante o serviço..."
                                    value={observation}
                                    onChange={(e) => setObservation(e.target.value)}
                                />
                            </div>

                            {/* FOTO OPCIONAL (NOVO) */}
                            <div>
                                <label className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest mb-2 block">Evidência (Opcional)</label>
                                {!evidencePreview ? (
                                    <button 
                                        onClick={() => setIsCameraOpen(true)}
                                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-gray-400 group"
                                    >
                                        <Camera className="w-6 h-6 group-hover:text-[#B13A2B] transition-colors" />
                                        <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-[#B13A2B]">Tirar foto da perda</span>
                                    </button>
                                ) : (
                                    <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm group">
                                        <img src={evidencePreview} className="w-full h-32 object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => {
                                                    setEvidencePreview(null)
                                                    setEvidenceBlob(null)
                                                }}
                                                className="bg-red-500 text-white p-3 rounded-full active:scale-90 transition-transform"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-white/90 rounded-md">
                                            <span className="text-[8px] font-black text-gray-900 uppercase">Foto Pronta</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full bg-[#1b1c1a] text-white rounded-[24px] py-5 font-black uppercase tracking-widest shadow-xl shadow-black/10 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {loading ? 'Enviando...' : 'Confirmar Registro'}
                            </button>
                        </div>
                    )}

                    {/* STEP 3: SUCESSO */}
                    {step === 'success' && (
                        <div className="py-12 text-center animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <h3 className="text-xl font-black text-[#1b1c1a] mb-2 tracking-tight">Perda Registrada!</h3>
                            <p className="text-sm text-[#8c716c]">Transparência operacional é valorizada.<br/>+10 pontos de honestidade.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* CÂMERA OVERLAY */}
            {isCameraOpen && (
                <CameraCapture 
                    onCapture={(blob) => {
                        setEvidenceBlob(blob)
                        setEvidencePreview(URL.createObjectURL(blob))
                        setIsCameraOpen(false)
                    }}
                    onClose={() => setIsCameraOpen(false)}
                />
            )}
        </div>
    )
}
