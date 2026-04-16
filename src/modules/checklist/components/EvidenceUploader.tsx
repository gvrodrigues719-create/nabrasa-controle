"use client"

import React, { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Camera, Loader2, CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
    sessionId: string
    itemId: string
    initialValue?: string | null
    onUploadSuccess: (url: string) => void
    onRemove: () => void
}

export function EvidenceUploader({ sessionId, itemId, initialValue, onUploadSuccess, onRemove }: Props) {
    const [uploading, setUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialValue || null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validações básicas
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecione uma imagem.')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('A imagem deve ter no máximo 5MB.')
            return
        }

        try {
            setUploading(true)

            // Gerar path: sessions/{sessionId}/{itemId}_{timestamp}.jpg
            const ext = file.name.split('.').pop() || 'jpg'
            const filePath = `sessions/${sessionId}/${itemId}_${Date.now()}.${ext}`

            const { data, error } = await supabase.storage
                .from('checklist-evidences')
                .upload(filePath, file, { 
                    upsert: true,
                    contentType: file.type
                })

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('checklist-evidences')
                .getPublicUrl(data.path)

            setPreviewUrl(publicUrl)
            onUploadSuccess(publicUrl)
            toast.success('Foto enviada com sucesso!')
        } catch (error: any) {
            console.error('Error uploading evidence:', error)
            toast.error('Erro ao enviar foto: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = () => {
        setPreviewUrl(null)
        onRemove()
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <div className="mt-4">
            <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment" // Aciona a câmera traseira no mobile
                className="hidden"
            />

            {!previewUrl ? (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-4 border-2 border-dashed border-[#dfbfba] rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-[#FDF0EF] transition-colors active:scale-95 group"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-6 h-6 text-[#b13a2b] animate-spin" />
                            <span className="text-[10px] font-black text-[#b13a2b] uppercase tracking-widest">Enviando Foto...</span>
                        </>
                    ) : (
                        <>
                            <Camera className="w-6 h-6 text-[#8c716c] group-hover:text-[#b13a2b] transition-colors" />
                            <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest group-hover:text-[#b13a2b]">Adicionar Foto Evidência</span>
                        </>
                    )}
                </button>
            ) : (
                <div className="relative inline-block w-full">
                    <div className="bg-white rounded-2xl overflow-hidden border border-[#eeedea] shadow-sm">
                        <img 
                            src={previewUrl} 
                            alt="Evidência" 
                            className="w-full h-40 object-cover"
                        />
                        <div className="p-3 bg-[#F8F7F4] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-[10px] font-black text-[#58413e] uppercase tracking-widest">Foto Enviada</span>
                            </div>
                            <button 
                                onClick={handleRemove}
                                className="p-1 text-[#8c716c] hover:text-red-500 transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
