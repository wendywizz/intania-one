# นโยบายความเป็นส่วนตัว แอป Intania One (ร่าง)

`<...>` = ผู้ดูแลต้องกรอกเอง ก่อนเผยแพร่ควรให้เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลของคณะ/มหาวิทยาลัยตรวจอีกครั้ง
เนื้อหาด้านล่างเขียนจากการทำงานจริงของแอปและระบบหลังบ้าน (scooba-service) ณ 19 ต.ค. 2569

---

## ภาษาไทย

# นโยบายความเป็นส่วนตัว แอป Intania One

คณะวิศวกรรมศาสตร์ มหาวิทยาลัยสงขลานครินทร์ ("คณะ") เป็นผู้ให้บริการแอป Intania One ("แอป") สำหรับบุคลากรของคณะ
นโยบายนี้อธิบายว่าคณะเก็บ ใช้ เปิดเผย และเก็บรักษาข้อมูลส่วนบุคคลของท่านอย่างไร
ปรับปรุงล่าสุด: <วันที่>

## เกี่ยวกับแอป
Intania One เป็นแอปบนมือถือและแท็บเล็ต (iOS และ Android) ที่รวมงานบริการภายในของคณะไว้ในที่เดียว สำหรับ**บุคลากรของคณะวิศวกรรมศาสตร์ มหาวิทยาลัยสงขลานครินทร์** ได้แก่
- ลงเวลาเข้า-ออกงาน ดูปฏิทินการสแกนรายเดือน และแจ้งลืมลงเวลา
- ยื่นใบลา และดูวันลาคงเหลือ
- ดูการประชุม เอกสารวาระ เวร และตารางคุมสอบ
- แจ้งซ่อมคอมพิวเตอร์และแจ้งซ่อมทั่วไป พร้อมติดตามสถานะ
- จองห้องและดูตารางการใช้ห้อง
- อ่านข่าวของคณะ ดูปฏิทินผู้บริหาร ค้นหาบุคลากร และรับการแจ้งเตือนเรื่องที่รอท่านดำเนินการ

การใช้งานส่วนใหญ่ต้องเข้าสู่ระบบด้วยบัญชี PSU Passport ของมหาวิทยาลัย ผู้ที่ไม่ได้เป็นบุคลากรและไม่ได้เข้าสู่ระบบอ่านข่าวสาธารณะได้
ข้อมูลที่แอปแสดงและบันทึกมาจากระบบสารสนเทศของคณะและมหาวิทยาลัย ซึ่งคณะเป็นผู้ควบคุมข้อมูล (data controller) การใช้แอปถือว่าท่านรับทราบนโยบายนี้

## 1. ข้อมูลที่เราเก็บ
1.1 **ข้อมูลบัญชี** ชื่อ-นามสกุล อีเมล รหัสบุคลากร และหน่วยงาน ได้จากบัญชี PSU Passport ที่ท่านใช้เข้าสู่ระบบ
1.2 **ข้อมูลการลงเวลาและการทำงาน** เวลาเข้า-ออกงาน ใบลา การแจ้งลืมลงเวลา การประชุม การจองห้อง และเรื่องแจ้งซ่อม รวมถึงรูปที่ท่านแนบในเรื่องแจ้งซ่อม
1.3 **ตำแหน่งที่ตั้ง** พิกัดของอุปกรณ์ขณะลงเวลา เพื่อตรวจว่าอยู่ในพื้นที่คณะ แอปไม่ติดตามตำแหน่งขณะไม่ได้ลงเวลา
1.4 **หมายเลข IP ของ Wi-Fi** ที่อุปกรณ์เชื่อมต่อขณะลงเวลา
1.5 **ข้อมูลใบหน้า** ดูข้อ 2
1.6 **ข้อมูลอุปกรณ์สำหรับแจ้งเตือน** โทเคนการแจ้งเตือน (push token) เพื่อส่งการแจ้งเตือนเรื่องที่รอท่านดำเนินการ
1.7 **ข้อมูลที่ไม่เก็บ** แอปไม่มีโฆษณา ไม่ใช้เครื่องมือติดตามพฤติกรรมของบุคคลภายนอก และไม่ขายข้อมูล

