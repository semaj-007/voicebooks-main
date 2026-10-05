import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { accountantApi } from '../../services/accountantApi';
import Alert from '../../components/Alert.jsx';
import Spinner from '../../components/Spinner.jsx';

export default function AccountantDashboard() {
  const [state, setState] = useState({ loading: true, data: null, pending: [], error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([accountantApi.dashboard(), accountantApi.pendingReviews()])
      .then(([dashboard, pending]) => {
        if (active) setState({ loading: false, data: dashboard.data, pending: pending.data, error: '' });
      })
      .catch(error => {
        if (active) setState({ loading: false, data: null, pending: [], error: error.message });
      });
    return () => { active = false; };
  }, [attempt]);

  const money = amount => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(amount));
  const transactions = state.data?.recentTransactions || [];
  return (
    <div className="dashboard-page accountant-dashboard">
      <header className="dashboard-heading-row">
        <div><p className="dashboard-eyebrow">ACCOUNTANT WORKSPACE</p><h1>Accountant Dashboard</h1><p className="dashboard-subtitle">Review client transactions and approve accounting entries.</p></div>
        <Link className="dashboard-manage-button" to="/accountant/clients">View clients</Link>
      </header>
      <Alert type="error">{state.error}</Alert>
      {state.loading ? <div className="dashboard-state"><Spinner large /><p>Loading accountant dashboard…</p></div> : state.error ? (
        <button className="btn primary" type="button" onClick={() => { setState({ loading: true, data: null, pending: [], error: '' }); setAttempt(value => value + 1); }}>Retry dashboard</button>
      ) : <>
        <div className="dashboard-stat-grid dashboard-stat-grid-three">
          <Link className="dashboard-stat-card" to="/accountant/clients"><h2 className="dashboard-stat-top">Clients</h2><strong>{state.data.clients}</strong><small>Assigned businesses</small></Link>
          <a className="dashboard-stat-card dashboard-stat-warning" href="#pending-reviews"><h2 className="dashboard-stat-top">Pending Reviews</h2><strong>{state.data.pendingReviews}</strong><small>Awaiting your review</small></a>
          <Link className="dashboard-stat-card" to="/accountant/approved"><h2 className="dashboard-stat-top">Approved</h2><strong>{state.data.approvedTransactions}</strong><small>Approved accounting entries</small></Link>
        </div>
        <section className="dashboard-recent-card" id="pending-reviews">
          <div className="dashboard-card-heading"><h2>Pending Reviews</h2><span>{state.pending.length} awaiting review</span></div>
          {state.pending.length === 0 ? <div className="dashboard-empty"><h3>All caught up</h3><p>No client transactions are awaiting review.</p></div> : state.pending.map(transaction => (
            <div className="dashboard-review-row" key={transaction.id}>
              <div className="dashboard-transaction-info"><strong>{transaction.description}</strong><span>{transaction.business_name || transaction.client_name} · {transaction.supplier || 'No supplier'}</span></div>
              <strong>{money(transaction.amount)}</strong>
              <Link className="btn primary" aria-label={`Review ${transaction.description}`} to={`/accountant/review/${transaction.id}`}>Review</Link>
            </div>
          ))}
        </section>
        <section className="dashboard-recent-card dashboard-activity">
          <div className="dashboard-card-heading"><h2>Recent Transactions</h2><Link to="/accountant/returned">View returned</Link></div>
          {transactions.length === 0 ? <div className="dashboard-empty"><h3>No transactions yet</h3><p>Transactions from your assigned clients will appear here.</p><Link to="/accountant/clients">View clients</Link></div> : transactions.map(transaction => (
            <div className="dashboard-transaction" key={transaction.id}>
              <div className="dashboard-transaction-info"><strong>{transaction.description}</strong><span>{transaction.business_name || transaction.client_name} · {transaction.supplier || 'No supplier'}</span></div>
              <div className="dashboard-transaction-amount"><strong>{money(transaction.amount)}</strong><span className={`status ${transaction.status}`}>{transaction.status.replaceAll('_', ' ')}</span></div>
            </div>
          ))}
        </section>
      </>}
    </div>
  );
}
