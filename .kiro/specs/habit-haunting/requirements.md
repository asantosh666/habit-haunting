# Requirements Document

## Introduction

Habit Haunting is a single-page web habit tracker set in a haunted house. Each daily habit is a candle in a room of the house. Checking in keeps the flame alive and tall. Missed days grow a ghost attached to the habit, the ghost moves between rooms as it grows, and the room darkens. After 3 or more consecutive missed days the habit is "haunted" and its ghost appears on the dashboard until a check-in revives the habit. The haunting is the feedback system: flame height shows streak, ghost size and opacity show missed days, and room darkness shows consistency. All state is computed by deterministic functions and stored locally, with no account, paid API, or LLM.

## Glossary

- **Habit_Haunting_App**: The web application described by this document.
- **Habit**: A tracked daily activity with a name, a target frequency of daily, and a creation date.
- **Check_In**: A record that the user completed a Habit on a given calendar date.
- **Streak**: The number of consecutive calendar days, ending today or yesterday, on which a Habit has a Check_In.
- **Missed_Days**: The number of consecutive calendar days, ending yesterday, on which a Habit has no Check_In since its creation date or last Check_In.
- **Candle**: The visual representation of a Habit in the House.
- **Flame**: The visual element of a Candle whose height is determined by the Habit's Streak. The computed Flame height is unbounded and strictly increases with Streak. The displayed Flame height is the computed height clamped to the Maximum_Display_Height.
- **Maximum_Display_Height**: The largest height at which the Habit_Haunting_App renders a Flame. It limits only the rendered Flame, not the computed Flame height.
- **Unlit_Candle**: A Candle with no Flame, shown for a Habit that has no Check_In yet.
- **Ghost**: The visual element attached to a Habit whose size and opacity are determined by Missed_Days.
- **Ghost_Level**: An integer derived from Missed_Days that determines Ghost size, opacity, and room placement.
- **Room**: A named area of the House that holds one or more Candles. A Room's darkness is determined by the Missed_Days of its Habits.
- **House**: The haunted-house view containing all Rooms, Candles, and Ghosts.
- **Haunted**: The state of a Habit with Missed_Days of 3 or more.
- **Revive**: The transition of a Haunted Habit to not Haunted caused by a Check_In.
- **Dashboard**: The main screen showing the House, the Today_List, and the Graveyard_Calendar.
- **Today_List**: The list of Habits that can be checked in for the current date, with each Habit's check-in status.
- **Graveyard_Calendar**: A weekly calendar or heatmap showing, for each day of the displayed week, which Habits were checked in and which were missed.
- **Relic**: An achievement awarded when a Habit's Streak reaches a milestone.
- **Milestone**: A Streak value of 7 or 30 days.
- **Export_File**: A JSON file containing all Habits, Check_Ins, Streaks, Ghost state, and Relics.
- **Local_Store**: Browser-side storage (localStorage or IndexedDB) that holds all application data.
- **Seed_Habits**: Three Habits created automatically during first-load onboarding.
- **Demo_House**: A preset data set of neglected Habits with Haunted Ghosts, used to demonstrate the haunting.
- **Haunting_Engine**: The set of pure functions that compute Streak, Missed_Days, Ghost_Level, Flame height, Room darkness, Haunted state, and Relic eligibility from Habits, Check_Ins, and the current date.
- **Demo_Date_Control**: A control, available in demo mode, that overrides the current date used by the Haunting_Engine.

## Requirements

### Requirement 1: Habit Management

**User Story:** As a user, I want to add a habit and see it as a candle in the house, so that I can start tracking it.

#### Acceptance Criteria

