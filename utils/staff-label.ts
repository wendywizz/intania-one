function getTextValue(data: object, keys: string[]) {
  const record = data as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return '';
}

// Position ("ตำแหน่ง") on its own — the first line of an approver option row.
export function getStaffPositionLabel(staff: object) {
  return getTextValue(staff, [
    'positionName',
    'position_name',
    'POSITION_NAME',
    'position',
  ]);
}

// Person's name ("ชื่อ") on its own, without the position prefix that
// getStaffDisplayLabel folds in.
export function getStaffNameLabel(staff: object) {
  const fullName = getTextValue(staff, [
    'staffFullName',
    'staff_full_name',
    'staffFullname',
    'staff_fullname',
    'fullname',
    'fullName',
    'staffName',
    'staff_name',
    'name',
  ]);

  if (fullName) {
    return fullName;
  }

  const prefix = getTextValue(staff, [
    'prefixNameTH',
    'prefix_name_th',
    'PREFIX_NAME_TH',
    'titleName',
    'title_name',
    'titleNameTH',
    'title_name_th',
    'prefix',
  ]);
  const firstName = getTextValue(staff, [
    'firstNameTH',
    'first_name_th',
    'firstnameTH',
    'firstname_th',
    'FIRST_NAME_TH',
    'firstName',
    'first_name',
    'firstname',
  ]);
  const lastName = getTextValue(staff, [
    'lastNameTH',
    'last_name_th',
    'lastnameTH',
    'lastname_th',
    'LAST_NAME_TH',
    'lastName',
    'last_name',
    'lastname',
  ]);

  return [prefix, firstName, lastName].filter(Boolean).join(' ');
}

export function getStaffDisplayLabel(staff: object) {
  const fullName = getTextValue(staff, [
    'staffFullName',
    'staff_full_name',
    'staffFullname',
    'staff_fullname',
    'fullname',
    'fullName',
    'staffName',
    'staff_name',
    'name',
  ]);
  const prefix = getTextValue(staff, [
    'prefixNameTH',
    'prefix_name_th',
    'PREFIX_NAME_TH',
    'titleName',
    'title_name',
    'titleNameTH',
    'title_name_th',
    'prefix',
  ]);
  const firstName = getTextValue(staff, [
    'firstNameTH',
    'first_name_th',
    'firstnameTH',
    'firstname_th',
    'FIRST_NAME_TH',
    'firstName',
    'first_name',
    'firstname',
  ]);
  const lastName = getTextValue(staff, [
    'lastNameTH',
    'last_name_th',
    'lastnameTH',
    'lastname_th',
    'LAST_NAME_TH',
    'lastName',
    'last_name',
    'lastname',
  ]);
  const positionName = getTextValue(staff, [
    'positionName',
    'position_name',
    'POSITION_NAME',
    'position',
  ]);
  const staffId = getTextValue(staff, ['staffId', 'staff_id', 'STAFF_ID', 'id']);
  const displayName = fullName || [prefix, firstName, lastName].filter(Boolean).join(' ');

  if (positionName && displayName) {
    return `${positionName} (${displayName})`;
  }

  return positionName || displayName || staffId;
}
