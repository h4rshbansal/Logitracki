
export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  DRIVER = 'DRIVER'
}

export enum JobStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACCEPTED = 'ACCEPTED',
  REACHED = 'REACHED',
  ON_WORK = 'ON_WORK',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum DriverStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  ON_LEAVE = 'ON_LEAVE'
}

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: DriverStatus | 'ACTIVE';
  createdAt: any;
}

export interface Job {
  id: string;
  supervisorId: string;
  supervisorName: string;
  purpose: string;
  fromLocation: string;
  toLocation: string;
  date: string;
  slot: string;
  priority: Priority;
  status: JobStatus;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehicleName?: string;
  remark?: string;
  createdAt: any;
  approvedAt?: any;
}

export interface Vehicle {
  id: string;
  name: string;
  status: VehicleStatus;
}

export interface ActivityLog {
  id: string;
  textEn: string;
  textHi: string;
  timestamp: any;
  userId: string;
  userName: string;
}
