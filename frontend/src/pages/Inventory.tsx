import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Badge } from '../components/Badge';
import { Filter, RefreshCw, AlertTriangle } from 'lucide-react';

export const Inventory: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const url = selectedLocation ? `/inventory?locationId=${selectedLocation}` : '/inventory';
      const [invRes, locRes] = await Promise.all([
        api.get(url),
        locations.length === 0 ? api.get('/inventory/locations') : Promise.resolve(null)
      ]);

      setItems(invRes.data.data);
      if (locRes) {
        setLocations(locRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedLocation]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Multi-Location Inventory</h1>
          <p className="text-sm text-slate-500">
            Real-time batch inventory tracking across all warehouse facilities.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="text-sm bg-transparent border-none focus:outline-none text-slate-700 font-medium"
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.code} - {loc.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchInventory}
            disabled={loading}
            className="flex items-center space-x-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
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

      {/* Inventory KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Physical Stock</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {items.reduce((acc, curr) => acc + curr.physicalQuantity, 0)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reserved Allocation</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {items.reduce((acc, curr) => acc + curr.reservedQuantity, 0)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available for Order</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {items.reduce((acc, curr) => acc + curr.availableQuantity, 0)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Item / SKU</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Category</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Location</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Batch Number</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Physical Qty</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Reserved Qty</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Available Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading inventory records...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                items.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-900 whitespace-nowrap">
                      <div>{inv.itemName}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{inv.itemSku}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant="neutral">{inv.category}</Badge>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-md mr-1.5">
                        {inv.locationCode}
                      </span>
                      <span className="text-xs text-slate-500">({inv.locationName})</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {inv.batchNumber}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {inv.physicalQuantity} <span className="text-xs font-normal text-slate-400">{inv.unit}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-amber-600 whitespace-nowrap">
                      {inv.reservedQuantity} <span className="text-xs font-normal text-slate-400">{inv.unit}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                      {inv.availableQuantity} <span className="text-xs font-normal text-slate-400">{inv.unit}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};