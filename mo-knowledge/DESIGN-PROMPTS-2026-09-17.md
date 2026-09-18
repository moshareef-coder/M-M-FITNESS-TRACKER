# Screen prompts for the designer, 2026-09-17

One prompt per screen, each self-contained: paste one into ChatGPT (or any
image model) and it has the product, the robot, the design system and the
screen. Built from Mo's meeting decisions in FLOW-DECISIONS-2026-09-17.md.
Ask for light first, then "same screen, dark theme".


## Onboarding

### What should we call you?
The very first screen after sign in. Before the robot appears.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Name. Onboarding step 1 of 10, progress bar at 10%.
No robot on this screen yet; he introduces himself on the next one. Calm, almost empty.
Top: UNIO wordmark, small.
Title (28, bold, tight): What should we call you?
Under it (14, muted): Not your account name. What you want to hear when you're done.
One text field, large, rounded 12, placeholder: Your name
Primary button: That's me
Nothing else. Lots of air. The keyboard is up, so the button sits just above it.
```

### Meet Unio
The robot introduces himself. First of two intro pages.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Intro, page one of two. Progress bar at 20%.
The robot is the whole screen: large, centered in the upper half, about 160px tall, looking at the viewer.
His line types out under him in a speech bubble (15.5, dark text, white bubble, hairline border):
"Hi. I'm Unio. I'm your personal trainer now. I'll build a plan that's yours, and I'll stay on you until it's done."
Below, one primary button: Let's go
Small ghost text under it: Skip the intro
Mood: confident, a little dry. No decoration behind him. No gradient.
```

