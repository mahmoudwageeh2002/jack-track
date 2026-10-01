import type { User } from 'firebase/auth';

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export interface AuthRepository {
  getCurrentUser(): User | null;
  logIn(email: string, password: string): Promise<User>;
  register(input: RegisterInput): Promise<User>;
  logOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
}
