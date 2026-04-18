'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Wrapper seguro: Apenas realiza ação na Master Key se o PIN submetido no Modal bater com o do Manager que está solicitando.
export async function approveAuditAction(reportId: string, managerId: string, pin: string) {
    const { data: isValid } = await supabase.rpc('verify_user_pin', { p_user_id: managerId, p_pin: pin })
    if (!isValid) throw new Error("PIN Incorreto ou não cadastrado.")

    // Efetiva no banco (usa master key para não ser impedido, mas o log registrará o managerId original via RPC)
    const { error } = await supabase.rpc('approve_audit_report', { p_report_id: reportId, p_user_id: managerId })
    if (error) throw new Error(error.message)

    return { success: true }
}

export async function rejectAuditAction(reportId: string, managerId: string, pin: string, executionId?: string) {
    const { data: isValid } = await supabase.rpc('verify_user_pin', { p_user_id: managerId, p_pin: pin })
    if (!isValid) throw new Error("PIN Incorreto ou não cadastrado.")

    const { error: repErr } = await supabase.from('audit_reports').update({
        status_approval: 'rejected',
        approved_by: managerId,
        approved_at: new Date().toISOString()
    }).eq('id', reportId)

    if (repErr) throw new Error(repErr.message)

    await supabase.from('audit_logs').insert([{
        action: 'rejected',
        user_id: managerId,
        entity_type: 'audit_report',
        entity_id: reportId,
        execution_id: executionId || null
    }])

    return { success: true }
}

export async function verifyCriticalPin(userId: string, pin: string) {
    const { data: isValid } = await supabase.rpc('verify_user_pin', { p_user_id: userId, p_pin: pin })
    if (!isValid) throw new Error("PIN Incorreto.")
    return true
}

export async function adminUpdateUserAction(
    managerId: string,
    managerPin: string,
    targetUser: { 
        id?: string, 
        name: string, 
        email: string, 
        role: string, 
        active: boolean, 
        newPin?: string,
        birth_day?: number,
        birth_month?: number
    }
) {
    const { data: isValid } = await supabase.rpc('verify_user_pin', { p_user_id: managerId, p_pin: managerPin })
    if (!isValid) throw new Error("Seu PIN gerencial está Incorreto.")

    let finalUserId = targetUser.id
    if (!finalUserId) {
        // Criar novo user ficticio na tabela users, bypassing auth
        // O supabase cria auth users com "admin.createUser" (se tivessemos).
        // Para o nosso caso MVP, criamos um dummy UUID na tabela de perfil diretamente pois o Operator Kiosk nao faz login de auth.
        // Wait, a tabela public.users exige foreign key para auth.users!
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email: targetUser.email,
            password: targetUser.newPin ? targetUser.newPin + '-NaBrs!' : '1234-NaBrs!',
            email_confirm: true,
            user_metadata: { name: targetUser.name }
        })
        if (createErr) throw new Error("Erro criando autenticação: " + createErr.message)
        finalUserId = newUser.user.id

        // upsert em vez de update:
        // - se o trigger já rodou: atualiza a linha existente com role/name corretos
        // - se o trigger ainda não rodou: insere a linha diretamente (sem depender de timing)
        const { error: upsErr } = await supabase.from('users').upsert({
            id: finalUserId,
            email: targetUser.email,
            name: targetUser.name,
            role: targetUser.role,
            active: targetUser.active,
            birth_day: targetUser.birth_day || null,
            birth_month: targetUser.birth_month || null
        }, { onConflict: 'id' })
        if (upsErr) throw new Error('Erro ao configurar perfil: ' + upsErr.message)
    } else {
        const { error: updErr } = await supabase.from('users').update({
            name: targetUser.name,
            role: targetUser.role,
            active: targetUser.active,
            birth_day: targetUser.birth_day || null,
            birth_month: targetUser.birth_month || null
        }).eq('id', finalUserId)

        if (updErr) throw new Error(updErr.message)
    }

    // Set PIN
    if (targetUser.newPin && targetUser.newPin.length === 4) {
        const { error } = await supabase.rpc('admin_set_user_pin', { p_user_id: finalUserId, p_pin: targetUser.newPin })
        if (error) throw new Error(error.message)
    }

    return { success: true }
}

export async function adminSetPinAction(targetUserId: string, newPin: string, managerId: string, managerPin: string) {
    // Primeiro valida se o gerente sabe o seu próprio PIN
    const { data: isValid } = await supabase.rpc('verify_user_pin', { p_user_id: managerId, p_pin: managerPin })
    if (!isValid) throw new Error("Seu PIN gerencial está Incorreto.")

    // Seta o novo PIN do funcionário
    const { error } = await supabase.rpc('admin_set_user_pin', { p_user_id: targetUserId, p_pin: newPin })
    if (error) throw new Error(error.message)

    return { success: true }
}
