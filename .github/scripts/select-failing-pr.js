// Triage for .github/workflows/claude-autofix.yml.
//
// Picks at most one open pull request that is worth waking Claude up for, and
// sets it as the `pr` and `head_ref` step outputs. Finding nothing is the normal
// case and is not an error - the workflow's expensive job is gated on `pr` being
// non-empty, so a quiet night costs no Claude tokens at all.
//
// Loaded by actions/github-script, which cannot see the Actions toolkit from an
// external module. Everything it needs is passed in.

module.exports = async ({ github, context, core }) => {
	const { owner, repo } = context.repo;

	// Guard the clock. GitHub cron is UTC only and has no notion of DST, so the
	// workflow declares two schedules an hour apart and this is what tells them
	// apart - whichever one is not 03:10 local stops here. A manual run skips
	// the guard entirely; that is the point of running it by hand.
	if (context.eventName === 'schedule') {
		const hour = Number(
			new Intl.DateTimeFormat('en-GB', {
				timeZone: 'Europe/Bratislava',
				hour: 'numeric',
				hour12: false
			}).format(new Date())
		);
		if (hour !== 3) {
			core.info(
				`Local hour is ${hour}, not 3 - this is the wrong half of the year, or GitHub delayed the run past its window. Stopping.`
			);
			return;
		}
	}

	const prs = await github.paginate(github.rest.pulls.list, {
		owner,
		repo,
		state: 'open',
		sort: 'created',
		direction: 'asc',
		per_page: 100
	});

	for (const pr of prs) {
		const skip = (why) => core.info(`#${pr.number}: ${why}`);

		if (pr.draft) {
			skip('draft');
			continue;
		}

		// Fork branches are the whole prompt-injection surface for this workflow:
		// the fix job checks the branch out and hands Claude a shell with write
		// credentials and a subscription token. Same-repo branches only, which
		// here means Renovate and the owner.
		if (pr.head.repo?.full_name !== `${owner}/${repo}`) {
			skip(
				`head branch lives in ${pr.head.repo?.full_name ?? 'a deleted fork'}, not this repository`
			);
			continue;
		}

		// If Claude wrote the tip commit, it already had its turn on this code and
		// CI is still red. Retrying nightly would burn the budget on the same
		// failure forever; this one needs a human now. The match is deliberately
		// loose across login, author and committer so a change to the action's
		// bot_name cannot silently defeat it.
		const { data: head } = await github.rest.repos.getCommit({
			owner,
			repo,
			ref: pr.head.sha
		});
		const authors = [
			head.author?.login,
			head.commit.author?.name,
			head.commit.author?.email,
			head.commit.committer?.name
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		if (authors.includes('claude')) {
			skip('Claude already pushed to this branch and CI is still failing - leaving it for review');
			continue;
		}

		// Defaults to filter=latest, so re-runs collapse to one entry per check name.
		const { data: checks } = await github.rest.checks.listForRef({
			owner,
			repo,
			ref: pr.head.sha,
			per_page: 100
		});
		const runs = checks.check_runs;

		if (runs.length === 0) {
			skip('no check runs yet');
			continue;
		}
		// Judging a half-finished run wastes a whole night's budget on a failure
		// that may turn out not to be one.
		const pending = runs.filter((r) => r.status !== 'completed');
		if (pending.length > 0) {
			skip(`still running: ${pending.map((r) => r.name).join(', ')}`);
			continue;
		}
		const failed = runs.filter((r) => ['failure', 'timed_out'].includes(r.conclusion));
		if (failed.length === 0) {
			skip('CI is green');
			continue;
		}

		const names = failed.map((r) => r.name).join(', ');
		core.info(`Selected #${pr.number} (${pr.title}) - failing: ${names}`);
		core.setOutput('pr', String(pr.number));
		core.setOutput('head_ref', pr.head.ref);
		await core.summary
			.addHeading('Claude autofix', 3)
			.addRaw(`Selected [#${pr.number}](${pr.html_url}) - ${pr.title}`)
			.addBreak()
			.addRaw(`Failing checks: ${names}`)
			.write();
		return;
	}

	// One pull request per night. On a Pro subscription the 5-hour window is small
	// enough that a second one is a real risk to the owner's own next morning, and
	// tomorrow night comes soon enough.
	core.info('Nothing to fix tonight.');
	await core.summary
		.addHeading('Claude autofix', 3)
		.addRaw('No eligible failing pull request. No tokens spent.')
		.write();
};
