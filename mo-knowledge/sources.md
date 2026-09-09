# Sources

**Read this section before citing anything below.**

These are sources I am confident exist and am confident about the general finding of.
I have written them from knowledge, not from having the papers open, so:

- **Author names, organisations and findings: trust these.**
- **Years: approximate.** Several are position stands that have been revised more than
  once and I may have the wrong edition.
- **No exact effect sizes, percentages or thresholds are quoted anywhere in this folder**,
  deliberately. Where a number would be useful I have said so and left it out rather than
  invent one that looks authoritative.

Nothing here should be quoted at a user, put in a marketing claim, or hard coded as a
constant until someone has pulled the actual paper. Items marked **VERIFY** are the ones
where a number would eventually have to come from the source rather than from judgement.

## Position stands and guidelines

**ACSM Position Stand, Progression Models in Resistance Training for Healthy Adults**
(Kraemer, Ratamess et al.). The standard reference for how sets, load, rest and frequency
should progress by training status. Underpins most of `04-training-history.md`.
*Confidence in existence and general content: high.*

**ACSM Position Stand, Exercise and Physical Activity for Older Adults.**
The basis for "older adults should do progressive resistance training including
meaningful load", in `02-age.md`.
*Confidence: high.*

**NSCA Position Statement, Resistance Training for Older Adults** (Fragala et al., around
2019). More specific and more recent than the ACSM stand, and the better citation for
`02-age.md`. Explicitly supports heavy resistance training and power work in older adults.
*Confidence: high. This is the key source for the "keep explosive intent" claim, which is
the most counter-intuitive recommendation in this folder.* **VERIFY** before acting on the
power-training recommendation for older users.

## Volume, frequency and load

**Schoenfeld, Ogborn and Krieger**, dose-response of weekly sets to hypertrophy (around
2017), and separately a meta-analysis on training frequency (around 2016). The evidence
behind volume landmarks. Largely already covered by
`knowledge/principles/volume-landmarks.md`, cited here so the two folders agree on where
it came from.
*Confidence: high.*

**Schoenfeld et al.**, load and rep range for hypertrophy (around 2017). The finding that
a wide range of rep ranges produces similar hypertrophy when sets are taken near failure.
Relevant to `02-age.md`'s claim that older adults do not need to be pushed to high reps.
*Confidence: high.*

**Grgic et al.**, rest interval length and its effects on strength and hypertrophy.
Relevant to the small rest-interval nudge in `03-sex.md`.
*Confidence: medium-high.*

**Peterson, Rhea and Alvar**, dose-response meta-analyses of resistance training,
including work specific to older adults. Supports both `02-age.md` and the volume
positions.
*Confidence: medium-high on the specific attribution.* **VERIFY**

**Refalo et al.**, proximity to failure and its effect on strength and hypertrophy. More
recent than most of the above. Relevant to how hard beginners should be pushed, which is
a live question in `04-training-history.md`.
*Confidence: medium-high.*

## Effort and autoregulation

**Helms et al.**, RPE and repetitions-in-reserve applied to resistance training. The
source for using RIR-based effort targets rather than percentages of a max we do not know.
Already reflected in `knowledge/principles/rpe-autoregulation.md`.
*Confidence: high.*

## Sex differences

**Hunter, S.K.**, sex differences in fatigability. A substantial body of work, not a single
paper. The source for "women are more fatigue resistant at submaximal loads" in
`03-sex.md`.
*Confidence: high in the body of work. Medium on how much programming change it justifies,
which is my judgement, not hers.* **VERIFY** before adjusting rest intervals by sex.

**Roberts et al.**, sex differences in resistance training adaptation. Supports "relative
gains are similar, absolute gains differ".
*Confidence: medium-high on attribution, high on the finding.*

**Elliott-Sale et al.**, menstrual cycle and exercise performance. The key review
concluding the evidence is low quality and does not support phase-based prescription. The
basis for `03-sex.md` declining to build cycle periodization.
*Confidence: high on the existence and the conclusion. This is currently the mainstream
reading.*

## Pair, group and adherence effects

This section is newer than the rest and carries the weight of `06` to `09`, so the
confidence notes matter more here than anywhere else in the file.

**The Köhler effect in exercise settings** (Feltz, Kerr, Irwin, and colleagues, roughly
2011 onward). A body of experimental work, not one paper, showing that the weaker member
of a pair persists substantially longer at an exercise task than when working alone,
and that the effect is strongest with a moderate ability gap and a conjunctive task
where the joint outcome depends on the weaker member. Several studies used
software-generated partners, which is directly relevant to an app.

