import { MonitoredTrip } from './monitoring.model';
// All telemetry here is fictitious. No database IDs or real device readings.
function sampleTrip(id:string,unit:string,plate:string,origin:string,destination:string,capacity:number,coordinates:number[][],seed:number):MonitoredTrip {
  const gps=coordinates.map((position,index)=>({type:'Feature' as const,geometry:{type:'Point' as const,coordinates:position},properties:{id:index+1,trip:id,time_stamp:new Date(Date.UTC(2026,10,5,13,index)).toISOString(),speed:index===0||index===coordinates.length-1?0:18+(index*7+seed)%22}}));
  const readings=gps.flatMap((point,index)=>Array.from({length:capacity},(_,seat)=>seat+1).filter(seat=>seat!==capacity-1&&!(index>=5&&(seat===5||seat===capacity))).map(seat=>({id:index*capacity+seat,trip:id,seat,time_stamp:point.properties.time_stamp,occupied:(seat+index*2+seed)%7<3})));
  return {id,unit,plate,origin,destination,capacity,device:'SIM-'+unit,gps,readings};
}
export const ADMIN_MONITORING_DEMO:MonitoredTrip[]=[
  sampleTrip('DEMO-V01','01','DEMO-101','Terminal Salitre (muestra)','Zona norte de Bogotá (muestra)',24,[[-74.1168,4.6533],[-74.1144,4.6588],[-74.1114,4.6654],[-74.1085,4.6723],[-74.1051,4.6795],[-74.1009,4.6867],[-74.0965,4.6939],[-74.0921,4.7012]],1),
  sampleTrip('DEMO-V02','02','DEMO-102','Zona norte de Bogotá (muestra)','Sector Suba (muestra)',20,[[-74.0654,4.7037],[-74.0672,4.7089],[-74.0699,4.7141],[-74.0735,4.7194],[-74.0782,4.7241],[-74.0837,4.7289],[-74.0894,4.7333],[-74.0954,4.7372]],3),
  sampleTrip('DEMO-V03','03','DEMO-103','Zona occidental (muestra)','Centro de Bogotá (muestra)',16,[[-74.1301,4.6432],[-74.1247,4.6419],[-74.1192,4.6405],[-74.1136,4.6392],[-74.1082,4.6379],[-74.1024,4.6367],[-74.0965,4.6354],[-74.0906,4.6342]],5)
];
