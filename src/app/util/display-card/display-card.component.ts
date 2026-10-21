import {Component, inject, input, output} from '@angular/core';
import {
  MatCard, MatCardActions,
  MatCardHeader,
  MatCardImage,
  MatCardTitle
} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {Router} from '@angular/router';

@Component({
  selector: 'app-display-card',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardImage,
    MatCardActions,
    MatButton
  ],
  templateUrl: './display-card.component.html',
  styleUrl: './display-card.component.scss',
})
export class DisplayCardComponent {
  router = inject(Router);
  name = input<string>('');
  description = input<string>('');
  cardClicked = output<string>();

  onView() {
    const className = this.name();
    this.cardClicked.emit(className);
    this.router.navigate(['/class', encodeURIComponent(className)]);
  }
}
