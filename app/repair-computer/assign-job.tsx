import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppToast } from '@/components/app-toast';
import { LoadingAnimate } from '@/components/loading-animate';
import { NavTopBar } from '@/components/nav-top-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PROCESS } from '@/constants/domain';
import { TEXT } from '@/constants/text';
import { USER_ID } from '@/constants/user';
import { useAuth } from '@/context/AuthContext';
import type { Person, RepairComputer } from '@/models/types';
import { setRepairComputerSelectedRole } from '@/context/repairComputerRoleSelection';
import { PRIVILEGE_RC_FOREMAN } from '@/constants/type-repair-computer';
import { getPersonPhoto } from '@/services/personnelService';
import {
  assignJob,
  getJobDetail,
  getRepairComputerWorkers,
  getRepairTypes,
} from '@/services/repairComputerService';

type AssignStep = 'repairType' | 'worker' | 'confirm';
type RepairTypeOption = Record<string, unknown>;

const TEXT_NONE = '-';

function getValue(row: Record<string, unknown> | null | undefined, fields: string[]) {
  if (!row) {
    return '';
  }

  for (const field of fields) {
    const value = row[field];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '';
}

function getRepairTypeId(item: RepairTypeOption) {
  return getValue(item, ['id', 'repairType', 'repair_type', 'value']);
}

function getRepairTypeName(item: RepairTypeOption) {
  return getValue(item, ['name', 'repairTypeName', 'repair_type_name', 'label']) || getRepairTypeId(item);
}

function normalizeNumericStaffId(staffId: string) {
  return /^\d+$/.test(staffId) ? staffId.padStart(7, '0') : staffId;
}

function getWorkerId(worker: Person) {
  const workerId = getValue(worker, [
    'staffId',
    'staffID',
    'staff_id',
    'STAFF_ID',
    'STAFFID',
    'worker',
    'workerId',
    'workerID',
    'worker_id',
    'id',
  ]);
  return normalizeNumericStaffId(workerId);
}

function getWorkerPhotoStaffId(worker: Person) {
  const staffId = getValue(worker, [
    'uni_staff_id',
    'UNI_STAFF_ID',
    'uniStaffId',
    'uniStaffID',
    'staffId',
    'staffID',
    'staff_id',
    'STAFF_ID',
    'STAFFID',
  ]);
  return normalizeNumericStaffId(staffId);
}

function getWorkerAssignId(worker: Person) {
  const workerId = getWorkerId(worker) || getWorkerPhotoStaffId(worker);
  return /^\d+$/.test(workerId) ? workerId.padStart(7, '0') : workerId;
}

function getWorkerPrefix(worker: Person) {
  const titleName2 = getValue(worker, ['titleName2', 'title_name_2', 'TITLE_NAME_2']);
  const titleName3 = getValue(worker, ['titleName3', 'title_name_3', 'TITLE_NAME_3']);
  return [titleName2, titleName3].filter(Boolean).join('') || getValue(worker, ['prefixNameTH', 'prefix_name_th', 'PREFIX_NAME_TH', 'prefix']);
}

function getWorkerName(worker: Person) {
  const responseFullName = getValue(worker, ['workerFullname', 'worker_fullname', 'fullname', 'fullName', 'staffName', 'name']);
  const firstNameTH = getValue(worker, ['firstNameTH', 'first_name_th', 'firstnameTH', 'firstname_th', 'FIRST_NAME_TH']);
  const lastNameTH = getValue(worker, ['lastNameTH', 'last_name_th', 'lastnameTH', 'lastname_th', 'LAST_NAME_TH']);
  const firstNameEN = getValue(worker, ['firstNameEN', 'first_name_en', 'firstnameEN', 'firstname_en', 'firstName', 'first_name', 'FIRST_NAME_EN']);
  const lastNameEN = getValue(worker, ['lastNameEN', 'last_name_en', 'lastnameEN', 'lastname_en', 'lastName', 'last_name', 'LAST_NAME_EN']);
  const thaiFullName = [getWorkerPrefix(worker), firstNameTH, lastNameTH].filter(Boolean).join(' ');
  const englishFullName = [firstNameEN, lastNameEN].filter(Boolean).join(' ');

  return responseFullName || thaiFullName || englishFullName || getWorkerId(worker);
}

function getWorkerDetails(worker: Person) {
  return [
    getValue(worker, ['positionName', 'position_name', 'POSITION_NAME', 'position']),
    getValue(worker, ['deptName', 'dept_name', 'DEPT_NAME', 'department', 'faculty']),
    getValue(worker, ['email', 'EMAIL', 'mail']),
    getValue(worker, ['officeTel', 'office_tel', 'OFFICE_TEL', 'phone', 'tel']),
    getWorkerId(worker) ? `Staff ID: ${getWorkerId(worker)}` : '',
  ].filter(Boolean);
}

function RowDetail({ title, description }: { description: string; title: string }) {
  return (
    <View style={styles.rowDetail}>
      <ThemedText type="defaultSemiBold" style={styles.rowTitle}>
        {title}
      </ThemedText>
      <ThemedText style={styles.rowDescription}>{description}</ThemedText>
    </View>
  );
}

function WorkerSummary({ worker }: { worker: Person }) {
  const photoStaffId = getWorkerPhotoStaffId(worker);
  const details = getWorkerDetails(worker);

  return (
    <ThemedView style={styles.workerSummary} lightColor="#FFFFFF" darkColor="#151718">
      {photoStaffId ? (
        <Image source={{ uri: getPersonPhoto({ ...worker, staffId: photoStaffId }) }} style={styles.summaryPhoto} />
      ) : (
        <View style={styles.summaryPhotoPlaceholder} />
      )}
      <View style={styles.workerText}>
        <ThemedText type="defaultSemiBold" style={styles.workerName}>
          {getWorkerName(worker)}
        </ThemedText>
        {details.map((detail) => (
          <ThemedText key={detail} style={styles.workerMeta}>
            {detail}
          </ThemedText>
        ))}
      </View>
    </ThemedView>
  );
}

export default function AssignJobScreen() {
  const params = useLocalSearchParams<{ backHref?: string | string[]; id?: string | string[] }>();
  const jobId = Array.isArray(params.id) ? params.id[0] : params.id;
  const backHrefParam = Array.isArray(params.backHref) ? params.backHref[0] : params.backHref;
  const backHref = backHrefParam || '/repair-computer/foreman-new-job';
  const { user: authUser } = useAuth();
  const foremanId = authUser?.staffId || USER_ID;
  const [step, setStep] = useState<AssignStep>('repairType');
  const [jobDetail, setJobDetail] = useState<RepairComputer | null>(null);
  const [repairTypes, setRepairTypes] = useState<RepairTypeOption[]>([]);
  const [workers, setWorkers] = useState<Person[]>([]);
  const [selectedRepairType, setSelectedRepairType] = useState<RepairTypeOption | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | ''>('');

  const selectedRepairTypeId = selectedRepairType ? getRepairTypeId(selectedRepairType) : '';
  const selectedWorkerId = selectedWorker ? getWorkerAssignId(selectedWorker) : '';
  const canConfirmWorker = Boolean(selectedWorker);

  const loadData = useCallback(async () => {
    if (!jobId) {
      setError(TEXT.UNABLE_TO_LOAD_JOB_DETAIL);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    const [detailResult, repairTypeResult] = await Promise.all([
      getJobDetail(jobId),
      getRepairTypes(),
    ]);

    if (detailResult.processType === PROCESS.error || !detailResult.data) {
      setError(detailResult.message || TEXT.UNABLE_TO_LOAD_JOB_DETAIL);
      setIsLoading(false);
      return;
    }

    if (repairTypeResult.processType === PROCESS.error) {
      setError(repairTypeResult.message || 'Unable to load repair types.');
      setIsLoading(false);
      return;
    }

    setJobDetail(detailResult.data);
    setRepairTypes(Array.isArray(repairTypeResult.data) ? repairTypeResult.data : []);
    setIsLoading(false);
  }, [jobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadWorkers = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const result = await getRepairComputerWorkers();

    if (result.processType === PROCESS.error) {
      setError(result.message || 'Unable to load workers.');
      setIsLoading(false);
      return;
    }

    setWorkers(Array.isArray(result.data) ? result.data : []);
    setIsLoading(false);
  }, []);

  const handleRepairTypeNext = async () => {
    if (!selectedRepairTypeId) {
      return;
    }

    setStep('worker');
    if (!workers.length) {
      await loadWorkers();
    }
  };

  const handleBackPress = () => {
    if (step === 'confirm') {
      setStep('worker');
      return;
    }

    if (step === 'worker') {
      setStep('repairType');
      return;
    }

    if (jobId) {
      router.replace({
        pathname: '/repair-computer/foreman-job-detail',
        params: {
          id: jobId,
          backHref: '/repair-computer/foreman-new-job',
        },
      } as Parameters<typeof router.replace>[0]);
      return;
    }

    router.replace(backHref as Parameters<typeof router.replace>[0]);
  };

  const handleAssign = async () => {
    if (!jobId || !selectedRepairTypeId || !selectedWorkerId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setToastMessage('');
    setToastType('');

    const result = await assignJob(jobId, selectedRepairTypeId, selectedWorkerId, foremanId);

    setIsSubmitting(false);
    setIsConfirmOpen(false);

    if (result.processType === PROCESS.success && result.success !== false) {
      setRepairComputerSelectedRole(foremanId, PRIVILEGE_RC_FOREMAN);
      setToastType('success');
      setToastMessage(result.message || TEXT.REPAIR_COMPUTER_JOB_UPDATED_SUCCESSFULLY);
      setTimeout(() => {
        router.replace('/repair-computer/foreman-new-job');
      }, 900);
      return;
    }

    setToastType('error');
    setToastMessage(result.message || TEXT.UNABLE_TO_UPDATE_REPAIR_COMPUTER_JOB);
  };

  const jobRows = useMemo(() => {
    return [
      { title: TEXT.JOB_ID, description: jobId || TEXT_NONE },
      { title: TEXT.USER, description: getValue(jobDetail, ['staffFullname', 'staff_fullname']) || TEXT_NONE },
      { title: TEXT.DEPARTMENT, description: getValue(jobDetail, ['deptName', 'dept_name']) || TEXT_NONE },
      { title: TEXT.SUPPLY_CODE_2, description: getValue(jobDetail, ['supplyCode', 'supply_code']) || TEXT_NONE },
      { title: TEXT.DETAIL_2, description: getValue(jobDetail, ['detail']) || TEXT_NONE },
    ];
  }, [jobDetail, jobId]);

  const renderRepairTypeItem = ({ item }: { item: RepairTypeOption }) => {
    const itemId = getRepairTypeId(item);
    const isSelected = selectedRepairTypeId === itemId;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setSelectedRepairType(item)}
        style={[styles.listItem, isSelected ? styles.selectedItem : undefined]}>
        <ThemedText
          lightColor={isSelected ? '#FFFFFF' : undefined}
          darkColor={isSelected ? '#FFFFFF' : undefined}
          type="defaultSemiBold">
          {getRepairTypeName(item)}
        </ThemedText>
      </Pressable>
    );
  };

  const renderWorkerItem = ({ item }: { item: Person }) => {
    const workerId = getWorkerId(item);
    const photoStaffId = getWorkerPhotoStaffId(item);
    const isSelected = selectedWorker === item || (Boolean(workerId) && selectedWorkerId === workerId);
    const details = getWorkerDetails(item);

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setSelectedWorker(item)}
        style={[styles.workerItem, isSelected ? styles.selectedItem : undefined]}>
        {photoStaffId ? (
          <Image source={{ uri: getPersonPhoto({ ...item, staffId: photoStaffId }) }} style={styles.workerPhoto} />
        ) : (
          <View style={styles.workerPhotoPlaceholder} />
        )}
        <View style={styles.workerText}>
          <ThemedText
            lightColor={isSelected ? '#FFFFFF' : undefined}
            darkColor={isSelected ? '#FFFFFF' : undefined}
            type="defaultSemiBold"
            style={styles.workerName}>
            {getWorkerName(item)}
          </ThemedText>
          {details.map((detail) => (
            <ThemedText
              key={detail}
              lightColor={isSelected ? '#E8F5F8' : '#687076'}
              darkColor={isSelected ? '#E8F5F8' : '#687076'}
              style={styles.workerMeta}>
              {detail}
            </ThemedText>
          ))}
        </View>
      </Pressable>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <LoadingAnimate title="Loading assign data" desc={TEXT.PLEASE_WAIT_A_MOMENT} />;
    }

    if (error) {
      return (
        <View style={styles.stateContent}>
          <ThemedText type="subtitle">{TEXT.SOMETHING_WENT_WRONG}</ThemedText>
          <ThemedText style={[styles.stateMessage, styles.errorText]}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={step === 'worker' ? loadWorkers : loadData} style={styles.retryButton}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              {TEXT.RETRY}</ThemedText>
          </Pressable>
        </View>
      );
    }

    if (step === 'repairType') {
      return (
        <>
          <FlatList
            contentContainerStyle={styles.listContent}
            data={repairTypes}
            keyExtractor={(item, index) => getRepairTypeId(item) || `repair-type-${index}`}
            renderItem={renderRepairTypeItem}
            ListEmptyComponent={
              <ThemedView style={styles.emptyCard} lightColor="#FFFFFF" darkColor="#151718">
                <ThemedText style={styles.emptyMessage}>No repair types</ThemedText>
              </ThemedView>
            }
          />
          <Pressable
            accessibilityRole="button"
            disabled={!selectedRepairTypeId}
            onPress={handleRepairTypeNext}
            style={[styles.primaryButton, !selectedRepairTypeId ? styles.disabledButton : undefined]}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              Confirm
            </ThemedText>
          </Pressable>
        </>
      );
    }

    if (step === 'worker') {
      return (
        <>
          <FlatList
            contentContainerStyle={styles.listContent}
            data={workers}
            keyExtractor={(item, index) => getWorkerId(item) || `worker-${index}`}
            renderItem={renderWorkerItem}
            ListEmptyComponent={
              <ThemedView style={styles.emptyCard} lightColor="#FFFFFF" darkColor="#151718">
                <ThemedText style={styles.emptyMessage}>No workers</ThemedText>
              </ThemedView>
            }
          />
          <Pressable
            accessibilityRole="button"
            disabled={!canConfirmWorker}
            onPress={() => setStep('confirm')}
            style={[styles.primaryButton, !canConfirmWorker ? styles.disabledButton : undefined]}>
            <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
              Confirm
            </ThemedText>
          </Pressable>
        </>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.confirmContent}>
        <ThemedText type="defaultSemiBold">Job Detail</ThemedText>
        {jobRows.map((row) => (
          <RowDetail key={row.title} title={row.title} description={row.description} />
        ))}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Selected Job Type</ThemedText>
        <RowDetail title="Type:" description={selectedRepairType ? getRepairTypeName(selectedRepairType) : TEXT_NONE} />
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Selected Worker</ThemedText>
        {selectedWorker ? <WorkerSummary worker={selectedWorker} /> : <RowDetail title={TEXT.WORKER_2} description={TEXT_NONE} />}

        <Pressable accessibilityRole="button" onPress={() => setIsConfirmOpen(true)} style={styles.primaryButton}>
          <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
            Confirm
          </ThemedText>
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <NavTopBar
        title={TEXT.REPAIR_COMPUTER}
        onBackPress={handleBackPress}
        showBackButton
      />

      <View style={styles.content}>
        <ThemedView style={styles.panel} lightColor="#F3F8FB" darkColor="#1F2B30">
          <ThemedText type="subtitle">
            {step === 'repairType' ? 'Select Job Type' : step === 'worker' ? 'Select Worker' : TEXT.ASSIGN_CONFIRM}
          </ThemedText>
          {renderContent()}
        </ThemedView>
      </View>

      <Modal transparent visible={isConfirmOpen} animationType="fade" onRequestClose={() => setIsConfirmOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsConfirmOpen(false)}>
          <Pressable>
            <ThemedView style={styles.confirmModal} lightColor="#FFFFFF" darkColor="#151718">
              <ThemedText type="subtitle">Confirm Assign</ThemedText>
              <ThemedText style={styles.confirmMessage}>Do you want to assign this repair computer job?</ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => setIsConfirmOpen(false)}
                  style={styles.cancelButton}>
                  <ThemedText type="defaultSemiBold">No</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleAssign}
                  style={[styles.confirmButton, isSubmitting ? styles.disabledButton : undefined]}>
                  {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                  <ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF" type="defaultSemiBold">
                    Yes
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>

      <AppToast message={toastMessage} type={toastType === 'error' ? 'error' : 'success'} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  panel: {
    flex: 1,
    borderRadius: 8,
    padding: 20,
  },
  listContent: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 16,
  },
  listItem: {
    minHeight: 54,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedItem: {
    borderColor: '#0A6E8A',
    backgroundColor: '#0A6E8A',
  },
  workerItem: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  workerPhoto: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#E4F0F6',
  },
  workerPhotoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#D7E6EC',
  },
  workerText: {
    flex: 1,
  },
  workerName: {
    fontSize: 15,
    lineHeight: 21,
  },
  workerMeta: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  workerSummary: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    padding: 12,
  },
  summaryPhoto: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#E4F0F6',
  },
  summaryPhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#D7E6EC',
  },
  primaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    marginTop: 12,
    paddingHorizontal: 18,
  },
  disabledButton: {
    opacity: 0.55,
  },
  stateContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  stateMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  errorText: {
    color: '#B42318',
  },
  retryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
    marginTop: 24,
  },
  emptyCard: {
    minHeight: 120,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D7E6EC',
    padding: 16,
  },
  emptyMessage: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  confirmContent: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    marginTop: 14,
  },
  rowDetail: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D7E6EC',
    paddingBottom: 12,
  },
  rowTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  rowDescription: {
    color: '#687076',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 24,
  },
  confirmModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 8,
    padding: 18,
  },
  confirmMessage: {
    color: '#687076',
    lineHeight: 20,
    marginTop: 10,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cancelButton: {
    minHeight: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#BFD2DA',
    backgroundColor: '#FFFFFF',
  },
  confirmButton: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0A6E8A',
  },
});
