# Android รุ่นเก่าเชื่อมต่อ scooba-service ไม่ได้

## สรุปปัญหา

พบว่าอุปกรณ์ Android บางรุ่นเปิดแอปได้ แต่หน้าแรกแสดงว่าไม่สามารถเชื่อมต่อ scooba-service ได้ โดยพบกับอุปกรณ์ต่อไปนี้:

| อุปกรณ์ | Android | ผลลัพธ์ |
|---|---:|---|
| Samsung Galaxy A52s 5G | 14 | เชื่อมต่อไม่ได้ |
| HUAWEI P20 Pro CLT-L29 | 10 | เชื่อมต่อไม่ได้ |
| Samsung Galaxy S24+ | ใหม่กว่า | ใช้งานได้ |

แอปติดตั้งและเปิดได้บน Android 10 ดังนั้นปัญหาไม่ใช่ `minSdkVersion` สูงเกินไป

## สาเหตุที่ตรวจพบ

### 1. แอปใช้ production endpoint ไม่ตรงกับ Kubernetes Ingress

เดิมแอปกำหนด production URL ใน `constants/apiDomains.js` เป็น:

```text
https://apis.eng.psu.ac.th/scooba
```

แต่ Kubernetes Ingress ของ `scooba-service` ใช้:

```text
https://create.eng.psu.ac.th/scooba
```

ผลคือการแก้ Ingress/certificate ของ `create.eng.psu.ac.th` ไม่ได้แก้ endpoint ที่แอปใช้งานจริง (`apis.eng.psu.ac.th`) และสองโดเมนอาจอยู่คนละระบบ/คนละเส้นทาง

### 2. Certificate ของ endpoint เดิมยังเป็น ZeroSSL

ตรวจสอบ `apis.eng.psu.ac.th` โดยตรงแล้วพบ:

```text
Subject: CN=*.eng.psu.ac.th
Issuer: CN=ZeroSSL ECC DV SSL CA 2, O=ZeroSSL GmbH, C=AT
```

เครื่อง Windows เรียก endpoint ได้ HTTP 200 แต่ยังไม่ยืนยันว่า Android 10/Huawei trust certificate chain เดียวกัน เนื่องจาก Android ใช้ trust store คนละชุดกับ Windows

จึงมีความเป็นไปได้เรื่อง TLS/certificate compatibility โดยเฉพาะอุปกรณ์ Android รุ่นเก่า แต่ไม่ควรสรุปว่า ZeroSSL เป็นสาเหตุเดียวจนกว่าจะทดสอบ endpoint ใหม่บนอุปกรณ์จริง

### 3. Custom Network Security Config

ไฟล์:

```text
plugins/with-android-scooba-network-security.js
```

กำหนด trust anchor เพิ่มสำหรับ `apis.eng.psu.ac.th` และใช้ system certificates:

```xml
<domain-config>
  <domain includeSubdomains="true">apis.eng.psu.ac.th</domain>
  <trust-anchors>
    <certificates src="system" />
    <certificates src="@raw/sectigo_public_server_authentication_root_e46" />
  </trust-anchors>
</domain-config>
```

Config นี้ไม่ได้ครอบคลุม `create.eng.psu.ac.th` แต่เมื่อเปลี่ยนแอปไปใช้ endpoint ใหม่แล้ว ระบบจะพึ่งพา system trust store เป็นหลัก จึงต้องทดสอบด้วย APK build ใหม่

## ค่า Android ที่ตรวจสอบแล้ว

ใน `app.json` มี:

```json
"expo-build-properties": {
  "android": {
    "minSdkVersion": 26
  }
}
```

ดังนั้นแอปรองรับ Android API 26 ขึ้นไป หรือ Android 8.0 ขึ้นไป

HUAWEI P20 Pro Android 10 คือ API 29 จึงผ่าน minimum requirement แน่นอน ปัญหาไม่ได้เกิดจาก Android 10 ต่ำกว่า `minSdkVersion`

## การแก้ไขที่ดำเนินการแล้ว

### ฝั่งแอป `intania-one`

แก้ `constants/apiDomains.js` จาก:

```js
production: 'https://apis.eng.psu.ac.th/scooba'
```

เป็น:

```js
production: 'https://create.eng.psu.ac.th/scooba'
```

เหตุผล: ให้ตรงกับ Kubernetes Kong Ingress ของ `scooba-service` และ certificate ที่ควรจัดการโดย Ingress/cert-manager

Commit ล่าสุด:

```text
9877ec5 Use Kong scooba service endpoint
```

ต้อง build และติดตั้ง APK ใหม่ เพราะ `updates.checkAutomatically` ตั้งเป็น `NEVER` และ APK เดิมจะยังใช้ URL เก่า

### ฝั่ง `scooba-service`

เพิ่ม Let's Encrypt ClusterIssuer:

```text
k8s/base/cluster-issuer.yaml
```

