import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [NavbarComponent, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  signingOut=false;
  constructor(private authService: AuthService, private router: Router) {}
  cerrarSesion(): void {
    if(this.signingOut)return;this.signingOut=true;
    this.authService.signOut().subscribe(()=>{if(!this.authService.getToken())void this.router.navigateByUrl('/login');});
  }
}
