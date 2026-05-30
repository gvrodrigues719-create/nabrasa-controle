import { CountGroupStatus } from "./types";

/**
 * Mapeia os dados do Supabase para o formato de status de grupo esperado pelo frontend
 */
export function mapRoutineGroupsToStatus(
    routineGroups: any[], 
    sessions: any[], 
    itemCountMap: Record<string, number>
): CountGroupStatus[] {
    return routineGroups?.map(rg => {
        const group: any = rg.groups;
        const sessionForGroup = sessions?.find(s => s.group_id === group.id);
        
        return {
            id: group.id,
            name: group.name,
            item_count: itemCountMap[group.id] || 0,
            session_id: sessionForGroup?.id || null,
            status: sessionForGroup?.status || 'available',
            user_name: (sessionForGroup?.users as any)?.name || null,
            updated_at: sessionForGroup?.updated_at || null
        };
    }) || [];
}
