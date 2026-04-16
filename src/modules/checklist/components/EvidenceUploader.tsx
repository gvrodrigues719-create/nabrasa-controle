"use client"

import React, { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Camera, Loader2, CheckCircle2, XCircle, RefreshCw, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
    sessionId: string
    itemId: string
    initialValue?: string | null
    onUploadSuccess: (url: string) => void
    onRemove: () => void
}

export function EvidenceUploader({ sessionId, itemId, initialValue, onUploadSuccess, onRemove }: Props) {
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialValue || null)
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
    const [localPreview, setLocalPreview] = useState<string | null>(null)

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    // Iniciar Câmera
    const startCamera = async () => {
        try {
            setIsCameraOpen(true)
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
        } catch (err) {
            console.error("Erro ao acessar câmera:", err)
            toast.error("Não foi possível acessar a câmera. Verifique as permissões.")
            setIsCameraOpen(false)
        }
    }

    // Fechar Câmera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setIsCameraOpen(false)
        setLocalPreview(null)
        setCapturedBlob(null)
    }, [])

    // Capturar Foto
    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current
            const context = canvas.getContext('2d')
            
            if (context) {
                // Ajusta canvas para o tamanho do vídeo
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                
                // Desenha o frame
                context.drawImage(video, 0, 0, canvas.width, canvas.height)
                
                // Converte para Blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        setCapturedBlob(blob)
                        setLocalPreview(URL.createObjectURL(blob))
                        // Para o stream para economizar bateria
                        if (streamRef.current) {
                            streamRef.current.getTracks().forEach(track => track.stop())
                        }
                    }
                }, 'image/jpeg', 0.8)
            }
        }
    }

    // Voltar para Câmera
    const retake = () => {
        setLocalPreview(null)
        setCapturedBlob(null)
        startCamera()
    }

    // Confirmar e Enviar
    const confirmAndUpload = async () => {
        if (!capturedBlob) return

        try {
            setUploading(true)
            
            const fileName = `${itemId}_${Date.now()}.jpg`
            const filePath = `sessions/${sessionId}/${fileName}`

            const { data, error } = await supabase.storage
                .from('checklist-evidences')
                .upload(filePath, capturedBlob, { 
                    upsert: true,
                    contentType: 'image/jpeg'
                })

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('checklist-evidences')
                .getPublicUrl(data.path)

            setPreviewUrl(publicUrl)
            onUploadSuccess(publicUrl)
            toast.success('Evidência salva com sucesso!')
            stopCamera()
        } catch (error: any) {
            console.error('Error uploading evidence:', error)
            toast.error('Erro ao salvar: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = () => {
        setPreviewUrl(null)
        onRemove()
    }

    return (
        <div className="mt-4">
            {/* CANVAS INVISÍVEL PARA CAPTURA */}
            <canvas ref={canvasRef} className="hidden" />

            {!previewUrl ? (
                <button
                    onClick={startCamera}
                    disabled={uploading}
                    className="w-full py-4 border-2 border-dashed border-[#dfbfba] rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-[#FDF0EF] transition-colors active:scale-95 group"
                >
                    <Camera className="w-6 h-6 text-[#8c716c] group-hover:text-[#b13a2b] transition-colors" />
                    <span className="text-[10px] font-black text-[#8c716c] uppercase tracking-widest group-hover:text-[#b13a2b]">Tirar Foto de Evidência</span>
                    <span className="text-[8px] font-bold text-[#dfbfba] uppercase tracking-tighter">(Apenas câmera ao vivo)</span>
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
                                <span className="text-[10px] font-black text-[#58413e] uppercase tracking-widest">Foto Auditada</span>
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

            {/* MODAL DA CÂMERA */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col">
                    <div className="p-4 flex justify-end">
                        <button onClick={stopCamera} className="p-2 text-white/50 hover:text-white transition-colors">
                            <XCircle className="w-8 h-8" />
                        </button>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                        {!localPreview ? (
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <img 
                                src={localPreview} 
                                className="w-full h-full object-cover" 
                                alt="Pre-visualização" 
                            />
                        )}
                        
                        {uploading && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                                <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
                                <span className="text-white font-black text-xs uppercase tracking-widest">Enviando Auditoria...</span>
                            </div>
                        )}
                    </div>

                    <div className="p-8 pb-12 flex justify-center items-center gap-8">
                        {!localPreview ? (
                            <button 
                                onClick={takePhoto}
                                className="w-20 h-20 bg-white rounded-full border-8 border-white/20 active:scale-90 transition-all flex items-center justify-center shadow-2xl"
                            >
                                <div className="w-14 h-14 rounded-full border-2 border-black/10" />
                            </button>
                        ) : !uploading && (
                            <>
                                <button 
                                    onClick={retake}
                                    className="flex flex-col items-center gap-2 text-white/80"
                                >
                                    <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center">
                                        <RefreshCw className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Tentar Novamente</span>
                                </button>

                                <button 
                                    onClick={confirmAndUpload}
                                    className="flex flex-col items-center gap-2 text-white"
                                >
                                    <div className="w-20 h-20 bg-[#B13A2B] rounded-full flex items-center justify-center shadow-2xl shadow-red-900/50">
                                        <Check className="w-10 h-10" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Confirmar Foto</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
