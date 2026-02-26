/**
 * Input Validation Middleware
 * Provides strict schema-based validation for request inputs
 */

const logger = require('../utils/logger');

// Validation rules for common fields
const commonRules = {
    email: {
        type: 'string',
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        maxLength: 255,
        message: 'Invalid email format'
    },
    password: {
        type: 'string',
        minLength: 8,
        maxLength: 128,
        message: 'Password must be 8-128 characters'
    },
    uuid: {
        type: 'string',
        pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        message: 'Invalid UUID format'
    },
    phone: {
        type: 'string',
        pattern: /^\+?[\d\s-]{7,20}$/,
        maxLength: 20,
        message: 'Invalid phone format'
    },
    name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: /^[a-zA-Z\s'-]+$/,
        message: 'Name must contain only letters, spaces, hyphens, and apostrophes'
    },
    text: {
        type: 'string',
        maxLength: 10000,
        message: 'Text field exceeds maximum length'
    }
};

/**
 * Validate a single field against its rules
 */
const validateField = (value, rules, fieldName) => {
    const errors = [];

    // Type check
    if (rules.type && typeof value !== rules.type) {
        errors.push(`${fieldName} must be of type ${rules.type}`);
        return errors; // Can't validate further if wrong type
    }

    // Required check
    if (value === undefined || value === null || value === '') {
        if (rules.required) {
            errors.push(`${fieldName} is required`);
        }
        return errors;
    }

    // String-specific validations
    if (rules.type === 'string') {
        // Length checks
        if (rules.minLength && value.length < rules.minLength) {
            errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
        }

        // Pattern check
        if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(rules.message || `${fieldName} has invalid format`);
        }

        // Enum check
        if (rules.enum && !rules.enum.includes(value)) {
            errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
        }
    }

    // Number-specific validations
    if (rules.type === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
            errors.push(`${fieldName} must be a valid number`);
        } else {
            if (rules.min !== undefined && numValue < rules.min) {
                errors.push(`${fieldName} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && numValue > rules.max) {
                errors.push(`${fieldName} must be at most ${rules.max}`);
            }
        }
    }

    // Array validations
    if (rules.type === 'array') {
        if (!Array.isArray(value)) {
            errors.push(`${fieldName} must be an array`);
        } else {
            if (rules.minItems && value.length < rules.minItems) {
                errors.push(`${fieldName} must have at least ${rules.minItems} items`);
            }
            if (rules.maxItems && value.length > rules.maxItems) {
                errors.push(`${fieldName} must have at most ${rules.maxItems} items`);
            }
        }
    }

    return errors;
};

/**
 * Create validation middleware for a specific schema
 * @param {Object} schema - Validation schema { fieldName: rules }
 */
const validate = (schema) => {
    return (req, res, next) => {
        const errors = [];
        const data = { ...req.params, ...req.query, ...req.body };

        // Check for unexpected fields (optional - can be strict)
        const allowedFields = Object.keys(schema);
        const unexpectedFields = Object.keys(data).filter(key => !allowedFields.includes(key));

        if (unexpectedFields.length > 0) {
            logger.warn('Unexpected fields in request', {
                path: req.path,
                method: req.method,
                unexpectedFields
            });
            // In strict mode, you could reject the request here
            // For now, we just log it
        }

        // Validate each field in schema
        for (const [fieldName, rules] of Object.entries(schema)) {
            const value = data[fieldName];
            const fieldErrors = validateField(value, rules, fieldName);
            errors.push(...fieldErrors);
        }

        if (errors.length > 0) {
            logger.warn('Input validation failed', {
                path: req.path,
                method: req.method,
                errors,
                ip: req.ip
            });

            return res.status(400).json({
                error: 'Invalid input provided',
                code: 'VALIDATION_ERROR',
                details: errors
            });
        }

        next();
    };
};

// Pre-defined validation schemas for common operations
const schemas = {
    login: {
        email: { ...commonRules.email, required: true },
        password: { type: 'string', required: true, minLength: 1 }
    },

    enrollUser: {
        email: { ...commonRules.email, required: true },
        full_name: { ...commonRules.name, required: true },
        role: {
            type: 'string',
            required: true,
            enum: ['admin', 'student', 'teacher', 'parent', 'bursary']
        },
        institution_id: commonRules.uuid,
        phone: commonRules.phone
    },

    createInstitution: {
        name: { ...commonRules.name, required: true, maxLength: 200 },
        email: commonRules.email,
        location: { type: 'string', maxLength: 200 },
        plan: { type: 'string', enum: ['trial', 'basic', 'pro', 'premium'] }
    },

    updateUser: {
        full_name: commonRules.name,
        phone: commonRules.phone,
        gender: { type: 'string', enum: ['male', 'female', 'other'] },
        address: { type: 'string', maxLength: 500 }
    },

    idParam: {
        id: { ...commonRules.uuid, required: true }
    }
};

module.exports = {
    validate,
    commonRules,
    schemas
};
