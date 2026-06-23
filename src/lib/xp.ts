import { db } from './db';

const XP_MAP: Record<string, number> = {
  SAVE_ISSUE: 10,
  OPEN_ISSUE: 25,
  SUBMIT_PR: 100,
  MERGE_PR: 250,
};

const RANKS = [
  { name: 'New Contributor', minXP: 0, maxXP: 100 },
  { name: 'Issue Hunter', minXP: 101, maxXP: 500 },
  { name: 'PR Warrior', minXP: 501, maxXP: 1500 },
  { name: 'Merge Machine', minXP: 1501, maxXP: 5000 },
  { name: 'Open Source Legend', minXP: 5001, maxXP: 9999999 },
];

export function determineRank(xp: number): string {
  for (const rank of RANKS) {
    if (xp >= rank.minXP && xp <= rank.maxXP) {
      return rank.name;
    }
  }
  return 'Open Source Legend';
}

export async function addXp(userId: string, action: string) {
  const xpGained = XP_MAP[action];
  if (!xpGained) return null;

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    let updatedUser = user;

    await db.$transaction(async (tx) => {
      // 1. Calculate new XP and Rank
      const newXp = user.xp + xpGained;
      const newRank = determineRank(newXp);

      // 2. Daily Streak Logic
      const now = new Date();
      let streakToSet = user.dailyStreak;
      let lastSwipedToSet = user.lastSwiped || now;

      if (user.lastSwiped) {
        const lastDate = new Date(user.lastSwiped);
        const timeDiff = now.getTime() - lastDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

        if (daysDiff === 1) {
          // Continuous day
          streakToSet += 1;
          lastSwipedToSet = now;
        } else if (daysDiff > 1) {
          // Missed a day
          streakToSet = 1;
          lastSwipedToSet = now;
        }
      } else {
        streakToSet = 1;
      }

      // 3. Update User
      updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          xp: newXp,
          rank: newRank,
          dailyStreak: streakToSet,
          lastSwiped: lastSwipedToSet,
        },
      });
    });

    return updatedUser;
  } catch (error) {
    console.error('Failed to add XP:', error);
    return null;
  }
}