1. WHEN a user submits a new Habit with a name containing 1 to 100 characters after leading and trailing whitespace is trimmed, THE Habit_Haunting_App SHALL store the trimmed name, a target frequency of daily, and the creation date (local calendar date at submission) in the Local_Store.
2. WHEN a Habit is stored, THE Habit_Haunting_App SHALL display the Habit as an Unlit_Candle in a Room of the House within 1 second of storage.
3. IF a user submits a Habit with an empty name or a name containing only whitespace, THEN THE Habit_Haunting_App SHALL reject the Habit, display a message indicating that a name is required, and leave the Local_Store and the House unchanged.
4. IF a user submits a Habit with a trimmed name longer than 100 characters, THEN THE Habit_Haunting_App SHALL reject the Habit, display a message indicating the 100-character maximum, and leave the Local_Store and the House unchanged.
5. WHEN a user edits a Habit's name to a value of 1 to 100 characters after trimming, THE Habit_Haunting_App SHALL store the trimmed new name and retain the Habit's Check_Ins and creation date unchanged.
6. IF a user edits a Habit's name to an empty value, a whitespace-only value, or a value longer than 100 characters after trimming, THEN THE Habit_Haunting_App SHALL reject the edit, display a message indicating the name requirement, and retain the Habit's previous name.
7. WHEN a user confirms deletion of a Habit, THE Habit_Haunting_App SHALL remove the Habit, its Check_Ins, and its Ghost from the Local_Store and from the House.
8. IF the Local_Store write fails during add, edit, or delete of a Habit, THEN THE Habit_Haunting_App SHALL display a message indicating the operation failed and leave the previously stored Habit data and the House unchanged.

### Requirement 2: Daily Check-In

**User Story:** As a user, I want to check in a habit for today, so that my flame grows and my ghost shrinks.

#### Acceptance Criteria

1. WHEN a user checks in a Habit for the current date and the Habit has no Check_In for that date, THE Habit_Haunting_App SHALL record one Check_In for that Habit and date, increase the Habit's Streak by exactly one, and display the updated Streak value within 500 milliseconds.
2. WHEN a Habit's Streak increases, THE Haunting_Engine SHALL increase the computed Flame height of that Habit by a strictly positive amount, with no upper bound on the computed Flame height.
3. WHEN a user checks in a Habit that has a Ghost with a Ghost_Level greater than zero, THE Haunting_Engine SHALL decrease the Ghost_Level of that Habit by a strictly positive amount, to a minimum of zero, and THE Habit_Haunting_App SHALL display the Ghost with a size and opacity that are each less than or equal to the previous values and proportional to the new Ghost_Level, within 500 milliseconds.
4. IF a user checks in a Habit that already has a Check_In for the current date, THEN THE Habit_Haunting_App SHALL leave the Streak, Flame height, Ghost_Level, and stored Check_In records unchanged and display a message indicating that the Habit is already checked in today.
5. THE Haunting_Engine SHALL compute a Streak that is an integer greater than or equal to zero for every Habit and date.
6. IF recording a Check_In fails, THEN THE Habit_Haunting_App SHALL leave the Streak, Flame height, Ghost_Level, and stored Check_In records unchanged and display an error message indicating that the check-in was not saved.
7. THE Habit_Haunting_App SHALL render each Flame at a displayed height equal to the computed Flame height clamped to the Maximum_Display_Height, and SHALL apply the Maximum_Display_Height only to the rendered Flame and not to the computed Flame height.

### Requirement 3: Ghost Growth and Room Darkening

**User Story:** As a user, I want missed days to grow a ghost that wanders the house and darkens its room, so that I can see the cost of neglect.

#### Acceptance Criteria

1. WHEN a calendar day ends in the user's local time zone without a Check_In for a Habit, THE Haunting_Engine SHALL increase that Habit's Missed_Days by exactly one.
2. THE Haunting_Engine SHALL compute Ghost_Level as an integer from 0 to 10 that never decreases as Missed_Days increases, and SHALL cap Ghost_Level at 10 for any Missed_Days value above the Ghost_Level 10 threshold.
3. WHEN a Habit's Ghost_Level increases, THE Habit_Haunting_App SHALL display the Ghost with a larger size and a higher opacity than at the previous Ghost_Level within 500 milliseconds, with opacity between 0.1 and 1.0 and size never decreasing as Ghost_Level increases.
4. WHEN a Habit's Ghost_Level reaches a threshold defined for a different Room, THE Habit_Haunting_App SHALL move the Ghost to that Room within 500 milliseconds and SHALL display the Ghost in exactly one Room at a time.
5. WHEN a Habit's Missed_Days increases, THE Haunting_Engine SHALL increase the darkness of the Room that holds that Habit's Candle, up to a maximum darkness value of 100 percent, and SHALL keep the darkness at that maximum if it is already reached.
6. WHEN a Check_In for a Habit is recorded, THE Haunting_Engine SHALL set that Habit's Missed_Days to zero, SHALL recompute Ghost_Level, Ghost room placement, and Room darkness for that Habit, and THE Habit_Haunting_App SHALL display the recomputed values within 500 milliseconds.
7. THE Haunting_Engine SHALL compute Ghost_Level, Ghost room placement, and Room darkness using only the Habits, Check_Ins, and current date as inputs, so that identical inputs always produce identical outputs.
8. IF the current date is unavailable or is not a valid calendar date, THEN THE Haunting_Engine SHALL leave Missed_Days, Ghost_Level, Ghost room placement, and Room darkness unchanged and THE Habit_Haunting_App SHALL display an error indicating the date is invalid.

