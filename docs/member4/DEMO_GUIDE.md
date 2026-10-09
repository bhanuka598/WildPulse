# Demo guide — Member 4

Repository remote: `https://github.com/bhanuka598/WildPulse.git`

Confirm with `git remote -v` before the report is submitted. Do not replace this if the group remote is different.

Group ID, campus, and the other registration numbers are not in the repository. Add them on the report cover. Member 4 is SENAVIRATHNE C.P, IT23728530.

## Install

From the repository root, in three terminals:

```text
cd backend
npm install

cd web
npm install

cd mobile
npm install
```

MongoDB must already be running. The app uses the `MONGODB_URI` in `backend/.env`. Do not commit that file.

## Environment

`backend/.env.example` lists the keys. Copy any missing keys into the existing `backend/.env`. Set:

- `NODE_ENV=development`
- `DEMO_PASSWORD` to a password of your choice, at least 6 characters

`web/.env` is optional. The client defaults to `http://localhost:5000/api`.

`mobile/.env` is required for a phone:

```text
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:5000/api
```

Use the computer's Wi-Fi address from `ipconfig`. Do not use `localhost` on the phone. Restart Expo after changing the file. The computer and phone must share the Wi-Fi. Run `mobile/scripts/allow-expo-firewall.bat` if Windows Firewall blocks port 5000 or Metro.

## Start

```text
cd backend
npm run seed:wildlife
npm run dev

cd web
npm run dev

cd mobile
npm start
```

`npm run start:tunnel` in `mobile` is the fallback if the phone cannot open the LAN QR code.

Seed creates, or reuses:

- `manager.demo@wildpulse.local` — PARK_MANAGER
- `ranger.demo@wildpulse.local` — RANGER, unit FRU-01
- `ranger.far.demo@wildpulse.local` — RANGER, unit FRU-02

The password is the `DEMO_PASSWORD` you set. It is not stored in source.

## End-to-end procedure

1. Sign in to the web app as the park manager.
2. Open Wildlife & Sensor Map. Confirm the amber DEMO / SIMULATED banner and the six counts.
3. Run scenario A, "Elephant crosses buffer". ELE-001 moves into the Katagamuwa buffer. A HIGH alert appears on the map and in the feed. Turn alert sound on before the run if you want the tone.
4. Open the alert. Check the animal, collar, coordinates, straight-line village distance, and the empty camera panel.
5. Acknowledge. Then Dispatch Response. Pick Yala Anti-Poaching Team 1. The distance is straight-line. Confirm & Transmit. Success text appears only after the response returns.
6. On the phone, sign in as `ranger.demo@wildpulse.local`. Open Wildlife alerts and dispatches. The new order is listed.
7. Accept, Start Response, then Complete with an outcome and a note.
8. Refresh the web dispatch history, or wait for the socket refresh. Status is COMPLETED and the alert is RESOLVED.
9. Reset demo. Run B (critical camera alert and simulated frame), C (GPS-008 offline), D (resolve as Animal Retreated before dispatch), E (expand radius), and F (repeat fixes, still one active alert).

## Screenshots to capture by hand

This repository does not contain report screenshots. Capture these from the running apps:

1. Manager login.
2. Wildlife monitoring dashboard with the DEMO banner, counts, and map.
3. Scenario A alert selected on the map.
4. Alert detail, including the empty evidence state.
5. Dispatch modal with at least two steps and the straight-line distance.
6. Success state after Confirm & Transmit.
7. Scenario B evidence panel showing the simulated frame.
8. Sensor page with GPS-008 offline and the maintenance warning.
9. Dispatch history after the ranger completes the job.
10. Phone monitoring home.
11. Phone dispatch detail before and after accept.
12. Phone sync screen while offline, showing a pending operation that is not marked saved.
13. Web history after that completion.

Paste the GitHub URL from `git remote -v` into the PDF. Do not invent a different URL.
