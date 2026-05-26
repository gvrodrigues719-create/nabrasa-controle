'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Inbox, Timer, PackageCheck, AlertTriangle, Send, Calculator, ClipboardList, Truck, CheckCircle2, XCircle, Link2, Tag, Clock, Store, ChevronRight } from 'lucide-react'
import { getOrdersForKitchenAction } from '@/modules/purchases/actions'
import { getKitchenDashboardDataAction } from '@/app/actions/kitchenDashboardAction'
import type { PurchaseOrder } from '@/modules/purchases/types'
import type { KitchenOperacaoData, KitchenSaudeData } from '@/app/actions/kitchenDashboardAction'
import { KitchenOrderCard } from './components/KitchenOrderCard'
import toast from 'react-hot-toast'

function formatHours(h: number): string {
    if (h < 1) return '<1h'
    if (h < 24) return `${Math.round(h)}h`
    return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`
}

export default function KitchenPage() {
    const router = useRouter()
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [operacao, setOperacao] = useState<KitchenOperacaoData | null>(null)
    const [saude, setSaude] = useState<KitchenSaudeData | null>(null)
    const [dashLoading, setDashLoading] = useState(true)

    async function fetchOrders(showRefresh = false) {
        if (showRefresh) setRefreshing(true)
        else setLoading(true)
        setErrorMsg(null)
        const res = await getOrdersForKitchenAction()
        if (res.success) {
            setOrders(res.data ?? [])
        } else {
            setErrorMsg(res.error ?? 'Erro ao carregar pedidos')
            toast.error(res.error ?? 'Erro ao carregar pedidos')
        }
        setLoading(false)
        setRefreshing(false)
    }

    async function fetchDashboard() {
        setDashLoading(true)
        const res = await getKitchenDashboardDataAction()
        if (res.success) {
            setOperacao(res.operacao ?? null)
            setSaude(res.saude ?? null)
        }
        setDashLoading(false)
    }

    useEffect(() => { fetchOrders(); fetchDashboard() }, [])

    const hoje = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
    const enviados = orders.filter(o => o.status === 'enviado')
    const emAnalise = orders.filter(o => o.status === 'em_analise')
    const emSeparacao = orders.filter(o => o.status === 'em_separacao')
    const emAndamento = orders.filter(o => ['em_analise', 'em_separacao'].includes(o.status))
    const separadosHoje = orders.filter(o => o.status === 'separado' && (o.updated_at ?? '').slice(0, 10) === hoje)
    const separadosAntigos = orders.filter(o => o.status === 'separado' && (o.updated_at ?? '').slice(0, 10) !== hoje)
    const divergentes = orders.filter(o => o.status === 'divergente')
    const pedidosComAcao = [...divergentes, ...emAnalise, ...enviados, ...emSeparacao]

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-md lg:max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black text-gray-900 leading-none truncate">Cozinha Central</h1>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold truncate">Rotinas, produção e abastecimento</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => fetchOrders(true)}
                            disabled={refreshing}
                            className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors bg-gray-50"
                        >
                            <RefreshCw className={`w-4 h-4 text-orange-600 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-md lg:max-w-4xl mx-auto px-4 py-6 space-y-10 pb-32">

                {/* ── SEÇÃO: Operação de Hoje ──────────────────────────── */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">
                        Operação de Hoje
                    </h2>

                    {/* Status banner — mensagem específica */}
                    {/* Status banner — mensagem específica */}
                    {!dashLoading && operacao && (() => {
                        const now = new Date()
                        const dow = now.getDay() // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
                        const isAfterLimit = now.getHours() >= 16 // 16h como limite
                        const hojeStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
                        
                        let contouHoje = false
                        if (operacao.ultimaContagemCK_at) {
                            const ckDate = new Date(operacao.ultimaContagemCK_at)
                            const ckStr = ckDate.getFullYear() + '-' + String(ckDate.getMonth() + 1).padStart(2, '0') + '-' + String(ckDate.getDate()).padStart(2, '0')
                            contouHoje = ckStr === hojeStr
                        }

                        let msg = 'Operação sem pendências críticas agora.'
                        let subMsg = ''
                        let actionUrl = ''
                        let variant: 'critico' | 'atencao' | 'ok' = 'ok'

                        if (operacao.pedidosAnalise > 0) {
                            msg = `Ação recomendada: analisar ${operacao.pedidosAnalise} pedido(s) das lojas.`
                            actionUrl = '/dashboard/kitchen/planning'
                            variant = 'critico'
                        }
                        else if (dow === 5 && !contouHoje) {
                            if (isAfterLimit) {
                                msg = 'Contagem CK obrigatória pendente.'
                                subMsg = 'Finalize agora.'
                                actionUrl = '/dashboard/kitchen/count'
                                variant = 'critico'
                            } else {
                                msg = 'Hoje é dia de contagem obrigatória da CK.'
                                subMsg = 'Finalize até o fim do turno.'
                                actionUrl = '/dashboard/kitchen/count'
                                variant = 'atencao'
                            }
                        }
                        else if (dow === 1) {
                            msg = 'Hoje as lojas fazem pedidos para entrega amanhã (Terça).'
                            actionUrl = '/dashboard/kitchen/store-stock'
                            variant = 'atencao'
                        }
                        else if (dow === 4) {
                            msg = 'Hoje as lojas fazem pedidos para entrega amanhã (Sexta).'
                            actionUrl = '/dashboard/kitchen/store-stock'
                            variant = 'atencao'
                        }
                        else if (operacao.producaoNecessaria > 0) {
                            msg = `Ação recomendada: planejar produção de ${operacao.producaoNecessaria} item(s).`
                            actionUrl = '/dashboard/kitchen/planning'
                        }
                        else if (orders.some(o => o.status === 'divergente')) {
                            const divCount = orders.filter(o => o.status === 'divergente').length
                            msg = `Atenção: ${divCount} pedido(s) com divergência no recebimento da loja.`
                            actionUrl = `/dashboard/kitchen/${orders.find(o => o.status === 'divergente')?.id}`
                            variant = 'critico'
                        }
                        else if (orders.some(o => o.status === 'separado')) {
                            const expedirCount = orders.filter(o => o.status === 'separado').length
                            msg = `Ação recomendada: Expedir ${expedirCount} pedido(s) já separado(s).`
                            actionUrl = `/dashboard/kitchen/${orders.find(o => o.status === 'separado')?.id}/dispatch`
                            variant = 'atencao'
                        }
                        else if (operacao.separacaoNecessaria > 0) {
                            msg = `${operacao.separacaoNecessaria} item(s) aguardando separação.`
                            actionUrl = '/dashboard/kitchen/planning'
                            variant = 'atencao'
                        }
                        else if (operacao.recebimentosAtrasados > 0) {
                            msg = `${operacao.recebimentosAtrasados} recebimento(s) de fornecedor(es) atrasado(s).`
                            actionUrl = '/dashboard/kitchen/receivings'
                            variant = 'atencao'
                        }
                        else if (dow === 5 && contouHoje) {
                            msg = 'Contagem CK realizada hoje.'
                            subMsg = `Última atualização há ${formatHours(operacao.idadeContagemCK_horas ?? 0)}.`
                            actionUrl = ''
                            variant = 'ok'
                        }
                        else if (operacao.producedSemVinculoCount > 0) {
                            msg = `Ação recomendada: resolver ${operacao.producedSemVinculoCount} itens sem vínculo.`
                            actionUrl = '/dashboard/kitchen/system-health'
                            variant = 'atencao'
                        }
                        else if (operacao.pedidosTesteCount > 0) {
                            msg = `Atenção: Existem ${operacao.pedidosTesteCount} pedido(s) de teste/QA ativos.`
                            actionUrl = '/dashboard/kitchen/system-health'
                            variant = 'atencao'
                        }

                        const bg = variant === 'critico' ? 'bg-red-500' : variant === 'atencao' ? 'bg-amber-500' : 'bg-emerald-500'
                        const Icon = variant === 'critico' ? XCircle : variant === 'atencao' ? AlertTriangle : CheckCircle2

                        const bannerContent = (
                            <>
                                <Icon className="w-5 h-5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black leading-snug">{msg}</p>
                                    {subMsg && <p className="text-[10px] font-bold text-white/80 mt-0.5">{subMsg}</p>}
                                </div>
                                {actionUrl && <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />}
                            </>
                        )

                        if (actionUrl) {
                            return (
                                <button onClick={() => router.push(actionUrl)} className={`w-full ${bg} rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-white text-left active:scale-[0.98] transition-transform shadow-lg shadow-${variant === 'critico' ? 'red' : 'amber'}-200/50`}>
                                    {bannerContent}
                                </button>
                            )
                        }
                        return (
                            <div className={`${bg} rounded-2xl px-4 py-3 flex items-center gap-3 text-white`}>
                                {bannerContent}
                            </div>
                        )
                    })()}

                    {/* Indicadores — só mostra cards com valor ou alerta */}
                    {dashLoading ? (
                        <div className="grid grid-cols-3 gap-2.5">
                            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
                        </div>
                    ) : operacao && (() => {
                        const ckH = operacao.idadeContagemCK_horas ?? 0
                        const now = new Date()
                        const dow = now.getDay()
                        const hojeStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
                        
                        let contouHoje = false
                        if (operacao.ultimaContagemCK_at) {
                            const ckDate = new Date(operacao.ultimaContagemCK_at)
                            const ckStr = ckDate.getFullYear() + '-' + String(ckDate.getMonth() + 1).padStart(2, '0') + '-' + String(ckDate.getDate()).padStart(2, '0')
                            contouHoje = ckStr === hojeStr
                        }
                        
                        let ckLabel = "Última contagem CK"
                        let ckVal = `há ${formatHours(ckH)}`
                        if (dow === 5 && contouHoje) {
                            ckLabel = "Contagem de sexta feita"
                        } else if (ckH > 24) {
                            ckLabel = "CK sem atualizar"
                        }
                        
                        const paraExpedirCount = orders.filter(o => o.status === 'separado').length
                        const divergentesCount = orders.filter(o => o.status === 'divergente').length

                        const cards = [
                            operacao.pedidosAnalise > 0 && (
                                <button key="analise" onClick={() => router.push('/dashboard/kitchen/planning')}
                                    className="bg-white rounded-2xl p-3 text-left border-2 border-red-200 shadow-sm active:scale-[0.97] transition-all">
                                    <p className="text-2xl font-black leading-none text-red-600">{operacao.pedidosAnalise}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-1.5 leading-tight">Em Análise</p>
                                </button>
                            ),
                            operacao.producaoNecessaria > 0 && (
                                <button key="prod" onClick={() => router.push('/dashboard/kitchen/planning')}
                                    className="bg-white rounded-2xl p-3 text-left border-2 border-orange-200 shadow-sm active:scale-[0.97] transition-all">
                                    <p className="text-2xl font-black leading-none text-orange-600">{operacao.producaoNecessaria}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-1.5 leading-tight">Para Produzir</p>
                                </button>
                            ),
                            operacao.separacaoNecessaria > 0 && (
                                <button key="sep" onClick={() => router.push('/dashboard/kitchen/planning')}
                                    className="bg-white rounded-2xl p-3 text-left border-2 border-gray-200 shadow-sm active:scale-[0.97] transition-all">
                                    <p className="text-2xl font-black leading-none text-gray-700">{operacao.separacaoNecessaria}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-1.5 leading-tight">Para Separar</p>
                                </button>
                            ),
                            paraExpedirCount > 0 && (
                                <button key="exp" onClick={() => {
                                    const firstOrder = orders.find(o => o.status === 'separado')
                                    if (firstOrder) router.push(`/dashboard/kitchen/${firstOrder.id}/dispatch`)
                                }}
                                    className="bg-white rounded-2xl p-3 text-left border-2 border-indigo-200 shadow-sm active:scale-[0.97] transition-all">
                                    <p className="text-2xl font-black leading-none text-indigo-600">{paraExpedirCount}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-1.5 leading-tight">Para Expedir</p>
                                </button>
                            ),
                            divergentesCount > 0 && (
                                <button key="div" onClick={() => {
                                    const firstOrder = orders.find(o => o.status === 'divergente')
                                    if (firstOrder) router.push(`/dashboard/kitchen/${firstOrder.id}`)
                                }}
                                    className="bg-white rounded-2xl p-3 text-left border-2 border-red-300 shadow-sm active:scale-[0.97] transition-all">
                                    <p className="text-2xl font-black leading-none text-red-600">{divergentesCount}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-1.5 leading-tight">Divergências</p>
                                </button>
                            ),
                            operacao.recebimentosAtrasados > 0 && (
                                <button key="receb" onClick={() => router.push('/dashboard/kitchen/receivings')}
                                    className="bg-white rounded-2xl p-3 text-left border-2 border-amber-200 shadow-sm active:scale-[0.97] transition-all">
                                    <p className="text-2xl font-black leading-none text-amber-600">{operacao.recebimentosAtrasados}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-1.5 leading-tight">Rec. Atrasado</p>
                                </button>
                            ),
                            (ckH > 0) && (
                                <button key="ck" onClick={() => router.push('/dashboard/kitchen/history/latest')}
                                    className={`bg-white rounded-2xl p-3 text-left border-2 shadow-sm active:scale-[0.97] transition-all ${ckH > 24 ? 'border-amber-200' : 'border-gray-100'}`}>
                                    <p className={`text-base font-black leading-none ${ckH > 24 ? 'text-amber-600' : 'text-emerald-600'}`}>{ckVal}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-1.5 leading-tight">{ckLabel}</p>
                                </button>
                            ),
                        ].filter(Boolean)
                        return cards.length > 0
                            ? <div className="grid grid-cols-3 gap-2.5">{cards}</div>
                            : <p className="text-xs text-gray-400 font-bold px-1">Sem pedidos pendentes agora.</p>
                    })()}
                </section>

                {/* ── SEÇÃO: Pedidos das Lojas ─────────────────────────── */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div>
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pedidos das Lojas</h2>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Solicitações de abastecimento das unidades</p>
                        </div>
                    </div>

                    {/* Summary strip — só mostra se houver pendências */}
                    {pedidosComAcao.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            {emAnalise.length > 0 && (
                                <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm">
                                    <p className="text-2xl font-black leading-none text-red-600">{emAnalise.length}</p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Em análise</p>
                                </div>
                            )}
                            {enviados.length > 0 && (
                                <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm">
                                    <p className="text-2xl font-black leading-none text-blue-600">{enviados.length}</p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Enviados</p>
                                </div>
                            )}
                            {emSeparacao.length > 0 && (
                                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                                    <p className="text-2xl font-black leading-none text-gray-700">{emSeparacao.length}</p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Em separação</p>
                                </div>
                            )}
                            {divergentes.length > 0 && (
                                <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm">
                                    <p className="text-2xl font-black leading-none text-red-600">{divergentes.length}</p>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Divergentes</p>
                                </div>
                            )}
                        </div>
                    )}

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2].map(i => <div key={i} className="h-32 bg-white rounded-3xl border border-gray-100 animate-pulse shadow-sm" />)}
                        </div>
                    ) : errorMsg ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-[28px] flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-base font-black text-gray-900 mb-1">Acesso Negado</h3>
                            <p className="text-sm text-gray-500">Sem permissão para acessar a Cozinha Central.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Actionable orders or Empty State banner */}
                            {pedidosComAcao.length === 0 ? (
                                <div className="bg-white rounded-2xl px-4 py-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-black text-gray-900">Sem pedidos pendentes agora.</p>
                                        {separadosHoje.length > 0 && (
                                            <p className="text-[11px] text-gray-400 font-bold mt-0.5">{separadosHoje.length} pedido(s) separado(s) hoje</p>
                                        )}
                                        {separadosHoje.length === 0 && separadosAntigos.length > 0 && (
                                            <p className="text-[11px] text-gray-400 font-bold mt-0.5">{separadosAntigos.length} separado(s) anteriores</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(separadosHoje.length > 0 || separadosAntigos.length > 0) && (
                                            <button onClick={() => router.push('/dashboard/kitchen/planning')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-1.5 bg-gray-50 rounded-xl hover:bg-gray-100 active:scale-95 transition-transform">
                                                Ver histórico →
                                            </button>
                                        )}
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Prioridade: Divergentes → Em análise → Enviados → Em Separação */}
                                    {divergentes.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="h-px flex-1 bg-red-100" />
                                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest whitespace-nowrap">Divergências · {divergentes.length}</span>
                                                <div className="h-px flex-1 bg-red-100" />
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-3">
                                                {divergentes.map(o => <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />)}
                                            </div>
                                        </div>
                                    )}
                                    {emAnalise.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="h-px flex-1 bg-gray-100" />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Em análise · {emAnalise.length}</span>
                                                <div className="h-px flex-1 bg-gray-100" />
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-3">
                                                {emAnalise.map(o => <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />)}
                                            </div>
                                        </div>
                                    )}
                                    {enviados.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="h-px flex-1 bg-gray-100" />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Novos pedidos · {enviados.length}</span>
                                                <div className="h-px flex-1 bg-gray-100" />
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-3">
                                                {enviados.map(o => <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />)}
                                            </div>
                                        </div>
                                    )}
                                    {emSeparacao.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="h-px flex-1 bg-gray-100" />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Em separação · {emSeparacao.length}</span>
                                                <div className="h-px flex-1 bg-gray-100" />
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-3">
                                                {emSeparacao.map(o => <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />)}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Separated orders section - rendered always, regardless of active orders count */}
                            {separadosHoje.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-px flex-1 bg-gray-100" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Separados hoje · {separadosHoje.length}</span>
                                        <div className="h-px flex-1 bg-gray-100" />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        {separadosHoje.map(o => <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />)}
                                    </div>
                                </div>
                            )}
                            {separadosAntigos.length > 0 && (
                                <details className="group">
                                    <summary className="flex items-center gap-2 cursor-pointer text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 list-none">
                                        <span className="flex-1 h-px bg-gray-100" />
                                        <span className="group-open:hidden">Ver separados anteriores · {separadosAntigos.length}</span>
                                        <span className="hidden group-open:inline">Ocultar separados anteriores</span>
                                        <span className="flex-1 h-px bg-gray-100" />
                                    </summary>
                                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                                        {separadosAntigos.map(o => <KitchenOrderCard key={o.id} order={o} onUpdate={() => fetchOrders(true)} />)}
                                    </div>
                                </details>
                            )}
                        </div>
                    )}
                </section>

                {/* ── SEÇÃO: Rotina da Cozinha Central ────────────────── */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">
                        Rotina da Cozinha Central
                    </h2>
                    
                    <div className="space-y-3">
                        {/* Card Principal: Contagem */}
                        <button
                            onClick={() => router.push('/dashboard/kitchen/count')}
                            className="w-full bg-gradient-to-br from-orange-500 to-orange-700 p-6 rounded-[32px] flex items-center text-left shadow-xl shadow-orange-200/50 space-x-4 active:scale-[0.98] transition-all"
                        >
                            <div className="bg-white/20 p-4 rounded-2xl shrink-0">
                                <ClipboardList className="w-8 h-8 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-orange-200 text-[10px] font-black uppercase tracking-widest mb-0.5">
                                    Rotina Operacional
                                </p>
                                <h3 className="font-black text-white text-xl leading-tight">
                                    Contagem da Cozinha Central
                                </h3>
                                <p className="text-orange-100 text-xs mt-1 leading-relaxed opacity-90">
                                    Iniciar ou continuar contagem de insumos, carnes e descartáveis.
                                </p>
                            </div>
                            <div className="bg-white/10 px-3 py-1.5 rounded-xl shrink-0 hidden sm:block">
                                <span className="text-white text-[10px] font-black uppercase tracking-widest">Abrir →</span>
                            </div>
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Recebimentos */}
                            <button
                                onClick={() => router.push('/dashboard/kitchen/receivings')}
                                className="bg-white p-5 rounded-[28px] flex items-center text-left border-2 border-gray-100 shadow-sm space-x-4 active:scale-[0.97] transition-all hover:border-blue-200"
                            >
                                <div className="bg-blue-50 p-3 rounded-xl shrink-0">
                                    <Truck className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-gray-900 text-base leading-tight truncate">
                                        Recebimentos
                                    </h3>
                                    <p className="text-gray-400 text-[10px] font-bold mt-0.5 uppercase tracking-wider">Entregas da Semana</p>
                                </div>
                            </button>

                            {/* Histórico */}
                            <button
                                onClick={() => router.push('/dashboard/kitchen/history')}
                                className="bg-white p-5 rounded-[28px] flex items-center text-left border-2 border-gray-100 shadow-sm space-x-4 active:scale-[0.97] transition-all hover:border-orange-200"
                            >
                                <div className="bg-orange-50 p-3 rounded-xl shrink-0">
                                    <Timer className="w-6 h-6 text-orange-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-gray-900 text-base leading-tight truncate">
                                        Histórico
                                    </h3>
                                    <p className="text-gray-400 text-[10px] font-bold mt-0.5 uppercase tracking-wider">Contagens Anteriores</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── SEÇÃO: Planejamento e Decisão ───────────────────── */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">
                        Planejamento e Decisão
                    </h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Planejamento de Produção */}
                        <button
                            onClick={() => router.push('/dashboard/kitchen/planning')}
                            className="bg-white p-5 rounded-[28px] flex items-center text-left border-2 border-orange-100 shadow-lg shadow-orange-100/10 space-x-4 active:scale-[0.97] transition-all hover:border-orange-300"
                        >
                            <div className="bg-orange-50 p-3 rounded-xl shrink-0">
                                <Calculator className="w-6 h-6 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-gray-900 text-base leading-tight truncate">
                                    Produção
                                </h3>
                                <p className="text-orange-400 text-[10px] font-bold mt-0.5 uppercase tracking-wider">Planejamento de Produção</p>
                            </div>
                        </button>

                        {/* Estoque das Lojas */}
                        <button
                            onClick={() => router.push('/dashboard/kitchen/store-stock')}
                            className="bg-white p-5 rounded-[28px] flex items-center text-left border-2 border-gray-100 shadow-sm space-x-4 active:scale-[0.97] transition-all hover:border-orange-200"
                        >
                            <div className="bg-gray-50 p-3 rounded-xl shrink-0">
                                <PackageCheck className="w-6 h-6 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-gray-900 text-base leading-tight truncate">
                                    Estoque Lojas
                                </h3>
                                <p className="text-gray-400 text-[10px] font-bold mt-0.5 uppercase tracking-wider">Visão da Rede</p>
                            </div>
                        </button>
                    </div>
                </section>

                {/* ── SEÇÃO: Saúde da Base (compacto) ─────────────────── */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Saúde da Base</h2>
                    </div>

                    {dashLoading ? (
                        <div className="h-28 bg-white rounded-3xl animate-pulse border border-gray-100" />
                    ) : saude ? (() => {
                        const items = [
                            { label: 'Itens sem vínculo', val: saude.producedSemVinculoCount, icon: Link2, alert: saude.producedSemVinculoCount > 0, isRed: false },
                            { label: 'Sem classificação', val: saude.unclassifiedCount, icon: Tag, alert: saude.unclassifiedCount > 0, isRed: false },
                            { label: 'Para revisar', val: saude.itensParaRevisarCount, icon: AlertTriangle, alert: saude.itensParaRevisarCount > 0, isRed: false },
                            { label: 'Pedidos teste', val: saude.pedidosTesteCount, icon: AlertTriangle, alert: saude.pedidosTesteCount > 0, isRed: false },
                            { label: 'Contagem CK', val: saude.idadeContagemCK_horas !== null ? formatHours(saude.idadeContagemCK_horas) : '—', icon: Clock, alert: (saude.idadeContagemCK_horas ?? 0) > 24, isRed: (saude.idadeContagemCK_horas ?? 0) > 72 },
                            { label: 'Loja desatualizada', val: saude.lojasDesatualizadas.length, icon: Store, alert: saude.lojasDesatualizadas.length > 0, isRed: false },
                        ].filter(item => item.alert)

                        if (items.length === 0) {
                            return (
                                <div className="bg-white rounded-2xl px-4 py-4 border border-emerald-100 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">Base saudável</p>
                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">Nenhuma pendência de cadastro.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => router.push('/dashboard/kitchen/system-health')} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                                        Abrir
                                    </button>
                                </div>
                            )
                        }

                        const hasRed = items.some(i => i.isRed)
                        const borderColor = hasRed ? 'border-red-100' : 'border-amber-100'

                        return (
                            <div className={`bg-white rounded-3xl p-5 border-2 ${borderColor} shadow-sm space-y-4`}>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                                item.isRed ? 'bg-red-50' : 'bg-amber-50'
                                            }`}>
                                                <item.icon className={`w-3.5 h-3.5 ${
                                                    item.isRed ? 'text-red-500' : 'text-amber-500'
                                                }`} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-black leading-none ${
                                                    item.isRed ? 'text-red-600' : 'text-amber-600'
                                                }`}>{item.val}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide truncate">{item.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => router.push('/dashboard/kitchen/system-health')}
                                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl active:scale-[0.98] transition-all hover:bg-gray-100"
                                >
                                    <span className="text-xs font-black text-gray-600">Ver pendências da base</span>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        )
                    })() : null}
                </section>

                {/* duplicate section removed */}
            </div>
        </div>
    )
}
