import Foundation
import PDFKit
import AppKit

let args = CommandLine.arguments
let src = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
let scale = CGFloat(Double(args.count > 3 ? args[3] : "2.0") ?? 2.0)

guard let doc = PDFDocument(url: src) else { print("cannot open"); exit(1) }
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    let rect = page.bounds(for: .mediaBox)
    let size = NSSize(width: rect.width*scale, height: rect.height*scale)
    let img = NSImage(size: size)
    img.lockFocus()
    if let ctx = NSGraphicsContext.current?.cgContext {
        ctx.setFillColor(NSColor.white.cgColor)
        ctx.fill(CGRect(origin: .zero, size: size))
        ctx.scaleBy(x: scale, y: scale)
        ctx.translateBy(x: -rect.origin.x, y: -rect.origin.y)
        page.draw(with: .mediaBox, to: ctx)
    }
    img.unlockFocus()
    if let tiff = img.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
       let png = rep.representation(using: .png, properties: [:]) {
        let out = outDir.appendingPathComponent(String(format: "page-%02d.png", i+1))
        try? png.write(to: out)
        print("wrote page \(i+1): \(Int(rect.width))x\(Int(rect.height))pt -> \(Int(size.width))x\(Int(size.height))px")
    }
}
