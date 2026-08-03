// Backend is hosted on Render — same URL for dev and production.
export const BACKEND = 'https://lev3lbarbers-backend.onrender.com';

// Public website URL — used for the shop checkout redirect.
export const WEBSITE_URL = 'https://www.lev3lbarbers.com';

// Images are stored either on the backend server (relative path like /uploads/x.jpg)
// or on cloud storage (already a full https:// URL). Never prepend BACKEND to a
// fully-qualified URL or you get a malformed src that loads nothing.
export const resolveImageUrl = (url) => {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${BACKEND}${url}`;
};