### Requirement 4: Haunted State and Revival

**User Story:** As a user, I want a habit I have neglected for several days to be marked as haunted, so that I notice it and revive it.

#### Acceptance Criteria

1. WHEN a Habit's Missed_Days changes from 2 or fewer to 3 or more, THE Haunting_Engine SHALL mark the Habit as Haunted within 1 second of the change.
2. WHILE a Habit is Haunted, THE Habit_Haunting_App SHALL display that Habit's Ghost in the Haunted state on the Dashboard.
3. WHEN a user checks in a Haunted Habit, THE Habit_Haunting_App SHALL Revive the Habit, remove its Haunted mark, and reset its Missed_Days to 0 within 1 second of the check-in.
4. WHEN a Habit is Revived, THE Habit_Haunting_App SHALL stop displaying that Habit's Ghost in the Haunted state on the Dashboard within 1 second of the Revival.
5. IF a check-in on a Haunted Habit fails to be saved, THEN THE Habit_Haunting_App SHALL keep the Habit Haunted with its Missed_Days unchanged and SHALL display an error message indicating the check-in was not saved.
6. IF a Habit's Missed_Days is 2 or fewer, THEN THE Haunting_Engine SHALL NOT mark the Habit as Haunted.

### Requirement 5: Dashboard

**User Story:** As a user, I want a dashboard that shows my house, today's tasks, and my history, so that I can see my habits at a glance.

#### Acceptance Criteria

1. WHEN a user opens the Dashboard, THE Habit_Haunting_App SHALL display the House with every Room, and within each Room every Candle and every Ghost associated with the Habits in that Room, within 2 seconds.
2. WHEN a user opens the Dashboard, THE Habit_Haunting_App SHALL display the Today_List containing every active Habit, each with a check-in status of either checked in or not checked in for the current date in the user's local time zone.
3. WHEN a user opens the Dashboard, THE Habit_Haunting_App SHALL display the Graveyard_Calendar for the current week, running 7 days from Monday through Sunday in the user's local time zone.
4. THE Graveyard_Calendar SHALL mark each day of the displayed week, for each Habit, as exactly one of checked in or missed. Days after the current date SHALL display neither mark, and days before the Habit's creation date SHALL display neither mark.
5. WHEN a user selects a Candle in the House, THE Habit_Haunting_App SHALL display that Habit's name, its current Streak as a whole number of days, and its Missed_Days as a whole number of days.
6. THE Habit_Haunting_App SHALL display Flame height (the computed Flame height clamped to the Maximum_Display_Height) as a non-decreasing function of Streak, Ghost size and opacity as non-decreasing functions of Ghost_Level, and Room darkness as a non-decreasing function of the total Missed_Days of the Habits in that Room. A Streak of 0 SHALL display the minimum Flame height, a Ghost_Level of 0 SHALL display no Ghost, and a Room with 0 Missed_Days SHALL display the lightest Room darkness.
7. IF the user has no Habits when opening the Dashboard, THEN THE Habit_Haunting_App SHALL display the House with no Candles or Ghosts, an empty Today_List, and a message indicating that no Habits exist.
8. IF the Dashboard data fails to load within 5 seconds, THEN THE Habit_Haunting_App SHALL display an error message indicating the data could not be loaded and a retry control, and SHALL retain any previously displayed data.

### Requirement 6: Relics

**User Story:** As a user, I want to earn relics for streak milestones, so that I feel rewarded for consistency.

#### Acceptance Criteria