This is the evidential foundation of `06` and therefore of the folder's main claim.
*Confidence: high that the effect is real, replicated, and demonstrated specifically in
exercise contexts. Medium on the boundaries of the productive ability gap.*
**VERIFY** before any design depends on a specific gap threshold, which `08` currently
does implicitly.

**Gollwitzer, implementation intentions.** Specifying when and where a behaviour will
happen markedly improves follow-through. One of the better replicated findings in
behaviour change, supported by later meta-analysis. The basis for `09`'s argument that
the app should schedule sessions to specific days rather than issue weekly quotas.
*Confidence: high.*

**Christakis and Fowler**, spread of behaviour through social networks. Cited in `09`
with an explicit caveat: the causal identification is genuinely contested, because
homophily is very hard to separate from contagion in observational network data. Treat
as suggestive, never quote an effect size.
*Confidence: medium on the effect, high that the methodological criticism is substantive.*

**Group and partnered exercise adherence.** A broad literature rather than a single
citation. Training with others improves adherence. Well accepted, and `06` gives one
mechanism for part of it.
*Confidence: high on the general finding, low on any specific number.* **VERIFY** if a
figure is ever quoted at a user.

**Early dropout and the first weeks.** `09` claims the first two weeks disproportionately
decide retention. Widely believed, and I do not have a source I trust for it.
*Confidence: medium. Treated as a design assumption rather than a finding.* **VERIFY**

## Bodyweight scaling

**Allometric scaling of strength to bodyweight**, roughly to the two-thirds power. Not a
single paper; a well-established biomechanical result, and the reason competitive
powerlifting uses correction formulas at all.

**Wilks, DOTS and IPF Goodlift coefficients.** Real, published, publicly available
formulas. Useful as the practical implementation of the above. Important caveat already
noted in `01-bodyweight.md`: they were fitted on competitive lifters, not beginners, so
using them for cold-start loads is an extrapolation.
*Confidence: high that they exist and what they are for. Medium on using them our way.*
**VERIFY** if any cold-start number ships.

## What is deliberately not cited

Anything from a creator, a coaching brand, or a YouTube programme. Same rule as
`knowledge/sources.md`: we write our own distillation of mainstream science, we do not
paraphrase somebody's product.

## What still needs a real literature pass

In priority order, if this folder ever justifies the time:

1. Older-adult power and rate-of-force-development training. The one recommendation here
   that is both counter-intuitive and safety-relevant.
2. Actual numbers for sex differences in upper-body relative strength, which
   `03-sex.md` needs and currently gestures at.
3. Detraining timelines. `04-training-history.md` asserts detraining is "real and fast"
   and gives no number, because I do not have one I trust.
4. Whether the two-thirds exponent holds for untrained people. Probably not exactly, and
   nobody has much reason to have studied it.
5. The productive ability gap for the Köhler effect. `06` and `08` both depend on there
   being a band, and neither can currently say where it is. This is now the highest value
   unknown in the folder, because the main claim rests on it.

## Real goals research (research/11 and goals/goal-tree.json)

**These are different from everything above.** They were actually fetched on 2026-09-08,
so the URLs are real and the numbers were read from the page, not remembered. Confidence
notes here are about the source's quality, not about whether it exists. Keys match the
`sources` arrays in `goal-tree.json`.

### Surveys with a sample size

- `hfa-2026` Health & Fitness Association / Kantar, Dec 5 to 16 2025, n=2,000 US adults.
  Build muscle or strength 50%, mobility/flexibility/posture 48%, mental health 46%; 55%
  fully achieved 2025 resolutions. https://www.healthandfitness.org/americans-treat-exercise-as-essential-spending-heading-into-2026/
  *High. Professional polling, representative sample.*
- `hfa-2025` Same series, Dec 19 to 27 2024, n=2,000. Muscle/strength 50%, regular routine
  44%, mental health 42%. https://www.healthandfitness.org/about/media-center/press-releases/health-exercise-and-fitness-dominate-americans-new-years-resolutions/
  *High.*
- `lifetime-2026` Life Time, Dec 1 to 22 2025, n=750 consumers and members. Get stronger
  42.3% primary goal; lift more 46.5%; longevity 33.2%; solo 50.5% vs group 33.6%.
  https://news.lifetime.life/2025-12-30-2026-Life-Time-Wellness-Survey-Results-Are-In-Strength-Training-and-Longevity-Lead-New-Year-Priorities-with-82-Focused-More-on-Wellbeing
  *Medium-high. Smaller sample, skews to a gym chain's members.*
