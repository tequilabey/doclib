declare global {
  namespace App {
    interface Locals {
      user: {
        UserId: number;
        LoginName?: string | null;
        FirstName?: string | null;
        LastName?: string | null;
        DisplayName?: string | null;
        Roles?: string[];
      } | null;
      sessionToken: string | null;
      sessionId: number | null;
      roles: string[];
    }
  }
}

export {};
