# นโยบายความเป็นส่วนตัว แอป Intania One (ร่าง)

`<...>` = ผู้ดูแลต้องกรอกเอง ก่อนเผยแพร่ควรให้เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลของคณะ/มหาวิทยาลัยตรวจอีกครั้ง
เนื้อหาด้านล่างเขียนจากการทำงานจริงของแอปและระบบหลังบ้าน (scooba-service) ณ 19 ต.ค. 2569
ข้อ 1.8 (ข้อมูลการใช้งาน ข้อผิดพลาด และข้อมูลอุปกรณ์) เพิ่มเมื่อ 28 ต.ค. 2569 สำหรับระบบ scooba-insight ต้องเผยแพร่ก่อนปล่อยแอปเวอร์ชันที่ส่งข้อมูลนี้
**`<รอยืนยันจาก DPO / นิติกร>`** ระบบนี้เข้าข่าย "ผู้ให้บริการ" ตาม พ.ร.บ.คอมพิวเตอร์ฯ มาตรา 26 หรือไม่ (ถ้าเข้าข่าย ห้ามลดอายุข้อมูลต่ำกว่า 90 วัน) และฐานทางกฎหมายของข้อ 1.8 (ประโยชน์โดยชอบด้วยกฎหมาย หรือความยินยอม)

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
ข้อมูลตามข้อ 1.8 เก็บด้วยระบบของคณะเองบนเซิร์ฟเวอร์ของคณะ ไม่ส่งให้บริการวิเคราะห์ข้อมูลหรือรายงานข้อผิดพลาดของบุคคลภายนอก
1.8 **ข้อมูลการใช้งาน ข้อผิดพลาด และข้อมูลอุปกรณ์** ผูกกับรหัสบุคลากรของท่าน ใช้เพื่อดูแลและปรับปรุงระบบ เก็บ 90 วัน และไม่เปิดเผยแก่บุคคลภายนอก ได้แก่
- **ข้อมูลอุปกรณ์** รุ่นและผู้ผลิตอุปกรณ์ ระบบปฏิบัติการและเวอร์ชัน เวอร์ชันแอปและหมายเลขบิลด์ เวอร์ชันการอัปเดตของแอป และประเภทเครือข่าย (Wi-Fi หรือเครือข่ายมือถือ) แอปไม่เก็บชื่อเครื่องที่ท่านตั้งไว้
- **รหัสการติดตั้ง (install ID)** รหัสสุ่มที่แอปสร้างขึ้นเมื่อติดตั้ง ใช้แยกแยะอุปกรณ์ในการดูแลระบบ ไม่ใช่รหัสโฆษณาและไม่ใช่รหัสประจำเครื่องจากผู้ผลิต และจะเปลี่ยนใหม่เมื่อลบแล้วติดตั้งแอปใหม่
- **ข้อมูลการเรียกใช้ระบบ** วันเวลา ส่วนของระบบที่เรียกใช้ (เช่น หน้าการลา หน้าการประชุม) ผลลัพธ์ (สำเร็จหรือรหัสข้อผิดพลาด) และเวลาที่ใช้ ไม่รวมเนื้อหาที่ท่านกรอกหรือข้อมูลที่ระบบตอบกลับ
- **ข้อผิดพลาดและแอปค้าง** ชื่อข้อผิดพลาด ข้อความข้อผิดพลาดที่ตัดข้อมูลส่วนบุคคลออกแล้ว ตำแหน่งในโค้ดแบบย่อ และประเภทปัญหาการเชื่อมต่อ (เช่น หมดเวลา ไม่มีอินเทอร์เน็ต)
- **ประสิทธิภาพ** เวลาเปิดแอปและเวลาโหลดหน้า
- **การใช้งานแอป** หน้าที่เปิด (เป็นชื่อหน้า ไม่ใช่ข้อมูลในหน้า) การแตะเปิดการแจ้งเตือน การไม่อนุญาตสิทธิ์ในเครื่อง และสถานะการอัปเดตแอป

ข้อมูลในข้อนี้**ไม่รวม**ชื่อ อีเมล หมายเลข IP ตำแหน่งที่ตั้ง ภาพใบหน้า โทเคน และเนื้อหาที่ท่านกรอก
หลังครบ 90 วัน ระบบลบข้อมูลรายการโดยอัตโนมัติ และเก็บไว้เฉพาะสถิติสรุปรายวันที่ไม่มีรหัสบุคลากรหรือรหัสการติดตั้ง (เช่น จำนวนผู้ใช้ต่อวัน อัตราข้อผิดพลาด) ไม่เกิน 13 เดือน เพื่อเทียบแนวโน้มปีต่อปี
เว้นแต่หน่วยงานรัฐที่มีอำนาจตามกฎหมายสั่งให้เก็บนานกว่านั้น ซึ่งจะเก็บเท่าที่ถูกสั่งเท่านั้น
ผู้เข้าถึงได้คือผู้ดูแลระบบของคณะที่ได้รับมอบหมาย หน้าจอดูแลระบบแสดงเป็นสถิติรวม ไม่แสดงรหัสบุคลากรหรือรหัสการติดตั้ง และระบบบันทึกทุกครั้งที่ผู้ดูแลเปิดดูข้อมูล

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
- ตรวจหาและแก้ไขข้อผิดพลาด ดูความเร็วและความเสถียรของระบบ และดูว่าฟีเจอร์ใดถูกใช้มากน้อยเพื่อวางแผนปรับปรุง (ข้อ 1.8)