- `mindbody-2019` Mindbody Wellness Index: Fitness in America, survey Oct to Nov 2018,
  n≈17,000, ages 18 to 65, top 50 US metros. Reasons for exercising by age and sex (PDF
  extracted locally). https://www.mindbodyonline.com/sites/default/files/public/education/learning-assets/2019_Fitness_in_America-Report.pdf
  *High on sample, dated (2018).*
- `mindbody-2024` Mindbody 2024 Wellness Index via trade press: 61% primary motivation is a
  healthier longer life; 30% mobility; 85% say activity helps mental health.
  https://www.mindbodyonline.com/business/education/blog/6-wellness-trends-watch-2024
  *Medium. Read through secondary reporting.*
- `strava-2025` Strava Year in Sport 2025 press release and mid-year data. Weekly goals 10x
  more likely to be hit 10 weeks running; Gen Z 75% more likely to cite an event; 61% more
  lift for aesthetics; clubs nearly 4x. https://press.strava.com/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025
  *Medium-high. Huge n, self-selected active users.*
- `cornell-wedding` Cornell, engaged women: 70%+ intend to lose, average desired 23 lb.
  https://news.cornell.edu/stories/2008/01/wedding-day-weight-wishes-lose-more-20-pounds
  and `sciencedirect-wedding` follow-up on actual outcomes (half lose ~7 lb, a third gain).
  https://www.sciencedirect.com/science/article/abs/pii/S1740144513001496 *High, dated.*
- `fitbod-cohort` Frontiers in Sports and Active Living 2026, 389,481 Fitbod users,
  100,709 beginners. 10.1% adherent at 12 months; median dropout 19 weeks; first-28-day
  frequency strongest predictor (HR 0.73 per SD at week 11). Goals not in dataset.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC13500638/
  *High. The most important single source in this folder. Industry-funded cohort, read
  the conflicts section before quoting it externally.*
- `pn-clients` Precision Nutrition: 81% of clients rate looking and feeling better 9+/10;
  ~60% of clients are low-compliance. https://www.precisionnutrition.com/how-to-coach
  *Medium. Proprietary client data, no methodology.*

### Search volume and autocomplete

- `villagegym` https://www.villagegym.co.uk/blog/the-most-googled-fitness-questions/
  Annual UK volumes: lose weight fast 486k, six pack 145k, gain weight 79k, build muscle
  52.8k, bigger arms 22.8k. *Medium. Single keyword tool, UK.*
- `insure4sport` https://www.insure4sport.co.uk/blog/most-googled-fitness-questions/
  Monthly: best way to lose weight 13k, belly fat exercise 6.4k, six-pack 3.6k. *Medium.*
- `google-suggest` Google autocomplete endpoint, 25 prefixes, queried 2026-09-08 from a US
  location. Reflects current popular completions, not volumes. *High as a signal of
  phrasing, none as a count.* Prefixes used: best workout for, how to lose, how to lose
  weight, how to lose belly fat, i want to lose, workout plan to, workout to lose,
  exercises to, beginner workout for, how to get toned, how to gain, how to build muscle,
  how to get bigger, how to get stronger, how to get abs, how to do a pull up, how to
  train for, how to get in shape, how to start working out, getting back into, how to stay
  consistent, how to improve my, how to fix my, i want to be able to, workout for women,
  workout for men.

### Rates, standards and timelines

- `cdc-rate`, `harvard-rate` 1 to 2 lb/week, 0.5 to 1% bodyweight.
  https://www.health.harvard.edu/weight-loss/what-does-a-healthy-realistic-rate-of-weight-loss-look-like-and-why-does-it-matter
- `medicalnewstoday-20lb` https://www.medicalnewstoday.com/articles/how-to-lose-20-pounds
- `look-ahead`, `obesity-action` 5 to 10% clinically meaningful.
  https://pubmed.ncbi.nlm.nih.gov/21593294/ and https://www.obesityaction.org/resources/benefits-of-5-10-percent-weight-loss/
