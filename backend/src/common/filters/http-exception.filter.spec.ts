import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter, ErrorResponsePayload } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      method: 'GET',
      url: '/tickets/sample-id',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('formats standard HttpException into consistent JSON structure', () => {
    const exception = new NotFoundException('Ticket not found');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'Not Found',
        message: 'Ticket not found',
        path: '/tickets/sample-id',
      }),
    );
  });

  it('preserves array of validation messages from BadRequestException', () => {
    const validationMessages = ['title must not be empty', 'priority must be a valid enum'];
    const exception = new BadRequestException({
      message: validationMessages,
      error: 'Bad Request',
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: validationMessages,
        path: '/tickets/sample-id',
      }),
    );
  });

  it('handles unexpected generic Error gracefully with 500 status', () => {
    const error = new Error('Database connection timeout');

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Internal server error',
        path: '/tickets/sample-id',
      }),
    );
  });
});
