# Repair Computer — Module CONTEXT

> Read the root `CONTEXT.md` first, then this file before editing the repair-computer module.

## Module Context

A company service for when a computer (or other item) breaks. A user sends a repair
request (inform); a foreman categorizes and assigns it; a worker repairs it and reports back.

Like every module, the client is UI only. It talks to **scooba-service**
(`/api/repair-computer/*`), which proxies the real Phoenix repair-computer API.

## Terminology (IMPORTANT)

The repair-staff role is called **Worker** in the UI, but its **privilege/role value is `tech`**
— the word the legacy Phoenix server uses.

- **Role value (privilege string):** `tech` — constant `PRIVILEGE_RC_TECH = 'tech'`
  (`constants/types.ts`), returned by `checkPrivilege()`. Every layer (PHP → scooba → client)
  speaks the server's `tech` verbatim; the client does **not** translate it. *(Reversed on
  2026-07-03: an earlier tech→worker translation in scooba + client was removed so the role
  value follows the server. `PRIVILEGE_RC_WORKER` no longer exists.)*
- **Client identifiers (kept as "worker"):** files `worker-*.tsx`, routes
  `/repair-computer/worker-*`, service fns `listWorker*`, `getRepairComputerWorkers`. Only the
  role *value* is `tech`; these names were **not** renamed.
- **User-facing text:** "Worker" (English) / "ช่าง" (Thai). Do **not** use "Technician" here —
  that word belongs to the separate **notice-repair** module.

## User Groups & Roles

Role is resolved from `checkPrivilege(staffId)` → `tech | foreman | user` (default `user`).
The `(tabs)/_layout.tsx` shows only the tab set for the user's highest privilege and
redirects to that role's default route.

- **General User** — the informer who sends requests. Tabs: current-job, queue, history.
- **Foreman** — categorizes job types and assigns them to workers.
  Tabs: foreman-new-job, manage-job, foreman-history. (The dedicated **approvement** tab and
  its `manage/supply_approve` API were removed on 2026-07-06.)
- **Worker (ช่าง)** — repairs the item; can accept/reject assigned jobs, report progress, and
  ask the foreman for supplies. Tabs: worker-new-job, worker-current-job, worker-history.

## Functional

- General User: send inform, follow job status, see inform history.
- Foreman: accept/reject job, assign job to a worker, approve a worker's supply request, see all history.
- Worker: accept/reject an assigned job, record & report repair detail, ask the foreman for a supply request, see work history.

## Repair process (lifecycle)

The end-to-end flow across the three roles. Status ids in parentheses map to
`REPAIR_COMPUTER_STATUS` in `constants/types.ts` (see the status reference below). This is the
source-of-truth for how a job moves; read it before touching any repair-computer screen or API.

1. **User creates an inform** (new repair request) → *new job (0)*; it lands in the foreman's
   "job bucket".
   - 1.1 The user can still **edit** the request **while the foreman has not responded** (i.e.
     only while status is still *new job (0)*). Once a foreman picks it up, it becomes read-only.
2. **Foreman responds** to a new job from the bucket.
   - 2.1 **Accept** → the foreman takes the job (to categorize the repair type and assign it).
   - 2.2 **Reject** → the foreman answers the **user** with a reason → *reject (6)*.
3. **Foreman assigns** the job to a worker (chooses repair type + worker) → *wait worker (2)*;
   the job now appears in that worker's "new job" list.
4. **Worker responds** to the assigned job (worker-new-job → worker-job-detail).
   - 4.1 **Accept** → *worker accept (3)*; the job moves to the worker's current-job list and the
     worker can start it.
   - 4.2 **Reject** → the worker gives a reason (worker-reject-job) → *worker reject (2.1)*; the
     job goes **back to the bucket** for the foreman to reassign.
