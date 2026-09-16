"use client";

import { createContext, useContext } from "react";

// ---------------------------------------------------------------------------
// Shared service-selection context for the /book journey. Lives in its own
// module (not BookPageShell) so BookingForm / BookingContextPanel can import
// the hook without creating a circular import with the shell that renders
// them both inside the provider.
// ---------------------------------------------------------------------------
export interface ServiceCtx {
  selectedServiceId: string;
  setSelectedServiceId: (id: string) => void;
}

export const BookingServiceCtx = createContext<ServiceCtx>({
  selectedServiceId: "",
  setSelectedServiceId: () => {},
});

export function useSelectedServiceId() {
  return useContext(BookingServiceCtx);
}