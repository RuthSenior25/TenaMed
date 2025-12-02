const { body, validationResult } = require('express-validator');

// Validation middleware handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .isIn(['patient', 'pharmacy', 'dispatcher'])
    .withMessage('Invalid role specified'),
  
  body('profile.firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  
  body('profile.lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  
  body('profile.phone')
    .optional()
    .isLength({ max: 30 })
    .withMessage('Phone number must be less than 30 characters'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Pharmacy registration validation
const validatePharmacyRegistration = [
  body('name')
    .notEmpty()
    .withMessage('Pharmacy name is required')
    .isLength({ max: 100 })
    .withMessage('Pharmacy name must be less than 100 characters'),
  
  body('licenseNumber')
    .notEmpty()
    .withMessage('License number is required')
    .isLength({ min: 5, max: 50 })
    .withMessage('License number must be between 5 and 50 characters'),
  
  body('address.street')
    .notEmpty()
    .withMessage('Street address is required'),
  
  body('address.city')
    .notEmpty()
    .withMessage('City is required'),
  
  body('address.state')
    .notEmpty()
    .withMessage('State is required'),
  
  body('address.zipCode')
    .notEmpty()
    .withMessage('Zip code is required')
    .isPostalCode('any')
    .withMessage('Please provide a valid zip code'),
  
  body('contact.phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('contact.email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('operatingHours.monday.open')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  
  body('operatingHours.monday.close')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  
  handleValidationErrors
];

// Drug validation
const validateDrug = [
  body('name')
    .notEmpty()
    .withMessage('Drug name is required')
    .isLength({ max: 100 })
    .withMessage('Drug name must be less than 100 characters'),
  
  body('genericName')
    .notEmpty()
    .withMessage('Generic name is required')
    .isLength({ max: 100 })
    .withMessage('Generic name must be less than 100 characters'),
  
  body('category')
    .isIn(['antibiotics', 'painkillers', 'vitamins', 'chronic-disease', 'emergency', 'pediatric', 'women-health', 'men-health', 'mental-health', 'other'])
    .withMessage('Invalid drug category'),
  
  body('strength.value')
    .isNumeric()
    .withMessage('Strength value must be a number')
    .isFloat({ min: 0 })
    .withMessage('Strength value must be positive'),
  
  body('strength.unit')
    .notEmpty()
    .withMessage('Strength unit is required'),
  
  body('form')
    .isIn(['tablet', 'capsule', 'liquid', 'injection', 'cream', 'ointment', 'inhaler', 'patch', 'other'])
    .withMessage('Invalid drug form'),
  
  body('prescriptionRequired')
    .isBoolean()
    .withMessage('Prescription required must be true or false'),
  
  handleValidationErrors
];

// Inventory validation
const validateInventory = [
  body('drug')
    .isMongoId()
    .withMessage('Valid drug ID is required'),
  
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('batchNumber')
    .notEmpty()
    .withMessage('Batch number is required'),
  
  body('expiryDate')
    .isISO8601()
    .withMessage('Expiry date must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Expiry date must be in the future');
      }
      return true;
    }),
  
  body('reorderLevel')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Reorder level must be a non-negative integer'),
  
  handleValidationErrors
];

// Review validation
const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('title')
    .notEmpty()
    .withMessage('Review title is required')
    .isLength({ max: 100 })
    .withMessage('Title must be less than 100 characters'),
  
  body('comment')
    .notEmpty()
    .withMessage('Review comment is required')
    .isLength({ max: 1000 })
    .withMessage('Comment must be less than 1000 characters'),
  
  body('wouldRecommend')
    .isBoolean()
    .withMessage('Would recommend must be true or false'),
  
  handleValidationErrors
];

// Delivery request validation
const validateDeliveryRequest = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.drug')
    .isMongoId()
    .withMessage('Valid drug ID is required for each item'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1 for each item'),
  
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Price must be positive for each item'),
  
  body('deliveryAddress.street')
    .notEmpty()
    .withMessage('Street address is required'),
  
  body('deliveryAddress.city')
    .notEmpty()
    .withMessage('City is required'),
  
  body('deliveryAddress.state')
    .notEmpty()
    .withMessage('State is required'),
  
  body('deliveryAddress.zipCode')
    .notEmpty()
    .withMessage('Zip code is required'),
  
  body('contactPhone')
    .notEmpty()
    .withMessage('Contact phone number is required')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('paymentMethod')
    .isIn(['cash', 'card', 'mobile'])
    .withMessage('Invalid payment method'),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validatePharmacyRegistration,
  validateDrug,
  validateInventory,
  validateReview,
  validateDeliveryRequest,
  handleValidationErrors
};
