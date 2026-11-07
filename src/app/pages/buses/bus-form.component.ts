import { BusType, BusTypeService } from '../../core/services/bus-type.service';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Bus } from '../../core/models/bus.model';
import { BusService } from '../../core/services/bus.service';
import { GpsDevice, GpsDeviceService, deviceFailure } from '../../core/services/gps-device.service';
import { BusDeviceComponent } from '../../shared/bus-device/bus-device.component';
import { switchMap, timeout } from 'rxjs';

@Component({
  selector: 'app-bus-form', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, BusDeviceComponent],
  templateUrl: './bus-form.component.html', styleUrl: './bus.component.css'
})
export class BusFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly gpsApi=inject(GpsDeviceService);
  loadedBus:Bus|null=null;gpsDevices:GpsDevice[]=[];gpsLoading=false;gpsError='';
  loadGps():void{if(this.gpsLoading)return;this.gpsLoading=true;this.gpsError='';this.gpsApi.list({available:true}).pipe(timeout(20000)).subscribe({next:rows=>{this.gpsDevices=rows.filter(device=>device.bus===null);this.gpsLoading=false;},error:err=>{this.gpsLoading=false;this.gpsError=deviceFailure(err,'consultar los dispositivos disponibles');}});}
  loading = false;
  loadFailed = false;
  error = '';
  success = '';
  editando = false;
  busId?: number;
  types:BusType[]=[];typesLoading=false;typesError='';private originalType:BusType|null=null;
  get selectedType():BusType|undefined{return this.types.find(t=>t.id===this.form.controls.bus_type.value)??(this.originalType?.id===this.form.controls.bus_type.value?this.originalType:undefined);}
  loadTypes():void{if(this.typesLoading)return;this.typesLoading=true;this.typesError='';this.typeService.list().subscribe({next:types=>{this.types=types;this.typesLoading=false;this.form.updateValueAndValidity();},error:()=>{this.typesLoading=false;this.typesError='No se pudieron cargar los tipos de bus.';this.form.updateValueAndValidity();}});}

  readonly form = this.fb.nonNullable.group({
    bus_type:[null as number|null],
    gps_device_id:[null as number|null],
    plate: ['', [Validators.required, Validators.pattern(/\S/)]],
    capacity: [20, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    model: ['', [Validators.required, Validators.pattern(/\S/)]],
    state: ['Active' as Bus['state'], [Validators.required, Validators.pattern(/^(Active|Inactive|Maintenance)$/)]]
  },{validators:control=>{const id=control.get('bus_type')?.value;if(id===null)return null;const type=this.types.find(t=>t.id===id)??(this.originalType?.id===id?this.originalType:null);return !type?{unknownType:true}:Number(control.get('capacity')?.value)>type.max_capacity?{typeCapacity:true}:null;}});

  constructor(private route: ActivatedRoute, private router: Router, private busService: BusService,private typeService:BusTypeService) {}

  get progress(): number {
    const controls = this.form.controls;
    return Math.round([controls.plate, controls.model, controls.capacity, controls.state].filter(control => control.valid).length / 4 * 100);
  }

  get stateLabel(): string {
    return this.form.controls.state.value === 'Active' ? 'Activo' : this.form.controls.state.value === 'Inactive' ? 'Inactivo' : 'Mantenimiento';
  }

  invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  ngOnInit(): void {
    this.loadTypes();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) {
      this.editando = true;
      this.busId = id;
      this.cargarBus(id);
    }else this.loadGps();
  }

  cargarBus(id: number): void {
    if (this.loading) return;
    this.loading = true;
    this.loadFailed = false;
    this.error = '';
    this.busService.obtenerPorId(id).subscribe({
      next: bus => { this.loadedBus=bus;this.originalType=bus.bus_type_detail??null;this.form.patchValue({...bus,bus_type:bus.bus_type??null}); this.loading = false; },
      error: () => { this.error = 'No se pudo cargar el bus.'; this.loadFailed = true; this.loading = false; }
    });
  }

  guardar(): void {
    if (this.loading || this.typesLoading || this.loadFailed || this.success) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const values = this.form.getRawValue();
    const deviceId=!this.editando?values.gps_device_id:null;
    if(deviceId!==null&&(this.gpsLoading||!!this.gpsError||!this.gpsDevices.some(device=>device.id===deviceId&&device.bus===null))){this.error='Selecciona un GPS disponible confirmado por el catálogo o deja el bus sin dispositivo.';return;}
    this.loading = true;
    this.error = '';
    this.success = '';
    // Only fields supported by the current API.
    const bus: Bus = { plate: values.plate.trim(), model: values.model.trim(), capacity: values.capacity, state: values.state,...(values.bus_type!==null||this.editando?{bus_type:values.bus_type}:{}) };
    const request = this.editando && this.busId ? this.busService.actualizar(this.busId, bus) : this.busService.crear(bus);
    request.pipe(timeout(20000)).subscribe({
      next: saved => {
        if(!saved.id||!Number.isSafeInteger(saved.id)||saved.id<=0||(this.editando&&saved.id!==this.busId)){this.loading=false;this.loadFailed=true;this.error='La API no confirmó el bus guardado. Revisa el listado antes de volver a crearlo.';return;}
        this.loadedBus=saved;this.busId=saved.id;
        this.success = this.editando ? 'Bus actualizado correctamente.' : 'Bus creado correctamente.';
        this.editando=true;
        if(deviceId!==null){this.assignCreatedGps(saved.id,deviceId);return;}
        this.router.navigateByUrl('/buses').then(navigated => {
          this.loading = false;
          if (!navigated) this.error = 'El bus se guardó, pero no se pudo abrir la lista. Usa Volver al panel de flota.';
        }).catch(() => { this.loading = false; this.error = 'El bus se guardó. Vuelve al panel de flota para consultarlo.'; });
      },
      error: (err) => {this.loading=false;const fields=['plate','capacity','model','state','bus_type','detail','non_field_errors'];const messages=err.error&&typeof err.error==='object'?Object.entries(err.error).filter(([key])=>fields.includes(key)).flatMap(([,value])=>Array.isArray(value)?value:typeof value==='string'?[value]:[]):[];this.error=messages.filter(value=>typeof value==='string').join(' ')||'No se pudo guardar el bus'+(err.status?' (HTTP '+err.status+')':'')+'.';if(!err.status||err.status>=500){this.loadFailed=true;this.error+=' No se pudo confirmar el resultado. Revisa el listado antes de volver a registrar el bus.';}}
    });
  }
  private assignCreatedGps(busId:number,deviceId:number):void{
    this.gpsApi.assignToBus(busId,deviceId).pipe(timeout(20000),switchMap(()=>this.busService.obtenerPorId(busId).pipe(timeout(20000)))).subscribe({next:bus=>{
      this.loading=false;
      if(bus.id!==busId||bus.gps_device_detail?.id!==deviceId){this.error='El bus está creado, pero la API no confirmó su GPS. Actualiza la sección de dispositivo antes de reintentar.';return;}
      this.loadedBus=bus;this.success='Bus creado y dispositivo GPS asignado correctamente.';this.form.controls.gps_device_id.setValue(null);
    },error:err=>{this.loading=false;this.error='El bus #'+busId+' ya está creado. '+deviceFailure(err,'confirmar la asignación GPS')+' Actualiza la sección de dispositivo para comprobar el resultado. No registres el bus otra vez.';}});
  }
}

