import { CreateUserData, User, UserRole } from "@/types/types";

/*
 * Creates a User object with proper defaults
 */
export const createUser = (data: CreateUserData): User => {
  return {
    id: generateUserId(),
    name: data.name,
    email: data.email,
    role: data.role,
    joinDate: new Date().toISOString(),
    avatar: data.avatar,
    lastActive: new Date().toISOString(),
  };
};

/**
 * Generates a unique user ID
 */
export const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Creates sample users for testing/demo purposes (Removed - relies on database)
 */
export const createSampleUsers = (): User[] => {
  return [];
};


/**
 * Converts raw data to User objects
 */
export const convertToUsers = (rawData: any[]): User[] => {
  return rawData.map((item, index) => {
    // Handle case where item is a string
    if (typeof item === "string") {
      return createUser({
        name: `User ${index + 1}`,
        email: `user${index + 1}@example.com`,
        role: "student",
      });
    }

    // Handle case where item is an object but missing required fields
    return {
      id: item.id || generateUserId(),
      name: item.name || `User ${index + 1}`,
      email: item.email || `user${index + 1}@example.com`,
      role: item.role || "student",
      joinDate: item.joinDate || new Date().toISOString(),
      avatar: item.avatar,
      lastActive: item.lastActive || new Date().toISOString(),
    } as User;
  });
};

/**
 * Filters users by role
 */
export const filterUsersByRole = (users: User[], role: UserRole): User[] => {
  return users.filter((user) => user.role === role);
};

/**
 * Gets user statistics
 */
export const getUserStats = (users: User[]) => {
  const total = users.length;
  const students = users.filter((u) => u.role === "student").length;
  const teachers = users.filter((u) => u.role === "teacher").length;
  const admins = users.filter((u) => u.role === "admin").length;

  return {
    total,
    students,
    teachers,
    admins,
  };
};

/**
 * Validates user data
 */
export const validateUser = (
  user: Partial<User>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!user.name || user.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  }

  if (!user.email || !isValidEmail(user.email)) {
    errors.push("Valid email is required");
  }

  if (!user.role || !["admin", "teacher", "student"].includes(user.role)) {
    errors.push("Valid role is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Simple email validation
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sorts users by different criteria
 */
export const sortUsers = (
  users: User[],
  sortBy: keyof User,
  order: "asc" | "desc" = "asc"
): User[] => {
  return [...users].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    // If either is undefined, push it to the bottom
    if (aValue === undefined) return order === "asc" ? 1 : -1;
    if (bValue === undefined) return order === "asc" ? -1 : 1;

    // If both are strings, use localeCompare
    if (typeof aValue === "string" && typeof bValue === "string") {
      const comparison = aValue.localeCompare(bValue);
      return order === "asc" ? comparison : -comparison;
    }

    // Otherwise use default comparison
    if (aValue < bValue) return order === "asc" ? -1 : 1;
    if (aValue > bValue) return order === "asc" ? 1 : -1;
    return 0;
  });
};


// Placeholder to prevent expo-router warning
export default function Placeholder() { return null; }
