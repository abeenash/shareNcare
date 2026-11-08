import { Link } from "react-router";

const CONTACT_EMAIL = "sharencare00@gmail.com";

const PrivacyPage = () => {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <Link to="/" className="font-serif italic text-2xl tracking-tight">
        ShareN<span className="text-primary">Care</span>
      </Link>

      <h1 className="mt-10 font-serif text-4xl">Privacy policy</h1>
      <p className="mt-2 font-mono text-xs uppercase tracking-widest text-base-content/60">
        Last updated 8 Nov 2026
      </p>

      <div className="mt-10 space-y-8 leading-relaxed text-base-content/80">
        <section>
          <h2 className="mb-2 font-serif text-2xl text-base-content">What we collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your name, email address and profile picture when you create an account.</li>
            <li>If you sign in with Google, the same details from your Google profile.</li>
            <li>The notes you write.</li>
            <li>
              For security, the IP address and browser of each sign-in, and short-lived counters
              that limit how many requests one IP address can make.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-serif text-2xl text-base-content">How we use it</h2>
          <p>
            Only to run ShareNCare: to sign you in, show you your notes and protect the service from
            abuse. We do not sell your data, show ads, or use tracking or analytics tools.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-serif text-2xl text-base-content">Google sign-in</h2>
          <p>
            We only ask Google for your basic profile and email address. We cannot read your Gmail,
            Drive or anything else. Tokens from Google are stored encrypted.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-serif text-2xl text-base-content">Where it is stored</h2>
          <p>
            The app runs on Render. Data is stored with Neon (PostgreSQL) and Upstash (rate-limit
            counters), in the United States.
          </p>
          <p className="mt-3">
            Photos you add to a letter are shrunk in your browser, which also removes hidden camera
            details such as location. They are stored privately on Cloudflare R2, and only people
            who can read the letter get a short-lived link to them. Deleting a letter or photo
            removes the file.
          </p>
          <p className="mt-3">
            A letter you move to the trash stays there for 30 days, then it and its photos are
            deleted automatically.
          </p>
          <p className="mt-3">
            When a burn-after-reading letter is opened, its words are erased from the app for good.
            Neon keeps a short restore history of the database for recovery, so an erased letter can
            remain there for a limited time before it is gone from that history too.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-serif text-2xl text-base-content">Care boards</h2>
          <p>
            People who write on a care board do not need an account. We store the name and message
            they type. Their browser keeps a private key so they can delete their own note later.
          </p>
          <p className="mt-3">
            When someone reports a note, we store a one-way fingerprint made from their IP address
            and a secret, so the same person is only counted once. We do not store the address
            itself. The person who made the board can hide or delete any note, and deleting the
            board deletes every note on it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-serif text-2xl text-base-content">Your choices</h2>
          <p>
            To delete your account and all your notes, email{" "}
            <a className="link link-primary" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            . You can remove ShareNCare's access to your Google account at any time from your Google
            Account settings.
          </p>
        </section>
      </div>
    </main>
  );
};

export default PrivacyPage;
