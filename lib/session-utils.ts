import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

const SESSION_COOKIE_NAME = "wellora_intake_session";

export function getIntakeSessionId() {
  const cookieStore = cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    sessionId = uuidv4();
    // Note: We can't set the cookie here if this is called in a component or GET route 
    // that doesn't return the response yet. 
    // We should handle setting it in the response.
  }

  return sessionId;
}

export function setIntakeSessionId(sessionId: string) {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  });
}
