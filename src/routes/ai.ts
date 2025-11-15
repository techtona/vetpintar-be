import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_API_KEY = process.env.AI_SERVICE_API_KEY;

// Middleware to authenticate and proxy AI requests
const proxyToAIService = async (req: Request, res: Response): Promise<void> => {
  try {
    const path = req.path;
    const method = req.method.toLowerCase();
    const targetUrl = `${AI_SERVICE_URL}${path}`;

    logger.info(`Proxying AI request: ${method.toUpperCase()} ${targetUrl}`);

    const headers: any = {
      'Content-Type': 'application/json',
    };

    // Add AI service API key if configured
    if (AI_SERVICE_API_KEY) {
      headers['X-API-Key'] = AI_SERVICE_API_KEY;
    }

    let response;

    if (method === 'get') {
      response = await axios.get(targetUrl, {
        headers,
        params: req.query,
      });
    } else if (method === 'post') {
      response = await axios.post(targetUrl, req.body, {
        headers,
      });
    } else if (method === 'put') {
      response = await axios.put(targetUrl, req.body, {
        headers,
      });
    } else if (method === 'delete') {
      response = await axios.delete(targetUrl, {
        headers,
      });
    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed',
      });
      return;
    }

    res.status(response.status).json(response.data);
  } catch (error: any) {
    logger.error('AI service proxy error:', error);

    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to proxy request to AI service',
      error: error.message,
    });
  }
};

// All AI routes require authentication
router.use(authenticateToken);

// Proxy all /ai/* requests to AI service
router.post('/chat', proxyToAIService);
router.post('/query/search', proxyToAIService);
router.post('/transcribe', proxyToAIService);
router.post('/soap', proxyToAIService);
router.post('/diagnosis', proxyToAIService);

export { router as aiRoutes };
