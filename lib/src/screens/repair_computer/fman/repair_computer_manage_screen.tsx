import React from 'react';
import {ConvertedScreen} from '../../converted/ConvertedScreen';

export function RepairComputerManageScreen(props: any) {
  return <ConvertedScreen title="Repair Computer Manage" source="repair_computer/fman/repair_computer_manage_screen.dart" kind="repair" subtype="foreman_manage" {...props} />;
}

export default RepairComputerManageScreen;
