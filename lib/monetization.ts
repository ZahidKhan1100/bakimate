/**
 * Master switch for subscriptions (BakiPro paywall) and rewarded ads.
 * Off during the growth phase: every feature is free and no ads are shown.
 * Flip to true (and set BAKIMATE_SUBSCRIPTIONS_ENABLED=true on the API) to bring both back.
 */
export const MONETIZATION_ENABLED = false;
