import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage } from "../shared";
import type { LegacyRef } from "react";

type Theme = "dark" | "light";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const savedTheme = window.localStorage.getItem("theme");
  return savedTheme === "light" ? "light" : "dark";
}

function App() {
  // A reference to the canvas element where we'll render the globe
  const canvasRef = useRef<HTMLCanvasElement>();
  // The number of markers we're currently displaying
  const [counter, setCounter] = useState(0);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  // Contact form submission state
  const [formStatus, setFormStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [formError, setFormError] = useState("");

  async function handleContactSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    setFormStatus("sending");
    setFormError("");
    try {
      const res = await fetch("/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(detail.error ?? "Something went wrong.");
      }
      setFormStatus("sent");
      form.reset();
    } catch (err) {
      setFormStatus("error");
      setFormError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }
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
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0d0f0e" : "#f7f6f2");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

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
      dark: theme === "dark" ? 1 : 0,
      diffuse: 0.9,
      mapSamples: 16000,
      mapBrightness: theme === "dark" ? 4.2 : 2.6,
      baseColor: theme === "dark" ? [0.18, 0.2, 0.18] : [0.83, 0.84, 0.79],
      markerColor:
        theme === "dark" ? [0.48, 0.85, 0.56] : [0.18, 0.44, 0.31],
      glowColor: theme === "dark" ? [0.04, 0.05, 0.04] : [0.95, 0.94, 0.9],
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
  }, [theme]);

  return (
    <div className="App">
      <nav className="nav">
        <a className="wordmark" href="/">
          Cann<span>app</span>y
        </a>
        <div className="nav-actions">
          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            <span className="theme-toggle-dot" aria-hidden="true"></span>
            <span className="theme-toggle-text">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </button>
          <a className="nav-link" href="/apps">
            All apps &#8599;
          </a>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">Independent app studio</p>
          <h1>
            Practical software for overlooked everyday problems.
          </h1>
          <p className="lede">
            Cannappy designs and ships focused tools for travelers, growers,
            creators, operators, and small teams. Each product is narrow on
            purpose, fast to understand, and useful from the first session.
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
            role="img"
            aria-label="Rotating globe showing the locations of people currently visiting this site"
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
            <h2>Mobile apps</h2>
            <p>Native iOS and Android experiences people reach for every day.</p>
          </div>
          <div className="service">
            <span className="service-num">02</span>
            <h2>Web apps</h2>
            <p>Fast, focused tools that work the moment they load.</p>
          </div>
          <div className="service">
            <span className="service-num">03</span>
            <h2>Product &amp; design</h2>
            <p>Interfaces so obvious people just get them &mdash; no manual needed.</p>
          </div>
          <div className="service">
            <span className="service-num">04</span>
            <h2>Growth</h2>
            <p>We make sure the right people actually find what we build.</p>
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="portfolio" id="apps">
        <p className="section-label">Our apps</p>
        <h2>
          Products with a clear job, a working business model, and updates that
          keep shipping.
        </h2>

        <div className="cat">
          <h3 className="cat-title">Productivity &amp; Utilities</h3>
          <div className="app-grid">
            <a href="/fyta" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">fy</div>
              <div className="app-text">
                <h4>fyta</h4>
                <p>YouTube without the ads that interrupt you. A real player with no pre-roll or mid-roll, background play, sponsor-segment skipping, and your subscriptions &mdash; no sign-in.</p>
                <div className="app-meta"><span className="type">Android app</span><span className="where">cannappy.org/fyta</span></div>
              </div>
            </a>
            <a href="https://quickertext.cannappy.org" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://quickertext.cannappy.org/static/logo-512.png" alt="quickerText" width={52} height={52} /></div>
              <div className="app-text">
                <h4>quickerText</h4>
                <p>Talk instead of type. Get clean, formatted text from your voice — and decide exactly what gets fixed before you keep it.</p>
                <div className="app-meta"><span className="type">Mac app</span><span className="where">quickertext.cannappy.org</span></div>
              </div>
            </a>
            <a href="https://apps.apple.com/us/app/hogalytics/id6741347952" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/37/b8/b0/37b8b08a-2d44-6bf4-77e4-65791b03e544/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg" alt="Hogalytics" width={52} height={52} /></div>
              <div className="app-text">
                <h4>Hogalytics</h4>
                <p>Your product numbers in your pocket. Check what&rsquo;s moving and spot trends without ever opening a laptop.</p>
                <div className="app-meta"><span className="type">Mobile app</span><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://draftengine.cannappy.org" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">DE</div>
              <div className="app-text">
                <h4>DraftEngine</h4>
                <p>Turn a rough idea into a finished post in minutes. Record, polish, and publish to your audience without the busywork.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">draftengine.cannappy.org</span></div>
              </div>
            </a>
            <div className="app is-muted">
              <div className="app-icon">TG</div>
              <div className="app-text">
                <h4>TextGrabber</h4>
                <p>Grab text from anything on screen — images, video, PDFs — with one shortcut. Never retype again.</p>
                <div className="app-meta"><span className="type">Mac app</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">NF</div>
              <div className="app-text">
                <h4>New File</h4>
                <p>Create a new file anywhere in one click — the thing your Mac should have done all along.</p>
                <div className="app-meta"><span className="type">Mac app</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">KA</div>
              <div className="app-text">
                <h4>Kill All</h4>
                <p>Close every open app at once and get a clean, fast machine back instantly.</p>
                <div className="app-meta"><span className="type">Mac app</span></div>
              </div>
            </div>
            <a href="https://lets.askthis.app" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">AT</div>
              <div className="app-text">
                <h4>AskThis</h4>
                <p>Listens to your interview as it happens and suggests where to take it next &mdash; the threads worth pulling, so you never blank mid-conversation.</p>
                <div className="app-meta"><span className="type">Web app</span><span className="where">lets.askthis.app</span></div>
              </div>
            </a>
          </div>
        </div>
        <div className="cat">
          <h3 className="cat-title">Health &amp; Lifestyle</h3>
          <div className="app-grid">
            <a href="https://onefast-6u8.pages.dev" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">OF</div>
              <div className="app-text">
                <h4>OneFast</h4>
                <p>Fast with confidence. A live timer, the science behind each stage, and plans that fit your life — from a daily window to a multi-day reset.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">onefast.cannappy.org</span></div>
              </div>
            </a>
            <a href="https://apps.apple.com/us/app/awaken-sacred-wisdom/id6759455864" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/4b/6f/44/4b6f444d-5505-9a67-bdea-316e775a7e98/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg" alt="Awaken" width={52} height={52} /></div>
              <div className="app-text">
                <h4>Awaken</h4>
                <p>One year, one daily practice. A guided journey through the wisdom shared by spiritual traditions across the world.</p>
                <div className="app-meta"><span className="type">Mobile app</span><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://apps.apple.com/us/app/virtu-vista-daily-reflections/id6483758700" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/4c/c0/0e/4cc00e97-534b-aeb6-e343-2c7fdc09b860/AppIcon-1x_U007emarketing-0-8-0-0-85-220-0.png/512x512bb.jpg" alt="Virtu Vista" width={52} height={52} /></div>
              <div className="app-text">
                <h4>Virtu Vista</h4>
                <p>A two-minute daily reflection that keeps what matters in front of you — and helps you actually live by it.</p>
                <div className="app-meta"><span className="type">Mobile app</span><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://peptidessacramento.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">CP</div>
              <div className="app-text">
                <h4>Capital Peptides</h4>
                <p>Straight answers on research peptides, plus a reconstitution calculator that does the dosing math for you.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">peptidessacramento.com</span></div>
              </div>
            </a>
            <a href="https://fatfork.cannappy.org" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">FF</div>
              <div className="app-text">
                <h4>fatfork</h4>
                <p>Calorie tracking that reads your food and your Apple Watch workouts from a photo, then shows the number you actually have left today.</p>
                <div className="app-meta"><span className="type">Web app</span><span className="where">fatfork.cannappy.org</span></div>
              </div>
            </a>
          </div>
        </div>
        <div className="cat">
          <h3 className="cat-title">Cannabis</h3>
          <div className="app-grid">
            <a href="https://strainguide.app" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/67/b4/ec/67b4ecd6-06bf-e277-2991-b4e67063e065/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.jpg" alt="Strain Guide" width={52} height={52} /></div>
              <div className="app-text">
                <h4>Strain Guide</h4>
                <p>Find your perfect strain. Search thousands with an AI budtender, save what works for you, and learn how to grow it.</p>
                <div className="app-meta"><span className="type">Website + mobile app</span><span className="where">strainguide.app</span><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://growguide.app" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/2f/78/94/2f7894d8-1a5e-8d27-8bd3-f7adf13f61d1/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg" alt="Grow Guide" width={52} height={52} /></div>
              <div className="app-text">
                <h4>Grow Guide</h4>
                <p>Grow better. Track every day, get an AI plant doctor the moment something looks off, and capture the whole journey on time-lapse.</p>
                <div className="app-meta"><span className="type">Website + mobile app</span><span className="where">growguide.app</span><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://games.strainguide.app/" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">CA</div>
              <div className="app-text">
                <h4>Canna Arcade</h4>
                <p>Quick, cannabis-themed games with leaderboards and daily challenges. Easy fun for a spare few minutes.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">games.strainguide.app</span></div>
              </div>
            </a>
            <a href="https://kushy.app" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">KY</div>
              <div className="app-text">
                <h4>Kushy</h4>
                <p>A community cannabis feed and a crowdsourced deals board &mdash; see what people are smoking and what&rsquo;s on offer near you.</p>
                <div className="app-meta"><span className="type">Web app</span><span className="where">kushy.app</span></div>
              </div>
            </a>
          </div>
        </div>
        <div className="cat">
          <h3 className="cat-title">Travel</h3>
          <div className="app-grid">
            <a href="https://apps.apple.com/us/app/snap-currency/id6763781236" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/95/4c/d8/954cd831-e76b-4b51-b4fe-cf67d57f978d/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.jpg" alt="Snap Currency" width={52} height={52} /></div>
              <div className="app-text">
                <h4>Snap Currency</h4>
                <p>Know what anything really costs, instantly. Point your camera at a price, say it, or type the math — and half of every profit goes to charity.</p>
                <div className="app-meta"><span className="type">Website + mobile app</span><span className="where">snapcurrency.com</span><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
            <a href="https://nomadaigent.cannappy.org" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">NA</div>
              <div className="app-text">
                <h4>Nomad Aigent</h4>
                <p>Find a place to live abroad without the scams. Tell a chat what you&rsquo;re after and get real listings that fit — no endless group-scrolling.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">nomadaigent.cannappy.org</span></div>
              </div>
            </a>
          </div>
        </div>
        <div className="cat">
          <h3 className="cat-title">Social</h3>
          <div className="app-grid">
            <a href="https://itsmybirthday.app" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/7b/33/a1/7b33a1a4-8f60-2cc6-8899-67e17428b328/AppIcon-1x_U007emarketing-0-7-0-0-85-220-0.png/512x512bb.jpg" alt="It's My Birthday" width={52} height={52} /></div>
              <div className="app-text">
                <h4>It&rsquo;s My Birthday</h4>
                <p>Never miss the people who matter — and cash in on free birthday perks from places near you.</p>
                <div className="app-meta"><span className="type">Website + mobile app</span><span className="where">itsmybirthday.app</span><span className="store">App Store</span><span className="store">Google Play</span></div>
              </div>
            </a>
          </div>
        </div>
        <div className="cat">
          <h3 className="cat-title">Education</h3>
          <div className="app-grid">
            <a href="https://storylingo-web.pages.dev" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="/icons/storylingo.png" alt="StoryLingo" width={52} height={52} /></div>
              <div className="app-text">
                <h4>StoryLingo</h4>
                <p>Learn a language the way you picked up your first — short, current stories you actually want to read, with quick drills that make it stick.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">storylingo.com</span></div>
              </div>
            </a>
          </div>
        </div>
        <div className="cat">
          <h3 className="cat-title">Creative &amp; Legal</h3>
          <div className="app-grid">
            <a href="https://inkflo.studio" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="/icons/inkflo.png" alt="Ink Flo Studio" width={52} height={52} /></div>
              <div className="app-text">
                <h4>Ink Flo Studio</h4>
                <p>Everything a tattoo artist needs to run the business side — clients, bookings, payments, and a portfolio that wins work.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">inkflo.studio</span></div>
              </div>
            </a>
            <a href="https://freecustodyhelp.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="/icons/freecustodyhelp.png" alt="Free Custody Help" width={52} height={52} /></div>
              <div className="app-text">
                <h4>Free Custody Help</h4>
                <p>Face a custody case with a plan. Organize your evidence, build a timeline, and get clear, personalized next steps for court.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">freecustodyhelp.com</span></div>
              </div>
            </a>
          </div>
        </div>
        <div className="cat">
          <h3 className="cat-title">Business &amp; Marketing</h3>
          <div className="app-grid">
            <a href="https://letsgosite.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="/icons/letsgosite.png" alt="LetsGoSite" width={52} height={52} /></div>
              <div className="app-text">
                <h4>LetsGoSite</h4>
                <p>We build local businesses a website before they ever pay — so they can see exactly what they&rsquo;re getting, then make it theirs.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">letsgosite.com</span></div>
              </div>
            </a>
            <a href="https://celebstrendtoday.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon"><img src="/icons/celebstrendtoday.svg" alt="CelebsTrendToday" width={52} height={52} /></div>
              <div className="app-text">
                <h4>CelebsTrendToday</h4>
                <p>How much are they really worth? Clear, sourced net-worth profiles, kept up to date.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">celebstrendtoday.com</span></div>
              </div>
            </a>
            <a href="https://swipewise.cannappy.org" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">SW</div>
              <div className="app-text">
                <h4>SwipeWise</h4>
                <p>Which card to swipe, and what your money is actually doing — balances coloured by debt versus asset, real APR maths, and projected spend.</p>
                <div className="app-meta"><span className="type">Web app</span><span className="where">swipewise.cannappy.org</span></div>
              </div>
            </a>
          </div>
        </div>
        <div className="cat">
          <h3 className="cat-title">Client work</h3>
          <div className="app-grid">
            <a href="https://placervillepowersports.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">PP</div>
              <div className="app-text">
                <h4>Placerville Powersports</h4>
                <p>Dealer site for a 30-year Sierra Foothills shop. Shopify backend, live catalog pulled from the Western Power Sports API, drop-ship ordering, and newsletter signup.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">placervillepowersports.com</span></div>
              </div>
            </a>
            <a href="https://djmicrose.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">DJ</div>
              <div className="app-text">
                <h4>DJ Mic Rose</h4>
                <p>Booking site for a working DJ — date and time picker, validated enquiry form with typo correction, and bookings delivered straight to the inbox.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">djmicrose.com</span></div>
              </div>
            </a>
            <a href="https://sierraimages.org" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">SI</div>
              <div className="app-text">
                <h4>Sierra Images</h4>
                <p>Photography marketplace on Laravel: galleries, photographer and customer roles, Stripe checkout, Cloudinary delivery, and automated commission tracking.</p>
                <div className="app-meta"><span className="type">Web app</span><span className="where">sierraimages.org</span></div>
              </div>
            </a>
            <a href="https://thepaediatricnurse.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">PN</div>
              <div className="app-text">
                <h4>The Paediatric Nurse</h4>
                <p>Content site for a paediatric nursing practice, with analytics and search console wired in from day one.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">thepaediatricnurse.com</span></div>
              </div>
            </a>
            <a href="https://bestwesterngamesoundtracks.com" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">BW</div>
              <div className="app-text">
                <h4>Best Western Game Soundtracks</h4>
                <p>A catalogue site for game soundtracks, built on the same fast static stack as the rest of our niche properties.</p>
                <div className="app-meta"><span className="type">Website</span><span className="where">bestwesterngamesoundtracks.com</span></div>
              </div>
            </a>
          </div>
        </div>
        <div className="cat">
          <h3 className="cat-title">Open source</h3>
          <div className="app-grid">
            <a href="https://signalbot.cannappy.org" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">SB</div>
              <div className="app-text">
                <h4>signalbot</h4>
                <p>Insider and Congress trading disclosures, ingested, normalized and backtested — with an MCP connector that hands the whole dataset to an AI agent.</p>
                <div className="app-meta"><span className="type">Web app + open source</span><span className="where">signalbot.cannappy.org</span><span className="store">GitHub</span></div>
              </div>
            </a>
            <a href="https://github.com/chris-jk/freeply" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">FP</div>
              <div className="app-text">
                <h4>freeply</h4>
                <p>Instagram comment-to-DM automation. Someone comments your keyword, they get the link in their DMs. Self-hostable on Cloudflare's free tier.</p>
                <div className="app-meta"><span className="type">Open source</span><span className="store">GitHub</span></div>
              </div>
            </a>
            <a href="https://github.com/chris-jk/focus-app-mac" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">FO</div>
              <div className="app-text">
                <h4>Focus</h4>
                <p>A Mac menu bar focus app: Pomodoro timer, a day planner that starts your blocks for you, and a parking lot for ideas.</p>
                <div className="app-meta"><span className="type">Mac app + open source</span><span className="store">GitHub</span></div>
              </div>
            </a>
            <a href="https://github.com/chris-jk/desktop-switch" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">DS</div>
              <div className="app-text">
                <h4>Desktop Switch</h4>
                <p>Hides and shows your Mac desktop icons from the menu bar, or with a keyboard shortcut.</p>
                <div className="app-meta"><span className="type">Mac app + open source</span><span className="store">GitHub</span></div>
              </div>
            </a>
            <a href="https://github.com/chris-jk/SpeakHUD" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">SH</div>
              <div className="app-text">
                <h4>SpeakHUD</h4>
                <p>Text-to-speech HUD for the Mac — reads your clipboard aloud with speed control and word-by-word highlighting.</p>
                <div className="app-meta"><span className="type">Mac app + open source</span><span className="store">GitHub</span></div>
              </div>
            </a>
            <a href="https://github.com/chris-jk/claude-bs-detector" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">BS</div>
              <div className="app-text">
                <h4>BS Detector</h4>
                <p>Fact-checks a short-form video claim by claim: transcribe it, pull out every assertion, verify each one, and show the receipts.</p>
                <div className="app-meta"><span className="type">AI skill + open source</span><span className="store">GitHub</span></div>
              </div>
            </a>
            <a href="https://github.com/chris-jk/claude-outliers" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">OL</div>
              <div className="app-text">
                <h4>Outliers</h4>
                <p>Finds the videos on any channel that beat that channel's own baseline — the research loop behind knowing what actually works.</p>
                <div className="app-meta"><span className="type">AI skill + open source</span><span className="store">GitHub</span></div>
              </div>
            </a>
            <a href="https://github.com/chris-jk/claude-youtube-editor" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">YE</div>
              <div className="app-text">
                <h4>Claude YouTube Editor</h4>
                <p>Record the talking head; the pipeline does the rest — the cut, the visuals, the voice, the sound effects, the thumbnail, and the upload.</p>
                <div className="app-meta"><span className="type">Open source</span><span className="store">GitHub</span></div>
              </div>
            </a>
            <a href="https://github.com/chris-jk/Meta-Ads-Spy-Claude-Code-Airtable" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">MA</div>
              <div className="app-text">
                <h4>Meta Ads Spy</h4>
                <p>Pulls competitor ads out of the Meta Ad Library and lands them in Airtable, ready to study.</p>
                <div className="app-meta"><span className="type">Open source</span><span className="store">GitHub</span></div>
              </div>
            </a>
            <a href="https://github.com/chris-jk/MioBio" className="app" target="_blank" rel="noopener noreferrer">
              <div className="app-icon">MB</div>
              <div className="app-text">
                <h4>MioBio</h4>
                <p>A one-file link-in-bio page that sends each visitor to the right app store automatically. No framework, no build step.</p>
                <div className="app-meta"><span className="type">Open source</span><span className="store">GitHub</span></div>
              </div>
            </a>
          </div>
        </div>
        <div className="cat">
          <h3 className="cat-title">From our own workshop</h3>
          <div className="app-grid">
            <div className="app is-muted">
              <div className="app-icon">RR</div>
              <div className="app-text">
                <h4>RankItRalph</h4>
                <p>Our in-house growth engine. It finds what people are searching for and turns it into content that earns its place — on autopilot.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">RP</div>
              <div className="app-text">
                <h4>Ralph Portal</h4>
                <p>One dashboard to see how every one of our sites is performing at a glance.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">PR</div>
              <div className="app-text">
                <h4>PitchRalph</h4>
                <p>Gets our work in front of the journalists and writers who cover our world.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">CC</div>
              <div className="app-text">
                <h4>Cold Caller</h4>
                <p>A streamlined dialer our team uses to reach prospects with a familiar local number.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">GD</div>
              <div className="app-text">
                <h4>Ghost Domain Hunter</h4>
                <p>Finds valuable web addresses that have been abandoned, so we can put their leftover traffic to good use.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">SP</div>
              <div className="app-text">
                <h4>Social Poster</h4>
                <p>Shares what we build with the right communities — helpfully, after earning a place in them.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">CO</div>
              <div className="app-text">
                <h4>Cannappy Offers</h4>
                <p>Our own ad server. Replaced a third-party network across two apps and two websites in four days, with per-build delivery controls and a revenue digest that says what to act on.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">EO</div>
              <div className="app-text">
                <h4>Email Ops</h4>
                <p>Every transactional and lifecycle email we send, plus inbound routing, DMARC handling and unsubscribes — one pipeline instead of six.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">AG</div>
              <div className="app-text">
                <h4>API Gateway</h4>
                <p>The single front door our apps talk to, so remote config, feature flags and kill switches live in one place.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">FB</div>
              <div className="app-text">
                <h4>Feedback Ops</h4>
                <p>In-app feedback that closes the loop — screenshots, a follow-up ladder, and a note back to the person who reported the bug once it's fixed.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">SG</div>
              <div className="app-text">
                <h4>Secret Gateway</h4>
                <p>Keeps API keys out of AI context entirely. The model asks the gateway; the gateway holds the secret.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
            <div className="app is-muted">
              <div className="app-icon">OR</div>
              <div className="app-text">
                <h4>Opportunity Radar</h4>
                <p>Crawls, enriches and scores markets worth building in, so we pick the next product on evidence.</p>
                <div className="app-meta"><span className="type">Internal tool</span></div>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Contact */}
      <section className="contact">
        <p className="section-label">Get in touch</p>
        <h2>
          Have a problem worth solving?
        </h2>
        <p className="lede">
          Tell us what&rsquo;s slowing people down. If it&rsquo;s the kind of
          thing an app can fix, we&rsquo;d love to hear about it.
        </p>
        <div className="contact-box">
          <form className="contact-form" onSubmit={handleContactSubmit}>
            <input type="text" name="name" placeholder="Your name" aria-label="Your name" required />
            <input type="email" name="email" placeholder="Your email" aria-label="Your email" required />
            <textarea name="message" placeholder="What are you trying to solve?" aria-label="What are you trying to solve?" required></textarea>
            <button type="submit" disabled={formStatus === "sending"}>
              {formStatus === "sending" ? "Sending…" : "Send message"}
            </button>
            {formStatus === "sent" && (
              <p className="form-note form-note-ok">
                Thanks — your message is on its way. We&rsquo;ll be in touch soon.
              </p>
            )}
            {formStatus === "error" && (
              <p className="form-note form-note-err">{formError}</p>
            )}
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
              <a href="https://apps.apple.com/us/developer/phannafest-llc/id1209901791" target="_blank" rel="noopener noreferrer" aria-label="Cannappy apps on the App Store">App Store</a>
              <a href="https://play.google.com/store/apps/developer?id=Phannafestllc" target="_blank" rel="noopener noreferrer" aria-label="Cannappy apps on Google Play">Google Play</a>
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
