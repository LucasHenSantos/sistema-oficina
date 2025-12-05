import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interface básica para o relatório (sincronizada com o banco)
interface OrdemServicoReport {
  id: number;
  date: string; // Formato YYYY-MM-DD
  client: string;
  vehicle: string;
  serviceType: string; 
  total: number;
  status: string;
  notes: string;
  // Outros campos da OS, como items, serão carregados mas não listados aqui
}

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './relatorios.html',
  styleUrl: './relatorios.css'
})
export class Relatorios implements OnInit {
  // Filtros de Data
  selectedMonth = signal(new Date().getMonth() + 1); // Mês atual (1-12)
  selectedYear = signal(new Date().getFullYear());
  
  // Lista bruta de todas as OSs do banco
  allOrders = signal<OrdemServicoReport[]>([]); 
  
  // Dados da Empresa (para o cabeçalho do laudo)
  companyData = signal<any>(null);

  // Modal de Laudo
  showModal = signal(false);
  currentReport = signal<any>(null);

  // Mapa de meses para o HTML (se você quiser iterar no HTML)
  monthMap = [
    { value: 1, name: 'Janeiro' }, { value: 2, name: 'Fevereiro' }, { value: 3, name: 'Março' },
    { value: 4, name: 'Abril' }, { value: 5, name: 'Maio' }, { value: 6, name: 'Junho' },
    { value: 7, name: 'Julho' }, { value: 8, name: 'Agosto' }, { value: 9, name: 'Setembro' },
    { value: 10, name: 'Outubro' }, { value: 11, name: 'Novembro' }, { value: 12, name: 'Dezembro' }
  ];

  // --- CICLO DE VIDA ---
  ngOnInit(): void {
    this.loadData();
  }

  async loadData() {
    if (!window.electronAPI) return;

    try {
      // 1. Carrega TODAS as OS (incluindo as não finalizadas)
      const ordersData = await window.electronAPI.getOS();
      
      // Mapeia para adicionar o campo serviceType (usando o primeiro item da OS)
      const mappedOrders = ordersData.map((order: any) => ({
        ...order,
        // Pega o nome do primeiro item (se existir) para ser o "serviço principal"
        serviceType: (order.items && order.items.length > 0) ? order.items[0].name : 'Serviço Não Classificado',
        technician: 'Carlos' // Mock: Se não tiver técnico no DB, use um padrão
      }));

      this.allOrders.set(mappedOrders);
      
      // 2. Carrega Dados da Empresa para o Laudo
      const companyConfig = await window.electronAPI.getConfig('dados_empresa');
      if (companyConfig) {
        this.companyData.set(companyConfig);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error);
    }
  }

  // --- FILTRO E CÁLCULOS (COMPUTED SIGNALS) ---

  // 1. Lista de OS que estão no status 'completed' E no mês/ano selecionado
  closedOrders = computed(() => {
    const month = this.selectedMonth();
    const year = this.selectedYear();
    
    return this.allOrders()
      .filter(order => order.status === 'completed') // Apenas OS finalizadas (fechadas)
      .filter(order => {
        // Assume que 'date' está no formato YYYY-MM-DD
        const orderDate = new Date(order.date);
        // JS Date retorna mês 0-11, por isso comparamos com (orderDate.getMonth() + 1)
        return orderDate.getFullYear() === year && (orderDate.getMonth() + 1) === month;
      });
  });

  // 2. Faturamento do Mês (KPI 1)
  totalRevenue = computed(() => {
    return this.closedOrders().reduce((acc, curr) => acc + curr.total, 0);
  });

  // 3. Ticket Médio (KPI 2)
  averageTicket = computed(() => {
    const count = this.closedOrders().length;
    return count === 0 ? 0 : this.totalRevenue() / count;
  });

  // --- Funções de Relatório e Impressão ---

  generateReport(order: any) {
    // Mapeia os dados para o modal de laudo
    this.currentReport.set({
      ...order,
      // Garante que a data do laudo seja formatada para BR
      date: new Date(order.date).toLocaleDateString('pt-BR'),
      technician: order.technician || 'N/A', // Mantenha um valor padrão para o laudo
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.currentReport.set(null);
  }

  printReport() {
    window.print();
  }
  
  // Helper para gerar a lista de anos (para o select)
  get availableYears(): number[] {
      const currentYear = new Date().getFullYear();
      // Retorna o ano atual, o anterior e o próximo (pode ser ajustado)
      return [currentYear - 1, currentYear, currentYear + 1];
  }
}