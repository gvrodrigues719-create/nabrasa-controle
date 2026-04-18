"use client"

import Link from 'next/link'
import { 
    ClipboardList, 
    Package, 
    ShoppingCart, 
    Users, 
    Sliders, 
    BarChart3,
    ExternalLink,
    Container
} from 'lucide-react'

interface ModuleItem {
    label: string;
    href?: string;
    status: 'active' | 'dev' | 'soon';
}

interface AreaProps {
    title: string;
    icon: any;
    accentColor: string;
    modules: ModuleItem[];
    className?: string;
}

function AreaCard({ title, icon: Icon, accentColor, modules, className = "" }: AreaProps) {
    return (
        <div className={`bg-white rounded-[2.5rem] p-7 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full group ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <div className={`w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all`}>
                    <Icon className={`w-5 h-5 ${accentColor} transition-colors`} />
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            </div>
            
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-5">{title}</h3>
            
            <div className="space-y-3.5 flex-1">
                {modules.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                        {m.status === 'active' && m.href ? (
                            <Link 
                                href={m.href}
                                className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1.5 transition-colors group/link"
                            >
                                {m.label}
                                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/link:opacity-40 transition-opacity" />
                            </Link>
                        ) : (
                            <span className={`text-[11px] font-bold ${m.status === 'dev' ? 'text-gray-400/80 italic' : 'text-gray-300'}`}>
                                {m.label}
                                {m.status === 'dev' && (
                                    <span className={`ml-2 text-[8px] px-1.5 py-0.5 rounded-md uppercase not-italic font-black bg-gray-100 text-gray-400`}>
                                        Dev
                                    </span>
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
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gray-900 rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Áreas do Sistema</h3>
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none">Management Hub</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 1. Rotinas Operacionais */}
                <AreaCard 
                    title="Rotinas Operacionais"
                    icon={ClipboardList}
                    accentColor="text-red-500"
                    modules={[
                        { label: 'Checklist', href: '/dashboard/admin/checklists', status: 'active' },
                        { label: 'Contagem', href: '/dashboard/admin/checklists?tab=management', status: 'active' },
                        { label: 'Auditoria Operacional', href: '/dashboard/admin/reports', status: 'active' },
                        { label: 'Abertura & Fechamento', status: 'dev' }
                    ]}
                />

                {/* 2. Estoque, CMV e Produção */}
                <AreaCard 
                    title="Estoque, CMV e Produção"
                    icon={Package}
                    accentColor="text-emerald-500"
                    modules={[
                        { label: 'CMV & Compras', href: '/dashboard/admin/cmv', status: 'active' },
                        { label: 'Registro de Perdas', href: '/dashboard/admin/cmv', status: 'active' },
                        { label: 'Ficha Técnica', status: 'dev' }
                    ]}
                />

                {/* 3. Vendas, Delivery e Atendimento */}
                <AreaCard 
                    title="Vendas, Delivery e Atendimento"
                    icon={ShoppingCart}
                    accentColor="text-indigo-500"
                    modules={[
                        { label: 'Módulo de Vendas', href: '/dashboard/admin/vendas', status: 'active' },
                        { label: 'Delivery & iFood', status: 'soon' },
                        { label: 'IA Atendimento', status: 'dev' }
                    ]}
                />

                {/* 4. Equipe & Performance */}
                <AreaCard 
                    title="Equipe & Performance"
                    icon={Users}
                    accentColor="text-amber-500"
                    modules={[
                        { label: 'Ranking Semanal', href: '/dashboard/admin/checklists?tab=ranking', status: 'active' },
                        { label: 'Gestão da Equipe', href: '/dashboard/admin/users', status: 'active' },
                        { label: 'Onboarding', status: 'dev' }
                    ]}
                />

                {/* 5. Equipamentos & Manutenção */}
                <AreaCard 
                    title="Equipamentos & Manutenção"
                    icon={Container}
                    accentColor="text-slate-500"
                    modules={[
                        { label: 'Cadastro de Ativos', status: 'dev' },
                        { label: 'Plano de Manutenção', status: 'soon' },
                        { label: 'Chamados Técnicos', status: 'soon' }
                    ]}
                />

                {/* 6. Processos e Regras */}
                <AreaCard 
                    title="Processos e Regras"
                    icon={Sliders}
                    accentColor="text-gray-600"
                    modules={[
                        { label: 'Templates de Checklist', href: '/dashboard/admin/checklists?tab=management', status: 'active' },
                        { label: 'Regras de Atribuição', href: '/dashboard/admin/checklists', status: 'active' },
                        { label: 'Configuração', status: 'dev' }
                    ]}
                />

                {/* 7. Indicadores & Análises - Composição de Grade */}
                <AreaCard 
                    title="Indicadores & Análises"
                    icon={BarChart3}
                    accentColor="text-blue-500"
                    className="lg:col-span-3" // Resolvendo o isolamento visual
                    modules={[
                        { label: 'Relatórios Operacionais', href: '/dashboard/admin/reports', status: 'active' },
                        { label: 'Painéis de Performance', status: 'dev' }
                    ]}
                />
            </div>
        </section>
    )
}
