import Foundation
import AppKit

// usage: imgtool in.png out.{png,jpg} cropXpct cropYpct cropWpct cropHpct targetW [quality]
let a = CommandLine.arguments
let inURL = URL(fileURLWithPath: a[1]); let outURL = URL(fileURLWithPath: a[2])
let cx = Double(a[3])!, cy = Double(a[4])!, cw = Double(a[5])!, ch = Double(a[6])!
let targetW = Int(a[7])!
let quality = a.count > 8 ? Double(a[8])! : 0.72

guard let src = NSImage(contentsOf: inURL), let cg = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("load fail"); exit(1) }
let W = Double(cg.width), H = Double(cg.height)
let rect = CGRect(x: cx*W, y: cy*H, width: cw*W, height: ch*H).integral
guard let cropped = cg.cropping(to: rect) else { print("crop fail"); exit(1) }
let scale = Double(targetW) / Double(cropped.width)
let tw = targetW, th = Int((Double(cropped.height)*scale).rounded())
guard let ctx = CGContext(data: nil, width: tw, height: th, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { exit(1) }
ctx.interpolationQuality = .high
ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: tw, height: th))
guard let out = ctx.makeImage() else { exit(1) }
let rep = NSBitmapImageRep(cgImage: out)
let isJPG = outURL.pathExtension.lowercased().hasPrefix("j")
let data = rep.representation(using: isJPG ? .jpeg : .png,
    properties: isJPG ? [.compressionFactor: quality] : [:])
try! data!.write(to: outURL)
print("\(outURL.lastPathComponent) \(tw)x\(th) \((data!.count)/1024)KB")
