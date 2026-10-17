import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockConfigService: any;
  let mockUsersService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test_secret_key_123';
        return undefined;
      }),
    };

    mockUsersService = {
      findById: jest.fn(),
    };

    strategy = new JwtStrategy(mockConfigService, mockUsersService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('throws fatal error if JWT_SECRET is missing', () => {
    mockConfigService.get.mockReturnValue(undefined);

    expect(() => new JwtStrategy(mockConfigService, mockUsersService)).toThrow(
      'FATAL: JWT_SECRET environment variable is not defined.',
    );
  });

  it('validates and returns user when user exists', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', role: 'customer' };
    mockUsersService.findById.mockResolvedValue(mockUser);

    const result = await strategy.validate({ sub: 'user-1', email: 'test@example.com', role: 'customer' });

    expect(mockUsersService.findById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(mockUser);
  });

  it('throws UnauthorizedException when user was deleted / not found', async () => {
    mockUsersService.findById.mockRejectedValue(new Error('User not found'));

    await expect(
      strategy.validate({ sub: 'deleted-user', email: 'test@example.com', role: 'customer' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