เปิด annotation ใน Ingress:

```yaml
cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

แก้ indentation ของ `metadata.annotations` ให้อยู่ระดับเดียวกับ `metadata.labels`:

```yaml
metadata:
  labels:
    app: scooba-service
  annotations:
    konghq.com/strip-path: "true"
    konghq.com/preserve-host: "true"
    konghq.com/protocols: "https,http"
    konghq.com/plugins: "request-transformer-add-forwarded"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

Commit ที่เกี่ยวข้อง:

```text
6925f81 Switch to Let's Encrypt and fix client IP detection
5d976d0 Fix ingress annotations for Let's Encrypt
```

## สถานะปัจจุบัน

- แอปถูกเปลี่ยนให้ใช้ `create.eng.psu.ac.th/scooba` แล้ว
- `scooba-service` มีการตั้งค่า Let's Encrypt ใน Git แล้ว
- ก่อนทดสอบครั้งสุดท้าย ต้องยืนยันว่า certificate ที่ server ส่งจาก `create.eng.psu.ac.th` เปลี่ยนจาก ZeroSSL เป็น Let's Encrypt แล้ว
- ต้องสร้าง APK ใหม่จาก commit `9877ec5` หรือใหม่กว่า และติดตั้งบน Huawei P20 Pro
- การทดสอบจาก Windows ที่ได้ HTTP 200 ไม่เพียงพอที่จะยืนยันว่า Android 10 เชื่อมต่อได้

## ขั้นตอนตรวจสอบหลัง deploy

### ตรวจ endpoint ใหม่

```powershell
Invoke-WebRequest -Uri "https://create.eng.psu.ac.th/scooba/api/health" -Method Get
```

ควรได้ HTTP 200 และ body ลักษณะนี้:

```json
{
  "data": {
    "status": "ok",
    "service": "scooba-service"
  }
}
```

### ตรวจ certificate

ตรวจ certificate ของโดเมนที่แอปใช้จริงเท่านั้น:

```text
https://create.eng.psu.ac.th/scooba/api/health
```

อย่าใช้ผลจาก `apis.eng.psu.ac.th` แทน เพราะเป็นคนละ endpoint

### ตรวจ Kubernetes

รันบนเครื่องที่มี `kubectl` และ cluster context ที่ถูกต้อง:

```powershell
kubectl get ingress scooba-ingress -A -o yaml
kubectl get clusterissuer letsencrypt-prod
kubectl describe clusterissuer letsencrypt-prod
kubectl get certificate,certificaterequest,order,challenge -A
kubectl describe certificate create-eng-psu-tls -A
kubectl get secret create-eng-psu-tls -A
```

ถ้า certificate ยังไม่เปลี่ยน ให้ตรวจ:

- cert-manager ติดตั้งอยู่ใน cluster หรือไม่
- `ClusterIssuer` เป็น Ready หรือไม่
- HTTP-01 challenge ผ่านหรือไม่
- DNS ของ `create.eng.psu.ac.th` ชี้เข้า Kong/Ingress ถูกต้องหรือไม่
- Secret `create-eng-psu-tls` ถูกสร้างใน namespace เดียวกับ Ingress หรือไม่

## หากยังเชื่อมต่อไม่ได้หลังเปลี่ยน endpoint

ให้แยกสาเหตุด้วยลำดับนี้:

1. ยืนยันว่า APK เป็น build หลัง commit `9877ec5`
2. ตรวจ log หรือเพิ่ม logging ชั่วคราวใน `services/healthService.ts`
3. แยกว่าเป็น DNS failure, TLS handshake failure, timeout หรือ response body ไม่ตรง
4. ทดสอบ `https://create.eng.psu.ac.th/scooba/api/health` จาก browser ของ Huawei
5. ตรวจว่า Huawei มี Private DNS, VPN, proxy หรือ captive portal หรือไม่
6. เพิ่ม timeout จาก 6 วินาทีเป็น 10–15 วินาทีเฉพาะถ้าพบว่าเป็น timeout ไม่ใช่ TLS failure
7. ไม่ควรฝัง ZeroSSL root certificate เพิ่มในแอปแบบเดาสุ่ม เพราะ certificate ฝั่ง server อาจเปลี่ยนและทำให้ต้องออก APK ใหม่อีก

## ข้อควรระวัง

- อย่าสับสนระหว่าง `apis.eng.psu.ac.th` กับ `create.eng.psu.ac.th`
- อย่าสรุปว่า Android รุ่นเก่าไม่รองรับโดยดูจากรุ่นเพียงอย่างเดียว
- `minSdkVersion` ของแอปคือ 26 และ Android 10/API 29 รองรับ
- การ push Git ไม่ได้เปลี่ยน APK ที่ติดตั้งอยู่ ต้อง build/install ใหม่
- ต้องตรวจ certificate ของ endpoint ที่ APK ใช้จริงเสมอ
