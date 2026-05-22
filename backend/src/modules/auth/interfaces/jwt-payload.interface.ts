export interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
}
