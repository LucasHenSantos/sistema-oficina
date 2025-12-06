import { Component, signal, computed, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Cliente {
  id: number;
  name: string;
  phone: string;
  email: string;
  cars?: any[]; // <--- PROPRIEDADE OBRIGATÓRIA NO BANCO/FORMULÁRIO
  lastVisit: string;
  status: string;
  statusLabel: string;
  associatedVehicles?: string[]; // Para exibição na tabela
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css'
})
export class Clientes implements OnInit {
  searchTerm = signal('');
  showModal = signal(false);
  showViewModal = signal(false); // NOVO: Controla o modal de visualização
  
  // Dados do cliente para o modal de visualização
  clientDetails = signal<any>(null); 

  // Objeto para o Formulário (Edição/Criação)
  currentClient = signal<any>(this.getEmptyClient());

  // Lista de Clientes
  clients = signal<Cliente[]>([]);

  // Lista bruta de veículos
  private vehiclesData: any[] = [];
  loading = signal(true);

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    if (!window.electronAPI) return;
    this.loading.set(true);

    try {
      // 1. Carrega Clientes
      const clientsData: Cliente[] = await window.electronAPI.getClientes();
      
      // 2. Carrega Veículos
      this.vehiclesData = await window.electronAPI.getVeiculos();
      
      // 3. Mapeamento e Associação (para exibição na tabela)
      const clientsWithVehicles = clientsData.map(client => {
        const vehicles = this.vehiclesData
          .filter(v => v.client === client.name)
          .map(v => `${v.model} (${v.plate})`); 
        
        return {
          ...client,
          associatedVehicles: vehicles 
        } as Cliente;
      });

      this.clients.set(clientsWithVehicles);
      this.cdr.detectChanges(); 
    } catch (error) {
      console.error('Erro ao carregar dados de Clientes e Veículos:', error);
    } finally {
      this.loading.set(false);
    }
  }

  // --- AÇÕES DE VISUALIZAÇÃO (NOVO) ---
  async viewClient(clientName: string) {
    if (!window.electronAPI) return;
    
    try {
      // Chama o novo handler IPC
      const result = await window.electronAPI.getClientWithVehicles(clientName);
      if (result) {
        this.clientDetails.set(result);
        this.showViewModal.set(true);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do cliente:', error);
    }
  }

  closeViewModal() {
    this.showViewModal.set(false);
    this.clientDetails.set(null);
  }

  // --- AÇÕES CRUD (Modal de Edição) ---
  
  openModal() {
    this.currentClient.set(this.getEmptyClient());
    this.showModal.set(true);
  }

  editClient(client: any) {
    const clientToEdit = { ...client };
    delete clientToEdit.associatedVehicles; 
    this.currentClient.set(clientToEdit);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async saveClient() {
    const newClient = this.currentClient();

    if (window.electronAPI) {
      try {
        if (newClient.id && newClient.id !== 0) {
          await window.electronAPI.updateCliente(newClient);
        } else {
          await window.electronAPI.addCliente(newClient);
        }
        this.closeModal();
        await this.loadData(); 
      } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        alert('Erro ao salvar no banco de dados.');
      }
    }
  }

  async deleteClient(id: number) {
    if(confirm('Excluir este cliente?')) {
      if (window.electronAPI) {
        try {
          await window.electronAPI.deleteCliente(id);
          await this.loadData();
        } catch (error) {
          console.error('Erro ao excluir cliente:', error);
          alert('Erro ao excluir do banco.');
        }
      }
    }
  }

  // --- HELPERS ---
  openWhatsApp(phone: string) {
    console.log(`Abrindo WhatsApp: ${phone}`);
  }

  newOrder(name: string) {
    console.log(`Nova OS para: ${name}`);
  }

  filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.clients().filter(client => 
      client.name.toLowerCase().includes(term) || 
      (client.phone && client.phone.includes(term))
    );
  });
  
private getEmptyClient(): Cliente {
  return {
    id: 0,
    name: '',
    phone: '',
    email: '',
    cars: [], // <--- CORRIGIDO: Adicionado 'cars' como array vazio
    lastVisit: new Date().toLocaleDateString('pt-BR'),
    status: 'active',
    statusLabel: 'Novo',
    associatedVehicles: [] // Para compatibilidade de tipagem
  };
}
}