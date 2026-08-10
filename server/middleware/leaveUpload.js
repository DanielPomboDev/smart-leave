const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Configure Cloudinary storage for leave supporting documents.
// Images are uploaded as image resources; PDF/Word/Excel/text files are
// uploaded as raw resources (still downloadable/viewable via their URL).
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    return {
      folder: 'smart-leave/leave-documents',
      resource_type: isImage ? 'image' : 'raw',
      // For images: restrict formats and resize. For raw files (PDF, Word,
      // Excel, text) Cloudinary cannot detect the format from a stream, so no
      // allowed_formats is sent — the multer fileFilter above already
      // restricts which file types can be uploaded.
      ...(isImage
        ? {
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [{ width: 1000, crop: 'limit' }]
          }
        : {})
    };
  }
});

// File filter: allow images, PDFs, Word docs, spreadsheets and text files
const fileFilter = (req, file, cb) => {
  const allowedMime = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  if (file.mimetype.startsWith('image/') || allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images, PDF, Word, Excel and text files are allowed!'), false);
  }
};

const leaveUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per file
  }
});

module.exports = leaveUpload;
