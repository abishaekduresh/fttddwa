# FTTDDWA Project Skills & Patterns

## Mobile Responsive Layout (Dashboard)

### Sidebar Drawer Pattern
The dashboard uses a **mobile-first sidebar drawer** pattern:

- **Mobile (`< lg`)**: Sidebar is a full-width (w-64) overlay drawer.
  - Starts hidden via `-translate-x-full`, slides in with `translate-x-0`
  - A dark backdrop (`bg-black/50 z-20 lg:hidden`) covers the content when open
  - Clicking the backdrop or a nav link closes the drawer
  - Shows an **X close button** (visible only on mobile via `lg:hidden`)
  - Always shows full text labels (not icon-only)
- **Desktop (`>= lg`)**: Sidebar is always visible, width toggles between `w-64` (expanded) and `w-16` (collapsed) via `lg:w-16`
  - Uses `lg:translate-x-0` to override the mobile translate
  - Shows a **Collapse chevron button** (visible only on desktop via `hidden lg:block`)

### Layout Margin Logic
Main content area uses `lg:ml-64` / `lg:ml-16` (not `ml-*`) so on mobile the content always fills the full width.

```tsx
// layout.tsx
<div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
  sidebarOpen ? "lg:ml-64" : "lg:ml-16"
}`}>
```

### Sidebar Default State
```tsx
const [sidebarOpen, setSidebarOpen] = useState(false); // mobile-first: start closed

useEffect(() => {
  if (window.innerWidth >= 1024) setSidebarOpen(true); // auto-open on desktop
}, []);
```

---

## Dual-View Pattern for Data Pages (Card + Table)

Data-heavy pages (Members, Users, Audit Logs) use a **dual-view** pattern:
- **Mobile (`< md`)**: Card/list view — each record is a compact card with the most important fields
- **Desktop (`>= md`)**: Full table view

```tsx
{/* Mobile card list — shown below md */}
<div className="card overflow-hidden md:hidden">
  {loading ? (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 animate-pulse space-y-2">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  ) : items.length === 0 ? (
    <div className="py-12 text-center text-slate-400">...</div>
  ) : (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.id} className="p-4 space-y-2">
          {/* compact card content */}
        </div>
      ))}
    </div>
  )}
  {paginationControls}
</div>

{/* Desktop table — hidden below md */}
<div className="card overflow-hidden hidden md:block">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">...</table>
  </div>
  {paginationControls}
</div>
```

### Mobile Card Anatomy

**Members card** — name + Tamil name + position / membershipId + district + taluk / phone + age + actions
```tsx
<div className="p-4 space-y-2">
  <div className="flex items-start justify-between gap-2">
    <div className="min-w-0">
      <Link className="font-medium text-slate-900">{member.name}</Link>
      <p className="text-xs text-slate-400 tamil">{member.nameTamil}</p>
    </div>
    <span className={statusColors[member.status]}>...</span>
  </div>
  <div className="flex items-center gap-2 text-xs">
    <span className="font-mono text-primary">{member.membershipId}</span>
    <span>•</span>
    <span className="flex items-center gap-0.5 text-slate-500">
      <MapPin size={11} /> {member.district}, {member.taluk}
    </span>
  </div>
  <div className="flex items-center justify-between">
    <span className="flex items-center gap-1 text-sm text-slate-600">
      <Phone size={12} /><span className="font-mono">{member.phone}</span>
    </span>
    {actionButtons(member)}
  </div>
</div>
```

**Users card** — avatar + name + email / role badge + status badge + last login
```tsx
<div className="p-4 space-y-2.5">
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-primary text-sm font-bold">{user.name.charAt(0)}</span>
      </div>
      <div className="min-w-0">
        <p className="font-medium text-slate-900 truncate">{user.name}</p>
        <p className="text-xs text-slate-400 truncate">{user.email}</p>
      </div>
    </div>
    {userActions(user)}
  </div>
  <div className="flex flex-wrap items-center gap-2 pl-12">
    <span className={roleColors[user.role.name]}>...</span>
    <span className={user.isActive ? "badge badge-green" : "badge badge-gray"}>...</span>
    <span className="text-xs text-slate-400">Last login {formatDateTime(...)}</span>
  </div>
</div>
```

**Audit log card** — action badge + status icon + time / resource / user info
```tsx
<div className="p-4 space-y-1.5">
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2">
      <span className={actionColors[log.action]}>...</span>
      {log.status === "SUCCESS" ? <CheckCircle size={14} className="text-green-500" /> : <XCircle ... />}
    </div>
    <span className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
  </div>
  <p className="text-sm text-slate-700"><span className="font-medium">{log.resource}</span></p>
  <p className="text-xs text-slate-500">{log.user?.name} · {log.userEmail}</p>
</div>
```

### Shared Action Buttons Pattern
Extract action buttons into a variable/function so they render identically in both mobile cards and desktop table cells:
```tsx
const actionButtons = (item: Item) => (
  <div className="flex items-center gap-1">
    <Link href={...} className="p-1.5 text-slate-400 hover:text-primary hover:bg-blue-50 rounded">
      <Eye size={15} />
    </Link>
    {hasPermission("...update") && <Link ...><Edit size={15} /></Link>}
    {hasPermission("...delete") && <button ...><Trash2 size={15} /></button>}
  </div>
);
```

### Shared Pagination Controls
Extract pagination into a variable so it renders once below both the mobile card list and the desktop table:
```tsx
const paginationControls = pagination && pagination.totalPages > 1 && (
  <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
    <p className="text-sm text-slate-500">
      <span className="hidden sm:inline">Showing X–Y of </span>
      {pagination.total.toLocaleString()} items
    </p>
    <div className="flex items-center gap-1">
      <button onClick={() => setPage(page - 1)} disabled={!pagination.hasPrev}>
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm text-slate-600 px-2">{pagination.page} / {pagination.totalPages}</span>
      <button onClick={() => setPage(page + 1)} disabled={!pagination.hasNext}>
        <ChevronRight size={16} />
      </button>
    </div>
  </div>
);
```

---

## Modal — Bottom Sheet on Mobile

Modals use bottom-sheet style on mobile, centered dialog on desktop:

```tsx
<div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
  <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
    ...
  </div>
</div>
```

---

## Filter Bar Mobile Pattern

Filter bars use `flex-col sm:flex-row` so inputs stack vertically on mobile:

```tsx
<div className="flex flex-col sm:flex-row flex-wrap gap-3">
  <div className="relative flex-1 min-w-0">  {/* min-w-0 prevents overflow */}
    <input className="form-input pl-9" />
  </div>
  <select className="form-input w-full sm:w-auto sm:min-w-40">...</select>
  <select className="form-input w-full sm:w-auto">...</select>
</div>
```

---

## Form Card Padding

```tsx
<div className="card p-4 sm:p-6">        {/* dashboard form cards */}
<div className="bg-white rounded-2xl p-5 sm:p-8">  {/* auth card */}
<main className="flex-1 p-4 sm:p-6 overflow-auto">  {/* main content area */}
```

---

## Form Submit Buttons (Mobile)

Submit/Cancel stacks with primary on top on mobile via `flex-col-reverse`:
```tsx
<div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-slate-200">
  <button className="btn btn-secondary">Cancel</button>
  <button className="btn btn-primary">Save</button>
</div>
```

---

## Header Buttons — Icon-only on Mobile

For pages where header buttons need to fit on small screens:
```tsx
<button className="btn btn-primary">
  <Plus size={16} />
  <span className="hidden sm:inline">Add Member</span>
  <span className="sm:hidden">Add</span>
</button>
```
