import { create } from 'zustand';

interface BookingState {
  selectedTurf: any | null;
  selectedDate: Date | null;
  selectedSlots: any[];
  addOns: any[];
  totalCost: number;
  paymentMethod: string;
  
  setSelectedTurf: (turf: any) => void;
  setSelectedDate: (date: Date) => void;
  addSlot: (slot: any) => void;
  removeSlot: (slotId: string) => void;
  addAddOn: (addOn: any) => void;
  removeAddOn: (addOnId: string) => void;
  setPaymentMethod: (method: string) => void;
  calculateTotal: () => void;
  resetBooking: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  selectedTurf: null,
  selectedDate: null,
  selectedSlots: [],
  addOns: [],
  totalCost: 0,
  paymentMethod: 'card',

  setSelectedTurf: (turf) => set({ selectedTurf: turf }),
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  
  addSlot: (slot) => set((state) => {
    const newSlots = [...state.selectedSlots, slot];
    const newTotal = newSlots.reduce((sum, s) => sum + s.price, 0) + 
                    state.addOns.reduce((sum, a) => sum + a.cost, 0);
    return {
      selectedSlots: newSlots,
      totalCost: newTotal
    };
  }),
  
  removeSlot: (slotId) => set((state) => {
    const newSlots = state.selectedSlots.filter(s => s.id !== slotId);
    const newTotal = newSlots.reduce((sum, s) => sum + s.price, 0) + 
                    state.addOns.reduce((sum, a) => sum + a.cost, 0);
    return {
      selectedSlots: newSlots,
      totalCost: newTotal
    };
  }),
  
  addAddOn: (addOn) => set((state) => {
    const newAddOns = [...state.addOns, addOn];
    const newTotal = state.selectedSlots.reduce((sum, s) => sum + s.price, 0) + 
                    newAddOns.reduce((sum, a) => sum + a.cost, 0);
    return {
      addOns: newAddOns,
      totalCost: newTotal
    };
  }),
  
  removeAddOn: (addOnId) => set((state) => {
    const newAddOns = state.addOns.filter(a => a.id !== addOnId);
    const newTotal = state.selectedSlots.reduce((sum, s) => sum + s.price, 0) + 
                    newAddOns.reduce((sum, a) => sum + a.cost, 0);
    return {
      addOns: newAddOns,
      totalCost: newTotal
    };
  }),
  
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  
  calculateTotal: () => set((state) => {
    const slotTotal = state.selectedSlots.reduce((sum, s) => sum + s.price, 0);
    const addOnTotal = state.addOns.reduce((sum, a) => sum + a.cost, 0);
    return { totalCost: slotTotal + addOnTotal };
  }),
  
  resetBooking: () => set({
    selectedTurf: null,
    selectedDate: null,
    selectedSlots: [],
    addOns: [],
    totalCost: 0,
    paymentMethod: 'card'
  })
}));
