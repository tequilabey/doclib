<script lang="ts">
  import DoclibTreeNodeInner from "./DoclibTreeNodeInner.svelte";

  export type Node = {
    NodeId: number;
    ParentNodeId: number | null;
    NodeType: string;
    FriendlyName: string;
    GoogleFileId: string | null;
    ExternalUrl: string | null;
    OpenMode: string | null;
    SortOrder: number;
  };

  export let node: Node;

  // fetcher (your +page.svelte has fetchChildren that returns Promise<void>)
  export let getChildren: (parentId: number) => Promise<void>;

  // ✅ data props, not functions
  export let expandedIds: number[] = [];
  export let childrenMap: Record<number, Node[]> = {};

  export let toggle: (id: number) => Promise<void>;
  export let select: (id: number) => void;
  export let selectedId: number | null = null;
</script>

<DoclibTreeNodeInner
  {node}
  {getChildren}
  {expandedIds}
  {childrenMap}
  {toggle}
  {select}
  {selectedId}
/>
