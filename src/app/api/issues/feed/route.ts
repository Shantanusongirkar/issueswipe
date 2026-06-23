import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateMatchScore } from '@/lib/matching';

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filterLang = searchParams.get('language');
  const filterDiff = searchParams.get('difficulty');

  try {
    // 1. Fetch issues the user hasn't swiped on yet
    const rawIssues = await db.issue.findMany({
      where: {
        
        swipes: {
          none: {
            userId: user.id,
          },
        },
        // Apply optional database filters
        ...(filterDiff ? { difficulty: filterDiff } : {}),
      },
      include: {
        repository: true,
      },
    });

    // 2. Compute scores and map structures
    let scoredIssues = rawIssues.map((issue) => {
      const matchScore = calculateMatchScore(user, issue);
      return {
        ...issue,
        labels: JSON.parse(issue.labels || '[]'),
        matchScore,
      };
    });

    // 3. Apply optional programming language filter
    if (filterLang) {
      scoredIssues = scoredIssues.filter(
        (issue) =>
          issue.repository.language?.toLowerCase() === filterLang.toLowerCase()
      );
    }

    // 4. Sort by matchScore descending (highest match first)
    scoredIssues.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json(scoredIssues);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to fetch issue feed: ${error.message}` },
      { status: 500 }
    );
  }
}
