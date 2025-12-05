import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  // Sinais para controlar os dados da tela (Reatividade do Angular 17+)
  stats = signal([
    { title: 'Veículos na Oficina', value: 12, icon: '🚗', color: 'blue', subtext: '4 entraram hoje' },
    { title: 'Aguardando Orçamento', value: 5, icon: '📝', color: 'orange', subtext: 'Prioridade alta' },
    { title: 'OS em Aberto', value: 8, icon: '🔧', color: 'green', subtext: '3 atrasadas' },
    { title: 'Estoque Baixo', value: 2, icon: '📦', color: 'red', subtext: 'Óleo e Filtros' }
  ]);

  recentActivity = signal([
    { time: '08:30', text: 'Entrada: Chevrolet Onix (Placa ABC-1234)', type: 'entrada' },
    { time: '09:15', text: 'Orçamento aprovado: Ford Ka', type: 'sucesso' },
    { time: '10:00', text: 'Serviço finalizado: Troca de óleo Honda Civic', type: 'info' },
    { time: '11:20', text: 'Saída: Fiat Strada', type: 'saida' }
  ]);
}