1. WHEN a Habit's Streak reaches exactly 7 consecutive days and no Relic exists for that Habit and the 7-day Milestone, THE Habit_Haunting_App SHALL award a Relic for that Habit and the 7-day Milestone and record the award date in the Local_Store.
2. WHEN a Habit's Streak reaches exactly 30 consecutive days and no Relic exists for that Habit and the 30-day Milestone, THE Habit_Haunting_App SHALL award a Relic for that Habit and the 30-day Milestone and record the award date in the Local_Store.
3. THE Habit_Haunting_App SHALL award at most one Relic per Habit per Milestone, including after the Streak resets and reaches the same Milestone again.
4. WHEN a user opens the Relic list, THE Habit_Haunting_App SHALL display every awarded Relic with its Habit name, Milestone (7 days or 30 days), and award date, ordered by award date with the most recent first.
5. WHEN a Habit's Streak resets to zero, THE Habit_Haunting_App SHALL retain all Relics already awarded to that Habit, with their Milestone and award date unchanged.
6. IF the Habit_Haunting_App fails to write a Relic award to the Local_Store, THEN THE Habit_Haunting_App SHALL NOT display that Relic in the Relic list, SHALL show an error message indicating the Relic could not be saved, and SHALL retry the award the next time the Habit's Streak is evaluated while it remains at or above the Milestone.
7. WHEN a user opens the Relic list and no Relics have been awarded, THE Habit_Haunting_App SHALL display an empty-state message indicating that no Relics have been earned.

### Requirement 7: Export and Import

**User Story:** As a user, I want to export and import my data, so that I can back it up or move it between browsers.

#### Acceptance Criteria

1. WHEN a user requests an export, THE Habit_Haunting_App SHALL produce an Export_File in JSON format containing all Habits, Check_Ins, Relics, and the Ghost state of each Habit, within 2 seconds for up to 100 Habits and 10,000 Check_Ins.
2. WHEN a user confirms the replacement of existing Local_Store data after selecting a valid Export_File, THE Habit_Haunting_App SHALL replace the existing Local_Store data with all Habits, Check_Ins, Streaks, Ghosts, and Relics from the file, and display a message indicating the import succeeded, within 5 seconds for up to 100 Habits and 10,000 Check_Ins.
3. FOR ALL valid application states, exporting then importing then exporting SHALL produce a second Export_File whose content is equal to the first Export_File, ignoring any export-timestamp field (round-trip property).
4. FOR ALL valid application states, importing an Export_File produced from that state SHALL yield Streaks, Ghost_Levels, and Relics equal to those of the original state (round-trip property).
5. IF a user imports a file that is not valid JSON or does not match the Export_File structure, THEN THE Habit_Haunting_App SHALL reject the file, display an error message indicating whether the file is not valid JSON or does not match the Export_File structure, and leave the existing Local_Store data unchanged.
6. WHEN a user selects a valid Export_File for import, THE Habit_Haunting_App SHALL display a confirmation prompt stating that existing Local_Store data will be replaced, and SHALL NOT modify the Local_Store until the user confirms.
7. IF a user cancels the import confirmation prompt, THEN THE Habit_Haunting_App SHALL close the prompt, discard the selected file, and leave the existing Local_Store data unchanged.
8. IF writing imported data to the Local_Store fails, THEN THE Habit_Haunting_App SHALL display an error message indicating the import failed and restore the Local_Store data to its state before the import began.

### Requirement 8: Onboarding and Demo House

**User Story:** As a first-time user, I want quick onboarding and a ready-made haunted house, so that I can start immediately and see the haunting in action.

#### Acceptance Criteria

