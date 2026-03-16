<script lang="ts">
  export type Node = {
    NodeId: number;
    ParentNodeId: number | null;
    NodeType: string;
    FriendlyName: string;
    GoogleFileId: string | null;
    ExternalUrl: string | null;
    ClickUrl: string | null;
    OpenMode: string | null;
    SortOrder: number;
  };

  export let node: Node;

  export let getChildren: (parentId: number) => Promise<void>;

  // ✅ default guards so it never crashes during first render/hydration
  export let expandedIds: number[] = [];
  export let childrenMap: Record<number, Node[]> = {};

  export let toggle: (id: number) => Promise<void>;
  export let select: (id: number) => void;
  export let selectedId: number | null = null;

  function nodeUrl(n: Node): string | null {
    // ✅ Prefer server-computed URL
    if (n.ClickUrl) return n.ClickUrl;

    // Fallbacks (fine to keep)
    if (
      n.GoogleFileId &&
      (n.NodeType === "gdrive" || n.NodeType === "gdoc" || n.NodeType === "gsheet" || n.NodeType === "gslides")
    ) {
      return `https://drive.google.com/open?id=${encodeURIComponent(n.GoogleFileId)}`;
    }
    if (n.ExternalUrl) return n.ExternalUrl;

    return null;
  }

  $: url = nodeUrl(node);
  $: openInNewTab = (node.OpenMode ?? "newtab") === "newtab";
  $: isFolder = node.NodeType === "folder" && !url;

  // ✅ array, not function — and safe even if expandedIds undefined
  $: expanded = (expandedIds ?? []).includes(node.NodeId);
  $: kids = expanded ? (childrenMap?.[node.NodeId] ?? []) : [];
</script>

<li>
  <div style="display:flex; align-items:center; gap:8px;">
    {#if isFolder}
      <button type="button" on:click={() => toggle(node.NodeId)} style="width:28px;">
        {#if expanded}▾{:else}▸{/if}
      </button>

      <button
        type="button"
        on:click={() => select(node.NodeId)}
        style="text-align:left; border:0; background:transparent; padding:2px 6px; {selectedId===node.NodeId ? 'font-weight:700; text-decoration:underline;' : ''}"
      >
        {node.FriendlyName}
      </button>
    {:else if url}
      <span style="display:inline-block; width:28px;"></span>
      <a
        href={url}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        on:click={() => select(node.NodeId)}
        style="{selectedId===node.NodeId ? 'font-weight:700; text-decoration:underline;' : ''}"
      >
        {node.FriendlyName}
      </a>
    {:else}
      <span style="display:inline-block; width:28px;"></span>
      <span>{node.FriendlyName}</span>
    {/if}
  </div>

  {#if isFolder && expanded}
    <ul style="list-style:none; padding-left:18px; margin:4px 0 8px 0;">
      {#each kids as c (c.NodeId)}
        <svelte:self
          node={c}
          {getChildren}
          {expandedIds}
          {childrenMap}
          {toggle}
          {select}
          {selectedId}
        />
      {/each}
    </ul>
  {/if}
</li>
