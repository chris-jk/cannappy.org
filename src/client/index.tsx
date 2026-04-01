import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage } from "../shared";
import type { LegacyRef } from "react";

function App() {
  // A reference to the canvas element where we'll render the globe
  const canvasRef = useRef<HTMLCanvasElement>();
  // The number of markers we're currently displaying
  const [counter, setCounter] = useState(0);
  // A map of marker IDs to their positions
  // Note that we use a ref because the globe's `onRender` callback
  // is called on every animation frame, and we don't want to re-render
  // the component on every frame.
  const positions = useRef<
    Map<
      string,
      {
        location: [number, number];
        size: number;
      }
    >
  >(new Map());
  // Connect to the PartyServer server
  const socket = usePartySocket({
    room: "default",
    party: "globe",
    onMessage(evt) {
      const message = JSON.parse(evt.data as string) as OutgoingMessage;
      if (message.type === "add-marker") {
        // Add the marker to our map
        positions.current.set(message.position.id, {
          location: [message.position.lat, message.position.lng],
          size: message.position.id === socket.id ? 0.1 : 0.05,
        });
        // Update the counter
        setCounter((c) => c + 1);
      } else {
        // Remove the marker from our map
        positions.current.delete(message.id);
        // Update the counter
        setCounter((c) => c - 1);
      }
    },
  });

  useEffect(() => {
    // The angle of rotation of the globe
    // We'll update this on every frame to make the globe spin
    let phi = 0;

    const globe = createGlobe(canvasRef.current as HTMLCanvasElement, {
      devicePixelRatio: 2,
      width: 400 * 2,
      height: 400 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 0.8,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.8, 0.1, 0.1],
      glowColor: [0.2, 0.2, 0.2],
      markers: [],
      opacity: 0.7,
      onRender: (state) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.

        // Get the current positions from our map
        state.markers = [...positions.current.values()];

        // Rotate the globe
        state.phi = phi;
        phi += 0.01;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <div className="App">
      {/* Hero Section */}
      <header className="hero">
        <h1>
          Cann<span className="highlight">app</span>y
        </h1>
        <p className="tagline">Development Company</p>
        <p className="subtitle">
          Building exceptional digital experiences with modern technology
        </p>
        {counter !== 0 && (
          <div className="live-indicator">
            <span className="pulse"></span>
            <span className="live-text">
              {counter} {counter === 1 ? "visitor" : "visitors"} online
            </span>
          </div>
        )}
      </header>

      {/* The canvas where we'll render the globe */}
      <div className="globe-container">
        <canvas
          ref={canvasRef as LegacyRef<HTMLCanvasElement>}
          style={{ width: 400, height: 400, maxWidth: "100%", aspectRatio: 1 }}
        />
      </div>

      {/* Services Section */}
      <section className="services">
        <h2>Our Services</h2>
        <p className="section-subtitle">
          Comprehensive solutions for your digital needs
        </p>
        <div className="services-grid">
          <div className="service-card">
            <div className="service-icon">📱</div>
            <h3>Mobile App Development</h3>
            <p>Beautiful iOS and Android applications built with Flutter</p>
          </div>
          <div className="service-card">
            <div className="service-icon">💻</div>
            <h3>Web Applications</h3>
            <p>Modern web apps using React, TypeScript, and Node.js</p>
          </div>
          <div className="service-card">
            <div className="service-icon">🎨</div>
            <h3>UI/UX Design</h3>
            <p>User-centered design with intuitive interfaces</p>
          </div>
          <div className="service-card">
            <div className="service-icon">🔌</div>
            <h3>API Development</h3>
            <p>Robust and scalable REST and GraphQL APIs</p>
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section className="portfolio">
        <h2>Our Apps</h2>
        <p className="section-subtitle">
          Explore our growing portfolio of apps across multiple platforms
        </p>

        <div className="portfolio-category">
          <h3 className="category-title">Productivity & Utilities</h3>
          <div className="portfolio-grid">
            <a href="https://quickertext.cannappy.org" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon"><img src="https://quickertext.cannappy.org/static/logo-512.png" alt="quickerText" /></div>
              <h4>quickerText</h4>
              <p>AI-powered voice dictation with granular controls. Toggle filler removal, grammar, punctuation, and more.</p>
            </a>
            <div className="portfolio-card coming-soon">
              <div className="portfolio-icon">👁</div>
              <h4>TextGrabber</h4>
              <p>Select any region of your screen and instantly grab the text. Fast OCR-powered text extraction for macOS.</p>
              <span className="badge">Coming Soon</span>
            </div>
            <div className="portfolio-card coming-soon">
              <div className="portfolio-icon">📄</div>
              <h4>New File</h4>
              <p>Add a new file anywhere with one click. macOS lets you create folders easily, but not files — New File fixes that.</p>
              <span className="badge">Coming Soon</span>
            </div>
            <div className="portfolio-card coming-soon">
              <div className="portfolio-icon">⚡</div>
              <h4>Kill All</h4>
              <p>Close every open app in one shot. Free up your memory and start with a clean slate.</p>
              <span className="badge">Coming Soon</span>
            </div>
            <a href="https://apps.apple.com/us/app/hogalytics/id6741347952" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/37/b8/b0/37b8b08a-2d44-6bf4-77e4-65791b03e544/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg" alt="Hogalytics" /></div>
              <h4>Hogalytics</h4>
              <p>PostHog analytics accessible via mobile app for viewing charts and managing multiple projects.</p>
            </a>
            <a href="https://draftengine.cannappy.org" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon">📝</div>
              <h4>DraftEngine</h4>
              <p>Ideas to content in seconds. Record your screen, enhance with AI, and publish to Twitter/X and YouTube.</p>
            </a>
          </div>
        </div>

        <div className="portfolio-category">
          <h3 className="category-title">Health & Lifestyle</h3>
          <div className="portfolio-grid">
            <a href="https://onefast-6u8.pages.dev" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon">⏱</div>
              <h4>OneFast</h4>
              <p>Track your fasts, understand the science, and own your health. Live timer, body phase tracking, and built-in fasting plans.</p>
            </a>
            <a href="https://apps.apple.com/us/app/awaken-sacred-wisdom/id6759455864" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/4b/6f/44/4b6f444d-5505-9a67-bdea-316e775a7e98/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg" alt="Awaken" /></div>
              <h4>Awaken</h4>
              <p>190+ sacred texts, one truth. A 365-day progressive journey through five universal truths across 14+ spiritual traditions.</p>
            </a>
            <a href="https://apps.apple.com/us/app/virtu-vista-daily-reflections/id6483758700" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/4c/c0/0e/4cc00e97-534b-aeb6-e343-2c7fdc09b860/AppIcon-1x_U007emarketing-0-8-0-0-85-220-0.png/512x512bb.jpg" alt="Virtu Vista" /></div>
              <h4>Virtu Vista</h4>
              <p>Guided daily reflections through the 7 Habits framework with reminders, audio playback, and principle-centered living.</p>
            </a>
          </div>
        </div>

        <div className="portfolio-category">
          <h3 className="category-title">Social</h3>
          <div className="portfolio-grid">
            <a href="https://itsmybirthday.app" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/7b/33/a1/7b33a1a4-8f60-2cc6-8899-67e17428b328/AppIcon-1x_U007emarketing-0-7-0-0-85-220-0.png/512x512bb.jpg" alt="It's My Birthday" /></div>
              <h4>It's My Birthday</h4>
              <p>Find free birthday deals from nearby businesses and never forget a loved one's special day.</p>
            </a>
            <a href="https://lets.askthis.app" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon">❓</div>
              <h4>AskThis</h4>
              <p>A new way to ask questions and get answers from relevant people and communities.</p>
            </a>
          </div>
        </div>

        <div className="portfolio-category">
          <h3 className="category-title">Cannabis</h3>
          <div className="portfolio-grid">
            <a href="https://strainguide.app" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/67/b4/ec/67b4ecd6-06bf-e277-2991-b4e67063e065/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.jpg" alt="Strain Guide" /></div>
              <h4>Strain Guide</h4>
              <p>Discover thousands of cannabis strains with AI BudTender, advanced search, and expert growing tips. 7,000+ strains.</p>
            </a>
            <a href="https://growguide.app" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/2f/78/94/2f7894d8-1a5e-8d27-8bd3-f7adf13f61d1/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg" alt="Grow Guide" /></div>
              <h4>Grow Guide</h4>
              <p>Complete cannabis grow journal with daily tracking, AI Plant Doctor, time-lapse video, and growing calculators.</p>
            </a>
            <a href="https://games.strainguide.app/" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon">🎮</div>
              <h4>Canna Arcade</h4>
              <p>Cannabis-themed gaming hub featuring multiple games with leaderboards, daily challenges, and achievements.</p>
            </a>
          </div>
        </div>

        <div className="portfolio-category">
          <h3 className="category-title">Creative & Legal</h3>
          <div className="portfolio-grid">
            <a href="https://inkflo.studio" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon">✏️</div>
              <h4>Ink Flo Studio</h4>
              <p>The all-in-one app for tattoo artists and studios. Manage clients, showcase your portfolio, and grow your business.</p>
            </a>
            <a href="https://freecustodyhelp.com" className="portfolio-card" target="_blank" rel="noopener noreferrer">
              <div className="portfolio-icon">⚖️</div>
              <h4>Free Custody Help</h4>
              <p>AI-powered case assistant for custody disputes. Upload evidence, build timelines, and get personalized action plans.</p>
            </a>
          </div>
        </div>

        <div className="portfolio-cta">
          <a href="/apps" className="portfolio-link">
            View All Apps &rarr;
          </a>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact">
        <h2>Let's Work Together</h2>
        <p className="section-subtitle">
          Ready to bring your project to life? Get in touch with us today.
        </p>
        <div className="contact-box">
          <form className="contact-form">
            <div className="form-group">
              <input type="text" placeholder="Your Name" required />
            </div>
            <div className="form-group">
              <input type="email" placeholder="Your Email" required />
            </div>
            <div className="form-group">
              <textarea
                placeholder="Tell us about your project"
                required
              ></textarea>
            </div>
            <button type="submit">Send Message</button>
          </form>
          <div className="contact-info">
            <h3>Contact Information</h3>
            <div className="info-item">
              <span className="info-icon">📍</span>
              <div>
                <p>1401 21st ST # 12541</p>
                <p>Sacramento, CA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p className="powered-by">
            Powered by <a href="https://cobe.vercel.app/">Cobe</a>,{" "}
            <a href="https://www.npmjs.com/package/phenomenon">Phenomenon</a>{" "}
            and <a href="https://npmjs.com/package/partyserver/">PartyServer</a>
          </p>
          <p className="copyright">
            © 2025 Cannappy LLC Development Company. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
