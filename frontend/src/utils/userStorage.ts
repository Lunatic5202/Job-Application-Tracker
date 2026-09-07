/**
 * User-namespaced storage utility for CareerX.
 *
 * Rules:
 * 1. Server-side MongoDB is always the primary source of truth.
 * 2. Sensitive resume content and large analysis payloads must NEVER be stored in unnamespaced global localStorage.
 * 3. Any transient client-side persistence must strictly be namespaced by authenticated user ID (e.g. `careerx:{userId}:{key}`).
 * 4. All user-specific data is wiped on logout.
 */

const GLOBAL_RESUME_KEYS = [
  'resumes',
  'resume',
  'resumeLibrary',
  'activeResume',
  'analysis',
  'atsScore',
  'analysisResult',
  'resumeText',
  'atsBreakdown',
  'latestAnalysis',
];

/**
 * Audit and purge any legacy or unnamespaced global resume storage keys.
 */
export function sanitizeResumeStorage(): void {
  try {
    for (const key of GLOBAL_RESUME_KEYS) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
      }
      if (sessionStorage.getItem(key) !== null) {
        sessionStorage.removeItem(key);
      }
    }

    // Purge any unnamespaced keys matching pattern
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('resumeLibrary') ||
          k.startsWith('activeResume') ||
          k.startsWith('analysisResult') ||
          k.startsWith('atsScore_')) &&
        !k.includes(':')
      ) {
        localStorage.removeItem(k);
      }
    }
  } catch (err) {
    console.warn('Error sanitizing browser storage:', err);
  }
}

/**
 * Generate a secure, user-isolated storage key.
 */
export function getUserStorageKey(userId: string, key: string): string {
  if (!userId) throw new Error('Cannot create user storage key without authenticated userId');
  return `careerx:${userId}:${key}`;
}

/**
 * Retrieve user-namespaced storage item.
 */
export function getUserItem<T>(userId: string, key: string, defaultValue: T | null = null): T | null {
  if (!userId) return defaultValue;
  try {
    const raw = localStorage.getItem(getUserStorageKey(userId, key));
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Persist user-namespaced storage item.
 */
export function setUserItem<T>(userId: string, key: string, value: T): void {
  if (!userId) return;
  try {
    localStorage.setItem(getUserStorageKey(userId, key), JSON.stringify(value));
  } catch (err) {
    console.warn('Error saving user storage item:', err);
  }
}

/**
 * Remove user-namespaced storage item.
 */
export function removeUserItem(userId: string, key: string): void {
  if (!userId) return;
  try {
    localStorage.removeItem(getUserStorageKey(userId, key));
  } catch (err) {
    console.warn('Error removing user storage item:', err);
  }
}

/**
 * Purge all session data and user-specific cache on logout.
 */
export function clearUserSessionData(userId?: string): void {
  try {
    sanitizeResumeStorage();

    // Remove token and auth user
    localStorage.removeItem('careerx_auth_token');
    localStorage.removeItem('careerx_auth_user');

    if (userId) {
      const userPrefix = `careerx:${userId}:`;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(userPrefix)) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch (err) {
    console.warn('Error clearing user session data:', err);
  }
}
