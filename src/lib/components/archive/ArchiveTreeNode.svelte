<script lang="ts">
  type ArchiveNode = {
    NodeKey: string;
    NodeType: string;
    Label: string;
    DirectCount: number;
    TotalDocCount: number;
    Url: string | null;
    Children: ArchiveNode[];
  };

  export let node: ArchiveNode;
  export let depth = 0;

  // null means "use the automatic default";
  // once the user clicks, true/false takes over.
  let expanded: boolean | null = null;

  $: hasChildren = node.Children && node.Children.length > 0;
  $: isFile = node.NodeType === "file";
  $: isDocument = node.NodeType === "document";
  $: autoOpen = shouldAutoOpen(node);
  $: isExpanded = expanded ?? autoOpen;

  $: fileCount = countFiles(node);
  $: countText = isDocument
    ? ` — ${fileCount} ${fileCount === 1 ? "file" : "files"}`
    : node.NodeType === "file"
      ? ""
      : ` (${node.DirectCount} direct / ${node.TotalDocCount} total)`;

  function shouldAutoOpen(n: ArchiveNode): boolean {
    return n.NodeType !== "document" && n.NodeType !== "file" && (n.Children ?? []).length === 1;
  }

  function toggle() {
    expanded = !isExpanded;
  }

  function countFiles(n: ArchiveNode): number {
    if (n.NodeType === "file") return 1;
    return (n.Children ?? []).reduce((total, c) => total + countFiles(c), 0);
  }

  function labelForGroup(label: string) {
    return label === "doc" ? "truth" : label;
  }

  function fileNodesUnder(n: ArchiveNode): ArchiveNode[] {
    const out: ArchiveNode[] = [];

    function walk(x: ArchiveNode) {
      if (x.NodeType === "file") {
        out.push(x);
        return;
      }

      for (const c of x.Children ?? []) {
        walk(c);
      }
    }

    walk(n);
    return out;
  }

  function componentGroups(n: ArchiveNode) {
    return (n.Children ?? []).filter((c) => c.NodeType === "componentGroup");
  }

  function componentSubtypes(group: ArchiveNode) {
    return (group.Children ?? []).filter((c) => c.NodeType === "componentSubtype");
  }
</script>

<li>
  <div class="row" class:document={isDocument}>
    {#if hasChildren}
      <button type="button" on:click={toggle} class="twisty">
        {#if isExpanded}▾{:else}▸{/if}
      </button>
    {:else}
      <span class="spacer"></span>
    {/if}

    {#if isFile && node.Url}
      <a href={node.Url} target="_blank" rel="noopener noreferrer">{node.Label}</a>
    {:else}
      <span>{node.Label}{countText}</span>
    {/if}
  </div>

  {#if hasChildren && isExpanded}
    {#if isDocument}
      <div class="docDetail">
        {#each componentGroups(node) as group (group.NodeKey)}
          {#if labelForGroup(group.Label) === "truth"}
            {#each fileNodesUnder(group) as f (f.NodeKey)}
              <div class="fileLine">
                <span class="fileKind">truth:</span>
                {#if f.Url}
                  <a href={f.Url} target="_blank" rel="noopener noreferrer">{f.Label}</a>
                {:else}
                  <span>{f.Label}</span>
                {/if}
              </div>
            {/each}
          {:else}
            <div class="sectionLabel">{labelForGroup(group.Label)}:</div>

            {#each componentSubtypes(group) as subtype (subtype.NodeKey)}
              {#each fileNodesUnder(subtype) as f (f.NodeKey)}
                <div class="fileLine nested">
                  <span class="fileKind">{subtype.Label}:</span>
                  {#if f.Url}
                    <a href={f.Url} target="_blank" rel="noopener noreferrer">{f.Label}</a>
                  {:else}
                    <span>{f.Label}</span>
                  {/if}
                </div>
              {/each}
            {/each}
          {/if}
        {/each}
      </div>
    {:else}
      <ul>
        {#each node.Children as c (c.NodeKey)}
          <svelte:self node={c} depth={depth + 1} />
        {/each}
      </ul>
    {/if}
  {/if}
</li>

<style>
  li {
    list-style: none;
  }

  ul {
    list-style: none;
    padding-left: 18px;
    margin: 2px 0 6px 0;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
    line-height: 1.35;
  }

  .document {
    font-weight: 700;
    margin-top: 4px;
  }

  .twisty {
    width: 28px;
    min-width: 28px;
  }

  .spacer {
    display: inline-block;
    width: 28px;
    min-width: 28px;
  }

  .docDetail {
    margin: 2px 0 8px 36px;
    font-weight: 400;
  }

  .sectionLabel {
    margin-top: 4px;
    font-weight: 700;
  }

  .fileLine {
    display: flex;
    gap: 6px;
    align-items: baseline;
    line-height: 1.35;
    margin: 1px 0;
  }

  .fileLine.nested {
    margin-left: 18px;
  }

  .fileKind {
    font-weight: 700;
    min-width: 72px;
  }
</style>
