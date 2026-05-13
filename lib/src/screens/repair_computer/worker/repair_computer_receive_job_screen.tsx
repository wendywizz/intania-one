import React from 'react';
import {ConvertedScreen} from '../../converted/ConvertedScreen';

export function RepairComputerReceiveJobScreen(props: any) {
  return <ConvertedScreen title="Repair Computer Receive Job" source="repair_computer/worker/repair_computer_receive_job_screen.dart" kind="repair" subtype="worker_new" {...props} />;
}

export default RepairComputerReceiveJobScreen;
