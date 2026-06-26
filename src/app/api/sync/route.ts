import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { syncIssuesFromGitHub } from '@/lib/github';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let customFilters = {};
    try {
      customFilters = await req.json();
    } catch (e) {
      // Ignored if body is empty or invalid
    }

    const { searchText, languages: customLangs, labels: customLabels } = customFilters as any;

    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const languages = customLangs && customLangs.length > 0 ? customLangs : JSON.parse(dbUser.preferredLanguages || '[]');
    const topics = JSON.parse(dbUser.preferredTopics || '[]');

    const result = await syncIssuesFromGitHub(
      dbUser.githubToken || undefined, 
      languages, 
      topics,
      searchText,
      customLabels
    );
    
    // Add notification on successful sync
    if (result.success && result.issuesSynced > 0 && !result.isSimulated) {
      await db.notification.create({
        data: {
          userId: user.id,
          title: 'New Issues Found',
          message: `Found ${result.issuesSynced} new issues matching your tech stack.`,
          type: 'SUCCESS',
          linkUrl: '/swipe'
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
