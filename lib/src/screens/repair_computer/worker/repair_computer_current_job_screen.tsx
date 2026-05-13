import React from 'react';
import {ConvertedScreen} from '../../converted/ConvertedScreen';

export function RepairComputerCurrentJobScreen(props: any) {
  return <ConvertedScreen title="Repair Computer Current Job" source="repair_computer/worker/repair_computer_current_job_screen.dart" kind="repair" subtype="worker_current" {...props} />;
}

export default RepairComputerCurrentJobScreen;
