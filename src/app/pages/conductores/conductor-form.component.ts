import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Conductor } from '../../core/models/conductor.model';
import { ConductorService } from '../../core/services/conductor.service';

@Component({selector:'app-conductor-form', standalone:true, imports:[CommonModule,ReactiveFormsModule,RouterLink], templateUrl:'./conductor-form.component.html', styleUrl:'./conductor.component.css'})
export class ConductorFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  readonly defaultImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuAJqTN7sHK_o4YEAaVbhH9H9EuHWyYT4bNG4oSl1owYqn4XVvEhr3Bnx64gPHXndQEbDKXwD6KWj0Tw-q8Ey412nyWtnIcs3SVZiU8HHPwXuB814kleKUJovZm2MaFN9ZCrVcc4bhRbkLZi6z_feXhs6C-UKLm6cwLyJ0sS9H2mmAAJ598TyDF87TxNoez2AblOUD08OCgzleqrNUz4N8We-_7wuFnvalcxVi30PtMc6Ypf-nytGBja";
  readonly certifications = ['Examen médico vigente','Prueba psicosensométrica','Antecedentes viales','Capacitación en primeros auxilios'];
  readonly selectedCertifications = new Set<string>();
  imageUrl = '';
  imageName = '';
  imageError = '';
  loading = false;
  loadFailed = false;
  error = '';
  fieldErrors:string[]=[];
  success = '';
  editando = false;
  conductorId?: number;
  readonly form = this.fb.nonNullable.group({
    full_name:['',[Validators.required,Validators.pattern(/\S/)]],
    user:[0,[Validators.required,Validators.min(1),Validators.pattern(/^\d+$/)]],
    license_number:['',[Validators.required,Validators.pattern(/\S/)]],
    address:['',[Validators.required,Validators.pattern(/\S/)]],
    phone_number:['',[Validators.required,Validators.pattern(/^\+?(?:[\s().-]*\d){7,15}[\s().-]*$/)]]
  });
  readonly preview = this.fb.nonNullable.group({documentType:['CC'],documentNumber:[''],birthday:[''],email:[''],category:['C3'],expiry:[''],experience:['4 a 7 años'],bloodGroup:[''],state:['Disponible']});

  constructor(private route:ActivatedRoute, private router:Router, private conductorService:ConductorService) {}
  get progress():number { return Math.round(Object.values(this.form.controls).filter(control=>control.valid).length / 5 * 100); }
  invalid(field:keyof typeof this.form.controls):boolean { const control=this.form.controls[field]; return control.touched && control.invalid; }
  ngOnInit():void {
    const id=Number(this.route.snapshot.paramMap.get('id'));
    if(Number.isInteger(id)&&id>0){this.editando=true;this.conductorId=id;this.cargarConductor(id);}
  }
  cargarConductor(id:number):void {
    if(this.loading)return;
    this.loading=true;this.loadFailed=false;this.error='';
    this.conductorService.obtenerPorId(id).subscribe({
      next:driver=>{this.form.patchValue(driver);this.loading=false;},
      error:()=>{this.error='No se pudo cargar el conductor.';this.loadFailed=true;this.loading=false;}
    });
  }
  selectImage(event:Event):void {
    const input=event.target as HTMLInputElement; const file=input.files?.[0];if(!file)return;
    this.imageError='';
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){this.imageError='Selecciona PNG, JPG o WEBP de hasta 5 MB.';input.value='';return;}
    this.removeImage();this.imageUrl=URL.createObjectURL(file);this.imageName=file.name;input.value='';
  }
  removeImage():void {if(this.imageUrl)URL.revokeObjectURL(this.imageUrl);this.imageUrl='';this.imageName='';}
  toggleCertification(name:string):void {
    if(this.loading||this.loadFailed)return;
    if(this.selectedCertifications.has(name))this.selectedCertifications.delete(name);else this.selectedCertifications.add(name);
  }
  guardar():void {
    if(this.loading||this.loadFailed||this.success)return;
    if(this.form.invalid){this.form.markAllAsTouched();return;}
    this.loading=true;this.error='';this.fieldErrors=[];
    const values=this.form.getRawValue();
    const driver:Conductor={full_name:values.full_name.trim(),user:Number(values.user),license_number:values.license_number.trim(),address:values.address.trim(),phone_number:values.phone_number.trim()};
    const request=this.editando&&this.conductorId?this.conductorService.actualizar(this.conductorId,driver):this.conductorService.crear(driver);
    request.subscribe({next:()=>{
      this.success=this.editando?'Conductor actualizado correctamente.':'Conductor creado correctamente.';
      this.router.navigateByUrl('/conductores').then(navigated=>{this.loading=false;if(!navigated)this.error='El conductor se guardó. Vuelve al panel para consultarlo.';}).catch(()=>{this.loading=false;this.error='El conductor se guardó. Vuelve al panel para consultarlo.';});
    },error:(err:{status?:number;error?:unknown})=>{
      this.loading=false;
      this.error=err.status===400||err.status===422?'El servidor rechazó los datos del conductor (HTTP '+err.status+'). Revisa los motivos indicados.':err.status===401?'La sesión venció. Inicia sesión nuevamente.':err.status===403?'Tu cuenta no tiene permisos para guardar conductores.':err.status===0?'No se pudo conectar con la API.':err.status===404?'No se encontró el servicio o el conductor (HTTP 404).':err.status&&err.status>=500?'El servicio de conductores presentó un error interno (HTTP '+err.status+').':'No se pudo confirmar el guardado del conductor.';
      const labels:Record<string,string>={full_name:'Nombre completo',user:'Usuario asociado',license_number:'Licencia',address:'Dirección',phone_number:'Teléfono',detail:'Detalle',non_field_errors:'Registro'};
      this.fieldErrors=[];
      if(err.error&&typeof err.error==='object')for(const [key,value] of Object.entries(err.error)){
        if(!(key in labels))continue;
        const messages=Array.isArray(value)?value:typeof value==='string'?[value]:[];
        for(const message of messages)if(typeof message==='string')this.fieldErrors.push(labels[key]+': '+message);
        if(key in this.form.controls)this.form.get(key)?.markAsTouched();
      }
      if(!this.fieldErrors.length)this.fieldErrors=['La API no devolvió un motivo de validación detallado.'];
      console.error('[Conductores] Fallo al guardar',{operation:this.editando?'editar':'crear',httpStatus:err.status??null,invalidFields:err.error&&typeof err.error==='object'?Object.keys(err.error).filter(key=>key in labels):[]});
    }});
  }
  ngOnDestroy():void {this.removeImage();}
}

