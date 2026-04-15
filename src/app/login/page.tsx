'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Flame, Lock, Loader2, ArrowLeft, X, Settings } from 'lucide-react'
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
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>

            {/* Decorative blur blobs */}
            <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[#902216]/5 blur-[120px]" />
                <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[#8b4d43]/5 blur-[120px]" />
            </div>

            <main className="w-full max-w-[480px] flex flex-col items-center">

                {/* ── HEADER ── */}
                <header className="text-center mb-10 space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-sm mb-1">
                        <Flame className="w-7 h-7 text-[#B13A2B]" strokeWidth={2} fill="currentColor" />
                    </div>
                    <div>
                        <h1 className="font-extrabold text-3xl tracking-tight text-[#1b1c1a]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                            NaBrasa Controle
                        </h1>
                        <p className="text-[#58413e] text-base mt-1">
                            Contagem e controle da operação
                        </p>
                    </div>
                </header>

                {/* ── MODE: SELECT ── */}
                {mode === 'select' && (
                    <>
                        <div className="w-full bg-white rounded-2xl shadow-[0_40px_80px_rgba(27,28,26,0.05)] overflow-hidden">
                            {/* Hero image */}
                            <div className="aspect-video w-full overflow-hidden bg-[#efeeeb]">
                                <img
                                    src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80"
                                    alt="Preparo de carnes na brasa"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Actions */}
                            <div className="p-8 space-y-4">
                                <button
                                    onClick={() => setMode('operator_select')}
                                    className="w-full text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform text-lg"
                                    style={{
                                        fontFamily: 'var(--font-manrope), sans-serif',
                                        background: 'linear-gradient(135deg, #902216 0%, #B13A2B 100%)'
                                    }}
                                >
                                    Acessar operação
                                    <span className="text-xl">→</span>
                                </button>
                            </div>
                        </div>

                        {/* Footer secondary */}
                        <footer className="mt-8 flex flex-col items-center gap-5 w-full">
                            <button
                                onClick={() => setMode('manager')}
                                className="text-[#902216] font-semibold text-sm hover:bg-[#efeeeb] px-6 py-2 rounded-full transition-colors flex items-center gap-2"
                            >
                                <Settings className="w-4 h-4" />
                                Acesso gerencial
                            </button>
                            <div className="flex flex-col items-center gap-1.5 opacity-40">
                                <div className="w-10 h-px bg-[#dfbfba]" />
                                <span className="text-[10px] tracking-widest uppercase text-[#58413e]">Versão 2.4.0</span>
                            </div>
                        </footer>
                    </>
                )}

                {/* ── MODE: MANAGER ── */}
                {mode === 'manager' && (
                    <div className="w-full bg-white rounded-2xl shadow-[0_40px_80px_rgba(27,28,26,0.05)] p-8 relative">
                        <button
                            onClick={() => { setMode('select'); setError(null) }}
                            className="absolute -top-4 -left-4 bg-white p-2 rounded-full shadow-md text-[#58413e] hover:text-[#B13A2B] transition"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <h2 className="font-extrabold text-xl text-[#1b1c1a] mb-6 flex items-center gap-2" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                            <Lock className="w-5 h-5 text-[#B13A2B]" /> Gerência Geral
                        </h2>

                        <form className="space-y-5" onSubmit={handleManagerLogin}>
                            {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold text-center">{error}</div>}

                            <div>
                                <label className="block text-sm font-semibold text-[#58413e] mb-2 px-1">Email</label>
                                <input
                                    type="email" required
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#f4f3f0] border-none rounded-xl py-3.5 px-4 text-[#1b1c1a] font-medium focus:bg-white focus:ring-1 focus:ring-[#B13A2B]/30 transition-all outline-none placeholder:text-[#8c716c]"
                                    placeholder="seu@email.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#58413e] mb-2 px-1">Senha</label>
                                <input
                                    type="password" required
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#f4f3f0] border-none rounded-xl py-3.5 px-4 text-[#1b1c1a] font-medium focus:bg-white focus:ring-1 focus:ring-[#B13A2B]/30 transition-all outline-none placeholder:text-[#8c716c]"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button
                                type="submit" disabled={loading}
                                className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform mt-2"
                                style={{ background: 'linear-gradient(135deg, #902216 0%, #B13A2B 100%)', fontFamily: 'var(--font-manrope), sans-serif' }}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar como Gerente'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── MODE: OPERATOR SELECT ── */}
                {mode === 'operator_select' && (
                    <div className="w-full bg-white rounded-2xl shadow-[0_40px_80px_rgba(27,28,26,0.05)] relative overflow-hidden max-h-[70vh] flex flex-col">
                        <button
                            onClick={() => setMode('select')}
                            className="absolute top-4 left-4 bg-[#f4f3f0] p-2 rounded-full text-[#58413e] hover:text-[#B13A2B] z-10 transition"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="pt-14 pb-4 px-6 border-b border-[#efeeeb]">
                            <h2 className="font-extrabold text-xl text-[#1b1c1a]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                                Quem vai operar?
                            </h2>
                            <p className="text-sm text-[#58413e] mt-1">Selecione seu nome</p>
                        </div>

                        <div className="overflow-y-auto flex-1 p-3 space-y-1">
                            {loading ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#B13A2B]" /></div>
                            ) : employees.length === 0 ? (
                                <div className="text-center text-[#58413e] p-6 text-sm font-semibold border-2 border-dashed border-[#dfbfba] rounded-xl m-2">
                                    Nenhum operador ativo.<br /><span className="text-xs font-normal">Execute a migration_pins.sql no banco para ativar.</span>
                                </div>
                            ) : employees.map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => { setSelectedOp(emp); setMode('operator_pin'); setPin('') }}
                                    className="w-full text-left p-4 rounded-xl hover:bg-[#f4f3f0] active:bg-[#efeeeb] transition-colors flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#FDF0EF] text-[#B13A2B] flex items-center justify-center font-bold text-base">
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-semibold text-[#1b1c1a] text-base">{emp.name}</span>
                                    </div>
                                    <span className="text-[#dfbfba] group-hover:text-[#B13A2B] transition-colors text-xl">→</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── MODE: OPERATOR PIN ── */}
                {mode === 'operator_pin' && (
                    <div className="w-full bg-white rounded-2xl shadow-[0_40px_80px_rgba(27,28,26,0.05)] p-8 flex flex-col items-center relative">
                        <button
                            onClick={() => setMode('operator_select')}
                            className="absolute top-4 left-4 bg-[#f4f3f0] p-2 rounded-full text-[#58413e] hover:text-[#B13A2B] transition"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="w-16 h-16 rounded-full bg-[#FDF0EF] text-[#B13A2B] flex items-center justify-center text-2xl font-black mb-3 mt-2">
                            {selectedOp?.name.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="text-xl font-bold text-[#1b1c1a]" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>{selectedOp?.name}</h3>
                        <p className="text-sm text-[#8c716c] mb-8 mt-1">Insira seu PIN de 4 dígitos</p>

                        {/* PIN dots */}
                        <div className="flex justify-center space-x-3 mb-8 w-full">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${i < pin.length ? 'bg-[#B13A2B] scale-125' : 'bg-[#e3e2df]'}`} />
                            ))}
                        </div>

                        {loading ? (
                            <div className="py-10"><Loader2 className="w-10 h-10 animate-spin text-[#B13A2B]" /></div>
                        ) : (
                            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handlePinDigit(num.toString())}
                                        className="h-16 rounded-2xl bg-[#f4f3f0] hover:bg-[#efeeeb] active:bg-[#e3e2df] font-bold text-2xl text-[#1b1c1a] touch-manipulation transition-colors"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <div />
                                <button
                                    onClick={() => handlePinDigit('0')}
                                    className="h-16 rounded-2xl bg-[#f4f3f0] hover:bg-[#efeeeb] active:bg-[#e3e2df] font-bold text-2xl text-[#1b1c1a] touch-manipulation transition-colors"
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

            </main>
        </div>
    )
}
