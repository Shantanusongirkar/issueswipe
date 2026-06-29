import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { addXp } from '@/lib/xp';
import { checkUserPRStatus } from '@/lib/github';

export const dynamic = 'force-dynamic';

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

    // Auto-check GitHub for PR status on active matches (up to 5 to prevent rate limits)
    const activeMatches = savedMatches.filter((m: any) => m.status !== 'pr_merged').slice(0, 5);
    
    for (const match of activeMatches) {
      const prStatus = await checkUserPRStatus(user.username, match.issue.repository.fullName, user.githubToken || undefined);
      
      if (prStatus && prStatus.status !== match.status) {
        // Status advanced!
        await db.savedMatch.update({
          where: { id: match.id },
          data: { status: prStatus.status }
        });
        
        if (prStatus.status === 'pr_opened' && match.status === 'bookmarked') {
           await addXp(user.id, 'SUBMIT_PR');
        } else if (prStatus.status === 'pr_merged') {
           await addXp(user.id, 'MERGE_PR');
        }
        
        match.status = prStatus.status; // update in-memory for response
      }
    }

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

    // 1. Fetch saved match details to verify repository name
    const match = await db.savedMatch.findFirst({
      where: {
        userId: user.id,
        issueId,
      },
      include: {
        issue: {
          include: {
            repository: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Saved match not found' }, { status: 404 });
    }

    // 2. Verify PR status on GitHub
    const isMockUser = user.githubId === 'mock_dev_github_user_12345';
    let isVerified = false;

    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true' && isMockUser) {
      isVerified = true;
    } else {
      const prStatus = await checkUserPRStatus(
        user.username,
        match.issue.repository.fullName,
        user.githubToken || undefined
      );

      if (prStatus) {
        if (status === 'pr_opened' && (prStatus.status === 'pr_opened' || prStatus.status === 'pr_merged')) {
          isVerified = true;
        } else if (status === 'pr_merged' && prStatus.status === 'pr_merged') {
          isVerified = true;
        }
      }
    }

    if (!isVerified) {
      return NextResponse.json(
        {
          error: `Could not verify your Pull Request on GitHub for ${match.issue.repository.fullName}. Make sure you have opened/merged a PR from your account (@${user.username}).`,
        },
        { status: 400 }
      );
    }

    let updatedUser = user;

    await db.$transaction(async (tx) => {
      // 3. Update status
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

    // 4. Award XP corresponding to the workflow advancement
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