## 2. ข้อมูลใบหน้า
2.1 **เก็บอะไร**
- ตอนลงทะเบียนใบหน้า: ภาพถ่ายใบหน้า 2 ภาพ ซึ่งระบบจดจำใบหน้าของคณะใช้สร้างข้อมูลแม่แบบใบหน้า (face template) ผูกกับรหัสบุคลากรของท่าน
- ตอนลงเวลาด้วยใบหน้า: ภาพถ่ายใบหน้า 1 ภาพต่อการลงเวลา 1 ครั้ง พร้อมค่าความเหมือน วันเวลา ตำแหน่ง และหมายเลข IP ของ Wi-Fi
- ระหว่างสแกน แอปตรวจตำแหน่งใบหน้าและการกะพริบตาบนเครื่องของท่านเท่านั้น ภาพจากกล้องช่วงนี้ไม่ถูกบันทึกและไม่ถูกส่งออก
- การล็อกแอปด้วย Face ID หรือลายนิ้วมือ ใช้ระบบของ iOS/Android แอปได้รับเพียงผลผ่าน/ไม่ผ่าน ไม่ได้รับและไม่เก็บข้อมูลใบหน้าหรือลายนิ้วมือ

2.2 **ใช้เพื่ออะไร** ใช้ยืนยันตัวตนเพื่อลงเวลาเข้า-ออกงานเท่านั้น (ยืนยันว่าผู้ลงเวลาคือเจ้าของบัญชีที่เข้าสู่ระบบอยู่ และเป็นหลักฐานการลงเวลา)
ไม่ใช้เพื่อวัตถุประสงค์อื่น ไม่ใช้โฆษณา ไม่ใช้วิเคราะห์พฤติกรรม และไม่ขายข้อมูล

2.3 **เก็บที่ไหน** ส่งผ่านการเชื่อมต่อที่เข้ารหัส (HTTPS) และจัดเก็บบนเซิร์ฟเวอร์ของคณะวิศวกรรมศาสตร์ มหาวิทยาลัยสงขลานครินทร์ ในประเทศไทย
ใช้ระบบเดียวกับเครื่องสแกนใบหน้าลงเวลาของคณะ ไม่เปิดเผยหรือแบ่งปันให้บุคคลภายนอก
ผู้เข้าถึงได้คือเจ้าหน้าที่ของคณะที่ได้รับมอบหมายด้านงานบุคคลและระบบสารสนเทศเท่านั้น

2.4 **เก็บนานแค่ไหน** คณะเก็บข้อมูลใบหน้าและภาพการลงเวลาเท่าที่จำเป็นตามวัตถุประสงค์ข้างต้น และตามระเบียบของมหาวิทยาลัยและกฎหมายที่เกี่ยวข้อง
เมื่อหมดความจำเป็น (เช่น ท่านพ้นสภาพการเป็นบุคลากร) คณะจะลบหรือทำให้ไม่สามารถระบุตัวตนได้ภายในเวลาอันสมควร

2.5 **การลบและการลงทะเบียนใหม่** ท่านขอลบข้อมูลใบหน้าได้ตามข้อ 7 หลังลบแล้วจะลงเวลาด้วยใบหน้าไม่ได้จนกว่าจะลงทะเบียนใหม่
และยังลงเวลาด้วยวิธีอื่นของคณะได้ตามปกติ การลงทะเบียนใบหน้าในแอปเป็นไปโดยท่านเลือกเอง และจะขอความยินยอมจากท่านก่อนลงทะเบียน

## 3. เราใช้ข้อมูลเพื่ออะไร
- ยืนยันตัวตนและให้ท่านใช้งานแอป
- บันทึกและตรวจสอบการลงเวลา การลา การประชุม การจองห้อง และการแจ้งซ่อม
- ส่งการแจ้งเตือนเรื่องที่รอท่านดำเนินการ
- รักษาความปลอดภัยและตรวจสอบการใช้งานที่ผิดปกติ

