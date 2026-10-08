export interface CityItem {
  id: string;
  providerCityId: number;
  name: string;
}

export interface BoardingPoint {
  PickupCode: string;
  PickupName: string;
  Address: string;
  Landmark?: string;
  Contact?: string;
  PickupTime: string;
}

export interface DroppingPoint {
  DropoffCode: string;
  DropoffName: string;
  DropoffTime: string;
}

export interface CancellationSlab {
  Mins: number;
  Pct: number;
  Amt: number;
}

export interface BusSearchResultItem {
  RouteBusId: number;
  CompanyId: number;
  CompanyName: string;
  BusTypeName: string;
  DepartureTime: string;
  ArrivalTime: string;
  TripId: string;
  ChartCode: string;
  TotalSeats: number;
  AvailableSeats: number;
  BaseFare: number;
  TotalFare: number;
  ServiceTax: number;
  IsAC: boolean;
  IsSleeper: boolean;
  BoardingPoints: BoardingPoint[];
  DroppingPoints: DroppingPoint[];
  CancellationPolicy?: CancellationSlab[];
}

export interface SeatLayoutItem {
  seq_no: number;
  seat_no: string;
  seat_type: number; // 1: Seating, 2: Sleeper, 4: Semi-Sleeper
  deck: number; // 1: Lower Deck, 2: Upper Deck
  row: number;
  column: number;
  length: number;
  width: number;
  seat_status: number; // 0: Not available, 1: Available, 2: Male, 3: Female, -2: Booked by M, -3: Booked by F
  base_fare: number;
  total_fare: number;
  service_tax: number;
}

export interface SeatChartResponseData {
  BusId: number;
  BusTypeName: string;
  CompanyName: string;
  DepartureTime: string;
  ArrivalTime: string;
  TotalSeats: number;
  AvailableSeats: number;
  Layout: SeatLayoutItem[];
  BoardingPoints: BoardingPoint[];
  DroppingPoints: DroppingPoint[];
  CancellationPolicy: CancellationSlab[];
}

export interface BookingResponseData {
  id: string;
  userId?: string | null;
  bookingNumber: string;
  status: string;
  fromCityName: string;
  toCityName: string;
  journeyDate: string;
  operatorName: string;
  busType: string;
  totalFare: string | number;
  baseFare: string | number;
  serviceTax: string | number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  providerTicketNo?: string | null;
  providerPnrNo?: string | null;
  confirmedAt?: string | null;
  pickupLocation?: string;
  pickupTime?: string;
  dropoffLocation?: string;
  dropoffTime?: string;
  seats: Array<{
    id: string;
    seatNo: string;
    seatTypeId: number;
    fareTotal: string | number;
  }>;
  passengers: Array<{
    id: string;
    name: string;
    age: number;
    gender: 'M' | 'F';
    seatNo: string;
    fare: string | number;
  }>;
  ticket?: {
    ticketNumber: string;
    pnrNumber: string;
    status: string;
  };
}

export interface TicketResponseData {
  id: string;
  bookingId: string;
  ticketNumber: string;
  pnrNumber: string;
  status: string;
  pdfUrl?: string | null;
  generatedAt: string;
  booking: BookingResponseData;
}
