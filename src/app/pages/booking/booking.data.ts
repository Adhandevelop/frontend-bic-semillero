export interface DemoSeat {
  id: string;
  floor: number;
  position: 'Ventana' | 'Pasillo';
  occupied: boolean;
}

export interface DemoTrip {
  id: number;
  departure: string;
  arrival: string;
  service: string;
  bus: string;
  price: number;
  amenities: string[];
  seats: DemoSeat[];
}

function seats(floor: number, rows: number[], occupied: string[]): DemoSeat[] {
  return rows.flatMap(row => ['A', 'B', 'C', 'D'].map(letter => ({
    id: `${row}${letter}`, floor,
    position: letter === 'A' || letter === 'D' ? 'Ventana' as const : 'Pasillo' as const,
    occupied: occupied.includes(`${row}${letter}`)
  })));
}

// Local inventory for the preview. No seat holds or real availability.
export const BOOKING_TRIPS: DemoTrip[] = [
  { id: 1, departure: '08:30 AM', arrival: '04:45 PM', service: 'Universal Premier Doble Piso', bus: 'UNV-208', price: 85000,
    amenities: ['Wi-Fi 5G', 'Reclinable 160°', 'Pantalla TV', 'Tomacorriente', 'Baño'],
    seats: [...seats(1, [1, 2], ['1A', '1B', '1C', '1D', '2C', '2D']), ...seats(2, [11, 12, 14, 15], ['11A', '11B', '12C', '12D'])] },
  { id: 2, departure: '01:15 PM', arrival: '09:30 PM', service: 'Universal Ejecutivo', bus: 'UNV-202', price: 72000,
    amenities: ['Wi-Fi', 'Reclinable 140°', 'Baño'], seats: seats(1, [1, 2, 3], ['1A', '1B', '1C', '1D', '2A', '2B']) },
  { id: 3, departure: '10:00 PM', arrival: '06:15 AM (+1 día)', service: 'Universal Suite Cama', bus: 'UNV-305', price: 110000,
    amenities: ['Wi-Fi', 'Cama 180°', 'Manta', 'Tomacorriente'], seats: seats(1, [1, 2, 3], ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '2D']) }
];
