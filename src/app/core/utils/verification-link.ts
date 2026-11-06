export type VerificationKind='ticket'|'card';
export interface VerificationLink {kind:VerificationKind;path:string;token:string;}
export function parseVerificationLink(value:string,origin:string):VerificationLink {
  if(value.length>4096)throw new Error('El QR es demasiado largo.');
  let url:URL;try{url=new URL(value.trim(),origin);}catch{throw new Error('Introduce un enlace de verificación válido.');}
  if(!['http:','https:'].includes(url.protocol)||url.host!==new URL(origin).host||url.username||url.password)throw new Error('El QR debe ser un enlace de verificación de este portal.');
  const paths:Record<string,VerificationKind>={'/api/sales/tickets/verify/':'ticket','/api/accounts/cards/verify/':'card','/verificar/boleta':'ticket','/verificar/carne':'card'};
  const kind=paths[url.pathname];const publicPage=url.pathname.startsWith('/verificar/');
  const params=publicPage?new URLSearchParams(url.hash.slice(1)):url.searchParams;const token=params.get('token');
  if(!kind||!token?.trim()||params.getAll('token').length!==1||(!publicPage&&url.hash)||(publicPage&&url.search))throw new Error('El QR debe ser un enlace de verificación de este portal.');
  return {kind,path:kind==='ticket'?'/api/sales/tickets/verify/':'/api/accounts/cards/verify/',token};
}
export function publicVerificationUrl(value:string,origin:string,sessionToken:string|null):string {
  const parsed=parseVerificationLink(value,origin);
  if(parsed.token===sessionToken)throw new Error('No se puede usar el token de sesión en un QR.');
  const url=new URL(parsed.kind==='ticket'?'/verificar/boleta':'/verificar/carne',origin);
  url.hash=new URLSearchParams({token:parsed.token}).toString();return url.href;
}
