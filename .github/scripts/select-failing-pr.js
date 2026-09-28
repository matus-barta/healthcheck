// Triage for .github/workflows/claude-autofix.yml.
//
// Picks at most one open pull request that is worth waking Claude up for, and
// sets it as the `pr` and `head_ref` step outputs. Finding nothing is the normal
// case and is not an error - the workflow's expensive job is gated on `pr` being
// non-empty, so a quiet night costs no Claude tokens at all.
//
// Loaded by actions/github-script, which cannot see the Actions toolkit from an
// external module. Everything it needs is passed in.

// The local hour the workflow's cron entries are aiming at: 00:10 Europe/Bratislava.
const LOCAL_TIME_ZONE = 'Europe/Bratislava';
const LOCAL_HOUR = 0;

// How late a scheduled run may start and still go ahead. GitHub queues scheduled
// runs far behind their cron time - over this workflow's first 23 nights every run
// started 4.5 to 6.5 hours late, and the delay was growing - so the window has to
// be wide. A run later than this skips the night rather than eat into the day.
const MAX_DELAY_HOURS = 8;

module.exports = async ({ github, context, core }) => {
	const { owner, repo } = context.repo;

	// Guard the clock. GitHub cron is UTC only and has no notion of DST, so the
	// workflow declares two schedules an hour apart and this is what tells them
	// apart. It looks at the time the run was *scheduled* for, not the time it
	// actually started, because GitHub's delay is hours long and would push both
	// runs into the same window. A manual run skips the guard entirely; that is
	// the point of running it by hand.
	if (context.eventName === 'schedule') {
		// The cron line that fired, e.g. '10 22 * * *'. Only minute and hour are used.
		const cron = context.payload.schedule;
		if (!cron) {
			core.info('Scheduled run without a cron expression in the payload. Stopping.');
			return;
		}
		const [minute, hour] = cron.split(' ').map(Number);

		// The most recent moment that cron line matched. A delayed run can start
		// after midnight UTC, so if today's match is still in the future, the run
		// belongs to yesterday's.
		const now = new Date();
		const scheduled = new Date(now);
		scheduled.setUTCHours(hour, minute, 0, 0);
		if (scheduled > now) scheduled.setUTCDate(scheduled.getUTCDate() - 1);

		// Which cron line is the right one depends on DST on that date:
		// 22:10 UTC is 00:10 in summer (UTC+2), 23:10 UTC is 00:10 in winter (UTC+1).
		const localHour = Number(
			new Intl.DateTimeFormat('en-GB', {
				timeZone: LOCAL_TIME_ZONE,
				hour: 'numeric',
				hourCycle: 'h23' // 0-23, so midnight is 0 and never 24
			}).format(scheduled)
		);
		if (localHour !== LOCAL_HOUR) {
			core.info(
				`Cron '${cron}' means local hour ${localHour} at this time of year, not ${LOCAL_HOUR} - this is the other half of the year's entry. Stopping.`
			);
			return;
		}

		const delayHours = (now - scheduled) / 3_600_000;
		if (delayHours > MAX_DELAY_HOURS) {
			core.info(
				`GitHub started this run ${delayHours.toFixed(1)} hours late, more than the ${MAX_DELAY_HOURS} allowed. Skipping tonight.`
			);
			return;
		}
		core.info(`Cron '${cron}' is tonight's entry; started ${delayHours.toFixed(1)} hours late.`);
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
