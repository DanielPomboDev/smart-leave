import React, { useState } from 'react';

const CalculateCreditsModal = ({ isOpen, onClose, onConfirm, title = "Calculate Credits", confirmText = "Calculate", cancelText = "Cancel" }) => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(month, year);
  };

  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const isFutureMonth = parseInt(year) > currentYear || (parseInt(year) === currentYear && parseInt(month) >= currentMonth);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-md z-10 transform transition-all">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <i className="fas fa-calculator text-blue-600 text-2xl"></i>
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          
          <div className="form-control">
              <label className="label">
                  <span className="label-text font-medium text-gray-700">Month</span>
              </label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="select select-bordered border-gray-300 focus:border-blue-500 w-full">
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
          </div>
          <div className="form-control">
              <label className="label">
                  <span className="label-text font-medium text-gray-700">Year</span>
              </label>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="input input-bordered border-gray-300 focus:border-blue-500 w-full" />
          </div>

          {isFutureMonth && (
            <p className="text-red-500 text-sm mt-4">You can only calculate leave credits for past months.</p>
          )}
          
          <div className="flex justify-center space-x-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium rounded-md transition-colors duration-200"
              onClick={onClose}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200 ${isFutureMonth ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleConfirm}
              disabled={isFutureMonth}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculateCreditsModal;