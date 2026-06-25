const canonicalRoleFrom = (role, isPlatformAdmin = false) => {
  if (isPlatformAdmin) return "platform_admin";
  if (role === "master_admin") return "platform_admin";
  if (role === "admin") return "school_admin";
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
  withRoleAliases,
};
