// Simulated backend endpoint module representing server-side logic.
// In a real application, these functions would make HTTP requests/gRPC calls to an actual server.
// The signing key here represents a server-side environment variable / secret key.
const SERVER_SECRET_KEY = 'super-secret-e-wallet-backend-key-2026';

function base64Encode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  while (i < str.length) {
    const c1 = str.charCodeAt(i++);
    const c2 = i < str.length ? str.charCodeAt(i++) : NaN;
    const c3 = i < str.length ? str.charCodeAt(i++) : NaN;
    const byte1 = c1 >> 2;
    const byte2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
    const byte3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6);
    const byte4 = isNaN(c3) ? 64 : c3 & 63;
    result += chars.charAt(byte1) + chars.charAt(byte2) + chars.charAt(byte3) + chars.charAt(byte4);
  }
  return result;
}

function base64Decode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  while (i < str.length) {
    const byte1 = chars.indexOf(str.charAt(i++));
    const byte2 = chars.indexOf(str.charAt(i++));
    const byte3 = chars.indexOf(str.charAt(i++));
    const byte4 = chars.indexOf(str.charAt(i++));
    if (byte1 === -1 || byte2 === -1 || byte3 === -1 || byte4 === -1) return '';
    const c1 = (byte1 << 2) | (byte2 >> 4);
    const c2 = ((byte2 & 15) << 4) | (byte3 >> 2);
    const c3 = ((byte3 & 3) << 6) | byte4;
    result += String.fromCharCode(c1);
    if (byte3 !== 64) result += String.fromCharCode(c2);
    if (byte4 !== 64) result += String.fromCharCode(c3);
  }
  return result;
}

// Simple HMAC-like hashing function in pure JS to sign the token and prevent client tampering/forgery.
function simpleSign(payload: string, secret: string): string {
  let hash = 0;
  const combined = payload + secret;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
}

export const backendApi = {
  /**
   * Simulates calling the backend endpoint to request issuance of a signed token
   */
  async issueVerificationToken(phone: string): Promise<string> {
    // Simulate server network latency
    await new Promise((resolve) => setTimeout(resolve, 300));

    const payloadObj = {
      phone,
      timestamp: Date.now(),
      verified: true,
    };
    const payloadStr = JSON.stringify(payloadObj);
    const signature = simpleSign(payloadStr, SERVER_SECRET_KEY);

    // Format like a JWS/JWT token: base64(payload).signature
    const base64Payload = base64Encode(payloadStr);
    return `${base64Payload}.${signature}`;
  },

  /**
   * Simulates calling the backend endpoint to validate JWT signature/HMAC and payload expiry
   */
  async validateVerificationToken(token: string): Promise<{ isValid: boolean; phone?: string }> {
    // Simulate server network latency
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (!token) return { isValid: false };

    try {
      const parts = token.split('.');
      if (parts.length !== 2) return { isValid: false };

      const [base64Payload, signature] = parts;
      const payloadStr = base64Decode(base64Payload);
      const expectedSignature = simpleSign(payloadStr, SERVER_SECRET_KEY);

      if (signature !== expectedSignature) {
        // Signature verification failed (invalid token/tampered client)
        return { isValid: false };
      }

      const payload = JSON.parse(payloadStr);
      if (payload.verified === true && payload.phone && payload.timestamp) {
        const age = Date.now() - payload.timestamp;
        // Server-side check: token is valid for 5 minutes
        if (age > 0 && age < 5 * 60 * 1000) {
          return { isValid: true, phone: payload.phone };
        }
      }
      return { isValid: false };
    } catch {
      return { isValid: false };
    }
  },

  /**
   * Synchronous signature/HMAC and expiry validation (equivalent to server-side validation)
   */
  validateVerificationTokenSync(token: string, now: number): { isValid: boolean; phone?: string } {
    if (!token) return { isValid: false };

    try {
      const parts = token.split('.');
      if (parts.length !== 2) return { isValid: false };

      const [base64Payload, signature] = parts;
      const payloadStr = base64Decode(base64Payload);
      const expectedSignature = simpleSign(payloadStr, SERVER_SECRET_KEY);

      if (signature !== expectedSignature) {
        // Signature verification failed (invalid token/tampered client)
        return { isValid: false };
      }

      const payload = JSON.parse(payloadStr);
      if (payload.verified === true && payload.phone && payload.timestamp) {
        const age = now - payload.timestamp;
        // Server-side check: token is valid for 5 minutes
        if (age > 0 && age < 5 * 60 * 1000) {
          return { isValid: true, phone: payload.phone };
        }
      }
      return { isValid: false };
    } catch {
      return { isValid: false };
    }
  }
};
