# Training history

The variable that actually decides what a plan looks like, and the only one on the list
we can measure instead of asking.

## Why it dominates

Every other input in this folder adjusts a plan at the margins. This one changes its
shape:

| | Beginner | Intermediate | Advanced |
|---|---|---|---|
| What limits progress | Skill and showing up | Stimulus | Recovery and specificity |
| Volume needed | Low. Nearly anything works | Moderate to high | High, and managed |
| How fast load rises | Session to session, for months | Week to week, then stalls | Block to block |
| Frequency vs volume | Frequency wins | Both matter | Structured |
| Deloads | Rarely needed early | Periodically | Planned |
| What ruins it | Too much, too soon, then quitting | Never changing anything | Poor recovery management |

A 25 year old with no history and a 55 year old with ten years of history need almost
opposite programs, and neither age nor bodyweight nor sex will tell you that. This is
what `02-age.md` means when it says age is a weak modifier by comparison.

## The opportunity nobody has taken

Most apps ask "what is your experience level?" with three options. This is a bad question
asked of the wrong witness. People are unreliable narrators about their own training:
beginners overrate themselves out of pride, experienced lifters underrate themselves out
of modesty, and everyone who has ever had a gym membership picks "intermediate".

**We do not have to ask.** We have `exercise_logs`, one row per exercise per session,
with sets, reps, weight and date. That is behaviour. It is better evidence than any
dropdown and it updates itself.

This is the single biggest structural advantage we have over a generic program generator,
and the current algorithm cannot use it, because the data never arrives.

Worth being precise, because this is fixable and nobody has noticed. What `index.html`
actually sends to `generate-workout` is:

```js
const history = Object.entries(personalRecords(ME).best)
  .map(([exercise_name, weight]) => ({ exercise_name, weight }));
```

A map of exercise name to best weight ever lifted. No dates. No session count. No sets or
reps. No gaps. So the generator can see that somebody once benched 185 and has no way to
know whether that was yesterday or last year, across 200 sessions or 3.

Every signal below is sitting in `exercise_logs` and none of it is being passed. The fix
is a wider payload, not new research and not a new question.

## A concrete proposal: derive training age from the logs

Not a self-report. A computed value, from data we already hold. Sketch, to be argued
with rather than accepted:

**Session count.** How many distinct days with logged exercises. The crudest and most
useful signal. Under roughly 20 sessions, treat as beginner regardless of anything else.

**Consistency.** Sessions per week over the last 4 to 6 weeks, and whether there are
gaps. Someone with 80 sessions spread over two years with three long layoffs is not an
intermediate, they are a beginner who keeps restarting, and they need the beginner
program each time.

**Whether load is still rising linearly.** The most informative signal in the set, and
the one that actually defines the beginner-to-intermediate transition in coaching
practice. If someone is still adding weight to a movement almost every session, they are
by definition still in the phase where linear progression works, whatever their session
count says. When that stalls across several movements, they have moved on, and the
program should too.

**Load relative to bodyweight.** A sanity check rather than a driver, and it needs the
allometric scaling from `01-bodyweight.md` to mean anything across body sizes.

**Time since last session.** Detraining is real and fast. A gap of a couple of months
should step the program back rather than resume where it left off. We can see gaps for
free and currently ignore them.

Every one of these is computable from `exercise_logs` with no new question, no new
column and no new screen.

*Confidence: high that these signals are derivable and better than self-report. Medium
on the specific thresholds, which are coaching convention rather than established
numbers, and which should be tuned against our own data once there is enough of it.*

## Why this is the best claim in the folder

It is the only one that can be **checked**. Everything else here is a reading of the
literature that we either accept or do not. This one makes a prediction about our own
database, and we can go and look:

> Derived training age from the logs should track the plans people actually complete.
> If we classify someone as intermediate and they cannot finish the sessions, or as a
> beginner and they blow through everything, the derivation is wrong and we will see it.

That is the sort of claim worth writing down. See `open-questions.md` for what we would
need to test it, which is mostly more users than we have.

## The cold start, again

For the first plan there is no history, by definition. So the beginner default is not the
fallback path, it is the main path, exactly as `00-what-we-know-about-a-user.md` argues.
Training age is a refinement that arrives in week three, not an input to week one.

Which is convenient, because "assume beginner, ramp cautiously, watch what happens" is
also the correct and safe answer when you know nothing about somebody.
