/** Event-to-publication latency from the recorded timestamps (ISO 8601 UTC; null when a stage did not happen). */
export type Timestamps = {
  originUtc: string | null;
  detectedAtUtc: string | null;
  productionStartedAtUtc: string | null;
  renderCompletedAtUtc: string | null;
  uploadedAtUtc: string | null;
  publishedAtUtc: string | null;
};

const between = ( from: string | null, to: string | null ): number | null =>
  from && to && Number.isFinite( Date.parse( from ) ) && Number.isFinite( Date.parse( to ) ) ? Date.parse( to ) - Date.parse( from ) : null;

export function latencyOf( t: Timestamps ) {
  return {
    originToDetectionMs: between( t.originUtc, t.detectedAtUtc ),
    detectionToProductionMs: between( t.detectedAtUtc, t.productionStartedAtUtc ),
    productionToRenderMs: between( t.productionStartedAtUtc, t.renderCompletedAtUtc ),
    renderToUploadMs: between( t.renderCompletedAtUtc, t.uploadedAtUtc ),
    uploadToPublicMs: between( t.uploadedAtUtc, t.publishedAtUtc ),
    originToPublicMs: between( t.originUtc, t.publishedAtUtc )
  };
}
