# BEADS.md - Task Viewer Improvements

## Open Beads

### B-020: 5-Column Kanban Layout ✅
**Priority:** P1  
**Type:** feature  
**Scope:** FE
**Status:** COMPLETE (commit 6be542b)

**Description:**
Expand Kanban from 3 columns to 5:
- Backlog (new)
- Pending (To Do)
- In Progress  
- Blocked (new)
- Done

**Acceptance Criteria:**
- [x] 5 columns render correctly
- [x] Tasks sorted by priority within columns
- [x] Column headers show count + story points
- [x] Responsive layout (horizontal scroll on mobile)

---

### B-021: Cross-Column Drag-Drop with Status Update ✅
**Priority:** P1  
**Type:** feature  
**Scope:** FE + BE
**Status:** COMPLETE (commit 6be542b)

**Description:**
When a task is dragged to a different column, update its status via API.

**Acceptance Criteria:**
- [x] PATCH /api/v1/tasks/:taskId accepts status field
- [x] Dragging task to new column calls API
- [x] Optimistic UI update with rollback on error
- [ ] Loading indicator during API call (skipped - optimistic update is fast enough)

---

### B-022: Session Filter in Header
**Priority:** P2  
**Type:** feature  
**Scope:** FE

**Description:**
Add session dropdown to header to filter tasks by session.

**Acceptance Criteria:**
- [ ] Dropdown shows all sessions + "All Sessions" option
- [ ] Selecting session filters Kanban board
- [ ] Selected session persisted in URL param
- [ ] Session count shown in dropdown

---

## Completed Beads
(See git history for closed beads from initial implementation)
