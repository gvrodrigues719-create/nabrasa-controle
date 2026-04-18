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
    status: 'ativo' | 'ativo parcial' | 'em desenvolvimento' | 'demo' | 'em breve';
}

interface AreaProps {
    title: string;
    icon: any;
    accentColor: string;
    mainModules: ModuleItem[];
    extraModule?: ModuleItem;
    className?: string;
}

function AreaCard({ title, icon: Icon, accentColor, mainModules, extraModule, className = "" }: AreaProps) {
    return (
        <div className={`bg-white rounded-[2.5rem] p-7 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full group ${className}`}>
            <div className="flex items-center justify-between mb-6">
                <div className={`w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-gray-100`}>
                    <Icon className={`w-5 h-5 ${accentColor} transition-colors`} />
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            </div>
            
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-5">{title}</h3>
            
            <div className="space-y-4 flex-1">
                <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {mainModules.map((m, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                            {(m.status === 'ativo' || m.status === 'ativo parcial') && m.href ? (
                                <Link 
                                    href={m.href}
                                    className="text-xs font-black text-gray-900 hover:text-[#B13A2B] flex items-center gap-1 transition-colors border-b border-gray-100 pb-0.5"
                                >
                                    {m.label}
                                </Link>
                            ) : (
                                <span className="text-xs font-black text-gray-300 uppercase tracking-tighter decoration-dotted underline decoration-gray-200">{m.label}</span>
                            )}
                            {idx < mainModules.length - 1 && <span className="text-gray-200 font-bold">•</span>}
                        </div>
                    ))}
                </div>

                {extraModule && (
                    <div className="pt-2 border-t border-gray-50">
                        <span className={`text-[10px] font-bold ${extraModule.status === 'em desenvolvimento' ? 'text-gray-400 italic' : 'text-gray-300'}`}>
                            {extraModule.label}
                            <span className="ml-2 text-[7px] px-1.5 py-0.5 rounded-md uppercase not-italic font-black bg-gray-50 text-gray-400 border border-gray-100">
                                {extraModule.status === 'em desenvolvimento' ? 'Em desenvolvimento' : 'Em breve'}
                            </span>
                        </span>
                    </div>
                )}
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
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none">Management Framework</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 1. Rotinas Operacionais */}
                <AreaCard 
                    title="Rotinas Operacionais"
                    icon={ClipboardList}
                    accentColor="text-[#B13A2B]"
                    mainModules={[
                        { label: 'Checklist', href: '/dashboard/admin/checklists', status: 'ativo' },
                        { label: 'Contagem', href: '/dashboard/admin/routines', status: 'ativo parcial' }
                    ]}
                    extraModule={{ label: 'Abertura & Fechamento', status: 'em desenvolvimento' }}
                />

                {/* 2. Estoque, CMV e Produção */}
                <AreaCard 
                    title="Estoque, CMV e Produção"
                    icon={Package}
                    accentColor="text-emerald-500"
                    mainModules={[
                        { label: 'CMV & Compras', href: '/dashboard/admin/cmv', status: 'ativo parcial' },
                        { label: 'Perdas', href: '/dashboard/admin/cmv?tab=losses', status: 'ativo parcial' }
                    ]}
                    extraModule={{ label: 'Ficha Técnica', status: 'em desenvolvimento' }}
                />

                {/* 3. Vendas, Delivery e Atendimento */}
                <AreaCard 
                    title="Vendas, Delivery e Atendimento"
                    icon={ShoppingCart}
                    accentColor="text-indigo-500"
                    mainModules={[
                        { label: 'Vendas', href: '/dashboard/admin/vendas', status: 'ativo parcial' },
                        { label: 'Delivery', status: 'em breve' }
                    ]}
                    extraModule={{ label: 'Atendimento', status: 'em desenvolvimento' }}
                />

                {/* 4. Equipe & Performance */}
                <AreaCard 
                    title="Equipe & Performance"
                    icon={Users}
                    accentColor="text-amber-500"
                    mainModules={[
                        { label: 'Ranking', href: '/dashboard/admin/checklists?tab=ranking', status: 'ativo' },
                        { label: 'Equipe', href: '/dashboard/admin/users', status: 'ativo' }
                    ]}
                    extraModule={{ label: 'Onboarding', status: 'em desenvolvimento' }}
                />

                {/* 5. Equipamentos & Manutenção */}
                <AreaCard 
                    title="Equipamentos & Manutenção"
                    icon={Container}
                    accentColor="text-slate-500"
                    mainModules={[
                        { label: 'Ativos', status: 'em desenvolvimento' }
                    ]}
                    extraModule={{ label: 'Manutenção', status: 'em breve' }}
                />

                {/* 6. Processos e Regras */}
                <AreaCard 
                    title="Processos e Regras"
                    icon={Sliders}
                    accentColor="text-gray-600"
                    mainModules={[
                        { label: 'Templates', href: '/dashboard/admin/checklists?tab=management', status: 'ativo' },
                        { label: 'Regras', href: '/dashboard/admin/checklists', status: 'ativo' }
                    ]}
                    extraModule={{ label: 'Configuração', status: 'em desenvolvimento' }}
                />

                {/* 7. Indicadores & Análises */}
                <AreaCard 
                    title="Indicadores & Análises"
                    icon={BarChart3}
                    accentColor="text-blue-500"
                    className="lg:col-span-3 lg:h-auto"
                    mainModules={[
                        { label: 'Relatórios', href: '/dashboard/admin/reports', status: 'ativo parcial' }
                    ]}
                    extraModule={{ label: 'Painéis', status: 'em desenvolvimento' }}
                />
            </div>
        </section>
    )
}
