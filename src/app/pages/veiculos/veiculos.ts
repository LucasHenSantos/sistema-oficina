import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-veiculos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './veiculos.html',
  styleUrl: './veiculos.css'
})
export class Veiculos {
  searchTerm = signal('');

  // Dados mockados
  vehicles = signal([
    {
      id: 1,
      plate: 'ABC-1234',
      model: 'Onix LTZ 1.4',
      brand: 'Chevrolet',
      year: 2019,
      color: 'Branco',
      client: 'Roberto Silva',
      lastService: 'Troca de Óleo (12/08/2024)',
      status: 'in-shop', // in-shop, delivered
      image: 'assets/car-placeholder.png' // Futuro: foto do carro
    },
    {
      id: 2,
      plate: 'XYZ-9876',
      model: 'Renegade Sport',
      brand: 'Jeep',
      year: 2021,
      color: 'Verde',
      client: 'Ana Júlia Costa',
      lastService: 'Revisão 30k (05/12/2024)',
      status: 'delivered'
    },
    {
      id: 3,
      plate: 'HJK-4567',
      model: 'HB20 Sense',
      brand: 'Hyundai',
      year: 2020,
      color: 'Prata',
      client: 'Carlos Eduardo',
      lastService: 'Freios (20/11/2024)',
      status: 'delivered'
    },
    {
      id: 4,
      plate: 'BRA-2E19',
      model: 'Saveiro Cross',
      brand: 'Volkswagen',
      year: 2018,
      color: 'Vermelho',
      client: 'Carlos Eduardo',
      lastService: 'Suspensão (10/10/2024)',
      status: 'in-shop'
    }
  ]);

  // Filtro inteligente: Busca por Placa, Modelo ou Dono
  filteredVehicles = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.vehicles().filter(v => 
      v.plate.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.client.toLowerCase().includes(term)
    );
  });

  // Ações
  openHistory(plate: string) {
    console.log(`Abrindo histórico do veículo ${plate}`);
  }

  editVehicle(id: number) {
    console.log(`Editando veículo ${id}`);
  }
}