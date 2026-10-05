import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, it, expect, vi } from 'vitest';
import AccountantDashboard from '../../pages/accountant/AccountantDashboard.jsx';
import { accountantApi } from '../../services/accountantApi.js';

vi.mock('../../services/accountantApi', () => ({ accountantApi: { dashboard: vi.fn(), pendingReviews: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  accountantApi.dashboard.mockResolvedValue({ data: { clients: 0, pendingReviews: 0, approvedTransactions: 0, recentTransactions: [] } });
  accountantApi.pendingReviews.mockResolvedValue({ data: [] });
});

it('shows honest empty states and links to clients and approved entries', async () => {
  render(<MemoryRouter><AccountantDashboard /></MemoryRouter>);
  expect(await screen.findByText('All caught up')).toBeInTheDocument();
  expect(screen.getByText('No transactions yet')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Clients 0/ })).toHaveAttribute('href', '/accountant/clients');
  expect(screen.getByRole('link', { name: /Approved 0/ })).toHaveAttribute('href', '/accountant/approved');
});

it('exposes older pending entries even when absent from recent activity', async () => {
  accountantApi.dashboard.mockResolvedValue({ data: { clients: 1, pendingReviews: 1, approvedTransactions: 1, recentTransactions: [
    { id: 10, description: 'Recent approval', amount: 500, status: 'approved', business_name: 'Shop' },
  ] } });
  accountantApi.pendingReviews.mockResolvedValue({ data: [
    { id: 2, description: 'Older invoice', amount: 1234.5, status: 'pending_review', business_name: 'Shop' },
  ] });
  render(<MemoryRouter><AccountantDashboard /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: 'Review Older invoice' })).toHaveAttribute('href', '/accountant/review/2');
  expect(screen.getByText('Recent approval')).toBeInTheDocument();
  expect(screen.getByText('approved')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Pending Reviews/ })).toHaveAttribute('href', '#pending-reviews');
});

it('retries a failed dashboard request and hides unavailable statistics', async () => {
  accountantApi.dashboard.mockRejectedValueOnce(new Error('Dashboard unavailable'));
  render(<MemoryRouter><AccountantDashboard /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard unavailable');
  expect(screen.queryByText('Assigned businesses')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry dashboard' }));
  expect(await screen.findByText('All caught up')).toBeInTheDocument();
});
