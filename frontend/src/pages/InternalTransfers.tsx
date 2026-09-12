import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Plus, RefreshCw, AlertTriangle, ArrowRight, Truck, CheckCircle2 } from 'lucide-react';

export const InternalTransfers: React.FC = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form state
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [quantity, setQuantity] = useState<number | string>(30);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTransfers = async () => {
    setLoading(true);
    setError('');
    try {
      const [trfRes, invRes, locRes] = await Promise.all([
        api.get('/transfers'),
        api.get('/inventory'),
        api.get('/inventory/locations')
      ]);
      setTransfers(trfRes.data.data);
      setInventoryList(invRes.data.data);
      const locs = locRes.data.data;
      setLocations(locs);
      if (locs.length >= 2) {
        setSourceLocationId((prev) => prev || locs[0].id);
        setDestinationLocationId((prev) => prev || locs[1].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load transfer data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleCreateTransfer = async (e: React.FormEvent) => {
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
      await api.post('/transfers', {
        sourceLocationId,
        destinationLocationId,
        itemId: inv.itemId,
        batchNumber: inv.batchNumber,
        quantity: Number(quantity)
      });
      setIsModalOpen(false);
      fetchTransfers();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to request transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      await api.post(`/transfers/${id}/dispatch`);
      fetchTransfers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to dispatch transfer');
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await api.post(`/transfers/${id}/receive`);
      fetchTransfers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to receive transfer');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <Badge variant="success">Received</Badge>;
      case 'DISPATCHED':
        return <Badge variant="warning">In-Transit</Badge>;
      default:
        return <Badge variant="info">Requested</Badge>;
    }
  };

  const sourceBatches = sourceLocationId
    ? inventoryList.filter((inv) => inv.locationId === sourceLocationId && inv.availableQuantity > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Internal Stock Transfers</h1>
          <p className="text-sm text-slate-500">
            Multi-location transit flow: Requested $\rightarrow$ Dispatched $\rightarrow$ Received
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {(user?.role === 'ADMIN' || user?.role === 'OPERATIONS') && (
            <button
              onClick={() => {
                if (locations.length > 0) {
                  setSourceLocationId(locations[0].id);
                  if (locations.length > 1) {
                    setDestinationLocationId(locations[1].id);
                  }
                }
                setIsModalOpen(true);
              }}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Request Transfer</span>
            </button>
          )}

          <button
            onClick={fetchTransfers}
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
                <th className="px-5 py-3.5 whitespace-nowrap">Transfer #</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Route</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Item & Batch</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Quantity</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Initiated By</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No stock transfers recorded.
                  </td>
                </tr>
              ) : (
                transfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                      {tr.transferNumber}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                        <span className="font-bold text-xs text-indigo-700 whitespace-nowrap">{tr.sourceLocation.code}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-bold text-xs text-emerald-700 whitespace-nowrap">{tr.destinationLocation.code}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{tr.item.name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {tr.item.sku} • {tr.batchNumber}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {tr.quantity} <span className="text-xs font-normal text-slate-500">{tr.item.unit}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(tr.status)}</td>
                    <td className="px-5 py-4 text-slate-600 text-xs whitespace-nowrap">
                      {tr.requestedBy.name}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {(user?.role === 'ADMIN' || user?.role === 'OPERATIONS') && (
                        <div className="inline-flex items-center space-x-2">
                          {tr.status === 'REQUESTED' && (
                            <button
                              onClick={() => handleDispatch(tr.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>Dispatch</span>
                            </button>
                          )}
                          {tr.status === 'DISPATCHED' && (
                            <button
                              onClick={() => handleReceive(tr.id)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Receive Stock</span>
                            </button>
                          )}
                          {tr.status === 'RECEIVED' && (
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                              Completed
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Request Transfer */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Request Internal Stock Transfer">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source Location</label>
              <select
                value={sourceLocationId}
                onChange={(e) => {
                  const newSourceId = e.target.value;
                  setSourceLocationId(newSourceId);
                  setSelectedInventoryId('');
                  const otherLoc = locations.find((l) => l.id !== newSourceId);
                  if (otherLoc) {
                    setDestinationLocationId(otherLoc.id);
                  }
                }}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                required
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code} - {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Location</label>
              <select
                value={destinationLocationId}
                onChange={(e) => setDestinationLocationId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                required
              >
                {locations
                  .filter((l) => l.id !== sourceLocationId)
                  .map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} - {loc.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Source Inventory Batch</label>
            <select
              value={selectedInventoryId}
              onChange={(e) => setSelectedInventoryId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">-- Select Source Batch --</option>
              {sourceBatches.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.itemName} ({inv.itemSku}) - Batch: {inv.batchNumber} (Available: {inv.availableQuantity} {inv.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
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
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};