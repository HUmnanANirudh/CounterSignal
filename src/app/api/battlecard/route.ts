import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import type { PipelineStage } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const competitorName = body.competitorName?.trim();

    if (!competitorName) {
      return NextResponse.json({ error: "competitorName is required" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          await runPipeline(competitorName, {
            onStageChange: (stage: PipelineStage, message: string) => {
              sendEvent({ type: "status", stage, message });
            },
            onChunk: (markdown: string) => {
              sendEvent({ type: "chunk", content: markdown });
            },
            onComplete: (battlecard) => {
              sendEvent({ type: "done", battlecard });
              controller.close();
            },
            onError: (error: Error) => {
              sendEvent({ type: "error", message: error.message });
              controller.close();
            },
          });
        } catch (error) {
          sendEvent({ type: "error", message: error instanceof Error ? error.message : "Unknown error" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}