## 4. การเปิดเผยข้อมูล
คณะไม่ขายและไม่แบ่งปันข้อมูลส่วนบุคคลของท่านให้บุคคลภายนอกเพื่อการตลาด
ข้อมูลอาจถูกเปิดเผยแก่ผู้บังคับบัญชาและเจ้าหน้าที่ของคณะ/มหาวิทยาลัยที่มีหน้าที่เกี่ยวข้อง ผู้ให้บริการส่งการแจ้งเตือนของระบบปฏิบัติการ (Apple, Google) ซึ่งได้รับเฉพาะโทเคนและข้อความแจ้งเตือน
และหน่วยงานรัฐเมื่อกฎหมายกำหนด

## 5. การเก็บรักษาและความปลอดภัย
ข้อมูลส่งผ่าน HTTPS การเข้าถึงมีการยืนยันตัวตน จำกัดเฉพาะผู้ที่ได้รับมอบหมาย และแอปสามารถล็อกด้วย Face ID ลายนิ้วมือ หรือรหัสผ่าน
คณะเก็บข้อมูลส่วนบุคคลเท่าที่จำเป็นตามวัตถุประสงค์ และตามระเบียบของมหาวิทยาลัยและกฎหมายที่เกี่ยวข้อง

## 6. สิ่งที่แอปขออนุญาตในเครื่อง
- **กล้อง** ลงเวลา/ลงทะเบียนด้วยใบหน้า และแนบรูปในเรื่องแจ้งซ่อม
- **ตำแหน่งที่ตั้ง** ตรวจพื้นที่ขณะลงเวลา
- **Face ID / ลายนิ้วมือ** ล็อกแอป (ทางเลือก)
- **การแจ้งเตือน** แจ้งเรื่องที่รอท่านดำเนินการ
ท่านปิดสิทธิ์เหล่านี้ได้ในการตั้งค่าเครื่อง โดยฟีเจอร์ที่เกี่ยวข้องจะใช้ไม่ได้

## 7. สิทธิของท่าน
ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ท่านมีสิทธิขอเข้าถึง ขอสำเนา แก้ไข ลบ ระงับการใช้ คัดค้าน และเพิกถอนความยินยอม
ติดต่อ: <หน่วยงาน> อีเมล <อีเมล> โทร <เบอร์โทร> คณะจะตอบภายใน <จำนวน> วัน
การเพิกถอนความยินยอมไม่กระทบการประมวลผลที่ทำไปแล้วก่อนหน้านั้น

## 8. ผู้ที่ไม่ใช่บุคลากร
ผู้ไม่ได้เข้าสู่ระบบอ่านข่าวสาธารณะได้ แอปไม่เก็บข้อมูลส่วนบุคคลของผู้ใช้ที่ไม่ได้เข้าสู่ระบบ

## 9. การเปลี่ยนแปลงนโยบาย
หากมีการแก้ไขสาระสำคัญ คณะจะแจ้งในแอปหรือบนหน้านี้ พร้อมวันที่ปรับปรุงล่าสุด

## 10. ติดต่อคณะ
<ชื่อหน่วยงาน> คณะวิศวกรรมศาสตร์ มหาวิทยาลัยสงขลานครินทร์ <ที่อยู่> อีเมล <อีเมล> โทร <เบอร์โทร>

---

## English

# Privacy Policy: Intania One app

The Faculty of Engineering, Prince of Songkla University (the "Faculty") provides the Intania One app (the "App") for its staff.
This policy explains how the Faculty collects, uses, discloses and retains your personal data. Last updated: <date>

## About the app
Intania One is a phone and tablet app (iOS and Android) that brings the Faculty's internal services together in one place, for **staff of the Faculty of Engineering, Prince of Songkla University**. It lets staff:
- clock in and out, view a monthly scan calendar and report a missed scan;
- file leave requests and see remaining leave;
- view meetings with agenda documents, duty rosters and exam invigilation schedules;
- report computer or general repair requests and follow their status;
- book rooms and see room schedules;
- read faculty news, view the executive calendar, search for staff and receive notifications about items waiting on them.

