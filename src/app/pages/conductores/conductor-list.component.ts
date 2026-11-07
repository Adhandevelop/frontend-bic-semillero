import { DriverStatusComponent } from '../../shared/driver-status/driver-status.component';
import { fleetError } from '../../core/utils/fleet-error';
import { timeout } from 'rxjs';
import { ListOrder, orderRecords } from '../../core/utils/list-order';
import { ListOrderComponent } from '../../shared/list-order/list-order.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Conductor } from '../../core/models/conductor.model';
import { ConductorService } from '../../core/services/conductor.service';

@Component({
  selector: 'app-conductor-list', standalone: true,
  imports:[DriverStatusComponent,ListOrderComponent,CommonModule, FormsModule, RouterLink],
  templateUrl: './conductor-list.component.html', styleUrl: './conductor-list.component.css'
})
export class ConductorListComponent implements OnInit {
  listOrder:ListOrder='desc';
  conductores: Conductor[] = [];
  loading = false;
  loadFailed = false;
  error = '';
  success = '';
  searchValue = '';
  contactFilter = '';
  activeFilter='';licenseFilter='';
  get activeCount(){return this.conductores.filter(d=>d.is_active===true).length;}
  get inactiveCount(){return this.conductores.filter(d=>d.is_active===false).length;}
  updateDriver(driver:Conductor):void{this.conductores=this.conductores.map(d=>d.id===driver.id?driver:d);this.page=Math.min(this.page,this.pageCount);}
  view: 'table' | 'grid' = 'table';
  page = 1;
  readonly pageSize = 7;
  deletingId: number | null = null;

  constructor(private conductorService: ConductorService) {}
  ngOnInit(): void { this.cargarConductores(); }
  get withPhone(): number { return this.conductores.filter(driver => driver.phone_number?.trim()).length; }
  get withLicense(): number { return this.conductores.filter(driver => driver.license_number?.trim()).length; }
  get withAddress(): number { return this.conductores.filter(driver => driver.address?.trim()).length; }
  get filteredDrivers(): Conductor[] {
    const query = this.searchValue.trim().toLocaleLowerCase();
    return orderRecords(this.conductores.filter(driver => (!query || [driver.full_name, driver.license_number, driver.id, driver.phone_number].join(' ').toLocaleLowerCase().includes(query)) &&
      (!this.activeFilter||(this.activeFilter==='active'?driver.is_active===true:this.activeFilter==='inactive'?driver.is_active===false:typeof driver.is_active!=='boolean')) && (!this.licenseFilter.trim()||driver.license_number===this.licenseFilter.trim()) && (!this.contactFilter || (this.contactFilter === 'with' ? Boolean(driver.phone_number?.trim()) : !driver.phone_number?.trim()))),this.listOrder);
  }
  get pageCount(): number { return Math.max(1, Math.ceil(this.filteredDrivers.length / this.pageSize)); }
  get currentPage(): number { return Math.min(this.page, this.pageCount); }
  get visibleDrivers(): Conductor[] { return this.filteredDrivers.slice((this.currentPage - 1) * this.pageSize, this.currentPage * this.pageSize); }
  get firstResult(): number { return this.filteredDrivers.length ? (this.currentPage - 1) * this.pageSize + 1 : 0; }
  get lastResult(): number { return Math.min(this.currentPage * this.pageSize, this.filteredDrivers.length); }
  clearFilters(): void { this.searchValue = ''; this.contactFilter = '';this.activeFilter='';this.licenseFilter=''; this.page = 1; }
  changePage(delta: number): void { this.page = Math.max(1, Math.min(this.pageCount, this.currentPage + delta)); }
  initials(name: string): string { return name.trim().split(/\s+/).slice(0, 2).map(word => word[0] ?? '').join('').toLocaleUpperCase() || '?'; }
  phoneLink(phone: string): string | null {
    const normalized = phone.trim().replace(/[\s().-]/g, '');
    return /^\+?\d{7,15}$/.test(normalized) ? 'tel:' + normalized : null;
  }

  cargarConductores(): void {
    if (this.loading) return;
    this.loading = true; this.loadFailed = false; this.error = '';
    this.conductorService.listarTodos().subscribe({
      next: drivers => { this.conductores = drivers; this.page = Math.min(this.page, this.pageCount); this.loading = false; },
      error: () => { this.conductores = []; this.error = 'No se pudieron cargar los conductores.'; this.loadFailed = true; this.loading = false; }
    });
  }
  eliminarConductor(driver: Conductor): void {
    if (this.loading || this.deletingId !== null || !driver.id || !confirm('¿Eliminar el conductor ' + driver.full_name + '?')) return;
    this.deletingId = driver.id; this.error = ''; this.success = '';
    this.conductorService.eliminar(driver.id).pipe(timeout(20000)).subscribe({
      next: () => { this.deletingId = null; this.success = 'Conductor eliminado correctamente.'; this.cargarConductores(); },
      error: err => { this.deletingId = null; this.error = fleetError(err,'eliminar el conductor'); }
    });
  }
  exportCsv(): void {
    if (this.loading || this.loadFailed || !this.filteredDrivers.length) return;
    const rows = [['ID', 'Nombre', 'Licencia', 'Direccion', 'Telefono', 'Estado'], ...this.filteredDrivers.map(driver =>
      [String(driver.id ?? ''), driver.full_name, driver.license_number, driver.address ?? '', driver.phone_number ?? '',driver.is_active===true?'Activo':driver.is_active===false?'Inactivo':'No informado'])];
    const csv = rows.map(row => row.map(value => {
      const safe = /^[=+@\-\t\r\n]/.test(value) ? "'" + value : value;
      return '"' + safe.replace(/"/g, '""') + '"';
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], {type: 'text/csv;charset=utf-8;'}));
    const link = document.createElement('a'); link.href = url; link.download = 'conductores.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
