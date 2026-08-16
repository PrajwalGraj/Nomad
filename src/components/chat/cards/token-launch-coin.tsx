export function TokenLaunchCoin({ name, symbol }: { name: string; symbol: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 py-1">
      <div className="relative flex size-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[var(--chart-5)] shadow-[0_14px_32px_-16px_var(--brand)] ring-4 ring-brand-soft">
        <div className="absolute inset-2 rounded-full border border-white/25" />
        <span className="relative max-w-[70%] truncate px-1 text-center text-lg font-bold text-white">{symbol}</span>
      </div>
      <span className="max-w-full truncate text-center text-2xl font-bold">{name}</span>
    </div>
  );
}
