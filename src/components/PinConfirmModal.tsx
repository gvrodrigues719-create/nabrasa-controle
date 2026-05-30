'use client'

import React, { useState } from 'react'
import { Loader2, X } from 'lucide-react'

type Props = {
    isOpen: boolean
    title: string
    message: string
    onConfirmPin: (pin: string) => Promise<void>
    onClose: () => void
    isDanger?: boolean
}

export function PinConfirmModal({ isOpen, title, message, onConfirmPin, onClose, isDanger }: Props) {
    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleDigit = (digit: string) => {
        if (loading) return
        setError(null)
        if (pin.length < 4) {
            const newPin = pin + digit
            setPin(newPin)
            if (newPin.length === 4) {
                handleSubmit(newPin)
            }
        }
    }

    const handleDelete = () => {
        if (loading) return
        setError(null)
        setPin(pin.slice(0, -1))
    }

    const handleSubmit = async (finalPin: string) => {
        setLoading(true)
        setError(null)
        try {
            await onConfirmPin(finalPin)
            // Se passar não precisa fazer nada, o pai lida com fechamento/rota
        } catch (err: any) {
            setError(err.message || "PIN Inválido.")
            setPin('')
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-gray-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 text-center">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                    <p className="text-sm font-medium text-gray-500 mt-2 mb-6">{message}</p>

                    {error && (
                        <div className="mb-4 text-xs font-bold bg-red-50 text-red-600 py-2 rounded-lg animate-bounce">
                            {error}
                        </div>
                    )}

                    {/* Bubbles */}
                    <div className="flex justify-center space-x-3 mb-6 w-full h-4 items-center">
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                        ) : [0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-3 h-3 rounded-full transition-all duration-200 ${i < pin.length ? (isDanger ? 'bg-red-600 scale-125' : 'bg-indigo-600 scale-125 shadow-sm') : 'bg-gray-200'}`} />
                        ))}
                    </div>

                    {/* Numpad */}
                    <div className="grid grid-cols-3 gap-2 w-full mx-auto relative opacity-100 transition-opacity">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handleDigit(num.toString())}
                                disabled={loading}
                                className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 font-bold text-2xl text-gray-800 touch-manipulation transition-colors"
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="h-14 rounded-2xl text-gray-400 hover:text-gray-600 active:bg-gray-100 font-bold text-sm tracking-wider uppercase touch-manipulation transition-colors flex items-center justify-center"
                        >
                            <span className="sr-only">Cancelar</span>
                            Cancel
                        </button>
                        <button
                            onClick={() => handleDigit('0')}
                            disabled={loading}
                            className="h-14 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 font-bold text-2xl text-gray-800 touch-manipulation transition-colors"
                        >
                            0
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="h-14 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 active:bg-red-200 font-bold text-xl flex items-center justify-center touch-manipulation transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
