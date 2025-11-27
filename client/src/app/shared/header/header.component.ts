import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  searchQuery = '';

  onSearch(): void {
    console.log('Search:', this.searchQuery);
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }
}
