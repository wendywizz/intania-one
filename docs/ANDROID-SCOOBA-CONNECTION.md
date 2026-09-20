# Android รุ่นเก่าเชื่อมต่อ scooba-service ไม่ได้

ตรวจสอบและยืนยันสาเหตุแล้วเมื่อ 2026-09-20

## สรุปปัญหา

อุปกรณ์ Android บางรุ่นเปิดแอปได้ แต่หน้าแรกแจ้งว่าเชื่อมต่อ scooba-service ไม่ได้
(health gate ใน `services/healthService.ts` ตอบ `false`)

| อุปกรณ์ | Android | ผลลัพธ์ |
|---|---:|---|
| Samsung Galaxy S24+ | 15 / 16 | ใช้งานได้ |
| Samsung Galaxy A52s 5G | 14 | เชื่อมต่อไม่ได้ |
| HUAWEI P20 Pro CLT-L29 | 10 | เชื่อมต่อไม่ได้ |

ไม่ใช่ปัญหา `minSdkVersion` แอปตั้งไว้ที่ 26 (Android 8.0) และ Android 10 คือ API 29

## สาเหตุ: server ส่ง certificate chain ไม่ครบ

`apis.eng.psu.ac.th` ส่ง certificate มาเพียง 2 ใบ

```text
0  s: CN=*.eng.psu.ac.th
   i: C=AT, O=ZeroSSL GmbH, CN=ZeroSSL ECC DV SSL CA 2
1  s: C=AT, O=ZeroSSL GmbH, CN=ZeroSSL ECC DV SSL CA 2
   i: C=GB, O=Sectigo Limited, CN=Sectigo Public Server Authentication Root E46
```

ใบที่ 1 ออกโดย **Sectigo Public Server Authentication Root E46** ซึ่งเป็น root ที่สร้างเมื่อ
2021-03-22 root ตัวนี้อยู่ใน trust store ของ Android รุ่นใหม่ แต่ **ไม่อยู่ใน Android รุ่นเก่า**
เพราะ trust store ของ Android ถูกแช่ไว้ตามเวอร์ชันของ OS ไม่ได้อัปเดตตามเครื่อง

ดังนั้น Android 15/16 หา root เจอจึงผ่าน ส่วน Android 10 และ 14 หาไม่เจอ
TLS handshake ล้ม แอปจึงรายงานว่าเชื่อมต่อไม่ได้

### การพิสูจน์

จำลอง trust store ของเครื่องเก่า โดยเชื่อถือเฉพาะ `USERTrust ECC Certification Authority`
(root เก่าที่ Android ทุกรุ่นที่ใช้งานอยู่มีแน่นอน)

```bash
# ก. chain ที่ server ส่งอยู่ตอนนี้
openssl verify -CAfile usertrust-ecc.pem -untrusted zerossl-intermediate.pem leaf.pem
# -> error 20 at 1 depth lookup: unable to get local issuer certificate
# -> verification failed

# ข. chain เดิม + cross-signed E46
openssl verify -CAfile usertrust-ecc.pem \
  -untrusted <(cat zerossl-intermediate.pem e46-cross.pem) leaf.pem
# -> OK
```

ผลนี้ตรงกับอาการที่พบบนเครื่องจริงทุกประการ

## ⚠️ certificate ใกล้หมดอายุ

```text
notBefore = Jun 24 00:00:00 2026 GMT
notAfter  = Sep 22 23:59:59 2026 GMT
```

เหลืออีก 2 วันนับจากวันที่ตรวจสอบ ต้องต่ออายุก่อน ไม่เช่นนั้นจะใช้งานไม่ได้ทุกเครื่องทุกแพลตฟอร์ม
ตอนต่ออายุให้ติดตั้ง chain ให้ครบตามหัวข้อถัดไปในคราวเดียว

## วิธีแก้

### ทาง ก. แก้ที่ server (ควรทำ)

เพิ่ม cross-signed E46 เข้าไปใน chain ที่ server ส่ง ให้กลายเป็น 3 ใบ

