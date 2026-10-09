# Design critique — Monitor Wildlife and Sensor Alerts

This note separates the original case-study flow from choices made while fitting it into WildPulse.

## Strengths of the original design

- The actor split is clear. The manager triages. The ranger executes. That matches how a park desk and a field team actually divide work.
- Acknowledgement and response are different decisions. A manager can accept that an alert is real without sending a team.
- The dispatch step asks for a unit, a destination, and a confirmation. That is the right place to stop an accidental double send.
- Exception flows are practical: retreat before dispatch, a silent sensor, a camera-trap security alert, no unit nearby, and repeated collar fixes.
- Evidence, coordinates, and village distance belong on one alert, so the manager does not hunt through separate tools.

## Usability issues in the original wireframe flow

- "Alert status" was easy to confuse with "has someone acknowledged it?" A single status cannot show both.
- Precise travel times on the dispatch list imply road routing. The study does not provide a routing service, so a made-up ETA would look more certain than it is.
- A camera thumbnail with no caption can be read as a real photograph. For a simulated collar and trap, that is misleading.
- The map, the alert list, and the dispatch list were easy to build as three disconnected pages. The manager needs the alert, the animal track, and the unit choice in one investigation.
- Ranger mobile screens in the brief do not say what happens when the phone loses signal after the manager has already assigned the job.

## Changes made, and why

These are implementation choices. They are not extra requirements invented as if the brief asked for them.

- Separate alert statuses (`NEW` through `RESOLVED`) from the acknowledgement timestamp. The brief asked for both acknowledgement and response status. One field could not show both honestly.
- Straight-line kilometres, labeled as straight-line, with no ETA. The brief asked not to invent travel times when routing data is absent.
- A DEMO / SIMULATED banner on the dashboard, map, sensors, and phone. The brief allows simulated IoT and asks that it not be presented as live wildlife data.
- The camera frame is an SVG that says it is not a real capture. Missing evidence stays an empty state.
- Existing sidebar routes `/map` and `/alerts` open the new screens, and `/wildlife-monitoring/...` opens the same screens. The brief asked to reuse the Wildlife & Sensor Map and Perimeter Alerts entries rather than add a second app.
- New MongoDB collections instead of stretching the unused `Alert` stub. That stub has different fields and is not mounted. Changing it would risk the operations dashboard contract other members already call.
- Ranger updates that fail offline stay in a local queue with an operation id. The phone says they are not on the server. The brief's network-failure flow requires that.
- Socket events refresh the dashboard, and every action still has a REST call. The desk keeps working if the socket drops.

## What was not added

- No road-routing provider.
- No background GPS tracking.
- No claim that Yala or Wilpattu collar feeds are live.
- No second login system and no second database.
