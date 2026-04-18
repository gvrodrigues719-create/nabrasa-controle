'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Camera, RefreshCw, Check, XCircle, Loader2 } from 'lucide-react'

interface Props {
    onCapture: (blob: Blob) => void
    onClose: () => void
}

export default function CameraCapture({ onCapture, onClose }: Props) {
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [localPreview, setLocalPreview] = useState<string | null>(null)
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
    const [error, setError] = useState<string | null>(null)

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const startCamera = useCallback(async () => {
        try {
            setError(null)
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            })
            setStream(s)
            if (videoRef.current) {
                videoRef.current.srcObject = s
            }
        } catch (err) {
            console.error("Erro ao acessar câmera:", err)
            setError("Não foi possível acessar a câmera. Verifique as permissões.")
        }
    }, [])

    React.useEffect(() => {
        startCamera()
        return () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop())
            }
        }
    }, [startCamera])

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current
            const context = canvas.getContext('2d')
            
            if (context) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                context.drawImage(video, 0, 0, canvas.width, canvas.height)
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        setCapturedBlob(blob)
                        setLocalPreview(URL.createObjectURL(blob))
                        // Para o stream
                        if (stream) {
                            stream.getTracks().forEach(t => t.stop())
                        }
                    }
                }, 'image/jpeg', 0.8)
            }
        }
    }

    const retake = () => {
        setLocalPreview(null)
        setCapturedBlob(null)
        startCamera()
    }

    const confirm = () => {
        if (capturedBlob) {
            onCapture(capturedBlob)
        }
    }

    return (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col">
            <canvas ref={canvasRef} className="hidden" />

            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-black/50 text-white">
                <span className="text-xs font-black uppercase tracking-widest">Capturar Evidência</span>
                <button onClick={onClose} className="p-2 opacity-70 hover:opacity-100">
                    <XCircle className="w-6 h-6" />
                </button>
            </div>

            {/* Viewport */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-neutral-900">
                {error ? (
                    <div className="px-10 text-center space-y-4">
                        <p className="text-red-400 font-bold text-sm">{error}</p>
                        <button onClick={startCamera} className="px-6 py-3 bg-white/10 rounded-full text-white text-xs font-bold uppercase">Tentar Novamente</button>
                    </div>
                ) : !localPreview ? (
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
            </div>

            {/* Controls */}
            <div className="p-8 pb-12 flex justify-center items-center gap-8 bg-black/80">
                {!localPreview ? (
                    <button 
                        onClick={takePhoto}
                        className="w-20 h-20 bg-white rounded-full border-8 border-white/20 active:scale-90 transition-all flex items-center justify-center shadow-2xl"
                    >
                        <div className="w-14 h-14 rounded-full border-2 border-black/10" />
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={retake}
                            className="flex flex-col items-center gap-2 text-white/80"
                        >
                            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center">
                                <RefreshCw className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Recomeçar</span>
                        </button>

                        <button 
                            onClick={confirm}
                            className="flex flex-col items-center gap-2 text-white"
                        >
                            <div className="w-20 h-20 bg-[#B13A2B] rounded-full flex items-center justify-center shadow-2xl shadow-red-900/50">
                                <Check className="w-10 h-10" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Usar Foto</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
