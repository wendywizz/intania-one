import {
    TYPE_ABSENT_BIRTH,
    TYPE_ABSENT_BUSINESS,
    TYPE_ABSENT_HAJJ,
    TYPE_ABSENT_RELAX,
    TYPE_ABSENT_SICK,
} from "../constants/type-absent";
import type { Absent } from "../models/types";
import {
    createPhoenixUrl,
    ensureSuccess,
    fetchWithTimeout,
    MESSAGE_PROCESS_FAILED,
    requestJson,
    type ListResponse,
    type MutationResponse,
    type JsonMap,
    type UploadableFile,
} from "./api";

const DEFAULT_DISPLAY_LENGTH = 10;

export function getRequestUrlSuffix(absentType: string) {
  switch (absentType) {
    case TYPE_ABSENT_SICK:
      return "/personnel/apis/absent/leave/";
    case TYPE_ABSENT_BUSINESS:
      return "/personnel/apis/absent/business/";
    case TYPE_ABSENT_RELAX:
      return "/personnel/apis/absent/relax/";
    case TYPE_ABSENT_BIRTH:
      return "/personnel/apis/absent/birth/";
    case TYPE_ABSENT_HAJJ:
      return "/personnel/apis/absent/hajj/";
    default:
      return "";
  }
}

export function getSuffixUriEndpoint(absentType: string) {
  return getRequestUrlSuffix(absentType);
}

function generateMedUploadFileName(staffId: unknown) {
  return `${String(staffId ?? "unknown")}_${Date.now()}`;
}

function getUploadFileExtension(fileUpload: UploadableFile) {
  const fileName =
    fileUpload instanceof Blob && "name" in fileUpload
      ? String(fileUpload.name)
      : "name" in fileUpload
        ? fileUpload.name
        : "";
  const extension = fileName?.match(/\.[A-Za-z0-9]+$/)?.[0];

  return extension || ".jpg";
}

export async function initAbsentData(
  staffId: string,
  absentType: string,
): Promise<Absent> {
  const suffixUrl = getRequestUrlSuffix(absentType);
  const url = createPhoenixUrl(`${suffixUrl}init/`, { staff_id: staffId });
  const jsonData = await requestJson(url, { method: "GET" });
  ensureSuccess(jsonData);

  return jsonData.data as Absent;
}

export async function getData(
  id: string,
  absentType: string,
): Promise<Absent> {
  const suffixUri = getRequestUrlSuffix(absentType);
  const url = createPhoenixUrl(suffixUri, { id });
  const jsonData = await requestJson(url, { method: "GET" });
  ensureSuccess(jsonData);

  return jsonData.data as Absent;
}

export async function uploadMedFile(
  endpoint: string,
  fileUpload: UploadableFile,
  params?: Record<string, unknown>,
): Promise<MutationResponse> {
  const formData = new FormData();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  formData.append("file", fileUpload as never);

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    body: formData,
  });
  const body = await response.text();

  if (!response.ok || !body) {
    throw new Error(MESSAGE_PROCESS_FAILED);
  }

  const jsonData = JSON.parse(body) as JsonMap;
  ensureSuccess(jsonData);

  return {
    data: jsonData.data,
    message: String(jsonData.message ?? ""),
  };
}

export async function addData(
  data: Record<string, unknown>,
  absentType: string,
  options?: { fileUpload?: UploadableFile },
): Promise<MutationResponse> {
  const suffixUri = getSuffixUriEndpoint(absentType);
  let fileName: string | undefined;

  if (options?.fileUpload) {
    fileName = `${generateMedUploadFileName(data.staff_id)}${getUploadFileExtension(options.fileUpload)}`;
    const endpoint = createPhoenixUrl(`${suffixUri}upload`);
    await uploadMedFile(endpoint, options.fileUpload, {
      file_name: fileName,
    });
  }

  const url = createPhoenixUrl(suffixUri);
  const jsonData = await requestJson(url, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      file_upload: fileName,
    }),
  });
  ensureSuccess(jsonData);

  return {
    data: jsonData.data,
    message: String(jsonData.message ?? ""),
  };
}

export async function updateData(
  id: string,
  data: Record<string, unknown>,
  absentType: string,
  options?: { fileUpload?: UploadableFile },
): Promise<MutationResponse> {
  const suffixUri = getSuffixUriEndpoint(absentType);
  let fileName: string | undefined;
  let reUpload = false;

  if (options?.fileUpload) {
    fileName = `${generateMedUploadFileName(data.staff_id)}${getUploadFileExtension(options.fileUpload)}`;
    const endpoint = createPhoenixUrl(`${suffixUri}upload`);
    reUpload = true;

    await uploadMedFile(endpoint, options.fileUpload, {
      file_name: fileName,
      old_file_name: data.old_file_upload,
    });
  }

  const url = createPhoenixUrl(suffixUri);
  const jsonData = await requestJson(url, {
    method: "PUT",
    body: JSON.stringify({
      ...data,
      id,
      ...(reUpload ? { file_upload: fileName } : {}),
    }),
  });
  ensureSuccess(jsonData);

  return {
    data: jsonData.data,
    message: String(jsonData.message ?? ""),
  };
}

export async function waitingData(staffId: string) {
  const url = createPhoenixUrl("/personnel/apis/absent/home/waiting", {
    staff_id: staffId,
  });
  const jsonData = await requestJson(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    remainResult: (jsonData.remain as Absent | null | undefined) ?? null,
    cancelResult: (jsonData.cancel as Absent | null | undefined) ?? null,
  };
}

export async function historyData(
  staffId: string,
  { length = DEFAULT_DISPLAY_LENGTH, start = 0 } = {},
): Promise<ListResponse<Absent>> {
  const url = createPhoenixUrl("/personnel/apis/absent/history", {
    staff_id: staffId,
    start,
    length,
  });
  const jsonData = await requestJson(url, { method: "GET" });
  ensureSuccess(jsonData);
  const data = Array.isArray(jsonData.data) ? (jsonData.data as Absent[]) : [];

  return {
    data,
    totalCount: Number(jsonData.total_count ?? jsonData.totalCount ?? data.length),
    message: String(jsonData.message ?? ""),
  };
}

function getCurrentThaiBudgetYear() {
  const today = new Date();
  const calendarYear = today.getFullYear();
  const budgetYear = today.getMonth() >= 9 ? calendarYear + 1 : calendarYear;

  return budgetYear + 543;
}

export async function statsData(staffId: string) {
  const budgetYear = getCurrentThaiBudgetYear();
  const url = createPhoenixUrl("/personnel/apis/absent/stats", {
    staff_id: staffId,
    bgyear: budgetYear,
    year: budgetYear,
  });
  const jsonData = await requestJson(url, { method: "GET" });
  ensureSuccess(jsonData);

  return jsonData.data;
}

export const getAbsentData = getData;
export const addAbsentData = addData;
export const updateAbsentData = updateData;
export const waitingAbsentData = waitingData;

export function historyAbsentData(
  staffId: string,
  start = 0,
  length = DEFAULT_DISPLAY_LENGTH,
) {
  return historyData(staffId, { start, length });
}
