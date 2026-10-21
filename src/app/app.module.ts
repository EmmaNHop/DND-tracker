import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';

@NgModule({
  imports: [
    BrowserModule,
    RouterModule.forRoot([{ path: 'characterDashboard', loadChildren: () => import('./features/characterDashboard/character.module').then(m => m.CharacterModule) }]),
    // Import AppComponent since it's standalone
    AppComponent
  ],
  providers: []
})
export class AppModule { }
