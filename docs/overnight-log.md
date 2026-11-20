# Overnight log

- Round 1: sidebar regrouped into 7 clear groups (home, conversations, customers and campaigns, automation and knowledge, analytics, extra tools folded, settings and connect folded); folded groups open on their own when a page inside is active.
- Round 2: verified in browser (desktop): folded groups open on click, collapsed icon sidebar shows every page; mobile sheet lists all groups unfolded (code path unchanged, not resized-tested).
- Round 3 (notifications): fixed demo notifications navigating out of demo mode (/dashboard/... now maps to /demo-review/...) and relative routes saved by the reminders runner ('bookings') that navigated to a broken path; demo read/mark-all now work; unread count badge on the bell instead of a bare dot; rows and mark-all are real buttons (keyboard); Escape closes; failed mark-read no longer throws; icons for conversation/ticket/automation/campaign/expired-link types; dashboard theme tokens (old light tokens removed); friendlier empty state.
- Buttons fixed: notification rows (route), mark-all (demo). Buttons removed: none yet.
