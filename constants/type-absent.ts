export const TYPE_ABSENT_CANCEL = '0';
export const TYPE_ABSENT_SICK = '1';
export const TYPE_ABSENT_BUSINESS = '2';
export const TYPE_ABSENT_BIRTH = '3';
export const TYPE_ABSENT_RELAX = '4';
export const TYPE_ABSENT_ORDAIN = '5';
export const TYPE_ABSENT_HAJJ = '6';
export const TYPE_ABSENT_SOLDIER = '7';
export const TYPE_ABSENT_HELPMATE = '9';
export const TYPE_ABSENT_REHAB = '10';

export const ABSENT_TYPES = {
  cancel: TYPE_ABSENT_CANCEL,
  leave: TYPE_ABSENT_SICK,
  business: TYPE_ABSENT_BUSINESS,
  birth: TYPE_ABSENT_BIRTH,
  relax: TYPE_ABSENT_RELAX,
  ordain: TYPE_ABSENT_ORDAIN,
  hajj: TYPE_ABSENT_HAJJ,
  soldier: TYPE_ABSENT_SOLDIER,
  helpmate: TYPE_ABSENT_HELPMATE,
  rehab: TYPE_ABSENT_REHAB,
} as const;
