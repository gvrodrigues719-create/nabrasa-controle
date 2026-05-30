
import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'NaBrasa Controle | MOC Demo',
    description: 'Versão de demonstração do Módulo Operacional do Colaborador',
};

export default function MocDemoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#F8F7F4] text-[#1b1c1a] font-sans selection:bg-[#B13A2B]/10 overflow-x-hidden">
            <main className="max-w-md mx-auto relative pb-20 md:pb-10 min-h-screen border-x border-gray-100 shadow-sm bg-white">
                {children}
            </main>
        </div>
    );
}
