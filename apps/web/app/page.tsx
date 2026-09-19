export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <span className="badge">AI STAGE COPILOT</span>
        <h1>Smart Anchor</h1>
        <p>
          Real-time event control for organizers and anchors — from preparation
          to live execution.
        </p>
        <div className="cards">
          <div className="card">
            <h2>Organizer Control Room</h2>
            <p>Manage agenda, speakers, delays and live announcements.</p>
          </div>
          <div className="card">
            <h2>Anchor View</h2>
            <p>See what is happening now, what comes next and what to say.</p>
          </div>
          <div className="card">
            <h2>AI Recovery Engine</h2>
            <p>Generate contextual recovery scripts when the schedule changes.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