5. **Worker operates** the job — opens **Operate** (operate-job) and records **Problem detail**
   + **Solve method** → *working (4)*. (In the original memo this step was written as "User
   submit operate"; the actor is actually the **worker**. Endpoint: `operate/operate_job`.)
6. **Supply request (optional)** — if the worker needs parts/equipment:
   - 6.1 Worker sends a supply request to the foreman (`operate/request_supply`).
   - 6.2 Waits for the foreman's approval → *wait approval (7)*. (There is **no dedicated
     approvement screen** in the app — that tab/API was removed on 2026-07-06. The request detail
     surfaces on `foreman-job-detail` when a job is at *wait approval (7)*.)
     - 6.2.1 **Approve** → the supply request is done → *processing equipment (7.1)*.
     - 6.2.2 **Reject** → the foreman tells the worker → *approval rejected (7.2)*.
7. **Worker finishes** the job and submits the detail back to the foreman
   (`operate/submit_job`) → *wait foreman (4.2)*.
8. **Foreman closes** the job and notifies the **user** → *finish (5)*.

### Status reference (`REPAIR_COMPUTER_STATUS`)

| id  | key                  | meaning                                   |
| --- | -------------------- | ----------------------------------------- |
| 0   | newJob               | new inform, in the foreman bucket         |
| 2   | waitWorker           | assigned, waiting for the worker to accept |
| 2.1 | workerReject         | worker rejected → back to the bucket      |
| 3   | workerAccept         | worker accepted, not yet started          |
| 4   | working              | worker is operating the job               |
| 4.1 | waitCloseJob         | waiting to close                          |
| 4.2 | waitForeman          | worker finished, waiting for foreman close |
| 4.3 | forwardForeman       | forwarded to a foreman                    |
| 5   | finish               | job closed / done                         |
| 6   | reject               | rejected                                  |
| 7   | waitApproval         | supply request waiting for foreman        |
| 7.1 | processingEquipment  | supply approved / being procured          |
| 7.2 | approvalRejected     | supply request rejected                   |

> Note: statuses are the client-side constants; exact transitions are driven by the PHP model
> (`mod_inform`) via the scooba `inform` / `manage` / `operate` actions. When in doubt about a
> transition, verify against the PHP controller rather than assuming from this table.

## Home "Upcoming Shift" (role-based) — spec

The home screen's **Upcoming Shift** section shows a single repair-computer card whose task
lines depend on the user's role. Counts come from scooba `active-summary`
(`buildRepairComputerSummary`), which resolves the role then tallies per-role counts and
returns `{ success, role, tasks: [{ key, count }] }`. The client maps each `key` to a Thai
label (`REPAIR_TASK_LABELS` in `app/index.tsx`).

Tasks by role:

- **General User**
  - Current job — `user-current-job` (source: `getUserCurrentJob`)
- **Foreman**
  - New job — `foreman-new-job` (source: `listForemanNewJob`)
  - Running jobs assigned to workers — `foreman-running` (source: `listForemanManageJob`)
- **Worker**
  - New job assigned by the foreman — `worker-new-job` (source: `listWorkerNewJob`)
  - Waiting supply approval from the foreman — `worker-supply-wait` *(pending backend, see below)*

Display rules:

- Each task shows its **count as a badge on the right**.
- **Hyphen rule:** if the role has **more than one** task line, prefix each with a leading
  hyphen (`- <label>`); if there is **only one** task, show it **without** a hyphen.
- **Zero-count tasks are hidden.** If every task is zero, the whole repair card is hidden.

### Supply requests (no foreman approval UI)

A worker can send a supply request (`operate/request_supply`, sets a job to *wait approval (7)*),
but there is **no foreman approval screen**. A `manage/supply_approve` API + an `approvement`
tab were built and then removed on 2026-07-06 (client tab, scooba route/service, and the PHP
`supply_approve_get` endpoint were all deleted). The worker's `worker-supply-wait` upcoming-shift
task remains a **count-0 placeholder** (no upstream count endpoint). The request detail is instead
shown on `foreman-job-detail` for jobs at *wait approval (7)*.

## Notes

- Changing scooba routes needs a manual scooba restart; editing an existing service method
  hot-reloads under `strapi develop`.
- Bottom-tab screens load data only when their tab is active; lists paginate on scroll.
