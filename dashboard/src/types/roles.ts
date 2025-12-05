export const ROLES = {
  ADMIN: "Admin",
  ADMISSION_OFFICER: "Admission Officer",
  ACCOUNTANT: "Accountant",
  EXAM_COORDINATOR: "Exam Coordinator",
  HOSTEL_WARDEN: "Hostel Warden",
  TEACHER: "Teacher",
  PARENT: "Parent",
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export interface RolePermissions {
  canViewDashboard: boolean;
  canManageAdmissions: boolean;
  canManageFees: boolean;
  canManageExams: boolean;
  canManageHostel: boolean;
  canManageStudents: boolean;
  canManageTeachers: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canManageMasters: boolean;
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  [ROLES.ADMIN]: {
    canViewDashboard: true,
    canManageAdmissions: true,
    canManageFees: true,
    canManageExams: true,
    canManageHostel: true,
    canManageStudents: true,
    canManageTeachers: true,
    canViewReports: true,
    canManageSettings: true,
    canManageMasters: true,
  },
  [ROLES.ADMISSION_OFFICER]: {
    canViewDashboard: true,
    canManageAdmissions: true,
    canManageFees: false,
    canManageExams: false,
    canManageHostel: false,
    canManageStudents: true,
    canManageTeachers: false,
    canViewReports: true,
    canManageSettings: false,
    canManageMasters: false,
  },
  [ROLES.ACCOUNTANT]: {
    canViewDashboard: true,
    canManageAdmissions: false,
    canManageFees: true,
    canManageExams: false,
    canManageHostel: false,
    canManageStudents: true,
    canManageTeachers: false,
    canViewReports: true,
    canManageSettings: false,
    canManageMasters: false,
  },
  [ROLES.EXAM_COORDINATOR]: {
    canViewDashboard: true,
    canManageAdmissions: false,
    canManageFees: false,
    canManageExams: true,
    canManageHostel: false,
    canManageStudents: true,
    canManageTeachers: false,
    canViewReports: true,
    canManageSettings: false,
    canManageMasters: false,
  },
  [ROLES.HOSTEL_WARDEN]: {
    canViewDashboard: true,
    canManageAdmissions: false,
    canManageFees: false,
    canManageExams: false,
    canManageHostel: true,
    canManageStudents: true,
    canManageTeachers: false,
    canViewReports: true,
    canManageSettings: false,
    canManageMasters: false,
  },
  [ROLES.TEACHER]: {
    canViewDashboard: true,
    canManageAdmissions: false,
    canManageFees: false,
    canManageExams: true,
    canManageHostel: false,
    canManageStudents: true,
    canManageTeachers: false,
    canViewReports: false,
    canManageSettings: false,
    canManageMasters: false,
  },
  [ROLES.PARENT]: {
    canViewDashboard: true,
    canManageAdmissions: false,
    canManageFees: false,
    canManageExams: false,
    canManageHostel: false,
    canManageStudents: false,
    canManageTeachers: false,
    canViewReports: false,
    canManageSettings: false,
    canManageMasters: false,
  },
};

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return rolePermissions[role]?.[permission] ?? false;
}
