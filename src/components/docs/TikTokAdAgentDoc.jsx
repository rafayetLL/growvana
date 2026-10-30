import React from 'react';
import {
  DiagramContext,
  DiagramSearch,
  DiagramTurn,
  DiagramReading,
  DiagramPage,
} from './TikTokAdDocDiagrams.jsx';

// Static documentation for the TikTok Ad Agent. No data fetching, no props from
// the wire — this is a written page, kept in sync by hand with the workflow's
// prompt, tools and endpoint. Built the same way as MetaAdAgentDoc.jsx and
// EmailAgentDoc.jsx, using only the `.doc-*` classes those pages already use, so
// the print stylesheet and the Word export need nothing new.
//
// THE DIAGRAMS CARRY THE STRUCTURE; the prose carries craft and judgement. When
// something new is "how the parts fit together", it goes in a drawing in
// TikTokAdDocDiagrams.jsx rather than in another paragraph here.

// No `updated` date, for the same reason as the other pages: a stamp is only as
// true as the last person to remember it, and a stale one is worse than none.
export const TIKTOK_AD_DOC_META = {
  title: 'TikTok Ad Agent',
  subtitle: 'How it finds a brand’s TikTok ads, watches them, and writes a diagnosis page for each.',
};

function Section({ num, title, intro, children }) {
  return (
    <section className="doc-section">
      <div className="doc-sec-head">
        <span className="doc-sec-num">{num}</span>
        <div>
          <h2>{title}</h2>
          {intro}
        </div>
      </div>
      {children}
    </section>
  );
}

