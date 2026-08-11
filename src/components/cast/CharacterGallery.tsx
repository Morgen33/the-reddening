/* eslint-disable @next/next/no-img-element */

export function CharacterGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const placeholder =
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect fill="#0F0D0C" width="400" height="500"/><text x="200" y="250" fill="#A2937A" text-anchor="middle" font-family="serif" font-size="18">No likeness yet</text></svg>`
    );

  if (images.length === 0) {
    return (
      <div>
        <div className="relative aspect-[4/5] w-full overflow-hidden border border-gilt/50">
          <img
            src={placeholder}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgba(15,13,12,0.5)]" />
        </div>
        <p className="font-ledger mt-2 text-center text-[0.65rem] tracking-wider text-vellum-dim uppercase">
          Portrait pending
        </p>
      </div>
    );
  }

  const [hero, ...rest] = images;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] w-full overflow-hidden border border-gilt/50">
        <img
          src={hero}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "contrast(1.06)" }}
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgba(15,13,12,0.5)]" />
      </div>
      {rest.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {rest.map((src) => (
            <li
              key={src}
              className="relative aspect-square overflow-hidden border border-gilt/40"
            >
              <img
                src={src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
