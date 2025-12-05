import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaces simplificadas (Baseadas nas suas originais)
interface Cliente {
  id: number;
  name: string;
  phone: string;
  email: string;
  cars: string[]; // Mock data original (não usaremos, mas o backend pode esperar)
  lastVisit: string;
  status: string;
  statusLabel: string;
  // Propriedade para a exibição de veículos vinculados
  associatedVehicles?: string[]; 
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css'
})
export class Clientes implements OnInit {
  searchTerm = signal('');
  showModal = signal(false);

  // Objeto para o Formulário
  currentClient = signal<Cliente>(this.getEmptyClient());

  // Lista de Clientes (agora com tipagem)
  clients = signal<Cliente[]>([]);

  // --- CICLO DE VIDA ---
  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    if (!window.electronAPI) return;

    try {
      // 1. Carrega Clientes (Clientes Data)
      const clientsData: Cliente[] = await window.electronAPI.getClientes();
      
      // 2. Carrega Veículos (Veiculos Data)
      const vehiclesData: any[] = await window.electronAPI.getVeiculos();
      
      // 3. Mapeamento e Associação
      const clientsWithVehicles = clientsData.map(client => {
        // Encontra todos os veículos cujo campo 'client' (string) bate com o nome do cliente
        const vehicles = vehiclesData
          .filter(v => v.client === client.name)
          // Mapeia para um formato amigável para o badge: 'Modelo (Placa)'
          .map(v => `${v.model} (${v.plate})`); 
        
        return {
          ...client,
          // Adiciona a propriedade que o HTML vai usar para os badges
          associatedVehicles: vehicles 
        } as Cliente;
      });

      this.clients.set(clientsWithVehicles);

    } catch (error) {
      console.error('Erro ao carregar dados de Clientes e Veículos:', error);
    }
  }

  filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.clients().filter(client => 
      client.name.toLowerCase().includes(term) || 
      (client.phone && client.phone.includes(term))
    );
  });

  // --- AÇÕES ---
  
  openModal() {
    this.currentClient.set(this.getEmptyClient());
    this.showModal.set(true);
  }

  editClient(client: any) {
    // Clona o objeto e remove a propriedade temporária antes de editar, se existir
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
        if (newClient.id === 0) {
          // --- CRIAR NOVO ---
          const savedClient = await window.electronAPI.addCliente(newClient);
          // Recarrega todos os dados para atualizar a lista
          await this.loadData(); 
        } else {
          // --- EDITAR EXISTENTE ---
          await window.electronAPI.updateCliente(newClient);
          // Recarrega todos os dados para atualizar a lista (incluindo o link de veículos)
          await this.loadData();
        }
        this.closeModal();
      } catch (error) {
        console.error('Erro ao salvar cliente:', error);
        alert('Erro ao salvar no banco de dados.');
      }
    } else {
      this.closeModal();
    }
  }

  async deleteClient(id: number) {
    if(confirm('Excluir este cliente?')) {
      if (window.electronAPI) {
        try {
          await window.electronAPI.deleteCliente(id);
          await this.loadData(); // Recarrega para refletir a exclusão
        } catch (error) {
          console.error('Erro ao excluir cliente:', error);
          alert('Erro ao excluir do banco.');
        }
      }
    }
  }

  openWhatsApp(phone: string) {
    console.log(`Abrindo WhatsApp: ${phone}`);
  }

  newOrder(name: string) {
    console.log(`Nova OS para: ${name}`);
  }

  private getEmptyClient(): Cliente {
    return {
      id: 0,
      name: '',
      phone: '',
      email: '',
      cars: [],
      lastVisit: new Date().toLocaleDateString('pt-BR'),
      status: 'active',
      statusLabel: 'Novo',
      associatedVehicles: [] // Limpa ao iniciar
    };
  }
}