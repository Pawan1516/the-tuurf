const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('../middleware/errorHandler');

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => `${err.param}: ${err.msg}`);
    throw new AppError(messages.join(', '), 400);
  }
  next();
};

// ==================== AUTH VALIDATORS ====================

const authValidators = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
    body('phone')
      .matches(/^[0-9]{10}$/)
      .withMessage('Phone must be 10 digits'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be 2-50 characters'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must be 8+ chars with uppercase, lowercase, and numbers'),
  ],

  login: [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],

  resetPassword: [
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must be 8+ chars with uppercase, lowercase, and numbers'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  ],
};

// ==================== TOURNAMENT VALIDATORS ====================

const tournamentValidators = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Tournament name must be 3-100 characters'),
    body('type').isIn(['LEAGUE', 'KNOCKOUT', 'LEAGUE_KNOCKOUT']).withMessage('Invalid tournament type'),
    body('format').isIn(['T20', 'T10', 'ODI', 'FIFTY_FIFTY', 'CUSTOM']).withMessage('Invalid tournament format'),
    body('ballType').isIn(['LEATHER', 'TENNIS']).withMessage('Invalid ball type'),
    body('numberOfTeams').isInt({ min: 2, max: 100 }).withMessage('Teams must be 2-100'),
    body('entryFee').isFloat({ min: 0 }).withMessage('Entry fee must be positive'),
    body('oversPerInnings').isInt({ min: 1, max: 50 }).withMessage('Overs must be 1-50'),
  ],

  update: [
    param('id').isUUID().withMessage('Invalid tournament ID'),
    body('name').optional().trim().isLength({ min: 3 }).withMessage('Name must be 3+ characters'),
    body('status').optional().isIn(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'STARTED', 'COMPLETED', 'CANCELLED']),
  ],
};

// ==================== TEAM VALIDATORS ====================

const teamValidators = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Team name must be 2-50 characters'),
    body('city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be 2-50 characters'),
  ],

  update: [
    param('id').isUUID().withMessage('Invalid team ID'),
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be 2+ characters'),
    body('city').optional().trim().isLength({ min: 2 }).withMessage('City must be 2+ characters'),
  ],
};

// ==================== PLAYER VALIDATORS ====================

const playerValidators = {
  create: [
    body('battingHand').optional().isIn(['Right', 'Left']).withMessage('Invalid batting hand'),
    body('bowlingType').optional().isString().withMessage('Bowling type must be string'),
    body('jerseyNumber').optional().isInt({ min: 1, max: 99 }).withMessage('Jersey number must be 1-99'),
  ],

  update: [
    param('id').isUUID().withMessage('Invalid player ID'),
  ],
};

// ==================== MATCH VALIDATORS ====================

const matchValidators = {
  qrVerify: [
    param('id').isUUID().withMessage('Invalid match ID'),
    body('qrCode').trim().notEmpty().withMessage('QR code is required'),
  ],

  ball: [
    param('matchId').isUUID().withMessage('Invalid match ID'),
    param('inningsId').isUUID().withMessage('Invalid innings ID'),
    param('overNumber').isInt({ min: 1 }).withMessage('Invalid over number'),
    body('ballNumber').isInt({ min: 1, max: 6 }).withMessage('Ball must be 1-6'),
    body('runs').isInt({ min: 0, max: 6 }).withMessage('Runs must be 0-6'),
    body('batsmanId').isUUID().withMessage('Invalid batsman ID'),
    body('bowlerId').isUUID().withMessage('Invalid bowler ID'),
  ],
};

// ==================== PAYMENT VALIDATORS ====================

const paymentValidators = {
  createOrder: [
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
    body('currency').optional().isIn(['INR', 'USD']).withMessage('Invalid currency'),
    body('description').optional().trim(),
  ],

  verifyPayment: [
    body('orderId').trim().notEmpty().withMessage('Order ID is required'),
    body('paymentId').trim().notEmpty().withMessage('Payment ID is required'),
    body('signature').trim().notEmpty().withMessage('Signature is required'),
  ],
};

// ==================== PAGINATION VALIDATORS ====================

const paginationValidators = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('sort').optional().isString().withMessage('Sort must be string'),
];

module.exports = {
  handleValidationErrors,
  authValidators,
  tournamentValidators,
  teamValidators,
  playerValidators,
  matchValidators,
  paymentValidators,
  paginationValidators,
};
