import { use } from 'react'
import { getChecklistTemplateDetailsAction, startChecklistSessionAction } from '@/app/actions/checklistAction'
import { getActiveOperator } from '@/app/actions/pinAuth'
import { supabase } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ChecklistExecution from '@/modules/checklist/components/ChecklistExecution'

export default async function ChecklistRunPage({ params }: { params: Promise<{ templateId: string }> }) {
    const { templateId } = await params

    // 1. Validar Usuário/Operador
    const op = await getActiveOperator()
    let userId = op?.userId
    
    if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) userId = user.id
    }

    if (!userId) {
        redirect('/login')
    }

    // 2. Buscar Template e Itens
    const res = await getChecklistTemplateDetailsAction(templateId)
    if (!res.success || !res.data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center">
                <h1 className="text-xl font-black text-[#1b1c1a]">TEMPLATE NÃO ENCONTRADO</h1>
                <p className="text-sm text-[#8c716c] mt-2 mb-6">Este checklist pode ter sido desativado.</p>
                <Link href="/dashboard/checklist" className="px-6 py-3 bg-[#1b1c1a] text-white rounded-2xl font-bold">Voltar</Link>
            </div>
        )
    }

    const template = res.data

    // 3. Iniciar Sessão (Simples: toda vez que abre cria uma nova ou podemos checar em aberto)
    // Para simplificar esta V1, criamos uma nova sessão.
    const sessionRes = await startChecklistSessionAction(templateId, userId)
    if (!sessionRes.success || !sessionRes.sessionId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center">
                <h1 className="text-xl font-black text-red-600">ERRO AO INICIAR SESSÃO</h1>
                <p className="text-sm text-[#8c716c] mt-2">{sessionRes.error}</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8F7F4]">
            {/* OPERATIONAL HEADER */}
            <header className="bg-white border-b border-[#e9e8e5] sticky top-0 z-40 px-4 py-4">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/dashboard/checklist" 
                            className="p-2.5 bg-white rounded-xl shadow-sm border border-[#e9e8e5] text-[#58413e] hover:bg-gray-50 active:scale-95 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-sm font-black text-[#1b1c1a] uppercase tracking-wider leading-none">
                                {template.name}
                            </h1>
                            <p className="text-[10px] font-bold text-[#b13a2b] uppercase tracking-widest mt-1">
                                Execução em tempo real
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* ENGINE DE EXECUÇÃO */}
            <ChecklistExecution 
                template={template} 
                sessionId={sessionRes.sessionId} 
                userId={userId} 
            />
        </div>
    )
}
