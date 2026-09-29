import { Redirect, type Href } from 'expo-router';

/** `/comp-ot` - the home tile and any older link - opens on the roster tab. */
export default function CompOtIndexRedirect() {
  return <Redirect href={'/comp-ot/schedule' as Href} />;
}
