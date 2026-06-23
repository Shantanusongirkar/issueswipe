import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch user with recent transactions and contributions
    const fullProfile = await db.user.findUnique({
      where: { id: user.id },
      include: {
        swipes: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        savedMatches: {
          include: {
            issue: {
              include: {
                repository: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    return NextResponse.json(fullProfile);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to load user profile: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { languages, experienceLevel, interests } = await request.json();

    if (!Array.isArray(languages) || !experienceLevel || !Array.isArray(interests)) {
      return NextResponse.json(
        { error: 'Invalid preferences format' },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        preferredLanguages: JSON.stringify(languages),
        experienceLevel,
        preferredTopics: JSON.stringify(interests),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to update profile: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
