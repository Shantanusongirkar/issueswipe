import { cookies } from 'next/headers';
import { db } from './db';
import { adminAuth } from './firebase/server';

export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('firebaseSession')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    const user = await db.user.findFirst({
      where: { githubId: decodedClaims.uid },
    });

    return user;
  } catch (error) {
    return null;
  }
}
