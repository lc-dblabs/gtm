import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.GITHUB_OWNER || "lc-dblabs";
const repo = process.env.GITHUB_REPO || "gtm";

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  user: string;
  state: string;
  createdAt: string;
}

export interface Issue {
  number: number;
  title: string;
  url: string;
  user: string;
  state: string;
  labels: string[];
}

export interface RepoInfo {
  name: string;
  description: string | null;
  defaultBranch: string;
  openIssues: number;
  stars: number;
  url: string;
}

export async function getRepoInfo(): Promise<RepoInfo> {
  const { data } = await octokit.repos.get({ owner, repo });
  return {
    name: data.full_name,
    description: data.description,
    defaultBranch: data.default_branch,
    openIssues: data.open_issues_count,
    stars: data.stargazers_count,
    url: data.html_url,
  };
}

export async function listPullRequests(state: "open" | "closed" | "all" = "open"): Promise<PullRequest[]> {
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state,
    per_page: 10,
    sort: "updated",
    direction: "desc",
  });

  return data.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    user: pr.user?.login || "unknown",
    state: pr.state,
    createdAt: pr.created_at,
  }));
}

export async function getPullRequest(prNumber: number): Promise<PullRequest & { body: string; mergeable: boolean | null }> {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  return {
    number: data.number,
    title: data.title,
    url: data.html_url,
    user: data.user?.login || "unknown",
    state: data.state,
    createdAt: data.created_at,
    body: data.body || "",
    mergeable: data.mergeable,
  };
}

export async function listIssues(state: "open" | "closed" | "all" = "open"): Promise<Issue[]> {
  const { data } = await octokit.issues.list({
    owner,
    repo,
    state,
    per_page: 10,
    sort: "updated",
    direction: "desc",
  });

  // Filter out pull requests (they show up in issues endpoint too)
  return data
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      user: issue.user?.login || "unknown",
      state: issue.state,
      labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name || "")),
    }));
}

export async function getIssue(issueNumber: number): Promise<Issue & { body: string }> {
  const { data } = await octokit.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  return {
    number: data.number,
    title: data.title,
    url: data.html_url,
    user: data.user?.login || "unknown",
    state: data.state,
    labels: data.labels.map((l) => (typeof l === "string" ? l : l.name || "")),
    body: data.body || "",
  };
}

export async function listBranches(): Promise<{ name: string; protected: boolean }[]> {
  const { data } = await octokit.repos.listBranches({
    owner,
    repo,
    per_page: 20,
  });

  return data.map((branch) => ({
    name: branch.name,
    protected: branch.protected,
  }));
}

export async function getLatestCommits(branch?: string): Promise<{ sha: string; message: string; author: string; date: string }[]> {
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    sha: branch,
    per_page: 5,
  });

  return data.map((commit) => ({
    sha: commit.sha.substring(0, 7),
    message: commit.commit.message.split("\n")[0],
    author: commit.commit.author?.name || "unknown",
    date: commit.commit.author?.date || "",
  }));
}

export async function createIssue(title: string, body: string): Promise<Issue> {
  const { data } = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
  });

  return {
    number: data.number,
    title: data.title,
    url: data.html_url,
    user: data.user?.login || "unknown",
    state: data.state,
    labels: [],
  };
}

export async function addIssueComment(issueNumber: number, body: string): Promise<string> {
  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });

  return data.html_url;
}

export { owner, repo };
