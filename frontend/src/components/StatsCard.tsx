interface StatsCardProps {
  title: string;
  value: string;
  accent: 'emerald' | 'rose' | 'slate';
}

export function StatsCard({ title, value, accent }: StatsCardProps) {
  return (
    <div className={`stats-card stats-card--${accent}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

