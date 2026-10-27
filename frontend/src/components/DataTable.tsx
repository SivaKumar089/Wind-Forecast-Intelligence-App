import React, { useState, useMemo } from 'react';
import { Download, Search, History, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import type { ForecastObservation } from '../types';

interface DataTableProps {
  observations: ForecastObservation[];
  onSelectInterval: (deliveryTime: string) => void;
}

export const DataTable: React.FC<DataTableProps> = ({ observations, onSelectInterval }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'matched' | 'missing_forecast'>('all');
  const [sortField, setSortField] = useState<keyof ForecastObservation>('delivery_time');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const pageSize = 12;

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    return observations.filter((obs) => {
      // Status filter
      if (statusFilter !== 'all' && obs.status !== statusFilter) {
        return false;
      }
      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const timeMatch = obs.delivery_time.toLowerCase().includes(term);
        const dateMatch = obs.settlement_date?.toLowerCase().includes(term);
        const periodMatch = obs.settlement_period?.toString().includes(term);
        return timeMatch || dateMatch || periodMatch;
      }
      return true;
    });
  }, [observations, statusFilter, searchTerm]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) return sortAsc ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortAsc ? -1 : 1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [filteredData, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: keyof ForecastObservation) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const exportToCSV = () => {
    if (sortedData.length === 0) return;

    const headers = [
      'Delivery Time (UTC)',
      'Settlement Date',
      'Settlement Period',
      'Actual Generation (MW)',
      'Selected Forecast (MW)',
      'Forecast Publish Time (UTC)',
      'Decision Cutoff (UTC)',
      'Signed Error (MW)',
      'Abs Error (MW)',
      'Percentage Error (%)',
      'Status',
    ];

    const rows = sortedData.map((obs) => [
      obs.delivery_time,
      obs.settlement_date || '',
      obs.settlement_period || '',
      obs.actual_generation ?? '',
      obs.selected_forecast ?? '',
      obs.forecast_publish_time ?? '',
      obs.cutoff_time ?? '',
      obs.error ?? '',
      obs.abs_error ?? '',
      obs.percentage_error ?? '',
      obs.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wind_forecast_intelligence_data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateTime = (isoStr?: string | null) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">Delivery Interval Data Table</h2>
          <p className="text-xs text-slate-400">
            Comprehensive audit table of actual generation, chosen eligible forecast, and errors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e: any) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">All Records ({observations.length})</option>
            <option value="matched">Matched Only</option>
            <option value="missing_forecast">Missing Forecast</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search date/period..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-40 sm:w-48"
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th
                onClick={() => handleSort('delivery_time')}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-white"
              >
                <div className="flex items-center space-x-1">
                  <span>Delivery Interval (UTC)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold">Period</th>
              <th
                onClick={() => handleSort('actual_generation')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Actual (MW)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('selected_forecast')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Forecast (MW)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('error')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Signed Error</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('abs_error')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Abs Error</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 font-semibold">Forecast Published At</th>
              <th className="py-3 px-3 font-semibold text-center">Status</th>
              <th className="py-3 px-3 font-semibold text-center">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((obs) => {
                const hasActual = obs.actual_generation !== null && obs.actual_generation !== undefined;
                const hasForecast = obs.selected_forecast !== null && obs.selected_forecast !== undefined;

                return (
                  <tr
                    key={obs.delivery_time}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-sans text-slate-200">
                      {formatDateTime(obs.delivery_time)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {obs.settlement_period ? `SP ${obs.settlement_period}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold">
                      {hasActual ? obs.actual_generation?.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right text-sky-400 font-semibold">
                      {hasForecast ? obs.selected_forecast?.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {obs.error !== null && obs.error !== undefined ? (
                        <span className={obs.error > 0 ? 'text-amber-400' : 'text-cyan-400'}>
                          {obs.error > 0 ? `+${obs.error.toLocaleString()}` : obs.error.toLocaleString()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-300">
                      {obs.abs_error !== null && obs.abs_error !== undefined
                        ? obs.abs_error.toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans text-[11px]">
                      {obs.forecast_publish_time ? formatDateTime(obs.forecast_publish_time) : 'None prior to cutoff'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-sans font-medium ${
                          obs.status === 'matched'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {obs.status === 'matched' ? 'Matched' : 'Missing Forecast'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onSelectInterval(obs.delivery_time)}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Audit forecast publication snapshots for this interval"
                      >
                        <History className="w-3.5 h-3.5 text-indigo-400" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-2">
        <div>
          Showing {paginatedData.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(page * pageSize, sortedData.length)} of {sortedData.length} records
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 cursor-pointer text-slate-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page <strong className="text-white">{page}</strong> of{' '}
            <strong className="text-white">{totalPages}</strong>
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 cursor-pointer text-slate-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
