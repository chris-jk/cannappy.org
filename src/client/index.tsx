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
      theta: 0.1,
      dark: 1,
      diffuse: 0.9,
      mapSamples: 16000,
      mapBrightness: 5,
      baseColor: [0.32, 0.29, 0.26],
      markerColor: [0.37, 0.84, 0.54],
      glowColor: [0.13, 0.11, 0.09],
      markers: [],
      opacity: 0.85,
      onRender: (state) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.

        // Get the current positions from our map
        state.markers = [...positions.current.values()];

        // Rotate the globe
        state.phi = phi;
        phi += 0.005;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <div className="App">
      <nav className="nav">
        <a className="wordmark" href="/">
          Cann<span>app</span>y
        </a>
        <a className="nav-link" href="/apps">
          All apps &#8599;
        </a>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">Cannappy LLC &middot; App Studio</p>
          <h1>
            We build apps people actually <em>keep</em> on their phone.
          </h1>
          <p className="lede">
            A small studio shipping focused tools that solve real, everyday
            problems &mdash; for travelers, growers, creators, and everyone the
            big apps overlook.
          </p>
          {counter !== 0 && (
            <div className="live-indicator">
              <span className="pulse"></span>
              <span className="live-text">
                {counter} {counter === 1 ? "person" : "people"} here right now
              </span>
            </div>
          )}
        </div>
        <div className="globe-container">
          <canvas
            ref={canvasRef as LegacyRef<HTMLCanvasElement>}
            style={{ width: 400, height: 400, maxWidth: "100%", aspectRatio: 1 }}
          />
        </div>
      </header>

      {/* What we do */}
      <section className="services">
        <p className="section-label">What we do</p>
        <div className="services-list">
          <div className="service">
            <span className="service-num">01</span>
            <h3>Mobile apps</h3>
            <p>Native iOS and Android experiences people reach for every day.</p>
          </div>
          <div className="service">
            <span className="service-num">02</span>
            <h3>Web apps</h3>
            <p>Fast, focused tools that work the moment they load.</p>
          </div>
          <div className="service">
            <span className="service-num">03</span>
            <h3>Product &amp; design</h3>
            <p>Interfaces so obvious people just get them &mdash; no manual needed.</p>
          </div>
          <div className="service">
            <span className="service-num">04</span>
            <h3>Growth</h3>
            <p>We make sure the right people actually find what we build.</p>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="portfolio" id="apps">
        <p className="section-label">Our apps</p>
        <h2>
          Each one starts with a real problem &mdash; then we <em>sweat the
          details</em>.
        </h2>

        <div className="cat">
          <h3 className="cat-title">Productivity &amp; Utilities</h3>
          <div className="app-grid">
            <a href="https://quickertext.cannappy.org" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://quickertext.cannappy.org/static/logo-512.png" alt="quickerText" /></div>
              <div className="app-text">
                <h4>quickerText</h4>
                <p>Talk instead of type. Get clean, formatted text from your voice &mdash; and decide exactly what gets fixed before you keep it.</p>
                <div className="app-meta"><span className="where">macOS</span></div>
              </div>
            </a>
            <a href="https://apps.apple.com/us/app/hogalytics/id6741347952" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/37/b8/b0/37b8b08a-2d44-6bf4-77e4-65791b03e544/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg" alt="Hogalytics" /></div>
              <div className="app-text">
                <h4>Hogalytics</h4>
                <p>Your product numbers in your pocket. Check what&rsquo;s moving and spot trends without ever opening a laptop.</p>
                <div className="app-meta"><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://draftengine.cannappy.org" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">&#128221;</div>
              <div className="app-text">
                <h4>DraftEngine</h4>
                <p>Turn a rough idea into a finished post in minutes. Record, polish, and publish to your audience without the busywork.</p>
                <div className="app-meta"><span className="where">draftengine.cannappy.org</span></div>
              </div>
            </a>
            <div className="app">
              <div className="app-icon">&#128065;</div>
              <div className="app-text">
                <h4>TextGrabber</h4>
                <p>Grab text from anything on screen &mdash; images, video, PDFs &mdash; with one shortcut. Never retype again.</p>
                <div className="app-meta"><span className="store">macOS</span></div>
              </div>
            </div>
            <div className="app">
              <div className="app-icon">&#128196;</div>
              <div className="app-text">
                <h4>New File</h4>
                <p>Create a new file anywhere in one click &mdash; the thing your Mac should have done all along.</p>
                <div className="app-meta"><span className="store">macOS</span></div>
              </div>
            </div>
            <div className="app">
              <div className="app-icon">&#9889;</div>
              <div className="app-text">
                <h4>Kill All</h4>
                <p>Close every open app at once and get a clean, fast machine back instantly.</p>
                <div className="app-meta"><span className="store">macOS</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="cat">
          <h3 className="cat-title">Health &amp; Lifestyle</h3>
          <div className="app-grid">
            <a href="https://onefast-6u8.pages.dev" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">&#9201;</div>
              <div className="app-text">
                <h4>OneFast</h4>
                <p>Fast with confidence. A live timer, the science behind each stage, and plans that fit your life &mdash; from a daily window to a multi-day reset.</p>
                <div className="app-meta"><span className="where">onefast.cannappy.org</span></div>
              </div>
            </a>
            <a href="https://apps.apple.com/us/app/awaken-sacred-wisdom/id6759455864" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/4b/6f/44/4b6f444d-5505-9a67-bdea-316e775a7e98/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg" alt="Awaken" /></div>
              <div className="app-text">
                <h4>Awaken</h4>
                <p>One year, one daily practice. A guided journey through the wisdom shared by spiritual traditions across the world.</p>
                <div className="app-meta"><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://apps.apple.com/us/app/virtu-vista-daily-reflections/id6483758700" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/4c/c0/0e/4cc00e97-534b-aeb6-e343-2c7fdc09b860/AppIcon-1x_U007emarketing-0-8-0-0-85-220-0.png/512x512bb.jpg" alt="Virtu Vista" /></div>
              <div className="app-text">
                <h4>Virtu Vista</h4>
                <p>A two-minute daily reflection that keeps what matters in front of you &mdash; and helps you actually live by it.</p>
                <div className="app-meta"><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://peptidessacramento.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">&#129514;</div>
              <div className="app-text">
                <h4>Capital Peptides</h4>
                <p>Straight answers on research peptides, plus a reconstitution calculator that does the dosing math for you.</p>
                <div className="app-meta"><span className="where">peptidessacramento.com</span></div>
              </div>
            </a>
          </div>
        </div>

        <div className="cat">
          <h3 className="cat-title">Cannabis</h3>
          <div className="app-grid">
            <a href="https://strainguide.app" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/67/b4/ec/67b4ecd6-06bf-e277-2991-b4e67063e065/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.jpg" alt="Strain Guide" /></div>
              <div className="app-text">
                <h4>Strain Guide</h4>
                <p>Find your perfect strain. Search thousands with an AI budtender, save what works for you, and learn how to grow it.</p>
                <div className="app-meta"><span className="where">strainguide.app</span><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://growguide.app" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/2f/78/94/2f7894d8-1a5e-8d27-8bd3-f7adf13f61d1/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg" alt="Grow Guide" /></div>
              <div className="app-text">
                <h4>Grow Guide</h4>
                <p>Grow better. Track every day, get an AI plant doctor the moment something looks off, and capture the whole journey on time-lapse.</p>
                <div className="app-meta"><span className="where">growguide.app</span><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://games.strainguide.app/" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">&#127918;</div>
              <div className="app-text">
                <h4>Canna Arcade</h4>
                <p>Quick, cannabis-themed games with leaderboards and daily challenges. Easy fun for a spare few minutes.</p>
                <div className="app-meta"><span className="where">games.strainguide.app</span></div>
              </div>
            </a>
          </div>
        </div>

        <div className="cat">
          <h3 className="cat-title">Travel</h3>
          <div className="app-grid">
            <a href="https://apps.apple.com/us/app/snap-currency/id6763781236" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/95/4c/d8/954cd831-e76b-4b51-b4fe-cf67d57f978d/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.jpg" alt="Snap Currency" /></div>
              <div className="app-text">
                <h4>Snap Currency</h4>
                <p>Know what anything really costs, instantly. Point your camera at a price, say it, or type the math &mdash; and half of every profit goes to charity.</p>
                <div className="app-meta"><span className="where">snapcurrency.com</span><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://nomadaigent.cannappy.org" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">&#127757;</div>
              <div className="app-text">
                <h4>Nomad Aigent</h4>
                <p>Find a place to live abroad without the scams. Tell a chat what you&rsquo;re after and get real listings that fit &mdash; no endless group-scrolling.</p>
                <div className="app-meta"><span className="where">nomadaigent.cannappy.org</span></div>
              </div>
            </a>
          </div>
        </div>

        <div className="cat">
          <h3 className="cat-title">Social</h3>
          <div className="app-grid">
            <a href="https://itsmybirthday.app" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/7b/33/a1/7b33a1a4-8f60-2cc6-8899-67e17428b328/AppIcon-1x_U007emarketing-0-7-0-0-85-220-0.png/512x512bb.jpg" alt="It's My Birthday" /></div>
              <div className="app-text">
                <h4>It&rsquo;s My Birthday</h4>
                <p>Never miss the people who matter &mdash; and cash in on free birthday perks from places near you.</p>
                <div className="app-meta"><span className="where">itsmybirthday.app</span><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://lets.askthis.app" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">&#10067;</div>
              <div className="app-text">
                <h4>AskThis</h4>
                <p>Ask anything and get real answers from the people and communities who actually know.</p>
                <div className="app-meta"><span className="where">lets.askthis.app</span></div>
              </div>
            </a>
          </div>
        </div>

        <div className="cat">
          <h3 className="cat-title">Education</h3>
          <div className="app-grid">
            <a href="https://storylingo-web.pages.dev" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">&#128483;</div>
              <div className="app-text">
                <h4>StoryLingo</h4>
                <p>Learn a language the way you picked up your first &mdash; short, current stories you actually want to read, with quick drills that make it stick.</p>
                <div className="app-meta"><span className="where">storylingo.com</span></div>
              </div>
            </a>
          </div>
        </div>

        <div className="cat">
          <h3 className="cat-title">Creative &amp; Legal</h3>
          <div className="app-grid">
            <a href="https://inkflo.studio" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">&#9999;</div>
              <div className="app-text">
                <h4>Ink Flo Studio</h4>
                <p>Everything a tattoo artist needs to run the business side &mdash; clients, bookings, payments, and a portfolio that wins work.</p>
                <div className="app-meta"><span className="where">inkflo.studio</span></div>
              </div>
            </a>
            <a href="https://freecustodyhelp.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">&#9878;</div>
              <div className="app-text">
                <h4>Free Custody Help</h4>
                <p>Face a custody case with a plan. Organize your evidence, build a timeline, and get clear, personalized next steps for court.</p>
                <div className="app-meta"><span className="where">freecustodyhelp.com</span></div>
              </div>
            </a>
          </div>
        </div>

        <div className="cat">
          <h3 className="cat-title">Business &amp; Marketing</h3>
          <div className="app-grid">
            <a href="https://letsgosite.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">&#128640;</div>
              <div className="app-text">
                <h4>LetsGoSite</h4>
                <p>We build local businesses a website before they ever pay &mdash; so they can see exactly what they&rsquo;re getting, then make it theirs.</p>
                <div className="app-meta"><span className="where">letsgosite.com</span></div>
              </div>
            </a>
            <a href="https://celebstrendtoday.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">&#11088;</div>
              <div className="app-text">
                <h4>CelebsTrendToday</h4>
                <p>How much are they really worth? Clear, sourced net-worth profiles, kept up to date.</p>
                <div className="app-meta"><span className="where">celebstrendtoday.com</span></div>
              </div>
            </a>
          </div>
        </div>

        <div className="cat">
          <h3 className="cat-title">From our own workshop</h3>
          <div className="app-grid">
            <div className="app is-muted">
              <div className="app-icon">&#128200;</div>
              <div className="app-text">
                <h4>RankItRalph</h4>
                <p>Our in-house growth engine. It finds what people are searching for and turns it into content that earns its place &mdash; on autopilot.</p>
                <div className="app-meta"><span className="pill">Internal</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">&#128202;</div>
              <div className="app-text">
                <h4>Ralph Portal</h4>
                <p>One dashboard to see how every one of our sites is performing at a glance.</p>
                <div className="app-meta"><span className="pill">Internal</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">&#128240;</div>
              <div className="app-text">
                <h4>PitchRalph</h4>
                <p>Gets our work in front of the journalists and writers who cover our world.</p>
                <div className="app-meta"><span className="pill">Internal</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">&#128222;</div>
              <div className="app-text">
                <h4>Cold Caller</h4>
                <p>A streamlined dialer our team uses to reach prospects with a familiar local number.</p>
                <div className="app-meta"><span className="pill">Internal</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">&#128123;</div>
              <div className="app-text">
                <h4>Ghost Domain Hunter</h4>
                <p>Finds valuable web addresses that have been abandoned, so we can put their leftover traffic to good use.</p>
                <div className="app-meta"><span className="pill">Internal</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">&#128226;</div>
              <div className="app-text">
                <h4>Social Poster</h4>
                <p>Shares what we build with the right communities &mdash; helpfully, after earning a place in them.</p>
                <div className="app-meta"><span className="pill">Internal</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="portfolio-cta">
          <a href="/apps" className="portfolio-link">
            See every app &rarr;
          </a>
        </div>
      </section>

      {/* Contact */}
      <section className="contact">
        <p className="section-label">Get in touch</p>
        <h2>
          Have a problem worth <em>solving</em>?
        </h2>
        <p className="lede">
          Tell us what&rsquo;s slowing people down. If it&rsquo;s the kind of
          thing an app can fix, we&rsquo;d love to hear about it.
        </p>
        <div className="contact-box">
          <form className="contact-form">
            <input type="text" placeholder="Your name" required />
            <input type="email" placeholder="Your email" required />
            <textarea placeholder="What are you trying to solve?" required></textarea>
            <button type="submit">Send message</button>
          </form>
          <div className="contact-info">
            <h3>Where we are</h3>
            <div className="info-item">
              <span className="info-icon">&#9679;</span>
              <div>
                <p>1401 21st St #12541</p>
                <p>Sacramento, CA</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div>
            <a className="wordmark" href="/">
              Cann<span>app</span>y
            </a>
            <p className="footer-tag">Apps that solve real problems.</p>
          </div>
          <div className="footer-right">
            <div className="footer-stores">
              <a href="https://apps.apple.com/us/developer/phannafest-llc/id1209901791" target="_blank" rel="noopener noreferrer">App Store</a>
              <a href="https://play.google.com/store/apps/developer?id=Phannafestllc" target="_blank" rel="noopener noreferrer">Google Play</a>
            </div>
            <p className="copyright">© 2026 Cannappy LLC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