## 4. การเปิดเผยข้อมูล
คณะไม่ขายและไม่แบ่งปันข้อมูลส่วนบุคคลของท่านให้บุคคลภายนอกเพื่อการตลาด
ข้อมูลอาจถูกเปิดเผยแก่ผู้บังคับบัญชาและเจ้าหน้าที่ของคณะ/มหาวิทยาลัยที่มีหน้าที่เกี่ยวข้อง ผู้ให้บริการส่งการแจ้งเตือนของระบบปฏิบัติการ (Apple, Google) ซึ่งได้รับเฉพาะโทเคนและข้อความแจ้งเตือน
และหน่วยงานรัฐเมื่อกฎหมายกำหนด

## 5. การเก็บรักษาและความปลอดภัย
ข้อมูลส่งผ่าน HTTPS การเข้าถึงมีการยืนยันตัวตน จำกัดเฉพาะผู้ที่ได้รับมอบหมาย และแอปสามารถล็อกด้วย Face ID ลายนิ้วมือ หรือรหัสผ่าน
คณะเก็บข้อมูลส่วนบุคคลเท่าที่จำเป็นตามวัตถุประสงค์ และตามระเบียบของมหาวิทยาลัยและกฎหมายที่เกี่ยวข้อง
ข้อมูลตามข้อ 1.8 เก็บ 90 วันแล้วลบโดยอัตโนมัติ สถิติสรุปรายวันที่ไม่ระบุตัวบุคคลเก็บไม่เกิน 13 เดือน

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
ผู้ไม่ได้เข้าสู่ระบบอ่านข่าวสาธารณะได้ แอปไม่เก็บข้อมูลบัญชี ตำแหน่งที่ตั้ง หรือข้อมูลใบหน้าของผู้ใช้ที่ไม่ได้เข้าสู่ระบบ
แอปยังส่งข้อมูลตามข้อ 1.8 โดยไม่มีรหัสบุคลากร (มีเพียงรหัสการติดตั้งและข้อมูลอุปกรณ์) และเก็บตามระยะเวลาเดียวกัน

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
The data in 1.8 is collected by the Faculty's own system and stored on the Faculty's servers; it is not sent to any third-party analytics or crash-reporting service.
1.8 **Usage, error and device data**: linked to your staff ID, used to maintain and improve the service, kept for 90 days and not disclosed to third parties. It consists of:
- **Device information**: device model and manufacturer, operating system and version, app version and build number, app update version, and network type (Wi-Fi or mobile data). The App does not collect the name you gave your device.
- **Install ID**: a random ID the App creates when it is installed, used to tell devices apart when maintaining the service. It is not an advertising ID or a manufacturer hardware ID, and it changes if you delete and reinstall the App.
- **Service requests**: date and time, which part of the service was called (for example leave or meetings), the result (success or an error code) and how long it took. It does not include what you type or the data the service returns.
- **Errors and crashes**: the error name, the error message with personal data removed, a shortened code location, and the type of connection problem (for example timeout or no internet).
- **Performance**: app start-up time and screen load time.
- **App usage**: screens opened (the screen name, not its contents), opening a notification, declining a device permission, and app update status.

This data does **not** include your name, email, IP address, location, face images, tokens or anything you type.
After 90 days the individual records are deleted automatically. Only daily summary statistics without staff IDs or install IDs (for example users per day, error rates) are kept, for up to 13 months, to compare trends year on year.
The only exception is when a government authority with legal power orders longer retention, in which case only what is ordered is kept.
Only authorized Faculty system administrators can access it. The administration screens show aggregate statistics only, never staff IDs or install IDs, and every time an administrator views the data is logged.

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
- To find and fix errors, monitor the speed and stability of the service, and see how much each feature is used so improvements can be planned (Section 1.8)

## 4. Disclosure
The Faculty does not sell your personal data or share it with third parties for marketing. Data may be disclosed to your supervisors and Faculty/University staff with relevant duties,
to the operating-system notification services (Apple, Google), which receive only a token and the notification text, and to government bodies where the law requires.

## 5. Security and retention
Data is sent over HTTPS, access requires authentication and is limited to authorized staff, and the App can be locked with Face ID, fingerprint or a passcode.
The Faculty keeps personal data only as long as necessary for its purposes and as required by university regulations and applicable law.
The data in Section 1.8 is kept for 90 days and then deleted automatically; daily summary statistics that identify no one are kept for up to 13 months.

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
People who are not signed in can read public news. The App collects no account, location or face data from users who are not signed in.
It still sends the data in Section 1.8 without a staff ID (only the install ID and device information), kept for the same periods.

## 9. Changes
If we make material changes we will announce them in the App or on this page, with the updated date.

## 10. Contact
<unit name>, Faculty of Engineering, Prince of Songkla University, <address>, email <email>, phone <phone>
