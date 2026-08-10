export default function Setup() {
  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-8">
      <div className="sign">
        <h1 className="park-name">Ranger Station</h1>
        <p className="park-sub">Opening shortly</p>
        <p className="notice mt-8 mb-8">
          The rangers are still hammering this sign together.
        </p>
        <p className="text-center mb-6" style={{ color: "var(--faded)" }}>
          Site selection, trail cam themes, pass rules, and guided phone setup
          arrive here next.
        </p>
        <div className="flex justify-center mb-4">
          <a href="/" className="cta cta-pine no-underline">
            Back to the park
          </a>
        </div>
      </div>
    </main>
  );
}
