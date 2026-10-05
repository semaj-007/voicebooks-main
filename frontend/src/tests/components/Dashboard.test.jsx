import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../../pages/Dashboard.jsx';
import { dashboardSummary } from '../../utils/dashboard.js';
import { api } from '../../api/client.js';
const { auth } = vi.hoisted(() => ({ auth: { user: {
  id: 1, role: 'business_owner', business: { name: 'My Business', currency: 'ZAR', sageStatus: 'pending' }
} } }));
vi.mock('../../hooks/useAuth.js', () => ({ useAuth: () => auth }));
vi.mock('../../api/client.js', () => ({ api: { getTransactions: vi.fn(), adminUsers: vi.fn() } }));
beforeEach(() => { auth.user.role = 'business_owner'; vi.clearAllMocks(); });

describe('Live dashboard', () => {
  it('counts only approved entries from the selected month and sums decimal amounts safely', () => {
    const transactions = [
      { status: 'approved', type: 'income', amount: 0.1, transactionDate: '2026-10-01' },
      { status: 'approved', type: 'income', amount: 0.2, transactionDate: '2026-10-31' },
      { status: 'approved', type: 'expense', amount: 10, transactionDate: '2026-10-05' },
      { status: 'approved', type: 'income', amount: 999, transactionDate: '2026-09-30' },
      { status: 'pending_review', amount: 500, transactionDate: '2026-10-01' },
      { status: 'returned', amount: 600, transactionDate: '2026-10-01' },
    ];
    expect(dashboardSummary(transactions, new Date(2026, 9, 5))).toEqual({ income: 0.3, expenses: 10, count: 3, pending: 1, returned: 1 });
  });
  it('shows an empty business without fabricated transactions or sync claims', async () => {
    api.getTransactions.mockResolvedValue({ transactions: [] });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByText(/No transactions yet/)).toBeInTheDocument();
    expect(screen.getByText('My Business', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/Sage Synced/)).not.toBeInTheDocument();
    expect(screen.getByText('Synchronization is not available yet.')).toBeInTheDocument();
  });
  it('shows persisted transaction descriptions and statuses', async () => {
    api.getTransactions.mockResolvedValue({ transactions: [{ id: 12, description: 'Real office supplies',
      amount: 250, transactionDate: '2026-10-05', type: 'expense', status: 'pending_review' }] });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: 'Real office supplies' })).toHaveAttribute('href', '/transactions/12');
    expect(screen.getByText('pending review')).toBeInTheDocument();
  });
  it('allows recovery after a failed request without showing fabricated totals', async () => {
    api.getTransactions.mockRejectedValueOnce(new Error('Cannot reach the server')).mockResolvedValueOnce({ transactions: [] });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard' }));
    await waitFor(() => expect(screen.getByText(/No transactions yet/)).toBeInTheDocument());
  });
  it('keeps the dashboard heading visible while loading', () => {
    api.getTransactions.mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Net income')).not.toBeInTheDocument();
  });
  it('shows admin account counts and readable roles from server data', async () => {
    auth.user.role = 'admin';
    api.adminUsers.mockResolvedValue({ users: [
      { id: 1, first_name: 'Business', last_name: 'Owner', email: 'owner@example.com', role: 'business_owner', business_name: 'Shop' },
      { id: 2, first_name: 'Account', last_name: 'Reviewer', email: 'reviewer@example.com', role: 'accountant' },
    ] });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Registered accounts' })[0].parentElement).toHaveTextContent('2');
    expect(screen.getByText('business owner')).toBeInTheDocument();
    expect(api.getTransactions).not.toHaveBeenCalled();
  });
  it('allows an admin to retry failed account loading', async () => {
    auth.user.role = 'admin';
    api.adminUsers.mockRejectedValueOnce(new Error('Accounts unavailable')).mockResolvedValueOnce({ users: [] });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Accounts unavailable');
    expect(screen.queryByText('Business accounts')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard' }));
    expect(await screen.findByText('No accounts yet')).toBeInTheDocument();
  });
});
