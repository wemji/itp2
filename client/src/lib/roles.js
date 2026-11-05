export const STAFF_ROLES = ['admin', 'staff', 'registrar', 'finance'];
export const isStaff = (role) => STAFF_ROLES.includes(role);
export const homeFor = (role) => (isStaff(role) ? '/admin' : '/dashboard');

export const ROLE_INFO = {
  customer: { label: 'Customer', workspace: 'Customer portal', desk: 'Your account' },
  registrar: { label: 'Registrar staff', workspace: 'Registrar desk', desk: 'Registrar' },
  finance: { label: 'Finance staff', workspace: 'Finance desk', desk: 'Finance' },
  staff: { label: 'Service staff', workspace: 'Service desk', desk: 'Operations' },
  admin: { label: 'Administrator', workspace: 'Administration', desk: 'Administration' },
};
export const roleInfo = (role) => ROLE_INFO[role] || ROLE_INFO.customer;

export const DEPARTMENTS = { registrar: 'Registrar', finance: 'Finance' };
export const departmentLabel = (value) => DEPARTMENTS[value] || (value ? value[0].toUpperCase() + value.slice(1) : '—');

export const ACTIVE_STATUSES = ['WAITING', 'CALLED', 'SERVING'];
export const ENDED_STATUSES = ['COMPLETED', 'CANCELLED', 'NO-SHOW'];
export const STATUS_LABELS = {
  WAITING: 'Waiting', CALLED: 'Called', SERVING: 'Serving', COMPLETED: 'Completed', CANCELLED: 'Cancelled', 'NO-SHOW': 'No-show',
  OPEN: 'Open', CLOSED: 'Closed', ACTIVE: 'Active', OFFLINE: 'Offline', INACTIVE: 'Inactive',
};
