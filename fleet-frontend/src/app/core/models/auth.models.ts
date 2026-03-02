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
}

export type UserRole = 'Admin' | 'FleetManager' | 'ReadOnly';