- `harvard-prediabetes` https://www.health.harvard.edu/diseases-and-conditions/exercising-150-minutes-per-week-could-help-reverse-prediabetes
- `mcdonald-aragon` beginner 1 to 1.5% BW/month etc. https://www.syattfitness.com/fat-loss/a-realistic-look-at-progress-fat-loss-and-mass-gain/ and https://leanffmi.com/natural-muscle-gain-rate/ *Medium. Coaching models, widely used, not trials.*
- `bonytobeastly-20lb` https://bonytobeastly.com/how-long-to-gain-20-pounds/ *Low-medium. Vendor blog, no citations.*
- `legion-newbie` https://legionathletics.com/newbie-gains/
- `inbody-month`, `bonytobombshell` women ~1 lb/month. https://inbodyusa.com/blogs/inbodyblog/how-much-muscle-can-you-gain-in-a-month/
- `strengthlog-arms`, `biologyinsights-arms` https://www.strengthlog.com/how-to-get-big-arms/ https://biologyinsights.com/how-long-does-it-take-to-add-an-inch-to-your-arms/
- `glute-timeline`, `scienceinsights-glutes` https://www.gxmmat.us/blogs/daily-news/the-real-timeline-for-glute-growth-what-to-expect-in-30-days-vs-6-months https://scienceinsights.org/how-fast-can-you-build-glutes-a-realistic-timeline/ *Low-medium.*
- `fitbod-skinnyfat`, `nutrola-skinnyfat` https://fitbod.me/blog/skinny-fat-cut-or-bulk/ https://nutrola.app/en/blog/im-skinny-fat-should-i-bulk-or-cut
- `bulk-or-cut`, `rippedbody` men ~15%, women ~25% thresholds. https://legionathletics.com/cut-or-bulk/ https://rippedbody.com/cut-or-bulk/
- `macrofactor-recomp` who can recomp; Barakat 2020, Murphy & Koehler 2021.
  https://macrofactor.com/recomposition/ *Medium-high, cites primary literature.*
- `inbody-abs`, `bodyspec-abs` https://inbodyusa.com/blogs/inbodyblog/what-body-fat-percentage-do-you-need-to-see-abs/ https://www.bodyspec.com/blog/post/what_body_fat_percentage_is_really_needed_to_see_abs
- `outlift-225` 17% of men, n=585. https://outlift.com/is-225-a-good-bench-press/ *Medium. Self-selected newsletter sample.*
- `legion-225`, `fitnessvolt-225` https://legionathletics.com/how-long-will-it-take-to-hit-225-bench/ https://fitnessvolt.com/strength-standards/research/how-long-to-bench-225/
- `strengthlevel-bench` 48.7M lifts, level definitions. https://strengthlevel.com/strength-standards/bench-press/lb *High on n, self-reported lifts.*
- `anandtech-year1`, `anandtech-skinny` verbatim forum threads. https://forums.anandtech.com/threads/beginner-to-1-year-weight-lifting-goals.2331796/ https://forums.anandtech.com/threads/how-can-a-skinny-guy-gain-some-weight.234214/
- `blind-goals` https://www.teamblind.com/post/how-long-to-realistically-reach-my-goals-a31tlz31
- `weddingbee` https://boards.weddingbee.com/topic/did-your-weight-change-in-the-2-4-weeks-before-your-wedding/
- `mfp-snippets`, `mfp-recomp-threads` MyFitnessPal community, titles and search snippets
  only (pages render client side). https://community.myfitnesspal.com/en/discussion/10189358/whats-your-goal
