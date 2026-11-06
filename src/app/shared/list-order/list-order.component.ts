import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { ListOrder } from '../../core/utils/list-order';
@Component({selector:'app-list-order',standalone:true,template:`<button type="button" (click)="orderChange.emit(order === 'desc' ? 'asc' : 'desc')" [attr.aria-label]="'Cambiar orden. Actual: ' + (order === 'desc' ? 'más recientes primero' : 'más antiguos primero')" title="Orden de registro: fecha de creación cuando está disponible; en caso contrario, ID"><span aria-hidden="true">{{ order === 'desc' ? '↓' : '↑' }}</span> Orden: {{ order === 'desc' ? 'Más recientes' : 'Más antiguos' }}</button>`,styles:[`:host{display:inline-block;margin:10px 0}button{display:flex;align-items:center;gap:8px;min-height:44px;padding:10px 14px;background:#edf4ff;color:#0759b7;border:1px solid #c9daf2;border-radius:8px;font:inherit;font-size:12px;cursor:pointer}button:focus-visible{outline:3px solid #3982d3;outline-offset:3px}`]})
export class ListOrderComponent {
  @Input() order:ListOrder='desc';
  @Output() orderChange=new EventEmitter<ListOrder>();
}
