import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
export function allApiPages<T>(http:HttpClient,url:string):Observable<T[]> {
  type Page = T[] | {results:T[];next:string|null};
  return http.get<Page>(url).pipe(
    expand((page,index)=>!Array.isArray(page)&&page.next?http.get<Page>(url,{params:{page:index+2}}):EMPTY),
    map(page=>Array.isArray(page)?page:page.results),reduce((all,page)=>all.concat(page),[] as T[])
  );
}
