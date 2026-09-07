# Supplemental functional QA

Place this directory at tests/qa and run node tests/qa/run.cjs from the repository. Requires the root jsdom dev dependency. The harness finds the checkout through __dirname; TUNER_QA_ROOT optionally overrides it. No generated output files or live network requests are created. Every failed assertion sets a nonzero exit code.

55 functional scenarios cover application navigation, account forms, permissions and stream cleanup, room messaging, Jam editing/recording/audio races, score catalog and Flat state, local/cloud lesson progress, the lazy asset loader, and all 13 deferred entry scripts in their real order. The 10 storage scenarios remove placeholder player APIs and boot the real modules with property/read denial, initial or later quota exhaustion, permission recovery and failed credential deletion; they also operate the Flat dialogs to verify persistence warnings remain visible and enter a new metronome host room under quota denial. A separate 28-case pitch benchmark asserts <3 cents error and rejection of deterministic white noise while printing measured processing time (no fragile timing assertions).

`resource-budget.cjs` checks the default tuner HTML + initial JS/CSS against a 120,000-byte gzip 6 budget. Pass `--json` to print the inventory. This is a comparable payload estimate, not production network timing; the full boot tests separately enforce lazy feature loading.

Real source is executed with controlled substitutes for browser microphone/AudioContext, Tone, EventSource, fetch, dialogs and timers. These verify behavior, not acoustic latency, real credentials, network authorization, real browser rendering or live instrument timbre. All account and Flat credentials are mock strings.