1. WHEN the Habit_Haunting_App loads and the Local_Store contains no data, THE Habit_Haunting_App SHALL display an onboarding flow that creates the three Seed_Habits.
2. WHEN a first-time user starts the onboarding flow, THE Habit_Haunting_App SHALL allow the user to complete it, ending with the three Seed_Habits saved to the Local_Store and the Dashboard displayed, in no more than 5 user actions and within 60 seconds of the flow being displayed.
3. WHEN the Habit_Haunting_App loads and the Local_Store contains no data, THE Habit_Haunting_App SHALL offer the option to load the Demo_House on the same screen as the onboarding flow.
4. WHEN a user chooses to load the Demo_House, THE Habit_Haunting_App SHALL replace all existing Local_Store data with a set of 3 to 6 neglected Habits that includes at least one Haunted Habit, and display the Dashboard within 2 seconds.
5. IF loading the Demo_House fails, THEN THE Habit_Haunting_App SHALL display an error message indicating the Demo_House could not be loaded and SHALL preserve the Local_Store data that existed before the attempt.
6. WHILE the Demo_House is loaded, WHEN the user performs a Check_In on a Haunted Habit, THE Habit_Haunting_App SHALL Revive that Habit and update its Streak, Ghost_Level, Room darkness, and Haunted state on the Dashboard within 1 second.
7. WHERE demo mode is enabled, THE Habit_Haunting_App SHALL provide the Demo_Date_Control, and each single user action on it SHALL advance the current date used by the Haunting_Engine by exactly one day, so that a missed day can be simulated.
8. WHEN the user advances the date with the Demo_Date_Control, THE Habit_Haunting_App SHALL recalculate and display the Streaks, Ghost_Levels, Room darkness, and Haunted state of all Habits according to the new date within 1 second.

### Requirement 9: Local Persistence

**User Story:** As a user, I want my data stored on my device without accounts or paid services, so that the app is private and free to use.

#### Acceptance Criteria

1. WHEN a Habit, Check_In, Relic, or Ghost state is created, changed, or deleted, THE Habit_Haunting_App SHALL write the change to the Local_Store within 1 second.
2. WHEN a user reloads the Habit_Haunting_App, THE Habit_Haunting_App SHALL restore the same Habits, Check_Ins, Streaks, Ghosts, and Relics from the Local_Store, and every restored record SHALL have field values equal to those held before the reload.
3. THE Habit_Haunting_App SHALL operate without a user account, without a paid API, and without an LLM, and SHALL send no user data to any remote server.
4. THE Haunting_Engine SHALL produce identical output for identical inputs of Habits, Check_Ins, and current date, regardless of the number of times it is run or the wall-clock time at which it runs.
5. IF the Local_Store is unavailable or a write to the Local_Store fails, THEN THE Habit_Haunting_App SHALL display a message within 2 seconds indicating that data could not be saved, retain the in-memory state for the current session, and keep all features usable for the rest of the session.
6. IF the Local_Store contains data that cannot be read or parsed when the Habit_Haunting_App loads, THEN THE Habit_Haunting_App SHALL start with an empty state, display a message indicating that stored data could not be loaded, and leave the unreadable stored data unmodified until the user next creates or changes a record.

### Requirement 10: Date Edge Cases and Engine Invariants

**User Story:** As a developer, I want the haunting rules to be correct across date edge cases, so that streaks and ghosts are trustworthy.

#### Acceptance Criteria

1. THE Haunting_Engine SHALL determine the calendar date of every Check_In and of the current date using the user's local time zone, as the year, month, and day in that time zone.
2. WHEN the user's local clock passes 00:00:00 and the local calendar date changes, THE Haunting_Engine SHALL treat the new local date as the current date for Streak, Missed_Days, and Today_List computation, and SHALL reflect the recomputed values within 1 second of the date change.
3. WHEN a daylight-saving time change occurs in the user's local time zone, THE Haunting_Engine SHALL count each local calendar date as exactly one day, including dates that last 23 or 25 hours, so that Streak and Missed_Days values are identical to those computed for the same dates without the time change.
4. FOR ALL Habits and dates, WHEN a Check_In exists for date D and the Streak is continuous through date D-1 and date D, THE Haunting_Engine SHALL compute a computed Flame height (not clamped to the Maximum_Display_Height) for date D that is strictly greater than the computed Flame height of the same Habit for date D-1 (invariant).
5. FOR ALL Habits, THE Haunting_Engine SHALL compute a Ghost_Level for Missed_Days = n+1 that is greater than or equal to the Ghost_Level for Missed_Days = n, for every integer n >= 0 (invariant).
6. IF a Check_In has a local date before the Habit's creation date or after the current local date, THEN THE Haunting_Engine SHALL exclude that Check_In from Streak and Missed_Days computation, SHALL leave the stored Check_In unchanged, and SHALL NOT report an error to the user.
