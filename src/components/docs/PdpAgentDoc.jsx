import React from 'react';
import {
  DiagramPdpContext,
  DiagramPdpOpening,
  DiagramPdpTurn,
  DiagramPdpAudit,
  DiagramPdpImagePlan,
} from './PdpDocDiagrams.jsx';

// Static documentation for the PDP Agent. No data fetching, no props from the
// wire — this is a written page, kept in sync by hand with the workflow's
// prompts and graph. Built the same way as EmailAgentDoc.jsx and
// MetaAdAgentDoc.jsx and using only the `.doc-*` classes those pages already
// use, so the print stylesheet and the Word export need nothing new.
//
// THE DIAGRAMS CARRY THE STRUCTURE; the prose carries craft and judgement. When
// something new is "how the parts fit together", it goes in a drawing in
// PdpDocDiagrams.jsx rather than in another paragraph here.

// No `updated` date, for the same reason as the other pages: a stamp is only as
// true as the last person to remember it, and a stale one is worse than none.
export const PDP_DOC_META = {
  title: 'PDP Agent',
  subtitle:
    'How it audits one product page, maps the pages that beat it, plans the fix, and writes the words and pictures to publish.',
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

export default function PdpAgentDoc() {
  return (
    <div className="doc">
      {/* ===================== 01 — what goes in, what comes out ===================== */}
      <Section
        num="01"
        title="What goes in, and what comes out"
        intro={
          <>
            <p>
              One product goes in — a product detail page, or PDP, that is already live, or a product
              you have not published yet. Four tabs come out: what is true of the page today, what the
              pages beating it do, what to change, and a draft of the words and pictures to publish.
            </p>
            <p>
              A product page is read by four audiences at once: retail search engines index it, AI
              engines answer questions from it, shopping agents read it to buy, and a person decides
              whether to. A page can satisfy one of them and fail the rest, and that split is what the
              agent is built around. Nothing it makes is published. Your live page is untouched until you
              change it yourself.
            </p>
          </>
        }
      >
        <Figure
          caption={
            <>
              <b>The product is fixed when the session starts.</b> A different product, or a different
              set of photos, means a new session. Your Company Blueprint is optional: without one, the
              agent works from the product alone and never guesses at your brand&rsquo;s voice or who
              your buyers are.
            </>
          }
        >
          <DiagramPdpContext />
        </Figure>
      </Section>

      {/* ===================== 02 — how a session starts ===================== */}
      <Section
        num="02"
        title="How a session starts"
        intro={
          <>
            <p>
              You choose where the product sells — Amazon, or any other storefront — and either paste
              the product page&rsquo;s address or describe the product in your own words. That choice
              changes what the audit can check, not just how its findings are labelled.
            </p>
            <p>
              On a storefront the agent also takes <strong>a reading of the page</strong>: facts read
              straight from the page&rsquo;s own code, such as its title, its headings, how many words it
              carries and how heavy it is to load. Nobody writes the reading; it is measured. Amazon gets
              no reading, because Amazon builds the page and it is the same for every seller there.
            </p>
          </>
        }
      >
        <Figure caption={null}>
          <DiagramPdpOpening />
        </Figure>

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>How it writes the questions</h3>
            <dl>
              <dt>Only what nothing else answers</dt>
              <dd>
                It reads your page and your Blueprint first, and asks only about the gaps: what you want
                the page to become, what you can and can&rsquo;t change, and the facts about the product
                and its buyers that only you hold.
              </dd>
              <dt>Options written for this product</dt>
              <dd>
                Each question comes with two to six suggested answers drawn from your own product. A
                filler option that would fit anything — &ldquo;Other&rdquo;, &ldquo;Not sure&rdquo; — is
                not allowed. Where a list would be invented, the box is left for you to type in.
              </dd>
              <dt>Pick any that apply</dt>
              <dd>
                Answers aren&rsquo;t exclusive, so you can choose several, or write your own.
              </dd>
              <dt>Change your mind later</dt>
              <dd>
                You can send new answers on any later message. The agent says what changed and offers to
                refresh the work it affects.
              </dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>What it won&rsquo;t ask</h3>
            <dl>
              <dt>Anything the page or the Blueprint says</dt>
              <dd>Your voice, your positioning, your personas, what is already on the page.</dd>
              <dt>Anything about the business</dt>
              <dd>Revenue, margins, ad spend, team, funding or channel strategy. Only this product.</dd>
              <dt>Anything with a number it made up</dt>
              <dd>No suggested answer carries a figure the agent invented.</dd>
              <dt>Anything as if it were required</dt>
              <dd>
                Every answer is optional. Skip one and the agent assumes the best answer for your brand,
                passes it on to the specialists, and tells you what it assumed so you can correct it.
              </dd>
            </dl>
          </div>
        </div>

        <div className="doc-note">
          <p>
            <strong>The market research comes from Google, even for an Amazon product.</strong> How
            often a term is searched and what a click on it costs are Google&rsquo;s figures, for the
            United States, in English. The words buyers use carry across; treat the volumes as a sign of
            demand rather than as Amazon&rsquo;s own count.
          </p>
        </div>
      </Section>

      {/* ===================== 03 — one turn ===================== */}
      <Section
        num="03"
        title="What happens when you send one message"
        intro={
          <p>
            Every message goes to the CMO first — the one you&rsquo;re talking to. It replies straight
            away, and then decides which of four specialists, if any, should work on your page this
            turn. Each box says what that step is handed, because that is most of why the answers come
            out the way they do.
          </p>
        }
      >
        <Figure caption={null}>
          <DiagramPdpTurn />
        </Figure>

        <h3 className="doc-h3">How it reads your message</h3>
        <ul className="doc-list">
          <li>
            <strong>A question</strong> — &ldquo;why is that a problem?&rdquo;, &ldquo;how long is my
            title?&rdquo;, &ldquo;what should I fix first?&rdquo; — gets an answer from the work already
            on your tabs, and nothing else runs. Every finding says what it rests on, so the CMO can
            explain one without sending anybody back to re-check it.
          </li>
          <li>
            <strong>A request for something new</strong> starts exactly the step you asked for and
            nothing more. Asking for the audit is the one exception: the first time, the competitor field
            is mapped at the same time, because the two take the same wait.
          </li>
          <li>
            <strong>A targeted change</strong> — one finding reworded, one bullet rewritten, one picture
            redone — goes to the specialist that owns that piece, with exactly what to change.
          </li>
          <li>
            <strong>A go-ahead</strong> — &ldquo;yes, write the strategy&rdquo; — starts what was
            offered, and the CMO says how long it is likely to take.
          </li>
          <li>
            <strong>When it can&rsquo;t tell which</strong>, it treats your message as a question and
            asks.
          </li>
        </ul>

        <h3 className="doc-h3">The order never changes</h3>
        <p className="doc-lead">
          The audit and the competitor field come first, then the strategy, then the draft page. Each
          later step needs the one before: the strategy is built on the audit, and the draft is built on
          the strategy. Ask for a later step too early and the CMO tells you what has to come first and
          offers to run it, rather than running something on half the facts. The competitor field is the
          one optional step — a strategy is better with it, but nothing waits for it.
        </p>
        <p className="doc-lead">
          When a strategy already exists, a change to the copy or a picture goes to the Studio alone, so
          one picture redone never rewrites the whole plan.
        </p>

        <h3 className="doc-h3">Files you attach</h3>
        <ul className="doc-list">
          <li>
            <strong>Kept for the whole session.</strong> Each file is given a short label when it arrives
            — <em>att-1</em>, <em>att-2</em> — and stays available however many messages ago that was.
            Refer to it in words (&ldquo;the box photo I sent earlier&rdquo;) and the agent finds it.
          </li>
          <li>
            <strong>Handed over per specialist.</strong> The CMO sees every file. The specialists see
            only the ones it hands them for that piece of work, as the real file rather than a
            description: a brief to the Strategist, a picture to recreate to the Studio, a page to judge
            yours against to the Auditor.
          </li>
          <li>
            <strong>Never to the Scout.</strong> The competitor field is what other sellers publish, and
            nothing you attach changes that.
          </li>
          <li>
            <strong>Never the product.</strong> A file is context for the work. What is audited was fixed
            at the start, and a file can&rsquo;t change it.
          </li>
          <li>
            <strong>Only files it can read</strong> — JPEG, PNG, WebP and PDF, up to 10 MB each. Anything
            else stops the message with a note naming the file, rather than being dropped quietly.
          </li>
        </ul>

        <p className="doc-lead">
          Very long conversations are condensed automatically: the most recent messages stay as they
          are, everything older becomes a summary, and every file you&rsquo;ve sent survives the trim.
          The product, your Blueprint and the work on your tabs are never part of what gets condensed.
        </p>
      </Section>

      {/* ===================== 04 — the audit ===================== */}
      <Section
        num="04"
        title="The audit: four areas, and what each one stands on"
        intro={
          <>
            <p>
              The audit says what is true of your page today, in four areas. <strong>SEO</strong> asks
              whether search will surface it. <strong>AEO</strong> — AI Engine Optimization — asks whether
              an AI engine will understand it, trust it and cite it. <strong>Images</strong> asks whether
              the pictures do their job. <strong>Layout</strong> asks whether the order of the page builds
              toward the sale.
            </p>
            <p>
              Each area is handed different evidence, on purpose. Giving an area something it has no use
              for only invites it to comment on things that are not its job.
            </p>
          </>
        }
      >
        <Figure
          caption={
            <>
              <b>The audit states, it never prescribes.</b> It says what the page does and what that
              costs, and stops there. What to do about it is the Strategist&rsquo;s job — keeping that
              line sharp is what stops the two documents contradicting each other.
            </>
          }
        >
          <DiagramPdpAudit />
        </Figure>

        <h3 className="doc-h3">The audit page, top to bottom</h3>
        <ul className="doc-list">
          <li>
            <strong>What the agent sees</strong> — the evidence first: a picture of your whole page as it
            was when the audit ran, or every field Amazon returned for your listing, or your own
            description and photos. Beside it, every image the page carried. So you can check at a glance
            that the agent read the page you meant.
          </li>
          <li>
            <strong>The overview</strong> — a one-line headline, where the real work is, what keeps coming
            up across areas, a line per area, and what to read first. It adds no finding of its own.
          </li>
          <li>
            <strong>The four areas</strong>, each with its verdict, what was measured, what the gaps are
            costing, a grid of what was checked, and what is already working — so you don&rsquo;t rewrite
            something that works.
          </li>
          <li>
            <strong>How we know.</strong> Every finding carries a second line naming what it rests on:
            the page&rsquo;s own words, a measured figure, something buyers were measured searching for or
            asking, or a named practice — and a named practice only when nothing firmer exists. A finding
            that can&rsquo;t point to one of the four is left out.
          </li>
        </ul>

        <div className="doc-compare">
          <div className="doc-lane doc-lane-a">
            <h3>An Amazon listing</h3>
            <dl>
              <dt>Read field by field</dt>
              <dd>
                The title, bullets and gallery are read exactly as published, so the audit judges your
                words with more confidence than it could from a picture.
              </dd>
              <dt>Judged against Amazon&rsquo;s own rules</dt>
              <dd>
                The title limit, the image slots, the white background on the main image. It works from
                the rules written into it, never from memory.
              </dd>
              <dt>Only what you control</dt>
              <dd>
                Layout judges the order of your bullets and images, nothing else — the rest of the page
                belongs to Amazon.
              </dd>
              <dt>A+ panels are shown, not judged</dt>
              <dd>
                They appear in the evidence at the top so you can see them, but no area reads them.
              </dd>
            </dl>
          </div>

          <div className="doc-lane doc-lane-b">
            <h3>Any other storefront</h3>
            <dl>
              <dt>Read as a picture</dt>
              <dd>
                The whole page is captured as it looks in a browser, long pages in labelled pieces so the
                text stays legible, together with every image on it.
              </dd>
              <dt>Measured from its code</dt>
              <dd>
                The title search engines show, the description under it, the heading outline, the word
                count, the page&rsquo;s weight and whether its wording is copied elsewhere on the site.
              </dd>
              <dt>Judged on its merits</dt>
              <dd>
                No storefront rules are recorded, so the audit never invents a requirement for your
                platform.
              </dd>
              <dt>The page must open without signing in</dt>
              <dd>The agent sees what a stranger sees, and judges that.</dd>
            </dl>
          </div>
        </div>

        <div className="doc-note doc-note-cool">
          <p>
            <strong>Why there are no scores.</strong> A score hides which part of the page is costing you
            and why, and invites you to chase the number instead of the buyer. So every finding is a
            sentence with its evidence under it. The agent may repeat a figure the research or the page
            reading handed it — how often a term is searched, how many words the page carries — but it
            never counts, estimates or works out a figure of its own.
          </p>
        </div>
      </Section>

      {/* ===================== 05 — the pictures ===================== */}
      <Section
        num="05"
        title="The pictures: from plan to page"
        intro={
          <p>
            Pictures are decided before any are made. The Strategist looks at each photograph you
            already have and asks what job it does on the page; the Studio then makes exactly what that
            plan calls for, and more if it helps. The plan is the floor, so no planned picture is ever
            quietly skipped.
          </p>
        }
      >
        <Figure
          caption={
            <>
              <b>Nothing is ever replaced.</b> Your own photographs stay, and each new take sits beside the
              last rather than over it, so every earlier version is still there to ask for back.
            </>
          }
        >
          <DiagramPdpImagePlan />
        </Figure>

        <h3 className="doc-h3">What you see on the Studio tab</h3>
        <ul className="doc-list">
          <li>
            <strong>Page</strong> shows the draft laid out like your real page — an Amazon listing or your
            storefront — with the pictures in its gallery, each marked <em>Existing</em> or <em>AI</em>.
          </li>
          <li>
            <strong>Pictures</strong> shows every picture grouped by kind, with what it is for, why it
            earns its place, the instruction it was made from, and alt text you can copy straight into
            your page.
          </li>
          <li>
            Only pictures the strategy approved are shown. A picture still only planned appears once it is
            made, and one the strategy set aside is hidden.
          </li>
          <li>
            If some of your own photographs haven&rsquo;t been judged yet, the tab says how many. Ask for
            the strategy to be revisited and they are judged and brought in.
          </li>
          <li>
            Any picture can be sent back with a note — &ldquo;brighter background, show it in a hand for
            scale&rdquo; — and comes back as a new take.
          </li>
        </ul>
      </Section>

      {/* ===================== 06 — the specialists ===================== */}
      <Section
        num="06"
        title="The four specialists, and what each one knows"
        intro={
          <>
            <p>
              Each owns exactly one tab and nobody else writes it. The Auditor says what is; the Scout
              says what the winners do; the Strategist says what to change; the Studio makes what you
              publish. Only the Strategist is allowed to prescribe.
            </p>
            <p>
              None of them is a general writing assistant pointed at a product page. Each carries its own
              body of e-commerce craft — how search reads a title, how an AI engine lifts an answer, which
              shots a buyer needs before they trust a product — and each tells you in chat what it did the
              moment it finishes.
            </p>
          </>
        }
      >
        <Panel
          num="01"
          title="The Auditor"
          owns="Owns: the audit"
          lede={
            <>
              <p>
                It runs the four areas at the same time and writes the audit page as they land. It judges
                only what a stranger could see on the page, and it uses your answers and your Blueprint to
                weight what matters — never as if the page said them.
              </p>
              <p>
                <strong>It never says what to do.</strong> No fixes, no to-do list, no score. It can,
                though, reword a finding or change how a section looks — its colours, spacing or type —
                without judging anything again.
              </p>
            </>
          }
        >
          <h4>SEO — will search surface it?</h4>
          <ul>
            <li>
              Whether the page is written in the words buyers actually type, and what each silence costs.
            </li>
            <li>
              A grid of nine things a buyer searches by: what it is, what it&rsquo;s made of, its size, who
              it&rsquo;s for, what it&rsquo;s used for, what it works with, where or when, the problem it
              solves, and which version. <strong>Material, size and compatibility weigh most.</strong>
            </li>
            <li>
              How the language reads: what the product is said up front, specific over vague, written for
              this product rather than any, natural sentences, and nothing stuffed.
            </li>
            <li>On a marketplace title, the opening words carry far more weight than the rest.</li>
          </ul>

          <h4>AEO — will an AI engine cite it?</h4>
          <ul>
            <li>
              <strong>One question becomes many.</strong> An AI engine splits a shopper&rsquo;s question
              into smaller ones and answers each, so a page competes once per smaller question, not once
              overall.
            </li>
            <li>
              What buyers actually ask, one row per real question, and whether the page answers it.
            </li>
            <li>
              What an engine can lift and stand behind: named things, facts with figures, claims with a
              source, real voices, answered questions, stated comparisons and stated limits.
            </li>
            <li>
              How the page is shaped: the answer first, passages that make sense on their own, headings
              that name what follows, lists and tables, and a page that agrees with itself.
            </li>
          </ul>

          <h4>Images — do the pictures do their job?</h4>
          <ul>
            <li>
              <strong>It first works out which images are the product&rsquo;s at all</strong>, by the job
              each does rather than its quality. One real page carried 211 images, of which 8 were the
              product&rsquo;s own.
            </li>
            <li>
              It knows the kinds of shot a buyer relies on: plain, in scale, close detail, in use,
              compatibility, lifestyle, on a person, a customer&rsquo;s own photo, an information graphic,
              a selling frame, and what&rsquo;s in the box.
            </li>
            <li>
              Each photo gets a yes or no on whether it earns its place, the one detail in the picture that
              settles it, and <strong>alt text written to be published</strong> — the one part of the audit
              you can paste straight onto your page.
            </li>
            <li>The shots the page is missing, named as absences rather than as orders.</li>
            <li>It judges how a marketing line on a picture works, never whether it is true.</li>
          </ul>

          <h4>Layout — does the order build to the sale?</h4>
          <ul>
            <li>
              The first screen, and whether it earns a scroll; then the page in order, judged against how
              people actually read pages — the F-shaped scan, what they skip as advertising, how much they
              can hold at once, and the phone.
            </li>
            <li>
              Fourteen things a buyer needs to find. <strong>Seven weigh most</strong>: materials, size,
              compatibility, cost per unit, total cost, returns and gifting.
            </li>
          </ul>
        </Panel>

        <Panel
          num="02"
          title="The Scout"
          owns="Owns: the competitor field"
          lede={
            <>
              <p>
                It finds the product pages actually winning in your category, reads them one by one, and
                reports what they have in common — how they&rsquo;re built, not who they are. It never
                says anything about your own page.
              </p>
              <p>
                It is the slowest step, a few minutes as a rule, and the one that starts from scratch every
                time: there is nothing to edit, so asking again maps the field again.
              </p>
            </>
          }
        >
          <h4>How it picks the winners</h4>
          <Bench
            rows={[
              [
                'On Amazon',
                'three searches from different angles, then the top five listings — ranked by how many sold last month, then by rating weighted by review count',
              ],
              [
                'Elsewhere',
                'a Google Shopping search, then up to six products, best-reviewed first and one per site where possible — each read from the seller’s own page',
              ],
            ]}
          />
          <p className="doc-know-lead">
            No judgement goes into the choice. The ranking is the market&rsquo;s own evidence of what is
            selling, so nothing on the list is there because it looked good to the agent.
          </p>

          <h4>What its page shows</h4>
          <ul>
            <li>
              Headline figures for the field: how many pages were read, the price range, the typical star
              rating, how much is selling.
            </li>
            <li>
              How the field is built: title lengths, bullets, images, specifications, variants, proof and
              price, shown as the spread across the winners.
            </li>
            <li>A card for each product, and on Amazon a board of best-seller ranks.</li>
            <li>
              <strong>Four or five patterns</strong>, ranked, each with how widely it holds — and an honest
              read naming the biggest gap between the winners and the rest.
            </li>
          </ul>

          <h4>Where its findings go</h4>
          <ul>
            <li>
              Only the patterns travel on, to the CMO, the Strategist and the Studio&rsquo;s copy. The
              figures stay on the Scout&rsquo;s own page.
            </li>
            <li>
              <strong>Never into the audit.</strong> Your page is judged on its own terms first; what the
              winners do is weighed afterwards, in the strategy.
            </li>
          </ul>
        </Panel>

        <Panel
          num="03"
          title="The Strategist"
          owns="Owns: the strategy and the image plan"
          lede={
            <>
              <p>
                It turns the audit into what the page should say and show — what each field has to
                achieve, what the pictures have to cover, and what to leave alone.{' '}
                <strong>It is the only specialist allowed to prescribe.</strong> It does not write the
                finished words; it argues for the job each one must do, and the Studio writes them.
              </p>
              <p>
                It reads the audit, the competitor patterns, the market research, your answers, your
                photographs and any brief you hand it. It won&rsquo;t write a strategy without an audit,
                because a plan with nothing under it is a guess.
              </p>
            </>
          }
        >
          <h4>The shape of the strategy</h4>
          <ul>
            <li>
              <strong>The one move</strong> opens the page — the single change that matters most, in at
              most sixty words, and the only paragraph on the page.
            </li>
            <li>
              <strong>What changes</strong> — a line per section that has work in it.
            </li>
            <li>
              Then each section in turn: what was <em>found</em>, what to <em>change</em> in up to three
              short points, and <em>why</em>.
            </li>
            <li>
              The work is ordered by impact, not by where it sits on the page, and it ends with what to
              leave alone.
            </li>
          </ul>
          <Bench
            rows={[
              [
                'On Amazon',
                'title · bullets · description and A+ · structured attributes · backend search terms · the image set',
              ],
              [
                'Elsewhere',
                'the page in order · above the fold · title and promise · images · price and buy box · benefits · specifications · reviews · questions · trust and returns · the page’s hidden details',
              ],
            ]}
          />

          <h4>Every recommendation stands on something</h4>
          <ul>
            <li>
              One of four grounds, named: an audit finding, a measured fact about this page, a measured
              fact about the market, or a named practice explained in the same line.
            </li>
            <li>
              The one move stands on two at once where it can — the audit found it <em>and</em> the
              research sizes it large. If nothing stands on both, it says so.
            </li>
            <li>
              It may state a figure it was handed and order the work by it. It never predicts from one —
              no &ldquo;achievable&rdquo;, no &ldquo;winnable&rdquo; — and never works one out itself.
            </li>
            <li>No scores, no benchmarks, no performance promises. And it says what it could not see.</li>
          </ul>

          <h4>Changing it</h4>
          <ul>
            <li>
              A fix to the wording is made in place, leaving everything else exactly as it was.
            </li>
            <li>
              A different direction — or any change to the pictures, however small — means the strategy is
              written again, whole, with the previous one in front of it.
            </li>
          </ul>
        </Panel>

        <Panel
          num="04"
          title="The Studio"
          owns="Owns: the draft page and its pictures"
          lede={
            <>
              <p>
                It makes what you publish: the page&rsquo;s words and its pictures. The strategy is its
                brief, so <strong>it won&rsquo;t start without one</strong> — it tells you what has to come
                first and offers to run it.
              </p>
              <p>
                The words and the pictures are made separately, and a turn often makes one without the
                other, so it makes only what you ask for. The draft is titled as a draft, carries no links,
                and is published nowhere.
              </p>
            </>
          }
        >
          <h4>The draft page</h4>
          <ul>
            <li>
              <strong>On Amazon</strong>, it looks like an Amazon listing: the title, item highlights, five
              bullets that lead with the benefit and then the feature, the description and A+ modules — and
              a seller-only section with the backend search terms and attributes shoppers never see.
            </li>
            <li>
              <strong>Elsewhere</strong>, it is styled in your brand&rsquo;s own colours and type, and
              covers everything a complete product page needs above and below the fold, with a seller-only
              section for the page&rsquo;s hidden details at the end.
            </li>
            <li>
              <strong>A note sits beside every choice</strong>, naming what it rests on: what the audit
              found, what the strategy called for, what the page said before, what buyers measurably
              search or ask, or what the winning pages do.
            </li>
          </ul>

          <h4>Where the Amazon words have to fit</h4>
          <Bench
            rows={[
              ['Title', '75 characters'],
              ['Item highlights', '125 characters'],
              ['Backend search terms', '249 bytes'],
              ['Images', 'nine slots, seven shown; the main one on pure white with no text'],
            ]}
          />

          <h4>What the copy never does</h4>
          <ul>
            <li>
              Claim anything the evidence doesn&rsquo;t carry — no invented price, rating, review count,
              stock level, delivery date or certification.
            </li>
            <li>Print a figure it worked out, or a search figure from the research.</li>
            <li>Make a health, safety, medical or legal claim the evidence doesn&rsquo;t state outright.</li>
            <li>Name a competitor.</li>
            <li>Sound like an advert. The words are helpful, never salesy.</li>
          </ul>

          <h4>The pictures</h4>
          <ul>
            <li>
              <strong>A picture is allowed to sell.</strong> Headlines, promises, badges and callouts are
              welcome on a picture, even though the copy stays plain. A rival&rsquo;s product or branding
              and watermarks are not.
            </li>
            <li>
              <strong>The product is never made up.</strong> Every picture works from your real photographs:
              the same shape, the same colour, the same label, and no part nobody photographed.
            </li>
            <li>
              A retake edits the picture it replaces and keeps the same kind of picture, including any
              headline or badge it carried.
            </li>
            <li>
              A file you attached can steer one picture without touching the others.
            </li>
            <li>
              Square by default, or taller for something worn or upright. Every planned picture is made in
              one go, and each takes a few minutes.
            </li>
          </ul>

          <h4>Changing it</h4>
          <ul>
            <li>
              <strong>Ask for a change and it patches that part</strong> — one bullet, one sentence — leaving
              every other word as it was. It writes the page again only when the argument itself changes.
            </li>
            <li>
              Ask for an earlier take of a picture and you get it back; nothing was thrown away.
            </li>
          </ul>
        </Panel>
      </Section>
    </div>
  );
}
