import { User, Issue, Repository } from '@prisma/client';

export function calculateMatchScore(
  user: User,
  issue: Issue & { repository: Repository }
): number {
  let score = 0;

  // Safe JSON parsers
  const userLanguages: string[] = JSON.parse(user.preferredLanguages || '[]');
  const userInterests: string[] = JSON.parse(user.preferredTopics || '[]');
  const issueLabels: string[] = JSON.parse(issue.labels || '[]');
  const repoLanguages: string[] = JSON.parse(issue.repository.languages || '[]');

  // 1. Language Match (Max 30 points)
  if (repoLanguages.length > 0 && userLanguages.length > 0) {
    const langMatches = repoLanguages.filter(lang => 
      userLanguages.some(pref => pref.toLowerCase() === lang.toLowerCase())
    ).length;
    score += Math.min(30, langMatches * 10);
  } else if (issue.repository.language && userLanguages.some(lang => lang.toLowerCase() === issue.repository.language!.toLowerCase())) {
    score += 30;
  }

  // 2. Interest Match (Max 25 points)
  let interestMatched = false;
  
  // Direct label/tag check
  for (const interest of userInterests) {
    const interestLower = interest.toLowerCase();
    
    // Check if interest is in labels
    if (issueLabels.some(label => label.toLowerCase().includes(interestLower))) {
      interestMatched = true;
      break;
    }

    // Keyword mapping checks
    const titleAndDesc = `${issue.title} ${issue.description || ''}`.toLowerCase();
    if (interestLower === 'frontend' && (
      titleAndDesc.includes('css') || 
      titleAndDesc.includes('react') || 
      titleAndDesc.includes('html') || 
      titleAndDesc.includes('ui') || 
      titleAndDesc.includes('layout') ||
      titleAndDesc.includes('tailwind')
    )) {
      interestMatched = true;
      break;
    }

    if (interestLower === 'backend' && (
      titleAndDesc.includes('api') || 
      titleAndDesc.includes('database') || 
      titleAndDesc.includes('sql') || 
      titleAndDesc.includes('server') || 
      titleAndDesc.includes('graphql') ||
      titleAndDesc.includes('rest')
    )) {
      interestMatched = true;
      break;
    }

    if (interestLower === 'devops' && (
      titleAndDesc.includes('docker') || 
      titleAndDesc.includes('kubernetes') || 
      titleAndDesc.includes('ci/') || 
      titleAndDesc.includes('github actions') || 
      titleAndDesc.includes('deploy')
    )) {
      interestMatched = true;
      break;
    }

    if (interestLower === 'ai' && (
      titleAndDesc.includes('ai') || 
      titleAndDesc.includes('ml') || 
      titleAndDesc.includes('openai') || 
      titleAndDesc.includes('llm') || 
      titleAndDesc.includes('model')
    )) {
      interestMatched = true;
      break;
    }

    if (interestLower === 'security' && (
      titleAndDesc.includes('auth') || 
      titleAndDesc.includes('security') || 
      titleAndDesc.includes('vulnerability') || 
      titleAndDesc.includes('leak') || 
      titleAndDesc.includes('cve')
    )) {
      interestMatched = true;
      break;
    }

    if (interestLower === 'mobile' && (
      titleAndDesc.includes('mobile') || 
      titleAndDesc.includes('ios') || 
      titleAndDesc.includes('android') || 
      titleAndDesc.includes('flutter') || 
      titleAndDesc.includes('react-native')
    )) {
      interestMatched = true;
      break;
    }
  }

  if (interestMatched) {
    score += 25;
  }

  // 3. Experience/Difficulty Match (Max 20 points)
  const userExp = user.experienceLevel.toLowerCase(); // "beginner", "intermediate", "advanced"
  const issueDiff = issue.difficulty.toLowerCase();     // "beginner", "intermediate", "advanced"

  if (userExp === issueDiff) {
    score += 20;
  } else if (
    (userExp === 'intermediate' && (issueDiff === 'beginner' || issueDiff === 'advanced')) ||
    (userExp === 'beginner' && issueDiff === 'intermediate') ||
    (userExp === 'advanced' && issueDiff === 'intermediate')
  ) {
    score += 10;
  }

  // 4. Good First Issue / Help Wanted Tags (Max 15 points)
  let labelScore = 0;
  const isGoodFirst = issueLabels.some(l => l.toLowerCase().includes('good first issue'));
  const isHelpWanted = issueLabels.some(l => l.toLowerCase().includes('help wanted'));

  if (isGoodFirst) {
    if (userExp === 'beginner') {
      labelScore += 15;
    } else if (userExp === 'intermediate') {
      labelScore += 10;
    } else {
      labelScore += 5;
    }
  }

  if (isHelpWanted) {
    labelScore += 10;
  }

  score += Math.min(15, labelScore);

  // 5. Repository Popularity & Stars (Max 10 points)
  const stars = issue.repository.stars;
  if (stars > 50000) {
    score += 10;
  } else if (stars > 10000) {
    score += 8;
  } else if (stars > 1000) {
    score += 6;
  } else if (stars > 100) {
    score += 4;
  } else {
    score += 2;
  }

  // Round up to ensure a clean visual
  return Math.min(100, Math.max(0, Math.round(score)));
}
