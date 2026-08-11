import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import axios from '../services/api';

const CATEGORY_META = {
  regular: { label: 'Regular Holiday', badge: 'badge-error', icon: 'fa-star' },
  special_non_working: { label: 'Special Non-Working', badge: 'badge-warning', icon: 'fa-calendar-xmark' },
  local: { label: 'Local Holiday', badge: 'badge-info', icon: 'fa-city' },
  special_working: { label: 'Special Working', badge: 'badge-ghost', icon: 'fa-briefcase' }
};

const HRHolidays = () => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    date: '',
    category: 'regular',
    recurring: true
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const yearOptions = [];
  for (let y = currentYear + 1; y >= currentYear - 4; y--) yearOptions.push(y);

  const fetchHolidays = async (targetYear = year) => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/holidays', { params: { year: targetYear } });
      if (response.data.success) {
        setHolidays(response.data.holidays || []);
      } else {
        setError(response.data.message || 'Failed to fetch holidays');
      }
    } catch (err) {
      setError('Failed to fetch holidays: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', date: '', category: 'regular', recurring: true });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (holiday) => {
    setEditing(holiday);
    setForm({
      name: holiday.name || '',
      date: holiday.date_in_year || String(holiday.date || '').slice(0, 10),
      category: holiday.category || 'regular',
      recurring: holiday.recurring !== undefined ? holiday.recurring : true
    });
    setFormError('');
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date) {
      setFormError('Holiday name and date are required');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      if (editing) {
        const res = await axios.put(`/api/holidays/${editing._id}`, form);
        if (res.data.success) setSuccess('Holiday updated successfully');
      } else {
        const res = await axios.post('/api/holidays', form);
        if (res.data.success) setSuccess('Holiday added successfully');
      }
      setShowModal(false);
      fetchHolidays(year);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save holiday');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (holiday) => {
    if (!window.confirm(`Delete holiday "${holiday.name}"? This will remove it from leave-day calculations.`)) return;
    try {
      const res = await axios.delete(`/api/holidays/${holiday._id}`);
      if (res.data.success) setSuccess('Holiday deleted successfully');
      fetchHolidays(year);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete holiday');
    }
  };

  const clearFlash = () => {
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  return (
    <Layout title="Holidays">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Holiday Calendar</h1>
            <p className="text-sm text-gray-500 mt-1">
              Non-working holidays are excluded when counting leave days. Special working holidays still count as work days.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="select select-bordered select-sm"
              value={year}
              onChange={(e) => { setYear(parseInt(e.target.value)); fetchHolidays(parseInt(e.target.value)); }}
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={openAdd} className="btn btn-primary btn-sm">
              <i className="fas fa-plus mr-1"></i> Add Holiday
            </button>
          </div>
        </div>

        {success && <div className="alert alert-success shadow-lg mb-4" onAnimationEnd={clearFlash}><span>{success}</span></div>}
        {error && <div className="alert alert-error shadow-lg mb-4"><span>{error}</span></div>}

        {loading ? (
          <div className="flex justify-center py-16"><span className="loading loading-spinner loading-lg text-primary"></span></div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <i className="fas fa-calendar-day text-4xl mb-3"></i>
            <p>No holidays set for {year}. Add the national and LGU holidays so leave days are counted correctly.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="table table-zebra w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-sm">Holiday</th>
                  <th className="text-sm">Date ({year})</th>
                  <th className="text-sm">Category</th>
                  <th className="text-sm">Type</th>
                  <th className="text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h, i) => {
                  const meta = CATEGORY_META[h.category] || CATEGORY_META.regular;
                  const dateObj = new Date(h.date_in_year || h.date);
                  return (
                    <tr key={h._id || i}>
                      <td className="font-medium">{h.name}</td>
                      <td>{dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                      <td>
                        <span className={`badge ${meta.badge} gap-1`}>
                          <i className={`fas ${meta.icon} text-xs`}></i> {meta.label}
                        </span>
                      </td>
                      <td>
                        {h.recurring ? (
                          <span className="badge badge-outline badge-sm">Recurring yearly</span>
                        ) : (
                          <span className="badge badge-outline badge-sm">One-off</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button onClick={() => openEdit(h)} className="btn btn-ghost btn-xs mr-1" title="Edit">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button onClick={() => handleDelete(h)} className="btn btn-ghost btn-xs text-error" title="Delete">
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">{editing ? 'Edit Holiday' : 'Add Holiday'}</h3>
            <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={() => setShowModal(false)}>✕</button>

            <form onSubmit={handleSubmit} className="py-4 space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Holiday Name</span></label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="e.g. Independence Day, Town Fiesta"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Date</span></label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    className="input input-bordered"
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-medium">Category</span></label>
                  <select name="category" value={form.category} onChange={handleChange} className="select select-bordered">
                    <option value="regular">Regular Holiday</option>
                    <option value="special_non_working">Special Non-Working</option>
                    <option value="local">Local Holiday (LGU)</option>
                    <option value="special_working">Special Working (still work)</option>
                  </select>
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    name="recurring"
                    checked={form.recurring}
                    onChange={handleChange}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span className="label-text">Recurring every year on this date</span>
                </label>
                {!form.recurring && (
                  <span className="text-xs text-gray-500">One-off holiday — only applies in {form.date ? new Date(form.date).getFullYear() : 'its'} year.</span>
                )}
              </div>

              {formError && <div className="alert alert-error py-2 text-sm"><span>{formError}</span></div>}

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? <span className="loading loading-spinner loading-xs"></span> : (editing ? 'Save Changes' : 'Add Holiday')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default HRHolidays;
