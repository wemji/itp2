import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, History as HistoryIcon, Search, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import Toast from '../components/Toast';

const filters = ['ALL', 'COMPLETED', 'CANCELLED', 'NO-SHOW'];

function statusLabel(status) {
  return status === 'NO-SHOW' ? 'No-show' : status.charAt(0) + status.slice(1).toLowerCase();
}

export default function History() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api('/history')
      .then((data) => mounted && setItems(data))
      .catch((loadError) => mounted && setError(loadError.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = filter === 'ALL' || item.status === filter;
      const matchesSearch = !term || [
        item.queue_number,
        item.services?.name,
        item.users?.name,
      ].some((value) => value?.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [items, filter, search]);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR VISITS</div>
          <h1>Queue history</h1>
          <p className="muted">Review your completed, cancelled, and missed queues.</p>
        </div>
      </div>

      <Toast message={error} />

      <div className="history-toolbar">
        <label className="history-search">
          <Search size={17} />
          <input
            aria-label="Search queue history"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search queue number or service"
          />
        </label>
        <div className="history-filters" aria-label="Filter queue history">
          {filters.map((value) => (
            <button
              key={value}
              className={filter === value ? 'active' : ''}
              onClick={() => setFilter(value)}
            >
              {value === 'ALL' ? 'All' : statusLabel(value)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="empty-card loading-card"><span className="spinner" /></div>
      ) : visibleItems.length ? (
        <div className="history-list">
          {visibleItems.map((item) => {
            const completed = item.status === 'COMPLETED';
            return (
              <article className="history-card" key={item.id || item.queue_id}>
                <div className={`history-status-icon ${completed ? 'complete' : 'ended'}`}>
                  {completed ? <CheckCircle2 size={21} /> : <XCircle size={21} />}
                </div>
                <div className="history-main">
                  <div className="history-title-row">
                    <div>
                      <strong>{item.services?.name || 'Service'}</strong>
                      <span className="history-queue-number">{item.queue_number}</span>
                    </div>
                    <span className={`status ${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span>
                  </div>
                  <div className="history-meta">
                    <span><CalendarDays size={14} />{new Date(item.created_at).toLocaleString()}</span>
                    <span><Clock3 size={14} />Waited {item.waiting_time || 0} min</span>
                    {completed && <span><Clock3 size={14} />Served in {item.service_time || 0} min</span>}
                    {item.users?.name && <span>{item.users.name}</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-card">
          <div className="empty-icon"><HistoryIcon /></div>
          <h2>No queue history found</h2>
          <p className="muted">Completed and cancelled visits will appear here.</p>
        </div>
      )}
    </>
  );
}
