import { fal } from "@fal-ai/client";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

const PHOTOREAL_PROMPT = `Transform this person into a photoreal vampire while keeping them unmistakably the same individual. Preserve exact facial structure, bone structure, eye shape, nose, mouth, hairline, age, and likeness. Pale porcelain undead skin with cool undertones, subtle crimson irises, faintly visible fangs when the mouth is slightly parted or closed with a hint of fang, dark hollows under the eyes, aristocratic stillness, cinematic low-key lighting, sharp photographic detail, no costume makeup, no cartoon, no painting, no illustration.`;

const HF_KONTEXT_MODEL = "black-forest-labs/FLUX.1-Kontext-dev";
const FAL_PRO_ENDPOINT = "fal-ai/flux-pro/kontext";
const FAL_DEV_ENDPOINT = "fal-ai/flux-kontext/dev";

type FalVariant = "pro" | "dev";

export class PortraitConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortraitConfigError";
  }
}

export class PortraitGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortraitGenerationError";
  }
}

function hfToken(): string | undefined {
  return process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
}

export function hasPortraitProvider(): boolean {
  return Boolean(
    process.env.FAL_KEY || process.env.REPLICATE_API_TOKEN || hfToken()
  );
}

function providerHint(): string {
  return "Set FAL_KEY (preferred), HF_TOKEN (free Kontext-dev), or REPLICATE_API_TOKEN in .env.local.";
}

type PortraitModelMode = "auto" | "pro" | "dev";
type PortraitProviderMode = "auto" | "fal" | "hf" | "replicate";

function portraitModelMode(): PortraitModelMode {
  const mode = (process.env.PORTRAIT_MODEL || "auto").toLowerCase();
  if (mode === "pro" || mode === "dev" || mode === "auto") return mode;
  return "auto";
}

function portraitProviderMode(): PortraitProviderMode {
  const mode = (process.env.PORTRAIT_PROVIDER || "auto").toLowerCase();
  if (
    mode === "fal" ||
    mode === "hf" ||
    mode === "replicate" ||
    mode === "auto"
  ) {
    return mode;
  }
  return "auto";
}

function isBillingLockError(err: unknown): boolean {
  const text = formatProviderError(err, "provider").toLowerCase();
  return (
    text.includes("exhausted balance") ||
    text.includes("user is locked") ||
    text.includes("top up your balance")
  );
}

function falVariants(): FalVariant[] {
  const mode = portraitModelMode();
  switch (mode) {
    case "dev":
      return ["dev"];
    case "pro":
      return ["pro"];
    case "auto":
      return ["pro", "dev"];
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

async function persistVampireUrl(url: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return url;
  const img = await fetch(url);
  if (!img.ok) return url;
  const buf = Buffer.from(await img.arrayBuffer());
  const stored = await put(`portraits/vampire-${nanoid()}.jpg`, buf, {
    access: "public",
    contentType: "image/jpeg",
  });
  return stored.url;
}

async function persistVampireBytes(
  bytes: Buffer,
  contentType = "image/jpeg"
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  }
  const stored = await put(`portraits/vampire-${nanoid()}.jpg`, bytes, {
    access: "public",
    contentType,
  });
  return stored.url;
}

async function ensureFalImageUrl({
  imageBuffer,
  contentType,
  mortalUrl,
}: {
  imageBuffer: Buffer;
  contentType: string;
  mortalUrl: string;
}): Promise<string> {
  if (mortalUrl.startsWith("http")) return mortalUrl;

  const blob = new Blob([new Uint8Array(imageBuffer)], { type: contentType });
  const file = new File([blob], `mortal-${nanoid(6)}.jpg`, {
    type: contentType,
  });
  return fal.storage.upload(file);
}

function extractFalImageUrl(data: {
  images?: Array<{ url?: string }>;
  image?: { url?: string };
}): string | undefined {
  return data.images?.[0]?.url ?? data.image?.url;
}

function formatProviderError(err: unknown, label: string): string {
  if (!(err instanceof Error)) return `${label} failed`;

  const withBody = err as Error & {
    status?: number;
    body?: { detail?: unknown; message?: string };
  };
  const detail = withBody.body?.detail;
  const detailText =
    typeof detail === "string"
      ? detail
      : detail != null
        ? JSON.stringify(detail).slice(0, 240)
        : withBody.body?.message;

  if (detailText) {
    const status = withBody.status ? ` (${withBody.status})` : "";
    return `${label}${status}: ${detailText}`;
  }

  return err.message || `${label} failed`;
}

async function generateWithFal({
  imageBuffer,
  contentType,
  mortalUrl,
  variant,
}: {
  imageBuffer: Buffer;
  contentType: string;
  mortalUrl: string;
  variant: FalVariant;
}): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new PortraitConfigError("FAL_KEY is not set");
  }

  fal.config({ credentials: falKey });
  const imageUrl = await ensureFalImageUrl({
    imageBuffer,
    contentType,
    mortalUrl,
  });

  if (variant === "dev") {
    const result = await fal.subscribe(FAL_DEV_ENDPOINT, {
      input: {
        prompt: PHOTOREAL_PROMPT,
        image_url: imageUrl,
        guidance_scale: 2.5,
        num_images: 1,
        output_format: "jpeg",
        resolution_mode: "3:4",
        enable_safety_checker: false,
      },
    });
    const url = extractFalImageUrl(
      result.data as {
        images?: Array<{ url?: string }>;
        image?: { url?: string };
      }
    );
    if (!url) {
      throw new PortraitGenerationError("fal Kontext-dev returned no image");
    }
    return persistVampireUrl(url);
  }

  const result = await fal.subscribe(FAL_PRO_ENDPOINT, {
    input: {
      prompt: PHOTOREAL_PROMPT,
      image_url: imageUrl,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "jpeg",
      safety_tolerance: "5",
      aspect_ratio: "3:4",
    },
  });

  const url = extractFalImageUrl(
    result.data as {
      images?: Array<{ url?: string }>;
      image?: { url?: string };
    }
  );
  if (!url) {
    throw new PortraitGenerationError("fal Kontext Pro returned no image");
  }
  return persistVampireUrl(url);
}

