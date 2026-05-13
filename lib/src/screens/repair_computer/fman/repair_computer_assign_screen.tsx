import React from 'react';
import {ConvertedScreen} from '../../converted/ConvertedScreen';

export function RepairComputerAssignScreen(props: any) {
  return <ConvertedScreen title="Repair Computer Assign" source="repair_computer/fman/repair_computer_assign_screen.dart" kind="repair" subtype="foreman_new" {...props} />;
}

export default RepairComputerAssignScreen;