function Figure({ children, caption }) {
  return (
    <figure className="doc-fig">
      <div className="doc-scroller">{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function Panel({ num, title, owns, lede, children }) {
  return (
    <article className="doc-panel">
      <header>
        <span className="doc-panel-num">{num}</span>
        <h3>{title}</h3>
        <span className="doc-panel-owns">{owns}</span>
      </header>
      <div className="doc-panel-body">
        <div className="doc-panel-lede">{lede}</div>
        <div className="doc-panel-know">{children}</div>
      </div>
    </article>
  );
}

function Bench({ rows }) {
  return (
    <dl className="doc-bench">
      {rows.map(([term, def]) => (
        <React.Fragment key={term}>
          <dt>{term}</dt>
          <dd>{def}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export default function TikTokAdAgentDoc() {
  return (
    <div className="doc">
      {/* ===================== 01 — what goes in, what comes out ===================== */}
      <Section
        num="01"
        title="What goes in, and what comes out"
        intro={
          <>
            <p>
              The agent diagnoses TikTok ads — any brand&rsquo;s, your own or a competitor&rsquo;s —
              from what TikTok publishes about them in its public Ads Library. You find the ads, pick
              the ones you want looked at, and for each one you get a diagnosis page: what the ad is
              doing, how it measures up against its category, and exactly what to change. Then you
              can keep talking about it.
            </p>
            <p>
              It never connects to an ad account, so it never sees spend, clicks or results, and it
              can never change a live ad. Starting from your Company Blueprint is optional: with it,
              the pages take your Brand Bible and personas into account and are laid out in your own
              design identity. The agent is available to connect, but has no screen in the app yet.
            </p>
          </>
        }
      >
        <Figure
          caption={
            <>
              <b>One agent, no team behind it to talk to.</b> Unlike the Meta Ad and Email agents,
              there is no strategist handing work to specialists: the analyst you talk to is the one
              that decides what to do. Nothing can be attached to a message — everything it knows
              about an ad comes from TikTok.
            </>
          }
        >
          <DiagramContext />
        </Figure>
      </Section>

      {/* ===================== 02 — finding the ads ===================== */}
      <Section
        num="02"
        title="Finding the ads: from a search to one investigation"
        intro={
          <p>
            In TikTok&rsquo;s library a brand has to be found before its ads can be listed, so finding
            the ads is a step of its own, and it happens before any conversation starts. Once you have
            picked something to look at, the conversation is about that and nothing else.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramSearch />
        </Figure>

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>The three ways in</h3>
            <dl>
              <dt>An advertiser</dt>
              <dd>
                That one brand&rsquo;s own ads. The right start when you know whose ads you want to
                look at.
              </dd>
              <dt>A keyword</dt>
              <dd>
                Ads matching a topic, from many brands at once — useful for seeing a category. Each ad
                shows the name of the brand that ran it, but to see the rest of that brand&rsquo;s ads
                you search for the brand itself.
              </dd>
              <dt>An ad&rsquo;s link</dt>
              <dd>
                Paste the link to one ad from TikTok&rsquo;s Ads Library and that ad is picked for
                you, with no list in between.
              </dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>What the list tells you</h3>
            <dl>
              <dt>The most recent twelve</dt>
              <dd>
                Newest first, from the past twelve months, across every region. There is no next
                page: if the list is thin, a different search is the way to more.
              </dd>
              <dt>Who, how long, and what it looks like</dt>
              <dd>
                Each ad shows the brand that ran it, how many days it ran, and its cover picture.
              </dd>
              <dt>Some show no picture at all</dt>
              <dd>
                A live ad TikTok serves no video for can still be diagnosed: the page reads its
                targeting and how long it ran, and says plainly that the creative couldn&rsquo;t be
                seen.
              </dd>
              <dt>Withdrawn ads are shown, never diagnosed</dt>
              <dd>
                TikTok publishes nothing about an ad it has taken down — no brand, no picture, no
                video — so there is nothing to diagnose. A keyword search can turn up many of them.
              </dd>
            </dl>
          </div>
        </div>

        <div className="doc-note">
          <p>
            <strong>One investigation per conversation.</strong> Until you pick an ad, send a message
            or get a page, you can swap one search for another freely. After that, the conversation
            belongs to those ads, so a new search means a new conversation. That keeps the ads, the
            pages and everything said about them describing one subject.
          </p>
        </div>
      </Section>

      {/* ===================== 03 — one message ===================== */}
      <Section
        num="03"
        title="What happens when you send one message"
        intro={
          <p>
            Every message goes to the same place: the analyst. It decides what your message needs,
            does that work, and then tells you what it found in its own words. Each box says what that
            step works from, because that is most of why the answers come out the way they do.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramTurn />
        </Figure>

        <h3 className="doc-h3">How it reads your message</h3>
        <ul className="doc-list">
          <li>
            <strong>Newly picked ads</strong> get a page each, all written at the same time. You can
            shape them with a request — &ldquo;focus on whether the hook works with the sound
            off&rdquo; — for every page at once, or for just one of them.
          </li>
          <li>
            <strong>A question</strong> — &ldquo;why is the hook weak?&rdquo;, &ldquo;what does
            message match mean?&rdquo; — gets an answer and nothing else. It never rebuilds a page to
            answer a question about it.
          </li>
          <li>
            <strong>A change</strong> — &ldquo;make the verdict sharper&rdquo;, &ldquo;add the second
            competitor&rdquo; — edits the page in place. If several pages are open and it isn&rsquo;t
            clear which one you mean, it asks.
          </li>
          <li>
            <strong>A rebuild</strong> — &ldquo;redo it&rdquo;, &ldquo;start over&rdquo; — is the
            only thing that replaces a page from scratch, and it discards any edits made to it.
          </li>
          <li>
            <strong>Something the page doesn&rsquo;t cover</strong> — what a particular image shows,
            an exact value from the library — sends it back to the ad&rsquo;s own material before it
            answers.
          </li>
        </ul>

        <h3 className="doc-h3">Picking more as you go</h3>
        <p className="doc-lead">
          Picking another ad adds it; the ones already picked stay in reach, so you can still say
          &ldquo;and fix the first one&rdquo; three messages later. Up to five can be added in one
          message. The agent can only ever work on ads you have picked — ask about one you
          haven&rsquo;t, and it will ask you to pick it first.
        </p>

        <div className="doc-note doc-note-cool">
          <p>
            <strong>Why edit rather than rebuild?</strong> A rebuilt page is similar, not the same:
            every finding you had already read would come back reworded, and you would have to read
            all of it again. Editing in place changes only the words your request touches, so
            everything else comes back exactly as it was. When it isn&rsquo;t sure which you meant, it
            treats your request as an edit.
          </p>
        </div>
      </Section>

      {/* ===================== 04 — reading an ad ===================== */}
      <Section
        num="04"
        title="How it reads a TikTok ad"
        intro={
          <>
            <p>
              The pages themselves are written by a <strong>page writer</strong>: a separate step the
              analyst sets off, one for each ad, with no conversation of its own. It is handed
              everything TikTok publishes about the ad, looks at the creative itself, and researches
              the brand and its competitors before it judges anything.
            </p>
            <p>
              A video is watched once, with the sound on, and turned into a written account —
              every scene with its timestamp, the words on screen and where they sit, the voice and
              the music. That account is kept, so a page rebuilt later never needs the video again.
            </p>
          </>
        }
      >
        <Figure
          caption={
            <>
              <b>Thin data is the normal case, not an excuse.</b> TikTok publishes ranges for reach and
              impressions and nothing about results, so the page spends its words on what the creative
              does and what to change, and says in a line what isn&rsquo;t known.
            </>
          }
        >
          <DiagramReading />
        </Figure>

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>A video ad</h3>
            <dl>
              <dt>Sound on</dt>
              <dd>
                TikTok plays with sound, the opposite of most feeds. A voice or a spoken hook should
                carry the message; stock music reads as an ad in a second, and silence reads as
                broken.
              </dd>
              <dt>The first three seconds</dt>
              <dd>
                Something has to happen in the very first frame — a face, a motion, a result, a mess.
                A logo card, a slow opening shot or a fade-in is dead air.
              </dd>
              <dt>Native, not polished</dt>
              <dd>
                A creator talking to camera, handheld, in natural light, beats a brand film. A
                landscape TV spot squeezed into the vertical frame is the commonest failure there is.
              </dd>
              <dt>Pacing</dt>
              <dd>
                Long still moments are where people leave, and the page names the second it happens.
                The length has to be earned.
              </dd>
              <dt>Clear of TikTok&rsquo;s own buttons</dt>
              <dd>
                The caption covers the bottom of the frame and the like and share buttons the right
                edge, so words placed there go unread.
              </dd>
              <dt>The ask, shown and said</dt>
              <dd>
                A call-to-action only in the caption is one the viewer never got. It ends on the
                product and the offer, not a cut to black.
              </dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>An ad with no video</h3>
            <dl>
              <dt>Judged as what it is</dt>
              <dd>
                Plenty of TikTok ads run as images. The page never calls the video missing, never
                scores the ad down for not having one, and never answers with &ldquo;make a
                video&rdquo;.
              </dd>
              <dt>The first image is the hook</dt>
              <dd>
                It carries the whole scroll-stop. A face, a result or a number stops the thumb; a
                product on a plain background does not.
              </dd>
              <dt>The words in the image do the talking</dt>
              <dd>
                The promise has to be readable on a phone at arm&rsquo;s length, and clear of the
                caption and the buttons.
              </dd>
              <dt>The order is the argument</dt>
              <dd>
                Each image&rsquo;s job is named — hook, problem, proof, product, offer, ask — and the
                page says whether the set builds or just repeats, and whether the first would still
                work on its own, since most people only see that one.
              </dd>
              <dt>A video that won&rsquo;t play</dt>
              <dd>
                Judged from its cover picture, with the page saying so prominently — and no claims
                about timing, sound or pacing it could not have seen.
              </dd>
            </dl>
          </div>
        </div>
      </Section>

      {/* ===================== 05 — the page ===================== */}
      <Section
        num="05"
        title="The diagnosis page"
        intro={
          <p>
            Every page has the same seven parts in the same order, so pages for different ads can be
            read side by side. The first six are the audit; the last turns it into changes, and every
            change answers something the audit found.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramPage />
        </Figure>

        <h3 className="doc-h3">The scorecard</h3>
        <p className="doc-lead">
          Eight things, each scored out of ten from the creative actually seen and the moment or image
          behind it, then weighted into one score out of a hundred. The weights lean on stopping
          power, connection and the claim, because those decide an ad in a vertical feed.{' '}
          <strong>The score measures the distance to a competitive ad, not a forecast</strong> — a
          weak ad can still make money with an audience that already knows the brand.
        </p>
        <Bench
          rows={[
            ['Asset hygiene', 'a native vertical frame, words clear of TikTok’s own buttons, captions where there is sound, a first frame that represents the ad'],
            ['Claim strategy', 'the promise is one this brand can win on, and it lands at once'],
            ['Proof and trust', 'evidence shown or said — and when it lands'],
            ['Stopping power', 'something happens in the first frame'],
            ['Message clarity', 'what is sold, to whom, and what it does, without reading the caption'],
            ['Action clarity', 'an ask that matches the offer, the button and the page it leads to'],
            ['Connection', 'a face, someone who reads as real, a situation the viewer recognises'],
            ['Brand consistency', 'someone who scrolls away after a second still knows whose ad it was'],
          ]}
        />
        <Bench
          rows={[
            ['0 – 39.9', 'rebuild'],
            ['40 – 59.9', 'underpowered'],
            ['60 – 79.9', 'competitive'],
            ['80 – 100', 'category-leading'],
          ]}
        />

        <h3 className="doc-h3">What to change</h3>
        <ul className="doc-list">
          <li>
            <strong>Numbered changes in order of what they are worth</strong> — R1, R2 and on — each
            naming the finding it fixes, what it should improve, the one number in the ad account that
            would confirm it, and anything that has to be true first.
          </li>
          <li>
            <strong>The basics ship without a test</strong> — a native vertical frame, words moved
            clear of TikTok&rsquo;s buttons, captions, the ask on screen and in the voice, the age
            range corrected.
          </li>
          <li>
            <strong>For a video, a re-cut brief an editor can use as written</strong>: the first three
            seconds written out, when the brand and the product first appear, the words on screen and
            where they sit, a second hook midway if the length needs one, the ask, the end card, a
            shorter cut and the cover frame — plus two or three alternative opening lines in the
            ad&rsquo;s own language, with a translation.
          </li>
          <li>
            <strong>For images, a redesign brief image by image</strong>: what each one shows, its
            headline word for word, where it sits on the frame, which existing images stay and why,
            and what the new first image is — written as the actual picture, never &ldquo;make the
            first image stronger&rdquo;.
          </li>
          <li>
            It closes on what every change keeps — whatever is already working, such as the creator,
            the demo moment or the sound.
          </li>
        </ul>
      </Section>

      {/* ===================== 06 — the two roles ===================== */}
      <Section
        num="06"
        title="The two roles, and what each one knows"
        intro={
          <p>
            You only ever talk to one agent. What differs is the job: the analyst holds the
            conversation and keeps the pages right, and the page writer does the deep read of one ad at
            a time. Each carries its own body of TikTok-specific judgement.
          </p>
        }
      >
        <Panel
          num="01"
          title="The analyst"
          owns="Owns: the conversation, and every change to a page"
          lede={
            <>
              <p>
                It reads your message, decides what it needs, and does it — or simply answers. It
                speaks like a sharp colleague looking at the page beside you: warm, direct and
                specific, usually two to six sentences, with no headings or walls of bullets.
              </p>
              <p>
                When a page lands it doesn&rsquo;t narrate it — you can read it. It gives you{' '}
                <strong>the one thing that matters most</strong> and offers the natural next step. It
                names ads the way you would — &ldquo;your curling-iron ad&rdquo; — never by a number.
              </p>
            </>
          }
        >
          <h4>Discipline</h4>
          <ul>
            <li>
              It never invents a finding. Everything it says about an ad comes from a page it wrote or
              from what TikTok published.
            </li>
            <li>
              <strong>It never quotes a number TikTok doesn&rsquo;t publish</strong> — no spend,
              clicks, click-through rate, CPM, ROAS, watch time, completion rate or follower counts.
            </li>
            <li>
              Market and competitor facts on a page it may repeat, but never extend.
            </li>
            <li>
              It can search the web, but only to understand what you asked — a term, a creator, a
              brand it doesn&rsquo;t know — never for an ad&rsquo;s own figures.
            </li>
            <li>
              It keeps every page consistent with itself: a value that appears in three places is
              changed in all three, and the page&rsquo;s design survives the edit.
            </li>
          </ul>
        </Panel>

        <Panel
          num="02"
          title="The page writer"
          owns="Owns: one diagnosis page per ad"
          lede={
            <>
              <p>
                It works as a senior TikTok creative strategist — creative director, market researcher
                and media planner in one — writing for a marketing team that already knows what its ad
                shows and wants what it can&rsquo;t see from inside the account.{' '}
                <strong>A page that only restates the data is a failed page.</strong>
              </p>
              <p>
                Before judging, it runs three to six web searches, in the languages of the ad and the
                regions it ran in: the brand and the page the ad leads to, the competitors advertising
                on TikTok there, and any TikTok rule it isn&rsquo;t sure is still current.
              </p>
            </>
          }
        >
          <h4>What every page does</h4>
          <ul>
            <li>
              <strong>Judges the claim before the craft.</strong> Is the promise one this brand can win
              on against the competitors it found? A challenger opening on price against the category
              leaders is a strategic error however well the hook is cut.
            </li>
            <li>
              <strong>Counts the proof</strong> — a result on camera, a price, a review with its count,
              a guarantee — and when it lands. A second adjective is not proof, and it never
              recommends a claim the brand couldn&rsquo;t back up.
            </li>
            <li>
              <strong>Checks the ask against the button.</strong> TikTok shows a button under the ad
              the whole time; the creative still has to earn the click, and the button has to match
              where it leads.
            </li>
            <li>
              <strong>Checks where the click lands.</strong> A specific promise that drops the viewer
              on a homepage is a finding on its own — it is the commonest reason a strong ad gets
              clicks and no orders.
            </li>
            <li>
              <strong>Holds the targeting against the creative.</strong> Talent and music that read
              45-plus served to 18–24, or a returning-customer list shown an ad that spends its time
              introducing the brand: a mismatch is a headline finding, not a footnote.
            </li>
            <li>
              <strong>Reads a long run carefully.</strong> An ad stays live until someone pauses it, so
              a long run says nobody stopped it — not that it worked. A one- or two-day run is a test
              or a kill.
            </li>
            <li>
              Keeps what it saw, what it inferred and what TikTok doesn&rsquo;t publish clearly apart,
              and marks every inference as one.
            </li>
          </ul>

          <h4>Which buyer the ad is talking to</h4>
          <p className="doc-know-lead">
            Every page places the ad against four stages, scores how well the hook, the body and the
            ask match each one out of five, and names the gap between the stage the targeting reached
            and the stage the creative speaks to:
          </p>
          <Bench
            rows={[
              ['Problem-aware', 'feels the need, doesn’t know any solutions yet'],
              ['Solution-aware', 'comparing kinds of product'],
              ['Brand-aware', 'knows this brand, hasn’t bought'],
              ['Warm', 'has visited or bought — what a custom audience list implies'],
            ]}
          />
        </Panel>
      </Section>
    </div>
  );
}
