import { Routes } from '@angular/router';
import { ConversationComponent } from './pages/conversation/conversation.component';
import { NotebookComponent } from './pages/notebook/notebook.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/conversation',
        pathMatch: 'full',
    },
    {
        path: 'conversation',
        component: ConversationComponent,
        title: 'Chat'
    },
    {
        path: 'notebook',
        component: NotebookComponent,
        title: 'Notebook'
    }
];
