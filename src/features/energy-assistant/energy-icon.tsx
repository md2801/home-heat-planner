type EnergyIconName = "leaf" | "bill" | "chat" | "arrow" | "reset" | "upload" | "check";

export function EnergyIcon({ name }: { name: EnergyIconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "leaf" && <><path d="M5 19C3 9 12 11 20 3c2 10-3 18-12 16" /><path d="m4 21 12-12M9 16v-5m0 5h6" /></>}
    {name === "bill" && <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 7h6M9 11h6M9 15h3" /></>}
    {name === "chat" && <><path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z" /><path d="M7 10h8m-8 4h5" /></>}
    {name === "arrow" && <path d="M4 12h16m-6-6 6 6-6 6" />}
    {name === "reset" && <><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" /></>}
    {name === "upload" && <><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" /></>}
    {name === "check" && <path d="m5 12 4 4L19 6" />}
  </svg>;
}
