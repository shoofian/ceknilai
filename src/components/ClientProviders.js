"use client";
import { ConfirmProvider } from "@/components/ConfirmProvider";

export function ClientProviders({ children }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
