import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { PassengerService } from '../services/passenger.service';
export const passengerGuard:CanActivateFn=(_route,state)=>{const router=inject(Router);return inject(PassengerService).allowed().pipe(map(ok=>ok?true:router.createUrlTree(['/clientes/login'],{queryParams:{returnUrl:state.url}})));};

