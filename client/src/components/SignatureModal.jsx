import React, { useRef, useState, useEffect } from 'react';

const SignatureModal = ({ isOpen, onClose, onSave, title = "Digital Signature" }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' or 'upload'
  const [uploadedImage, setUploadedImage] = useState(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'draw') {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.strokeStyle = '#1e3a8a'; // Deep blue ink
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }, 100);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas && hasDrawn) {
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
        onClose();
      } else {
        alert('Please draw your signature first.');
      }
    } else if (activeTab === 'upload') {
      if (uploadedImage) {
        onSave(uploadedImage);
        onClose();
      } else {
        alert('Please select an image file first.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <i className="fas fa-file-signature text-xl text-blue-200"></i>
            <h3 className="text-lg font-bold tracking-wide">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-blue-100 hover:text-white hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center space-x-2 transition-colors ${
              activeTab === 'draw'
                ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('draw')}
          >
            <i className="fas fa-pen text-xs"></i>
            <span>Draw Signature</span>
          </button>
          <button
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center space-x-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            <i className="fas fa-upload text-xs"></i>
            <span>Upload Image</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'draw' ? (
            <div className="flex flex-col items-center">
              <p className="text-xs text-gray-500 mb-3 text-center">
                Sign inside the box using your mouse, trackpad, or touchscreen.
              </p>
              <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-slate-50 w-full hover:border-blue-400 transition-colors">
                <canvas
                  ref={canvasRef}
                  width={440}
                  height={180}
                  className="w-full h-[180px] touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-400 text-sm font-medium">
                    Draw your signature here...
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={clearCanvas}
                className="mt-3 text-xs text-red-600 hover:text-red-800 font-semibold flex items-center space-x-1"
              >
                <i className="fas fa-eraser"></i>
                <span>Clear Canvas</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-xs text-gray-500 mb-3 text-center">
                Upload a transparent or clear image file of your official signature (PNG or JPG).
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="file-input file-input-bordered file-input-primary w-full max-w-xs text-xs mb-4"
              />
              {uploadedImage ? (
                <div className="border border-gray-200 rounded-xl p-3 bg-slate-50 max-h-40 max-w-full flex items-center justify-center overflow-hidden">
                  <img src={uploadedImage} alt="Uploaded Signature Preview" className="max-h-32 object-contain" />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl w-full h-36 flex flex-col items-center justify-center text-gray-400">
                  <i className="fas fa-image text-3xl mb-1"></i>
                  <span className="text-xs">No image selected</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
          <button
            type="button"
            className="btn btn-ghost btn-sm text-gray-600 hover:bg-gray-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm bg-blue-700 hover:bg-blue-800 text-white font-medium shadow-sm"
            onClick={handleSave}
          >
            <i className="fas fa-check mr-1"></i>
            Embed Signature
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
