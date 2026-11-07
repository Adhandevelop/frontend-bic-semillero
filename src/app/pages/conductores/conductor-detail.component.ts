import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, of, startWith, switchMap, takeUntil, timeout } from 'rxjs';
import { Conductor } from '../../core/models/conductor.model';
import { ConductorService } from '../../core/services/conductor.service';
import { fleetError } from '../../core/utils/fleet-error';
import { FleetTripsComponent } from '../../shared/fleet-trips/fleet-trips.component';
@Component({standalone:true,imports:[CommonModule,RouterLink,FleetTripsComponent],templateUrl:'./conductor-detail.component.html',styleUrl:'../buses/bus-detail.component.css'})
export class ConductorDetailComponent implements OnInit,OnDestroy {
  private route=inject(ActivatedRoute);private api=inject(ConductorService);private refresh=new Subject<void>();private destroy=new Subject<void>();
  driver:Conductor|null=null;id:number|null=null;loading=false;error='';
  ngOnInit():void{combineLatest([this.route.paramMap,this.refresh.pipe(startWith(null))]).pipe(switchMap(([params])=>{
    this.driver=null;this.error='';const raw=params.get('id');this.id=raw&&/^[1-9]\d*$/.test(raw)&&Number.isSafeInteger(Number(raw))?Number(raw):null;
    if(!this.id){this.loading=false;this.error='El identificador del conductor no es válido.';return of(null);}
    const id=this.id;this.loading=true;return this.api.obtenerPorId(id).pipe(timeout(20000),catchError(err=>{this.error=fleetError(err,'consultar el conductor');return of(null);}));
  }),takeUntil(this.destroy)).subscribe(driver=>{this.loading=false;if(driver&&driver.id!==this.id){this.error='El conductor recibido no coincide con el solicitado.';return;}this.driver=driver;});}
  reload():void{if(!this.loading)this.refresh.next();}
  phone(value:string):string|null{const text=value.replace(/[\s().-]/g,'');return /^\+?\d{7,15}$/.test(text)?'tel:'+text:null;}
  ngOnDestroy():void{this.destroy.next();this.destroy.complete();this.refresh.complete();}
}
