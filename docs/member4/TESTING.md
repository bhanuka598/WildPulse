# Member 4 testing

Run from `backend`:

```text
node --test --test-concurrency=1 tests/wildlife.test.js
```

Or `npm test`.

## Automated results

Executed on 8 October 2026 against `mongodb-memory-server`.

Result: 13 tests, 13 passed, 0 failed. Duration about 9 seconds on the rerun after the proximity rule.

The 15 required behaviors are covered as follows.

| # | Behavior | Result |
| --- | --- | --- |
| 1 | Alert when coordinates cross a high-risk boundary | Passed. `HIGH_RISK_BOUNDARY`, severity `HIGH` |
| 2 | No alert while outside the risk zone | Passed. ELE-002 fix created no alert |
| 3 | Duplicate telemetry does not open a second active alert | Passed |
| 4 | Sensor offline warning after the heartbeat timeout | Passed. GPS-008 `OFFLINE`, maintenance text, `GPS_SIGNAL_LOST` |
| 5 | Invalid alert id rejected | Passed. HTTP 400 |
| 6 | Unauthenticated dispatch rejected | Passed. HTTP 401 |
| 7 | Ranger cannot modify another ranger's dispatch | Passed. HTTP 403 |
| 8 | Unavailable unit rejected, available unit accepted | Passed. HTTP 400 then 201 |
| 9 | Duplicate dispatch prevented | Passed. Same idempotency key replayed, one document |
| 10 | Animal retreated before dispatch | Passed. `RESOLVED` / `ANIMAL_RETREATED`, no dispatch |
| 11 | Invalid status transitions rejected | Passed. Retreated after dispatch and complete-before-accept returned 409 |
| 12 | Dispatch appears on the assigned ranger's mobile API | Passed. Near ranger count 1, other ranger count 0 |
| 13 | Ranger completion updates MongoDB | Passed. `COMPLETED`, outcome and notes stored |
| 14 | Alert status stays consistent with dispatch status | Passed. Alert `RESOLVED` / `RESPONSE_COMPLETED` |
| 15 | Audit trail records the important changes | Passed. Created, acknowledged, dispatched, accepted, started, completed |

Items 13, 14, and 15 are asserted in one test because they are one completion flow.

## Other checks executed

- Member 4 web ESLint (`src/pages/wildlife`, `src/components/wildlife`, `src/hooks/useWildlifeSocket.js`): passed with no findings.
- `npm run build` in `web`: passed. Vite reported a chunk larger than 500 kB. That warning already fits a single-bundle Vite app and is not a compile failure.
- `npx eslint` on the new Expo wildlife files, hook, map, and `App.js`: passed with no findings.
- `npx expo-doctor` in `mobile`: 20 of 21 checks passed. The failing check is a pre-existing SDK version mismatch (`react-native-safe-area-context`, `react-native-screens`, `expo`, `expo-sqlite`). Those packages were not changed for Member 4.
- Full `npm run lint` in `web` and `npx expo lint` in `mobile` still fail on screens this work did not own (analytics, conflicts, patrols, field incidents, community report, ranger dashboard, active patrol). Those failures were left in place.

## Not verified here

These need a person at the machines. Do not mark them passed until they are done.

- Browser walkthrough of every Member 4 web screen, including keyboard use of the dispatch dialog.
- Expo Go on a physical phone, including the QR load, LAN API address, location permission allow and deny, and a photo attach.
- Two-session demo: manager in the browser and ranger on the phone, watching the web status change after accept and complete.
- Sound playback after the user turns alert sound on. Browsers block audio until a gesture.
- Camera-photo upload through Cloudinary. Completion without a photo was tested. A photo is stored only when Cloudinary accepts the existing upload middleware.
- Production mode refusal of `/api/wildlife/demo/*` was implemented and not executed against a production process.
