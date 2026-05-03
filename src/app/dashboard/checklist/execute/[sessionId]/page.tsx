import { getChecklistSessionDetailsAction } from '@/app/actions/checklistAction'
import { getAuthenticatedUserContext } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { getSafeReturnTo } from '@/lib/navigation'
import ChecklistExecution from '@/modules/checklist/components/ChecklistExecution'

export default async function ChecklistSessionRunPage({ 
    params, 
    searchParams 
}: { 
    params: Promise<{ sessionId: string }>,
    searchParams: Promise<{ returnTo?: string }>
}) {
    const { sessionId } = await params
    const { returnTo: rawReturnTo } = await searchParams
    const backUrl = getSafeReturnTo(rawReturnTo, '/dashboard/checklist')

    // 1. Validar Usuário/Operador Centralizado
    const context = await getAuthenticatedUserContext()
    
    if (!context) {
        redirect('/login')
    }

    // 2. Buscar Detalhes da Sessão
    const res = await getChecklistSessionDetailsAction(sessionId)
    
    if (!res.success || !res.data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center">
                <h1 className="text-xl font-black text-[#1b1c1a]">SESSÃO NÃO ENCONTRADA</h1>
                <p className="text-sm text-[#8c716c] mt-2 mb-6">O link pode estar expirado ou a tarefa foi removida.</p>
                <Link href={backUrl} className="px-6 py-3 bg-[#1b1c1a] text-white rounded-2xl font-bold">Voltar</Link>
            </div>
        )
    }

    const { session, items } = res.data

    // 3. SEGURANÇA: Validar Ownership
    // Apenas o dono da tarefa ou gestores podem abrir
    const isOwner = session.user_id === context.userId
    const isManager = context.role === 'admin' || context.role === 'manager'

    if (!isOwner && !isManager) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-red-50">
                <ShieldAlert className="w-16 h-16 text-red-600 mb-4" />
                <h1 className="text-xl font-black text-red-700 uppercase">ACESSO NEGADO</h1>
                <p className="text-sm text-red-600/80 mt-2 max-w-xs">
                    Você não tem permissão para executar este checklist atribuído a outro colaborador.
                </p>
                <Link href={backUrl} className="mt-8 px-8 py-3 bg-red-700 text-white rounded-2xl font-bold">Voltar</Link>
            </div>
        )
    }

    const template = {
        ...session.checklist_templates,
        id: session.template_id,
        items: items
    }

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* OPERATIONAL HEADER */}
            <header className="bg-white border-b border-[#e9e8e5] sticky top-0 z-40 px-4 py-4">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link 
                            href={backUrl} 
                            className="p-2.5 bg-white rounded-xl shadow-sm border border-[#e9e8e5] text-[#58413e] hover:bg-gray-50 active:scale-95 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-sm font-black text-[#1b1c1a] uppercase tracking-wider leading-none">
                                {template.name}
                            </h1>
                            <p className="text-[10px] font-bold text-[#b13a2b] uppercase tracking-widest mt-1">
                                {isOwner ? 'Sua Atribuição' : `Auditoria: ${session.users?.name || 'Operador'}`}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* ENGINE DE EXECUÇÃO */}
            <ChecklistExecution 
                template={template} 
                sessionId={sessionId} 
                userId={context.userId} 
            />
        </div>
    )
}
