
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DemoUser, DemoArea, DemoNotice, DemoEvent, DEMO_USERS, DEMO_AREAS, INITIAL_DEMO_NOTICES, INITIAL_DEMO_EVENTS } from './mock-data';

interface MocDemoState {
    activeUser: DemoUser | null;
    users: DemoUser[];
    areas: DemoArea[];
    notices: DemoNotice[];
    events: DemoEvent[];
    isLoading: boolean;
    
    // Actions
    setActiveUser: (userId: string) => void;
    completeTask: (areaId: string, points: number) => void;
    addEvent: (type: DemoEvent['type'], message: string) => void;
    updateAreaStatus: (areaId: string, status: DemoArea['status'], progress: number) => void;
}

export const useMocDemoStore = create<MocDemoState>()(
    persist(
        (set) => ({
            activeUser: null,
            users: DEMO_USERS,
            areas: DEMO_AREAS,
            notices: INITIAL_DEMO_NOTICES,
            events: INITIAL_DEMO_EVENTS,
            isLoading: false,

            setActiveUser: (userId) => {
                const user = DEMO_USERS.find(u => u.id === userId) || null;
                set({ activeUser: user });
            },

            completeTask: (areaId, points) => {
                set((state) => {
                    if (!state.activeUser) return state;

                    // Update user points
                    const updatedUser = {
                        ...state.activeUser,
                        points: state.activeUser.points + points,
                        weekly_points: state.activeUser.weekly_points + points,
                    };

                    // Update user in list
                    const updatedUsers = state.users.map(u => 
                        u.id === updatedUser.id ? updatedUser : u
                    );

                    // Add completion event
                    const newEvent: DemoEvent = {
                        id: `e-${Date.now()}`,
                        user_id: state.activeUser.id,
                        message: `${state.activeUser.name} concluiu uma tarefa operacional`,
                        time: 'Agora',
                        type: 'completion'
                    };

                    return {
                        activeUser: updatedUser,
                        users: updatedUsers,
                        events: [newEvent, ...state.events]
                    };
                });
            },

            addEvent: (type, message) => {
                set((state) => ({
                    events: [{
                        id: `e-${Date.now()}`,
                        user_id: state.activeUser?.id || 'system',
                        message,
                        time: 'Agora',
                        type
                    }, ...state.events]
                }));
            },

            updateAreaStatus: (areaId, status, progress) => {
                set((state) => ({
                    areas: state.areas.map(a => 
                        a.id === areaId ? { ...a, status, progress, last_update: 'Agora' } : a
                    )
                }));
            }
        }),
        {
            name: 'moc-demo-storage',
        }
    )
);
