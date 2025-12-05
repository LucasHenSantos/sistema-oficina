import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css'
})
export class Clientes {
  searchTerm = signal('');
  showModal = signal(false);

  // Objeto para o Formulário
  currentClient = signal({
    id: 0,
    name: '',
    phone: '',
    email: '',
    cars: [] as string[], // Inicialmente vazio ao criar
    lastVisit: new Date().toLocaleDateString('pt-BR'),
    status: 'active',
    statusLabel: 'Novo'
  });

  // Dados Mockados
  clients = signal([
    { 
      id: 1, 
      name: 'Roberto Silva', 
      phone: '(11) 99999-1234', 
      email: 'roberto@email.com',
      cars: ['Honda Civic 2018'], 
      lastVisit: '12/08/2024',
      status: 'active',
      statusLabel: 'Em dia'
    },
    { 
      id: 2, 
      name: 'Ana Júlia Costa', 
      phone: '(11) 98888-5678', 
      email: 'ana.ju@email.com',
      cars: ['Jeep Renegade'], 
      lastVisit: '05/12/2024',
      status: 'pending',
      statusLabel: 'Pendente'
    }
  ]);

  filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.clients().filter(client => 
      client.name.toLowerCase().includes(term) || 
      client.phone.includes(term)
    );
  });

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
    this.currentClient.set({ ...client });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveClient() {
    const newClient = this.currentClient();
    this.clients.update(list => {
      if (newClient.id === 0) {
        return [...list, { ...newClient, id: new Date().getTime() }];
      } else {
        return list.map(c => c.id === newClient.id ? newClient : c);
      }
    });
    this.closeModal();
  }

  deleteClient(id: number) {
    if(confirm('Excluir este cliente?')) {
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