# FITHub — Use-Case Model & Specification

**Document version:** 2.0 (Merged)
**Related documents:** FITHub Vision Document (v2.0) · PA3-2026 Assignment Brief
**Functional groups covered:** §5.1 to §5.8 (Complete System)


---
## Part D: Use-Case Specifications (Ordered by Workflow)
*Performed by: Nguyễn Thúy Hằng, Đào Hưng Khoa, Nguyễn Duy Đức*, *Reviewed by: Nguyễn Minh Trí, Đào Hưng Khoa*, *Edited by: Nguyễn Minh Trí, Nguyễn Thúy Hằng*  

### §5.1 User Onboarding & Goal Management

#### UC-01: Complete Onboarding Survey
*   **Actor(s):** Trainee
*   **Description:** A newly registered Trainee completes a guided biometric and lifestyle survey (height, weight, age, sex, medical conditions, activity level) so FITHub can calculate their baseline caloric and macronutrient targets.
*   **Preconditions:** The Trainee has successfully registered and logged into FITHub but has not completed the survey.
*   **Basic Flow:**
    1. The Trainee logs in for the first time; the system displays the Onboarding Survey screen.
    2. The system prompts for basic biometric data: height, current weight, age, and gender.
    3. The Trainee enters the requested data.
    4. The system prompts the Trainee to optionally disclose pre-existing medical conditions.
    5. The Trainee enters medical condition information or skips.
    6. The system prompts the Trainee to select a current activity level.
    7. The Trainee selects an activity level and submits the survey.
    8. The system calculates the Trainee's BMR and baseline daily calorie/macronutrient targets.
    9. The system saves the profile and displays the Daily Macro Dashboard.
*   **Alternative Flows:**
    *   **A1 — Missing required field:** At step 7, if a required field is missing, the system shows an inline validation error and returns to step 3.
    *   **A2 — Disclosed medical condition:** At step 8, if a medical condition is disclosed, the system applies a conservative target calculation and displays a medical disclaimer.
    *   **A3 — Trainee exits mid-survey:** The system saves the partial survey as a draft and re-presents it at the next login.
    * - **A4 — Trainee edits a completed survey:** A returning Trainee may reopen the survey from profile settings; the flow resumes at step 2 with previous values pre-filled, and step 8's recalculation supersedes the old targets.
*   **Postconditions:**
	- The Trainee's biometric profile is stored.
	- The Trainee has an active set of baseline calorie and macronutrient targets.
	- The Daily Macro Dashboard reflects the new targets.
-   **Special Requirements:**
	- The dashboard shown at the end of this use case must load in under 2.5 seconds on a standard 4G connection (Vision Doc, Performance NFR).All biometric and medical-condition data must be encrypted at rest and in transit.

#### UC-02: Log Body Progress & Update Metrics
*   **Actor(s):** Trainee
*   **Description:** The Trainee logs their current weight and, optionally, body-fat percentage and a check-in photo, so FITHub can chart their transformation and dynamically recalibrate their nutrition targets as their body changes.
*   **Preconditions:** The Trainee is logged in and has completed UC-01.
*   **Basic Flow:**
 1. The Trainee opens the Progress screen and selects "Log Today's Weight."
2. The system displays an entry form for weight (required), body-fat percentage (optional), and a photo upload (optional).
3. The Trainee enters their current weight.
4. The Trainee optionally enters a body-fat percentage and/or uploads a check-in photo.
5. The Trainee confirms the entry.
6. The system saves the new data point to the Trainee's progress history.
7. The system compares the new weight to the previous entry and recalculates the Trainee's daily calorie and macronutrient targets accordingly (dynamic goal adjustment).
8. The system updates the Daily Macro Dashboard and Progress Timeline with the new targets and data point.

*   **Alternative Flows:**
    * **A1 — First-ever entry:** If this is the Trainee's first log since onboarding, step 7 is skipped (the onboarding targets are already current); the entry instead becomes the new baseline data point.
    - **A2 — Implausible value:** At step 3, if the entered weight falls outside a plausible physiological range, the system rejects it with a validation message and returns to step 3.
    - **A3 — No meaningful change:** At step 7, if the new weight is within a negligible threshold of the previous entry, the system leaves the existing targets unchanged.
    - **A4 — Photo upload fails:** At step 4, if the photo upload fails, the system still saves the weight/body-fat entry and offers a retry for the photo only.
    - **A5 — Trainee edits or deletes a past entry:** The Trainee may edit or delete a previous entry; the system recalculates the timeline and, if the edited/deleted entry was the most recent, re-runs step 7 against the new most-recent entry.
*   **Postconditions:**
	- A new (or updated) progress entry exists in the Trainee's history.
	- The Trainee's active targets reflect their most recent weight, where applicable.
