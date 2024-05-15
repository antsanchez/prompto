import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
        title: 'Prompto',
        data: { title: "Dashboard" }
    },
    {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
        title: 'Settings',
        data: { title: "Settings" }
    },
    {
        path: 'conversation/:chat',
        loadComponent: () => import('./pages/conversation/conversation.component').then(m => m.ConversationComponent),
        title: 'Chat',
        data: { title: "Chat" }
    },
    {
        path: 'conversation',
        loadComponent: () => import('./pages/conversation/conversation.component').then(m => m.ConversationComponent),
        title: 'Chat',
        data: { title: "Chat" }
    },
    {
        path: 'arena',
        loadComponent: () => import('./pages/arena/arena.component').then(m => m.ArenaComponent),
        title: 'Arena',
        data: { title: "Arena" }
    },
    {
        path: 'arena/:chat',
        loadComponent: () => import('./pages/arena/arena.component').then(m => m.ArenaComponent),
        title: 'Arena',
        data: { title: "Arena" }
    },
    {
        path: 'notebook',
        loadComponent: () => import('./pages/notebook/notebook.component').then(m => m.NotebookComponent),
        title: 'Notebook',
        data: { title: "Notebook" }
    },
    {
        path: 'templates/:template',
        loadComponent: () => import('./pages/template/template.component').then(m => m.TemplateComponent),
        title: 'Templates',
        data: { title: "Templates" }
    },
    {
        path: 'templates',
        loadComponent: () => import('./pages/template/template.component').then(m => m.TemplateComponent),
        title: 'Templates',
        data: { title: "Templates" }
    }
];
