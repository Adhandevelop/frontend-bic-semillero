// Demonstration data only. Replace with the authenticated passenger API later.
export const PASSENGER_DEMO = {
  name: 'Carlos Eduardo Gómez Silva',
  shortName: 'Carlos E. Gómez',
  document: 'C.C. 1.020.458.932',
  email: 'carlos.gomez@example.com',
  phone: '+57 312 458 9980',
  birthday: '14 mayo 1988',
  gender: 'Masculino',
  emergencyName: 'Andrea Gómez (Hermana)',
  emergencyPhone: '+57 310 987 6543',
  points: 2450,
  pointsValue: 24500,
  tripCount: 18,
  savings: 145000,
  balance: 32000
};

export const NEXT_TRIP_DEMO = {
  reservation: 'BU-89214',
  origin: 'Bogotá D.C.',
  destination: 'Medellín',
  date: '23 oct 2026',
  departure: '08:30 AM',
  arrival: '05:45 PM',
  boarding: '08:00 AM · Sala 3',
  duration: '9 h 15 min',
  bus: 'UNV-208',
  service: 'Premier Doble Piso',
  seat: '14A · Piso 2',
  seatDetail: 'Panorámico (Ventana)'
};

export const TRIP_HISTORY_DEMO = [
  { id: 'BU-88001', route: 'Medellín → Bogotá D.C.', date: '12 sep 2026 · 09:00 PM', bus: 'UNV-114', service: 'Suite Royal 180°', seat: '04 (Piso 1)', amount: 110000 },
  { id: 'BU-87002', route: 'Cali → Bogotá D.C.', date: '28 ago 2026 · 07:30 AM', bus: 'UNV-202', service: 'Premier Doble Piso', seat: '12B (Piso 2)', amount: 95000 },
  { id: 'BU-86003', route: 'Bogotá D.C. → Bucaramanga', date: '15 jul 2026 · 10:15 PM', bus: 'UNV-305', service: 'Línea Confort Plus', seat: '21A (Ventana)', amount: 85000 }
];
