import AdminChecklistManager from './AdminChecklistManager'

export const metadata = {
    title: 'Auditoria & Performance | NaBrasa Controle',
    description: 'Gestão de checklists operacionais e monitoramento de performance da unidade.',
}

export default function AdminChecklistsPage() {
    return (
        <main className="container mx-auto py-6">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900">Auditoria & Performance</h1>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Torre de Controle Operacional</p>
            </div>
            
            <AdminChecklistManager />
        </main>
    )
}
