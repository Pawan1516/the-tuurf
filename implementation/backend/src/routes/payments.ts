import express, { Router } from 'express';
import { paymentController } from '../controllers/PaymentController';
import { authMiddleware } from '../middleware/auth';

const router: Router = express.Router();

// Payment routes
router.post('/create-order', authMiddleware, (req, res) => paymentController.createOrder(req, res));
router.post('/verify', authMiddleware, (req, res) => paymentController.verifyPayment(req, res));
router.get('/status/:orderId', authMiddleware, (req, res) => paymentController.getPaymentStatus(req, res));
router.post('/refund/:paymentId', authMiddleware, (req, res) => paymentController.refundPayment(req, res));
router.post('/webhook', (req, res) => paymentController.handleWebhook(req, res));

export default router;
