# Supplemental functional QA

Place this directory at tests/qa and run node tests/qa/run.cjs from the repository. Requires the root jsdom dev dependency. The harness finds the checkout through __dirname; TUNER_QA_ROOT optionally overrides it. No generated output files or live network requests are created. Every failed assertion sets a nonzero exit code.

45 functional scenarios cover application navigation, account forms, permissions and stream cleanup, room messaging, Jam editing/recording/audio races, score catalog and Flat state, local/cloud lesson progress, the lazy asset loader, and all 12 deferred entry scripts in their real order. A separate 28-case pitch benchmark asserts <3 cents error and rejection of deterministic white noise while printing measured processing time (no fragile timing assertions).

Real source is executed with controlled substitutes for browser microphone/AudioContext, Tone, EventSource, fetch, dialogs and timers. These verify behavior, not acoustic latency, real credentials, network authorization, real browser rendering or live instrument timbre. All account and Flat credentials are mock strings.