- `results-timeline` feel 2 weeks, see 4 to 8, others 12. https://www.polar.com/blog/how-long-to-see-results-from-working-out/ *Medium. Folk wisdom with a basis.*
- `summer-8-12wk` https://sussexperformancecentre.co.uk/how-to-get-in-better-shape-for-your-summer-holiday-without-doing-anything-stupid/
- `hers-last10`, `medicinenet-last10` https://www.forhers.com/guides/how-to-lose-the-last-10-pounds https://www.medicinenet.com/how_do_i_lose_stubborn_last_few_pounds/article.htm
- `nhs-c25k` 9 weeks, 3 runs. https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/ *High.*
- `pacepercentile` 5K times by age and sex (RunRepeat / Running USA data). https://pacepercentile.com/guides/what-is-a-good-5k-time/
- `whatwerunning-sub30`, `runnersblueprint` https://whatwerunning.com/how-to-run-a-sub-30-minute-5k/ https://www.runnersblueprint.com/what-is-a-good-5k-time-for-a-beginner/
- `lauranorris-mile`, `marathonhandbook-mile` https://lauranorrisrunning.com/how-to-run-mile-8-minutes/ https://marathonhandbook.com/how-to-run-an-8-minute-mile/
- `marathonhandbook-half`, `outside-half` https://marathonhandbook.com/couch-to-half-marathon/ https://run.outsideonline.com/training/training-plans/half-marathon/couch-to-half-marathon-training-plan-2/
- `pullup-12wk`, `toolatesmart` https://fitnosophy.gumroad.com/l/learn-your-first-pull-up-in-12-weeks https://toolatesmart.substack.com/p/status-update-pull-ups
- `pushup-age`, `pushup-8wk` https://marathonhandbook.com/average-push-ups-by-age/ https://www.bigbeefit.com/blog/push-ups-for-beginners
- `darebee-toes` https://darebee.com/fitness/how-to-touch-your-toes.html
- `calisthenics-handstand` https://calisthenicsassociation.org/blog/handstand-training-complete-guide
- `hyrox-stats`, `sportspro-hyrox` https://www.gym-flooring.com/blogs/stats-hub/hyrox-stats https://www.sportspro.com/features/finance-investment/hyrox-business-model-mass-participation-private-equity-investment/
- `spartan-training`, `veloforte-ocr` https://www.spartan.com/en/blog/spartan-tough-mudder-obstacle-race-training-plan https://veloforte.com/blogs/fuel-better/tough-mudder-training
- `military-police` https://www.military.com/military-fitness/law-enforcement-training/police-academy-training
- `crossfit-murph` https://www.crossfit.com/murph-workout-training-plan
- `singh-2023` Singh et al., BJSM 2023 umbrella review: depression d ≈ -0.43, anxiety
  d ≈ -0.42. https://pmc.ncbi.nlm.nih.gov/articles/PMC10579187/ *High.* Noetel 2024 BMJ
  network meta-analysis was NOT fetched (403); not cited.
- `attia-longevity` popular summaries of the four-pillar framework; grip and VO2max as
  predictors. https://peterattiamd.com/how-does-vo2-max-correlate-with-longevity/ *Medium. Practitioner framework, primary literature behind it is strong.*
- `northwestern-stairs` https://www.nm.org/healthbeat/healthy-tips/why-am-i-out-of-breath-walking-up-stairs
- `desk-hips` https://dailyburn.com/life/fitness/tight-hips-the-best-hip-flexor-stretches-for-people-who-sit-all-day/
- `puregym-backpain`, `puregym-toning`, `puregym-return` https://www.puregym.com/blog/strength-training-lower-back-pain/ https://www.puregym.com/us/blog/the-best-full-body-toning-workout-plan-for-women https://www.puregym.com/blog/getting-back-into-weight-training/
- `barbend-return` 50% loads after 4+ weeks off. https://barbend.com/how-to-return-to-strength-training-after-time-off/
- `muscle-memory` Staron retraining data; myonuclear permanence (Cumming 2024, J Physiol). https://blog.nasm.org/muscle-memory https://physoc.onlinelibrary.wiley.com/doi/10.1113/JP285675 *High on the primary paper.*
- `postpartum-realistic`, `thrive-pelvic` https://runnersedge.physio/new-year-new-mom-realistic-fitness-goals-after-baby/ https://thrivepelvichealth.com/postpartum/5-realistic-fitness-goals-for-new-moms-that-dont-require-a-gym-membership/
- `nsca-older` see the position stands section above.
- `dailyburn-beginner` https://dailyburn.com/life/health/how-long-should-a-beginner-workout-be-a-science-backed-guide/
- `mayo-belly` https://www.mayoclinic.org/healthy-lifestyle/womens-health/in-depth/belly-fat/art-20045809

### What competitors ask

- Fitbod six goals: General Fitness, Strength Training, Muscle Tone, Bodybuilding,
  Powerlifting, Olympic Weightlifting. https://fitbod.me/blog/fitbods-fitness-goals/
- Freeletics journeys: bodyweight (get started, lose weight, get fit, gain strength),
  running (lose weight, endurance and speed), weights (gain strength, get toned, build
  muscle). Help centre page 403'd; read via search snippets.
- Nike Training Club: strength, athletic performance, lose fat, flexibility. Via reviews.
- Lifesum: stay healthy, lose weight, gain weight. Via a UX writeup.

### Not reached

Reddit (crawler blocked), Quora (403), bodybuilding.com forums (403), HealthUnlocked
(403), T-Nation and Nerd Fitness Discourse JSON (403), Apple App Store review pages
(403), BMJ (403), PubMed (cookie wall). The forum layer is therefore thinner than it
should be; see research/11 open questions.
