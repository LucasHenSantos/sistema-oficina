import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive], // Importante para o menu funcionar
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {
  // Lógica do layout (se precisar no futuro)
}