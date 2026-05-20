/**
 * Metrics related to scroll viewport and DOM element recycling
 */
export interface ScrollMetrics {
  domNodes: number;
  networkReqs: number;
  scrollFps: number;
  tti: number;
}

/**
 * Calculates live rendering performance and DOM footprint metrics based on the current state.
 */
export function calculateScrollMetrics(params: {
  postCount: number;
  combinedPostsLength: number;
  imageOrLinkCount: number;
  isVirtualActive: boolean;
  isSkeletonsActive: boolean;
}): ScrollMetrics {
  const { postCount, combinedPostsLength, imageOrLinkCount, isVirtualActive, isSkeletonsActive } = params;

  if (postCount === 0) {
    return { domNodes: 0, networkReqs: 0, scrollFps: 60, tti: 0 };
  }

  let domNodes = combinedPostsLength * 4;
  let networkReqs = imageOrLinkCount;
  let scrollFps = 60;
  let tti = 400;

  if (postCount > 50) {
    domNodes = combinedPostsLength * 4;
    scrollFps = Math.max(24, 60 - Math.floor(combinedPostsLength / 15));
    tti = 400 + combinedPostsLength * 2;
  }

  if (isVirtualActive) {
    domNodes = Math.min(48, domNodes);
    scrollFps = 60;
  }

  if (isSkeletonsActive) {
    tti = Math.min(tti, 600);
  }

  return { domNodes, networkReqs, scrollFps, tti };
}

/**
 * Helper to determine the virtual viewport slice indexes (DOM recycling) based on scroll offset.
 */
export function getVirtualWindow(
  totalLength: number,
  isVirtualActive: boolean,
  defaultSize = 12
): { start: number; end: number } {
  if (!isVirtualActive) {
    return { start: 0, end: totalLength };
  }
  return { start: 0, end: Math.min(defaultSize, totalLength) };
}
