import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PassengerProfile, PassengerSale, PassengerService, passengerError } from '../../core/services/passenger.service';
@Component({selector:'app-client-panel',standalone:true,imports:[CommonModule,ReactiveFormsModule,RouterLink],templateUrl:'./client-panel.component.html',styleUrl:'./client-panel.component.css'})
export class ClientPanelComponent implements OnInit {
  private fb=inject(FormBuilder);private api=inject(PassengerService);private router=inject(Router);
  editing=false;page=1;readonly pageSize=7;selectedSale:PassengerSale|null=null;
  get fullName():string{return this.profile?.name||[this.profile?.first_name,this.profile?.last_name].filter(Boolean).join(' ')||'Mi cuenta';}
  get initials():string{return this.fullName.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toLocaleUpperCase();}
  get pageCount():number{return Math.max(1,Math.ceil(this.history.length/this.pageSize));}
  get currentPage():number{return Math.min(this.page,this.pageCount);}
  get visibleHistory():PassengerSale[]{return this.history.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize);}
  get issuedTickets(){return this.history.filter(s=>s.status==='paid').flatMap(s=>(s.tickets??[]).filter(t=>t.status==='issued').map(ticket=>({ticket,sale:s})));}
  changePage(delta:number):void{this.page=Math.max(1,Math.min(this.pageCount,this.currentPage+delta));}
  editProfile():void{if(!this.profile||this.loading||this.saving)return;this.editing=true;this.resetForm();}
  cancelEdit():void{if(this.saving)return;this.editing=false;this.resetForm();}
  private resetForm():void{const p=this.profile;if(p)this.form.reset({name:p.name??[p.first_name,p.last_name].filter(Boolean).join(' '),email:p.email,telephone:p.telephone??''});}
  pending(action:string):void{this.message=action+': integración pendiente.';}
  profile:PassengerProfile|null=null;history:PassengerSale[]=[];loading=false;saving=false;historyLoading=false;error='';historyError='';message='';
  form=this.fb.nonNullable.group({name:['',[Validators.required,Validators.pattern(/\S/),Validators.maxLength(150)]],email:['',[Validators.required,Validators.email,Validators.maxLength(50)]],telephone:['',[Validators.required,Validators.pattern(/^\+?[0-9 ()-]{7,20}$/)]]});
  ngOnInit():void{this.loadProfile();this.loadHistory();}
  loadProfile():void{if(this.loading)return;this.loading=true;this.error='';this.api.me().subscribe({next:p=>{this.profile=p;this.form.patchValue({name:p.name??[p.first_name,p.last_name].filter(Boolean).join(' '),email:p.email,telephone:p.telephone??''});this.loading=false;},error:err=>{this.loading=false;this.error=passengerError(err);}});}
  loadHistory():void{if(this.historyLoading)return;this.historyLoading=true;this.historyError='';this.api.history().subscribe({next:items=>{this.history=[...items].sort((a,b)=>b.id-a.id);this.historyLoading=false;this.page=Math.min(this.page,this.pageCount);if(this.selectedSale)this.selectedSale=this.history.find(s=>s.id===this.selectedSale?.id)??null;},error:err=>{this.historyLoading=false;this.historyError=passengerError(err);}});}
  save():void{if(this.saving||this.loading||!this.profile)return;this.form.markAllAsTouched();if(this.form.invalid)return;this.saving=true;this.message='';this.error='';const v=this.form.getRawValue();this.api.update({name:v.name.trim(),email:v.email.trim().toLowerCase(),telephone:v.telephone.trim()}).subscribe({next:p=>{this.profile=p;this.saving=false;this.editing=false;this.resetForm();this.message='Información actualizada.';},error:err=>{this.saving=false;this.error=passengerError(err);}});}
  logout():void{this.api.logout();void this.router.navigateByUrl('/clientes/login');}
  status(value:string):string{return ({paid:'Pagada',pending:'Pendiente',failed:'Fallida',expired:'Expirada',cancelled:'Cancelada'} as Record<string,string>)[value]??value;}
  link(value?:string):string|null{try{const url=new URL(value??'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
}

