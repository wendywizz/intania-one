import { Redirect, type Href } from "expo-router";

// The forgot-timestamp list and history are now combined into a single screen
// (the `forgot-timestamp` route) with a top tab bar. This legacy route redirects
// to that screen with the history tab pre-selected so old links keep working.
export default function TimestampHistoryRedirect() {
  return (
    <Redirect
      href={{ pathname: "/timestamp/forgot-timestamp", params: { tab: "history" } } as Href}
    />
  );
}
