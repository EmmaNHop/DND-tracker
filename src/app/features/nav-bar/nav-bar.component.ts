import { Component } from '@angular/core';

@Component({
  selector: 'app-nav-bar',
  imports: [],
  standalone: true,  // Add this
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.scss'
})
export class NavBarComponent {
  showFiller = false;
}
