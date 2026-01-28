# PRD-002: ClawdBot Task Viewer UI Overhaul

**Version:** 1.0  
**Date:** 2026-01-28  
**Author:** Agent  
**Status:** DRAFT  
**Research:** [RESEARCH-002-UI-OVERHAUL.md](../research/RESEARCH-002-UI-OVERHAUL.md)

---

## 1. Executive Summary

Transform the ClawdBot Task Viewer from a functional "developer tool" into a polished "command center" dashboard, inspired by Auto-Claude's design language. This builds user trust by presenting an organized, professional interface for monitoring AI agent tasks.

---

## 2. Goals

| Goal | Metric |
|------|--------|
| Reduce eye strain | Dark theme default |
| Maximize Kanban visibility | Header ≤64px, no sidebar |
| Improve glanceability | Priority pips, timestamps visible without hover |
| Enable task reordering | Drag-drop within columns |
| Maintain all functionality | Zero feature regression |

---

## 3. User Stories

### US-010: Dark Theme
**As a** PM monitoring tasks for extended periods  
**I want** a dark/slate theme  
**So that** eye strain is reduced

**Acceptance Criteria:**
- [ ] Background uses dark values (~#0f172a)
- [ ] All text meets WCAG AA contrast (4.5:1 minimum)
- [ ] No hardcoded light colors remain (no `bg-white`, `text-gray-*`)
- [ ] All dialogs use dark theme

---

### US-011: Command Center Header
**As a** user navigating the dashboard  
**I want** a consolidated header  
**So that** the Kanban board has maximum vertical space

**Acceptance Criteria:**
- [ ] Fixed header height ≤64px
- [ ] Contains: logo/title, search bar, session dropdown, health LEDs, refresh, +New Task
- [ ] Search shows results dropdown (not separate section)
- [ ] Session dropdown replaces sidebar
- [ ] Health shows DB/Redis as pulsing LED indicators (green=ok, red=error)

---

### US-012: Enhanced Task Cards
**As a** user scanning the board  
**I want** rich, glanceable cards  
**So that** I can assess status quickly

**Acceptance Criteria:**
- [ ] Priority color pip visible (left border: P0=red, P1=orange, P2=yellow, P3=blue, P4=gray)
- [ ] Relative timestamp shown ("2m ago") without hover
- [ ] Status badge with color coding
- [ ] Blocker/blocks icons preserved
- [ ] Status-specific styling:
  - Pending: dashed border or muted
  - In Progress: subtle glow effect
  - Completed: reduced opacity (~70%)
- [ ] Hover reveals quick-action buttons (Edit, Delete) for pending tasks

---

### US-013: Interactive Kanban Columns
**As a** PM managing tasks  
**I want** columns with stats and drag-drop  
**So that** I can see distribution and reorder tasks

**Acceptance Criteria:**
- [ ] Column header shows count ("Pending (3)")
- [ ] Column header shows percentage of total ("25%")
- [ ] Drag-drop reorders tasks within same column
- [ ] Visual feedback during drag (card elevation, drop zone highlight)
- [ ] Empty column shows styled placeholder

---

### US-014: Fixed Viewport Layout
**As a** user with varying task counts  
**I want** a fixed viewport layout  
**So that** the header stays visible and columns scroll independently

**Acceptance Criteria:**
- [ ] App uses 100vh fixed height
- [ ] Header never scrolls
- [ ] Each column scrolls independently when content overflows
- [ ] Horizontal scroll if columns exceed viewport width

---

### US-015: Typography
**As a** user reading the interface  
**I want** professional typography  
**So that** the dashboard feels polished

**Acceptance Criteria:**
- [ ] Inter font for UI text
- [ ] JetBrains Mono for task IDs/numbers
- [ ] Consistent font weights (400, 500, 600)

---

## 4. Technical Specification

### 4.1 Dependencies

**Add:**
```json
{
  "@hello-pangea/dnd": "^16.6.0"
}
```

### 4.2 CSS Changes

**index.css — Replace :root with dark values:**
```css
:root {
  --background: 222 47% 6%;        /* #0f172a */
  --foreground: 210 40% 98%;       /* #f8fafc */
  --card: 222 47% 8%;              /* #131c2e */
  --muted: 217 33% 14%;            /* #1e293b */
  --border: 217 33% 20%;           /* #334155 */
  --primary: 173 80% 40%;          /* Cyan accent */
  /* ... rest of tokens */
}
```

**Add utility classes:**
```css
.glass { @apply bg-card/80 backdrop-blur-sm; }
.glow-progress { box-shadow: 0 0 20px -5px hsl(var(--primary) / 0.4); }
.led-pulse { animation: led-pulse 2s ease-in-out infinite; }
```

### 4.3 Component Architecture

```
src/components/
├── Header.tsx           # NEW — Command center header
├── KanbanColumn.tsx     # NEW — Column with stats + droppable
├── TaskCard.tsx         # MODIFY — Add pips, timestamps, hover actions
├── TaskDetailDialog.tsx # MODIFY — Dark theme styling
├── TaskEditDialog.tsx   # MODIFY — Dark theme styling
├── TaskCreateDialog.tsx # MODIFY — Dark theme styling
├── SessionsSidebar.tsx  # DELETE — Replaced by Header dropdown
├── TaskSearch.tsx       # DELETE — Integrated into Header
└── KanbanBoard.tsx      # DELETE — Already unused
```

### 4.4 App.tsx Structure

```tsx
<div className="h-screen flex flex-col bg-background">
  <Header /> {/* Fixed, ~56-64px */}
  <main className="flex-1 overflow-hidden p-6">
    <DragDropContext>
      <div className="h-full flex gap-6 overflow-x-auto">
        <KanbanColumn status="pending" />
        <KanbanColumn status="in_progress" />
        <KanbanColumn status="completed" />
      </div>
    </DragDropContext>
  </main>
</div>
```

---

## 5. Beads

| ID | Description | Size | Dependencies |
|----|-------------|------|--------------|
| B-010 | Dark theme: update CSS tokens, remove .dark class | S | — |
| B-011 | Typography: add Inter + JetBrains Mono fonts | S | — |
| B-012 | Header component: logo, search dropdown, session dropdown, health LEDs, actions | M | B-010 |
| B-013 | TaskCard: priority pips, timestamps, status styling, hover actions | M | B-010 |
| B-014 | KanbanColumn: stats header, droppable area | M | B-010 |
| B-015 | App layout: 100vh, DragDropContext, remove sidebar | M | B-012, B-014 |
| B-016 | Dialog theming: dark styles for Detail, Edit, Create dialogs | S | B-010 |
| B-017 | Cleanup: delete SessionsSidebar, TaskSearch, KanbanBoard | S | B-015 |

**Total: 8 beads**

---

## 6. Out of Scope

- Cross-column drag-drop (requires API changes for status update)
- Light/dark theme toggle (dark-only per requirements)
- Mobile responsive design (desktop-first)
- Agent avatars on cards (no avatar data in API)

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hardcoded colors missed | M | Grep for `bg-white`, `text-gray`, `border-gray` |
| Dialog z-index issues | L | Test all dialogs after changes |
| Drag-drop performance | L | @hello-pangea/dnd is optimized |

---

## 8. Definition of Done

- [ ] All acceptance criteria pass
- [ ] No console errors
- [ ] Build succeeds (`npm run build`)
- [ ] Lighthouse accessibility ≥ 90
- [ ] All beads merged to master
- [ ] Pushed to origin

---

## 9. Approval

- [x] AL reviews and approves PRD (2026-01-28 14:08 PST)
- [ ] Proceed to bead execution
