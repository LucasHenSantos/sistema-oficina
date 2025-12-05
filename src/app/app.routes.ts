import { Routes } from '@angular/router';
import { Layout } from './layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'produtos', loadComponent: () => import('./pages/produtos/produtos').then(m => m.Produtos) },
      { path: 'veiculos', loadComponent: () => import('./pages/veiculos/veiculos').then(m => m.Veiculos) },
      { path: 'clientes', loadComponent: () => import('./pages/clientes/clientes').then(m => m.Clientes) },
      { path: 'servicos', loadComponent: () => import('./pages/servicos/servicos').then(m => m.Servicos) },
      { path: 'ordem-servico', loadComponent: () => import('./pages/ordem-servico/ordem-servico').then(m => m.OrdemServico) },
      { path: 'orcamentos', loadComponent: () => import('./pages/orcamentos/orcamentos').then(m => m.Orcamentos) },
      { path: 'relatorios', loadComponent: () => import('./pages/relatorios/relatorios').then(m => m.Relatorios) },
      { path: 'configuracoes', loadComponent: () => import('./pages/configuracoes/configuracoes').then(m => m.Configuracoes) },
    ]
  }
];
