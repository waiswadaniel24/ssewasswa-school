// Security hardening utilities for Ssewasswa ERP

export const validateUserRole = (user) => {
  if (!user || typeof user !== 'object') return null;
  
  // Only trust app_metadata (set server-side), never user_metadata (user-editable)
  const role = user.app_metadata?.role || 'Staff';
  const permissions = Array.isArray(user.app_metadata?.permissions) ? user.app_metadata.permissions : [];
  
  return { role, permissions };
};

export const hasPermission = (user, requiredPermission) => {
  if (!user || typeof user !== 'object') return false;
  
  const data = validateUserRole(user);
  if (!data) return false;
  
  // Super admin has all permissions
  if (data.role === 'Super Admin') return true;
  
  // Check explicit permission
  return Array.isArray(data.permissions) && data.permissions.includes(requiredPermission);
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  
  // Remove any HTML/script content
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const validatePhoneNumber = (phone) => {
  // Uganda phone format: +256 followed by 9 digits
  const re = /^\+?256[0-9]{9}$/;
  return re.test(String(phone).replace(/\s/g, ''));
};

// Rate limiting helper
export const createRateLimiter = (maxAttempts = 5, windowMs = 60000) => {
  const attempts = new Map();
  
  return (key) => {
    const now = Date.now();
    const userAttempts = attempts.get(key) || [];
    
    // Remove old attempts outside window
    const validAttempts = userAttempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return { allowed: false, retryAfter: Math.ceil((validAttempts[0] + windowMs - now) / 1000) };
    }
    
    validAttempts.push(now);
    attempts.set(key, validAttempts);
    
    return { allowed: true };
  };
};

// Content Security headers for deployment
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
