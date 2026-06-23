import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.length < 2) {
    return NextResponse.json({ repositories: [], issues: [] });
  }

  try {
    const [repositories, issues] = await Promise.all([
      db.repository.findMany({
        where: {
          OR: [
            { fullName: { contains: q } },
            { description: { contains: q } },
          ],
        },
        take: 5,
      }),
      db.issue.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
          ],
        },
        include: { repository: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({ repositories, issues });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
