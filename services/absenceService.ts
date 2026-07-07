import {
  EncodingType,
  readAsStringAsync,
} from "expo-file-system/legacy";
import { Platform } from "react-native";

import type { absence } from "../models/types";
import {
  ensureSuccess,
  fetchWithTimeout,
  MESSAGE_PROCESS_FAILED,
  requestJson,
  type JsonMap,
  type ListResponse,
  type MutationResponse,
  type UploadableFile,
} from "./api";
import { ENDPOINTS } from "../constants/endpoints";
import { TEXT } from "../constants/text";

const DEFAULT_DISPLAY_LENGTH = 10;

function createabsenceUrl(
  path = "",
  query?: Record<string, string | number | undefined | null>,
) {
  const url = new URL(`${ENDPOINTS.absence}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function getFileExtension(fileUpload?: UploadableFile) {
  if (!fileUpload || fileUpload instanceof Blob) {
    return "jpg";
  }

  const fileName = fileUpload.name || fileUpload.uri;
  const extension = fileName.split(/[?#]/)[0]?.match(/\.([A-Za-z0-9]+)$/)?.[1];

  return extension ? extension.toLowerCase() : "jpg";
}

function generateMedUploadFileName(staffId: unknown, fileUpload?: UploadableFile) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  const safeStaffId = String(staffId ?? "unknown").replace(/[^A-Za-z0-9_-]/g, "");
  const extension = getFileExtension(fileUpload);

  return `${year}-${month}-${day}_${hour}-${minute}-${second}_${safeStaffId || "unknown"}.${extension}`;
}

async function readBlobAsBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error(MESSAGE_PROCESS_FAILED));
    reader.readAsDataURL(blob);
  });
}

async function readUploadFileAsBase64(fileUpload: UploadableFile) {
  if (fileUpload instanceof Blob) {
    return readBlobAsBase64(fileUpload);
  }

  if (Platform.OS !== "web") {
    return readAsStringAsync(fileUpload.uri, {
      encoding: EncodingType.Base64,
    });
  }

  const response = await fetch(fileUpload.uri);
  const blob = await response.blob();
  return readBlobAsBase64(blob);
}

export async function initabsenceData(
  staffId: string,
  absenceType: string,
): Promise<absence> {
  const url = createabsenceUrl("/init", { staff_id: staffId, type: absenceType });
  const jsonData = await requestJson(url, { method: "GET" });
  ensureSuccess(jsonData);

  const data = jsonData.data;
  // The backend can answer `{ success: true, data: null }` when the staff
  // member is not allowed to file a new request (e.g. one is already pending).
  // Surface that as a readable message instead of letting the form crash on
  // `null.deptId`.
  if (!data || typeof data !== "object") {
    throw new Error(
      String(jsonData.message ?? "").trim() || TEXT.ABSENCE_INIT_LOAD_ERROR_MESSAGE,
    );
  }

  return data as absence;
}

export async function getData(
  id: string,
  absenceType: string,
): Promise<absence> {
  const url = createabsenceUrl("", { id, type: absenceType });
  const jsonData = await requestJson(url, { method: "GET" });
  ensureSuccess(jsonData);

  return jsonData.data as absence;
}

export async function uploadMedFile(
  endpoint: string,
  fileUpload: UploadableFile,
  params?: Record<string, unknown>,
): Promise<MutationResponse> {
  const formData = new FormData();
  const imageBase64 = await readUploadFileAsBase64(fileUpload);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  formData.append("image", imageBase64);

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    body: formData,
  });
  const body = await response.text();

  if (!body) {
    throw new Error(MESSAGE_PROCESS_FAILED);
  }

  const jsonData = JSON.parse(body) as JsonMap;

  if (!response.ok) {
    throw new Error(String(jsonData.message ?? MESSAGE_PROCESS_FAILED));
  }

  ensureSuccess(jsonData);

  return {
    data: jsonData.data,
    message: String(jsonData.message ?? ""),
  };
}

export async function addData(
  data: Record<string, unknown>,
  absenceType: string,
  options?: { fileUpload?: UploadableFile },
): Promise<MutationResponse> {
  let fileName: string | undefined;

  if (options?.fileUpload) {
    fileName = generateMedUploadFileName(data.staff_id, options.fileUpload);
    const endpoint = ENDPOINTS.absence;
    await uploadMedFile(endpoint, options.fileUpload, {
      file_name: fileName,
      type: absenceType,
    });
  }

  const url = ENDPOINTS.absence;
  const jsonData = await requestJson(url, {
    method: "POST",
    body: JSON.stringify({
      ...data,
      type: absenceType,
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
  absenceType: string,
  options?: { fileUpload?: UploadableFile },
): Promise<MutationResponse> {
  let fileName: string | undefined;
  let reUpload = false;

  if (options?.fileUpload) {
    fileName = generateMedUploadFileName(data.staff_id, options.fileUpload);
    const endpoint = ENDPOINTS.absence;
    reUpload = true;

    await uploadMedFile(endpoint, options.fileUpload, {
      file_name: fileName,
      old_file_name: data.old_file_upload,
    });
  }

  const url = ENDPOINTS.absence;
  const jsonData = await requestJson(url, {
    method: "PUT",
    body: JSON.stringify({
      ...data,
      id,
      type: absenceType,
      ...(reUpload ? { file_upload: fileName } : {}),
    }),
  });
  ensureSuccess(jsonData);

  return {
    data: jsonData.data,
    message: String(jsonData.message ?? ""),
  };
}

export async function removeData(
  id: string,
  absenceType: string
): Promise<MutationResponse> {
  const url = ENDPOINTS.absence;

  const jsonData = await requestJson(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ id }).toString(),
  });

  ensureSuccess(jsonData);

  return {
    data: jsonData.data,
    message: String(jsonData.message ?? ""),
  };
}

export async function waitingData(staffId: string) {
  const url = createabsenceUrl("/waiting", {
    staff_id: staffId,
  });
  const jsonData = await requestJson(url, { method: "GET" });
  ensureSuccess(jsonData);

  return {
    remainResult: (jsonData.remain as absence | null | undefined) ?? null,
    cancelResult: (jsonData.cancel as absence | null | undefined) ?? null,
  };
}

/** Leave-approval waiting list — requests this user (as a boss/approver) must
 * approve. `show` is true when the user is an approver at all. */
export async function approvingWaitingData(staffId: string) {
  const url = createabsenceUrl("/approving", { staff_id: staffId });
  const jsonData = await requestJson(url, { method: "GET" });
  ensureSuccess(jsonData);
  const data = Array.isArray(jsonData.data) ? (jsonData.data as absence[]) : [];

  return {
    data,
    show: Boolean(jsonData.show) || data.length > 0,
  };
}

export async function historyData(
  staffId: string,
  { length = DEFAULT_DISPLAY_LENGTH, start = 0 } = {},
): Promise<ListResponse<absence>> {
  const url = createabsenceUrl("/history", {
    staff_id: staffId,
    start,
    length,
  });
  
  const jsonData = await requestJson(url, { method: "GET" });
  ensureSuccess(jsonData);
  const data = Array.isArray(jsonData.data) ? (jsonData.data as absence[]) : [];

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
  const url = createabsenceUrl("/stats", {
    staff_id: staffId,
    bgyear: budgetYear,
    year: budgetYear,
  });
  const jsonData = await requestJson(url, { method: "GET" });
  ensureSuccess(jsonData);

  return jsonData.data;
}

export const getabsenceData = getData;
export const addabsenceData = addData;
export const updateabsenceData = updateData;
export const waitingabsenceData = waitingData;

export function historyabsenceData(
  staffId: string,
  start = 0,
  length = DEFAULT_DISPLAY_LENGTH,
) {
  return historyData(staffId, { start, length });
}
