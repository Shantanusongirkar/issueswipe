import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { addXp } from '@/lib/xp';

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const language = searchParams.get('language') || '';

  try {
    const savedMatches = await db.savedMatch.findMany({
      where: {
        userId: user.id,
        issue: {
          OR: [
            { title: { contains: search } },
            { repository: { name: { contains: search } } },
            { repository: { owner: { contains: search } } },
          ],
          ...(language
            ? { repository: { language: { equals: language } } }
            : {}),
        },
      },
      include: {
        issue: {
          include: {
            repository: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Clean up structure for response
    const formattedMatches = savedMatches.map((match: any) => {
      return {
        savedId: match.id,
        savedAt: match.createdAt,
        status: match.status, // "bookmarked" | "pr_opened" | "pr_merged"
        issue: {
          id: match.issue.id,
          title: match.issue.title,
          description: match.issue.description,
          url: match.issue.url,
          githubNumber: match.issue.githubNumber,
          difficulty: match.issue.difficulty,
          labels: JSON.parse(match.issue.labels || '[]'),
          repository: match.issue.repository,
        },
      };
    });

    return NextResponse.json(formattedMatches);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to fetch saved matches: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { issueId } = await request.json();

    if (!issueId) {
      return NextResponse.json({ error: 'Issue ID required' }, { status: 400 });
    }

    // Remove from savedMatch
    await db.savedMatch.deleteMany({
      where: {
        userId: user.id,
        issueId,
      },
    });

    return NextResponse.json({ success: true, message: 'Match removed.' });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to delete match: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { issueId, status } = await request.json();

    if (!issueId || !['pr_opened', 'pr_merged'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    let updatedUser = user;

    await db.$transaction(async (tx) => {
      // 1. Update status
      await tx.savedMatch.updateMany({
        where: {
          userId: user.id,
          issueId,
        },
        data: {
          status,
        },
      });
    });

    // 2. Award XP corresponding to the workflow advancement
    if (status === 'pr_opened') {
      const res = await addXp(user.id, 'SUBMIT_PR');
      if (res) updatedUser = res;
    } else if (status === 'pr_merged') {
      const res = await addXp(user.id, 'MERGE_PR');
      if (res) updatedUser = res;
    }

    return NextResponse.json({
      success: true,
      status,
      user: {
        xp: updatedUser.xp,
        rank: updatedUser.rank,
        streak: updatedUser.dailyStreak,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to update contribution status: ${error.message}` },
      { status: 500 }
    );
  }
}
