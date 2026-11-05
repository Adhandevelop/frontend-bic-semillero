import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { PassengerService } from '../services/passenger.service';
export const passengerGuard:CanActivateFn=(_route,state)=>{const router=inject(Router);const session=inject(PassengerService);return session.allowed().pipe(map(ok=>!ok?router.createUrlTree(['/clientes/login'],{queryParams:{returnUrl:state.url}}):session.mustChangePassword()&&state.url.split('?')[0]!=='/clientes/cambiar-contrasena'?router.createUrlTree(['/clientes/cambiar-contrasena']):true));};

