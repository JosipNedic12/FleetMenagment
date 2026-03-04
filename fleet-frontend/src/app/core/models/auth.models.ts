export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  fullName: string;
  role: string;
  expiresAt: string;
  mustChangePassword?: boolean;
}

export interface CreateAppUserDto {
  employeeId: number;
  username: string;
  email: string;
  temporaryPassword: string;
  role: string;
}

export type UserRole = 'Admin' | 'FleetManager' | 'ReadOnly';
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}