import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { syncIssuesFromGitHub } from '@/lib/github';
import { db } from '@/lib/db';

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const languages = JSON.parse(dbUser.preferredLanguages || '[]');
    const topics = JSON.parse(dbUser.preferredTopics || '[]');

    const result = await syncIssuesFromGitHub(dbUser.githubToken || undefined, languages, topics);
    
    // Add notification on successful sync
    if (result.success && result.issuesSynced > 0) {
      await db.notification.create({
        data: {
          userId: user.id,
          title: 'New Issues Found',
          message: `Found ${result.issuesSynced} new issues matching your tech stack.`,
          type: 'SUCCESS'
        }
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: `Sync failed: ${error.message}` },
      { status: 500 }
    );
  }
}
