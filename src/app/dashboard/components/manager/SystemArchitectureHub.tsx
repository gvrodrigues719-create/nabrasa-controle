"use client"

import Link from 'next/link'
import { 
    ClipboardList, 
    Boxes, 
    ShoppingBag, 
    Users, 
    ListChecks, 
    Wrench
} from 'lucide-react'
import { useDashboardIdentity } from '../../hooks/useDashboardIdentity'

interface ModuleItem {
    label: string;
    href?: string;
    status: 'ativo' | 'ativo parcial' | 'em desenvolvimento' | 'demo' | 'em breve' | 'em breve parcial';
}

export default function SystemArchitectureHub() {
    const { userRole } = useDashboardIdentity()

    // 1. Estoque, CMV e Produção
    const estoqueModules: ModuleItem[] = [
        { label: 'CMV & Compras', href: '/dashboard/admin/cmv', status: 'ativo' },
        { label: 'Perdas', href: '/dashboard/admin/cmv?tab=losses', status: 'ativo' },
    ]
    if (userRole === 'admin') {
        estoqueModules.push({ label: 'Produção', href: '/dashboard/kitchen/planning', status: 'ativo' })
    }

    // 2. Vendas & Atendimento
    const vendasModules: ModuleItem[] = [
        { label: 'Vendas', href: '/dashboard/admin/vendas', status: 'ativo' },
        { label: 'Relatórios', href: '/dashboard/admin/reports', status: 'ativo' }
    ]

    // 3. Equipe e Rotina
    const equipeModules: ModuleItem[] = [
        { label: 'Equipe', href: '/dashboard/admin/users', status: 'ativo' },
        { label: 'Mural', href: '/dashboard/admin/communication', status: 'ativo' },
        { label: 'Ranking', href: '/dashboard/admin/checklists?tab=ranking', status: 'ativo' }
    ]

    // 4. Rotinas Operacionais
    const rotinasModules: ModuleItem[] = [
        { label: 'Checklists', href: '/dashboard/admin/checklists', status: 'ativo' },
        { label: 'Contagens', href: '/dashboard/admin/routines', status: 'ativo' },
        { label: 'Auditoria', href: '/dashboard/admin/history/sessions', status: 'ativo' }
    ]

    // 5. Processos e Regras
    const processosModules: ModuleItem[] = [
        { label: 'Templates', href: '/dashboard/admin/checklists?tab=management', status: 'ativo' },
        { label: 'Configuração', status: 'em breve' }
    ]

    // 6. Equipamentos & Manutenção
    const manutencaoModules: ModuleItem[] = [
        { label: 'Ativos', status: 'em breve' }
    ]

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gray-900 rounded-full" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Frentes de Gestão</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <AreaCard 
                    title="ESTOQUE, CMV E PRODUÇÃO"
                    icon={Boxes}
                    accentColor="text-emerald-500"
                    mainModules={estoqueModules}
                    extraModule={{ label: 'Ficha Técnica', status: 'em breve' }}
                />

                <AreaCard 
                    title="Vendas & Atendimento"
                    icon={ShoppingBag}
                    accentColor="text-indigo-500"
                    mainModules={vendasModules}
                    extraModule={{ label: 'Delivery', status: 'em breve' }}
                />

                <AreaCard 
                    title="EQUIPE E ROTINA"
                    icon={Users}
                    accentColor="text-amber-500"
                    mainModules={equipeModules}
                    extraModule={{ label: 'Onboarding', status: 'em desenvolvimento' }}
                />

                <AreaCard 
                    title="ROTINAS OPERACIONAIS"
                    icon={ClipboardList}
                    accentColor="text-[#B13A2B]"
                    mainModules={rotinasModules}
                />

                <AreaCard 
                    title="Processos e Regras"
                    icon={ListChecks}
                    accentColor="text-gray-600"
                    mainModules={processosModules}
                />

                <AreaCard 
                    title="Equipamentos & Manutenção"
                    icon={Wrench}
                    accentColor="text-slate-500"
                    mainModules={manutencaoModules}
                    extraModule={{ label: 'Manutenção', status: 'em breve' }}
                />
            </div>
        </section>
    )
}

function AreaCard({ title, icon: Icon, accentColor, mainModules, extraModule, className = "" }: { 
    title: string, 
    icon: any, 
    accentColor: string, 
    mainModules: ModuleItem[], 
    extraModule?: ModuleItem,
    className?: string 
}) {
    return (
        <div className={`bg-white border border-gray-100 p-4 rounded-[1.5rem] shadow-sm flex flex-col gap-3 group transition-all hover:border-gray-200 ${className}`}>
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center ${accentColor} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{title}</h4>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {mainModules.map((mod, idx) => (
                    <ModuleLink key={idx} {...mod} />
                ))}
                {extraModule && (
                    <ModuleLink {...extraModule} isExtra />
                )}
            </div>
        </div>
    )
}

function ModuleLink({ label, href, status, isExtra }: ModuleItem & { isExtra?: boolean }) {
    const isSoon = status === 'em breve' || status === 'em desenvolvimento' || status === 'em breve parcial' || status === 'ativo parcial'
    
    const content = (
        <div className={`
            px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-between
            ${isSoon 
                ? 'bg-gray-50/30 text-gray-400 border border-transparent' 
                : 'bg-gray-50 text-gray-700 border border-gray-100 hover:bg-gray-900 hover:text-white hover:border-gray-900'
            }
            ${isExtra ? 'opacity-50' : ''}
        `}>
            <span>{label}</span>
            {isSoon && (
                <span className="text-[7px] font-black uppercase tracking-tighter opacity-40">...</span>
            )}
        </div>
    )

    if (isSoon || !href) return content

    return (
        <Link href={href}>
            {content}
        </Link>
    )
}
