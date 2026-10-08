import { create } from 'zustand';

export interface CitySelection {
  id: string;
  providerCityId: number;
  name: string;
}

export interface BoardingDroppingPoint {
  code: string;
  name: string;
  time: string;
  address?: string;
  landmark?: string;
  contact?: string;
}

export interface SelectedSeatItem {
  seqNo: number;
  seatNo: string;
  seatType: number;
  deck: number;
  fare: number;
  baseFare: number;
  tax: number;
}

export interface PassengerItem {
  seatNo: string;
  seatTypeId: number;
  fare: number;
  gender: 'M' | 'F';
  age: number;
  name: string;
  isAcSeat: boolean;
}

export interface HoldDetails {
  id: string;
  providerHoldId: string;
  expiresAt: string;
  ttlSeconds: number;
  totalFare: number;
}

interface BookingFlowState {
  // Search parameters
  fromCity: CitySelection;
  toCity: CitySelection;
  journeyDate: string; // YYYY-MM-DD

  // Selection during booking flow
  selectedBus: any | null;
  selectedSeats: SelectedSeatItem[];
  selectedBoardingPoint: BoardingDroppingPoint | null;
  selectedDroppingPoint: BoardingDroppingPoint | null;
  passengers: PassengerItem[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  gstin?: string;
  gstCompany?: string;

  // Active Hold & Transaction
  activeHold: HoldDetails | null;
  activeBookingId: string | null;
  activeBookingNumber: string | null;

  // Actions
  setFromCity: (city: CitySelection) => void;
  setToCity: (city: CitySelection) => void;
  setJourneyDate: (date: string) => void;
  swapCities: () => void;
  setSelectedBus: (bus: any) => void;
  toggleSeat: (seat: SelectedSeatItem) => boolean;
  clearSeats: () => void;
  setSelectedBoardingPoint: (point: BoardingDroppingPoint | null) => void;
  setSelectedDroppingPoint: (point: BoardingDroppingPoint | null) => void;
  setPassengers: (passengers: PassengerItem[]) => void;
  updatePassenger: (index: number, passenger: PassengerItem) => void;
  setContactInfo: (contact: { name: string; email: string; phone: string }) => void;
  setGstDetails: (gstin?: string, gstCompany?: string) => void;
  setActiveHold: (hold: HoldDetails | null) => void;
  setActiveBooking: (bookingId: string | null, bookingNumber: string | null) => void;
  resetBookingFlow: () => void;
}

// Default popular Indian routes: Mumbai to Pune
const DEFAULT_FROM_CITY: CitySelection = {
  id: 'c-mum',
  providerCityId: 101,
  name: 'Mumbai',
};

const DEFAULT_TO_CITY: CitySelection = {
  id: 'c-pun',
  providerCityId: 102,
  name: 'Pune',
};

const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useBookingStore = create<BookingFlowState>((set, get) => ({
  fromCity: DEFAULT_FROM_CITY,
  toCity: DEFAULT_TO_CITY,
  journeyDate: getTodayString(),

  selectedBus: null,
  selectedSeats: [],
  selectedBoardingPoint: null,
  selectedDroppingPoint: null,
  passengers: [],
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  gstin: undefined,
  gstCompany: undefined,

  activeHold: null,
  activeBookingId: null,
  activeBookingNumber: null,

  setFromCity: (city) => set({ fromCity: city }),
  setToCity: (city) => set({ toCity: city }),
  setJourneyDate: (date) => set({ journeyDate: date }),

  swapCities: () => {
    const { fromCity, toCity } = get();
    set({
      fromCity: toCity,
      toCity: fromCity,
    });
  },

  setSelectedBus: (bus) =>
    set({
      selectedBus: bus,
      selectedSeats: [],
      selectedBoardingPoint: null,
      selectedDroppingPoint: null,
      passengers: [],
      activeHold: null,
    }),

  toggleSeat: (seat) => {
    const { selectedSeats } = get();
    const existingIndex = selectedSeats.findIndex((s) => s.seatNo === seat.seatNo);

    if (existingIndex >= 0) {
      // Remove seat
      const updated = selectedSeats.filter((s) => s.seatNo !== seat.seatNo);
      set({ selectedSeats: updated });
      return true;
    } else {
      // Max 6 seats limit
      if (selectedSeats.length >= 6) {
        return false;
      }
      set({ selectedSeats: [...selectedSeats, seat] });
      return true;
    }
  },

  clearSeats: () => set({ selectedSeats: [] }),

  setSelectedBoardingPoint: (point) => set({ selectedBoardingPoint: point }),
  setSelectedDroppingPoint: (point) => set({ selectedDroppingPoint: point }),

  setPassengers: (passengers) => set({ passengers }),

  updatePassenger: (index, passenger) => {
    const passengers = [...get().passengers];
    passengers[index] = passenger;
    set({ passengers });
  },

  setContactInfo: ({ name, email, phone }) =>
    set({
      contactName: name,
      contactEmail: email,
      contactPhone: phone,
    }),

  setGstDetails: (gstin, gstCompany) => set({ gstin, gstCompany }),

  setActiveHold: (hold) => set({ activeHold: hold }),

  setActiveBooking: (bookingId, bookingNumber) =>
    set({ activeBookingId: bookingId, activeBookingNumber: bookingNumber }),

  resetBookingFlow: () =>
    set({
      selectedBus: null,
      selectedSeats: [],
      selectedBoardingPoint: null,
      selectedDroppingPoint: null,
      passengers: [],
      activeHold: null,
      activeBookingId: null,
      activeBookingNumber: null,
    }),
}));
