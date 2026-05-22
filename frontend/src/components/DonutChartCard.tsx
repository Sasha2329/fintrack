interface ChartCategory {
  name: string;
  total: number;
}

interface DonutChartCardProps {
  title: string;
  monthLabel: string;
  total: number;
  accent: 'income' | 'expense';
  categories: ChartCategory[];
}

const palette = ['#b87cff', '#5bd0e6', '#ff8d53', '#ffd166', '#93d68e', '#9fb3c8'];

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function DonutChartCard({
  title,
  monthLabel,
  total,
  accent,
  categories
}: DonutChartCardProps) {
  const normalized = categories.slice(0, 6);
  const safeTotal = normalized.reduce((sum, item) => sum + item.total, 0);

  let currentAngle = 0;
  const arcs = normalized.map((item, index) => {
    const ratio = safeTotal > 0 ? item.total / safeTotal : 0;
    const sweep = ratio * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;

    return {
      ...item,
      color: palette[index % palette.length],
      ratio,
      path: sweep >= 359.99 ? '' : describeArc(90, 90, 58, startAngle, endAngle)
    };
  });

  return (
    <section className={`panel donut-card donut-card--${accent}`}>
      <div className="panel-heading">
        <h3>{title}</h3>
        <p>{monthLabel}</p>
      </div>

      <div className="donut-card__topline">
        <strong>{total.toLocaleString('ru-RU')} ₽</strong>
        <span>{accent === 'income' ? 'Доходы за период' : 'Расходы за период'}</span>
      </div>

      {safeTotal > 0 ? (
        <div className="donut-wrap">
          <div className="donut-graphic">
            <svg viewBox="0 0 180 180" className="donut-svg" aria-hidden="true">
              <circle cx="90" cy="90" r="58" className="donut-track" />
              {arcs.map((arc) =>
                arc.path ? (
                  <path
                    key={arc.name}
                    d={arc.path}
                    stroke={arc.color}
                    strokeWidth="20"
                    fill="none"
                    strokeLinecap="round"
                  />
                ) : (
                  <circle
                    key={arc.name}
                    cx="90"
                    cy="90"
                    r="58"
                    stroke={arc.color}
                    strokeWidth="20"
                    fill="none"
                  />
                )
              )}
            </svg>

            <div className="donut-center">
              <span>{accent === 'income' ? 'Доходы' : 'Расходы'}</span>
              <strong>{safeTotal.toLocaleString('ru-RU')} ₽</strong>
            </div>
          </div>

          <div className="donut-legend">
            {arcs.map((arc) => (
              <div className="donut-legend__item" key={arc.name}>
                <div className="donut-legend__label">
                  <span className="donut-dot" style={{ backgroundColor: arc.color }} />
                  <span>{arc.name}</span>
                </div>
                <div className="donut-legend__meta">
                  <strong>{arc.total.toLocaleString('ru-RU')} ₽</strong>
                  <span>{Math.round(arc.ratio * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">За выбранный месяц пока нет данных для диаграммы.</div>
      )}
    </section>
  );
}
