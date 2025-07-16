// Email validation configuration based on your provided logic

// List of BANNED emails (KEEP HARDCODED FOR SECURITY)
export const BANNED_EMAILS = [
  'euroi@gmail.com',
  // Add more banned emails here
];

// Default Allowed Emails (used ONLY if localStorage is empty)
export const DEFAULT_ALLOWED_EMAILS = [
  'educationsladmin@gmail.com',
  'ishanstc123@gmail.com', 
  '26002ishan@gmail.com',
];

// Helper to get allowed emails
export function getAllowedEmails(): string[] {
  const key = 'allowedEmailsList';
  try {
    const storedList = localStorage.getItem(key);
    if (storedList) {
      return JSON.parse(storedList);
    } else {
      console.log("Allowed emails not found in localStorage, using defaults");
      // Optionally save defaults to localStorage
      localStorage.setItem(key, JSON.stringify(DEFAULT_ALLOWED_EMAILS));
      return DEFAULT_ALLOWED_EMAILS;
    }
  } catch (e) {
    console.error("Error reading allowed emails from localStorage:", e);
    return DEFAULT_ALLOWED_EMAILS;
  }
}

// Check if email is banned
export function isEmailBanned(email: string): boolean {
  return BANNED_EMAILS.includes(email.toLowerCase());
}

// Check if email is in allowed list
export function isEmailAllowed(email: string): boolean {
  const allowedEmails = getAllowedEmails();
  return allowedEmails.includes(email.toLowerCase());
}

// Validate email against both banned and allowed lists
export function validateEmail(email: string): { 
  isValid: boolean; 
  reason?: 'banned' | 'not_allowed'; 
} {
  const emailLower = email.toLowerCase();
  
  if (isEmailBanned(emailLower)) {
    return { isValid: false, reason: 'banned' };
  }
  
  if (!isEmailAllowed(emailLower)) {
    return { isValid: false, reason: 'not_allowed' };
  }
  
  return { isValid: true };
}
