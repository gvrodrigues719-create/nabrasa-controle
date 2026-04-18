"use client"

import Link from 'next/link'
import { 
    ClipboardList, 
    Package, 
    MessageSquare, 
    ShoppingCart, 
    Users, 
    Sliders, 
    BarChart3,
    ExternalLink,
    Zap
} from 'lucide-react'

interface ModuleItem {
    label: string;
    href?: string;
    status: 'active' | 'dev' | 'soon';
}

interface AreaProps {
    title: string;
    icon: any;
    color: string;
    modules: ModuleItem[];
}

function AreaCard({ title, icon: Icon, color, modules }: AreaProps) {
    return (
        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group">
            <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm`}>
                <Icon className="w-6 h-6" />
            </div>
            
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-4">{title}</h3>
            
            <div className="space-y-3 flex-1">
                {modules.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                        {m.status === 'active' && m.href ? (
                            <Link 
                                href={m.href}
                                className="text-xs font-bold text-gray-700 hover:text-[#B13A2B] flex items-center gap-1.5 transition-colors"
                            >
                                {m.label}
                                <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                            </Link>
                        ) : (
                            <span className={`text-xs font-bold ${m.status === 'dev' ? 'text-gray-400 italic' : 'text-gray-300'}`}>
                                {m.label}
                                {m.status === 'dev' && (
                                    <span className="ml-2 text-[8px] px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded-md uppercase not-italic">Dev</span>
                                )}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function SystemArchitectureHub() {
    return (
        <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-6 bg-[#B13A2B] rounded-full" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Áreas do Sistema</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 1. Rotinas Operacionais */}
                <AreaCard 
                    title="Rotinas Operacionais"
                    icon={ClipboardList}
                    color="bg-red-50 text-[#B13A2B]"
                    modules={[
                        { label: 'Checklist', href: '/dashboard/admin/checklists', status: 'active' },
                        { label: 'Auditoria Operacional', href: '/dashboard/admin/reports', status: 'active' },
                        { label: 'Contagem', href: '/dashboard/admin/checklists?tab=management', status: 'active' },
                        { label: 'Abertura & Fechamento', status: 'dev' },
                        { label: 'Recebimento & Conferência', status: 'soon' },
                    ]}
                />

                {/* 2. Estoque, CMV e Produção */}
                <AreaCard 
                    title="Estoque, CMV e Produção"
                    icon={Package}
                    color="bg-emerald-50 text-emerald-600"
                    modules={[
                        { label: 'CMV & Compras', href: '/dashboard/admin/cmv', status: 'active' },
                        { label: 'Registro de Perdas', href: '/dashboard/admin/cmv', status: 'active' },
                        { label: 'Estoque Real', status: 'dev' },
                        { label: 'Ficha Técnica', status: 'soon' },
                        { label: 'Controle de Validade', status: 'soon' },
                    ]}
                />

                {/* 3. Atendimento e WhatsApp */}
                <AreaCard 
                    title="Atendimento & WhatsApp"
                    icon={MessageSquare}
                    color="bg-sky-50 text-sky-600"
                    modules={[
                        { label: 'WhatsApp Operacional', status: 'dev' },
                        { label: 'IA de Atendimento', status: 'soon' },
                        { label: 'Fluxos Automáticos', status: 'soon' },
                    ]}
                />

                {/* 4. Vendas e Delivery */}
                <AreaCard 
                    title="Vendas & Delivery"
                    icon={ShoppingCart}
                    color="bg-amber-50 text-amber-600"
                    modules={[
                        { label: 'Módulo de Vendas', href: '/dashboard/admin/vendas', status: 'active' },
                        { label: 'Integração iFood', status: 'dev' },
                        { label: 'Takeat / PDV Sync', status: 'soon' },
                        { label: 'Análise de Delivery', status: 'soon' },
                    ]}
                />

                {/* 5. Pessoas e Execução */}
                <AreaCard 
                    title="Pessoas & Execução"
                    icon={Users}
                    color="bg-indigo-50 text-indigo-600"
                    modules={[
                        { label: 'Ranking de Performance', href: '/dashboard/admin/checklists?tab=ranking', status: 'active' },
                        { label: 'Gestão da Equipe', href: '/dashboard/admin/users', status: 'active' },
                        { label: 'Onboarding', status: 'dev' },
                        { label: 'Trilhas & Reconhecimento', status: 'soon' },
                    ]}
                />

                {/* 6. Processos e Regras */}
                <AreaCard 
                    title="Processos & Regras"
                    icon={Sliders}
                    color="bg-slate-50 text-slate-600"
                    modules={[
                        { label: 'Templates de Checklist', href: '/dashboard/admin/checklists?tab=management', status: 'active' },
                        { label: 'Regras de Atribuição', href: '/dashboard/admin/checklists', status: 'active' },
                        { label: 'Configuração Operacional', status: 'dev' },
                    ]}
                />

                {/* 7. Indicadores e Relatórios */}
                <AreaCard 
                    title="Indicadores & Relatórios"
                    icon={BarChart3}
                    color="bg-gray-50 text-gray-600"
                    modules={[
                        { label: 'Relatórios Operacionais', href: '/dashboard/admin/reports', status: 'active' },
                        { label: 'Painéis de Performance', status: 'dev' },
                        { label: 'Histórico de Setores', status: 'soon' },
                    ]}
                />
            </div>

            {/* Banner de Visão de Futuro */}
            <div className="bg-gray-900 rounded-[2rem] p-8 text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-white/60 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5">
                    <Zap className="w-3 h-3 text-amber-400" />
                    NaBrasa OS v2.4
                </div>
                <h4 className="text-lg font-black text-white">Pronto para escalar.</h4>
                <p className="text-xs text-white/40 max-w-xs mx-auto">Novos módulos e integrações estão sendo preparados para tornar sua operação 100% digital e data-driven.</p>
            </div>
        </section>
    )
}
