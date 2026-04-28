import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import type { FlightOption } from "@/lib/queries"

export type AirportSelection = {
  city: string
  code: string
  country: string
}

type BookingConfirmation = {
  flights: Array<FlightOption>
  ticketIds: Array<string>
  totalPrice: number
}

export type GlobeResultRoute = {
  departureCode: string
  arrivalCode: string
}

type BookingState = {
  // Search context
  searchFrom: AirportSelection | null
  searchTo: AirportSelection | null
  departureDate: string
  returnDate: string
  tripType: "one-way" | "round-trip"

  // Flight selections
  selectedOutbound: FlightOption | null
  selectedReturn: FlightOption | null

  // Globe display (not persisted)
  resultRoutes: Array<GlobeResultRoute>

  // Payment draft (non-sensitive only)
  paymentDraft: {
    cardType: "credit" | "debit"
    nameOnCard: string
  } | null

  // Confirmation
  confirmation: BookingConfirmation | null

  // Auth modal
  showAuthModal: boolean
}

type BookingActions = {
  setSearch: (params: Partial<Pick<BookingState, "searchFrom" | "searchTo" | "departureDate" | "returnDate" | "tripType">>) => void
  selectOutbound: (flight: FlightOption) => void
  clearOutbound: () => void
  selectReturn: (flight: FlightOption) => void
  setResultRoutes: (routes: Array<GlobeResultRoute>) => void
  setPaymentDraft: (draft: BookingState["paymentDraft"]) => void
  setConfirmation: (data: BookingConfirmation) => void
  setShowAuthModal: (show: boolean) => void
  reset: () => void
}

const initialState: BookingState = {
  searchFrom: null,
  searchTo: null,
  departureDate: "",
  returnDate: "",
  tripType: "one-way",
  selectedOutbound: null,
  selectedReturn: null,
  resultRoutes: [],
  paymentDraft: null,
  confirmation: null,
  showAuthModal: false,
}

export const useBookingStore = create<BookingState & BookingActions>()(
  persist(
    (set) => ({
      ...initialState,

      setSearch: (params) =>
        set((state) => ({
          ...state,
          ...params,
          // Clear downstream selections when search params change
          selectedOutbound: null,
          selectedReturn: null,
          resultRoutes: [],
          confirmation: null,
        })),

      selectOutbound: (flight) =>
        set({ selectedOutbound: flight, selectedReturn: null, confirmation: null }),

      clearOutbound: () =>
        set({ selectedOutbound: null, selectedReturn: null, confirmation: null }),

      selectReturn: (flight) =>
        set({ selectedReturn: flight, confirmation: null }),
      setResultRoutes: (routes) => set({ resultRoutes: routes }),

      setPaymentDraft: (draft) => set({ paymentDraft: draft }),

      setConfirmation: (data) => set({ confirmation: data }),

      setShowAuthModal: (show) => set({ showAuthModal: show }),

      reset: () => set({ ...initialState, resultRoutes: [] }),
    }),
    {
      name: "skyflow-booking",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        searchFrom: state.searchFrom,
        searchTo: state.searchTo,
        departureDate: state.departureDate,
        returnDate: state.returnDate,
        tripType: state.tripType,
        selectedOutbound: state.selectedOutbound,
        selectedReturn: state.selectedReturn,
        paymentDraft: state.paymentDraft,
        confirmation: state.confirmation,
        // showAuthModal is NOT persisted — always starts closed
      }),
    }
  )
)
