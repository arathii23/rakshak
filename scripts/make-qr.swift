// One-off developer tool (macOS only, no downloads): makes public/qr.svg for the app's address using Apple's
// built-in QR generator, then checks the result by reading it back with Apple's built-in QR reader.
//
//   swift scripts/make-qr.swift make https://rakshak-u47o.onrender.com public/qr.svg
//   swift scripts/make-qr.swift read some-picture.png      # prints what a QR code in the picture says
//
// The app itself needs no tool at run time: it only serves the finished public/qr.svg file.
import Foundation
import CoreImage
import CoreGraphics
import ImageIO
import Vision

func die(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8))
    exit(1)
}

/// Read QR codes from a picture; returns the texts they contain.
func decode(_ image: CGImage) -> [String] {
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    do { try handler.perform([request]) } catch { die("could not read the picture: \(error)") }
    return (request.results ?? []).compactMap { $0.payloadStringValue }
}

/// Draw the modules (true = dark) with a 4-module white border, scaled up, as a picture.
func picture(_ m: [[Bool]], scale: Int = 12) -> CGImage {
    let n = m.count + 8
    let size = n * scale
    guard let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
                              space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue) else { die("no drawing context") }
    ctx.setFillColor(gray: 1, alpha: 1)
    ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))
    ctx.setFillColor(gray: 0, alpha: 1)
    for (y, row) in m.enumerated() {
        for (x, dark) in row.enumerated() where dark {
            ctx.fill(CGRect(x: (x + 4) * scale, y: (n - 1 - (y + 4)) * scale, width: scale, height: scale))
        }
    }
    guard let img = ctx.makeImage() else { die("no picture") }
    return img
}

/// The QR symbol for `text` (error correction level M) as rows of modules, top row first.
func modules(_ text: String) -> [[Bool]] {
    guard let filter = CIFilter(name: "CIQRCodeGenerator") else { die("CIQRCodeGenerator is not available") }
    filter.setValue(Data(text.utf8), forKey: "inputMessage")
    filter.setValue("M", forKey: "inputCorrectionLevel")
    guard let out = filter.outputImage else { die("no QR output") }
    let w = Int(out.extent.width), h = Int(out.extent.height)
    var px = [UInt8](repeating: 255, count: w * h)
    CIContext().render(out, toBitmap: &px, rowBytes: w, bounds: out.extent, format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())
    var grid = [[Bool]](repeating: [Bool](repeating: false, count: w), count: h)
    for y in 0..<h { for x in 0..<w { grid[y][x] = px[y * w + x] < 128 } }
    // Keep only the symbol itself, in case Core Image added a white border.
    var minX = w, maxX = -1, minY = h, maxY = -1
    for y in 0..<h { for x in 0..<w where grid[y][x] { minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) } }
    guard maxX > minX, maxX - minX == maxY - minY else { die("unexpected QR shape") }
    return (minY...maxY).map { y in (minX...maxX).map { x in grid[y][x] } }
}

/// A small SVG: white background (so it scans in dark mode too), black modules, 4-module quiet zone.
func svg(_ m: [[Bool]], label: String) -> String {
    let n = m.count + 8
    var d = ""
    for (y, row) in m.enumerated() {
        var x = 0
        while x < row.count {
            if row[x] {
                var len = 1
                while x + len < row.count && row[x + len] { len += 1 }
                d += "M\(x + 4) \(y + 4)h\(len)v1h-\(len)z"
                x += len
            } else {
                x += 1
            }
        }
    }
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 \(n) \(n)\" shape-rendering=\"crispEdges\" role=\"img\" aria-label=\"\(label)\"><rect width=\"\(n)\" height=\"\(n)\" fill=\"#fff\"/><path d=\"\(d)\" fill=\"#000\"/></svg>\n"
}

let args = CommandLine.arguments
if args.count == 4, args[1] == "make" {
    var grid = modules(args[2])
    var found = decode(picture(grid))
    if found != [args[2]] { grid.reverse(); found = decode(picture(grid)) } // in case the rows came out upside down
    guard found == [args[2]] else { die("self-check failed: read back \(found)") }
    try svg(grid, label: "QR code that opens \(args[2])").write(toFile: args[3], atomically: true, encoding: .utf8)
    print("wrote \(args[3]): \(grid.count)x\(grid.count) modules; read back from the drawn symbol: \(found[0])")
} else if args.count == 3, args[1] == "read" {
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL, nil),
          let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { die("cannot open \(args[2])") }
    let found = decode(img)
    print(found.isEmpty ? "no QR code found" : found.joined(separator: "\n"))
    exit(found.isEmpty ? 2 : 0)
} else {
    die("usage: swift scripts/make-qr.swift make <address> <out.svg>   |   swift scripts/make-qr.swift read <picture>")
}