-   **Special Requirements:**
	- Progress photos must be stored in a private, access-controlled cloud bucket associated only with the Trainee's account and any Coach they have engaged.
  
### UC-03: View Progress Timeline

- **Actor(s):** Trainee (primary)

- **Brief Description:** The Trainee reviews a visual, chronological timeline of their logged weight, body-fat percentage, and check-in photos to track their transformation and stay motivated.
- **Preconditions:**
	- The Trainee is logged in and has at least one logged progress entry (UC-02).
- **Basic Flow:**
1. The Trainee opens the Progress screen.
2. The system retrieves the Trainee's historical weight, body-fat, and photo entries.
3. The system renders the data as a chronological chart alongside a photo timeline.
4. The Trainee selects a time range (e.g., last 30 days, 90 days, all time) to filter the view.
5. The system re-renders the chart and photo timeline for the selected range.

- **Alternative Flows:**
	- **A1 — No data in the selected range:** At step 5, if no entries fall within the range, the system shows an empty-state message suggesting the Trainee widen the range or log a new entry.
	- **A2 — No entries at all:** If the Trainee has never logged progress data, the system shows a prompt directing them to UC-02 instead of an empty chart.
	- **A3 — Before/after comparison:** The Trainee may select two specific check-in photos to view side-by-side.
- **Postconditions:**
	- The Trainee has viewed their progress history; no data is modified.
- **Special Requirements:**
	- Charts must render clearly on mobile viewports as small as 375px wide (Vision Doc, Usability NFR).

  
---

### §5.2 Dietary & Nutritional Tracking

#### UC-04: Log Meal Manually
*   **Actor(s):** Trainee
*   **Description:** Allows the user to search the extensive food database for individual ingredients or complete meals and log them into their daily food journal.
*   **Preconditions:** User is logged into the application and is on the Daily Meal Tracker screen.
*   **Basic Flow:**
    1. User selects a meal category (e.g., Breakfast) and taps "Add Food".
    2. System displays the food search screen.
    3. User types keywords into the search bar.
    4. System queries the food database and displays matching items with calorie counts.
    5. User selects an item from the search results.
    6. System displays the detail screen where the user selects a serving unit and quantity.
    7. User confirms the entry by tapping "Add to Log".
    8. System logs the food, updates the daily nutritional totals, and redirects back to the journal.
*   **Alternative Flows:**
    *   **A1 — Food Item Not Found:** User taps "Create Custom Food", enters custom nutrition details, and saves it.
    *   **A2 — Invalid Quantity Entered:** System displays inline error "Please enter a valid positive quantity" and blocks submission.
    *   **A3 — Network Loss:** System saves the log entry locally and alerts: "Saved offline. Data will sync once back online."
*   **Postconditions:** The logged food item is permanently stored, and daily totals are recalculated.
* **Special Requirements:** Search query response time must be under 1.0 second for standard keyword queries. Database must support fractional portion entries (e.g., 0.5 cups, 1.5 servings).
 

#### UC-05: View Macro/Micronutrient Dashboard
*   **Actor(s):** Trainee
*   **Description:** Provides a visual dashboard containing charts (pie charts, progress bars) displaying daily intake progress.
*   **Preconditions:** User is logged in and has defined daily targets.
*   **Basic Flow:**
    1. User navigates to the "Nutrition Dashboard".
    2. System retrieves logged dietary data for today.
    3. System calculates consumed values vs. targeted limits for macros and key micronutrients.
    4. System renders a Calorie Pie Chart and Nutrient Progress Bars.
    5. User views their current intake progress.
*   **Alternative Flows:**
    *   **A1 — Exceeded Critical Limits:** If a limit (e.g., Sodium) is exceeded, the system highlights the progress bar in red and displays a warning banner.
    *   **A2 — Change Date Filter:** User selects a different date; the system fetches historical data and re-renders charts.
    * **A3 — No Meals Logged for Selected Date:** If no dietary data exists for the chosen date, system displays an empty state illustration with message: "No food logged for today" and a shortcut button "Log a Meal".
*   **Postconditions:** Nutritional summary is visually displayed.
* **Special Requirements:** Visual charts must re-render in less than 500ms when switching dates or updating food logs. UI must comply with accessibility guidelines (high-contrast colors for progress bars and charts).

#### UC-06: Log Meal via Barcode / Smart Camera (OCR)
*   **Actor(s):** Trainee
*   **Description:** Import food nutrition facts automatically by scanning a product barcode or photographing a nutritional label using OCR.
*   **Preconditions:** Device has a functional camera with permission granted.
*   **Basic Flow:**
    1. User taps the "Scan / Camera" button.
    2. System opens the Viewfinder with a mode switcher (`[ BARCODE ]` | `[ OCR LABEL ]`).
    3. User selects `OCR LABEL` and aligns the nutrition table.
    4. User taps "Capture & Process".
    5. System extracts nutrition data and transitions to the Confirmation Screen.
    6. System displays pre-filled nutrition fields.
    7. User reviews extracted values, adjusts portion, and taps "Confirm & Log".
    8. System records the entry and updates daily totals.
