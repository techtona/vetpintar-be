import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VetPintar API',
      version: '1.0.0',
      description: 'Veterinary Clinic Management System API Documentation',
      contact: {
        name: 'VetPintar Team',
        email: 'support@vetpintar.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
        description: 'Development server'
      },
      {
        url: 'https://api.vetpintar.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token'
        }
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            data: {
              type: 'object'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error occurred'
            },
            error: {
              type: 'string',
              example: 'Detailed error message'
            }
          }
        },
        PaginationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'array',
              items: {
                type: 'object'
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  example: 1
                },
                limit: {
                  type: 'integer',
                  example: 10
                },
                total: {
                  type: 'integer',
                  example: 50
                },
                totalPages: {
                  type: 'integer',
                  example: 5
                }
              }
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              example: 'Dr. John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@clinic.com'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
              example: 'DOCTOR'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Clinic: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              example: 'Happy Pets Veterinary Clinic'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'info@happypets.com'
            },
            phone: {
              type: 'string',
              example: '+1234567890'
            },
            address: {
              type: 'string',
              example: '123 Main St, City, State 12345'
            },
            city: {
              type: 'string',
              example: 'New York'
            },
            province: {
              type: 'string',
              example: 'NY'
            },
            postalCode: {
              type: 'string',
              example: '12345'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Patient: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              example: 'Buddy'
            },
            species: {
              type: 'string',
              example: 'Dog'
            },
            breed: {
              type: 'string',
              example: 'Golden Retriever'
            },
            age: {
              type: 'integer',
              example: 5
            },
            weight: {
              type: 'number',
              example: 25.5
            },
            gender: {
              type: 'string',
              enum: ['MALE', 'FEMALE'],
              example: 'MALE'
            },
            ownerId: {
              type: 'string',
              format: 'uuid'
            },
            clinicId: {
              type: 'string',
              format: 'uuid'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };