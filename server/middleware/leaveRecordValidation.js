const { body, validationResult } = require('express-validator');

// Validation rules for creating a leave record
exports.createLeaveRecordValidation = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030'),
  body('vacation_earned').optional().isNumeric().withMessage('Vacation earned must be a number'),
  body('vacation_used').optional().isNumeric().withMessage('Vacation used must be a number'),
  body('sick_earned').optional().isNumeric().withMessage('Sick earned must be a number'),
  body('sick_used').optional().isNumeric().withMessage('Sick used must be a number'),
  body('undertime_hours').optional().isNumeric().withMessage('Undertime hours must be a number'),
  
  // Custom validation to check for errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }
    next();
  }
];

// Validation rules for updating a leave record
exports.updateLeaveRecordValidation = [
  body('vacation_earned').optional().isNumeric().withMessage('Vacation earned must be a number'),
  body('vacation_used').optional().isNumeric().withMessage('Vacation used must be a number'),
  body('sick_earned').optional().isNumeric().withMessage('Sick earned must be a number'),
  body('sick_used').optional().isNumeric().withMessage('Sick used must be a number'),
  body('undertime_hours').optional().isNumeric().withMessage('Undertime hours must be a number'),
  
  // Custom validation to check for errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }
    next();
  }
];

// Validation rules for manually adding/updating earned leave credits
exports.addLeaveCreditsValidation = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030'),
  body('vacation_earned').optional().isFloat({ min: 0, max: 31 }).withMessage('Vacation earned must be a number between 0 and 31'),
  body('sick_earned').optional().isFloat({ min: 0, max: 31 }).withMessage('Sick earned must be a number between 0 and 31'),

  // Custom validation to check for errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }
    next();
  }
];

// Validation rules for adding undertime
exports.addUndertimeValidation = [
  body('user_id').notEmpty().withMessage('User ID is required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030'),
  body('undertime_hours').isNumeric().withMessage('Undertime hours must be a number').isFloat({ min: 0, max: 24 }).withMessage('Undertime hours must be between 0 and 24'),
  
  // Custom validation to check for errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }
    next();
  }
];