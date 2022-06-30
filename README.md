# Auto Assign Reviewers From Team

Assign any amount of members from a given [GitHub Team](https://help.github.com/en/github/setting-up-and-managing-organizations-and-teams/organizing-members-into-teams) as Reviewers to a PR.\
Members are chosen randomly or by the team's reviewer settings.

## Example Usage

```yaml
name: "Assign Reviewers"
on:
  pull_request:
    types: [opened, ready_for_review]

jobs:
  assign-reviewers:
    runs-on: ubuntu-latest
    steps:
      - name: "Assign reviewers from team"
        uses: dc-ag/auto-assign-reviewers-from-team@v1.0.0
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          admin-repo-token: ${{ secrets.GITHUB_ADMIN_REPO_TOKEN }} # GitHub Personal Access Token that has 'repo' rights
          team: "team" # The team name
          amount: 0 # Amount of reviewers to assign from the given team, 0 to assign all. If the amount exceeds the member count of 
                    # the team all members will be added
          use-team-reviewer-settings: false # Set to true if you want to use the team's reviewer settings instead of an specific amount
```

## Build
```shell
npm run build && npm run package
```