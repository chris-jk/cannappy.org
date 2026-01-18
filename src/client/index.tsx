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
