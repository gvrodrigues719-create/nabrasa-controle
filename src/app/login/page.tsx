'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Lock, Mail, Loader2, User, KeyRound, ArrowLeft, ArrowRight, X } from 'lucide-react'
import { loginOperatorWithPin, getActiveEmployeesAction } from '../actions/pinAuth'
import toast from 'react-hot-toast'

export default function LoginPage() {
    const [mode, setMode] = useState<'select' | 'manager' | 'operator_select' | 'operator_pin'>('select')

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [employees, setEmployees] = useState<{ id: string, name: string, role: string }[]>([])
    const [selectedOp, setSelectedOp] = useState<any>(null)
    const [pin, setPin] = useState('')

    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (mode === 'operator_select' && employees.length === 0) {
            fetchEmployees()
        }
    }, [mode])

    const fetchEmployees = async () => {
        setLoading(true)
        const res = await getActiveEmployeesAction()
        if (res.success && res.data) {
            setEmployees(res.data)
        } else {
            console.error("Erro ao buscar ops:", res.error)
        }
        setLoading(false)
    }

    const handleManagerLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true); setError(null)
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); setLoading(false); return }
        if (data.session) router.push('/dashboard')
    }

    const handlePinDigit = async (digit: string) => {
        if (pin.length < 4) {
            const newPin = pin + digit
            setPin(newPin)
            if (newPin.length === 4) {
                setLoading(true)
                const res = await loginOperatorWithPin(selectedOp.id, newPin)
                if (res.success) {
                    router.push('/dashboard')
                } else {
                    toast.error(res.error || 'PIN Incorreto', { icon: '❌' })
                    setPin('')
                    setLoading(false)
                }
            }
        }
    }

    const handleDelete = () => setPin(pin.slice(0, -1))

    return (
        <div className="min-h-screen bg-[#F7F6F3] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
                <div className="flex justify-center">
                    <img src="/Logo Vermelha.png" alt="NaBrasa Controle" className="h-28 w-auto object-contain drop-shadow-md" />
                </div>
                <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900 tracking-tight">
                    NaBrasa Controle
                </h2>
                <p className="mt-2 text-center text-base text-gray-500 font-medium tracking-tight">
                    Contagem, auditoria e controle operacional
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">

                {mode === 'select' && (
                    <div className="bg-white py-10 px-6 shadow-sm rounded-3xl border border-gray-100 flex flex-col gap-4 text-center">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2">Acesso ao Sistema</h2>
                        <button
                            onClick={() => setMode('operator_select')}
                            className="bg-[#B13A2B] hover:bg-[#8F2E21] text-white p-5 rounded-2xl font-bold text-lg flex items-center justify-between transition-transform active:scale-95 shadow-md shadow-[#B13A2B]/20"
                        >
                            <span className="flex items-center"><KeyRound className="w-6 h-6 mr-3" /> Acessar operação</span>
                            <ArrowRight className="w-5 h-5 text-[#D4564A]" />
                        </button>
                        <button
                            onClick={() => setMode('manager')}
                            className="bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 p-4 rounded-2xl font-semibold text-sm flex items-center justify-between transition-transform active:scale-95"
                        >
                            <span className="flex items-center"><Lock className="w-5 h-5 mr-2 text-gray-400" /> Acesso Gerencial</span>
                            <ArrowRight className="w-4 h-4 text-gray-300" />
                        </button>
                    </div>
                )}

                {mode === 'manager' && (
                    <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl border border-gray-100 relative">
                        <button onClick={() => { setMode('select'); setError(null) }} className="absolute -top-4 -left-4 bg-white p-2 rounded-full shadow-md text-gray-500 hover:text-[#B13A2B]">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-xl font-bold text-center text-gray-900 mb-6 flex items-center justify-center">
                            <Lock className="w-5 h-5 mr-2 text-[#B13A2B]" /> Gerência Geral
                        </h3>
                        <form className="space-y-5" onSubmit={handleManagerLogin}>
                            {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold text-center">{error}</div>}
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                                    <input
                                        type="email" required
                                        value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-3 py-3 bg-gray-50 border-transparent rounded-xl focus:ring-4 focus:ring-[#FDF0EF] focus:border-[#B13A2B] focus:bg-white transition-all outline-none font-medium"
                                        placeholder="Seu email"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Senha</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-gray-400" /></div>
                                    <input
                                        type="password" required
                                        value={password} onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-3 py-3 bg-gray-50 border-transparent rounded-xl focus:ring-4 focus:ring-[#FDF0EF] focus:border-[#B13A2B] focus:bg-white transition-all outline-none font-medium"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit" disabled={loading}
                                className="w-full py-4 rounded-xl shadow-md text-sm font-bold text-white bg-gray-900 hover:bg-black active:scale-95 transition-all flex items-center justify-center mt-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar como Gerente'}
                            </button>
                        </form>
                    </div>
                )}

                {mode === 'operator_select' && (
                    <div className="bg-white pt-6 pb-4 px-4 shadow-2xl rounded-3xl border border-gray-100 relative max-h-[80vh] flex flex-col h-full">
                        <button onClick={() => setMode('select')} className="absolute -top-4 -left-4 bg-white p-2 rounded-full shadow-md text-gray-500 hover:text-[#B13A2B] z-10">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-xl font-extrabold text-center text-gray-900 mb-4 px-8 leading-tight">Quem vai operar?</h3>

                        <div className="overflow-y-auto pr-2 space-y-2 flex-1 pb-4">
                            {loading ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#B13A2B]" /></div>
                            ) : employees.length === 0 ? (
                                <div className="text-center text-gray-500 p-6 text-sm font-semibold border-2 border-dashed border-gray-200 rounded-xl">
                                    Nenhum operador ativo.<br /><span className="text-xs font-normal">Aguardando a execução do script (migration_pins.sql) pelo banco de dados.</span>
                                </div>
                            ) : employees.map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => { setSelectedOp(emp); setMode('operator_pin'); setPin('') }}
                                    className="w-full text-left p-4 rounded-2xl bg-gray-50 hover:bg-[#FDF0EF] border border-t border-gray-100 active:bg-[#FDF0EF] transition-colors flex items-center justify-between"
                                >
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-[#FDF0EF] text-[#B13A2B] flex items-center justify-center font-bold text-lg mr-3">
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-gray-800 text-lg">{emp.name}</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-300" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {mode === 'operator_pin' && (
                    <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl border border-gray-100 flex flex-col items-center relative">
                        <button onClick={() => setMode('operator_select')} className="absolute -top-4 -left-4 bg-white p-2 rounded-full shadow-md text-gray-500 hover:text-[#B13A2B] z-10">
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="w-16 h-16 rounded-full bg-[#FDF0EF] text-[#B13A2B] flex items-center justify-center text-3xl font-black mb-3">
                            {selectedOp?.name.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{selectedOp?.name}</h3>
                        <p className="text-sm font-medium text-gray-400 mb-8 mt-1">Insira seu PIN de 4 dígitos</p>

                        <div className="flex justify-center space-x-3 mb-8 w-full">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? 'bg-[#B13A2B] scale-125 shadow-sm' : 'bg-gray-200'}`} />
                            ))}
                        </div>

                        {loading ? (
                            <div className="py-12"><Loader2 className="w-10 h-10 animate-spin text-[#B13A2B]" /></div>
                        ) : (
                            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handlePinDigit(num.toString())}
                                        className="h-16 rounded-2xl bg-gray-50 active:bg-gray-200 font-bold text-2xl text-gray-800 touch-manipulation transition-colors"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <div />
                                <button
                                    onClick={() => handlePinDigit('0')}
                                    className="h-16 rounded-2xl bg-gray-50 active:bg-gray-200 font-bold text-2xl text-gray-800 touch-manipulation transition-colors"
                                >
                                    0
                                </button>
                                <button
                                    onClick={() => handleDelete()}
                                    className="h-16 rounded-2xl bg-red-50 text-red-500 active:bg-red-100 font-bold text-xl flex items-center justify-center touch-manipulation transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
