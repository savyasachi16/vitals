interface Props {
  title: string;
  meta?: string;
  unit?: string;
}

export default function Header({ title, meta, unit }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="m-0 text-[17px] font-semibold text-(--color-text-secondary)">
        {title}
        {unit && (
          <span className="ml-2 text-[12px] font-normal text-(--color-text-tertiary)">{unit}</span>
        )}
      </h3>
      {meta && <span className="text-[13px] text-(--color-text-tertiary)">{meta}</span>}
    </div>
  );
}
