import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('sistema-oficina');

  ngOnInit() {
    // 1. Verifica se já existe um tema salvo no navegador
    const savedTheme = localStorage.getItem('oficina_theme') || 'light';
    
    // 2. Aplica imediatamente no corpo do documento
    document.body.setAttribute('data-theme', savedTheme);
    
    // 3. (Opcional) Adiciona classe se você estiver usando classes específicas também
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }
  }
}