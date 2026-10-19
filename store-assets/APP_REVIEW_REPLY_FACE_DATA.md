# App Review reply: Guideline 2.1 face data (submission e9f796b8, 2026-10-15)

`<...>` = only the owner can fill it. Do not send while any `<...>` is left.
Facts below come from the code (intania-one `components/timestamp/face-scan-camera.native.tsx`,
scooba-service `api::staff-face-stamp-log`, `api::face-enroll-quota`, `utils/photo-stamp.js`).

---

## 1. Privacy policy section (publish at the Privacy Policy URL first)

### ภาษาไทย

```
ข้อ <N>. ข้อมูลใบหน้า

<N>.1 ข้อมูลที่เก็บ
แอปใช้กล้องเพื่อลงเวลาด้วยใบหน้าสำหรับบุคลากรสายสนับสนุน และเพื่อลงทะเบียนใบหน้า โดยเก็บข้อมูลดังนี้
(ก) ภาพถ่ายใบหน้าตอนลงทะเบียน 2 ภาพ ซึ่งระบบจดจำใบหน้าของคณะนำไปสร้างข้อมูลแม่แบบใบหน้า (face template) ผูกกับรหัสบุคลากร
(ข) ภาพถ่ายใบหน้า 1 ภาพต่อการลงเวลา 1 ครั้ง พร้อมค่าความเหมือนของใบหน้า วันเวลา ตำแหน่งที่ตั้ง และหมายเลข IP ของ Wi-Fi
ระหว่างสแกน แอปตรวจตำแหน่งใบหน้าและการกะพริบตาบนเครื่องเท่านั้น ภาพจากกล้องระหว่างนี้ไม่ถูกบันทึกและไม่ถูกส่งออกจากเครื่อง
การล็อกแอปด้วย Face ID ใช้ระบบของ iOS แอปไม่ได้รับและไม่เก็บข้อมูลใบหน้าจาก Face ID

<N>.2 วัตถุประสงค์
ใช้ยืนยันว่าผู้ลงเวลาคือเจ้าของบัญชีที่เข้าสู่ระบบอยู่ และเป็นหลักฐานการลงเวลาปฏิบัติงานเท่านั้น
ไม่ใช้เพื่อการโฆษณา การติดตามพฤติกรรม หรือวัตถุประสงค์อื่น และไม่ขายข้อมูล

<N>.3 การจัดเก็บและการเปิดเผย
ข้อมูลส่งผ่านการเชื่อมต่อที่เข้ารหัส (HTTPS) และจัดเก็บบนเซิร์ฟเวอร์ของคณะวิศวกรรมศาสตร์
มหาวิทยาลัยสงขลานครินทร์ ในประเทศไทย ใช้ร่วมกับเครื่องสแกนใบหน้าหน้าประตูของคณะ
ไม่เปิดเผยหรือแบ่งปันให้บุคคลภายนอก ผู้เข้าถึงได้คือเจ้าหน้าที่ที่ได้รับมอบหมายด้านการบริหารงานบุคคลและระบบสารสนเทศของคณะเท่านั้น

<N>.4 ระยะเวลาการเก็บรักษา
ข้อมูลแม่แบบใบหน้าเก็บไว้ตลอดระยะเวลาที่เป็นบุคลากรของคณะ และลบภายใน <X วัน> หลังพ้นสภาพ
ภาพถ่ายการลงเวลาเก็บไว้ <X ปี> นับจากวันที่ลงเวลา แล้วจึงลบ

<N>.5 การลบและสิทธิของเจ้าของข้อมูล
บุคลากรขอลบข้อมูลใบหน้า หรือลงทะเบียนใบหน้าใหม่ได้ โดยติดต่อ <หน่วยงาน อีเมล โทรศัพท์>
การลบข้อมูลใบหน้าจะทำให้ลงเวลาด้วยใบหน้าไม่ได้จนกว่าจะลงทะเบียนใหม่ และยังลงเวลาด้วยวิธีอื่นของคณะได้ตามปกติ
```

### English

