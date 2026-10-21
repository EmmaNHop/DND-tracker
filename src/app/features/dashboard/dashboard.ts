import {Component, AfterViewInit, ElementRef, inject} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent {
  protected router = inject(Router);

  characterClick() {
    this.router.navigate(['/characters']);
  }

}