*   **Alternative Flows:**
    *   **A1 — Camera Permission Denied:** System displays popup and offers "Open Settings" or "Manual Search".
    *   **A2 — Low Confidence OCR:** System displays banner: "Low OCR confidence. Please double-check auto-filled values."
    *   **A3 — Unrecognized Barcode:** System alerts "Barcode not recognized" and offers "Switch to OCR Label Scanner".
*   **Postconditions:** Food item is recorded, and totals are recalculated.
*   **Special Requirements:** OCR processing must complete in < 3.0 seconds. OCR engine must support standard international nutrition label formats (e.g., FDA, EU, and Asian formats). Camera viewport must include visual alignment framing brackets.


---

### §5.4 AI Assistant & Smart Automation

#### UC-07: Generate AI Recipe from Available Ingredients
*   **Actor(s):** Trainee
*   **Description:** The Trainee asks the AI Assistant to suggest a recipe using ingredients on hand, tailored to fill their remaining daily macros.
*   **Preconditions:** Trainee has an active set of macro targets. AI API is reachable.
*   **Basic Flow:**
    1. Trainee views the Dashboard and opens the AI Assistant.
    2. System prompts Trainee to list available ingredients.
    3. Trainee inputs ingredients (e.g., "Chicken, rice, broccoli").
    4. System calculates the Trainee's remaining daily macros.
    5. System sends ingredients and macro constraints to the AI engine.
    6. AI returns a custom recipe with specific portion sizes.
    7. System displays the recipe and nutritional breakdown.
    8. Trainee selects "Log Meal".
    9. System logs the meal and updates the Dashboard.
*   **Alternative Flows:**
    *   **A1 — No feasible recipe:** AI cannot construct a recipe fitting the exact macros. System offers a closest-fit recipe with a noted macro deviation.
    *   **A2 — AI service unavailable:** System notifies Trainee that the assistant is down and offers manual meal logging.
    *   **A3 — Trainee edits portions:** Trainee adjusts AI's suggested portions before logging; system recalculates values.
    * **A4 — Macros already fulfilled:** If targets are already met for the day, the dashboard does not prompt the Trainee toward the AI Assistant (they may still open it manually).
    - **A5 — No ingredients provided:** If the Trainee provides no ingredients, system asks for at least one before proceeding.
    - **A6 — Trainee declines the suggestion:** The Trainee may decline instead of logging; the flow returns to prompting for ingredients to request a new suggestion.
*   **Postconditions:** The meal is logged against daily intake.
*  **Special Requirements:** AI Assistant query responses must be generated and returned in under 5 seconds. This use case is entirely dependent on the uptime and response time of the third-party AI API (Gemini).


---

### §5.3 Diet Plan & Recipe Management

#### UC-08: Manage Diet Calendar
*   **Actor(s):** Trainee
*   **Description:** The Trainee schedules, views, and modifies planned meals across a weekly calendar so their upcoming diet regimen is organized in advance.
*   **Preconditions:** The Trainee is logged in.
*   **Basic Flow:**
    1. Trainee opens the Diet Calendar screen.
    2. System displays the current week in a day-by-day view.
    3. Trainee selects a day and a meal slot (Breakfast, Lunch, Dinner, Snack).
    4. System prompts Trainee to search the food database, personal recipes, or community recipes.
    5. Trainee selects a meal/recipe and confirms portion.
    6. System adds the planned meal to the slot and displays the updated calendar.
*   **Alternative Flows:**
    *   **A1 — Navigate week:** Trainee navigates to past/future weeks; past weeks display as read-only.
    *   **A2 — Edit scheduled meal:** Trainee selects an existing slot and changes recipe/portion.
    *   **A3 — Remove scheduled meal:** Trainee selects and removes a scheduled meal.
    *   **A4 — Slot already filled:** If a slot has an entry, system prompts to replace or cancel.
    *   **A5 — No results found:** If search returns no matches, system offers redirection to create a custom recipe.
*   **Postconditions:** Calendar reflects the Trainee's most recent scheduling changes.
*   **Special Requirements:** Calendar view must remain usable across widths from 375px to 1920px.
 

#### UC-09: Create and Save Recipe
*   **Actor(s):** Trainee
*   **Description:** The Trainee creates a custom recipe from individual ingredients, saving it privately or submitting it for public community review.
*   **Preconditions:** The Trainee is logged in.
*   **Basic Flow:**
    1. Trainee selects "Create New Recipe".
    2. System displays recipe-builder form.
    3. Trainee names recipe and adds ingredients/quantities via database search.
    4. System automatically calculates total and per-serving macros.
    5. Trainee enters prep steps and optionally uploads a photo.
    6. Trainee chooses to save privately or submit for public review.
    7. System saves the recipe.
    8. If public, system forwards it to the moderation queue marked "Pending Review".
