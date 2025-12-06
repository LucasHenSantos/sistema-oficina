import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router'; 

// Interface de OS simplificada para o Dashboard
interface OrdemServicoDashboard {
  id: number;
  client: string;
  vehicle: string;
  total: number;
  status: string; // 'in-progress', 'completed', 'pending' etc.
  date: string; // YYYY-MM-DD
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  // Lista bruta de todas as OSs
  allOrders = signal<OrdemServicoDashboard[]>([]);
  loading = signal(true);
  
  // KPIs Buscados Diretamente do Backend
  dailyRevenue = signal(0);
  lowStockCount = signal(0);

  // INJEÇÃO CORRIGIDA: Adicionar ChangeDetectorRef aqui
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef // <<-- Adicionado
  ) {}

  // --- CICLO DE VIDA ---
  ngOnInit(): void {
    // É uma boa prática carregar os dados em uma função separada
    this.loadDashboardData();
  }

  // Função que busca todos os dados
  async loadDashboardData() {
    if (!window.electronAPI) return;
    this.loading.set(true);

    try {
      // Carrega todos os dados assíncronos em paralelo
      const [revenue, lowStock, ordersData] = await Promise.all([
        window.electronAPI.getDailyRevenue(),
        window.electronAPI.countLowStock(),
        window.electronAPI.getOS()
      ]);

      // 1. Seta os KPIs
      this.dailyRevenue.set(revenue);
      this.lowStockCount.set(lowStock);
      
      // 2. Seta os dados da lista
      this.allOrders.set(ordersData);
      
      // 3. Força a detecção de mudanças para renderizar na primeira vez
      this.cdr.detectChanges(); // <<-- SOLUÇÃO PARA O PROBLEMA DO RECARREGAMENTO
      
    } catch (error) {
      console.error('Erro ao carregar dados do Dashboard:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // --- KPIS CALCULADOS NO FRONTEND ---

  // 1. Veículos na Oficina (Status 'in-progress' ou 'pending')
  vehiclesInProgress = computed(() => {
    return this.allOrders().filter(order => 
      order.status === 'in-progress' || order.status === 'pending'
    ).length;
  });

  // 2. Atividades Recentes (Últimas 5 OS criadas/atualizadas)
  recentActivities = computed(() => {
    return [...this.allOrders()]
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);
  });

  // --- HELPERS ---

  // Helper para formatar o status (para a lista de atividades)
  formatStatus(status: string): string {
    const map: any = {
      'pending': 'Pendente',
      'approved': 'Aprovado',
      'in-progress': 'Em Andamento',
      'completed': 'Finalizado',
      'canceled': 'Cancelado'
    };
    return map[status] || status;
  }

  // Helper para formatar a data (apenas dia/mês)
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }
}