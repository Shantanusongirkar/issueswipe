import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token returned from GitHub');
    }

    // 2. Fetch GitHub user data
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const githubUser = await userRes.json();

    // 3. Find or create user in DB
    let user = await db.user.findUnique({
      where: { githubId: String(githubUser.id) },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          githubId: String(githubUser.id),
          username: githubUser.login,
          avatar: githubUser.avatar_url,
          bio: githubUser.bio,
          githubToken: accessToken,
          preferredLanguages: JSON.stringify([]),
          preferredTopics: JSON.stringify([]),
          experienceLevel: 'beginner',
        },
      });
    } else {
      // Update basic info on login
      user = await db.user.update({
        where: { id: user.id },
        data: {
          username: githubUser.login,
          avatar: githubUser.avatar_url,
          bio: githubUser.bio,
          githubToken: accessToken,
        },
      });
    }

    // 4. Create JWT session
    const jwt = await signToken({ userId: user.id, username: user.username });
    
    const cookieStore = await cookies();
    cookieStore.set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // 5. Redirect based on onboarding
    const isNew = user.preferredLanguages === '[]' || user.preferredLanguages === '';
    
    if (isNew) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    } else {
      return NextResponse.redirect(new URL('/swipe', request.url));
    }
  } catch (error) {
    console.error('OAuth Error:', error);
    return NextResponse.redirect(new URL('/?error=oauth_failed', request.url));
  }
}
