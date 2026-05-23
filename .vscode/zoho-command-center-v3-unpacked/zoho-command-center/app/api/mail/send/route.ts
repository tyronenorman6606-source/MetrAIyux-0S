import { NextResponse } from "next/server";
import { sendMail } from "@/lib/zoho";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.toAddress || !body.subject || !body.content) {
      return NextResponse.json({ ok: false, error: "toAddress, subject, and content are required" }, { status: 400 });
    }

    const result = await sendMail({
      toAddress: body.toAddress,
      subject: body.subject,
      content: body.content,
      ccAddress: body.ccAddress,
      bccAddress: body.bccAddress,
      fromAddress: body.fromAddress,
      mailFormat: body.mailFormat === "plaintext" ? "plaintext" : "html"
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
