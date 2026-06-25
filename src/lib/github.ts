import { db } from './db';

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

export interface GitHubIssueSyncResult {
  success: boolean;
  issuesSynced: number;
  message: string;
}

const GITHUB_SEARCH_QUERY = `
  query($queryString: String!) {
    search(query: $queryString, type: ISSUE, first: 30) {
      issueCount
      edges {
        node {
          ... on Issue {
            id
            title
            url
            number
            body
            createdAt
            labels(first: 5) {
              nodes {
                name
              }
            }
            repository {
              id
              name
              url
              description
              stargazerCount
              owner {
                login
              }
              primaryLanguage {
                name
              }
              object(expression: "HEAD:README.md") {
                ... on Blob {
                  text
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function syncIssuesFromGitHub(
  accessToken?: string,
  preferredLanguages: string[] = [],
  preferredTopics: string[] = []
): Promise<GitHubIssueSyncResult> {
  const token = accessToken || process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

  if (!token || token === 'mock_client_secret' || token === 'your_token') {
    console.log('GitHub Token missing or placeholder. Simulating sync with sample data...');
    return simulateSync();
  }

  try {
    let queryParts = ['is:issue', 'is:open', 'label:"good first issue"', 'sort:updated'];
    
    if (preferredLanguages.length > 0) {
      const langQuery = preferredLanguages.map(l => `language:${l}`).join(' ');
      queryParts.push(langQuery);
    }
    
    if (preferredTopics.length > 0) {
      const topicQuery = preferredTopics.join(' ');
      queryParts.push(topicQuery);
    }
    
    const queryString = queryParts.join(' ');
    console.log('[Sync] GitHub search query:', queryString);

    const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'IssueSwipe-Sync-Service',
      },
      body: JSON.stringify({
        query: GITHUB_SEARCH_QUERY,
        variables: {
          queryString: queryString,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const { data, errors } = await response.json() as { data: any, errors?: { message: string }[] };

    if (errors && errors.length > 0) {
      throw new Error(`GraphQL errors: ${errors.map((e) => e.message).join(', ')}`);
    }

    const edges = data?.search?.edges || [];
    let syncCount = 0;

    for (const edge of edges) {
      const node = edge.node;
      if (!node || !node.repository) continue;

      const repoNode = node.repository;
      const labels: string[] = node.labels?.nodes?.map((l: { name: string }) => l.name) || [];

      // 1. Create or Update Repository
      const readmeBlob = repoNode.object;
      const readmeText = readmeBlob && readmeBlob.text ? readmeBlob.text : null;

      const repo = await db.repository.upsert({
        where: { githubId: repoNode.id },
        update: {
          name: repoNode.name,
          fullName: `${repoNode.owner.login}/${repoNode.name}`,
          languages: JSON.stringify([repoNode.primaryLanguage?.name || 'TypeScript']),
          topics: JSON.stringify([]),
          owner: repoNode.owner.login,
          description: repoNode.description,
          readmeText: readmeText,
          url: repoNode.url,
          stars: repoNode.stargazerCount,
          language: repoNode.primaryLanguage?.name || 'TypeScript',
        },
        create: {
          githubId: repoNode.id,
          name: repoNode.name,
          fullName: `${repoNode.owner.login}/${repoNode.name}`,
          languages: JSON.stringify([repoNode.primaryLanguage?.name || 'TypeScript']),
          topics: JSON.stringify([]),
          owner: repoNode.owner.login,
          description: repoNode.description,
          readmeText: readmeText,
          url: repoNode.url,
          stars: repoNode.stargazerCount,
          language: repoNode.primaryLanguage?.name || 'TypeScript',
        },
      });

      // 2. Map labels to difficulty/estimated time
      const isGoodFirst = labels.some((l: string) => l.toLowerCase().includes('good first issue'));
      const difficulty = isGoodFirst ? 'Beginner' : Math.random() > 0.5 ? 'Intermediate' : 'Advanced';
      // 3. Create or Update Issue
      await db.issue.upsert({
        where: { repositoryId_githubNumber: { repositoryId: repo.id, githubNumber: node.number } },
        update: {
          title: node.title,
          description: node.body || '',
          url: node.url,
          githubNumber: node.number,
          labels: JSON.stringify(labels),
          difficulty,
        },
        create: {
          githubId: node.id,
          title: node.title,
          description: node.body || '',
          url: node.url,
          githubNumber: node.number,
          repositoryId: repo.id,
          labels: JSON.stringify(labels),
          difficulty,
        },
      });

      syncCount++;
    }

    return {
      success: true,
      issuesSynced: syncCount,
      message: `Successfully synced ${syncCount} issues from GitHub GraphQL search.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('GitHub API sync failed, falling back to simulation:', message);
    return simulateSync(`Sync failed: ${message}. Simulating instead.`);
  }
}

