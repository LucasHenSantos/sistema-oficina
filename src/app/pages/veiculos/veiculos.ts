import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router'; // Importação nova

@Component({
  selector: 'app-veiculos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './veiculos.html',
  styleUrl: './veiculos.css'
})
export class Veiculos implements OnInit {
  searchTerm = signal('');
  showModal = signal(false);

  ownersList = signal(['Roberto Silva', 'Ana Júlia Costa', 'Carlos Eduardo', 'Cliente Balcão']);

  currentVehicle = signal({
    id: 0,
    plate: '',
    model: '',
    brand: '',
    year: new Date().getFullYear(),
    color: '',
    client: '',
    lastService: '-',
    status: 'delivered'
  });

  vehicles = signal([
    {
      id: 1,
      plate: 'ABC-1234',
      model: 'Onix LTZ 1.4',
      brand: 'Chevrolet',
      year: 2019,
      color: 'Branco',
      client: 'Roberto Silva',
      lastService: '12/08/2024',
      status: 'in-shop'
    }
  ]);

  filteredVehicles = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.vehicles().filter(v => 
      v.plate.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.client.toLowerCase().includes(term)
    );
  });

  // Injetamos a rota ativa para ler os parâmetros
  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Verifica se veio do Dashboard com ordem de abrir modal
    this.route.queryParams.subscribe(params => {
      if (params['open'] === 'true') {
        this.openModal();
      }
    });
  }

  // --- AÇÕES ---

  openModal() {
    this.currentVehicle.set({
      id: 0,
      plate: '',
      model: '',
      brand: '',
      year: 2020,
      color: '',
      client: this.ownersList()[0],
      lastService: '-',
      status: 'in-shop' // Padrão 'Na Oficina' ao criar novo
    });
    this.showModal.set(true);
  }

  editVehicle(vehicle: any) {
    this.currentVehicle.set({ ...vehicle });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveVehicle() {
    const newVehicle = this.currentVehicle();
    newVehicle.plate = newVehicle.plate.toUpperCase();

    this.vehicles.update(list => {
      if (newVehicle.id === 0) {
        return [...list, { ...newVehicle, id: new Date().getTime() }];
      } else {
        return list.map(v => v.id === newVehicle.id ? newVehicle : v);
      }
    });
    this.closeModal();
  }

  deleteVehicle(id: number) {
    if(confirm('Remover este veículo?')) {
      this.vehicles.update(list => list.filter(v => v.id !== id));
    }
  }
}