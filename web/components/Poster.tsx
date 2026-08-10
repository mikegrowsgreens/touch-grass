// WPA poster scene — CSS-only, offline art. Shows a trail-cam GIF when provided.

export default function Poster({
  critter,
  gifSrc,
}: {
  critter: string;
  gifSrc?: string;
}) {
  return (
    <div className="poster">
      {gifSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={gifSrc} alt="trail cam" />
      ) : (
        <>
          <div className="sun" />
          <div className="mtn mtn-far" />
          <div className="mtn mtn-mid" />
          <div className="mtn mtn-near" />
          <div className="meadow" />
          <div className="grassrow">
            {Array.from({ length: 11 }).map((_, i) => (
              <i key={i} />
            ))}
          </div>
          <div className="critter">{critter}</div>
        </>
      )}
    </div>
  );
}
