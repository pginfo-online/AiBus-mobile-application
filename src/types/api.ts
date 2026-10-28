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
  Address?: string;
  Landmark?: string;
  Contact?: string;
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
  TotalSeats: number;
  AvailableSeats: number;
  Layout: SeatLayoutItem[];
  BoardingPoints: BoardingPoint[];
  DroppingPoints: DroppingPoint[];
  CancellationPolicy: CancellationSlab[];
  BusTypeName?: string;
  CompanyName?: string;
  DepartureTime?: string;
  ArrivalTime?: string;
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
  cancelledAt?: string | null;
  cancellationPolicy?: any;
  pickupSnapshot?: any;
  dropoffSnapshot?: any;
  cancellations?: {
    id: string;
    status: string;
    refundAmount: string | number;
    chargeAmt: string | number;
    seatNos: string[];
    createdAt: string;
  }[];
  refunds?: {
    id: string;
    amount: string | number;
    status: string;
    destination: string;
    completedAt?: string | null;
  }[];
  seats: {
    id: string;
    seatNo: string;
    seatTypeId: number;
    fareTotal: string | number;
  }[];
  passengers: {
    id: string;
    name: string;
    age: number;
    gender: 'M' | 'F';
    seatNo: string;
    fare: string | number;
  }[];
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

export interface CancellationCheckResponse {
  bookingId: string;
  bookingNumber: string;
  ticketNo?: string;
  pnrNo?: string;
  seatNos: string;
  IsCancellable: boolean;
  RefundPercentage?: number;
  CancellationCharge?: number;
  RefundAmount?: number;
  Message?: string;
}

export interface CancellationResultResponse {
  cancellation: {
    id: string;
    bookingId: string;
    status: string;
    seatNos: string[];
    chargePct: number;
    chargeAmt: number;
    refundAmount: number;
    totalFare: number;
    reason?: string;
  };
  refund: {
    id: string;
    bookingId: string;
    amount: number;
    status: string;
    destination: string;
  };
  walletCredited?: boolean;
  newWalletBalance?: number | null;
}

export interface WalletTransactionItem {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'REFUND' | 'REVERSAL';
  amount: number;
  balanceAfter: number;
  referenceType: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface WalletResponseData {
  walletBalance: number;
  transactions: WalletTransactionItem[];
}

export interface CouponItem {
  id: string;
  code: string;
  category: string;
  title: string;
  subtitle: string;
  type: 'FLAT' | 'PERCENTAGE';
  value: number;
  maxDiscount?: number | null;
  minOrderValue?: number | null;
  discountBadge: string;
  validUntil: string;
  formattedExpiry: string;
  description: string;
  termsAndConditions: string[];
  bannerImageUrl?: string;
}

export interface ValidateCouponPayload {
  code: string;
  totalFare: number;
  busId?: number;
  operatorName?: string;
  fromCityId?: number;
  toCityId?: number;
}

export interface ValidateCouponResponse {
  valid: boolean;
  coupon: CouponItem;
  discountAmount: number;
  originalFare: number;
  finalPayableAmount: number;
  message?: string;
}

export interface AppliedCoupon {
  code: string;
  title: string;
  discountAmount: number;
  coupon: CouponItem;
}


