import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Tome · The Reddening",
  description: "Open the sealed book. Break nothing — only read.",
};

export default function TomePage() {
  return (
    <>
      {/* Fills the viewport under the site nav; covers footer for immersion */}
      <div className="fixed inset-x-0 top-[5.5rem] bottom-0 z-10 bg-[#5a534c] md:top-[6.25rem]">
        <iframe
          src="/storybook.html"
          title="The sealed tome"
          className="h-full w-full border-0"
          allow="fullscreen"
        />
      </div>
      {/* Keeps layout height so scroll/chrome stay stable */}
      <div className="h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-6.25rem)]" aria-hidden />
    </>
  );
}
