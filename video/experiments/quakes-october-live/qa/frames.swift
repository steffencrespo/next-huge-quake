// swift qa/frames.swift <mp4> [step=0.5] : decodes the file with AVFoundation (independent of ffmpeg), samples frames at 192x108,
// prints per-sample mean luma and mean abs difference to the previous sample, plus first-vs-last-frame difference (loop seam).
import AVFoundation
import CoreGraphics
let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let step = args.count > 2 ? Double(args[2])! : 0.5
let asset = AVURLAsset(url: url)
let dur = CMTimeGetSeconds(asset.duration)
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
gen.maximumSize = CGSize(width: 192, height: 108)
func pixels(_ t: Double) -> [UInt8]? {
  guard let img = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) else { return nil }
  let w = img.width, h = img.height
  var buf = [UInt8](repeating: 0, count: w * h * 4)
  let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
  return buf
}
func luma(_ p: [UInt8]) -> Double { var s = 0.0; for i in stride(from: 0, to: p.count, by: 4) { s += 0.2126 * Double(p[i]) + 0.7152 * Double(p[i+1]) + 0.0722 * Double(p[i+2]) }; return s / Double(p.count / 4) }
func diff(_ a: [UInt8], _ b: [UInt8]) -> Double { var s = 0.0; for i in 0..<a.count where i % 4 != 3 { s += abs(Double(a[i]) - Double(b[i])) }; return s / Double(a.count / 4 * 3) }
print("duration \(dur)")
var prev: [UInt8]? = nil
var t = 0.0
var minL = 999.0, minD = 999.0, failures = 0
while t < dur - 0.01 {
  guard let p = pixels(t) else { print(String(format: "t=%.2f DECODE-FAIL", t)); failures += 1; t += step; continue }
  let l = luma(p); let d = prev.map { diff($0, p) } ?? -1
  print(String(format: "t=%.2f luma=%.2f diff=%.3f", t, l, d))
  minL = min(minL, l); if d >= 0 { minD = min(minD, d) }
  prev = p; t += step
}
let first = pixels(0)!, last = pixels(dur - 1.0 / 30.0)!, second = pixels(1.0 / 30.0)!
print(String(format: "SUMMARY minLuma=%.2f minDiff=%.3f decodeFailures=%d seam(last->first)=%.3f firstStep(0->1)=%.3f", minL, minD, failures, diff(last, first), diff(first, second)))
