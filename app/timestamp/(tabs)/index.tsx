import { Redirect, type Href } from "expo-router";

import { useAuth } from "@/context/AuthContext";

/**
 * Which tab `/timestamp` opens on.
 *
 * Stamping today is the first business of anybody who stamps, so they land on
 * their own stamping screen — which one depends on how their working day is
 * shaped, not on a preference:
 *
 *   lecturer  one row a day at constant times          -> stamp
 *   staff     arrival and departure at real times      -> staff-stamp
 *   guard     shift windows of their own, no screen yet -> calendar
 *
 * The branch lives here rather than in the home screen's `MODULE_HREF` so that
 * there is one answer to "which tab is first", and so a deep link or a
 * notification tap into `/timestamp` lands where the menu does.
 *
 * `stampRole` is settled from AsyncStorage before the first paint, so this
 * redirect waits on nothing and needs no loader.
 */
export default function TimestampIndexRedirect() {
  const { stampRole } = useAuth();

  const target =
    stampRole === 'lecturer'
      ? '/timestamp/stamp'
      : stampRole === 'staff'
        ? '/timestamp/staff-stamp'
        : '/timestamp/calendar';

  return <Redirect href={target as Href} />;
}
