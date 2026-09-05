<!--
Prompt for .github/workflows/claude-autofix.yml.

The workflow substitutes {{PR_NUMBER}} and {{REPOSITORY}} before handing this to
Claude, and it reads this file from the default branch rather than from the pull
request being repaired - a pull request must not be able to rewrite the
instructions used to repair it.
-->

Pull request #{{PR_NUMBER}} in {{REPOSITORY}} is failing CI. Its head branch is already checked out
in the working directory.

1. Find the actual error. `gh pr checks {{PR_NUMBER}}` lists the failing runs and
   `gh run view <id> --log-failed` prints the failing step's log.
2. Make the smallest change that fixes that error. Do not refactor, do not reformat files the
   failure did not touch, and do not edit the TODO list in README.md.
3. Verify locally before pushing: `pnpm install --frozen-lockfile`, then `pnpm build`, `pnpm test`
   and `pnpm lint` must all pass.
4. Commit to this branch and push. Match the existing log: a short lowercase subject, no prefix
   scheme.
5. Stop there. Do not merge, do not approve, do not change the pull request's base, and do not touch
   any other branch. A human reviews and merges.

If you cannot make all four commands pass, or the fix needs a judgement call about what the code is
supposed to do, then push nothing at all and post one short comment on the pull request saying what
is broken and what you would change. A clear comment is a better outcome than a speculative commit.

CLAUDE.md and .claude/ai-policy.md in this repository apply to your work. In particular: the dense
explanatory comments in src/ are deliberate and must be preserved, and you must not invent APIs,
dependencies or test results.
