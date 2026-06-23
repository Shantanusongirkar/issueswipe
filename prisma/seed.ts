import { db as prisma } from '../src/lib/db';

async function main() {
  console.log('Seeding database...');

  // Clean up
  await prisma.swipe.deleteMany();
  await prisma.savedMatch.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.user.deleteMany();

  // Create Mock User
  const user = await prisma.user.create({
    data: {
      githubId: 'mock-user-id',
      username: 'johanliebert',
      avatar: 'https://avatars.githubusercontent.com/u/1024025?v=4',
      bio: 'Building annoying things and open sourcing them.',
      preferredLanguages: JSON.stringify(['TypeScript', 'PostgreSQL', 'React']),
      preferredTopics: JSON.stringify(['Frontend', 'Fullstack']),
      experienceLevel: 'intermediate',
      xp: 450,
      rank: 'Issue Hunter',
      dailyStreak: 3,
    },
  });

  // Mock Repositories
  const repo1 = await prisma.repository.create({
    data: {
      githubId: 'repo-1',
      name: 'next.js',
      owner: 'vercel',
      fullName: 'vercel/next.js',
      url: 'https://github.com/vercel/next.js',
      description: 'The React Framework',
      language: 'TypeScript',
      languages: JSON.stringify(['TypeScript', 'JavaScript', 'Rust']),
      stars: 120000,
      license: 'MIT',
      topics: JSON.stringify(['react', 'framework', 'ssr']),
    },
  });

  const repo2 = await prisma.repository.create({
    data: {
      githubId: 'repo-2',
      name: 'react',
      owner: 'facebook',
      fullName: 'facebook/react',
      url: 'https://github.com/facebook/react',
      description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
      language: 'JavaScript',
      languages: JSON.stringify(['JavaScript', 'C++', 'HTML']),
      stars: 210000,
      license: 'MIT',
      topics: JSON.stringify(['react', 'javascript', 'ui']),
    },
  });

  // Mock Issues
  await prisma.issue.create({
    data: {
      githubId: 'issue-1',
      githubNumber: 1234,
      title: 'Fix hydration error on server components',
      description: 'We are seeing a mismatch when rendering Suspense boundaries...',
      url: 'https://github.com/vercel/next.js/issues/1234',
      labels: JSON.stringify(['bug', 'good first issue']),
      difficulty: 'intermediate',
      commentsCount: 4,
      repositoryId: repo1.id,
    },
  });

  await prisma.issue.create({
    data: {
      githubId: 'issue-2',
      githubNumber: 5678,
      title: 'Update documentation for React 19 hooks',
      description: 'We need to document the use hook and form actions.',
      url: 'https://github.com/facebook/react/issues/5678',
      labels: JSON.stringify(['documentation', 'help wanted']),
      difficulty: 'beginner',
      commentsCount: 12,
      repositoryId: repo2.id,
    },
  });

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
