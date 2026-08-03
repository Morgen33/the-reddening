export function Grain() {
  return (
    <svg
      className="atmosphere-grain"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="grain-filter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves="4"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-filter)" />
    </svg>
  );
}

export function Candlelight() {
  return <div className="atmosphere-candle" aria-hidden />;
}

export function Vignette() {
  return <div className="atmosphere-vignette" aria-hidden />;
}

export function Atmosphere() {
  return (
    <>
      <Candlelight />
      <Vignette />
      <Grain />
    </>
  );
}
