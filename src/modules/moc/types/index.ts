/**
 * MOC - Types
 * Definições mínimas para o Módulo Operacional do Colaborador.
 */

export type MOCRoutineType = 'count' | 'checklist';

export interface MOCBaseRoutine {
  id: string;
  type: MOCRoutineType;
  status: 'idle' | 'running' | 'paused' | 'completed';
}

/**
 * Interface estendida para compatibilidade com o sistema atual
 */
export interface Routine {
    id: string;
    name: string;
    frequency: string;
    active: boolean;
    routine_type: MOCRoutineType;
}
