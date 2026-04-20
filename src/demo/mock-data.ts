
export interface DemoUser {
    id: string;
    name: string;
    role: 'manager' | 'leader' | 'operator';
    job_title: string;
    role_label: string;
    level: number;
    points: number;
    weekly_points: number;
    streak: number;
    avatar_url?: string;
    primary_area?: string;
}

export interface DemoArea {
    id: string;
    name: string;
    status: 'completed' | 'pending' | 'delayed';
    responsible_id: string;
    progress: number;
    pending_tasks: number;
    last_update: string;
}

export interface DemoNotice {
    id: string;
    title: string;
    message: string;
    author_id: string;
    type: 'operacional' | 'item_em_falta' | 'promocao' | 'mudanca_de_turno' | 'comunicado_geral';
    priority: 'normal' | 'importante' | 'urgente';
    date: string;
    reactions: { emoji: string; count: number }[];
}

export interface DemoEvent {
    id: string;
    user_id: string;
    message: string;
    time: string;
    type: 'completion' | 'validation' | 'achievement' | 'notice';
}

export const DEMO_USERS: DemoUser[] = [
    { id: 'u1', name: 'Alan Ribeiro', role: 'manager', job_title: 'Gerente Operacional', role_label: 'Gerência', level: 0, points: 0, weekly_points: 0, streak: 0 },
    { id: 'u2', name: 'Cida Souza', role: 'leader', job_title: 'Líder de Cozinha', role_label: 'Liderança', level: 5, points: 12400, weekly_points: 1240, streak: 9, primary_area: 'Cozinha' },
    { id: 'u3', name: 'Antônio Lima', role: 'leader', job_title: 'Líder de Produção', role_label: 'Liderança', level: 4, points: 8900, weekly_points: 890, streak: 2, primary_area: 'Estoque seco' },
    { id: 'u4', name: 'João Pedro', role: 'operator', job_title: 'Auxiliar de Cozinha', role_label: 'Operacional', level: 4, points: 11200, weekly_points: 1120, streak: 6, primary_area: 'Cozinha' },
    { id: 'u5', name: 'Maria Clara', role: 'operator', job_title: 'Atendente', role_label: 'Operacional', level: 4, points: 11800, weekly_points: 1180, streak: 7, primary_area: 'Salão' },
    { id: 'u6', name: 'Lucas Martins', role: 'operator', job_title: 'Estoque / Apoio', role_label: 'Operacional', level: 3, points: 9800, weekly_points: 980, streak: 5, primary_area: 'Estoque seco' },
    { id: 'u7', name: 'Bianca Rocha', role: 'operator', job_title: 'Bar', role_label: 'Operacional', level: 4, points: 10900, weekly_points: 1090, streak: 5, primary_area: 'Bar' },
    { id: 'u8', name: 'Felipe Costa', role: 'operator', job_title: 'Salão', role_label: 'Operacional', level: 3, points: 9400, weekly_points: 940, streak: 3, primary_area: 'Salão' },
    { id: 'u9', name: 'Rafael Gomes', role: 'operator', job_title: 'Churrasqueira', role_label: 'Operacional', level: 4, points: 10500, weekly_points: 1050, streak: 4, primary_area: 'Cozinha' },
    { id: 'u10', name: 'Ana Beatriz', role: 'operator', job_title: 'Limpeza / Apoio', role_label: 'Operacional', level: 3, points: 9100, weekly_points: 910, streak: 4, primary_area: 'Apoio / Limpeza' },
];

export const DEMO_AREAS: DemoArea[] = [
    { id: 'area1', name: 'Cozinha', status: 'pending', responsible_id: 'u2', progress: 65, pending_tasks: 4, last_update: 'Há 15 min' },
    { id: 'area2', name: 'Bar', status: 'completed', responsible_id: 'u7', progress: 100, pending_tasks: 0, last_update: 'Há 5 min' },
    { id: 'area3', name: 'Salão', status: 'delayed', responsible_id: 'u5', progress: 30, pending_tasks: 8, last_update: 'Há 1h' },
    { id: 'area4', name: 'Estoque seco', status: 'pending', responsible_id: 'u6', progress: 80, pending_tasks: 2, last_update: 'Há 30 min' },
    { id: 'area5', name: 'Geladeiras / Freezers', status: 'completed', responsible_id: 'u3', progress: 100, pending_tasks: 0, last_update: 'Há 2h' },
    { id: 'area6', name: 'Apoio / Limpeza', status: 'pending', responsible_id: 'u10', progress: 50, pending_tasks: 5, last_update: 'Há 10 min' },
];

export const INITIAL_DEMO_NOTICES: DemoNotice[] = [
    {
        id: 'n1',
        title: 'Foco do dia: Contagem de Alinhamento',
        message: 'Equipe, hoje o foco é fechar a contagem sem pendência crítica. Todas as áreas devem validar o fechamento do almoço.',
        author_id: 'u1',
        type: 'operacional',
        priority: 'urgente',
        date: new Date().toISOString(),
        reactions: [{ emoji: '👍', count: 8 }, { emoji: '✅', count: 5 }]
    },
    {
        id: 'n2',
        title: 'Consistência na Cozinha',
        message: 'Parabéns para a cozinha: 3 dias seguidos com rotina completa e zero atrasos nas sessões de reposição.',
        author_id: 'u1',
        type: 'destaque',
        priority: 'normal',
        date: new Date().toISOString(),
        reactions: [{ emoji: '🔥', count: 12 }, { emoji: '🙌', count: 6 }]
    },
    {
        id: 'n3',
        title: 'Novidades no MOC',
        message: 'O Checklist diário será a próxima rotina acoplada ao módulo. Fiquem atentos para o treinamento em breve!',
        author_id: 'u1',
        type: 'comunicado_geral',
        priority: 'importante',
        date: new Date().toISOString(),
        reactions: [{ emoji: '👀', count: 10 }]
    },
    {
        id: 'n4',
        title: 'Melhoria no Bar',
        message: 'Bianca registrou melhoria no fluxo do bar que reduz o tempo de fechamento em 10 minutos. Em fase de testes.',
        author_id: 'u2',
        type: 'comunicado_geral',
        priority: 'normal',
        date: new Date().toISOString(),
        reactions: [{ emoji: '💡', count: 4 }]
    },
    {
        id: 'n5',
        title: 'Destaque da Semana',
        message: 'Maria Clara ganhou destaque da semana por consistência excepcional no checklist de abertura.',
        author_id: 'u1',
        type: 'destaque',
        priority: 'normal',
        date: new Date().toISOString(),
        reactions: [{ emoji: '⭐', count: 15 }, { emoji: '🏆', count: 3 }]
    }
];

export const INITIAL_DEMO_EVENTS: DemoEvent[] = [
    { id: 'e1', user_id: 'u5', message: 'Maria Clara concluiu rotina de contagem do salão', time: 'Há 5 min', type: 'completion' },
    { id: 'e2', user_id: 'u4', message: 'João Pedro fechou contagem da cozinha', time: 'Há 12 min', type: 'completion' },
    { id: 'e3', user_id: 'u2', message: 'Cida Souza validou a rotina da cozinha', time: 'Há 15 min', type: 'validation' },
    { id: 'e4', user_id: 'u7', message: 'Bianca Rocha bateu streak de 5 dias', time: 'Há 1h', type: 'achievement' },
    { id: 'e5', user_id: 'u6', message: 'Lucas Martins registrou divergência e concluiu revisão', time: 'Há 2h', type: 'completion' },
];
