export interface User {
  name: string;
  email: string;
  full_name: string;
  user_image?: string;
  roles?: string[];
}

export type Role = 'System Manager' | 'Administrator' | 'Student' | 'Guardian' | 'Instructor' | 'Academics User';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
