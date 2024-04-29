import { Routes } from '@angular/router';
import { ConversationComponent } from './pages/conversation/conversation.component';
import { NotebookComponent } from './pages/notebook/notebook.component';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        title: 'Prompto',
        data: { title: "Prompto" }
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
    }
];
