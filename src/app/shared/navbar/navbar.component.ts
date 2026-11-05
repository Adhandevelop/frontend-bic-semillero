import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnDestroy {
  @ViewChild('menuButton') private menuButton?:ElementRef<HTMLButtonElement>;
  private destroyed=new Subject<void>();
  menuOpen=false;
  constructor(private authService:AuthService,private router:Router){
    this.router.events.pipe(filter(event=>event instanceof NavigationEnd),takeUntil(this.destroyed)).subscribe(()=>this.closeMenu());
  }
  toggleMenu():void{this.menuOpen=!this.menuOpen;}
  closeMenu(returnFocus=false):void{this.menuOpen=false;if(returnFocus)this.menuButton?.nativeElement.focus();}
  cerrarSesion():void{this.closeMenu();this.authService.logout();void this.router.navigateByUrl('/login');}
  ngOnDestroy():void{this.destroyed.next();this.destroyed.complete();}
}