*   **Alternative Flows:**
    *   **A1 — Ingredient not found:** Trainee enters it manually with estimated values (flagged "user-entered").
    *   **A2 — Missing fields:** System blocks saving if name or ingredients are missing.
    *   **A3 — Edit existing recipe:** If a public recipe is edited, it re-enters the moderation queue.
    *   **A4 — Delete recipe:** Trainee deletes private recipe; public recipes are marked removed by creator.
*   **Postconditions:** Recipe exists in private library and/or moderation queue.

#### UC-10: Browse Community Recipes
*   **Actor(s):** Trainee, Guest
*   **Description:** A user browses the public database of community-submitted recipes to discover new macro-friendly dishes.
*   **Preconditions:** Public database contains at least one approved recipe.
*   **Basic Flow:**
    1. User opens "Community Recipes".
    2. System displays a searchable, filterable list of approved recipes.
    3. User searches/filters and system displays matching recipes.
    4. User selects a recipe to view full details (ingredients, macros).
    5. User chooses to save to private library or add to calendar.
    6. System updates library/calendar.
*   **Alternative Flows:**
    *   **A1 — No results:** System displays empty-state message.
    *   **A2 — Guest attempts to save:** System blocks action and prompts Guest to sign up/log in.
    *   **A3 — Recipe removed:** If a public recipe is later moderated, saved private copies remain unaffected.
*   **Postconditions:** Trainee's library or calendar is updated.
*   **Special Requirements:** Search results must exclude unapproved/pending recipes.
 
#### UC-11: Generate Grocery List
*   **Actor(s):** Trainee
*   **Description:** The Trainee generates a consolidated shopping list aggregated from scheduled calendar meals.
*   **Preconditions:** Trainee is logged in and has meals scheduled.
*   **Basic Flow:**
    1. Trainee selects "Generate Grocery List" for a chosen week.
    2. System aggregates ingredients required by all scheduled meals, summing repeating items.
    3. System displays list grouped by category (e.g., produce, dairy).
    4. Trainee checks off acquired items or manually adds extra items.
    5. Trainee saves the list.
*   **Alternative Flows:**
    *   **A1 — No meals scheduled:** System informs Trainee and links back to Calendar.
    *   **A2 — Remove item:** Trainee removes a list item; underlying calendar is not altered.
    *   **A3 — Regenerate:** If calendar is edited, Trainee taps "Refresh List" to recompile.
*   **Postconditions:** Grocery checklist exists reflecting the calendar.


---

### §5.5 Coach Marketplace & Discovery

#### UC-12: View Intelligent Coach Recommendations
*   **Actor(s):** Trainee
*   **Description:** Recommends specific certified coaches to trainees based on their initial onboarding survey.
*   **Preconditions:** Trainee has completed the onboarding survey (UC-01).
*   **Basic Flow:**
    1. Trainee navigates to "Coach Marketplace".
    2. System retrieves trainee's onboarding profile (goals, budget).
    3. System executes matchmaking algorithm to filter active coaches.
    4. System displays a ranked list of recommended coaches (Name, Specialization, Price, Rating).
    5. Trainee taps a coach card to open the Profile.
*   **Alternative Flows:**
    *   **A1 — No Matches Found:** System relaxes constraints (e.g., removes budget filter) and displays a broader list with a notice.
    *   **A2 — Trainee Applies Manual Filters:** Trainee configures filters (Goal, Price, Gender); system re-queries and re-renders the list.
    * **A3 — Onboarding Survey Not Completed:** If no survey data is found, system redirects the trainee to the Onboarding Survey screen to complete their profile.
*   **Postconditions:** Trainee views a personalized list of suitable coaches.
*  **Special Requirements:** The matchmaking algorithm must respond and render the recommendations list within 2 seconds.
 
#### UC-13: View Coach Profile & Subscribe
*   **Actor(s):** Trainee
*   **Description:** Allows trainees to view a coach's full profile and initiate a paid subscription.
*   **Preconditions:** Trainee selects a coach from the marketplace.
*   **Basic Flow:**
    1. Trainee taps a coach card.
    2. System displays Coach Detail Profile (Bio, Certifications, Reviews, Pricing Tiers).
    3. Trainee selects a subscription tier and taps "Subscribe".
    4. System navigates to Payment screen.
    5. Trainee confirms payment details.
    6. System processes payment, confirms subscription, and unlocks the 1-on-1 portal.