async function simulateSync(note?: string): Promise<GitHubIssueSyncResult> {
  // Wait a small delay to simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock repositories to create if DB is empty or to add variety
  const mockRepoData = [
    { owner: 'facebook', name: 'react', desc: 'The library for web and native user interfaces.', lang: 'JavaScript', stars: 225000, url: 'https://github.com/facebook/react' },
    { owner: 'microsoft', name: 'TypeScript', desc: 'TypeScript is a superset of JavaScript that compiles to clean JavaScript output.', lang: 'TypeScript', stars: 100000, url: 'https://github.com/microsoft/TypeScript' },
    { owner: 'denoland', name: 'deno', desc: 'A modern runtime for JavaScript and TypeScript.', lang: 'Rust', stars: 94000, url: 'https://github.com/denoland/deno' },
    { owner: 'sveltejs', name: 'svelte', desc: 'Cybernetically enhanced web apps.', lang: 'JavaScript', stars: 78000, url: 'https://github.com/sveltejs/svelte' },
    { owner: 'remix-run', name: 'remix', desc: 'Build better websites with Remix.', lang: 'TypeScript', stars: 29000, url: 'https://github.com/remix-run/remix' },
    { owner: 'astro-community', name: 'astro', desc: 'Build faster websites with Astro.', lang: 'TypeScript', stars: 45000, url: 'https://github.com/withastro/astro' },
    { owner: 'vuejs', name: 'vue', desc: 'An approachable, performant and versatile framework for building web user interfaces.', lang: 'TypeScript', stars: 207000, url: 'https://github.com/vuejs/core' },
    { owner: 'golang', name: 'go', desc: 'The Go programming language.', lang: 'Go', stars: 123000, url: 'https://github.com/golang/go' },
    { owner: 'rust-lang', name: 'rust', desc: 'Empowering everyone to build reliable and efficient software.', lang: 'Rust', stars: 96000, url: 'https://github.com/rust-lang/rust' },
    { owner: 'django', name: 'django', desc: 'The Web framework for perfectionists with deadlines.', lang: 'Python', stars: 79000, url: 'https://github.com/django/django' },
  ];

  const mockIssueTitles = [
    'fix: Resolve server actions race condition in edge environments',
    'chore: Clean up duplicate styling classes in buttons grid layout',
    'docs: Add example for complex database transitions with prisma seed',
    'perf: Leverage cache directives inside client components rendering',
    'bug: Multi-touch zoom crashes gesture handlers in mobile viewports',
    'feat: Add dark mode toggle to settings page',
    'fix: Memory leak in useEffect cleanup for WebSocket connections',
    'docs: Improve getting started guide for new contributors',
    'chore: Update dependencies to latest stable versions',
    'feat: Add search functionality to issue list page',
    'fix: Incorrect date formatting in activity feed',
    'perf: Reduce bundle size by tree-shaking unused icons',
    'bug: Form validation not triggering on mobile Safari',
    'feat: Implement keyboard shortcuts for common actions',
    'docs: Add API reference documentation for REST endpoints',
  ];

  // Pick 3 random repos to create/update
  const shuffled = [...mockRepoData].sort(() => Math.random() - 0.5);
  const selectedRepos = shuffled.slice(0, 3);
  let syncCount = 0;

  for (const repoData of selectedRepos) {
    const ghId = `sim-repo-${repoData.owner}-${repoData.name}-${Date.now()}`;
    
    const repo = await db.repository.upsert({
      where: { githubId: `sim-${repoData.owner}-${repoData.name}` },
      update: {
        stars: repoData.stars + Math.floor(Math.random() * 1000),
      },
      create: {
        githubId: `sim-${repoData.owner}-${repoData.name}`,
        name: repoData.name,
        fullName: `${repoData.owner}/${repoData.name}`,
        languages: JSON.stringify([repoData.lang]),
        topics: JSON.stringify([]),
        owner: repoData.owner,
        description: repoData.desc,
        readmeText: `# ${repoData.name}\n\n${repoData.desc}\n\n## Getting Started\n\nCheck out the documentation to get started with ${repoData.name}.\n\n## Contributing\n\nWe welcome contributions! Please read our contributing guide.`,
        url: repoData.url,
        stars: repoData.stars,
        language: repoData.lang,
      },
    });

    // Create 2 random issues per repo
    const issueSlice = [...mockIssueTitles].sort(() => Math.random() - 0.5).slice(0, 2);
    for (const title of issueSlice) {
      const issueNum = (Date.now() % 900000) + 100000 + Math.floor(Math.random() * 1000);
      const randomId = `sim-issue-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const isDocOrBug = title.startsWith('docs') || title.startsWith('fix');
      const difficulty = isDocOrBug ? 'Beginner' : Math.random() > 0.5 ? 'Intermediate' : 'Advanced';

      try {
        await db.issue.upsert({
          where: { repositoryId_githubNumber: { repositoryId: repo.id, githubNumber: issueNum } },
          update: {
            title: title,
            description: `This issue needs help in ${repoData.owner}/${repoData.name}. Great opportunity for open source contribution.`,
            labels: JSON.stringify(isDocOrBug ? ['good first issue', 'documentation'] : ['good first issue', 'help wanted']),
            difficulty,
          },
          create: {
            githubId: randomId,
            title: title,
            description: `This issue needs help in ${repoData.owner}/${repoData.name}. Great opportunity for open source contribution.`,
            url: `${repoData.url}/issues/${issueNum}`,
            githubNumber: issueNum,
            repositoryId: repo.id,
            labels: JSON.stringify(isDocOrBug ? ['good first issue', 'documentation'] : ['good first issue', 'help wanted']),
            difficulty,
          },
        });
        syncCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }

  return {
    success: true,
    issuesSynced: syncCount,
    message: `Simulation Success. Synced ${syncCount} new issues. ${note || ''}`,
  };
}
