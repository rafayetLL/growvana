import React from 'react';
import {
  DiagramContext,
  DiagramPicking,
  DiagramTurn,
  DiagramPage,
  DiagramDemand,
} from './GoogleAdDocDiagrams.jsx';

// Static documentation for the Google Ad Agent. No data fetching, no props from
// the wire — this is a written page, kept in sync by hand with the workflow's
// prompt (`google_ad_agent/diagnosis.yml`), graph and endpoint. Built the same
// way as MetaAdAgentDoc.jsx and EmailAgentDoc.jsx, using only the `.doc-*`
// classes and elements those pages already use, so the print stylesheet and the
// Word export need nothing new.
//
// THE DIAGRAMS CARRY THE STRUCTURE; the prose carries craft and judgement. When
// something new is "how the parts fit together", it goes in a drawing in
// GoogleAdDocDiagrams.jsx rather than in another paragraph here.

// No `updated` date, for the same reason as the other doc pages: a stamp is only
// as true as the last person to remember it, and a stale one is worse than none.
export const GOOGLE_AD_DOC_META = {
  title: 'Google Ad Agent',
  subtitle: 'How it reads Google’s public record of an ad, what it judges, and what each diagnosis page hands you.',
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

export default function GoogleAdAgentDoc() {
  return (
    <div className="doc">
      {/* ===================== 01 — what goes in, what comes out ===================== */}
      <Section
        num="01"
        title="What goes in, and what comes out"
        intro={
          <>
            <p>
              Google keeps a public record of the ads it runs, called the{' '}
              <strong>Ads Transparency Center</strong>: what each ad says and shows, the different
              versions Google assembles from it, which countries it ran in, roughly how often it was
              seen there, when it ran, and which kinds of targeting the advertiser switched on. This
              agent reads that record and diagnoses the ads in it — what is working, what is not, and
              exactly what to change.
            </p>
            <p>
              Because the record is public, it can look at any advertiser&rsquo;s ads — yours or a
              competitor&rsquo;s — without access to your Google Ads account. That is also its limit:
              Google publishes impressions only as rough ranges, and nothing about spend, clicks,
              click-through rate, conversions or return on ad spend. So none of those ever appear, and
              every recommendation names the number in your own account that would settle it instead.
            </p>
            <p>The agent is available to connect to, but has no screen in the app yet.</p>
          </>
        }
      >
        <Figure
          caption={
            <>
              <b>Your Company Blueprint is optional, and copied in when the conversation starts.</b>{' '}
              With it, each page takes your brand&rsquo;s look and reads the ads with your brand and
              buyers in mind. Without it, the agent works out the category, the audience and the offer
              from the ad and its own research, and uses a plain, neutral design.
            </>
          }
        >
          <DiagramContext />
        </Figure>
      </Section>

      {/* ===================== 02 — picking the ads ===================== */}
      <Section
        num="02"
        title="Picking the ads"
        intro={
          <p>
            A conversation starts from one of three things, and that choice decides whether you pick
            from a list. Whichever it is, the ads you pick become the agent&rsquo;s whole world for the
            rest of the conversation: it cannot see the advertiser&rsquo;s other ads, so it never wanders
            off to diagnose one you didn&rsquo;t ask about.
          </p>
        }
      >
        <Figure
          caption={
            <>
              <b>A website is not the same as an advertiser.</b> Starting from a site returns every
              advertiser whose ads lead there — often resellers and affiliates rather than the brand —
              so each ad carries the name of whoever actually runs it.
            </>
          }
        >
          <DiagramPicking />
        </Figure>
      </Section>

      {/* ===================== 03 — one turn ===================== */}
      <Section
        num="03"
        title="What happens when you send one message"
        intro={
          <>
            <p>
              There is one agent and no team behind it: the one you talk to is the one that does the
              work. For each message it decides what is needed, uses whichever of its four abilities
              that calls for, reads what comes back, and decides again.
            </p>
            <p>
              Using an ability and reading back what it returned is one <strong>round</strong>. Most
              messages need one or two; a message gets up to five.
            </p>
          </>
        }
      >
        <Figure caption={null}>
          <DiagramTurn />
        </Figure>

        <h3 className="doc-h3">How it reads your message</h3>
        <ul className="doc-list">
          <li>
            <strong>Picking ads, or asking for a diagnosis</strong>, writes a page for every picked ad
            that doesn&rsquo;t have one yet. &ldquo;How do I improve this?&rdquo; is answered the same
            way, because the page is where the recommendations live — not in the chat.
          </li>
          <li>
            <strong>A change</strong> — &ldquo;make the verdict on the video ad sharper&rdquo;,
            &ldquo;drop the second finding&rdquo; — edits the page in place. When several pages exist and
            it can&rsquo;t tell which ad you mean, it asks before touching anything.
          </li>
          <li>
            <strong>A question about a page</strong> gets an answer in words. Asking about something
            never rewrites it.
          </li>
          <li>
            <strong>A question no page answers</strong> — what a picture shows, the exact date an ad
            last ran, a search figure — sends it back to the ad&rsquo;s own material, and it answers in
            its own words.
          </li>
          <li>
            <strong>When it genuinely can&rsquo;t tell what you want</strong>, it asks rather than
            guesses.
          </li>
        </ul>

        <div className="doc-note doc-note-cool">
          <p>
            <strong>Why edit rather than rebuild?</strong> Rebuilding a page to change one line rewrites
            everything else on it too — similar, not the same — and you&rsquo;d have to read all of it
            again. Editing in place leaves every part you didn&rsquo;t mention exactly as it was. So a
            page is rebuilt from scratch only when you say so — &ldquo;redo&rdquo;,
            &ldquo;rebuild&rdquo;, &ldquo;start over&rdquo; — and a rebuild replaces the page and every
            edit made to it.
          </p>
        </div>

        <h3 className="doc-h3">How it talks to you</h3>
        <p className="doc-lead">
          Like a sharp colleague looking at the same page: usually two to six sentences, no headings and
          no walls of bullets. When a page lands it doesn&rsquo;t read it back to you — you can see it —
          but gives you the one thing in it that matters most, normally the top recommendation, and
          offers the natural next step. It calls an ad by what it is (&ldquo;your video ad&rdquo;), never
          by Google&rsquo;s code for it, and it never invents a finding: everything it says comes from a
          page or from the ad&rsquo;s own record.
        </p>
      </Section>

      {/* ===================== 04 — the diagnosis page ===================== */}
      <Section
        num="04"
        title="The diagnosis page"
        intro={
          <>
            <p>
              Writing a page is the heavy part, so the agent hands it to a separate, focused step — the{' '}
              <strong>page writer</strong> — which takes one ad and sees all of it at once. When
              several ads need pages, there is a writer for each and they all run at the same time.
              The video, if there is one, is watched and written up beforehand, so the writer can judge
              it moment by moment.
            </p>
            <p>
              The page is written for a marketing team that already knows what its ad says, and is
              paying for what it can&rsquo;t see from inside the account: how the ad measures up against
              the category, the competitors and current Google practice — and exactly what to change.
              A page that only restates the data has failed.
            </p>
          </>
        }
      >
        <Figure caption={null}>
          <DiagramPage />
        </Figure>

        <h3 className="doc-h3">What kind of ad it is, and what the page hands you</h3>
        <p className="doc-lead">
          Google labels every ad text, image or video, and the label is often wrong — an app-install ad
          routinely arrives as &ldquo;video&rdquo;. So the writer works out the kind of ad from what it
          is actually made of, judges it only against that kind, and ends the page with the piece of
          work that kind of ad needs, written out in full. Never &ldquo;consider stronger copy&rdquo;:
          the copy itself.
        </p>

        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: '16%' }}>Kind of ad</th>
                <th style={{ width: '40%' }}>Judged on</th>
                <th style={{ width: '44%' }}>What the page hands you</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Search ad</td>
                <td>
                  Headlines up to 30 characters and descriptions up to 90, real variety across the set,
                  whether the link lands on the product rather than the homepage, and the extensions it
                  carries or lacks.
                </td>
                <td>
                  6–10 new headlines and 2–4 descriptions with character counts, each carrying one
                  target keyword; which keyword goes with which headline, its match type and where it
                  should land; the extensions to add.
                </td>
              </tr>
              <tr>
                <td>Display or image</td>
                <td>
                  One focal point in under a second, how Google crops and assembles the parts, legible
                  short text, and whether the button&rsquo;s verb names a real next step.
                </td>
                <td>
                  A creative brief — the subject, the on-image line written out, the button, where the
                  brand sits, the sizes to add — and the changes to the parts themselves.
                </td>
              </tr>
              <tr>
                <td>YouTube video</td>
                <td>
                  Google&rsquo;s own ABCD: attention in the first five seconds, before the skip button;
                  branding early and often; a human connection; a clear direction at the end. And
                  whether it works with the sound off.
                </td>
                <td>
                  A re-cut brief — the first five seconds written out, when the brand and product
                  appear, the on-screen text, the call-to-action and end card, a short cut, the
                  thumbnail.
                </td>
              </tr>
              <tr>
                <td>App install</td>
                <td>
                  What the advertiser controls: the headlines, the videos, and the store listing Google
                  builds the ad from — the icon, the cover and the first two screenshots most people see.
                </td>
                <td>
                  An asset brief — headlines and descriptions, video lengths and orientations, the
                  store-listing changes — plus a brief for a playable ad.
                </td>
              </tr>
              <tr>
                <td>Playable</td>
                <td>
                  Whether the app suits one, and Google&rsquo;s rules for them. It can&rsquo;t be played
                  here, and the page says so rather than describing what it can&rsquo;t see.
                </td>
                <td>
                  A playable brief — the one mechanic and the tap that drives it, the hook line, how
                  long play lasts, the end card and its install button.
                </td>
              </tr>
              <tr>
                <td>Shopping</td>
                <td>
                  The product photo (clean, no overlays), the title read as a feed title, and the price
                  against competitors&rsquo; listings for the same product.
                </td>
                <td>
                  A feed fix — the rewritten title, the attributes to add, the photo change, the price
                  and promotion position, the trust signals to surface.
                </td>
              </tr>
              <tr>
                <td>Maps or local</td>
                <td>
                  Whether the copy names the area, and whether the button offers what a nearby buyer
                  needs — a call, directions, opening hours.
                </td>
                <td>
                  Headlines naming the area, the call, location and hours extensions, and the business
                  profile signals that decide the Maps click.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="doc-fine">
          An ad Google assembled from several kinds of part — common in app campaigns — gets one of
          these for each kind, judged as parts of one ad.
        </p>

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>How it judges</h3>
            <dl>
              <dt>The claim before the craft</dt>
              <dd>
                Is the promise one this brand can win on against the competitors it found? A beautifully
                written line fighting a bigger rival on price is still a strategic mistake. It names the
                ground being fought on, who owns it, and the claim the brand could defend instead.
              </dd>
              <dt>Proof, counted</dt>
              <dd>
                A price, a rating with its count, a delivery window, a guarantee, a certification — not
                a second adjective. And every new claim it recommends says what the advertiser must be
                able to document before it runs.
              </dd>
              <dt>The ad as Google builds it</dt>
              <dd>
                Google crops, shrinks, cuts off and assembles. Each visible fault is traced to the part
                that caused it, because that is what can be changed in an afternoon.
              </dd>
              <dt>The targeting against the creative</dt>
              <dd>
                Who the ad seems to be for, held against the kinds of targeting the advertiser switched
                on. An ad that introduces the brand, aimed at a list of past customers, is a key finding,
                not a footnote.
              </dd>
              <dt>The versions side by side</dt>
              <dd>
                What changes between versions and what stays fixed is the test the account is really
                running — and the next test should change what actually drives the result.
              </dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>What it won&rsquo;t do</h3>
            <dl>
              <dt>Read a long run as success</dt>
              <dd>
                An ad that has run for months may simply be one nobody switched off. It reads the dates
                against the market&rsquo;s calendar instead — a run that ends just after the
                category&rsquo;s peak season says something useful.
              </dd>
              <dt>Treat a range as a figure</dt>
              <dd>
                Impressions come in coarse buckets. It compares which region is bigger; it never
                presents a range as a number.
              </dd>
              <dt>Fault an ad for what its format lacks</dt>
              <dd>
                A display ad has no button text to judge, and a store screenshot is not ad art.
              </dd>
              <dt>Mark every ad down</dt>
              <dd>A strong ad gets a strong score, and what is working is named so a rebuild keeps it.</dd>
              <dt>Misread another script</dt>
              <dd>
                Copy in Bengali, Arabic or Thai is transcribed with an English gloss, and where a
                character is uncertain it says so and critiques the claim, not the wording.
              </dd>
            </dl>
          </div>
        </div>

        <h3 className="doc-h3">The scorecard</h3>
        <p className="doc-lead">
          Eight measures, each out of 10, judged on what the ad shows and each citing the finding behind
          it. They are weighted for the format — a search ad leans on the claim and the proof, a display
          ad on how well its parts survive Google&rsquo;s assembly, a video on stopping power and
          connection — and added up to a score out of 100.
        </p>
        <Bench
          rows={[
            ['Asset hygiene', 'the parts suit how Google crops, scales, overlays and shortens them'],
            ['Claim strategy', 'the promise is winnable, and sits where it is seen first'],
            ['Proof and trust', 'evidence a buyer can check, in the frame'],
            ['Stopping power', 'it interrupts a scroll at the size it is really shown'],
            ['Message clarity', 'a first-time viewer can say what is sold, to whom, and which product'],
            ['Action clarity', 'one clear next step, matching the headline and the page it leads to'],
            ['Connection', 'a person, a feeling, a situation the viewer recognises'],
            ['Brand consistency', 'the same mark, colours, type and language in every version'],
          ]}
        />
        <p className="doc-lead">
          Below 40 reads as <em>rebuild</em>, 40 to 60 <em>underpowered</em>, 60 to 80{' '}
          <em>competitive</em>, and 80 or more <em>category-leading</em>. The score is the distance from
          a competitive set of ads, not a forecast — a weak ad can still make money on cheap placements.
        </p>

        <div className="doc-note">
          <p>
            <strong>The recommendations close the page</strong>, in priority order and numbered R1, R2
            and on. Each one fixes a finding above it, says what should improve and the one number in
            your own account that would confirm it, and names anything that has to be true first. The
            top-priority housekeeping fixes ship without a test. There are no dates, owners, budgets or
            bids — those are yours to set.
          </p>
        </div>
      </Section>

      {/* ===================== 05 — search demand ===================== */}
      <Section
        num="05"
        title="How search demand informs a diagnosis"
        intro={
          <p>
            For an ad people find by searching, the strongest evidence of what it should say is what
            people actually type. So the page writer can measure it, starting from one or two{' '}
            <strong>seeds</strong> — short phrases of two or three words, written the way a shopper
            would search — and getting Google&rsquo;s own figures for the searches around them.
          </p>
        }
      >
        <Figure
          caption={
            <>
              <b>The measurement is United States, English only</b>, whatever market the ad ran in. The
              page labels every figure that way, and a seed in another language often comes back with
              nothing — the page then gives the priorities in words.
            </>
          }
        >
          <DiagramDemand />
        </Figure>

        <h3 className="doc-h3">What the page does with it</h3>
        <ul className="doc-list">
          <li>
            <strong>The keyword table</strong> lists every keyword measured, biggest first, with
            monthly searches, cost per click, difficulty, competition, intent and trend.
          </li>
          <li>
            <strong>The ones worth bidding on are marked TARGET</strong> — plenty of searches with low
            difficulty first, and searches with buying intent ahead of searches for information.
          </li>
          <li>
            For each target: how well this ad already matches it, out of 5 and why; the match type; the
            page it should land on; the negative keywords; and the change the ad needs.
          </li>
          <li>
            Five to ten of the questions buyers ask and of the searches Google suggests alongside,
            naming the ones the ad or its landing page should answer.
          </li>
          <li>
            For a search ad, each rewritten headline carries one target keyword, so the new copy is
            written to what people search rather than to a guess.
          </li>
        </ul>
      </Section>
    </div>
  );
}