```text
0  leaf                  CN=*.eng.psu.ac.th
1  intermediate          ZeroSSL ECC DV SSL CA 2
2  cross-signed root     Sectigo Public Server Authentication Root E46
                         (ออกโดย USERTrust ECC Certification Authority)
```

**ติดตั้งที่เครื่องไหน** — ไม่ใช่ Kubernetes cluster ของ scooba

```text
apis.eng.psu.ac.th   -> CNAME apigateway.eng.psu.ac.th -> 172.31.0.135   <- แอปใช้ตัวนี้
create.eng.psu.ac.th ----------------------------------> 172.31.0.189   <- Kong ingress ของ cluster
```

คนละเครื่อง คนละ IP การแก้ `scooba-service/k8s/base/ingress.yaml` **ไม่ทำให้
certificate ของ `apis.eng.psu.ac.th` เปลี่ยน** ต้องติดตั้งบน
`apigateway.eng.psu.ac.th` ซึ่งเป็น API gateway กลางของคณะ อยู่นอก repo
ทั้งสองโดเมนใช้ wildcard ใบเดียวกันและพังเหมือนกัน ควรแก้ทั้งคู่

ดาวน์โหลดใบที่ 2 จาก Sectigo

```bash
curl -O http://crt.sectigo.com/SectigoPublicServerAuthenticationRootE46_USERTrust.crt
openssl x509 -inform DER -in SectigoPublicServerAuthenticationRootE46_USERTrust.crt \
  -out e46-cross.pem
```

แล้วต่อท้าย leaf กับ intermediate ให้เป็น 3 ใบ

**ไฟล์และสคริปต์เตรียมไว้ให้แล้วที่ `scooba-service/k8s/tls/`** ไม่ต้องทำเองทีละขั้น

```bash
cd scooba-service/k8s/tls

# ประกอบ fullchain (ใช้ private key เดิม ไม่ต้องเปลี่ยน)
./build-fullchain.sh /path/to/new-leaf.crt fullchain.pem

# ตรวจก่อนและหลังติดตั้ง
./verify-legacy-android.sh apis.eng.psu.ac.th
```

`chain.pem` ในโฟลเดอร์นั้นคือ intermediate + cross-signed root
**ตั้งครั้งเดียวใช้ยาวถึงปี 2035** ตอนต่ออายุ leaf ทุก ~90 วัน แค่รัน
`build-fullchain.sh` กับ leaf ใบใหม่ ไม่ต้องไปหา cross cert ใหม่

ข้อดีของทางนี้คือแก้ให้ทุก client พร้อมกัน — เบราว์เซอร์บนมือถือเก่า iOS แอปอื่น
และระบบอื่นที่เรียก `*.eng.psu.ac.th` ไม่ใช่เฉพาะแอป intania-one

USERTrust ECC Certification Authority หมดอายุ Jan 2038 และอยู่ใน trust store
มาตั้งแต่ Android รุ่นแรก ๆ จึงครอบคลุมเครื่องเก่าทั้งหมด

### ทาง ข. แก้ในแอป (มีอยู่แล้วใน repo)

`plugins/with-android-scooba-network-security.js` ฝัง root E46 ไว้ในแอปเป็น trust anchor
เพิ่มเติมสำหรับ `apis.eng.psu.ac.th` อยู่แล้ว

ตรวจสอบแล้วว่า root ที่ฝังไว้ **ใช้ยืนยัน chain จริงของ server ได้**

```bash
openssl verify \
  -CAfile android/app/src/main/res/raw/sectigo_public_server_authentication_root_e46.pem \
  -untrusted zerossl-intermediate.pem leaf.pem
# -> OK
```

แปลว่าโค้ดฝั่งแอปถูกต้องแล้ว เหลือแค่ build APK ใหม่จาก commit ปัจจุบัน

