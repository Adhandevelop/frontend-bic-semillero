import { BusLocationCollection } from '../models/bus-location.model';
// Fixed positions, independent of the GPS device and database.
export const BUS_LOCATIONS_MOCK: BusLocationCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.0841, 4.6982] },
      properties: { id: 1042, unit: '1042', plate: 'WTL-402', driver: 'Carlos Restrepo' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.0616, 4.7545] },
      properties: { id: 1043, unit: '1043', plate: 'WTL-403', driver: 'Ana Martínez' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-74.115, 4.665] },
      properties: { id: 1044, unit: '1044', plate: 'WTL-404', driver: 'Luis Rodríguez' } }
  ]
};
