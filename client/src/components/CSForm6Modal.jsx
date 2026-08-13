import React, { useState, useRef, useEffect } from 'react';
import SignatureModal from './SignatureModal';
import axios from '../services/api';

const CSForm6Modal = ({ isOpen, onClose, leaveRecord, employee, onPdfChange }) => {
  const printableRef = useRef(null);
  const [activeSignatory, setActiveSignatory] = useState(null); // 'applicant', 'hr', 'department', 'mayor'
  const [signatures, setSignatures] = useState({
    applicant: leaveRecord?.applicant_signature || employee?.signature || '',
    hr: leaveRecord?.hr_signature || '',
    department: leaveRecord?.department_signature || '',
    mayor: leaveRecord?.mayor_signature || ''
  });
  const [signatoryNames, setSignatoryNames] = useState({
    hr: 'HR MANAGER / HRMO',
    department: 'DEPARTMENT HEAD',
    mayor: 'HON. MUNICIPAL MAYOR'
  });
  const [editingName, setEditingName] = useState(null); // 'hr' | 'department' | 'mayor'
  const [isSaving, setIsSaving] = useState(false);

  // Official signed PDF (PNPKI-signed copy of the finalized form)
  const pdfInputRef = useRef(null);
  const [officialPdf, setOfficialPdf] = useState(leaveRecord?.official_pdf?.url ? leaveRecord.official_pdf : null);
  const hasPdf = !!(officialPdf && officialPdf.url);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [pdfSuccess, setPdfSuccess] = useState('');

  // Sync stored signatures from the leave record when the form opens (signatures state is
  // initialized once at mount, so re-sync here). Also auto-embed the applicant's profile
  // signature onto the leave request so HR doesn't have to capture it manually.
  useEffect(() => {
    if (!isOpen || !leaveRecord) return;

    setSignatures(prev => ({
      applicant:  leaveRecord.applicant_signature  || prev.applicant,
      hr:         leaveRecord.hr_signature         || prev.hr,
      department: leaveRecord.department_signature || prev.department,
      mayor:      leaveRecord.mayor_signature      || prev.mayor
    }));

    setOfficialPdf(leaveRecord.official_pdf && leaveRecord.official_pdf.url ? leaveRecord.official_pdf : null);
    setPdfError('');
    setPdfSuccess('');

    // Use the actual approvers' names (fall back to the role title when not yet acted on)
    setSignatoryNames(prev => ({
      hr:         leaveRecord.hr_approved_by_name         || prev.hr,
      department: leaveRecord.department_approved_by_name || prev.department,
      mayor:      leaveRecord.mayor_approved_by_name      || prev.mayor
    }));

    // Persist the employee's profile signature as the applicant signature if not stored yet
    if (leaveRecord.leave_id && !leaveRecord.applicant_signature && employee?.signature) {
      axios.post(`/api/leave-requests/${leaveRecord.leave_id}/signatures`, {
        applicant_signature: employee.signature
      })
        .then(() => {
          setSignatures(prev => ({ ...prev, applicant: employee.signature }));
        })
        .catch(err => console.error('Error auto-embedding applicant signature:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, leaveRecord?.leave_id, leaveRecord?.applicant_signature, leaveRecord?.hr_approved_by_name, leaveRecord?.department_approved_by_name, leaveRecord?.mayor_approved_by_name, employee?.signature]);

  // Inline editable name component
  const EditableSignatoryName = ({ nameKey, className }) => {
    const [draft, setDraft] = React.useState(signatoryNames[nameKey]);
    if (editingName === nameKey) {
      return (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { setSignatoryNames(n => ({ ...n, [nameKey]: draft })); setEditingName(null); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { setSignatoryNames(n => ({ ...n, [nameKey]: draft })); setEditingName(null); } }}
          className={`border-b border-blue-400 outline-none text-center uppercase w-full bg-transparent ${className}`}
          style={{ minWidth: 120 }}
        />
      );
    }
    return (
      <p
        className={`${className} cursor-pointer group relative`}
        title="Click to edit name"
        onClick={() => { setDraft(signatoryNames[nameKey]); setEditingName(nameKey); }}
      >
        {signatoryNames[nameKey]}
        <span className="print:hidden ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" style={{fontSize:'8px'}}>✎</span>
      </p>
    );
  };

  if (!isOpen || !leaveRecord || !employee) return null;

  const leaveTypeLabels = {
    vacation: 'Vacation Leave',
    sick: 'Sick Leave',
    mandatory_forced_leave: 'Mandatory/Forced Leave',
    maternity_leave: 'Maternity Leave',
    paternity_leave: 'Paternity Leave',
    special_privilege_leave: 'Special Privilege Leave',
    solo_parent_leave: 'Solo Parent Leave',
    study_leave: 'Study Leave',
    vawc_leave: '10-Day VAWC Leave',
    rehabilitation_privilege: 'Rehabilitation Privilege',
    special_leave_benefits_women: 'Special Leave Benefits for Women',
    special_emergency: 'Special Emergency (Calamity) Leave',
    adoption_leave: 'Adoption Leave',
    monetization: 'Monetization of Leave Credits',
    terminal_leave: 'Terminal Leave',
    others_specify: 'Others'
  };

  const currentType = leaveRecord.type || 'vacation';
  // Types that deduct from vacation credits (used by the 7.A certification table)
  const isVacationType = ['vacation', 'special_privilege_leave', 'mandatory_forced_leave', 'study_leave', 'monetization', 'terminal_leave'].includes(currentType);
  // Types that ask for a vacation location (Philippines/Abroad) in 6.B
  const isLocationVacationType = ['vacation', 'special_privilege_leave', 'mandatory_forced_leave', 'study_leave'].includes(currentType);
  const isSickType = currentType === 'sick';

  // 7.A certification table — show the projected deduction and balance for this application.
  // The actual deduction is applied to the employee's credits only after the leave is approved.
  const isPendingLike = !['approved', 'cancelled'].includes(leaveRecord.status);
  const applicationDeduction = (cancelled) => {
    if (cancelled) return 0;
    // Approved requests use the recorded deduction (0 for without-pay);
    // pending/recommended/hr_approved requests preview the days this leave will use.
    return leaveRecord.status === 'approved' ? (leaveRecord.credits_deducted || 0) : (leaveRecord.days || 0);
  };
  const vacationDeduction = isVacationType ? applicationDeduction(leaveRecord.cancelled) : 0;
  const sickDeduction = isSickType ? applicationDeduction(leaveRecord.cancelled) : 0;
  const vacationBalance = Math.max(0, (leaveRecord.running_vacation_balance || 0) - (isPendingLike && isVacationType ? (leaveRecord.days || 0) : 0));
  const sickBalance = Math.max(0, (leaveRecord.running_sick_balance || 0) - (isPendingLike && isSickType ? (leaveRecord.days || 0) : 0));

  // Save signature to backend
  const handleSaveSignature = async (signatureDataUrl) => {
    if (!activeSignatory) return;

    const newSignatures = {
      ...signatures,
      [activeSignatory]: signatureDataUrl
    };
    setSignatures(newSignatures);

    if (leaveRecord.leave_id) {
      try {
        setIsSaving(true);
        const payload = {};
        if (activeSignatory === 'applicant') payload.applicant_signature = signatureDataUrl;
        if (activeSignatory === 'hr') payload.hr_signature = signatureDataUrl;
        if (activeSignatory === 'department') payload.department_signature = signatureDataUrl;
        if (activeSignatory === 'mayor') payload.mayor_signature = signatureDataUrl;

        await axios.post(`/api/leave-requests/${leaveRecord.leave_id}/signatures`, payload);
      } catch (err) {
        console.error('Error saving signature to backend:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Upload the official signed PDF (signed in Adobe Reader with the PNPKI certificate)
  const handlePdfUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = '';

    if (file.type !== 'application/pdf') {
      setPdfError('Please upload a PDF file (the signed copy from Adobe Reader).');
      return;
    }
    if (!leaveRecord.leave_id) {
      setPdfError('Cannot attach a PDF — no leave request is linked to this form.');
      return;
    }

    setPdfUploading(true);
    setPdfError('');
    setPdfSuccess('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post(`/api/leave-requests/${leaveRecord.leave_id}/official-pdf`, fd);
      if (res.data.success) {
        setOfficialPdf(res.data.official_pdf);
        setPdfSuccess('Signed PDF uploaded successfully.');
        if (onPdfChange) onPdfChange();
      } else {
        setPdfError(res.data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading signed PDF:', err);
      setPdfError(err.response?.data?.message || 'Upload failed');
    } finally {
      setPdfUploading(false);
    }
  };

  // Remove the official signed PDF
  const handlePdfRemove = async () => {
    if (!leaveRecord.leave_id) return;
    if (!window.confirm('Remove the signed PDF from this leave request?')) return;
    try {
      const res = await axios.delete(`/api/leave-requests/${leaveRecord.leave_id}/official-pdf`);
      if (res.data.success) {
        setOfficialPdf(null);
        setPdfSuccess('');
        setPdfError('');
        if (onPdfChange) onPdfChange();
      }
    } catch (err) {
      console.error('Error removing signed PDF:', err);
      setPdfError(err.response?.data?.message || 'Failed to remove the signed PDF');
    }
  };

  const handlePrint = () => {
    const printArea = printableRef.current;
    if (!printArea) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow popups for this site to enable printing.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>CS Form No. 6 - Application for Leave</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; }
          /* Hide app-only UI elements (status chips, edit hints) from the official form */
          .print\\:hidden { display: none !important; }
          /* Tight body margins to maximize space on A4 */
          html, body { margin: 4mm; padding: 0; font-family: Arial, sans-serif; font-size: 7.5pt; background: white; color: black; }
          /* Override all Tailwind spacing to be more compact */
          .cs-form-6-printable-area { border: 2px solid black; padding: 6px !important; max-width: 100% !important; }
          .space-y-3 > * + * { margin-top: 4px !important; }
          .space-y-2 > * + * { margin-top: 3px !important; }
          .space-y-1\\.5 > * + * { margin-top: 2px !important; }
          .space-y-1 > * + * { margin-top: 2px !important; }
          .space-y-0\\.5 > * + * { margin-top: 1px !important; }
          .p-6, .sm\\:p-6 { padding: 4px !important; }
          .p-4 { padding: 4px !important; }
          .p-3 { padding: 3px !important; }
          .p-2 { padding: 3px !important; }
          .p-1\\.5 { padding: 2px !important; }
          .p-1 { padding: 2px !important; }
          .px-2 { padding-left: 4px !important; padding-right: 4px !important; }
          .py-1\\.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .py-1 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .py-2 { padding-top: 3px !important; padding-bottom: 3px !important; }
          .pb-2 { padding-bottom: 4px !important; }
          .pb-0\\.5 { padding-bottom: 1px !important; }
          .pl-2 { padding-left: 4px !important; }
          .pl-1 { padding-left: 2px !important; }
          .mt-1 { margin-top: 2px !important; }
          .mt-2 { margin-top: 3px !important; }
          .mt-4 { margin-top: 4px !important; }
          .mt-6 { margin-top: 6px !important; }
          .mb-1 { margin-bottom: 2px !important; }
          .mb-2 { margin-bottom: 3px !important; }
          .pt-1 { padding-top: 2px !important; }
          .pt-3 { padding-top: 4px !important; }
          /* Font sizes - keep very small for density */
          .text-xs, .text-\\[9.5px\\] { font-size: 6.5pt !important; }
          .text-sm { font-size: 7pt !important; }
          .text-\\[9px\\]  { font-size: 6pt !important; }
          .text-\\[10px\\] { font-size: 6.5pt !important; }
          .text-\\[11px\\] { font-size: 7pt !important; }
          .text-\\[12px\\] { font-size: 7.5pt !important; }
          .text-\\[8px\\]  { font-size: 5.5pt !important; }
          .text-\\[8.5px\\]{ font-size: 6pt !important; }
          /* Heights */
          .h-10 { height: 22px !important; }
          .h-12 { height: 28px !important; }
          .h-16 { height: 36px !important; }
          .w-16 { width: 40px !important; }
          .w-32 { width: 80px !important; }
          .min-h-\\[60px\\] { min-height: 30px !important; }
          .min-h-\\[40px\\] { min-height: 20px !important; }
          .min-h-\\[30px\\] { min-height: 16px !important; }
          /* Signature positioning */
          .-top-7 { top: -20px !important; }
          .-top-6 { top: -18px !important; }
          .-top-8 { top: -22px !important; }
          /* Layout */
          .grid { display: grid; }
          .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
          .col-span-1  { grid-column: span 1; }
          .col-span-2  { grid-column: span 2; }
          .col-span-3  { grid-column: span 3; }
          .col-span-4  { grid-column: span 4; }
          .col-span-5  { grid-column: span 5; }
          .col-span-6  { grid-column: span 6; }
          .col-span-7  { grid-column: span 7; }
          .col-span-8  { grid-column: span 8; }
          .col-span-9  { grid-column: span 9; }
          .col-span-10 { grid-column: span 10; }
          .col-span-12 { grid-column: span 12; }
          .divide-x > * + * { border-left: 1px solid black; }
          .divide-black > * + * { border-color: black; }
          .border   { border: 1px solid black; }
          .border-2 { border: 2px solid black; }
          .border-black { border-color: black; }
          .border-b   { border-bottom: 1px solid black; }
          .border-b-2 { border-bottom: 2px solid black; }
          .border-t   { border-top: 1px solid black; }
          .border-t-2 { border-top: 2px solid black; }
          .border-x   { border-left: 1px solid black; border-right: 1px solid black; }
          .border-gray-300 { border-color: #d1d5db; }
          .border-gray-400 { border-color: #9ca3af; }
          .flex { display: flex; }
          .flex-col { flex-direction: column; }
          .flex-wrap { flex-wrap: wrap; }
          .items-start  { align-items: flex-start; }
          .items-center { align-items: center; }
          .items-end    { align-items: flex-end; }
          .justify-between { justify-content: space-between; }
          .justify-center  { justify-content: center; }
          .text-center { text-align: center; }
          .text-right  { text-align: right; }
          .text-left   { text-align: left; }
          .font-bold      { font-weight: bold; }
          .font-semibold  { font-weight: 600; }
          .font-extrabold { font-weight: 800; }
          .font-normal    { font-weight: normal; }
          .font-medium    { font-weight: 500; }
          .italic  { font-style: italic; }
          .uppercase    { text-transform: uppercase; }
          .underline    { text-decoration: underline; }
          .tracking-wide    { letter-spacing: 0.015em; }
          .tracking-wider   { letter-spacing: 0.03em; }
          .tracking-widest  { letter-spacing: 0.06em; }
          .tracking-tight   { letter-spacing: -0.015em; }
          .bg-gray-50   { background-color: #f9fafb; }
          .bg-gray-100  { background-color: #f3f4f6; }
          .bg-gray-200  { background-color: #e5e7eb; }
          .bg-white     { background: white; }
          .bg-yellow-50\\/50 { background-color: #fefce8; }
          .text-gray-400 { color: #9ca3af; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-700 { color: #374151; }
          .text-black    { color: black; }
          .text-blue-800   { color: #1e40af; }
          .text-emerald-800{ color: #065f46; }
          .text-red-600    { color: #dc2626; }
          .inline-block { display: inline-block; }
          .block        { display: block; }
          .relative     { position: relative; }
          .absolute     { position: absolute; }
          .left-1\\/2   { left: 50%; }
          .-translate-x-1\\/2 { transform: translateX(-50%); }
          .mx-auto      { margin-left: auto; margin-right: auto; }
          .ml-1         { margin-left: 2px; }
          .space-x-1    > * + * { margin-left: 2px; }
          .space-x-1\\.5 > * + * { margin-left: 3px; }
          .space-x-2    > * + * { margin-left: 4px; }
          .space-x-4    > * + * { margin-left: 8px; }
          .gap-2        { gap: 4px; }
          .w-full  { width: 100%; }
          .w-3     { width: 9px; }
          .h-3     { height: 9px; }
          .w-5     { width: 12px; }
          .h-5     { height: 12px; }
          .max-w-\\[760px\\] { max-width: 100%; }
          .max-w-none  { max-width: none; }
          .max-w-xs    { max-width: 160px; }
          .object-contain { object-fit: contain; }
          img { max-width: 100%; }
          /* Table */
          table { border-collapse: collapse; width: 100%; }
          th, td { padding: 2px 3px !important; }
          .border-collapse { border-collapse: collapse; }
          .border-r { border-right: 1px solid black; }
          /* Prevent page breaks inside any section */
          .cs-form-6-printable-area > *,
          .cs-form-6-printable-area .border,
          .cs-form-6-printable-area .grid,
          .cs-form-6-printable-area table,
          .cs-form-6-printable-area tr { page-break-inside: avoid; }
          @page { size: A4 portrait; margin: 4mm; }
        </style>
      </head>
      <body>
        ${printArea.outerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Solid ruled blank line matching the official form's fill-in lines (width in px, tuned to the ~760px form)
  const BlankLine = ({ width = 120 }) => (
    <span className="inline-block border-b border-black align-bottom" style={{ width: `${width}px`, height: '12px' }} />
  );

  // Official-style check box: a small square with a check mark when checked. Rendered as a span so
  // it looks identical on screen and in the print window (no dependency on daisyUI CSS).
  const CheckBox = ({ checked }) => (
    <span
      className="inline-block border border-black text-center font-bold"
      style={{ width: '11px', height: '11px', fontSize: '9px', lineHeight: '9px' }}
    >
      {checked ? '✓' : ''}
    </span>
  );

  const fullName = `${employee.last_name?.toUpperCase() || ''}, ${employee.first_name || ''} ${employee.middle_initial ? employee.middle_initial + '.' : ''}`;
  const deptName = employee.department_id?.name || 'Municipal Government';
  const filingDate = leaveRecord.created_at ? new Date(leaveRecord.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="cs-form-6-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block">
      {/* Modal Card */}
      <div className="cs-form-6-modal-card bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Top Action Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between print:hidden border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">CS Form No. 6</span>
            <h3 className="text-base font-semibold text-gray-100">Application for Leave (Revised 2020)</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none space-x-1.5 shadow-sm"
            >
              <i className="fas fa-print text-sm"></i>
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost text-gray-300 hover:text-white"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>

        {/* Quick Signatures Bar (Hidden on print) */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs print:hidden gap-2">
          <span className="font-semibold text-slate-700 flex items-center">
            <i className="fas fa-signature text-blue-600 mr-1.5"></i>
            Embed Digital Signatures:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSignatory('applicant')}
              className={`btn btn-xs ${signatures.applicant ? 'btn-success text-white' : 'btn-outline border-slate-300'}`}
            >
              <i className={`fas ${signatures.applicant ? 'fa-check-circle' : 'fa-pen'}`}></i>
              Applicant Sign
            </button>
            <button
              onClick={() => setActiveSignatory('hr')}
              className={`btn btn-xs ${signatures.hr ? 'btn-success text-white' : 'btn-outline border-slate-300'}`}
            >
              <i className={`fas ${signatures.hr ? 'fa-check-circle' : 'fa-pen'}`}></i>
              HR Manager Sign
            </button>
            <button
              onClick={() => setActiveSignatory('department')}
              className={`btn btn-xs ${signatures.department ? 'btn-success text-white' : 'btn-outline border-slate-300'}`}
            >
              <i className={`fas ${signatures.department ? 'fa-check-circle' : 'fa-pen'}`}></i>
              Dept Head Sign
            </button>
            <button
              onClick={() => setActiveSignatory('mayor')}
              className={`btn btn-xs ${signatures.mayor ? 'btn-success text-white' : 'btn-outline border-slate-300'}`}
            >
              <i className={`fas ${signatures.mayor ? 'fa-check-circle' : 'fa-pen'}`}></i>
              Mayor Sign
            </button>
          </div>
        </div>

        {/* Official Signed PDF Bar (Hidden on print) */}
        <div className="bg-white px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs print:hidden gap-2">
          <span className="font-semibold text-slate-700 flex items-center">
            <i className="fas fa-file-signature text-red-600 mr-1.5"></i>
            Official Signed PDF (PNPKI):
          </span>
          {hasPdf ? (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={officialPdf.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-xs btn-success text-white border-none"
              >
                <i className="fas fa-file-pdf mr-1"></i>
                {officialPdf.name || 'Signed Form'}
              </a>
              <span className="text-gray-500">
                by <span className="font-semibold">{officialPdf.uploaded_by_name || '—'}</span>
                {officialPdf.uploaded_at ? ` on ${new Date(officialPdf.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}
              </span>
              <button onClick={handlePdfRemove} className="btn btn-xs btn-ghost text-error">
                <i className="fas fa-trash mr-1"></i>Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-500 max-w-md">
                Sign the exported PDF in Adobe Reader with the PNPKI certificate, then upload the signed copy here.
              </span>
              <button
                onClick={() => pdfInputRef.current && pdfInputRef.current.click()}
                className="btn btn-xs btn-outline border-red-300 text-red-600"
                disabled={pdfUploading}
              >
                <i className={`fas ${pdfUploading ? 'fa-spinner fa-spin' : 'fa-upload'} mr-1`}></i>
                {pdfUploading ? 'Uploading...' : 'Upload Signed PDF'}
              </button>
            </div>
          )}
          {pdfError && <span className="text-error font-semibold w-full">{pdfError}</span>}
          {pdfSuccess && <span className="text-green-600 font-semibold w-full">{pdfSuccess}</span>}
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handlePdfUpload}
          />
        </div>

        {/* Form Body - CS Form No. 6 Standard Layout */}
        <div className="p-6 sm:p-8 overflow-y-auto overflow-x-auto text-black font-sans text-xs bg-white print:p-0 print:overflow-visible">
          
          {/* Printable Page Wrapper — keeps the official form layout on phones by scrolling horizontally instead of squeezing */}
          <div ref={printableRef} className="cs-form-6-printable-area max-w-[760px] mx-auto min-w-[620px] sm:min-w-0 print:min-w-0 border-2 border-black p-4 sm:p-6 bg-white space-y-3 print:border-2 print:p-4 print:max-w-none print:w-full">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
              <div>
                <p className="text-[10px] font-bold tracking-tight">CS Form No. 6</p>
                <p className="text-[9px] italic text-gray-700">Revised 2020</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider">Republic of the Philippines</p>
                <p className="text-[12px] font-extrabold uppercase">MUNICIPAL GOVERNMENT OF SAN JULIAN</p>
                <h1 className="text-sm font-extrabold uppercase mt-1 tracking-widest border-b border-black inline-block px-4 pb-0.5">APPLICATION FOR LEAVE</h1>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-gray-500">STAMP DATE OF RECEIPT</p>
              </div>
            </div>

            {/* Section 1 - 5 */}
            <div className="grid grid-cols-12 border border-black divide-x divide-black text-[11px]">
              <div className="col-span-7 p-1.5">
                <span className="font-semibold text-[10px] block">1. OFFICE/DEPARTMENT</span>
                <span className="font-bold text-xs uppercase pl-2">{deptName}</span>
              </div>
              <div className="col-span-5 p-1.5 flex flex-col justify-between">
                <div>
                  <span className="font-semibold text-[10px] block">2. NAME : (Last, First, Middle)</span>
                  <span className="font-bold text-xs uppercase pl-2">{fullName}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 border-x border-b border-black divide-x divide-black text-[11px]">
              <div className="col-span-4 p-1.5">
                <span className="font-semibold text-[10px] block">3. DATE OF FILING</span>
                <span className="font-bold text-xs pl-2">{filingDate}</span>
              </div>
              <div className="col-span-5 p-1.5">
                <span className="font-semibold text-[10px] block">4. POSITION</span>
                <span className="font-bold text-xs uppercase pl-2">{employee.position || 'Employee'}</span>
              </div>
              <div className="col-span-3 p-1.5">
                <span className="font-semibold text-[10px] block">5. SALARY</span>
                <span className="font-bold text-xs pl-2">₱{employee.salary ? employee.salary.toLocaleString() : 'N/A'}</span>
              </div>
            </div>

            {/* Section 6: DETAILS OF APPLICATION */}
            <div className="border border-black">
              <div className="border-b border-black px-2 py-1 font-bold text-[11px] uppercase tracking-wide text-center">
                6. DETAILS OF APPLICATION
              </div>
              
              <div className="grid grid-cols-12 divide-x divide-black">
                {/* 6.A TYPE OF LEAVE */}
                <div className="col-span-6 p-2 space-y-1.5">
                  <p className="font-bold text-[10px] uppercase">6.A TYPE OF LEAVE TO BE AVAILED OF</p>
                  
                  <div className="space-y-1 pl-1 text-[10px]">
                    {[
                      { key: 'vacation', label: 'Vacation Leave (Sec. 51, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
                      { key: 'mandatory_forced_leave', label: 'Mandatory/Forced Leave (Sec. 25, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
                      { key: 'sick', label: 'Sick Leave (Sec. 43, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
                      { key: 'maternity_leave', label: 'Maternity Leave (R.A. No. 11210 / IRR issued by CSC, DOLE and SSS)' },
                      { key: 'paternity_leave', label: 'Paternity Leave (R.A. No. 8187 / CSC MC No. 71, s. 1998, as amended)' },
                      { key: 'special_privilege_leave', label: 'Special Privilege Leave (Sec. 21, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
                      { key: 'solo_parent_leave', label: 'Solo Parent Leave (RA No. 8972 / CSC MC No. 8, s. 2004)' },
                      { key: 'study_leave', label: 'Study Leave (Sec. 68, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
                      { key: 'vawc_leave', label: '10-Day VAWC Leave (RA No. 9262 / CSC MC No. 15, s. 2005)' },
                      { key: 'rehabilitation_privilege', label: 'Rehabilitation Privilege (Sec. 55, Rule XVI, Omnibus Rules Implementing E.O. No. 292)' },
                      { key: 'special_leave_benefits_women', label: 'Special Leave Benefits for Women (RA No. 9710 / CSC MC No. 25, s. 2010)' },
                      { key: 'special_emergency', label: 'Special Emergency (Calamity) Leave (CSC MC No. 2, s. 2012, as amended)' },
                      { key: 'adoption_leave', label: 'Adoption Leave (R.A. No. 8552)' },
                      { key: 'others_specify', label: <>Others:{currentType === 'others_specify' ? ` ${leaveRecord.location_specify || 'Specified'}` : currentType === 'monetization' ? ' Monetization of Leave Credits' : currentType === 'terminal_leave' ? ' Terminal Leave' : <BlankLine width={200} />}</> }
                    ].map(item => (
                      <div key={item.key} className="flex items-center space-x-1.5">
                        <CheckBox checked={currentType === item.key || (item.key === 'others_specify' && (currentType === 'monetization' || currentType === 'terminal_leave'))} />
                        <span className={currentType === item.key ? 'font-bold underline' : ''}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6.B DETAILS OF LEAVE */}
                <div className="col-span-6 p-2 space-y-3">
                  <p className="font-bold text-[10px] uppercase">6.B DETAILS OF LEAVE</p>
                  
                  {/* Vacation Details */}
                  <div className="space-y-1 pl-1 text-[10px]">
                    <p className="font-semibold italic text-[9.5px]">In case of Vacation/Special Privilege Leave:</p>
                    <div className="pl-2 space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <CheckBox checked={isLocationVacationType && (!leaveRecord.where_spent || leaveRecord.where_spent === 'philippines')} />
                        <span>Within the Philippines</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <CheckBox checked={isLocationVacationType && leaveRecord.where_spent === 'abroad'} />
                        <span>Abroad (Specify): {leaveRecord.where_spent === 'abroad' ? <span className="underline font-bold">{leaveRecord.location_specify || 'N/A'}</span> : <BlankLine width={200} />}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sick Details */}
                  <div className="space-y-1 pl-1 text-[10px]">
                    <p className="font-semibold italic text-[9.5px]">In case of Sick Leave:</p>
                    <div className="pl-2 space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <CheckBox checked={isSickType && leaveRecord.where_spent === 'hospital'} />
                        <span>In Hospital (Specify Illness): {isSickType && leaveRecord.where_spent === 'hospital' ? <span className="underline font-bold">{leaveRecord.location_specify || 'N/A'}</span> : <BlankLine width={200} />}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <CheckBox checked={isSickType && (leaveRecord.where_spent === 'outpatient' || !leaveRecord.where_spent)} />
                        <span>Out Patient (Specify Illness): {isSickType && leaveRecord.where_spent === 'outpatient' ? <span className="underline font-bold">{leaveRecord.location_specify || 'N/A'}</span> : <BlankLine width={200} />}</span>
                      </div>
                    </div>
                  </div>

                  {/* Study Leave / Special Benefits */}
                  <div className="space-y-1 pl-1 text-[10px]">
                    <p className="font-semibold italic text-[9.5px]">In case of Special Leave Benefits for Women:</p>
                    <p className="pl-2 text-[9.5px]">Specify Illness: {currentType === 'special_leave_benefits_women' ? <span className="underline font-bold">{leaveRecord.location_specify || 'N/A'}</span> : <BlankLine width={300} />}</p>
                  </div>

                  {/* Study Leave Details */}
                  <div className="space-y-1 pl-1 text-[10px]">
                    <p className="font-semibold italic text-[9.5px]">In case of Study Leave:</p>
                    <div className="pl-2 space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <CheckBox checked={currentType === 'study_leave' && leaveRecord.where_spent === 'masteral'} />
                        <span>Completion of Master's Degree</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <CheckBox checked={currentType === 'study_leave' && leaveRecord.where_spent === 'board_review'} />
                        <span>BAR/Board Examination Review</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <CheckBox checked={currentType === 'study_leave' && leaveRecord.where_spent !== 'masteral' && leaveRecord.where_spent !== 'board_review' && !!leaveRecord.location_specify} />
                        <span>Other purpose: {currentType === 'study_leave' && leaveRecord.location_specify ? <span className="underline font-bold">{leaveRecord.location_specify}</span> : <BlankLine width={200} />}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <CheckBox checked={currentType === 'monetization'} />
                        <span>Monetization of Leave Credits{currentType === 'monetization' ? <span className="underline font-bold"> ({leaveRecord.days} days)</span> : null}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <CheckBox checked={currentType === 'terminal_leave'} />
                        <span>Terminal Leave{currentType === 'terminal_leave' ? <span className="underline font-bold"> ({leaveRecord.days} days)</span> : null}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6.C & 6.D Footer Row */}
              <div className="grid grid-cols-12 border-t border-black divide-x divide-black text-[10px]">
                <div className="col-span-6 p-2 space-y-1">
                  <p className="font-bold uppercase text-[9.5px]">6.C NUMBER OF WORKING DAYS APPLIED FOR</p>
                  <p className="pl-2 font-bold text-xs">{leaveRecord.days} day(s)</p>
                  <p className="font-bold uppercase text-[9.5px] mt-2">INCLUSIVE DATES</p>
                  {/* CSC MC No. 31: no inclusive dates may be indicated for monetization / terminal leave */}
                  <p className="pl-2 font-bold text-xs underline">
                    {currentType === 'monetization' || currentType === 'terminal_leave'
                      ? '—'
                      : `${leaveRecord.start_date} to ${leaveRecord.end_date}`}
                  </p>
                </div>

                <div className="col-span-6 p-2 flex flex-col justify-between">
                  <div>
                    <p className="font-bold uppercase text-[9.5px]">6.D COMMUTATION</p>
                    <div className="flex space-x-4 pl-2 mt-1 text-[10px]">
                      <div className="flex items-center space-x-1">
                        <CheckBox checked={leaveRecord.commutation === true} />
                        <span>Requested</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckBox checked={!leaveRecord.commutation} />
                        <span>Not Requested</span>
                      </div>
                    </div>
                  </div>

                  {/* Applicant Signature */}
                  <div className="mt-4 text-center border-t border-gray-300 pt-1 relative">
                    {signatures.applicant ? (
                      <img src={signatures.applicant} alt="Applicant Signature" className="h-10 mx-auto object-contain absolute -top-7 left-1/2 -translate-x-1/2" />
                    ) : (
                      <span className="text-[8px] text-gray-400 block italic">Signature of Applicant</span>
                    )}
                    <p className="font-bold text-[10px] uppercase underline mt-2">{fullName}</p>
                    <p className="text-[8px] text-gray-600">Signature of Applicant</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 7: DETAILS OF ACTION ON APPLICATION */}
            <div className="border border-black">
              <div className="border-b border-black px-2 py-1 font-bold text-[11px] uppercase tracking-wide text-center">
                7. DETAILS OF ACTION ON APPLICATION
              </div>

              <div className="grid grid-cols-12 divide-x divide-black">
                {/* 7.A CERTIFICATION OF LEAVE CREDITS */}
                <div className="col-span-6 p-2 space-y-2">
                  <p className="font-bold text-[10px] uppercase">7.A CERTIFICATION OF LEAVE CREDITS</p>
                  <p className="text-[9px] pl-1">As of <span className="underline font-bold">{filingDate}</span></p>

                  <table className="w-full text-center border-collapse border border-black text-[9.5px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-black">
                        <th className="border-r border-black p-1 text-left">Particulars</th>
                        <th className="border-r border-black p-1">Vacation Leave</th>
                        <th className="p-1">Sick Leave</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-1 text-left font-medium">Total Earned</td>
                        <td className="border-r border-black p-1">{(leaveRecord.running_vacation_balance + (isVacationType ? (leaveRecord.credits_deducted || 0) : 0)).toFixed(3)}</td>
                        <td className="p-1">{(leaveRecord.running_sick_balance + (isSickType ? (leaveRecord.credits_deducted || 0) : 0)).toFixed(3)}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-1 text-left font-medium">Less this application</td>
                        <td className="border-r border-black p-1 font-bold text-red-600">{vacationDeduction.toFixed(3)}</td>
                        <td className="p-1 font-bold text-red-600">{sickDeduction.toFixed(3)}</td>
                      </tr>
                      <tr className="bg-yellow-50/50">
                        <td className="border-r border-black p-1 text-left font-bold">Balance</td>
                        <td className="border-r border-black p-1 font-bold text-blue-800">{vacationBalance.toFixed(3)}</td>
                        <td className="p-1 font-bold text-emerald-800">{sickBalance.toFixed(3)}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Certification of Leave Credits (7.A) */}
                  {leaveRecord.credits_certified && (
                    <div className="mt-2 bg-green-50 border border-green-300 rounded px-2 py-1.5 text-[9px] print:hidden">
                      <p className="font-bold text-green-800">✓ Leave credits certified correct</p>
                      <p className="text-green-700">
                        Certified by: <span className="font-semibold uppercase">{leaveRecord.credits_certified_by_name || 'HR Officer'}</span>
                        {leaveRecord.credits_certified_at ? ` on ${new Date(leaveRecord.credits_certified_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
                      </p>
                    </div>
                  )}

                  {/* HR Officer Signature */}
                  <div className="mt-2 text-center pt-3 relative">
                    {signatures.hr ? (
                      <img src={signatures.hr} alt="HR Signature" className="h-10 mx-auto object-contain absolute -top-6 left-1/2 -translate-x-1/2" />
                    ) : (
                      <span className="text-[8px] text-gray-400 block italic">HR Manager Digital Signature</span>
                    )}
                    <EditableSignatoryName nameKey="hr" className="font-bold text-[10px] uppercase underline mt-1" />
                    <p className="text-[8px] text-gray-600">Authorized HR Officer</p>
                  </div>
                </div>

                {/* 7.B RECOMMENDATION */}
                <div className="col-span-6 p-2 space-y-2 flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-[10px] uppercase">7.B RECOMMENDATION</p>
                    <div className="space-y-1 pl-2 mt-1 text-[10px]">
                      <div className="flex items-center space-x-1.5">
                        <CheckBox checked={leaveRecord.status === 'recommended' || leaveRecord.status === 'hr_approved' || leaveRecord.status === 'approved'} />
                        <span className="font-semibold">For approval</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <CheckBox checked={leaveRecord.status === 'disapproved'} />
                        <span>For disapproval due to: <BlankLine width={150} /></span>
                      </div>
                    </div>
                  </div>

                  {/* Dept Head Signature */}
                  <div className="text-center pt-3 relative">
                    {signatures.department ? (
                      <img src={signatures.department} alt="Dept Head Signature" className="h-10 mx-auto object-contain absolute -top-6 left-1/2 -translate-x-1/2" />
                    ) : (
                      <span className="text-[8px] text-gray-400 block italic">Department Head Signature</span>
                    )}
                    <EditableSignatoryName nameKey="department" className="font-bold text-[10px] uppercase underline mt-1" />
                    <p className="text-[8px] text-gray-600">Head of Department / Office</p>
                  </div>
                </div>
              </div>

              {/* 7.C APPROVED FOR: / 7.D DISAPPROVED DUE TO: */}
              <div className="border-t border-black grid grid-cols-12 divide-x divide-black text-[10px]">
                <div className="col-span-7 p-3 space-y-1">
                  <p className="font-bold text-[10px] uppercase mb-2">7.C APPROVED FOR:</p>
                  <div className="flex items-center space-x-1.5">
                    <CheckBox checked={leaveRecord.status === 'approved' && leaveRecord.paid} />
                    <span><span className="font-bold underline">{leaveRecord.paid ? leaveRecord.days : 0}</span> days with pay</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckBox checked={leaveRecord.status === 'approved' && !leaveRecord.paid} />
                    <span><span className="font-bold underline">{!leaveRecord.paid ? leaveRecord.days : 0}</span> days without pay</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckBox checked={false} />
                    <span>Others (Specify): <BlankLine width={135} /></span>
                  </div>
                </div>

                <div className="col-span-5 p-3">
                  <p className="font-bold text-[10px] uppercase mb-2">7.D DISAPPROVED DUE TO:</p>
                  <div className="flex items-center space-x-1.5">
                    <CheckBox checked={leaveRecord.status === 'disapproved'} />
                    <span><BlankLine width={170} /></span>
                  </div>
                </div>
              </div>

              {/* Mayor Signature */}
              <div className="border-t border-black pt-3 pb-2">
                <div className="mt-2 text-center pt-3 relative max-w-xs mx-auto">
                  {signatures.mayor ? (
                    <img src={signatures.mayor} alt="Mayor Signature" className="h-12 mx-auto object-contain absolute -top-8 left-1/2 -translate-x-1/2" />
                  ) : (
                    <span className="text-[8px] text-gray-400 block italic">Municipal Mayor / Agency Head Signature</span>
                  )}
                  <EditableSignatoryName nameKey="mayor" className="font-extrabold text-[11px] uppercase underline mt-2" />
                  <p className="text-[8.5px] text-gray-600 font-semibold">Head of Agency / Authorized Representative</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-3 border-t border-gray-200 flex justify-between items-center print:hidden">
          <span className="text-xs text-gray-500">
            {isSaving && <span className="text-blue-600 flex items-center"><i className="fas fa-spinner fa-spin mr-1"></i> Saving signature...</span>}
          </span>
          <button
            onClick={onClose}
            className="btn btn-sm btn-outline border-gray-300 hover:bg-gray-200 text-gray-700"
          >
            Close Form
          </button>
        </div>
      </div>

      {/* Signature Capture Modal */}
      {activeSignatory && (
        <SignatureModal
          isOpen={!!activeSignatory}
          onClose={() => setActiveSignatory(null)}
          onSave={handleSaveSignature}
          title={`Embed Signature - ${
            activeSignatory === 'applicant' ? 'Applicant' :
            activeSignatory === 'hr' ? 'HR Manager' :
            activeSignatory === 'department' ? 'Department Head' : 'Mayor'
          }`}
        />
      )}
    </div>
  );
};

export default CSForm6Modal;
