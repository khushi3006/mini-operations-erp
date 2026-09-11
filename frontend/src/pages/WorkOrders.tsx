import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';

export const WorkOrders: React.FC = () => {
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form state
  const [locationId, setLocationId] = useState('');
  const [itemId, setItemId] = useState('');
  const [requiredQuantity, setRequiredQuantity] = useState<number>(10);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const [woRes, locRes, itemRes] = await Promise.all([
        api.get('/work-orders'),
        locations.length === 0 ? api.get('/inventory/locations') : Promise.resolve(null),
        items.length === 0 ? api.get('/inventory/items') : Promise.resolve(null)
      ]);
      setWorkOrders(woRes.data.data);
      if (locRes) setLocations(locRes.data.data);
      if (itemRes) setItems(itemRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/work-orders', {
        locationId,
        itemId,
        requiredQuantity: Number(requiredQuantity),
        assignedUserId: user?.id
      });
      setIsModalOpen(false);
      fetchWorkOrders();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create work order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (woId: string, newStatus: string) => {
    try {
      await api.patch(`/work-orders/${woId}/status`, { status: newStatus });
      fetchWorkOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">In Progress</Badge>;
      default:
        return <Badge variant="info">Assigned</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Work Orders & Stock Check</h1>
          <p className="text-sm text-slate-500">
            Create production work orders with automated location material shortage detection.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => {
                if (locations.length > 0 && !locationId) setLocationId(locations[0].id);
                if (items.length > 0 && !itemId) setItemId(items[0].id);
                setIsModalOpen(true);
              }}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Work Order</span>
            </button>
          )}

          <button
            onClick={fetchWorkOrders}
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
                <th className="px-6 py-3.5">Work Order #</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Item Required</th>
                <th className="px-6 py-3.5 text-right">Required Qty</th>
                <th className="px-6 py-3.5 text-right">Available at Loc</th>
                <th className="px-6 py-3.5 text-right">Shortage</th>
                <th className="px-6 py-3.5">Assigned Operator</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    Loading work orders...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    No work orders found.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">
                      {wo.workOrderNumber}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold">{wo.locationCode}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{wo.itemName}</div>
                      <div className="text-xs text-slate-400 font-mono">{wo.itemSku}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {wo.requiredQuantity} {wo.unit}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                      {wo.availableAtLocation} {wo.unit}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {wo.shortageQuantity > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700">
                          {wo.shortageQuantity} {wo.unit} Short
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                          No Shortage
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{wo.assignedUserName}</td>
                    <td className="px-6 py-4">{getStatusBadge(wo.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-sm">
                        {wo.status === 'ASSIGNED' && (
                          <button
                            onClick={() => handleStatusChange(wo.id, 'IN_PROGRESS')}
                            className="px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded font-medium"
                          >
                            Start
                          </button>
                        )}
                        {wo.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleStatusChange(wo.id, 'COMPLETED')}
                            className="px-2 py-1 text-emerald-600 hover:bg-emerald-50 rounded font-medium"
                          >
                            Complete
                          </button>
                        )}
                        {wo.status === 'COMPLETED' && (
                          <span className="px-2 py-1 text-slate-400">Done</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Work Order */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Work Order">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateWorkOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Location</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Material Item Required</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
              required
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Required Quantity</label>
            <input
              type="number"
              min="1"
              value={requiredQuantity}
              onChange={(e) => setRequiredQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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
              {submitting ? 'Creating...' : 'Create & Check Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};