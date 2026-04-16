"use client"

import React from 'react'
import { Check, X, Thermometer, Hash, AlignLeft } from 'lucide-react'

interface InputProps {
    value: any
    onChange: (val: any) => void
    label: string
    description?: string
    required?: boolean
}

/**
 * Campo Booleano (Sim/Não) estilo Botões de Alternância
 */
export const BooleanInput: React.FC<InputProps> = ({ value, onChange, label }) => {
    return (
        <div className="flex gap-3">
            <button
                onClick={() => onChange(true)}
                className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 border-2 ${
                    value === true 
                        ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' 
                        : 'bg-white border-[#eeedea] text-[#8c716c]'
                }`}
            >
                <Check className={`w-5 h-5 ${value === true ? 'opacity-100' : 'opacity-20'}`} />
                SIM
            </button>
            <button
                onClick={() => onChange(false)}
                className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 border-2 ${
                    value === false 
                        ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' 
                        : 'bg-white border-[#eeedea] text-[#8c716c]'
                }`}
            >
                <X className={`w-5 h-5 ${value === false ? 'opacity-100' : 'opacity-20'}`} />
                NÃO
            </button>
        </div>
    )
}

/**
 * Campo Numérico Genérico
 */
export const NumberInput: React.FC<InputProps> = ({ value, onChange, label }) => {
    return (
        <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#dfbfba]">
                <Hash className="w-5 h-5" />
            </div>
            <input
                type="number"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                className="w-full bg-[#F8F7F4] border-2 border-[#eeedea] focus:border-[#2b58b1] rounded-2xl py-4 pl-12 pr-4 text-xl font-black text-[#1b1c1a] outline-none transition-all"
                placeholder="0.00"
            />
        </div>
    )
}

/**
 * Campo de Temperatura Especializado
 */
export const TemperatureInput: React.FC<InputProps> = ({ value, onChange, label }) => {
    return (
        <div className="flex items-center gap-3">
            <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                    <Thermometer className="w-5 h-5" />
                </div>
                <input
                    type="number"
                    step="0.1"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full bg-[#F8F7F4] border-2 border-[#eeedea] focus:border-amber-500 rounded-2xl py-4 pl-12 pr-12 text-xl font-black text-[#1b1c1a] outline-none transition-all placeholder:font-normal"
                    placeholder="2.5"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-[#8c716c]">
                    °C
                </div>
            </div>
        </div>
    )
}

/**
 * Campo de Texto (TextArea)
 */
export const TextInput: React.FC<InputProps> = ({ value, onChange, label }) => {
    return (
        <div className="relative">
             <div className="absolute left-4 top-4 text-[#dfbfba]">
                <AlignLeft className="w-5 h-5" />
            </div>
            <textarea
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                className="w-full bg-[#F8F7F4] border-2 border-[#eeedea] focus:border-[#2b58b1] rounded-2xl py-4 pl-12 pr-4 font-bold text-[#1b1c1a] outline-none transition-all resize-none"
                placeholder="Escreva aqui..."
            />
        </div>
    )
}
