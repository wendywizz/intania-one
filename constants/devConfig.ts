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
DEV_STAFF_ID = '0008380'; // ธนิยา
//DEV_STAFF_ID = '0000301'; // พี่อ้อ
//DEV_STAFF_ID = '0011688'; // พี่คมเนต
//DEV_STAFF_ID = '0039506'; // ปาย

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
