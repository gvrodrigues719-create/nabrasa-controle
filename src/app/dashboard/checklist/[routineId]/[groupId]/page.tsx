import { initChecklistSessionAction } from '@/app/actions/checklistAction'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSafeReturnTo, appendReturnTo } from '@/lib/navigation'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'

export default async function ChecklistLauncherPage({ 
    params, 
    searchParams 
}: { 
    params: Promise<{ routineId: string, groupId: string }>,
    searchParams: Promise<{ returnTo?: string }>
}) {
    const { routineId, groupId } = await params
    const { returnTo: rawReturnTo } = await searchParams
    const backUrl = getSafeReturnTo(rawReturnTo, '/dashboard')
    const userId = await getAuthenticatedUserId()

    if (!userId) {
        redirect('/login')
    }

    // Tentar iniciar/recuperar a sessão
    const res = await initChecklistSessionAction(routineId, groupId, userId)

    if (res.blocked) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-[#F8F7F4]">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-[#e9e8e5] flex items-center justify-center text-amber-500 mb-6">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h1 className="text-xl font-black text-[#1b1c1a] uppercase">Bloqueado</h1>
                <p className="text-sm text-[#8c716c] mt-2 mb-8 max-w-xs">{res.blocked}</p>
                <Link 
                    href={backUrl} 
                    className="flex items-center gap-2 px-8 py-4 bg-[#1b1c1a] text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                </Link>
            </div>
        )
    }

    if (!res.success || !res.sessionId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-[#F8F7F4]">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-[#e9e8e5] flex items-center justify-center text-red-500 mb-6">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h1 className="text-xl font-black text-[#1b1c1a] uppercase">Erro ao Iniciar</h1>
                <p className="text-sm text-[#8c716c] mt-2 mb-8 max-w-xs">{res.error || 'Não foi possível carregar o checklist.'}</p>
                <Link href={backUrl} className="px-8 py-4 bg-[#b13a2b] text-white rounded-2xl font-bold">Voltar</Link>
            </div>
        )
    }

    // Redireciona para a tela de execução real
    // Redireciona para a tela de execução real preservando o contexto
    redirect(appendReturnTo(`/dashboard/checklist/execute/${res.sessionId}`, rawReturnTo))
}
