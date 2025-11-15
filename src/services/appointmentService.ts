import { PrismaClient, Appointment, AppointmentStatus } from "@prisma/client";
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../utils/database';

interface CreateAppointmentData {
  clinicId: string;
  patientId: string;
  veterinarianId?: string;
  appointmentDate: Date;
  appointmentTime: string;
  duration?: number;
  type: string;
  reason?: string;
  notes?: string;
}

interface UpdateAppointmentData {
  veterinarianId?: string;
  appointmentDate?: Date;
  appointmentTime?: string;
  duration?: number;
  type?: string;
  status?: AppointmentStatus;
  reason?: string;
  notes?: string;
  reminderSent?: boolean;
}

interface GetAppointmentsQuery {
  page?: number;
  limit?: number;
  clinicId?: string;
  patientId?: string;
  veterinarianId?: string;
  status?: AppointmentStatus;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export class AppointmentService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    try {
      // Validate patient exists and belongs to the clinic
      const patient = await this.prisma.patient.findFirst({
        where: {
          id: data.patientId,
          clinicId: data.clinicId,
          isActive: true
        }
      });

      if (!patient) {
        throw createError(404, 'Patient not found or does not belong to this clinic');
      }

      // Validate veterinarian if provided
      if (data.veterinarianId) {
        const veterinarian = await this.prisma.user.findFirst({
          where: {
            id: data.veterinarianId,
            role: { in: ['VETERINARIAN', 'ADMIN'] },
            isActive: true,
            clinicAccesses: {
              some: {
                clinicId: data.clinicId
              }
            }
          }
        });

        if (!veterinarian) {
          throw createError(404, 'Veterinarian not found or does not have access to this clinic');
        }
      }

      // Check for scheduling conflicts
      if (data.veterinarianId) {
        const conflictingAppointment = await this.checkScheduleConflict(
          data.veterinarianId,
          data.appointmentDate,
          data.appointmentTime,
          data.duration || 30
        );

        if (conflictingAppointment) {
          throw createError(409, 'Veterinarian already has an appointment at this time');
        }
      }

      const appointment = await this.prisma.appointment.create({
        data: {
          ...data,
          duration: data.duration || 30,
          status: AppointmentStatus.SCHEDULED
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          veterinarian: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logger.info(`Appointment created: ${appointment.id} for clinic: ${appointment.clinicId}`);
      return appointment;
    } catch (error) {
      logger.error('Error creating appointment:', error);
      throw error;
    }
  }

  async getAppointments(query: GetAppointmentsQuery): Promise<{
    appointments: Appointment[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        clinicId,
        patientId,
        veterinarianId,
        status,
        startDate,
        endDate,
        search
      } = query;

      const skip = (page - 1) * limit;
      const where: any = {};

      if (clinicId) {
        where.clinicId = clinicId;
      }

      if (patientId) {
        where.patientId = patientId;
      }

      if (veterinarianId) {
        where.veterinarianId = veterinarianId;
      }

      if (status) {
        where.status = status;
      }

      if (startDate || endDate) {
        where.appointmentDate = {};
        if (startDate) {
          where.appointmentDate.gte = startDate;
        }
        if (endDate) {
          where.appointmentDate.lte = endDate;
        }
      }

      if (search) {
        where.OR = [
          { type: { contains: search, mode: 'insensitive' } },
          { reason: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          {
            patient: {
              name: { contains: search, mode: 'insensitive' }
            }
          },
          {
            patient: {
              owner: {
                name: { contains: search, mode: 'insensitive' }
              }
            }
          }
        ];
      }

      const [appointments, total] = await Promise.all([
        this.prisma.appointment.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { appointmentDate: 'asc' },
            { appointmentTime: 'asc' }
          ],
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                species: true,
                breed: true,
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true
                  }
                }
              }
            },
            veterinarian: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
            clinic: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        this.prisma.appointment.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        appointments,
        total,
        page,
        totalPages
      };
    } catch (error) {
      logger.error('Error fetching appointments:', error);
      throw error;
    }
  }

  async getAppointmentById(id: string, clinicId?: string): Promise<Appointment> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const appointment = await this.prisma.appointment.findFirst({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              gender: true,
              birthDate: true,
              photoUrl: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          veterinarian: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true
            }
          }
        }
      });

      if (!appointment) {
        throw createError(404, 'Appointment not found');
      }

      return appointment;
    } catch (error) {
      logger.error('Error fetching appointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: string, data: UpdateAppointmentData, clinicId?: string): Promise<Appointment> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      // Check if appointment exists
      const existingAppointment = await this.prisma.appointment.findFirst({
        where
      });

      if (!existingAppointment) {
        throw createError(404, 'Appointment not found');
      }

      // Validate veterinarian if updating
      if (data.veterinarianId) {
        const veterinarian = await this.prisma.user.findFirst({
          where: {
            id: data.veterinarianId,
            role: { in: ['VETERINARIAN', 'ADMIN'] },
            isActive: true,
            clinicAccesses: {
              some: {
                clinicId: existingAppointment.clinicId
              }
            }
          }
        });

        if (!veterinarian) {
          throw createError(404, 'Veterinarian not found or does not have access to this clinic');
        }
      }

      // Check for scheduling conflicts if time/date is being updated
      if (data.appointmentDate || data.appointmentTime || data.veterinarianId) {
        const veterinarianId = data.veterinarianId || existingAppointment.veterinarianId;
        const appointmentDate = data.appointmentDate || existingAppointment.appointmentDate;
        const appointmentTime = data.appointmentTime || existingAppointment.appointmentTime;
        const duration = data.duration || existingAppointment.duration;

        if (veterinarianId) {
          const conflictingAppointment = await this.checkScheduleConflict(
            veterinarianId,
            appointmentDate,
            appointmentTime,
            duration,
            id // Exclude current appointment
          );

          if (conflictingAppointment) {
            throw createError(409, 'Veterinarian already has an appointment at this time');
          }
        }
      }

      const appointment = await this.prisma.appointment.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          veterinarian: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logger.info(`Appointment updated: ${appointment.id}`);
      return appointment;
    } catch (error) {
      logger.error('Error updating appointment:', error);
      throw error;
    }
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus, clinicId?: string): Promise<Appointment> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const appointment = await this.prisma.appointment.findFirst({
        where
      });

      if (!appointment) {
        throw createError(404, 'Appointment not found');
      }

      const updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data: {
          status,
          updatedAt: new Date()
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          veterinarian: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      logger.info(`Appointment status updated: ${id} to ${status}`);
      return updatedAppointment;
    } catch (error) {
      logger.error('Error updating appointment status:', error);
      throw error;
    }
  }

  async deleteAppointment(id: string, clinicId?: string): Promise<void> {
    try {
      const where: any = { id };

      if (clinicId) {
        where.clinicId = clinicId;
      }

      const appointment = await this.prisma.appointment.findFirst({
        where
      });

      if (!appointment) {
        throw createError(404, 'Appointment not found');
      }

      // Only allow deletion of scheduled or cancelled appointments
      if (appointment.status === AppointmentStatus.COMPLETED ||
          appointment.status === AppointmentStatus.IN_PROGRESS) {
        throw createError(400, 'Cannot delete completed or in-progress appointments');
      }

      await this.prisma.appointment.delete({
        where: { id }
      });

      logger.info(`Appointment deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting appointment:', error);
      throw error;
    }
  }

  async getAppointmentStats(clinicId: string): Promise<{
    totalAppointments: number;
    todayAppointments: number;
    upcomingAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    statusDistribution: Record<string, number>;
  }> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const [
        totalAppointments,
        todayAppointments,
        upcomingAppointments,
        completedAppointments,
        cancelledAppointments,
        statusByCount
      ] = await Promise.all([
        this.prisma.appointment.count({
          where: { clinicId }
        }),
        this.prisma.appointment.count({
          where: {
            clinicId,
            appointmentDate: {
              gte: startOfToday,
              lte: endOfToday
            }
          }
        }),
        this.prisma.appointment.count({
          where: {
            clinicId,
            appointmentDate: { gte: now },
            status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] }
          }
        }),
        this.prisma.appointment.count({
          where: {
            clinicId,
            status: AppointmentStatus.COMPLETED
          }
        }),
        this.prisma.appointment.count({
          where: {
            clinicId,
            status: { in: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] }
          }
        }),
        this.prisma.appointment.groupBy({
          by: ['status'],
          where: { clinicId },
          _count: { status: true }
        })
      ]);

      const statusDistribution = statusByCount.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalAppointments,
        todayAppointments,
        upcomingAppointments,
        completedAppointments,
        cancelledAppointments,
        statusDistribution
      };
    } catch (error) {
      logger.error('Error fetching appointment stats:', error);
      throw error;
    }
  }

  async getTodayAppointments(clinicId: string, veterinarianId?: string): Promise<Appointment[]> {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const where: any = {
        clinicId,
        appointmentDate: {
          gte: startOfToday,
          lte: endOfToday
        }
      };

      if (veterinarianId) {
        where.veterinarianId = veterinarianId;
      }

      const appointments = await this.prisma.appointment.findMany({
        where,
        orderBy: { appointmentTime: 'asc' },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  phone: true
                }
              }
            }
          },
          veterinarian: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return appointments;
    } catch (error) {
      logger.error('Error fetching today appointments:', error);
      throw error;
    }
  }

  async getUpcomingAppointments(clinicId: string, days: number = 7): Promise<Appointment[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const appointments = await this.prisma.appointment.findMany({
        where: {
          clinicId,
          appointmentDate: {
            gte: now,
            lte: futureDate
          },
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] }
        },
        orderBy: [
          { appointmentDate: 'asc' },
          { appointmentTime: 'asc' }
        ],
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true
                }
              }
            }
          },
          veterinarian: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return appointments;
    } catch (error) {
      logger.error('Error fetching upcoming appointments:', error);
      throw error;
    }
  }

  async getAppointmentsNeedingReminders(): Promise<Appointment[]> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);

      const appointments = await this.prisma.appointment.findMany({
        where: {
          appointmentDate: {
            gte: startOfTomorrow,
            lte: endOfTomorrow
          },
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
          reminderSent: false
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          veterinarian: {
            select: {
              id: true,
              name: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true
            }
          }
        }
      });

      return appointments;
    } catch (error) {
      logger.error('Error fetching appointments needing reminders:', error);
      throw error;
    }
  }

  async markReminderSent(id: string): Promise<void> {
    try {
      await this.prisma.appointment.update({
        where: { id },
        data: {
          reminderSent: true,
          updatedAt: new Date()
        }
      });

      logger.info(`Reminder marked as sent for appointment: ${id}`);
    } catch (error) {
      logger.error('Error marking reminder as sent:', error);
      throw error;
    }
  }

  private async checkScheduleConflict(
    veterinarianId: string,
    appointmentDate: Date,
    appointmentTime: string,
    duration: number,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    try {
      // Parse time to get start and end times
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + duration;

      const where: any = {
        veterinarianId,
        appointmentDate,
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]
        }
      };

      if (excludeAppointmentId) {
        where.id = { not: excludeAppointmentId };
      }

      const existingAppointments = await this.prisma.appointment.findMany({
        where,
        select: {
          appointmentTime: true,
          duration: true
        }
      });

      // Check for time conflicts
      for (const existing of existingAppointments) {
        const [existingHours, existingMinutes] = existing.appointmentTime.split(':').map(Number);
        const existingStartMinutes = existingHours * 60 + existingMinutes;
        const existingEndMinutes = existingStartMinutes + existing.duration;

        // Check if there's any overlap
        if (
          (startMinutes >= existingStartMinutes && startMinutes < existingEndMinutes) ||
          (endMinutes > existingStartMinutes && endMinutes <= existingEndMinutes) ||
          (startMinutes <= existingStartMinutes && endMinutes >= existingEndMinutes)
        ) {
          return true; // Conflict found
        }
      }

      return false; // No conflict
    } catch (error) {
      logger.error('Error checking schedule conflict:', error);
      throw error;
    }
  }
}

export const appointmentService = new AppointmentService();
