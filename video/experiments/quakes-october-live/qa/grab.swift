// swift qa/grab.swift <mp4> <outdir> <t1,t2,...> : writes 960x540 PNGs of the exact frames, decoded by AVFoundation.
import AVFoundation
import ImageIO
import UniformTypeIdentifiers
let a = CommandLine.arguments
let gen = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: a[1])))
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
gen.maximumSize = CGSize(width: 960, height: 540)
for s in a[3].split(separator: ",") {
  let t = Double(s)!
  let img = try! gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil)
  let dst = CGImageDestinationCreateWithURL(URL(fileURLWithPath: "\(a[2])/mp4-\(s).png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dst, img, nil); CGImageDestinationFinalize(dst)
}
