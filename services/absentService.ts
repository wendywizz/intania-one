import { Platform } from 'react-native';
import { PROCESS } from '../constants/domain';
import {
  TYPE_ABSENT_BIRTH,
  TYPE_ABSENT_BUSINESS,
  TYPE_ABSENT_HAJJ,
  TYPE_ABSENT_RELAX,
  TYPE_ABSENT_SICK,
} from '../constants/type-absent';
import type { Absent, Result } from '../models/types';
import {
  createLocalUrl,
  createPhoenixUrl,
  fetchWithTimeout,
  MESSAGE_PROCESS_FAILED,
  requestJson,
  toErrorResult,
  toErrorListResult,
  toResultList,
  toResultRow,
  type JsonMap,
  type UploadableFile,
} from './api';

const DEFAULT_DISPLAY_LENGTH = 10;

export function getRequestUrlSuffix(absentType: string) {
  switch (absentType) {
    case TYPE_ABSENT_SICK:
      return '/personnel/apis/absent/leave/';
    case TYPE_ABSENT_BUSINESS:
      return '/personnel/apis/absent/business/';
    case TYPE_ABSENT_RELAX:
      return '/personnel/apis/absent/relax/';
    case TYPE_ABSENT_BIRTH:
      return '/personnel/apis/absent/birth/';
    case TYPE_ABSENT_HAJJ:
      return '/personnel/apis/absent/hajj/';
    default:
      return '';
  }
}

export function getSuffixUriEndpoint(absentType: string) {
  return getRequestUrlSuffix(absentType);
}

function generateMedUploadFileName(staffId: unknown) {
  return `${String(staffId ?? 'unknown')}_${Date.now()}`;
}

function getUploadFileExtension(fileUpload: UploadableFile) {
  const fileName =
    fileUpload instanceof Blob && 'name' in fileUpload
      ? String(fileUpload.name)
      : 'name' in fileUpload
        ? fileUpload.name
        : '';
  const extension = fileName?.match(/\.[A-Za-z0-9]+$/)?.[0];

  return extension || '.jpg';
}

export async function initAbsentData(
  staffId: string,
  absentType: string,
): Promise<Result<Absent>> {
  try {
    const suffixUrl = getRequestUrlSuffix(absentType);
    const url =
      Platform.OS === 'web'
        ? createLocalUrl('/api/absent/init', {
            staff_id: staffId,
            absent_type: absentType,
          })
        : createPhoenixUrl(`${suffixUrl}init/`, { staff_id: staffId });
    const jsonData = await requestJson(url, { method: 'GET' });
    const processType = String(jsonData.process_type ?? jsonData.processType ?? '');

    return {
      processType,
      message: String(jsonData.message ?? ''),
      data: processType === PROCESS.success ? (jsonData.data as Absent) : undefined,
      success: processType === PROCESS.success,
    };
  } catch (error) {
    return toErrorResult<Absent>(error);
  }
}

export async function getData(id: string, absentType: string): Promise<Result<Absent>> {
  try {
    const suffixUri = getRequestUrlSuffix(absentType);
    const url = createPhoenixUrl(suffixUri, { id });
    const jsonData = await requestJson(url, { method: 'GET' });
    return toResultRow<Absent>(jsonData);
  } catch (error) {
    return toErrorResult<Absent>(error);
  }
}

export async function uploadMedFile(
  endpoint: string,
  fileUpload: UploadableFile,
  params?: Record<string, unknown>,
): Promise<Result> {
  try {
    const formData = new FormData();

    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    formData.append('file', fileUpload as never);

    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      body: formData,
    });
    const body = await response.text();

    if (!response.ok || !body) {
      throw new Error(MESSAGE_PROCESS_FAILED);
    }

    return toResultRow(JSON.parse(body) as JsonMap);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function addData(
  data: Record<string, unknown>,
  absentType: string,
  options?: { fileUpload?: UploadableFile },
): Promise<Result> {
  try {
    const suffixUri = getSuffixUriEndpoint(absentType);
    let fileName: string | undefined;

    if (options?.fileUpload) {
      fileName = `${generateMedUploadFileName(data.staff_id)}${getUploadFileExtension(options.fileUpload)}`;
      const endpoint = createPhoenixUrl(`${suffixUri}upload`);
      const uploadResult = await uploadMedFile(endpoint, options.fileUpload, {
        file_name: fileName,
      });

      if (!uploadResult.success) {
        return uploadResult;
      }
    }

    const url = createPhoenixUrl(suffixUri);
    const jsonData = await requestJson(url, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        file_upload: fileName,
      }),
    });

    return toResultRow(jsonData);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function updateData(
  id: string,
  data: Record<string, unknown>,
  absentType: string,
  options?: { fileUpload?: UploadableFile },
): Promise<Result> {
  try {
    const suffixUri = getSuffixUriEndpoint(absentType);
    let fileName: string | undefined;
    let reUpload = false;

    if (options?.fileUpload) {
      fileName = `${generateMedUploadFileName(data.staff_id)}${getUploadFileExtension(options.fileUpload)}`;
      const endpoint = createPhoenixUrl(`${suffixUri}upload`);
      reUpload = true;

      const uploadResult = await uploadMedFile(endpoint, options.fileUpload, {
        file_name: fileName,
        old_file_name: data.old_file_upload,
      });

      if (!uploadResult.success) {
        return uploadResult;
      }
    }

    const url = createPhoenixUrl(suffixUri);
    const jsonData = await requestJson(url, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        id,
        ...(reUpload ? { file_upload: fileName } : {}),
      }),
    });

    return toResultRow(jsonData);
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function waitingData(staffId: string): Promise<Result> {
  try {
    const url = createPhoenixUrl('/personnel/apis/absent/home/waiting', {
      staff_id: staffId,
    });
    const jsonData = await requestJson(url, { method: 'GET' });

    return {
      processType: PROCESS.success,
      data: {
        remainResult: (jsonData.remain as Absent | null | undefined) ?? null,
        cancelResult: (jsonData.cancel as Absent | null | undefined) ?? null,
      },
      message: String(jsonData.message ?? ''),
      success: true,
    };
  } catch (error) {
    return toErrorResult(error);
  }
}

export async function historyData(
  staffId: string,
  { length = DEFAULT_DISPLAY_LENGTH, start = 0 } = {},
): Promise<Result<Absent[]>> {
  try {
    const url =
      Platform.OS === 'web'
        ? createLocalUrl('/api/absent/history', {
            staff_id: staffId,
            start,
            length,
          })
        : createPhoenixUrl('/personnel/apis/absent/history', {
            staff_id: staffId,
            start,
            length,
          });
    const jsonData = await requestJson(url, { method: 'GET' });
    return toResultList<Absent>(jsonData);
  } catch (error) {
    return toErrorListResult<Absent>(error);
  }
}

export const getAbsentData = getData;
export const addAbsentData = addData;
export const updateAbsentData = updateData;
export const waitingAbsentData = waitingData;

export function historyAbsentData(staffId: string, start = 0, length = DEFAULT_DISPLAY_LENGTH) {
  return historyData(staffId, { start, length });
}
