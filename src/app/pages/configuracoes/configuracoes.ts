import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.css'
})
export class Configuracoes {
  // Campo de nova categoria
  newCategoryName = signal('');

  // Carrega lista atual ou inicia com padrão
  categories = signal<string[]>(this.loadCategories());

  private loadCategories(): string[] {
    const saved = localStorage.getItem('oficina_categorias');
    return saved ? JSON.parse(saved) : [
      'Manutenção',
      'Suspensão',
      'Elétrica',
      'Freios',
      'Estética',
      'Motor',
      'Ar Condicionado',
      'Pneus',
      'Outros'
    ];
  }

  addCategory() {
    const name = this.newCategoryName().trim();
    if (name && !this.categories().includes(name)) {
      this.categories.update(list => [...list, name]);
      this.saveToStorage();
      this.newCategoryName.set('');
    } else if (this.categories().includes(name)) {
      alert('Esta categoria já existe!');
    }
  }

  removeCategory(index: number) {
    if (confirm('Remover esta categoria?')) {
      this.categories.update(list => list.filter((_, i) => i !== index));
      this.saveToStorage();
    }
  }

  private saveToStorage() {
    localStorage.setItem('oficina_categorias', JSON.stringify(this.categories()));
  }
}