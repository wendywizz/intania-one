import { Redirect, type Href } from "expo-router";

import { useAuth } from "@/context/AuthContext";

/**
 * Which tab `/timestamp` opens on.
 *
 * A lecturer's first business in this module is stamping today, so they land on
 * `stamp`; everyone else keeps landing on the calendar, which is where the menu
 * used to point directly.
 *
 * The branch lives here rather than in the home screen's `MODULE_HREF` so that
 * there is one answer to "which tab is first" — and so a deep link or a
 * notification tap into `/timestamp` lands in the same place the menu does.
 *
 * `isLecturer` is settled from AsyncStorage before the first paint, so this
 * redirect does not wait on the network and no loader is needed.
 */
export default function TimestampIndexRedirect() {
  const { isLecturer } = useAuth();

  return (
    <Redirect
      href={(isLecturer ? "/timestamp/stamp" : "/timestamp/calendar") as Href}
    />
  );
}
