import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './relatorios.html',
  styleUrl: './relatorios.css'
})
export class Relatorios {
  // Filtros
  selectedMonth = signal(new Date().getMonth() + 1); // Mês atual
  selectedYear = signal(new Date().getFullYear());

  // Dados Mockados de O.S. Finalizadas
  closedOrders = signal([
    {
      id: 2045,
      date: '05/12/2024',
      client: 'Roberto Silva',
      vehicle: 'Honda Civic 2018',
      serviceType: 'Suspensão Completa',
      total: 1250.00,
      paymentMethod: 'Cartão Crédito',
      technician: 'Carlos'
    },
    {
      id: 2044,
      date: '04/12/2024',
      client: 'Ana Júlia Costa',
      vehicle: 'Jeep Renegade',
      serviceType: 'Revisão 30k',
      total: 890.00,
      paymentMethod: 'Pix',
      technician: 'Carlos'
    },
    {
      id: 2043,
      date: '03/12/2024',
      client: 'Transportadora Veloz',
      vehicle: 'Volvo FH 540',
      serviceType: 'Troca de Óleo + Filtros',
      total: 2100.00,
      paymentMethod: 'Boleto',
      technician: 'Marcos'
    }
  ]);

  // Cálculos Computados (KPIs)
  totalRevenue = computed(() => {
    return this.closedOrders().reduce((acc, curr) => acc + curr.total, 0);
  });

  averageTicket = computed(() => {
    const count = this.closedOrders().length;
    return count === 0 ? 0 : this.totalRevenue() / count;
  });

  // Modal de Laudo
  showModal = signal(false); // Corrigido: renomeado para 'showModal' para bater com o HTML
  currentReport = signal<any>(null);

  // Ações
  generateReport(order: any) {
    this.currentReport.set(order);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.currentReport.set(null);
  }

  printReport() {
    // Esconde o que não é o modal e imprime
    window.print();
  }
}