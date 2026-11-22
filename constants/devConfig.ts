// Demo mode — the App Review account (services/demo/demoMode.ts). Unlike the
// dev overrides below this one DOES ship: keep it true in any build sent to App
// Review, or the reviewer has no way to sign in. false hides the
// "บัญชีทดสอบ (Demo account)" link and signs out a stored demo session.
export const DEMO_MODE_ENABLED: boolean = true;

// The app has two modes, chosen by how the user signs in (not by this file):
//  - Production: PSU Passport (OpenID) sign-in. Real user, real servers, the
//    camera picture is what gets stamped. Nothing below changes it.
//  - Demo: the "บัญชีทดสอบ (Demo account)" sign-in. Fixture data everywhere,
//    except ลงเวลาบุคลากร while DEMO_LIVE_FACE_STAMP is on (below).
//
// Demo account + REAL face stamp: while true, a demo session's ลงเวลาบุคลากร
// (status, face scan, face enroll) skips the fixtures and goes to the real
// server as the test account DEMO_LIVE_STAFF_ID (services/demo/demoMode.ts),
// which scooba lets stamp at any hour (STAFF_STAMP_TEST_IDS). The upload is
// the bundled test photo assets/images/demo-face-test.jpg, not the camera
// frame (faceStampPhotoUri). Every other demo screen stays on fixtures. Set
// false before building for App Review: the reviewer is off the faculty
// network and would only see refusals.
export const DEMO_LIVE_FACE_STAMP: boolean = true;

// Dev overrides — must be empty/null before building for production.
// Set DEV_STAFF_ID to a UNI_STAFF_ID to impersonate that user across ALL features.
//
// `export let` + plain reassignments below (not `export const` per line) on
// purpose: AuthContext imports DEV_STAFF_ID by name, so the export has to stay
// live even with every line below commented out, and a `let` lets exactly one
// uncommented reassignment win without redeclaring the binding.
export let DEV_STAFF_ID: string = '';

//DEV_STAFF_ID = '0024020'; // พี่นเรศ
//DEV_STAFF_ID = '0030514'; // พี่ตา อาคาร
//DEV_STAFF_ID = '0027754'; // ชาติวัฒนา
//DEV_STAFF_ID = '0002656'; // พี่ยุทธนา
//DEV_STAFF_ID = '0004754'; // พีจำนงค์
//DEV_STAFF_ID = '0028126'; // พี่แน็ค
//DEV_STAFF_ID = '0044715'; // พี่หรอโชค
//DEV_STAFF_ID = '0024028'; // ฉัน
//DEV_STAFF_ID = '0000335'; // พี่ปิ
//DEV_STAFF_ID = '0000340'; // พี่หนี
//DEV_STAFF_ID = '0047773'; // โบ้
//DEV_STAFF_ID = '0024025'; // พี่วัช
//DEV_STAFF_ID = '0047785'; // บี
//DEV_STAFF_ID = '0024022'; // ป๋าวัน
//DEV_STAFF_ID = '0000297'; // มนตรี
//DEV_STAFF_ID = '0008284'; // นิคม
//DEV_STAFF_ID = '0000321'; // เสกสรร
//DEV_STAFF_ID = '0008380'; // ธนิยา
//DEV_STAFF_ID = '0000301'; // พี่อ้อ
//DEV_STAFF_ID = '0011688'; // พี่คมเนต
//DEV_STAFF_ID = '0039506'; // ปาย
//DEV_STAFF_ID = '0024056'; // เอียด

// Set DEV_LOCATION to skip the real GPS/browser-permission fix and feed every
// stamp screen (ลงเวลาอาจารย์, ลงเวลาบุคลากรทั่วไป) this position instead —
// useful on web, where each reload re-asks for the location permission, and
// indoors, where a real fix can be slow or unavailable.
// The fence centre itself, copied from the upstream's own constants (staff.php
// and lecturer.php). The pair that used to sit here was labelled คณะวิศวะ but
// measured 4.86 km from that centre, so every dev build reported itself far
// outside the faculty. Set to null to test against a real fix instead.
export const DEV_LOCATION: { lat: number; lon: number } | null = {
  lat: 7.006754432048102,
  lon: 100.50110828545463,
}; // คณะวิศวะ - จุดศูนย์กลางรั้ว geofence ของ staff.php/lecturer.php
