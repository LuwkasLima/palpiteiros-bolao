export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
        {children}
      </span>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}