### Three of us
The partner is introduced here and only here. The partner is included in the package, never free.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Intro, page two of two. Progress bar at 30%.
The robot, same size as page one, but now flanked by two empty avatar rings: a blue ring (#4a8dbf) on his left, a coral ring (#f37c62) on his right, each 56px, each with a faint plus inside. He is between them.
His line, typed out in the bubble:
"You won't be alone. There are three of us: you, your partner, and me. Invite them and I'll watch you both. Or it's just me and you. That works too. Your partner's included in your package."
Primary button: Bring them on
Nothing about price on this screen. Nothing about how to invite. Just the idea.
```

### What's your goal?
Simple, bold, tappable. One main goal, up to two more.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Goal. Progress bar at 40%.
Top: a small version of the robot's face (32px) at the left with his line beside it (14, muted), typed out:
"Let's plan your goal. Don't worry about your partner. They'll get a link, and I'll help them build their own."
Title (28): What's your goal?
Under it (14, muted): Pick one. You can add up to two more.
A vertical stack of seven tall pill rows, full width, 56 tall, radius 14, hairline border, label 17 bold, a small line icon at the left of each:
Lose weight
Lose fat and build muscle
Bulk up
Get stronger
Build endurance
Move better
Not sure yet
No descriptions under the labels. No backgrounds on the rows except the states:
State 1, the main goal: "Get stronger" is selected as the MAIN goal: deep green border, pale green fill, and a small pill at its right edge that says MAIN.
State 2, an extra: "Move better" is also selected: green border only, small pill at its right edge that says ALSO.
Primary button at the bottom: That's the goal
```

### About you
Sex, height, weight. Asked before the body picker because the figure and the recommendations depend on it.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: About you. Progress bar at 50%.
Robot face small at the top left with his line (14, muted):
"So the figure on screen looks like you, and so the numbers mean something."
Title (28): About you
Three equal tiles in a row, 64 tall, radius 14, label 15.5 bold: Male | Female | Rather not say
"Female" is selected: deep green border, pale green fill.
Then two labelled fields:
Label (11, uppercase, muted): HEIGHT. Two fields side by side, placeholders: feet | inches
Label: WEIGHT. One field, placeholder: pounds
Under the weight field (12.5, muted): I use this for your starting loads. It stays private.
Primary button: Looks like me
```

### Get stronger where?
Full body, front first, big regions, the figure flips to the back on its own when you tap Back.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Body picker. Progress bar at 60%. Only shown for the main goal.
Title (28): Get stronger where?
Under it (14, muted): Tap anywhere. More than one is fine.
The figure: a flat white full-body figure, thin dark outline, soft grey shading, no muscle detail, no face, standing, arms slightly out. FEMALE figure on this mockup. About 380px tall, centered.
It is divided into five big tappable regions, drawn as soft shaded zones, not muscle groups: Arms and shoulders, Chest, Back, Legs, Core. Draw the FRONT view. "Chest" and "Core" are selected: those two zones are tinted pale green with a deep green outline.
Under the figure: a small segmented control, two options, Front | Back, with Front active. Small, muted, secondary. (In the app, tapping the Back zone flips the figure to the back view by itself; the control is only for looking.)
Under that, a row of chips listing the selection in words, each chip with a small green tick: Chest, Core.
Primary button: Those ones
Second frame, please, as a separate image: the same screen after tapping Back: the BACK view of the same figure, mid-flip if you like, with "Back" tinted and the chip row reading: Chest, Core, Back.
```

### Pick your workouts
Strict opt in with icons. With or without equipment replaces lifting and at home.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Pick your workouts. Progress bar at 70%.
Robot face small at top left with his line (14, muted): "Only what you tick. I won't sneak anything in."
Title (28): Pick your workouts
A stack of seven rows, full width, 60 tall, radius 14, hairline border. Each row: a 40px rounded icon tile at the left (sunken grey fill, dark line icon), then the label (17 bold), then at the far right either a tick circle (selected) or an empty circle.
With equipment (icon: dumbbell)
Without equipment (icon: a standing figure)
Running (icon: runner)
Cycling (icon: bike)
Walking (icon: walker)
Yoga (icon: a person seated cross-legged, simple)
Pilates (icon: a reformer, simple)
"With equipment", "Running" and "Yoga" are selected: green border, pale green fill, green tick. "Yoga" and "Pilates" each carry a tiny pill at the right of the label that says RECOMMENDED (Pilates is recommended because the person said Female on the previous screen).
Primary button: On to the fun stuff
```

### How hard do you want to go?
Three tiles, no subtext, details open under the tapped tile. No aggressive red.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Intensity. Progress bar at 80%.
Title (28): How hard do you want to go?
Three tall tiles stacked, full width, radius 16, label 21 bold, each with a heat colour used ONLY as the left edge bar (6px) and the label colour when selected:
Easy (heat: soft blue #4f9dd9)
Steady (heat: green #46b98a)
All in (heat: amber #d8a52e. NOT red. Red makes people not want to do it.)
No subtext on the tiles. "Steady" is selected: its tile has a pale green fill and it has EXPANDED to show one compact detail line under the label (14, muted): "3 to 4 days a week, about 45 minutes" and a second line (12.5): "Sessions can outnumber days. A short mobility session and a lift is two sessions on one day."
Under the tiles, the robot face small with his reactive line (14, muted), typed out: "That is a week somebody actually keeps."
Primary button: Show me the plan
```

### Your plan
Plain English, a range of days, the extra goals in one small line, no subtext.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Your plan. Progress bar at 90%.
Eyebrow (11, uppercase, muted, letter-spaced): YOUR PLAN
Title (28): 5 to 6 days a week
Under it (15.5): Built for lose fat and build muscle. I pick each session for you. Change any of it later in Setup.
A summary card (white, radius 20) with four rows, each a muted label at the left and a bold value at the right, hairline dividers:
Goal | Lose fat and build muscle
Also | Get stronger, Move better
Training days | 5 to 6 a week
Each session | about 50 minutes
Under the card, the robot face small with his line (14, muted): "You can track whatever you want in Progress. I'll show you later."
Primary button: This is my plan
Ghost button under it: Change something
```

### Hire me
The payment screen, before the commitment. It is the app's full-screen offer itself, opened as a step, with the skip worded for onboarding.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Hire me. This is the same full-screen offer as the in-app one (see the last prompt in this set), opened as onboarding step 9 of 10, so design it as that screen with these differences and nothing else:
The whole screen, no tab bar. Top left a small close x. Top center the wordmark UNIO and under it, letter-spaced (11, muted): YOUR PERSONAL TRAINER.
The robot face, 40px, with his line beside it (17, bold): "Hire me as your personal trainer."
A horizontal carousel of five cards, one visible and the next peeking at the right edge, each with a small icon tile, a title (17), one line (14, muted) and a real-looking phone screenshot in a rounded frame. Titles in order: I'll build your workouts · I'll plan your week · I'll say what to train next · I'll track your progress · I'll make it yours. Five dots under the carousel.
Pinned to the bottom, always visible:
Price line (15.5, bold): $7.99 a month, your partner included.  Under it (14, muted): I'll generate your workouts, track your progress, keep your progress photos and follow up with you both.
Primary button: Hire me, $7.99 a month
Ghost: Restore purchase
Ghost, and this is the onboarding difference: Skip, I'll look around first
Fine print (12.5, muted): Renews every month until you cancel. Cancel any time in your iPhone's Settings, under your name then Subscriptions. Terms of Use and Privacy Policy.
Do not use the word Premium anywhere. Dark ground on this screen in BOTH themes: it is the one screen in the app with its own dark ground.
```

### This only works if you turn up.
The promise. Shown to everyone, paid or not. Short.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Commit. Progress bar at 100%.
Robot face small at top left with his line (14, muted): "This is the part where I get sincere for one second."
Title (28): Mo, this only works if you turn up.
Three rows in a soft card (sunken grey fill, radius 16), each with a deep-green tick at the left, text 15.5:
I'll show up, even on the days I don't feel like it.
I'll tell you when it's too much, instead of quietly stopping.
I'm allowed a bad week.
Under the card (12.5, muted): Nothing here is a contract. It's just easier to keep a promise you've actually made.
Primary button: I'm committing to this
Ghost button: Let me change something
```

## In the app

### Home, with the partner prompt
The partner is asked for on Home, visibly, skippably. Not in onboarding.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Home tab, in the app, tab bar showing with Home active. Light theme. The account has no partner yet.
Header: UNIO wordmark at left, a pill in the middle with a small flame and "1 day", one avatar ring at the right (blue) with a second ring beside it empty and dashed (coral) with a small plus.
First card, the hero: eyebrow TODAY, title (21) Pull day, a line (14, muted) "4 exercises, about 40 minutes", primary button "Start".
SECOND CARD, the one this mockup is about: a card with a pale green fill and green hairline border. The robot face at the left (48px). His line (15.5, dark): "Bring your partner. They're included in your package. I'll watch you both." Two buttons in a row under it: primary "Send an invite", ghost "Not now".
Third card: YOUR WEEK, seven day tiles Mon to Sun, today ringed in green, two trained days tinted green, a legend row under it: Trained, Planned, Rest.
Keep everything else quiet so the partner card is the second thing the eye lands on, after the hero.
```

### Workout tab on a free account
The middle tab. The next-workout card keeps its title but the smart reading is replaced by the robot's offer, in place.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Workout tab (the middle tab), in the app, tab bar showing with the green dumbbell button active. Light theme. FREE account (did not hire him).
Card one, pale green: eyebrow TRAINING COMPLETE, title (25 bold) "You're done for today" with a filled green check badge at the end of the line, a line (13, muted) "1 session completed · 1 training day toward your week of 5.", a session chip "Yoga, 35 min" with a leaf icon tile and an open ring, then two buttons across: primary "View today's training", secondary "Preview tomorrow →". The robot bust hangs in the top right corner with a small bubble: "Nice work! Give your body time to recover."
Card two, white, eyebrow NEXT WORKOUT, title (24) "Pull day". THIS IS THE FREE VERSION: where the paid app shows a 84% MATCH ring and a muscle list, this one shows the robot face (40px) with one line (14): "Hire me and I'll tell you what to train next." and one small primary button: "Hire me". Under that, two buttons in a row: secondary "Plan my own", and nothing else (no Generate button on a free account).
Card three, white, eyebrow RECOVERY, title "Rest well" with a leaf, two lines of muted copy, and on the right a soft drawn mountain horizon fading into the card.
Card four, white, YOUR WEEK strip, Mon to Sun tiles with dots, and a "September 2026" month title with arrows in its header.
Then a "Plan your week" row card with a calendar icon and a chevron.
Allowed to scroll.
```

### Workout tab on a paid account
Same tab, hired. The reference for what free is missing.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Workout tab (the middle tab), in the app, tab bar showing. Light theme. PAID account.
Identical to the free version except card two: eyebrow NEXT WORKOUT, title (24) "Pull day", one line (13, muted) "Lands on what your week has had the least of." At the right of the title area, a thick green arc gauge, open at the bottom, with "84%" (24, deep green, bold) inside and MATCH (9, letter-spaced, muted) under it. To the right of the gauge, a short list with small green ticks: Biceps, Lats, Traps, and one item with an open ring instead of a tick: Forearms. Under the words, two small buttons in a row: primary "Generate workout", secondary "Plan my own". Under them a quiet text link: "or start an activity ›".
Everything else as the free version.
```

### Progress on a free account
The goal header renders, then the chart area is the robot's offer, in place. Not a blank, not a popup.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Progress tab, in the app, tab bar showing with Progress active. Light theme. FREE account.
Top row: the goal's name as the screen title (28): Lose weight. At the far right of that same row, a small three-dot button. Under the title a row of two small pills to switch goals: "Lose weight" (active, dark) and "Get stronger".
Where the chart would be, a white card, radius 20: the robot face (56px) at the top left, his line (15.5): "Hire me and I'll track this for you. Weight, measurements, your best lifts, your photos." Under it a faint, greyed-out sketch of a line chart with a dashed goal line, clearly a preview, not data. Primary button in the card: "Hire me, $7.99 a month". Ghost text under it: "Your partner's included."
Below the card, the things a free account still gets, as quiet rows: "Days trained this month: 6", "Longest streak: 4 days".
```

### Progress on a paid account
The reference: the real chart with the goal weight on it and the three-dot preferences.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: Progress tab, in the app, tab bar showing with Progress active. Light theme. PAID account.
Top row: title (28) Lose weight, three-dot button at the far right of the row. Goal pills under it: "Lose weight" active, "Get stronger".
A white card with a line chart of body weight over 8 weeks, deep green line, small dots on the points, a dashed muted goal line labelled at its right end "Goal 160", the current weight as a big figure (24) top left of the chart "168 lb" with "−6 lb since you started" (14, deep green) beside it.
Under it a row of three stat tiles: Waist 33 in, Best squat 225 lb, Photos 4.
A small hint line (12.5, muted): "Tap the dots to choose what this goal tracks."
```

### Mid-workout: No equipment today
Do not lock me in the workout. Switch what is left to bodyweight, right there.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: A live workout session, full screen (no tab bar), light theme. The session is on exercise 2 of 5, "Barbell row".
Top bar: a small back chevron at left, the elapsed clock in the middle "12:41", a three-dot menu at right.
Stage: the flat white figure (the same character family as the body picker) mid-row, about 220px tall, centered, on the plain page ground.
Under the stage, the exercise sheet: exercise name (21) Barbell row, "3 sets · 8 reps · 95 lb" (14, muted), then a row of set chips (Set 1 done, tick; Set 2 current, outlined; Set 3), and a big primary button "Log set 2".
THE THING THIS MOCKUP IS ABOUT: the three-dot menu is OPEN as a bottom sheet over the screen (radius 22 top corners, a grip at the top). It lists, each row with a line icon at the left:
Swap this exercise
Skip this exercise
No equipment today   (with a second line, 12.5, muted: "Switch what's left to bodyweight. Logged sets stay.")
End workout
"No equipment today" is the highlighted row.
Second frame, as a separate image: the sheet has closed and a toast at the bottom says "3 exercises switched to bodyweight". The exercise name now reads "Inverted row".
```

### The in-app offer, full screen
Reached from any paid feature on a free account. Everything Apple requires, in the robot's voice.

```
You are a senior mobile product designer. Design ONE screen of Unio, an iPhone fitness app for two people who train together, coached by a robot personal trainer named Unio. Produce a high-fidelity mockup at 390 x 844 (iPhone 15), light theme first. When I ask, do the same screen in dark theme.

THE PRODUCT IN ONE BREATH
Unio is not a workout generator. It is about your goals and about having a partner. Unio the robot is your personal trainer: he builds your plan, tracks you, and watches you and your partner. He is funny, dry, confident and motivational. He never lectures. Everything he says is short and works read aloud.

THE ROBOT (draw him exactly like this every time)
A small white robot bust, flat vector, thin dark outline, no gradients, no shading tricks. Rounded-square head with soft corners. A dark charcoal visor band across the eyes holding two angular lime-green eyes, slightly slanted, like someone concentrating. A short antenna on top with a small green tip. Small rounded ear pods. White shoulders. Friendly, never cutesy, never a toy. When he "speaks" his line sits in a plain white rounded speech bubble with a thin border, or as a line of text next to his face, typed out.

DESIGN SYSTEM (use these exactly)
Font: DM Sans only. Type steps: 11 (uppercase eyebrow, letter-spaced), 12.5 (meta), 14 (secondary), 15.5 (body and button labels), 17 (card title), 21 (headline), 24 (one big figure), 28 (screen title). Nothing in between.
Light theme: page #f5f7fa, card #ffffff, sunken #eef1f5, border #e4e8ee, text #111318, muted #686d7c, accent green #3be76b, deep green for filled buttons and green text #0f7a38, you (blue) #4a8dbf, partner (coral) #f37c62, planned (purple) #8b5cf6.
Dark theme: page #0b0d11, card #14171d, sunken #1b1f26, border #262b34, text #f4f6f8, muted #8b94a3, accent lime #a8ff00 (with dark text on it), you #2d6bff, partner #ff6b4a. In dark, depth comes from the lighter card surface, not shadows.
Shape: cards radius 20, padding 16, hairline border, barely-there shadow. Buttons: full width, 46 tall, radius 12, label 15.5 bold. Primary button is deep green fill with white text (light) or lime fill with dark text (dark). Secondary is the sunken grey fill with dark text. Ghost is text only.
Page: 18px side gutters, header 44 tall with the UNIO wordmark (a small barbell mark then the word).
Robot lines type out like someone talking. Onboarding screens carry a 3px progress bar at the top.

RULES
No button in the whole app says "Continue". Every primary button says what pressing it means, in the robot's voice, and the brief gives the exact label.
No emojis. No stock photos. No illustrations of people; the only character is the robot and, where stated, a flat white body figure. No gradients on backgrounds. No subtext under tiles unless the brief says so: bold things that are easy to tap. Copy must be exactly as written in the brief, do not rewrite it. One screen, no scrolling unless the brief allows it. Show the iPhone status bar and, where the brief says "in the app", the bottom tab bar: Home, Body, a raised green circular dumbbell button in the middle, Progress, Setup.

OUTPUT
The mockup image. Then a five-line list of the components you used, top to bottom, so I can hand it to a developer.

SCREEN: The offer, full screen, no tab bar. This is what a free account sees when it taps a paid feature. It takes the whole screen and reads as a place, not a popup. Light theme.
Top left: a small close ×. Top center: the wordmark UNIO and under it, letter-spaced (11, muted): YOUR PERSONAL TRAINER.
The robot face, 72px, centered under the wordmark, with his line (17, bold, centered): "Hire me. I'll do the rest."
A horizontal carousel of five cards, one visible and the next peeking at the right edge, each card: a small icon tile, a title (17), one line (14, muted), and a real-looking phone screenshot below it in a rounded frame. Titles, in order: Every workout, built for you · What to train next · Your progress, charted · Your photos, kept · Your partner, included. Five dots under the carousel.
Pinned to the bottom of the screen, always visible:
Price line (15.5): $7.99 a month, and it covers both of you.  Under it (12.5, muted): Only one of you needs to subscribe.
Primary button: Hire me, $7.99 a month
Ghost: Restore purchase
Ghost: Not now
Fine print (12.5, muted): Renews every month until you cancel. Cancel any time in your iPhone's Settings, under your name then Subscriptions. Terms · Privacy
Do not use the word Premium anywhere.
```
