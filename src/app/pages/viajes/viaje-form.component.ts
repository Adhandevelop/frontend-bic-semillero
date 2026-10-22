import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { Bus } from '../../core/models/bus.model';
import { Conductor } from '../../core/models/conductor.model';
import { Ruta } from '../../core/models/ruta.model';
import { Viaje } from '../../core/models/viaje.model';
import { BusService } from '../../core/services/bus.service';
import { ConductorService } from '../../core/services/conductor.service';
import { RutaService } from '../../core/services/ruta.service';
import { ViajeService } from '../../core/services/viaje.service';

// The form uses Colombia local time regardless of the browser timezone.
export function bogotaIso(value:string):string|null {
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
  const date=new Date(value+'-05:00');
  if(!Number.isFinite(date.getTime())||new Date(date.getTime()-5*3600000).toISOString().slice(0,16)!==value)return null;
  return date.toISOString();
}
export function tripSchedule(control:AbstractControl):ValidationErrors|null {
  const start=control.get('fecha_hora_inicio')?.value;const end=control.get('fecha_hora_fin')?.value;
  if(start&&!bogotaIso(start)||end&&!bogotaIso(end))return {invalidSchedule:true};
  return start&&end&&end<=start?{endBeforeStart:true}:null;
}
@Component({selector:'app-viaje-form',standalone:true,imports:[CommonModule,ReactiveFormsModule,RouterLink],templateUrl:'./viaje-form.component.html',styleUrl:'./viaje-form.component.css'})
export class ViajeFormComponent implements OnInit {
  private readonly fb=inject(FormBuilder);
  buses:Bus[]=[];conductores:Conductor[]=[];rutas:Ruta[]=[];
  loading=false;loadFailed=false;error='';success='';editando=false;viajeId?:number;
  private originalBus=0;private originalRoute=0;
  readonly form=this.fb.nonNullable.group({
    bus:[0,[Validators.required,Validators.min(1),Validators.pattern(/^\d+$/)]],
    conductor:[0,[Validators.required,Validators.min(1),Validators.pattern(/^\d+$/)]],
    ruta:[0,[Validators.required,Validators.min(1),Validators.pattern(/^\d+$/)]],
    fecha_hora_inicio:['',Validators.required],fecha_hora_fin:[''],
    estado:['programado' as Viaje['estado'],[Validators.required,Validators.pattern(/^(programado|en_curso|finalizado|cancelado)$/)]]
  },{validators:tripSchedule});
  constructor(private route:ActivatedRoute,private router:Router,private busService:BusService,private conductorService:ConductorService,private rutaService:RutaService,private viajeService:ViajeService){}
  get eligibleBuses():Bus[]{return this.buses.filter(bus=>bus.state==='Active'||bus.id===this.originalBus);}
  get eligibleRoutes():Ruta[]{return this.rutas.filter(route=>route.estado==='activa'||route.id===this.originalRoute);}
  get selectedBus():Bus|undefined{return this.buses.find(bus=>bus.id===Number(this.form.controls.bus.value));}
  get selectedDriver():Conductor|undefined{return this.conductores.find(driver=>driver.id===Number(this.form.controls.conductor.value));}
  get selectedRoute():Ruta|undefined{return this.rutas.find(route=>route.id===Number(this.form.controls.ruta.value));}
  get reverseRoute():Ruta|undefined{return this.eligibleRoutes.find(route=>route.origen===this.selectedRoute?.destino&&route.destino===this.selectedRoute?.origen);}
  swapRoute():void{if(this.reverseRoute)this.form.controls.ruta.setValue(this.reverseRoute.id!);}
  invalid(field:keyof typeof this.form.controls):boolean{const c=this.form.controls[field];return c.touched&&c.invalid;}
  ngOnInit():void{const id=Number(this.route.snapshot.paramMap.get('id'));if(Number.isInteger(id)&&id>0){this.editando=true;this.viajeId=id;}this.cargarDatosIniciales();}
  cargarDatosIniciales():void{
    if(this.loading)return;this.loading=true;this.loadFailed=false;this.error='';
    forkJoin({buses:this.busService.listarTodos(),conductores:this.conductorService.listarTodos(),rutas:this.rutaService.listar(),viaje:this.editando&&this.viajeId?this.viajeService.obtenerPorId(this.viajeId):of(null)}).subscribe({
      next:data=>{
        this.buses=data.buses;this.conductores=data.conductores;this.rutas=data.rutas;
        if(data.viaje){this.originalBus=data.viaje.bus;this.originalRoute=data.viaje.ruta;this.form.patchValue({...data.viaje,fecha_hora_inicio:this.localDate(data.viaje.fecha_hora_inicio),fecha_hora_fin:data.viaje.fecha_hora_fin?this.localDate(data.viaje.fecha_hora_fin):''});}
        this.loading=false;
      },error:()=>{this.loading=false;this.loadFailed=true;this.error='No se pudieron cargar las rutas, unidades, conductores o datos del viaje.';}
    });
  }
  guardar():void{
    if(this.loading||this.loadFailed||this.success)return;
    this.form.markAllAsTouched();if(this.form.invalid)return;
    const v=this.form.getRawValue();
    if(!this.eligibleBuses.some(bus=>bus.id===Number(v.bus))||!this.conductores.some(driver=>driver.id===Number(v.conductor))||!this.eligibleRoutes.some(route=>route.id===Number(v.ruta))){this.error='Selecciona una ruta, un bus y un conductor existentes en los catálogos.';return;}
    this.loading=true;this.error='';
    const viaje:Viaje={bus:Number(v.bus),conductor:Number(v.conductor),ruta:Number(v.ruta),fecha_hora_inicio:bogotaIso(v.fecha_hora_inicio)!,fecha_hora_fin:v.fecha_hora_fin?bogotaIso(v.fecha_hora_fin):null,estado:v.estado};
    const request=this.editando&&this.viajeId?this.viajeService.actualizar(this.viajeId,viaje):this.viajeService.crear(viaje);
    request.subscribe({next:()=>{this.success=this.editando?'Viaje actualizado correctamente.':'Viaje creado correctamente.';this.router.navigateByUrl('/viajes').then(ok=>{this.loading=false;if(!ok)this.error='El viaje se guardó. Vuelve al listado para consultarlo.';}).catch(()=>{this.loading=false;this.error='El viaje se guardó. Vuelve al listado para consultarlo.';});},error:()=>{this.loading=false;this.error='No se pudo guardar el viaje. Revisa la asignación e inténtalo nuevamente.';}});
  }
  private localDate(value:string):string{const date=new Date(value);return Number.isFinite(date.getTime())?new Date(date.getTime()-5*3600000).toISOString().slice(0,16):'';}
}
