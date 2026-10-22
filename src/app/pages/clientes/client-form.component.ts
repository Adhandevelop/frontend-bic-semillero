import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClienteService } from '../../core/services/cliente.service';
const nonBlank=(c:AbstractControl)=>String(c.value??'').trim()?null:{blank:true};
@Component({selector:'app-client-form',standalone:true,imports:[CommonModule,ReactiveFormsModule,RouterLink],templateUrl:'./client-form.component.html',styleUrl:'./client-form.component.css'})
export class ClientFormComponent {
  private fb=inject(FormBuilder);saving=false;created=false;error='';fieldErrors:string[]=[];
  form=this.fb.nonNullable.group({
    identification_number:['',[Validators.required,Validators.maxLength(20),Validators.pattern(/^[A-Za-z0-9.-]+$/)]],
    first_name:['',[Validators.required,nonBlank,Validators.maxLength(150)]],last_name:['',[Validators.required,nonBlank,Validators.maxLength(150)]],
    telephone:['',[Validators.required,Validators.maxLength(20),Validators.pattern(/^\+?[0-9 ()-]{7,20}$/)]],
    email:['',[Validators.required,Validators.email,Validators.maxLength(50)]],
    username:['',[Validators.required,Validators.maxLength(150),Validators.pattern(/^[\w.@+-]+$/)]],
    password:['',[Validators.required,Validators.minLength(8)]],confirmation:['',Validators.required]
  },{validators:c=>c.value.password===c.value.confirmation?null:{passwordMismatch:true}});
  constructor(private service:ClienteService,private router:Router){}
  invalid(name:keyof typeof this.form.controls):boolean{const c=this.form.controls[name];return c.touched&&c.invalid;}
  guardar(continueToPurchase=false):void {
    if(this.saving||this.created)return;
    this.form.markAllAsTouched();if(this.form.invalid)return;
    this.saving=true;this.error='';this.fieldErrors=[];
    const {confirmation,...raw}=this.form.getRawValue();
    const payload={...raw,first_name:raw.first_name.trim(),last_name:raw.last_name.trim(),username:raw.username.trim(),email:raw.email.trim().toLowerCase(),telephone:raw.telephone.trim()};
    this.service.crear(payload).subscribe({next:(client)=>{this.created=true;this.saving=false;this.form.controls.password.reset();this.form.controls.confirmation.reset();void this.router.navigateByUrl(continueToPurchase?'/ventas/nueva?cliente='+client.id:'/clientes');},error:(err:{status?:number;error?:unknown})=>{
      this.saving=false;
      const status=err.status;
      this.error=status===0?'No se pudo conectar con la API. Revisa la conexión y la configuración de acceso al servidor.':status===401?'La sesión venció. Inicia sesión nuevamente.':status===403?'Tu cuenta no tiene permisos para registrar clientes.':status===400||status===422?'Revisa los datos indicados por el servidor.':status===404?'No se encontró el servicio de registro de clientes (HTTP 404).':status===409?'El registro entra en conflicto con una cuenta existente. Revisa documento, correo y usuario.':status!==undefined&&status>=500?'El servicio de cuentas presentó un error interno (HTTP '+status+'). Verifica si el cliente se creó antes de reintentar; este fallo requiere revisar el backend.':'No se pudo confirmar el registro del cliente. Verifica el directorio antes de reintentar.';
      if((status===400||status===422||status===409)&&err.error&&typeof err.error==='object'){
        const labels:Record<string,string>={username:'Usuario',password:'Contraseña',email:'Correo',identification_number:'Documento',first_name:'Nombres',last_name:'Apellidos',telephone:'Teléfono',non_field_errors:'Registro',detail:'Detalle'};
        this.fieldErrors=Object.entries(err.error).filter(([key])=>key in labels).map(([key,value])=>labels[key]+': '+(Array.isArray(value)?value.filter(v=>typeof v==='string').join(' '):typeof value==='string'?value:'Revisa este campo.'));
      }
    }});
  }
}


