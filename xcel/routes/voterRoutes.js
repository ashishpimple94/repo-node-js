import express from 'express';
import multer from 'multer';
import upload from '../middleware/upload.js';
import {
  uploadExcelFile,
  getAllVoters,
  getVoterById,
  deleteAllVoters,
  searchVoters,
} from '../controllers/voterController.js';

const router = express.Router();

// Async error wrapper to catch unhandled promise rejections
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Upload route with better error handling
router.post('/upload', (req, res, next) => {
  // Wrap multer middleware to catch errors
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File too large. Maximum ${process.env.MAX_FILE_SIZE_MB || 25}MB allowed`,
            message_mr: `फाइल बहुत बड़ी है। अधिकतम ${process.env.MAX_FILE_SIZE_MB || 25}MB अनुमति है`,
            error: err.message
          });
        }
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          message_mr: 'फ़ाइल अपलोड त्रुटि',
          error: err.message
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed',
        message_mr: 'फ़ाइल अपलोड विफल',
        error: err.message
      });
    }
    // If no error, proceed to upload handler
    next();
  });
}, asyncHandler(uploadExcelFile));
router.get('/search', asyncHandler(searchVoters)); // Search route (must be before /:id)
router.get('/', asyncHandler(getAllVoters));
router.get('/:id', asyncHandler(getVoterById));
router.delete('/', asyncHandler(deleteAllVoters));

export default router;

