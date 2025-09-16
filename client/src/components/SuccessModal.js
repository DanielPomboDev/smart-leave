import React from 'react';

const SuccessModal = ({ isOpen, onClose, title = "Success!", message, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="bg-white rounded-lg shadow-xl p-4 md:p-6 w-full max-w-md z-10 transform transition-all">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <i className="fas fa-check-circle text-green-600 text-2xl"></i>
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          
          <p className="text-sm text-gray-500 mb-6">
            {message || "Your request has been processed successfully."}
          </p>
          
          <div className="flex justify-center">
            <button
              type="button"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
              onClick={onConfirm || onClose}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;