```
Section <N>. Face Data

<N>.1 What we collect
The app uses the camera for face-based attendance stamping by support staff and for face registration. It collects:
(a) two face photos at registration, from which the faculty's face recognition system creates a face template linked to the staff ID;
(b) one face photo per attendance stamp, together with the face match score, date and time, location and the Wi-Fi IP address.
While scanning, the app checks the face position and an eye blink on the device only; camera frames are not saved and do not leave the device.
The Face ID app lock uses iOS's own system; the app never receives or stores Face ID data.

<N>.2 How we use it
Only to verify that the person stamping attendance is the signed-in account holder, and as the record of that attendance stamp.
It is not used for advertising, tracking or any other purpose, and it is never sold.

<N>.3 Storage and sharing
Data is sent over an encrypted (HTTPS) connection and stored on servers of the Faculty of Engineering,
Prince of Songkla University, in Thailand. It is shared with the faculty's door face-scan terminals.
It is not disclosed or shared with any third party. Only authorized faculty HR and IT staff can access it.

<N>.4 Retention
The face template is kept while the person is a member of faculty staff and deleted within <X days> after they leave.
Attendance photos are kept for <X years> from the stamp date, then deleted.

<N>.5 Deletion and your rights
Staff may ask for their face data to be deleted, or register again, by contacting <unit, email, phone>.
After deletion, face stamping is unavailable until the person registers again; the faculty's other stamping methods still work.
```

---

## 2. Reply in App Store Connect (paste after the policy is live)

```
Hello,

Thank you for the review. Our answers about face data:

1. What face data does the app collect?
- Face registration: two face photos, from which our face recognition server creates a face template linked to the staff ID.
- Attendance stamping: one face photo per stamp, with the match score, time, location and Wi-Fi IP address.
- During the live scan, face position and eye blink (liveness) are detected on the device only. Those camera frames are not saved and are never sent.
- The optional Face ID app lock uses Apple's LocalAuthentication; the app receives only a pass/fail result and no face data.

2. Use, sharing, retention, deletion and storage
- Use: only to verify that the person stamping attendance is the signed-in staff member, and as the record of that stamp. Not used for advertising, tracking, analytics or any other purpose, and never sold.
- Storage: sent over HTTPS and stored only on servers owned and run by the Faculty of Engineering, Prince of Songkla University, in Thailand. Access is limited to authorized faculty HR and IT staff.
- Retention: kept only as long as necessary for the purpose above and as required by university regulations and applicable law; deleted or anonymised within a reasonable time once no longer needed (for example when the person leaves the faculty's staff).
- Deletion: staff can request deletion at any time through the contact in Section 7 of the policy (<unit, email>).

3. Shared with third parties? Where is it stored?
No. Face data is not shared with any third party. It is stored only on the faculty's own servers in Thailand (the same system used by the faculty's door face-scan terminals).

4. How long is face data retained?
Only as long as necessary for the purpose and as required by university regulations and applicable law; deleted or anonymised within a reasonable time once no longer needed (e.g. when the person leaves the faculty's staff).

5. Where in the privacy policy?
https://www.eng.psu.ac.th/en-v2024/intania-one-privacy (Thai: https://www.eng.psu.ac.th/intania-one-privacy), Section 2 "Face data": 2.1 what is collected, 2.2 purpose, 2.3 storage and sharing, 2.4 retention, 2.5 deletion and re-registration.

6. Quoted text from the privacy policy (Section 2):
"2.1 What is collected - At face registration: two face photos, from which the Faculty's face recognition system creates a face template linked to your staff ID. At each face-based attendance stamp: one face photo, with the match score, date and time, location and Wi-Fi IP address. While scanning, the App checks face position and an eye blink on your device only; those camera frames are not saved and do not leave the device. The Face ID / fingerprint app lock uses the operating system's own feature. The App receives only a pass/fail result and never receives or stores your face or fingerprint data.
2.2 Purpose: face data is used only to verify identity for clock-in/clock-out attendance stamping (that the person stamping is the signed-in account holder, and as the record of the stamp). It is not used for any other purpose, advertising or behavioural analysis, and is never sold.
2.3 Storage and sharing: data is sent over an encrypted (HTTPS) connection and stored on servers of the Faculty of Engineering, Prince of Songkla University, in Thailand, in the same system used by the Faculty's face-scan attendance terminals. It is not disclosed or shared with any third party. Only authorized Faculty HR and IT staff can access it.
2.4 Retention: the Faculty keeps face data and attendance photos only as long as necessary for the purpose above and as required by university regulations and applicable law. When no longer needed (for example when you leave the Faculty's staff), the data is deleted or anonymised within a reasonable time.
2.5 Deletion and re-registration: you may ask for your face data to be deleted under Section 7. After deletion, face stamping is unavailable until you register again; the Faculty's other stamping methods still work. Face registration in the App is your choice, and your consent is requested before you register."

Best regards,
<name>
```
