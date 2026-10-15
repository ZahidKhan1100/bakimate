/** Layout estimates for contacts-style SectionList (must stay in sync with row styles). */
export const SECTION_LIST_HEADER_HEIGHT = 28;
export const SECTION_LIST_ROW_HEIGHT = 58;
/** VirtualizedSectionList reserves a footer slot per section even when not rendered. */
const SECTION_LIST_FOOTER_HEIGHT = 0;

type SectionSlice = { title: string; data: unknown[] };

type FlatLayout = { length: number; offset: number; index: number };

export type SectionListScrollTarget = {
  scrollToLocation: (params: {
    sectionIndex: number;
    itemIndex: number;
    animated?: boolean;
    viewOffset?: number;
    viewPosition?: number;
  }) => void;
  getListRef?: () => {
    scrollToOffset?: (params: { offset: number; animated?: boolean }) => void;
    scrollToIndex?: (params: {
      index: number;
      animated?: boolean;
      viewOffset?: number;
      viewPosition?: number;
    }) => void;
  } | null;
};

/** Flat list index for the first row in a section (matches RN VirtualizedSectionList). */
export function getFlatIndexForSection(
  sections: SectionSlice[],
  sectionIndex: number,
  itemIndex = 0,
): number {
  let index = itemIndex;
  for (let i = 0; i < sectionIndex; i++) {
    index += sections[i].data.length + 2;
  }
  return index;
}

function buildFlatLayouts(sections: SectionSlice[]): FlatLayout[] {
  const layouts: FlatLayout[] = [];
  let offset = 0;
  let flatIndex = 0;

  for (const section of sections) {
    layouts[flatIndex] = { length: SECTION_LIST_HEADER_HEIGHT, offset, index: flatIndex };
    offset += SECTION_LIST_HEADER_HEIGHT;
    flatIndex += 1;

    for (let i = 0; i < section.data.length; i++) {
      layouts[flatIndex] = { length: SECTION_LIST_ROW_HEIGHT, offset, index: flatIndex };
      offset += SECTION_LIST_ROW_HEIGHT;
      flatIndex += 1;
    }

    layouts[flatIndex] = { length: SECTION_LIST_FOOTER_HEIGHT, offset, index: flatIndex };
    flatIndex += 1;
  }

  return layouts;
}

/** Enables reliable scrollToLocation / scrollToIndex for distant sections (e.g. W). */
export function createSectionListGetItemLayout(sections: SectionSlice[]) {
  const layouts = buildFlatLayouts(sections);
  return (_data: SectionSlice[] | null | undefined, index: number): FlatLayout =>
    layouts[index] ?? { length: SECTION_LIST_ROW_HEIGHT, offset: 0, index: 0 };
}

function scrollInnerList(
  list: SectionListScrollTarget,
  sections: SectionSlice[],
  sectionIndex: number,
  animated: boolean,
): void {
  const flatIndex = getFlatIndexForSection(sections, sectionIndex, 0);
  const layout = createSectionListGetItemLayout(sections)(sections, flatIndex);
  const inner = list.getListRef?.();

  if (inner?.scrollToOffset) {
    inner.scrollToOffset({ offset: layout.offset, animated });
    return;
  }
  if (inner?.scrollToIndex) {
    inner.scrollToIndex({
      index: flatIndex,
      animated,
      viewPosition: 0,
      viewOffset: 0,
    });
  }
}

/**
 * Jump a SectionList to a letter section (e.g. W). Uses inner VirtualizedList offset
 * when available, then scrollToLocation with retries.
 */
export function jumpSectionListToLetter(
  list: SectionListScrollTarget | null | undefined,
  sections: SectionSlice[],
  letter: string,
): number | null {
  const sectionIndex = sections.findIndex((s) => s.title === letter);
  if (sectionIndex < 0 || !list) {
    return null;
  }

  scrollInnerList(list, sections, sectionIndex, false);

  const scrollPrecise = (animated: boolean, delayMs: number) => {
    setTimeout(() => {
      scrollInnerList(list, sections, sectionIndex, animated);
      list.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated,
        viewOffset: 0,
        viewPosition: 0,
      });
    }, delayMs);
  };

  scrollPrecise(false, 0);
  scrollPrecise(false, 80);
  scrollPrecise(true, 200);

  return sectionIndex;
}
