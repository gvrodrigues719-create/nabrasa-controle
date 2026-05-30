'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, CheckCircle2, AlertTriangle, XCircle,
    Tag, Link2, FlaskConical, TestTube2, Clock, Store, Factory,
    RefreshCw, ChevronRight
} from 'lucide-react'
import { getKitchenDashboardDataAction } from '@/app/actions/kitchenDashboardAction'
import type { KitchenSaudeData } from '@/app/actions/kitchenDashboardAction'

function formatHours(h: number): string {
    if (h < 1) return 'Menos de 1h atrás'
    if (h < 24) return `${Math.round(h)}h atrás`
    const d = Math.floor(h / 24)
    const rem = Math.round(h % 24)
    return rem > 0 ? `${d}d ${rem}h atrás` : `${d} dia${d > 1 ? 's' : ''} atrás`
}

function SectionHeader({ icon: Icon, label, count, severity }: {
    icon: React.ElementType
    label: string
    count: number
    severity: 'ok' | 'warn' | 'error'
}) {
    const colors = {
        ok: 'text-emerald-600 bg-emerald-50',
        warn: 'text-amber-600 bg-amber-50',
        error: 'text-red-600 bg-red-50',
    }
    const indicators = {
        ok: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        warn: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        error: <XCircle className="w-4 h-4 text-red-500" />,
    }
    return (
        <div className="flex items-center gap-3 px-1">
            <div className={`p-2 rounded-xl ${colors[severity]}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-black text-gray-900">{label}</p>
            </div>
            <div className="flex items-center gap-1.5">
                {indicators[severity]}
                <span className={`text-sm font-black ${severity === 'ok' ? 'text-emerald-600' : severity === 'warn' ? 'text-amber-600' : 'text-red-600'}`}>
                    {count}
                </span>
            </div>
        </div>
    )
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-xs font-bold text-emerald-700">{label}</p>
        </div>
    )
}

export default function SystemHealthPage() {
    const router = useRouter()
    const [data, setData] = useState<KitchenSaudeData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function load() {
        setLoading(true)
        setError(null)
        const res = await getKitchenDashboardDataAction()
        if (res.success && res.saude) {
            setData(res.saude)
        } else {
            setError(res.error ?? 'Erro ao carregar dados de saúde.')
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const overallSeverity = !data ? 'ok'
        : data.unclassifiedCount > 0 || data.producedSemVinculoCount > 0 || data.pedidosTesteCount > 0 ? 'error'
        : (data.idadeContagemCK_horas ?? 0) > 72 || data.lojasDesatualizadas.length > 0 ? 'warn'
        : 'ok'

    const bannerConfig = {
        ok: { bg: 'bg-emerald-500', text: 'Base saudável — Planejamento confiável.', icon: CheckCircle2 },
        warn: { bg: 'bg-amber-500', text: 'Atenção — Alguns pontos merecem revisão.', icon: AlertTriangle },
        error: { bg: 'bg-red-500', text: 'Ação necessária — Base com inconsistências.', icon: XCircle },
    }[overallSeverity]

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-md lg:max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.push('/dashboard/kitchen')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-sm font-black text-gray-900 leading-none">Saúde da Base</h1>
                            <p className="text-[10px] text-gray-400 mt-1 font-bold">Diagnóstico do Planejamento</p>
                        </div>
                    </div>
                    <button onClick={load} disabled={loading} className="p-2.5 hover:bg-gray-100 rounded-xl bg-gray-50">
                        <RefreshCw className={`w-4 h-4 text-orange-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-md lg:max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-28 bg-white rounded-3xl animate-pulse border border-gray-100" />
                        ))}
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
                        <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                        <p className="text-sm font-bold text-red-700">{error}</p>
                    </div>
                )}

                {/* Content */}
                {!loading && data && (
                    <>
                        {/* Status Banner */}
                        <div className={`${bannerConfig.bg} rounded-3xl p-5 flex items-center gap-3 text-white shadow-lg`}>
                            <bannerConfig.icon className="w-6 h-6 shrink-0" />
                            <p className="font-black text-sm leading-snug">{bannerConfig.text}</p>
                        </div>

                        {/* 1. Itens sem classificação */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
                            <SectionHeader
                                icon={Tag}
                                label="Itens sem classificação"
                                count={data.unclassifiedCount}
                                severity={data.unclassifiedCount > 0 ? 'error' : 'ok'}
                            />
                            {data.unclassifiedCount === 0 ? (
                                <EmptyState label="Todos os itens estão classificados." />
                            ) : (
                                <div className="space-y-2 mt-1">
                                    {data.unclassifiedItems.map(item => (
                                        <div key={item.id} className="flex items-start gap-3 px-3 py-2.5 bg-red-50 rounded-xl">
                                            <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-gray-900 truncate">{item.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold mt-0.5">{item.category} · {item.suggestion}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 2. Produzidos sem vínculo com contagem CK */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
                            <SectionHeader
                                icon={Link2}
                                label="Produzidos sem vínculo de contagem"
                                count={data.producedSemVinculoCount}
                                severity={data.producedSemVinculoCount > 0 ? 'error' : 'ok'}
                            />
                            <p className="text-[10px] text-gray-400 font-bold px-1">
                                Sem vínculo, o cálculo de estoque não funciona para estes itens.
                            </p>
                            {data.producedSemVinculoCount === 0 ? (
                                <EmptyState label="Todos os itens produzidos têm vínculo de contagem." />
                            ) : (
                                <div className="space-y-2 mt-1">
                                    {data.producedSemVinculo.map(item => (
                                        <div key={item.id} className="flex items-start gap-3 px-3 py-2.5 bg-red-50 rounded-xl">
                                            <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-gray-900 truncate">{item.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                    {item.category} · Vincular via Planejamento
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => router.push('/dashboard/kitchen/planning')}
                                        className="w-full flex items-center justify-between px-3 py-2.5 bg-orange-50 rounded-xl active:scale-[0.98] transition-all mt-1"
                                    >
                                        <span className="text-xs font-black text-orange-700">Ir para Planejamento para vincular</span>
                                        <ChevronRight className="w-4 h-4 text-orange-500" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 3. Itens para revisar no planejamento */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
                            <SectionHeader
                                icon={FlaskConical}
                                label="Itens para revisar no planejamento"
                                count={data.itensParaRevisarCount}
                                severity={data.itensParaRevisarCount > 0 ? 'error' : 'ok'}
                            />
                            {data.itensParaRevisarCount === 0 ? (
                                <EmptyState label="Nenhum item cairia na aba 'Revisar' agora." />
                            ) : (
                                <div className="px-3 py-2.5 bg-red-50 rounded-xl flex items-center justify-between">
                                    <p className="text-xs font-black text-red-700">{data.itensParaRevisarCount} item(s) sem rota no planejamento</p>
                                    <button onClick={() => router.push('/dashboard/kitchen/planning')}>
                                        <ChevronRight className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 4. Pedidos de teste ativos */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
                            <SectionHeader
                                icon={TestTube2}
                                label="Pedidos de teste ativos"
                                count={data.pedidosTesteCount}
                                severity={data.pedidosTesteCount > 0 ? 'error' : 'ok'}
                            />
                            {data.pedidosTesteCount === 0 ? (
                                <EmptyState label="Nenhum pedido de teste ativo no sistema." />
                            ) : (
                                <div className="space-y-2 mt-1">
                                    {data.pedidosTeste.map(p => (
                                        <div key={p.id} className="px-3 py-2.5 bg-red-50 rounded-xl">
                                            <p className="text-xs font-black text-gray-900">{p.notes}</p>
                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                Status: {p.status} · {new Date(p.created_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 5. Contagem CK */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
                            <SectionHeader
                                icon={Clock}
                                label="Última contagem da Cozinha Central"
                                count={data.idadeContagemCK_horas !== null ? Math.round(data.idadeContagemCK_horas) : 0}
                                severity={
                                    data.idadeContagemCK_horas === null ? 'error'
                                    : data.idadeContagemCK_horas > 72 ? 'error'
                                    : data.idadeContagemCK_horas > 24 ? 'warn'
                                    : 'ok'
                                }
                            />
                            {data.ultimaContagemCK_at ? (
                                <div className={`px-3 py-2.5 rounded-xl ${(data.idadeContagemCK_horas ?? 999) > 72 ? 'bg-red-50' : (data.idadeContagemCK_horas ?? 999) > 24 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                                    <p className="text-xs font-black text-gray-900">
                                        {formatHours(data.idadeContagemCK_horas ?? 0)}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                        {new Date(data.ultimaContagemCK_at).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            ) : (
                                <div className="px-3 py-2.5 bg-red-50 rounded-xl">
                                    <p className="text-xs font-black text-red-700">Nenhuma contagem finalizada encontrada.</p>
                                </div>
                            )}
                            <button
                                onClick={() => router.push('/dashboard/kitchen/count')}
                                className="w-full flex items-center justify-between px-3 py-2 bg-orange-50 rounded-xl active:scale-[0.98] transition-all"
                            >
                                <span className="text-xs font-black text-orange-700">Ir para Contagem CK</span>
                                <ChevronRight className="w-4 h-4 text-orange-500" />
                            </button>
                        </div>

                        {/* 6. Contagens de lojas desatualizadas */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
                            <SectionHeader
                                icon={Store}
                                label="Lojas com contagem desatualizada (+72h)"
                                count={data.lojasDesatualizadas.length}
                                severity={data.lojasDesatualizadas.length > 0 ? 'warn' : 'ok'}
                            />
                            {data.lojasDesatualizadas.length === 0 ? (
                                <EmptyState label="Todas as lojas com contagens recentes." />
                            ) : (
                                <div className="space-y-2 mt-1">
                                    {data.lojasDesatualizadas.map((loja, idx) => (
                                        <div key={idx} className="px-3 py-2.5 bg-amber-50 rounded-xl">
                                            <p className="text-xs font-black text-gray-900">{loja.unit_name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                Última contagem: {formatHours(loja.diffHoras)}
                                            </p>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => router.push('/dashboard/kitchen/store-stock')}
                                        className="w-full flex items-center justify-between px-3 py-2 bg-orange-50 rounded-xl active:scale-[0.98] transition-all"
                                    >
                                        <span className="text-xs font-black text-orange-700">Ver Estoque das Lojas</span>
                                        <ChevronRight className="w-4 h-4 text-orange-500" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 7. Produções em aberto */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
                            <SectionHeader
                                icon={Factory}
                                label="Ordens de produção em aberto"
                                count={data.producaoEmAbertoCount}
                                severity={data.producaoEmAbertoCount > 0 ? 'warn' : 'ok'}
                            />
                            {data.producaoEmAbertoCount === 0 ? (
                                <EmptyState label="Nenhuma ordem de produção pendente." />
                            ) : (
                                <div className="space-y-2 mt-1">
                                    {data.producaoEmAberto.map(p => (
                                        <div key={p.id} className="px-3 py-2.5 bg-amber-50 rounded-xl">
                                            <p className="text-xs font-black text-gray-900">Status: {p.status}</p>
                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                Criado em: {new Date(p.created_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
