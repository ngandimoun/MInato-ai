// Generate a random invitation code for couple therapy sessions
export function generateInvitationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Validate invitation code format
export function isValidInvitationCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}

// Check if invitation code is expired
export function isInvitationExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

// Format session status for display
export function formatSessionStatus(status: string): string {
  switch (status) {
    case 'waiting_for_partner':
      return 'Waiting for Partner';
    case 'active':
      return 'Active';
    case 'paused':
      return 'Paused';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

// Get session status color for UI
export function getStatusColor(status: string): string {
  switch (status) {
    case 'waiting_for_partner':
      return 'text-yellow-600 bg-yellow-100';
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'paused':
      return 'text-blue-600 bg-blue-100';
    case 'completed':
      return 'text-gray-600 bg-gray-100';
    case 'cancelled':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
} 