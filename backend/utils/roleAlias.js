const canonicalRoleFrom = (role, isPlatformAdmin = false) => {
  if (isPlatformAdmin) return "platform_admin";
  if (role === "master_admin") return "platform_admin";
  if (role === "admin") return "school_admin";
  return role;
};

const databaseRoleFrom = (role, isPlatformAdmin = false) => {
  if (isPlatformAdmin) return "master_admin";
  if (role === "platform_admin" || role === "master_admin") return "master_admin";
  if (role === "school_admin" || role === "admin") return "admin";
  return role;
};

const withRoleAliases = (userLike = {}, options = {}) => {
  const role = userLike.role || null;
  const isPlatformAdmin =
    options.isPlatformAdmin !== undefined
      ? options.isPlatformAdmin
      : Boolean(userLike.isPlatformAdmin || userLike.is_platform_admin);

  return {
    ...userLike,
    role_alias: canonicalRoleFrom(role, isPlatformAdmin),
    canonical_role: canonicalRoleFrom(role, isPlatformAdmin),
  };
};

module.exports = {
  canonicalRoleFrom,
  databaseRoleFrom,
  withRoleAliases,
};
