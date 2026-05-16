"use client"

import Link from 'next/link'
import { 
    ClipboardList, 
    Boxes, 
    ShoppingBag, 
    Users, 
    ListChecks, 
    BarChart3,
    ExternalLink,
    Wrench
} from 'lucide-react'
import { useDashboardIdentity } from '../../hooks/useDashboardIdentity'

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
    const { userRole } = useDashboardIdentity()

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gray-900 rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Frentes de Gestão</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Estoque, CMV e Produção (PRIORIDADE 1) */}
                <AreaCard 
                    title="ESTOQUE, CMV E PRODUÇÃO"
                    icon={Boxes}
                    accentColor="text-emerald-500"
                    mainModules={([
                        { label: 'CMV & Compras', href: '/dashboard/admin/cmv', status: 'ativo parcial' },
                        { label: 'Perdas', href: '/dashboard/admin/cmv?tab=losses', status: 'ativo parcial' },
                        ...(userRole === 'admin' ? [{ label: 'Planejamento Cozinha', href: '/dashboard/kitchen/planning', status: 'ativo' }] : [])
                    ] as ModuleItem[]).filter(Boolean)}
                    extraModule={{ label: 'Ficha Técnica', status: 'ativo parcial' }}
                />

                {/* 2. Vendas, Delivery e Atendimento (PRIORIDADE 2) */}
                <AreaCard 
                    title="Vendas & Atendimento"
                    icon={ShoppingBag}
                    accentColor="text-indigo-500"
                    mainModules={[
                        { label: 'Vendas', href: '/dashboard/admin/vendas', status: 'ativo parcial' },
                        { label: 'Delivery', status: 'em breve' }
                    ]}
                    extraModule={{ label: 'Atendimento', status: 'em desenvolvimento' }}
                />

                {/* 3. Equipe e Rotina (PRIORIDADE 3) */}
                <AreaCard 
                    title="EQUIPE E ROTINA"
                    icon={Users}
                    accentColor="text-amber-500"
                    mainModules={[
                        { label: 'Ranking', href: '/dashboard/admin/checklists?tab=ranking', status: 'ativo' },
                        { label: 'Equipe', href: '/dashboard/admin/users', status: 'ativo' },
                        { label: 'Mural', href: '/dashboard/admin/communication', status: 'ativo' }
                    ]}
                    extraModule={{ label: 'Onboarding', status: 'em desenvolvimento' }}
                />

                {/* 4. Rotinas Operacionais */}
                <AreaCard 
                    title="ROTINAS OPERACIONAIS"
                    icon={ClipboardList}
                    accentColor="text-[#B13A2B]"
                    mainModules={[
                        { label: 'Checklists', href: '/dashboard/admin/checklists', status: 'ativo' },
                        { label: 'Contagens', href: '/dashboard/admin/routines', status: 'ativo parcial' },
                        { label: 'Auditoria', href: '/dashboard/admin/history/sessions', status: 'ativo' }
                    ]}
                />

                {/* 5. Processos e Regras */}
                <AreaCard 
                    title="Processos e Regras"
                    icon={ListChecks}
                    accentColor="text-gray-600"
                    mainModules={[
                        { label: 'Templates', href: '/dashboard/admin/checklists?tab=management', status: 'ativo' },
                        { label: 'Regras', href: '/dashboard/admin/checklists', status: 'ativo' }
                    ]}
                />

                {/* 6. Equipamentos & Manutenção */}
                <AreaCard 
                    title="Equipamentos & Manutenção"
                    icon={Wrench}
                    accentColor="text-slate-500"
                    mainModules={[
                        { label: 'Ativos', status: 'em desenvolvimento' }
                    ]}
                    extraModule={{ label: 'Manutenção', status: 'em breve' }}
                />

                {/* 7. Indicadores e Relatórios */}
                <AreaCard 
                    title="INDICADORES E RELATÓRIOS"
                    icon={BarChart3}
                    accentColor="text-blue-500"
                    className="lg:col-span-3"
                    mainModules={[
                        { label: 'Relatórios', href: '/dashboard/admin/reports', status: 'ativo parcial' }
                    ]}
                />
            </div>
        </section>
    )
}
