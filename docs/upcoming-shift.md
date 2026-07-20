# Upcoming Shift

How the Home screen's **Upcoming Shift** (`งานที่รอดำเนินการ`) section builds and
displays each module's pending items.

- **Screen:** `app/index.tsx`
- **Component:** `UpcomingShiftSection`
- **Primary data:** `getActiveSummary(staffId, userId)` → `data.{repairComputer,absence,meeting,timestamp}`
- **Approval data:** `approvingWaitingData` (absence) and `getForgetApprovalWaiting` (timestamp)
- **Labels:** `constants/text.ts` (`HOME_SHIFT_*`, `REPAIR_COMPUTER_MENU_TITLE`, `EXAMINAR_HEADER_TITLE`)

Every module surfaces only items that need attention: a tile/row appears only when
its **count > 0**. If nothing qualifies, the section shows the empty state
`ไม่มีงานค้าง`.

## Layout

- Most modules render as **half-width (2-up) stat tiles** — a muted module label
  over a bold count. The lone last tile of an odd grid expands to a full-width row
  (title left, count + larger icon right).
- A module with **more than one sub-item collapses into a grouped card** (module
  header + tappable sub-rows), rendered by the shared `ShiftGroupCard`. This
  applies to **Repair Computer** (always, role-based) and **Absence** (when a boss
  has both own requests and approvals). A module with a single entry stays a tile.

---

## 1. Repair Computer

Renders as a grouped card: header with the title (`เมนูซ่อมคอมพิวเตอร์`) on the left
and a laptop icon on the right, over one or more tappable sub-rows (label left,
count + chevron right). Divided by hairlines.

The active-summary returns `data.repairComputer.tasks` as `{ key, count }`. The
role is implied by which task keys are present; each sub-row shows only when its
resolved count > 0.

### Informer
| Sub-item | Label | Task key(s) | Navigates to |
|----------|-------|-------------|--------------|
| Current Job | `งานปัจจุบัน` | `user-current-job` | `/repair-computer/current-job` |

### Foreman
| Sub-item | Label | Task key(s) | Navigates to |
|----------|-------|-------------|--------------|
| New Job | `งานใหม่` | `foreman-new-job` | `/repair-computer/foreman-new-job` |
| Current Jobs | `งานปัจจุบัน` | `foreman-running` + `foreman-supply-approve` | `/repair-computer/manage-job` |

### Worker
| Sub-item | Label | Task key(s) | Navigates to |
|----------|-------|-------------|--------------|
| New Job | `งานใหม่` | `worker-new-job` | `/repair-computer/worker-new-job` |
| Current Jobs | `งานปัจจุบัน` | `worker-current-job` + `worker-supply-wait` | `/repair-computer/worker-current-job` |

"Current Jobs" folds the running job with its supply task (supply-approve for
foreman, supply-wait for worker) so every task has a home under the two-row model.

#### Task keys (from active-summary)
| Task key | Meaning |
|----------|---------|
| `user-current-job` | Informer's current job |
| `foreman-new-job` | Foreman's new (incoming) jobs |
| `foreman-running` | Foreman's running / in-progress jobs |
| `foreman-supply-approve` | Foreman's pending supply approvals |
| `worker-new-job` | Worker's newly assigned jobs |
| `worker-current-job` | Worker's in-progress jobs |
| `worker-supply-wait` | Worker's jobs awaiting supply |

---

## 2. Absence

Role detection + approval count come from `approvingWaitingData(staffId)` →
`{ show, data }` (`show` = is an approver, `data.length` = approvals waiting).

Absence builds up to two sub-items. A **single** entry renders as a tile; **two**
entries (a boss with own requests + approvals) collapse into one **grouped card**
(header `การลา`, calendar icon) — the same treatment as Repair Computer.

### General user
| Sub-item | Label | Count source | Navigates to |
|----------|-------|--------------|--------------|
| My leave | `การลาของฉัน` | `activeSummary.absence.pending` + `cancelled` | `/absence/my-leave` |

### Boss / approver
The "my leave" sub-item **plus**:

| Sub-item | Label | Count source | Navigates to |
|----------|-------|--------------|--------------|
| Approve leave | `อนุมัติการลา` | `approvingWaitingData().data.length` | `/absence/approve-leave` |

---

## 3. Forgot-timestamp

Role detection + approval count come from `getForgetApprovalWaiting(staffId)` →
`{ show, data }`.

### General user
| Tile | Label | Count source | Navigates to |
|------|-------|--------------|--------------|
| Forgot timestamp | `ลืมลงเวลา` | `activeSummary.timestamp.items.length` | `/timestamp/forgot-timestamp` |

### Boss / approver
The "forgot timestamp" tile **plus**:

| Tile | Label | Count source | Navigates to |
|------|-------|--------------|--------------|
| Approve timestamp | `อนุมัติการลงเวลา` | `getForgetApprovalWaiting().data.length` | `/timestamp/approve` |

---

## 4. Meeting & Exam (simple tiles)

| Module | Label | Count source | Navigates to |
|--------|-------|--------------|--------------|
| Meeting | `การประชุมวันนี้` | `activeSummary.meeting.items.length` | `/meeting` |
| Exam | `EXAMINAR_HEADER_TITLE` | `listExamTasks(...)` filtered to upcoming | `/examinar` |

---

## Behaviour notes

- **Count gate:** every tile/row is shown only when its count > 0, so a boss with
  no pending approvals simply won't see the approval tile.
- **Own vs approval data:** own requests come from `activeSummary` (guarded by
  `data.<module>.success`); approval tiles come from the separate approval services
  and are independent of the active-summary call.
- **Multiple roles:** a user with tasks under more than one repair role gets each
  role's sub-rows appended; row keys are unique so there is no collision.
- **Routes** live under Expo Router groups/tabs (e.g. `(user)` / `(foreman)` /
  `(worker)`, `/absence/(tabs)/…`), which don't appear in the URL path.