*   **Alternative Flows:**
    *   **A1 — Payment Fails:** System displays error and allows Trainee to re-enter payment details.
    *   **A2 — Already Subscribed:** "Subscribe" button is replaced with "Message Coach".
    *   **A3 — Coach Profile is Incomplete / Unlisted:** If the coach profile is flagged as under review, system displays a notice and disables the "Subscribe" button.
*   **Postconditions:** Trainee has an active subscription; Coach is notified.
*   **Special Requirements:** Full profile must load within 1.5 seconds. Payment processing must comply with PCI-DSS standards. Credential badges must link to verifiable external certification bodies.
 

---

### §5.6 1-on-1 Coaching Portal

#### UC-14: Assign Custom Fitness Routine & Meal Plan
*   **Actor(s):** Coach, Trainee
*   **Description:** Allows a coach to create and assign customized workout routines and meal instructions directly onto a hired trainee's personal calendar.
*   **Preconditions:** Coach is logged in and has an active 1-on-1 coaching contract with the selected trainee.
*   **Basic Flow:**
    1. Coach selects client and opens "Plan Assignment".
    2. System displays trainee's personal calendar.
    3. Coach selects date range and inputs workout details and meal instructions.
    4. Coach clicks "Assign to Calendar".
    5. System updates the Trainee's calendar and sends a push notification.
*   **Alternative Flows:**
    *   **A1 — Schedule Conflict:** Selected date already has a routine; system prompts to "Overwrite" or "Append".
    *   **A2 — Save as Template:** Coach checks "Save as Template" to reuse the routine for other clients.
*   **Postconditions:** Assigned routines are reflected on the trainee's calendar.
*   **Special Requirements:** Calendar updates must synchronize in real-time across interfaces.
 
#### UC-15: Monitor Trainee Progress & Adherence
*   **Actor(s):** Coach
*   **Description:** Grants coaches access to real-time daily logged meals, macro completion rates, and biometric updates from clients to evaluate adherence.
*   **Preconditions:** Coach is logged in and has active clients assigned.
*   **Basic Flow:**
    1. Coach navigates to "Trainee Progress Monitoring".
    2. System displays summary table of clients with adherence score badges.
    3. Coach clicks a specific trainee to view pie charts and weight trend graphs.
    4. Coach adjusts calorie targets directly from the panel.
    5. System saves adjustment and updates the Trainee's app.
*   **Alternative Flows:**
    *   **A1 — Low Adherence Alert:** Macro completion < 50% for 3 days triggers a red warning badge and offers "Send Reminder".
    *   **A2 — No Logged Data:** If no data is logged, system shows an empty state illustration: "No logs recorded."
*   **Postconditions:** Coach gains insights and plan adjustments take immediate effect.
*   **Special Requirements:** Progress chart rendering time must be under 1 second.
 
#### UC-16: Direct Messaging & Video Form-Check
*   **Actor(s):** Trainee, Coach
*   **Description:** Enables secure communication and short workout video uploads so coaches can review form and provide remote feedback.
*   **Preconditions:** Active coaching subscription exists. Trainee has recorded a short video clip.
*   **Basic Flow:**
    1. Trainee opens "Coach Chat" and taps "Upload Video".
    2. Trainee selects a short workout clip and sends it.
    3. Coach receives notification, opens chat, and plays video.
    4. Coach adds timestamped feedback notes on the video.
    5. Trainee receives feedback and adjusts exercise form.
*   **Alternative Flows:**
    *   **A1 — Video Too Large:** If video > 100MB or > 60s, system blocks upload and opens built-in video trimmer.
*   **Postconditions:** Video clip and coach feedback are permanently logged in chat history.
*   **Special Requirements:** Chat must support media streaming with sub-second latency. Compression must not degrade quality below 720p.

---

### §5.7 Social & Community Engagement

#### UC-17: Post and Reply in Community Forum
*   **Actor(s):** Trainee, Coach
*   **Description:** Users start new threads or reply to existing ones to ask questions or share advice.
*   **Preconditions:** User is logged in as a Trainee or Coach.
*   **Basic Flow:**
    1. User opens Community Forum and selects "New Thread".
    2. System displays composition form.
    3. User writes title and body and submits.
    4. System runs content through automatic word filter (UC-26).
    5. System publishes the thread.
*   **Alternative Flows:**
    *   **A1 — Reply to thread:** User writes a reply; system filters and appends it.
    *   **A2 — Content flagged:** System blocks publication and asks user to revise offending text.
    *   **A3 — Coach replies:** A Coach's reply on a specialty thread is marked "Verified Coach".
    *   **A4 — User reports post:** User selects "Report", routing it to dispute queue (UC-24).
*   **Postconditions:** Post is visible in the forum.

