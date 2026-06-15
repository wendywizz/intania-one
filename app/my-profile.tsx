import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ENDPOINTS } from '@/constants/endpoints';
import { TEXT } from '@/constants/text';
import { useAuth } from '@/context/AuthContext';
import type { Person } from '@/models/types';
import { getPersonnelSuggestions } from '@/services/personService';

function str(v: unknown): string {
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function getFullName(person: Person): string {
  const r = person as Record<string, unknown>;
  const thParts = [str(r.P_NAME_TH), str(r.FNAME_TH), str(r.SNAME_TH)].filter(Boolean);
  if (thParts.length) return thParts.join(' ');
  const enParts = [str(r.P_SNAME_ENG), str(r.FNAME_ENG), str(r.SNAME_ENG)].filter(Boolean);
  return enParts.join(' ') || str(r.name) || str(r.fullName) || str(person.staffId) || '—';
}

function getDepartment(person: Person): string {
  const r = person as Record<string, unknown>;
  return str(r.DEPT_NAME_TH) || str(r.department) || str(r.deptName) || str(r.faculty) || '';
}

function getPosition(person: Person): string {
  const r = person as Record<string, unknown>;
  return str(r.POSITION_NAME_TH) || str(r.POSITION_NAME_ENG) || str(r.positionName) || '';
}

function getPhone(person: Person): string {
  const r = person as Record<string, unknown>;
  return str(r.OFFICE_TEL) || str(r.officeTel) || str(r.phone) || str(r.tel) || '';
}

function getEmail(person: Person): string {
  const r = person as Record<string, unknown>;
  return str(r.EMAIL) || str(r.email) || '';
}

function getPersonPhoto(person: Person): string {
  const photo = (person as Record<string, unknown>).photo;
  if (typeof photo === 'string' && photo.trim()) {
    const value = photo.trim();
    if (/^(data:|https?:\/\/|file:|content:)/i.test(value)) return value;
    return `data:image/jpeg;base64,${value}`;
  }
  return '';
}

type InfoRowProps = { label: string; value: string };

function InfoRow({ label, value }: InfoRowProps) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <ThemedText lightColor="#687076" darkColor="#687076" style={styles.infoLabel}>
        {label}
      </ThemedText>
      <ThemedText lightColor="#191c1f" darkColor="#191c1f" style={styles.infoValue}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function MyProfileScreen() {
  const { user: authUser } = useAuth();
  const staffId = String(authUser?.staffId || '').trim();

  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoFailed, setPhotoFailed] = useState(false);

  const photoUrl = staffId
    ? `${ENDPOINTS.photoBase}${encodeURIComponent(staffId)}.jpg`
    : null;

  useEffect(() => {
    if (!staffId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getPersonnelSuggestions(staffId)
      .then((results) => {
        const match =
          results.find((p) => String(p.staffId) === staffId) ||
          results[0] ||
          null;
        setPerson(match);
      })
      .catch(() => setPerson(null))
      .finally(() => setIsLoading(false));
  }, [staffId]);

  const personPhotoUri = person ? getPersonPhoto(person) : '';
  const displayPhotoUri = personPhotoUri || photoUrl || '';

  return (
    <ThemedView style={styles.container}>
      <NavTopBar title="ข้อมูลส่วนตัว" showHomeButton />

      {isLoading ? (
        <LoadingAnimate title={TEXT.SHARED_LOADING_DATA_TITLE} desc={TEXT.SHARED_PLEASE_WAIT_A_MOMENT} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Photo */}
          <View style={styles.photoSection}>
            {displayPhotoUri && !photoFailed ? (
              <Image
                source={{ uri: displayPhotoUri }}
                style={styles.photo}
                contentFit="cover"
                transition={200}
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <ActivityIndicator color="#b33939" />
              </View>
            )}
          </View>

          {/* Info card */}
          {person ? (
            <ThemedView style={styles.infoCard} lightColor="#FFFFFF" darkColor="#1F2B30">
              <InfoRow label="ชื่อ-นามสกุล" value={getFullName(person)} />
              <InfoRow label="ภาควิชา/หน่วยงาน" value={getDepartment(person)} />
              <InfoRow label="ตำแหน่ง" value={getPosition(person)} />
              <InfoRow label="โทรศัพท์" value={getPhone(person)} />
              <InfoRow
                label="อีเมล"
                value={getEmail(person) || String(authUser?.email || '')}
              />
            </ThemedView>
          ) : (
            <ThemedView style={styles.infoCard} lightColor="#FFFFFF" darkColor="#1F2B30">
              <ThemedText lightColor="#687076" darkColor="#687076" style={styles.emptyText}>
                {TEXT.SHARED_EMPTY_DATA}
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 16,
    gap: 16,
    alignItems: 'center',
  },
  photoSection: {
    alignItems: 'center',
    paddingTop: 8,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#b33939',
  },
  photoPlaceholder: {
    backgroundColor: '#f2f3f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dfbfbd',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
