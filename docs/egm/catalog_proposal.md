# v1 machine catalog proposal (30 machines)

Status: implemented in `public/catalog/catalog.json` (P4). The six Hammer Strength Plate-Loaded names were checked against lifefitness.com on 2026-11-11, and all of them match. Machine photos are still pending.

Rules used:

*   Every major muscle group has at least 3 machines, so a full-body or split
    routine can be built from one gym.
*   Machines that guide the movement on a fixed path (selectorized stacks and
    plate-loaded levers) only. No Smith machine, cable pulleys or functional
    trainers, because those allow free paths.
*   Spread across the four brands, so each gym is likely to have several
    matches. Users add missing machines as custom machines.

Name sources (checked 2026-11-11): Technogym Selection 900 category page,
Life Fitness Insignia Series catalog page, Matrix Versa catalog page. Hammer
Strength Plate-Loaded names are from memory and must be checked against the
brand site before the catalog is written.

| # | Muscle group | Brand | Line | Machine | Secondary muscles | Default step (kg) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Chest | Technogym | Selection 900 | Chest Press | Front delts, triceps | 5 |
| 2 | Chest | Life Fitness | Insignia | Pectoral Fly / Rear Deltoid | Rear delts (reverse use) | 5 |
| 3 | Chest | Hammer Strength | Plate-Loaded | Iso-Lateral Incline Press | Front delts, triceps | 2.5 |
| 4 | Chest | Matrix | Versa | Converging Chest Press (VS-S13) | Front delts, triceps | 5 |
| 5 | Back | Technogym | Selection 900 | Lat Machine | Biceps | 5 |
| 6 | Back | Technogym | Selection 900 | Low Row | Biceps, rear delts | 5 |
| 7 | Back | Hammer Strength | Plate-Loaded | Iso-Lateral Front Lat Pulldown | Biceps | 2.5 |
| 8 | Back | Hammer Strength | Plate-Loaded | Iso-Lateral Row | Biceps, rear delts | 2.5 |
| 9 | Back | Matrix | Versa | Diverging Seated Row (VS-S34) | Biceps, rear delts | 5 |
| 10 | Shoulders | Technogym | Selection 900 | Shoulder Press | Triceps | 5 |
| 11 | Shoulders | Hammer Strength | Plate-Loaded | Iso-Lateral Shoulder Press | Triceps | 2.5 |
| 12 | Shoulders | Technogym | Selection 900 | Reverse Fly | Upper back | 5 |
| 13 | Arms | Life Fitness | Insignia | Biceps Curl | Forearms | 5 |
| 14 | Arms | Technogym | Selection 900 | Arm Curl | Forearms | 5 |
| 15 | Arms | Life Fitness | Insignia | Triceps Extension | — | 5 |
| 16 | Arms | Matrix | Versa | Triceps Press (VS-S42) | Chest | 5 |
| 17 | Legs | Technogym | Selection 900 | Leg Press | Glutes, hamstrings, calves | 10 |
| 18 | Legs | Hammer Strength | Plate-Loaded | Linear Leg Press | Glutes, hamstrings | 5 |
| 19 | Legs | Hammer Strength | Plate-Loaded | Hack Squat | Glutes | 5 |
| 20 | Legs | Life Fitness | Insignia | Leg Extension | — | 5 |
| 21 | Legs | Matrix | Versa | Leg Extension (VS-S71) | — | 5 |
| 22 | Legs | Life Fitness | Insignia | Seated Leg Curl | Calves | 5 |
| 23 | Legs | Technogym | Selection 900 | Prone Leg Curl | Calves, glutes | 5 |
| 24 | Legs | Technogym | Selection 900 | Abductor | Glutes | 5 |
| 25 | Legs | Technogym | Selection 900 | Adductor | — | 5 |
| 26 | Legs | Matrix | Versa | Glute (VS-S78) | Hamstrings | 5 |
| 27 | Legs | Life Fitness | Insignia | Calf Extension | — | 5 |
| 28 | Core | Technogym | Selection 900 | Abdominal Crunch | — | 5 |
| 29 | Core | Matrix | Versa | Abdominal (VS-S53) | — | 5 |
| 30 | Core | Life Fitness | Insignia | Back Extension | Glutes | 5 |

Brand spread: Technogym 11, Life Fitness 7, Hammer Strength 6, Matrix 6.

## Points to challenge

*   **Hack Squat (#19)** puts high load on knees and lower back, and its depth
    is set by the user. It fits "machine only" but less well with "avoid
    injury". Leaving it out drops the list to 29.
*   **Duplicates across brands** (two leg extensions, two leg presses, two
    curls) cost catalog entries but help users at different gyms find their
    exact machine. Without duplicates, more muscle coverage fits in 30 slots.
*   **Default weight steps** are typical values. Real stacks differ by
    country and model; each user can change the step per machine.
*   **Gym fit:** the list follows common brand lines, not your gyms. If you know
    which machines your gyms have, swap entries.
