import * as core from "@actions/core";
import * as github from "@actions/github";

// eslint-disable-next-line require-jsdoc
export async function run() {
  try {
    const repoToken = core.getInput("repo-token", { required: true });
    const adminRepoToken = core.getInput("admin-repo-token", {
      required: true,
    });
    const team = core.getInput("team", { required: true });
    const amount = parseInt(core.getInput("amount"));
    const useTeamSettings = core.getBooleanInput("use-team-reviewer-settings");
    const ignoreBranchesRegex = core.getInput("ignore-branches-regex", {
      required: false,
    });

    const issue: { owner: string; repo: string; number: number } =
      github.context.issue;

    if (issue == null || issue.number == null) {
      console.log("No pull request context, skipping!");
      return;
    }

    const ghOrg = github.context.repo.owner;

    // See https://octokit.github.io/rest.js/
    const adminRepoClient = github.getOctokit(adminRepoToken);

    let pullRequest = await adminRepoClient.rest.pulls.get({
      owner: issue.owner,
      repo: issue.repo,
      pull_number: issue.number,
    });

    if (null == pullRequest) {
      console.log("Pull request not found, skipping!");
      return;
    }

    const prBranch = pullRequest.data.head.ref;

    if (null !== prBranch.match(ignoreBranchesRegex)) {
      console.log("Branch matches ignore pattern, skipping!");
      return;
    }

    if (useTeamSettings) {
      console.log("Using Team Settings ...");
      await adminRepoClient.rest.pulls.requestReviewers({
        owner: issue.owner,
        repo: issue.repo,
        pull_number: issue.number,
        team_reviewers: [team],
      });

      // Remove team review afterwards (sometimes it's still present for some reason)
      await adminRepoClient.rest.pulls.removeRequestedReviewers({
        owner: issue.owner,
        repo: issue.repo,
        pull_number: issue.number,
        reviewers: [],
        team_reviewers: [team],
      });

      console.log("... success!");
    } else {
      console.log("Using specific amount from team ...");
      const members = await adminRepoClient.rest.teams.listMembersInOrg({
        org: ghOrg,
        team_slug: team,
      });
      console.log("Request Status for getting team members: " + members.status);
      // filter out PR author
      let memberNames = members.data.map((a) => a.login);
      memberNames = memberNames.filter(
        (name) => name !== pullRequest.data.user?.login
      );

      console.log(
        "Picking " + amount + " reviewer(s) from members: ",
        memberNames
      );

      let finalReviewers: string[] = [];

      if (amount === 0 || memberNames.length <= amount) {
        finalReviewers = memberNames;
      } else {
        memberNames = shuffle(memberNames);
        for (let i = 0; i < amount; i++) {
          const name = memberNames.pop();
          if (name !== undefined) {
            finalReviewers.push(name);
          }
        }
      }

      if (finalReviewers.length > 0) {
        const reviewerResponse =
          await adminRepoClient.rest.pulls.requestReviewers({
            owner: issue.owner,
            repo: issue.repo,
            pull_number: issue.number,
            reviewers: finalReviewers,
          });
        console.log(
          "Request Status for setting assigning reviewers: " +
            reviewerResponse.status
        );
        console.log(
          "reviewers from Team '" +
            team +
            "' for PR " +
            issue.number +
            ": " +
            reviewerResponse?.data?.requested_reviewers
              ?.map((r) => r.login)
              .join(",")
        );
        console.log("... success!");
      } else {
        console.log("No members to assign found in team " + team);
      }
    }
  } catch (error) {
    console.error(error);
    core.setFailed("Error: " + error);
    throw error;
  }
}

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

run();
