import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService, STAFF_ROLES, UserRole } from '../services/auth.service';

export const authGuard:CanActivateFn=(_route,state)=>{const auth=inject(AuthService),router=inject(Router);return auth.verificarAcceso(STAFF_ROLES).pipe(map(ok=>{if(!ok)return router.createUrlTree(['/login'],{queryParams:{returnUrl:state.url}});return auth.currentProfile()?.password_change_required&&state.url.split(/[?#]/)[0]!=='/cambiar-contrasena'?router.createUrlTree(['/cambiar-contrasena']):true;}));};
export const roleGuard=(roles:readonly UserRole[]):CanActivateFn=>(_route,state)=>{const auth=inject(AuthService),router=inject(Router);return auth.verificarAcceso(roles).pipe(map(ok=>{if(!ok)return router.createUrlTree(['/dashboard'],{queryParams:{denied:'1',returnUrl:state.url}});return auth.currentProfile()?.password_change_required?router.createUrlTree(['/cambiar-contrasena']):true;}));};
