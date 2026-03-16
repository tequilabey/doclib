<!-- src/routes/doclib/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import DoclibTreeNode from "$lib/components/DoclibTreeNode.svelte";

  let err: string | null = null;
  function noteErr(e: any) {
    err = e?.message ?? String(e);
    console.error(e);
  }

  type Node = {
    NodeId: number;
    ParentNodeId: number | null;
    NodeType: string;
    FriendlyName: string;
    GoogleFileId: string | null;
    ExternalUrl: string | null;
    OpenMode: string | null;
    SortOrder: number;
  };

  type NavState = { expandedIds: number[]; selectedId: number | null };

  const stateKey = "doclib-tree";
  const DEFAULT_STATE: NavState = { expandedIds: [], selectedId: null };

  let roots: Node[] = [];
  let nav: NavState = DEFAULT_STATE;

  // ✅ Reactive children cache: parentId -> Node[]
  let childrenMap: Record<number, Node[]> = {};
  const loadingChildren = new Set<number>();

  let loaded = false;
  let saving = false;
  let saveTimer: any = null;

  function isExpanded(id: number) {
    return nav.expandedIds.includes(id);
  }

  function getCachedChildren(parentId: number) {
    return childrenMap[parentId] ?? null;
  }

  async function fetchRoots() {
    const r = await fetch("/api/doclib/roots");
    if (!r.ok) throw new Error(`roots failed ${r.status}`);
    const j = await r.json();
    roots = (j.roots as Node[]).slice().sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0));
  }

  async function fetchChildren(parentId: number) {
    if (childrenMap[parentId] || loadingChildren.has(parentId)) return;

    loadingChildren.add(parentId);
    try {
      const r = await fetch(`/api/doclib/children?parentId=${encodeURIComponent(parentId)}`);
      if (!r.ok) throw new Error(`children failed ${r.status}`);
      const j = await r.json();
      const kids = (j.children as Node[]).slice().sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0));

      // ✅ IMPORTANT: reassign object so Svelte rerenders immediately
      childrenMap = {
        ...childrenMap,
        [parentId]: kids
      };
    } finally {
      loadingChildren.delete(parentId);
    }
  }

  function childrenOfFromCache(parentId: number) {
    return childrenMap[parentId] ?? [];
  }

  function collapseSubtree(startId: number) {
    const toRemove = new Set<number>();
    const stack = [startId];

    while (stack.length) {
      const cur = stack.pop()!;
      toRemove.add(cur);
      for (const c of childrenOfFromCache(cur)) stack.push(c.NodeId);
    }

    nav = {
      ...nav,
      expandedIds: nav.expandedIds.filter((x) => !toRemove.has(x)),
      selectedId: nav.selectedId !== null && toRemove.has(nav.selectedId) ? null : nav.selectedId
    };

    scheduleSave();
  }

  async function toggle(id: number) {
    if (nav.expandedIds.includes(id)) {
      // Optional: collapse entire subtree when collapsing a folder
      collapseSubtree(id);
      return;
    }

    // expanding
    nav = {
      ...nav,
      expandedIds: [...nav.expandedIds, id]
    };

    // fetch children if not cached
    if (!childrenMap[id]) {
      await fetchChildren(id);
    }

    scheduleSave();
  }

  function select(nodeId: number) {
    nav = {
      ...nav,
      selectedId: nodeId
    };
    scheduleSave();
  }

  function collapseAll() {
    nav = {
      ...nav,
      expandedIds: [],
      selectedId: null
    };
    scheduleSave();
  }

  async function loadNav() {
    const r = await fetch(`/api/doclib/navstate?key=${encodeURIComponent(stateKey)}`);
    if (!r.ok) throw new Error(`navstate failed ${r.status}`);
    const j = await r.json();
    nav = j.state ?? DEFAULT_STATE;

    if (!Array.isArray(nav.expandedIds)) nav = { ...nav, expandedIds: [] };
    if (typeof nav.selectedId !== "number" && nav.selectedId !== null) nav = { ...nav, selectedId: null };
  }

  function scheduleSave() {
    if (!loaded) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
  }

  async function saveNow() {
    saving = true;
    try {
      const r = await fetch(`/api/doclib/navstate?key=${encodeURIComponent(stateKey)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nav)
      });
      if (!r.ok) console.warn("navstate PUT failed", r.status);
    } finally {
      saving = false;
    }
  }

  async function warmExpandedPaths() {
    // Load children for all expanded ids so the tree renders open
    for (const id of nav.expandedIds) {
      await fetchChildren(id);
    }
  }

  onMount(() => {
    (async () => {
      try {
        await fetchRoots();
      } catch (e) {
        noteErr(e);
      }

      try {
        await loadNav();
      } catch (e) {
        noteErr(e);
      }

      try {
        await warmExpandedPaths();
      } catch (e) {
        noteErr(e);
      }
    })().finally(() => {
      loaded = true;
    });
  });
</script>

<h1>Doc Library</h1>

{#if err}
  <pre style="white-space:pre-wrap; padding:12px; border:1px solid #ccc;">
    {err}
  </pre>
{/if}

<div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
  <button type="button" on:click={collapseAll}>Collapse all</button>
  {#if saving}<span>Saving…</span>{/if}
</div>

{#if !loaded}
  <p>Loading…</p>
{:else}
  <ul style="list-style:none; padding-left:0;">
    {#each roots as r (r.NodeId)}
      <DoclibTreeNode
        node={r}
        getChildren={fetchChildren}
        expandedIds={nav.expandedIds}
        {childrenMap}
        {toggle}
        {select}
        selectedId={nav.selectedId}
      />
    {/each}
  </ul>
{/if}