#### UC-18: Join Fitness Challenge and View Leaderboard
*   **Actor(s):** Trainee
*   **Description:** Trainee opts into a monthly fitness challenge and tracks ranking for gamification.
*   **Preconditions:** Trainee is logged in. An active challenge exists.
*   **Basic Flow:**
    1. Trainee opens Challenges and views active challenges.
    2. Trainee selects "Join".
    3. System enrolls Trainee and tracks qualifying activity.
    4. Trainee views the leaderboard.
    5. System displays participant rankings based on the challenge metric.
*   **Alternative Flows:**
    *   **A1 — Already enrolled:** System takes Trainee directly to leaderboard.
    *   **A2 — Period ends:** System freezes leaderboard and marks final standings.
    *   **A3 — Streak broken:** System resets or adjusts progress per challenge rules.
*   **Postconditions:** Trainee's participation and ranking are up to date.

#### UC-19: Share Progress Milestone
*   **Actor(s):** Trainee
*   **Description:** Trainee generates a shareable summary graphic of achievements to post on external social media.
*   **Preconditions:** Trainee has at least one logged progress entry or milestone.
*   **Basic Flow:**
    1. Trainee opens Progress Timeline and selects "Share".
    2. System generates a graphic summarizing the achievement.
    3. Trainee selects a destination (download or share externally).
    4. System exports or hands off the graphic.
*   **Alternative Flows:**
    *   **A1 — Customize graphic:** Trainee toggles which data points appear.
    *   **A2 — No external account:** System offers "download image" and a prompt to link an account.
*   **Postconditions:** Graphic exported; no platform data altered.
*   **Special Requirements:** Generated graphics must not expose unselected personal data.

#### UC-20: Create or Join Sub-Community
*   **Actor(s):** Trainee, Moderator/Admin
*   **Description:** User applies to create a local-interest group or joins an existing one.
*   **Preconditions:** User is logged in.
*   **Basic Flow:**
    1. User browses Sub-Communities.
    2. User selects "Create New Group".
    3. User submits group details (name, location).
    4. System routes proposal to Admin queue marked "Pending Validation".
    5. Admin reviews and approves it.
    6. System notifies user and group becomes publicly joinable.
*   **Alternative Flows:**
    *   **A1 — Join existing:** User selects "Join"; system adds them as member instantly.
    *   **A2 — Duplicate/Rejected:** Admin rejects group proposing a duplicate topic.
    * **A3 — Content policy on group messages:** Messages posted within any sub-community are subject to the automatic content filter (see UC-26).
    *   **A4 — User leaves a group:** A member may leave a group they previously joined; the system removes their membership.
*   **Postconditions:** Group is created or user membership updated.
 
---
### §5.8 Platform Moderation & Administration

#### UC-21: Apply for Coach Verification
*   **Actor(s):** Trainee
*   **Description:** A Trainee applies for the Coach role by submitting ID and certifications for review.
*   **Preconditions:** User is logged in.
*   **Basic Flow:**
    1. Trainee navigates to "Become a Coach" and selects "Apply".
    2. Trainee uploads required government ID and certification documents.
    3. Trainee submits application.
    4. System stores documents securely and places application in Admin queue.
*   **Alternative Flows:**
    *   **A1 — Unsupported file:** System rejects files exceeding size limit.
    *   **A2 — Application withdrawn:** Trainee withdraws pending application; system deletes documents.
*   **Postconditions:** Application exists in "Pending Review" status.
*   **Special Requirements:** Documents must be stored in secure, private cloud buckets.

#### UC-22: Review Coach Verification Application
*   **Actor(s):** Moderator/Admin
*   **Description:** Admin reviews pending coach applications and approves or rejects the role.
*   **Preconditions:** At least one application is pending (UC-21).
*   **Basic Flow:**
    1. Admin opens Coach Verification queue.
    2. Admin selects application and views ID/certificates.
    3. Admin verifies authenticity and approves application.
    4. System grants Coach role, notifies user, and deletes submitted documents.
*   **Alternative Flows:**
    *   **A1 — Application rejected:** Admin rejects application; system notifies user and deletes documents.
    *   **A2 — Insufficient docs:** Admin requests more information; user must resubmit.
*   **Postconditions:** Application resolved and documents deleted.
*   **Special Requirements:** Documents must be deleted immediately after decision (Security NFR).
 
#### UC-23: Moderate Community Recipe Submission
*   **Actor(s):** Moderator/Admin
*   **Description:** Admin reviews user-submitted recipes for accuracy before public release.
*   **Preconditions:** Recipe has "Pending Review" status (UC-09).
*   **Basic Flow:**
    1. Admin opens Recipe Moderation queue.
    2. Admin views ingredients, steps, and nutritional data.
    3. Admin approves recipe.
    4. System publishes recipe to public database and notifies Trainee.
