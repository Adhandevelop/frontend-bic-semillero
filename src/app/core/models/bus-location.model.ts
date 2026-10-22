import type { FeatureCollection, Point } from 'geojson';
export interface BusLocationProperties {
  id: number;
  unit: string;
  plate: string;
  driver: string;
}
// WGS84 / SRID 4326: coordinates are [longitude, latitude].
// Each geometry can be serialized from the backend PointField.
export type BusLocationCollection = FeatureCollection<Point, BusLocationProperties>;