Most features require signing in with a university PSU Passport account. People who are not staff and are not signed in can read public news.
The information the app shows and records comes from the Faculty's and University's information systems, for which the Faculty is the data controller. By using the app you acknowledge this policy.

## 1. Data we collect
1.1 **Account data**: name, email, staff ID and department, from the PSU Passport account you sign in with.
1.2 **Attendance and work data**: clock-in/out times, leave requests, missed-scan reports, meetings, room bookings and repair requests, including photos you attach to a repair request.
1.3 **Location**: the device's coordinates at the moment you stamp attendance, to check you are within the faculty area. The App does not track your location otherwise.
1.4 **Wi-Fi IP address** of the network the device is on when you stamp.
1.5 **Face data**: see Section 2.
1.6 **Notification token** (push token), to send you notifications about items waiting on you.
1.7 **What we do not do**: the App has no ads, uses no third-party behavioural tracking, and never sells data.

## 2. Face data
2.1 **What is collected**
- At face registration: two face photos, from which the Faculty's face recognition system creates a face template linked to your staff ID.
- At each face-based attendance stamp: one face photo, with the match score, date and time, location and Wi-Fi IP address.
- While scanning, the App checks face position and an eye blink on your device only; those camera frames are not saved and do not leave the device.
- The Face ID / fingerprint app lock uses the operating system's own feature. The App receives only a pass/fail result and never receives or stores your face or fingerprint data.

2.2 **Purpose**: face data is used only to verify identity for clock-in/clock-out attendance stamping (that the person stamping is the signed-in account holder, and as the record of the stamp).
It is not used for any other purpose, advertising or behavioural analysis, and is never sold.

2.3 **Storage and sharing**: data is sent over an encrypted (HTTPS) connection and stored on servers of the Faculty of Engineering, Prince of Songkla University, in Thailand,
in the same system used by the Faculty's face-scan attendance terminals. It is not disclosed or shared with any third party. Only authorized Faculty HR and IT staff can access it.

2.4 **Retention**: the Faculty keeps face data and attendance photos only as long as necessary for the purpose above and as required by university regulations and applicable law.
When no longer needed (for example when you leave the Faculty's staff), the data is deleted or anonymised within a reasonable time.

2.5 **Deletion and re-registration**: you may ask for your face data to be deleted under Section 7. After deletion, face stamping is unavailable until you register again;
the Faculty's other stamping methods still work. Face registration in the App is your choice, and your consent is requested before you register.

## 3. How we use data
- To verify your identity and let you use the App
- To record and review attendance, leave, meetings, room bookings and repairs
- To send notifications about items waiting on you
- To keep the service secure and detect unusual use

## 4. Disclosure
The Faculty does not sell your personal data or share it with third parties for marketing. Data may be disclosed to your supervisors and Faculty/University staff with relevant duties,
to the operating-system notification services (Apple, Google), which receive only a token and the notification text, and to government bodies where the law requires.

## 5. Security and retention
Data is sent over HTTPS, access requires authentication and is limited to authorized staff, and the App can be locked with Face ID, fingerprint or a passcode.
The Faculty keeps personal data only as long as necessary for its purposes and as required by university regulations and applicable law.

## 6. Device permissions
- **Camera**: face stamping/registration and repair photos
- **Location**: area check when stamping
- **Face ID / fingerprint**: optional app lock
- **Notifications**: items waiting on you
You can turn these off in device settings; the related features will then not work.

## 7. Your rights
Under Thailand's Personal Data Protection Act B.E. 2562 (2019) you may request access, a copy, correction, deletion, restriction, objection and withdrawal of consent.
Contact: <unit>, email <email>, phone <phone>. The Faculty will respond within <number> days. Withdrawing consent does not affect processing done before it.

## 8. Non-staff users
People who are not signed in can read public news. The App collects no personal data from users who are not signed in.

## 9. Changes
If we make material changes we will announce them in the App or on this page, with the updated date.

## 10. Contact
<unit name>, Faculty of Engineering, Prince of Songkla University, <address>, email <email>, phone <phone>
