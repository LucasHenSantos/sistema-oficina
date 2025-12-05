import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// Interface de OS simplificada para o Dashboard
interface OrdemServicoDashboard {
  id: number;
  client: string;
  vehicle: string;
  total: number;
  status: string; // 'in_progress', 'completed', 'pending' etc.
  date: string; // YYYY-MM-DD
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  // Lista bruta de todas as OSs
  allOrders = signal<OrdemServicoDashboard[]>([]);
  loading = signal(true);

  // --- CICLO DE VIDA ---
  ngOnInit(): void {
    this.loadDashboardData();
  }

  // Função que busca todos os dados
  async loadDashboardData() {
    if (!window.electronAPI) return;
    this.loading.set(true);

    try {
      // Busca todas as Ordens de Serviço (OS)
      const ordersData = await window.electronAPI.getOS();
      
      this.allOrders.set(ordersData);
      
    } catch (error) {
      console.error('Erro ao carregar dados do Dashboard:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // --- KPIS (COMPUTED SIGNALS) ---

  // 1. Veículos na Oficina (Status 'in_progress')
  vehiclesInProgress = computed(() => {
    return this.allOrders().filter(order => 
      order.status === 'in_progress' || order.status === 'pending'
    ).length;
  });

  // 2. Ordens Finalizadas no Mês Atual (para faturamento rápido)
  completedOrdersThisMonth = computed(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return this.allOrders().filter(order => {
      // Converte a data da OS (YYYY-MM-DD)
      const orderDate = new Date(order.date);
      
      return order.status === 'completed' &&
             orderDate.getMonth() === currentMonth &&
             orderDate.getFullYear() === currentYear;
    });
  });

  // 3. Faturamento Total do Mês (soma dos 'completedOrdersThisMonth')
  monthlyRevenue = computed(() => {
    return this.completedOrdersThisMonth().reduce((acc, curr) => acc + curr.total, 0);
  });
  
  // 4. Atividades Recentes (Últimas 5 OS criadas/atualizadas)
  recentActivities = computed(() => {
    // Ordena pelo ID de forma decrescente (presume-se que ID mais alto é mais recente)
    // Pega as últimas 5.
    return [...this.allOrders()]
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);
  });

  // Helper para formatar o status
  formatStatus(status: string): string {
    switch (status) {
      case 'in_progress':
        return 'Em Andamento';
      case 'completed':
        return 'Finalizada';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Desconhecido';
    }
  }

  // Helper para formatar a data (apenas dia/mês)
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Extrai o dia e o mês, formatando com zero à esquerda
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }
}