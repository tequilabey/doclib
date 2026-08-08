<script lang="ts">
  import { onMount } from "svelte";
  import ArchiveTreeNode from "$lib/components/archive/ArchiveTreeNode.svelte";

  type ArchiveNode = {
    NodeKey: string;
    NodeType: string;
    Label: string;
    DirectCount: number;
    TotalDocCount: number;
    Url: string | null;
    Children: ArchiveNode[];
  };

  export let data: any;

  $: filters = data.Data.Filters;
  $: selected = data.Data.Selected;
  $: tree = data.Data.Tree as ArchiveNode[];
  $: docCount = tree.reduce((n: number, x: ArchiveNode) => n + x.TotalDocCount, 0);

  function selectedAttr(values: string[], value: string) {
    return values.includes(value);
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const hasFilters =
      params.has("documentType") ||
      params.has("collection") ||
      params.has("vendorSource") ||
      params.has("titleSearch");

    if (!hasFilters) {
      document.querySelectorAll("select[multiple]").forEach((el) => {
        const select = el as HTMLSelectElement;
        Array.from(select.options).forEach((option) => {
          option.selected = false;
        });
      });
    }
  });
</script>

<svelte:head>
  <title>Doc Library Archive</title>
</svelte:head>

<main>
  <h1>Doc Library Archive</h1>

  <form method="GET" class="filters" autocomplete="off">
    <label>
      <span class="filterTitle">Document type</span>
      <select name="documentType" multiple size="6" class="filterSelect" autocomplete="off">
        {#each filters.DocumentTypes as x}
          <option value={x} selected={selectedAttr(selected.documentTypes, x)}>{x}</option>
        {/each}
      </select>
    </label>

    <label>
      <span class="filterTitle">Collection</span>
      <select name="collection" multiple size="6" class="filterSelect" autocomplete="off">
        {#each filters.Collections as x}
          <option value={x} selected={selectedAttr(selected.collections, x)}>{x}</option>
        {/each}
      </select>
    </label>

    <label>
      <span class="filterTitle">Vendor/source</span>
      <select name="vendorSource" multiple size="6" class="filterSelect" autocomplete="off">
        {#each filters.VendorSources as x}
          <option value={x} selected={selectedAttr(selected.vendorSources, x)}>{x}</option>
        {/each}
      </select>
    </label>

    <label>
      <span class="filterTitle">Title / text search</span>
      <input name="titleSearch" value={selected.titleSearch} autocomplete="off" />
    </label>

    <div class="hint">
      Multi-select: use Cmd-click on Mac or Ctrl-click on Windows/Linux.
    </div>

    <div class="actions">
      <button type="submit">Apply filters</button>
      <a href="/doclib/archive" data-sveltekit-reload class="buttonlink">Clear filters</a>
    </div>
  </form>

  <p>Showing {docCount} matching document(s).</p>

  {#if tree.length === 0}
    <p>No archive documents match the current filters.</p>
  {:else}
    <ul class="tree">
      {#each tree as n (n.NodeKey)}
        <ArchiveTreeNode node={n} />
      {/each}
    </ul>
  {/if}
</main>

<style>
  main {
    padding: 16px 20px;
    max-width: 1200px;
  }

  .filters {
    display: grid;
    grid-template-columns: repeat(4, minmax(180px, 1fr));
    gap: 12px;
    align-items: start;
    margin-bottom: 16px;
  }

  .filterTitle {
    display: block;
    font-weight: 700;
    margin-bottom: 4px;
  }

  select,
  input {
    width: 100%;
    box-sizing: border-box;
  }

  .filterSelect {
    min-height: 120px;
  }

  .filterSelect option {
    padding: 3px 6px;
  }

  .filterSelect option:checked {
    background: #0b63ce linear-gradient(0deg, #0b63ce, #0b63ce);
    color: white;
  }

  .filterSelect:focus option:checked {
    background: #0b63ce linear-gradient(0deg, #0b63ce, #0b63ce);
    color: white;
  }

  .hint {
    grid-column: 1 / -1;
    color: #555;
    font-size: 0.9rem;
  }

  .actions {
    grid-column: 1 / -1;
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .buttonlink {
    display: inline-block;
    padding: 2px 8px;
  }

  .tree {
    list-style: none;
    padding-left: 0;
  }

  @media (max-width: 800px) {
    .filters {
      grid-template-columns: 1fr;
    }

    .actions,
    .hint {
      grid-column: auto;
    }
  }
</style>