*   **Alternative Flows:**
    *   **A1 — Recipe rejected:** Admin rejects recipe; it remains in Trainee's private library only.
    *   **A2 — Suspected duplicate:** Admin rejects submission pointing to existing duplicate entry.
*   **Postconditions:** Recipe is published or remains private.
 
#### UC-24: Submit Dispute or Report
*   **Actor(s):** Trainee, Coach
*   **Description:** User reports inappropriate behavior, unfulfilled services, or harassment.
*   **Preconditions:** User is logged in.
*   **Basic Flow:**
    1. User selects "Report" on a profile/post.
    2. User selects category (e.g., harassment) and describes issue, attaching evidence.
    3. User submits report.
    4. System creates "Open" case and routes to Admin queue.
*   **Alternative Flows:**
    *   **A1 — Paid service dispute:** Unfulfilled coaching services are tagged for prioritized handling.
    *   **A2 — Duplicate report:** System links duplicate reports on the same incident.
*   **Postconditions:** Open case exists in Admin queue.
 
#### UC-25: Resolve Reported Dispute
*   **Actor(s):** Moderator/Admin
*   **Description:** Admin reviews an open dispute case and takes resolving action.
*   **Preconditions:** Open case exists (UC-24).
*   **Basic Flow:**
    1. Admin opens Dispute queue and selects a case.
    2. Admin reviews description and evidence.
    3. Admin decides resolution (e.g., warn, suspend).
    4. Admin closes case.
    5. System notifies reporting user.
*   **Alternative Flows:**
    *   **A1 — Coach suspended:** If a Coach is suspended, system notifies active Trainees under that Coach.
    *   **A2 — Insufficient evidence:** Admin requests more information; case remains Open.
*   **Postconditions:** Case is marked resolved.
 
#### UC-26: Filter Prohibited Content Automatically
*   **Actor(s):** System
*   **Description:** System scans public text submissions for profanity and spam, blocking violations before publication.
*   **Preconditions:** User submits text to a filtered surface (UC-17, UC-20).
*   **Basic Flow:**
    1. User submits text.
    2. System scans against prohibited list.
    3. System finds no violations.
    4. System allows publication normally.
*   **Alternative Flows:**
    *   **A1 — Violation detected:** System blocks publication and asks user to revise highlighted text.
    *   **A2 — False positive:** User reports blocked content for Admin review (UC-24).
*   **Postconditions:** Text is published or blocked pending revision.
*   **Special Requirements:** Filtering runs synchronously before publication.

---
# Appendix: AI Usage Notes

*   **Tool name, version, and platform:** Gemini 3.1 Pro (Google AI Studio)
*   **Access time:** July 25, 2026, 21:50
*   **Prompts used:** "i'm making a use case specification file for my group project's, but i have 2 use case specification files from 2 people, i'm merging them into 1 file, check if i've missed anything in merging these files, know that the merged use case spec.md is the merged file, while the other files are the source files. be as thorough as possible, comb through every file, and let me know which parts i've missed."
*   **Purpose of use:** To check our documents' consistency, as well as accuracy after merging.
*   **Which content was generated by AI:** Contents that were mistakenly forgotten/omitted by the editor(s) during the process of merging.
*   **Which content was done independently and how the student edited or validated it:** The editor team reviewed the contents generated and compared said contents with the source files. After consideration, and thorough checking, the team decided to omit some details, and reintegrate other contents into the final version. 
*   **Screenshots or chat history:**

![Aiusage](./Stitch/UC_merge.png)



*   **Tool name, version, and platform:** Google Stitch AI
*   **Access time:** July 24, 2026, 14:00
*   **Prompts used:** "Base on user case specification in 5.6. Build a mobile app UI frame (centered iPhone layout, max-width 390px, height 850px, scrollable) for FITHub app in dark mode (#0A0D0E). Completely REMOVE the phone native OS status bar (no battery, clock, or wifi icons). Design System & Header: - Top Bar Layout: Flex row, justify-between, items-center px-4 py-3 border-b border-white/10. - Top Left: Back arrow icon + Coach Avatar + Name "COACH ALEX RIVERA" with a green online status dot. - Top Right: Video call icon + Options menu. - Color Palette: Pitch Black background (#0A0D0E), dark elevated cards (#12141A) with thin subtle borders (border-white/10), Electric Lime (#CCFF00) accents, uppercase monospace tech typography. Screen Content (UC-5.6.3 Screen 1 - Trainee Chat Upload View): 1. Chat History Timeline: - Message 1 (Coach): "Hey John! Let me see your 100kg squat set. Upload a video for form review." - Message 2 (Trainee): "Here is set 3! Struggling a bit on the bottom position." 2. Video Form-Check Attachment Card (Trainee Message with Video): - Dark card bubble aligned to right with subtle Electric Lime border (`border-[#CCFF00]`). - Video Thumbnail Box: Dark box with video play icon, duration overlay "0:45", and tech tag "[ EXERCISE: BARBELL SQUAT - 100KG ]". - Upload Status Badge: Green checkmark badge reading "✓ UPLOAD COMPLETE (720P HD • 42MB)". - Subtitle: "Form-check request sent to Coach Alex Rivera". 3. Chat Input Action Bar (Sticky Bottom): - Attachment '+' icon + Camera icon button. - Dark text input field: "Ask Coach Alex about your form..." - Send Button: Circular Electric Lime (#CCFF00) button with bold black send arrow icon. 4. Footer: - Muted tech text at bottom: "© 2026 FITHUB PRECISION SYSTEMS • SECURE ENCRYPTED CHAT".."
*   **Purpose of use:** Create use case specification prototypes
*   **Which content was generated by AI:** Use case specification prototype images.
*   **Which content was done independently and how the student edited or validated it:** The students thoroughly checked and compared the contents generated with the source files' descriptions of said use case specifications.  
*   **Screenshots or chat history:**
![Aiusage](./Stitch/Hang1.jpg)

