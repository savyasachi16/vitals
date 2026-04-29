interface Props {
  label?: string;
  primary: string;
  secondary?: string;
}

export default function ChartTooltip({ label, primary, secondary }: Props) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-surface-secondary) px-4 py-3 shadow-lg">
      {label && <p className="m-0 text-[13px] text-(--color-text-secondary)">{label}</p>}
      <p className="m-0 mt-1 text-xl font-bold text-(--color-text-primary)">{primary}</p>
      {secondary && <p className="m-0 text-[12px] text-(--color-text-tertiary)">{secondary}</p>}
    </div>
  );
}
