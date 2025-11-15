import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { appointmentService } from '../services/appointmentService';
import { AppointmentStatus } from "@prisma/client";

class AppointmentController {
  // GET /api/appointments
  getAllAppointments = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        page,
        limit,
        patientId,
        veterinarianId,
        status,
        startDate,
        endDate,
        search
      } = req.query;

      const result = await appointmentService.getAppointments({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        clinicId: req.user?.clinicId,
        patientId: patientId as string,
        veterinarianId: veterinarianId as string,
        status: status as AppointmentStatus,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string
      });

      res.json({
        success: true,
        data: result.appointments,
        pagination: {
          page: result.page,
          limit: result.totalPages > 0 ? Math.ceil(result.total / result.page) : 20,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch appointments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/appointments/today
  getTodayAppointments = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { veterinarianId } = req.query;

      const appointments = await appointmentService.getTodayAppointments(
        req.user!.clinicId!,
        veterinarianId as string | undefined
      );

      res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch today\'s appointments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/appointments/upcoming
  getUpcomingAppointments = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { days } = req.query;

      const appointments = await appointmentService.getUpcomingAppointments(
        req.user!.clinicId!,
        days ? Number(days) : 7
      );

      res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch upcoming appointments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/appointments/stats
  getAppointmentStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await appointmentService.getAppointmentStats(req.user!.clinicId!);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch appointment statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/appointments/:id
  getAppointmentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const appointment = await appointmentService.getAppointmentById(
        id,
        req.user?.clinicId
      );

      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // POST /api/appointments
  createAppointment = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        patientId,
        veterinarianId,
        appointmentDate,
        appointmentTime,
        duration,
        type,
        reason,
        notes
      } = req.body;

      // Validate required fields
      if (!patientId || !appointmentDate || !appointmentTime || !type) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: patientId, appointmentDate, appointmentTime, type'
        });
        return;
      }

      const appointment = await appointmentService.createAppointment({
        clinicId: req.user!.clinicId!,
        patientId,
        veterinarianId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        duration,
        type,
        reason,
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Appointment created successfully',
        data: appointment
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            message: error.message
          });
          return;
        }

        if (error.message.includes('already has an appointment')) {
          res.status(409).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // PUT /api/appointments/:id
  updateAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        veterinarianId,
        appointmentDate,
        appointmentTime,
        duration,
        type,
        status,
        reason,
        notes,
        reminderSent
      } = req.body;

      const appointment = await appointmentService.updateAppointment(
        id,
        {
          veterinarianId,
          appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
          appointmentTime,
          duration,
          type,
          status,
          reason,
          notes,
          reminderSent
        },
        req.user?.clinicId
      );

      res.json({
        success: true,
        message: 'Appointment updated successfully',
        data: appointment
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Appointment not found') {
          res.status(404).json({
            success: false,
            message: 'Appointment not found'
          });
          return;
        }

        if (error.message.includes('already has an appointment')) {
          res.status(409).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // PATCH /api/appointments/:id/status
  updateAppointmentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(AppointmentStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or missing status'
        });
        return;
      }

      const appointment = await appointmentService.updateAppointmentStatus(
        id,
        status as AppointmentStatus,
        req.user?.clinicId
      );

      res.json({
        success: true,
        message: 'Appointment status updated successfully',
        data: appointment
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Appointment not found') {
        res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update appointment status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // DELETE /api/appointments/:id
  deleteAppointment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await appointmentService.deleteAppointment(id, req.user?.clinicId);

      res.json({
        success: true,
        message: 'Appointment deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Appointment not found') {
          res.status(404).json({
            success: false,
            message: 'Appointment not found'
          });
          return;
        }

        if (error.message.includes('Cannot delete')) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete appointment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // GET /api/appointments/reminders/pending
  getAppointmentsNeedingReminders = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const appointments = await appointmentService.getAppointmentsNeedingReminders();

      res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch appointments needing reminders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // POST /api/appointments/:id/reminder
  markReminderSent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await appointmentService.markReminderSent(id);

      res.json({
        success: true,
        message: 'Reminder marked as sent'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to mark reminder as sent',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

export const appointmentController = new AppointmentController();
