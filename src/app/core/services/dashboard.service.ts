import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  listar<T>(resource: string): Observable<T[]> {
    type Page = T[] | { results: T[]; next: string | null };
    const url = `${API_BASE_URL}/${resource}/`;
    return this.http.get<Page>(url).pipe(
      expand((page, index) => !Array.isArray(page) && page.next
        ? this.http.get<Page>(url, { params: { page: index + 2 } }) : EMPTY),
      map(page => Array.isArray(page) ? page : page.results),
      reduce((all, page) => all.concat(page), [] as T[])
    );
  }
}
