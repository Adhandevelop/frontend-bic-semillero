import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of, Subscription } from 'rxjs';
import { Ruta } from '../../core/models/ruta.model';
import { RutaService, PlaceDto } from '../../core/services/ruta.service';
import { RutaMapComponent } from './ruta-map.component';

export function differentTerminals(control: AbstractControl) {
  const { origen_id, destino_id } = control.value;
  return origen_id && destino_id && origen_id === destino_id ? { sameTerminal: true } : null;
}
@Component({selector:'app-ruta-form',standalone:true,imports:[CommonModule,ReactiveFormsModule,RouterLink,RutaMapComponent],templateUrl:'./ruta-form.component.html',styleUrl:'./ruta.component.css'})
export class RutaFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  loading=false; saving=false; loadFailed=false; error=''; editando=false; rutaId?:number;
  places:PlaceDto[]=[];
  previewRoute:Ruta|null=null;
  private changes?:Subscription;
  form=this.fb.group({
    origen_id:[null as number|null,Validators.required],
    destino_id:[null as number|null,Validators.required],
    distancia_km:[null as number|null,[Validators.required,Validators.min(0.01),Validators.max(999999.99),Validators.pattern(/^\d+(\.\d{1,2})?$/)]]
  },{validators:differentTerminals});
  constructor(private route:ActivatedRoute,private router:Router,private rutaService:RutaService){}
  ngOnInit():void {
    const raw=this.route.snapshot.paramMap.get('id');
    this.editando=raw!==null;
    if(raw!==null){const id=Number(raw);if(!Number.isInteger(id)||id<=0){this.loadFailed=true;this.error='El identificador de ruta no es válido.';return;}this.rutaId=id;}
    this.changes=this.form.valueChanges.subscribe(()=>this.updatePreview());
    this.cargar();
  }
  cargar():void {
    if(this.loading||this.saving)return;
    if(this.editando&&!this.rutaId)return;
    this.loading=true;this.error='';this.loadFailed=false;
    forkJoin({places:this.rutaService.listarLugares(),route:this.rutaId?this.rutaService.obtenerPorId(this.rutaId):of(null)}).subscribe({
      next:({places,route})=>{
        this.places=places;
        if(route)this.form.patchValue({origen_id:route.origen_id??null,destino_id:route.destino_id??null,distancia_km:route.distancia_km??null});
        this.loading=false;this.updatePreview();
      },
      error:()=>{this.loading=false;this.loadFailed=true;this.error='No se pudieron cargar las terminales o los datos de la ruta. Revisa tu sesión y conexión e intenta nuevamente.';}
    });
  }
  updatePreview():void {
    const value=this.form.getRawValue(),origin=this.places.find(p=>p.id===value.origen_id),destination=this.places.find(p=>p.id===value.destino_id);
    this.previewRoute=origin||destination?{origen:origin?.place_name??'Sin seleccionar',destino:destination?.place_name??'Sin seleccionar',origen_id:origin?.id,destino_id:destination?.id,origen_punto:origin?.place_point,destino_punto:destination?.place_point,distancia_km:value.distancia_km??undefined,estado:'activa'}:null;
  }
  intercambiar():void {
    if(this.loading||this.saving||this.loadFailed)return;
    const value=this.form.getRawValue();this.form.patchValue({origen_id:value.destino_id,destino_id:value.origen_id});
  }
  guardar():void {
    if(this.loading||this.saving||this.loadFailed)return;
    this.form.markAllAsTouched();
    if(this.form.invalid)return;
    const value=this.form.getRawValue(),origin=this.places.find(p=>p.id===value.origen_id),destination=this.places.find(p=>p.id===value.destino_id);
    if(!origin||!destination){this.error='Selecciona dos terminales del catálogo disponible.';return;}
    const payload:Ruta={origen:origin.place_name,destino:destination.place_name,origen_id:origin.id,destino_id:destination.id,distancia_km:value.distancia_km!,estado:'activa'};
    this.saving=true;this.error='';
    (this.editando&&this.rutaId?this.rutaService.actualizar(this.rutaId,payload):this.rutaService.crear(payload)).subscribe({
      next:()=>{void this.router.navigateByUrl('/rutas');},
      error:()=>{this.saving=false;this.error='No se pudo guardar la ruta. Revisa los datos y los permisos de tu cuenta e intenta nuevamente.';}
    });
  }
  ngOnDestroy():void{this.changes?.unsubscribe();}
}
