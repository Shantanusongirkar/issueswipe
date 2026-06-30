import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase/server';
import { getSessionUser, getAdminStatus } from '@/lib/auth';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (user) {
      // Self-healing migration for XP transactions
      const txCount = await db.xpTransaction.count({ where: { userId: user.id } });
      let finalUser = user;
      
      if (txCount === 0 && user.xp > 0) {
        // Create transactions based on existing swipes and matches
        const swipes = await db.swipe.findMany({ where: { userId: user.id, direction: 'right' } });
        const matches = await db.savedMatch.findMany({ where: { userId: user.id } });

        const toCreate = [];
        for (const swipe of swipes) {
          toCreate.push({
            userId: user.id,
            amount: 25,
            action: 'OPEN_ISSUE',
            createdAt: swipe.createdAt,
          });
        }
        for (const match of matches) {
          if (match.status === 'pr_merged') {
            toCreate.push({
              userId: user.id,
              amount: 250,
              action: 'MERGE_PR',
              createdAt: match.updatedAt,
            });
          }
          if (match.status === 'pr_opened' || match.status === 'pr_merged') {
            toCreate.push({
              userId: user.id,
              amount: 100,
              action: 'SUBMIT_PR',
              createdAt: match.createdAt,
            });
          }
        }
        
        if (toCreate.length > 0) {
          await db.xpTransaction.createMany({ data: toCreate });
          const totalReconstructedXp = toCreate.reduce((sum, tx) => sum + tx.amount, 0);
          finalUser = await db.user.update({
            where: { id: user.id },
            data: { xp: totalReconstructedXp },
          });
        }
      }

      const isAdmin = await getAdminStatus();
      return NextResponse.json({ authenticated: true, user: { ...finalUser, isAdmin } });
    }
    return NextResponse.json({ authenticated: false, user: null });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    
    let decodedIdToken;
    let sessionCookie;
    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days

    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true' && idToken === 'mock_developer_token') {
      decodedIdToken = {
        uid: 'mock_dev_github_user_12345',
        name: 'Rishi Bhardwaj',
        email: 'rishi@example.com',
        picture: 'https://github.com/rishibhardwaj.png',
      };
      sessionCookie = 'mock_dev_session_cookie_12345';
    } else {
      // Verify the ID token
      decodedIdToken = await getAdminAuth().verifyIdToken(idToken);

      // Create session cookie
      sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn });
    }

    // Sync user to database
    let user = await db.user.findFirst({
      where: { githubId: decodedIdToken.uid },
    });

    if (!user) {
      // Generate a unique username by appending part of the UID to prevent collisions
      const baseName = decodedIdToken.name || decodedIdToken.email?.split('@')[0] || 'user';
      const uniqueUsername = `${baseName.replace(/\\s+/g, '')}_${decodedIdToken.uid.slice(0, 5)}`;

      user = await db.user.create({
        data: {
          githubId: decodedIdToken.uid,
          username: uniqueUsername,
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
  } catch (error: any) {
    console.error('Session error', error);
    return NextResponse.json({ 
      error: 'Failed to create session', 
      details: error?.message || String(error)
    }, { status: 401 });
  }
}
