import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../users/entities/user.entity';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;

  const mockUser = {
    id: 'user-uuid-123',
    name: 'Test Customer',
    email: 'test@example.com',
    passwordHash: '',
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('secret123', 10);
  });

  beforeEach(async () => {
    usersService = {
      create: jest.fn().mockImplementation(async (dto) => ({
        id: 'new-uuid',
        name: dto.name,
        email: dto.email,
        passwordHash: dto.passwordHash,
        role: dto.role || UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findByEmail: jest.fn().mockImplementation(async (email) => {
        if (email === mockUser.email) return mockUser;
        return null;
      }),
      findById: jest.fn().mockImplementation(async (id) => {
        if (id === mockUser.id) return mockUser;
        return null;
      }),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should hash the password and always assign CUSTOMER role', async () => {
      const result = await service.register({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: UserRole.CUSTOMER,
        }),
      );

      // Verify returned response structure
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.role).toBe(UserRole.CUSTOMER);
      expect((result.user as any).passwordHash).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should authenticate valid credentials and return access token', async () => {
      const result = await service.login({
        email: 'test@example.com',
        password: 'secret123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'secret123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
