import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, UserRole } from '../../core/services/auth.service';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  signingOut=false;role:UserRole|null=null;profileName='';profileError='';
  constructor(private authService: AuthService, private router: Router) {}
  ngOnInit():void{this.authService.loadProfile().subscribe({next:profile=>{this.role=profile.role;this.profileName=profile.name||[profile.first_name,profile.last_name].filter(Boolean).join(' ')||profile.username;},error:()=>this.profileError='No se pudo consultar el rol de la sesión.'});}
  allows(...roles:UserRole[]):boolean{return this.role!==null&&roles.includes(this.role);}
  cerrarSesion(): void {
    if(this.signingOut)return;this.signingOut=true;
    this.authService.signOut().subscribe(()=>{if(!this.authService.getToken())void this.router.navigateByUrl('/login');});
  }
}
