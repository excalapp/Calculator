# Live demo playbook: from issue to deployed fix with Claude

How to demo this repo's automation live: an issue goes in, Claude writes the fix, the admin reviews and merges it, and the change goes live on GitHub Pages, all in about 15 minutes.

| | |
|---|---|
| **Repo** | https://github.com/excalapp/Calculator |
| **Live site** | https://excalapp.github.io/Calculator/ |
| **Presenter account** | `excalapp` (repo owner) |
| **Length** | 15 minutes, plus Q&A |
| **Story in one line** | "Nobody opens an editor. A request becomes a reviewed, deployed change, and a human still decides what ships." |

How the setup works is in [SETUP.md](SETUP.md).

---

## What the audience should take away

1. **Anyone can request a change** by opening an issue in plain English.
2. **Claude does the work** on its own branch, and explains what it changed and what it didn't check.
3. **A human stays in control.** Claude can't touch `main`. Only the admin's review and merge ships anything.
4. **Shipping is automatic.** Merge, and the site updates about a minute later.

---

## The demo issue

Pick one change and rehearse it. The best demo change is small, easy to see on the page, and quick for Claude to make.

### Primary: add a 40-year loan term (2–4 minute run)

> **Title:** Add a 40-year loan term option
>
> **Body:**
> Some lenders now offer 40-year mortgages. Add a "40 yr" option to the Loan term picker on the Mortgage tab, after "30 yr". The payment, charts and amortization schedule should all work with it.

Why it works: the new button is easy to spot, the monthly payment visibly drops when you click it, and the charts stretch to 40 years. Anyone in the room can check the result.

### Backup A: footer message (fastest, about 1–2 minutes)

> **Title:** Update the footer text
>
> **Body:** Change the footer to read "Estimates for planning only. Updated live during the demo." Keep the existing styling.

Use this one if time is short or the audience is non-technical.

### Backup B: property tax and insurance (richer, 4–6 minutes)

> **Title:** Include property tax and insurance in the monthly payment
>
> **Body:** Add two inputs to the Mortgage tab: annual property tax (% of home price, default 1.1%) and annual home insurance ($, default $1,800). Show the total monthly payment (principal & interest + tax + insurance) under the main figure. The amortization schedule should stay principal & interest only.

Use this one for a technical audience that wants to see Claude handle real logic. Only use it if you've rehearsed it; it takes longer.

Keep all three in a notes file so you can paste them, not type them.

---

## Before the demo

### The day before

