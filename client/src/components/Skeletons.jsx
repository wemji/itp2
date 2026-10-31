function Line({ width = '100%', className = '' }) {
  return <span className={`skeleton-line ${className}`} style={{ width }} />;
}

function HeadingSkeleton() {
  return <div className="skeleton-heading"><Line width="118px" /><Line width="280px" className="skeleton-title" /><Line width="360px" /></div>;
}

export function DashboardSkeleton() {
  return <div className="skeleton-page" aria-label="Loading dashboard" aria-busy="true"><HeadingSkeleton /><div className="skeleton-stat-grid">{Array.from({ length: 6 }, (_, i) => <div className="skeleton-stat" key={i}><span className="skeleton-square" /><Line width="46%" /><Line width="62%" className="skeleton-value" /><Line width="35%" /></div>)}</div><div className="skeleton-dashboard-lower"><div className="skeleton-chart"><Line width="145px" className="skeleton-subtitle" /><div className="skeleton-bars">{[42, 68, 35, 82, 55, 76, 47].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div></div><div className="skeleton-callout"><span className="skeleton-square" /><div><Line width="80%" /><Line width="100%" /><Line width="65%" /></div></div></div></div>;
}

export function CustomerDashboardSkeleton() {
  return <div className="skeleton-page" aria-label="Loading your queue dashboard" aria-busy="true"><div className="skeleton-customer-queue"><Line width="190px" /><Line width="180px" className="skeleton-ticket" /><Line width="58%" /><div className="skeleton-detail-metrics">{Array.from({ length: 3 }, (_, i) => <div key={i}><Line width="60%" className="skeleton-value" /><Line width="72%" /></div>)}</div><div className="skeleton-card-meta"><span className="skeleton-button short" /><span className="skeleton-button short" /></div></div><Line width="120px" className="skeleton-subtitle" /><div className="skeleton-quick-links">{Array.from({ length: 3 }, (_, i) => <div key={i}><span className="skeleton-square" /><Line width="58%" className="skeleton-subtitle" /><Line /><Line width="78%" /></div>)}</div></div>;
}

export function TableSkeleton({ columns = 6, rows = 5, withHeading = false }) {
  return <div className="skeleton-page" aria-label="Loading table" aria-busy="true">{withHeading && <HeadingSkeleton />}<div className="table-card skeleton-table" style={{ '--skeleton-columns': columns }}><div className="skeleton-table-row skeleton-table-head">{Array.from({ length: columns }, (_, i) => <Line key={i} width={`${55 + (i % 3) * 12}%`} />)}</div>{Array.from({ length: rows }, (_, row) => <div className="skeleton-table-row" key={row}>{Array.from({ length: columns }, (_, col) => <Line key={col} width={`${58 + ((row + col) % 3) * 14}%`} />)}</div>)}</div></div>;
}

export function CardGridSkeleton({ cards = 6, withHeading = false }) {
  return <div className="skeleton-page" aria-label="Loading services" aria-busy="true">{withHeading && <HeadingSkeleton />}<div className="service-grid skeleton-card-grid">{Array.from({ length: cards }, (_, i) => <div className="skeleton-service-card" key={i}><div className="skeleton-card-top"><span className="skeleton-square" /><Line width="70px" /></div><Line width="62%" className="skeleton-subtitle" /><Line /><Line width="78%" /><div className="skeleton-card-meta"><Line width="38%" /><Line width="34%" /></div><span className="skeleton-button" /></div>)}</div></div>;
}

export function ListSkeleton({ items = 5, variant = 'list', withHeading = false }) {
  return <div className={`skeleton-page skeleton-${variant}`} aria-label="Loading list" aria-busy="true">{withHeading && <HeadingSkeleton />}<div className="skeleton-list">{Array.from({ length: items }, (_, i) => <div className="skeleton-list-item" key={i}><span className="skeleton-circle" /><div><Line width={`${55 + (i % 3) * 12}%`} className="skeleton-subtitle" /><Line width="92%" /><Line width="48%" /></div><Line width="78px" /></div>)}</div></div>;
}

export function DetailSkeleton() {
  return <div className="skeleton-page skeleton-detail" aria-label="Loading queue details" aria-busy="true"><Line width="150px" /><div className="skeleton-detail-card"><div className="skeleton-detail-head"><div><Line width="120px" /><Line width="210px" className="skeleton-ticket" /></div><Line width="90px" /></div><div className="skeleton-detail-service"><span className="skeleton-square" /><div><Line width="180px" /><Line width="250px" /></div></div><Line /><div className="skeleton-detail-metrics">{Array.from({ length: 3 }, (_, i) => <div key={i}><Line width="75%" /><Line width="55%" className="skeleton-value" /></div>)}</div></div></div>;
}

export function FormListSkeleton({ items = 4 }) {
  return <div className="skeleton-page" aria-label="Loading configuration" aria-busy="true"><HeadingSkeleton /><div className="two-col"><div className="skeleton-form-card"><Line width="50%" className="skeleton-subtitle" />{Array.from({ length: 4 }, (_, i) => <div className="skeleton-field" key={i}><Line width="32%" /><span /></div>)}<span className="skeleton-button short" /></div><div><Line width="170px" className="skeleton-subtitle" /><div className="skeleton-list">{Array.from({ length: items }, (_, i) => <div className="skeleton-list-item" key={i}><span className="skeleton-square" /><div><Line width="55%" /><Line width="82%" /><Line width="68%" /></div><Line width="65px" /></div>)}</div></div></div></div>;
}

export function RouteSkeleton() {
  const path = window.location.pathname;
  if (/^\/(login|register|forgot-password|reset-password|mfa)/.test(path)) {
    return <div className="route-auth-skeleton" aria-label="Loading page" aria-busy="true"><div className="route-auth-copy"><Line width="170px" /><Line width="360px" className="skeleton-title" /><Line width="310px" /><Line width="250px" /></div><div className="skeleton-form-card route-auth-card"><Line width="140px" /><Line width="70%" className="skeleton-title" />{Array.from({ length: 3 }, (_, i) => <div className="skeleton-field" key={i}><Line width="28%" /><span /></div>)}<span className="skeleton-button" /></div></div>;
  }
  return <DashboardSkeleton />;
}
