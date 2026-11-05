import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil, timeout } from 'rxjs';
import { PassengerService, passengerError } from '../../core/services/passenger.service';
@Component({standalone:true,imports:[CommonModule,ReactiveFormsModule,RouterLink],templateUrl:'./client-security.component.html',styleUrl:'./client-security.component.css'})
export class ClientSecurityComponent implements OnDestroy {
  private api=inject(PassengerService);private route=inject(ActivatedRoute);private fb=inject(FormBuilder);
  readonly action=this.route.snapshot.data['action'] as 'reset-request'|'reset-confirm'|'activation-request'|'activation-confirm'|'change';
  readonly requesting=this.action.endsWith('request');readonly changing=this.action==='change';
  readonly required=this.changing&&this.api.mustChangePassword();
  readonly title=this.action==='reset-request'?'Recuperar contraseña':this.action==='activation-request'?'Solicitar activación':this.changing?'Cambiar contraseña':this.action==='activation-confirm'?'Activar mi cuenta':'Restablecer contraseña';
  private destroyed=new Subject<void>();private token='';busy=false;error='';success='';showPassword=false;cooldown=0;private timer?:ReturnType<typeof setInterval>;
  form=this.fb.nonNullable.group({email:[{value:'',disabled:!this.requesting},[Validators.required,Validators.email]],current:[{value:'',disabled:!this.changing},Validators.required],password:[{value:'',disabled:this.requesting},[Validators.required,Validators.minLength(8)]],confirm:[{value:'',disabled:this.requesting},Validators.required]},{validators:group=>!this.requesting&&group.get('password')?.value!==group.get('confirm')?.value?{mismatch:true}:null});
  constructor(){
    if(!this.requesting&&!this.changing){
      this.token=new URLSearchParams(this.route.snapshot.fragment??'').get('token')??'';
      window.history.replaceState(window.history.state,'',location.pathname+location.search);
      if(!this.token)this.error='El enlace está incompleto. Solicita uno nuevo.';
    }
  }
  submit():void{
    if(this.busy||this.success&&!this.requesting||this.cooldown)return;
    this.form.markAllAsTouched();if(this.form.invalid){this.error='Revisa los campos. Las contraseñas deben coincidir y tener al menos 8 caracteres.';return;}
    if(!this.requesting&&!this.changing&&!this.token){this.error='Solicita un enlace nuevo para continuar.';return;}
    this.busy=true;this.error='';this.success='';const v=this.form.getRawValue();
    const request=this.action==='reset-request'?this.api.requestReset(v.email.trim()):this.action==='activation-request'?this.api.requestActivation(v.email.trim()):this.changing?this.api.changePassword(v.current,v.password):this.action==='reset-confirm'?this.api.confirmReset(this.token,v.password):this.api.confirmActivation(this.token,v.password);
    request.pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:()=>{
      this.busy=false;this.form.controls.current.reset();this.form.controls.password.reset();this.form.controls.confirm.reset();
      if(this.requesting){this.success=this.action==='reset-request'?'Si existe una cuenta asociada, recibirás las instrucciones. Revisa también el correo no deseado.':'Si corresponde habilitar esta cuenta, recibirás las instrucciones.';this.cooldown=60;this.timer=setInterval(()=>{if(--this.cooldown<=0&&this.timer){clearInterval(this.timer);this.timer=undefined;}},1000);}
      else{this.token='';this.api.logout();this.success=this.action==='activation-confirm'?'Tu cuenta está habilitada. Inicia sesión.':'Contraseña actualizada. Inicia sesión con tu nueva contraseña.';}
    },error:err=>{this.busy=false;this.form.controls.current.reset();this.form.controls.password.reset();this.form.controls.confirm.reset();this.error=err.error?.code==='invalid_or_expired_token'?'El enlace no es válido o ha vencido. Solicita uno nuevo.':passengerError(err);}});
  }
  logout():void{this.api.logout();window.location.assign('/clientes/login');}
  ngOnDestroy():void{this.destroyed.next();this.destroyed.complete();if(this.timer)clearInterval(this.timer);this.token='';this.form.reset();}
}