ข้อจำกัดของทางนี้: แก้ได้เฉพาะแอปนี้ และผูกกับ root ตัวนี้ ถ้าวันหนึ่ง server
เปลี่ยนไปใช้ CA อื่น จะต้องออก APK ใหม่อีกครั้ง — จึงควรทำทาง ก. ควบคู่ไปด้วย

## ทำไมการแก้รอบก่อนไม่ได้ผล

ลำดับ commit ที่เกี่ยวข้อง

```text
efb7802  2026-09-17 10:57  เพิ่ม plugin ฝัง root E46 (ครอบคลุมเฉพาะ apis.eng.psu.ac.th)
9877ec5  2026-09-18 13:20  เปลี่ยน endpoint ไป create.eng.psu.ac.th
5f124cd  2026-09-18 13:46  rollback กลับมา apis.eng.psu.ac.th
```

ระหว่าง `9877ec5` แอปชี้ไปที่ `create.eng.psu.ac.th` ซึ่ง **ไม่อยู่ใน domain-config**
ของ network security config ที่ระบุไว้แค่ `apis.eng.psu.ac.th` root ที่ฝังไว้จึงไม่ถูกใช้เลย
APK ที่ทดสอบในช่วงนั้นเท่ากับไม่มี fix

ตอนนี้ HEAD ชี้กลับมาที่ `apis.eng.psu.ac.th` แล้ว ซึ่งตรงกับ domain-config
**APK ที่ build จาก HEAD ปัจจุบันจึงควรใช้งานได้บน Android 10 และ 14**

หมายเหตุ: `updates.checkAutomatically` ตั้งเป็น `NEVER` การ push git หรือ EAS Update
ไม่เปลี่ยน APK ที่ติดตั้งอยู่ ต้อง build และติดตั้งใหม่เท่านั้น

## ขั้นตอนตรวจสอบ

### ตรวจ chain ที่ server ส่งจริง

```bash
echo | openssl s_client -connect apis.eng.psu.ac.th:443 \
  -servername apis.eng.psu.ac.th -showcerts 2>/dev/null | grep -E "^ [0-9] s:|^   i:"
```

แก้สำเร็จเมื่อเห็น 3 ใบ และใบสุดท้ายออกโดย `USERTrust ECC Certification Authority`

### ตรวจว่าเครื่องที่มีปัญหาขาด root ตัวไหน

Android เก็บ root ไว้เป็นไฟล์ชื่อตาม subject hash

```bash
adb shell ls /system/etc/security/cacerts/ | grep -E "3afde786|04f60c28"
```

- `3afde786.0` = Sectigo Public Server Authentication Root E46 (คาดว่าไม่มีบน Android 10/14)
- `04f60c28.0` = USERTrust ECC Certification Authority (ควรมีทุกเครื่อง)

### ตรวจ health endpoint

```powershell
Invoke-WebRequest -Uri "https://apis.eng.psu.ac.th/scooba/api/health" -Method Get
```

ควรได้ HTTP 200 และ body

```json
{ "data": { "status": "ok", "service": "scooba-service" } }
```

## ข้อควรระวัง

- ผลการทดสอบจาก Windows, macOS หรือ curl **ไม่ยืนยันอะไรเลย** เรื่อง Android เก่า
  เพราะใช้ trust store คนละชุด ต้องทดสอบด้วย `openssl verify` แบบจำกัด root ตามด้านบน
  หรือทดสอบบนเครื่องจริง
- อย่าสับสนระหว่าง `apis.eng.psu.ac.th` กับ `create.eng.psu.ac.th`
  ถ้าเปลี่ยน endpoint ต้องแก้ `domain` ใน `plugins/with-android-scooba-network-security.js`
  ให้ตรงกันด้วย ไม่อย่างนั้น trust anchor ที่ฝังไว้จะไม่ถูกใช้
- แอปมีที่เดียวที่เขียน host ไว้คือ `constants/apiDomains.js`
- iOS ไม่มี network security config ใช้ trust store ของระบบล้วน ๆ
  การแก้ทาง ก. จึงเป็นทางเดียวที่ครอบคลุม iOS รุ่นเก่าด้วย
