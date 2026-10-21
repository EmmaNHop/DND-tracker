import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { CharacterDashboardComponent } from './characterDashboard.component';


const routes: Routes = [
  { path: '', component: CharacterDashboardComponent }
];

@NgModule({
  declarations: [
    CharacterDashboardComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class CharacterModule { }
