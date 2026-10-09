# Member 4 — Monitor Wildlife and Sensor Alerts

Author: SENAVIRATHNE C.P — IT23728530

Group ID: (fill in)
Campus: (fill in)
Other members' registration numbers: (fill in)

## Use case

Primary actor: Park Manager.

Supporting actors: Wildlife Ranger, Field Response Unit, Monitoring System, Sensor Gateway, GPS Collar, Camera Trap.

The manager watches simulated collar and camera-trap activity for Yala and Wilpattu, opens an alert, and dispatches a field unit. The assigned ranger sees that order in the Expo app, accepts it, and completes it. Web and mobile share one MongoDB database through the existing Express API.

## Original workflow mapping

| Step | Where it lives |
| --- | --- |
| Manager signs in | Existing `/login` and `/api/auth/login` |
| Opens the monitoring dashboard | `/map` and `/wildlife-monitoring` |
| Map shows animals, sensors, zones, units, alerts | Leaflet map on the dashboard |
| Collar fix enters a high-risk zone | `recordTelemetry` plus scenario A |
| High-priority alert | `WildlifeAlert` category `HIGH_RISK_BOUNDARY`, severity `HIGH` |
| Visual and audio notice | Socket event `wildlife:alert-created` and optional browser tone |
| Open the alert | `/alerts/:id` |
| Animal, GPS, village distance, movement, evidence | Alert detail |
| Acknowledge | `PATCH /api/wildlife/alerts/:id/acknowledge` |
| Dispatch | Dispatch modal, `POST /api/wildlife/dispatches` |
| Units ordered by straight-line distance | `GET /api/wildlife/response-units` |
| Confirm only after the server saves the order | Modal waits for HTTP 201/200 |
| Ranger receives the assignment | `GET /api/wildlife/my-dispatches` and socket `wildlife:dispatch-created` |
| Ranger accepts and responds | Mobile dispatch detail |
| Manager tracks completion | Dispatch history and live socket refresh |
| Audit trail | `WildlifeAuditLog` |

## Exception flows

- A. Scenario B creates a `CRITICAL` `CAMERA_TRAP_POACHING` alert. Dispatch accepts only an `ANTI_POACHING` unit.
- B. Scenario C, or "Simulate offline" on the sensor page, marks the sensor `OFFLINE` and stores a maintenance warning.
- C. Scenario D moves the animal out of the buffer. "Resolve – Animal Retreated" works only before a dispatch exists.
- D. Scenario E takes the nearby unit off duty. A 15 km search is empty. Expanding to 40 km returns the Tissamaharama standby unit. Distances are labeled straight-line. No road ETA is invented.
- E. Scenario F writes another fix onto the open incident and does not create a second active alert.
- F. Failed loads show an error and a Refresh or Retry control. Offline ranger updates stay in a local queue and are not described as saved.
- G. The dispatch button stays in "Transmitting…" until the API responds. A failed save leaves an error on the modal.

## Web screens

- Wildlife Monitoring Dashboard — `/map`, `/wildlife-monitoring`
- Live alert management — `/alerts`, `/wildlife-monitoring/alerts`
- Alert detail and triage — `/alerts/:id`, `/wildlife-monitoring/alerts/:id`
- Sensor monitoring — `/sensors`, `/wildlife-monitoring/sensors`
- Dispatch history — `/dispatches`, `/wildlife-monitoring/dispatches`

The sidebar entries "Wildlife & Sensor Map" and "Perimeter Alerts" now open these screens. Patrols, incidents, conflicts, and analytics are unchanged.

## Mobile screens

Reached from "Wildlife alerts and dispatches" on the ranger dashboard:

- Monitoring home
- My alerts
- Alert details, including Acknowledge Assignment when a dispatch exists
- Location map
- Camera-trap evidence
- Assigned dispatches and dispatch detail
- Response update and completion
- Response history
- Network and sync status

The app is React Native. It does not load the desktop site in a WebView.

## API integration

All Member 4 calls use `/api/wildlife` on the existing server, with the same JWT header as the rest of WildPulse. See `docs/member4/ARCHITECTURE.md` for the route list.

## MongoDB

New collections: `wildlifeanimals`, `trackingsensors`, `protectedzones`, `sensortelemetries`, `wildlifealerts`, `fieldresponseunits`, `dispatchorders`, `wildlifeauditlogs`.

The older unused `Alert` model is left in place so other members' code is not rewritten. Member 4 does not read or write that collection.

Coordinates are GeoJSON `[longitude, latitude]`. Supported spatial fields have `2dsphere` indexes. Zone tests use the same point-in-polygon rule the API uses.

## Simulation

Demo data is deterministic and labeled DEMO / SIMULATED. Camera evidence is an SVG that says it is not a real capture. Scenario controls are refused when `NODE_ENV=production`, and they require a park manager or admin.

Reset and seed replace wildlife demo documents. They do not delete patrols, conflicts, or field incidents.