async function generateWithReplicate(mortalUrl: string): Promise<string> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    throw new PortraitConfigError("REPLICATE_API_TOKEN is not set");
  }

  const res = await fetch(
    "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateToken}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt: PHOTOREAL_PROMPT,
          input_image: mortalUrl,
          aspect_ratio: "3:4",
          output_format: "jpg",
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new PortraitGenerationError(
      `Replicate failed (${res.status}): ${body.slice(0, 200)}`
    );
  }

  const data = await res.json();
  const url = Array.isArray(data.output) ? data.output[0] : data.output;
  if (typeof url !== "string") {
    throw new PortraitGenerationError("Replicate returned no image");
  }
  return persistVampireUrl(url);
}

/**
 * Free-tier path via Hugging Face Inference Providers → FLUX.1-Kontext-dev.
 * Uses HF credits (includes a free monthly allowance).
 */
async function generateWithHuggingFace({
  imageBuffer,
  contentType,
  mortalUrl,
}: {
  imageBuffer: Buffer;
  contentType: string;
  mortalUrl: string;
}): Promise<string> {
  const token = hfToken();
  if (!token) {
    throw new PortraitConfigError("HF_TOKEN is not set");
  }

  const imageUrl = mortalUrl.startsWith("http")
    ? mortalUrl
    : `data:${contentType};base64,${imageBuffer.toString("base64")}`;

  // Provider-mapped endpoint for Kontext-dev (fal-ai/flux-kontext/dev).
  const res = await fetch(
    `https://router.huggingface.co/fal-ai/${FAL_DEV_ENDPOINT}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: PHOTOREAL_PROMPT,
        image_url: imageUrl,
        guidance_scale: 2.5,
        num_images: 1,
        output_format: "jpeg",
        resolution_mode: "3:4",
        enable_safety_checker: false,
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new PortraitGenerationError(
      `Hugging Face failed (${res.status}): ${body.slice(0, 240)}`
    );
  }

  const contentTypeOut = res.headers.get("content-type") || "";
  if (contentTypeOut.startsWith("image/")) {
    const bytes = Buffer.from(await res.arrayBuffer());
    return persistVampireBytes(bytes, contentTypeOut);
  }

  const data = (await res.json()) as {
    images?: Array<{ url?: string }>;
    image?: { url?: string };
  };
  const url = extractFalImageUrl(data);
  if (!url) {
    throw new PortraitGenerationError("Hugging Face returned no image");
  }
  return persistVampireUrl(url);
}

/**
 * Identity-preserving photoreal vampire portrait.
 * Provider order depends on PORTRAIT_PROVIDER:
 * - auto: fal → Replicate → HF (free)
 * - hf / fal / replicate: that provider only
 * Throws when no provider is configured or generation fails.
 */
export async function generateVampirePortrait({
  imageBuffer,
  contentType,
  mortalUrl,
}: {
  imageBuffer: Buffer;
  contentType: string;
  mortalUrl: string;
}): Promise<string> {
  if (!hasPortraitProvider()) {
    throw new PortraitConfigError(
      `Turning model not configured. ${providerHint()}`
    );
  }

  const errors: string[] = [];
  const provider = portraitProviderMode();
  const tryFal = provider === "auto" || provider === "fal";
  const tryReplicate = provider === "auto" || provider === "replicate";
  const tryHf = provider === "auto" || provider === "hf";

  // Free path first when explicitly selected, or when auto and only HF is set.
  const preferHf =
    provider === "hf" || (provider === "auto" && hfToken() && !process.env.FAL_KEY);

  const runHf = async () => {
    if (!tryHf || !hfToken()) return null;
    try {
      return await generateWithHuggingFace({
        imageBuffer,
        contentType,
        mortalUrl,
      });
    } catch (err) {
      console.error("huggingface portrait failed", err);
      errors.push(formatProviderError(err, "huggingface"));
      return null;
    }
  };

  if (preferHf) {
    const hf = await runHf();
    if (hf) return hf;
  }

  if (tryFal && process.env.FAL_KEY) {
    for (const variant of falVariants()) {
      try {
        return await generateWithFal({
          imageBuffer,
          contentType,
          mortalUrl,
          variant,
        });
      } catch (err) {
        console.error(`fal ${variant} portrait failed`, err);
        errors.push(formatProviderError(err, `fal ${variant}`));
        if (isBillingLockError(err)) break;
      }
    }
  }

  if (tryReplicate && process.env.REPLICATE_API_TOKEN) {
    try {
      return await generateWithReplicate(mortalUrl);
    } catch (err) {
      console.error("replicate portrait failed", err);
      errors.push(formatProviderError(err, "replicate"));
    }
  }

  if (!preferHf) {
    const hf = await runHf();
    if (hf) return hf;
  }

  throw new PortraitGenerationError(
    `Could not turn the portrait. ${errors.join(" · ")}`
  );
}

/** @deprecated Use generateVampirePortrait */
export const generateSalonPortrait = generateVampirePortrait;