*   **Tool name, version, and platform:** Google Stitch AI
*   **Access time:** July 24, 2026, 14:00
*   **Prompts used:** "Base on user case specification in 5.6 .Build a mobile app UI frame (centered iPhone layout, max-width 390px, height 850px, scrollable) for FITHub Coach Portal in dark mode (#0A0D0E). Completely REMOVE the phone native OS status bar (no battery, clock, or wifi icons). Design System & Header: - Top Bar Layout: Flex row, justify-between, items-center px-4 py-3. - Top Left: Back arrow icon + "FITHub" logo in bold Electric Lime text (#CCFF00) with subtle neon glow. - Header Badge: Dark pill badge reading "CLIENT: JOHN DOE (TRAINEE)" in muted white text. - Color Palette: Pitch Black background (#0A0D0E), dark elevated cards (#12141A) with thin subtle borders (border-white/10), Electric Lime (#CCFF00) accents, uppercase monospace tech typography. Screen Content (UC-5.6.2 Screen 1 - Trainee Analytics): 1. Adherence Score Header: - Header title: "TRAINEE PROGRESS OVERVIEW". - Success Badge: Large dark card with Electric Lime checkmark reading "HIGH ADHERENCE (92% SCORE)". 2. Today's Macro Completion Section: - Header: "1. DAILY MACRO COMPLETION (TARGET VS ACTUAL)". - Left: Circular ring progress chart (92% filled in Electric Lime) with "92%" centered. - Right: Linear progress bars: * PROTEIN: "138G / 150G" (Lime bar 92% filled). * CARBS: "230G / 250G" (Lime bar 92% filled). * FAT: "60G / 65G" (Lime bar 92% filled). 3. Logged Meals Quick View: - Header: "RECENTLY LOGGED MEALS (JUL 25, 2026)". - Item 1: "BREAKFAST: OATMEAL & EGGS - 412 KCAL". - Item 2: "LUNCH: GRILLED CHICKEN SALAD - 380 KCAL". 4. Biometric Trend Section: - Header: "2. BIOMETRIC TRENDS (LAST 30 DAYS)". - Small line graph illustration for "WEIGHT TREND: 82KG -> 79.5KG" using Electric Lime line color. 5. Sticky Bottom Action Button: - Fixed bottom container with full-width solid Electric Lime (#CCFF00) button reading "ADJUST PLAN TARGETS & FEEDBACK →" with bold black text."
*   **Purpose of use:** Create use case specification prototypes
*   **Which content was generated by AI:** Use case specification prototype images.
*   **Which content was done independently and how the student edited or validated it:** The students thoroughly checked and compared the contents generated with the source files' descriptions of said use case specifications.  
*   **Screenshots or chat history:**

![Aiusage](./Stitch/Hang2.jpg)

*   **Tool name, version, and platform:** Google Stitch AI
*   **Access time:** July 22, 2026, 11:00
*   **Prompts used:** "Create a design system using design,md and the file landing2.png ,...."
*   **Purpose of use:** Create use case specification prototypes
*   **Which content was generated by AI:** Use case specification prototype images.
*   **Which content was done independently and how the student edited or validated it:** The students thoroughly checked and compared the contents generated with the source files' descriptions of said use case specifications.  
* **Screenshots or chat history:**
![Aiusage](./Stitch/Khoa1.jpg)


---

## Acknowledgements:

* In addition to the aforementioned instances of AI assistance, we are also very grateful for our upperclassmen (Luong Quoc Dung, Nguyen Minh Hoang, Nguyen Quang Huy, Tran Nguyen Phuc Khang, and Tran Ngoc Uyen Nhi) for their invaluable resources.
* Specifically, we've taken inspiration from how they wrote/described their use cases.