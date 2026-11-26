import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @ViewChild('menuButton') private menuButton?:ElementRef<HTMLButtonElement>;
  private destroyed=new Subject<void>();
  readonly themeService=inject(ThemeService);
  menuOpen=false;profileMenuOpen=false;signingOut=false;
  constructor(private authService:AuthService,private router:Router){
    this.router.events.pipe(filter(event=>event instanceof NavigationEnd),takeUntil(this.destroyed)).subscribe(()=>{this.closeMenu();this.profileMenuOpen=false;});
  }
  get isDark():boolean{return this.themeService.isDark;}
  toggleTheme():void{this.themeService.toggle();}
  ngOnInit():void{
    if(!this.authService.currentProfile()&&this.authService.getToken()){
      this.authService.loadProfile().pipe(takeUntil(this.destroyed)).subscribe({error:()=>{}});
    }
  }
  get isAdmin():boolean{return this.authService.hasRole('admin');}
  get profileName():string{
    const p=this.authService.currentProfile();
    if(!p)return 'Administrador';
    return p.name||[p.first_name,p.last_name].filter(Boolean).join(' ')||p.username;
  }
  get initials():string{
    return this.profileName.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]?.toUpperCase()??'').join('')||'AD';
  }
  toggleMenu():void{this.menuOpen=!this.menuOpen;if(this.menuOpen)this.profileMenuOpen=false;}
  toggleProfileMenu():void{this.profileMenuOpen=!this.profileMenuOpen;if(this.profileMenuOpen)this.menuOpen=false;}
  closeProfileMenu():void{this.profileMenuOpen=false;}
  closeMenu(returnFocus=false):void{this.menuOpen=false;this.profileMenuOpen=false;if(returnFocus)this.menuButton?.nativeElement.focus();}
  cerrarSesion():void{if(this.signingOut)return;this.signingOut=true;this.closeMenu();this.authService.signOut().subscribe(()=>{if(!this.authService.getToken())void this.router.navigateByUrl('/login');});}
  ngOnDestroy():void{this.destroyed.next();this.destroyed.complete();}
}
