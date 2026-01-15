// Utility to map between database snake_case and TypeScript camelCase

export const mapUserFromDB = (dbUser: any): any => {
  if (!dbUser) return null;
  
  return {
    ...dbUser,
    companyId: dbUser.company_id,
    jobTitle: dbUser.job_title,
    firstName: dbUser.first_name,
    lastName: dbUser.last_name,
    isSubAdmin: dbUser.is_sub_admin || false,
    isBanned: dbUser.is_banned || false,
    salaryAmount: dbUser.salary_amount ? parseFloat(dbUser.salary_amount) : undefined,
    salaryDate: dbUser.salary_date ? parseInt(dbUser.salary_date, 10) : undefined,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
};

export const mapUserToDB = (user: any): any => {
  const dbUser: any = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  if (user.companyId !== undefined) dbUser.company_id = user.companyId;
  if (user.jobTitle !== undefined) dbUser.job_title = user.jobTitle;
  if (user.firstName !== undefined) dbUser.first_name = user.firstName;
  if (user.lastName !== undefined) dbUser.last_name = user.lastName;
  if (user.avatar !== undefined) dbUser.avatar = user.avatar;
  if (user.permissions !== undefined) dbUser.permissions = user.permissions;
  if (user.isSubAdmin !== undefined) dbUser.is_sub_admin = user.isSubAdmin;
  if (user.isBanned !== undefined) dbUser.is_banned = user.isBanned;
  if (user.salaryAmount !== undefined) dbUser.salary_amount = user.salaryAmount;
  if (user.salaryDate !== undefined) dbUser.salary_date = user.salaryDate;

  return dbUser;
};

