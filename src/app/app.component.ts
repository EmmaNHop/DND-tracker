import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {NavBarComponent} from './features/nav-bar/nav-bar.component';
import {SideNav} from './features/side-nav/side-nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBarComponent, SideNav],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'mythic-tracker';
}
