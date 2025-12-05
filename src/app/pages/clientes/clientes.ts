import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  currentClient = signal({
    id: 0,
    name: '',
    phone: '',
    email: '',
    cars: [] as string[],
    lastVisit: new Date().toLocaleDateString('pt-BR'),
    status: 'active',
    statusLabel: 'Novo'
  });

  // Lista de Clientes (Inicia vazia, será preenchida pelo banco)
  clients = signal<any[]>([]);

  filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.clients().filter(client => 
      client.name.toLowerCase().includes(term) || 
      (client.phone && client.phone.includes(term))
    );
  });

  // --- CICLO DE VIDA ---
  ngOnInit() {
    this.loadClients();
  }

  // Busca dados do Electron (SQLite)
  async loadClients() {
    if (window.electronAPI) {
      try {
        const data = await window.electronAPI.getClientes();
        this.clients.set(data);
      } catch (error) {
        console.error('Erro ao carregar clientes do banco:', error);
      }
    } else {
      console.warn('Electron API não detectada. Rodando em modo navegador?');
    }
  }

  // --- AÇÕES ---
  
  openModal() {
    this.currentClient.set({
      id: 0,
      name: '',
      phone: '',
      email: '',
      cars: [],
      lastVisit: '-',
      status: 'active',
      statusLabel: 'Novo'
    });
    this.showModal.set(true);
  }

  editClient(client: any) {
    // Clona o objeto para não editar a lista diretamente antes de salvar
    this.currentClient.set({ ...client });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  async saveClient() {
    const newClient = this.currentClient();

    if (window.electronAPI) {
      // Lógica para Electron + Banco de Dados
      if (newClient.id === 0) {
        // --- CRIAR NOVO ---
        try {
          const savedClient = await window.electronAPI.addCliente(newClient);
          // Atualiza a lista local com o cliente retornado (que agora tem ID real do banco)
          this.clients.update(list => [...list, savedClient]);
          this.closeModal();
        } catch (error) {
          console.error('Erro ao salvar cliente:', error);
          alert('Erro ao salvar no banco de dados.');
        }
      } else {
        // --- EDITAR EXISTENTE ---
        // (Nota: Ainda precisamos criar o handler 'update-cliente' no main.js para isso persistir)
        // Por enquanto, atualiza apenas visualmente:
        this.clients.update(list => list.map(c => c.id === newClient.id ? newClient : c));
        this.closeModal();
        console.warn('A edição ainda não está persistindo no banco (falta implementar no backend).');
      }

    } else {
      // Lógica de Fallback (Apenas memória/navegador)
      this.clients.update(list => {
        if (newClient.id === 0) {
          return [...list, { ...newClient, id: new Date().getTime() }];
        } else {
          return list.map(c => c.id === newClient.id ? newClient : c);
        }
      });
      this.closeModal();
    }
  }

  deleteClient(id: number) {
    if(confirm('Excluir este cliente?')) {
      // (Nota: Também precisará do handler 'delete-cliente' no main.js futuramente)
      this.clients.update(list => list.filter(c => c.id !== id));
    }
  }

  openWhatsApp(phone: string) {
    console.log(`Abrindo WhatsApp: ${phone}`);
  }

  newOrder(name: string) {
    console.log(`Nova OS para: ${name}`);
  }
}