interface Props {
  title: string;
  message: string;
  height?: number;
}

export default function Empty({ title, message, height = 300 }: Props) {
  return (
    <div className="health-card flex items-center justify-center" style={{ height }}>
      <p className="text-(--color-text-tertiary)">
        {message} {title.toLowerCase()}
      </p>
    </div>
  );
}
