// Obsolete for the filesystem-backed archive browser.
// Kept only so older imports do not break during cleanup.

export async function sessionsGetUserByToken(_token: string): Promise<any | null> {
  return null;
}

export async function sessionsTouch(_args: { sessionId: number; newExpiresAtUtc: Date }): Promise<void> {
  return;
}
