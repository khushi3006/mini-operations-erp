import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';

export const CustomerOrders: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const [ordRes, invRes] = await Promise.all([
        api.get('/orders'),
        api.get('/inventory')
      ]);
      setOrders(ordRes.data.data);
      setInventoryList(invRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load customer orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const inv = inventoryList.find((i) => i.id === selectedInventoryId);
    if (!inv) {
      setFormError('Please select a valid inventory batch');
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/orders', {
        customerName: customerName.trim(),
        locationId: inv.locationId,
        itemId: inv.itemId,
        batchNumber: inv.batchNumber,
        quantity: Number(quantity)
      });
      setIsModalOpen(false);
      setCustomerName('');
      setSelectedInventoryId('');
      fetchOrders();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create order and reserve stock');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'RESERVED':
        return <Badge variant="warning">Stock Reserved</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const availableBatches = inventoryList.filter((inv) => inv.availableQuantity > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Orders & Stock Reservation</h1>
          <p className="text-sm text-slate-500">
            Create customer orders with instant atomic stock reservation and concurrency safety.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {(user?.role === 'ADMIN' || user?.role === 'SALES') && (
            <button
              onClick={() => {
                if (availableBatches.length > 0 && !selectedInventoryId) {
                  setSelectedInventoryId(availableBatches[0].id);
                }
                setIsModalOpen(true);
              }}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Order & Reserve</span>
            </button>
          )}

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3.5">Order #</th>
                <th className="px-6 py-3.5">Customer Name</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Item Reserved</th>
                <th className="px-6 py-3.5">Batch</th>
                <th className="px-6 py-3.5 text-right">Quantity</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Sales Rep</th>
                <th className="px-6 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Loading customer orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    No customer orders found.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">
                      {ord.orderNumber}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {ord.customerName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold">{ord.location.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>{ord.item.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{ord.item.sku}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {ord.batchNumber}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {ord.quantity} {ord.item.unit}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(ord.status)}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      {ord.createdBy.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Customer Order & Reserve */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Customer Order & Stock Reservation">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Client Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Industrial Solutions"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Available Inventory Batch</label>
            <select
              value={selectedInventoryId}
              onChange={(e) => setSelectedInventoryId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">-- Choose Item & Batch --</option>
              {availableBatches.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.locationCode} | {inv.itemName} ({inv.itemSku}) | Batch: {inv.batchNumber} | Available: {inv.availableQuantity} {inv.unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Order / Reservation Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Reserving...' : 'Confirm Order & Reserve'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};