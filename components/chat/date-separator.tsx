// components/chat/date-separator.tsx
// (Content from finalcodebase.txt - verified)
"use client"; // Keep client directive if using locale-dependent logic

/**
 * Formats a date string for display in the chat interface.
 * Shows "Today" if the date is the current day.
 * Shows "Yesterday" if the date was the previous day.
 * Otherwise, shows the full date string provided.
 */
export function DateSeparator({ date }: { date: string }) {
  // Get the current date (at the start of the day for comparison)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Calculate yesterday (at the start of the day)
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Get the string representations using the default locale date format.
  // This assumes the 'date' prop is also formatted this way (e.g., from grouping logic)
  const todayString = today.toLocaleDateString();
  const yesterdayString = yesterday.toLocaleDateString();

  let displayDate: string;

  if (date === todayString) {
    displayDate = "Today";
  } else if (date === yesterdayString) {
    displayDate = "Yesterday";
  } else {
    // Fallback: Display the original date string
    // Consider more robust date parsing/formatting if needed
    displayDate = date;
  }

  return (
    <div
      className="flex items-center justify-center my-4"
      aria-label={`Messages from ${displayDate}`}
    >
      <div className="h-px bg-border flex-grow" />
      <span className="px-3 text-xs font-medium text-muted-foreground">
        {displayDate}
      </span>
      <div className="h-px bg-border flex-grow" />
    </div>
  );
}
