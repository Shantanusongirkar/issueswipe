import { NextResponse } from 'next/server';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${appUrl}/api/auth/callback`;
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user,public_repo`;

  return NextResponse.redirect(githubAuthUrl);
}