- [ ] **Rehearse the full run** with the primary issue on the real repo, start to finish, and time each stage.
- [ ] **Keep the rehearsal PR as your safety net.** Run the primary issue once more, let Claude open the PR, and **leave that PR open, unmerged**. If the live run stalls, you switch to it (see [If something goes wrong](#if-something-goes-wrong)).
- [ ] **Reset after rehearsing.** If you merged the rehearsal change, revert it so the live demo starts from the original site. On the merged PR, click **Revert**, then merge the revert PR.
- [ ] **Check API credits** in the Anthropic Console, and that the spend limit won't block a run.
- [ ] **Clean up** old `claude/issue-*` branches and closed issues, so the lists you show are tidy.

### 30 minutes before

- [ ] Signed in to GitHub as **`excalapp`** (check the avatar).
- [ ] The live site loads and **doesn't** have the change you're about to make yet.
- [ ] **Actions** tab: the last **Deploy to GitHub Pages** run is green.
- [ ] Browser zoom at 125–150% so the back of the room can read it. Notifications off. Other tabs closed.
- [ ] Demo issue text ready to paste.
- [ ] Optional: a terminal in the repo folder, for previewing a branch locally.

### Tabs to have open, in this order

1. Live site: https://excalapp.github.io/Calculator/
2. Repo home: https://github.com/excalapp/Calculator
3. `CLAUDE.md` in the repo
4. `.github/workflows/claude.yml` in the repo
5. Rulesets: https://github.com/excalapp/Calculator/settings/rules
6. Issues: https://github.com/excalapp/Calculator/issues
7. Actions: https://github.com/excalapp/Calculator/actions

---

## The script

Times are cumulative. Lines in quotes are suggested talk track; say them in your own words.

### 0:00 Show the product (1 min) · Tab 1

Show the live calculator. Move a slider and switch to the Savings tab.

> "This is a mortgage and savings calculator, live on GitHub Pages. Say a customer wants a 40-year mortgage option. Normally that's a ticket, a developer, a code review and a deploy. Let's watch the whole chain happen in the next few minutes."

Click the **Loan term** picker and point out that it stops at 30 years.

### 1:00 How it's wired (2 min) · Tabs 3, 4, 5

- **`CLAUDE.md`:** "These are the house rules Claude reads before every task. Plain HTML, no frameworks, check syntax before committing."
- **`claude.yml`:** "This workflow listens for `@claude`. Only people with write access can trigger it, and its last step opens a pull request."
- **Ruleset:** "`main` is protected. Every change needs a pull request with one approval. Claude can't merge anything, and neither can a script."

### 3:00 Open the issue (1 min) · Tab 6

**New issue** → paste the primary title and body → **Submit new issue**.

> "This could have come from a customer, a PM or a support agent. Plain English, no code."

### 4:00 Hand it to Claude (30 sec)

Comment on the issue:

```
@claude please fix this
```

> "That comment is the whole hand-off."

Within about a minute Claude replies on the issue with a progress checklist. Point at it.

### 4:30 While Claude works (3–4 min) · Tab 7

Open **Actions → Claude Code** and click the running job to show the live log.

Use the wait to cover:

- "It's running on GitHub's own runners. Nothing runs on my laptop."
- "It reads `CLAUDE.md` and the code, makes the change, runs a syntax check and commits to its own branch."
- "It's working on a branch called `claude/issue-…`, never on `main`."
- "Cost per run is usually cents to a few dollars, depending on how big the change is."

Switch back to the issue now and then; the checklist ticks off as Claude goes.

### 8:00 The pull request appears (2 min)

Go to **Pull requests** and open the new PR.

- Show the **title** (from the issue) and **"Fixes #N"** in the body. "Merging this will close the issue automatically."
- Open **Files changed** and walk through the diff. It should be a handful of lines.
- Go back to Claude's comment on the issue and read out the **what changed** and **what wasn't checked** sections.

> "It tells me what it didn't verify. That's what I want from a teammate."

### 10:00 Optional: ask for a change (3 min)

If you have time and the audience is engaged, comment on the PR:

```
@claude also mention the 40-year option in the README features list
```

Claude pushes a new commit to the same PR. This shows that review is a conversation, not just yes or no.

### 10:00 (or 13:00) Approve and merge (1 min)

**Files changed → Review changes → Approve → Submit review**, then **Merge pull request → Confirm merge**.

> "This click is the only thing that ships code. Everything before it was a proposal."

### 11:00 Deploy (1–2 min) · Tab 7

Open **Actions → Deploy to GitHub Pages** and watch it go green, usually under a minute.

Open the issue: it's now **Closed**, linked to the merged PR.

### 12:30 The payoff (1 min) · Tab 1

Hard-refresh the live site (**Cmd+Shift+R** on Mac, **Ctrl+Shift+R** on Windows). Click **40 yr** and show the payment drop and the charts stretch to 40 years.

> "Issue to production in about ten minutes. I wrote no code, and nothing shipped without my approval."

### 13:30 Q&A

---

## If something goes wrong

| What happens | What to do on stage |
|---|---|
| **No Claude reply after 2 minutes** | Check **Actions**. No run means the comment didn't trigger: confirm you're signed in as `excalapp` and the comment contains `@claude`. A red run usually means an API key or credit problem: switch to the rehearsal PR |
| **Claude is still working at the 6-minute mark** | Say "This one's taking a while, so here's one I ran earlier." Switch to the open rehearsal PR and carry on from *The pull request appears*. Come back to the live run at the end |
| **Claude finishes but no PR appears** | Claude's issue comment has a **Create PR ➔** link. Click it, then **Create pull request**. Afterwards, check that *Allow GitHub Actions to create and approve pull requests* is on |
| **Claude's change looks wrong** | Use it. Comment `@claude …` with the correction, or close the PR: "This is exactly why a human reviews before anything ships." |
| **Merge button is greyed out** | The approval didn't register. Reload and check that **Approve** was submitted. Approve Claude's PR, not one you opened yourself |
| **Deploy fails** | Open the failed step. A red **Check script syntax** means the change broke `app.js`: revert the PR and say "the pipeline caught it before users did." |
| **Site doesn't show the change** | GitHub Pages can take up to a minute after the green tick. Hard-refresh, or open the site in a private window |
| **Wi-Fi drops** | Have screenshots or a screen recording of a rehearsal run as a last resort |

---

## Afterwards

- **Keep or revert the change.** To restore the original site, open the merged PR and click **Revert**, then merge the revert PR (you'll need the admin bypass, because it's your own PR). The site redeploys on its own.
- **Delete the demo branches:** on the merged PR, click **Delete branch**. Also close and delete the rehearsal PR's branch.
- **Check spend** in the Anthropic Console.

---

## Questions to expect

**Can Claude merge its own changes or push to `main`?**
No. The ruleset requires a pull request with an approval for `main`. Claude only ever pushes to `claude/…` branches.

**Who can trigger Claude?**
Only the repo owner, org members and collaborators. Anyone can open an issue, but a comment from an outsider is ignored.

**What if Claude gets it wrong?**
Comment `@claude` on the PR with what to change, push your own commit to the branch, or close the PR. Nothing reaches users until someone merges.

**Does it run tests?**
It runs whatever commands the workflow allows. Here that's `node --check` for syntax. In a project with tests, you'd allow the test command and ask for it in `CLAUDE.md`.

**What does it cost?**
API usage per run, usually cents to a few dollars depending on the size of the change. There's no server to run; GitHub Actions and Pages are free for public repos within GitHub's limits.

**Where does our code go?**
The workflow runs on GitHub's runners. The code Claude reads is sent to Anthropic's API to do the work, under your Anthropic account's terms.

**Can we use this on our own repo?**
Yes. Follow [SETUP.md](SETUP.md); it takes about 20 minutes. For a site with a build step, change the deploy workflow to build first.
