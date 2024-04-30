import { Routes } from '@angular/router';
import { ConversationComponent } from './pages/conversation/conversation.component';
import { NotebookComponent } from './pages/notebook/notebook.component';
import { HomeComponent } from './pages/home/home.component';
import { TemplateComponent } from './pages/template/template.component';
import { SettingsComponent } from './pages/settings/settings.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        title: 'Prompto',
        data: { title: "Dashboard" }
    },
    {
        path: 'settings',
        component: SettingsComponent,
        title: 'Settings',
        data: { title: "Settings" }
    },
    {
        path: 'conversation/:chat',
        component: ConversationComponent,
        title: 'Chat',
        data: { title: "Chat" }
    },
    {
        path: 'conversation',
        component: ConversationComponent,
        title: 'Chat',
        data: { title: "Chat" }
    },
    {
        path: 'notebook',
        component: NotebookComponent,
        title: 'Notebook',
        data: { title: "Notebook" }
    },
    {
        path: 'templates/:template',
        component: TemplateComponent,
        title: 'Templates',
        data: { title: "Templates" }
    },
    {
        path: 'templates',
        component: TemplateComponent,
        title: 'Templates',
        data: { title: "Templates" }
    }
];
