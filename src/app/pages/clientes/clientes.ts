import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Necessário para o campo de busca

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css'
})
export class Clientes {
  searchTerm = signal('');

  // Dados fictícios inteligentes
  clients = signal([
    { 
      id: 1, 
      name: 'Roberto Silva', 
      phone: '(11) 99999-1234', 
      cars: ['Honda Civic 2018', 'Fiat Uno 2010'], 
      lastVisit: '12/08/2024',
      status: 'active', // active, pending (devendo), inactive
      statusLabel: 'Em dia'
    },
    { 
      id: 2, 
      name: 'Ana Júlia Costa', 
      phone: '(11) 98888-5678', 
      cars: ['Jeep Renegade'], 
      lastVisit: '05/12/2024',
      status: 'pending',
      statusLabel: 'Pagamento Pendente'
    },
    { 
      id: 3, 
      name: 'Carlos Eduardo', 
      phone: '(11) 97777-4321', 
      cars: ['Ford Ka', 'VW Saveiro'], 
      lastVisit: '20/11/2024',
      status: 'active',
      statusLabel: 'Em dia'
    },
    { 
      id: 4, 
      name: 'Transportadora Veloz', 
      phone: '(11) 3333-0000', 
      cars: ['Frota: 5 caminhões'], 
      lastVisit: '01/12/2024',
      status: 'active',
      statusLabel: 'Parceiro VIP'
    }
  ]);

  // Filtro automático baseado na busca (Nome ou Carro)
  filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.clients().filter(client => 
      client.name.toLowerCase().includes(term) || 
      client.cars.some(car => car.toLowerCase().includes(term))
    );
  });

  // Ações rápidas (simulação)
  openWhatsApp(phone: string) {
    console.log(`Abrindo WhatsApp para ${phone}`);
    // Futuro: Lógica para abrir link w.me
  }

  newOrder(clientName: string) {
    console.log(`Criando nova OS para ${clientName}`);
  }
}