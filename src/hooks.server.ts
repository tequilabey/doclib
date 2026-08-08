import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;
  event.locals.sessionToken = null;
  event.locals.sessionId = null;
  event.locals.roles = [];

  return resolve(event);
};
