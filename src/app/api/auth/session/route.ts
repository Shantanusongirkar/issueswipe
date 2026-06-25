import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    
    // Verify the ID token
    const decodedIdToken = await getAdminAuth().verifyIdToken(idToken);

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn });

    // Sync user to database
    let user = await db.user.findFirst({
      where: { githubId: decodedIdToken.uid },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          githubId: decodedIdToken.uid,
          username: decodedIdToken.name || decodedIdToken.email?.split('@')[0] || `user_${decodedIdToken.uid.slice(0, 5)}`,
          avatar: decodedIdToken.picture || null,
          bio: "New contributor on IssueSwipe.",
          preferredLanguages: JSON.stringify([]),
          preferredTopics: JSON.stringify([]),
          experienceLevel: 'beginner',
        },
      });
    } else {
      await db.user.update({
        where: { id: user.id },
        data: {
          username: decodedIdToken.name || user.username,
          avatar: decodedIdToken.picture || user.avatar,
        }
      });
    }

    const cookieStore = await cookies();
    cookieStore.set('firebaseSession', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    let isNew = true;
    try {
      const prefs = user.preferredLanguages ? JSON.parse(user.preferredLanguages) : [];
      isNew = prefs.length === 0;
    } catch {
      isNew = true;
    }
    
    return NextResponse.json({ success: true, isNew });
  } catch (error) {
    console.error('Session error', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 401 });
  }
}
