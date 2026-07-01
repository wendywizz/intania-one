import { Redirect, type Href } from "expo-router";

// The forgot-timestamp screen (list + history) lives in `forgot-timestamp.tsx`.
// This index keeps the bare `/timestamp` URL working by redirecting to it.
export default function TimestampIndexRedirect() {
  return <Redirect href={"/timestamp/forgot-timestamp" as Href} />;
}
