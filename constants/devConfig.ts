// Dev overrides — must be empty/null before building for production.
// Set DEV_STAFF_ID to a UNI_STAFF_ID to impersonate that user across ALL features.

//export const DEV_STAFF_ID: string = '0024020'; // พี่นเรศ
//export const DEV_STAFF_ID: string = '0030514'; // พี่ตา อาคาร
//export const DEV_STAFF_ID: string = '0027754'; // ชาติวัฒนา
//export const DEV_STAFF_ID: string = '0002656'; // พี่ยุทธนา
//export const DEV_STAFF_ID: string = '0004754'; // พีจำนงค์
//export const DEV_STAFF_ID: string = '0028126'; // พี่แน็ค
//export const DEV_STAFF_ID: string = '0044715'; // พี่หรอโชค
//export const DEV_STAFF_ID: string = '0024028'; // ฉัน
//export const DEV_STAFF_ID: string = '0000335'; // พี่ปิ
//export const DEV_STAFF_ID: string = '0000340'; // พี่หนี
//export const DEV_STAFF_ID: string = '0047773'; // โบ้
//export const DEV_STAFF_ID: string = '0024025'; // พี่วัช
//export const DEV_STAFF_ID: string = '0047785'; // บี
//export const DEV_STAFF_ID: string = '0024022'; // ป๋าวัน
//export const DEV_STAFF_ID: string = '0000297'; // มนตรี
//export const DEV_STAFF_ID: string = '0008284'; // นิคม
//export const DEV_STAFF_ID: string = '0000321'; // เสกสรร
//export const DEV_STAFF_ID: string = '0008380'; // ธนิยา
//export const DEV_STAFF_ID: string = '0000301'; // พี่อ้อ
//export const DEV_STAFF_ID: string = '0011688'; // พี่คมเนต
//export const DEV_STAFF_ID: string = '0039506'; // ปาย

// Set DEV_LOCATION to skip the real GPS/browser-permission fix and feed every
// stamp screen (ลงเวลาอาจารย์, ลงเวลาบุคลากรทั่วไป) this position instead —
// useful on web, where each reload re-asks for the location permission, and
// indoors, where a real fix can be slow or unavailable.
export const DEV_LOCATION: { lat: number; lon: number } | null = { lat: 7.002, lon: 100.4573 }; // คณะวิศวะ
