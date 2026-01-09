// Utility function to format role names for display
export const formatRoleName = (role: string | undefined): string => {
  if (!role) return '';
  
  switch (role.toLowerCase()) {
    case 'admin':
      return 'Supervisor';
    case 'staff':
      return 'Staff';
    case 'client':
      return 'Client';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
};

