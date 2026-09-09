import { networkInterfaces } from "node:os";
import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { errorResponse, json } from "../../event/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const requestHost = request.headers.get("host");
    const origin = requestHost
      ? `${request.nextUrl.protocol}//${requestHost}`
      : request.nextUrl.origin;
    const url = new URL(
      request.nextUrl.searchParams.get("page") === "celebration"
        ? "/celebration"
        : "/vote",
      process.env.NEXT_PUBLIC_STORK_SITE_URL || origin,
    );
    if (
      !process.env.NEXT_PUBLIC_STORK_SITE_URL &&
      !process.env.VERCEL &&
      ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(url.hostname)
    ) {
      const address = Object.values(networkInterfaces())
        .flat()
        .find(
          (entry) =>
            entry?.family === "IPv4" &&
            !entry.internal &&
            /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address),
        );
      if (address) url.hostname = address.address;
    }
    const dataUrl = await QRCode.toDataURL(url.href, {
      width: 480,
      margin: 4,
      errorCorrectionLevel: "M",
      color: { dark: "#193e32", light: "#ffffff" },
    });
    return json({ url: url.href, dataUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
