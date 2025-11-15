import { Router } from 'express';
import { appointmentController } from '../../controllers/appointmentController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Apply authentication to all appointment routes
router.use(authenticateToken);

// Statistics and special endpoints (must come before /:id)
router.get('/today', appointmentController.getTodayAppointments);
router.get('/upcoming', appointmentController.getUpcomingAppointments);
router.get('/stats', appointmentController.getAppointmentStats);
router.get('/reminders/pending', appointmentController.getAppointmentsNeedingReminders);

// Standard CRUD endpoints
router.get('/', appointmentController.getAllAppointments);
router.get('/:id', appointmentController.getAppointmentById);
router.post('/', appointmentController.createAppointment);
router.put('/:id', appointmentController.updateAppointment);
router.delete('/:id', appointmentController.deleteAppointment);

// Status update endpoint
router.patch('/:id/status', appointmentController.updateAppointmentStatus);

// Reminder endpoint
router.post('/:id/reminder', appointmentController.markReminderSent);

export { router as appointmentRoutes };
